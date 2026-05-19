# Execute Bridge Commands from RemNote Developer Console (Screenshot Walkthrough)

This is a visual companion to:

- [Execute Bridge Commands from RemNote Developer Console](./development-execute-bridge-commands.md)

If you have not yet run the plugin locally, start with:

- [Run The Plugin Locally (Beginner Guide)](./development-run-plugin-locally.md)

## 1) Open helper source and optionally keep the bridge panel visible

Before running commands from DevTools:

- The **Automation Bridge (OpenClaw, CLI, MCP...)** panel is optional. Keep it visible only if you want live status
  and logs while debugging.
- Open helper source file so you can copy it easily:
  - [`docs/guides/js/development-execute-bridge-commands-00-helper.js`](./js/development-execute-bridge-commands-00-helper.js)

![Bridge visible and helper source](./images/execute-bridge-console-01-plugin-visible-and-helper-source.jpg)

## 2) Select the correct `localhost:8080` console context

In Chrome DevTools Console context picker:

- You will usually see two `index.html (localhost:8080)` entries.
- Choose the one that does **not** highlight the visible Automation Bridge sidebar/plugin iframe.
- If selecting the context highlights the visible plugin/sidebar, that is the wrong context for these helper scripts
  and will usually cause timeouts.
- If `await runAndLog('get_status')` times out, switch to the other `localhost:8080` entry, paste helper again, and
  retry.

![Select non-highlighted localhost context](./images/execute-bridge-console-02a-select-non-highlighted-localhost-context.jpg)

## 3) Paste helper into console

Paste and run the full helper code from the helper file once in that context.

Expected result: object with fields like `connected` and `pluginVersion`
as `await runAndLog('get_status');` was called at the end of the helper script.

![Successful get_status in correct context](./images/execute-bridge-console-02b-correct-context-get-status-success.jpg)

## 4) Run command with richer output (`search`)

Run:

```js
await runBridge('search', {
  query: 'AI assisted coding',
  contentMode: 'markdown',
});
```

Expected result: `{ results: [...] }` with `remId`, `title`, and optional `content` (markdown) or
`contentStructured` entries depending on `contentMode`.

![Run search and inspect results](./images/execute-bridge-console-05-run-search-and-inspect-results.jpg)

## Troubleshooting (quick)

- Timeout after helper paste:
  - Usually wrong `localhost:8080` context selected.
  - If the selected context highlights the visible Automation Bridge sidebar/plugin, switch to the other
    `localhost:8080` entry.
  - Re-select the other `index.html (localhost:8080)` entry, paste helper again, retry.
- No events/responses:
  - The bridge runtime should already be active in the background.
  - If you want a quick visual sanity check, open the Automation Bridge panel and compare its status/logs.
- Helper functions undefined:
  - Paste helper again in the currently selected console context.

## Related guides

- [Execute Bridge Commands from RemNote Developer Console](./development-execute-bridge-commands.md)
- [Connection Lifecycle Guide](./connection-lifecycle.md)
- [Run The Plugin Locally (Beginner Guide)](./development-run-plugin-locally.md)
