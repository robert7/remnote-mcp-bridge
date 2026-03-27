import { describe, expect, it } from 'vitest';
import type { BridgeRuntimeSnapshot } from '../../src/bridge/runtime';
import { buildConnectionUiState, formatRelativeDuration } from '../../src/widgets/connection-ui';

function createSnapshot(overrides: Partial<BridgeRuntimeSnapshot> = {}): BridgeRuntimeSnapshot {
  return {
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
    ...overrides,
  };
}

describe('connection-ui', () => {
  it('formats relative durations for seconds, minutes, and hours', () => {
    expect(formatRelativeDuration(8_200)).toBe('9s');
    expect(formatRelativeDuration(65_000)).toBe('1m 05s');
    expect(formatRelativeDuration(3_900_000)).toBe('1h 05m');
  });

  it('describes burst retry state with attempt progress and countdown', () => {
    const now = 1_000_000;
    const ui = buildConnectionUiState(
      createSnapshot({
        retryPhase: 'burst',
        reconnectAttempts: 3,
        nextRetryAt: now + 8_100,
        lastDisconnectReason: '1006 Connection lost',
      }),
      now
    );

    expect(ui.badge.text).toBe('Retrying');
    expect(ui.phaseLabel).toBe('Burst retry 3/10');
    expect(ui.summary).toBe('Retrying connection');
    expect(ui.nextRetryLabel).toBe('Next retry in 9s');
    expect(ui.lastDisconnectLabel).toBe('Disconnect 1006 Connection lost');
  });

  it('describes standby state with background retry hint', () => {
    const now = 2_000_000;
    const ui = buildConnectionUiState(
      createSnapshot({
        retryPhase: 'standby',
        reconnectAttempts: 10,
        nextRetryAt: now + 610_000,
        lastConnectedAt: now - 42_000,
      }),
      now
    );

    expect(ui.badge.text).toBe('Waiting for server');
    expect(ui.phaseLabel).toBe('Standby reconnect');
    expect(ui.summary).toBe('Companion unavailable');
    expect(ui.nextRetryLabel).toBe('Retry in 10m 10s');
    expect(ui.lastConnectedLabel).toBe('Last seen 42s ago');
    expect(ui.hint).toContain('Opening this panel');
    expect(ui.hint).toContain('moving focus inside RemNote');
  });

  it('describes connected state as ready', () => {
    const now = 3_000_000;
    const ui = buildConnectionUiState(
      createSnapshot({
        status: 'connected',
        retryPhase: 'idle',
        lastConnectedAt: now - 3_000,
      }),
      now
    );

    expect(ui.badge.text).toBe('Connected');
    expect(ui.summary).toBe('Ready');
    expect(ui.phaseLabel).toBeUndefined();
    expect(ui.lastConnectedLabel).toBeUndefined();
  });
});
