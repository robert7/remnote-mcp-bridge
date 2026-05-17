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
    const buildScriptPath = path.resolve(process.cwd(), 'scripts/build-prod-dist.sh');
    const buildScriptContent = fs.readFileSync(buildScriptPath, 'utf8');

    expect(content).toContain('scripts/build-prod-dist.sh');
    expect(buildScriptContent).toContain('WEBPACK_BIN="${REPO_ROOT}/node_modules/.bin/webpack"');
    expect(buildScriptContent).toContain('NODE_ENV=production "${WEBPACK_BIN}"');
    expect(buildScriptContent).not.toContain('npx webpack');
    expect(buildScriptContent).toContain('Run npm install first.');
    expect(content).not.toContain('npm run build');
    expect(buildScriptContent).not.toContain('PluginZip.zip');
  });

  it('should run a static server without hot reload', () => {
    const scriptPath = path.resolve(process.cwd(), 'run-prod-build.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');

    expect(content).toContain('scripts/serve-dist.js');
    expect(content).toContain('--root "${SCRIPT_DIR}/dist"');
    expect(content).toContain('--port "${PORT}"');
    expect(content).not.toContain('node -e');
  });
});
