import packageJson from '../../package.json';
import { describe, expect, it } from 'vitest';

describe('package bin metadata', () => {
  it('exposes the local production server executable', () => {
    expect(packageJson.bin).toEqual({
      'remnote-mcp-bridge': './bin/remnote-mcp-bridge.js',
    });
  });
});
