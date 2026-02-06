# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RemNote MCP Bridge is a RemNote plugin that implements the Model Context Protocol (MCP), enabling AI assistants
to interact bidirectionally with RemNote knowledge bases. The plugin acts as a WebSocket bridge between an external MCP
server and RemNote's Plugin SDK.

**Architecture Flow:**

```text
AI Assistant ↔ MCP Server (WebSocket) ↔ This Plugin ↔ RemNote SDK ↔ RemNote KB
```

The plugin receives MCP actions via WebSocket (default: ws://127.0.0.1:3002), executes them against the RemNote API, and
returns results.

## Development Commands

```bash
# Development mode with hot reload (starts dev server on :8080)
npm run dev

# Production build (validates plugin, builds, creates PluginZip.zip)
npm run build

# Type checking only (no build)
npm run check-types
```

## Build System Architecture

**Webpack Configuration:**

- Uses `esbuild-loader` for fast TypeScript compilation (target: ES2020)
- Creates **dual entry points** for each widget file in `src/widgets/**/*.tsx`:
  - `widgetname.js` - Standard widget bundle
  - `widgetname-sandbox.js` - Sandboxed version for RemNote's widget isolation
- Development: Uses `style-loader` for hot CSS reloading
- Production: Extracts CSS to separate files via `MiniCssExtractPlugin`
- React Fast Refresh enabled in development mode

**Key Build Details:**

- Plugin validation runs before production builds via `npx remnote-plugin validate`
- Assets copied from `public/` and `README.md` to `dist/`
- Final output zipped to `PluginZip.zip` for RemNote installation
- Dev server runs on port 8080 with hot reload and CORS headers

## Code Architecture

**Entry Point:** `src/widgets/index.tsx`

- Registers plugin settings (auto-tag, journal prefix, WebSocket URL, etc.)
- Registers the right sidebar widget
- Minimal logic - actual widget implementation is separate

**Main UI:** `src/widgets/right_sidebar.tsx`

- Connection status display, session statistics, action history
- Initializes and manages WebSocket client lifecycle
- Renders UI components using RemNote's widget rendering system

**WebSocket Layer:** `src/bridge/websocket-client.ts`

- Bidirectional WebSocket communication with MCP server
- Automatic reconnection with exponential backoff (max 10 attempts)
- Heartbeat handling (ping/pong)
- Request/response correlation via message IDs
- Status callbacks: 'disconnected' | 'connecting' | 'connected'

**RemNote API Adapter:** `src/api/rem-adapter.ts`

- Wraps RemNote Plugin SDK with MCP-compatible interface
- Implements MCP actions: create_note, search, read_note, update_note, append_journal
- Handles auto-tagging, journal prefixes, timestamps based on settings
- Uses RemNote SDK methods: `createRem()`, `findMany()`, `findOne()`, etc.

**Settings:** `src/settings.ts`

- Centralized constants for setting IDs and defaults
- Settings control auto-tagging, journal formatting, WebSocket URL, default parent Rem

## Key Technical Patterns

**Widget Registration:** RemNote plugins use a widget-based architecture. Each widget in `src/widgets/` is automatically
discovered and bundled with both standard and sandboxed versions. Widgets must be explicitly registered in the plugin's
`onActivate` function.

**RemNote Plugin SDK:**

- Access via `plugin` parameter in activation callbacks
- Settings: `plugin.settings.registerBooleanSetting()`, `plugin.settings.registerStringSetting()`
- Rem API: `plugin.rem.findOne()`, `plugin.rem.createRem()`, etc.
- Widget API: `plugin.app.registerWidget()`

**WebSocket Protocol:** Messages are JSON with structure:

```typescript
// Request from server
{ id: string, action: string, payload: Record<string, unknown> }

// Response to server
{ id: string, result?: unknown, error?: string }

// Heartbeat
{ type: 'ping' } / { type: 'pong' }
```

**Settings Access Pattern:**

```typescript
const autoTagEnabled = await plugin.settings.getSetting(SETTING_AUTO_TAG_ENABLED);
```

## Dependencies & Tooling

- **@remnote/plugin-sdk** - RemNote's official plugin development SDK
- **React 17** - UI framework (RemNote uses React 17, not React 18)
- **TypeScript** - Typed codebase with strict configuration
- **Tailwind CSS** - Utility-first styling (configured via PostCSS)
- **webpack + esbuild-loader** - Fast build pipeline

## Development Notes

**Hot Reload:** In dev mode, webpack-dev-server runs on port 8080. Changes to `src/*` trigger hot reload via React Fast
Refresh. CSS changes are injected without page reload.

**Plugin Testing:** RemNote loads the plugin from the dev server URL when in development mode. Use RemNote's developer
console (Cmd+Option+I on macOS) to view logs and debug.

**Common Issues:**

- "Invalid event setCustomCSS" errors in development are cosmetic and don't affect functionality (won't appear in
  production)
- Connection failures: Verify MCP server is running and WebSocket URL is correct
- Widget not appearing: Check widget registration in `index.tsx` and RemNote's plugin settings

**Production Builds:** The build process validates the plugin manifest, bundles all assets, extracts CSS, and creates
a zip file. The zip structure must match RemNote's plugin format (validated by `npx remnote-plugin validate`).

## RemNote-Specific Concepts

**Rem:** The atomic unit in RemNote - a "Rem" is a note/thought/concept

- Each Rem has an ID, text content, and optional children (hierarchical)
- Tags in RemNote are also Rems that reference other Rems

**Daily Documents:** RemNote automatically creates a daily document for each day. The plugin's `append_journal` action
targets "today's" daily document.

**Parent-Child Hierarchy:** Rems can have parent-child relationships. New Rems can be created under a specific parent
or at the root level.
