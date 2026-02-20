# Execute Bridge Commands from RemNote Developer Console (Screenshot Walkthrough)

This is a visual companion to:

- [Execute Bridge Commands from RemNote Developer Console](./development-execute-bridge-commands.md)

If you have not yet run the plugin locally, start with:

- [Run The Plugin Locally (Beginner Guide)](./development-run-plugin-locally.md)

## 1) Keep bridge panel visible

Before running commands from DevTools:

- Make sure the **Bridge for MCP & OpenClaw** panel is visible in RemNote.
- The command executor is registered by that widget runtime.

![Bridge visible and helper source](./images/execute-bridge-console-01-plugin-visible-and-helper-source.jpg)

## 2) Pick your console workflow

### Option A: Iframe context (no paste)

- In DevTools, switch context to `index.html (localhost:8080)`.
- `runBridge` and `runAndLog` are auto-exposed in that context.

### Option B: Top context (paste once)

- Stay in default `top` context.
- Paste the helper snippet logged on plugin startup (`[runBridge v2] Top-console helper ...`) or copy:
  - [`development-execute-bridge-commands-00-top-console-helper.js`](./js/development-execute-bridge-commands-00-top-console-helper.js)

![Select plugin iframe context](./images/execute-bridge-console-02-select-correct-plugin-iframe-context.jpg)

## 3) Run a simple command first (`get_status`)

Run:

```js
await runAndLog('get_status');
```

Expected result: object with fields like `connected` and `pluginVersion`.

![Run get_status and verify](./images/execute-bridge-console-04-run-get-status-and-verify-result.jpg)

## 4) Run command with richer output (`search`)

Run:

```js
await runBridge('search', {
  query: 'AI assisted coding',
  includeContent: true,
});
```

Expected result: `{ results: [...] }` with `remId`, `title`, and optional `content` entries.

![Run search and inspect results](./images/execute-bridge-console-05-run-search-and-inspect-results.jpg)

## Troubleshooting (quick)

- `runBridge is not a function`:
  - Bridge panel not open yet.
  - In top context, helper snippet not pasted yet.
  - In iframe workflow, ensure context is `index.html (localhost:8080)`.
- Timeout after running a command:
  - Ensure bridge panel is visible and the plugin is initialized.
  - In top context, re-paste helper and retry.
- No events/responses:
  - Re-open bridge panel and retry.
  - Confirm command uses a supported action name.

## Related guides

- [Execute Bridge Commands from RemNote Developer Console](./development-execute-bridge-commands.md)
- [Run The Plugin Locally (Beginner Guide)](./development-run-plugin-locally.md)
