import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BridgeRuntimeSnapshot, HistoryEntry } from '../../src/bridge/runtime';
import { MockRemNotePlugin } from '../helpers/mocks';
import {
  BRIDGE_UI_SNAPSHOT_STORAGE_KEY,
  serializeBridgeRuntimeSnapshot,
} from '../../src/widgets/runtime-ui-bridge';

const remnoteSdkMock = vi.hoisted(() => ({
  plugin: null as unknown,
  renderWidget: vi.fn(),
}));

vi.mock('@remnote/plugin-sdk', () => ({
  StorageEvents: {
    StorageSessionChange: 'storage.session.changed',
  },
  renderWidget: remnoteSdkMock.renderWidget,
  useTracker: undefined,
  useTrackerPlugin: undefined,
  usePlugin: () => remnoteSdkMock.plugin,
}));

import { AutomationBridgeWidget, reconcileExpandedRows } from '../../src/widgets/mcp_bridge';

function createHistoryEntry(id: string, title: string, extraTitles: string[] = []): HistoryEntry {
  return {
    id,
    timestamp: new Date('2026-03-27T10:00:00.000Z'),
    action: 'create',
    titles: [title, ...extraTitles],
    remIds: [`rem-${id}`],
  };
}

function createSnapshot(history: HistoryEntry[]): BridgeRuntimeSnapshot {
  return {
    status: 'connected',
    retryPhase: 'idle',
    wsUrl: 'ws://127.0.0.1:3002',
    logs: [],
    stats: {
      created: 0,
      updated: 0,
      journal: 0,
      searches: 0,
    },
    history,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
  };
}

async function flushWidgetEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('AutomationBridgeWidget', () => {
  let container: HTMLDivElement;
  let plugin: MockRemNotePlugin;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    plugin = new MockRemNotePlugin();
    remnoteSdkMock.plugin = plugin as never;
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    remnoteSdkMock.plugin = null;
  });

  it('keeps expansion attached to the history entry id when new rows are prepended', async () => {
    const initialSnapshot = createSnapshot([
      createHistoryEntry('entry-a', 'Alpha', ['Alpha child']),
      createHistoryEntry('entry-b', 'Beta'),
    ]);

    await plugin.storage.setSession(
      BRIDGE_UI_SNAPSHOT_STORAGE_KEY,
      serializeBridgeRuntimeSnapshot(initialSnapshot)
    );

    await act(async () => {
      ReactDOM.render(<AutomationBridgeWidget />, container);
    });
    await flushWidgetEffects();

    const alphaEntry = container.querySelector('[data-history-entry-id="entry-a"]') as HTMLElement;
    const alphaParentRow = alphaEntry.querySelector('[data-history-row="parent"]') as HTMLElement;

    await act(async () => {
      alphaParentRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushWidgetEffects();

    expect(alphaEntry.dataset.historyExpanded).toBe('true');

    const updatedSnapshot = createSnapshot([
      createHistoryEntry('entry-new', 'Newest'),
      ...initialSnapshot.history,
    ]);

    await plugin.storage.setSession(
      BRIDGE_UI_SNAPSHOT_STORAGE_KEY,
      serializeBridgeRuntimeSnapshot(updatedSnapshot)
    );
    await flushWidgetEffects();

    const prependedEntry = container.querySelector(
      '[data-history-entry-id="entry-new"]'
    ) as HTMLElement;
    const persistedAlphaEntry = container.querySelector(
      '[data-history-entry-id="entry-a"]'
    ) as HTMLElement;

    expect(prependedEntry.dataset.historyExpanded).toBe('false');
    expect(persistedAlphaEntry.dataset.historyExpanded).toBe('true');
  });

  it('drops stale expanded-row ids when history entries roll out', () => {
    const reconciled = reconcileExpandedRows(
      {
        stale: true,
        current: true,
        collapsed: false,
      },
      [{ id: 'current' }, { id: 'fresh' }]
    );

    expect(reconciled).toEqual({ current: true });
  });
});
