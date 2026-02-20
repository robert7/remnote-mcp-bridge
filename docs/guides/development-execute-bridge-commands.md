# Execute Bridge Commands from RemNote Developer Console

Use this guide to execute bridge actions directly inside the RemNote plugin iframe and inspect raw results, without the
MCP server or CLI in the middle.

Visual walkthrough:

- [Execute Bridge Commands from RemNote Developer Console (Screenshot Walkthrough)](./development-execute-bridge-commands-screenshots.md)

## Why this exists

This path runs through the same action handler used by WebSocket requests in `src/widgets/mcp_bridge.tsx`
(`handleRequest`), so you can validate whether result issues come from the bridge plugin itself.

## Prerequisites

1. Start RemNote with this plugin enabled.
2. Open the bridge panel (right sidebar widget: **Bridge for MCP & OpenClaw**).
3. Open RemNote Developer Tools:
   - macOS: `Cmd+Option+I`
   - Windows/Linux: `Ctrl+Shift+I`

The helper functions `runBridge(action, payload?, opts?)` and `runAndLog(action, payload?)` are automatically available
on the **top window** once the bridge panel is open — no manual paste step and no iframe context switching required.
Just open the Console and start typing.

## Command examples

All commands below call the same bridge action names supported in `handleRequest`.

### 1) `get_status`

- [`development-execute-bridge-commands-01-get-status.js`](./js/development-execute-bridge-commands-01-get-status.js)

### 2) `create_note`

- [`development-execute-bridge-commands-02-create-note.js`](./js/development-execute-bridge-commands-02-create-note.js)

### 3) `read_note`

Use a known Rem ID (for example `testRemId` from `create_note`).

- [`development-execute-bridge-commands-03-read-note.js`](./js/development-execute-bridge-commands-03-read-note.js)

### 4) `update_note`

- [`development-execute-bridge-commands-04-update-note.js`](./js/development-execute-bridge-commands-04-update-note.js)

### 5) `search`

- [`development-execute-bridge-commands-05-search.js`](./js/development-execute-bridge-commands-05-search.js)

### 6) `append_journal`

- [`development-execute-bridge-commands-06-append-journal.js`](./js/development-execute-bridge-commands-06-append-journal.js)

## Troubleshooting

- `runBridge is not a function`: The bridge sidebar panel is not open yet, or the plugin has not finished
  initializing. Open the **Bridge for MCP & OpenClaw** panel first — the helpers are registered by the widget runtime.
- `Timed out waiting for result...`: Ensure the bridge panel is visible. If running in a restrictive sandbox where
  `window.top` is cross-origin, the helpers fall back to the iframe `window` — in that case, switch to the plugin
  iframe context (`index.html (localhost:8080)`) in the DevTools context picker.
- `Unknown action: ...`: The action string does not match one of the supported names exactly.
- `Note not found: ...`: `remId` does not exist in the current KB.
