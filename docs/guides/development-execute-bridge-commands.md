# Execute Bridge Commands from RemNote Developer Console

Use this guide to execute bridge actions directly inside the RemNote plugin runtime console context and inspect raw
results, without the MCP server or CLI in the middle.

Visual walkthrough:

- [Execute Bridge Commands from RemNote Developer Console (Screenshot Walkthrough)](./development-execute-bridge-commands-screenshots.md)

## Why this exists

This path runs through the same action handler used by WebSocket requests in `src/widgets/mcp_bridge.tsx`
(`handleRequest`), so you can validate whether result issues come from the bridge plugin itself.

## Prerequisites

1. Start RemNote with this plugin enabled.
2. Open RemNote Developer Tools:
   - macOS: `Cmd+Option+I`
   - Windows/Linux: `Ctrl+Shift+I`
3. In the Developer Console context picker, select the non-highlighted plugin runtime context:
   - You will usually see two `index.html (localhost:8080)` entries.
   - Choose the one that does **not** highlight the visible Automation Bridge sidebar/plugin iframe.
   - If selecting a context highlights the visible sidebar/plugin, that is usually the wrong one for these helper
     scripts and requests will time out.

The bridge runtime now starts automatically on plugin activation. Opening the Automation Bridge sidebar panel is
optional here and mainly helps if you want to keep status/logs visible while debugging. For connection and reconnect
behavior, see the [Connection Lifecycle Guide](./connection-lifecycle.md).

## Paste once: console helper

Copy/paste the full contents of:

- [`docs/guides/js/development-execute-bridge-commands-00-helper.js`](./js/development-execute-bridge-commands-00-helper.js)

Then run it once in the Developer Console.

## Command examples

All commands below call the same bridge action names supported in `handleRequest`.
The `read_note` and `search` snippets are full-parameter examples so you can quickly toggle values while debugging.
For `search`, `contentMode` supports `"none"` (default), `"markdown"`, and `"structured"`.
The default content-preview depth is `1` for both `"markdown"` and `"structured"` search content modes.
Markdown-capable write fields support exact Rem references with `[[id:<remId>]]`; the bridge validates the ID and writes
a real Rem reference instead of letting RemNote resolve `[[...]]` by name.

### 1) `get_status`

- [`development-execute-bridge-commands-01-get-status.js`](./js/development-execute-bridge-commands-01-get-status.js)

### 2) `create_note`

- [`development-execute-bridge-commands-02-create-note.js`](./js/development-execute-bridge-commands-02-create-note.js)

### 3) `read_note`

Use a known Rem ID (for example `testRemId` from `create_note`).

- [`development-execute-bridge-commands-03-read-note.js`](./js/development-execute-bridge-commands-03-read-note.js)

### 4) `update_note`

- [`development-execute-bridge-commands-04-update-note.js`](./js/development-execute-bridge-commands-04-update-note.js)

### 5) Split write actions

- [`development-execute-bridge-commands-04-insert-children.js`](./js/development-execute-bridge-commands-04-insert-children.js)
- [`development-execute-bridge-commands-04-replace-children.js`](./js/development-execute-bridge-commands-04-replace-children.js)
- [`development-execute-bridge-commands-04-update-tags.js`](./js/development-execute-bridge-commands-04-update-tags.js)
- [`development-execute-bridge-commands-04-set-property.js`](./js/development-execute-bridge-commands-04-set-property.js)

Use `insert_children` for ordered additions that preserve existing child Rem IDs. Use `replace_children` only for
explicitly approved destructive direct-child replacement. Use `update_tags` with exact tag Rem IDs for production
tagging workflows. Use `set_property` with exact target/tag/property Rem IDs when setting values on property-bearing
tags or Advanced Tables.

### 6) `search`

- [`development-execute-bridge-commands-05-search.js`](./js/development-execute-bridge-commands-05-search.js)

### 7) `append_journal`

- [`development-execute-bridge-commands-06-append-journal.js`](./js/development-execute-bridge-commands-06-append-journal.js)

### 8) `search_by_tag`

- [`development-execute-bridge-commands-07-search-by-tag.js`](./js/development-execute-bridge-commands-07-search-by-tag.js)

## Troubleshooting

- `Timed out waiting for result...`: Usually wrong console execution context. Re-select the non-highlighted
  `localhost:8080` plugin runtime context.
- If the selected `localhost:8080` context highlights the visible Automation Bridge sidebar/plugin, switch to the
  other `localhost:8080` entry.
- After Chrome/RemNote restart, there can be multiple `index.html (localhost:8080)` contexts in DevTools. If one
  times out, switch to the other `localhost:8080` context, paste helper again, and retry.
- If you want a visual connection check while debugging, open the Automation Bridge panel. The background runtime still
  exists even when the panel stays closed.
- `Unknown action: ...`: The action string does not match one of the supported names exactly.
- `Note not found: ...`: `remId` does not exist in the current KB.
