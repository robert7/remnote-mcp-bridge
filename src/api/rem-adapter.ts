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
  includeContent?: boolean;
}

export interface ReadNoteParams {
  remId: string;
  depth?: number;
}

export interface UpdateNoteParams {
  remId: string;
  title?: string;
  appendContent?: string;
  addTags?: string[];
  removeTags?: string[];
}

export interface NoteChild {
  remId: string;
  text: string;
  children: NoteChild[];
}

export interface SearchResultItem {
  remId: string;
  title: string;
  detail?: string;
  remType: RemClassification;
  cardDirection?: CardDirection;
  content?: string;
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

/** Maximum child Rems included in search content preview. */
const SEARCH_CONTENT_CHILD_LIMIT = 5;

/** Default recursion depth for reading child Rems. */
const DEFAULT_READ_DEPTH = 3;

/** Type priority for search result sorting (lower = higher priority). */
const TYPE_PRIORITY: Record<RemClassification, number> = {
  document: 0,
  dailyDocument: 1,
  concept: 2,
  descriptor: 3,
  portal: 4,
  text: 5,
};

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

  private async getContentPreview(rem: Rem): Promise<string | undefined> {
    const children = await rem.getChildrenRem();
    if (!children || children.length === 0) return undefined;

    const childTexts = await Promise.all(
      children
        .slice(0, SEARCH_CONTENT_CHILD_LIMIT)
        .map(async (child) => this.extractText(child.text))
    );
    return childTexts.join('\n');
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
   * Results are sorted by remType priority (document > dailyDocument > concept > descriptor >
   * portal > text) with intra-group ordering preserved from RemNote's search API as a proxy
   * for relevance (no score is available from the SDK).
   *
   * The RemNote SDK search API may enforce an opaque hard limit on result count beyond the
   * requested value — this is not controllable from the plugin side.
   */
  async search(params: SearchParams): Promise<{ results: SearchResultItem[] }> {
    const limit = params.limit ?? DEFAULT_SEARCH_LIMIT;

    // Use the search API - query must be RichTextInterface
    const searchResults = await this.plugin.search.search(
      this.textToRichText(params.query),
      undefined,
      { numResults: limit }
    );

    const collected: Array<SearchResultItem & { _sourceIndex: number }> = [];
    const seen = new Set<string>();
    let sourceIndex = 0;

    for (const rem of searchResults) {
      if (seen.has(rem._id)) continue;
      seen.add(rem._id);

      const [{ title, detail }, remType, cardDirection, content] = await Promise.all([
        this.getTitleAndDetail(rem),
        this.classifyRem(rem),
        rem.backText
          ? rem.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
          : Promise.resolve(undefined),
        params.includeContent ? this.getContentPreview(rem) : Promise.resolve(undefined),
      ]);

      const item: SearchResultItem & { _sourceIndex: number } = {
        remId: rem._id,
        title,
        ...(detail ? { detail } : {}),
        remType,
        ...(cardDirection ? { cardDirection } : {}),
        ...(content ? { content } : {}),
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
    const results: SearchResultItem[] = collected.map(({ _sourceIndex, ...rest }) => rest);

    return { results };
  }

  /**
   * Read a note by its ID
   */
  async readNote(params: ReadNoteParams): Promise<{
    remId: string;
    title: string;
    detail?: string;
    remType: RemClassification;
    cardDirection?: CardDirection;
    content: string;
    children: NoteChild[];
  }> {
    const depth = params.depth ?? DEFAULT_READ_DEPTH;
    const rem = await this.plugin.rem.findOne(params.remId);

    if (!rem) {
      throw new Error(`Note not found: ${params.remId}`);
    }

    const [{ title, detail }, remType, cardDirection] = await Promise.all([
      this.getTitleAndDetail(rem),
      this.classifyRem(rem),
      rem.backText
        ? rem.getPracticeDirection().then((direction) => this.mapCardDirection(direction))
        : Promise.resolve(undefined),
    ]);
    const children = await this.getChildrenRecursive(rem, depth);

    return {
      remId: rem._id,
      title,
      ...(detail ? { detail } : {}),
      remType,
      ...(cardDirection ? { cardDirection } : {}),
      content: title,
      children,
    };
  }

  /**
   * Recursively get children of a Rem
   */
  private async getChildrenRecursive(rem: Rem, depth: number): Promise<NoteChild[]> {
    if (depth <= 0) return [];

    const children = await rem.getChildrenRem();
    if (!children || children.length === 0) return [];

    const result: NoteChild[] = [];

    for (const child of children) {
      const text = await this.extractText(child.text);
      const grandchildren = await this.getChildrenRecursive(child, depth - 1);

      result.push({
        remId: child._id,
        text,
        children: grandchildren,
      });
    }

    return result;
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
