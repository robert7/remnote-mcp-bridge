# RemNote MCP Bridge

Connect RemNote to AI assistants (Claude, GPT, etc.) via the **Model Context Protocol (MCP)**. This plugin enables
bidirectional communication, allowing AI to read and write directly to your RemNote knowledge base.

![Status](https://img.shields.io/badge/status-beta-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

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

Download `PluginZip.zip` from [Releases](https://github.com/quentintou/remnote-mcp-bridge/releases) and install it
in RemNote:

- Go to **Settings > Plugins > Install from zip**
- Select the downloaded zip file

Or for development:

```bash
git clone https://github.com/quentintou/remnote-mcp-bridge.git
cd remnote-mcp-bridge
npm install
npm run dev
```

### 2. Install the MCP Server

The MCP server acts as a bridge between your AI assistant and this plugin.

```bash
npm install -g remnote-mcp-server
```

Or clone and run locally:

```bash
git clone https://github.com/quentintou/remnote-mcp-server.git
cd remnote-mcp-server
npm install
npm start
```

### 3. Configure Your AI Assistant

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

#### For Claude Code CLI

Add to your MCP settings:

```json
{
  "remnote": {
    "command": "remnote-mcp-server"
  }
}
```

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

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   AI Assistant  │◄──────────────────►│   MCP Server    │
│ (Claude, etc.)  │     (stdio/MCP)    │  (Node.js)      │
└─────────────────┘                    └────────┬────────┘
                                                │
                                           WebSocket
                                           :3002
                                                │
                                       ┌────────▼────────┐
                                       │  RemNote Plugin │
                                       │  (This plugin)  │
                                       └────────┬────────┘
                                                │
                                          Plugin SDK
                                                │
                                       ┌────────▼────────┐
                                       │    RemNote      │
                                       │ Knowledge Base  │
                                       └─────────────────┘
```

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

### Plugin shows "Disconnected"

- Ensure the MCP server is running (`remnote-mcp-server`)
- Check the WebSocket URL in settings (default: `ws://127.0.0.1:3002`)
- Look for errors in RemNote's developer console (Cmd+Option+I)

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
