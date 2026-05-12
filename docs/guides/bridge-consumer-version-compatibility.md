# Bridge / Consumer Version Compatibility (0.x)

The Automation Bridge plugin (`remnote-mcp-bridge`) is the shared protocol layer used by the MCP server package:

- `remnote-mcp-server` (MCP path)
- bundled `remnote-cli` command (CLI / OpenClaw / automation path, through `remnote-mcp-server`)

Because these projects are currently in `0.x` versions, **minor version changes may include breaking changes**.

## Do not confuse package versions with MCP protocol versions

- Bridge/server package versions look like `0.x.y`.
- MCP protocol versions look like dates, for example `2025-11-25`.
- Seeing `protocolVersion: "2025-11-25"` in Claude Desktop logs is normal and supported by current
  `remnote-mcp-server` builds. It does not indicate a bridge/server package version mismatch.

For local Claude Desktop, prefer the
[Claude Desktop Local MCPB guide](https://github.com/robert7/remnote-mcp-server/blob/main/docs/guides/configuration-claude-desktop-local-mcpb.md).
For Claude Cowork or remote connector flows, verify that the `/mcp` endpoint is reachable over public HTTPS.

## What this means in practice

Do **not** assume these combinations are compatible:

- bridge `0.4.2` + MCP server `0.5.0`
- bridge `0.4.2` + server package / bundled CLI `0.5.0`

They may work in some cases, but they may also fail due to action-name, payload, or response-shape changes.

## Recommended install rule

When installing the MCP server package for a given bridge plugin version, prefer the **same minor version line** unless
the release notes explicitly say another combination is supported.

Examples:

```bash
# If your bridge plugin is 0.4.x, prefer a 0.4.x server package
npm install -g remnote-mcp-server@0.4.2

# If your bridge plugin is 0.5.x, prefer a 0.5.x server package
npm install -g remnote-mcp-server@0.5.0
```

## How to check versions

- **Bridge plugin version**: open the Automation Bridge panel in RemNote (or check companion `status` output when it
  reports `pluginVersion`)
- **MCP server version**: `remnote-mcp-server --version`
- **Bundled CLI version**: `remnote-cli --version`

## Upgrade guidance

- Upgrade the bridge plugin and MCP server package together when possible.
- After any upgrade, verify connection and run a simple test (`status`, then a small `search` or `create`).
- If behavior changes after an upgrade, check for a version mismatch before deeper debugging.
- If you checkout the `master` branch in any repo, read `CHANGELOG.md` first: the `Unreleased`
  section may already include breaking changes before the next published version.

## Typical mismatch symptoms

- Connection appears up, but commands fail.
- Errors mention unknown actions or invalid payload fields.
- Results are missing fields a client expects.
- A newer server package expects bridge features not present in your installed plugin version.

## Where to check release notes

- Bridge plugin changelog: [`remnote-mcp-bridge/CHANGELOG.md`](https://github.com/robert7/remnote-mcp-bridge/blob/main/CHANGELOG.md)
- MCP server changelog: [`remnote-mcp-server/CHANGELOG.md`](https://github.com/robert7/remnote-mcp-server/blob/main/CHANGELOG.md)
- Bundled CLI changelog: [`remnote-mcp-server/CHANGELOG.md`](https://github.com/robert7/remnote-mcp-server/blob/main/CHANGELOG.md)
