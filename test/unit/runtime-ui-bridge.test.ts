import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BridgeRuntimeSnapshot } from '../../src/bridge/runtime';
import { MockRemNotePlugin } from '../helpers/mocks';
import {
  BRIDGE_UI_COMMAND_STORAGE_KEY,
  BRIDGE_UI_SNAPSHOT_STORAGE_KEY,
  isSerializedBridgeRuntimeSnapshot,
  registerBridgeRuntimeUiBridge,
} from '../../src/widgets/runtime-ui-bridge';

describe('registerBridgeRuntimeUiBridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes the current snapshot on registration and on subscription updates', async () => {
    const plugin = new MockRemNotePlugin();
    const logTimestamp = new Date('2026-03-17T17:30:00.000Z');
    const snapshot: BridgeRuntimeSnapshot = {
      status: 'connected',
      retryPhase: 'idle',
      bridgeVersion: '0.11.0',
      installMode: 'development',
      companion: {
        kind: 'cli',
        version: '0.11.0',
      },
      wsUrl: 'ws://127.0.0.1:3002',
      logs: [{ timestamp: logTimestamp, message: 'Connected', level: 'success' }],
      stats: { created: 1, updated: 2, journal: 3, searches: 4 },
      history: [
        {
          timestamp: new Date('2026-03-17T17:31:00.000Z'),
          action: 'create',
          titles: ['Test note'],
          remIds: ['rem-1'],
        },
      ],
      lastConnectedAt: 12345,
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
    };

    let subscriptionListener: ((snapshot: BridgeRuntimeSnapshot) => void) | undefined;

    const unregister = registerBridgeRuntimeUiBridge({
      plugin: plugin as never,
      runtime: {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
          subscriptionListener = listener;
          listener(snapshot);
          return () => {};
        },
        reconnect: vi.fn(),
        nudgeReconnect: vi.fn(),
        updateSettings: vi.fn(),
      },
    });

    await Promise.resolve();
    subscriptionListener?.({
      ...snapshot,
      retryPhase: 'standby',
    });
    await Promise.resolve();

    unregister();

    const persistedSnapshot = await plugin.storage.getSession(BRIDGE_UI_SNAPSHOT_STORAGE_KEY);
    expect(isSerializedBridgeRuntimeSnapshot(persistedSnapshot)).toBe(true);
    expect(persistedSnapshot?.wsUrl).toBe('ws://127.0.0.1:3002');
    expect(persistedSnapshot?.installMode).toBe('development');
    expect(persistedSnapshot?.companion?.kind).toBe('cli');
    expect(persistedSnapshot?.logs[0]?.timestamp).toBe(logTimestamp.getTime());
    expect(persistedSnapshot?.retryPhase).toBe('standby');
  });

  it('routes widget commands from storage to the runtime', async () => {
    const plugin = new MockRemNotePlugin();
    const reconnect = vi.fn();
    const nudgeReconnect = vi.fn();
    const updateSettings = vi.fn();

    const unregister = registerBridgeRuntimeUiBridge({
      plugin: plugin as never,
      runtime: {
        getSnapshot: () => ({
          status: 'disconnected',
          retryPhase: 'idle',
          bridgeVersion: '0.11.0',
          installMode: 'marketplace',
          wsUrl: 'ws://127.0.0.1:3002',
          logs: [],
          stats: { created: 0, updated: 0, journal: 0, searches: 0 },
          history: [],
          reconnectAttempts: 0,
          maxReconnectAttempts: 10,
        }),
        subscribe: () => () => {},
        reconnect,
        nudgeReconnect,
        updateSettings,
      },
    });

    await plugin.storage.setSession(BRIDGE_UI_COMMAND_STORAGE_KEY, {
      source: 'widget',
      id: 'cmd-1',
      timestamp: Date.now(),
      kind: 'reconnect',
      reason: 'test click',
    });
    await plugin.storage.setSession(BRIDGE_UI_COMMAND_STORAGE_KEY, {
      source: 'widget',
      id: 'cmd-2',
      timestamp: Date.now(),
      kind: 'nudge_reconnect',
      reason: 'bridge panel opened',
    });
    await plugin.storage.setSession(BRIDGE_UI_COMMAND_STORAGE_KEY, {
      source: 'widget',
      id: 'cmd-3',
      timestamp: Date.now(),
      kind: 'update_settings',
      settings: { wsUrl: 'ws://127.0.0.1:4444' },
    });

    unregister();

    expect(reconnect).toHaveBeenCalledWith('test click');
    expect(nudgeReconnect).toHaveBeenCalledWith('bridge panel opened');
    expect(updateSettings).toHaveBeenCalledWith({ wsUrl: 'ws://127.0.0.1:4444' });
  });
});
