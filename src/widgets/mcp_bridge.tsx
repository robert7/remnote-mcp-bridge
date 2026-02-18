/**
 * MCP Bridge Widget
 *
 * Popup widget that displays connection status, stats, and logs.
 * Opens via command palette (Ctrl-K): "Open MCP Bridge Control Panel"
 * Uses renderWidget() as required by RemNote plugin SDK.
 */

import { renderWidget, usePlugin, useTracker, ReactRNPlugin } from '@remnote/plugin-sdk';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketClient, ConnectionStatus, BridgeRequest } from '../bridge/websocket-client';
import { RemAdapter } from '../api/rem-adapter';
import {
  SETTING_AUTO_TAG_ENABLED,
  SETTING_AUTO_TAG,
  SETTING_JOURNAL_PREFIX,
  SETTING_JOURNAL_TIMESTAMP,
  SETTING_WS_URL,
  SETTING_DEFAULT_PARENT,
  DEFAULT_WS_URL,
  MCPSettings,
} from '../settings';

// Log entry type
interface LogEntry {
  timestamp: Date;
  message: string;
  level: 'info' | 'error' | 'warn' | 'success';
}

// Stats type
interface SessionStats {
  created: number;
  updated: number;
  journal: number;
  searches: number;
}

// History entry type
interface HistoryEntry {
  timestamp: Date;
  action: 'create' | 'update' | 'journal' | 'search' | 'read';
  title: string;
  remId?: string;
}

function MCPBridgeWidget() {
  console.log('[MCP Bridge Widget] Rendering...');
  const plugin = usePlugin();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    created: 0,
    updated: 0,
    journal: 0,
    searches: 0,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const remAdapterRef = useRef<RemAdapter | null>(null);

  // Read settings from RemNote
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

  // Add log helper
  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    setLogs((prev) => {
      const newLogs = [...prev, { timestamp: new Date(), message, level }];
      // Keep only last 50 logs
      return newLogs.slice(-50);
    });
  }, []);

  // Add history entry helper
  const addHistoryEntry = useCallback(
    (action: HistoryEntry['action'], title: string, remId?: string) => {
      setHistory((prev) => {
        const newHistory = [{ timestamp: new Date(), action, title, remId }, ...prev];
        // Keep only last 10 entries
        return newHistory.slice(0, 10);
      });
    },
    []
  );

  // Initialize RemAdapter with settings
  useEffect(() => {
    if (plugin) {
      const settings: MCPSettings = {
        autoTagEnabled: autoTagEnabled ?? true,
        autoTag: autoTag ?? 'MCP',
        journalPrefix: journalPrefix ?? '[Claude]',
        journalTimestamp: journalTimestamp ?? true,
        wsUrl: wsUrl ?? DEFAULT_WS_URL,
        defaultParentId: defaultParentId ?? '',
      };

      if (remAdapterRef.current) {
        remAdapterRef.current.updateSettings(settings);
      } else {
        remAdapterRef.current = new RemAdapter(plugin as ReactRNPlugin, settings);
        addLog('RemAdapter initialized', 'success');
      }
    }
  }, [
    plugin,
    addLog,
    autoTagEnabled,
    autoTag,
    journalPrefix,
    journalTimestamp,
    wsUrl,
    defaultParentId,
  ]);

  // Handle incoming requests from MCP server
  const handleRequest = useCallback(
    async (request: BridgeRequest): Promise<unknown> => {
      const adapter = remAdapterRef.current;
      if (!adapter) {
        throw new Error('RemAdapter not initialized');
      }

      const payload = request.payload;
      addLog(`Received action: ${request.action}`, 'info');

      switch (request.action) {
        case 'create_note': {
          const result = await adapter.createNote({
            title: payload.title as string,
            content: payload.content as string | undefined,
            parentId: payload.parentId as string | undefined,
            tags: payload.tags as string[] | undefined,
          });
          setStats((prev) => ({ ...prev, created: prev.created + 1 }));
          addHistoryEntry('create', result.title, result.remId);
          return result;
        }

        case 'append_journal': {
          const result = await adapter.appendJournal({
            content: payload.content as string,
            timestamp: payload.timestamp as boolean | undefined,
          });
          setStats((prev) => ({ ...prev, journal: prev.journal + 1 }));
          addHistoryEntry('journal', 'Journal entry', result.remId);
          return result;
        }

        case 'search': {
          const result = await adapter.search({
            query: payload.query as string,
            limit: payload.limit as number | undefined,
            includeContent: payload.includeContent as boolean | undefined,
          });
          setStats((prev) => ({ ...prev, searches: prev.searches + 1 }));
          addHistoryEntry('search', `Search: "${payload.query}"`);
          return result;
        }

        case 'read_note': {
          const result = await adapter.readNote({
            remId: payload.remId as string,
            depth: payload.depth as number | undefined,
          });
          addHistoryEntry('read', result.title, result.remId);
          return result;
        }

        case 'update_note': {
          const result = await adapter.updateNote({
            remId: payload.remId as string,
            title: payload.title as string | undefined,
            appendContent: payload.appendContent as string | undefined,
            addTags: payload.addTags as string[] | undefined,
            removeTags: payload.removeTags as string[] | undefined,
          });
          setStats((prev) => ({ ...prev, updated: prev.updated + 1 }));
          addHistoryEntry('update', (payload.title as string) || 'Note updated', result.remId);
          return result;
        }

        case 'get_status':
          return await adapter.getStatus();

        default:
          throw new Error(`Unknown action: ${request.action}`);
      }
    },
    [addLog, addHistoryEntry]
  );

  // Initialize WebSocket connection with dynamic URL
  const currentWsUrl = wsUrl ?? DEFAULT_WS_URL;

  useEffect(() => {
    // Disconnect existing client if URL changed
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }

    const client = new WebSocketClient({
      url: currentWsUrl,
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
      onLog: (message, level) => {
        addLog(message, level);
      },
    });

    client.setMessageHandler(handleRequest);
    wsClientRef.current = client;

    // Connect on mount
    client.connect();
    addLog(`Connecting to MCP server at ${currentWsUrl}...`, 'info');

    // Cleanup on unmount
    return () => {
      client.disconnect();
    };
  }, [handleRequest, addLog, currentWsUrl]);

  // Handle reconnect button
  const handleReconnect = useCallback(() => {
    addLog('Manual reconnection requested', 'info');
    wsClientRef.current?.reconnect();
  }, [addLog]);

  // Status colors and icons
  const statusConfig = {
    connected: { color: '#22c55e', bg: '#dcfce7', icon: '●', text: 'Connected' },
    connecting: { color: '#f59e0b', bg: '#fef3c7', icon: '◐', text: 'Connecting...' },
    disconnected: { color: '#ef4444', bg: '#fee2e2', icon: '○', text: 'Disconnected' },
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
          Bridge for MCP & OpenClaw
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
                    width: '12px',
                  }}
                >
                  {actionIcons[entry.action]}
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
                  {entry.title}
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

renderWidget(MCPBridgeWidget);
