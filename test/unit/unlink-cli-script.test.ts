import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('unlink-cli.sh', () => {
  it('should exist in the project root', () => {
    const scriptPath = path.resolve(process.cwd(), 'unlink-cli.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('should remove the global npm link when present', () => {
    const scriptPath = path.resolve(process.cwd(), 'unlink-cli.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('npm root -g');
    expect(content).toContain('[[ -L "$global_package_path" ]]');
    expect(content).toContain('npm unlink -g "$package_name"');
  });

  it('should leave non-linked installs untouched', () => {
    const scriptPath = path.resolve(process.cwd(), 'unlink-cli.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('No global npm link present for ${package_name}.');
    expect(content).not.toContain('npm uninstall -g');
  });

  it('should warn when the executable is still on PATH', () => {
    const scriptPath = path.resolve(process.cwd(), 'unlink-cli.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('command -v "$bin_name" >/dev/null 2>&1');
    expect(content).toContain('${bin_name} is still on PATH:');
  });
});
