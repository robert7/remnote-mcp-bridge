# RemNote Bridge for MCP & OpenClaw

A RemNote plugin that enables AI assistants to interact with your RemNote knowledge base through the **Model Context
Protocol (MCP) or via CLI (command-line interface)** e.g. for [OpenClaw](https://github.com/openclaw/openclaw) or other agentic automation workflows.

![Status](https://img.shields.io/badge/status-beta-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)
![CI](https://github.com/robert7/remnote-mcp-bridge/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/robert7/remnote-mcp-bridge/branch/main/graph/badge.svg)](https://codecov.io/gh/robert7/remnote-mcp-bridge)

> This is a working **proof-of-concept/experimental solution**. It "works on my machine" — you're invited to test
> it and [report any bugs or issues](https://github.com/robert7/remnote-mcp-bridge/issues).
> Further it is an improved and renamed fork of the original plugin
> [MCP Bridge plugin by Quentin Tousart](https://github.com/quentintou/remnote-mcp-bridge).

## Demo

See AI agent examples in action with RemNote: **[View Demo
→](https://github.com/robert7/remnote-mcp-server/blob/main/docs/demo.md)**

## Integration Paths

This project is a bridge layer with two consumer paths:

1. **MCP Server path:**
   - **RemNote Bridge for MCP & OpenClaw** (this project): RemNote plugin exposing RemNote API via WebSocket
   - **[RemNote MCP Server](https://github.com/robert7/remnote-mcp-server)**: companion server exposing MCP tools to AI
     assistants
2. **CLI app path (e.g. for OpenClaw):**
   - This bridge plugin remains the RemNote endpoint
   - **[RemNote CLI](https://github.com/robert7/remnote-cli)**: companion app for integrating RemNote with OpenClaw and
     other agentic workflows via the same WebSocket bridge

**For both paths always 2 components are required - the bridge and either the MCP server or the CLI app.**

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) is an open standard by Anthropic that allows AI assistants
to interact with external tools and data sources. With this plugin, your AI assistant becomes a true PKM companion.

## Features

### Core Capabilities

- **Create Notes** - AI can create new notes with titles, content, and tags
- **Search Knowledge Base** - Full-text search across all your Rems
- **Read Notes** - Access note content and hierarchical children
- **Update Notes** - Modify existing notes, append content, manage tags
- **Daily Journal** - Append entries to today's daily document

### Plugin Features

- **Sidebar Control Panel** - Monitor MCP connection status, statistics, and action history
- **Auto-tagging** - Automatically tag notes created via MCP (configurable)
- **Session Statistics** - Track created/updated/journal entries/searches
- **Action History** - View last 10 MCP actions with timestamps
- **Configurable Settings** - Customize behavior through RemNote settings
- **Real-time Status** - Live connection status indicator in sidebar panel

## Data Privacy

This plugin connects your RemNote knowledge base to AI assistants through a **locally running MCP server** (installed
separately from this plugin). Here's the data flow:

**RemNote ↔ Local MCP Server ↔ AI Assistant**

- The plugin communicates exclusively with your local MCP server via WebSocket (default: `ws://127.0.0.1:3002`)
- The MCP server forwards data to your AI assistant (Claude, GPT, etc.) using the MCP protocol
- **The plugin itself does NOT send data to external servers** - all external communication happens through your local
  MCP server

Your RemNote data is only shared with the AI assistant you've configured in your MCP server setup. The plugin acts as
a local bridge and has no built-in external network access beyond the local WebSocket connection.

For technical details about the security model, see the [RemNote MCP Server Security
Model](https://github.com/robert7/remnote-mcp-server/blob/main/docs/architecture.md#security-model) documentation.

## Installation

### 1. Install the RemNote Plugin (This Repository)

**Currently, this plugin is only available for local development installation.** Future releases may be published
to RemNote's plugin marketplace.

**Development Installation:**

1. Clone and build the plugin:
   ```bash
   git clone https://github.com/robert7/remnote-mcp-bridge.git
   cd remnote-mcp-bridge
   npm install
   npm run dev
   ```

2. In RemNote:
   - Go to **Settings > Plugins**
   - Click **"Develop from localhost"**
   - Click **"Develop"**
   - The RemNote Bridge for MCP & OpenClaw plugin will now be active
3. Access the control panel:
   - Look for the **MCP icon** in RemNote's right sidebar toolbar
   - Click the icon to open the control panel

### 2. Install the MCP Server

**Important:** The plugin alone is not sufficient - you must also install the [RemNote MCP
Server](https://github.com/robert7/remnote-mcp-server), which connects your AI assistant to this plugin.

Install the server globally:

```bash
npm install -g remnote-mcp-server
```

For detailed installation instructions, configuration, and troubleshooting, see the **[RemNote MCP Server
repository](https://github.com/robert7/remnote-mcp-server)**.

## Important Limitations

**Multiple AI agents can connect to the MCP server simultaneously**, but the system enforces a **single RemNote plugin
connection**. This means:

- Multiple AI assistants (e.g., multiple Claude Code sessions) can access the same RemNote knowledge base concurrently
- The MCP server uses HTTP Streamable transport, supporting multiple concurrent client sessions
- However, only one RemNote app instance can be connected at a time via the WebSocket bridge
- This is a RemNote plugin limitation, not an MCP server limitation

For technical details about multi-agent support and connection architecture, see the **[RemNote MCP Server
documentation](https://github.com/robert7/remnote-mcp-server#multi-agent-support)**.

## Configuration

Access plugin settings in RemNote via **Settings > Plugins > RemNote Bridge for MCP & OpenClaw**:

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-tag MCP notes | Add a tag to all AI-created notes | `true` |
| Auto-tag name | Tag name for AI-created notes | `MCP` |
| Journal entry prefix | Optional prefix for journal entries | `` |
| Add timestamp to journal | Include time in journal entries | `true` |
| WebSocket server URL | MCP server connection URL | `ws://127.0.0.1:3002` |
| Default parent Rem ID | Parent for new notes (empty = root) | `` |

## MCP Tools Available

Once connected, your AI assistant can use these tools:

| Tool | Description |
|------|-------------|
| `remnote_create_note` | Create a new note with title, content, parent, and tags |
| `remnote_search` | Search the knowledge base with query and filters |
| `remnote_read_note` | Read a note's content and children by ID |
| `remnote_update_note` | Update title, append content, add/remove tags |
| `remnote_append_journal` | Add an entry to today's daily document |
| `remnote_status` | Check connection status |

## Usage

### Opening the Control Panel

The bridge control panel is accessible via the right sidebar:

1. Locate the **MCP icon** in RemNote's right sidebar toolbar
2. Click the icon to open the control panel in the sidebar
3. The panel displays:
   - **Connection Status** - Current WebSocket connection state
   - **Session Statistics** - Counts of created notes, updates, journal entries, and searches
   - **Action History** - Last 10 MCP actions with timestamps
   - **Recent Logs** - Real-time activity log
4. The panel remains visible while you navigate RemNote (non-blocking)
5. Click the icon again to close the panel

The sidebar panel provides persistent monitoring of MCP connection and activity while you work in RemNote.

### Example AI Interactions

Once everything is connected, you can ask your AI assistant things like:

- *Create a note about the meeting we just had*
- *Search my notes in RemNote for information about AI coding*
- *Add a journal entry: Finished the MCP integration today!*
- *Find all my notes tagged with 'Ideas' and summarize them*
- *Update my 'Reading List' note with this new book*

## Architecture

```text
AI Assistant (Claude Code/Desktop) ↔ MCP Server (HTTP) ↔ WebSocket :3002 ↔ RemNote Plugin (this repo) ↔ RemNote SDK
```

**Component roles:**

- **RemNote MCP Server** ([separate repository](https://github.com/robert7/remnote-mcp-server)) - Exposes MCP tools to
  AI assistants and manages WebSocket server
- **RemNote Bridge for MCP & OpenClaw** (this repository) - RemNote plugin that connects to the server and executes
  operations via RemNote SDK

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

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

- Cosmetic errors from development mode
- Don't affect functionality
- Won't appear in production builds

**Notes not appearing:**

- Check if a default parent ID is set (might be creating under a specific Rem)
- Verify the auto-tag setting isn't filtering your view

### Server Issues

For server-related troubleshooting (installation, configuration, port conflicts, MCP tools not appearing in
AI assistant), see the **[RemNote MCP Server
documentation](https://github.com/robert7/remnote-mcp-server#troubleshooting)**.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [RemNote](https://remnote.com) for the amazing PKM tool
- [Anthropic](https://anthropic.com) for Claude and the MCP protocol
- The RemNote plugin community for inspiration
