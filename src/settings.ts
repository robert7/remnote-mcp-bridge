/**
 * Settings IDs and defaults for Automation Bridge plugin
 */

// Setting IDs
export const SETTING_AUTO_TAG_ENABLED = 'mcp-auto-tag-enabled';
export const SETTING_AUTO_TAG = 'mcp-auto-tag';
export const SETTING_JOURNAL_PREFIX = 'mcp-journal-prefix';
export const SETTING_JOURNAL_TIMESTAMP = 'mcp-journal-timestamp';
export const SETTING_WS_URL = 'mcp-ws-url';
export const SETTING_DEFAULT_PARENT = 'mcp-default-parent';

// Default values
export const DEFAULT_AUTO_TAG = 'MCP';
export const DEFAULT_JOURNAL_PREFIX = '';
export const DEFAULT_WS_URL = 'ws://127.0.0.1:3002';

// Settings interface for type safety
export interface MCPSettings {
  autoTagEnabled: boolean;
  autoTag: string;
  journalPrefix: string;
  journalTimestamp: boolean;
  wsUrl: string;
  defaultParentId: string;
}
