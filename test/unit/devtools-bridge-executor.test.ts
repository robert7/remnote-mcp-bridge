import { describe, expect, it, vi } from 'vitest';
import {
  DEVTOOLS_EXECUTE_EVENT,
  DEVTOOLS_RESULT_EVENT,
  registerDevToolsBridgeExecutor,
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
