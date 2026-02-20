window.runBridge = async function runBridge(action, payload = {}, opts = {}) {
  const iframe =
    document.querySelector('iframe[src*=":8080"]') ??
    document.querySelector('iframe[src*="localhost"]');

  if (!iframe || !iframe.contentWindow) {
    throw new Error('Bridge plugin iframe not found. Keep the Bridge for MCP & OpenClaw panel open and retry.');
  }

  const id = opts.id ?? 'devtools-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const timeoutMs = opts.timeoutMs ?? 15000;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error('Timed out waiting for result of ' + action + ' (' + id + ')'));
    }, timeoutMs);

    function onMsg(e) {
      if (e.data?.type !== 'remnote:mcp:result') return;
      if (e.data?.id !== id) return;

      clearTimeout(timer);
      window.removeEventListener('message', onMsg);

      if (e.data.ok) {
        resolve(e.data.result);
      } else {
        reject(new Error(e.data.error ?? 'Unknown bridge error'));
      }
    }

    window.addEventListener('message', onMsg);
    iframe.contentWindow.postMessage(
      {
        type: 'remnote:mcp:execute',
        id,
        action,
        payload: payload ?? {},
      },
      '*'
    );
  });
};

window.runAndLog = async function runAndLog(action, payload = {}) {
  try {
    const result = await window.runBridge(action, payload);
    console.log('[' + action + '] result', result);
    return result;
  } catch (e) {
    console.error('[' + action + '] error', e);
    throw e;
  }
};
