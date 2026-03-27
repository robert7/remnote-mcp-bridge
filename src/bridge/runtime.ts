declare const __PLUGIN_VERSION__: string;

import { FocusEvents, SidebarEvents, type ReactRNPlugin, WindowEvents } from '@remnote/plugin-sdk';
import { RemAdapter } from '../api/rem-adapter';
import {
  type BridgeRequest,
  type ConnectionStatus,
  type ReconnectMetadata,
  type RetryPhase,
  WebSocketClient,
} from './websocket-client';
import { type AutomationBridgeSettings, readAutomationBridgeSettings } from '../settings';
import {
  registerDevToolsBridgeExecutor,
  type DevToolsExecutorConfig,
} from '../widgets/devtools-bridge-executor';
import { registerBridgeRuntimeUiBridge } from '../widgets/runtime-ui-bridge';
import { withScopedLogPrefix } from '../logging';

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
  id: string;
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
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  nextRetryAt?: number;
  lastRetryDelayMs?: number;
  lastDisconnectReason?: string;
}

export interface BridgeRuntime {
  getSnapshot(): BridgeRuntimeSnapshot;
  subscribe(listener: (snapshot: BridgeRuntimeSnapshot) => void): () => void;
  reconnect(reason?: string): void;
  nudgeReconnect(reason?: string): void;
  updateSettings(settings: Partial<AutomationBridgeSettings>): void;
  shutdown(): void;
}

export const MAX_LOGS = 50;
export const MAX_HISTORY = 10;
export const AUTO_NUDGE_COOLDOWN_MS = 15_000;

class BridgeRuntimeController implements BridgeRuntime {
  private readonly adapter: RemAdapter;
  private readonly listeners = new Set<(snapshot: BridgeRuntimeSnapshot) => void>();
  private wsClient: WebSocketClient;
  private unregisterDevTools: (() => void) | null = null;
  private unregisterUiBridge: (() => void) | null = null;
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
  private historyIdCounter = 0;
  private lastConnectedAt?: number;
  private lastAutoNudgeAt?: number;
  private lastSuppressedAutoNudgeAt?: number;

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
    console.log(withScopedLogPrefix('runtime', 'Runtime start'));
    this.addLog('RemAdapter initialized', 'success');
    this.registerDevToolsExecutor();
    this.registerUiBridge();
    this.registerLifecycleNudges();
    this.wsClient.connect();
    this.addLog(`Connecting to automation bridge server at ${this.settings.wsUrl}...`, 'info');
  }

  getSnapshot(): BridgeRuntimeSnapshot {
    const reconnectMetadata: ReconnectMetadata = this.wsClient.getReconnectMetadata();

    return {
      status: this.status,
      retryPhase: this.retryPhase,
      wsUrl: this.settings.wsUrl,
      logs: [...this.logs],
      stats: { ...this.stats },
      history: [...this.history],
      lastConnectedAt: this.lastConnectedAt,
      reconnectAttempts: reconnectMetadata.reconnectAttempts,
      maxReconnectAttempts: reconnectMetadata.maxReconnectAttempts,
      nextRetryAt: reconnectMetadata.nextRetryAt,
      lastRetryDelayMs: reconnectMetadata.lastRetryDelayMs,
      lastDisconnectReason: reconnectMetadata.lastDisconnectReason,
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
    console.log(withScopedLogPrefix('runtime', `Reconnect requested: ${reason}`));
    this.addLog(`Manual reconnection requested (${reason})`, 'info');
    this.wsClient.reconnect();
  }

  nudgeReconnect(reason = 'activity'): void {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    const now = Date.now();
    if (this.lastAutoNudgeAt !== undefined && now - this.lastAutoNudgeAt < AUTO_NUDGE_COOLDOWN_MS) {
      if (
        this.lastSuppressedAutoNudgeAt === undefined ||
        now - this.lastSuppressedAutoNudgeAt >= AUTO_NUDGE_COOLDOWN_MS
      ) {
        console.log(
          withScopedLogPrefix(
            'runtime',
            `Auto reconnect nudge suppressed during cooldown: ${reason}`
          )
        );
        this.addLog(`Auto reconnect nudge suppressed during cooldown (${reason})`, 'info');
        this.lastSuppressedAutoNudgeAt = now;
      }
      return;
    }

    this.lastAutoNudgeAt = now;
    this.lastSuppressedAutoNudgeAt = undefined;
    console.log(withScopedLogPrefix('runtime', `Auto reconnect nudged: ${reason}`));
    this.addLog(`Auto reconnect nudged (${reason})`, 'info');

    if (this.retryPhase === 'standby') {
      this.addLog(`Resuming faster retries from standby (${reason})`, 'info');
      this.wsClient.wakeReconnect(reason);
      return;
    }

    this.wsClient.nudgeReconnect(reason);
  }

  updateSettings(nextSettings: Partial<AutomationBridgeSettings>): void {
    const settingKeys = Object.keys(nextSettings);
    if (settingKeys.length > 0) {
      console.log(
        withScopedLogPrefix('runtime', `Settings update received: ${settingKeys.join(', ')}`)
      );
    }

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
    console.log(withScopedLogPrefix('runtime', 'Runtime shutdown'));
    this.unregisterDevTools?.();
    this.unregisterDevTools = null;
    this.unregisterUiBridge?.();
    this.unregisterUiBridge = null;
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
        console.log(withScopedLogPrefix('runtime', `WebSocket status -> ${status}`));
        this.status = status;
        if (status === 'connected') {
          this.lastConnectedAt = Date.now();
        }
        this.emit();
      },
      onRetryPhaseChange: (phase) => {
        console.log(withScopedLogPrefix('runtime', `Retry phase -> ${phase}`));
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
    this.history = [
      { id: `h-${++this.historyIdCounter}`, timestamp: new Date(), action, titles, remIds },
      ...this.history,
    ].slice(0, MAX_HISTORY);
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

      case 'read_table': {
        const result = await this.adapter.readTable({
          tableRemId: payload.tableRemId as string | undefined,
          tableTitle: payload.tableTitle as string | undefined,
          limit: payload.limit as number | undefined,
          offset: payload.offset as number | undefined,
          propertyFilter: payload.propertyFilter as string[] | undefined,
        });
        this.addHistoryEntry('read', [result.tableName], [result.tableId]);
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
    const addPluginListener = (eventId: string, reason: string, listenerKey?: string): void => {
      const callback = () => {
        this.nudgeReconnect(reason);
      };
      this.plugin.event.addListener(eventId, listenerKey, callback);
      this.windowListeners.push(() =>
        this.plugin.event.removeListener(eventId, listenerKey, callback)
      );
    };

    addPluginListener(WindowEvents.FocusedPaneChange, 'focused pane changed');
    addPluginListener(FocusEvents.FocusedRemChange, 'focused rem changed');
    addPluginListener(FocusEvents.FocusedPortalChange, 'focused portal changed');
    addPluginListener(SidebarEvents.ClickSidebarItem, 'sidebar item clicked');

    if (typeof window === 'undefined') {
      return;
    }

    const focusListener = () => {
      this.nudgeReconnect('window focus');
    };
    window.addEventListener('focus', focusListener);
    this.windowListeners.push(() => window.removeEventListener('focus', focusListener));

    const onlineListener = () => {
      this.nudgeReconnect('browser online');
    };
    window.addEventListener('online', onlineListener);
    this.windowListeners.push(() => window.removeEventListener('online', onlineListener));

    if (typeof document !== 'undefined') {
      const visibilityListener = () => {
        if (!document.hidden) {
          this.nudgeReconnect('tab visible');
        }
      };
      document.addEventListener('visibilitychange', visibilityListener);
      this.windowListeners.push(() =>
        document.removeEventListener('visibilitychange', visibilityListener)
      );
    }
  }

  private registerUiBridge(): void {
    this.unregisterUiBridge = registerBridgeRuntimeUiBridge({
      plugin: this.plugin,
      runtime: this,
    });
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
