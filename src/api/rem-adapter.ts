/**
 * RemNote API Adapter
 * Wraps the RemNote Plugin SDK with correct method signatures for v0.0.46+
 */

import { ReactRNPlugin, RichTextInterface, Rem } from '@remnote/plugin-sdk';
import { MCPSettings } from '../settings';

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
  preview: string;
  content?: string;
}

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
      journalPrefix: '[Claude]',
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
   * Extract plain text from RichTextInterface
   */
  private extractText(richText: RichTextInterface | undefined): string {
    if (!richText || !Array.isArray(richText)) return '';

    return richText
      .map((element) => {
        if (typeof element === 'string') {
          return element;
        }
        // Handle rich text elements (references, formatting, etc.)
        if (element && typeof element === 'object' && 'text' in element) {
          return (element as { text?: string }).text || '';
        }
        return '';
      })
      .join('');
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
   * Search the knowledge base
   */
  async search(params: SearchParams): Promise<{ results: SearchResultItem[] }> {
    const limit = params.limit ?? 20;

    // Use the search API - query must be RichTextInterface
    const searchResults = await this.plugin.search.search(
      this.textToRichText(params.query),
      undefined,
      { numResults: limit }
    );

    const results: SearchResultItem[] = [];

    for (const rem of searchResults) {
      // Use rem.text property (not getText method)
      const title = this.extractText(rem.text);
      const preview = title.substring(0, 100);

      const item: SearchResultItem = {
        remId: rem._id,
        title,
        preview,
      };

      if (params.includeContent) {
        const children = await rem.getChildrenRem();
        if (children && children.length > 0) {
          const childTexts = children.slice(0, 5).map((child) => {
            return this.extractText(child.text);
          });
          item.content = childTexts.join('\n');
        }
      }

      results.push(item);
    }

    return { results };
  }

  /**
   * Read a note by its ID
   */
  async readNote(params: ReadNoteParams): Promise<{
    remId: string;
    title: string;
    content: string;
    children: NoteChild[];
  }> {
    const depth = params.depth ?? 3;
    const rem = await this.plugin.rem.findOne(params.remId);

    if (!rem) {
      throw new Error(`Note not found: ${params.remId}`);
    }

    // Use rem.text property
    const title = this.extractText(rem.text);
    const children = await this.getChildrenRecursive(rem, depth);

    return {
      remId: rem._id,
      title,
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
      // Use child.text property
      const text = this.extractText(child.text);
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
