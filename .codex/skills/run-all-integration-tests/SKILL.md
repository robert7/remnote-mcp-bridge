---
name: run-all-integration-tests
description: Use when the RemNote bridge has been started and the user wants to run all live RemNote integration tests for this repository through the canonical agent integration workflow.
---

# Run All Integration Tests

The RemNote bridge has already been started by the human collaborator.

Read `AGENTS.md` and run the full live integration test flow exactly according to its Integration and Live Validation
Policy.

Use `../remnote-mcp-server` as the command working directory, then run the canonical agent integration runner there,
including the required preflight. Do not substitute lower-level integration runners.

Report:

- Exact commands run
- Pass/fail status
- First actionable failure, if any
