import { describe, expect, it, vi } from 'vitest';
import { resolveTrackerHook } from '../../src/widgets/tracker-compat';

type TrackerHook = <T>(userFunc: () => Promise<T>, deps?: unknown[]) => T | undefined;

describe('resolveTrackerHook', () => {
  it('prefers useTrackerPlugin when both hook names are present', () => {
    const useTrackerPlugin = vi.fn() as unknown as TrackerHook;
    const useTracker = vi.fn() as unknown as TrackerHook;

    const resolved = resolveTrackerHook({ useTrackerPlugin, useTracker });

    expect(resolved).toBe(useTrackerPlugin);
  });

  it('uses useTracker when useTrackerPlugin is missing', () => {
    const useTracker = vi.fn() as unknown as TrackerHook;

    const resolved = resolveTrackerHook({ useTracker });

    expect(resolved).toBe(useTracker);
  });

  it('falls back to an internal tracker when no supported hooks are exported', () => {
    const resolved = resolveTrackerHook({});

    expect(typeof resolved).toBe('function');
  });

  it('ignores non-function exports and still falls back safely', () => {
    const resolved = resolveTrackerHook({
      useTrackerPlugin: 'not-a-function' as unknown as TrackerHook,
      useTracker: null as unknown as TrackerHook,
    });

    expect(typeof resolved).toBe('function');
  });
});
