import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  initializeBridgeRuntime,
  shutdownBridgeRuntime,
  type BridgeRuntime,
} from '../../src/bridge/runtime';
import { MockRemNotePlugin, MockWebSocket } from '../helpers/mocks';
import {
  DEVTOOLS_EXECUTE_EVENT,
  DEVTOOLS_RESULT_EVENT,
  type DevToolsResultDetail,
} from '../../src/widgets/devtools-bridge-executor';
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
    expect(
      snapshot.logs.some((entry) => entry.message.includes('DevTools execute: create_note'))
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
    expect(
      snapshot.logs.some((entry) => entry.message.includes('Reconnect nudged: window focus'))
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
});
