import { BridgeRequest } from '../bridge/websocket-client';

export const DEVTOOLS_EXECUTE_EVENT = 'remnote:mcp:execute';
export const DEVTOOLS_RESULT_EVENT = 'remnote:mcp:result';

const LOG_TAG = '[runBridge v2]';

/* ------------------------------------------------------------------ */
/*  Window augmentation for DevTools helper functions                  */
/* ------------------------------------------------------------------ */

interface RunBridgeOptions {
  timeoutMs?: number;
  id?: string;
}

declare global {
  interface Window {
    runBridge?: (
      action: string,
      payload?: Record<string, unknown>,
      opts?: RunBridgeOptions
    ) => Promise<unknown>;
    runAndLog?: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
  }
}

export interface DevToolsExecuteDetail {
  id?: string;
  action?: string;
  payload?: Record<string, unknown>;
}

export interface DevToolsResultDetail {
  id: string;
  ok: boolean;
  action?: string;
  result?: unknown;
  error?: string;
}

export interface DevToolsExecutorConfig {
  target: Window;
  execute: (request: BridgeRequest) => Promise<unknown>;
  onLog?: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

/**
 * Exposes bridge actions to DevTools via window events without adding global functions.
 */
export function registerDevToolsBridgeExecutor(config: DevToolsExecutorConfig): () => void {
  const isTopWindow = config.target !== window;
  console.log(`${LOG_TAG} Registering listener on ${isTopWindow ? 'top' : 'iframe'} window`);

  const listener = async (event: Event): Promise<void> => {
    console.log(`${LOG_TAG} Execute event received`);
    const customEvent = event as CustomEvent<DevToolsExecuteDetail>;
    const detail = customEvent.detail;

    if (!detail || typeof detail.action !== 'string' || !detail.action.trim()) {
      config.onLog?.('Ignored invalid devtools request (missing action)', 'warn');
      return;
    }

    const requestId =
      detail.id ?? `devtools-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request: BridgeRequest = {
      id: requestId,
      action: detail.action,
      payload: detail.payload ?? {},
    };

    config.onLog?.(`DevTools execute: ${request.action}`, 'info');

    try {
      const result = await config.execute(request);
      console.log(`${LOG_TAG} Execute succeeded, dispatching result`);
      const response: DevToolsResultDetail = {
        id: requestId,
        ok: true,
        action: request.action,
        result,
      };
      config.target.dispatchEvent(
        new CustomEvent<DevToolsResultDetail>(DEVTOOLS_RESULT_EVENT, { detail: response })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`${LOG_TAG} Execute failed:`, errorMessage);
      const response: DevToolsResultDetail = {
        id: requestId,
        ok: false,
        action: request.action,
        error: errorMessage,
      };
      config.target.dispatchEvent(
        new CustomEvent<DevToolsResultDetail>(DEVTOOLS_RESULT_EVENT, { detail: response })
      );
    }
  };

  config.target.addEventListener(DEVTOOLS_EXECUTE_EVENT, listener as EventListener);

  return () => {
    config.target.removeEventListener(DEVTOOLS_EXECUTE_EVENT, listener as EventListener);
  };
}

/**
 * Assigns `runBridge` and `runAndLog` on the target window so DevTools
 * users can call them directly without pasting a helper script first.
 *
 * Returns a cleanup function that removes both from `window`.
 */
export function exposeDevToolsHelpers(target: Window): () => void {
  target.runBridge = async (
    action: string,
    payload: Record<string, unknown> = {},
    opts: RunBridgeOptions = {}
  ): Promise<unknown> => {
    console.log(`${LOG_TAG} action=${action}, target=${target === window ? 'iframe' : 'top'}`);
    const timeoutMs = opts.timeoutMs ?? 15_000;
    const id = opts.id ?? `devtools-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        target.removeEventListener(DEVTOOLS_RESULT_EVENT, onResult);
        reject(new Error(`Timed out waiting for result of ${action} (${id})`));
      }, timeoutMs);

      function onResult(event: Event): void {
        const detail = (event as CustomEvent<DevToolsResultDetail>).detail;
        if (!detail || detail.id !== id) return;

        clearTimeout(timer);
        target.removeEventListener(DEVTOOLS_RESULT_EVENT, onResult);

        if (detail.ok) {
          resolve(detail.result);
        } else {
          reject(new Error(detail.error ?? 'Unknown bridge error'));
        }
      }

      target.addEventListener(DEVTOOLS_RESULT_EVENT, onResult);
      target.dispatchEvent(
        new CustomEvent<DevToolsExecuteDetail>(DEVTOOLS_EXECUTE_EVENT, {
          detail: { id, action, payload },
        })
      );
    });
  };

  target.runAndLog = async (
    action: string,
    payload: Record<string, unknown> = {}
  ): Promise<unknown> => {
    try {
      const result = await target.runBridge!(action, payload);
      console.log(`${LOG_TAG} [${action}] result`, result);
      return result;
    } catch (error) {
      console.error(`${LOG_TAG} [${action}] error`, error);
      throw error;
    }
  };

  return () => {
    delete target.runBridge;
    delete target.runAndLog;
  };
}
