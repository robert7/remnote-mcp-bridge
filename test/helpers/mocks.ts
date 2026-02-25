/**
 * Mock implementations for testing
 */
import { vi } from 'vitest';
import type { ReactRNPlugin, RichTextInterface, Rem } from '@remnote/plugin-sdk';
import { RemType } from '@remnote/plugin-sdk';
import { BridgeRequest } from '../../src/bridge/websocket-client';

/**
 * Mock WebSocket implementation
 */
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.onclose?.(event);
  }

  // Helper to simulate receiving a message
  simulateMessage(data: string | object): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    const event = new MessageEvent('message', { data: message });
    this.onmessage?.(event);
  }

  // Helper to simulate connection error
  simulateError(): void {
    const event = new Event('error');
    this.onerror?.(event);
  }
}

/**
 * Mock Rem implementation
 */
export class MockRem implements Partial<Rem> {
  _id: string;
  text: RichTextInterface;
  backText?: RichTextInterface;
  type: RemType = RemType.DEFAULT_TYPE;
  private children: MockRem[] = [];
  private tags: string[] = [];
  private parent: MockRem | null = null;
  private _isDocument = false;
  private _powerups: string[] = [];
  private _practiceDirection: 'forward' | 'backward' | 'both' | 'none' = 'none';
  private _aliases: MockRem[] = [];
  private _taggedRems: MockRem[] = [];
  private _isPowerupProperty = false;
  private _isPowerupPropertyListItem = false;
  private _isPowerupSlot = false;
  private _isPowerupEnum = false;

  constructor(id: string, text: string) {
    this._id = id;
    this.text = [text];
  }

  /** Configure mock to behave as a document */
  setIsDocumentMock(val: boolean): void {
    this._isDocument = val;
  }

  /** Add a powerup code (e.g. BuiltInPowerupCodes.DailyDocument) */
  addPowerupMock(code: string): void {
    this._powerups.push(code);
  }

  /** Set the mock practice direction */
  setPracticeDirectionMock(dir: 'forward' | 'backward' | 'both' | 'none'): void {
    this._practiceDirection = dir;
  }

  /** Set mock aliases (pass RichTextInterface arrays which become MockRem .text) */
  setAliasesMock(aliases: RichTextInterface[]): void {
    this._aliases = aliases.map((rt, idx) => {
      const aliasRem = new MockRem(`${this._id}_alias_${idx}`, '');
      aliasRem.text = rt;
      return aliasRem;
    });
  }

  async getAliases(): Promise<MockRem[]> {
    return this._aliases;
  }

  setTaggedRemsMock(taggedRems: MockRem[]): void {
    this._taggedRems = taggedRems;
  }

  async taggedRem(): Promise<MockRem[]> {
    return this._taggedRems;
  }

  setPowerupPropertyMock(val: boolean): void {
    this._isPowerupProperty = val;
  }

  setPowerupPropertyListItemMock(val: boolean): void {
    this._isPowerupPropertyListItem = val;
  }

  setPowerupSlotMock(val: boolean): void {
    this._isPowerupSlot = val;
  }

  setPowerupEnumMock(val: boolean): void {
    this._isPowerupEnum = val;
  }

  async isDocument(): Promise<boolean> {
    return this._isDocument;
  }

  async hasPowerup(code: string): Promise<boolean> {
    return this._powerups.includes(code);
  }

  async getPracticeDirection(): Promise<'forward' | 'backward' | 'both' | 'none'> {
    return this._practiceDirection;
  }

  async isPowerupProperty(): Promise<boolean> {
    return this._isPowerupProperty;
  }

  async isPowerupPropertyListItem(): Promise<boolean> {
    return this._isPowerupPropertyListItem;
  }

  async isPowerupSlot(): Promise<boolean> {
    return this._isPowerupSlot;
  }

  async isPowerupEnum(): Promise<boolean> {
    return this._isPowerupEnum;
  }

  async setText(text: RichTextInterface): Promise<void> {
    this.text = text;
  }

  async setParent(parent: Rem | Rem): Promise<void> {
    this.parent = parent as MockRem;
    if (!this.parent.children.includes(this)) {
      this.parent.children.push(this);
    }
  }

  async getChildrenRem(): Promise<MockRem[]> {
    return this.children;
  }

  async getParentRem(): Promise<MockRem | undefined> {
    return this.parent ?? undefined;
  }

  async addTag(tagId: string): Promise<void> {
    if (!this.tags.includes(tagId)) {
      this.tags.push(tagId);
    }
  }

  async removeTag(tagId: string): Promise<void> {
    this.tags = this.tags.filter((id) => id !== tagId);
  }

  getTags(): string[] {
    return this.tags;
  }
}

/**
 * Mock RemNote Plugin SDK
 */
export class MockRemNotePlugin implements Partial<ReactRNPlugin> {
  private rems = new Map<string, MockRem>();
  private remsByName = new Map<string, MockRem>();
  private nextId = 1;

  rem = {
    createRem: vi.fn(async (): Promise<MockRem> => {
      const id = `rem_${this.nextId++}`;
      const rem = new MockRem(id, '');
      this.rems.set(id, rem);
      return rem;
    }),

    findOne: vi.fn(async (id: string): Promise<MockRem | null> => {
      return this.rems.get(id) || null;
    }),

    findByName: vi.fn(async (names: string[], _parent: unknown): Promise<MockRem | null> => {
      const name = names[0];
      return this.remsByName.get(name) || null;
    }),
  };

  search = {
    search: vi.fn(
      async (
        _query: RichTextInterface,
        _filter?: unknown,
        options?: { numResults?: number }
      ): Promise<MockRem[]> => {
        const limit = options?.numResults ?? 20;
        return Array.from(this.rems.values()).slice(0, limit);
      }
    ),
  };

  date = {
    getDailyDoc: vi.fn(async (_date: Date): Promise<MockRem> => {
      const id = 'daily_doc';
      let dailyDoc = this.rems.get(id);
      if (!dailyDoc) {
        dailyDoc = new MockRem(id, 'Daily Document');
        this.rems.set(id, dailyDoc);
      }
      return dailyDoc;
    }),
  };

  settings = {
    getSetting: vi.fn(async (id: string): Promise<unknown> => {
      return this.getSettingValue(id);
    }),

    setSetting: vi.fn(async (_id: string, _value: unknown): Promise<void> => {
      // Mock implementation
    }),

    registerBooleanSetting: vi.fn(async (): Promise<void> => {
      // Mock implementation
    }),

    registerStringSetting: vi.fn(async (): Promise<void> => {
      // Mock implementation
    }),
  };

  app = {
    registerWidget: vi.fn(async (): Promise<void> => {
      // Mock implementation
    }),

    registerCommand: vi.fn(async (): Promise<void> => {
      // Mock implementation
    }),
  };

  // Helper methods
  private settingsStore = new Map<string, unknown>();

  private getSettingValue(id: string): unknown {
    return this.settingsStore.get(id);
  }

  setTestSetting(id: string, value: unknown): void {
    this.settingsStore.set(id, value);
  }

  addTestRem(id: string, text: string, name?: string): MockRem {
    const rem = new MockRem(id, text);
    this.rems.set(id, rem);
    if (name) {
      this.remsByName.set(name, rem);
    }
    return rem;
  }

  clearTestData(): void {
    this.rems.clear();
    this.remsByName.clear();
    this.settingsStore.clear();
    this.nextId = 1;
  }
}

/**
 * Helper to create mock MCP requests
 */
export function createMockRequest(
  action: string,
  payload: Record<string, unknown> = {}
): BridgeRequest {
  return {
    id: `req_${Date.now()}`,
    action,
    payload,
  };
}
