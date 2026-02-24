/**
 * RemNote API Adapter
 * Wraps the RemNote Plugin SDK with correct method signatures for v0.0.46+
 */

import {
  ReactRNPlugin,
  RichTextInterface,
  Rem,
  RemType,
  BuiltInPowerupCodes,
} from '@remnote/plugin-sdk';
import { MCPSettings, DEFAULT_JOURNAL_PREFIX } from '../settings';

// Build-time constant injected by webpack DefinePlugin
declare const __PLUGIN_VERSION__: string;

export type IncludeContentMode = 'none' | 'markdown';
export type SearchIncludeContentMode = IncludeContentMode | 'structured';

export interface CreateNoteParams {
  title: string;
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
  addTags?: string[];
  removeTags?: string[];
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
  aliases?: string[];
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
  cardDirection?: CardDirection;
  children: StructuredContentNode[];
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

const SEARCH_INCLUDE_CONTENT_MODES: readonly SearchIncludeContentMode[] = [
  'none',
  'markdown',
  'structured',
];
const READ_INCLUDE_CONTENT_MODES: readonly IncludeContentMode[] = ['none', 'markdown'];

export class RemAdapter {
  private settings: MCPSettings;

  constructor(
    private plugin: ReactRNPlugin,
    settings?: Partial<MCPSettings>
  ) {
    // Default settings
    this.settings = {
      autoTagEnabled: true,
      autoTag: 'MCP',
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
  updateSettings(settings: Partial<MCPSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): MCPSettings {
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
  private async classifyRem(rem: Rem): Promise<RemClassification> {
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

  private async getTitleAndDetail(rem: Rem): Promise<{ title: string; detail?: string }> {
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
  private async getAliases(rem: Rem): Promise<string[]> {
    if (!('getAliases' in rem) || typeof rem.getAliases !== 'function') return [];
    const aliasRems: Rem[] = await rem.getAliases();
    if (!aliasRems || aliasRems.length === 0) return [];

    const results: string[] = [];
    for (const aliasRem of aliasRems) {
      const text = await this.extractText(aliasRem.text);
      if (text) results.push(text);
    }
    return results;
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
    rem: Rem,
    depth: number,
    childLimit: number,
    maxContentLength: number,
    indentLevel: number = 0,
    accumulated: string = ''
  ): Promise<RenderResult> {
    if (depth <= 0) {
      return { content: accumulated, childrenRendered: 0, truncatedByLength: false };
    }

    const children = await rem.getChildrenRem();
    if (!children || children.length === 0) {
      return { content: accumulated, childrenRendered: 0, truncatedByLength: false };
    }

    const limitedChildren = children.slice(0, childLimit);
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
  private async countChildren(rem: Rem, depth: number): Promise<number> {
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
    rem: Rem,
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

  private async renderContentStructured(
    rem: Rem,
    depth: number,
    childLimit: number
  ): Promise<StructuredContentNode[]> {
    if (depth <= 0) return [];

    const children = await rem.getChildrenRem();
    if (!children || children.length === 0) return [];

    const limitedChildren = children.slice(0, childLimit);
    const results: StructuredContentNode[] = [];

    for (const child of limitedChildren) {
      const [{ title, detail }, remType, cardDirection, aliases] = await Promise.all([
        this.getTitleAndDetail(child),
        this.classifyRem(child),
        child.backText
          ? child.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
          : Promise.resolve(undefined),
        this.getAliases(child),
      ]);

      results.push({
        remId: child._id,
        title,
        headline: this.formatHeadline(title, detail, remType),
        remType,
        ...(aliases.length > 0 ? { aliases } : {}),
        ...(cardDirection ? { cardDirection } : {}),
        children: await this.renderContentStructured(child, depth - 1, childLimit),
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
  private async addTagToRem(rem: Rem, tagName: string): Promise<void> {
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
   * Create a new note in RemNote
   */
  async createNote(params: CreateNoteParams): Promise<{ remId: string; title: string }> {
    const rem = await this.plugin.rem.createRem();
    if (!rem) {
      throw new Error('Failed to create Rem');
    }

    // Set the title
    await rem.setText(this.textToRichText(params.title));

    // Add content as child if provided
    if (params.content) {
      const lines = params.content.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const contentRem = await this.plugin.rem.createRem();
          if (contentRem) {
            await contentRem.setText(this.textToRichText(line));
            await contentRem.setParent(rem);
          }
        }
      }
    }

    // Set parent: use provided parentId, or default parent from settings, or root
    const parentId = params.parentId || this.settings.defaultParentId;
    if (parentId) {
      const parentRem = await this.plugin.rem.findOne(parentId);
      if (parentRem) {
        await rem.setParent(parentRem);
      }
    }

    // Collect all tags to add
    const allTags = [...(params.tags || [])];

    // Add auto-tag if enabled
    if (this.settings.autoTagEnabled && this.settings.autoTag) {
      if (!allTags.includes(this.settings.autoTag)) {
        allTags.push(this.settings.autoTag);
      }
    }

    // Add all tags
    for (const tagName of allTags) {
      await this.addTagToRem(rem, tagName);
    }

    return { remId: rem._id, title: params.title };
  }

  /**
   * Append content to today's journal/daily document
   */
  async appendJournal(params: AppendJournalParams): Promise<{ remId: string; content: string }> {
    const today = new Date();
    const dailyDoc = await this.plugin.date.getDailyDoc(today);

    if (!dailyDoc) {
      throw new Error('Failed to access daily document');
    }

    const entryRem = await this.plugin.rem.createRem();
    if (!entryRem) {
      throw new Error('Failed to create journal entry');
    }

    // Build the text with prefix and optional timestamp
    const useTimestamp = params.timestamp ?? this.settings.journalTimestamp;
    const prefix = this.settings.journalPrefix;

    let text = '';
    if (prefix) {
      text += `${prefix} `;
    }
    if (useTimestamp) {
      text += `[${today.toLocaleTimeString()}] `;
    }
    text += params.content;

    await entryRem.setText(this.textToRichText(text));
    await entryRem.setParent(dailyDoc);

    return { remId: entryRem._id, content: text };
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
    const includeContent = this.parseSearchIncludeContentMode(params.includeContent);
    const depth = params.depth ?? DEFAULT_SEARCH_DEPTH;
    const childLimit = params.childLimit ?? DEFAULT_SEARCH_CHILD_LIMIT;
    const maxContentLength = params.maxContentLength ?? DEFAULT_SEARCH_MAX_CONTENT_LENGTH;
    const sdkFetchLimit = this.getSearchSdkFetchLimit(limit);

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

      const [{ title, detail }, remType, cardDirection, aliases] = await Promise.all([
        this.getTitleAndDetail(rem),
        this.classifyRem(rem),
        rem.backText
          ? rem.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
          : Promise.resolve(undefined),
        this.getAliases(rem),
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
        if (renderResult.content) {
          content = renderResult.content;
          contentProperties = await this.buildContentProperties(rem, renderResult, depth);
        }
      } else if (includeContent === 'structured') {
        const structuredChildren = await this.renderContentStructured(rem, depth, childLimit);
        if (structuredChildren.length > 0) {
          contentStructured = structuredChildren;
        }
      }

      const item: SearchResultItem & { _sourceIndex: number } = {
        remId: rem._id,
        title,
        headline,
        ...(aliases.length > 0 ? { aliases } : {}),
        remType,
        ...(cardDirection ? { cardDirection } : {}),
        ...(content ? { content } : {}),
        ...(contentStructured ? { contentStructured } : {}),
        ...(contentProperties ? { contentProperties } : {}),
        _sourceIndex: sourceIndex++,
      };

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
   * Read a note by its ID.
   *
   * Returns metadata (title, headline, aliases, remType, cardDirection) and optionally
   * rendered markdown content of the child subtree.
   */
  async readNote(params: ReadNoteParams): Promise<{
    remId: string;
    title: string;
    headline: string;
    aliases?: string[];
    remType: RemClassification;
    cardDirection?: CardDirection;
    content?: string;
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

    const [{ title, detail }, remType, cardDirection, aliases] = await Promise.all([
      this.getTitleAndDetail(rem),
      this.classifyRem(rem),
      rem.backText
        ? rem.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
        : Promise.resolve(undefined),
      this.getAliases(rem),
    ]);

    const headline = this.formatHeadline(title, detail, remType);

    let content: string | undefined;
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
    }

    return {
      remId: rem._id,
      title,
      headline,
      ...(aliases.length > 0 ? { aliases } : {}),
      remType,
      ...(cardDirection ? { cardDirection } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(contentProperties ? { contentProperties } : {}),
    };
  }

  /**
   * Update an existing note
   */
  async updateNote(params: UpdateNoteParams): Promise<{ success: boolean; remId: string }> {
    const rem = await this.plugin.rem.findOne(params.remId);

    if (!rem) {
      throw new Error(`Note not found: ${params.remId}`);
    }

    // Update title if provided
    if (params.title) {
      await rem.setText(this.textToRichText(params.title));
    }

    // Append content as new children
    if (params.appendContent) {
      const lines = params.appendContent.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const contentRem = await this.plugin.rem.createRem();
          if (contentRem) {
            await contentRem.setText(this.textToRichText(line));
            await contentRem.setParent(rem);
          }
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

    return { success: true, remId: params.remId };
  }

  /**
   * Get plugin status
   */
  async getStatus(): Promise<{
    connected: boolean;
    pluginVersion: string;
    knowledgeBaseId?: string;
  }> {
    return {
      connected: true,
      pluginVersion: __PLUGIN_VERSION__,
      knowledgeBaseId: undefined,
    };
  }
}
