/**
 * Settings IDs and defaults for Automation Bridge plugin
 */

import type { ReactRNPlugin } from '@remnote/plugin-sdk';

// Setting IDs
export const SETTING_ACCEPT_WRITE_OPERATIONS = 'automation-bridge-accept-write-operations';
export const SETTING_ACCEPT_REPLACE_OPERATION = 'automation-bridge-accept-replace-operation';
export const SETTING_AUTO_TAG_ENABLED = 'automation-bridge-auto-tag-enabled';
export const SETTING_AUTO_TAG = 'automation-bridge-auto-tag';
export const SETTING_JOURNAL_PREFIX = 'automation-bridge-journal-prefix';
export const SETTING_JOURNAL_TIMESTAMP = 'automation-bridge-journal-timestamp';
export const SETTING_WS_URL = 'automation-bridge-ws-url';
export const SETTING_DEFAULT_PARENT = 'automation-bridge-default-parent';

// Default values
export const DEFAULT_ACCEPT_WRITE_OPERATIONS = true;
export const DEFAULT_ACCEPT_REPLACE_OPERATION = false;
export const DEFAULT_AUTO_TAG = '';
export const DEFAULT_JOURNAL_PREFIX = '';
export const DEFAULT_WS_URL = 'ws://127.0.0.1:3002';

// Settings interface for type safety
export interface AutomationBridgeSettings {
  acceptWriteOperations: boolean;
  acceptReplaceOperation: boolean;
  autoTagEnabled: boolean;
  autoTag: string;
  journalPrefix: string;
  journalTimestamp: boolean;
  wsUrl: string;
  defaultParentId: string;
}

export function getDefaultAutomationBridgeSettings(): AutomationBridgeSettings {
  return {
    acceptWriteOperations: DEFAULT_ACCEPT_WRITE_OPERATIONS,
    acceptReplaceOperation: DEFAULT_ACCEPT_REPLACE_OPERATION,
    autoTagEnabled: true,
    autoTag: DEFAULT_AUTO_TAG,
    journalPrefix: DEFAULT_JOURNAL_PREFIX,
    journalTimestamp: true,
    wsUrl: DEFAULT_WS_URL,
    defaultParentId: '',
  };
}

export async function readAutomationBridgeSettings(
  plugin: Pick<ReactRNPlugin, 'settings'>
): Promise<AutomationBridgeSettings> {
  const defaults = getDefaultAutomationBridgeSettings();

  const [
    acceptWriteOperations,
    acceptReplaceOperation,
    autoTagEnabled,
    autoTag,
    journalPrefix,
    journalTimestamp,
    wsUrl,
    defaultParentId,
  ] = await Promise.all([
    plugin.settings.getSetting<boolean>(SETTING_ACCEPT_WRITE_OPERATIONS),
    plugin.settings.getSetting<boolean>(SETTING_ACCEPT_REPLACE_OPERATION),
    plugin.settings.getSetting<boolean>(SETTING_AUTO_TAG_ENABLED),
    plugin.settings.getSetting<string>(SETTING_AUTO_TAG),
    plugin.settings.getSetting<string>(SETTING_JOURNAL_PREFIX),
    plugin.settings.getSetting<boolean>(SETTING_JOURNAL_TIMESTAMP),
    plugin.settings.getSetting<string>(SETTING_WS_URL),
    plugin.settings.getSetting<string>(SETTING_DEFAULT_PARENT),
  ]);

  return {
    acceptWriteOperations:
      typeof acceptWriteOperations === 'boolean'
        ? acceptWriteOperations
        : defaults.acceptWriteOperations,
    acceptReplaceOperation:
      typeof acceptReplaceOperation === 'boolean'
        ? acceptReplaceOperation
        : defaults.acceptReplaceOperation,
    autoTagEnabled: typeof autoTagEnabled === 'boolean' ? autoTagEnabled : defaults.autoTagEnabled,
    autoTag: typeof autoTag === 'string' ? autoTag : defaults.autoTag,
    journalPrefix: typeof journalPrefix === 'string' ? journalPrefix : defaults.journalPrefix,
    journalTimestamp:
      typeof journalTimestamp === 'boolean' ? journalTimestamp : defaults.journalTimestamp,
    wsUrl: typeof wsUrl === 'string' && wsUrl.trim() ? wsUrl : defaults.wsUrl,
    defaultParentId:
      typeof defaultParentId === 'string' ? defaultParentId : defaults.defaultParentId,
  };
}
