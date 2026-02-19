# Execute Bridge Commands from RemNote Developer Console

Use this guide to execute bridge actions directly inside the RemNote plugin iframe and inspect raw results, without the
MCP server or CLI in the middle.

## Why this exists

This path runs through the same action handler used by WebSocket requests in `src/widgets/mcp_bridge.tsx`
(`handleRequest`), so you can validate whether result issues come from the bridge plugin itself.

## Prerequisites

1. Start RemNote with this plugin enabled.
2. Open the bridge panel (right sidebar widget: **Bridge for MCP & OpenClaw**).
3. Open RemNote Developer Tools:
   - macOS: `Cmd+Option+I`
   - Windows/Linux: `Ctrl+Shift+I`
4. In the Developer Console context picker, select the plugin iframe context (not the top page context).

## Paste once: console helper

Paste this in the Developer Console first:

```js
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


// Optional convenience wrapper:
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
```

## Command examples

All commands below call the same bridge action names supported in `handleRequest`.

### 1) `get_status`

```js
await runAndLog('get_status');
```

### 2) `create_note`

```js
const created = await runAndLog('create_note', {
  title: 'DevTools test note',
  content: 'Line 1\nLine 2',
  tags: ['MCP', 'devtools'],
  // parentId: 'YOUR_PARENT_REM_ID',
});

// Save for follow-up commands
const testRemId = created.remId;
```

### 3) `read_note`

Use a known Rem ID (for example `testRemId` from `create_note`).

```js
await runAndLog('read_note', {
  remId: testRemId,
  depth: 2,
});
```

### 4) `update_note`

```js
await runAndLog('update_note', {
  remId: testRemId,
  title: 'DevTools test note (updated)',
  appendContent: 'Appended line from DevTools',
  addTags: ['updated-from-console'],
  removeTags: ['devtools'],
});
```

### 5) `search`

```js
await runAndLog('search', {
  query: 'DevTools test note',
  limit: 10,
  includeContent: true,
});
```

### 6) `append_journal`

```js
await runAndLog('append_journal', {
  content: 'Journal line written from RemNote DevTools console',
  timestamp: true,
});
```

## Quick end-to-end smoke flow

```js
const created = await runBridge('create_note', {
  title: 'Bridge smoke flow',
  content: 'Created from DevTools',
  tags: ['smoke'],
});

await runBridge('read_note', { remId: created.remId, depth: 2 });
await runBridge('update_note', {
  remId: created.remId,
  appendContent: 'Updated from smoke flow',
});
await runBridge('search', {
  query: 'Bridge smoke flow',
  includeContent: true,
});
await runBridge('append_journal', {
  content: `Smoke flow completed for ${created.remId}`,
  timestamp: false,
});
await runBridge('get_status');
```

## Troubleshooting

- `Timed out waiting for result...`: Usually wrong console execution context. Re-select plugin iframe context.
- `Unknown action: ...`: The action string does not match one of the supported names exactly.
- `Note not found: ...`: `remId` does not exist in the current KB.
- No response events at all: ensure the bridge widget is open; the event listener is registered by the widget runtime.
