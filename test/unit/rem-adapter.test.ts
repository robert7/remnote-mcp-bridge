/**
 * Tests for RemNote API Adapter
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
      expect(result.results[0].preview).toContain('First note');
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
