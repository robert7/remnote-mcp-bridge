import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('link-cli.sh', () => {
  it('should exist in the project root', () => {
    const scriptPath = path.resolve(process.cwd(), 'link-cli.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('should test, build the production dist, and link the package', () => {
    const scriptPath = path.resolve(process.cwd(), 'link-cli.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('npm install');
    expect(content).toContain('npm test');
    expect(content).toContain('scripts/build-prod-dist.sh');
    expect(content).toContain('npm link');
  });

  it('should guard against replacing a non-linked global install', () => {
    const scriptPath = path.resolve(process.cwd(), 'link-cli.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('npm root -g');
    expect(content).toContain('already installed globally via npm');
    expect(content).toContain('npm uninstall -g');
  });

  it('should verify the linked executable without starting the server', () => {
    const scriptPath = path.resolve(process.cwd(), 'link-cli.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('command -v "$bin_name"');
    expect(content).toContain('"$bin_name" --version');
  });
});
