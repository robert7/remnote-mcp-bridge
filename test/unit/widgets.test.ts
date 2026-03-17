import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeMocks = vi.hoisted(() => ({
  initializeBridgeRuntime: vi.fn(async () => ({
    getSnapshot: vi.fn(),
    subscribe: vi.fn(),
    reconnect: vi.fn(),
    updateSettings: vi.fn(),
    shutdown: vi.fn(),
  })),
  shutdownBridgeRuntime: vi.fn(),
}));

vi.mock('../../src/bridge/runtime', () => ({
  initializeBridgeRuntime: runtimeMocks.initializeBridgeRuntime,
  shutdownBridgeRuntime: runtimeMocks.shutdownBridgeRuntime,
}));

vi.mock('@remnote/plugin-sdk', () => ({
  declareIndexPlugin: vi.fn(),
  WidgetLocation: {
    RightSidebar: 3,
  },
}));

import type { ReactRNPlugin } from '@remnote/plugin-sdk';
import {
  SETTING_ACCEPT_WRITE_OPERATIONS,
  SETTING_ACCEPT_REPLACE_OPERATION,
  SETTING_AUTO_TAG_ENABLED,
  SETTING_AUTO_TAG,
  SETTING_JOURNAL_PREFIX,
  SETTING_JOURNAL_TIMESTAMP,
  SETTING_WS_URL,
  SETTING_DEFAULT_PARENT,
} from '../../src/settings';
import { activateAutomationBridge, deactivateAutomationBridge } from '../../src/widgets/index';

describe('Automation Bridge activation', () => {
  let mockPlugin: Partial<ReactRNPlugin>;
  let registerBooleanSettingSpy: ReturnType<typeof vi.fn>;
  let registerStringSettingSpy: ReturnType<typeof vi.fn>;
  let registerWidgetSpy: ReturnType<typeof vi.fn>;
  let unregisterWidgetSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    runtimeMocks.initializeBridgeRuntime.mockClear();
    runtimeMocks.shutdownBridgeRuntime.mockClear();

    registerBooleanSettingSpy = vi.fn(async () => {});
    registerStringSettingSpy = vi.fn(async () => {});
    registerWidgetSpy = vi.fn(async () => {});
    unregisterWidgetSpy = vi.fn(async () => {});

    mockPlugin = {
      rootURL: 'https://example.test/plugin/',
      settings: {
        registerBooleanSetting: registerBooleanSettingSpy,
        registerStringSetting: registerStringSettingSpy,
      } as unknown as ReactRNPlugin['settings'],
      app: {
        registerWidget: registerWidgetSpy,
        unregisterWidget: unregisterWidgetSpy,
      } as unknown as ReactRNPlugin['app'],
    };
  });

  it('registers settings, initializes the runtime, and registers the sidebar widget', async () => {
    await activateAutomationBridge(mockPlugin as ReactRNPlugin);

    expect(registerBooleanSettingSpy).toHaveBeenCalledTimes(4);
    expect(registerStringSettingSpy).toHaveBeenCalledTimes(4);
    expect(registerBooleanSettingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: SETTING_ACCEPT_WRITE_OPERATIONS })
    );
    expect(registerBooleanSettingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: SETTING_ACCEPT_REPLACE_OPERATION })
    );
    expect(registerBooleanSettingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: SETTING_AUTO_TAG_ENABLED })
    );
    expect(registerBooleanSettingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: SETTING_JOURNAL_TIMESTAMP })
    );
    expect(registerStringSettingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: SETTING_AUTO_TAG })
    );
    expect(registerStringSettingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: SETTING_JOURNAL_PREFIX })
    );
    expect(registerStringSettingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: SETTING_WS_URL })
    );
    expect(registerStringSettingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: SETTING_DEFAULT_PARENT })
    );

    expect(runtimeMocks.initializeBridgeRuntime).toHaveBeenCalledWith(mockPlugin);
    expect(registerWidgetSpy).toHaveBeenCalledWith('mcp_bridge', 3, {
      widgetTabIcon: 'https://example.test/plugin/mcp-icon.svg',
    });
  });

  it('shuts down the runtime and unregisters the sidebar widget on deactivate', async () => {
    await deactivateAutomationBridge(mockPlugin as ReactRNPlugin);

    expect(runtimeMocks.shutdownBridgeRuntime).toHaveBeenCalledTimes(1);
    expect(unregisterWidgetSpy).toHaveBeenCalledWith('mcp_bridge', 3);
  });
});
