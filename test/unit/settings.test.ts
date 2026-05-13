/**
 * Tests for Settings
 */
import { describe, it, expect } from 'vitest';
import {
  SETTING_ACCEPT_WRITE_OPERATIONS,
  SETTING_ACCEPT_REPLACE_OPERATION,
  SETTING_AUTO_TAG_ENABLED,
  SETTING_AUTO_TAG_REM_ID,
  SETTING_JOURNAL_PREFIX,
  SETTING_JOURNAL_TIMESTAMP,
  SETTING_WS_URL,
  SETTING_DEFAULT_PARENT,
  DEFAULT_ACCEPT_WRITE_OPERATIONS,
  DEFAULT_ACCEPT_REPLACE_OPERATION,
  DEFAULT_AUTO_TAG_REM_ID,
  DEFAULT_JOURNAL_PREFIX,
  DEFAULT_WS_URL,
  AutomationBridgeSettings,
  getDefaultAutomationBridgeSettings,
  readAutomationBridgeSettings,
} from '../../src/settings';
import { MockRemNotePlugin } from '../helpers/mocks';

describe('Settings', () => {
  describe('Setting IDs', () => {
    it('should have unique setting IDs', () => {
      const ids = [
        SETTING_ACCEPT_WRITE_OPERATIONS,
        SETTING_ACCEPT_REPLACE_OPERATION,
        SETTING_AUTO_TAG_ENABLED,
        SETTING_AUTO_TAG_REM_ID,
        SETTING_JOURNAL_PREFIX,
        SETTING_JOURNAL_TIMESTAMP,
        SETTING_WS_URL,
        SETTING_DEFAULT_PARENT,
      ];

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have correct setting ID values', () => {
      expect(SETTING_ACCEPT_WRITE_OPERATIONS).toBe('automation-bridge-accept-write-operations');
      expect(SETTING_ACCEPT_REPLACE_OPERATION).toBe('automation-bridge-accept-replace-operation');
      expect(SETTING_AUTO_TAG_ENABLED).toBe('automation-bridge-auto-tag-enabled');
      expect(SETTING_AUTO_TAG_REM_ID).toBe('automation-bridge-auto-tag-rem-id');
      expect(SETTING_JOURNAL_PREFIX).toBe('automation-bridge-journal-prefix');
      expect(SETTING_JOURNAL_TIMESTAMP).toBe('automation-bridge-journal-timestamp');
      expect(SETTING_WS_URL).toBe('automation-bridge-ws-url');
      expect(SETTING_DEFAULT_PARENT).toBe('automation-bridge-default-parent');
    });
  });

  describe('Default values', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_ACCEPT_WRITE_OPERATIONS).toBe(true);
      expect(DEFAULT_ACCEPT_REPLACE_OPERATION).toBe(false);
      expect(DEFAULT_AUTO_TAG_REM_ID).toBe('');
      expect(DEFAULT_JOURNAL_PREFIX).toBe('');
      expect(DEFAULT_WS_URL).toBe('ws://127.0.0.1:3002');
    });

    it('should have non-empty required default values', () => {
      expect(DEFAULT_WS_URL).toBeTruthy();
    });

    it('should have valid WebSocket URL format', () => {
      expect(DEFAULT_WS_URL).toMatch(/^wss?:\/\//);
    });
  });

  describe('AutomationBridgeSettings interface', () => {
    it('should accept valid settings object', () => {
      const settings: AutomationBridgeSettings = {
        acceptWriteOperations: true,
        acceptReplaceOperation: false,
        autoTagEnabled: true,
        autoTagRemId: '',
        journalPrefix: '',
        journalTimestamp: true,
        wsUrl: 'ws://127.0.0.1:3002',
        defaultParentId: '',
      };

      expect(settings.acceptWriteOperations).toBe(true);
      expect(settings.acceptReplaceOperation).toBe(false);
      expect(settings.autoTagEnabled).toBe(true);
      expect(settings.autoTagRemId).toBe('');
      expect(settings.journalPrefix).toBe('');
      expect(settings.journalTimestamp).toBe(true);
      expect(settings.wsUrl).toBe('ws://127.0.0.1:3002');
      expect(settings.defaultParentId).toBe('');
    });

    it('should have all required properties', () => {
      const settings: AutomationBridgeSettings = {
        acceptWriteOperations: false,
        acceptReplaceOperation: false,
        autoTagEnabled: false,
        autoTagRemId: '',
        journalPrefix: '',
        journalTimestamp: false,
        wsUrl: '',
        defaultParentId: '',
      };

      expect(settings).toHaveProperty('acceptWriteOperations');
      expect(settings).toHaveProperty('acceptReplaceOperation');
      expect(settings).toHaveProperty('autoTagEnabled');
      expect(settings).toHaveProperty('autoTagRemId');
      expect(settings).toHaveProperty('journalPrefix');
      expect(settings).toHaveProperty('journalTimestamp');
      expect(settings).toHaveProperty('wsUrl');
      expect(settings).toHaveProperty('defaultParentId');
    });

    it('should support custom values', () => {
      const settings: AutomationBridgeSettings = {
        acceptWriteOperations: false,
        acceptReplaceOperation: true,
        autoTagEnabled: false,
        autoTagRemId: 'custom_tag_rem_id',
        journalPrefix: '[AI]',
        journalTimestamp: false,
        wsUrl: 'ws://custom.host:9999',
        defaultParentId: 'custom_parent_id',
      };

      expect(settings.acceptWriteOperations).toBe(false);
      expect(settings.acceptReplaceOperation).toBe(true);
      expect(settings.autoTagRemId).toBe('custom_tag_rem_id');
      expect(settings.journalPrefix).toBe('[AI]');
      expect(settings.wsUrl).toBe('ws://custom.host:9999');
      expect(settings.defaultParentId).toBe('custom_parent_id');
    });
  });

  describe('Settings helpers', () => {
    it('should build the default settings object', () => {
      expect(getDefaultAutomationBridgeSettings()).toEqual({
        acceptWriteOperations: true,
        acceptReplaceOperation: false,
        autoTagEnabled: true,
        autoTagRemId: '',
        journalPrefix: '',
        journalTimestamp: true,
        wsUrl: 'ws://127.0.0.1:3002',
        defaultParentId: '',
      });
    });

    it('should read persisted settings from the plugin', async () => {
      const plugin = new MockRemNotePlugin();
      plugin.setTestSetting(SETTING_ACCEPT_WRITE_OPERATIONS, false);
      plugin.setTestSetting(SETTING_ACCEPT_REPLACE_OPERATION, true);
      plugin.setTestSetting(SETTING_AUTO_TAG_ENABLED, false);
      plugin.setTestSetting(SETTING_AUTO_TAG_REM_ID, 'robot-tag-rem-id');
      plugin.setTestSetting(SETTING_JOURNAL_PREFIX, '[AI]');
      plugin.setTestSetting(SETTING_JOURNAL_TIMESTAMP, false);
      plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:4555');
      plugin.setTestSetting(SETTING_DEFAULT_PARENT, 'parent-123');

      const settings = await readAutomationBridgeSettings(plugin as unknown as never);

      expect(settings).toEqual({
        acceptWriteOperations: false,
        acceptReplaceOperation: true,
        autoTagEnabled: false,
        autoTagRemId: 'robot-tag-rem-id',
        journalPrefix: '[AI]',
        journalTimestamp: false,
        wsUrl: 'ws://127.0.0.1:4555',
        defaultParentId: 'parent-123',
      });
    });
  });
});
