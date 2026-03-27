import { FocusEvents, SidebarEvents, WindowEvents } from '@remnote/plugin-sdk';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  initializeBridgeRuntime,
  shutdownBridgeRuntime,
  type BridgeRuntime,
  MAX_HISTORY,
} from '../../src/bridge/runtime';
import { MockRem, MockRemNotePlugin, MockWebSocket } from '../helpers/mocks';
import {
  DEVTOOLS_EXECUTE_EVENT,
  DEVTOOLS_RESULT_EVENT,
  type DevToolsResultDetail,
} from '../../src/widgets/devtools-bridge-executor';
import {
  BRIDGE_UI_COMMAND_STORAGE_KEY,
  BRIDGE_UI_SNAPSHOT_STORAGE_KEY,
  isSerializedBridgeRuntimeSnapshot,
} from '../../src/widgets/runtime-ui-bridge';
import {
  SETTING_WS_URL,
  SETTING_ACCEPT_WRITE_OPERATIONS,
  SETTING_ACCEPT_REPLACE_OPERATION,
  SETTING_AUTO_TAG_ENABLED,
  SETTING_AUTO_TAG,
  SETTING_JOURNAL_PREFIX,
  SETTING_JOURNAL_TIMESTAMP,
  SETTING_DEFAULT_PARENT,
} from '../../src/settings';
import { wait } from '../helpers/test-server';

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

describe('Bridge runtime', () => {
  let plugin: MockRemNotePlugin;
  let runtime: BridgeRuntime;

  beforeEach(async () => {
    MockWebSocket.reset();
    plugin = new MockRemNotePlugin();
    plugin.setTestSetting(SETTING_ACCEPT_WRITE_OPERATIONS, true);
    plugin.setTestSetting(SETTING_ACCEPT_REPLACE_OPERATION, false);
    plugin.setTestSetting(SETTING_AUTO_TAG_ENABLED, true);
    plugin.setTestSetting(SETTING_AUTO_TAG, '');
    plugin.setTestSetting(SETTING_JOURNAL_PREFIX, '');
    plugin.setTestSetting(SETTING_JOURNAL_TIMESTAMP, true);
    plugin.setTestSetting(SETTING_DEFAULT_PARENT, '');
  });

  afterEach(() => {
    shutdownBridgeRuntime();
    vi.useRealTimers();
    MockWebSocket.reset();
  });

  it('starts the bridge runtime with settings-loaded WebSocket connection on initialization', async () => {
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:4555');

    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await wait(10);

    const snapshot = runtime.getSnapshot();
    expect(snapshot.wsUrl).toBe('ws://127.0.0.1:4555');
    expect(snapshot.status).toBe('connected');
    expect(snapshot.reconnectAttempts).toBe(0);
    expect(snapshot.maxReconnectAttempts).toBe(10);
    expect(MockWebSocket.instances.at(-1)?.url).toBe('ws://127.0.0.1:4555');
    expect(snapshot.logs.some((entry) => entry.message.includes('RemAdapter initialized'))).toBe(
      true
    );
  });

  it('handles devtools requests while no widget is mounted', async () => {
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await wait(10);

    const resultPromise = new Promise<DevToolsResultDetail>((resolve) => {
      window.addEventListener(
        DEVTOOLS_RESULT_EVENT,
        (event) => resolve((event as CustomEvent<DevToolsResultDetail>).detail),
        { once: true }
      );
    });

    window.dispatchEvent(
      new CustomEvent(DEVTOOLS_EXECUTE_EVENT, {
        detail: {
          id: 'devtools-create',
          action: 'create_note',
          payload: {
            title: 'Background runtime note',
          },
        },
      })
    );

    const result = await resultPromise;
    const snapshot = runtime.getSnapshot();

    expect(result.ok).toBe(true);
    expect(result.action).toBe('create_note');
    expect(snapshot.stats.created).toBe(1);
    expect(snapshot.history[0]?.action).toBe('create');
    expect(snapshot.history[0]?.id).toBe('h-1');
    expect(
      snapshot.logs.some((entry) => entry.message.includes('DevTools execute: create_note'))
    ).toBe(true);
  });

  it('handles read_table action via devtools request', async () => {
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');

    // Set up a mock table with properties and tagged rems
    const tableRem = plugin.addTestRem('table_1', 'TestTable', 'TestTable');
    // Add property as a child of the table
    const propertyRem = new MockRem('prop_1', 'Name');
    propertyRem.setIsPropertyMock(true);
    propertyRem.setPropertyTypeMock('text');
    await propertyRem.setParent(tableRem as never);

    // Set up tagged rows
    const taggedRow = plugin.addTestRem('row_1', 'Row 1');
    taggedRow.setTagPropertyValueMock('prop_1', ['Value 1']);
    tableRem.setTaggedRemsMock([taggedRow]);

    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await wait(10);

    const resultPromise = new Promise<DevToolsResultDetail>((resolve) => {
      window.addEventListener(
        DEVTOOLS_RESULT_EVENT,
        (event) => resolve((event as CustomEvent<DevToolsResultDetail>).detail),
        { once: true }
      );
    });

    window.dispatchEvent(
      new CustomEvent(DEVTOOLS_EXECUTE_EVENT, {
        detail: {
          id: 'devtools-read-table',
          action: 'read_table',
          payload: {
            tableTitle: 'TestTable',
            limit: 10,
            offset: 0,
          },
        },
      })
    );

    const result = await resultPromise;
    const snapshot = runtime.getSnapshot();

    expect(result.ok).toBe(true);
    expect(result.action).toBe('read_table');
    expect(snapshot.history[0]?.action).toBe('read');
    expect(snapshot.history[0]?.titles).toContain('TestTable');
  });

  it('publishes runtime snapshots over the UI bridge while no widget is mounted', async () => {
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await wait(10);

    await plugin.storage.setSession(BRIDGE_UI_COMMAND_STORAGE_KEY, {
      source: 'widget',
      id: 'cmd-request',
      timestamp: Date.now(),
      kind: 'request_snapshot',
    });
    await wait(10);

    const latestSnapshot = await plugin.storage.getSession(BRIDGE_UI_SNAPSHOT_STORAGE_KEY);
    expect(isSerializedBridgeRuntimeSnapshot(latestSnapshot)).toBe(true);
    expect(latestSnapshot?.status).toBe('connected');
    expect(
      latestSnapshot?.logs.some((entry) => entry.message.includes('RemAdapter initialized')) ??
        false
    ).toBe(true);
  });

  it('nudges reconnect on window focus while disconnected', async () => {
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await wait(10);

    const firstSocket = MockWebSocket.instances.at(-1);
    expect(firstSocket).toBeDefined();
    firstSocket!.close(1006, 'Connection lost');

    const instancesBeforeFocus = MockWebSocket.instances.length;
    window.dispatchEvent(new Event('focus'));
    await wait(10);

    const snapshot = runtime.getSnapshot();
    expect(MockWebSocket.instances.length).toBeGreaterThan(instancesBeforeFocus);
    expect(snapshot.lastDisconnectReason).toContain('1006');
    expect(
      snapshot.logs.some((entry) => entry.message.includes('Reconnect nudged: window focus'))
    ).toBe(true);
  });

  it('handles reconnect commands from the UI bridge', async () => {
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await wait(10);

    const instancesBeforeReconnect = MockWebSocket.instances.length;

    await plugin.storage.setSession(BRIDGE_UI_COMMAND_STORAGE_KEY, {
      source: 'widget',
      id: 'cmd-reconnect',
      timestamp: Date.now(),
      kind: 'reconnect',
      reason: 'sidebar button',
    });
    await wait(10);

    const snapshot = runtime.getSnapshot();
    expect(MockWebSocket.instances.length).toBeGreaterThan(instancesBeforeReconnect);
    expect(
      snapshot.logs.some((entry) =>
        entry.message.includes('Manual reconnection requested (sidebar button)')
      )
    ).toBe(true);
  });

  it('handles automatic nudge commands from the UI bridge', async () => {
    vi.useFakeTimers();
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await vi.runOnlyPendingTimersAsync();

    MockWebSocket.mode = 'close';
    MockWebSocket.instances.at(-1)?.close(1006, 'Connection lost');
    await vi.advanceTimersByTimeAsync(0);

    const instancesBeforeNudge = MockWebSocket.instances.length;

    await plugin.storage.setSession(BRIDGE_UI_COMMAND_STORAGE_KEY, {
      source: 'widget',
      id: 'cmd-nudge',
      timestamp: Date.now(),
      kind: 'nudge_reconnect',
      reason: 'bridge panel opened',
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(MockWebSocket.instances.length).toBeGreaterThan(instancesBeforeNudge);
    expect(
      runtime
        .getSnapshot()
        .logs.some((entry) => entry.message.includes('Auto reconnect nudged (bridge panel opened)'))
    ).toBe(true);
  });

  it('nudges reconnect on RemNote activity with a cooldown while disconnected', async () => {
    vi.useFakeTimers();
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await vi.runOnlyPendingTimersAsync();

    MockWebSocket.mode = 'close';
    MockWebSocket.instances.at(-1)?.close(1006, 'Connection lost');
    await vi.advanceTimersByTimeAsync(0);

    const instancesBeforeFirstNudge = MockWebSocket.instances.length;
    plugin.emitEvent(WindowEvents.FocusedPaneChange, {});
    await vi.advanceTimersByTimeAsync(0);
    expect(MockWebSocket.instances.length).toBeGreaterThan(instancesBeforeFirstNudge);

    const instancesAfterFirstNudge = MockWebSocket.instances.length;
    plugin.emitEvent(FocusEvents.FocusedRemChange, {});
    plugin.emitEvent(SidebarEvents.ClickSidebarItem, {});
    await vi.advanceTimersByTimeAsync(0);
    expect(MockWebSocket.instances.length).toBe(instancesAfterFirstNudge);

    await vi.advanceTimersByTimeAsync(15_000);
    plugin.emitEvent(SidebarEvents.ClickSidebarItem, {});
    await vi.advanceTimersByTimeAsync(0);
    expect(MockWebSocket.instances.length).toBeGreaterThan(instancesAfterFirstNudge);

    const snapshot = runtime.getSnapshot();
    expect(
      snapshot.logs.some((entry) =>
        entry.message.includes('Auto reconnect nudge suppressed during cooldown')
      )
    ).toBe(true);
  });

  it('restarts burst retries from standby when RemNote activity wakes the bridge', async () => {
    vi.useFakeTimers();
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await vi.runOnlyPendingTimersAsync();

    MockWebSocket.mode = 'close';
    MockWebSocket.instances.at(-1)?.close(1006, 'Connection lost');

    for (let attempt = 0; attempt < 20; attempt++) {
      await vi.runOnlyPendingTimersAsync();
      if (runtime.getSnapshot().retryPhase === 'standby') {
        break;
      }
    }

    expect(runtime.getSnapshot().retryPhase).toBe('standby');

    plugin.emitEvent(WindowEvents.FocusedPaneChange, {});
    await vi.runOnlyPendingTimersAsync();

    const snapshot = runtime.getSnapshot();
    expect(snapshot.retryPhase).toBe('burst');
    expect(snapshot.reconnectAttempts).toBe(1);
    expect(snapshot.nextRetryAt).toBeDefined();
    expect(
      snapshot.logs.some((entry) =>
        entry.message.includes('Resuming faster retries from standby (focused pane changed)')
      )
    ).toBe(true);
  });

  it('recreates the websocket client when the wsUrl setting changes', async () => {
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await wait(10);

    runtime.updateSettings({ wsUrl: 'ws://127.0.0.1:3777' });
    await wait(10);

    const snapshot = runtime.getSnapshot();
    expect(snapshot.wsUrl).toBe('ws://127.0.0.1:3777');
    expect(MockWebSocket.instances.at(-1)?.url).toBe('ws://127.0.0.1:3777');
  });

  it('limits history to MAX_HISTORY entries and generates unique incremental IDs', async () => {
    plugin.setTestSetting(SETTING_WS_URL, 'ws://127.0.0.1:3002');
    runtime = await initializeBridgeRuntime(plugin as unknown as never);
    await wait(10);

    // Generate more than MAX_HISTORY entries
    const count = MAX_HISTORY + 5;
    for (let i = 0; i < count; i++) {
      window.dispatchEvent(
        new CustomEvent(DEVTOOLS_EXECUTE_EVENT, {
          detail: {
            id: `cmd-${i}`,
            action: 'create_note',
            payload: { title: `Note ${i}` },
          },
        })
      );
      await wait(1); // Small delay to allow async ops if needed, though here it's event-based
    }

    const snapshot = runtime.getSnapshot();
    expect(snapshot.history.length).toBe(MAX_HISTORY);

    // The IDs should be h-1, h-2, ... h-15
    // But since it's a stack (prepend), the first entry should be h-15
    expect(snapshot.history[0].id).toBe(`h-${count}`);
    expect(snapshot.history[MAX_HISTORY - 1].id).toBe(`h-${count - MAX_HISTORY + 1}`);

    // Verify ordering: newest first
    expect(snapshot.history[0].titles[0]).toBe(`Note ${count - 1}`);
  });
});
