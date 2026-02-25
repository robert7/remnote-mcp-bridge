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
2. Open the bridge panel (right sidebar widget: **Automation Bridge (MCP, OpenClaw...)**).
3. Open RemNote Developer Tools:
   - macOS: `Cmd+Option+I`
   - Windows/Linux: `Ctrl+Shift+I`
4. In the Developer Console context picker, select the plugin iframe context (not the top page context).

## Paste once: console helper

Copy/paste the full contents of:

- [`docs/guides/js/development-execute-bridge-commands-00-helper.js`](./js/development-execute-bridge-commands-00-helper.js)

Then run it once in the Developer Console.

## Command examples

All commands below call the same bridge action names supported in `handleRequest`.
The `read_note` and `search` snippets are full-parameter examples so you can quickly toggle values while debugging.
For `search`, `includeContent` supports `"none"` (default), `"markdown"`, and `"structured"`.
The default content-preview depth is `1` for both `"markdown"` and `"structured"` search content modes.

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

### 7) `search_by_tag`

- [`development-execute-bridge-commands-07-search-by-tag.js`](./js/development-execute-bridge-commands-07-search-by-tag.js)

## Troubleshooting

- `Timed out waiting for result...`: Usually wrong console execution context. Re-select plugin iframe context.
- After Chrome/RemNote restart, there can be multiple `index.html (localhost:8080)` contexts in DevTools. If one
  times out, switch to the other `localhost:8080` context, paste helper again, and retry.
- If the bridge widget is not visible/open yet, open the sidebar panel first. The event listener is registered by the
  widget runtime.
- `Unknown action: ...`: The action string does not match one of the supported names exactly.
- `Note not found: ...`: `remId` does not exist in the current KB.
