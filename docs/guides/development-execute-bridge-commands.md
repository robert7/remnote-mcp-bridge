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

Copy/paste the full contents of:

- `docs/guides/development-execute-bridge-commands-helper.js`

Then run it once in the Developer Console.

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
  query: 'AI assisted coding',
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
