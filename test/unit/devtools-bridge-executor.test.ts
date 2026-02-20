import { describe, expect, it, vi } from 'vitest';
import {
  DEVTOOLS_EXECUTE_EVENT,
  DEVTOOLS_RESULT_EVENT,
  TOP_CONSOLE_HELPER,
  registerDevToolsBridgeExecutor,
  registerDevToolsBridgeMessageListener,
  type DevToolsResultDetail,
} from '../../src/widgets/devtools-bridge-executor';

describe('registerDevToolsBridgeExecutor', () => {
  it('executes bridge requests and returns successful results', async () => {
    const execute = vi.fn(async () => ({ remId: 'abc123' }));
    const onLog = vi.fn();

    const unregister = registerDevToolsBridgeExecutor({
      target: window,
      execute,
      onLog,
    });

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
          id: 'req-1',
          action: 'create_note',
          payload: { title: 'From test' },
        },
      })
    );

    const detail = await resultPromise;

    expect(execute).toHaveBeenCalledWith({
      id: 'req-1',
      action: 'create_note',
      payload: { title: 'From test' },
    });
    expect(detail).toEqual({
      id: 'req-1',
      ok: true,
      action: 'create_note',
      result: { remId: 'abc123' },
    });
    expect(onLog).toHaveBeenCalledWith('DevTools execute: create_note', 'info');

    unregister();
  });

  it('returns errors when execution fails', async () => {
    const execute = vi.fn(async () => {
      throw new Error('Boom');
    });

    const unregister = registerDevToolsBridgeExecutor({
      target: window,
      execute,
    });

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
          id: 'req-2',
          action: 'read_note',
          payload: { remId: 'missing' },
        },
      })
    );

    const detail = await resultPromise;

    expect(detail).toEqual({
      id: 'req-2',
      ok: false,
      action: 'read_note',
      error: 'Boom',
    });
    expect(execute).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('ignores invalid requests without action', async () => {
    const execute = vi.fn(async () => ({}));
    const onLog = vi.fn();

    const unregister = registerDevToolsBridgeExecutor({
      target: window,
      execute,
      onLog,
    });

    const resultSpy = vi.fn();
    window.addEventListener(DEVTOOLS_RESULT_EVENT, resultSpy);

    window.dispatchEvent(
      new CustomEvent(DEVTOOLS_EXECUTE_EVENT, {
        detail: {
          id: 'req-3',
          payload: { title: 'Missing action' },
        },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(execute).not.toHaveBeenCalled();
    expect(resultSpy).not.toHaveBeenCalled();
    expect(onLog).toHaveBeenCalledWith('Ignored invalid devtools request (missing action)', 'warn');

    window.removeEventListener(DEVTOOLS_RESULT_EVENT, resultSpy);
    unregister();
  });
});

describe('registerDevToolsBridgeMessageListener', () => {
  it('executes bridge requests and posts successful results to message source', async () => {
    const execute = vi.fn(async () => ({ connected: false }));
    const onLog = vi.fn();
    const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    const unregister = registerDevToolsBridgeMessageListener({
      execute,
      onLog,
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: DEVTOOLS_EXECUTE_EVENT,
          id: 'msg-1',
          action: 'get_status',
          payload: {},
        },
        origin: 'https://remnote.com',
        source: window,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(execute).toHaveBeenCalledWith({
      id: 'msg-1',
      action: 'get_status',
      payload: {},
    });
    expect(onLog).toHaveBeenCalledWith('DevTools execute: get_status', 'info');
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: DEVTOOLS_RESULT_EVENT,
        id: 'msg-1',
        ok: true,
        action: 'get_status',
        result: { connected: false },
      },
      'https://remnote.com'
    );

    unregister();
    postMessageSpy.mockRestore();
  });

  it('posts errors when execution fails', async () => {
    const execute = vi.fn(async () => {
      throw new Error('Bridge failed');
    });
    const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    const unregister = registerDevToolsBridgeMessageListener({
      execute,
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: DEVTOOLS_EXECUTE_EVENT,
          id: 'msg-2',
          action: 'search',
          payload: { query: 'x' },
        },
        origin: 'https://remnote.com',
        source: window,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: DEVTOOLS_RESULT_EVENT,
        id: 'msg-2',
        ok: false,
        action: 'search',
        error: 'Bridge failed',
      },
      'https://remnote.com'
    );

    unregister();
    postMessageSpy.mockRestore();
  });

  it('ignores invalid postMessage requests without action', async () => {
    const execute = vi.fn(async () => ({}));
    const onLog = vi.fn();
    const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    const unregister = registerDevToolsBridgeMessageListener({
      execute,
      onLog,
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: DEVTOOLS_EXECUTE_EVENT,
          id: 'msg-3',
          payload: { query: 'x' },
        },
        origin: 'https://remnote.com',
        source: window,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(execute).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();
    expect(onLog).toHaveBeenCalledWith('Ignored invalid devtools request (missing action)', 'warn');

    unregister();
    postMessageSpy.mockRestore();
  });
});

describe('TOP_CONSOLE_HELPER', () => {
  it('contains helper function definitions for top context usage', () => {
    expect(TOP_CONSOLE_HELPER).toContain('window.runBridge = async function runBridge');
    expect(TOP_CONSOLE_HELPER).toContain("type: 'remnote:mcp:execute'");
    expect(TOP_CONSOLE_HELPER).toContain('window.runAndLog = async function runAndLog');
  });
});
