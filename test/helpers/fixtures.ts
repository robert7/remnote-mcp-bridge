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
  SearchResultItem,
  NoteChild,
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
  tags: ['test', 'sample'],
};

export const appendJournalInput: AppendJournalParams = {
  content: 'Journal entry for today',
  timestamp: true,
};

export const searchInput: SearchParams = {
  query: 'test query',
  limit: 10,
  includeContent: true,
};

export const readNoteInput: ReadNoteParams = {
  remId: 'rem_123',
  depth: 2,
};

export const updateNoteInput: UpdateNoteParams = {
  remId: 'rem_123',
  title: 'Updated Title',
  appendContent: 'New content line',
  addTags: ['new-tag'],
  removeTags: ['old-tag'],
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
  content: '[Claude] [12:00:00 PM] Journal entry for today',
};

export const sampleSearchResults: SearchResultItem[] = [
  {
    remId: 'rem_1',
    title: 'First Result',
    preview: 'First Result',
    content: 'Child content 1\nChild content 2',
  },
  {
    remId: 'rem_2',
    title: 'Second Result',
    preview: 'Second Result',
  },
];

export const sampleNoteChildren: NoteChild[] = [
  {
    remId: 'rem_child_1',
    text: 'Child 1',
    children: [
      {
        remId: 'rem_grandchild_1',
        text: 'Grandchild 1',
        children: [],
      },
    ],
  },
  {
    remId: 'rem_child_2',
    text: 'Child 2',
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
