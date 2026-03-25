# Pull Request Guide

Use this guide when opening or updating pull requests for `remnote-mcp-bridge`.

This repository is part of a three-repo bridge surface:

- `remnote-mcp-bridge`
- `remnote-mcp-server`
- `remnote-cli`

When a feature or protocol change affects more than one repo, the pull requests must stay in sync.

## Required For Every Pull Request

- Update all relevant documentation.
- Update or add tests for the changed behavior.
- Extend integration coverage when the feature should be validated end to end.
- Update `CHANGELOG.md`.
- Merge the latest `master` from the target repository into your source branch before opening or updating the PR.

## Cross-Repo Parity

If you change the shared bridge protocol, action surface, or behavior expected by consumers, keep `remnote-mcp-server`
and `remnote-cli` in parity as far as the feature allows.

Typical parity-triggering changes:

- New bridge action or CLI/server command
- Request or response schema changes
- Compatibility or handshake changes
- New validation or behavior that a consumer must understand

When parity is affected:

- Open pull requests in all relevant repos.
- Link the related pull requests to each other.
- Keep documentation and tests aligned across the affected repos.

Do not merge a bridge-only protocol change while the companion repos are left behind without an explicit, documented
reason.

## Integration Test Expectations

Integration tests are meant to validate the real bridge-consumer combination:

- bridge + MCP server
- bridge + CLI

If a new feature belongs on the shared external surface, extend integration coverage in both companion repos where the feature can be exercised.

If integration coverage depends on a live RemNote object that cannot yet be created through the companion, document
the temporary setup and keep the test automated as far as possible.

## What The PR Description Should Contain

Include enough context for a reviewer to verify parity and coverage quickly.

- Short summary of the change
- Affected repos
- Links to related PRs in bridge/server/CLI when applicable
- Which docs were updated
- Which tests were updated or added
- Whether integration coverage was extended
- Confirmation that the latest target `master` was merged
- Any manual RemNote validation still required
