/**
 * Automation Bridge Widget
 *
 * Sidebar widget that displays connection status, stats, and logs.
 * Uses renderWidget() as required by RemNote plugin SDK.
 */

import { renderWidget, usePlugin } from '@remnote/plugin-sdk';
import React, { useEffect, useState, useCallback } from 'react';
import { ConnectionStatus, RetryPhase } from '../bridge/websocket-client';
import {
  getBridgeRuntime,
  type BridgeRuntimeSnapshot,
  type HistoryEntry,
  type LogEntry,
  type SessionStats,
} from '../bridge/runtime';
import { useCompatibleTracker as useTracker } from './tracker-compat';
import {
  SETTING_ACCEPT_WRITE_OPERATIONS,
  SETTING_ACCEPT_REPLACE_OPERATION,
  SETTING_AUTO_TAG_ENABLED,
  SETTING_AUTO_TAG,
  SETTING_JOURNAL_PREFIX,
  SETTING_JOURNAL_TIMESTAMP,
  SETTING_WS_URL,
  SETTING_DEFAULT_PARENT,
  DEFAULT_WS_URL,
  AutomationBridgeSettings,
} from '../settings';

function AutomationBridgeWidget() {
  const plugin = usePlugin();
  const [snapshot, setSnapshot] = useState<BridgeRuntimeSnapshot>({
    status: 'disconnected',
    retryPhase: 'idle',
    wsUrl: DEFAULT_WS_URL,
    logs: [],
    stats: {
      created: 0,
      updated: 0,
      journal: 0,
      searches: 0,
    },
    history: [],
  });
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [retryPhase, setRetryPhase] = useState<RetryPhase>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    created: 0,
    updated: 0,
    journal: 0,
    searches: 0,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Read settings from RemNote
  const acceptWriteOperations = useTracker(
    () => plugin.settings.getSetting<boolean>(SETTING_ACCEPT_WRITE_OPERATIONS),
    []
  );
  const acceptReplaceOperation = useTracker(
    () => plugin.settings.getSetting<boolean>(SETTING_ACCEPT_REPLACE_OPERATION),
    []
  );
  const autoTagEnabled = useTracker(
    () => plugin.settings.getSetting<boolean>(SETTING_AUTO_TAG_ENABLED),
    []
  );
  const autoTag = useTracker(() => plugin.settings.getSetting<string>(SETTING_AUTO_TAG), []);
  const journalPrefix = useTracker(
    () => plugin.settings.getSetting<string>(SETTING_JOURNAL_PREFIX),
    []
  );
  const journalTimestamp = useTracker(
    () => plugin.settings.getSetting<boolean>(SETTING_JOURNAL_TIMESTAMP),
    []
  );
  const wsUrl = useTracker(() => plugin.settings.getSetting<string>(SETTING_WS_URL), []);
  const defaultParentId = useTracker(
    () => plugin.settings.getSetting<string>(SETTING_DEFAULT_PARENT),
    []
  );

  useEffect(() => {
    const runtime = getBridgeRuntime();
    if (!runtime) {
      return;
    }

    return runtime.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setStatus(nextSnapshot.status);
      setRetryPhase(nextSnapshot.retryPhase);
      setLogs(nextSnapshot.logs);
      setStats(nextSnapshot.stats);
      setHistory(nextSnapshot.history);
    });
  }, []);

  useEffect(() => {
    const runtime = getBridgeRuntime();
    if (!runtime) {
      return;
    }

    const settings: Partial<AutomationBridgeSettings> = {};

    if (acceptWriteOperations !== undefined) {
      settings.acceptWriteOperations = acceptWriteOperations;
    }
    if (acceptReplaceOperation !== undefined) {
      settings.acceptReplaceOperation = acceptReplaceOperation;
    }
    if (autoTagEnabled !== undefined) {
      settings.autoTagEnabled = autoTagEnabled;
    }
    if (autoTag !== undefined) {
      settings.autoTag = autoTag;
    }
    if (journalPrefix !== undefined) {
      settings.journalPrefix = journalPrefix;
    }
    if (journalTimestamp !== undefined) {
      settings.journalTimestamp = journalTimestamp;
    }
    if (wsUrl !== undefined) {
      settings.wsUrl = wsUrl;
    }
    if (defaultParentId !== undefined) {
      settings.defaultParentId = defaultParentId;
    }

    if (Object.keys(settings).length > 0) {
      runtime.updateSettings(settings);
    }
  }, [
    acceptWriteOperations,
    acceptReplaceOperation,
    autoTagEnabled,
    autoTag,
    journalPrefix,
    journalTimestamp,
    wsUrl,
    defaultParentId,
  ]);

  // Handle reconnect button
  const handleReconnect = useCallback(() => {
    getBridgeRuntime()?.reconnect('sidebar button');
  }, []);

  // Status colors and icons
  const statusConfig = {
    connected: { color: '#22c55e', bg: '#dcfce7', icon: '●', text: 'Connected' },
    connecting: { color: '#f59e0b', bg: '#fef3c7', icon: '◐', text: 'Connecting...' },
    disconnected: {
      color: retryPhase === 'standby' ? '#2563eb' : '#ef4444',
      bg: retryPhase === 'standby' ? '#dbeafe' : '#fee2e2',
      icon: retryPhase === 'standby' ? '◌' : '○',
      text: retryPhase === 'standby' ? 'Waiting for server...' : 'Disconnected',
    },
    error: { color: '#ef4444', bg: '#fee2e2', icon: '✕', text: 'Error' },
  };

  const currentStatus = statusConfig[status];

  // Action icons for history
  const actionIcons: Record<HistoryEntry['action'], string> = {
    create: '+',
    update: '~',
    journal: '#',
    search: '?',
    read: '>',
  };

  return (
    <div style={{ padding: '12px', fontFamily: 'system-ui, sans-serif', fontSize: '13px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
          Automation Bridge (OpenClaw, CLI, MCP...)
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '12px',
            backgroundColor: currentStatus.bg,
            color: currentStatus.color,
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <span>{currentStatus.icon}</span>
          <span>{currentStatus.text}</span>
        </div>
      </div>

      {/* Reconnect button */}
      {status !== 'connected' && (
        <button
          onClick={handleReconnect}
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: '#f9fafb',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Reconnect
        </button>
      )}

      {/* Stats Section */}
      <div
        style={{
          marginBottom: '12px',
          padding: '10px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          backgroundColor: '#f9fafb',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '8px', color: '#6b7280' }}>
          SESSION STATS
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
          Server: {snapshot.wsUrl}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#22c55e' }}>+</span>
            <span>Created: {stats.created}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#3b82f6' }}>~</span>
            <span>Updated: {stats.updated}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#8b5cf6' }}>#</span>
            <span>Journal: {stats.journal}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#f59e0b' }}>?</span>
            <span>Searches: {stats.searches}</span>
          </div>
        </div>
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div
          style={{
            marginBottom: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '8px 10px',
              borderBottom: '1px solid #e5e7eb',
              color: '#6b7280',
            }}
          >
            RECENT ACTIONS
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {history.map((entry, index) => (
              <div
                key={index}
                style={{
                  padding: '6px 10px',
                  borderBottom: index < history.length - 1 ? '1px solid #e5e7eb' : 'none',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    color:
                      entry.action === 'create'
                        ? '#22c55e'
                        : entry.action === 'update'
                          ? '#3b82f6'
                          : entry.action === 'journal'
                            ? '#8b5cf6'
                            : entry.action === 'search'
                              ? '#f59e0b'
                              : '#6b7280',
                    fontWeight: 600,
                    minWidth: '24px',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    overflow: 'hidden',
                  }}
                >
                  {actionIcons[entry.action]}
                  {entry.remIds && entry.remIds.length > 1 && <span>{entry.remIds.length}</span>}
                </span>
                <span style={{ color: '#9ca3af', flexShrink: 0 }}>
                  {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#374151',
                  }}
                >
                  {entry.titles[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs Section */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          backgroundColor: '#f9fafb',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '8px 10px',
            borderBottom: '1px solid #e5e7eb',
            color: '#6b7280',
          }}
        >
          LOGS
        </div>
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ padding: '12px', color: '#9ca3af', textAlign: 'center' }}>
              No logs yet
            </div>
          ) : (
            logs
              .slice()
              .reverse()
              .map((log, index) => (
                <div
                  key={index}
                  style={{
                    padding: '6px 10px',
                    borderBottom: index < logs.length - 1 ? '1px solid #e5e7eb' : 'none',
                    fontSize: '11px',
                  }}
                >
                  <span style={{ color: '#9ca3af' }}>
                    {log.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span
                    style={{
                      marginLeft: '8px',
                      color:
                        log.level === 'error'
                          ? '#ef4444'
                          : log.level === 'success'
                            ? '#22c55e'
                            : log.level === 'warn'
                              ? '#f59e0b'
                              : '#374151',
                    }}
                  >
                    {log.message}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

renderWidget(AutomationBridgeWidget);
