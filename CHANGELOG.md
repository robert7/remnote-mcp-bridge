# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- MCP Bridge icon in right sidebar toolbar
  - Icon displays with clear visual identification
  - Click icon to toggle control panel in sidebar (no command needed)
  - Icon provides quick visual access and better UX consistency with RemNote plugins

### Changed

- MCP Bridge icon now uses proven external image URL (https://i.imgur.com/MLaBDJw.png)
  - Uses same icon and configuration as test plugin (verified working)
  - Widget dimensions changed to `{ height: '100%', width: '100%' }` for consistency
  - Ensures reliable display in both development and production modes
  - External URL avoids webpack dev server static file serving complexity
  - Configured webpack dev server to serve static files from `public/` directory (for future local assets)
- Removed `widgetTabTitle` property (not needed - RemNote infers from widget name)

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
