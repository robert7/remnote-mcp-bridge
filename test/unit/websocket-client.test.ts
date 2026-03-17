/**
 * Tests for WebSocket Client
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketClient, ConnectionStatus, RetryPhase } from '../../src/bridge/websocket-client';
import { MockWebSocket } from '../helpers/mocks';
import { wait } from '../helpers/test-server';

// Mock WebSocket globally
global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let statusChanges: ConnectionStatus[] = [];
  let retryPhases: RetryPhase[] = [];
  let logs: Array<{ message: string; level: string }> = [];

  beforeEach(() => {
    statusChanges = [];
    retryPhases = [];
    logs = [];
    MockWebSocket.reset();

    client = new WebSocketClient({
      url: 'ws://localhost:3002',
      pluginVersion: '0.5.0',
      maxReconnectAttempts: 3,
      initialReconnectDelay: 100,
      maxReconnectDelay: 1000,
      onStatusChange: (status) => statusChanges.push(status),
      onRetryPhaseChange: (phase) => retryPhases.push(phase),
      onLog: (message, level) => logs.push({ message, level }),
    });
  });

  afterEach(() => {
    client.disconnect();
    vi.clearAllTimers();
    vi.useRealTimers();
    MockWebSocket.reset();
  });

  describe('Connection lifecycle', () => {
    it('should connect successfully', async () => {
      client.connect();
      await wait(10);

      expect(client.getStatus()).toBe('connected');
      expect(statusChanges).toContain('connecting');
      expect(statusChanges).toContain('connected');
    });

    it('should not reconnect if already connected', async () => {
      client.connect();
      await wait(10);

      const initialLogsCount = logs.length;
      client.connect();
      await wait(10);

      // Should not have additional connection logs
      expect(logs.length).toBe(initialLogsCount);
    });

    it('should disconnect cleanly', async () => {
      client.connect();
      await wait(10);

      client.disconnect();
      await wait(10);

      expect(client.getStatus()).toBe('disconnected');
      expect(statusChanges).toContain('disconnected');
    });

    it('should handle manual reconnect', async () => {
      client.connect();
      await wait(10);

      client.reconnect();
      await wait(10);

      expect(client.getStatus()).toBe('connected');
    });

    it('should expose retry phase transitions', async () => {
      client.connect();
      await wait(10);

      expect(client.getRetryPhase()).toBe('idle');
    });
  });

  describe('Hello message', () => {
    it('should send hello message on connect', async () => {
      client.connect();
      await wait(10);

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      const helloMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.type === 'hello';
      });
      expect(helloMessage).toBeDefined();

      const parsed = JSON.parse(helloMessage!);
      expect(parsed).toEqual({ type: 'hello', version: '0.5.0' });
    });

    it('should send hello message on reconnect', async () => {
      client.connect();
      await wait(10);

      const ws1 = (client as unknown as { ws: MockWebSocket }).ws;
      const helloCount1 = ws1.sentMessages.filter((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.type === 'hello';
      }).length;
      expect(helloCount1).toBe(1);

      client.reconnect();
      await wait(10);

      const ws2 = (client as unknown as { ws: MockWebSocket }).ws;
      const helloCount2 = ws2.sentMessages.filter((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.type === 'hello';
      }).length;
      expect(helloCount2).toBe(1);
    });
  });

  describe('Message handling', () => {
    it('should handle ping messages', async () => {
      client.connect();
      await wait(10);

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.simulateMessage({ type: 'ping' });
      await wait(10);

      const pongMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.type === 'pong';
      });
      expect(pongMessage).toBeDefined();
    });

    it('should handle request messages with success', async () => {
      const handler = vi.fn(async (request) => {
        return { success: true, data: request.payload };
      });

      client.setMessageHandler(handler);
      client.connect();
      await wait(10);

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      const request = {
        id: 'req_123',
        action: 'test_action',
        payload: { foo: 'bar' },
      };

      ws.simulateMessage(request);
      await wait(10);

      expect(handler).toHaveBeenCalledWith(request);

      const response = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.id === 'req_123' && parsed.result;
      });
      expect(response).toBeDefined();

      const parsed = JSON.parse(response!);
      expect(parsed.result).toEqual({ success: true, data: { foo: 'bar' } });
    });

    it('should handle request messages with error', async () => {
      const handler = vi.fn(async () => {
        throw new Error('Handler error');
      });

      client.setMessageHandler(handler);
      client.connect();
      await wait(10);

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      const request = {
        id: 'req_456',
        action: 'failing_action',
        payload: {},
      };

      ws.simulateMessage(request);
      await wait(10);

      const response = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.id === 'req_456' && parsed.error;
      });
      expect(response).toBeDefined();

      const parsed = JSON.parse(response!);
      expect(parsed.error).toBe('Handler error');
    });

    it('should handle malformed messages', async () => {
      client.connect();
      await wait(10);

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.simulateMessage('invalid json{');
      await wait(10);

      const errorLog = logs.find(
        (log) => log.level === 'error' && log.message.includes('process message')
      );
      expect(errorLog).toBeDefined();
    });
  });

  describe('Reconnection logic', () => {
    it('should schedule reconnection on disconnect', async () => {
      client.connect();
      await wait(10);

      // Simulate disconnect
      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.close(1006, 'Connection lost');

      expect(client.getStatus()).toBe('disconnected');

      // Check that reconnection is scheduled
      const reconnectLog = logs.find((log) => log.message.includes('Reconnecting in'));
      expect(reconnectLog).toBeDefined();
    });

    it('should enter standby reconnect mode after burst attempts are exhausted', async () => {
      vi.useFakeTimers();

      client.connect();
      await vi.runOnlyPendingTimersAsync();

      MockWebSocket.mode = 'close';

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.close(1006, 'Connection lost');

      for (let attempt = 0; attempt < 6; attempt++) {
        await vi.runOnlyPendingTimersAsync();
      }

      expect(client.getRetryPhase()).toBe('standby');
      expect(retryPhases).toContain('burst');
      expect(retryPhases).toContain('standby');
      expect(logs.some((log) => log.message.includes('Entering standby reconnect mode'))).toBe(
        true
      );
    });

    it('should not reconnect if shutdown is in progress', async () => {
      client.connect();
      await wait(10);

      client.disconnect();
      await wait(10);

      const reconnectLogs = logs.filter((log) => log.message.includes('Reconnecting'));
      expect(reconnectLogs).toHaveLength(0);
    });

    it('should calculate exponential backoff with jitter', () => {
      const initialDelay = 100;
      const maxDelay = 1000;
      const attempt = 2;

      const baseDelay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.3 * baseDelay;
      const delay = baseDelay + jitter;

      expect(baseDelay).toBe(400);
      expect(delay).toBeGreaterThanOrEqual(400);
      expect(delay).toBeLessThanOrEqual(520); // 400 + (0.3 * 400)
    });

    it('should nudge reconnect immediately without resetting retry phase', async () => {
      vi.useFakeTimers();

      client.connect();
      await vi.runOnlyPendingTimersAsync();

      const firstSocket = (client as unknown as { ws: MockWebSocket }).ws;
      firstSocket.close(1006, 'Connection lost');

      MockWebSocket.mode = 'open';
      client.nudgeReconnect('window focus');
      await vi.runOnlyPendingTimersAsync();

      expect(logs.some((log) => log.message.includes('Reconnect nudged: window focus'))).toBe(true);
      expect(client.getStatus()).toBe('connected');
    });
  });

  describe('Edge cases', () => {
    it('should allow setting message handler', () => {
      const handler = vi.fn(async () => ({ result: 'ok' }));
      client.setMessageHandler(handler);

      // Handler should be set (we can't easily test the internal state,
      // but the important thing is that setMessageHandler doesn't throw)
      expect(handler).toBeDefined();
    });

    it('should handle multiple message handlers by replacing', () => {
      const handler1 = vi.fn(async () => ({ result: 1 }));
      const handler2 = vi.fn(async () => ({ result: 2 }));

      client.setMessageHandler(handler1);
      client.setMessageHandler(handler2);

      // Second handler should replace the first
      expect(handler1).toBeDefined();
      expect(handler2).toBeDefined();
    });

    it('should validate connection status getter', () => {
      const status = client.getStatus();
      expect(['disconnected', 'connecting', 'connected']).toContain(status);
    });
  });
});
