# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

- Documentation improvements
  - Updated README.md with comprehensive installation instructions from MCP server documentation
  - Added demo section linking to server repository demo
  - Enhanced troubleshooting section with detailed scenarios and solutions
  - Updated Claude Code configuration to use `~/.claude.json` format with projects structure
  - Added "Important Limitations" section explaining 1:1:1 relationship constraint
  - Improved architecture explanation including stdio transport details
  - Updated repository references from `quentintou` to `robert7`
- Updated AGENTS.md for developers
  - Added "Testing and Code Quality" section with build validation guidance
  - Added "Claude Code Configuration" section with `~/.claude.json` format examples
  - Enhanced "Common Issues" section with MCP server troubleshooting
  - Added reference to MCP log locations (`~/.claude/debug/mcp-*.log`)
  - Documented deprecated `~/.claude/.mcp.json` format

## [1.1.0] - 2025-02-07

### Changed

- Widget moved from right sidebar to popup activated by command palette
  - New command: "Open MCP Bridge Control Panel"
  - Accessible via Ctrl-K/Cmd-K → search for "Open MCP Bridge Control Panel"
  - Improves UI/UX by reducing sidebar clutter

### Added

- Documentation files (AGENTS.md, docs/notes.md)
- Helper utilities

### Initial Features (v1.0.0 - v1.1.0)

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
