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

## MANDATORY: Documentation Change Requirements

**Before making ANY documentation change, you MUST read .agents/dev-documentation.md** for documentation standards and
guidelines.

**ALL documentation changes MUST be documented in CHANGELOG.md** - this includes updates to:

- Documentation files in `docs/` and `.agents/`
- README.md and other markdown files
- Docstrings and code comments (when updated without functional changes)

**No exceptions** - if you update documentation, you update CHANGELOG.md.

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

## Release Version Updates

When creating a new release, update version in these 2 locations:

1. **package.json** - `"version": "X.Y.Z"` (npm semver format)
2. **public/manifest.json** - `"version": { "major": X, "minor": Y, "patch": Z }` (RemNote format)
3. **CHANGELOG.md** - Move `[Unreleased]` content to `## [X.Y.Z] - YYYY-MM-DD` section

### Documentation Guidelines

**IMPORTANT**: Before updating any documentation, read `.agents/dev-documentation.md` first.

This file contains critical principles for writing maintainable documentation, including:

- Non-Redundancy Principle (avoid documenting what's obvious from code)
- What belongs in code-level vs developer vs user documentation
- Focus on WHY (design rationale) over WHAT/HOW (implementation details)

## Development Commands

```bash
npm run dev          # Development mode with hot reload (:8080)
npm run build        # Production build (validates, bundles, creates zip)
npm run check-types  # TypeScript type checking only
```

See `package.json` for complete script definitions.

## Build System Notes

**Why esbuild-loader?** Fast TypeScript compilation without separate tsc step.

**Why dual entry points?** Each widget in `src/widgets/**/*.tsx` generates both `widgetname.js` and
`widgetname-sandbox.js` to support RemNote's widget isolation model.

**Target:** ES2020 (RemNote compatibility requirement)

See `webpack.config.js` for build configuration details.

## Architecture Notes

**Why dual widget bundles?** RemNote's security model requires both standard and sandboxed versions of each widget for
isolated execution contexts.

**Why exponential backoff in WebSocket client?** Prevents thundering herd during MCP server restarts. Uses jitter
to distribute reconnection attempts.

**Why convert content to child Rems?** (in `rem-adapter.ts`) Maintains RemNote's hierarchical structure, supports rich
formatting per line, and enables independent tagging of content blocks.

**Key files:**

- `src/widgets/index.tsx` - Plugin entry point
- `src/widgets/right_sidebar.tsx` - Main UI widget
- `src/bridge/websocket-client.ts` - WebSocket client with reconnection logic
- `src/api/rem-adapter.ts` - MCP-to-RemNote SDK adapter
- `src/settings.ts` - Plugin settings constants

## Key Technical Patterns

**Widget Registration:** RemNote plugins use a widget-based architecture. Each widget in `src/widgets/` is automatically
discovered and bundled with both standard and sandboxed versions. Widgets must be explicitly registered in the plugin's
`onActivate` function.

## Dependencies & Tooling

- **@remnote/plugin-sdk** - RemNote's official plugin SDK
- **React 17** - RemNote requires React 17 (not React 18)
- **TypeScript** - Strict mode enabled
- **Tailwind CSS** - Configured via PostCSS
- **webpack + esbuild-loader** - Build pipeline

See `package.json` for complete dependency list.

## Common Issues

- "Invalid event setCustomCSS" errors in development are cosmetic and don't affect functionality (won't appear in
  production)
- Connection failures: Verify MCP server is running and WebSocket URL is correct
- Widget not appearing: Check widget registration in `index.tsx` and RemNote's plugin settings
- MCP server connection issues: Check MCP logs at `~/.claude/debug/mcp-*.log`
- Port conflicts: Use `lsof -i :3002` to check if port is already in use

## Testing and Code Quality

This plugin maintains code quality through build-time validation rather than extensive runtime tests.

**Validation workflow:**

1. TypeScript strict mode type checking (`npm run check-types`)
2. Plugin manifest validation (`npx remnote-plugin validate`)
3. Manual testing in RemNote (dev mode and production build)

**Why minimal runtime tests?** The plugin is a thin bridge between MCP and RemNote SDK. Most logic is SDK method calls,
which RemNote tests. Manual testing in RemNote catches integration issues more effectively than mocking the SDK.

**IMPORTANT:** Always run type checking before committing changes.

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
