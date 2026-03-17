declare const __PLUGIN_VERSION__: string;

import type { ReactRNPlugin } from '@remnote/plugin-sdk';
import { RemAdapter } from '../api/rem-adapter';
import {
  type BridgeRequest,
  type ConnectionStatus,
  type RetryPhase,
  WebSocketClient,
} from './websocket-client';
import { type AutomationBridgeSettings, readAutomationBridgeSettings } from '../settings';
import {
  registerDevToolsBridgeExecutor,
  type DevToolsExecutorConfig,
} from '../widgets/devtools-bridge-executor';

export interface LogEntry {
  timestamp: Date;
  message: string;
  level: 'info' | 'error' | 'warn' | 'success';
}

export interface SessionStats {
  created: number;
  updated: number;
  journal: number;
  searches: number;
}

export interface HistoryEntry {
  timestamp: Date;
  action: 'create' | 'update' | 'journal' | 'search' | 'read';
  titles: string[];
  remIds?: string[];
}

export interface BridgeRuntimeSnapshot {
  status: ConnectionStatus;
  retryPhase: RetryPhase;
  wsUrl: string;
  logs: LogEntry[];
  stats: SessionStats;
  history: HistoryEntry[];
  lastConnectedAt?: number;
}

export interface BridgeRuntime {
  getSnapshot(): BridgeRuntimeSnapshot;
  subscribe(listener: (snapshot: BridgeRuntimeSnapshot) => void): () => void;
  reconnect(reason?: string): void;
  updateSettings(settings: Partial<AutomationBridgeSettings>): void;
  shutdown(): void;
}

const MAX_LOGS = 50;
const MAX_HISTORY = 10;

class BridgeRuntimeController implements BridgeRuntime {
  private readonly adapter: RemAdapter;
  private readonly listeners = new Set<(snapshot: BridgeRuntimeSnapshot) => void>();
  private wsClient: WebSocketClient;
  private unregisterDevTools: (() => void) | null = null;
  private windowListeners: Array<() => void> = [];
  private settings: AutomationBridgeSettings;
  private status: ConnectionStatus = 'disconnected';
  private retryPhase: RetryPhase = 'idle';
  private logs: LogEntry[] = [];
  private stats: SessionStats = {
    created: 0,
    updated: 0,
    journal: 0,
    searches: 0,
  };
  private history: HistoryEntry[] = [];
  private lastConnectedAt?: number;

  constructor(
    private readonly plugin: ReactRNPlugin,
    settings: AutomationBridgeSettings
  ) {
    this.settings = settings;
    this.adapter = new RemAdapter(plugin, settings);
    this.wsClient = this.createWebSocketClient(settings.wsUrl);
    this.wsClient.setMessageHandler(this.handleRequest);
    this.adapter.updateSettings(settings);
  }

  start(): void {
    this.addLog('RemAdapter initialized', 'success');
    this.registerDevToolsExecutor();
    this.registerLifecycleNudges();
    this.wsClient.connect();
    this.addLog(`Connecting to automation bridge server at ${this.settings.wsUrl}...`, 'info');
  }

  getSnapshot(): BridgeRuntimeSnapshot {
    return {
      status: this.status,
      retryPhase: this.retryPhase,
      wsUrl: this.settings.wsUrl,
      logs: [...this.logs],
      stats: { ...this.stats },
      history: [...this.history],
      lastConnectedAt: this.lastConnectedAt,
    };
  }

  subscribe(listener: (snapshot: BridgeRuntimeSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  reconnect(reason = 'manual request'): void {
    this.addLog(`Manual reconnection requested (${reason})`, 'info');
    this.wsClient.reconnect();
  }

  updateSettings(nextSettings: Partial<AutomationBridgeSettings>): void {
    const previousWsUrl = this.settings.wsUrl;
    this.settings = { ...this.settings, ...nextSettings };
    this.adapter.updateSettings(this.settings);

    if (this.settings.wsUrl !== previousWsUrl) {
      this.addLog(`WebSocket URL updated to ${this.settings.wsUrl}`, 'info');
      this.wsClient.disconnect();
      this.wsClient = this.createWebSocketClient(this.settings.wsUrl);
      this.wsClient.setMessageHandler(this.handleRequest);
      this.wsClient.connect();
      this.addLog(`Connecting to automation bridge server at ${this.settings.wsUrl}...`, 'info');
    }

    this.emit();
  }

  shutdown(): void {
    this.unregisterDevTools?.();
    this.unregisterDevTools = null;
    this.windowListeners.forEach((cleanup) => cleanup());
    this.windowListeners = [];
    this.wsClient.disconnect();
    this.listeners.clear();
  }

  private createWebSocketClient(url: string): WebSocketClient {
    return new WebSocketClient({
      url,
      pluginVersion: __PLUGIN_VERSION__,
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      standbyReconnectDelay: 10 * 60 * 1000,
      onStatusChange: (status) => {
        this.status = status;
        if (status === 'connected') {
          this.lastConnectedAt = Date.now();
        }
        this.emit();
      },
      onRetryPhaseChange: (phase) => {
        this.retryPhase = phase;
        this.emit();
      },
      onLog: (message, level) => {
        this.addLog(message, level);
      },
    });
  }

  private addLog(message: string, level: LogEntry['level'] = 'info'): void {
    this.logs = [...this.logs, { timestamp: new Date(), message, level }].slice(-MAX_LOGS);
    this.emit();
  }

  private addHistoryEntry(
    action: HistoryEntry['action'],
    titles: string[],
    remIds?: string[]
  ): void {
    this.history = [{ timestamp: new Date(), action, titles, remIds }, ...this.history].slice(
      0,
      MAX_HISTORY
    );
    this.emit();
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private readonly handleRequest = async (request: BridgeRequest): Promise<unknown> => {
    const payload = request.payload;
    this.addLog(`Received action: ${request.action}`, 'info');

    switch (request.action) {
      case 'create_note': {
        const result = await this.adapter.createNote({
          title: payload.title as string | undefined,
          content: payload.content as string | undefined,
          parentId: payload.parentId as string | undefined,
          tags: payload.tags as string[] | undefined,
        });
        this.stats = { ...this.stats, created: this.stats.created + 1 };
        this.addHistoryEntry('create', result.titles || ['Note'], result.remIds);
        this.emit();
        return result;
      }

      case 'append_journal': {
        const result = await this.adapter.appendJournal({
          content: payload.content as string,
          timestamp: payload.timestamp as boolean | undefined,
        });
        this.stats = { ...this.stats, journal: this.stats.journal + 1 };
        this.addHistoryEntry('journal', result.titles, result.remIds);
        this.emit();
        return result;
      }

      case 'search': {
        const result = await this.adapter.search({
          query: payload.query as string,
          limit: payload.limit as number | undefined,
          includeContent: payload.includeContent as 'none' | 'markdown' | 'structured' | undefined,
          depth: payload.depth as number | undefined,
          childLimit: payload.childLimit as number | undefined,
          maxContentLength: payload.maxContentLength as number | undefined,
        });
        this.stats = { ...this.stats, searches: this.stats.searches + 1 };
        this.addHistoryEntry('search', [`Search: "${payload.query}"`]);
        this.emit();
        return result;
      }

      case 'search_by_tag': {
        const result = await this.adapter.searchByTag({
          tag: payload.tag as string,
          limit: payload.limit as number | undefined,
          includeContent: payload.includeContent as 'none' | 'markdown' | 'structured' | undefined,
          depth: payload.depth as number | undefined,
          childLimit: payload.childLimit as number | undefined,
          maxContentLength: payload.maxContentLength as number | undefined,
        });
        this.stats = { ...this.stats, searches: this.stats.searches + 1 };
        this.addHistoryEntry('search', [`Search by tag: "${payload.tag}"`]);
        this.emit();
        return result;
      }

      case 'read_note': {
        const result = await this.adapter.readNote({
          remId: payload.remId as string,
          depth: payload.depth as number | undefined,
          includeContent: payload.includeContent as 'none' | 'markdown' | 'structured' | undefined,
          childLimit: payload.childLimit as number | undefined,
          maxContentLength: payload.maxContentLength as number | undefined,
        });
        this.addHistoryEntry('read', [result.title], [result.remId]);
        return result;
      }

      case 'update_note': {
        const result = await this.adapter.updateNote({
          remId: payload.remId as string,
          title: payload.title as string | undefined,
          appendContent: payload.appendContent as string | undefined,
          replaceContent: payload.replaceContent as string | undefined,
          addTags: payload.addTags as string[] | undefined,
          removeTags: payload.removeTags as string[] | undefined,
        });
        this.stats = { ...this.stats, updated: this.stats.updated + 1 };
        this.addHistoryEntry('update', result.titles || ['Note updated'], result.remIds);
        this.emit();
        return result;
      }

      case 'get_status':
        return await this.adapter.getStatus();

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  };

  private registerDevToolsExecutor(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const config: DevToolsExecutorConfig = {
      target: window,
      execute: this.handleRequest,
      onLog: (message, level) => this.addLog(message, level ?? 'info'),
    };

    this.unregisterDevTools = registerDevToolsBridgeExecutor(config);

    this.addLog('DevTools bridge executor ready (event-based)', 'info');
  }

  private registerLifecycleNudges(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const focusListener = () => {
      this.wsClient.nudgeReconnect('window focus');
    };
    window.addEventListener('focus', focusListener);
    this.windowListeners.push(() => window.removeEventListener('focus', focusListener));

    const onlineListener = () => {
      this.wsClient.nudgeReconnect('browser online');
    };
    window.addEventListener('online', onlineListener);
    this.windowListeners.push(() => window.removeEventListener('online', onlineListener));

    if (typeof document !== 'undefined') {
      const visibilityListener = () => {
        if (!document.hidden) {
          this.wsClient.nudgeReconnect('tab visible');
        }
      };
      document.addEventListener('visibilitychange', visibilityListener);
      this.windowListeners.push(() =>
        document.removeEventListener('visibilitychange', visibilityListener)
      );
    }
  }
}

let runtime: BridgeRuntimeController | null = null;

export async function initializeBridgeRuntime(plugin: ReactRNPlugin): Promise<BridgeRuntime> {
  if (runtime) {
    return runtime;
  }

  const settings = await readAutomationBridgeSettings(plugin);
  runtime = new BridgeRuntimeController(plugin, settings);
  runtime.start();
  return runtime;
}

export function getBridgeRuntime(): BridgeRuntime | null {
  return runtime;
}

export function shutdownBridgeRuntime(): void {
  runtime?.shutdown();
  runtime = null;
}
