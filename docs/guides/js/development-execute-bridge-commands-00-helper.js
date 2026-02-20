const BRIDGE_EXECUTE_EVENT = 'remnote:mcp:execute';
const BRIDGE_RESULT_EVENT = 'remnote:mcp:result';

async function runBridge(action, payload = {}, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const id = opts.id ?? `devtools-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener(BRIDGE_RESULT_EVENT, onResult);
      reject(new Error(`Timed out waiting for result of ${action} (${id})`));
    }, timeoutMs);

    function onResult(event) {
      const detail = event?.detail;
      if (!detail || detail.id !== id) return;

      clearTimeout(timer);
      window.removeEventListener(BRIDGE_RESULT_EVENT, onResult);

      if (detail.ok) {
        resolve(detail.result);
      } else {
        reject(new Error(detail.error || 'Unknown bridge error'));
      }
    }

    window.addEventListener(BRIDGE_RESULT_EVENT, onResult);
    window.dispatchEvent(
      new CustomEvent(BRIDGE_EXECUTE_EVENT, {
        detail: { id, action, payload },
      })
    );
  });
}

async function runAndLog(action, payload = {}) {
  try {
    const result = await runBridge(action, payload);
    console.log(`[${action}] result`, result);
    return result;
  } catch (error) {
    console.error(`[${action}] error`, error);
    throw error;
  }
}
