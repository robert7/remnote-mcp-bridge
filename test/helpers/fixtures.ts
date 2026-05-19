/**
 * Test fixtures and sample data
 */
import type { RichTextInterface } from '@remnote/plugin-sdk';
import type {
  CreateNoteParams,
  AppendJournalParams,
  SearchParams,
  ReadNoteParams,
  UpdateNoteParams,
  InsertChildrenParams,
  ReplaceChildrenParams,
  UpdateTagsParams,
  SearchResultItem,
  StructuredContentNode,
} from '../../src/api/rem-adapter';

/**
 * Sample RichText values
 */
export const sampleRichText: RichTextInterface = ['Sample text content'];

/**
 * Sample MCP action inputs
 */
export const createNoteInput: CreateNoteParams = {
  title: 'Test Note',
  content: 'This is test content\nWith multiple lines',
  tagRemIds: ['test-tag-rem-id', 'sample-tag-rem-id'],
};

export const appendJournalInput: AppendJournalParams = {
  content: 'Journal entry for today',
  timestamp: true,
  tagRemIds: ['journal-tag-rem-id'],
};

export const searchInput: SearchParams = {
  query: 'test query',
  limit: 10,
  contentMode: 'markdown',
};

export const readNoteInput: ReadNoteParams = {
  remId: 'rem_123',
  depth: 2,
};

export const updateNoteInput: UpdateNoteParams = {
  remId: 'rem_123',
  title: 'Updated Title',
};

export const insertChildrenInput: InsertChildrenParams = {
  parentRemId: 'rem_123',
  content: 'New content line',
  position: 'last',
};

export const replaceChildrenInput: ReplaceChildrenParams = {
  parentRemId: 'rem_123',
  content: 'Replacement content line',
};

export const updateTagsInput: UpdateTagsParams = {
  remId: 'rem_123',
  addTagRemIds: ['new-tag-rem-id'],
  removeTagRemIds: ['old-tag-rem-id'],
};

/**
 * Sample MCP responses
 */
export const sampleNoteResult = {
  remId: 'rem_123',
  title: 'Test Note',
};

export const sampleJournalResult = {
  remId: 'rem_456',
  content: '[12:00:00 PM] Journal entry for today',
};

export const sampleSearchResults: SearchResultItem[] = [
  {
    remId: 'rem_1',
    title: 'First Result',
    headline: 'First Result',
    remType: 'text',
    content: 'Child content 1\nChild content 2',
  },
  {
    remId: 'rem_2',
    title: 'Second Result',
    headline: 'Second Result',
    remType: 'text',
  },
];

export const sampleNoteChildren: StructuredContentNode[] = [
  {
    remId: 'rem_child_1',
    title: 'Child 1',
    headline: 'Child 1',
    remType: 'text',
    children: [
      {
        remId: 'rem_grandchild_1',
        title: 'Grandchild 1',
        headline: 'Grandchild 1',
        remType: 'text',
        children: [],
      },
    ],
  },
  {
    remId: 'rem_child_2',
    title: 'Child 2',
    headline: 'Child 2',
    remType: 'text',
    children: [],
  },
];

/**
 * Sample WebSocket messages
 */
export const samplePingMessage = { type: 'ping' };
export const samplePongMessage = { type: 'pong' };

export const sampleRequestMessage = {
  id: 'req_123',
  action: 'create_note',
  payload: createNoteInput,
};

export const sampleResponseMessage = {
  id: 'req_123',
  result: sampleNoteResult,
};

export const sampleErrorMessage = {
  id: 'req_123',
  error: 'Something went wrong',
};
