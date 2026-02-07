# RemNote MCP Bridge

Connect RemNote to AI assistants (Claude, GPT, etc.) via the **Model Context Protocol (MCP)**. This plugin enables
bidirectional communication, allowing AI to read and write directly to your RemNote knowledge base.

![Status](https://img.shields.io/badge/status-beta-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

## Demo

See Claude Code in action with RemNote: **[View Demo →](https://github.com/robert7/remnote-mcp-server/blob/main/docs/demo.md)**

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

- **Auto-tagging** - Automatically tag notes created via MCP (configurable)
- **Session Statistics** - Track created/updated/journal entries/searches
- **Action History** - View last 10 MCP actions with timestamps
- **Configurable Settings** - Customize behavior through RemNote settings
- **Real-time Status** - Connection status indicator in popup control panel
- **Command Palette Access** - Open control panel via Ctrl-K → "Open MCP Bridge Control Panel"

## Installation

### 1. Install the RemNote Plugin

Download `PluginZip.zip` from [Releases](https://github.com/robert7/remnote-mcp-bridge/releases) and install it
in RemNote:

- Go to **Settings > Plugins > Install from zip**
- Select the downloaded zip file

Or for development:

```bash
git clone https://github.com/robert7/remnote-mcp-bridge.git
cd remnote-mcp-bridge
npm install
npm run dev
```

### 2. Install the MCP Server

The MCP server acts as a bridge between your AI assistant and this plugin.

**From npm (recommended for most users):**

```bash
# Install globally
npm install -g remnote-mcp-server

# Verify installation
which remnote-mcp-server
# Should output: /path/to/node/bin/remnote-mcp-server
```

**Uninstalling:**

```bash
# Remove global installation
npm uninstall -g remnote-mcp-server
```

**From source (for development):**

```bash
git clone https://github.com/robert7/remnote-mcp-server.git
cd remnote-mcp-server
npm install
npm run build

# Creates global symlink: makes remnote-mcp-server command available system-wide
npm link

# Verify it worked
which remnote-mcp-server
# Should output e.g.: /Users/<username>/.nvm/versions/node/<version>/bin/remnote-mcp-server
```

**What npm link does:** Creates a symbolic link from your global `node_modules` bin directory to this project's
executable, allowing Claude Code to launch `remnote-mcp-server` from anywhere without publishing to npm.

**Important:** Claude Code CLI must have access to the same Node.js environment where you ran `npm link`. If Claude Code
uses a different Node.js version or environment (e.g., different shell PATH), it won't find the command. Ensure your
shell configuration (`.bashrc`, `.zshrc`) properly exposes your Node.js environment.

**Unlinking the source installation:**

When you no longer want the global `remnote-mcp-server` command to point to your local repository:

```bash
# Remove the global symlink
npm unlink -g remnote-mcp-server

# Verify it's removed
which remnote-mcp-server
# Should output nothing if successfully unlinked
```

After unlinking, you can install the published npm package globally with `npm install -g remnote-mcp-server` if needed.

#### About stdio transport

This MCP server uses [stdio transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio),
the preferred communication mechanism for MCP. In stdio transport, Claude Code launches the server as a subprocess and
exchanges JSON-RPC messages via standard input/output streams.

**Key characteristics:**

- **Lifecycle management**: Claude Code automatically starts the server when it launches and stops it on exit. The
  server is launched as a subprocess, not a standalone service.
- **Message protocol**: Communication uses newline-delimited JSON-RPC messages on stdin (client → server) and stdout
  (server → client). No HTTP/REST endpoints are exposed.
- **Logging constraint**: stdout is reserved exclusively for MCP protocol messages. All logging must go to stderr, which
  is why the server codebase uses `console.error()` for logs.

This architecture provides tight integration with Claude Code while maintaining process isolation and security
boundaries. For technical details, see the [MCP
specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports).

### 3. Configure Your AI Assistant

#### For Claude Code CLI

MCP servers are configured in `~/.claude.json` under the `mcpServers` key within project-specific sections.

**Add to your `~/.claude.json`:**

```json
{
  "projects": {
    "/Users/username": {
      "mcpServers": {
        "remnote": {
          "type": "stdio",
          "command": "remnote-mcp-server",
          "args": [],
          "env": {
            "REMNOTE_WS_PORT": "3002"
          }
        }
      }
    }
  }
}
```

**Configuration Notes:**

- **Global availability:** Use your home directory path (`/Users/username`) to make RemNote tools available in all
  projects
- **Project-specific:** Use a specific project path to limit availability to that project
- **Multiple projects:** Add `mcpServers` configuration under each project path as needed

**Example with multiple projects:**

```json
{
  "projects": {
    "/Users/username": {
      "mcpServers": {
        "remnote": {
          "type": "stdio",
          "command": "remnote-mcp-server",
          "args": [],
          "env": {
            "REMNOTE_WS_PORT": "3002"
          }
        }
      }
    },
    "/Users/username/Projects/my-project": {
      "mcpServers": {
        "remnote": {
          "type": "stdio",
          "command": "remnote-mcp-server",
          "args": [],
          "env": {
            "REMNOTE_WS_PORT": "3002"
          }
        }
      }
    }
  }
}
```

**Restart Claude Code** completely to load the MCP server configuration. The server will start automatically when Claude
Code launches.

#### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "remnote": {
      "command": "remnote-mcp-server",
      "args": []
    }
  }
}
```

## Important Limitations

**This MCP server enforces a strict 1:1:1 relationship:** one AI agent ↔ one MCP server instance ↔ one RemNote plugin
connection.

### Multi-Agent Constraints

You **cannot** use multiple AI agents (e.g., two Claude Code sessions) with the same RemNote knowledge base
simultaneously. Three architectural constraints prevent this:

1. **stdio transport is point-to-point** - Each MCP server process communicates with exactly one AI agent via
   stdin/stdout. The transport protocol doesn't support multiple clients.
2. **WebSocket enforces single-client** - The server explicitly rejects multiple RemNote plugin connections. Only one
   plugin instance can connect to port 3002 at a time (connection code: 1008).
3. **Port binding conflict** - Multiple server instances attempting to use the default port 3002 will fail with
   `EADDRINUSE`.

### Practical Implications

- **One agent at a time** - Close one Claude Code session before starting another if both need RemNote access
- **No concurrent access** - Cannot have multiple AI assistants modifying your RemNote knowledge base simultaneously
- **Separate workspaces don't help** - Even with different ports, only one plugin instance can connect to RemNote at a
  time

### Alternative Approach

If you need multiple AI agents with separate note-taking systems, use separate RemNote accounts/workspaces and configure
each with its own MCP server instance on different ports.

## Configuration

Access plugin settings in RemNote via **Settings > Plugins > MCP Bridge**:

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-tag MCP notes | Add a tag to all AI-created notes | `true` |
| Auto-tag name | Tag name for AI-created notes | `MCP` |
| Journal entry prefix | Prefix for journal entries | `[Claude]` |
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

1. Press **Ctrl-K** (or Cmd-K on macOS) to open RemNote's command palette
2. Search for **"Open MCP Bridge Control Panel"**
3. The popup will display:
   - Connection status (Connected/Disconnected/Connecting)
   - Session statistics (notes created, updated, journal entries, searches)
   - Recent action history
   - Real-time logs

### Example AI Interactions

Once everything is connected, you can ask your AI assistant things like:

- *"Create a note about the meeting we just had"*
- *"Search my notes in RemNote for information about AI coding"*
- *"Add a journal entry: Finished the MCP integration today!"*
- *"Find all my notes tagged with 'Ideas' and summarize them"*
- *"Update my 'Reading List' note with this new book"*

## Architecture

```text
AI agent (e.g. Claude Code) ↔ MCP Server (stdio) ↔ WebSocket Server :3002 ↔ RemNote Plugin ↔ RemNote
```

The server acts as a bridge:

- Communicates with Claude Code via stdio transport (MCP protocol)
- Runs a WebSocket server (port 3002) that the RemNote browser plugin connects to
- Translates MCP tool calls into RemNote API actions

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

### Server Not Starting

1. **Check if installed globally:**

   ```bash
   which remnote-mcp-server
   ```

   Should return a path to the executable.

2. **Reinstall if needed:**

   **For npm installation:**

   ```bash
   npm install -g remnote-mcp-server
   ```

   **For source installation:**

   ```bash
   cd /path/to/remnote-mcp-server
   npm link
   ```

3. **Check Claude Code logs:**

   ```bash
   tail -f ~/.claude/debug/mcp-*.log
   ```

### Port 3002 Already in Use

If you see "EADDRINUSE" error:

```bash
# Find what's using the port
lsof -i :3002

# Kill the process if needed
kill -9 <PID>
```

Alternatively, configure a different port in both `~/.claude.json` and the RemNote plugin settings.

### Plugin Won't Connect

1. **Verify plugin settings in RemNote:**
   - WebSocket URL: `ws://127.0.0.1:3002`
   - Auto-reconnect: Enabled
2. **Check plugin console (RemNote Developer Tools):**

   ```text
   Cmd+Option+I (macOS)
   Ctrl+Shift+I (Windows/Linux)
   ```

3. **Restart RemNote** after changing settings
4. **Check server logs** for connection messages

### Tools Not Appearing in Claude Code

1. **Verify configuration in `~/.claude.json`:**

   ```bash
   cat ~/.claude.json | grep -A 10 mcpServers
   ```

2. **Ensure configuration is under correct project path** (use home directory for global)
3. **Restart Claude Code completely** (not just reload)
4. **Check MCP logs:**

   ```bash
   tail -f ~/.claude/debug/mcp-*.log
   ```

### Configuration Not Working

**Common issue:** Using the old `~/.claude/.mcp.json` file format

❌ **Old format (deprecated):**

```json
// File: ~/.claude/.mcp.json
{
  "remnote": { ... }
}
```

✅ **Correct format:**

```json
// File: ~/.claude.json
{
  "projects": {
    "/Users/username": {
      "mcpServers": {
        "remnote": { ... }
      }
    }
  }
}
```

The `enabledMcpJsonServers` setting in `~/.claude/settings.json` is also deprecated and no longer needed.

### "Invalid event setCustomCSS" errors

- These are cosmetic errors from development mode
- They don't affect functionality
- They won't appear in production builds

### Notes not appearing

- Check if a default parent ID is set (might be creating under a specific Rem)
- Verify the auto-tag setting isn't filtering your view

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

---

**Made with Claude Code** - This plugin was developed in collaboration with Claude AI.
