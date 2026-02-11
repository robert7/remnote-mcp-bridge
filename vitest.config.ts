import { defineConfig } from 'vitest/config';
import { version } from './package.json';

export default defineConfig({
  define: {
    __PLUGIN_VERSION__: JSON.stringify(version),
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        'coverage',
        '**/*.config.ts',
        '**/*.config.js',
        'test',
        'webpack.config.js',
        'public',
        'src/widgets/**/*.tsx', // Widget UI files require RemNote environment
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
