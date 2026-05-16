import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('project config', () => {
  it('includes tests in TypeScript typechecking', () => {
    const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8')) as {
      include: string[];
    };

    expect(tsconfig.include).toEqual(expect.arrayContaining(['src', 'test']));
  });

  it('keeps widget entrypoints visible to coverage', async () => {
    const { default: vitestConfig } = await import('../../vitest.config');
    const config = vitestConfig as { test?: { coverage?: { exclude?: string[] } } };

    expect(config.test?.coverage?.exclude).not.toContain('src/widgets/**/*.tsx');
  });
});
