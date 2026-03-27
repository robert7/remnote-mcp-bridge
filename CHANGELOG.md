# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added bridge support for `read_table`, including Advanced Table lookup by Rem ID or exact title, pagination, and
  column filtering.

### Changed
- Improved the Recent Actions panel in the sidebar, including a more reliable copy-reference action. Thanks @Twb06.
- Updated `read_table` bridge payloads to require exactly one explicit identifier: `tableRemId` or `tableTitle`.
- Tightened the sidebar connection card to show bridge version, optional `dev` install marker, and connected
  companion identity/version with less explanatory text while keeping a brief connection-direction hint when
  disconnected.

### Fixed
- Fixed Recent Actions expansion so expanded rows stay attached to the correct history entry as new actions arrive.
- Improved `read_table` title lookup for Advanced Tables nested under wrapper/container rems.

### Documentation
- Added a dedicated pull request guide covering required docs, tests, cross-repo parity, integration-test updates,
  and target-branch sync expectations.
- Replaced the minimal GitHub pull request template with a checklist-driven template that points contributors to the
  canonical guide.
- Updated `README.md` contributing guidance to reference the new pull request process.
- Linked the bridge README and PR guide to the canonical MCP server integration-testing workflow for shared live-test
  updates.
- Updated the README bridge action surface to include `read_table` and align action names with the actual bridge
  payload contract.
- Clarified agent instructions for cross-repo live integration runs: ask the human collaborator to start the bridge
  first, and ask for a bridge restart after bridge-code changes before reruns.
- Clarified that switching between CLI and MCP server live integration tests requires stopping the other companion
  process first because both compete for the same WebSocket port.

### Attribution

- Most of the cross-repo `read-table` work in this release was implemented by @timbeckss.

## [0.10.2] - 2026-03-25

### Added
- Added interactive history entries: expandable child items view, hover actions panel with copy-reference button, and
  click-to-open behavior on titles (thanks to @Twb06).

### Changed
- Raised the local tooling baseline to Node 20.19.0 for consistent package metadata and developer environment checks.

## [0.10.0] - 2026-03-18

### Added

- Added a plugin-level bridge runtime that starts on plugin activation, so the bridge can connect even when the
  sidebar panel is never opened.
- Added indefinite standby reconnect behavior after the initial retry burst, plus reconnect nudges on RemNote
  activity, bridge-panel opening, tab visibility regain, and browser `online` events.

### Changed

- The sidebar panel is now a monitoring and manual-control UI over the background runtime rather than the owner of the
  connection.
- Improved the sidebar connection UI to show retry phase, next scheduled retry, last disconnect context, and clearer
  reconnect guidance when the companion process is unavailable.
- Clarified in the bridge UI that the WebSocket connection is initiated by the RemNote bridge plugin toward the local
  companion app, not vice versa.

### Fixed

- Fixed sidebar state sync after late panel opening by bridging snapshot updates and control commands across the
  plugin activation context and the widget UI context through session-storage-based IPC.
- Fixed standby wake-up retries so meaningful RemNote activity and opening the bridge panel restart the fast retry
  window with cooldown protection instead of doing only one isolated retry attempt.

### Documentation

- Updated `README.md` and setup guides to reflect the new automatic background startup and standby reconnect behavior.
- Documented that the sidebar panel is optional for connection setup and remains available for status and manual
  `Reconnect`.
- Added a focused connection lifecycle guide covering startup order, burst vs. standby retry behavior, and what can
  trigger faster reconnects.
- Documented why the bridge connects outward from RemNote, including a link to RemNote's official backend-plugin
  limitation docs.
- Clarified that panel-open and in-app RemNote activity are the main faster-retry triggers, rather than relying only
  on raw window focus.
- Reframed `README.md` around two first-class companion paths, giving `remnote-mcp-server` and `remnote-cli` equal
  weight in the overview, privacy, installation, and architecture sections.
- Added connected-state and burst-retry screenshots to the connection lifecycle guide.

## [0.9.0] - 2026-03-17

### Added

- Unified simple note and markdown tree creation into a single `create_note` action.
  - Supports simple note creation (`title` only), hierarchical markdown import under a parent (`title` + `content`), and direct markdown import (`content` only).
  - Flashcards can be created using RemNote markdown syntax (e.g., `::`, `;;`, `>>`) within the `content`.
- Added support for hierarchical markdown trees in `update_note` (`appendContent`, `replaceContent`) and `append_journal` (`content`).
- Fixed an issue where structural markdown elements (headers, ordered lists) on the first line of content were not being parsed correctly by the RemNote SDK. Implemented a "Dummy Root Strategy" using a plain text root to ensure robust hierarchical parsing for all markdown structures.

### Changed
- Standardized mutating actions (`createNote`, `updateNote`, `appendJournal`) to return plural response format `{ remIds, titles }`.
- Refined tag application rules with hierarchical markdown: tags are only applied to the created root or top-level Rems, not to all nested descendants.
- Aligned bridge docs/tests with the unified `create_note` contract and added top-level content-only create coverage.

### Documentation

- Clarified the required startup order in `README.md` and setup guides, including that the right-sidebar Automation
  Bridge panel must be opened to mount the bridge runtime and start connection attempts.
- Documented the manual `Reconnect` fallback after automatic retry exhaustion.

### Attribution

- Most of the cross-repo `create_note` / markdown-tree work in this release was implemented by @Twb06.

## [0.8.0] - 2026-03-04

### Added

- Added bridge write policy settings:
  - `Accept write operations` (default `true`)
  - `Accept replace operation` (default `false`)
- Added `update_note` `replaceContent` support for direct-child replacement.
- Added explicit replace semantics for empty-string payloads: `replaceContent: ""` clears all direct children.

### Changed

- `update_note` now rejects mixed append+replace payloads in one request.
- `update_note` is fully blocked when write operations are disabled by bridge settings.
- `get_status` now reports `acceptWriteOperations` and `acceptReplaceOperation` policy flags.
- Default auto-tag name changed from `"MCP"` to empty string (`""`).
- Settings keys migrated from `mcp-*` namespace to `automation-bridge-*`.
- Bridge UI/log wording now prefers "Automation Bridge" terminology.

## [0.7.0] - 2026-03-01

### Changed

- `remnote_read_note` now accepts `includeContent: "structured"` and returns `contentStructured` child trees (with
  rem IDs/headlines) for ID-first hierarchy navigation.
- Bridge widget request typing now allows `read_note` `includeContent` mode `"structured"` in addition to
  `"none"`/`"markdown"`.
- Updated search/read contract docs to reflect structured content support parity for `read_note`.

### Fixed

- Fixed `read_note` include-content validation to stop rejecting `"structured"` mode.
- Added unit coverage for structured `read_note` output and unsupported-mode validation.

## [0.6.2] - 2026-02-27

### Fixed

- Fixed bridge widget startup across RemNote SDK/runtime variants by resolving tracker hooks compatibly between
  `useTrackerPlugin` and `useTracker`, with a safe fallback path.

## [0.6.1] - 2026-02-25

### Changed

- Upgraded `@remnote/plugin-sdk` from locked `0.0.14` to pinned `0.0.46`, including bridge-side API compatibility updates (`PluginRem`, `useTrackerPlugin`).
- Clarified `setCustomCSS` troubleshooting guidance: issue is observed in hot-reload development runs (`npm run dev` / `./run-dev.sh`), while `./run-prod-build.sh` is the recommended production-style local validation path.

## [0.6.0] - 2026-02-25

### Added

- Bridge now sends a `hello` version handshake on WebSocket connect, enabling companion clients to detect
  bridge/client minor-version mismatches.
- Added `search_by_tag` bridge action with content-rendering controls (`includeContent`, `depth`, `childLimit`,
  `maxContentLength`).
- `remnote_search` and `remnote_read_note` now return richer note metadata:
  `headline`, `aliases`, `parentRemId`, `parentTitle`, and `contentProperties`.
- `remnote_search` now supports `includeContent: "structured"` and returns nested `contentStructured` output for
  follow-up navigation.
- Added `run-prod-build.sh` to build and serve a production `dist/` bundle locally without creating `PluginZip.zip`.

### Changed

- **BREAKING**: `includeContent` changed from boolean to string mode (`'none' | 'markdown'`; search also supports
  `'structured'`).
- **BREAKING**: `remnote_read_note` no longer returns `children`; `content` now contains rendered markdown subtree
  output, and `detail` is removed from search/read payloads.
- Default rendering/query limits were updated: `read` depth now defaults to 5; search/read now expose
  `childLimit` and `maxContentLength` defaults.
- Search ranking/selection behavior was refined: grouped ordering by rem type, oversample + dedupe by `remId`, and
  trim back to requested limit for more stable unique result counts.

### Fixed

- Invalid `includeContent` values now produce explicit errors instead of silently omitting content.
- Markdown/structured rendering now filters internal property/powerup rows and trims trailing empty leaf nodes.

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
