/**
 * Tests for Settings
 */
import { describe, it, expect } from 'vitest';
import {
  SETTING_AUTO_TAG_ENABLED,
  SETTING_AUTO_TAG,
  SETTING_JOURNAL_PREFIX,
  SETTING_JOURNAL_TIMESTAMP,
  SETTING_WS_URL,
  SETTING_DEFAULT_PARENT,
  DEFAULT_AUTO_TAG,
  DEFAULT_JOURNAL_PREFIX,
  DEFAULT_WS_URL,
  MCPSettings,
} from '../../src/settings';

describe('Settings', () => {
  describe('Setting IDs', () => {
    it('should have unique setting IDs', () => {
      const ids = [
        SETTING_AUTO_TAG_ENABLED,
        SETTING_AUTO_TAG,
        SETTING_JOURNAL_PREFIX,
        SETTING_JOURNAL_TIMESTAMP,
        SETTING_WS_URL,
        SETTING_DEFAULT_PARENT,
      ];

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have correct setting ID values', () => {
      expect(SETTING_AUTO_TAG_ENABLED).toBe('mcp-auto-tag-enabled');
      expect(SETTING_AUTO_TAG).toBe('mcp-auto-tag');
      expect(SETTING_JOURNAL_PREFIX).toBe('mcp-journal-prefix');
      expect(SETTING_JOURNAL_TIMESTAMP).toBe('mcp-journal-timestamp');
      expect(SETTING_WS_URL).toBe('mcp-ws-url');
      expect(SETTING_DEFAULT_PARENT).toBe('mcp-default-parent');
    });
  });

  describe('Default values', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_AUTO_TAG).toBe('MCP');
      expect(DEFAULT_JOURNAL_PREFIX).toBe('[Claude]');
      expect(DEFAULT_WS_URL).toBe('ws://127.0.0.1:3002');
    });

    it('should have non-empty default values', () => {
      expect(DEFAULT_AUTO_TAG).toBeTruthy();
      expect(DEFAULT_JOURNAL_PREFIX).toBeTruthy();
      expect(DEFAULT_WS_URL).toBeTruthy();
    });

    it('should have valid WebSocket URL format', () => {
      expect(DEFAULT_WS_URL).toMatch(/^wss?:\/\//);
    });
  });

  describe('MCPSettings interface', () => {
    it('should accept valid settings object', () => {
      const settings: MCPSettings = {
        autoTagEnabled: true,
        autoTag: 'MCP',
        journalPrefix: '[Claude]',
        journalTimestamp: true,
        wsUrl: 'ws://127.0.0.1:3002',
        defaultParentId: '',
      };

      expect(settings.autoTagEnabled).toBe(true);
      expect(settings.autoTag).toBe('MCP');
      expect(settings.journalPrefix).toBe('[Claude]');
      expect(settings.journalTimestamp).toBe(true);
      expect(settings.wsUrl).toBe('ws://127.0.0.1:3002');
      expect(settings.defaultParentId).toBe('');
    });

    it('should have all required properties', () => {
      const settings: MCPSettings = {
        autoTagEnabled: false,
        autoTag: '',
        journalPrefix: '',
        journalTimestamp: false,
        wsUrl: '',
        defaultParentId: '',
      };

      expect(settings).toHaveProperty('autoTagEnabled');
      expect(settings).toHaveProperty('autoTag');
      expect(settings).toHaveProperty('journalPrefix');
      expect(settings).toHaveProperty('journalTimestamp');
      expect(settings).toHaveProperty('wsUrl');
      expect(settings).toHaveProperty('defaultParentId');
    });

    it('should support custom values', () => {
      const settings: MCPSettings = {
        autoTagEnabled: false,
        autoTag: 'CustomTag',
        journalPrefix: '[AI]',
        journalTimestamp: false,
        wsUrl: 'ws://custom.host:9999',
        defaultParentId: 'custom_parent_id',
      };

      expect(settings.autoTag).toBe('CustomTag');
      expect(settings.journalPrefix).toBe('[AI]');
      expect(settings.wsUrl).toBe('ws://custom.host:9999');
      expect(settings.defaultParentId).toBe('custom_parent_id');
    });
  });
});
