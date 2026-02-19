import { BridgeRequest } from '../bridge/websocket-client';

export const DEVTOOLS_EXECUTE_EVENT = 'remnote:mcp:execute';
export const DEVTOOLS_RESULT_EVENT = 'remnote:mcp:result';

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
  const listener = async (event: Event): Promise<void> => {
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
