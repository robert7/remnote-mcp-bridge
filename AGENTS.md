# AGENTS.md

This file is a map for AI agents working in `remnote-mcp-bridge` (RemNote Automation Bridge plugin).

## Start Here First (Mandatory)

Read these before making changes:

1. `.agents/dev-requirements.md`
2. `.agents/dev-workflow.md`
3. `.agents/dev-documentation.md` (required before any docs changes)
4. `.agents/PLANS.md` (required for complex work / major refactors)

If you skip required tests/docs/verification/changelog steps described above, the task is incomplete.

## Repo Role

This repo is the bridge plugin between RemNote SDK and two external consumer paths:

```text
MCP path: AI assistant <-> remnote-mcp-server <-> this plugin <-> RemNote SDK
CLI path: automation/agents <-> remnote-cli <-> this plugin <-> RemNote SDK
```

The plugin is a WebSocket client (default server URL: `ws://127.0.0.1:3002`).

## Companion Repos (Sibling Dirs)

Resolve from this repo root (`$(pwd)`):

- `$(pwd)/../remnote-mcp-server` - MCP transport/tool surface
- `$(pwd)/../remnote-cli` - daemon/control API + CLI command mapping

When changing contracts, check all three repos.

## Contract Map (Current)

### External Bridge Action Surface

- `create_note`
- `search`
- `search_by_tag`
- `read_note`
- `update_note`
- `append_journal`
- `get_status`

### Compatibility and Version Signaling

- On connect, plugin sends WebSocket `hello` with plugin version.
- Projects are in `0.x`; prefer matching minor lines across bridge/server/CLI.
- Compatibility guide: `docs/guides/bridge-consumer-version-compatibility.md`.

Before changing `search`/`read` output semantics, read:

- `docs/reference/remnote/README.md`
- `docs/reference/remnote/bridge-search-read-contract.md`

## Code Map

- `src/widgets/index.tsx` - plugin activation + widget registration
- `src/widgets/mcp_bridge.tsx` - bridge action dispatcher + UI panel state
- `src/bridge/websocket-client.ts` - WS lifecycle, reconnect backoff, `hello`
- `src/api/rem-adapter.ts` - action execution against RemNote SDK
- `src/settings.ts` - plugin settings keys/defaults
- `public/manifest.json` - plugin metadata/version

## Development and Verification

If Node/npm is unavailable in shell, run:

```bash
source ./node-check.sh
```

Core commands:

```bash
npm run dev
npm run build
npm run typecheck
npm test
npm run test:coverage
./code-quality.sh
./run-prod-build.sh
```

Use `./run-prod-build.sh` for production-style local verification (no hot reload).

## Integration and Live Validation Policy

- This repo does not ship a dedicated `npm run test:integration` flow.
- When live RemNote verification is required, ask the human collaborator to run/confirm it in a real RemNote session.
- Use local unit/static/build checks for agent-side verification.

## Documentation and Changelog Rules

- Before any docs edits, read `.agents/dev-documentation.md`.
- Any functional or documentation change must be recorded in `CHANGELOG.md`.
- Keep AGENTS/docs map-level: rationale, constraints, contracts, and navigation.
  - Avoid restating implementation details obvious from code.

## Release and Publishing Map

For releases, update all three:

1. `package.json` version
2. `public/manifest.json` version object
3. `CHANGELOG.md` (`[Unreleased]` -> dated release section)

Publishing helper:

- `./publish-to-marketplace.sh`

## Git Policy

Do not create commits unless explicitly requested. Use `.agents/dev-workflow.md` as canonical policy.
