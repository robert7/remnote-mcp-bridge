import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('publish-to-marketplace.sh', () => {
  it('should exist in the project root', () => {
    const scriptPath = path.resolve(process.cwd(), 'publish-to-marketplace.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('should run the production build command', () => {
    const scriptPath = path.resolve(process.cwd(), 'publish-to-marketplace.sh');
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('npm run build');
  });
});
