import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('project config', () => {
  it('includes tests in TypeScript typechecking', () => {
    const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8')) as {
      include: string[];
    };

    expect(tsconfig.include).toEqual(expect.arrayContaining(['src', 'test']));
  });
});
