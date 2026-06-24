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
  DEFAULT_AUTO_TAG_REM_ID,
  DEFAULT_JOURNAL_PREFIX,
} from '../settings';
import { withScopedLogPrefix } from '../logging';

// Build-time constant injected by webpack DefinePlugin
declare const __PLUGIN_VERSION__: string;

export type ContentMode = 'none' | 'markdown' | 'structured';
export type SearchByTagResultMode = 'context' | 'tagged';
export type ResultView = 'compact' | 'standard' | 'full';

export interface CreateNoteParams {
  title?: string;
  content?: string;
  parentId?: string;
  tagRemIds?: string[];
  asDocument?: boolean;
}

export interface AppendJournalParams {
  content: string;
  timestamp?: boolean;
  tagRemIds?: string[];
}

export interface SearchParams {
  query: string;
  parentRemId?: string;
  limit?: number;
  cursor?: string;
  contentMode?: ContentMode;
  depth?: number;
  childLimit?: number;
  maxContentLength?: number;
  ancestorDepth?: number;
  view?: ResultView;
}

export interface SearchByTagParams {
  tagRemId: string;
  resultMode?: SearchByTagResultMode;
  limit?: number;
  cursor?: string;
  contentMode?: ContentMode;
  depth?: number;
  childLimit?: number;
  maxContentLength?: number;
  ancestorDepth?: number;
  view?: ResultView;
}

export interface ReadNoteParams {
  remId: string;
  depth?: number;
  contentMode?: ContentMode;
  childLimit?: number;
  maxContentLength?: number;
  ancestorDepth?: number;
  view?: ResultView;
}

export interface UpdateNoteParams {
  remId: string;
  title?: string;
}

export interface SetDocumentStatusParams {
  remId: string;
  isDocument: boolean;
  dryRun?: boolean;
  expectedOldRemType?: RemClassification;
}

export type InsertChildrenPosition = 'first' | 'last' | 'before' | 'after';

export interface InsertChildrenParams {
  parentRemId: string;
  content: string;
  position: InsertChildrenPosition;
  siblingRemId?: string;
}

export interface ReplaceChildrenParams {
  parentRemId: string;
  content: string;
}

export interface UpdateTagsParams {
  remId: string;
  addTagRemIds?: string[];
  removeTagRemIds?: string[];
}

export type SetPropertyValue =
  | { kind: 'text'; text: string }
  | { kind: 'rem_reference'; remId: string }
  | { kind: 'clear' };

export interface SetPropertyParams {
  remId: string;
  tagRemId: string;
  propertyRemId: string;
  value: SetPropertyValue;
}

export interface SetPropertyResult {
  remId: string;
  tagRemId: string;
  propertyRemId: string;
  valueKind: SetPropertyValue['kind'];
}

export interface ListChildrenParams {
  parentRemId: string;
  limit?: number;
  cursor?: string;
  ancestorDepth?: number;
  view?: ResultView;
}

export interface MoveNoteParams {
  remId: string;
  newParentRemId: string;
  position?: InsertChildrenPosition;
  siblingRemId?: string;
  dryRun?: boolean;
  expectedOldParentRemId?: string;
  ancestorDepth?: number;
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

export interface InlineReference {
  text: string;
  targetRemId: string;
  kind: 'rem';
}

export interface SearchResultItem {
  remId: string;
  title: string;
  headline: string;
  inlineRefs?: InlineReference[];
  parentRemId?: string;
  parentTitle?: string;
  ancestors?: AncestorInfo[];
  ancestorsTruncated?: boolean;
  aliases?: string[];
  tags?: TagInfo[];
  remType: RemClassification;
  matchedRems?: MatchedRemMetadata[];
  contextRemId?: string;
  contextTitle?: string;
  contextReason?: SearchByTagContextReason;
  cardDirection?: CardDirection;
  content?: string;
  contentStructured?: StructuredContentNode[];
  contentProperties?: ContentProperties;
}

export type SearchTruncationReason = 'cursor_snapshot_limit';

export interface SearchResult {
  results: SearchResultItem[];
  hasMore: boolean;
  nextCursor?: string;
  truncated: boolean;
  truncationReason?: SearchTruncationReason;
}

export interface MatchedRemMetadata {
  remId: string;
  title: string;
  headline: string;
  inlineRefs?: InlineReference[];
  remType: RemClassification;
  parentRemId?: string;
  parentTitle?: string;
  ancestors?: AncestorInfo[];
  ancestorsTruncated?: boolean;
  tags?: TagInfo[];
}

export interface StructuredContentNode {
  remId: string;
  title: string;
  headline: string;
  inlineRefs?: InlineReference[];
  remType: RemClassification;
  aliases?: string[];
  tags?: TagInfo[];
  cardDirection?: CardDirection;
  children?: StructuredContentNode[];
}

export interface TagInfo {
  tagRemId: string;
  name: string;
}

export interface AncestorInfo {
  remId: string;
  title: string;
  remType?: RemClassification;
}

interface ParentContext {
  parentRemId?: string;
  parentTitle?: string;
}

interface AncestorContext {
  ancestors?: AncestorInfo[];
  ancestorsTruncated?: boolean;
}

export interface ListChildrenResult {
  children: SearchResultItem[];
  hasMore: boolean;
  nextCursor?: string;
  totalChildren: number;
}

export interface MoveNoteResult {
  remId: string;
  title: string;
  dryRun: boolean;
  oldParentRemId?: string;
  oldParentTitle?: string;
  newParentRemId: string;
  newParentTitle: string;
  position: InsertChildrenPosition;
  siblingRemId?: string;
  ancestorsBefore?: AncestorInfo[];
  ancestorsBeforeTruncated?: boolean;
  ancestorsAfter?: AncestorInfo[];
  ancestorsAfterTruncated?: boolean;
}

export interface SetDocumentStatusResult {
  remId: string;
  title: string;
  oldRemType: RemClassification;
  newRemType: RemClassification;
  oldIsDocument: boolean;
  newIsDocument: boolean;
  requestedIsDocument: boolean;
  dryRun: boolean;
  changed: boolean;
  wouldChange: boolean;
  sdkSupportsDocumentStatus: boolean;
  warnings?: string[];
  cardDirectionBefore?: CardDirection;
  cardDirectionAfter?: CardDirection;
}

export type RemClassification =
  | 'document'
  | 'dailyDocument'
  | 'concept'
  | 'descriptor'
  | 'portal'
  | 'text';

export type CardDirection = 'forward' | 'reverse' | 'bidirectional';
export type SearchByTagContextReason =
  | 'ancestor-document'
  | 'ancestor-concept'
  | 'ancestor-context'
  | 'self';

/** Default number of search results when no limit is specified. */
const DEFAULT_SEARCH_LIMIT = 50;
/** Fetch extra search results from SDK before dedupe to reduce underfilled unique result sets. */
const SEARCH_OVERSAMPLE_FACTOR = 2;
/** Maximum SDK result window captured for cursor-backed search snapshots. */
const SEARCH_CURSOR_SNAPSHOT_LIMIT = 1000;
/** Maximum active search snapshots retained by the bridge. */
const SEARCH_CURSOR_MAX_ACTIVE = 20;
/** Search snapshots are short-lived because they capture an ordering view of mutable KB state. */
const SEARCH_CURSOR_TTL_MS = 15 * 60 * 1000;

/** Default recursion depth for read operations. */
const DEFAULT_DEPTH = 5;

/** Default child limit per level for content rendering. */
const DEFAULT_CHILD_LIMIT = 100;

/** Absolute cap for childrenTotal counting to prevent expensive full-tree traversal. */
const CHILDREN_TOTAL_CAP = 2000;

/** Maximum parent traversal depth when checking for descendant relationship. */
const MAX_DESCENDANT_DEPTH_CHECK = 100;

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
  contentMode: ContentMode;
  depth: number;
  childLimit: number;
  maxContentLength: number;
  ancestorDepth: number;
  view: ResultView;
}

interface SearchCursorSnapshot {
  id: string;
  query: string;
  queryHash: string;
  parentRemId?: string;
  remIds: string[];
  createdAt: number;
  lastAccessedAt: number;
  truncated: boolean;
  truncationReason?: SearchTruncationReason;
}

interface SearchByTagSnapshotEntry {
  remId: string;
  remType: RemClassification;
  sourceIndex: number;
  matchedRemIds?: string[];
  contextRemId?: string;
  contextReason?: SearchByTagContextReason;
}

interface SearchByTagCursorSnapshot {
  id: string;
  tagRemId: string;
  resultMode: SearchByTagResultMode;
  bindingHash: string;
  entries: SearchByTagSnapshotEntry[];
  createdAt: number;
  lastAccessedAt: number;
  truncated: boolean;
  truncationReason?: SearchTruncationReason;
}

interface ParsedSearchCursor {
  snapshotId: string;
  offset: number;
  queryHash: string;
}

type TagNameCache = Map<string, string | null>;

type TagReferenceLike = {
  _id?: string;
  text?: RichTextInterface;
};

interface RichTextRenderResult {
  text: string;
  inlineRefs: InlineReference[];
}

interface TitleDetailRenderResult {
  title: string;
  detail?: string;
  inlineRefs: InlineReference[];
}

interface IdReferenceToken {
  placeholder: string;
  remId: string;
}

interface PreparedMarkdown {
  markdown: string;
  idReferenceTokens: IdReferenceToken[];
}

interface DiagnosticTrace {
  action: string;
  operationId: string;
  startedAtMs: number;
}

const CONTENT_MODES: readonly ContentMode[] = ['none', 'markdown', 'structured'];
const RESULT_VIEWS: readonly ResultView[] = ['compact', 'standard', 'full'];
const ID_REFERENCE_TOKEN_PATTERN = /\[\[id:([^\]\n]*)\]\]/g;
const ID_REFERENCE_PLACEHOLDER_PREFIX = 'rnbridgeidrefplaceholder';

export class RemAdapter {
  private settings: AutomationBridgeSettings;
  private readonly emittedTagDebugKeys = new Set<string>();
  private readonly searchCursorSnapshots = new Map<string, SearchCursorSnapshot>();
  private readonly searchByTagCursorSnapshots = new Map<string, SearchByTagCursorSnapshot>();
  private nextDiagnosticSequence = 1;

  constructor(
    private plugin: ReactRNPlugin,
    settings?: Partial<AutomationBridgeSettings>
  ) {
    // Default settings
    this.settings = {
      acceptWriteOperations: DEFAULT_ACCEPT_WRITE_OPERATIONS,
      acceptReplaceOperation: DEFAULT_ACCEPT_REPLACE_OPERATION,
      autoTagEnabled: true,
      autoTagRemId: DEFAULT_AUTO_TAG_REM_ID,
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

  private mergeInlineRefs(...refGroups: InlineReference[][]): InlineReference[] {
    return refGroups.flat();
  }

  /**
   * Render RichTextInterface, resolving references and applying markdown formatting.
   *
   * Handles all SDK rich text element types:
   * - Plain strings, formatted text (bold/italic/code/links), Rem references,
   *   global names, LaTeX, annotations, images, audio, drawings.
   * - Card delimiters and plugin elements produce empty strings.
   * - Circular references are guarded via visitedIds set.
   */
  private async renderRichText(
    richText: RichTextInterface | undefined,
    visitedIds?: Set<string>
  ): Promise<RichTextRenderResult> {
    if (!richText || !Array.isArray(richText)) return { text: '', inlineRefs: [] };

    const visited = visitedIds ?? new Set<string>();
    const parts: string[] = [];
    const inlineRefs: InlineReference[] = [];

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
              const refRender = await this.renderRichText(refRem.text, visited);
              const refText = refRender.text || '[untitled reference]';
              parts.push(`[[${refText}]]`);
              inlineRefs.push({
                text: refText,
                targetRemId: refId,
                kind: 'rem',
              });
            } else if (el.textOfDeletedRem) {
              const deletedRender = await this.renderRichText(
                el.textOfDeletedRem as RichTextInterface,
                visited
              );
              parts.push(deletedRender.text || '[deleted reference]');
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
              const gRender = await this.renderRichText(gRem.text, visited);
              parts.push(gRender.text);
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

    return {
      text: parts.join(''),
      inlineRefs,
    };
  }

  /**
   * Extract rendered text from RichTextInterface.
   */
  private async extractText(
    richText: RichTextInterface | undefined,
    visitedIds?: Set<string>
  ): Promise<string> {
    return (await this.renderRichText(richText, visitedIds)).text;
  }

  /**
   * Classify a Rem into a semantic type using SDK metadata.
   */
  private async classifyRem(
    rem: PluginRem,
    documentStatusOverride?: boolean
  ): Promise<RemClassification> {
    if (await rem.hasPowerup(BuiltInPowerupCodes.DailyDocument)) return 'dailyDocument';
    const isDocument = documentStatusOverride ?? (await rem.isDocument());
    if (isDocument) return 'document';
    if (rem.type === RemType.CONCEPT) return 'concept';
    if (rem.type === RemType.DESCRIPTOR) return 'descriptor';
    if (rem.type === RemType.PORTAL) return 'portal';
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

  private async getCardDirection(rem: PluginRem): Promise<CardDirection | undefined> {
    if (!rem.backText) return undefined;
    return this.mapCardDirection(await rem.getPracticeDirection());
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

  private async getTitleAndDetail(rem: PluginRem): Promise<TitleDetailRenderResult> {
    const delimiterIndex = this.getCardDelimiterIndex(rem.text);
    if (delimiterIndex >= 0 && Array.isArray(rem.text)) {
      const front = await this.renderRichText(
        rem.text.slice(0, delimiterIndex) as RichTextInterface
      );

      // Prefer canonical SDK backText when available; fallback to right side of inline delimiter.
      const detailSource =
        rem.backText && rem.backText.length > 0
          ? rem.backText
          : (rem.text.slice(delimiterIndex + 1) as RichTextInterface);

      const detail = await this.renderRichText(detailSource);
      return {
        title: front.text,
        ...(detail.text ? { detail: detail.text } : {}),
        inlineRefs: this.mergeInlineRefs(front.inlineRefs, detail.inlineRefs),
      };
    }

    const title = await this.renderRichText(rem.text);
    if (rem.backText && rem.backText.length > 0) {
      const detail = await this.renderRichText(rem.backText);
      return {
        title: title.text,
        ...(detail.text ? { detail: detail.text } : {}),
        inlineRefs: this.mergeInlineRefs(title.inlineRefs, detail.inlineRefs),
      };
    }

    return { title: title.text, inlineRefs: title.inlineRefs };
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
   * Resolve direct tags for a Rem.
   *
   * Live validation in RemNote confirmed `getTagRems()` as the working reverse tag-read path.
   */
  private async getTags(rem: PluginRem, tagNameCache: TagNameCache): Promise<TagInfo[]> {
    const getTagRems = (
      rem as unknown as { getTagRems?: () => TagReferenceLike[] | Promise<TagReferenceLike[]> }
    ).getTagRems;

    if (typeof getTagRems !== 'function') {
      this.logTagDebugOnce(
        `missing-getTagRems:${rem._id}`,
        `Tag read unavailable for rem ${rem._id}: getTagRems() is missing`
      );
      return [];
    }

    let tagRefs: TagReferenceLike[];
    try {
      const resolved = await Promise.resolve(getTagRems.call(rem));
      if (!Array.isArray(resolved)) {
        this.logTagDebugOnce(
          `non-array-getTagRems:${rem._id}`,
          `Tag read via getTagRems() returned a non-array result for rem ${rem._id}`,
          {
            resolvedType: typeof resolved,
            resolved,
          }
        );
        return [];
      }
      tagRefs = resolved;
    } catch (error) {
      this.logTagDebugOnce(
        `throwing-getTagRems:${rem._id}`,
        `Tag read via getTagRems() failed for rem ${rem._id}`,
        {
          error: this.describeError(error),
        }
      );
      return [];
    }

    if (tagRefs.length === 0) {
      return [];
    }

    const results: TagInfo[] = [];
    const seen = new Set<string>();

    for (const tagRef of tagRefs) {
      const resolvedTag = await this.resolveTagReference(tagRef, tagNameCache);
      const { tagRemId, name } = resolvedTag;

      if (!tagRemId || !name || seen.has(tagRemId)) continue;
      seen.add(tagRemId);
      results.push({ tagRemId, name });

      if (tagNameCache.get(tagRemId) === undefined) {
        tagNameCache.set(tagRemId, name);
      }
    }

    if (tagRefs.length > 0 && results.length === 0) {
      this.logTagDebugOnce(
        `unresolved-getTagRems:${rem._id}`,
        `Tag read via getTagRems() returned values for rem ${rem._id}, but none could be resolved`,
        {
          references: tagRefs.slice(0, 3).map((tagRef) => this.describeTagReference(tagRef)),
          resultCount: tagRefs.length,
        }
      );
    }

    return results;
  }

  private async resolveTagReference(
    tagRef: TagReferenceLike,
    tagNameCache: TagNameCache
  ): Promise<{ tagRemId?: string; name: string | null }> {
    if (!tagRef || typeof tagRef !== 'object') {
      return { name: null };
    }

    const tagRemId = typeof tagRef._id === 'string' && tagRef._id ? tagRef._id : undefined;
    if (tagRemId) {
      const cachedTagName = tagNameCache.get(tagRemId);
      if (cachedTagName !== undefined) {
        return { tagRemId, name: cachedTagName };
      }
    }

    const inlineTagName =
      Array.isArray(tagRef.text) && tagRef.text.length > 0
        ? (await this.extractText(tagRef.text)) || null
        : null;
    if (tagRemId && inlineTagName !== null) {
      tagNameCache.set(tagRemId, inlineTagName);
    }

    if (inlineTagName || !tagRemId) {
      return { tagRemId, name: inlineTagName };
    }

    const resolvedById = await this.resolveTagId(tagRemId, tagNameCache);
    return resolvedById;
  }

  private async resolveTagId(
    tagRemId: string,
    tagNameCache: TagNameCache
  ): Promise<{ tagRemId: string; name: string | null }> {
    const cachedTagName = tagNameCache.get(tagRemId);
    if (cachedTagName !== undefined) {
      return { tagRemId, name: cachedTagName };
    }

    const tagRem = await this.plugin.rem.findOne(tagRemId);
    const tagName = tagRem ? (await this.extractText(tagRem.text)) || null : null;
    tagNameCache.set(tagRemId, tagName);
    return { tagRemId, name: tagName };
  }

  private describeTagReference(tagRef: TagReferenceLike): Record<string, unknown> {
    if (!tagRef || typeof tagRef !== 'object') {
      return { kind: typeof tagRef, value: tagRef };
    }

    return {
      kind: 'object',
      id: typeof tagRef._id === 'string' ? tagRef._id : undefined,
      hasText: Array.isArray(tagRef.text),
    };
  }

  private describeError(error: unknown): { name?: string; message: string } {
    if (error instanceof Error) {
      return {
        ...(error.name ? { name: error.name } : {}),
        message: error.message,
      };
    }

    return { message: String(error) };
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

  private startDiagnosticTrace(action: string, details?: Record<string, unknown>): DiagnosticTrace {
    const trace: DiagnosticTrace = {
      action,
      operationId: `${action}-${Date.now().toString(36)}-${this.nextDiagnosticSequence++}`,
      startedAtMs: Date.now(),
    };
    this.logDiagnosticTrace(trace, 'start', details);
    return trace;
  }

  private logDiagnosticTrace(
    trace: DiagnosticTrace | undefined,
    step: string,
    details?: Record<string, unknown>
  ): void {
    if (!trace) return;

    const elapsedMs = Date.now() - trace.startedAtMs;
    const message = `${trace.action} ${trace.operationId} ${step} +${elapsedMs}ms`;

    if (details === undefined) {
      console.log(withScopedLogPrefix('adapter', message));
      return;
    }

    console.log(withScopedLogPrefix('adapter', message), details);
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
  private async getParentContext(rem: PluginRem): Promise<ParentContext> {
    const parentRem = await this.getParentRem(rem);
    if (!parentRem) return {};

    const { title: parentTitle } = await this.getTitleAndDetail(parentRem);
    return {
      parentRemId: parentRem._id,
      parentTitle,
    };
  }

  private async getAncestors(rem: PluginRem, ancestorDepth: number): Promise<AncestorContext> {
    if (ancestorDepth <= 0) return {};

    const ancestors: AncestorInfo[] = [];
    let parentRem = await this.getParentRem(rem);

    while (parentRem && ancestors.length < ancestorDepth) {
      const [{ title }, remType] = await Promise.all([
        this.getTitleAndDetail(parentRem),
        this.classifyRem(parentRem),
      ]);
      ancestors.push({ remId: parentRem._id, title, remType });
      parentRem = await this.getParentRem(parentRem);
    }

    if (ancestors.length === 0) return {};
    return {
      ancestors,
      ...(parentRem ? { ancestorsTruncated: true } : {}),
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
   * Check if a Rem is a descendant of a specific ancestor Rem ID.
   * Uses a cache Map to avoid redundant parent traversal API calls.
   */
  private async isDescendant(
    rem: PluginRem,
    ancestorId: string,
    cache?: Map<string, boolean>
  ): Promise<boolean> {
    if (rem._id === ancestorId) {
      return false;
    }
    let current: PluginRem | undefined = rem;
    const path: string[] = [];
    const visited = new Set<string>();
    let isMatch = false;
    let depth = 0;

    while (current) {
      if (depth >= MAX_DESCENDANT_DEPTH_CHECK) {
        throw new Error(
          `Subtree hierarchy validation exceeded maximum depth check of ${MAX_DESCENDANT_DEPTH_CHECK} levels. Traversal stopped to prevent infinite loops (e.g., circular portal references).`
        );
      }
      if (visited.has(current._id)) {
        break;
      }
      visited.add(current._id);

      const cacheKey = `${ancestorId}:${current._id}`;
      if (cache?.has(cacheKey)) {
        isMatch = cache.get(cacheKey)!;
        break;
      }
      if (current._id === ancestorId) {
        isMatch = true;
        break;
      }
      path.push(current._id);
      current = await this.getParentRem(current);
      depth++;
    }

    if (cache) {
      for (const id of path) {
        const cacheKey = `${ancestorId}:${id}`;
        cache.set(cacheKey, isMatch);
      }
    }
    return isMatch;
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

  private parseContentMode(
    contentMode: ContentMode | undefined,
    fieldName: string,
    defaultMode: ContentMode
  ): ContentMode {
    const mode = contentMode ?? defaultMode;
    if ((CONTENT_MODES as readonly string[]).includes(mode)) {
      return mode;
    }
    throw new Error(
      `Invalid ${fieldName}: ${String(mode)}. Expected one of: ${CONTENT_MODES.join(', ')}`
    );
  }

  private parseSearchByTagResultMode(
    resultMode: SearchByTagParams['resultMode']
  ): SearchByTagResultMode {
    const mode = resultMode ?? 'context';
    if (mode === 'context' || mode === 'tagged') {
      return mode;
    }
    throw new Error(
      `Invalid resultMode for search_by_tag: ${String(
        resultMode
      )}. Expected one of: context, tagged`
    );
  }

  private parseResultView(view: ResultView | undefined): ResultView {
    const resultView = view ?? 'standard';
    if ((RESULT_VIEWS as readonly string[]).includes(resultView)) {
      return resultView;
    }
    throw new Error(`Invalid view: ${String(view)}. Expected one of: ${RESULT_VIEWS.join(', ')}`);
  }

  private getAncestorDepth(requestedDepth: number | undefined): number {
    const depth = requestedDepth ?? 0;
    if (!Number.isInteger(depth) || depth < 0 || depth > 20) {
      throw new Error('ancestorDepth must be an integer between 0 and 20');
    }
    return depth;
  }

  private getSearchSdkFetchLimit(requestedLimit: number): number {
    return Math.max(requestedLimit, Math.trunc(requestedLimit * SEARCH_OVERSAMPLE_FACTOR));
  }

  private getSearchLimit(requestedLimit: number | undefined): number {
    const limit = requestedLimit ?? DEFAULT_SEARCH_LIMIT;
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('Search limit must be a positive integer');
    }
    return limit;
  }

  private createListChildrenCursor(
    parentRemId: string,
    offset: number,
    totalChildren: number
  ): string | undefined {
    if (offset >= totalChildren) {
      return undefined;
    }
    return `list_children:v1:${parentRemId}:${offset}:${this.hashSearchQuery(parentRemId)}`;
  }

  private parseListChildrenCursor(parentRemId: string, cursor: string | undefined): number {
    if (!cursor) return 0;
    const parts = cursor.split(':');
    if (parts.length !== 5 || parts[0] !== 'list_children' || parts[1] !== 'v1') {
      throw new Error('Invalid list_children cursor');
    }

    const offset = Number(parts[3]);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Invalid list_children cursor offset');
    }

    if (parts[2] !== parentRemId || parts[4] !== this.hashSearchQuery(parentRemId)) {
      throw new Error('list_children cursor does not match parentRemId');
    }

    return offset;
  }

  private createSearchSnapshotId(): string {
    const cryptoWithUuid = globalThis.crypto as Crypto | undefined;
    if (cryptoWithUuid?.randomUUID) {
      return cryptoWithUuid.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private hashSearchQuery(query: string): string {
    let hash = 2166136261;
    for (let i = 0; i < query.length; i++) {
      hash ^= query.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  private createSearchCursor(snapshot: SearchCursorSnapshot, offset: number): string | undefined {
    if (offset >= snapshot.remIds.length) {
      return undefined;
    }
    return `search:v1:${snapshot.id}:${offset}:${snapshot.queryHash}`;
  }

  private createSearchByTagCursor(
    snapshot: SearchByTagCursorSnapshot,
    offset: number
  ): string | undefined {
    if (offset >= snapshot.entries.length) {
      return undefined;
    }
    return `search_by_tag:v1:${snapshot.id}:${offset}:${snapshot.bindingHash}`;
  }

  private parseSearchCursor(cursor: string): ParsedSearchCursor {
    const parts = cursor.split(':');
    if (parts.length !== 5 || parts[0] !== 'search' || parts[1] !== 'v1') {
      throw new Error('Invalid search cursor');
    }

    const offset = Number(parts[3]);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Invalid search cursor offset');
    }

    return {
      snapshotId: parts[2],
      offset,
      queryHash: parts[4],
    };
  }

  private parseSearchByTagCursor(cursor: string): ParsedSearchCursor {
    const parts = cursor.split(':');
    if (parts.length !== 5 || parts[0] !== 'search_by_tag' || parts[1] !== 'v1') {
      throw new Error('Invalid search_by_tag cursor');
    }

    const offset = Number(parts[3]);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Invalid search_by_tag cursor offset');
    }

    return {
      snapshotId: parts[2],
      offset,
      queryHash: parts[4],
    };
  }

  private pruneExpiredSearchSnapshots(now = Date.now()): void {
    for (const [id, snapshot] of this.searchCursorSnapshots.entries()) {
      if (now - snapshot.lastAccessedAt > SEARCH_CURSOR_TTL_MS) {
        this.searchCursorSnapshots.delete(id);
      }
    }

    for (const [id, snapshot] of this.searchByTagCursorSnapshots.entries()) {
      if (now - snapshot.lastAccessedAt > SEARCH_CURSOR_TTL_MS) {
        this.searchByTagCursorSnapshots.delete(id);
      }
    }
  }

  private enforceSearchSnapshotLimit(): void {
    this.enforceSnapshotMapLimit(this.searchCursorSnapshots);
    this.enforceSnapshotMapLimit(this.searchByTagCursorSnapshots);
  }

  private enforceSnapshotMapLimit(snapshots: Map<string, { lastAccessedAt: number }>): void {
    while (snapshots.size > SEARCH_CURSOR_MAX_ACTIVE) {
      let oldestId: string | undefined;
      let oldestAccess = Number.POSITIVE_INFINITY;

      for (const [id, snapshot] of snapshots.entries()) {
        if (snapshot.lastAccessedAt < oldestAccess) {
          oldestAccess = snapshot.lastAccessedAt;
          oldestId = id;
        }
      }

      if (!oldestId) return;
      snapshots.delete(oldestId);
    }
  }

  private getSearchSnapshotFromCursor(
    query: string,
    cursor: string,
    parentRemId?: string
  ): {
    snapshot: SearchCursorSnapshot;
    offset: number;
  } {
    this.pruneExpiredSearchSnapshots();
    const parsed = this.parseSearchCursor(cursor);
    const snapshot = this.searchCursorSnapshots.get(parsed.snapshotId);

    if (!snapshot) {
      throw new Error('Search cursor expired or not found; rerun search');
    }

    if (
      snapshot.query !== query ||
      snapshot.queryHash !== parsed.queryHash ||
      snapshot.parentRemId !== parentRemId
    ) {
      throw new Error('Search cursor does not match query or parent rem id');
    }

    snapshot.lastAccessedAt = Date.now();
    return { snapshot, offset: parsed.offset };
  }

  private getSearchByTagSnapshotFromCursor(
    tagRemId: string,
    resultMode: SearchByTagResultMode,
    cursor: string
  ): {
    snapshot: SearchByTagCursorSnapshot;
    offset: number;
  } {
    this.pruneExpiredSearchSnapshots();
    const parsed = this.parseSearchByTagCursor(cursor);
    const snapshot = this.searchByTagCursorSnapshots.get(parsed.snapshotId);

    if (!snapshot) {
      throw new Error('Search by tag cursor expired or not found; rerun search_by_tag');
    }

    const bindingHash = this.hashSearchQuery(`${tagRemId}\0${resultMode}`);
    if (
      snapshot.tagRemId !== tagRemId ||
      snapshot.resultMode !== resultMode ||
      snapshot.bindingHash !== parsed.queryHash ||
      snapshot.bindingHash !== bindingHash
    ) {
      throw new Error('Search by tag cursor does not match tagRemId/resultMode');
    }

    snapshot.lastAccessedAt = Date.now();
    return { snapshot, offset: parsed.offset };
  }

  private async createSearchSnapshot(
    query: string,
    parentRemId?: string
  ): Promise<SearchCursorSnapshot> {
    this.pruneExpiredSearchSnapshots();
    const searchResults = await this.plugin.search.search(
      this.textToRichText(query),
      parentRemId || undefined,
      {
        numResults: SEARCH_CURSOR_SNAPSHOT_LIMIT,
      }
    );
    const collected: Array<{ remId: string; remType: RemClassification; sourceIndex: number }> = [];
    const seen = new Set<string>();
    const relationCache = new Map<string, boolean>();
    let sourceIndex = 0;

    for (const rem of searchResults) {
      if (seen.has(rem._id)) continue;
      seen.add(rem._id);

      if (parentRemId) {
        const isChild = await this.isDescendant(rem, parentRemId, relationCache);
        if (!isChild) continue;
      }

      collected.push({
        remId: rem._id,
        remType: await this.classifyRem(rem),
        sourceIndex: sourceIndex++,
      });
    }

    collected.sort((a, b) => {
      const pa = TYPE_PRIORITY[a.remType] ?? 5;
      const pb = TYPE_PRIORITY[b.remType] ?? 5;
      if (pa !== pb) return pa - pb;
      return a.sourceIndex - b.sourceIndex;
    });

    const now = Date.now();
    const snapshot: SearchCursorSnapshot = {
      id: this.createSearchSnapshotId(),
      query,
      queryHash: this.hashSearchQuery(query + '\0' + (parentRemId || '')),
      parentRemId,
      remIds: collected.map((item) => item.remId),
      createdAt: now,
      lastAccessedAt: now,
      truncated: searchResults.length >= SEARCH_CURSOR_SNAPSHOT_LIMIT,
      truncationReason:
        searchResults.length >= SEARCH_CURSOR_SNAPSHOT_LIMIT ? 'cursor_snapshot_limit' : undefined,
    };

    this.searchCursorSnapshots.set(snapshot.id, snapshot);
    this.enforceSearchSnapshotLimit();
    return snapshot;
  }

  private async renderSearchPage(
    snapshot: SearchCursorSnapshot,
    offset: number,
    limit: number,
    options: SearchContentOptions,
    tagNameCache: TagNameCache
  ): Promise<SearchResult> {
    const pageRemIds = snapshot.remIds.slice(offset, offset + limit);
    const results: SearchResultItem[] = [];

    for (let i = 0; i < pageRemIds.length; i++) {
      const rem = await this.plugin.rem.findOne(pageRemIds[i]);
      if (!rem) continue;

      const item = await this.buildSearchResultItem(rem, offset + i, options, tagNameCache);
      results.push(item);
    }

    const nextOffset = offset + limit;
    const nextCursor = this.createSearchCursor(snapshot, nextOffset);

    return {
      results,
      hasMore: nextCursor !== undefined,
      nextCursor,
      truncated: snapshot.truncated,
      truncationReason: snapshot.truncationReason,
    };
  }

  private async createSearchByTagSnapshot(
    tagRem: PluginRem,
    tagRemId: string,
    resultMode: SearchByTagResultMode
  ): Promise<SearchByTagCursorSnapshot> {
    this.pruneExpiredSearchSnapshots();
    const taggedRems =
      'taggedRem' in tagRem && typeof tagRem.taggedRem === 'function'
        ? await tagRem.taggedRem()
        : [];

    const entries: SearchByTagSnapshotEntry[] = [];
    const seenTargets = new Set<string>();
    let sourceIndex = 0;
    let scannedCount = 0;

    for (const taggedRem of taggedRems) {
      if (scannedCount >= SEARCH_CURSOR_SNAPSHOT_LIMIT) break;
      scannedCount += 1;
      const { targetRem, contextReason } = await this.resolveSearchByTagContext(taggedRem);

      if (resultMode === 'context') {
        const existing = entries.find((item) => item.remId === targetRem._id);
        if (existing) {
          existing.matchedRemIds = [...(existing.matchedRemIds ?? []), taggedRem._id];
          continue;
        }

        if (entries.length >= SEARCH_CURSOR_SNAPSHOT_LIMIT) break;
        seenTargets.add(targetRem._id);
        entries.push({
          remId: targetRem._id,
          remType: await this.classifyRem(targetRem),
          sourceIndex: sourceIndex++,
          matchedRemIds: [taggedRem._id],
        });
        continue;
      }

      if (seenTargets.has(taggedRem._id)) continue;
      if (entries.length >= SEARCH_CURSOR_SNAPSHOT_LIMIT) break;
      seenTargets.add(taggedRem._id);

      entries.push({
        remId: taggedRem._id,
        remType: await this.classifyRem(taggedRem),
        sourceIndex: sourceIndex++,
        contextRemId: targetRem._id,
        contextReason,
      });
    }

    entries.sort((a, b) => {
      const pa = TYPE_PRIORITY[a.remType] ?? 5;
      const pb = TYPE_PRIORITY[b.remType] ?? 5;
      if (pa !== pb) return pa - pb;
      return a.sourceIndex - b.sourceIndex;
    });

    const now = Date.now();
    const truncated = scannedCount < taggedRems.length;
    const snapshot: SearchByTagCursorSnapshot = {
      id: this.createSearchSnapshotId(),
      tagRemId,
      resultMode,
      bindingHash: this.hashSearchQuery(`${tagRemId}\0${resultMode}`),
      entries,
      createdAt: now,
      lastAccessedAt: now,
      truncated,
      truncationReason: truncated ? 'cursor_snapshot_limit' : undefined,
    };

    this.searchByTagCursorSnapshots.set(snapshot.id, snapshot);
    this.enforceSearchSnapshotLimit();
    return snapshot;
  }

  private async renderSearchByTagPage(
    snapshot: SearchByTagCursorSnapshot,
    offset: number,
    limit: number,
    options: SearchContentOptions,
    tagNameCache: TagNameCache
  ): Promise<SearchResult> {
    const pageEntries = snapshot.entries.slice(offset, offset + limit);
    const results: SearchResultItem[] = [];

    for (let i = 0; i < pageEntries.length; i++) {
      const entry = pageEntries[i];
      const rem = await this.plugin.rem.findOne(entry.remId);
      if (!rem) continue;

      const item = await this.buildSearchResultItem(rem, offset + i, options, tagNameCache);

      if (snapshot.resultMode === 'context') {
        const matchedRems: MatchedRemMetadata[] = [];
        for (const matchedRemId of entry.matchedRemIds ?? []) {
          const matchedRem = await this.plugin.rem.findOne(matchedRemId);
          if (matchedRem) {
            matchedRems.push(await this.buildMatchedRemMetadata(matchedRem, tagNameCache, options));
          }
        }
        results.push({ ...item, matchedRems });
        continue;
      }

      const contextRem = entry.contextRemId
        ? await this.plugin.rem.findOne(entry.contextRemId)
        : undefined;
      const contextTitle = contextRem
        ? (await this.getTitleAndDetail(contextRem)).title
        : undefined;
      results.push({
        ...item,
        ...(entry.contextRemId ? { contextRemId: entry.contextRemId } : {}),
        ...(contextTitle ? { contextTitle } : {}),
        ...(entry.contextReason ? { contextReason: entry.contextReason } : {}),
      });
    }

    const nextOffset = offset + limit;
    const nextCursor = this.createSearchByTagCursor(snapshot, nextOffset);

    return {
      results,
      hasMore: nextCursor !== undefined,
      nextCursor,
      truncated: snapshot.truncated,
      truncationReason: snapshot.truncationReason,
    };
  }

  private getSearchContentOptions(
    params: Pick<
      SearchParams,
      'contentMode' | 'depth' | 'childLimit' | 'maxContentLength' | 'ancestorDepth' | 'view'
    >
  ): SearchContentOptions {
    return {
      contentMode: this.parseContentMode(params.contentMode, 'contentMode for search', 'none'),
      depth: params.depth ?? DEFAULT_SEARCH_DEPTH,
      childLimit: params.childLimit ?? DEFAULT_SEARCH_CHILD_LIMIT,
      maxContentLength: params.maxContentLength ?? DEFAULT_SEARCH_MAX_CONTENT_LENGTH,
      ancestorDepth: this.getAncestorDepth(params.ancestorDepth),
      view: this.parseResultView(params.view),
    };
  }

  private async buildSearchResultItem(
    rem: PluginRem,
    sourceIndex: number,
    options: SearchContentOptions,
    tagNameCache: TagNameCache
  ): Promise<SearchResultItem & { _sourceIndex: number }> {
    const [
      { title, detail, inlineRefs },
      remType,
      cardDirection,
      aliases,
      tags,
      parentContext,
      ancestorContext,
    ] = await Promise.all([
      this.getTitleAndDetail(rem),
      this.classifyRem(rem),
      options.view !== 'compact' && rem.backText
        ? rem.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
        : Promise.resolve(undefined),
      options.view !== 'compact' ? this.getAliases(rem) : Promise.resolve([]),
      options.view !== 'compact' ? this.getTags(rem, tagNameCache) : Promise.resolve([]),
      this.getParentContext(rem),
      this.getAncestors(rem, options.ancestorDepth),
    ]);

    const headline = this.formatHeadline(title, detail, remType);

    let content: string | undefined;
    let contentStructured: StructuredContentNode[] | undefined;
    let contentProperties: ContentProperties | undefined;

    if (options.contentMode === 'markdown') {
      const renderResult = await this.renderContentMarkdown(
        rem,
        options.depth,
        options.childLimit,
        options.maxContentLength
      );
      if (renderResult.content) {
        content = renderResult.content;
        if (options.view !== 'compact') {
          contentProperties = await this.buildContentProperties(rem, renderResult, options.depth);
        }
      }
    } else if (options.contentMode === 'structured') {
      const structuredChildren = await this.renderContentStructured(
        rem,
        options.depth,
        options.childLimit,
        tagNameCache,
        options.view
      );
      if (structuredChildren.length > 0) {
        contentStructured = structuredChildren;
      }
    }

    return {
      remId: rem._id,
      title,
      headline,
      ...(options.view !== 'compact' && inlineRefs.length > 0 ? { inlineRefs } : {}),
      ...parentContext,
      ...ancestorContext,
      ...(options.view !== 'compact' && aliases.length > 0 ? { aliases } : {}),
      ...(options.view !== 'compact' && tags.length > 0 ? { tags } : {}),
      remType,
      ...(options.view !== 'compact' && cardDirection ? { cardDirection } : {}),
      ...(content ? { content } : {}),
      ...(contentStructured ? { contentStructured } : {}),
      ...(contentProperties ? { contentProperties } : {}),
      _sourceIndex: sourceIndex,
    };
  }

  private async buildMatchedRemMetadata(
    rem: PluginRem,
    tagNameCache: TagNameCache,
    options: SearchContentOptions
  ): Promise<MatchedRemMetadata> {
    const [{ title, detail, inlineRefs }, remType, tags, parentContext, ancestorContext] =
      await Promise.all([
        this.getTitleAndDetail(rem),
        this.classifyRem(rem),
        options.view !== 'compact' ? this.getTags(rem, tagNameCache) : Promise.resolve([]),
        this.getParentContext(rem),
        this.getAncestors(rem, options.ancestorDepth),
      ]);

    const headline = this.formatHeadline(title, detail, remType);

    return {
      remId: rem._id,
      title,
      headline,
      ...(options.view !== 'compact' && inlineRefs.length > 0 ? { inlineRefs } : {}),
      remType,
      ...parentContext,
      ...ancestorContext,
      ...(options.view !== 'compact' && tags.length > 0 ? { tags } : {}),
    };
  }

  private getSearchByTagContextReason(
    taggedRem: PluginRem,
    contextRem: PluginRem,
    contextType: RemClassification
  ): SearchByTagContextReason {
    if (taggedRem._id === contextRem._id) return 'self';
    if (contextType === 'document' || contextType === 'dailyDocument') return 'ancestor-document';
    if (contextType === 'concept') return 'ancestor-concept';
    return 'ancestor-context';
  }

  private async resolveSearchByTagContext(rem: PluginRem): Promise<{
    targetRem: PluginRem;
    contextReason: SearchByTagContextReason;
  }> {
    const remType = await this.classifyRem(rem);
    if (remType === 'document' || remType === 'dailyDocument') {
      return { targetRem: rem, contextReason: 'self' };
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
        return { targetRem: parentRem, contextReason: 'ancestor-document' };
      }

      current = parentRem;
      parentRem = await this.getParentRem(current);
    }

    const targetRem = nearestNonDocumentAncestor ?? rem;
    const targetType =
      targetRem._id === rem._id && targetRem === rem ? remType : await this.classifyRem(targetRem);
    return {
      targetRem,
      contextReason: this.getSearchByTagContextReason(rem, targetRem, targetType),
    };
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
    tagNameCache: TagNameCache,
    view: ResultView
  ): Promise<StructuredContentNode[]> {
    if (depth <= 0) return [];

    const limitedChildren = await this.getRenderableChildren(rem, childLimit);
    if (limitedChildren.length === 0) return [];
    const results: StructuredContentNode[] = [];

    for (const child of limitedChildren) {
      const [{ title, detail, inlineRefs }, remType, cardDirection, aliases, tags] =
        await Promise.all([
          this.getTitleAndDetail(child),
          this.classifyRem(child),
          view !== 'compact' && child.backText
            ? child.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
            : Promise.resolve(undefined),
          view !== 'compact' ? this.getAliases(child) : Promise.resolve([]),
          view !== 'compact' ? this.getTags(child, tagNameCache) : Promise.resolve([]),
        ]);

      const children = await this.renderContentStructured(
        child,
        depth - 1,
        childLimit,
        tagNameCache,
        view
      );

      results.push({
        remId: child._id,
        title,
        headline: this.formatHeadline(title, detail, remType),
        ...(view !== 'compact' && inlineRefs.length > 0 ? { inlineRefs } : {}),
        remType,
        ...(view !== 'compact' && aliases.length > 0 ? { aliases } : {}),
        ...(view !== 'compact' && tags.length > 0 ? { tags } : {}),
        ...(view !== 'compact' && cardDirection ? { cardDirection } : {}),
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

  private createIdReferencePlaceholder(
    index: number,
    markdown: string,
    usedPlaceholders: Set<string>
  ): string {
    let attempt = 0;
    while (true) {
      const suffix = attempt === 0 ? '' : `x${attempt}`;
      const placeholder = `${ID_REFERENCE_PLACEHOLDER_PREFIX}${index}${suffix}`;
      if (!markdown.includes(placeholder) && !usedPlaceholders.has(placeholder)) {
        usedPlaceholders.add(placeholder);
        return placeholder;
      }
      attempt += 1;
    }
  }

  private async createRemReferenceRichText(remId: string): Promise<RichTextInterface> {
    return await this.plugin.richText.rem(remId).value();
  }

  private async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return await this.plugin.app.transaction(fn);
  }

  private async prepareMarkdownIdReferenceTokens(markdown: string): Promise<PreparedMarkdown> {
    const matches = Array.from(markdown.matchAll(ID_REFERENCE_TOKEN_PATTERN)).map((match) => ({
      token: match[0],
      remId: match[1].trim(),
    }));

    if (matches.length === 0) {
      return { markdown, idReferenceTokens: [] };
    }

    const uniqueRemIds = new Set<string>();
    for (const match of matches) {
      if (!match.remId) {
        throw new Error('Reference token must include a Rem ID: [[id:<remId>]]');
      }
      uniqueRemIds.add(match.remId);
    }

    for (const remId of uniqueRemIds) {
      const rem = await this.plugin.rem.findOne(remId);
      if (!rem) {
        throw new Error(`Reference note not found: ${remId}`);
      }
    }

    let preparedMarkdown = markdown;
    const usedPlaceholders = new Set<string>();
    const idReferenceTokens: IdReferenceToken[] = [];

    for (const [index, match] of matches.entries()) {
      const placeholder = this.createIdReferencePlaceholder(
        index,
        preparedMarkdown,
        usedPlaceholders
      );
      preparedMarkdown = preparedMarkdown.replace(match.token, placeholder);
      idReferenceTokens.push({ placeholder, remId: match.remId });
    }

    return { markdown: preparedMarkdown, idReferenceTokens };
  }

  private async replaceIdReferenceTokensInRichText(
    richText: RichTextInterface,
    idReferenceTokens: IdReferenceToken[]
  ): Promise<RichTextInterface> {
    let nextRichText = richText;
    for (const token of idReferenceTokens) {
      const replacement = await this.createRemReferenceRichText(token.remId);
      nextRichText = await this.plugin.richText.replaceAllRichText(
        nextRichText,
        [token.placeholder],
        replacement
      );
    }
    return nextRichText;
  }

  private async applyIdReferenceTokensToRem(
    rem: PluginRem,
    preparedMarkdown: PreparedMarkdown
  ): Promise<void> {
    if (preparedMarkdown.idReferenceTokens.length === 0) {
      return;
    }

    if (rem.text) {
      await rem.setText(
        await this.replaceIdReferenceTokensInRichText(rem.text, preparedMarkdown.idReferenceTokens)
      );
    }

    if (rem.backText) {
      await rem.setBackText(
        await this.replaceIdReferenceTokensInRichText(
          rem.backText,
          preparedMarkdown.idReferenceTokens
        )
      );
    }
  }

  private async parseMarkdownWithIdReferenceTokens(markdown: string): Promise<RichTextInterface> {
    const preparedMarkdown = await this.prepareMarkdownIdReferenceTokens(markdown);
    const richText = await this.plugin.richText.parseFromMarkdown(preparedMarkdown.markdown);
    return await this.replaceIdReferenceTokensInRichText(
      richText,
      preparedMarkdown.idReferenceTokens
    );
  }

  private async createSingleRemWithPreparedMarkdown(
    preparedMarkdown: PreparedMarkdown,
    parentId?: string
  ): Promise<PluginRem> {
    const rem = await this.plugin.rem.createSingleRemWithMarkdown(
      preparedMarkdown.markdown,
      parentId
    );
    if (!rem) throw new Error('Failed to create Rem');
    await this.applyIdReferenceTokensToRem(rem, preparedMarkdown);
    return rem;
  }

  private requireString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }
    return value;
  }

  private requireNonEmptyString(value: unknown, fieldName: string): string {
    const stringValue = this.requireString(value, fieldName);
    if (stringValue.length === 0) {
      throw new Error(`${fieldName} must be a non-empty string`);
    }
    return stringValue;
  }

  private requireBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`${fieldName} must be a boolean`);
    }
    return value;
  }

  private optionalRemClassification(
    value: unknown,
    fieldName: string
  ): RemClassification | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (
      value === 'document' ||
      value === 'dailyDocument' ||
      value === 'concept' ||
      value === 'descriptor' ||
      value === 'portal' ||
      value === 'text'
    ) {
      return value;
    }

    throw new Error(
      `${fieldName} must be one of document, dailyDocument, concept, descriptor, portal, text`
    );
  }

  private optionalStringArray(value: unknown, fieldName: string): string[] {
    if (value === undefined) {
      return [];
    }

    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
      throw new Error(`${fieldName} must be an array of strings`);
    }

    return value;
  }

  private requireInsertPosition(value: unknown): InsertChildrenPosition {
    if (value === 'first' || value === 'last' || value === 'before' || value === 'after') {
      return value;
    }

    throw new Error('position must be one of first, last, before, after');
  }

  private async addTagRemIdsToRem(rem: PluginRem, tagRemIds: string[]): Promise<void> {
    for (const tagRemId of tagRemIds) {
      await rem.addTag(tagRemId);
    }
  }

  private async requirePropertyChild(tagRem: PluginRem, propertyRemId: string): Promise<PluginRem> {
    const propertyChildren = await this.getTablePropertyChildren(tagRem);
    const propertyRem = propertyChildren.find((property) => property._id === propertyRemId);

    if (!propertyRem) {
      throw new Error(`Property ${propertyRemId} is not a property child of tag ${tagRem._id}`);
    }

    return propertyRem;
  }

  private async normalizeSetPropertyValue(
    value: unknown
  ): Promise<{ kind: SetPropertyValue['kind']; richText: RichTextInterface | undefined }> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('value must be an object with kind');
    }

    const valueRecord = value as Record<string, unknown>;

    switch (valueRecord.kind) {
      case 'text': {
        return {
          kind: 'text',
          richText: await this.parseMarkdownWithIdReferenceTokens(
            this.requireString(valueRecord.text, 'value.text')
          ),
        };
      }

      case 'rem_reference': {
        const targetRemId = this.requireNonEmptyString(valueRecord.remId, 'value.remId');
        const targetRem = await this.plugin.rem.findOne(targetRemId);
        if (!targetRem) {
          throw new Error(`Reference note not found: ${targetRemId}`);
        }
        return {
          kind: 'rem_reference',
          richText: await this.createRemReferenceRichText(targetRemId),
        };
      }

      case 'clear':
        return { kind: 'clear', richText: undefined };

      default:
        throw new Error('value.kind must be one of text, rem_reference, clear');
    }
  }

  private sdkSupportsDocumentStatus(rem: PluginRem): boolean {
    return (
      typeof rem.isDocument === 'function' &&
      'setIsDocument' in rem &&
      typeof rem.setIsDocument === 'function'
    );
  }

  private async setRemDocumentStatus(rem: PluginRem, isDocument: boolean): Promise<void> {
    if (!this.sdkSupportsDocumentStatus(rem)) {
      throw new Error('Document status updates are unsupported by the current RemNote SDK');
    }

    await rem.setIsDocument(isDocument);
  }

  private async addTagRemIdsToTopLevelRems(
    rems: PluginRem[],
    parentId: string,
    tagRemIds: string[]
  ): Promise<void> {
    if (tagRemIds.length === 0) {
      return;
    }

    for (const rem of rems) {
      const parentOfRem = await this.getParentRem(rem);
      if (
        (!parentId && !parentOfRem) ||
        (parentOfRem && parentOfRem._id === parentId) ||
        (!parentOfRem && parentId === '')
      ) {
        await this.addTagRemIdsToRem(rem, tagRemIds);
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
  private async createRemsFromMarkdown(
    markdown: string,
    parentId: string,
    positionAmongstSiblings?: number
  ): Promise<PluginRem[]> {
    if (!markdown.trim()) {
      return [];
    }

    const preparedMarkdown = await this.prepareMarkdownIdReferenceTokens(markdown);
    return await this.createRemsFromPreparedMarkdown(
      preparedMarkdown,
      parentId,
      positionAmongstSiblings
    );
  }

  private async createRemsFromPreparedMarkdown(
    preparedMarkdown: PreparedMarkdown,
    parentId: string,
    positionAmongstSiblings?: number,
    diagnosticTrace?: DiagnosticTrace
  ): Promise<PluginRem[]> {
    if (!preparedMarkdown.markdown.trim()) {
      this.logDiagnosticTrace(diagnosticTrace, 'markdown_tree:empty');
      return [];
    }

    this.logDiagnosticTrace(diagnosticTrace, 'markdown_tree:start', {
      parentId,
      positionAmongstSiblings,
      markdownLength: preparedMarkdown.markdown.length,
      lineCount: preparedMarkdown.markdown.split('\n').length,
      idReferenceTokenCount: preparedMarkdown.idReferenceTokens.length,
    });

    const indentedMarkdown = preparedMarkdown.markdown
      .split('\n')
      .map((line) => '  ' + line)
      .join('\n');
    const dummyMarkdown = `dummy\n${indentedMarkdown}`;

    // Create the tree with the dummy root.
    // Use the same parentId so the dummy root is created where the content should eventually be.
    this.logDiagnosticTrace(diagnosticTrace, 'create_tree_with_markdown:start', {
      parentId,
      dummyMarkdownLength: dummyMarkdown.length,
    });
    const tree = (await this.plugin.rem.createTreeWithMarkdown(dummyMarkdown, parentId)) || [];
    this.logDiagnosticTrace(diagnosticTrace, 'create_tree_with_markdown:done', {
      treeLength: tree.length,
      dummyRootId: tree[0]?._id,
    });

    if (tree.length === 0) {
      this.logDiagnosticTrace(diagnosticTrace, 'markdown_tree:no_tree');
      return [];
    }

    // The first element is our dummy root.
    const dummyRoot = tree[0];
    this.logDiagnosticTrace(diagnosticTrace, 'dummy_children:start', {
      dummyRootId: dummyRoot._id,
    });
    const directChildren = await dummyRoot.getChildrenRem();
    this.logDiagnosticTrace(diagnosticTrace, 'dummy_children:done', {
      dummyRootId: dummyRoot._id,
      directChildCount: directChildren.length,
      directChildIds: directChildren.map((child) => child._id),
    });

    // Move all direct children to the same parent as the dummy root when a concrete
    // target parent exists. When the dummy root lives at the top level, the SDK should
    // leave promoted children top-level after the dummy root is removed.
    this.logDiagnosticTrace(diagnosticTrace, 'target_parent_lookup:start', { parentId });
    const targetParent = await this.plugin.rem.findOne(parentId);
    this.logDiagnosticTrace(diagnosticTrace, 'target_parent_lookup:done', {
      parentId,
      found: Boolean(targetParent),
    });
    this.logDiagnosticTrace(diagnosticTrace, 'base_position:start', {
      hasTargetParent: Boolean(targetParent),
      requestedPosition: positionAmongstSiblings,
    });
    const basePosition =
      targetParent && positionAmongstSiblings === undefined
        ? (await targetParent.getChildrenRem()).filter((child) => child._id !== dummyRoot._id)
            .length
        : positionAmongstSiblings;
    this.logDiagnosticTrace(diagnosticTrace, 'base_position:done', { basePosition });

    for (const [index, child] of directChildren.entries()) {
      if (targetParent) {
        const targetPosition = basePosition === undefined ? undefined : basePosition + index;
        this.logDiagnosticTrace(diagnosticTrace, 'child_reparent:start', {
          childId: child._id,
          targetParentId: targetParent._id,
          targetPosition,
        });
        await child.setParent(targetParent, targetPosition);
        this.logDiagnosticTrace(diagnosticTrace, 'child_reparent:done', {
          childId: child._id,
          targetParentId: targetParent._id,
          targetPosition,
        });
      }
    }

    // Important: remove the dummy root.
    this.logDiagnosticTrace(diagnosticTrace, 'dummy_remove:start', { dummyRootId: dummyRoot._id });
    await dummyRoot.remove();
    this.logDiagnosticTrace(diagnosticTrace, 'dummy_remove:done', { dummyRootId: dummyRoot._id });

    // Return all created Rems (all descendants in the tree except the dummy root).
    const createdRems = tree.slice(1);
    for (const rem of createdRems) {
      this.logDiagnosticTrace(diagnosticTrace, 'id_reference_patch:start', {
        remId: rem._id,
        idReferenceTokenCount: preparedMarkdown.idReferenceTokens.length,
      });
      await this.applyIdReferenceTokensToRem(rem, preparedMarkdown);
      this.logDiagnosticTrace(diagnosticTrace, 'id_reference_patch:done', {
        remId: rem._id,
      });
    }

    this.logDiagnosticTrace(diagnosticTrace, 'markdown_tree:done', {
      createdRemCount: createdRems.length,
      createdRemIds: createdRems.map((rem) => rem._id),
    });
    return createdRems;
  }

  private async getInsertPosition(params: InsertChildrenParams): Promise<number> {
    if ((params.position === 'before' || params.position === 'after') && !params.siblingRemId) {
      throw new Error(`siblingRemId is required when position is ${params.position}`);
    }

    if ((params.position === 'first' || params.position === 'last') && params.siblingRemId) {
      throw new Error(`siblingRemId must not be provided when position is ${params.position}`);
    }

    const parent = await this.plugin.rem.findOne(params.parentRemId);
    if (!parent) {
      throw new Error(`Parent note not found: ${params.parentRemId}`);
    }

    const children = await parent.getChildrenRem();

    if (params.position === 'first') {
      return 0;
    }

    if (params.position === 'last') {
      return children.length;
    }

    const siblingIndex = children.findIndex((child) => child._id === params.siblingRemId);
    if (siblingIndex === -1) {
      throw new Error(
        `Sibling note not found under parent ${params.parentRemId}: ${params.siblingRemId}`
      );
    }

    return params.position === 'before' ? siblingIndex : siblingIndex + 1;
  }

  private async getMovePosition(
    parent: PluginRem,
    movingRemId: string,
    position: InsertChildrenPosition,
    siblingRemId?: string
  ): Promise<number> {
    if ((position === 'before' || position === 'after') && !siblingRemId) {
      throw new Error(`siblingRemId is required when position is ${position}`);
    }

    if ((position === 'first' || position === 'last') && siblingRemId) {
      throw new Error(`siblingRemId must not be provided when position is ${position}`);
    }

    const children = (await parent.getChildrenRem()).filter((child) => child._id !== movingRemId);

    if (position === 'first') {
      return 0;
    }

    if (position === 'last') {
      return children.length;
    }

    const siblingIndex = children.findIndex((child) => child._id === siblingRemId);
    if (siblingIndex === -1) {
      throw new Error(`Sibling note not found under parent ${parent._id}: ${siblingRemId}`);
    }

    return position === 'before' ? siblingIndex : siblingIndex + 1;
  }

  private async assertNotMovingUnderDescendant(
    rem: PluginRem,
    newParent: PluginRem
  ): Promise<void> {
    if (rem._id === newParent._id) {
      throw new Error('Cannot move a note under itself');
    }

    let current: PluginRem | undefined = newParent;
    while (current) {
      if (current._id === rem._id) {
        throw new Error('Cannot move a note under one of its descendants');
      }
      current = await this.getParentRem(current);
    }
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

    const title =
      params.title === undefined || params.title === null
        ? undefined
        : this.requireString(params.title, 'title');
    const content =
      params.content === undefined || params.content === null
        ? undefined
        : this.requireString(params.content, 'content');
    const parentId =
      params.parentId === undefined || params.parentId === null
        ? this.settings.defaultParentId
        : this.requireString(params.parentId, 'parentId');
    const asDocument =
      params.asDocument === undefined || params.asDocument === null
        ? false
        : this.requireBoolean(params.asDocument, 'asDocument');

    const tagRemIds = [...this.optionalStringArray(params.tagRemIds, 'tagRemIds')];
    if (this.settings.autoTagEnabled && this.settings.autoTagRemId) {
      if (!tagRemIds.includes(this.settings.autoTagRemId)) {
        tagRemIds.push(this.settings.autoTagRemId);
      }
    }

    const remIds: string[] = [];
    const titles: string[] = [];
    const hasContent = content !== undefined;

    if (asDocument && !title) {
      throw new Error('asDocument requires title so the document root is unambiguous');
    }

    const preparedTitle = title ? await this.prepareMarkdownIdReferenceTokens(title) : undefined;

    // Scenario 1: title provided
    if (title) {
      let preparedContent: PreparedMarkdown | undefined;
      if (hasContent) {
        const normalizedContent = this.normalizeContent(content);
        if (normalizedContent) {
          preparedContent = await this.prepareMarkdownIdReferenceTokens(normalizedContent);
        }
      }

      return await this.runInTransaction(async () => {
        const titleRem = await this.createSingleRemWithPreparedMarkdown(preparedTitle!, parentId);

        if (asDocument) {
          await this.setRemDocumentStatus(titleRem, true);
        }

        await this.addTagRemIdsToRem(titleRem, tagRemIds);

        remIds.push(titleRem._id);
        titles.push(title);

        if (hasContent) {
          if (preparedContent) {
            const createdRems = await this.createRemsFromPreparedMarkdown(
              preparedContent,
              titleRem._id
            );
            if (createdRems.length > 0) {
              const results = await this.extractRemResults(createdRems);
              remIds.push(...results.remIds);
              titles.push(...results.titles);
            }
          }
        }

        return { remIds, titles };
      });
    } else if (hasContent) {
      // Scenario 2: content only
      // Normalize content to collapse consecutive blank lines
      const normalizedContent = this.normalizeContent(content);
      if (!normalizedContent) {
        throw new Error('Content is empty');
      }

      const preparedContent = await this.prepareMarkdownIdReferenceTokens(normalizedContent);
      return await this.runInTransaction(async () => {
        const createdRems = await this.createRemsFromPreparedMarkdown(preparedContent, parentId);

        if (!createdRems || createdRems.length === 0) {
          throw new Error('No Rems created from markdown content');
        }

        await this.addTagRemIdsToTopLevelRems(createdRems, parentId, tagRemIds);

        const results = await this.extractRemResults(createdRems);
        remIds.push(...results.remIds);
        titles.push(...results.titles);

        return { remIds, titles };
      });
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

    const content = this.requireString(params.content, 'content');
    const tagRemIds = this.optionalStringArray(params.tagRemIds, 'tagRemIds');

    const today = new Date();
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
    let normalizedContent = this.normalizeContent(content);
    if (!normalizedContent) {
      throw new Error('Journal content is empty');
    }

    const shouldCreateJournalRoot =
      prefixToCreate !== '' && normalizedContent.split('\n').length > 2;
    if (prefixToCreate !== '' && !shouldCreateJournalRoot) {
      // If content is only one line, add prefix to the content and add to daily doc directly
      normalizedContent = prefixToCreate + content;
    }

    const preparedContent = await this.prepareMarkdownIdReferenceTokens(normalizedContent);

    const dailyDoc = await this.plugin.date.getDailyDoc(today);

    if (!dailyDoc) {
      throw new Error('Failed to access daily document');
    }

    const remIds: string[] = [];
    const titles: string[] = [];
    let parentRemId: string = dailyDoc._id;
    let journalRootRem: PluginRem | undefined;

    return await this.runInTransaction(async () => {
      // If content is > 2 lines of markdown, add all content under a rem with prefix
      if (shouldCreateJournalRoot) {
        const titleRem = await this.plugin.rem.createRem();
        if (titleRem) {
          await titleRem.setText(this.textToRichText(prefixToCreate));
          await titleRem.setParent(dailyDoc);
          journalRootRem = titleRem;

          remIds.push(titleRem._id);
          titles.push(await this.extractText(titleRem.text));
          parentRemId = titleRem._id;
        }
      }

      // Create the tree under daily document or the prefix Rem
      const createdRems = await this.createRemsFromPreparedMarkdown(preparedContent, parentRemId);
      if (tagRemIds.length) {
        if (journalRootRem) {
          await this.addTagRemIdsToRem(journalRootRem, tagRemIds);
        } else {
          await this.addTagRemIdsToTopLevelRems(createdRems, dailyDoc._id, tagRemIds);
        }
      }
      const results = await this.extractRemResults(createdRems);
      remIds.push(...results.remIds);
      titles.push(...results.titles);

      return { remIds, titles };
    });
  }

  /**
   * Search the knowledge base.
   *
   * Results are sorted by remType priority (document/concept > dailyDocument > portal >
   * descriptor > text) with intra-group ordering preserved from RemNote's search API as a proxy
   * for relevance (no score is available from the SDK).
   *
   * Cursor paging uses a short-lived snapshot of up to 1000 ordered Rem IDs. Page rendering is
   * intentionally deferred so content options only apply to the page being returned.
   *
   * The RemNote SDK search API may enforce an opaque hard limit on result count beyond the
   * requested value — this is not controllable from the plugin side.
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const limit = this.getSearchLimit(params.limit);
    const options = this.getSearchContentOptions(params);
    const tagNameCache: TagNameCache = new Map();
    const { snapshot, offset } = params.cursor
      ? this.getSearchSnapshotFromCursor(params.query, params.cursor, params.parentRemId)
      : {
          snapshot: await this.createSearchSnapshot(params.query, params.parentRemId),
          offset: 0,
        };

    return this.renderSearchPage(snapshot, offset, limit, options, tagNameCache);
  }

  /**
   * Search by exact tag Rem ID.
   *
   * Default context mode preserves navigation-friendly ancestor targets and exposes the
   * direct tagged Rems that produced each context result. Tagged mode returns those direct
   * tagged Rems as top-level results with lightweight context metadata.
   */
  async searchByTag(params: SearchByTagParams): Promise<SearchResult> {
    const tagRemId = this.requireString(params.tagRemId, 'tagRemId');
    const tagRem = await this.plugin.rem.findOne(tagRemId);
    if (!tagRem) {
      return { results: [], hasMore: false, truncated: false };
    }

    const options = this.getSearchContentOptions(params);
    const resultMode = this.parseSearchByTagResultMode(params.resultMode);
    const limit = this.getSearchLimit(params.limit);
    const tagNameCache: TagNameCache = new Map();
    const { snapshot, offset } = params.cursor
      ? this.getSearchByTagSnapshotFromCursor(tagRemId, resultMode, params.cursor)
      : { snapshot: await this.createSearchByTagSnapshot(tagRem, tagRemId, resultMode), offset: 0 };

    return this.renderSearchByTagPage(snapshot, offset, limit, options, tagNameCache);
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
    inlineRefs?: InlineReference[];
    parentRemId?: string;
    parentTitle?: string;
    ancestors?: AncestorInfo[];
    ancestorsTruncated?: boolean;
    aliases?: string[];
    tags?: TagInfo[];
    remType: RemClassification;
    cardDirection?: CardDirection;
    content?: string;
    contentStructured?: StructuredContentNode[];
    contentProperties?: ContentProperties;
  }> {
    const depth = params.depth ?? DEFAULT_DEPTH;
    const contentMode = this.parseContentMode(
      params.contentMode,
      'contentMode for read_note',
      'markdown'
    );
    const childLimit = params.childLimit ?? DEFAULT_CHILD_LIMIT;
    const maxContentLength = params.maxContentLength ?? DEFAULT_READ_MAX_CONTENT_LENGTH;
    const ancestorDepth = this.getAncestorDepth(params.ancestorDepth);
    const view = this.parseResultView(params.view);

    const rem = await this.plugin.rem.findOne(params.remId);

    if (!rem) {
      throw new Error(`Note not found: ${params.remId}`);
    }

    const tagNameCache: TagNameCache = new Map();
    const [
      { title, detail, inlineRefs },
      remType,
      cardDirection,
      aliases,
      tags,
      parentContext,
      ancestorContext,
    ] = await Promise.all([
      this.getTitleAndDetail(rem),
      this.classifyRem(rem),
      view !== 'compact' && rem.backText
        ? rem.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
        : Promise.resolve(undefined),
      view !== 'compact' ? this.getAliases(rem) : Promise.resolve([]),
      view !== 'compact' ? this.getTags(rem, tagNameCache) : Promise.resolve([]),
      this.getParentContext(rem),
      this.getAncestors(rem, ancestorDepth),
    ]);

    const headline = this.formatHeadline(title, detail, remType);

    let content: string | undefined;
    let contentStructured: StructuredContentNode[] | undefined;
    let contentProperties: ContentProperties | undefined;

    if (contentMode === 'markdown') {
      const renderResult = await this.renderContentMarkdown(
        rem,
        depth,
        childLimit,
        maxContentLength
      );
      // Always include content for markdown mode (even if empty string)
      content = renderResult.content;
      if (view !== 'compact') {
        contentProperties = await this.buildContentProperties(rem, renderResult, depth);
      }
    } else if (contentMode === 'structured') {
      const structuredChildren = await this.renderContentStructured(
        rem,
        depth,
        childLimit,
        tagNameCache,
        view
      );
      if (structuredChildren.length > 0) {
        contentStructured = structuredChildren;
      }
    }

    return {
      remId: rem._id,
      title,
      headline,
      ...(view !== 'compact' && inlineRefs.length > 0 ? { inlineRefs } : {}),
      ...parentContext,
      ...ancestorContext,
      ...(view !== 'compact' && aliases.length > 0 ? { aliases } : {}),
      ...(view !== 'compact' && tags.length > 0 ? { tags } : {}),
      remType,
      ...(view !== 'compact' && cardDirection ? { cardDirection } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(contentStructured ? { contentStructured } : {}),
      ...(contentProperties ? { contentProperties } : {}),
    };
  }

  async listChildren(params: ListChildrenParams): Promise<ListChildrenResult> {
    const parentRemId = this.requireString(params.parentRemId, 'parentRemId');
    const parent = await this.plugin.rem.findOne(parentRemId);

    if (!parent) {
      throw new Error(`Parent note not found: ${parentRemId}`);
    }

    const limit = this.getSearchLimit(params.limit);
    const offset = this.parseListChildrenCursor(parentRemId, params.cursor);
    const view = this.parseResultView(params.view ?? 'compact');
    const ancestorDepth = this.getAncestorDepth(params.ancestorDepth);
    const children = await parent.getChildrenRem();
    const pageChildren = children.slice(offset, offset + limit);
    const tagNameCache: TagNameCache = new Map();
    const options: SearchContentOptions = {
      contentMode: 'none',
      depth: 0,
      childLimit: 1,
      maxContentLength: DEFAULT_SEARCH_MAX_CONTENT_LENGTH,
      ancestorDepth,
      view,
    };
    const results: SearchResultItem[] = [];

    for (let i = 0; i < pageChildren.length; i++) {
      results.push(
        await this.buildSearchResultItem(pageChildren[i], offset + i, options, tagNameCache)
      );
    }

    const nextOffset = offset + limit;
    const nextCursor = this.createListChildrenCursor(parentRemId, nextOffset, children.length);

    return {
      children: results,
      hasMore: nextCursor !== undefined,
      nextCursor,
      totalChildren: children.length,
    };
  }

  async moveNote(params: MoveNoteParams): Promise<MoveNoteResult> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    const remId = this.requireString(params.remId, 'remId');
    const newParentRemId = this.requireString(params.newParentRemId, 'newParentRemId');
    const position = this.requireInsertPosition(params.position ?? 'last');
    const siblingRemId =
      params.siblingRemId === undefined || params.siblingRemId === null
        ? undefined
        : this.requireString(params.siblingRemId, 'siblingRemId');
    const dryRun = params.dryRun !== false;
    const ancestorDepth = this.getAncestorDepth(params.ancestorDepth);

    const rem = await this.plugin.rem.findOne(remId);
    if (!rem) {
      throw new Error(`Note not found: ${remId}`);
    }

    const newParent = await this.plugin.rem.findOne(newParentRemId);
    if (!newParent) {
      throw new Error(`New parent note not found: ${newParentRemId}`);
    }

    await this.assertNotMovingUnderDescendant(rem, newParent);

    const oldParent = await this.getParentRem(rem);
    if (
      params.expectedOldParentRemId !== undefined &&
      oldParent?._id !== params.expectedOldParentRemId
    ) {
      throw new Error(
        `Current parent does not match expectedOldParentRemId: expected ${params.expectedOldParentRemId}, got ${
          oldParent?._id ?? 'top-level'
        }`
      );
    }

    const positionAmongstSiblings = await this.getMovePosition(
      newParent,
      remId,
      position,
      siblingRemId
    );
    const [{ title }, oldParentContext, newParentContext, ancestorsBefore] = await Promise.all([
      this.getTitleAndDetail(rem),
      oldParent ? this.getParentContext(rem) : Promise.resolve<ParentContext>({}),
      this.getTitleAndDetail(newParent),
      this.getAncestors(rem, ancestorDepth),
    ]);

    if (!dryRun) {
      if ('setParent' in rem && typeof rem.setParent === 'function') {
        await rem.setParent(newParent, positionAmongstSiblings);
      } else {
        throw new Error('RemNote SDK does not expose safe move support for this note');
      }
    }

    const ancestorsAfter = dryRun
      ? await this.getAncestors(newParent, ancestorDepth)
      : await this.getAncestors(rem, ancestorDepth);
    const dryRunAncestorsAfter: AncestorContext =
      dryRun && ancestorDepth > 0
        ? {
            ancestors: [
              {
                remId: newParent._id,
                title: newParentContext.title,
                remType: await this.classifyRem(newParent),
              },
              ...(ancestorsAfter.ancestors ?? []),
            ].slice(0, ancestorDepth),
            ancestorsTruncated:
              (ancestorsAfter.ancestorsTruncated ?? false) ||
              (ancestorsAfter.ancestors?.length ?? 0) >= ancestorDepth,
          }
        : ancestorsAfter;

    return {
      remId,
      title,
      dryRun,
      ...(oldParentContext.parentRemId ? { oldParentRemId: oldParentContext.parentRemId } : {}),
      ...(oldParentContext.parentTitle ? { oldParentTitle: oldParentContext.parentTitle } : {}),
      newParentRemId,
      newParentTitle: newParentContext.title,
      position,
      ...(siblingRemId ? { siblingRemId } : {}),
      ...(ancestorsBefore.ancestors ? { ancestorsBefore: ancestorsBefore.ancestors } : {}),
      ...(ancestorsBefore.ancestorsTruncated ? { ancestorsBeforeTruncated: true } : {}),
      ...(dryRunAncestorsAfter.ancestors ? { ancestorsAfter: dryRunAncestorsAfter.ancestors } : {}),
      ...(dryRunAncestorsAfter.ancestorsTruncated ? { ancestorsAfterTruncated: true } : {}),
    };
  }

  /**
   * Update an existing note
   */
  async updateNote(params: UpdateNoteParams): Promise<{ titles: string[]; remIds: string[] }> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    const remId = this.requireString(params.remId, 'remId');
    const title = this.requireString(params.title, 'title');

    const rem = await this.plugin.rem.findOne(remId);

    if (!rem) {
      throw new Error(`Note not found: ${remId}`);
    }

    const remIds: string[] = [];
    const titles: string[] = [];

    // Update title if provided
    const richText = await this.parseMarkdownWithIdReferenceTokens(title);
    await this.runInTransaction(async () => {
      await rem.setText(richText);
    });
    titles.push(title);
    remIds.push(remId);

    return { titles, remIds };
  }

  async setDocumentStatus(params: SetDocumentStatusParams): Promise<SetDocumentStatusResult> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    const remId = this.requireString(params.remId, 'remId');
    const requestedIsDocument = this.requireBoolean(params.isDocument, 'isDocument');
    const dryRun = params.dryRun !== false;
    const expectedOldRemType = this.optionalRemClassification(
      params.expectedOldRemType,
      'expectedOldRemType'
    );

    const rem = await this.plugin.rem.findOne(remId);
    if (!rem) {
      throw new Error(`Note not found: ${remId}`);
    }

    const sdkSupportsDocumentStatus = this.sdkSupportsDocumentStatus(rem);
    const [{ title }, oldRemType, oldIsDocument, cardDirectionBefore] = await Promise.all([
      this.getTitleAndDetail(rem),
      this.classifyRem(rem),
      rem.isDocument(),
      this.getCardDirection(rem),
    ]);

    if (expectedOldRemType !== undefined && expectedOldRemType !== oldRemType) {
      throw new Error(
        `Expected old remType ${expectedOldRemType}, but current remType is ${oldRemType}`
      );
    }

    const wouldChange = oldIsDocument !== requestedIsDocument;
    const warnings: string[] = [];
    if (rem.type === RemType.CONCEPT) {
      warnings.push(
        'Document status is independent of concept/card status; existing card metadata is preserved.'
      );
    }
    if (!sdkSupportsDocumentStatus) {
      warnings.push('Current RemNote SDK does not expose setIsDocument for this Rem.');
    }

    if (dryRun) {
      const previewRemType = await this.classifyRem(rem, requestedIsDocument);
      return {
        remId,
        title,
        oldRemType,
        newRemType: previewRemType,
        oldIsDocument,
        newIsDocument: requestedIsDocument,
        requestedIsDocument,
        dryRun: true,
        changed: false,
        wouldChange,
        sdkSupportsDocumentStatus,
        ...(warnings.length > 0 ? { warnings } : {}),
        ...(cardDirectionBefore ? { cardDirectionBefore } : {}),
        ...(cardDirectionBefore ? { cardDirectionAfter: cardDirectionBefore } : {}),
      };
    }

    if (!sdkSupportsDocumentStatus) {
      throw new Error('Document status updates are unsupported by the current RemNote SDK');
    }

    if (wouldChange) {
      await this.setRemDocumentStatus(rem, requestedIsDocument);
    }

    const updatedRem = await this.plugin.rem.findOne(remId);
    if (!updatedRem) {
      throw new Error(`Note not found after document status update: ${remId}`);
    }

    const [newRemType, newIsDocument, cardDirectionAfter] = await Promise.all([
      this.classifyRem(updatedRem),
      updatedRem.isDocument(),
      this.getCardDirection(updatedRem),
    ]);

    if (newIsDocument !== requestedIsDocument) {
      throw new Error(
        `Document status update verification failed for ${remId}: expected isDocument=${requestedIsDocument}, got ${newIsDocument}`
      );
    }

    return {
      remId,
      title,
      oldRemType,
      newRemType,
      oldIsDocument,
      newIsDocument,
      requestedIsDocument,
      dryRun: false,
      changed: wouldChange,
      wouldChange,
      sdkSupportsDocumentStatus,
      ...(warnings.length > 0 ? { warnings } : {}),
      ...(cardDirectionBefore ? { cardDirectionBefore } : {}),
      ...(cardDirectionAfter ? { cardDirectionAfter } : {}),
    };
  }

  async insertChildren(
    params: InsertChildrenParams
  ): Promise<{ titles: string[]; remIds: string[] }> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    const trace = this.startDiagnosticTrace('insert_children', {
      parentRemId: params.parentRemId,
      position: params.position,
      siblingRemId: params.siblingRemId,
      contentLength: typeof params.content === 'string' ? params.content.length : undefined,
    });

    try {
      this.logDiagnosticTrace(trace, 'validate:start');
      const safeParams: InsertChildrenParams = {
        parentRemId: this.requireString(params.parentRemId, 'parentRemId'),
        content: this.requireString(params.content, 'content'),
        position: this.requireInsertPosition(params.position),
        siblingRemId:
          params.siblingRemId === undefined || params.siblingRemId === null
            ? undefined
            : this.requireString(params.siblingRemId, 'siblingRemId'),
      };
      this.logDiagnosticTrace(trace, 'validate:done');

      this.logDiagnosticTrace(trace, 'get_insert_position:start', {
        parentRemId: safeParams.parentRemId,
        position: safeParams.position,
        siblingRemId: safeParams.siblingRemId,
      });
      const positionAmongstSiblings = await this.getInsertPosition(safeParams);
      this.logDiagnosticTrace(trace, 'get_insert_position:done', { positionAmongstSiblings });

      const normalizedContent = this.normalizeContent(safeParams.content);
      this.logDiagnosticTrace(trace, 'normalize:done', {
        normalizedLength: normalizedContent.length,
        normalizedLineCount: normalizedContent ? normalizedContent.split('\n').length : 0,
      });

      if (!normalizedContent) {
        this.logDiagnosticTrace(trace, 'done:empty_content');
        return { titles: [], remIds: [] };
      }

      this.logDiagnosticTrace(trace, 'prepare_id_references:start');
      const preparedContent = await this.prepareMarkdownIdReferenceTokens(normalizedContent);
      this.logDiagnosticTrace(trace, 'prepare_id_references:done', {
        idReferenceTokenCount: preparedContent.idReferenceTokens.length,
        preparedLength: preparedContent.markdown.length,
      });

      this.logDiagnosticTrace(trace, 'transaction:start');
      const result = await this.runInTransaction(async () => {
        this.logDiagnosticTrace(trace, 'transaction:entered');
        const createdRems = await this.createRemsFromPreparedMarkdown(
          preparedContent,
          safeParams.parentRemId,
          positionAmongstSiblings,
          trace
        );
        this.logDiagnosticTrace(trace, 'transaction:created_rems', {
          createdRemCount: createdRems.length,
        });

        if (createdRems.length === 0) {
          this.logDiagnosticTrace(trace, 'transaction:callback_done', {
            createdRemCount: createdRems.length,
            resultRemCount: 0,
          });
          return { titles: [], remIds: [] };
        }

        this.logDiagnosticTrace(trace, 'extract_results:start', {
          createdRemCount: createdRems.length,
        });
        const extractedResult = await this.extractRemResults(createdRems);
        this.logDiagnosticTrace(trace, 'extract_results:done', {
          remIds: extractedResult.remIds,
          titleCount: extractedResult.titles.length,
        });
        this.logDiagnosticTrace(trace, 'transaction:callback_done', {
          createdRemCount: createdRems.length,
          resultRemCount: extractedResult.remIds.length,
        });
        return extractedResult;
      });
      this.logDiagnosticTrace(trace, 'transaction:done', {
        remIds: result.remIds,
        titleCount: result.titles.length,
      });

      if (result.remIds.length === 0) {
        this.logDiagnosticTrace(trace, 'done:no_created_rems');
        return { titles: [], remIds: [] };
      }

      this.logDiagnosticTrace(trace, 'done', {
        remIds: result.remIds,
        titleCount: result.titles.length,
      });
      return result;
    } catch (error) {
      this.logDiagnosticTrace(trace, 'error', this.describeError(error));
      throw error;
    }
  }

  async replaceChildren(
    params: ReplaceChildrenParams
  ): Promise<{ titles: string[]; remIds: string[] }> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    if (!this.settings.acceptReplaceOperation) {
      throw new Error('Replace operation is disabled in Automation Bridge settings');
    }

    const parentRemId = this.requireString(params.parentRemId, 'parentRemId');
    const content = this.requireString(params.content, 'content');
    const normalizedContent = this.normalizeContent(content);

    const rem = await this.plugin.rem.findOne(parentRemId);

    if (!rem) {
      throw new Error(`Parent note not found: ${parentRemId}`);
    }

    const preparedContent = normalizedContent
      ? await this.prepareMarkdownIdReferenceTokens(normalizedContent)
      : undefined;

    return await this.runInTransaction(async () => {
      await this.clearDirectChildren(rem);
      if (preparedContent) {
        const createdRems = await this.createRemsFromPreparedMarkdown(preparedContent, rem._id);

        if (createdRems.length > 0) {
          return await this.extractRemResults(createdRems);
        }
      }

      return { titles: [], remIds: [] };
    });
  }

  async updateTags(params: UpdateTagsParams): Promise<{ titles: string[]; remIds: string[] }> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    const remId = this.requireString(params.remId, 'remId');
    const addTagRemIds = this.optionalStringArray(params.addTagRemIds, 'addTagRemIds');
    const removeTagRemIds = this.optionalStringArray(params.removeTagRemIds, 'removeTagRemIds');

    if (!addTagRemIds.length && !removeTagRemIds.length) {
      throw new Error('update_tags requires addTagRemIds or removeTagRemIds');
    }

    const rem = await this.plugin.rem.findOne(remId);

    if (!rem) {
      throw new Error(`Note not found: ${remId}`);
    }

    for (const tagRemId of addTagRemIds) {
      await rem.addTag(tagRemId);
    }

    for (const tagRemId of removeTagRemIds) {
      await rem.removeTag(tagRemId);
    }

    return { titles: [], remIds: [remId] };
  }

  async setProperty(params: SetPropertyParams): Promise<SetPropertyResult> {
    if (!this.settings.acceptWriteOperations) {
      throw new Error('Write operations are disabled in Automation Bridge settings');
    }

    const remId = this.requireNonEmptyString(params.remId, 'remId');
    const tagRemId = this.requireNonEmptyString(params.tagRemId, 'tagRemId');
    const propertyRemId = this.requireNonEmptyString(params.propertyRemId, 'propertyRemId');

    const [rem, tagRem] = await Promise.all([
      this.plugin.rem.findOne(remId),
      this.plugin.rem.findOne(tagRemId),
    ]);

    if (!rem) {
      throw new Error(`Note not found: ${remId}`);
    }

    if (!tagRem) {
      throw new Error(`Tag not found: ${tagRemId}`);
    }

    await this.requirePropertyChild(tagRem, propertyRemId);
    const normalizedValue = await this.normalizeSetPropertyValue(params.value);

    await this.runInTransaction(async () => {
      await rem.addTag(tagRemId);
      await rem.setTagPropertyValue(propertyRemId, normalizedValue.richText);
    });

    return {
      remId,
      tagRemId,
      propertyRemId,
      valueKind: normalizedValue.kind,
    };
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
