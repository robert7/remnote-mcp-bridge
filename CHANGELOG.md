# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Automatic version compatibility**: Bridge sends a `hello` message with its version on WebSocket connect, enabling
  consumers (MCP server, CLI) to detect version mismatches and warn users.

### Enhanced

- **Unified content rendering**: `remnote_read_note` now returns rendered markdown content of the child subtree in
  the `content` field (replaces redundant title echo and removed `children` array).
- `remnote_search` supports `includeContent: "markdown"` to render child subtrees as indented markdown previews.
- `remnote_search` now also supports `includeContent: "structured"` via `contentStructured` (child subtree with
  nested `remId`s and metadata for follow-up reads/navigation).
- New `headline` field in both search and read outputs: display-oriented full line with type-aware delimiters
  (concept = `::`, descriptor = `;;`, others = `>>`).
- New `aliases` field surfaces alternate names from `rem.getAliases()`.
- New `contentProperties` object reports `childrenRendered`, `childrenTotal` (capped at 2000), and `contentTruncated`.
- New tuning parameters: `childLimit` (per-level child cap), `maxContentLength` (character limit for rendered content).

### Changed

- **BREAKING**: `includeContent` parameter changed from `boolean` to `'none' | 'markdown'` string enum.
- **BREAKING**: `children` array removed from `readNote` response (use `content` in markdown mode instead).
- **BREAKING**: `content` field in `readNote` changed from echoing `title` to rendered markdown of child subtree.
- **BREAKING**: `detail` field removed from `remnote_search` and `remnote_read_note` outputs (use `headline` for display rendering).
- Default `depth` for `readNote` increased from 3 to 5.
- Search defaults: `depth=1`, `childLimit=20`, `maxContentLength=3000`.
- Read defaults: `depth=5`, `childLimit=100`, `maxContentLength=100000`.
- Removed internal `getContentPreview()`, `getChildrenRecursive()`, and `NoteChild` interface.
- Updated `remnote_search` ordering priority to `document`/`concept` (same top level), then
  `dailyDocument`, `portal`, `descriptor`, and `text`; ties within each priority bucket continue to preserve SDK order.
- `remnote_search` now oversamples SDK requests by 2x requested `limit`, deduplicates by `remId`, and trims back to
  requested `limit` to reduce underfilled unique result sets from duplicate SDK hits.
- Search/read now reject unsupported `includeContent` values with explicit errors instead of silently omitting content.

### Documentation

- Updated `docs/reference/remnote/bridge-search-read-contract.md` with new fields (`headline`, `aliases`,
  `content`, `contentProperties`), rendering modes, parameter defaults, and breaking change summary.
- Extended search/read contract docs and DevTools execution guides for `search includeContent: "structured"` and the
  search oversample+dedupe+trim behavior.
- Updated search/read contract docs to reflect `detail` field removal and search content preview default depth of 1.
- Updated DevTools JS command snippets for `search` / `read_note` to use string `includeContent` and show all content-rendering parameters.
- Added a new beginner guide for installing the plugin via the RemNote marketplace with screenshot walkthrough.
- Updated local-development plugin install guide to cross-link the marketplace guide and emphasize required companion
  MCP server / CLI setup (with install+demo links for both paths).
- Updated `README.md` installation docs to surface both plugin install paths (marketplace vs local development).
- Added a canonical bridge/consumer version compatibility guide for `0.x` semver and linked it from plugin install + companion setup docs.

## [0.5.0] - 2026-02-21

### Enhanced

- `remnote_search` and `remnote_read_note` now render richer titles from RemNote rich text (references, global names,
  media placeholders, LaTeX/annotation text, and markdown formatting for inline emphasis/links).
- Added structured result metadata for retrieval workflows:
  - `detail` (back/descriptor text)
  - `remType` (`document`, `dailyDocument`, `concept`, `descriptor`, `portal`, `text`)
  - `cardDirection` (`forward`, `reverse`, `bidirectional`; omitted when not applicable)

### Changed

- Plugin branding renamed to **RemNote Automation Bridge** with display name
  **Automation Bridge (MCP, OpenClaw...)**.
- Search default limit increased from 20 to 50.
- Search results are grouped by `remType` priority while preserving SDK ordering within each group.
- Journal default prefix is now empty; entries no longer include a leading space when no prefix is configured.

### Fixed

- Search results are deduplicated by `remId`.
- Circular-reference detection in rich-text resolution no longer produces false positives for repeated sibling
  references.
- `detail` extraction now falls back to inline card-delimiter content when `backText` is unavailable.

### Documentation

- Added and linked a canonical search/read output contract reference:
  - `docs/reference/remnote/bridge-search-read-contract.md`
- Consolidated developer guidance for local plugin execution and DevTools command workflows in `docs/guides/`.
- Updated `README.md` opening description to position the plugin as a generic/extensible external automation bridge
  (MCP server, CLI, and broader automation flows), not AI-assistant-only.

## [0.4.2] - 2026-02-18

### Changed

- Renamed plugin display name to **RemNote Bridge for MCP & OpenClaw** in `public/manifest.json`
- Updated in-plugin control panel title to **Bridge for MCP & OpenClaw** for naming consistency
- Added `prettier` to `devDependencies` so formatting checks use an explicit pinned tool dependency

### Documentation

- Updated `README.md` branding from "RemNote MCP Bridge Plus" to **RemNote Bridge for MCP & OpenClaw**
- Added a prominent note about the new OpenClaw integration direction (planned CLI companion)
- Reworked architecture messaging into integration paths:
  - MCP path available now (plugin + MCP server)
  - OpenClaw path planned (future CLI companion using same WebSocket bridge)
- Updated installation/configuration wording to use the new plugin name consistently
- Updated `AGENTS.md` project overview to reference **RemNote Bridge for MCP & OpenClaw**

## [0.4.1] - 2026-02-12

### Added

- Build script (`build-plugin-zip.sh`) for creating plugin zip with defensive error checking
  - Cleans up existing build artifacts (PluginZip.zip, dist folder)
  - Ensures Node.js environment is available
  - Runs full production build and creates PluginZip.zip
  - Comprehensive error checking and colored output

### Removed

- Sample pizza widget (`sample_pizza_widget.tsx`)
  - Removed test widget that was used during sidebar UI development
  - No longer needed now that main widget functionality is verified

## [0.4.0] - 2026-02-12

### Added

- MCP Bridge icon in right sidebar toolbar
  - Icon displays with clear visual identification using local SVG (`mcp-icon.svg`)
  - Click icon to toggle MCP Bridge control panel in sidebar
  - Icon provides quick visual access and better UX consistency with RemNote plugins
- Pizza widget replica kept as simple reference implementation
  - Displays static random content (name, pizza preference, favorite number)
  - Minimal working sidebar widget as fallback reference
  - Preserved for future debugging if sidebar UI issues recur

### Changed

- MCP Bridge widget now accessible exclusively via sidebar icon
  - Click icon in right sidebar toolbar for persistent monitoring
  - Panel displays connection status, statistics, history, and logs
  - Remains visible while navigating RemNote (non-blocking)

### Removed

- Popup mode and command palette access ("Open MCP Bridge Control Panel" command)
  - Simplified UX by consolidating to single sidebar access point
  - Eliminates potential state conflicts from multiple widget instances
  - Popup registration and command code kept commented in source for future reference

### Changed

- Consolidated version management to use single source of truth
  - Version now injected at build time from `package.json` via webpack DefinePlugin
  - Removed hardcoded version "1.1.0" from `rem-adapter.ts` (was out of sync with package version 0.3.2)
  - Plugin now correctly reports version 0.3.2 via `getStatus()`
  - Reduced manual steps in release process from 3 locations to 2 (package.json and manifest.json)
  - Added vitest config to define `__PLUGIN_VERSION__` constant for test environment
- MCP Bridge UI now accessible via sidebar icon (preferred method)
  - Clicking icon toggles control panel in right sidebar
  - Removed "Open MCP Bridge Control Panel in Sidebar" command (redundant with icon)
  - Command palette access ("Open MCP Bridge Control Panel") still available for popup mode

### Documentation

- Added Node.js environment access note to CLAUDE.md "Development Commands" section
  - Documents requirement to `source node-check.sh` when Node.js/npm not available in shell environment
  - Critical for AI agents running in environments without Node.js in PATH
- Updated CLAUDE.md "Release Version Updates" section to reflect automated version injection
- Corrected "Important Limitations" section in README.md
  - Fixed incorrect statement about 1:1:1 relationship limiting to one AI agent
  - Clarified that multiple AI agents CAN connect to the MCP server simultaneously
  - Explained that the limitation is single RemNote plugin connection, not AI agent count
  - Updated to reflect MCP server's HTTP Streamable transport supporting multiple concurrent sessions
  - Updated documentation link from `#important-limitations` to `#multi-agent-support`
- Updated README.md usage instructions
  - Added sidebar icon as primary access method
  - Documented both access methods: icon click (sidebar) and command palette (popup)
  - Clarified when to use each method (persistent monitoring vs quick checks)

## [0.3.2] - 2026-02-11

### Changed

- Updated manifest, modified plugin name to "MCP Bridge Plus", to make it distinct from the original version by Quentin
  Tousart

## [0.3.1] - 2026-02-11

### Changed

- Updated manifest description to inform users about companion MCP server requirement
  - Changed from "...directly from your AI." to "...from your AI. Requires companion MCP server."
  - Critical information for users to understand two-part architecture before installation

## [0.3.0] - 2026-02-11

### Added

- New command: "Open MCP Bridge Control Panel in Sidebar"
  - Opens the MCP Bridge widget in RemNote's right sidebar
  - Accessible via Ctrl-K/Cmd-K → search for "Open MCP Bridge Control Panel in Sidebar"
  - Widget can now be opened as both popup (existing) and sidebar (new)
  - Each instance maintains independent state (separate WebSocket clients, logs, stats)
- Toast notifications when opening Control Panel
  - Shows "Opening MCP Bridge Control Panel..." for immediate user feedback
  - Applies to both popup and sidebar commands
- Testing infrastructure
  - Comprehensive test suite with 78 tests covering all core modules
  - Unit tests for WebSocket client, RemAdapter, settings, and widget registration
  - Test coverage at 96.84% (lines), 86.13% (branches), 96.55% (functions)
  - Automated code quality checks via `code-quality.sh` script
  - GitHub Actions CI workflow for continuous integration
  - Test utilities: mocks, fixtures, and helpers for async operations
  - Coverage badges in README (CI status and Codecov)
- Code quality tooling
  - ESLint configuration with TypeScript support
  - Prettier code formatting with project standards
  - Vitest testing framework with happy-dom for React component testing
  - NPM scripts for testing, linting, formatting, and coverage
  - Automated quality gates: typecheck, lint, format check, tests, coverage

### Changed

- Updated manifest
- Widget file renamed from `mcp_bridge_popup.tsx` to `mcp_bridge.tsx` to reflect dual-location capability
- Widget now registered at both Popup and RightSidebar locations with appropriate dimensions
- README.md improvements
  - Documented both popup and sidebar commands
  - Added usage guidance (use only one mode at a time)
  - Clarified differences between popup (modal, quick access) and sidebar (persistent, non-blocking)
  - Added Data Privacy section explaining data flow from RemNote through local MCP server to AI assistant
- Documentation improvements
  - Updated README.md with comprehensive installation instructions from MCP server documentation
  - Added demo section linking to server repository demo
  - Enhanced troubleshooting section with detailed scenarios and solutions
  - Updated Claude Code configuration to use `~/.claude.json` format with projects structure
  - Added "Important Limitations" section explaining 1:1:1 relationship constraint
  - Improved architecture explanation including stdio transport details
  - Updated repository references from `quentintou` to `robert7`
  - Added "Release Version Updates" section to CLAUDE.md documenting the 3 locations where version must be updated during
    release creation (package.json, public/manifest.json, CHANGELOG.md)
- Revised AGENTS.md (CLAUDE.md) to follow non-redundancy principle
  - Removed code-redundant implementation details (~150 lines)
  - Focused on design rationale (WHY) instead of implementation details (WHAT/HOW)
  - Simplified "Code Architecture" to "Architecture Notes" with rationale only
  - Simplified "Build System Architecture" to "Build System Notes" with design decisions
  - Removed redundant "Settings Access Pattern", "WebSocket Protocol" structure, and "RemNote Plugin SDK" sections
  - Streamlined "Development Commands" and "Dependencies & Tooling" sections
  - Consolidated "Development Notes" and "Production Builds" into "Common Issues"
  - Revised "Testing and Code Quality" to explain WHY minimal runtime tests
  - Preserved all MANDATORY/CRITICAL sections and troubleshooting content
  - Added rationale for dual widget bundles, exponential backoff, and content-to-child-Rems conversion

## [0.2.0] - 2025-02-07

### Changed

- Widget moved from right sidebar to popup activated by command palette
  - New command: "Open MCP Bridge Control Panel"
  - Accessible via Ctrl-K/Cmd-K → search for "Open MCP Bridge Control Panel"
  - Improves UI/UX by reducing sidebar clutter

### Added

- Documentation files (AGENTS.md, docs/notes.md)
- Helper utilities

### Initial Features (v0.1.0)

- WebSocket bridge to MCP server (port 3002)
- MCP tool implementations:
  - `remnote_create_note` - Create notes with optional parent and tags
  - `remnote_search` - Full-text knowledge base search
  - `remnote_read_note` - Read note content and children
  - `remnote_update_note` - Update title, append content, manage tags
  - `remnote_append_journal` - Append to daily document
  - `remnote_status` - Connection status check
- Plugin settings:
  - Auto-tagging for MCP-created notes
  - Journal entry prefix customization
  - Timestamp configuration for journal entries
  - WebSocket server URL configuration
  - Default parent Rem ID setting
- Session statistics tracking
- Action history (last 10 actions with timestamps)
- Connection status indicator
- Auto-reconnect with exponential backoff
