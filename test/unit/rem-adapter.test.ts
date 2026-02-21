/**
 * Tests for RemNote API Adapter
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { RemType, BuiltInPowerupCodes } from '@remnote/plugin-sdk';
import { RemAdapter } from '../../src/api/rem-adapter';
import { MockRemNotePlugin, MockRem } from '../helpers/mocks';

describe('RemAdapter', () => {
  let plugin: MockRemNotePlugin;
  let adapter: RemAdapter;

  beforeEach(() => {
    plugin = new MockRemNotePlugin();
    adapter = new RemAdapter(plugin as unknown as typeof plugin, {
      autoTagEnabled: true,
      autoTag: 'MCP',
      journalPrefix: '',
      journalTimestamp: true,
      wsUrl: 'ws://localhost:3002',
      defaultParentId: '',
    });
  });

  describe('Settings management', () => {
    it('should initialize with default settings', () => {
      const settings = adapter.getSettings();
      expect(settings.autoTagEnabled).toBe(true);
      expect(settings.autoTag).toBe('MCP');
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
    it('should create a basic note', async () => {
      const result = await adapter.createNote({
        title: 'Test Note',
      });

      expect(result.remId).toBeDefined();
      expect(result.title).toBe('Test Note');
      expect(plugin.rem.createRem).toHaveBeenCalled();
    });

    it('should create a note with content', async () => {
      const result = await adapter.createNote({
        title: 'Test Note',
        content: 'Line 1\nLine 2\nLine 3',
      });

      expect(result.remId).toBeDefined();

      const rem = await plugin.rem.findOne(result.remId);
      expect(rem).toBeDefined();

      const children = await rem!.getChildrenRem();
      expect(children).toHaveLength(3);
    });

    it('should create a note with parent', async () => {
      plugin.addTestRem('parent_1', 'Parent');

      const result = await adapter.createNote({
        title: 'Child Note',
        parentId: 'parent_1',
      });

      const childRem = await plugin.rem.findOne(result.remId);
      expect(childRem).toBeDefined();
    });

    it('should add custom tags', async () => {
      const result = await adapter.createNote({
        title: 'Tagged Note',
        tags: ['tag1', 'tag2'],
      });

      const rem = await plugin.rem.findOne(result.remId);
      expect(rem).toBeDefined();
      // Tags should have been added (auto-tag + custom tags)
      expect(rem!.getTags().length).toBeGreaterThan(0);
    });

    it('should add auto-tag when enabled', async () => {
      adapter.updateSettings({ autoTagEnabled: true, autoTag: 'AutoTag' });

      const result = await adapter.createNote({
        title: 'Auto Tagged Note',
      });

      const rem = await plugin.rem.findOne(result.remId);
      expect(rem).toBeDefined();
      expect(rem!.getTags().length).toBeGreaterThan(0);
    });

    it('should not add auto-tag when disabled', async () => {
      adapter.updateSettings({ autoTagEnabled: false });

      const result = await adapter.createNote({
        title: 'Untagged Note',
        tags: [],
      });

      const rem = await plugin.rem.findOne(result.remId);
      expect(rem).toBeDefined();
      expect(rem!.getTags()).toHaveLength(0);
    });

    it('should use default parent from settings', async () => {
      plugin.addTestRem('default_parent', 'Default Parent');
      adapter.updateSettings({ defaultParentId: 'default_parent' });

      const result = await adapter.createNote({
        title: 'Note with default parent',
      });

      expect(result.remId).toBeDefined();
    });

    it('should skip empty content lines', async () => {
      const result = await adapter.createNote({
        title: 'Test',
        content: 'Line 1\n\n\nLine 2\n  \n',
      });

      const rem = await plugin.rem.findOne(result.remId);
      const children = await rem!.getChildrenRem();
      expect(children).toHaveLength(2);
    });
  });

  describe('appendJournal', () => {
    it('should append to daily document with timestamp', async () => {
      const result = await adapter.appendJournal({
        content: 'Journal entry',
        timestamp: true,
      });

      expect(result.remId).toBeDefined();
      expect(result.content).toContain('Journal entry');
      expect(result.content).toMatch(/^\[\d{1,2}:\d{2}:\d{2}/); // No leading space when prefix is empty
      expect(result.content).toMatch(/\[\d{1,2}:\d{2}:\d{2}/); // Timestamp pattern
    });

    it('should append without timestamp when disabled', async () => {
      const result = await adapter.appendJournal({
        content: 'No timestamp entry',
        timestamp: false,
      });

      expect(result.content).toBe('No timestamp entry');
      expect(result.content).not.toMatch(/\[\d{1,2}:\d{2}:\d{2}/);
    });

    it('should use settings for timestamp default', async () => {
      adapter.updateSettings({ journalTimestamp: false });

      const result = await adapter.appendJournal({
        content: 'Entry with setting default',
      });

      expect(result.content).not.toMatch(/\[\d{1,2}:\d{2}:\d{2}/);
    });

    it('should use custom journal prefix', async () => {
      adapter.updateSettings({ journalPrefix: '[AI]' });

      const result = await adapter.appendJournal({
        content: 'Custom prefix entry',
      });

      expect(result.content).toContain('[AI]');
      expect(result.content).not.toMatch(/^ /);
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

    it('should include content when requested', async () => {
      const parentRem = plugin.addTestRem('parent_search', 'Parent');
      const childRem = new MockRem('child_search', 'Child content');
      await childRem.setParent(parentRem);

      const result = await adapter.search({
        query: 'Parent',
        includeContent: true,
      });

      const parentResult = result.results.find((r) => r.remId === 'parent_search');
      if (parentResult) {
        expect(parentResult.content).toBeDefined();
      }
    });

    it('should not include content when not requested', async () => {
      const result = await adapter.search({
        query: 'note',
        includeContent: false,
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
        expect.objectContaining({ numResults: 50 })
      );
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
  });

  describe('readNote', () => {
    it('should read a note by ID', async () => {
      plugin.addTestRem('read_test', 'Test content');

      const result = await adapter.readNote({
        remId: 'read_test',
      });

      expect(result.remId).toBe('read_test');
      expect(result.title).toBe('Test content');
      expect(result.content).toBe('Test content');
    });

    it('should throw error for non-existent note', async () => {
      await expect(adapter.readNote({ remId: 'nonexistent' })).rejects.toThrow(
        'Note not found: nonexistent'
      );
    });

    it('should read children with default depth', async () => {
      const parent = plugin.addTestRem('parent_read', 'Parent');
      const child = new MockRem('child_read', 'Child');
      await child.setParent(parent);

      const result = await adapter.readNote({
        remId: 'parent_read',
      });

      expect(result.children).toBeDefined();
      expect(Array.isArray(result.children)).toBe(true);
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

      expect(shallowResult.children).toHaveLength(1);
      expect(shallowResult.children[0].children).toHaveLength(0);

      const deepResult = await adapter.readNote({
        remId: 'depth_test',
        depth: 2,
      });

      expect(deepResult.children).toHaveLength(1);
      expect(deepResult.children[0].children).toHaveLength(1);
    });

    it('should handle notes with no children', async () => {
      plugin.addTestRem('no_children', 'Leaf note');

      const result = await adapter.readNote({
        remId: 'no_children',
      });

      expect(result.children).toHaveLength(0);
    });
  });

  describe('updateNote', () => {
    it('should update note title', async () => {
      plugin.addTestRem('update_test', 'Original title');

      const result = await adapter.updateNote({
        remId: 'update_test',
        title: 'New title',
      });

      expect(result.success).toBe(true);
      expect(result.remId).toBe('update_test');

      const updatedRem = await plugin.rem.findOne('update_test');
      expect(updatedRem!.text).toEqual(['New title']);
    });

    it('should append content as children', async () => {
      const testRem = plugin.addTestRem('append_test', 'Parent');

      await adapter.updateNote({
        remId: 'append_test',
        appendContent: 'New line 1\nNew line 2',
      });

      const children = await testRem.getChildrenRem();
      expect(children).toHaveLength(2);
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
        appendContent: 'New content',
        addTags: ['NewTag'],
      });

      expect(result.success).toBe(true);
      expect(testRem.text).toEqual(['Updated']);
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
      const status = await adapter.getStatus();

      expect(status.connected).toBe(true);
      expect(status.pluginVersion).toBeDefined();
      expect(typeof status.pluginVersion).toBe('string');
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
      expect(result.detail).toBe('after');
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

    it('should include detail from backText', async () => {
      const rem = plugin.addTestRem('detail_test', 'Front text');
      rem.backText = ['Back text explanation'];
      rem.setPracticeDirectionMock('forward');

      const result = await adapter.readNote({ remId: 'detail_test' });
      expect(result.title).toBe('Front text');
      expect(result.detail).toBe('Back text explanation');
    });

    it('should split title/detail from delimiter when backText is unavailable', async () => {
      const rem = plugin.addTestRem('delimiter_detail_test', '');
      rem.text = ['Front text', { i: 's' }, 'Fallback detail'] as unknown as string[];

      const result = await adapter.readNote({ remId: 'delimiter_detail_test' });
      expect(result.title).toBe('Front text');
      expect(result.detail).toBe('Fallback detail');
    });

    it('should prefer backText over delimiter right side when both exist', async () => {
      const rem = plugin.addTestRem('prefer_back_text_test', '');
      rem.text = ['Front text', { i: 's' }, 'inline detail'] as unknown as string[];
      rem.backText = ['canonical back detail'];

      const result = await adapter.readNote({ remId: 'prefer_back_text_test' });
      expect(result.title).toBe('Front text');
      expect(result.detail).toBe('canonical back detail');
    });

    it('should omit detail when no backText', async () => {
      plugin.addTestRem('no_detail_test', 'No back text');

      const result = await adapter.readNote({ remId: 'no_detail_test' });
      expect(result.detail).toBeUndefined();
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
      expect(item!.detail).toBe('explanation text');
      expect(item!.remType).toBe('concept');
      expect(item!.cardDirection).toBe('forward');
    });

    it('should split title/detail in search from delimiter fallback', async () => {
      const rem = plugin.addTestRem('search_delim_detail', '');
      rem.text = ['Concept Head', { i: 's' }, 'descriptor detail'] as unknown as string[];

      const result = await adapter.search({ query: 'concept', limit: 10 });
      const item = result.results.find((r) => r.remId === 'search_delim_detail');

      expect(item).toBeDefined();
      expect(item!.title).toBe('Concept Head');
      expect(item!.detail).toBe('descriptor detail');
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
});
