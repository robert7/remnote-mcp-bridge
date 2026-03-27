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
    adapter = new RemAdapter(plugin as unknown as typeof plugin, {
      acceptWriteOperations: true,
      acceptReplaceOperation: false,
      autoTagEnabled: true,
      autoTag: '',
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
      expect(settings.autoTag).toBe('');
      expect(settings.journalPrefix).toBe('');
    });

    it('should update settings', () => {
      adapter.updateSettings({ autoTagEnabled: false, autoTag: 'Custom' });
      const settings = adapter.getSettings();
      expect(settings.autoTagEnabled).toBe(false);
      expect(settings.autoTag).toBe('Custom');
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

    it('should add custom tags', async () => {
      const result = await adapter.createNote({
        title: 'Tagged Note',
        tags: ['tag1', 'tag2'],
      });

      const rem = await plugin.rem.findOne(result.remIds[0]);
      expect(rem).toBeDefined();
      // Tags should have been added (auto-tag + custom tags)
      expect(rem!.getTags().length).toBeGreaterThan(0);
    });

    it('should add auto-tag when enabled', async () => {
      adapter.updateSettings({ autoTagEnabled: true, autoTag: 'AutoTag' });

      const result = await adapter.createNote({
        title: 'Auto Tagged Note',
      });

      const rem = await plugin.rem.findOne(result.remIds[0]);
      expect(rem).toBeDefined();
      expect(rem!.getTags().length).toBeGreaterThan(0);
    });

    it('should not add auto-tag when disabled', async () => {
      adapter.updateSettings({ autoTagEnabled: false });

      const result = await adapter.createNote({
        title: 'Untagged Note',
        tags: [],
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
      const tagRem = plugin.addTestRem('tag_id_1', 'tree-tag', 'tree-tag');

      const result = await adapter.createNote({
        title: 'Tagged Root',
        content: '- Child 1\n- Child 2',
        tags: ['tree-tag'],
      });

      const rootRemId = result.remIds[0];
      const rootRem = await plugin.rem.findOne(rootRemId);
      expect(rootRem!.getTags()).toContain(tagRem._id);

      // Children should NOT have tags
      const childIds = result.remIds!.filter((id) => id !== rootRemId);
      for (const id of childIds) {
        const rem = await plugin.rem.findOne(id);
        expect(rem!.getTags()).not.toContain(tagRem._id);
      }
    });

    it('should apply tags only to top-level rems when title is missing', async () => {
      const tagRem = plugin.addTestRem('tag_id_2', 'top-tag', 'top-tag');

      // Setup mock: top-level rems have parentId = '' (root)
      const top1 = plugin.addTestRem('top1', 'Top 1');
      const top2 = plugin.addTestRem('top2', 'Top 2');
      const nested = plugin.addTestRem('nested', 'Nested');
      await nested.setParent(top1);

      const dummyRoot = plugin.addTestRem('dummy', 'dummy');
      plugin.rem.createTreeWithMarkdown.mockResolvedValueOnce([dummyRoot, top1, top2, nested]);

      await adapter.createNote({
        content: '- Top 1\n  - Nested\n- Top 2',
        tags: ['top-tag'],
      });

      expect(top1.getTags()).toContain(tagRem._id);
      expect(top2.getTags()).toContain(tagRem._id);
      expect(nested.getTags()).not.toContain(tagRem._id);
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

    it('should include parent context in search results when parent exists', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_parent_ctx', 'Parent context note');
      const child = new MockRem('search_child_ctx', 'Child note');
      await child.setParent(parent);

      plugin.search.search.mockResolvedValueOnce([child]);

      const result = await adapter.search({
        query: 'Child',
      });

      expect(result.results[0].parentRemId).toBe('search_parent_ctx');
      expect(result.results[0].parentTitle).toBe('Parent context note');
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

    it('should include content when includeContent is markdown', async () => {
      const parentRem = plugin.addTestRem('parent_search', 'Parent');
      const childRem = new MockRem('child_search', 'Child content');
      await childRem.setParent(parentRem);

      const result = await adapter.search({
        query: 'Parent',
        includeContent: 'markdown',
      });

      const parentResult = result.results.find((r) => r.remId === 'parent_search');
      if (parentResult) {
        expect(parentResult.content).toBeDefined();
        expect(parentResult.content).toContain('Child content');
        expect(parentResult.contentProperties).toBeDefined();
      }
    });

    it('should include structured child content when includeContent is structured', async () => {
      plugin.clearTestData();
      const parent = plugin.addTestRem('search_struct_parent', 'Parent');
      const child = new MockRem('search_struct_child', 'Child');
      const grandchild = new MockRem('search_struct_grandchild', 'Grandchild');
      await child.setParent(parent);
      await grandchild.setParent(child);

      plugin.search.search.mockResolvedValueOnce([parent]);

      const result = await adapter.search({
        query: 'Parent',
        includeContent: 'structured',
        depth: 2,
      });

      expect(result.results[0].content).toBeUndefined();
      expect(result.results[0].contentProperties).toBeUndefined();
      expect(result.results[0].contentStructured).toEqual([
        {
          remId: 'search_struct_child',
          title: 'Child',
          headline: 'Child',
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
        includeContent: 'structured',
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
        includeContent: 'markdown',
      });

      const item = result.results[0];
      expect(item.content).toContain('Child');
      expect(item.content).not.toContain('Grandchild');
    });

    it('should not include content when includeContent is none', async () => {
      const result = await adapter.search({
        query: 'note',
        includeContent: 'none',
      });

      expect(result.results[0].content).toBeUndefined();
      expect(result.results[0].contentStructured).toBeUndefined();
      expect(result.results[0].contentProperties).toBeUndefined();
    });

    it('should default includeContent to none for search', async () => {
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
        await plugin.rem.findOne('rem_1'),
        await plugin.rem.findOne('rem_2'),
        dup, // duplicate rem_1
        await plugin.rem.findOne('rem_3'),
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
        expect.objectContaining({ numResults: 100 })
      );
    });

    it('should oversample search requests by 2x before dedupe', async () => {
      await adapter.search({ query: 'test', limit: 7 });

      expect(plugin.search.search).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({ numResults: 14 })
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

    it('should reject unsupported search includeContent mode', async () => {
      await expect(
        adapter.search({ query: 'note', includeContent: 'weird' as 'none' })
      ).rejects.toThrow('Invalid includeContent for search');
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

    it('should omit aliases when empty', async () => {
      const result = await adapter.search({ query: 'note' });
      expect(result.results[0].aliases).toBeUndefined();
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
        includeContent: 'markdown',
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
        includeContent: 'structured',
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
        includeContent: 'markdown',
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
        includeContent: 'markdown',
        depth: 1,
      });

      expect(result.results[0].content).toBe('- Visible child\n');
      expect(result.results[0].content).not.toContain('- \n');
    });
  });

  describe('searchByTag', () => {
    it('should return nearest document ancestor for tagged rems', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_daily', 'daily', 'daily');
      const doc = plugin.addTestRem('doc_parent', 'Parent Document');
      doc.setIsDocumentMock(true);
      const child = new MockRem('tagged_child_doc', 'Tagged child');
      await child.setParent(doc);
      tag.setTaggedRemsMock([child]);

      const result = await adapter.searchByTag({ tag: 'daily' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('doc_parent');
      expect(result.results[0].title).toBe('Parent Document');
    });

    it('should fallback to nearest non-document ancestor when no document exists', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_task', 'task', 'task');
      const parent = plugin.addTestRem('non_doc_parent', 'Grouping Parent');
      const child = new MockRem('tagged_child_non_doc', 'Tagged child');
      await child.setParent(parent);
      tag.setTaggedRemsMock([child]);

      const result = await adapter.searchByTag({ tag: 'task' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('non_doc_parent');
      expect(result.results[0].title).toBe('Grouping Parent');
    });

    it('should deduplicate resolved ancestors', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_dedupe', 'dedupe', 'dedupe');
      const parent = plugin.addTestRem('dedupe_parent', 'Shared Parent');
      const childA = new MockRem('tagged_child_a', 'Tagged child A');
      const childB = new MockRem('tagged_child_b', 'Tagged child B');
      await childA.setParent(parent);
      await childB.setParent(parent);
      tag.setTaggedRemsMock([childA, childB]);

      const result = await adapter.searchByTag({ tag: 'dedupe' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('dedupe_parent');
    });

    it('should support hash-prefixed tag lookup', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_hash', 'daily', 'daily');
      const note = plugin.addTestRem('hash_target', 'Hash Target');
      tag.setTaggedRemsMock([note]);

      const result = await adapter.searchByTag({ tag: '#daily' });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].remId).toBe('hash_target');
    });

    it('should support search content rendering modes', async () => {
      plugin.clearTestData();
      const tag = plugin.addTestRem('tag_mode', 'mode', 'mode');
      const parent = plugin.addTestRem('mode_parent', 'Mode Parent');
      const child = new MockRem('mode_child', 'Mode Child');
      await child.setParent(parent);
      tag.setTaggedRemsMock([child]);

      const markdown = await adapter.searchByTag({ tag: 'mode', includeContent: 'markdown' });
      expect(markdown.results[0].content).toBeDefined();
      expect(markdown.results[0].content).toContain('Mode Child');
      expect(markdown.results[0].contentProperties).toBeDefined();

      const structured = await adapter.searchByTag({ tag: 'mode', includeContent: 'structured' });
      expect(structured.results[0].contentStructured).toEqual([
        {
          remId: 'mode_child',
          title: 'Mode Child',
          headline: 'Mode Child',
          remType: 'text',
        },
      ]);
      expect(structured.results[0].content).toBeUndefined();

      const none = await adapter.searchByTag({ tag: 'mode', includeContent: 'none' });
      expect(none.results[0].content).toBeUndefined();
      expect(none.results[0].contentStructured).toBeUndefined();
    });

    it('should return empty results when tag is not found', async () => {
      plugin.clearTestData();
      const result = await adapter.searchByTag({ tag: 'missing-tag' });
      expect(result.results).toEqual([]);
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

    it('should default includeContent to markdown for readNote', async () => {
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

    it('should omit content when includeContent is none', async () => {
      plugin.addTestRem('no_content', 'Note');

      const result = await adapter.readNote({
        remId: 'no_content',
        includeContent: 'none',
      });

      expect(result.content).toBeUndefined();
      expect(result.contentProperties).toBeUndefined();
    });

    it('should include structured child content when includeContent is structured', async () => {
      const parent = plugin.addTestRem('read_struct_parent', 'Parent');
      const child = new MockRem('read_struct_child', 'Child');
      const grandchild = new MockRem('read_struct_grandchild', 'Grandchild');
      await child.setParent(parent);
      await grandchild.setParent(child);

      const result = await adapter.readNote({
        remId: 'read_struct_parent',
        includeContent: 'structured',
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

    it('should reject unsupported read_note includeContent mode', async () => {
      plugin.addTestRem('bad_mode_note', 'Note');

      await expect(
        adapter.readNote({ remId: 'bad_mode_note', includeContent: 'invalid-mode' as never })
      ).rejects.toThrow('Invalid includeContent for read_note');
    });

    it('should render children as indented markdown', async () => {
      const parent = plugin.addTestRem('md_test', 'Parent');
      const child = new MockRem('md_child', 'Child line');
      const grandchild = new MockRem('md_grandchild', 'Grandchild line');
      await child.setParent(parent);
      await grandchild.setParent(child);

      const result = await adapter.readNote({ remId: 'md_test' });

      expect(result.content).toBe('- Child line\n  - Grandchild line\n');
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

    it('should omit aliases when none exist', async () => {
      plugin.addTestRem('no_alias', 'No Aliases');

      const result = await adapter.readNote({ remId: 'no_alias' });
      expect(result.aliases).toBeUndefined();
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

    it('should append content as children', async () => {
      const testRem = plugin.addTestRem('append_test', 'Parent');

      const result = await adapter.updateNote({
        remId: 'append_test',
        appendContent: 'New line 1\nNew line 2',
      });

      expect(result.remIds).toHaveLength(2); // 2 new lines
      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(2);
    });

    it('should replace direct children when replaceContent is provided', async () => {
      const testRem = plugin.addTestRem('replace_test', 'Parent');
      const oldChild = new MockRem('old_child', 'Old line');
      await oldChild.setParent(testRem);
      adapter.updateSettings({ acceptReplaceOperation: true });

      const result = await adapter.updateNote({
        remId: 'replace_test',
        replaceContent: 'New line 1\nNew line 2',
      });

      expect(result.remIds).toHaveLength(2);
      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.text?.[0])).toEqual(['New line 1', 'New line 2']);
    });

    it('should clear direct children when replaceContent is empty string', async () => {
      const testRem = plugin.addTestRem('replace_clear_test', 'Parent');
      const oldChild = new MockRem('old_child_clear', 'Old line');
      await oldChild.setParent(testRem);
      adapter.updateSettings({ acceptReplaceOperation: true });

      await adapter.updateNote({
        remId: 'replace_clear_test',
        replaceContent: '',
      });

      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(0);
    });

    it('should reject replace when replace operation is disabled', async () => {
      plugin.addTestRem('replace_disabled_test', 'Parent');
      adapter.updateSettings({ acceptReplaceOperation: false });

      await expect(
        adapter.updateNote({
          remId: 'replace_disabled_test',
          replaceContent: 'Should fail',
        })
      ).rejects.toThrow('Replace operation is disabled in Automation Bridge settings');
    });

    it('should reject requests that include both appendContent and replaceContent', async () => {
      plugin.addTestRem('append_replace_test', 'Parent');
      adapter.updateSettings({ acceptReplaceOperation: true });

      await expect(
        adapter.updateNote({
          remId: 'append_replace_test',
          appendContent: 'A',
          replaceContent: 'B',
        })
      ).rejects.toThrow('appendContent and replaceContent cannot be used together');
    });

    it('should add tags', async () => {
      const testRem = plugin.addTestRem('tag_test', 'Tagged note');
      plugin.addTestRem('tag_1', 'Tag1', 'Tag1');

      await adapter.updateNote({
        remId: 'tag_test',
        addTags: ['Tag1', 'Tag2'],
      });

      expect(testRem.getTags().length).toBeGreaterThan(0);
    });

    it('should remove tags', async () => {
      const testRem = plugin.addTestRem('remove_tag_test', 'Note');
      const tagRem = plugin.addTestRem('remove_tag', 'RemoveTag', 'RemoveTag');
      await testRem.addTag(tagRem._id);

      await adapter.updateNote({
        remId: 'remove_tag_test',
        removeTags: ['RemoveTag'],
      });

      expect(testRem.getTags()).not.toContain(tagRem._id);
    });

    it('should handle multiple operations at once', async () => {
      const testRem = plugin.addTestRem('multi_update', 'Original');

      const result = await adapter.updateNote({
        remId: 'multi_update',
        title: 'Updated',
        appendContent: '- New content1\n- More content2',
        addTags: ['NewTag'],
      });

      expect(result.remIds).toContain('multi_update');
      expect(testRem.text).toEqual(['Updated']);
      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.text?.[0])).toEqual(['New content1', 'More content2']);
    });

    it('should throw error for non-existent note', async () => {
      await expect(
        adapter.updateNote({
          remId: 'nonexistent',
          title: 'New title',
        })
      ).rejects.toThrow('Note not found: nonexistent');
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
      expect(result.title).toBe('Before Referenced Note after');
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
      expect(result.title).toBe('one Shared two Shared');
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
    it('should create new tag if it does not exist', async () => {
      const testRem = plugin.addTestRem('new_tag_test', 'Note');

      await adapter.updateNote({
        remId: 'new_tag_test',
        addTags: ['BrandNewTag'],
      });

      // Tag should be created and added
      expect(testRem.getTags().length).toBeGreaterThan(0);
    });

    it('should reuse existing tag', async () => {
      const existingTag = plugin.addTestRem('existing_tag', 'ExistingTag', 'ExistingTag');
      const testRem = plugin.addTestRem('reuse_tag_test', 'Note');

      await adapter.updateNote({
        remId: 'reuse_tag_test',
        addTags: ['ExistingTag'],
      });

      expect(testRem.getTags()).toContain(existingTag._id);
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
