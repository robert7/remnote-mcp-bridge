/**
 * RemNote MCP Bridge Plugin
 *
 * Entry point for the RemNote plugin that connects to the MCP server.
 * This file only registers the widget - the actual widget is in mcp_bridge.tsx
 */

import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
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
  console.log('[MCP Bridge] Plugin activating...');

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
    description: 'Prefix for journal entries (e.g., "[Claude]", "[MCP]")',
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

  console.log('[MCP Bridge] Settings registered');

  // Pizza plugin settings (for testing sidebar UI)
  await plugin.settings.registerStringSetting({
    id: 'name',
    title: 'What is your Name?',
    defaultValue: 'Bob',
  });

  await plugin.settings.registerBooleanSetting({
    id: 'pizza',
    title: 'Do you like pizza?',
    defaultValue: true,
  });

  await plugin.settings.registerNumberSetting({
    id: 'favorite-number',
    title: 'What is your favorite number?',
    defaultValue: 42,
  });

  console.log('[MCP Bridge] Pizza settings registered');

  // Register MCP widget in popup only (for now)
  await plugin.app.registerWidget('mcp_bridge', WidgetLocation.Popup, {
    dimensions: {
      height: 'auto',
      width: '600px',
    },
  });

  // Register pizza widget in right sidebar (testing UI pattern)
  await plugin.app.registerWidget('sample_pizza_widget', WidgetLocation.RightSidebar, {
    widgetTabIcon: 'https://i.imgur.com/MLaBDJw.png',
  });

  // Register command to open the widget as popup
  await plugin.app.registerCommand({
    id: 'open-mcp-bridge-popup',
    name: 'Open MCP Bridge Control Panel',
    action: async () => {
      await plugin.app.toast('Opening MCP Bridge Control Panel...');
      await plugin.widget.openPopup('mcp_bridge');
    },
  });

  console.log('[MCP Bridge] Command registered: Open MCP Bridge Control Panel');
}

async function onDeactivate(plugin: ReactRNPlugin) {
  console.log('[MCP Bridge] Plugin deactivating...');
  await plugin.app.unregisterWidget('mcp_bridge', WidgetLocation.Popup);
  await plugin.app.unregisterWidget('sample_pizza_widget', WidgetLocation.RightSidebar);
}

declareIndexPlugin(onActivate, onDeactivate);
