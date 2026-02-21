export const MCP_BRIDGE_LOG_PREFIX = '[mcp-bridge] ';

export function withLogPrefix(message: string): string {
  return `${MCP_BRIDGE_LOG_PREFIX}${message}`;
}
