/**
 * RemNote Automation Bridge Plugin
 *
 * Entry point for the RemNote plugin that connects to automation bridge consumers.
 * This file only registers the widget - the actual widget is in mcp_bridge.tsx
 */

import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import { withLogPrefix } from '../logging';
import { initializeBridgeRuntime, shutdownBridgeRuntime } from '../bridge/runtime';
import {
  SETTING_ACCEPT_WRITE_OPERATIONS,
  SETTING_ACCEPT_REPLACE_OPERATION,
  SETTING_AUTO_TAG_ENABLED,
  SETTING_AUTO_TAG,
  SETTING_JOURNAL_PREFIX,
  SETTING_JOURNAL_TIMESTAMP,
  SETTING_WS_URL,
  SETTING_DEFAULT_PARENT,
  DEFAULT_ACCEPT_WRITE_OPERATIONS,
  DEFAULT_ACCEPT_REPLACE_OPERATION,
  DEFAULT_AUTO_TAG,
  DEFAULT_JOURNAL_PREFIX,
  DEFAULT_WS_URL,
} from '../settings';

export async function activateAutomationBridge(plugin: ReactRNPlugin) {
  console.log(withLogPrefix('Plugin activating...'));

  // Register settings
  await plugin.settings.registerBooleanSetting({
    id: SETTING_ACCEPT_WRITE_OPERATIONS,
    title: 'Accept write operations',
    description: 'Allow create, journal, and update operations from bridge consumers',
    defaultValue: DEFAULT_ACCEPT_WRITE_OPERATIONS,
  });

  await plugin.settings.registerBooleanSetting({
    id: SETTING_ACCEPT_REPLACE_OPERATION,
    title: 'Accept replace operation',
    description: 'Allow update replace operations that overwrite direct child bullets',
    defaultValue: DEFAULT_ACCEPT_REPLACE_OPERATION,
  });

  await plugin.settings.registerBooleanSetting({
    id: SETTING_AUTO_TAG_ENABLED,
    title: 'Auto-tag created notes',
    description: 'Automatically add a tag to notes created via the automation bridge',
    defaultValue: true,
  });

  await plugin.settings.registerStringSetting({
    id: SETTING_AUTO_TAG,
    title: 'Auto-tag name',
    description: 'Tag name to add to bridge-created notes (leave empty to disable default tag)',
    defaultValue: DEFAULT_AUTO_TAG,
  });

  await plugin.settings.registerStringSetting({
    id: SETTING_JOURNAL_PREFIX,
    title: 'Journal entry prefix',
    description: 'Optional prefix for journal entries',
    defaultValue: DEFAULT_JOURNAL_PREFIX,
  });

  await plugin.settings.registerBooleanSetting({
    id: SETTING_JOURNAL_TIMESTAMP,
    title: 'Add timestamp to journal',
    description: 'Include timestamp in journal entries',
    defaultValue: true,
  });

  await plugin.settings.registerStringSetting({
    id: SETTING_WS_URL,
    title: 'WebSocket server URL',
    description: 'URL of the automation bridge WebSocket server',
    defaultValue: DEFAULT_WS_URL,
  });

  await plugin.settings.registerStringSetting({
    id: SETTING_DEFAULT_PARENT,
    title: 'Default parent Rem ID',
    description: 'ID of the Rem to use as default parent for new notes (leave empty for root)',
    defaultValue: '',
  });

  console.log(withLogPrefix('Settings registered'));

  await initializeBridgeRuntime(plugin);
  console.log(withLogPrefix('Bridge runtime initialized'));

  // Register automation bridge widget in popup
  // NOT needed anymore, but kept here for reference, in case the sidebar implementation doesn't work
  // and we need to revert to the popup implementation
  // await plugin.app.registerWidget('mcp_bridge', WidgetLocation.Popup, {
  //   dimensions: {
  //     height: 'auto',
  //     width: '600px',
  //   },
  // });

  // Register automation bridge widget in right sidebar
  await plugin.app.registerWidget('mcp_bridge', WidgetLocation.RightSidebar, {
    widgetTabIcon: `${plugin.rootURL}mcp-icon.svg`,
  });

  // // Register command to open the widget as popup
  // // NOT needed anymore, but kept here for reference, in case we need to revert
  // await plugin.app.registerCommand({
  //   id: 'open-mcp-bridge-popup',
  //   name: 'Open Automation Bridge Control Panel',
  //   action: async () => {
  //     await plugin.app.toast('Opening Automation Bridge Control Panel...');
  //     await plugin.widget.openPopup('mcp_bridge');
  //   },
  // });

  console.log(withLogPrefix('Widget registered in sidebar with icon'));
}

export async function deactivateAutomationBridge(plugin: ReactRNPlugin) {
  console.log(withLogPrefix('Plugin deactivating...'));
  shutdownBridgeRuntime();
  await plugin.app.unregisterWidget('mcp_bridge', WidgetLocation.RightSidebar);
}

declareIndexPlugin(activateAutomationBridge, deactivateAutomationBridge);
