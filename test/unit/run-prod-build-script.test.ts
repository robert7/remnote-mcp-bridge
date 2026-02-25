import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('run-prod-build.sh', () => {
  it('should exist in the project root', () => {
    const scriptPath = path.resolve(process.cwd(), 'run-prod-build.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('should build with webpack production mode without creating a zip', () => {
    const scriptPath = path.resolve(process.cwd(), 'run-prod-build.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('NODE_ENV=production npx webpack');
    expect(content).not.toContain('npm run build');
    expect(content).not.toContain('PluginZip.zip');
  });

  it('should run a static server without hot reload', () => {
    const scriptPath = path.resolve(process.cwd(), 'run-prod-build.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('node -e');
    expect(content).toContain('http.createServer');
    expect(content).toContain('Access-Control-Allow-Origin');
  });
});
