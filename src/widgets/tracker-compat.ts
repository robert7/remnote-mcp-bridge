import { useEffect, useState } from 'react';
import * as RemNoteSDK from '@remnote/plugin-sdk';

type TrackerHook = <T>(userFunc: () => Promise<T>, deps?: unknown[]) => T | undefined;

function useFallbackTracker<T>(userFunc: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    let isActive = true;

    void userFunc()
      .then((nextValue) => {
        if (isActive) {
          setValue(nextValue);
        }
      })
      .catch(() => {
        if (isActive) {
          setValue(undefined);
        }
      });

    return () => {
      isActive = false;
    };
  }, deps);

  return value;
}

type TrackerSdkShape = {
  useTrackerPlugin?: TrackerHook;
  useTracker?: TrackerHook;
};

export function resolveTrackerHook(sdk: TrackerSdkShape): TrackerHook {
  if (typeof sdk.useTrackerPlugin === 'function') {
    return sdk.useTrackerPlugin;
  }

  if (typeof sdk.useTracker === 'function') {
    return sdk.useTracker;
  }

  return useFallbackTracker;
}

export const useCompatibleTracker = resolveTrackerHook(RemNoteSDK as TrackerSdkShape);
