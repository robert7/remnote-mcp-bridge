import { beforeEach, afterEach, vi } from 'vitest';

// Mock console.error globally to prevent test pollution
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
