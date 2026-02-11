# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  - Added "Release Version Updates" section to CLAUDE.md documenting the 3 locations where version must be updated during release creation (package.json, public/manifest.json, CHANGELOG.md)
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
