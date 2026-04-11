/**
 * RemNote API Adapter
 * Wraps the RemNote Plugin SDK with correct method signatures for v0.0.46+
 */

import {
  ReactRNPlugin,
  RichTextInterface,
  PluginRem,
  RemType,
  BuiltInPowerupCodes,
} from '@remnote/plugin-sdk';
import {
  AutomationBridgeSettings,
  DEFAULT_ACCEPT_REPLACE_OPERATION,
  DEFAULT_ACCEPT_WRITE_OPERATIONS,
  DEFAULT_AUTO_TAG,
  DEFAULT_JOURNAL_PREFIX,
} from '../settings';
import { withScopedLogPrefix } from '../logging';

// Build-time constant injected by webpack DefinePlugin
declare const __PLUGIN_VERSION__: string;

export type IncludeContentMode = 'none' | 'markdown' | 'structured';
export type SearchIncludeContentMode = IncludeContentMode;

export interface CreateNoteParams {
  title?: string;
  content?: string;
  parentId?: string;
  tags?: string[];
}

export interface AppendJournalParams {
  content: string;
  timestamp?: boolean;
}

export interface SearchParams {
  query: string;
  limit?: number;
  includeContent?: SearchIncludeContentMode;
  depth?: number;
  childLimit?: number;
  maxContentLength?: number;
}

export interface SearchByTagParams {
  tag: string;
  limit?: number;
  includeContent?: SearchIncludeContentMode;
  depth?: number;
  childLimit?: number;
  maxContentLength?: number;
}

export interface ReadNoteParams {
  remId: string;
  depth?: number;
  includeContent?: IncludeContentMode;
  childLimit?: number;
  maxContentLength?: number;
}

export interface UpdateNoteParams {
  remId: string;
  title?: string;
  appendContent?: string;
  replaceContent?: string;
  addTags?: string[];
  removeTags?: string[];
}

export interface ReadTableParams {
  tableRemId?: string;
  tableTitle?: string;
  limit?: number;
  offset?: number;
  propertyFilter?: string[];
}

export interface TableColumn {
  propertyId: string;
  name: string;
  type: string;
}

export interface TableRow {
  remId: string;
  name: string;
  values: Record<string, string>;
}

export interface ReadTableResult {
  tableId: string;
  tableName: string;
  columns: TableColumn[];
  rows: TableRow[];
  totalRows: number;
  rowsReturned: number;
}

export interface ContentProperties {
  childrenRendered: number;
  childrenTotal: number;
  contentTruncated: boolean;
}

export interface SearchResultItem {
  remId: string;
  title: string;
  headline: string;
  parentRemId?: string;
  parentTitle?: string;
  aliases?: string[];
  tags?: string[];
  remType: RemClassification;
  cardDirection?: CardDirection;
  content?: string;
  contentStructured?: StructuredContentNode[];
  contentProperties?: ContentProperties;
}

export interface StructuredContentNode {
  remId: string;
  title: string;
  headline: string;
  remType: RemClassification;
  aliases?: string[];
  tags?: string[];
  cardDirection?: CardDirection;
  children?: StructuredContentNode[];
}

export type RemClassification =
  | 'document'
  | 'dailyDocument'
  | 'concept'
  | 'descriptor'
  | 'portal'
  | 'text';

export type CardDirection = 'forward' | 'reverse' | 'bidirectional';

/** Default number of search results when no limit is specified. */
const DEFAULT_SEARCH_LIMIT = 50;
/** Fetch extra search results from SDK before dedupe to reduce underfilled unique result sets. */
const SEARCH_OVERSAMPLE_FACTOR = 2;

/** Default recursion depth for read operations. */
const DEFAULT_DEPTH = 5;

/** Default child limit per level for content rendering. */
const DEFAULT_CHILD_LIMIT = 100;

/** Absolute cap for childrenTotal counting to prevent expensive full-tree traversal. */
const CHILDREN_TOTAL_CAP = 2000;

/** Default max content length for search markdown rendering. */
const DEFAULT_SEARCH_MAX_CONTENT_LENGTH = 3000;

/** Default max content length for read markdown rendering. */
const DEFAULT_READ_MAX_CONTENT_LENGTH = 100000;

/** Default depth for search content rendering. */
const DEFAULT_SEARCH_DEPTH = 1;

/** Default child limit for search content rendering. */
const DEFAULT_SEARCH_CHILD_LIMIT = 20;

/** Type priority for search result sorting (lower = higher priority). */
const TYPE_PRIORITY: Record<RemClassification, number> = {
  document: 0,
  concept: 0,
  dailyDocument: 1,
  descriptor: 3,
  portal: 2,
  text: 4,
};

/** Type-aware delimiter strings for headline formatting. */
const REM_TYPE_DELIMITERS: Partial<Record<RemClassification, string>> = {
  concept: '::',
  descriptor: ';;',
};

/** Default delimiter for types not in the map. */
const DEFAULT_DELIMITER = '>>';

/** Internal result from renderContentMarkdown. */
interface RenderResult {
  content: string;
  childrenRendered: number;
  truncatedByLength: boolean;
}

interface SearchContentOptions {
  includeContent: SearchIncludeContentMode;
  depth: number;
  childLimit: number;
  maxContentLength: number;
}

type TagNameCache = Map<string, string | null>;

type TagReferenceLike =
  | string
  | {
      _id?: string;
      text?: RichTextInterface;
    };

interface TagMetadataChildSnapshot {
  remId: string;
  title: string;
  flags: {
    isProperty: boolean;
    isPowerupProperty: boolean;
    isPowerupPropertyListItem: boolean;
    isPowerupSlot: boolean;
    isPowerupEnum: boolean;
  };
}

const SEARCH_INCLUDE_CONTENT_MODES: readonly SearchIncludeContentMode[] = [
  'none',
  'markdown',
  'structured',
];
const READ_INCLUDE_CONTENT_MODES: readonly IncludeContentMode[] = [
  'none',
  'markdown',
  'structured',
];

export class RemAdapter {
  private settings: AutomationBridgeSettings;
  private readonly emittedTagDebugKeys = new Set<string>();

  constructor(
    private plugin: ReactRNPlugin,
    settings?: Partial<AutomationBridgeSettings>
  ) {
    // Default settings
    this.settings = {
      acceptWriteOperations: DEFAULT_ACCEPT_WRITE_OPERATIONS,
      acceptReplaceOperation: DEFAULT_ACCEPT_REPLACE_OPERATION,
      autoTagEnabled: true,
      autoTag: DEFAULT_AUTO_TAG,
      journalPrefix: DEFAULT_JOURNAL_PREFIX,
      journalTimestamp: true,
      wsUrl: 'ws://127.0.0.1:3002',
      defaultParentId: '',
      ...settings,
    };
  }

  /**
   * Update settings dynamically
   */
  updateSettings(settings: Partial<AutomationBridgeSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): AutomationBridgeSettings {
    return { ...this.settings };
  }

  /**
   * Extract text from RichTextInterface, resolving references and applying markdown formatting.
   *
   * Handles all SDK rich text element types:
   * - Plain strings, formatted text (bold/italic/code/links), Rem references,
   *   global names, LaTeX, annotations, images, audio, drawings.
   * - Card delimiters and plugin elements produce empty strings.
   * - Circular references are guarded via visitedIds set.
   */
  private async extractText(
    richText: RichTextInterface | undefined,
    visitedIds?: Set<string>
  ): Promise<string> {
    if (!richText || !Array.isArray(richText)) return '';

    const visited = visitedIds ?? new Set<string>();
    const parts: string[] = [];

    for (const element of richText) {
      if (typeof element === 'string') {
        parts.push(element);
        continue;
      }

      if (!element || typeof element !== 'object') continue;

      const el = element as Record<string, unknown>;
      const discriminant = el.i as string | undefined;

      switch (discriminant) {
        case 'm': {
          // Formatted text
          let text = (el.text as string) || '';
          if (!text) break;

          // Apply markdown formatting (innermost to outermost)
          if (el.code === true) text = `\`${text}\``;
          if (el.b === true) text = `**${text}**`;
          if (el.l === true) text = `*${text}*`;
          // u (underline), q (quote), h (highlight) — skipped per plan

          // External URL link wraps the formatted text
          if (typeof el.url === 'string' && el.url) {
            text = `[${text}](${el.url})`;
          }
          // qId (inline link to another Rem) — just use text as-is

          parts.push(text);
          break;
        }

        case 'q': {
          // Rem reference — must resolve via SDK lookup
          const refId = el._id as string | undefined;
          if (!refId) {
            parts.push('[deleted reference]');
            break;
          }
          if (visited.has(refId)) {
            parts.push('[circular reference]');
            break;
          }
          visited.add(refId);
          try {
            const refRem = await this.plugin.rem.findOne(refId);
            if (refRem) {
              const refText = await this.extractText(refRem.text, visited);
              parts.push(refText);
            } else if (el.textOfDeletedRem) {
              const deletedText = await this.extractText(
                el.textOfDeletedRem as RichTextInterface,
                visited
              );
              parts.push(deletedText || '[deleted reference]');
            } else {
              parts.push('[deleted reference]');
            }
          } finally {
            // Keep cycle detection scoped to the current recursion branch.
            visited.delete(refId);
          }
          break;
        }

        case 'g': {
          // Global name — resolve via SDK lookup (has _id, no text)
          const gId = el._id as string | null;
          if (!gId) break;
          if (visited.has(gId)) {
            parts.push('[circular reference]');
            break;
          }
          visited.add(gId);
          try {
            const gRem = await this.plugin.rem.findOne(gId);
            if (gRem) {
              const gText = await this.extractText(gRem.text, visited);
              parts.push(gText);
            }
          } finally {
            visited.delete(gId);
          }
          break;
        }

        case 'x': // LaTeX
        case 'n': // Annotation
          parts.push((el.text as string) || '');
          break;

        case 'i': // Image
          parts.push((el.title as string) || '[image]');
          break;

        case 'a': // Audio
          parts.push('[audio]');
          break;

        case 'r': // Drawing
          parts.push('[drawing]');
          break;

        case 's': // Card delimiter — structural, not displayable
        case 'p': // Plugin element — not user content
          break;

        default: {
          // Fallback: try to extract text property (forward-compat for unknown types)
          if ('text' in el) {
            parts.push((el.text as string) || '');
          }
          break;
        }
      }
    }

    return parts.join('');
  }

  /**
   * Classify a Rem into a semantic type using SDK metadata.
   */
  private async classifyRem(rem: PluginRem): Promise<RemClassification> {
    if (await rem.hasPowerup(BuiltInPowerupCodes.DailyDocument)) return 'dailyDocument';
    if (rem.type === RemType.CONCEPT) return 'concept';
    if (rem.type === RemType.DESCRIPTOR) return 'descriptor';
    if (rem.type === RemType.PORTAL) return 'portal';
    if (await rem.isDocument()) return 'document';
    return 'text';
  }

  /**
   * Map SDK practice direction to contract card direction values.
   * Returns undefined when direction is 'none' (omit from output).
   */
  private mapCardDirection(
    sdkDirection: 'forward' | 'backward' | 'both' | 'none'
  ): CardDirection | undefined {
    switch (sdkDirection) {
      case 'forward':
        return 'forward';
      case 'backward':
        return 'reverse';
      case 'both':
        return 'bidirectional';
      default:
        return undefined;
    }
  }

  private getCardDelimiterIndex(richText: RichTextInterface | undefined): number {
    if (!richText || !Array.isArray(richText)) return -1;
    return richText.findIndex(
      (element) =>
        typeof element === 'object' &&
        element !== null &&
        'i' in (element as Record<string, unknown>) &&
        (element as Record<string, unknown>).i === 's'
    );
  }

  private async getTitleAndDetail(rem: PluginRem): Promise<{ title: string; detail?: string }> {
    const delimiterIndex = this.getCardDelimiterIndex(rem.text);
    if (delimiterIndex >= 0 && Array.isArray(rem.text)) {
      const front = await this.extractText(rem.text.slice(0, delimiterIndex) as RichTextInterface);

      // Prefer canonical SDK backText when available; fallback to right side of inline delimiter.
      const detailSource =
        rem.backText && rem.backText.length > 0
          ? rem.backText
          : (rem.text.slice(delimiterIndex + 1) as RichTextInterface);

      const detail = await this.extractText(detailSource);
      return { title: front, ...(detail ? { detail } : {}) };
    }

    const title = await this.extractText(rem.text);
    if (rem.backText && rem.backText.length > 0) {
      const detail = await this.extractText(rem.backText);
      return { title, ...(detail ? { detail } : {}) };
    }

    return { title };
  }

  /**
   * Get alternate names for a Rem via the SDK aliases API.
   * The SDK returns alias Rems whose `.text` contains the alias content.
   */
  private async getAliases(rem: PluginRem): Promise<string[]> {
    if (!('getAliases' in rem) || typeof rem.getAliases !== 'function') return [];
    const aliasRems: PluginRem[] = await rem.getAliases();
    if (!aliasRems || aliasRems.length === 0) return [];

    const results: string[] = [];
    for (const aliasRem of aliasRems) {
      const text = await this.extractText(aliasRem.text);
      if (text) results.push(text);
    }
    return results;
  }

  /**
   * Resolve human-readable tag names for a Rem.
   *
   * The SDK typing in this repo does not clearly expose a stable tag-read method shape, so this
   * helper uses feature detection and accepts either tag IDs or tag Rem-like objects.
   */
  private async getTagNames(rem: PluginRem, tagNameCache: TagNameCache): Promise<string[]> {
    const getTags = (
      rem as unknown as { getTags?: () => TagReferenceLike[] | Promise<TagReferenceLike[]> }
    ).getTags;
    if (typeof getTags !== 'function') {
      const metadataSnapshot = await this.collectTagMetadataSnapshot(rem);
      this.logTagDebugOnce(
        `missing-getTags:${rem._id}`,
        `Tag read unavailable for rem ${rem._id}: getTags() is missing`,
        metadataSnapshot
      );
      return [];
    }

    let tagRefs: TagReferenceLike[];
    try {
      const resolved = await Promise.resolve(getTags.call(rem));
      tagRefs = Array.isArray(resolved) ? resolved : [];
      if (!Array.isArray(resolved)) {
        this.logTagDebugOnce(
          `non-array-getTags:${rem._id}`,
          `Tag read returned a non-array result for rem ${rem._id}`,
          {
            resolvedType: typeof resolved,
            resolved,
          }
        );
      }
    } catch (error) {
      this.logTagDebugOnce(
        `throwing-getTags:${rem._id}`,
        `Tag read failed for rem ${rem._id}`,
        error
      );
      return [];
    }

    const results: string[] = [];
    const seen = new Set<string>();

    for (const tagRef of tagRefs) {
      const resolvedTag = await this.resolveTagReference(tagRef, tagNameCache);
      const { tagId, tagName } = resolvedTag;

      if (!tagName || seen.has(tagName)) continue;
      seen.add(tagName);
      results.push(tagName);

      if (tagId && tagNameCache.get(tagId) === undefined) {
        tagNameCache.set(tagId, tagName);
      }
    }

    if (tagRefs.length > 0 && results.length === 0) {
      this.logTagDebugOnce(
        `unresolved-getTags:${rem._id}`,
        `Tag read returned values for rem ${rem._id}, but none could be resolved`,
        {
          references: tagRefs.map((tagRef) => this.describeTagReference(tagRef)),
          availableTagMethods: this.getAvailableTagMethods(rem),
        }
      );
    }

    return results;
  }

  private async resolveTagReference(
    tagRef: TagReferenceLike,
    tagNameCache: TagNameCache
  ): Promise<{ tagId?: string; tagName: string | null }> {
    if (typeof tagRef === 'string') {
      return this.resolveTagId(tagRef, tagNameCache);
    }

    if (!tagRef || typeof tagRef !== 'object') {
      return { tagName: null };
    }

    const tagId = typeof tagRef._id === 'string' && tagRef._id ? tagRef._id : undefined;
    if (tagId) {
      const cachedTagName = tagNameCache.get(tagId);
      if (cachedTagName !== undefined) {
        return { tagId, tagName: cachedTagName };
      }
    }

    const inlineTagName =
      Array.isArray(tagRef.text) && tagRef.text.length > 0
        ? (await this.extractText(tagRef.text)) || null
        : null;
    if (tagId) {
      tagNameCache.set(tagId, inlineTagName);
    }

    if (inlineTagName || !tagId) {
      return { tagId, tagName: inlineTagName };
    }

    const resolvedById = await this.resolveTagId(tagId, tagNameCache);
    return resolvedById;
  }

  private async resolveTagId(
    tagId: string,
    tagNameCache: TagNameCache
  ): Promise<{ tagId: string; tagName: string | null }> {
    const cachedTagName = tagNameCache.get(tagId);
    if (cachedTagName !== undefined) {
      return { tagId, tagName: cachedTagName };
    }

    const tagRem = await this.plugin.rem.findOne(tagId);
    const tagName = tagRem ? (await this.extractText(tagRem.text)) || null : null;
    tagNameCache.set(tagId, tagName);
    return { tagId, tagName };
  }

  private describeTagReference(tagRef: TagReferenceLike): Record<string, unknown> {
    if (typeof tagRef === 'string') {
      return { kind: 'string', value: tagRef };
    }

    if (!tagRef || typeof tagRef !== 'object') {
      return { kind: typeof tagRef, value: tagRef };
    }

    return {
      kind: 'object',
      id: typeof tagRef._id === 'string' ? tagRef._id : undefined,
      hasText: Array.isArray(tagRef.text),
    };
  }

  private getAvailableTagMethods(rem: PluginRem): string[] {
    const prototype = Object.getPrototypeOf(rem) as object | null;
    if (!prototype) return [];

    return Object.getOwnPropertyNames(prototype)
      .filter((name) => name.toLowerCase().includes('tag'))
      .sort();
  }

  private getAvailableMetadataMethods(rem: PluginRem): string[] {
    const prototype = Object.getPrototypeOf(rem) as object | null;
    if (!prototype) return [];

    return Object.getOwnPropertyNames(prototype)
      .filter((name) => /(tag|powerup|property|slot)/i.test(name))
      .sort();
  }

  private async collectTagMetadataSnapshot(rem: PluginRem): Promise<{
    availableTagMethods: string[];
    availableMetadataMethods: string[];
    pluginRemNamespaceMethods: string[];
    pluginRemCapabilities: {
      hasGetAll: boolean;
      hasFindOne: boolean;
      hasFindByName: boolean;
    };
    childMetadata: TagMetadataChildSnapshot[];
  }> {
    const children = await rem.getChildrenRem().catch(() => [] as PluginRem[]);
    const childMetadata = await Promise.all(
      children.map(async (child) => ({
        remId: child._id,
        title: await this.safeExtractText(child.text),
        flags: {
          isProperty: await this.safeMetadataFlag(child, 'isProperty'),
          isPowerupProperty: await this.safeMetadataFlag(child, 'isPowerupProperty'),
          isPowerupPropertyListItem: await this.safeMetadataFlag(
            child,
            'isPowerupPropertyListItem'
          ),
          isPowerupSlot: await this.safeMetadataFlag(child, 'isPowerupSlot'),
          isPowerupEnum: await this.safeMetadataFlag(child, 'isPowerupEnum'),
        },
      }))
    );

    return {
      availableTagMethods: this.getAvailableTagMethods(rem),
      availableMetadataMethods: this.getAvailableMetadataMethods(rem),
      pluginRemNamespaceMethods: this.getPluginRemNamespaceMethods(),
      pluginRemCapabilities: this.getPluginRemCapabilities(),
      childMetadata,
    };
  }

  private getPluginRemNamespaceMethods(): string[] {
    const remNamespace = this.plugin.rem as unknown as Record<string, unknown> | undefined;
    if (!remNamespace || typeof remNamespace !== 'object') return [];

    return Object.keys(remNamespace).sort();
  }

  private getPluginRemCapabilities(): {
    hasGetAll: boolean;
    hasFindOne: boolean;
    hasFindByName: boolean;
  } {
    const remNamespace = this.plugin.rem as unknown as Record<string, unknown> | undefined;
    return {
      hasGetAll: typeof remNamespace?.getAll === 'function',
      hasFindOne: typeof remNamespace?.findOne === 'function',
      hasFindByName: typeof remNamespace?.findByName === 'function',
    };
  }

  private async safeExtractText(text: RichTextInterface | undefined): Promise<string> {
    if (!text || !Array.isArray(text) || text.length === 0) return '';

    try {
      return await this.extractText(text);
    } catch {
      return '';
    }
  }

  private async safeMetadataFlag(
    rem: PluginRem,
    methodName:
      | 'isProperty'
      | 'isPowerupProperty'
      | 'isPowerupPropertyListItem'
      | 'isPowerupSlot'
      | 'isPowerupEnum'
  ): Promise<boolean> {
    const method = (rem as unknown as Record<string, unknown>)[methodName];
    if (typeof method !== 'function') return false;

    try {
      return await (method as (this: PluginRem) => Promise<boolean>).call(rem);
    } catch {
      return false;
    }
  }

  private logTagDebugOnce(debugKey: string, message: string, details?: unknown): void {
    if (this.emittedTagDebugKeys.has(debugKey)) return;
    this.emittedTagDebugKeys.add(debugKey);

    if (details === undefined) {
      console.warn(withScopedLogPrefix('adapter', message));
      return;
    }

    console.warn(withScopedLogPrefix('adapter', message), details);
  }

  /**
   * Resolve the direct parent Rem for a Rem.
   */
  private async getParentRem(rem: PluginRem): Promise<PluginRem | undefined> {
    let parentRem: PluginRem | undefined;

    if ('getParentRem' in rem && typeof rem.getParentRem === 'function') {
      parentRem = await rem.getParentRem();
    } else {
      const parentId = (rem as unknown as { parent?: string | null }).parent;
      if (parentId) {
        parentRem = (await this.plugin.rem.findOne(parentId)) ?? undefined;
      }
    }

    return parentRem;
  }

  /**
   * Resolve parent metadata for a Rem.
   * Returns empty object for top-level rems.
   */
  private async getParentContext(rem: PluginRem): Promise<{
    parentRemId?: string;
    parentTitle?: string;
  }> {
    const parentRem = await this.getParentRem(rem);
    if (!parentRem) return {};

    const { title: parentTitle } = await this.getTitleAndDetail(parentRem);
    return {
      parentRemId: parentRem._id,
      parentTitle,
    };
  }

  /**
   * Get the type-aware delimiter string for headline formatting.
   */
  private getRemTypeDelimiter(remType: RemClassification): string {
    return REM_TYPE_DELIMITERS[remType] ?? DEFAULT_DELIMITER;
  }

  /**
   * Format a display-oriented headline from title, detail, and remType.
   * Example: "Term :: Definition" or "Question >> Answer"
   */
  private formatHeadline(
    title: string,
    detail: string | undefined,
    remType: RemClassification
  ): string {
    if (!detail) return title;
    const delimiter = this.getRemTypeDelimiter(remType);
    return `${title} ${delimiter} ${detail}`;
  }

  /**
   * Render a Rem's child subtree as indented markdown.
   *
   * Walks children recursively up to `depth` levels, respecting `childLimit` per level.
   * Each line is prefixed with `indentLevel * 2` spaces and a `- ` bullet.
   * Rems with a detail (flashcard) include a type-aware delimiter in the line.
   *
   * Truncation: if the accumulated output exceeds `maxContentLength`, rendering stops
   * at the last complete line boundary before the limit.
   */
  private async renderContentMarkdown(
    rem: PluginRem,
    depth: number,
    childLimit: number,
    maxContentLength: number,
    indentLevel: number = 0,
    accumulated: string = ''
  ): Promise<RenderResult> {
    if (depth <= 0) {
      return { content: accumulated, childrenRendered: 0, truncatedByLength: false };
    }

    const limitedChildren = await this.getRenderableChildren(rem, childLimit);
    if (limitedChildren.length === 0) {
      return { content: accumulated, childrenRendered: 0, truncatedByLength: false };
    }
    let content = accumulated;
    let childrenRendered = 0;
    let truncatedByLength = false;

    for (const child of limitedChildren) {
      const [{ title, detail }, childRemType] = await Promise.all([
        this.getTitleAndDetail(child),
        this.classifyRem(child),
      ]);

      const headline = this.formatHeadline(title, detail, childRemType);
      const indent = '  '.repeat(indentLevel);
      const line = `${indent}- ${headline}\n`;

      // Check if adding this line would exceed the limit
      if (content.length + line.length > maxContentLength) {
        truncatedByLength = true;
        break;
      }

      content += line;
      childrenRendered++;

      // Recurse into grandchildren
      const subResult = await this.renderContentMarkdown(
        child,
        depth - 1,
        childLimit,
        maxContentLength,
        indentLevel + 1,
        content
      );

      if (subResult.truncatedByLength) {
        content = subResult.content;
        childrenRendered += subResult.childrenRendered;
        truncatedByLength = true;
        break;
      }

      content = subResult.content;
      childrenRendered += subResult.childrenRendered;
    }

    return { content, childrenRendered, truncatedByLength };
  }

  /**
   * Count total children in a Rem's subtree, capped at CHILDREN_TOTAL_CAP.
   */
  private async countChildren(rem: PluginRem, depth: number): Promise<number> {
    if (depth <= 0) return 0;

    const children = await rem.getChildrenRem();
    if (!children || children.length === 0) return 0;

    let total = children.length;
    if (total >= CHILDREN_TOTAL_CAP) return CHILDREN_TOTAL_CAP;

    for (const child of children) {
      total += await this.countChildren(child, depth - 1);
      if (total >= CHILDREN_TOTAL_CAP) return CHILDREN_TOTAL_CAP;
    }

    return total;
  }

  /**
   * Build contentProperties for a rendered result.
   * Only counts total children when rendering was truncated (optimization).
   */
  private async buildContentProperties(
    rem: PluginRem,
    renderResult: RenderResult,
    depth: number
  ): Promise<ContentProperties> {
    const childrenTotal = renderResult.truncatedByLength
      ? await this.countChildren(rem, depth)
      : renderResult.childrenRendered;

    return {
      childrenRendered: renderResult.childrenRendered,
      childrenTotal,
      contentTruncated: renderResult.truncatedByLength,
    };
  }

  private async isPowerupContentMetadataRem(rem: PluginRem): Promise<boolean> {
    const checks = [
      'isPowerupProperty',
      'isPowerupPropertyListItem',
      'isPowerupSlot',
      'isPowerupEnum',
    ] as const;

    for (const checkName of checks) {
      const check = (rem as unknown as Record<string, unknown>)[checkName];
      if (typeof check !== 'function') continue;
      try {
        if (await (check as (this: PluginRem) => Promise<boolean>).call(rem)) return true;
      } catch {
        // Ignore SDK/mocking gaps and fall back to keeping the node visible.
      }
    }

    return false;
  }

  private async isEmptyTextLeaf(rem: PluginRem): Promise<boolean> {
    const remType = await this.classifyRem(rem);
    if (remType !== 'text') return false;

    const { title, detail } = await this.getTitleAndDetail(rem);
    if (title !== '' || detail) return false;

    const children = await rem.getChildrenRem();
    return !children || children.length === 0;
  }

  private async getRenderableChildren(rem: PluginRem, childLimit: number): Promise<PluginRem[]> {
    const children = await rem.getChildrenRem();
    if (!children || children.length === 0) return [];

    const visibleChildren: PluginRem[] = [];
    for (const child of children) {
      if (await this.isPowerupContentMetadataRem(child)) continue;
      visibleChildren.push(child);
    }

    const limitedChildren = visibleChildren.slice(0, childLimit);
    while (limitedChildren.length > 0) {
      const last = limitedChildren[limitedChildren.length - 1];
      if (!(await this.isEmptyTextLeaf(last))) break;
      limitedChildren.pop();
    }

    return limitedChildren;
  }

  private parseSearchIncludeContentMode(
    includeContent: SearchParams['includeContent']
  ): SearchIncludeContentMode {
    const mode = includeContent ?? 'none';
    if ((SEARCH_INCLUDE_CONTENT_MODES as readonly string[]).includes(mode)) {
      return mode;
    }
    throw new Error(
      `Invalid includeContent for search: ${String(
        includeContent
      )}. Expected one of: ${SEARCH_INCLUDE_CONTENT_MODES.join(', ')}`
    );
  }

  private parseReadIncludeContentMode(
    includeContent: ReadNoteParams['includeContent']
  ): IncludeContentMode {
    const mode = includeContent ?? 'markdown';
    if ((READ_INCLUDE_CONTENT_MODES as readonly string[]).includes(mode)) {
      return mode;
    }
    throw new Error(
      `Invalid includeContent for read_note: ${String(
        includeContent
      )}. Expected one of: ${READ_INCLUDE_CONTENT_MODES.join(', ')}`
    );
  }

  private getSearchSdkFetchLimit(requestedLimit: number): number {
    return Math.max(requestedLimit, Math.trunc(requestedLimit * SEARCH_OVERSAMPLE_FACTOR));
  }

  private getSearchContentOptions(
    params: Pick<SearchParams, 'includeContent' | 'depth' | 'childLimit' | 'maxContentLength'>
  ): SearchContentOptions {
    return {
      includeContent: this.parseSearchIncludeContentMode(params.includeContent),
      depth: params.depth ?? DEFAULT_SEARCH_DEPTH,
      childLimit: params.childLimit ?? DEFAULT_SEARCH_CHILD_LIMIT,
      maxContentLength: params.maxContentLength ?? DEFAULT_SEARCH_MAX_CONTENT_LENGTH,
    };
  }

  private async buildSearchResultItem(
    rem: PluginRem,
    sourceIndex: number,
    options: SearchContentOptions,
    tagNameCache: TagNameCache
  ): Promise<SearchResultItem & { _sourceIndex: number }> {
    const [{ title, detail }, remType, cardDirection, aliases, tags, parentContext] =
      await Promise.all([
        this.getTitleAndDetail(rem),
        this.classifyRem(rem),
        rem.backText
          ? rem.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
          : Promise.resolve(undefined),
        this.getAliases(rem),
        this.getTagNames(rem, tagNameCache),
        this.getParentContext(rem),
      ]);

    const headline = this.formatHeadline(title, detail, remType);

    let content: string | undefined;
    let contentStructured: StructuredContentNode[] | undefined;
    let contentProperties: ContentProperties | undefined;

    if (options.includeContent === 'markdown') {
      const renderResult = await this.renderContentMarkdown(
        rem,
        options.depth,
        options.childLimit,
        options.maxContentLength
      );
      if (renderResult.content) {
        content = renderResult.content;
        contentProperties = await this.buildContentProperties(rem, renderResult, options.depth);
      }
    } else if (options.includeContent === 'structured') {
      const structuredChildren = await this.renderContentStructured(
        rem,
        options.depth,
        options.childLimit,
        tagNameCache
      );
      if (structuredChildren.length > 0) {
        contentStructured = structuredChildren;
      }
    }

    return {
      remId: rem._id,
      title,
      headline,
      ...parentContext,
      ...(aliases.length > 0 ? { aliases } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      remType,
      ...(cardDirection ? { cardDirection } : {}),
      ...(content ? { content } : {}),
      ...(contentStructured ? { contentStructured } : {}),
      ...(contentProperties ? { contentProperties } : {}),
      _sourceIndex: sourceIndex,
    };
  }

  private async resolveSearchByTagTarget(rem: PluginRem): Promise<PluginRem> {
    const remType = await this.classifyRem(rem);
    if (remType === 'document' || remType === 'dailyDocument') {
      return rem;
    }

    let current: PluginRem = rem;
    let nearestNonDocumentAncestor: PluginRem | undefined;
    let parentRem = await this.getParentRem(current);
    while (parentRem) {
      if (!nearestNonDocumentAncestor) {
        nearestNonDocumentAncestor = parentRem;
      }

      const parentType = await this.classifyRem(parentRem);
      if (parentType === 'document' || parentType === 'dailyDocument') {
        return parentRem;
      }

      current = parentRem;
      parentRem = await this.getParentRem(current);
    }

    return nearestNonDocumentAncestor ?? rem;
  }

  private async findTagRem(tag: string): Promise<PluginRem | null> {
    const candidates = [tag];
    if (tag.startsWith('#') && tag.length > 1) {
      candidates.push(tag.slice(1));
    } else if (!tag.startsWith('#')) {
      candidates.push(`#${tag}`);
    }

    const uniqueCandidates = [...new Set(candidates)];
    for (const candidate of uniqueCandidates) {
      const match = await this.plugin.rem.findByName([candidate], null);
      if (match) return match;
    }

    return null;
  }

  private normalizeLookupText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private async getTablePropertyChildren(rem: PluginRem): Promise<PluginRem[]> {
    const children = await rem.getChildrenRem();
    const propertyChildren: PluginRem[] = [];

    for (const child of children) {
      if (await child.isProperty()) {
        propertyChildren.push(child);
      }
    }

    return propertyChildren;
  }

  private async collectExactTitleCandidates(
    rem: PluginRem,
    normalizedTitle: string,
    seen: Set<string>
  ): Promise<PluginRem[]> {
    const collected: PluginRem[] = [];
    const queue: PluginRem[] = [rem];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current._id)) {
        continue;
      }

      const title = this.normalizeLookupText(await this.extractText(current.text));
      if (title !== normalizedTitle) {
        continue;
      }

      seen.add(current._id);
      collected.push(current);

      const children = await current.getChildrenRem();
      queue.push(...children);
    }

    return collected;
  }

  private async resolveTableRem(params: ReadTableParams): Promise<PluginRem> {
    const tableRemId = params.tableRemId?.trim();
    const tableTitle = params.tableTitle?.trim();

    if ((!tableRemId && !tableTitle) || (tableRemId && tableTitle)) {
      throw new Error('Provide exactly one of tableRemId or tableTitle');
    }

    if (tableRemId) {
      const remById = await this.plugin.rem.findOne(tableRemId);
      if (remById) {
        return remById;
      }
      throw new Error(`Table not found: '${tableRemId}'`);
    }

    const searchResults = await this.plugin.search.search(
      this.textToRichText(tableTitle!),
      undefined,
      { numResults: this.getSearchSdkFetchLimit(DEFAULT_SEARCH_LIMIT) }
    );

    const normalizedIdentifier = this.normalizeLookupText(tableTitle!);
    const exactMatches: PluginRem[] = [];
    const seen = new Set<string>();

    for (const rem of searchResults) {
      const candidates = await this.collectExactTitleCandidates(rem, normalizedIdentifier, seen);
      exactMatches.push(...candidates);
    }

    const tableMatches: PluginRem[] = [];
    for (const rem of exactMatches) {
      const propertyChildren = await this.getTablePropertyChildren(rem);
      if (propertyChildren.length > 0) {
        tableMatches.push(rem);
      }
    }

    if (tableMatches.length === 1) {
      return tableMatches[0];
    }

    if (tableMatches.length > 1) {
      throw new Error(`Multiple tables found with exact title: '${tableTitle}'`);
    }

    if (exactMatches.length > 0) {
      throw new Error(`Rem found for '${tableTitle}' is not a table`);
    }

    throw new Error(`Table not found: '${tableTitle}'`);
  }

  private async renderContentStructured(
    rem: PluginRem,
    depth: number,
    childLimit: number,
    tagNameCache: TagNameCache
  ): Promise<StructuredContentNode[]> {
    if (depth <= 0) return [];

    const limitedChildren = await this.getRenderableChildren(rem, childLimit);
    if (limitedChildren.length === 0) return [];
    const results: StructuredContentNode[] = [];

    for (const child of limitedChildren) {
      const [{ title, detail }, remType, cardDirection, aliases, tags] = await Promise.all([
        this.getTitleAndDetail(child),
        this.classifyRem(child),
        child.backText
          ? child.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
          : Promise.resolve(undefined),
        this.getAliases(child),
        this.getTagNames(child, tagNameCache),
      ]);

      const children = await this.renderContentStructured(
        child,
        depth - 1,
        childLimit,
        tagNameCache
      );

      results.push({
        remId: child._id,
        title,
        headline: this.formatHeadline(title, detail, remType),
        remType,
        ...(aliases.length > 0 ? { aliases } : {}),
        ...(tags.length > 0 ? { tags } : {}),
        ...(cardDirection ? { cardDirection } : {}),
        ...(children.length > 0 ? { children } : {}),
      });
    }

    return results;
  }

  /**
   * Convert plain text to RichTextInterface
   */
  private textToRichText(text: string): RichTextInterface {
    return [text];
  }

  /**
   * Add a tag to a Rem (helper function)
   */
  private async addTagToRem(rem: PluginRem, tagName: string): Promise<void> {
    const tagRem = await this.plugin.rem.findByName([tagName], null);
    if (tagRem) {
      await rem.addTag(tagRem._id);
    } else {
      const newTag = await this.plugin.rem.createRem();
      if (newTag) {
        await newTag.setText(this.textToRichText(tagName));
        await rem.addTag(newTag._id);
      }
    }
  }

  /**
   * Normalize content before passing to create note.
   * Removes all blank lines.
   * This prevents the SDK from creating empty Rem nodes for blank lines,
   * which commonly appear in LLM-generated or user-pasted plain text.
   */
  private normalizeContent(content: string): string {
    return content
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');
  }

  /**
   * Helper to create Rems from markdown with proper single-line handling.
   * Dummy Root Strategy:
   * Prepend a dummy root and indent all user content.
   * This ensures that the SDK correctly parses structural markdown (esp. headers in first line)
   * even on what was originally the first line.
   */
  private async createRemsFromMarkdown(markdown: string, parentId: string): Promise<PluginRem[]> {
    if (!markdown.trim()) {
      return [];
    }

    //
    const indentedMarkdown = markdown
      .split('\n')
      .map((line) => '  ' + line)
      .join('\n');
    const dummyMarkdown = `dummy\n${indentedMarkdown}`;

    // Create the tree with the dummy root.
    // Use the same parentId so the dummy root is created where the content should eventually be.
    const tree = (await this.plugin.rem.createTreeWithMarkdown(dummyMarkdown, parentId)) || [];

    if (tree.length === 0) {
      return [];
    }

    // The first element is our dummy root.
    const dummyRoot = tree[0];
    const directChildren = await dummyRoot.getChildrenRem();

    // Move all direct children to the same parent as the dummy root when a concrete
    // target parent exists. When the dummy root lives at the top level, the SDK should
    // leave promoted children top-level after the dummy root is removed.
    const targetParent = await this.plugin.rem.findOne(parentId);

    for (const child of directChildren) {
      if (targetParent) {
        await child.setParent(targetParent);
      }
    }

    // Important: remove the dummy root.
    await dummyRoot.remove();

    // Return all created Rems (all descendants in the tree except the dummy root).
    return tree.slice(1);
  }

  /**
   * Remove all direct child Rems under a parent Rem.
   */
  private async clearDirectChildren(rem: PluginRem): Promise<void> {
    const children = await rem.getChildrenRem();
    for (const child of children) {
      await child.remove();
    }
  }

  /**
   * Helper to extract IDs and titles from a list of Rems.
   */
  private async extractRemResults(
    rems: PluginRem[]
  ): Promise<{ remIds: string[]; titles: string[] }> {
    const remIds = rems.map((r) => r._id);
    const titles = await Promise.all(rems.map((r) => this.extractText(r.text)));
    return { remIds, titles };
  }

  /**
   * Create a new note (Rem) in RemNote.
   * Supports both simple note creation and hierarchical markdown import
   * Supports flashcards create through RemNote markdown syntax.
   */
  async createNote(params: CreateNoteParams): Promise<{ remIds: string[]; titles: string[] }> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    const parentId = params.parentId || this.settings.defaultParentId;

    // Collect all tags to add
    const allTags = [...(params.tags || [])];
    // Add auto-tag if enabled
    if (this.settings.autoTagEnabled && this.settings.autoTag) {
      if (!allTags.includes(this.settings.autoTag)) {
        allTags.push(this.settings.autoTag);
      }
    }

    const remIds: string[] = [];
    const titles: string[] = [];
    const hasContent = params.content !== undefined && params.content !== null;

    // Scenario 1: title provided
    if (params.title) {
      const titleRem = await this.plugin.rem.createSingleRemWithMarkdown(params.title, parentId);
      if (!titleRem) throw new Error('Failed to create Rem');

      // Apply tags only to the title Rem
      for (const tagName of allTags) {
        await this.addTagToRem(titleRem, tagName);
      }

      remIds.push(titleRem._id);
      titles.push(params.title!);

      if (hasContent) {
        // Normalize content to collapse consecutive blank lines
        const normalizedContent = this.normalizeContent(params.content!);
        if (normalizedContent) {
          const createdRems = await this.createRemsFromMarkdown(normalizedContent, titleRem._id);
          if (createdRems.length > 0) {
            const results = await this.extractRemResults(createdRems);
            remIds.push(...results.remIds);
            titles.push(...results.titles);
          }
        }
      }

      return { remIds, titles };
    } else if (hasContent) {
      // Scenario 2: content only
      // Normalize content to collapse consecutive blank lines
      const normalizedContent = this.normalizeContent(params.content!);
      if (!normalizedContent) {
        throw new Error('Content is empty');
      }

      const createdRems = await this.createRemsFromMarkdown(normalizedContent, parentId);

      if (!createdRems || createdRems.length === 0) {
        throw new Error('No Rems created from markdown content');
      }

      // Apply tags only to direct children of parent rem
      for (const rem of createdRems) {
        const parentOfRem = await this.getParentRem(rem);
        if (
          (!parentId && !parentOfRem) ||
          (parentOfRem && parentOfRem._id === parentId) ||
          (!parentOfRem && parentId === '')
        ) {
          for (const tagName of allTags) {
            await this.addTagToRem(rem, tagName);
          }
        }
      }

      const results = await this.extractRemResults(createdRems);
      remIds.push(...results.remIds);
      titles.push(...results.titles);

      return { remIds, titles };
    } else {
      throw new Error('create_note requires either title or content');
    }
  }

  /**
   * Append content to today's journal/daily document
   */
  async appendJournal(
    params: AppendJournalParams
  ): Promise<{ remIds: string[]; titles: string[] }> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    const today = new Date();
    const dailyDoc = await this.plugin.date.getDailyDoc(today);

    if (!dailyDoc) {
      throw new Error('Failed to access daily document');
    }

    const remIds: string[] = [];
    const titles: string[] = [];
    let parentRemId: string = dailyDoc._id;
    // Build the content with optional timestamp
    const useTimestamp = params.timestamp ?? this.settings.journalTimestamp;
    const prefix = this.settings.journalPrefix;

    let prefixToCreate = '';
    if (prefix) {
      prefixToCreate += `${prefix} `;
    }
    if (useTimestamp) {
      prefixToCreate += `[${today.toLocaleTimeString()}] `;
    }

    // Normalize and create the tree
    let normalizedContent = this.normalizeContent(params.content);
    if (!normalizedContent) {
      throw new Error('Journal content is empty');
    }
    // If content is > 2 lines of markdown, add all content under a rem with prefix
    if (prefixToCreate !== '') {
      if (normalizedContent.split('\n').length > 2) {
        const titleRem = await this.plugin.rem.createRem();
        if (titleRem) {
          await titleRem.setText(this.textToRichText(prefixToCreate));
          await titleRem.setParent(dailyDoc);

          remIds.push(titleRem._id);
          titles.push(await this.extractText(titleRem.text));
          parentRemId = titleRem._id;
        }
      } else {
        // If content is only one line, add prefix to the content and add to daily doc directly
        normalizedContent = prefixToCreate + params.content;
        parentRemId = dailyDoc._id;
      }
    }

    // Create the tree under daily document or the prefix Rem
    const createdRems = await this.createRemsFromMarkdown(normalizedContent, parentRemId);
    const results = await this.extractRemResults(createdRems);
    remIds.push(...results.remIds);
    titles.push(...results.titles);

    return { remIds, titles };
  }

  /**
   * Search the knowledge base.
   *
   * Results are sorted by remType priority (document/concept > dailyDocument > portal >
   * descriptor > text) with intra-group ordering preserved from RemNote's search API as a proxy
   * for relevance (no score is available from the SDK).
   *
   * The RemNote SDK search API may enforce an opaque hard limit on result count beyond the
   * requested value — this is not controllable from the plugin side.
   */
  async search(params: SearchParams): Promise<{ results: SearchResultItem[] }> {
    const limit = params.limit ?? DEFAULT_SEARCH_LIMIT;
    const options = this.getSearchContentOptions(params);
    const sdkFetchLimit = this.getSearchSdkFetchLimit(limit);
    const tagNameCache: TagNameCache = new Map();

    // Use the search API - query must be RichTextInterface
    const searchResults = await this.plugin.search.search(
      this.textToRichText(params.query),
      undefined,
      { numResults: sdkFetchLimit }
    );

    const collected: Array<SearchResultItem & { _sourceIndex: number }> = [];
    const seen = new Set<string>();
    let sourceIndex = 0;

    for (const rem of searchResults) {
      if (seen.has(rem._id)) continue;
      seen.add(rem._id);

      const item = await this.buildSearchResultItem(rem, sourceIndex++, options, tagNameCache);
      collected.push(item);
    }

    // Sort by type priority, then by original SDK position within each type group
    collected.sort((a, b) => {
      const pa = TYPE_PRIORITY[a.remType ?? 'text'] ?? 5;
      const pb = TYPE_PRIORITY[b.remType ?? 'text'] ?? 5;
      if (pa !== pb) return pa - pb;
      return a._sourceIndex - b._sourceIndex;
    });

    // Strip internal _sourceIndex before returning
    const results: SearchResultItem[] = collected
      .map(({ _sourceIndex, ...rest }) => rest)
      .slice(0, limit);

    return { results };
  }

  /**
   * Search by tag and return ancestor context targets (document-first fallback).
   *
   * For each tagged Rem:
   * 1) Return the nearest ancestor document/daily document when available.
   * 2) Otherwise, return the nearest non-document ancestor.
   * 3) If no ancestor exists, return the tagged Rem itself.
   */
  async searchByTag(params: SearchByTagParams): Promise<{ results: SearchResultItem[] }> {
    const tag = params.tag.trim();
    if (!tag) {
      throw new Error('Tag cannot be empty');
    }

    const tagRem = await this.findTagRem(tag);
    if (!tagRem) {
      return { results: [] };
    }

    const options = this.getSearchContentOptions(params);
    const limit = params.limit ?? DEFAULT_SEARCH_LIMIT;
    const tagNameCache: TagNameCache = new Map();
    const taggedRems =
      'taggedRem' in tagRem && typeof tagRem.taggedRem === 'function'
        ? await tagRem.taggedRem()
        : [];

    const collected: Array<SearchResultItem & { _sourceIndex: number }> = [];
    const seenTargets = new Set<string>();
    let sourceIndex = 0;

    for (const taggedRem of taggedRems) {
      const targetRem = await this.resolveSearchByTagTarget(taggedRem);
      if (seenTargets.has(targetRem._id)) continue;
      seenTargets.add(targetRem._id);

      const item = await this.buildSearchResultItem(
        targetRem,
        sourceIndex++,
        options,
        tagNameCache
      );
      collected.push(item);
    }

    collected.sort((a, b) => {
      const pa = TYPE_PRIORITY[a.remType ?? 'text'] ?? 5;
      const pb = TYPE_PRIORITY[b.remType ?? 'text'] ?? 5;
      if (pa !== pb) return pa - pb;
      return a._sourceIndex - b._sourceIndex;
    });

    const results = collected.map(({ _sourceIndex, ...rest }) => rest).slice(0, limit);
    return { results };
  }

  /**
   * Read a note by its ID.
   *
   * Returns metadata (title, headline, aliases, remType, cardDirection) and optionally
   * rendered markdown content of the child subtree.
   */
  async readNote(params: ReadNoteParams): Promise<{
    remId: string;
    title: string;
    headline: string;
    parentRemId?: string;
    parentTitle?: string;
    aliases?: string[];
    tags?: string[];
    remType: RemClassification;
    cardDirection?: CardDirection;
    content?: string;
    contentStructured?: StructuredContentNode[];
    contentProperties?: ContentProperties;
  }> {
    const depth = params.depth ?? DEFAULT_DEPTH;
    const includeContent = this.parseReadIncludeContentMode(params.includeContent);
    const childLimit = params.childLimit ?? DEFAULT_CHILD_LIMIT;
    const maxContentLength = params.maxContentLength ?? DEFAULT_READ_MAX_CONTENT_LENGTH;

    const rem = await this.plugin.rem.findOne(params.remId);

    if (!rem) {
      throw new Error(`Note not found: ${params.remId}`);
    }

    const tagNameCache: TagNameCache = new Map();
    const [{ title, detail }, remType, cardDirection, aliases, tags, parentContext] =
      await Promise.all([
        this.getTitleAndDetail(rem),
        this.classifyRem(rem),
        rem.backText
          ? rem.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
          : Promise.resolve(undefined),
        this.getAliases(rem),
        this.getTagNames(rem, tagNameCache),
        this.getParentContext(rem),
      ]);

    const headline = this.formatHeadline(title, detail, remType);

    let content: string | undefined;
    let contentStructured: StructuredContentNode[] | undefined;
    let contentProperties: ContentProperties | undefined;

    if (includeContent === 'markdown') {
      const renderResult = await this.renderContentMarkdown(
        rem,
        depth,
        childLimit,
        maxContentLength
      );
      // Always include content for markdown mode (even if empty string)
      content = renderResult.content;
      contentProperties = await this.buildContentProperties(rem, renderResult, depth);
    } else if (includeContent === 'structured') {
      const structuredChildren = await this.renderContentStructured(
        rem,
        depth,
        childLimit,
        tagNameCache
      );
      if (structuredChildren.length > 0) {
        contentStructured = structuredChildren;
      }
    }

    return {
      remId: rem._id,
      title,
      headline,
      ...parentContext,
      ...(aliases.length > 0 ? { aliases } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      remType,
      ...(cardDirection ? { cardDirection } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(contentStructured ? { contentStructured } : {}),
      ...(contentProperties ? { contentProperties } : {}),
    };
  }

  /**
   * Update an existing note
   */
  async updateNote(params: UpdateNoteParams): Promise<{ titles: string[]; remIds: string[] }> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    if (params.appendContent !== undefined && params.replaceContent !== undefined) {
      throw new Error('appendContent and replaceContent cannot be used together');
    }

    if (params.replaceContent !== undefined && !this.settings.acceptReplaceOperation) {
      throw new Error('Replace operation is disabled in Automation Bridge settings');
    }

    const rem = await this.plugin.rem.findOne(params.remId);

    if (!rem) {
      throw new Error(`Note not found: ${params.remId}`);
    }

    const remIds: string[] = [];
    const titles: string[] = [];

    // Update title if provided
    if (params.title !== undefined && params.title !== null) {
      const richText = await this.plugin.richText.parseFromMarkdown(params.title);
      await rem.setText(richText);
      titles.push(params.title);
      remIds.push(params.remId);
    }

    // Replace content by clearing all direct children first, then adding new child lines.
    if (params.replaceContent !== undefined) {
      await this.clearDirectChildren(rem);
      const normalizedContent = this.normalizeContent(params.replaceContent);
      if (normalizedContent) {
        const createdRems = await this.createRemsFromMarkdown(normalizedContent, rem._id);

        if (createdRems.length > 0) {
          const results = await this.extractRemResults(createdRems);
          remIds.push(...results.remIds);
          titles.push(...results.titles);
        }
      }
    }

    // Append content as new direct children.
    if (params.appendContent !== undefined) {
      const normalizedContent = this.normalizeContent(params.appendContent);
      if (normalizedContent) {
        const createdRems = await this.createRemsFromMarkdown(normalizedContent, rem._id);

        if (createdRems.length > 0) {
          const results = await this.extractRemResults(createdRems);
          remIds.push(...results.remIds);
          titles.push(...results.titles);
        }
      }
    }

    // Add tags
    if (params.addTags && params.addTags.length > 0) {
      for (const tagName of params.addTags) {
        await this.addTagToRem(rem, tagName);
      }
    }

    // Remove tags
    if (params.removeTags && params.removeTags.length > 0) {
      for (const tagName of params.removeTags) {
        const tagRem = await this.plugin.rem.findByName([tagName], null);
        if (tagRem) {
          await rem.removeTag(tagRem._id);
        }
      }
    }

    return { titles, remIds };
  }

  /**
   * Read table data from a RemNote table (tagged rems with properties).
   */
  async readTable(params: ReadTableParams): Promise<ReadTableResult> {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    // 1. Resolve table rem from one explicit identifier
    const tableRem = await this.resolveTableRem(params);

    // 2. Extract columns: get children, filter by isProperty()
    const propertyChildren = await this.getTablePropertyChildren(tableRem);

    // Check for no properties BEFORE applying filter
    if (propertyChildren.length === 0) {
      throw new Error(`Rem '${tableRem._id}' has no properties — not a table`);
    }

    // Get property names for filtering
    const propertyNames = await Promise.all(
      propertyChildren.map((prop) => this.extractText(prop.text))
    );

    // Apply propertyFilter if provided (matches by property NAME)
    let columns: TableColumn[] = [];
    if (params.propertyFilter && params.propertyFilter.length > 0) {
      const filterSet = new Set(params.propertyFilter.map((f) => f.toLowerCase()));
      columns = await Promise.all(
        propertyChildren
          .filter((prop, idx) => filterSet.has(propertyNames[idx].toLowerCase()))
          .map(async (prop) => {
            const propType = await prop.getPropertyType();
            return {
              propertyId: prop._id,
              name: await this.extractText(prop.text),
              type: propType ? String(propType) : 'unknown',
            };
          })
      );
    } else {
      columns = await Promise.all(
        propertyChildren.map(async (prop) => {
          const propType = await prop.getPropertyType();
          return {
            propertyId: prop._id,
            name: await this.extractText(prop.text),
            type: propType ? String(propType) : 'unknown',
          };
        })
      );
    }

    // 3. Extract rows: get tagged rems
    // TODO: Replace this full fetch + slice with SDK-level pagination or chunked iteration once available.
    // Large tables currently require loading every tagged row before applying limit/offset here.
    const allTaggedRems =
      'taggedRem' in tableRem && typeof tableRem.taggedRem === 'function'
        ? await tableRem.taggedRem()
        : [];

    const totalRows = allTaggedRems.length;
    const slicedRows = allTaggedRems.slice(offset, offset + limit);

    // 4. Build row data
    const rows: TableRow[] = await Promise.all(
      slicedRows.map(async (row) => {
        const name = await this.extractText(row.text);
        const values: Record<string, string> = {};

        for (const column of columns) {
          const propValue = await row.getTagPropertyValue(column.propertyId);
          values[column.propertyId] = await this.extractText(propValue);
        }

        return {
          remId: row._id,
          name,
          values,
        };
      })
    );

    return {
      tableId: tableRem._id,
      tableName: await this.extractText(tableRem.text),
      columns,
      rows,
      totalRows,
      rowsReturned: rows.length,
    };
  }

  /**
   * Get plugin status
   */
  async getStatus(): Promise<{
    connected: boolean;
    pluginVersion: string;
    knowledgeBaseId?: string;
    acceptWriteOperations: boolean;
    acceptReplaceOperation: boolean;
  }> {
    return {
      connected: true,
      pluginVersion: __PLUGIN_VERSION__,
      knowledgeBaseId: undefined,
      acceptWriteOperations: this.settings.acceptWriteOperations,
      acceptReplaceOperation: this.settings.acceptReplaceOperation,
    };
  }
}
