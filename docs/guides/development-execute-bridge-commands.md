# Execute Bridge Commands from RemNote Developer Console

Use this guide to execute bridge actions directly from DevTools and inspect raw results, without the MCP server or CLI
in the middle.

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

## Choose a workflow

### Workflow A: Iframe context (zero setup)

1. In DevTools Console, switch context to `index.html (localhost:8080)`.
2. Run commands immediately (`runBridge` / `runAndLog` are auto-exposed on that iframe window).

### Workflow B: Top context (paste once per browser session)

1. Stay in the default `top` console context.
2. Copy and paste the helper snippet printed on plugin startup (`[runBridge v2] Top-console helper ...`) or use:
   - [`development-execute-bridge-commands-00-top-console-helper.js`](./js/development-execute-bridge-commands-00-top-console-helper.js)
3. After one paste, run commands in top context with `runBridge` / `runAndLog`.

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

- `runBridge is not a function`:
  - Bridge panel is not open yet, or plugin initialization has not completed.
  - If you are in top context, paste the helper snippet first.
- `Timed out waiting for result...`:
  - Ensure the **Bridge for MCP & OpenClaw** panel is visible.
  - In top context, re-paste the helper and retry.
  - In iframe workflow, confirm DevTools context is `index.html (localhost:8080)`.
- `Unknown action: ...`: The action string does not match one of the supported names exactly.
- `Note not found: ...`: `remId` does not exist in the current KB.
