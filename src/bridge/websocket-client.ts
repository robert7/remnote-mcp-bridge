/**
 * WebSocket Client with automatic reconnection
 * Connects to the automation bridge server and handles message routing
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type RetryPhase = 'idle' | 'burst' | 'standby';

export interface BridgeRequest {
  id: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  result?: unknown;
  error?: string;
}

export interface HelloMessage {
  type: 'hello';
  version: string;
}

export interface WebSocketClientConfig {
  url: string;
  pluginVersion: string;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  standbyReconnectDelay?: number;
  onStatusChange?: (status: ConnectionStatus) => void;
  onRetryPhaseChange?: (phase: RetryPhase) => void;
  onLog?: (message: string, level: 'info' | 'warn' | 'error') => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private messageHandler: ((request: BridgeRequest) => Promise<unknown>) | null = null;
  private status: ConnectionStatus = 'disconnected';
  private retryPhase: RetryPhase = 'idle';
  private isShuttingDown = false;

  private config: Required<
    Omit<WebSocketClientConfig, 'onStatusChange' | 'onLog' | 'onRetryPhaseChange'>
  > & {
    onStatusChange?: (status: ConnectionStatus) => void;
    onRetryPhaseChange?: (phase: RetryPhase) => void;
    onLog?: (message: string, level: 'info' | 'warn' | 'error') => void;
  };

  constructor(config: WebSocketClientConfig) {
    this.config = {
      url: config.url,
      pluginVersion: config.pluginVersion,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      initialReconnectDelay: config.initialReconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      standbyReconnectDelay: config.standbyReconnectDelay ?? 10 * 60 * 1000,
      onStatusChange: config.onStatusChange,
      onRetryPhaseChange: config.onRetryPhaseChange,
      onLog: config.onLog,
    };
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    this.config.onLog?.(message, level);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.config.onStatusChange?.(status);
    }
  }

  private setRetryPhase(phase: RetryPhase): void {
    if (this.retryPhase !== phase) {
      this.retryPhase = phase;
      this.config.onRetryPhaseChange?.(phase);
    }
  }

  private sendHello(): void {
    const hello: HelloMessage = {
      type: 'hello',
      version: this.config.pluginVersion,
    };
    try {
      this.ws?.send(JSON.stringify(hello));
      this.log(`Sent hello (v${this.config.pluginVersion})`);
    } catch (error) {
      this.log(`Failed to send hello: ${error}`, 'warn');
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.isShuttingDown = false;
    this.setStatus('connecting');
    this.log(`Connecting to ${this.config.url}...`);

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.log('Connected to automation bridge server');
        this.reconnectAttempts = 0;
        this.setRetryPhase('idle');
        this.setStatus('connected');
        this.sendHello();
      };

      this.ws.onmessage = async (event) => {
        await this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        this.log(`Disconnected: ${event.code} ${event.reason}`, 'warn');
        this.setStatus('disconnected');

        if (!this.isShuttingDown) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.log(`WebSocket error: ${error}`, 'error');
      };
    } catch (error) {
      this.log(`Connection failed: ${error}`, 'error');
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);

      // Handle ping/pong heartbeat
      if (message.type === 'ping') {
        this.ws?.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      // Handle request from server
      if (message.id && message.action && this.messageHandler) {
        const request = message as BridgeRequest;
        this.log(`Received: ${request.action}`);

        try {
          const result = await this.messageHandler(request);
          const response: BridgeResponse = {
            id: request.id,
            result,
          };
          this.ws?.send(JSON.stringify(response));
          this.log(`Completed: ${request.action}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const response: BridgeResponse = {
            id: request.id,
            error: errorMessage,
          };
          this.ws?.send(JSON.stringify(response));
          this.log(`Failed: ${request.action} - ${errorMessage}`, 'error');
        }
      }
    } catch (error) {
      this.log(`Failed to process message: ${error}`, 'error');
    }
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    let delay: number;

    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.setRetryPhase('burst');
      const baseDelay = Math.min(
        this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
        this.config.maxReconnectDelay
      );
      const jitter = Math.random() * 0.3 * baseDelay;
      delay = baseDelay + jitter;

      this.reconnectAttempts++;
      this.log(
        `Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
      );
    } else {
      this.setRetryPhase('standby');
      const jitter = Math.random() * 0.1 * this.config.standbyReconnectDelay;
      delay = this.config.standbyReconnectDelay + jitter;
      this.log(
        `Entering standby reconnect mode; next retry in ${Math.round(delay / 1000)}s`,
        'warn'
      );
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  setMessageHandler(handler: (request: BridgeRequest) => Promise<unknown>): void {
    this.messageHandler = handler;
  }

  disconnect(): void {
    this.isShuttingDown = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setRetryPhase('idle');
    this.setStatus('disconnected');
  }

  reconnect(): void {
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  nudgeReconnect(reason: string): void {
    if (this.isShuttingDown || this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.log(`Reconnect nudged: ${reason}`);
    this.connect();
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getRetryPhase(): RetryPhase {
    return this.retryPhase;
  }
}
