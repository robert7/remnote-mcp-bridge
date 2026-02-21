import { describe, expect, it } from 'vitest';
import { MCP_BRIDGE_LOG_PREFIX, withLogPrefix } from '../../src/logging';

describe('logging helpers', () => {
  it('uses the mcp-bridge prefix constant', () => {
    expect(MCP_BRIDGE_LOG_PREFIX.toLowerCase()).toContain('mcp-bridge');
  });

  it('prepends the shared prefix to messages', () => {
    const message = withLogPrefix('Plugin activating...');

    expect(message.toLowerCase()).toContain('mcp-bridge');
    expect(message.endsWith('Plugin activating...')).toBe(true);
  });
});
