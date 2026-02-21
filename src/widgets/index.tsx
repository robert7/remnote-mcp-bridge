/**
 * RemNote MCP Bridge Plugin
 *
 * Entry point for the RemNote plugin that connects to the MCP server.
 * This file only registers the widget - the actual widget is in mcp_bridge.tsx
 */

import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import { withLogPrefix } from '../logging';
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
} from '../settings';

async function onActivate(plugin: ReactRNPlugin) {
  console.log(withLogPrefix('Plugin activating...'));

  // Register settings
  await plugin.settings.registerBooleanSetting({
    id: SETTING_AUTO_TAG_ENABLED,
    title: 'Auto-tag MCP notes',
    description: 'Automatically add a tag to all notes created via MCP',
    defaultValue: true,
  });

  await plugin.settings.registerStringSetting({
    id: SETTING_AUTO_TAG,
    title: 'Auto-tag name',
    description: 'Tag name to add to MCP-created notes (e.g., "MCP", "Claude")',
    defaultValue: DEFAULT_AUTO_TAG,
  });

  await plugin.settings.registerStringSetting({
    id: SETTING_JOURNAL_PREFIX,
    title: 'Journal entry prefix',
    description: 'Optional prefix for journal entries (e.g., "[MCP]")',
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
    description: 'URL of the MCP WebSocket server',
    defaultValue: DEFAULT_WS_URL,
  });

  await plugin.settings.registerStringSetting({
    id: SETTING_DEFAULT_PARENT,
    title: 'Default parent Rem ID',
    description: 'ID of the Rem to use as default parent for new notes (leave empty for root)',
    defaultValue: '',
  });

  console.log(withLogPrefix('Settings registered'));

  // Register MCP widget in popup
  // NOT needed anymore, but kept here for reference, in case the sidebar implementation doesn't work
  // and we need to revert to the popup implementation
  // await plugin.app.registerWidget('mcp_bridge', WidgetLocation.Popup, {
  //   dimensions: {
  //     height: 'auto',
  //     width: '600px',
  //   },
  // });

  // Register MCP widget in right sidebar
  await plugin.app.registerWidget('mcp_bridge', WidgetLocation.RightSidebar, {
    widgetTabIcon: `${plugin.rootURL}mcp-icon.svg`,
  });

  // // Register command to open the widget as popup
  // // NOT needed anymore, but kept here for reference, in case we need to revert
  // await plugin.app.registerCommand({
  //   id: 'open-mcp-bridge-popup',
  //   name: 'Open MCP Bridge Control Panel',
  //   action: async () => {
  //     await plugin.app.toast('Opening MCP Bridge Control Panel...');
  //     await plugin.widget.openPopup('mcp_bridge');
  //   },
  // });

  console.log(withLogPrefix('Widget registered in sidebar with icon'));
}

async function onDeactivate(plugin: ReactRNPlugin) {
  console.log(withLogPrefix('Plugin deactivating...'));
  await plugin.app.unregisterWidget('mcp_bridge', WidgetLocation.RightSidebar);
}

declareIndexPlugin(onActivate, onDeactivate);
