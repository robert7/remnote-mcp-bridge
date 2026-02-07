# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Project Overview

RemNote MCP Bridge is a RemNote plugin that implements the Model Context Protocol (MCP), enabling AI assistants
to interact bidirectionally with RemNote knowledge bases. The plugin acts as a WebSocket bridge between an external MCP
server and RemNote's Plugin SDK.

**Architecture Flow:**

```text
AI Assistant (e.g. Claude Code) ↔ MCP Server (stdio, WebSocket) ↔ This Plugin ↔ RemNote SDK ↔ RemNote KB
```

The plugin receives MCP actions via WebSocket (default: ws://127.0.0.1:3002), executes them against the RemNote API, and
returns results.

## MANDATORY: Code Change Requirements

**ALL code changes MUST follow these requirements (non-negotiable):**

1. **Tests** - Update/add tests for all code changes (no exceptions)
2. **Documentation** - Update docstrings and docs where applicable
3. **Code Quality** - Run linting and formatting checks
4. **Test Execution** - Run test suite to verify changes
5. **Full Code Quality Execution** - Run all code quality checks by executing `./code-quality.sh`
6. **CHANGELOG.md** - Document all functional changes

See **.agents/dev-requirements.md** for detailed guidelines on:

- Planning requirements (what to include in every plan)
- Execution requirements (tests, docs, code quality, verification)

**If you skip any of these steps, the task is INCOMPLETE.**

## CRITICAL: ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in .agents/PLANS.md) from design
to implementation.

## CRITICAL: Git Commit Policy

**DO NOT create git commits unless explicitly requested by the user.**

- You may use `git add`, `git rm`, `git mv`, and other git commands
- You may stage changes and prepare them for commit
- **DO NOT** run `git commit` - the user handles commits manually
- When changes are ready, inform the user: "Changes are staged and ready for you to commit"

**Exceptions - commits ARE allowed ONLY when:**

1. User explicitly requests: "create a commit" or "commit these changes"
2. Using `/create-commit` slash command
3. Using `/create-release` slash command

**IMPORTANT:** Even when exceptions apply:

- Commit messages must NOT include co-authorship attribution
- No "Co-Authored-By: <agent name>" or similar text
- These are the user's commits, not the agent's

See **.agents/dev-workflow.md** for complete Git Commit Policy details.

### Documentation Guidelines

**IMPORTANT**: Before updating any documentation, read `.agents/dev-documentation.md` first.

This file contains critical principles for writing maintainable documentation, including:

- Non-Redundancy Principle (avoid documenting what's obvious from code)
- What belongs in code-level vs developer vs user documentation
- Focus on WHY (design rationale) over WHAT/HOW (implementation details)

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
- MCP server connection issues: Check MCP logs at `~/.claude/debug/mcp-*.log`
- Port conflicts: Use `lsof -i :3002` to check if port is already in use

**Production Builds:** The build process validates the plugin manifest, bundles all assets, extracts CSS, and creates
a zip file. The zip structure must match RemNote's plugin format (validated by `npx remnote-plugin validate`).

## Testing and Code Quality

While this plugin doesn't have the extensive test suite that the MCP server has, code quality is maintained through:

### Build Validation

```bash
# Type checking (must pass before commits)
npm run check-types

# Production build with validation
npm run build
```

The production build includes:

- TypeScript compilation with strict mode
- Plugin manifest validation via `npx remnote-plugin validate`
- Asset bundling and optimization
- Final zip creation

### Development Workflow

1. Make changes to `src/*` files
2. Run `npm run check-types` to verify TypeScript correctness
3. Test in development mode (`npm run dev`) with RemNote
4. Build for production to validate plugin structure
5. Test the production build in RemNote

**IMPORTANT:** Always run type checking before committing changes. TypeScript strict mode catches potential runtime
errors.

## Claude Code Configuration

The MCP server that this plugin connects to is configured in Claude Code via `~/.claude.json`.

### Configuration Format

MCP servers are configured under the `mcpServers` key within project-specific sections:

```json
{
  "projects": {
    "/Users/username/path/to/project": {
      "mcpServers": {
        "remnote": {
          "type": "stdio",
          "command": "remnote-mcp-server",
          "args": [],
          "env": {
            "REMNOTE_WS_PORT": "3002"
          }
        }
      }
    }
  }
}
```

**Important notes:**

- **Global availability:** Use your home directory path to make RemNote tools available in all projects
- **Project-specific:** Use specific project paths to limit availability
- **Old format deprecated:** The separate `~/.claude/.mcp.json` file is no longer used
- **Restart required:** Claude Code must be restarted after configuration changes

### Troubleshooting MCP Configuration

**Configuration not loading:**

1. Verify configuration is in `~/.claude.json` (NOT `~/.claude/.mcp.json`)
2. Check project path matches exactly (use `pwd` to verify)
3. Restart Claude Code completely
4. Check MCP logs: `~/.claude/debug/mcp-*.log`

**Server not starting:**

1. Verify `remnote-mcp-server` is installed globally: `which remnote-mcp-server`
2. Check Node.js is accessible in Claude Code's environment
3. Review MCP logs for startup errors

## RemNote-Specific Concepts

**Rem:** The atomic unit in RemNote - a "Rem" is a note/thought/concept

- Each Rem has an ID, text content, and optional children (hierarchical)
- Tags in RemNote are also Rems that reference other Rems

**Daily Documents:** RemNote automatically creates a daily document for each day. The plugin's `append_journal` action
targets "today's" daily document.

**Parent-Child Hierarchy:** Rems can have parent-child relationships. New Rems can be created under a specific parent
or at the root level.
