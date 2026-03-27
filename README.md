# RemNote Automation Bridge

A RemNote plugin that exposes your RemNote knowledge base to external automation clients over a local WebSocket
bridge. It is the shared RemNote endpoint for two first-class companion paths:

- **[RemNote MCP Server](https://github.com/robert7/remnote-mcp-server)** for MCP-compatible AI assistants
- **[RemNote CLI](https://github.com/robert7/remnote-cli)** for scripts, local agents, and CLI-first workflows

![Status](https://img.shields.io/badge/status-beta-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)
![CI](https://github.com/robert7/remnote-mcp-bridge/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/robert7/remnote-mcp-bridge/branch/main/graph/badge.svg)](https://codecov.io/gh/robert7/remnote-mcp-bridge)

> This is a working solution, but still experimental. If you run into any issues, please [report them here](https://github.com/robert7/remnote-mcp-bridge/issues).
> Further it is an improved and renamed fork of the original plugin
> [MCP Bridge plugin by Quentin Tousart](https://github.com/quentintou/remnote-mcp-bridge).

## Integration Paths

This project is a bridge layer with two consumer paths:

1. **MCP Server path:**
   - **RemNote Automation Bridge** (this project): RemNote plugin exposing RemNote API via WebSocket
   - **[RemNote MCP Server](https://github.com/robert7/remnote-mcp-server)**: companion server exposing MCP tools to AI
     assistants
   - Demo: **[View MCP Server Demo →](https://github.com/robert7/remnote-mcp-server/blob/main/docs/demo.md)**
2. **CLI app path (e.g. for OpenClaw):**
   - This bridge plugin remains the RemNote endpoint
   - **[RemNote CLI](https://github.com/robert7/remnote-cli)**: companion app for integrating RemNote with OpenClaw and
     other agentic workflows via the same WebSocket bridge
   - Demo: **[View RemNote CLI Demo →](https://github.com/robert7/remnote-cli/blob/main/docs/demo.md)**

**For both paths always 2 components are required - the bridge and either the MCP server or the CLI app.**

| Companion | Best fit | Typical client |
|-----------|----------|----------------|
| `remnote-mcp-server` | Conversational AI tool use via MCP | Claude Code, ChatGPT Apps, Claude Cowork, other MCP clients |
| `remnote-cli` | Local automation and command-driven workflows | OpenClaw, shell scripts, local agents |

**Version compatibility warning (`0.x` semver):** install a server/CLI version that matches your installed bridge
plugin version (prefer the same minor line). See the [Bridge / Consumer Version Compatibility Guide](docs/guides/bridge-consumer-version-compatibility.md).

## Why This Bridge Exists

RemNote plugins cannot be called directly by external automation clients. This bridge provides one stable local
connection point that both companion apps can target:

- **MCP path** when you want AI assistants to call RemNote tools through [Model Context Protocol](https://modelcontextprotocol.io/)
- **CLI path** when you want shell commands, scripts, or local agents to access the same bridge surface

## Features

### Core Capabilities

- **Create Notes & Flashcards** - Create simple notes, hierarchical markdown trees, or RemNote-native flashcards
- **Search Knowledge Base** - Full-text search across your Rems, plus tag-based search with ancestor context
- **Read Notes** - Read notes with markdown or structured child content for follow-up navigation
- **Update Notes** - Rename notes, append or replace hierarchical content, and manage tags
- **Daily Journal** - Append entries to today's daily document, including hierarchical markdown content

### Plugin Features

- **Sidebar Control Panel** - Monitor Automation Bridge connection status, statistics, and action history
- **Auto-tagging** - Automatically tag notes created via Automation Bridge actions (configurable)
- **Session Statistics** - Track created/updated/journal entries/searches
- **Action History** - View last 10 bridge actions with timestamps
- **Configurable Settings** - Customize behavior through RemNote settings
- **Real-time Status** - Live connection status indicator in sidebar panel

## Data Privacy

The bridge itself only talks to a local WebSocket companion process (default: `ws://127.0.0.1:3002`).
Connection direction is **Bridge Plugin -> Companion App**, not the other way around.

Supported data flows:

- **MCP path:** `RemNote ↔ Bridge Plugin ↔ Local MCP Server ↔ AI Assistant`
- **CLI path:** `RemNote ↔ Bridge Plugin ↔ Local CLI Daemon ↔ CLI / Local Agents`

What this means in practice:

- **The plugin itself does NOT send data to external servers**
- Any external sharing happens in the chosen companion path, not in the bridge plugin itself
- For the MCP path, your AI assistant only sees the data forwarded through your local MCP server setup
- For the CLI path, data stays within your local CLI/daemon workflow unless your own scripts or agents forward it

Why this works that way: RemNote plugins do not have a hosted backend API, so the bridge must connect outward from the
RemNote frontend plugin to the local companion process. See the [Connection Lifecycle
Guide](docs/guides/connection-lifecycle.md) and the official RemNote [Backend Plugins](https://plugins.remnote.com/advanced/backend_plugins)
page.

For MCP-path security details, see the [RemNote MCP Server Security
Model](https://github.com/robert7/remnote-mcp-server/blob/main/docs/architecture.md#security-model) documentation.

## Installation

### 1. Install the RemNote Plugin (This Repository)

Choose the install path that fits your use case:

- **Recommended for most users (marketplace install):**
  - [Install the Plugin via RemNote Marketplace (Beginner Guide)](docs/guides/install-plugin-via-marketplace-beginner.md)
- **For developers / local plugin testing from source:**
  - [Run The Plugin Locally (Beginner Guide)](docs/guides/development-run-plugin-locally.md)

After plugin installation (either path), the bridge starts automatically when the plugin activates in RemNote. You can
optionally open the control panel to inspect status and logs:

- Look for the **Automation Bridge** icon in RemNote's right sidebar toolbar
- Click the icon to open the Automation Bridge panel

The sidebar panel is no longer required to create the connection. It is a monitoring and manual-control surface for the
background bridge runtime.

For the full connection/reconnect behavior, see the [Connection Lifecycle Guide](docs/guides/connection-lifecycle.md).

Related setup/testing guide:

- [Execute Bridge Commands from RemNote Developer Console (Screenshot Walkthrough)](docs/guides/development-execute-bridge-commands-screenshots.md)

### 2. Choose Your Companion Path

**Important:** the plugin alone is not sufficient. You also need one companion app:

#### MCP server path

Use **[RemNote MCP Server](https://github.com/robert7/remnote-mcp-server)** when you want MCP-compatible AI assistants
to call RemNote tools.

```bash
npm install -g remnote-mcp-server
```

See the **[RemNote MCP Server repository](https://github.com/robert7/remnote-mcp-server)** for installation,
configuration, and troubleshooting.

#### CLI path

Use **[RemNote CLI](https://github.com/robert7/remnote-cli)** when you want shell commands, OpenClaw, or other local
agent workflows to access the same bridge.

```bash
npm install -g remnote-cli
```

See the **[RemNote CLI repository](https://github.com/robert7/remnote-cli)** for installation, command reference, and
workflow examples.

> **Version compatibility (important):** before installing/upgrading the MCP server or CLI companion, check the
> [Bridge / Consumer Version Compatibility Guide](docs/guides/bridge-consumer-version-compatibility.md).

### Recommended Startup Order

1. Start the companion process first:
   - `remnote-mcp-server` for the MCP path
   - `remnote-cli daemon start` for the CLI path
2. Open RemNote.
3. Wait for the bridge to connect in the background, or open the Automation Bridge panel if you want to confirm
   status.
4. Only then start using your MCP client or `remnote-cli` commands.

If RemNote was already open before the companion process started, the bridge keeps retrying automatically. You can
click **Reconnect Now** for an immediate retry. The sidebar also shows whether the bridge is still in the quick retry
window or already in standby background retry mode.

For exact retry/backoff behavior and wake-up triggers such as opening the bridge panel, RemNote activity, or
visibility/online events, see the [Connection Lifecycle
Guide](docs/guides/connection-lifecycle.md).

## Important Limitations

The system enforces a **single RemNote plugin connection** to one companion process at a time. This means:

- The bridge plugin connects to one local WebSocket endpoint
- You should run either the MCP server path or the CLI daemon path against a given RemNote app instance
- On the MCP path, multiple AI assistants can still share that one bridge connection through the MCP server's own
  multi-client transport
- This is a RemNote plugin limitation, not a limitation specific to the MCP server or CLI

For technical details about multi-agent support and connection architecture, see the **[RemNote MCP Server
documentation](https://github.com/robert7/remnote-mcp-server#multi-agent-support)**.

## Configuration

Access plugin settings in RemNote via **Settings > Plugins > Automation Bridge (OpenClaw, CLI, MCP...)**:

| Setting | Description | Default |
|---------|-------------|---------|
| Accept write operations | Allow write actions (`create_note`, `update_note`, `append_journal`) | `true` |
| Accept replace operation | Allow destructive `update_note` replace operations | `false` |
| Auto-tag created notes | Add a tag to notes created via bridge actions | `true` |
| Auto-tag name | Tag name for auto-tagged created notes | `` |
| Journal entry prefix | Optional prefix for journal entries | `` |
| Add timestamp to journal | Include time in journal entries | `true` |
| WebSocket server URL | Automation bridge server connection URL | `ws://127.0.0.1:3002` |
| Default parent Rem ID | Parent for new notes (empty = root) | `` |

## Bridge Action Surface

The bridge exposes this shared action surface to companion clients. The MCP server maps these actions to MCP tools, and
the CLI maps them to commands:

| Action | Description |
|------|-------------|
| `create_note` | Create notes, markdown trees, or flashcards with title, content, parent, and tags |
| `search` | Search the knowledge base with query and filters |
| `search_by_tag` | Search by tag with ancestor context and content controls |
| `read_note` | Read a note's content in markdown or structured form by ID |
| `update_note` | Update title, append or replace content, add/remove tags |
| `append_journal` | Add hierarchical markdown content to today's daily document |
| `read_table` | Read Advanced Table columns, rows, and typed property metadata |
| `get_status` | Check connection status |

## Usage

### Opening the Control Panel

The bridge control panel is accessible via the right sidebar:

1. Locate the **Automation Bridge icon** in RemNote's right sidebar toolbar
2. Click the icon to open the control panel in the sidebar
3. The panel displays:
   - **Connection Status** - Current WebSocket connection state
   - **Session Statistics** - Counts of created notes, updates, journal entries, and searches
   - **Action History** - Last 10 bridge actions with timestamps
   - **Recent Logs** - Real-time activity log
4. The panel remains visible while you navigate RemNote (non-blocking)
5. Click the icon again to close the panel

The connection logic runs in the background even when the panel is closed.

The sidebar panel provides persistent monitoring of bridge connection and activity while you work in RemNote.

### Example Interactions

Once everything is connected, you can use either companion path:

- **MCP path:** *Create a note about the meeting we just had*
- **MCP path:** *Find all my notes tagged with "Ideas" and summarize them*
- **CLI path:** `remnote-cli search "AI coding" --text`
- **CLI path:** `remnote-cli create "Reading List" --content-file /tmp/reading-list.md --text`

## Architecture

```text
MCP clients / AI assistants ↔ MCP Server (HTTP) ┐
                                                ├─ WebSocket :3002 ↔ RemNote Plugin (this repo) ↔ RemNote SDK
CLI commands / local agents ↔ CLI Daemon (HTTP) ┘
```

**Component roles:**

- **RemNote Automation Bridge** (this repository) - RemNote plugin that executes bridge actions via the RemNote SDK
- **RemNote MCP Server** ([separate repository](https://github.com/robert7/remnote-mcp-server)) - Exposes bridge
  actions to MCP-compatible AI assistants
- **RemNote CLI** ([separate repository](https://github.com/robert7/remnote-cli)) - Exposes the same bridge actions as
  local commands and daemon-backed automation

## RemNote Concept Reference (for Contributors and Agents)

For RemNote domain concepts relevant to bridge behavior, see:

- [RemNote Domain Reference](docs/reference/remnote/README.md)

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Run development helper script (same hot-reload workflow)
./run-dev.sh

# Run production bundle locally (no zip, no hot reload)
./run-prod-build.sh

# Build for production
npm run build

# The plugin zip will be created as PluginZip.zip
```

## Troubleshooting

### Plugin Issues

**Plugin won't connect:**

1. **Verify plugin settings in RemNote:**
   - WebSocket URL: `ws://127.0.0.1:3002` (default)
   - Check that MCP Server is running
2. **Check plugin console (RemNote Developer Tools):**

   ```text
   Cmd+Option+I (macOS)
   Ctrl+Shift+I (Windows/Linux)
   ```

3. **Restart RemNote** after changing settings

**"Invalid event setCustomCSS" errors:**

- Currently observed in hot-reload development runs (`npm run dev` or `./run-dev.sh`)
- Appears non-blocking (bridge functionality continues after dismissing the overlay)
- For production-style local verification, use `./run-prod-build.sh` (no hot reload)
- Treat this as current observed behavior, not a permanent guarantee across SDK/runtime updates

**Notes not appearing:**

- Check if a default parent ID is set (might be creating under a specific Rem)
- Verify the auto-tag setting isn't filtering your view

### Server Issues

For server-related troubleshooting (installation, configuration, port conflicts, MCP tools not appearing in
AI assistant), see the **[RemNote MCP Server
documentation](https://github.com/robert7/remnote-mcp-server#troubleshooting)**.

## Contributing

Contributions are welcome, but pull requests in this repo are expected to follow the shared bridge/server/CLI process.

Read the [Pull Request Guide](docs/guides/pull-request-guide.md) before opening or updating a PR.

In particular:

- update all relevant documentation
- update tests and extend integration coverage when the external surface changes
- keep `remnote-mcp-server` and `remnote-cli` in parity when protocol or shared functionality changes
- merge the latest target `master` into your source branch before opening or updating the PR

For the canonical workflow for updating and running shared MCP server + CLI integration coverage, see the [Integration
Testing Guide](https://github.com/robert7/remnote-mcp-server/blob/main/docs/guides/integration-testing.md).

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [RemNote](https://remnote.com) for the amazing Personal Knowledge Management tool
- [Anthropic](https://anthropic.com) for Claude and the MCP protocol
- The RemNote plugin community for inspiration
