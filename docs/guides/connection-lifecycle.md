# Connection Lifecycle

This guide explains what the Automation Bridge does after RemNote starts, how reconnect works, and what the sidebar
status means.

## High-Level Flow

1. The plugin activates when RemNote loads.
2. The bridge runtime starts automatically in the background.
3. The bridge tries to connect to the configured WebSocket companion URL.
   - Default: `ws://127.0.0.1:3002`
4. Once connected, the bridge is ready for either:
   - `remnote-mcp-server`
   - `remnote-cli daemon`

The right-sidebar Automation Bridge panel is optional. It is now a monitoring and manual-control surface, not the thing
that creates the connection.

## Why The Bridge Connects Outward

The connection direction is:

```text
RemNote UI + Bridge Plugin -> WebSocket Companion App <- MCP clients / CLI commands
```

This can feel backwards at first because many people expect the companion app to connect into RemNote.

The reason is a RemNote platform constraint: RemNote plugins do not have a hosted backend API. RemNote explicitly
recommends frontend-plugin-based approaches instead of relying on a backend plugin API. See the official RemNote docs:
[Backend Plugins](https://plugins.remnote.com/advanced/backend_plugins).

So in this project:

- the bridge plugin is the WebSocket client
- the MCP server or CLI daemon is the WebSocket server
- MCP clients and CLI commands talk to the companion app, not directly to RemNote

That is why startup order matters: the bridge always tries to connect outward from RemNote to the configured companion
process.

## Recommended Startup Order

1. Start the companion process first.
   - MCP path: `remnote-mcp-server`
   - CLI path: `remnote-cli daemon start`
2. Open RemNote.
3. Wait for the bridge to connect in the background.
4. Open the sidebar panel only if you want to inspect status, logs, or click **Reconnect Now**.

If RemNote was already open before the companion process started, the bridge should still reconnect automatically. It
may just take a moment depending on which retry phase it is currently in.

## Retry Phases

### Initial Connect

When the plugin starts, the bridge tries to connect immediately.

If that succeeds, the sidebar shows **Connected** and the bridge is ready to accept requests.

### Burst Retry

If the companion process is unavailable, the bridge enters a fast retry window:

- Up to 10 retries
- Exponential backoff
- Starts around 1 second
- Grows up to about 30 seconds
- Includes small jitter to avoid retry thundering

The sidebar shows this as **Retrying** and displays both:

- the current burst attempt count
- the next scheduled retry countdown

### Standby Retry

After the fast retry window is exhausted, the bridge switches to standby mode:

- retries continue indefinitely
- one background retry roughly every 10 minutes
- small jitter still applies

The sidebar shows this as **Waiting for server** and displays the next background retry countdown.

## What Can Wake It Up Sooner?

Even in standby mode, the bridge can retry sooner than the scheduled timer.

Immediate reconnect can be triggered by:

- clicking **Reconnect Now** in the sidebar
- RemNote window focus
- browser/tab visibility returning
- browser `online` event

This means a common workflow works well:

1. Leave RemNote open.
2. Start the CLI daemon or MCP server later.
3. Focus RemNote.
4. The bridge should attempt to reconnect immediately instead of waiting for the full standby timer.

Important detail: if RemNote is already focused and stays focused the whole time, starting the companion process does
not magically wake the bridge at once. In that case it reconnects on:

- the next scheduled retry
- a later focus / visibility / online event
- or manual **Reconnect Now**

## Sidebar Status Meanings

### Connected

The bridge is live and ready for MCP or CLI requests.

### Connecting

The bridge is actively trying to open a WebSocket connection right now.

This can happen on:

- initial startup
- a scheduled retry firing
- a focus/visibility/online wake-up
- manual **Reconnect Now**

### Retrying

The fast retry window is active.

The panel shows:

- burst attempt count
- next retry countdown
- last disconnect reason, when available

### Waiting for server

The bridge is in standby mode.

The panel shows:

- next background retry countdown
- last disconnect reason, when available
- a hint that focus/visibility/online can trigger an earlier reconnect

## Practical Scenarios

### RemNote Open First, Daemon Starts Later

This is supported.

The bridge keeps retrying in the background. If you want to speed it up, either:

- focus RemNote
- or click **Reconnect Now**

### RemNote Open on a Browser Machine for a Long Time

This is also supported.

If the companion process appears much later, the bridge eventually reconnects on its own. The sidebar gives you the
best clue about whether it is still in fast retry mode or already in standby.

## If It Still Does Not Connect

Check:

1. The companion process is actually running.
2. The WebSocket URL in plugin settings matches the companion port.
3. Nothing else is occupying the port.
4. The sidebar's last disconnect reason and logs.

Then use **Reconnect Now** once after confirming the companion process is listening. If that still fails, capture the
sidebar state and logs before restarting anything.
