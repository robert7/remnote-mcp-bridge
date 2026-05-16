import packageJson from '../../package.json';
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

describe('package bin metadata', () => {
  it('exposes the local production server executable', () => {
    expect(packageJson.bin).toEqual({
      'remnote-mcp-bridge': './bin/remnote-mcp-bridge.js',
    });
  });

  it('executes the bridge bin version command', () => {
    const result = spawnSync(process.execPath, ['bin/remnote-mcp-bridge.js', '--version'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe(packageJson.version);
  });
});
