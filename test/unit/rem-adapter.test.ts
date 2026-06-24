/**
 * Tests for RemNote API Adapter
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemType, BuiltInPowerupCodes, RichTextElementInterface } from '@remnote/plugin-sdk';
import { RemAdapter } from '../../src/api/rem-adapter';
import { MockRemNotePlugin, MockRem } from '../helpers/mocks';

describe('RemAdapter', () => {
  let plugin: MockRemNotePlugin;
  let adapter: RemAdapter;

  beforeEach(() => {
    plugin = new MockRemNotePlugin();
    adapter = new RemAdapter(plugin as never, {
      acceptWriteOperations: true,
      acceptReplaceOperation: false,
      autoTagEnabled: true,
      autoTagRemId: '',
      journalPrefix: '',
      journalTimestamp: true,
      wsUrl: 'ws://localhost:3002',
      defaultParentId: '',
    });
  });

  describe('Settings management', () => {
    it('should initialize with default settings', () => {
      const settings = adapter.getSettings();
      expect(settings.acceptWriteOperations).toBe(true);
      expect(settings.acceptReplaceOperation).toBe(false);
      expect(settings.autoTagEnabled).toBe(true);
      expect(settings.autoTagRemId).toBe('');
      expect(settings.journalPrefix).toBe('');
    });

    it('should update settings', () => {
      adapter.updateSettings({ autoTagEnabled: false, autoTagRemId: 'custom-tag-rem-id' });
      const settings = adapter.getSettings();
      expect(settings.autoTagEnabled).toBe(false);
      expect(settings.autoTagRemId).toBe('custom-tag-rem-id');
    });
  });

  describe('createNote', () => {
    it('should reject create when write operations are disabled', async () => {
      adapter.updateSettings({ acceptWriteOperations: false });

      await expect(
        adapter.createNote({
          title: 'Blocked note',
        })
      ).rejects.toThrow('Write operations are disabled in Automation Bridge settings');
    });

    it('should reject if no title and no content provided', async () => {
      await expect(adapter.createNote({})).rejects.toThrow(
        'create_note requires either title or content'
      );
    });

    it('should create a basic note', async () => {
      const result = await adapter.createNote({
        title: 'Test Note',
      });

      expect(result.remIds[0]).toBeDefined();
      expect(result.titles[0]).toBe('Test Note');
      expect(plugin.rem.createSingleRemWithMarkdown).toHaveBeenCalled();
    });

    it('should create the title Rem as a document when asDocument is true', async () => {
      const result = await adapter.createNote({
        title: 'Document Root',
        content: 'Child line',
        asDocument: true,
      });

      const root = await plugin.rem.findOne(result.remIds[0]);
      expect(root).toBeDefined();
      expect(await root!.isDocument()).toBe(true);

      const readResult = await adapter.readNote({ remId: result.remIds[0] });
      expect(readResult.remType).toBe('document');

      const children = await root!.getChildrenRem();
      expect(children).toHaveLength(1);
      expect(await children[0].isDocument()).toBe(false);
    });

    it('should reject asDocument for content-only creation', async () => {
      await expect(
        adapter.createNote({
          content: 'Document Root\n  Child',
          asDocument: true,
        })
      ).rejects.toThrow('asDocument requires title so the document root is unambiguous');
    });

    it('should create a note with title and markdown content', async () => {
      const result = await adapter.createNote({
        title: 'Test Note',
        content: 'Line 1\nLine 2\nLine 3',
      });

      expect(result.remIds[0]).toBeDefined();
      const rem = await plugin.rem.findOne(result.remIds[0]);
      expect(rem).toBeDefined();

      const children = await rem!.getChildrenRem();
      expect(children).toHaveLength(3);
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalled();
    });

    it('should create a note with parent', async () => {
      plugin.addTestRem('parent_1', 'Parent');

      const result = await adapter.createNote({
        title: 'Child Note',
        parentId: 'parent_1',
      });

      const childRem = await plugin.rem.findOne(result.remIds[0]);
      expect(childRem).toBeDefined();
    });

    it('should add custom tag Rem IDs without name lookup', async () => {
      const result = await adapter.createNote({
        title: 'Tagged Note',
        tagRemIds: ['tag-rem-id-1', 'tag-rem-id-2'],
      });

      const rem = await plugin.rem.findOne(result.remIds[0]);
      expect(rem).toBeDefined();
      expect(rem!.getTags()).toEqual(['tag-rem-id-1', 'tag-rem-id-2']);
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
    });

    it('should reject non-array create tag IDs before creating a note', async () => {
      await expect(
        adapter.createNote({
          title: 'Bad Tagged Note',
          tagRemIds: 'tag-rem-id',
        } as unknown as Parameters<typeof adapter.createNote>[0])
      ).rejects.toThrow('tagRemIds must be an array of strings');

      const created = await plugin.rem.findByName(['Bad Tagged Note'], null);
      expect(created).toBeNull();
    });

    it('should add auto-tag Rem ID when enabled', async () => {
      adapter.updateSettings({ autoTagEnabled: true, autoTagRemId: 'auto-tag-rem-id' });

      const result = await adapter.createNote({
        title: 'Auto Tagged Note',
      });

      const rem = await plugin.rem.findOne(result.remIds[0]);
      expect(rem).toBeDefined();
      expect(rem!.getTags()).toEqual(['auto-tag-rem-id']);
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
    });

    it('should not add auto-tag when disabled', async () => {
      adapter.updateSettings({ autoTagEnabled: false });

      const result = await adapter.createNote({
        title: 'Untagged Note',
        tagRemIds: [],
      });

      const rem = await plugin.rem.findOne(result.remIds[0]);
      expect(rem).toBeDefined();
      expect(rem!.getTags()).toHaveLength(0);
    });

    it('should use default parent from settings', async () => {
      plugin.addTestRem('default_parent', 'Default Parent');
      adapter.updateSettings({ defaultParentId: 'default_parent' });

      const result = await adapter.createNote({
        title: 'Note with default parent',
      });

      expect(result.remIds[0]).toBeDefined();
      const rem = await plugin.rem.findOne(result.remIds[0]);
      expect(rem).toBeDefined();
      const parentRem = await rem!.getParentRem();
      expect(parentRem).toBeDefined();
      expect(parentRem!._id).toBe('default_parent');
    });

    it('should create a note with only plain text content with default parent from settings', async () => {
      plugin.addTestRem('default_parent', 'Default Parent');
      adapter.updateSettings({ defaultParentId: 'default_parent' });
      const result = await adapter.createNote({
        content: 'Just some plain text',
      });

      expect(result.remIds[0]).toBeDefined();
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalledWith(
        'dummy\n  Just some plain text',
        expect.anything()
      );
    });

    it('should create a note with only markdown content with default parent from settings', async () => {
      plugin.addTestRem('default_parent', 'Default Parent');
      adapter.updateSettings({ defaultParentId: 'default_parent' });
      const result = await adapter.createNote({
        content: 'Line 1\nLine 2\nLine 3',
      });

      expect(result.remIds).toBeDefined();
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalled();
      expect(result.remIds).toHaveLength(3);
    });

    it('should preserve top-level structure for content-only create without parent', async () => {
      const top = plugin.addTestRem('top_level', 'Top Level');
      const child = plugin.addTestRem('child_level', 'Child Level');
      await child.setParent(top);
      const dummyRoot = plugin.addTestRem('dummy_root', 'dummy');
      plugin.rem.createTreeWithMarkdown.mockResolvedValueOnce([dummyRoot, top, child]);

      const result = await adapter.createNote({
        content: '1. Top Level\n  - Child Level',
      });

      expect(result.remIds).toEqual(['top_level', 'child_level']);
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalledWith(
        'dummy\n  1. Top Level\n    - Child Level',
        ''
      );
      expect(await top.getParentRem()).toBeUndefined();
      expect((await child.getParentRem())?._id).toBe('top_level');
    });

    it('should skip empty content lines', async () => {
      const result = await adapter.createNote({
        title: 'Test',
        content: 'Line 1\n\n\nLine 2\n  \n',
      });

      expect(result.remIds).toBeDefined();
      expect(result.remIds).toHaveLength(3);
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalledWith(
        'dummy\n  Line 1\n  Line 2',
        result.remIds[0]
      );
    });

    it('should support markdown in title', async () => {
      const result = await adapter.createNote({
        title: 'Note with [Link](url)',
      });

      expect(result.titles[0]).toBe('Note with [Link](url)');
      expect(plugin.rem.createSingleRemWithMarkdown).toHaveBeenCalledWith(
        'Note with [Link](url)',
        expect.anything()
      );
    });

    it('should create exact Rem references from id tokens in title and content', async () => {
      plugin.addTestRem('ref_token_target', 'Referenced Target');

      const result = await adapter.createNote({
        title: 'Links to [[id:ref_token_target]]',
        content: 'Child links to [[id:ref_token_target]]',
      });

      const rootRem = await plugin.rem.findOne(result.remIds[0]);
      expect(rootRem!.text).toEqual(['Links to ', { i: 'q', _id: 'ref_token_target' }]);

      const children = await rootRem!.getChildrenRem();
      expect(children[0].text).toEqual(['Child links to ', { i: 'q', _id: 'ref_token_target' }]);
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalledWith(
        'dummy\n  Child links to rnbridgeidrefplaceholder0',
        result.remIds[0]
      );
    });

    it('should reject missing id-token references before creating title Rems', async () => {
      await expect(
        adapter.createNote({
          title: 'Should not be created',
          content: 'Missing [[id:missing_ref_token_target]]',
        })
      ).rejects.toThrow('Reference note not found: missing_ref_token_target');

      expect(plugin.rem.createSingleRemWithMarkdown).not.toHaveBeenCalled();
      expect(plugin.rem.createTreeWithMarkdown).not.toHaveBeenCalled();
    });

    it('should patch id-token references in created back text', async () => {
      plugin.addTestRem('back_ref_target', 'Back Target');
      const dummyRoot = plugin.addTestRem('back_dummy', 'dummy');
      const child = plugin.addTestRem('back_child', 'Front');
      child.backText = ['Answer ', 'rnbridgeidrefplaceholder0'];
      plugin.rem.createTreeWithMarkdown.mockResolvedValueOnce([dummyRoot, child]);

      await adapter.createNote({
        content: 'Front >> Answer [[id:back_ref_target]]',
      });

      expect(child.backText).toEqual(['Answer ', { i: 'q', _id: 'back_ref_target' }]);
    });

    it('should use createSingleRemWithMarkdown for single-line content', async () => {
      const result = await adapter.createNote({
        title: 'Title',
        content: 'Single line [link](url)',
      });

      expect(result.remIds).toHaveLength(2);
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalledWith(
        'dummy\n  Single line [link](url)',
        result.remIds[0]
      );
    });

    it('should create md tree attached to a new title rem', async () => {
      const result = await adapter.createNote({
        title: 'Flashcard Tree',
        content: [
          `  - Basic Forward >> Answer`,
          `  - Basic Backward << Answer`,
          `  - Two-way :: Answer`,
          `  - Disabled >- Answer`,
          `  - Cloze with {{hidden}}{({hint text})} text`,
          `  - Concept :: Definition`,
          `  - Concept Forward :> Definition`,
          `  - Concept Backward :< Definition`,
          `  - Descriptor ;; Detail`,
          `  - Multi-line >>>`,
          `    - Card Item 1`,
          `    - Card Item 2`,
          `  - List-answer >>1.`,
          `    - First list item`,
          `    - Second list item`,
          `  - Multiple-choice >>A)`,
          `    - Correct option`,
          `    - Wrong option`,
        ].join('\n'),
      });

      expect(result.remIds[0]).toBeDefined();
      expect(result.remIds).toHaveLength(19);
      expect(result.titles[0]).toBe('Flashcard Tree');
      const rootRem = await plugin.rem.findOne(result.remIds[0]);
      expect(rootRem!.text).toEqual(['Flashcard Tree']);
      const expectedContent = [
        `  - Basic Forward >> Answer`,
        `  - Basic Backward << Answer`,
        `  - Two-way :: Answer`,
        `  - Disabled >- Answer`,
        `  - Cloze with {{hidden}}{({hint text})} text`,
        `  - Concept :: Definition`,
        `  - Concept Forward :> Definition`,
        `  - Concept Backward :< Definition`,
        `  - Descriptor ;; Detail`,
        `  - Multi-line >>>`,
        `    - Card Item 1`,
        `    - Card Item 2`,
        `  - List-answer >>1.`,
        `    - First list item`,
        `    - Second list item`,
        `  - Multiple-choice >>A)`,
        `    - Correct option`,
        `    - Wrong option`,
      ].join('\n');
      const dummyContent = `dummy\n${expectedContent
        .split('\n')
        .map((l) => '  ' + l)
        .join('\n')}`;
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalledWith(dummyContent, rootRem!._id);
    });

    it('should apply tags only to root when title exists', async () => {
      const result = await adapter.createNote({
        title: 'Tagged Root',
        content: '- Child 1\n- Child 2',
        tagRemIds: ['tag_id_1'],
      });

      const rootRemId = result.remIds[0];
      const rootRem = await plugin.rem.findOne(rootRemId);
      expect(rootRem!.getTags()).toContain('tag_id_1');

      // Children should NOT have tags
      const childIds = result.remIds!.filter((id) => id !== rootRemId);
      for (const id of childIds) {
        const rem = await plugin.rem.findOne(id);
        expect(rem!.getTags()).not.toContain('tag_id_1');
      }
    });

    it('should apply tags only to top-level rems when title is missing', async () => {
      // Setup mock: top-level rems have parentId = '' (root)
      const top1 = plugin.addTestRem('top1', 'Top 1');
      const top2 = plugin.addTestRem('top2', 'Top 2');
      const nested = plugin.addTestRem('nested', 'Nested');
      await nested.setParent(top1);

      const dummyRoot = plugin.addTestRem('dummy', 'dummy');
      plugin.rem.createTreeWithMarkdown.mockResolvedValueOnce([dummyRoot, top1, top2, nested]);

      await adapter.createNote({
        content: '- Top 1\n  - Nested\n- Top 2',
        tagRemIds: ['tag_id_2'],
      });

      expect(top1.getTags()).toContain('tag_id_2');
      expect(top2.getTags()).toContain('tag_id_2');
      expect(nested.getTags()).not.toContain('tag_id_2');
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
    });

    it('should correctly parse ordered lists as the first line using plain dummy root', async () => {
      const top1 = plugin.addTestRem('top1', '1. Item 1');
      const dummyRoot = plugin.addTestRem('dummy', 'dummy');
      plugin.rem.createTreeWithMarkdown.mockResolvedValueOnce([dummyRoot, top1]);

      await adapter.createNote({
        content: '1. Item 1',
      });

      // Verify dummy root was plain 'dummy' and content was indented
      expect(plugin.rem.createTreeWithMarkdown).toHaveBeenCalledWith(
        'dummy\n  1. Item 1',
        expect.anything()
      );
    });
  });

  describe('appendJournal', () => {
    it('should reject journal append when write operations are disabled', async () => {
      adapter.updateSettings({ acceptWriteOperations: false });

      await expect(
        adapter.appendJournal({
          content: 'Blocked entry',
        })
      ).rejects.toThrow('Write operations are disabled in Automation Bridge settings');
    });

    it('should append to daily document with timestamp', async () => {
      const result = await adapter.appendJournal({
        content: 'Journal entry',
        timestamp: true,
      });

      expect(result.remIds).toBeDefined();
      expect(result.titles[0]).toContain('Journal entry');
      // Matches [ followed by optional non-digits (like '下午') then the time
      expect(result.titles[0]).toMatch(/^\[[^0-9]*?\d{1,2}:\d{2}:\d{2}/);
    });

    it('should append markdown tree with timestamp title to daily document when timestamp is enabled', async () => {
      const result = await adapter.appendJournal({
        content: 'Bullet 1\n- Bullet 2\n- Bullet 3',
        timestamp: true,
      });

      expect(result.remIds).toBeDefined();
      // Matches [ followed by optional non-digits (like '下午') then the time
      expect(result.titles[0]).toMatch(/^\[[^0-9]*?\d{1,2}:\d{2}:\d{2}/);
      expect(result.titles[0]).toMatch(/\[[^0-9]*?\d{1,2}:\d{2}:\d{2}/); // Timestamp pattern

      const rem = await plugin.rem.findOne(result.remIds[0]);
      const children = await rem!.getChildrenRem();
      expect(children).toBeDefined();
      expect(children).toHaveLength(3);
      expect(children.map((c) => c.text?.[0])).toEqual(['Bullet 1', 'Bullet 2', 'Bullet 3']);
    });

    it('should append without timestamp when disabled', async () => {
      const result = await adapter.appendJournal({
        content: 'No timestamp entry',
        timestamp: false,
      });

      expect(result.titles[0]).toBe('No timestamp entry');
      expect(result.titles[0]).not.toMatch(/\[\d{1,2}:\d{2}:\d{2}/);
    });

    it('should use settings for timestamp default', async () => {
      adapter.updateSettings({ journalTimestamp: false });

      const result = await adapter.appendJournal({
        content: 'Entry with setting default',
      });

      expect(result.titles[0]).not.toMatch(/\[\d{1,2}:\d{2}:\d{2}/);
    });

    it('should use custom journal prefix', async () => {
      adapter.updateSettings({ journalPrefix: '[AI]' });

      const result = await adapter.appendJournal({
        content: 'Custom prefix entry',
      });

      expect(result.titles[0]).toContain('[AI]');
      expect(result.titles[0]).not.toMatch(/^ /);
    });

    it('should append journal entries with exact Rem references from id tokens', async () => {
      plugin.addTestRem('journal_ref_target', 'Journal Target');

      const result = await adapter.appendJournal({
        content: 'Journal [[id:journal_ref_target]]',
        timestamp: false,
      });

      const rem = await plugin.rem.findOne(result.remIds[0]);
      expect(rem!.text).toEqual(['Journal ', { i: 'q', _id: 'journal_ref_target' }]);
    });

    it('should reject missing journal id-token references before daily document lookup', async () => {
      await expect(
        adapter.appendJournal({
          content: 'Journal [[id:missing_journal_ref_target]]',
        })
      ).rejects.toThrow('Reference note not found: missing_journal_ref_target');

      expect(plugin.date.getDailyDoc).not.toHaveBeenCalled();
    });

    it('should tag top-level journal Rems by exact Rem ID', async () => {
      const result = await adapter.appendJournal({
        content: 'Top entry\n  - Nested entry',
        timestamp: false,
        tagRemIds: ['journal-tag-rem-id'],
      });

      const topRem = await plugin.rem.findOne(result.remIds[0]);
      const nestedRem = await plugin.rem.findOne(result.remIds[1]);

      expect(topRem!.getTags()).toEqual(['journal-tag-rem-id']);
      expect(nestedRem!.getTags()).toEqual([]);
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
    });

    it('should reject non-array journal tag IDs before creating an entry', async () => {
      const dailyDoc = await plugin.date.getDailyDoc(new Date());
      const childrenBefore = await dailyDoc!.getChildrenRem();

      await expect(
        adapter.appendJournal({
          content: 'Bad journal tag entry',
          tagRemIds: 'journal-tag-rem-id',
        } as unknown as Parameters<typeof adapter.appendJournal>[0])
      ).rejects.toThrow('tagRemIds must be an array of strings');

      const childrenAfter = await dailyDoc!.getChildrenRem();
      expect(childrenAfter).toHaveLength(childrenBefore.length);
    });

    it('should tag the journal wrapper Rem by exact Rem ID when prefix creates one', async () => {
      adapter.updateSettings({ journalPrefix: '[AI]' });

      const result = await adapter.appendJournal({
        content: 'Line 1\nLine 2\nLine 3',
        timestamp: true,
        tagRemIds: ['journal-wrapper-tag-rem-id'],
      });

      const wrapperRem = await plugin.rem.findOne(result.remIds[0]);
      const childRem = await plugin.rem.findOne(result.remIds[1]);

      expect(wrapperRem!.getTags()).toEqual(['journal-wrapper-tag-rem-id']);
      expect(childRem!.getTags()).toEqual([]);
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      plugin.addTestRem('rem_1', 'First note');
      plugin.addTestRem('rem_2', 'Second note');
      plugin.addTestRem('rem_3', 'Third note');
    });

    it('should search and return results', async () => {
      const result = await adapter.search({
        query: 'note',
        limit: 10,
      });

      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should respect result limit', async () => {
      const result = await adapter.search({
        query: 'note',
        limit: 2,
      });

      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('should reject non-positive search limits', async () => {
      await expect(adapter.search({ query: 'note', limit: 0 })).rejects.toThrow(
        'Search limit must be a positive integer'
      );
    });

    it('should use default limit when not specified', async () => {
      const result = await adapter.search({
        query: 'note',
      });

      expect(result.results).toBeDefined();
    });

    it('should include headline in results', async () => {
      const result = await adapter.search({
        query: 'note',
        limit: 10,
      });

      expect(result.results[0].headline).toBe('First note');
    });

    it('should preserve inline Rem references in search titles', async () => {
      plugin.clearTestData();
      plugin.addTestRem('search_ref_target', 'Referenced Search Note');
      const rem = plugin.addTestRem('search_ref_source', '');
      rem.text = ['See ', { i: 'q', _id: 'search_ref_target' }, ' today'] as unknown as string[];
      plugin.search.search.mockResolvedValueOnce([rem]);

      const result = await adapter.search({ query: 'See' });

      expect(result.results[0].title).toBe('See [[Referenced Search Note]] today');
      expect(result.results[0].headline).toBe('See [[Referenced Search Note]] today');
      expect(result.results[0].inlineRefs).toEqual([
        {
          text: 'Referenced Search Note',
          targetRemId: 'search_ref_target',
          kind: 'rem',
        },
      ]);
    });

    it('should include parent context in search results when parent exists', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_parent_ctx', 'Parent context note');
      const child = plugin.addTestRem('search_child_ctx', 'Child note');
      await child.setParent(parent);

      plugin.search.search.mockResolvedValueOnce([child]);

      const result = await adapter.search({
        query: 'Child',
      });

      expect(result.results[0].parentRemId).toBe('search_parent_ctx');
      expect(result.results[0].parentTitle).toBe('Parent context note');
    });

    it('should include parent-first ancestors in search results when requested', async () => {
      plugin.clearTestData();
      const root = plugin.addTestRem('search_ancestor_root', 'Root');
      const parent = plugin.addTestRem('search_ancestor_parent', 'Parent');
      const child = plugin.addTestRem('search_ancestor_child', 'Child');
      await parent.setParent(root);
      await child.setParent(parent);

      plugin.search.search.mockResolvedValueOnce([child]);

      const result = await adapter.search({
        query: 'Child',
        ancestorDepth: 1,
      });

      expect(result.results[0].ancestors).toEqual([
        { remId: 'search_ancestor_parent', title: 'Parent', remType: 'text' },
      ]);
      expect(result.results[0].ancestorsTruncated).toBe(true);
    });

    it('should omit ancestors in search results when ancestorDepth is zero', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_no_ancestor_parent', 'Parent');
      const child = plugin.addTestRem('search_no_ancestor_child', 'Child');
      await child.setParent(parent);

      plugin.search.search.mockResolvedValueOnce([child]);

      const result = await adapter.search({
        query: 'Child',
        ancestorDepth: 0,
      });

      expect(result.results[0].ancestors).toBeUndefined();
      expect(result.results[0].ancestorsTruncated).toBeUndefined();
    });

    it('should omit parent context in search results for top-level rems', async () => {
      plugin.clearTestData();
      const rem = plugin.addTestRem('search_root_ctx', 'Top level');
      plugin.search.search.mockResolvedValueOnce([rem]);

      const result = await adapter.search({
        query: 'Top',
      });

      expect(result.results[0].parentRemId).toBeUndefined();
      expect(result.results[0].parentTitle).toBeUndefined();
    });

    it('should include content when contentMode is markdown', async () => {
      const parentRem = plugin.addTestRem('parent_search', 'Parent');
      const childRem = new MockRem('child_search', 'Child content');
      await childRem.setParent(parentRem);

      const result = await adapter.search({
        query: 'Parent',
        contentMode: 'markdown',
      });

      const parentResult = result.results.find((r) => r.remId === 'parent_search');
      if (parentResult) {
        expect(parentResult.content).toBeDefined();
        expect(parentResult.content).toContain('Child content');
        expect(parentResult.contentProperties).toBeDefined();
      }
    });

    it('should include structured child content when contentMode is structured', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_struct_parent', 'Parent');
      plugin.addTestRem('search_struct_ref_target', 'Linked Child Target');
      const child = new MockRem('search_struct_child', 'Child');
      child.text = [
        'Child links ',
        { i: 'q', _id: 'search_struct_ref_target' },
      ] as unknown as string[];
      const grandchild = new MockRem('search_struct_grandchild', 'Grandchild');
      await child.setParent(parent);
      await grandchild.setParent(child);

      plugin.search.search.mockResolvedValueOnce([parent]);

      const result = await adapter.search({
        query: 'Parent',
        contentMode: 'structured',
        depth: 2,
      });

      expect(result.results[0].content).toBeUndefined();
      expect(result.results[0].contentProperties).toBeUndefined();
      expect(result.results[0].contentStructured).toEqual([
        {
          remId: 'search_struct_child',
          title: 'Child links [[Linked Child Target]]',
          headline: 'Child links [[Linked Child Target]]',
          inlineRefs: [
            {
              text: 'Linked Child Target',
              targetRemId: 'search_struct_ref_target',
              kind: 'rem',
            },
          ],
          remType: 'text',
          children: [
            {
              remId: 'search_struct_grandchild',
              title: 'Grandchild',
              headline: 'Grandchild',
              remType: 'text',
            },
          ],
        },
      ]);
    });

    it('should omit empty children arrays and trim trailing empty text leaf in structured content', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_struct_trim_parent', 'Parent');
      const child1 = new MockRem('search_struct_trim_child1', 'Child 1');
      const emptyTail = new MockRem('search_struct_trim_empty', '');
      await child1.setParent(parent);
      await emptyTail.setParent(parent);

      plugin.search.search.mockResolvedValueOnce([parent]);

      const result = await adapter.search({
        query: 'Parent',
        contentMode: 'structured',
        depth: 1,
      });

      expect(result.results[0].contentStructured).toEqual([
        {
          remId: 'search_struct_trim_child1',
          title: 'Child 1',
          headline: 'Child 1',
          remType: 'text',
        },
      ]);
    });

    it('should default search markdown depth to 1 level', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_depth_default_parent', 'Parent');
      const child = new MockRem('search_depth_default_child', 'Child');
      const grandchild = new MockRem('search_depth_default_grandchild', 'Grandchild');
      await child.setParent(parent);
      await grandchild.setParent(child);

      plugin.search.search.mockResolvedValueOnce([parent]);

      const result = await adapter.search({
        query: 'Parent',
        contentMode: 'markdown',
      });

      const item = result.results[0];
      expect(item.content).toContain('Child');
      expect(item.content).not.toContain('Grandchild');
    });

    it('should not include content when contentMode is none', async () => {
      const result = await adapter.search({
        query: 'note',
        contentMode: 'none',
      });

      expect(result.results[0].content).toBeUndefined();
      expect(result.results[0].contentStructured).toBeUndefined();
      expect(result.results[0].contentProperties).toBeUndefined();
    });

    it('should default contentMode to none for search', async () => {
      const result = await adapter.search({
        query: 'note',
      });

      expect(result.results[0].content).toBeUndefined();
    });

    it('should extract plain text from RichText', async () => {
      const result = await adapter.search({
        query: 'note',
      });

      expect(result.results[0].title).toBe('First note');
      expect(result.results[0]).not.toHaveProperty('preview');
    });

    it('should deduplicate results by remId preserving first occurrence', async () => {
      const { MockRem: MockRemClass } = await import('../helpers/mocks');
      const dup = new MockRemClass('rem_1', 'First note duplicate');

      // Override search to return duplicates
      plugin.search.search.mockResolvedValueOnce([
        (await plugin.rem.findOne('rem_1')) as MockRem,
        (await plugin.rem.findOne('rem_2')) as MockRem,
        dup, // duplicate rem_1
        (await plugin.rem.findOne('rem_3')) as MockRem,
      ]);

      const result = await adapter.search({
        query: 'note',
      });

      const ids = result.results.map((r) => r.remId);
      expect(ids).toEqual(['rem_1', 'rem_2', 'rem_3']);
      // First occurrence title preserved, not the duplicate's
      expect(result.results[0].title).toBe('First note');
    });

    it('should use default limit of 50', async () => {
      await adapter.search({ query: 'test' });

      expect(plugin.search.search).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({ numResults: 1000 })
      );
    });

    it('should capture up to 1000 results for cursor-backed paging', async () => {
      await adapter.search({ query: 'test', limit: 7 });

      expect(plugin.search.search).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({ numResults: 1000 })
      );
    });

    it('should trim results back to requested limit after dedupe and sorting', async () => {
      plugin.clearTestData();

      const r1 = plugin.addTestRem('r1', 'R1');
      const r2 = plugin.addTestRem('r2', 'R2');
      const r3 = plugin.addTestRem('r3', 'R3');
      const r4 = plugin.addTestRem('r4', 'R4');

      plugin.search.search.mockResolvedValueOnce([r1, r1, r2, r3, r4]);

      const result = await adapter.search({ query: 'r', limit: 3 });
      expect(result.results.map((r) => r.remId)).toEqual(['r1', 'r2', 'r3']);
    });

    it('should return a cursor and page through a stable search snapshot', async () => {
      plugin.clearTestData();

      const r1 = plugin.addTestRem('page_r1', 'Page R1');
      const r2 = plugin.addTestRem('page_r2', 'Page R2');
      const r3 = plugin.addTestRem('page_r3', 'Page R3');

      plugin.search.search.mockResolvedValueOnce([r1, r2, r3]);

      const firstPage = await adapter.search({ query: 'page', limit: 2 });
      expect(firstPage.results.map((r) => r.remId)).toEqual(['page_r1', 'page_r2']);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toBeDefined();
      expect(firstPage.truncated).toBe(false);

      plugin.search.search.mockClear();

      const secondPage = await adapter.search({
        query: 'page',
        limit: 2,
        cursor: firstPage.nextCursor,
      });

      expect(plugin.search.search).not.toHaveBeenCalled();
      expect(secondPage.results.map((r) => r.remId)).toEqual(['page_r3']);
      expect(secondPage.hasMore).toBe(false);
      expect(secondPage.nextCursor).toBeUndefined();
      expect(secondPage.truncated).toBe(false);
    });

    it('should reject a cursor used with a different query', async () => {
      plugin.clearTestData();
      const r1 = plugin.addTestRem('cursor_query_r1', 'Cursor Query R1');
      const r2 = plugin.addTestRem('cursor_query_r2', 'Cursor Query R2');
      plugin.search.search.mockResolvedValueOnce([r1, r2]);

      const firstPage = await adapter.search({ query: 'original', limit: 1 });

      await expect(
        adapter.search({ query: 'different', limit: 1, cursor: firstPage.nextCursor })
      ).rejects.toThrow('Search cursor does not match query');
    });

    it('should make snapshot-cap truncation explicit', async () => {
      plugin.clearTestData();
      const rems = Array.from({ length: 1000 }, (_, index) =>
        plugin.addTestRem(`cap_${index}`, `Cap ${index}`)
      );
      plugin.search.search.mockResolvedValueOnce(rems);

      const result = await adapter.search({ query: 'cap', limit: 5 });

      expect(result.results).toHaveLength(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
      expect(result.truncated).toBe(true);
      expect(result.truncationReason).toBe('cursor_snapshot_limit');
    });

    it('should reject unsupported search contentMode mode', async () => {
      await expect(
        adapter.search({ query: 'note', contentMode: 'weird' as 'none' })
      ).rejects.toThrow('Invalid contentMode for search');
    });

    it('should sort results by remType priority', async () => {
      plugin.clearTestData();

      const textRem = plugin.addTestRem('t1', 'Plain text');
      const conceptRem = plugin.addTestRem('c1', 'A Concept');
      conceptRem.type = RemType.CONCEPT;
      const docRem = plugin.addTestRem('d1', 'A Document');
      docRem.setIsDocumentMock(true);
      const portalRem = plugin.addTestRem('p1', 'A Portal');
      portalRem.type = RemType.PORTAL;
      const descRem = plugin.addTestRem('desc1', 'A Descriptor');
      descRem.type = RemType.DESCRIPTOR;

      // SDK returns in arbitrary order: text, concept, document, portal, descriptor
      plugin.search.search.mockResolvedValueOnce([textRem, conceptRem, docRem, portalRem, descRem]);

      const result = await adapter.search({ query: 'test' });
      const types = result.results.map((r) => r.remType);

      // Should be sorted: document/concept (same priority, SDK order), portal, descriptor, text
      expect(types).toEqual(['concept', 'document', 'portal', 'descriptor', 'text']);
    });

    it('should preserve SDK order between document and concept at same priority', async () => {
      plugin.clearTestData();

      const docRem = plugin.addTestRem('d1', 'A Document');
      docRem.setIsDocumentMock(true);
      const conceptRem = plugin.addTestRem('c1', 'A Concept');
      conceptRem.type = RemType.CONCEPT;
      const textRem = plugin.addTestRem('t1', 'Text');

      // SDK order: document before concept within same top-priority group
      plugin.search.search.mockResolvedValueOnce([textRem, docRem, conceptRem]);

      const result = await adapter.search({ query: 'test' });
      const ids = result.results.map((r) => r.remId);

      expect(ids).toEqual(['d1', 'c1', 't1']);
    });

    it('should preserve intra-group order from SDK within each type', async () => {
      plugin.clearTestData();

      const doc1 = plugin.addTestRem('doc_a', 'Doc A');
      doc1.setIsDocumentMock(true);
      const textRem = plugin.addTestRem('t1', 'Text');
      const doc2 = plugin.addTestRem('doc_b', 'Doc B');
      doc2.setIsDocumentMock(true);

      // SDK order: doc_a (pos 0), t1 (pos 1), doc_b (pos 2)
      plugin.search.search.mockResolvedValueOnce([doc1, textRem, doc2]);

      const result = await adapter.search({ query: 'test' });
      const ids = result.results.map((r) => r.remId);

      // Documents grouped first (doc_a before doc_b preserving SDK order), then text
      expect(ids).toEqual(['doc_a', 'doc_b', 't1']);
    });

    it('should include aliases in search results when present', async () => {
      plugin.clearTestData();
      const rem = plugin.addTestRem('alias_search', 'Main Name');
      rem.setAliasesMock([['Alt Name 1'], ['Alt Name 2']]);

      plugin.search.search.mockResolvedValueOnce([rem]);

      const result = await adapter.search({ query: 'main' });
      expect(result.results[0].aliases).toEqual(['Alt Name 1', 'Alt Name 2']);
    });

    it('should include tags in search results when present', async () => {
      plugin.clearTestData();
      const workTag = plugin.addTestRem('tag_work', 'work');
      const urgentTag = plugin.addTestRem('tag_urgent', 'urgent');
      const rem = plugin.addTestRem('tagged_search', 'Tagged Search Note');
      rem.setTagRemsMock([workTag, urgentTag]);

      plugin.search.search.mockResolvedValueOnce([rem]);

      const result = await adapter.search({ query: 'Tagged' });
      expect(result.results[0].tags).toEqual([
        { tagRemId: 'tag_work', name: 'work' },
        { tagRemId: 'tag_urgent', name: 'urgent' },
      ]);
    });

    it('should include tags in search results when getTagRems returns tag rem objects', async () => {
      plugin.clearTestData();
      const workTag = plugin.addTestRem('tag_work_rems', 'work');
      const urgentTag = plugin.addTestRem('tag_urgent_rems', 'urgent');
      const rem = plugin.addTestRem('tagged_search_rems', 'Tagged Search Note');
      rem.setTagRemsMock([workTag, urgentTag]);

      plugin.search.search.mockResolvedValueOnce([rem]);

      const result = await adapter.search({ query: 'Tagged' });
      expect(result.results[0].tags).toEqual([
        { tagRemId: 'tag_work_rems', name: 'work' },
        { tagRemId: 'tag_urgent_rems', name: 'urgent' },
      ]);
    });

    it('should resolve tag names by Rem ID when getTagRems returns ID-only references', async () => {
      plugin.clearTestData();
      plugin.addTestRem('tag_id_only', 'id-only-tag');
      const rem = plugin.addTestRem('tagged_search_id_only', 'Tagged Search Note');
      rem.getTagRems = vi.fn(async () => [{ _id: 'tag_id_only' } as never]);

      plugin.search.search.mockResolvedValueOnce([rem]);

      const result = await adapter.search({ query: 'Tagged' });
      expect(result.results[0].tags).toEqual([{ tagRemId: 'tag_id_only', name: 'id-only-tag' }]);
    });

    it('should omit aliases when empty', async () => {
      const result = await adapter.search({ query: 'note' });
      expect(result.results[0].aliases).toBeUndefined();
    });

    it('should include tags on structured search child nodes when present', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_tags_struct_parent', 'Parent');
      const child = new MockRem('search_tags_struct_child', 'Tagged Child');
      const childTag = plugin.addTestRem('search_tags_child_tag', 'next-action');
      await child.setParent(parent);
      child.setTagRemsMock([childTag]);

      plugin.search.search.mockResolvedValueOnce([parent]);

      const result = await adapter.search({
        query: 'Parent',
        contentMode: 'structured',
      });

      expect(result.results[0].contentStructured).toEqual([
        {
          remId: 'search_tags_struct_child',
          title: 'Tagged Child',
          headline: 'Tagged Child',
          remType: 'text',
          tags: [{ tagRemId: 'search_tags_child_tag', name: 'next-action' }],
        },
      ]);
    });

    it('should pass depth and childLimit to markdown rendering', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_render', 'Parent');
      const child1 = new MockRem('sc1', 'Child 1');
      const child2 = new MockRem('sc2', 'Child 2');
      const child3 = new MockRem('sc3', 'Child 3');
      await child1.setParent(parent);
      await child2.setParent(parent);
      await child3.setParent(parent);

      plugin.search.search.mockResolvedValueOnce([parent]);

      const result = await adapter.search({
        query: 'test',
        contentMode: 'markdown',
        childLimit: 2,
      });

      const item = result.results[0];
      expect(item.content).toContain('Child 1');
      expect(item.content).toContain('Child 2');
      expect(item.content).not.toContain('Child 3');
      expect(item.contentProperties!.childrenRendered).toBe(2);
    });

    it('should filter powerup property nodes from structured and markdown content', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_filter_parent', 'Parent');
      const propertyNode = new MockRem('search_filter_property', 'Status');
      propertyNode.type = RemType.DESCRIPTOR;
      propertyNode.setPowerupPropertyMock(true);
      const userNode = new MockRem('search_filter_user', 'Visible child');
      await propertyNode.setParent(parent);
      await userNode.setParent(parent);

      plugin.search.search.mockResolvedValue([parent]);

      const structured = await adapter.search({
        query: 'Parent',
        contentMode: 'structured',
      });
      expect(structured.results[0].contentStructured).toEqual([
        {
          remId: 'search_filter_user',
          title: 'Visible child',
          headline: 'Visible child',
          remType: 'text',
        },
      ]);

      const markdown = await adapter.search({
        query: 'Parent',
        contentMode: 'markdown',
      });
      expect(markdown.results[0].content).toBe('- Visible child\n');
      expect(markdown.results[0].content).not.toContain('Status');
    });

    it('should trim trailing empty text leaf from markdown content', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_md_trim_parent', 'Parent');
      const child = new MockRem('search_md_trim_child', 'Visible child');
      const emptyTail = new MockRem('search_md_trim_empty', '');
      await child.setParent(parent);
      await emptyTail.setParent(parent);

      plugin.search.search.mockResolvedValueOnce([parent]);

      const result = await adapter.search({
        query: 'Parent',
        contentMode: 'markdown',
        depth: 1,
      });

      expect(result.results[0].content).toBe('- Visible child\n');
      expect(result.results[0].content).not.toContain('- \n');
    });

    it('should pass parentRemId to SDK search method', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('parent_rem_id', 'Parent Rem');
      const child = plugin.addTestRem('scoped_child', 'Scoped Note');
      await child.setParent(parent);
      plugin.search.search.mockResolvedValueOnce([child]);

      await adapter.search({
        query: 'Scoped',
        parentRemId: 'parent_rem_id',
      });

      expect(plugin.search.search).toHaveBeenCalledWith(
        expect.anything(),
        'parent_rem_id',
        expect.anything()
      );
    });

    it('should throw an error when descendant traversal exceeds max depth check of 100', async () => {
      plugin.clearTestData();
      const ancestor = plugin.addTestRem('ancestor', 'Ancestor');
      let current = ancestor;
      for (let i = 0; i < 101; i++) {
        const nextRem = plugin.addTestRem(`rem_${i}`, `Level ${i}`);
        await nextRem.setParent(current);
        current = nextRem;
      }
      plugin.search.search.mockResolvedValueOnce([current]);

      await expect(
        adapter.search({
          query: 'Level 100',
          parentRemId: 'ancestor',
        })
      ).rejects.toThrow('Subtree hierarchy validation exceeded maximum depth check of 100 levels');
    });

    it('should stop descendant traversal when a cyclic parent chain is encountered', async () => {
      plugin.clearTestData();
      const remA = plugin.addTestRem('cycle_a', 'Cycle A');
      const remB = plugin.addTestRem('cycle_b', 'Cycle B');
      await remA.setParent(remB);
      await remB.setParent(remA);
      plugin.search.search.mockResolvedValueOnce([remA]);

      const result = await adapter.search({
        query: 'Cycle',
        parentRemId: 'unrelated_parent',
      });

      expect(result.results).toEqual([]);
    });

    it('should correctly scope relationCache by ancestorId to prevent cross-ancestor cache collision', async () => {
      plugin.clearTestData();
      const parentX = plugin.addTestRem('parent_x', 'Parent X');
      const parentY = plugin.addTestRem('parent_y', 'Parent Y');
      const child = plugin.addTestRem('child', 'Child');
      await child.setParent(parentY);

      const cache = new Map<string, boolean>();

      // Check descendant of parentX (should be false)
      const isDescendantX = await adapter['isDescendant'](child as never, parentX._id, cache);
      expect(isDescendantX).toBe(false);

      // Check descendant of parentY (should be true)
      const isDescendantY = await adapter['isDescendant'](child as never, parentY._id, cache);
      expect(isDescendantY).toBe(true);
    });

    it('should validate cursor when parentRemId changes', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('parent_rem_id', 'Parent Rem');
      const child1 = plugin.addTestRem('scoped_child_cursor1', 'Scoped Note 1');
      const child2 = plugin.addTestRem('scoped_child_cursor2', 'Scoped Note 2');
      await child1.setParent(parent);
      await child2.setParent(parent);
      plugin.search.search.mockResolvedValueOnce([child1, child2]);

      const firstPage = await adapter.search({
        query: 'Scoped',
        parentRemId: 'parent_rem_id',
        limit: 1,
      });

      expect(firstPage.nextCursor).toBeDefined();

      // Rerun with same context should work and not call SDK search again
      plugin.search.search.mockClear();
      const sameContextPage = await adapter.search({
        query: 'Scoped',
        parentRemId: 'parent_rem_id',
        limit: 1,
        cursor: firstPage.nextCursor,
      });
      expect(plugin.search.search).not.toHaveBeenCalled();
      expect(sameContextPage.results).toHaveLength(1);
      expect(sameContextPage.results[0].remId).toBe('scoped_child_cursor2');

      // Rerun with different context should throw validation error
      await expect(
        adapter.search({
          query: 'Scoped',
          parentRemId: 'different_parent_rem_id',
          limit: 1,
          cursor: firstPage.nextCursor,
        })
      ).rejects.toThrow('Search cursor does not match query or parent rem id');
    });
  });

  describe('searchByTag', () => {
    it('should return nearest document ancestor for tagged rems', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_daily', 'daily', 'daily');
      const doc = plugin.addTestRem('doc_parent', 'Parent Document');
      doc.setIsDocumentMock(true);
      const child = plugin.addTestRem('tagged_child_doc', 'Tagged child');
      await child.setParent(doc);
      tag.setTaggedRemsMock([child]);

      const result = await adapter.searchByTag({ tagRemId: 'tag_daily' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('doc_parent');
      expect(result.results[0].title).toBe('Parent Document');
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
    });

    it('should fallback to nearest non-document ancestor when no document exists', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_task', 'task', 'task');
      const parent = plugin.addTestRem('non_doc_parent', 'Grouping Parent');
      const child = plugin.addTestRem('tagged_child_non_doc', 'Tagged child');
      await child.setParent(parent);
      tag.setTaggedRemsMock([child]);

      const result = await adapter.searchByTag({ tagRemId: 'tag_task' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('non_doc_parent');
      expect(result.results[0].title).toBe('Grouping Parent');
    });

    it('should deduplicate resolved ancestors', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_dedupe', 'dedupe', 'dedupe');
      const parent = plugin.addTestRem('dedupe_parent', 'Shared Parent');
      const childA = plugin.addTestRem('tagged_child_a', 'Tagged child A');
      const childB = plugin.addTestRem('tagged_child_b', 'Tagged child B');
      await childA.setParent(parent);
      await childB.setParent(parent);
      tag.setTaggedRemsMock([childA, childB]);

      const result = await adapter.searchByTag({ tagRemId: 'tag_dedupe' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('dedupe_parent');
    });

    it('should expose all direct matches for deduplicated context results', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_matches', 'matches', 'matches');
      plugin.addTestRem('tagged_match_ref_target', 'Matched Reference');
      const parent = plugin.addTestRem('matches_parent', 'Shared Parent');
      const childA = plugin.addTestRem('tagged_match_a', 'Tagged child A');
      const childB = plugin.addTestRem('tagged_match_b', 'Tagged child B');
      childA.text = [
        'Tagged child A refs ',
        { i: 'q', _id: 'tagged_match_ref_target' },
      ] as unknown as string[];
      childA.setTagRemsMock([tag]);
      childB.setTagRemsMock([tag]);
      await childA.setParent(parent);
      await childB.setParent(parent);
      tag.setTaggedRemsMock([childA, childB]);

      const result = await adapter.searchByTag({ tagRemId: 'tag_matches' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('matches_parent');
      expect(result.results[0].matchedRems).toEqual([
        {
          remId: 'tagged_match_a',
          title: 'Tagged child A refs [[Matched Reference]]',
          headline: 'Tagged child A refs [[Matched Reference]]',
          inlineRefs: [
            {
              text: 'Matched Reference',
              targetRemId: 'tagged_match_ref_target',
              kind: 'rem',
            },
          ],
          remType: 'text',
          parentRemId: 'matches_parent',
          parentTitle: 'Shared Parent',
          tags: [{ tagRemId: 'tag_matches', name: 'matches' }],
        },
        {
          remId: 'tagged_match_b',
          title: 'Tagged child B',
          headline: 'Tagged child B',
          remType: 'text',
          parentRemId: 'matches_parent',
          parentTitle: 'Shared Parent',
          tags: [{ tagRemId: 'tag_matches', name: 'matches' }],
        },
      ]);
    });

    it('should include requested ancestors on search-by-tag context results and matched rems', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_ancestors', 'ancestors', 'ancestors');
      const root = plugin.addTestRem('tag_ancestor_root', 'Root');
      const parent = plugin.addTestRem('tag_ancestor_parent', 'Parent');
      const child = plugin.addTestRem('tag_ancestor_child', 'Tagged child');
      await parent.setParent(root);
      await child.setParent(parent);
      child.setTagRemsMock([tag]);
      tag.setTaggedRemsMock([child]);

      const result = await adapter.searchByTag({
        tagRemId: 'tag_ancestors',
        ancestorDepth: 2,
      });

      expect(result.results[0].ancestors).toEqual([
        { remId: 'tag_ancestor_root', title: 'Root', remType: 'text' },
      ]);
      expect(result.results[0].matchedRems?.[0].ancestors).toEqual([
        { remId: 'tag_ancestor_parent', title: 'Parent', remType: 'text' },
        { remId: 'tag_ancestor_root', title: 'Root', remType: 'text' },
      ]);
    });

    it('should return directly tagged rems with context metadata in tagged mode', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_direct', 'direct', 'direct');
      const parent = plugin.addTestRem('direct_parent', 'Direct Parent');
      await parent.setType(RemType.CONCEPT);
      const child = plugin.addTestRem('direct_child', 'Direct child');
      child.setTagRemsMock([tag]);
      await child.setParent(parent);
      tag.setTaggedRemsMock([child]);

      const result = await adapter.searchByTag({
        tagRemId: 'tag_direct',
        resultMode: 'tagged',
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        remId: 'direct_child',
        title: 'Direct child',
        parentRemId: 'direct_parent',
        parentTitle: 'Direct Parent',
        tags: [{ tagRemId: 'tag_direct', name: 'direct' }],
        contextRemId: 'direct_parent',
        contextTitle: 'Direct Parent',
        contextReason: 'ancestor-concept',
      });
      expect(result.results[0].matchedRems).toBeUndefined();
    });

    it('should page through stable tagged-mode snapshots', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_page_tagged', 'page tagged', 'page tagged');
      const noteA = plugin.addTestRem('tagged_page_a', 'Tagged Page A');
      const noteB = plugin.addTestRem('tagged_page_b', 'Tagged Page B');
      const noteC = plugin.addTestRem('tagged_page_c', 'Tagged Page C');
      tag.setTaggedRemsMock([noteA, noteB, noteC]);

      const firstPage = await adapter.searchByTag({
        tagRemId: 'tag_page_tagged',
        resultMode: 'tagged',
        limit: 2,
      });

      expect(firstPage.results.map((r) => r.remId)).toEqual(['tagged_page_a', 'tagged_page_b']);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toBeDefined();
      expect(firstPage.truncated).toBe(false);

      const noteD = plugin.addTestRem('tagged_page_d', 'Tagged Page D');
      tag.setTaggedRemsMock([noteD]);

      const secondPage = await adapter.searchByTag({
        tagRemId: 'tag_page_tagged',
        resultMode: 'tagged',
        limit: 2,
        cursor: firstPage.nextCursor,
      });

      expect(secondPage.results.map((r) => r.remId)).toEqual(['tagged_page_c']);
      expect(secondPage.hasMore).toBe(false);
      expect(secondPage.nextCursor).toBeUndefined();
      expect(secondPage.truncated).toBe(false);
    });

    it('should page context-mode snapshots with matched rem metadata intact', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_page_context', 'page context', 'page context');
      const parentA = plugin.addTestRem('context_page_parent_a', 'Context Page Parent A');
      const parentB = plugin.addTestRem('context_page_parent_b', 'Context Page Parent B');
      const childA1 = plugin.addTestRem('context_page_child_a1', 'Context Page Child A1');
      const childA2 = plugin.addTestRem('context_page_child_a2', 'Context Page Child A2');
      const childB = plugin.addTestRem('context_page_child_b', 'Context Page Child B');
      childA1.setTagRemsMock([tag]);
      childA2.setTagRemsMock([tag]);
      childB.setTagRemsMock([tag]);
      await childA1.setParent(parentA);
      await childA2.setParent(parentA);
      await childB.setParent(parentB);
      tag.setTaggedRemsMock([childA1, childA2, childB]);

      const firstPage = await adapter.searchByTag({ tagRemId: 'tag_page_context', limit: 1 });
      expect(firstPage.results).toHaveLength(1);
      expect(firstPage.results[0].remId).toBe('context_page_parent_a');
      expect(firstPage.results[0].matchedRems?.map((r) => r.remId)).toEqual([
        'context_page_child_a1',
        'context_page_child_a2',
      ]);
      expect(firstPage.hasMore).toBe(true);

      const secondPage = await adapter.searchByTag({
        tagRemId: 'tag_page_context',
        limit: 1,
        cursor: firstPage.nextCursor,
      });

      expect(secondPage.results).toHaveLength(1);
      expect(secondPage.results[0].remId).toBe('context_page_parent_b');
      expect(secondPage.results[0].matchedRems?.map((r) => r.remId)).toEqual([
        'context_page_child_b',
      ]);
      expect(secondPage.hasMore).toBe(false);
    });

    it('should reject search-by-tag cursors used with a different tag or mode', async () => {
      plugin.clearTestData();
      const tagA = plugin.addTestRem('tag_cursor_a', 'cursor a', 'cursor a');
      const tagB = plugin.addTestRem('tag_cursor_b', 'cursor b', 'cursor b');
      tagA.setTaggedRemsMock([
        plugin.addTestRem('tag_cursor_note_a', 'Cursor Note A'),
        plugin.addTestRem('tag_cursor_note_b', 'Cursor Note B'),
      ]);
      tagB.setTaggedRemsMock([plugin.addTestRem('tag_cursor_note_c', 'Cursor Note C')]);

      const firstPage = await adapter.searchByTag({
        tagRemId: 'tag_cursor_a',
        resultMode: 'tagged',
        limit: 1,
      });

      await expect(
        adapter.searchByTag({
          tagRemId: 'tag_cursor_b',
          resultMode: 'tagged',
          limit: 1,
          cursor: firstPage.nextCursor,
        })
      ).rejects.toThrow('Search by tag cursor does not match tagRemId/resultMode');

      await expect(
        adapter.searchByTag({
          tagRemId: 'tag_cursor_a',
          resultMode: 'context',
          limit: 1,
          cursor: firstPage.nextCursor,
        })
      ).rejects.toThrow('Search by tag cursor does not match tagRemId/resultMode');
    });

    it('should search by exact tag Rem ID without name or alias lookup', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_exact_id', 'Daily Renamed', 'old-name');
      tag.setAliasesMock([['daily'], ['#daily']]);
      const note = plugin.addTestRem('exact_id_target', 'Exact ID Target');
      tag.setTaggedRemsMock([note]);

      const result = await adapter.searchByTag({ tagRemId: 'tag_exact_id' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('exact_id_target');
      expect(plugin.rem.findOne).toHaveBeenCalledWith('tag_exact_id');
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
    });

    it('should support search content rendering modes', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_mode', 'mode', 'mode');
      const parent = plugin.addTestRem('mode_parent', 'Mode Parent');
      const child = plugin.addTestRem('mode_child', 'Mode Child');
      await child.setParent(parent);
      tag.setTaggedRemsMock([child]);

      const markdown = await adapter.searchByTag({
        tagRemId: 'tag_mode',
        contentMode: 'markdown',
      });
      expect(markdown.results[0].content).toBeDefined();
      expect(markdown.results[0].content).toContain('Mode Child');
      expect(markdown.results[0].contentProperties).toBeDefined();

      const structured = await adapter.searchByTag({
        tagRemId: 'tag_mode',
        contentMode: 'structured',
      });
      expect(structured.results[0].contentStructured).toEqual([
        {
          remId: 'mode_child',
          title: 'Mode Child',
          headline: 'Mode Child',
          remType: 'text',
        },
      ]);
      expect(structured.results[0].content).toBeUndefined();

      const none = await adapter.searchByTag({ tagRemId: 'tag_mode', contentMode: 'none' });
      expect(none.results[0].content).toBeUndefined();
      expect(none.results[0].contentStructured).toBeUndefined();
    });

    it('should include tags from the resolved target when present', async () => {
      plugin.clearTestData();
      const queryTag = plugin.addTestRem('tag_query', 'project', 'project');
      const targetTag = plugin.addTestRem('tag_target', 'work');
      const note = plugin.addTestRem('tag_target_note', 'Tagged target');
      note.setTagRemsMock([targetTag]);
      queryTag.setTaggedRemsMock([note]);

      const result = await adapter.searchByTag({ tagRemId: 'tag_query' });
      expect(result.results[0].tags).toEqual([{ tagRemId: 'tag_target', name: 'work' }]);
    });

    it('should return empty results when tag Rem ID is not found', async () => {
      plugin.clearTestData();
      const result = await adapter.searchByTag({ tagRemId: 'missing-tag-rem-id' });
      expect(result.results).toEqual([]);
    });

    it('should reject missing tag Rem ID', async () => {
      await expect(adapter.searchByTag({} as never)).rejects.toThrow('tagRemId must be a string');
    });
  });

  describe('readNote', () => {
    it('should read a note by ID with headline', async () => {
      plugin.addTestRem('read_test', 'Test content');

      const result = await adapter.readNote({
        remId: 'read_test',
      });

      expect(result.remId).toBe('read_test');
      expect(result.title).toBe('Test content');
      expect(result.headline).toBe('Test content');
    });

    it('should include parent context in read results when parent exists', async () => {
      const parent = plugin.addTestRem('read_parent_ctx', 'Parent title');
      const child = plugin.addTestRem('read_child_ctx', 'Child title');
      await child.setParent(parent);

      const result = await adapter.readNote({
        remId: 'read_child_ctx',
      });

      expect(result.parentRemId).toBe('read_parent_ctx');
      expect(result.parentTitle).toBe('Parent title');
    });

    it('should include parent-first ancestors in read results when requested', async () => {
      const root = plugin.addTestRem('read_ancestor_root', 'Root');
      const parent = plugin.addTestRem('read_ancestor_parent', 'Parent');
      const child = plugin.addTestRem('read_ancestor_child', 'Child');
      await parent.setParent(root);
      await child.setParent(parent);

      const result = await adapter.readNote({
        remId: 'read_ancestor_child',
        ancestorDepth: 1,
      });

      expect(result.ancestors).toEqual([
        { remId: 'read_ancestor_parent', title: 'Parent', remType: 'text' },
      ]);
      expect(result.ancestorsTruncated).toBe(true);
    });

    it('should omit verbose metadata in compact read view', async () => {
      const tag = plugin.addTestRem('read_compact_tag', 'tag');
      const rem = plugin.addTestRem('read_compact', 'Compact');
      rem.setTagRemsMock([tag]);

      const result = await adapter.readNote({
        remId: 'read_compact',
        contentMode: 'none',
        view: 'compact',
      });

      expect(result.tags).toBeUndefined();
      expect(result.aliases).toBeUndefined();
      expect(result.content).toBeUndefined();
      expect(result.contentProperties).toBeUndefined();
    });

    it('should omit parent context in read results for top-level rems', async () => {
      plugin.addTestRem('read_root_ctx', 'Root title');

      const result = await adapter.readNote({
        remId: 'read_root_ctx',
      });

      expect(result.parentRemId).toBeUndefined();
      expect(result.parentTitle).toBeUndefined();
    });

    it('should throw error for non-existent note', async () => {
      await expect(adapter.readNote({ remId: 'nonexistent' })).rejects.toThrow(
        'Note not found: nonexistent'
      );
    });

    it('should default contentMode to markdown for readNote', async () => {
      const parent = plugin.addTestRem('read_default', 'Parent');
      const child = new MockRem('read_child', 'Child text');
      await child.setParent(parent);

      const result = await adapter.readNote({ remId: 'read_default' });

      expect(result.content).toBeDefined();
      expect(result.content).toContain('Child text');
      expect(result.contentProperties).toBeDefined();
    });

    it('should return empty content for leaf note in markdown mode', async () => {
      plugin.addTestRem('no_children', 'Leaf note');

      const result = await adapter.readNote({
        remId: 'no_children',
      });

      expect(result.content).toBe('');
      expect(result.contentProperties).toEqual({
        childrenRendered: 0,
        childrenTotal: 0,
        contentTruncated: false,
      });
    });

    it('should omit content when contentMode is none', async () => {
      plugin.addTestRem('no_content', 'Note');

      const result = await adapter.readNote({
        remId: 'no_content',
        contentMode: 'none',
      });

      expect(result.content).toBeUndefined();
      expect(result.contentProperties).toBeUndefined();
    });

    it('should include structured child content when contentMode is structured', async () => {
      const parent = plugin.addTestRem('read_struct_parent', 'Parent');
      const child = new MockRem('read_struct_child', 'Child');
      const grandchild = new MockRem('read_struct_grandchild', 'Grandchild');
      await child.setParent(parent);
      await grandchild.setParent(child);

      const result = await adapter.readNote({
        remId: 'read_struct_parent',
        contentMode: 'structured',
        depth: 2,
      });

      expect(result.content).toBeUndefined();
      expect(result.contentProperties).toBeUndefined();
      expect(result.contentStructured).toEqual([
        {
          remId: 'read_struct_child',
          title: 'Child',
          headline: 'Child',
          remType: 'text',
          children: [
            {
              remId: 'read_struct_grandchild',
              title: 'Grandchild',
              headline: 'Grandchild',
              remType: 'text',
            },
          ],
        },
      ]);
    });

    it('should reject unsupported read_note contentMode mode', async () => {
      plugin.addTestRem('bad_mode_note', 'Note');

      await expect(
        adapter.readNote({ remId: 'bad_mode_note', contentMode: 'invalid-mode' as never })
      ).rejects.toThrow('Invalid contentMode for read_note');
    });

    it('should render children as indented markdown', async () => {
      const parent = plugin.addTestRem('md_test', 'Parent');
      plugin.addTestRem('md_ref_target', 'Markdown Target');
      const child = new MockRem('md_child', 'Child line');
      child.text = ['Child line ', { i: 'q', _id: 'md_ref_target' }] as unknown as string[];
      const grandchild = new MockRem('md_grandchild', 'Grandchild line');
      await child.setParent(parent);
      await grandchild.setParent(child);

      const result = await adapter.readNote({ remId: 'md_test' });

      expect(result.content).toBe('- Child line [[Markdown Target]]\n  - Grandchild line\n');
    });

    it('should respect depth parameter', async () => {
      const parent = plugin.addTestRem('depth_test', 'Parent');
      const child = new MockRem('child_depth', 'Child');
      const grandchild = new MockRem('grandchild_depth', 'Grandchild');

      await child.setParent(parent);
      await grandchild.setParent(child);

      const shallowResult = await adapter.readNote({
        remId: 'depth_test',
        depth: 1,
      });

      expect(shallowResult.content).toBe('- Child\n');
      expect(shallowResult.contentProperties!.childrenRendered).toBe(1);

      const deepResult = await adapter.readNote({
        remId: 'depth_test',
        depth: 2,
      });

      expect(deepResult.content).toBe('- Child\n  - Grandchild\n');
      expect(deepResult.contentProperties!.childrenRendered).toBe(2);
    });

    it('should respect childLimit', async () => {
      const parent = plugin.addTestRem('limit_test', 'Parent');
      for (let i = 0; i < 5; i++) {
        const child = new MockRem(`limit_child_${i}`, `Child ${i}`);
        await child.setParent(parent);
      }

      const result = await adapter.readNote({
        remId: 'limit_test',
        childLimit: 3,
      });

      expect(result.content).toContain('Child 0');
      expect(result.content).toContain('Child 1');
      expect(result.content).toContain('Child 2');
      expect(result.content).not.toContain('Child 3');
      expect(result.contentProperties!.childrenRendered).toBe(3);
    });

    it('should truncate content at maxContentLength', async () => {
      const parent = plugin.addTestRem('trunc_test', 'Parent');
      for (let i = 0; i < 10; i++) {
        const child = new MockRem(`trunc_child_${i}`, `Child number ${i} with some text`);
        await child.setParent(parent);
      }

      const result = await adapter.readNote({
        remId: 'trunc_test',
        maxContentLength: 80,
      });

      expect(result.content!.length).toBeLessThanOrEqual(80);
      expect(result.contentProperties!.contentTruncated).toBe(true);
      expect(result.contentProperties!.childrenRendered).toBeLessThan(10);
      // childrenTotal should reflect the actual count (not just rendered)
      expect(result.contentProperties!.childrenTotal).toBe(10);
    });

    it('should include aliases when present', async () => {
      const rem = plugin.addTestRem('alias_read', 'Primary Name');
      rem.setAliasesMock([['Alias One'], ['Alias Two']]);

      const result = await adapter.readNote({ remId: 'alias_read' });
      expect(result.aliases).toEqual(['Alias One', 'Alias Two']);
    });

    it('should include tags when present on read results', async () => {
      const workTag = plugin.addTestRem('read_tag_work', 'work');
      const urgentTag = plugin.addTestRem('read_tag_urgent', 'urgent');
      const rem = plugin.addTestRem('tagged_read', 'Tagged Read Note');
      rem.setTagRemsMock([workTag, urgentTag]);

      const result = await adapter.readNote({ remId: 'tagged_read', contentMode: 'none' });
      expect(result.tags).toEqual([
        { tagRemId: 'read_tag_work', name: 'work' },
        { tagRemId: 'read_tag_urgent', name: 'urgent' },
      ]);
    });

    it('should include tags on read results when getTagRems returns tag rem objects', async () => {
      const workTag = plugin.addTestRem('read_tag_work_rems', 'work');
      const urgentTag = plugin.addTestRem('read_tag_urgent_rems', 'urgent');
      const rem = plugin.addTestRem('tagged_read_rems', 'Tagged Read Note');
      rem.setTagRemsMock([workTag, urgentTag]);

      const result = await adapter.readNote({
        remId: 'tagged_read_rems',
        contentMode: 'none',
      });
      expect(result.tags).toEqual([
        { tagRemId: 'read_tag_work_rems', name: 'work' },
        { tagRemId: 'read_tag_urgent_rems', name: 'urgent' },
      ]);
    });

    it('should log a concise warning when getTagRems is missing on read results', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const rem = plugin.addTestRem('tagged_read_debug', 'Tagged Read Debug Note');
      rem.getTagRems = undefined as unknown as typeof rem.getTagRems;

      await adapter.readNote({ remId: 'tagged_read_debug', contentMode: 'none' });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Tag read unavailable for rem tagged_read_debug: getTagRems() is missing'
        )
      );

      warnSpy.mockRestore();
    });

    it('should omit aliases when none exist', async () => {
      plugin.addTestRem('no_alias', 'No Aliases');

      const result = await adapter.readNote({ remId: 'no_alias' });
      expect(result.aliases).toBeUndefined();
    });

    it('should include tags on structured read child nodes when present', async () => {
      const parent = plugin.addTestRem('read_tags_struct_parent', 'Parent');
      const child = new MockRem('read_tags_struct_child', 'Tagged Child');
      const childTag = plugin.addTestRem('read_tags_child_tag', 'reference');
      await child.setParent(parent);
      child.setTagRemsMock([childTag]);

      const result = await adapter.readNote({
        remId: 'read_tags_struct_parent',
        contentMode: 'structured',
        depth: 1,
      });

      expect(result.contentStructured).toEqual([
        {
          remId: 'read_tags_struct_child',
          title: 'Tagged Child',
          headline: 'Tagged Child',
          remType: 'text',
          tags: [{ tagRemId: 'read_tags_child_tag', name: 'reference' }],
        },
      ]);
    });

    it('should include type-aware delimiter in headline for concept with detail', async () => {
      const rem = plugin.addTestRem('concept_hl', 'Term');
      rem.type = RemType.CONCEPT;
      rem.backText = ['Definition'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.readNote({ remId: 'concept_hl' });
      expect(result.headline).toBe('Term :: Definition');
    });

    it('should include type-aware delimiter in headline for descriptor with detail', async () => {
      const rem = plugin.addTestRem('desc_hl', 'Property');
      rem.type = RemType.DESCRIPTOR;
      rem.backText = ['Value'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.readNote({ remId: 'desc_hl' });
      expect(result.headline).toBe('Property ;; Value');
    });

    it('should use >> delimiter for text type with detail', async () => {
      const rem = plugin.addTestRem('text_hl', 'Question');
      rem.backText = ['Answer'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.readNote({ remId: 'text_hl' });
      expect(result.headline).toBe('Question >> Answer');
    });

    it('should render child headlines with type-aware delimiters in markdown', async () => {
      const parent = plugin.addTestRem('hl_parent', 'Parent');
      const child = new MockRem('hl_child', '');
      child.type = RemType.CONCEPT;
      child.text = ['Term', { i: 's' }, 'Definition'] as unknown as string[];
      await child.setParent(parent);

      const result = await adapter.readNote({ remId: 'hl_parent' });
      expect(result.content).toContain('Term :: Definition');
    });
  });

  describe('updateNote', () => {
    it('should reject all updates when write operations are disabled', async () => {
      plugin.addTestRem('blocked_update_test', 'Original title');
      adapter.updateSettings({ acceptWriteOperations: false });

      await expect(
        adapter.updateNote({
          remId: 'blocked_update_test',
          title: 'New title',
        })
      ).rejects.toThrow('Write operations are disabled in Automation Bridge settings');
    });

    it('should update note title', async () => {
      plugin.addTestRem('update_test', 'Original title');

      const result = await adapter.updateNote({
        remId: 'update_test',
        title: 'New title',
      });

      expect(result.remIds).toContain('update_test');

      const updatedRem = await plugin.rem.findOne('update_test');
      expect(updatedRem!.text).toEqual(['New title']);
    });

    it('should update note title with markdown and parse it', async () => {
      plugin.addTestRem('update_1', 'Original title');
      vi.spyOn(plugin.richText, 'parseFromMarkdown').mockImplementation(async (s: string) => [s]);

      await adapter.updateNote({
        remId: 'update_1',
        title: 'New [Link](url)',
      });

      expect(plugin.richText.parseFromMarkdown).toHaveBeenCalledWith('New [Link](url)');
      const rem = await plugin.rem.findOne('update_1');
      expect(rem!.text).toEqual(['New [Link](url)']);
    });

    it('should update note title with exact Rem references from id tokens', async () => {
      plugin.addTestRem('update_ref_note', 'Original title');
      plugin.addTestRem('update_ref_target', 'Target');

      await adapter.updateNote({
        remId: 'update_ref_note',
        title: 'New [[id:update_ref_target]]',
      });

      const rem = await plugin.rem.findOne('update_ref_note');
      expect(rem!.text).toEqual(['New ', { i: 'q', _id: 'update_ref_target' }]);
    });

    it('should throw error for non-existent note', async () => {
      await expect(
        adapter.updateNote({
          remId: 'nonexistent',
          title: 'New title',
        })
      ).rejects.toThrow('Note not found: nonexistent');
    });

    it('should reject update without title', async () => {
      plugin.addTestRem('update_missing_title_test', 'Original title');

      await expect(
        adapter.updateNote({
          remId: 'update_missing_title_test',
        } as Parameters<typeof adapter.updateNote>[0])
      ).rejects.toThrow('title must be a string');
    });
  });

  describe('setDocumentStatus', () => {
    it('should preview marking a concept Rem as a document without changing it', async () => {
      const rem = plugin.addTestRem('doc_status_preview', 'Preview concept');
      rem.type = RemType.CONCEPT;
      rem.backText = ['Preview detail'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.setDocumentStatus({
        remId: 'doc_status_preview',
        isDocument: true,
      });

      expect(result).toMatchObject({
        remId: 'doc_status_preview',
        title: 'Preview concept',
        oldRemType: 'concept',
        newRemType: 'document',
        oldIsDocument: false,
        newIsDocument: true,
        requestedIsDocument: true,
        dryRun: true,
        changed: false,
        wouldChange: true,
        sdkSupportsDocumentStatus: true,
        cardDirectionBefore: 'forward',
      });
      expect(result.warnings?.[0]).toContain('concept/card status');
      expect(await rem.isDocument()).toBe(false);
    });

    it('should mark a concept Rem as a document and preserve card metadata', async () => {
      const rem = plugin.addTestRem('doc_status_apply', 'Apply concept');
      rem.type = RemType.CONCEPT;
      rem.backText = ['Apply detail'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.setDocumentStatus({
        remId: 'doc_status_apply',
        isDocument: true,
        dryRun: false,
        expectedOldRemType: 'concept',
      });

      expect(result).toMatchObject({
        remId: 'doc_status_apply',
        oldRemType: 'concept',
        newRemType: 'document',
        oldIsDocument: false,
        newIsDocument: true,
        dryRun: false,
        changed: true,
        wouldChange: true,
        cardDirectionBefore: 'forward',
        cardDirectionAfter: 'forward',
      });
      expect(rem.type).toBe(RemType.CONCEPT);
      expect(rem.backText).toEqual(['Apply detail']);
      expect(await rem.isDocument()).toBe(true);

      const readResult = await adapter.readNote({ remId: 'doc_status_apply' });
      expect(readResult.remType).toBe('document');
      expect(readResult.cardDirection).toBe('forward');
    });

    it('should unmark a document concept and reveal its concept classification', async () => {
      const rem = plugin.addTestRem('doc_status_unset', 'Unset concept');
      rem.type = RemType.CONCEPT;
      rem.setIsDocumentMock(true);

      const result = await adapter.setDocumentStatus({
        remId: 'doc_status_unset',
        isDocument: false,
        dryRun: false,
        expectedOldRemType: 'document',
      });

      expect(result.oldRemType).toBe('document');
      expect(result.newRemType).toBe('concept');
      expect(result.changed).toBe(true);
      expect(await rem.isDocument()).toBe(false);
      expect(rem.type).toBe(RemType.CONCEPT);
    });

    it('should not mutate when production request already matches document status', async () => {
      const rem = plugin.addTestRem('doc_status_noop', 'Already document');
      rem.setIsDocumentMock(true);
      const setIsDocumentSpy = vi.spyOn(rem, 'setIsDocument');

      const result = await adapter.setDocumentStatus({
        remId: 'doc_status_noop',
        isDocument: true,
        dryRun: false,
        expectedOldRemType: 'document',
      });

      expect(result).toMatchObject({
        oldRemType: 'document',
        newRemType: 'document',
        oldIsDocument: true,
        newIsDocument: true,
        dryRun: false,
        changed: false,
        wouldChange: false,
      });
      expect(setIsDocumentSpy).not.toHaveBeenCalled();
    });

    it('should reject stale expectedOldRemType', async () => {
      const rem = plugin.addTestRem('doc_status_stale', 'Stale concept');
      rem.type = RemType.CONCEPT;

      await expect(
        adapter.setDocumentStatus({
          remId: 'doc_status_stale',
          isDocument: true,
          dryRun: false,
          expectedOldRemType: 'document',
        })
      ).rejects.toThrow('Expected old remType document, but current remType is concept');
    });

    it('should reject document status updates when write operations are disabled', async () => {
      plugin.addTestRem('doc_status_blocked', 'Blocked');
      adapter.updateSettings({ acceptWriteOperations: false });

      await expect(
        adapter.setDocumentStatus({
          remId: 'doc_status_blocked',
          isDocument: true,
        })
      ).rejects.toThrow('Write operations are disabled in Automation Bridge settings');
    });
  });

  describe('listChildren', () => {
    it('should list direct children only with paging', async () => {
      const parent = plugin.addTestRem('list_parent', 'Parent');
      const childA = plugin.addTestRem('list_child_a', 'Child A');
      const childB = plugin.addTestRem('list_child_b', 'Child B');
      const grandchild = plugin.addTestRem('list_grandchild', 'Grandchild');
      await childA.setParent(parent);
      await childB.setParent(parent);
      await grandchild.setParent(childA);

      const firstPage = await adapter.listChildren({ parentRemId: 'list_parent', limit: 1 });

      expect(firstPage.children).toHaveLength(1);
      expect(firstPage.children[0].remId).toBe('list_child_a');
      expect(firstPage.children[0].contentStructured).toBeUndefined();
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toBeDefined();
      expect(firstPage.totalChildren).toBe(2);

      const secondPage = await adapter.listChildren({
        parentRemId: 'list_parent',
        limit: 1,
        cursor: firstPage.nextCursor,
      });

      expect(secondPage.children).toHaveLength(1);
      expect(secondPage.children[0].remId).toBe('list_child_b');
      expect(secondPage.hasMore).toBe(false);
    });

    it('should include child ancestors when requested', async () => {
      const root = plugin.addTestRem('list_root', 'Root');
      const parent = plugin.addTestRem('list_parent_anc', 'Parent');
      const child = plugin.addTestRem('list_child_anc', 'Child');
      await parent.setParent(root);
      await child.setParent(parent);

      const result = await adapter.listChildren({
        parentRemId: 'list_parent_anc',
        ancestorDepth: 2,
      });

      expect(result.children[0].ancestors).toEqual([
        { remId: 'list_parent_anc', title: 'Parent', remType: 'text' },
        { remId: 'list_root', title: 'Root', remType: 'text' },
      ]);
    });
  });

  describe('moveNote', () => {
    it('should dry-run a move without changing parent', async () => {
      const oldParent = plugin.addTestRem('move_old_parent', 'Old Parent');
      plugin.addTestRem('move_new_parent', 'New Parent');
      const child = plugin.addTestRem('move_child', 'Move Child');
      await child.setParent(oldParent);

      const result = await adapter.moveNote({
        remId: 'move_child',
        newParentRemId: 'move_new_parent',
        ancestorDepth: 1,
      });

      expect(result.dryRun).toBe(true);
      expect(result.oldParentRemId).toBe('move_old_parent');
      expect(result.newParentRemId).toBe('move_new_parent');
      expect((await child.getParentRem())?._id).toBe('move_old_parent');
    });

    it('should mark dry-run ancestors after as truncated when new parent has hidden ancestors', async () => {
      const oldParent = plugin.addTestRem('move_truncated_old_parent', 'Old Parent');
      const root = plugin.addTestRem('move_truncated_root', 'Root');
      const newParent = plugin.addTestRem('move_truncated_new_parent', 'New Parent');
      const child = plugin.addTestRem('move_truncated_child', 'Move Child');
      await newParent.setParent(root);
      await child.setParent(oldParent);

      const result = await adapter.moveNote({
        remId: 'move_truncated_child',
        newParentRemId: 'move_truncated_new_parent',
        ancestorDepth: 1,
      });

      expect(result.ancestorsAfter).toEqual([
        { remId: 'move_truncated_new_parent', title: 'New Parent', remType: 'text' },
      ]);
      expect(result.ancestorsAfterTruncated).toBe(true);
      expect((await child.getParentRem())?._id).toBe('move_truncated_old_parent');
    });

    it('should move a note and preserve its children', async () => {
      const oldParent = plugin.addTestRem('move_apply_old_parent', 'Old Parent');
      plugin.addTestRem('move_apply_new_parent', 'New Parent');
      const child = plugin.addTestRem('move_apply_child', 'Move Child');
      const grandchild = plugin.addTestRem('move_apply_grandchild', 'Grandchild');
      await child.setParent(oldParent);
      await grandchild.setParent(child);

      const result = await adapter.moveNote({
        remId: 'move_apply_child',
        newParentRemId: 'move_apply_new_parent',
        dryRun: false,
        expectedOldParentRemId: 'move_apply_old_parent',
      });

      expect(result.dryRun).toBe(false);
      expect((await child.getParentRem())?._id).toBe('move_apply_new_parent');
      expect((await grandchild.getParentRem())?._id).toBe('move_apply_child');
    });

    it('should reject stale expected parent and descendant moves', async () => {
      const oldParent = plugin.addTestRem('move_guard_old_parent', 'Old Parent');
      const child = plugin.addTestRem('move_guard_child', 'Move Child');
      const grandchild = plugin.addTestRem('move_guard_grandchild', 'Grandchild');
      await child.setParent(oldParent);
      await grandchild.setParent(child);

      await expect(
        adapter.moveNote({
          remId: 'move_guard_child',
          newParentRemId: 'move_guard_old_parent',
          expectedOldParentRemId: 'different_parent',
          dryRun: false,
        })
      ).rejects.toThrow('Current parent does not match expectedOldParentRemId');

      await expect(
        adapter.moveNote({
          remId: 'move_guard_child',
          newParentRemId: 'move_guard_grandchild',
          dryRun: false,
        })
      ).rejects.toThrow('Cannot move a note under one of its descendants');
    });
  });

  describe('insertChildren', () => {
    it('should insert children as first children without recreating existing children', async () => {
      const parent = plugin.addTestRem('insert_first_test', 'Parent');
      const oldChild = plugin.addTestRem('old_child_first', 'Old line');
      await oldChild.setParent(parent);

      const result = await adapter.insertChildren({
        parentRemId: 'insert_first_test',
        content: 'New line 1\nNew line 2',
        position: 'first',
      });

      expect(result.remIds).toHaveLength(2);
      const children = await parent.getChildrenRem();
      expect(children.map((c) => c.text?.[0])).toEqual(['New line 1', 'New line 2', 'Old line']);
      expect(children[2]._id).toBe('old_child_first');
    });

    it('should insert children as last children', async () => {
      const parent = plugin.addTestRem('insert_last_test', 'Parent');
      const oldChild = plugin.addTestRem('old_child_last', 'Old line');
      await oldChild.setParent(parent);

      await adapter.insertChildren({
        parentRemId: 'insert_last_test',
        content: 'New line 1\nNew line 2',
        position: 'last',
      });

      const children = await parent.getChildrenRem();
      expect(children.map((c) => c.text?.[0])).toEqual(['Old line', 'New line 1', 'New line 2']);
      expect(children[0]._id).toBe('old_child_last');
    });

    it('should insert children before a sibling', async () => {
      const parent = plugin.addTestRem('insert_before_test', 'Parent');
      const first = plugin.addTestRem('before_first', 'First');
      const second = plugin.addTestRem('before_second', 'Second');
      await first.setParent(parent);
      await second.setParent(parent, 1);

      await adapter.insertChildren({
        parentRemId: 'insert_before_test',
        content: 'Inserted',
        position: 'before',
        siblingRemId: 'before_second',
      });

      const children = await parent.getChildrenRem();
      expect(children.map((c) => c.text?.[0])).toEqual(['First', 'Inserted', 'Second']);
    });

    it('should insert children after a sibling', async () => {
      const parent = plugin.addTestRem('insert_after_test', 'Parent');
      const first = plugin.addTestRem('after_first', 'First');
      const second = plugin.addTestRem('after_second', 'Second');
      await first.setParent(parent);
      await second.setParent(parent, 1);

      await adapter.insertChildren({
        parentRemId: 'insert_after_test',
        content: 'Inserted',
        position: 'after',
        siblingRemId: 'after_first',
      });

      const children = await parent.getChildrenRem();
      expect(children.map((c) => c.text?.[0])).toEqual(['First', 'Inserted', 'Second']);
    });

    it('should insert children with exact Rem references from id tokens', async () => {
      const parent = plugin.addTestRem('insert_ref_parent', 'Parent');
      plugin.addTestRem('insert_ref_target', 'Target');

      await adapter.insertChildren({
        parentRemId: 'insert_ref_parent',
        content: 'Inserted [[id:insert_ref_target]]',
        position: 'last',
      });

      const children = await parent.getChildrenRem();
      expect(children[0].text).toEqual(['Inserted ', { i: 'q', _id: 'insert_ref_target' }]);
    });

    it('should log diagnostic checkpoints for insert children operations', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const parent = plugin.addTestRem('insert_debug_parent', 'Parent');

      const result = await adapter.insertChildren({
        parentRemId: 'insert_debug_parent',
        content: 'Inserted',
        position: 'last',
      });

      const messages = logSpy.mock.calls.map((call) => String(call[0]));
      const extractResultsStartIndex = messages.findIndex((message) =>
        message.includes('extract_results:start')
      );
      const extractResultsDoneIndex = messages.findIndex((message) =>
        message.includes('extract_results:done')
      );
      const callbackDoneIndex = messages.findIndex((message) =>
        message.includes('transaction:callback_done')
      );
      const transactionDoneIndex = messages.findIndex((message) =>
        message.includes('transaction:done')
      );

      expect(messages.some((message) => message.includes('insert_children'))).toBe(true);
      expect(messages.some((message) => message.includes('create_tree_with_markdown:start'))).toBe(
        true
      );
      expect(messages.some((message) => message.includes('child_reparent:start'))).toBe(true);
      expect(messages.some((message) => message.includes('dummy_remove:done'))).toBe(true);
      expect(extractResultsStartIndex).toBeGreaterThan(-1);
      expect(extractResultsDoneIndex).toBeGreaterThan(extractResultsStartIndex);
      expect(callbackDoneIndex).toBeGreaterThan(extractResultsDoneIndex);
      expect(transactionDoneIndex).toBeGreaterThan(callbackDoneIndex);

      const children = await parent.getChildrenRem();
      expect(result.titles).toEqual(['Inserted']);
      expect(children.map((child) => child.text?.[0])).toEqual(['Inserted']);

      logSpy.mockRestore();
    });

    it('should reject before and after without siblingRemId', async () => {
      plugin.addTestRem('insert_missing_sibling_test', 'Parent');

      await expect(
        adapter.insertChildren({
          parentRemId: 'insert_missing_sibling_test',
          content: 'Inserted',
          position: 'before',
        })
      ).rejects.toThrow('siblingRemId is required when position is before');
    });

    it('should reject siblingRemId for first and last', async () => {
      plugin.addTestRem('insert_extra_sibling_test', 'Parent');

      await expect(
        adapter.insertChildren({
          parentRemId: 'insert_extra_sibling_test',
          content: 'Inserted',
          position: 'first',
          siblingRemId: 'unused_sibling',
        })
      ).rejects.toThrow('siblingRemId must not be provided when position is first');
    });

    it('should reject a sibling outside the parent', async () => {
      plugin.addTestRem('insert_wrong_parent_test', 'Parent');
      plugin.addTestRem('outside_sibling', 'Outside');

      await expect(
        adapter.insertChildren({
          parentRemId: 'insert_wrong_parent_test',
          content: 'Inserted',
          position: 'before',
          siblingRemId: 'outside_sibling',
        })
      ).rejects.toThrow(
        'Sibling note not found under parent insert_wrong_parent_test: outside_sibling'
      );
    });

    it('should reject invalid positions before inserting children', async () => {
      const parent = plugin.addTestRem('insert_invalid_position_test', 'Parent');
      const sibling = plugin.addTestRem('insert_invalid_position_sibling', 'Sibling');
      await sibling.setParent(parent);

      await expect(
        adapter.insertChildren({
          parentRemId: 'insert_invalid_position_test',
          content: 'Inserted',
          position: 'middle',
          siblingRemId: 'insert_invalid_position_sibling',
        } as unknown as Parameters<typeof adapter.insertChildren>[0])
      ).rejects.toThrow('position must be one of first, last, before, after');

      const children = await parent.getChildrenRem();
      expect(children.map((c) => c.text?.[0])).toEqual(['Sibling']);
    });
  });

  describe('replaceChildren', () => {
    it('should replace direct children when enabled', async () => {
      const testRem = plugin.addTestRem('replace_test', 'Parent');
      const oldChild = new MockRem('old_child', 'Old line');
      await oldChild.setParent(testRem);
      adapter.updateSettings({ acceptReplaceOperation: true });

      const result = await adapter.replaceChildren({
        parentRemId: 'replace_test',
        content: 'New line 1\nNew line 2',
      });

      expect(result.remIds).toHaveLength(2);
      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.text?.[0])).toEqual(['New line 1', 'New line 2']);
    });

    it('should clear direct children when replacement content is empty string', async () => {
      const testRem = plugin.addTestRem('replace_clear_test', 'Parent');
      const oldChild = new MockRem('old_child_clear', 'Old line');
      await oldChild.setParent(testRem);
      adapter.updateSettings({ acceptReplaceOperation: true });

      await adapter.replaceChildren({
        parentRemId: 'replace_clear_test',
        content: '',
      });

      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(0);
    });

    it('should reject malformed replacement content without clearing children', async () => {
      const testRem = plugin.addTestRem('replace_malformed_content_test', 'Parent');
      const oldChild = new MockRem('old_child_malformed_content', 'Old line');
      await oldChild.setParent(testRem);
      adapter.updateSettings({ acceptReplaceOperation: true });

      await expect(
        adapter.replaceChildren({
          parentRemId: 'replace_malformed_content_test',
          content: undefined,
        } as unknown as Parameters<typeof adapter.replaceChildren>[0])
      ).rejects.toThrow('content must be a string');

      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(1);
      expect(children[0]._id).toBe('old_child_malformed_content');
    });

    it('should reject missing id-token references without clearing children', async () => {
      const testRem = plugin.addTestRem('replace_missing_ref_test', 'Parent');
      const oldChild = new MockRem('old_child_missing_ref', 'Old line');
      await oldChild.setParent(testRem);
      adapter.updateSettings({ acceptReplaceOperation: true });

      await expect(
        adapter.replaceChildren({
          parentRemId: 'replace_missing_ref_test',
          content: 'Missing [[id:missing_replace_ref_target]]',
        })
      ).rejects.toThrow('Reference note not found: missing_replace_ref_target');

      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(1);
      expect(children[0]._id).toBe('old_child_missing_ref');
    });

    it('should reject replace when replace operation is disabled', async () => {
      plugin.addTestRem('replace_disabled_test', 'Parent');
      adapter.updateSettings({ acceptReplaceOperation: false });

      await expect(
        adapter.replaceChildren({
          parentRemId: 'replace_disabled_test',
          content: 'Should fail',
        })
      ).rejects.toThrow('Replace operation is disabled in Automation Bridge settings');
    });

    it('should reject all replacements when write operations are disabled', async () => {
      plugin.addTestRem('replace_write_disabled_test', 'Parent');
      adapter.updateSettings({ acceptWriteOperations: false, acceptReplaceOperation: true });

      await expect(
        adapter.replaceChildren({
          parentRemId: 'replace_write_disabled_test',
          content: 'Should fail',
        })
      ).rejects.toThrow('Write operations are disabled in Automation Bridge settings');
    });
  });

  describe('updateTags', () => {
    it('should add and remove tags by exact Rem ID without name lookup', async () => {
      const testRem = plugin.addTestRem('tag_id_test', 'Tagged note');
      await testRem.addTag('remove_tag_id');
      const addSpy = vi.spyOn(testRem, 'addTag');
      const removeSpy = vi.spyOn(testRem, 'removeTag');

      const result = await adapter.updateTags({
        remId: 'tag_id_test',
        addTagRemIds: ['add_tag_id'],
        removeTagRemIds: ['remove_tag_id'],
      });

      expect(result.remIds).toEqual(['tag_id_test']);
      expect(addSpy).toHaveBeenCalledWith('add_tag_id');
      expect(removeSpy).toHaveBeenCalledWith('remove_tag_id');
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
      expect(testRem.getTags()).toContain('add_tag_id');
      expect(testRem.getTags()).not.toContain('remove_tag_id');
    });

    it('should reject update tags without tag IDs', async () => {
      plugin.addTestRem('empty_tag_update_test', 'Tagged note');

      await expect(
        adapter.updateTags({
          remId: 'empty_tag_update_test',
        })
      ).rejects.toThrow('update_tags requires addTagRemIds or removeTagRemIds');
    });

    it('should reject non-array tag ID inputs', async () => {
      plugin.addTestRem('non_array_tag_update_test', 'Tagged note');

      await expect(
        adapter.updateTags({
          remId: 'non_array_tag_update_test',
          addTagRemIds: 'tag-id',
        } as unknown as Parameters<typeof adapter.updateTags>[0])
      ).rejects.toThrow('addTagRemIds must be an array of strings');
    });

    it('should reject update tags for non-existent note', async () => {
      await expect(
        adapter.updateTags({
          remId: 'missing_tag_update_test',
          addTagRemIds: ['tag_id'],
        })
      ).rejects.toThrow('Note not found: missing_tag_update_test');
    });

    it('should reject all tag updates when write operations are disabled', async () => {
      plugin.addTestRem('tag_write_disabled_test', 'Tagged note');
      adapter.updateSettings({ acceptWriteOperations: false });

      await expect(
        adapter.updateTags({
          remId: 'tag_write_disabled_test',
          addTagRemIds: ['tag_id'],
        })
      ).rejects.toThrow('Write operations are disabled in Automation Bridge settings');
    });
  });

  describe('setProperty', () => {
    function addTagWithProperty(tagId = 'property_tag_id', propertyId = 'property_id') {
      const tagRem = plugin.addTestRem(tagId, 'Property Tag');
      const propertyRem = new MockRem(propertyId, 'Property');
      propertyRem.setIsPropertyMock(true);
      propertyRem.setPropertyTypeMock('text');
      return { tagRem, propertyRem };
    }

    it('should set a text property value by exact tag and property Rem IDs', async () => {
      const note = plugin.addTestRem('property_note_id', 'Tagged note');
      const { tagRem, propertyRem } = addTagWithProperty();
      await propertyRem.setParent(tagRem as never);
      const setPropertySpy = vi.spyOn(note, 'setTagPropertyValue');

      const result = await adapter.setProperty({
        remId: 'property_note_id',
        tagRemId: 'property_tag_id',
        propertyRemId: 'property_id',
        value: { kind: 'text', text: 'People' },
      });

      expect(result).toEqual({
        remId: 'property_note_id',
        tagRemId: 'property_tag_id',
        propertyRemId: 'property_id',
        valueKind: 'text',
      });
      expect(note.getTags()).toContain('property_tag_id');
      expect(setPropertySpy).toHaveBeenCalledWith('property_id', ['People']);
      expect(await note.getTagPropertyValue('property_id')).toEqual(['People']);
    });

    it('should set text property values with exact Rem references from id tokens', async () => {
      const note = plugin.addTestRem('property_text_ref_note_id', 'Tagged note');
      const { tagRem, propertyRem } = addTagWithProperty(
        'property_text_ref_tag_id',
        'property_text_ref_property_id'
      );
      await propertyRem.setParent(tagRem as never);
      plugin.addTestRem('property_text_ref_target_id', 'Target');

      await adapter.setProperty({
        remId: 'property_text_ref_note_id',
        tagRemId: 'property_text_ref_tag_id',
        propertyRemId: 'property_text_ref_property_id',
        value: { kind: 'text', text: 'See [[id:property_text_ref_target_id]]' },
      });

      expect(await note.getTagPropertyValue('property_text_ref_property_id')).toEqual([
        'See ',
        { i: 'q', _id: 'property_text_ref_target_id' },
      ]);
    });

    it('should set a Rem reference property value', async () => {
      const note = plugin.addTestRem('reference_property_note_id', 'Tagged note');
      const { tagRem, propertyRem } = addTagWithProperty(
        'reference_property_tag_id',
        'reference_property_id'
      );
      propertyRem.setPropertyTypeMock('single_select');
      await propertyRem.setParent(tagRem as never);
      plugin.addTestRem('property_value_rem_id', 'People');

      const result = await adapter.setProperty({
        remId: 'reference_property_note_id',
        tagRemId: 'reference_property_tag_id',
        propertyRemId: 'reference_property_id',
        value: { kind: 'rem_reference', remId: 'property_value_rem_id' },
      });

      expect(result.valueKind).toBe('rem_reference');
      expect(await note.getTagPropertyValue('reference_property_id')).toEqual([
        { i: 'q', _id: 'property_value_rem_id' },
      ]);
    });

    it('should clear a property value', async () => {
      const note = plugin.addTestRem('clear_property_note_id', 'Tagged note');
      const { tagRem, propertyRem } = addTagWithProperty(
        'clear_property_tag_id',
        'clear_property_id'
      );
      await propertyRem.setParent(tagRem as never);
      note.setTagPropertyValueMock('clear_property_id', ['Existing']);

      const result = await adapter.setProperty({
        remId: 'clear_property_note_id',
        tagRemId: 'clear_property_tag_id',
        propertyRemId: 'clear_property_id',
        value: { kind: 'clear' },
      });

      expect(result.valueKind).toBe('clear');
      expect(await note.getTagPropertyValue('clear_property_id')).toEqual([]);
    });

    it('should reject property IDs that are not property children of the tag', async () => {
      plugin.addTestRem('mismatch_property_note_id', 'Tagged note');
      const tagRem = plugin.addTestRem('mismatch_property_tag_id', 'Property Tag');
      const otherProperty = new MockRem('mismatch_property_id', 'Property');
      otherProperty.setIsPropertyMock(true);
      await otherProperty.setParent(new MockRem('other_tag_id', 'Other Tag') as never);
      tagRem.setTaggedRemsMock([]);

      await expect(
        adapter.setProperty({
          remId: 'mismatch_property_note_id',
          tagRemId: 'mismatch_property_tag_id',
          propertyRemId: 'mismatch_property_id',
          value: { kind: 'text', text: 'People' },
        })
      ).rejects.toThrow(
        'Property mismatch_property_id is not a property child of tag mismatch_property_tag_id'
      );
    });

    it('should reject missing referenced Rem values', async () => {
      plugin.addTestRem('missing_reference_property_note_id', 'Tagged note');
      const { tagRem, propertyRem } = addTagWithProperty(
        'missing_reference_property_tag_id',
        'missing_reference_property_id'
      );
      await propertyRem.setParent(tagRem as never);

      await expect(
        adapter.setProperty({
          remId: 'missing_reference_property_note_id',
          tagRemId: 'missing_reference_property_tag_id',
          propertyRemId: 'missing_reference_property_id',
          value: { kind: 'rem_reference', remId: 'missing_value_rem_id' },
        })
      ).rejects.toThrow('Reference note not found: missing_value_rem_id');
    });

    it('should reject property writes when write operations are disabled', async () => {
      plugin.addTestRem('property_write_disabled_note_id', 'Tagged note');
      adapter.updateSettings({ acceptWriteOperations: false });

      await expect(
        adapter.setProperty({
          remId: 'property_write_disabled_note_id',
          tagRemId: 'property_write_disabled_tag_id',
          propertyRemId: 'property_write_disabled_property_id',
          value: { kind: 'text', text: 'People' },
        })
      ).rejects.toThrow('Write operations are disabled in Automation Bridge settings');
    });
  });

  describe('getStatus', () => {
    it('should return status information', async () => {
      adapter.updateSettings({ acceptWriteOperations: false, acceptReplaceOperation: true });
      const status = await adapter.getStatus();

      expect(status.connected).toBe(true);
      expect(status.pluginVersion).toBeDefined();
      expect(typeof status.pluginVersion).toBe('string');
      expect(status.acceptWriteOperations).toBe(false);
      expect(status.acceptReplaceOperation).toBe(true);
    });
  });

  describe('Text conversion', () => {
    it('should extract plain text from RichTextInterface', async () => {
      const testRem = plugin.addTestRem('text_test', 'Simple text');
      testRem.text = ['Simple text'];

      const result = await adapter.readNote({ remId: 'text_test' });
      expect(result.title).toBe('Simple text');
    });

    it('should handle empty RichText', async () => {
      const testRem = plugin.addTestRem('empty_text', '');
      testRem.text = [];

      const result = await adapter.readNote({ remId: 'empty_text' });
      expect(result.title).toBe('');
    });

    it('should handle complex RichText elements', async () => {
      const testRem = plugin.addTestRem('complex_text', 'Complex');
      testRem.text = ['Part 1 ', { text: 'Part 2', bold: true }, ' Part 3'] as unknown as string[];

      const result = await adapter.readNote({ remId: 'complex_text' });
      expect(result.title).toContain('Part 1');
      expect(result.title).toContain('Part 2');
      expect(result.title).toContain('Part 3');
    });
  });

  describe('Rich text extraction', () => {
    it('should resolve Rem references via SDK lookup', async () => {
      plugin.addTestRem('ref_target', 'Referenced Note');
      const testRem = plugin.addTestRem('ref_test', '');
      testRem.text = ['Before ', { i: 'q', _id: 'ref_target' }, ' after'] as unknown as string[];

      const result = await adapter.readNote({ remId: 'ref_test' });
      expect(result.title).toBe('Before [[Referenced Note]] after');
      expect(result.inlineRefs).toEqual([
        {
          text: 'Referenced Note',
          targetRemId: 'ref_target',
          kind: 'rem',
        },
      ]);
    });

    it('should handle deleted Rem references with textOfDeletedRem', async () => {
      const testRem = plugin.addTestRem('deleted_ref_test', '');
      testRem.text = [
        { i: 'q', _id: 'nonexistent_ref', textOfDeletedRem: ['Old Name'] },
      ] as unknown as string[];

      const result = await adapter.readNote({ remId: 'deleted_ref_test' });
      expect(result.title).toBe('Old Name');
    });

    it('should handle deleted Rem references without textOfDeletedRem', async () => {
      const testRem = plugin.addTestRem('deleted_ref_no_text', '');
      testRem.text = [{ i: 'q', _id: 'nonexistent_ref' }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'deleted_ref_no_text' });
      expect(result.title).toBe('[deleted reference]');
    });

    it('should guard against circular references', async () => {
      // Create two Rems that reference each other
      const remA = plugin.addTestRem('circ_a', '');
      const remB = plugin.addTestRem('circ_b', '');
      remA.text = ['A refs ', { i: 'q', _id: 'circ_b' }] as unknown as string[];
      remB.text = ['B refs ', { i: 'q', _id: 'circ_a' }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'circ_a' });
      expect(result.title).toContain('A refs');
      expect(result.title).toContain('B refs');
      expect(result.title).toContain('[circular reference]');
    });

    it('should not mark repeated sibling references as circular', async () => {
      const shared = plugin.addTestRem('shared_ref', 'Shared');
      const testRem = plugin.addTestRem('repeat_ref_test', '');
      testRem.text = [
        'one ',
        { i: 'q', _id: shared._id },
        ' two ',
        { i: 'q', _id: shared._id },
      ] as unknown as string[];

      const result = await adapter.readNote({ remId: 'repeat_ref_test' });
      expect(result.title).toBe('one [[Shared]] two [[Shared]]');
      expect(result.inlineRefs).toEqual([
        { text: 'Shared', targetRemId: 'shared_ref', kind: 'rem' },
        { text: 'Shared', targetRemId: 'shared_ref', kind: 'rem' },
      ]);
      expect(result.title).not.toContain('[circular reference]');
    });

    it('should resolve global names via SDK lookup', async () => {
      plugin.addTestRem('global_target', 'Global Concept');
      const testRem = plugin.addTestRem('global_test', '');
      testRem.text = [{ i: 'g', _id: 'global_target' }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'global_test' });
      expect(result.title).toBe('Global Concept');
    });

    it('should handle null global name _id gracefully', async () => {
      const testRem = plugin.addTestRem('global_null_test', '');
      testRem.text = ['text ', { i: 'g', _id: null }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'global_null_test' });
      expect(result.title).toBe('text ');
    });

    it('should apply bold markdown formatting', async () => {
      const testRem = plugin.addTestRem('bold_test', '');
      testRem.text = [{ i: 'm', text: 'bold', b: true }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'bold_test' });
      expect(result.title).toBe('**bold**');
    });

    it('should apply italic markdown formatting', async () => {
      const testRem = plugin.addTestRem('italic_test', '');
      testRem.text = [{ i: 'm', text: 'italic', l: true }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'italic_test' });
      expect(result.title).toBe('*italic*');
    });

    it('should apply code markdown formatting', async () => {
      const testRem = plugin.addTestRem('code_test', '');
      testRem.text = [{ i: 'm', text: 'code', code: true }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'code_test' });
      expect(result.title).toBe('`code`');
    });

    it('should nest bold+italic formatting', async () => {
      const testRem = plugin.addTestRem('bold_italic_test', '');
      testRem.text = [{ i: 'm', text: 'both', b: true, l: true }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'bold_italic_test' });
      expect(result.title).toBe('***both***');
    });

    it('should render external URL links as markdown links', async () => {
      const testRem = plugin.addTestRem('url_test', '');
      testRem.text = [
        { i: 'm', text: 'Click here', url: 'https://example.com' },
      ] as unknown as string[];

      const result = await adapter.readNote({ remId: 'url_test' });
      expect(result.title).toBe('[Click here](https://example.com)');
    });

    it('should render bold external URL links correctly', async () => {
      const testRem = plugin.addTestRem('bold_url_test', '');
      testRem.text = [
        { i: 'm', text: 'Link', b: true, url: 'https://example.com' },
      ] as unknown as string[];

      const result = await adapter.readNote({ remId: 'bold_url_test' });
      expect(result.title).toBe('[**Link**](https://example.com)');
    });

    it('should use inline link text as-is (qId)', async () => {
      const testRem = plugin.addTestRem('inline_link_test', '');
      testRem.text = [{ i: 'm', text: 'Display Text', qId: 'some_rem_id' }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'inline_link_test' });
      expect(result.title).toBe('Display Text');
    });

    it('should render image with title', async () => {
      const testRem = plugin.addTestRem('img_title_test', '');
      testRem.text = [
        { i: 'i', url: 'https://example.com/img.png', title: 'My Image' },
      ] as unknown as string[];

      const result = await adapter.readNote({ remId: 'img_title_test' });
      expect(result.title).toBe('My Image');
    });

    it('should render image without title as [image]', async () => {
      const testRem = plugin.addTestRem('img_no_title_test', '');
      testRem.text = [{ i: 'i', url: 'https://example.com/img.png' }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'img_no_title_test' });
      expect(result.title).toBe('[image]');
    });

    it('should render audio as [audio]', async () => {
      const testRem = plugin.addTestRem('audio_test', '');
      testRem.text = [{ i: 'a', url: 'https://example.com/audio.mp3' }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'audio_test' });
      expect(result.title).toBe('[audio]');
    });

    it('should render drawing as [drawing]', async () => {
      const testRem = plugin.addTestRem('drawing_test', '');
      testRem.text = [{ i: 'r' }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'drawing_test' });
      expect(result.title).toBe('[drawing]');
    });

    it('should render LaTeX text', async () => {
      const testRem = plugin.addTestRem('latex_test', '');
      testRem.text = [{ i: 'x', text: 'E=mc^2' }] as unknown as string[];

      const result = await adapter.readNote({ remId: 'latex_test' });
      expect(result.title).toBe('E=mc^2');
    });

    it('should render annotation text', async () => {
      const testRem = plugin.addTestRem('annotation_test', '');
      testRem.text = [
        { i: 'n', text: 'highlighted text', url: 'https://source.com' },
      ] as unknown as string[];

      const result = await adapter.readNote({ remId: 'annotation_test' });
      expect(result.title).toBe('highlighted text');
    });

    it('should split at card delimiter and skip plugin elements', async () => {
      const testRem = plugin.addTestRem('skip_test', '');
      testRem.text = [
        'before',
        { i: 's' },
        { i: 'p', url: 'plugin://test' },
        'after',
      ] as unknown as string[];

      const result = await adapter.readNote({ remId: 'skip_test' });
      expect(result.title).toBe('before');
      expect(result.headline).toBe('before >> after');
    });

    it('should reveal cloze content as plain text', async () => {
      const testRem = plugin.addTestRem('cloze_test', '');
      testRem.text = [
        'The answer is ',
        { i: 'm', text: '42', cId: 'cloze_1' },
      ] as unknown as string[];

      const result = await adapter.readNote({ remId: 'cloze_test' });
      expect(result.title).toBe('The answer is 42');
    });
  });

  describe('Rem metadata fields', () => {
    it('should include remType for default text Rem', async () => {
      plugin.addTestRem('text_type', 'Plain text');

      const result = await adapter.readNote({ remId: 'text_type' });
      expect(result.remType).toBe('text');
    });

    it('should classify concept Rem', async () => {
      const rem = plugin.addTestRem('concept_type', 'A Concept');
      rem.type = RemType.CONCEPT;

      const result = await adapter.readNote({ remId: 'concept_type' });
      expect(result.remType).toBe('concept');
    });

    it('should classify descriptor Rem', async () => {
      const rem = plugin.addTestRem('descriptor_type', 'A Descriptor');
      rem.type = RemType.DESCRIPTOR;

      const result = await adapter.readNote({ remId: 'descriptor_type' });
      expect(result.remType).toBe('descriptor');
    });

    it('should classify portal Rem', async () => {
      const rem = plugin.addTestRem('portal_type', 'A Portal');
      rem.type = RemType.PORTAL;

      const result = await adapter.readNote({ remId: 'portal_type' });
      expect(result.remType).toBe('portal');
    });

    it('should classify document Rem', async () => {
      const rem = plugin.addTestRem('doc_type', 'A Document');
      rem.setIsDocumentMock(true);

      const result = await adapter.readNote({ remId: 'doc_type' });
      expect(result.remType).toBe('document');
    });

    it('should prioritize document status over concept type', async () => {
      const rem = plugin.addTestRem('doc_concept_type', 'A Document Concept');
      rem.type = RemType.CONCEPT;
      rem.setIsDocumentMock(true);

      const result = await adapter.readNote({ remId: 'doc_concept_type' });
      expect(result.remType).toBe('document');
    });

    it('should classify daily document Rem', async () => {
      const rem = plugin.addTestRem('daily_type', 'Feb 21, 2026');
      rem.addPowerupMock(BuiltInPowerupCodes.DailyDocument);

      const result = await adapter.readNote({ remId: 'daily_type' });
      expect(result.remType).toBe('dailyDocument');
    });

    it('should prioritize dailyDocument over concept type', async () => {
      const rem = plugin.addTestRem('daily_concept', 'Daily Concept');
      rem.type = RemType.CONCEPT;
      rem.addPowerupMock(BuiltInPowerupCodes.DailyDocument);

      const result = await adapter.readNote({ remId: 'daily_concept' });
      expect(result.remType).toBe('dailyDocument');
    });

    it('should include backText in headline', async () => {
      const rem = plugin.addTestRem('detail_test', 'Front text');
      rem.backText = ['Back text explanation'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.readNote({ remId: 'detail_test' });
      expect(result.title).toBe('Front text');
      expect(result.headline).toBe('Front text >> Back text explanation');
    });

    it('should build headline from delimiter fallback when backText is unavailable', async () => {
      const rem = plugin.addTestRem('delimiter_detail_test', '');
      rem.text = ['Front text', { i: 's' }, 'Fallback detail'] as unknown as string[];

      const result = await adapter.readNote({ remId: 'delimiter_detail_test' });
      expect(result.title).toBe('Front text');
      expect(result.headline).toBe('Front text >> Fallback detail');
    });

    it('should prefer backText over delimiter right side for headline', async () => {
      const rem = plugin.addTestRem('prefer_back_text_test', '');
      rem.text = ['Front text', { i: 's' }, 'inline detail'] as unknown as string[];
      rem.backText = ['canonical back detail'];

      const result = await adapter.readNote({ remId: 'prefer_back_text_test' });
      expect(result.title).toBe('Front text');
      expect(result.headline).toBe('Front text >> canonical back detail');
    });

    it('should omit detail field from read output', async () => {
      plugin.addTestRem('no_detail_test', 'No back text');

      const result = await adapter.readNote({ remId: 'no_detail_test' });
      expect(result).not.toHaveProperty('detail');
    });

    it('should map forward card direction', async () => {
      const rem = plugin.addTestRem('forward_card', 'Front');
      rem.backText = ['Back'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.readNote({ remId: 'forward_card' });
      expect(result.cardDirection).toBe('forward');
    });

    it('should map backward to reverse card direction', async () => {
      const rem = plugin.addTestRem('backward_card', 'Front');
      rem.backText = ['Back'];
      rem.setPracticeDirectionMock('backward');

      const result = await adapter.readNote({ remId: 'backward_card' });
      expect(result.cardDirection).toBe('reverse');
    });

    it('should map both to bidirectional card direction', async () => {
      const rem = plugin.addTestRem('both_card', 'Front');
      rem.backText = ['Back'];
      rem.setPracticeDirectionMock('both');

      const result = await adapter.readNote({ remId: 'both_card' });
      expect(result.cardDirection).toBe('bidirectional');
    });

    it('should omit cardDirection when practice direction is none', async () => {
      const rem = plugin.addTestRem('none_card', 'Front');
      rem.backText = ['Back'];
      rem.setPracticeDirectionMock('none');

      const result = await adapter.readNote({ remId: 'none_card' });
      expect(result.cardDirection).toBeUndefined();
    });

    it('should omit cardDirection when no backText', async () => {
      plugin.addTestRem('no_back_card', 'No flashcard');

      const result = await adapter.readNote({ remId: 'no_back_card' });
      expect(result.cardDirection).toBeUndefined();
    });

    it('should include metadata in search results', async () => {
      const rem = plugin.addTestRem('search_meta', 'Concept Rem');
      rem.type = RemType.CONCEPT;
      rem.backText = ['explanation text'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.search({ query: 'concept', limit: 10 });
      const item = result.results.find((r) => r.remId === 'search_meta');

      expect(item).toBeDefined();
      expect(item!.title).toBe('Concept Rem');
      expect(item!.headline).toBe('Concept Rem :: explanation text');
      expect(item).not.toHaveProperty('detail');
      expect(item!.remType).toBe('concept');
      expect(item!.cardDirection).toBe('forward');
    });

    it('should build search headline from delimiter fallback', async () => {
      const rem = plugin.addTestRem('search_delim_detail', '');
      rem.text = ['Concept Head', { i: 's' }, 'descriptor detail'] as unknown as string[];

      const result = await adapter.search({ query: 'concept', limit: 10 });
      const item = result.results.find((r) => r.remId === 'search_delim_detail');

      expect(item).toBeDefined();
      expect(item!.title).toBe('Concept Head');
      expect(item!.headline).toBe('Concept Head >> descriptor detail');
      expect(item).not.toHaveProperty('detail');
    });
  });

  describe('Tag management', () => {
    it('should apply exact tag Rem IDs without creating tag Rems', async () => {
      const result = await adapter.createNote({
        title: 'Exact tag test',
        tagRemIds: ['brand-new-tag-rem-id'],
      });
      const testRem = await plugin.rem.findOne(result.remIds[0]);

      expect(testRem!.getTags()).toEqual(['brand-new-tag-rem-id']);
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
      expect(plugin.rem.createRem).not.toHaveBeenCalled();
    });

    it('should apply existing tag Rem IDs directly', async () => {
      const result = await adapter.createNote({
        title: 'Reuse tag ID test',
        tagRemIds: ['existing_tag'],
      });
      const testRem = await plugin.rem.findOne(result.remIds[0]);

      expect(testRem!.getTags()).toContain('existing_tag');
      expect(plugin.rem.findByName).not.toHaveBeenCalled();
    });

    it('should not duplicate tags', async () => {
      const testRem = plugin.addTestRem('dup_tag_test', 'Note');
      const tag = plugin.addTestRem('dup_tag', 'Tag', 'Tag');

      await testRem.addTag(tag._id);
      await testRem.addTag(tag._id);

      expect(testRem.getTags().filter((id) => id === tag._id)).toHaveLength(1);
    });
  });

  describe('readTable', () => {
    it('should lookup table by ID', async () => {
      // Create a table rem with property children
      const tableRem = plugin.addTestRem('table-1', 'Test Table');
      const prop1 = new MockRem('prop-1', 'Status');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('text');
      await prop1.setParent(tableRem);

      // Set up tagged rems (rows)
      const row1 = new MockRem('row-1', 'Task 1');
      row1.setTagPropertyValueMock('prop-1', ['In Progress']);
      const row2 = new MockRem('row-2', 'Task 2');
      row2.setTagPropertyValueMock('prop-1', ['Done']);
      tableRem.setTaggedRemsMock([row1, row2]);

      const result = await adapter.readTable({ tableRemId: 'table-1' });

      expect(result.tableId).toBe('table-1');
      expect(result.tableName).toBe('Test Table');
      expect(result.columns).toHaveLength(1);
      expect(result.columns[0].propertyId).toBe('prop-1');
      expect(result.columns[0].name).toBe('Status');
      expect(result.columns[0].type).toBe('text');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].remId).toBe('row-1');
      expect(result.rows[0].name).toBe('Task 1');
      expect(result.rows[0].values).toEqual({ 'prop-1': 'In Progress' });
      expect(result.totalRows).toBe(2);
      expect(result.rowsReturned).toBe(2);
    });

    it('should lookup table by name', async () => {
      // Create a table rem discoverable via search/title matching
      const tableRem = plugin.addTestRem('table-projects', 'Projects', 'Projects');
      const prop1 = new MockRem('proj-prop-1', 'Status');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('select');
      await prop1.setParent(tableRem);

      const row1 = new MockRem('proj-row-1', 'Project Alpha');
      row1.setTagPropertyValueMock('proj-prop-1', ['Active']);
      tableRem.setTaggedRemsMock([row1]);

      const result = await adapter.readTable({ tableTitle: 'Projects' });

      expect(result.tableId).toBe('table-projects');
      expect(result.tableName).toBe('Projects');
      expect(result.columns).toHaveLength(1);
      expect(result.rows).toHaveLength(1);
    });

    it('should prefer same-title child table over wrapper rem', async () => {
      const wrapperRem = plugin.addTestRem('projects-wrapper', 'Projects');
      wrapperRem.setIsTableMock(true);

      const tableRem = plugin.addTestRem('projects-table', 'Projects');
      await tableRem.setParent(wrapperRem);

      const prop1 = new MockRem('projects-prop-1', 'Status');
      prop1.setIsPropertyMock(true);
      await prop1.setParent(tableRem);

      const row1 = new MockRem('projects-row-1', 'Project Alpha');
      row1.setTagPropertyValueMock('projects-prop-1', ['Active']);
      tableRem.setTaggedRemsMock([row1]);

      const result = await adapter.readTable({ tableTitle: 'Projects' });

      expect(result.tableId).toBe('projects-table');
      expect(result.tableName).toBe('Projects');
      expect(result.columns).toHaveLength(1);
      expect(result.rows).toHaveLength(1);
    });

    it('should throw error when multiple exact-title tables match', async () => {
      const tableA = plugin.addTestRem('table-projects-a', 'Projects A');
      await tableA.setText(['Projects']);
      const propA = new MockRem('proj-prop-a', 'Status');
      propA.setIsPropertyMock(true);
      await propA.setParent(tableA);

      const tableB = plugin.addTestRem('table-projects-b', 'Projects B');
      await tableB.setText(['Projects']);
      const propB = new MockRem('proj-prop-b', 'Status');
      propB.setIsPropertyMock(true);
      await propB.setParent(tableB);

      await expect(adapter.readTable({ tableTitle: 'Projects' })).rejects.toThrow(
        "Multiple tables found with exact title: 'Projects'"
      );
    });

    it('should throw error when exact title match is not a table', async () => {
      plugin.addTestRem('projects-note', 'Projects', 'Projects');

      await expect(adapter.readTable({ tableTitle: 'Projects' })).rejects.toThrow(
        "Rem found for 'Projects' is not a table"
      );
    });

    it('should throw error when table not found', async () => {
      await expect(adapter.readTable({ tableTitle: 'nonexistent' })).rejects.toThrow(
        "Table not found: 'nonexistent'"
      );
    });

    it('should require exactly one table identifier', async () => {
      await expect(adapter.readTable({})).rejects.toThrow(
        'Provide exactly one of tableRemId or tableTitle'
      );
      await expect(
        adapter.readTable({ tableRemId: 'table-1', tableTitle: 'Projects' })
      ).rejects.toThrow('Provide exactly one of tableRemId or tableTitle');
    });

    it('should throw error when rem has no properties', async () => {
      // Create a rem that is not a table (no property children)
      const _nonTableRem = plugin.addTestRem('not-a-table', 'Just a Note');
      // No property children set

      await expect(adapter.readTable({ tableRemId: 'not-a-table' })).rejects.toThrow(
        "Rem 'not-a-table' has no properties — not a table"
      );
    });

    it('should extract only property children as columns', async () => {
      const tableRem = plugin.addTestRem('table-columns', 'Multi Column Table');

      // Create 2 property children and 1 non-property child
      const prop1 = new MockRem('mc-prop-1', 'Name');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('text');
      await prop1.setParent(tableRem);

      const prop2 = new MockRem('mc-prop-2', 'Priority');
      prop2.setIsPropertyMock(true);
      prop2.setPropertyTypeMock('select');
      await prop2.setParent(tableRem);

      const nonProp = new MockRem('mc-non-prop', 'Just a child');
      await nonProp.setParent(tableRem);

      tableRem.setTaggedRemsMock([]);

      const result = await adapter.readTable({ tableRemId: 'table-columns' });

      expect(result.columns).toHaveLength(2);
      expect(result.columns.map((c) => c.propertyId)).toContain('mc-prop-1');
      expect(result.columns.map((c) => c.propertyId)).toContain('mc-prop-2');
      expect(result.columns.map((c) => c.propertyId)).not.toContain('mc-non-prop');
    });

    it('should extract rows from tagged rems', async () => {
      const tableRem = plugin.addTestRem('table-rows', 'Row Test Table');
      const prop1 = new MockRem('row-prop-1', 'Task');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('text');
      await prop1.setParent(tableRem);

      const row1 = new MockRem('test-row-1', 'First Task');
      row1.setTagPropertyValueMock('row-prop-1', ['First Task Value']);
      const row2 = new MockRem('test-row-2', 'Second Task');
      row2.setTagPropertyValueMock('row-prop-1', ['Second Task Value']);
      tableRem.setTaggedRemsMock([row1, row2]);

      const result = await adapter.readTable({ tableRemId: 'table-rows' });

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].remId).toBe('test-row-1');
      expect(result.rows[0].name).toBe('First Task');
      expect(result.rows[0].values['row-prop-1']).toBe('First Task Value');
      expect(result.rows[1].remId).toBe('test-row-2');
      expect(result.rows[1].name).toBe('Second Task');
      expect(result.rows[1].values['row-prop-1']).toBe('Second Task Value');
    });

    it('should render rich text property values', async () => {
      const tableRem = plugin.addTestRem('table-rich', 'Rich Text Table');
      const prop1 = new MockRem('rich-prop-1', 'Description');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('text');
      await prop1.setParent(tableRem);

      const row1 = new MockRem('rich-row-1', 'Item');
      // Rich text with bold formatting: ["Hello ", {i: "m", text: "World", b: true}]
      row1.setTagPropertyValueMock('rich-prop-1', [
        'Hello ',
        { i: 'm', text: 'World', b: true } as RichTextElementInterface,
      ]);
      tableRem.setTaggedRemsMock([row1]);

      const result = await adapter.readTable({ tableRemId: 'table-rich' });

      // The value should contain the rendered text
      expect(result.rows[0].values['rich-prop-1']).toContain('Hello');
      expect(result.rows[0].values['rich-prop-1']).toContain('World');
    });

    it('should handle empty cell values', async () => {
      const tableRem = plugin.addTestRem('table-empty', 'Empty Cell Table');
      const prop1 = new MockRem('empty-prop-1', 'Status');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('text');
      await prop1.setParent(tableRem);

      // Row with no value for the property
      const row1 = new MockRem('empty-row-1', 'Task with no value');
      // Don't set any property value - should return empty string
      tableRem.setTaggedRemsMock([row1]);

      const result = await adapter.readTable({ tableRemId: 'table-empty' });

      expect(result.rows[0].values['empty-prop-1']).toBe('');
    });

    it('should respect limit and offset parameters', async () => {
      const tableRem = plugin.addTestRem('table-pagination', 'Pagination Table');
      const prop1 = new MockRem('page-prop-1', 'Item');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('text');
      await prop1.setParent(tableRem);

      // Create 10 tagged rems
      const rows: MockRem[] = [];
      for (let i = 0; i < 10; i++) {
        const row = new MockRem(`page-row-${i}`, `Item ${i}`);
        row.setTagPropertyValueMock('page-prop-1', [`Value ${i}`]);
        rows.push(row);
      }
      tableRem.setTaggedRemsMock(rows);

      const result = await adapter.readTable({
        tableRemId: 'table-pagination',
        limit: 3,
        offset: 2,
      });

      // Should return rows at indices 2, 3, 4
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].name).toBe('Item 2');
      expect(result.rows[1].name).toBe('Item 3');
      expect(result.rows[2].name).toBe('Item 4');
      expect(result.totalRows).toBe(10);
      expect(result.rowsReturned).toBe(3);
    });

    it('should return empty rows when offset exceeds total', async () => {
      const tableRem = plugin.addTestRem('table-offset', 'Offset Table');
      const prop1 = new MockRem('offset-prop-1', 'Item');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('text');
      await prop1.setParent(tableRem);

      const rows: MockRem[] = [];
      for (let i = 0; i < 10; i++) {
        const row = new MockRem(`offset-row-${i}`, `Item ${i}`);
        row.setTagPropertyValueMock('offset-prop-1', [`Value ${i}`]);
        rows.push(row);
      }
      tableRem.setTaggedRemsMock(rows);

      const result = await adapter.readTable({
        tableRemId: 'table-offset',
        limit: 5,
        offset: 15,
      });

      expect(result.rows).toHaveLength(0);
      expect(result.totalRows).toBe(10);
      expect(result.rowsReturned).toBe(0);
    });

    it('should filter columns and values by propertyFilter', async () => {
      const tableRem = plugin.addTestRem('table-filter', 'Filter Table');

      const propStatus = new MockRem('filter-prop-status', 'Status');
      propStatus.setIsPropertyMock(true);
      propStatus.setPropertyTypeMock('select');
      await propStatus.setParent(tableRem);

      const propDate = new MockRem('filter-prop-date', 'Date');
      propDate.setIsPropertyMock(true);
      propDate.setPropertyTypeMock('date');
      await propDate.setParent(tableRem);

      const propPriority = new MockRem('filter-prop-priority', 'Priority');
      propPriority.setIsPropertyMock(true);
      propPriority.setPropertyTypeMock('select');
      await propPriority.setParent(tableRem);

      const row1 = new MockRem('filter-row-1', 'Task 1');
      row1.setTagPropertyValueMock('filter-prop-status', ['Active']);
      row1.setTagPropertyValueMock('filter-prop-date', ['2024-01-15']);
      row1.setTagPropertyValueMock('filter-prop-priority', ['High']);
      tableRem.setTaggedRemsMock([row1]);

      const result = await adapter.readTable({
        tableRemId: 'table-filter',
        propertyFilter: ['Status'],
      });

      // Only Status column should be present
      expect(result.columns).toHaveLength(1);
      expect(result.columns[0].name).toBe('Status');
      expect(result.rows[0].values).toEqual({ 'filter-prop-status': 'Active' });
    });

    it('should handle unknown property in filter gracefully', async () => {
      const tableRem = plugin.addTestRem('table-unknown-filter', 'Unknown Filter Table');

      const prop1 = new MockRem('unk-prop-1', 'Status');
      prop1.setIsPropertyMock(true);
      prop1.setPropertyTypeMock('text');
      await prop1.setParent(tableRem);

      const row1 = new MockRem('unk-row-1', 'Task');
      row1.setTagPropertyValueMock('unk-prop-1', ['Active']);
      tableRem.setTaggedRemsMock([row1]);

      const result = await adapter.readTable({
        tableRemId: 'table-unknown-filter',
        propertyFilter: ['Nonexistent'],
      });

      // Should return empty columns and empty values
      expect(result.columns).toHaveLength(0);
      expect(result.rows[0].values).toEqual({});
    });
  });
});
