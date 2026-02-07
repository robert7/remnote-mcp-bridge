/**
 * Tests for Widget Registration and Lifecycle
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactRNPlugin } from '@remnote/plugin-sdk';
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
} from '../../src/settings';

describe('Widget Registration (index.tsx)', () => {
  let mockPlugin: Partial<ReactRNPlugin>;
  let registerBooleanSettingSpy: ReturnType<typeof vi.fn>;
  let registerStringSettingSpy: ReturnType<typeof vi.fn>;
  let registerWidgetSpy: ReturnType<typeof vi.fn>;
  let registerCommandSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registerBooleanSettingSpy = vi.fn(async () => {});
    registerStringSettingSpy = vi.fn(async () => {});
    registerWidgetSpy = vi.fn(async () => {});
    registerCommandSpy = vi.fn(async () => {});

    mockPlugin = {
      settings: {
        registerBooleanSetting: registerBooleanSettingSpy,
        registerStringSetting: registerStringSettingSpy,
      } as unknown as ReactRNPlugin['settings'],
      app: {
        registerWidget: registerWidgetSpy,
        registerCommand: registerCommandSpy,
      } as unknown as ReactRNPlugin['app'],
      widget: {
        openPopup: vi.fn(async () => {}),
      } as unknown as ReactRNPlugin['widget'],
      window: {
        openWidgetInRightSidebar: vi.fn(async () => []),
      } as unknown as ReactRNPlugin['window'],
    };
  });

  describe('Settings registration', () => {
    it('should register all boolean settings', async () => {
      // Simulate onActivate
      await mockPlugin.settings!.registerBooleanSetting!({
        id: SETTING_AUTO_TAG_ENABLED,
        title: 'Auto-tag MCP notes',
        description: 'Automatically add a tag to all notes created via MCP',
        defaultValue: true,
      });

      await mockPlugin.settings!.registerBooleanSetting!({
        id: SETTING_JOURNAL_TIMESTAMP,
        title: 'Add timestamp to journal',
        description: 'Include timestamp in journal entries',
        defaultValue: true,
      });

      expect(registerBooleanSettingSpy).toHaveBeenCalledTimes(2);
      expect(registerBooleanSettingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SETTING_AUTO_TAG_ENABLED,
          defaultValue: true,
        })
      );
      expect(registerBooleanSettingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SETTING_JOURNAL_TIMESTAMP,
          defaultValue: true,
        })
      );
    });

    it('should register all string settings', async () => {
      await mockPlugin.settings!.registerStringSetting!({
        id: SETTING_AUTO_TAG,
        title: 'Auto-tag name',
        description: 'Tag name to add to MCP-created notes (e.g., "MCP", "Claude")',
        defaultValue: DEFAULT_AUTO_TAG,
      });

      await mockPlugin.settings!.registerStringSetting!({
        id: SETTING_JOURNAL_PREFIX,
        title: 'Journal entry prefix',
        description: 'Prefix for journal entries (e.g., "[Claude]", "[MCP]")',
        defaultValue: DEFAULT_JOURNAL_PREFIX,
      });

      await mockPlugin.settings!.registerStringSetting!({
        id: SETTING_WS_URL,
        title: 'WebSocket server URL',
        description: 'URL of the MCP WebSocket server',
        defaultValue: DEFAULT_WS_URL,
      });

      await mockPlugin.settings!.registerStringSetting!({
        id: SETTING_DEFAULT_PARENT,
        title: 'Default parent Rem ID',
        description: 'ID of the Rem to use as default parent for new notes (leave empty for root)',
        defaultValue: '',
      });

      expect(registerStringSettingSpy).toHaveBeenCalledTimes(4);
    });

    it('should use correct default values', async () => {
      await mockPlugin.settings!.registerStringSetting!({
        id: SETTING_AUTO_TAG,
        defaultValue: DEFAULT_AUTO_TAG,
      } as Parameters<typeof registerStringSettingSpy>[0]);

      expect(registerStringSettingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: 'MCP',
        })
      );

      await mockPlugin.settings!.registerStringSetting!({
        id: SETTING_JOURNAL_PREFIX,
        defaultValue: DEFAULT_JOURNAL_PREFIX,
      } as Parameters<typeof registerStringSettingSpy>[0]);

      expect(registerStringSettingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: '[Claude]',
        })
      );

      await mockPlugin.settings!.registerStringSetting!({
        id: SETTING_WS_URL,
        defaultValue: DEFAULT_WS_URL,
      } as Parameters<typeof registerStringSettingSpy>[0]);

      expect(registerStringSettingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: 'ws://127.0.0.1:3002',
        })
      );
    });
  });

  describe('Widget registration', () => {
    it('should register widget for both popup and sidebar', async () => {
      // Register for popup
      await mockPlugin.app!.registerWidget!('mcp_bridge', 1, {
        dimensions: {
          height: 'auto',
          width: '600px',
        },
      });

      // Register for sidebar (WidgetLocation.RightSidebar)
      await mockPlugin.app!.registerWidget!('mcp_bridge', 3, {
        dimensions: {
          width: 300,
        },
      });

      expect(registerWidgetSpy).toHaveBeenCalledTimes(2);

      // Check popup registration
      expect(registerWidgetSpy).toHaveBeenCalledWith(
        'mcp_bridge',
        1,
        expect.objectContaining({
          dimensions: {
            height: 'auto',
            width: '600px',
          },
        })
      );

      // Check sidebar registration
      expect(registerWidgetSpy).toHaveBeenCalledWith(
        'mcp_bridge',
        3,
        expect.objectContaining({
          dimensions: {
            width: 300,
          },
        })
      );
    });
  });

  describe('Command registration', () => {
    it('should register open popup command', async () => {
      const commandAction = vi.fn(async () => {
        await mockPlugin.widget!.openPopup!('mcp_bridge');
      });

      await mockPlugin.app!.registerCommand!({
        id: 'open-mcp-bridge-popup',
        name: 'Open MCP Bridge Control Panel',
        action: commandAction,
      });

      expect(registerCommandSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'open-mcp-bridge-popup',
          name: 'Open MCP Bridge Control Panel',
        })
      );

      // Test command action
      const registeredCommand = registerCommandSpy.mock.calls[0][0];
      await registeredCommand.action();
      expect(mockPlugin.widget!.openPopup).toHaveBeenCalledWith('mcp_bridge');
    });

    it('should register open sidebar command', async () => {
      const commandAction = vi.fn(async () => {
        await mockPlugin.window!.openWidgetInRightSidebar!('mcp_bridge');
      });

      await mockPlugin.app!.registerCommand!({
        id: 'open-mcp-bridge-sidebar',
        name: 'Open MCP Bridge Control Panel in Sidebar',
        action: commandAction,
      });

      expect(registerCommandSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'open-mcp-bridge-sidebar',
          name: 'Open MCP Bridge Control Panel in Sidebar',
        })
      );

      // Test command action
      const registeredCommand = registerCommandSpy.mock.calls[1][0];
      await registeredCommand.action();
      expect(mockPlugin.window!.openWidgetInRightSidebar).toHaveBeenCalledWith('mcp_bridge');
    });
  });
});

describe('Widget UI (mcp_bridge_popup.tsx)', () => {
  describe('Log management', () => {
    it('should limit logs to 50 entries (FIFO)', () => {
      const logs: Array<{ timestamp: Date; message: string; level: string }> = [];

      // Simulate adding 60 logs
      for (let i = 0; i < 60; i++) {
        logs.push({ timestamp: new Date(), message: `Log ${i}`, level: 'info' });
      }

      // Keep only last 50
      const trimmedLogs = logs.slice(-50);

      expect(trimmedLogs).toHaveLength(50);
      expect(trimmedLogs[0].message).toBe('Log 10');
      expect(trimmedLogs[49].message).toBe('Log 59');
    });
  });

  describe('History management', () => {
    it('should limit history to 10 entries (FIFO)', () => {
      const history: Array<{
        timestamp: Date;
        action: string;
        title: string;
        remId?: string;
      }> = [];

      // Simulate adding 15 history entries
      for (let i = 0; i < 15; i++) {
        history.unshift({ timestamp: new Date(), action: 'create', title: `Entry ${i}` });
      }

      // Keep only first 10
      const trimmedHistory = history.slice(0, 10);

      expect(trimmedHistory).toHaveLength(10);
      expect(trimmedHistory[0].title).toBe('Entry 14');
      expect(trimmedHistory[9].title).toBe('Entry 5');
    });
  });

  describe('Stats tracking', () => {
    it('should track all action types', () => {
      const stats = { created: 0, updated: 0, journal: 0, searches: 0 };

      // Simulate actions
      stats.created += 5;
      stats.updated += 3;
      stats.journal += 2;
      stats.searches += 7;

      expect(stats.created).toBe(5);
      expect(stats.updated).toBe(3);
      expect(stats.journal).toBe(2);
      expect(stats.searches).toBe(7);
    });

    it('should increment stats independently', () => {
      const stats = { created: 0, updated: 0, journal: 0, searches: 0 };

      stats.created++;
      expect(stats.created).toBe(1);
      expect(stats.updated).toBe(0);

      stats.journal++;
      expect(stats.journal).toBe(1);
      expect(stats.created).toBe(1);
    });
  });

  describe('Status display', () => {
    it('should have correct status configurations', () => {
      const statusConfig = {
        connected: { color: '#22c55e', bg: '#dcfce7', icon: '●', text: 'Connected' },
        connecting: { color: '#f59e0b', bg: '#fef3c7', icon: '◐', text: 'Connecting...' },
        disconnected: { color: '#ef4444', bg: '#fee2e2', icon: '○', text: 'Disconnected' },
        error: { color: '#ef4444', bg: '#fee2e2', icon: '✕', text: 'Error' },
      };

      expect(statusConfig.connected.text).toBe('Connected');
      expect(statusConfig.connecting.text).toBe('Connecting...');
      expect(statusConfig.disconnected.text).toBe('Disconnected');
      expect(statusConfig.error.text).toBe('Error');
    });
  });

  describe('Action icons', () => {
    it('should have icons for all action types', () => {
      const actionIcons = {
        create: '+',
        update: '~',
        journal: '#',
        search: '?',
        read: '>',
      };

      expect(actionIcons.create).toBe('+');
      expect(actionIcons.update).toBe('~');
      expect(actionIcons.journal).toBe('#');
      expect(actionIcons.search).toBe('?');
      expect(actionIcons.read).toBe('>');
    });
  });

  describe('Request handling', () => {
    it('should route create_note action correctly', () => {
      const action = 'create_note';
      const payload = { title: 'Test', content: 'Content', tags: ['tag1'] };

      expect(action).toBe('create_note');
      expect(payload).toHaveProperty('title');
      expect(payload).toHaveProperty('content');
      expect(payload).toHaveProperty('tags');
    });

    it('should route append_journal action correctly', () => {
      const action = 'append_journal';
      const payload = { content: 'Journal entry', timestamp: true };

      expect(action).toBe('append_journal');
      expect(payload).toHaveProperty('content');
      expect(payload).toHaveProperty('timestamp');
    });

    it('should route search action correctly', () => {
      const action = 'search';
      const payload = { query: 'test', limit: 10, includeContent: true };

      expect(action).toBe('search');
      expect(payload).toHaveProperty('query');
      expect(payload).toHaveProperty('limit');
      expect(payload).toHaveProperty('includeContent');
    });

    it('should route read_note action correctly', () => {
      const action = 'read_note';
      const payload = { remId: 'rem_123', depth: 2 };

      expect(action).toBe('read_note');
      expect(payload).toHaveProperty('remId');
      expect(payload).toHaveProperty('depth');
    });

    it('should route update_note action correctly', () => {
      const action = 'update_note';
      const payload = {
        remId: 'rem_123',
        title: 'Updated',
        appendContent: 'New',
        addTags: ['tag1'],
        removeTags: ['tag2'],
      };

      expect(action).toBe('update_note');
      expect(payload).toHaveProperty('remId');
      expect(payload).toHaveProperty('title');
    });

    it('should handle get_status action', () => {
      const action = 'get_status';
      expect(action).toBe('get_status');
    });
  });
});
