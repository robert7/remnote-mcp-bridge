# Pull Request Guide

Use this guide when opening or updating pull requests for `remnote-mcp-bridge`.

This repository is part of a two-repo bridge surface:

- `remnote-mcp-bridge`
- `remnote-mcp-server`

When a feature or protocol change affects more than one repo, the pull requests must stay in sync.

Use the [repository pull request template](../../.github/pull_request_template.md) for the submission checklist.
This guide explains the cross-repo policy behind that checklist.

## Cross-Repo Parity

If you change the shared bridge protocol, action surface, or behavior expected by consumers, keep MCP tools and the
bundled `remnote-cli` in `remnote-mcp-server` in parity as far as the feature allows.

Typical parity-triggering changes:

- New bridge action, MCP tool, or bundled CLI command
- Request or response schema changes
- Compatibility or handshake changes
- New validation or behavior that a consumer must understand

When parity is affected:

- Open pull requests in all relevant active repos.
- Link the related pull requests to each other.
- Keep documentation and tests aligned across the affected repos.

Do not merge a bridge-only protocol change while the companion repos are left behind without an explicit, documented
reason.

## Integration Test Expectations

Integration tests are meant to validate the real bridge-consumer combination:

- bridge + MCP server
- bridge + bundled CLI

If a new feature belongs on the shared external surface, extend integration coverage for both MCP tools and the bundled
CLI where the feature can be exercised.

Use the canonical shared workflow in the MCP server repo: [Integration Testing Guide](https://github.com/robert7/remnote-mcp-server/blob/main/docs/guides/integration-testing.md).

If integration coverage depends on a live RemNote object that cannot yet be created through the companion, document
the temporary setup and keep the test automated as far as possible.
