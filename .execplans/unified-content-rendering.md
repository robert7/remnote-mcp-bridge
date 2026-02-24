# Unified Content Rendering for RemNote Automation Bridge

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and
`Outcomes & Retrospective` must be kept up to date as work proceeds. This document must be maintained in accordance
with `.agents/PLANS.md` (repository root).

## Purpose / Big Picture

Today, the `remnote_read_note` tool returns a `content` field that is just a copy of the `title` — entirely redundant.
The `children` array exists but is only useful for programmatic traversal; AI assistants and CLI users have no
pre-rendered, human-readable view of a Rem's full subtree. Search results that opt into `includeContent` get a bare
concatenation of the first five child lines with no hierarchy, no depth control, and no type-aware formatting.

After this change, both `remnote_search` and `remnote_read_note` will support a unified `includeContent` mode with
three values: `"none"`, `"markdown"`, and `"structured"`.

1. `includeContent: "markdown"` returns a `content` field containing a rendered, indented markdown representation of
   the Rem's child subtree — complete with type-aware delimiters (`::`/`;;`/`>>`) for flashcard-style Rems, bullet
   prefixes, and hierarchy indentation.
2. `includeContent: "structured"` returns a `contentTree` field containing nested JSON nodes with semantic metadata
   (`remType`, `cardDirection`, `remId`, `title`, `detail`, `headline`, `children`).
3. A `contentProperties` object reports `childrenRendered` / `childrenTotal` (capped at 2000) and a truncation flag
   when markdown content is clipped.
4. An `aliases` array surfaces alternate names from `rem.getAliases()`.
5. A new `headline` field provides a display-oriented full line (`title + type-aware delimiter + detail`) while
   preserving `title` and `detail` as semantic fields.
6. Consistent default `depth` of 5 (up from 3) and new `childLimit` / `maxContentLength` knobs.

The net effect: an AI assistant calling `remnote_read_note` gets either a rich, readable document in `content`
(markdown mode) or a machine-friendly hierarchy (`structured` mode) without custom client-side reconstruction, and
search previews become genuinely useful. CLI text output can render markdown content directly.

This ExecPlan intentionally includes coordinated changes across all three repositories (`remnote-mcp-bridge`,
`remnote-mcp-server`, `remnote-cli`). We will increment `0.x` versions and update changelogs/docs together; contract
breaks are acceptable for this release line. See `docs/guides/bridge-consumer-version-compatibility.md`.

## Progress

- [x] Initial ExecPlan authored.
- [x] Milestone 1+2 (merged): Bridge — aliases, delimiters, renderContentMarkdown, updated interfaces, integrated into search() and readNote().
- [x] Milestone 3: MCP Server — schema and tool definition updates.
- [x] Milestone 4: CLI — command option and formatter updates.
- [x] Milestone 5: Tests, documentation, code quality.

## Surprises & Discoveries

- SDK `getAliases()` returns `Rem[]` (alias Rems), not `RichTextInterface[]`. Adjusted adapter to extract `.text` from each alias Rem.
- `structured` mode deferred per plan review; only `none` + `markdown` shipped.
- Milestones 1+2 merged since they're naturally coupled and untestable independently.

## Decision Log

- Decision: This feature is implemented as a coordinated contract change across bridge + MCP server + CLI (all three
  repos), with `0.x` version increments.
  Rationale: A clean contract is preferable to compatibility shims while the integration remains pre-1.0. Version
  matching is documented in `docs/guides/bridge-consumer-version-compatibility.md`.
  Date/Author: 2026-02-24 / Robert + Mei

- Decision: `includeContent` becomes a string mode parameter with values `"none" | "markdown"` initially
  (hard swap from boolean; no deprecated alias). `"structured"` mode deferred to follow-up.
  Rationale: A single mode parameter cleanly expresses output shape selection for both search and read without stacking
  booleans (`includeContent` + `includeChildren`) or mode-specific exceptions. Deferring `structured` mode reduces
  surface area until markdown mode is proven.
  Date/Author: 2026-02-24 / Robert + Mei

- Decision: `contentProperties` uses `childrenRendered` and `childrenTotal` (capped at 2000), plus a truncation
  indicator when markdown content is clipped by `maxContentLength`.
  Rationale: `childrenRendered` tells the consumer how many children appear in the rendered `content`. `childrenTotal`
  tells them the true scope of the subtree so they can decide whether to request more. The 2000 cap prevents expensive
  full-tree counting on massive Rems.
  Date/Author: 2026-02-21 / Robert + Mei

- Decision: Default depth bumped from 3 to 5 everywhere (bridge, MCP server schemas, CLI defaults).
  Rationale: Depth 3 was too shallow for typical RemNote knowledge bases, cutting off meaningful context. Depth 5 covers
  the vast majority of practical hierarchies without excessive cost.
  Date/Author: 2026-02-21 / Robert + Mei

- Decision: Basic card delimiter is `>>` (concept = `::`, descriptor = `;;`, all others = `>>`).
  Rationale: Follows established RemNote conventions that users already recognise. Keeps rendered content readable and
  type-identifiable.
  Date/Author: 2026-02-21 / Robert + Mei

- Decision: Replace current `getContentPreview()` (flat 5-child concatenation) with unified `renderContentMarkdown()`.
  Rationale: Single rendering path for both search and read avoids divergent behavior and ensures consistent output.
  Date/Author: 2026-02-21 / Robert + Mei

- Decision: Same parameter names (`includeContent`, `childLimit`, `depth`, `maxContentLength`) are used for both
  search and read_note actions, with shared mode semantics.
  Rationale: Consistency for API consumers — learn once, use everywhere.
  Date/Author: 2026-02-21 / Robert + Mei

- Decision: Add `headline` as a display-oriented field while retaining `title` and `detail`.
  Rationale: `headline` keeps list rendering, markdown rendering, and structured-node rendering consistent, while
  `title` / `detail` remain semantically useful for downstream consumers.
  Date/Author: 2026-02-24 / Robert + Mei

## Outcomes & Retrospective

(To be populated at completion.)

## Context and Orientation

This section describes the current state of the three projects involved, as of 2026-02-21. A reader needs only the
current working tree and this ExecPlan to implement the feature.

### Repository Layout

Three sibling repositories collaborate to expose RemNote operations externally:

    remnote-mcp-bridge/     ← This repo (RemNote plugin). Default branch: main
    remnote-mcp-server/     ← MCP server companion. Sibling at ../remnote-mcp-server
    remnote-cli/            ← CLI companion. Sibling at ../remnote-cli

Data flows: AI/CLI → MCP Server or CLI daemon → WebSocket → Bridge Plugin → RemNote SDK → Knowledge Base.

The bridge plugin is the only component that talks to the RemNote SDK. The MCP server and CLI are pass-through
consumers — they forward parameters to the bridge and return results unchanged. This means all rendering logic lives
in the bridge plugin; the MCP server and CLI only need schema/option changes to expose the new parameters and fields.

### Key Files in remnote-mcp-bridge

All paths are relative to the bridge repo root.

**`src/api/rem-adapter.ts`** (646 lines) — The core adapter. Contains:

- `RemAdapter` class with methods: `createNote`, `appendJournal`, `search`, `readNote`, `updateNote`, `getStatus`.
- `extractText(richText, visitedIds?)` — Private method that converts RemNote `RichTextInterface` arrays to markdown
  strings. Handles plain strings, formatted text (`i:'m'` with bold/italic/code/url), Rem references (`i:'q'`), global
  names (`i:'g'`), LaTeX (`i:'x'`), annotations (`i:'n'`), images (`i:'i'`), audio (`i:'a'`), drawings (`i:'r'`), card
  delimiters (`i:'s'`), and plugin elements (`i:'p'`). Uses a `visitedIds` set for circular reference protection.
- `classifyRem(rem)` — Maps a Rem to one of: `document`, `dailyDocument`, `concept`, `descriptor`, `portal`, `text`.
- `mapCardDirection(sdkDirection)` — Maps SDK direction to contract values.
- `getCardDelimiterIndex(richText)` — Finds inline card delimiter (`i:'s'`) position.
- `getTitleAndDetail(rem)` — Splits title/detail using delimiter or backText.
- `getContentPreview(rem)` — Current content preview: joins text of first 5 children. **Will be replaced.**
- `getChildrenRecursive(rem, depth)` — Recursive child tree builder. **Will become opt-in.**

Current interfaces:

    interface SearchParams {
      query: string;
      limit?: number;
      includeContent?: 'none' | 'markdown' | 'structured';
    }

    interface ReadNoteParams {
      remId: string;
      includeContent?: 'none' | 'markdown' | 'structured';
      depth?: number;
    }

    interface NoteChild {
      remId: string;
      text: string;
      children: NoteChild[];
    }

    interface SearchResultItem {
      remId: string;
      title: string;
      detail?: string;
      headline: string;
      remType: RemClassification;
      cardDirection?: CardDirection;
      content?: string;
      contentTree?: ContentNode[];
    }

Constants:

    DEFAULT_SEARCH_LIMIT = 50
    SEARCH_CONTENT_CHILD_LIMIT = 5
    DEFAULT_READ_DEPTH = 3

**`src/settings.ts`** (27 lines) — Plugin settings interface:

    interface MCPSettings {
      autoTagEnabled: boolean;
      autoTag: string;
      journalPrefix: string;
      journalTimestamp: boolean;
      wsUrl: string;
      defaultParentId: string;
    }

**`test/unit/rem-adapter.test.ts`** (941 lines) — Comprehensive tests for the adapter. Uses `MockRem` and
`MockRemNotePlugin` from `test/helpers/mocks.ts`. Tests cover: CRUD, search sorting, rich text extraction, metadata
fields, tag management.

**`test/helpers/mocks.ts`** (260 lines) — Mock implementations:

- `MockRem` — Implements Rem interface subset with: `_id`, `text`, `backText`, `type`, children/tags/parent management,
  `isDocument()`, `hasPowerup()`, `getPracticeDirection()`, `getChildrenRem()`. **Does NOT yet have `getAliases()`.**
- `MockRemNotePlugin` — Mock plugin with `rem`, `search`, `date`, `settings`, `app` namespaces.

**`docs/reference/remnote/bridge-search-read-contract.md`** — Output contract for search and read_note. Defines field
semantics for `title`, `detail`, `remType`, `cardDirection`. Does NOT yet document `content` rendering, `aliases`,
`contentProperties`, or `children` opt-in behavior.

### Key Files in remnote-mcp-server

All paths relative to `../remnote-mcp-server`.

**`src/schemas/remnote-schemas.ts`** (33 lines) — Zod schemas for input validation:

    SearchSchema = z.object({
      query: z.string(),
      limit: z.number().int().min(1).max(150).default(50),
      includeContent: z.boolean().default(false),
    })

    ReadNoteSchema = z.object({
      remId: z.string(),
      depth: z.number().int().min(0).max(10).default(3),
    })

**`src/tools/index.ts`** (272 lines) — MCP tool definitions and dispatch. Each tool has `inputSchema` and optional
`outputSchema` as JSON Schema objects. The `CallToolRequestSchema` handler parses input with Zod, calls
`wsServer.sendRequest(action, args)`, and returns the bridge response as JSON text. No transformation occurs.

Current `SEARCH_TOOL.inputSchema` has: `query`, `limit`, `includeContent`.
Current `READ_NOTE_TOOL.inputSchema` has: `remId`, `depth`.
Both have `outputSchema` definitions that list known response fields.

### Key Files in remnote-cli

All paths relative to `../remnote-cli`.

**`src/commands/search.ts`** (72 lines) — Search command. Options: `--limit`, `--include-content`. Text formatter
renders each result as: `{i}. {typeTag}{title}{detailSuffix} [{remId}]`. Does not render children or content
hierarchy.

**`src/commands/read.ts`** (45 lines) — Read command. Options: `--depth` (default: `'1'` — note: CLI defaults to 1,
not the bridge's 3). Text formatter renders: `Title:`, `ID:`, `Content:`, `Tags:`, `Children: {count}`. Only shows
child count, never renders the tree.

**`src/output/formatter.ts`** (35 lines) — Generic formatter: dispatches to `textFormatter` callback for text mode,
`JSON.stringify` for JSON mode.

### RemNote SDK Concepts

**Rem** — The atomic unit in RemNote. Has an ID, rich text content (`text` as `RichTextInterface`), optional back text
(`backText`), a type (`RemType`), children, tags, and aliases.

**`rem.getAliases()`** — Returns an array of Rems that serve as alternate names for the Rem. Each alias Rem has its own
`text` property (a `RichTextInterface`). Returns empty array if no aliases exist.

**RichTextInterface** — Array of elements: plain strings and structured objects with discriminant `i` field. Card
delimiter (`i:'s'`) separates front/back of flashcard-style Rems.

**Card Delimiters in RemNote** — Concept Rems use `::` (visually), Descriptor Rems use `;;`, and basic (non-typed)
cards use `>>`. These are the human-readable representations of the `i:'s'` structural marker. The SDK stores all
three as the same `i:'s'` element; the visual difference comes from the Rem's type.

## Plan of Work

The work is organized into five milestones. Each milestone is independently verifiable and builds incrementally toward
the complete feature.

### Milestone 1: Bridge Foundation — New Methods and Updated Interfaces

This milestone adds the building blocks without changing existing behavior. At the end, the new methods exist and are
tested in isolation, but `search()` and `readNote()` still behave as before.

#### 1a. Add `getAliases()` private method to `RemAdapter`

In `src/api/rem-adapter.ts`, add a new private method after `getTitleAndDetail`:

    private async getAliases(rem: Rem): Promise<string[] | undefined> {
      const aliases = await rem.getAliases();
      if (!aliases || aliases.length === 0) return undefined;
      const texts = await Promise.all(
        aliases.map((alias) => this.extractText(alias.text))
      );
      const filtered = texts.filter((t) => t.length > 0);
      return filtered.length > 0 ? filtered : undefined;
    }

#### 1b. Add `getRemTypeDelimiter()` private method

In `src/api/rem-adapter.ts`, add after `getAliases`:

    private getRemTypeDelimiter(remType: RemClassification): string {
      switch (remType) {
        case 'concept':
          return ' :: ';
        case 'descriptor':
          return ' ;; ';
        default:
          return ' >> ';
      }
    }

This returns the human-readable delimiter string that represents the card separator for a given Rem type. Only used
when a Rem has both title and detail (front/back).

#### 1c. Add `formatHeadline()` private method

Add a shared formatter used by search results, markdown rendering, and structured nodes:

    private formatHeadline(parts: { title: string; detail?: string; remType: RemClassification }): string {
      if (!parts.detail) return parts.title;
      return `${parts.title}${this.getRemTypeDelimiter(parts.remType)}${parts.detail}`;
    }

#### 1d. Add `renderContentMarkdown()` private method

This is the core new method. It recursively traverses children, rendering each as an indented markdown bullet, and
tracks how many children were visited.

    private async renderContentMarkdown(
      rem: Rem,
      options: { childLimit: number; depth: number }
    ): Promise<{ markdown: string; childrenRendered: number; maxDepthReached: number }> {
      let childrenRendered = 0;
      let maxDepthReached = 0;
      const lines: string[] = [];

      const traverse = async (parentRem: Rem, currentDepth: number): Promise<void> => {
        if (currentDepth > options.depth) return;
        const children = await parentRem.getChildrenRem();
        if (!children || children.length === 0) return;

        for (const child of children) {
          if (childrenRendered >= options.childLimit) return;

          const { title, detail } = await this.getTitleAndDetail(child);
          const remType = await this.classifyRem(child);
          const indent = '  '.repeat(currentDepth);

          const headline = this.formatHeadline({ title, detail, remType });
          const line = `${indent}- ${headline}`;
          lines.push(line);
          childrenRendered++;
          if (currentDepth > maxDepthReached) maxDepthReached = currentDepth;

          await traverse(child, currentDepth + 1);
        }
      };

      await traverse(rem, 0);
      return { markdown: lines.join('\n'), childrenRendered, maxDepthReached };
    }

Key behaviors:

- Indentation: 2 spaces per depth level, with `- ` bullet prefix.
- Delimiter: only appended when `detail` exists, using type-aware delimiter.
- `childLimit` is a total across ALL levels (not per-level). Once reached, traversal stops.
- `maxDepthReached` records the deepest level actually visited (may be less than `options.depth`).
- Depth 0 = direct children of the target Rem.

#### 1e. Add `countChildren()` private method

For `contentProperties.childrenTotal`, we need a fast count capped at 2000:

    private async countChildren(rem: Rem, cap: number): Promise<number> {
      let count = 0;
      const stack: Rem[] = [rem];
      while (stack.length > 0 && count < cap) {
        const current = stack.pop()!;
        const children = await current.getChildrenRem();
        if (!children) continue;
        for (const child of children) {
          count++;
          if (count >= cap) break;
          stack.push(child);
        }
      }
      return count;
    }

This uses iterative depth-first traversal (avoids deep call stacks) and stops as soon as `cap` is reached.

#### 1f. Update interfaces

In `src/api/rem-adapter.ts`, update the existing interfaces and add new ones:

Add a new `ContentProperties` interface:

    export interface ContentProperties {
      childrenRendered: number;
      childrenTotal: number;
      contentTruncated?: boolean;
    }

Update `SearchParams`:

    export interface SearchParams {
      query: string;
      limit?: number;
      includeContent?: 'none' | 'markdown' | 'structured';
      childLimit?: number;
      depth?: number;
      maxContentLength?: number;
    }

Update `ReadNoteParams`:

    export interface ReadNoteParams {
      remId: string;
      includeContent?: 'none' | 'markdown' | 'structured';
      depth?: number;
      childLimit?: number;
      maxContentLength?: number;
    }

Update `SearchResultItem`:

    export interface ContentTreeNode {
      remId: string;
      remType: RemClassification;
      cardDirection?: CardDirection;
      title: string;
      detail?: string;
      headline: string;
      children: ContentTreeNode[];
    }

    export interface SearchResultItem {
      remId: string;
      title: string;
      detail?: string;
      headline: string;
      aliases?: string[];
      remType: RemClassification;
      cardDirection?: CardDirection;
      content?: string;
      contentTree?: ContentTreeNode[];
      contentProperties?: ContentProperties;
    }

#### 1g. Update constants

Replace existing constants:

    const DEFAULT_READ_DEPTH = 3;         →  const DEFAULT_DEPTH = 5;
    const SEARCH_CONTENT_CHILD_LIMIT = 5; →  (remove — replaced by DEFAULT_CHILD_LIMIT)

Add new constants:

    const DEFAULT_CHILD_LIMIT = 100;
    const CHILDREN_TOTAL_CAP = 2000;
    const DEFAULT_SEARCH_MAX_CONTENT_LENGTH = 3000;
    const DEFAULT_READ_MAX_CONTENT_LENGTH = 100000;

#### 1h. Update MockRem for aliases

In `test/helpers/mocks.ts`, add to `MockRem`:

    private _aliases: MockRem[] = [];

    setAliasesMock(aliases: MockRem[]): void {
      this._aliases = aliases;
    }

    async getAliases(): Promise<MockRem[]> {
      return this._aliases;
    }

#### 1i. Tests for Milestone 1

Add new test sections in `test/unit/rem-adapter.test.ts`:

**Aliases tests**: Verify `getAliases()` returns resolved text, handles empty aliases, handles Rems with no aliases
method result.

**Delimiter tests**: Verify `getRemTypeDelimiter()` returns `::` for concept, `;;` for descriptor, `>>` for all
others.

**renderContentMarkdown tests**: Verify indentation, bullet format, childLimit cap, depth cap, delimiter inclusion when
detail exists, empty children case.

**countChildren tests**: Verify cap behavior, deeply nested trees, empty tree returns 0.

These tests exercise the new methods via `readNote()` and `search()` in later milestones, but Milestone 1 can verify
them through a minimal integration: create a Rem with known children, call `readNote` with specific `childLimit`/`depth`
values, and inspect the returned `content` and `contentProperties`.

Note: Since the new methods are private, test them through the public API surface (`readNote`, `search`). Add them as
part of a Milestone 1 verification by implementing the readNote integration early enough to test, or expose them
temporarily via a test-only subclass.

Recommendation: implement Milestones 1 and 2 together (they are naturally coupled), and test through the public API.

### Milestone 2: Bridge Integration — Wire New Methods into search() and readNote()

This milestone modifies the two public methods to use the new rendering pipeline. At the end, `search()` and
`readNote()` support `includeContent` modes (`none` / `markdown` / `structured`) and return `headline`, `aliases`, and
mode-appropriate content fields (`content` or `contentTree`) plus `contentProperties`.

#### 2a. Update `readNote()` method

Replace the current implementation body of `readNote()` in `src/api/rem-adapter.ts`. The new behavior:

1. Resolve the Rem and extract `title`, `detail`, `remType`, `cardDirection`, `aliases` (same as today for
   title/detail/remType/cardDirection, plus new aliases).
2. Resolve `includeContent` mode (`none` / `markdown` / `structured`).
3. For `markdown`, render content markdown using `renderContentMarkdown()` with resolved `childLimit`, `depth`.
4. For `structured`, build a rich `contentTree` hierarchy (with `headline` on each node) with the same depth/limit
   knobs.
5. Truncate markdown `content` to `maxContentLength` if exceeded and set `contentProperties.contentTruncated=true`.
6. Count total children via `countChildren()`.

New return type:

    async readNote(params: ReadNoteParams): Promise<{
      remId: string;
      title: string;
      detail?: string;
      aliases?: string[];
      remType: RemClassification;
      cardDirection?: CardDirection;
      headline: string;
      content?: string;
      contentTree?: ContentTreeNode[];
      contentProperties?: ContentProperties;
    }>

Implementation sketch:

    async readNote(params: ReadNoteParams): Promise<...> {
      const depth = params.depth ?? DEFAULT_DEPTH;
      const childLimit = params.childLimit ?? DEFAULT_CHILD_LIMIT;
      const maxContentLength = params.maxContentLength ?? DEFAULT_READ_MAX_CONTENT_LENGTH;
      const includeContent = params.includeContent ?? 'markdown';

      const rem = await this.plugin.rem.findOne(params.remId);
      if (!rem) throw new Error(`Note not found: ${params.remId}`);

      const [{ title, detail }, remType, cardDirection, aliases] = await Promise.all([
        this.getTitleAndDetail(rem),
        this.classifyRem(rem),
        rem.backText
          ? rem.getPracticeDirection().then((d) => this.mapCardDirection(d))
          : Promise.resolve(undefined),
        this.getAliases(rem),
      ]);

      const { markdown, childrenRendered } =
        await this.renderContentMarkdown(rem, { childLimit, depth });

      let content = markdown;
      if (content.length > maxContentLength) {
        content = content.slice(0, maxContentLength);
      }

      const childrenTotal = await this.countChildren(rem, CHILDREN_TOTAL_CAP);

      const result: Record<string, unknown> = {
        remId: rem._id,
        title,
        ...(detail ? { detail } : {}),
        ...(aliases ? { aliases } : {}),
        remType,
        ...(cardDirection ? { cardDirection } : {}),
        content,
        contentProperties: { childrenRendered, childrenTotal },
      };

      // `includeContent` mode now controls whether markdown content or structured `contentTree` is returned.

      return result as any; // TypeScript will be satisfied via explicit return type
    }

#### 2b. Update `search()` method

Modify the per-result processing in `search()`:

1. Always resolve `aliases` and `headline`.
2. Resolve `includeContent` mode (`none` / `markdown` / `structured`) per result.
3. For `markdown`, render content via `renderContentMarkdown()` instead of `getContentPreview()`.
4. For `structured`, return `contentTree` nodes with the same semantic metadata fields as read mode.
5. Add `contentProperties` when content is requested.

The search-specific defaults differ from read: `maxContentLength` defaults to 3000.

In the per-result loop, after the existing `Promise.all` block that resolves title/detail/remType/cardDirection, add:

    const aliases = await this.getAliases(rem);

    let content: string | undefined;
    let contentProperties: ContentProperties | undefined;
    if (params.includeContent === 'markdown') {
      const searchDepth = params.depth ?? DEFAULT_DEPTH;
      const searchChildLimit = params.childLimit ?? DEFAULT_CHILD_LIMIT;
      const searchMaxContentLength = params.maxContentLength ?? DEFAULT_SEARCH_MAX_CONTENT_LENGTH;

      const rendered = await this.renderContentMarkdown(rem, {
        childLimit: searchChildLimit,
        depth: searchDepth,
      });

      content = rendered.markdown;
      if (content.length > searchMaxContentLength) {
        content = content.slice(0, searchMaxContentLength);
      }

      const childrenTotal = await this.countChildren(rem, CHILDREN_TOTAL_CAP);
      contentProperties = {
        childrenRendered: rendered.childrenRendered,
        childrenTotal,
      };
    }

And include `aliases`, `content`, `contentProperties` in the result item (omitting undefined values).

#### 2c. Remove `getContentPreview()` method

Delete the `getContentPreview()` private method entirely. It is replaced by `renderContentMarkdown()`. Also remove the
`SEARCH_CONTENT_CHILD_LIMIT` constant (no longer used).

#### 2d. Tests for Milestone 2

Extend `test/unit/rem-adapter.test.ts` with:

**readNote unified content tests**:

- Verify `content` field contains indented markdown with bullets for a 3-level hierarchy.
- Verify `contentProperties.childrenRendered` matches actual rendered children.
- Verify `contentProperties.childrenTotal` reflects the full subtree count.
- Verify `content` is truncated when `maxContentLength` is exceeded, and `childrenRendered` still reflects all rendered.
- Verify `readNote` defaults to `includeContent: "markdown"` and returns markdown `content`.
- Verify `readNote` with `includeContent: "none"` omits `content`/`contentTree`.
- Verify `readNote` with `includeContent: "structured"` returns `contentTree`.
- Verify `aliases` appears when Rem has aliases, omitted when none.
- Verify default depth is now 5 (create a 6-level tree; level 6 should not appear).
- Verify `childLimit` stops rendering after N total children across levels.

**readNote delimiter tests**:

- Concept Rem with detail: content line includes ` :: `.
- Descriptor Rem with detail: content line includes ` ;; `.
- Text Rem with detail: content line includes ` >> `.
- Rem without detail: no delimiter in content line.

**search unified content tests**:

- Verify search with `includeContent: "markdown"` returns rendered markdown `content` and `contentProperties`.
- Verify search with `includeContent: "structured"` returns `contentTree` and `contentProperties`.
- Verify search with `includeContent: "none"` (or omitted) omits `content`, `contentTree`, and `contentProperties`.
- Verify search always includes `aliases` when available.
- Verify search respects `childLimit`, `depth`, `maxContentLength` params.

**Backward compatibility tests**:

- Verify search result ordering is unchanged across all `includeContent` modes.
- Verify `headline` formatting is consistent between search item display and markdown renderer.
- Verify search result ordering is unchanged.

### Milestone 3: MCP Server — Schema and Tool Definition Updates

This milestone updates the MCP server to expose the new parameters and document the new response fields. No rendering
logic changes here — the server is a pass-through.

#### 3a. Update Zod schemas

In `../remnote-mcp-server/src/schemas/remnote-schemas.ts`:

Update `SearchSchema`:

    export const SearchSchema = z.object({
      query: z.string().describe('Search query text'),
      limit: z.number().int().min(1).max(150).default(50).describe('Maximum results'),
      includeContent: z.enum(['none', 'markdown', 'structured']).default('none')
        .describe('Content mode: none, markdown, or structured'),
      childLimit: z.number().int().min(1).max(500).default(100)
        .describe('Max children to render across all levels'),
      depth: z.number().int().min(0).max(10).default(5)
        .describe('Max depth of children to include'),
      maxContentLength: z.number().int().min(100).max(100000).default(3000)
        .describe('Max characters in rendered content'),
    });

Update `ReadNoteSchema`:

    export const ReadNoteSchema = z.object({
      remId: z.string().describe('The Rem ID to read'),
      includeContent: z.enum(['none', 'markdown', 'structured']).default('markdown')
        .describe('Content mode: none, markdown, or structured'),
      depth: z.number().int().min(0).max(10).default(5).describe('Max depth of children'),
      childLimit: z.number().int().min(1).max(1000).default(100)
        .describe('Max children to render across all levels'),
      maxContentLength: z.number().int().min(100).max(500000).default(100000)
        .describe('Max characters in rendered content'),
    });

#### 3b. Update tool inputSchema definitions

In `../remnote-mcp-server/src/tools/index.ts`:

Update `SEARCH_TOOL.inputSchema.properties` to add:

    childLimit: {
      type: 'number',
      description: 'Max children to render in content across all depth levels (1-500, default: 100)',
    },
    depth: {
      type: 'number',
      description: 'Max depth of children to include in content (0-10, default: 5)',
    },
    maxContentLength: {
      type: 'number',
      description: 'Max characters in rendered content string (100-100000, default: 3000)',
    },

Update `READ_NOTE_TOOL.inputSchema.properties`:

- Change `depth` description to reflect new default: `'Max depth of children (0-10, default: 5)'`
- Add `includeContent`, `childLimit`, `maxContentLength`:

    childLimit: {
      type: 'number',
      description: 'Max children to render in content across all depth levels (1-1000, default: 100)',
    },
    maxContentLength: {
      type: 'number',
      description: 'Max characters in rendered content string (100-500000, default: 100000)',
    },
    includeContent: {
      type: 'string',
      enum: ['none', 'markdown', 'structured'],
      description: 'Content mode: none, markdown, or structured (default: markdown)',
    },

#### 3c. Update tool outputSchema definitions

Update `SEARCH_TOOL.outputSchema` items properties to add:

    headline: {
      type: 'string',
      description: 'Display-ready line combining title + delimiter + detail (when present)',
    },
    aliases: {
      type: 'array',
      items: { type: 'string' },
      description: 'Alternate names for this Rem (omitted if none)',
    },
    contentProperties: {
      type: 'object',
      description: 'Metadata about rendered content',
      properties: {
        childrenRendered: { type: 'number', description: 'Children included in content' },
        childrenTotal: { type: 'number', description: 'Total children in subtree (capped at 2000)' },
      },
    },

Update `READ_NOTE_TOOL.outputSchema` properties:

- Add `headline` and describe it as a display-oriented field for MCP clients (`title` / `detail` remain semantic).
- Change `content` description to: `'Rendered markdown of child subtree with type-aware delimiters (when includeContent=markdown)'`
- Add `contentTree` description for `includeContent=structured`.
- Add `aliases` and `contentProperties` (same shape as search).

#### 3d. Verification

Run the MCP server's type check and build:

    cd ../remnote-mcp-server
    npm run build

Verify no type errors. Start the MCP server and use the MCP protocol's `tools/list` request to confirm the updated
schemas appear correctly.

### Milestone 4: CLI — Command Options and Formatter Updates

This milestone updates the CLI companion to expose the new parameters and render the new `content` field.

#### 4a. Update search command

In `../remnote-cli/src/commands/search.ts`:

Add CLI options:

    .option('--include-content <mode>', 'Content mode: none | markdown | structured')
    .option('--child-limit <n>', 'Max children to render in content (default: 100)')
    .option('--depth <n>', 'Max depth of children in content (default: 5)')
    .option('--max-content-length <n>', 'Max content characters (default: 3000)')

Pass through to payload:

    if (opts.includeContent) payload.includeContent = opts.includeContent;
    if (opts.childLimit) payload.childLimit = parseInt(opts.childLimit, 10);
    if (opts.depth) payload.depth = parseInt(opts.depth, 10);
    if (opts.maxContentLength) payload.maxContentLength = parseInt(opts.maxContentLength, 10);

Update text formatter to include `aliases` when present and prefer `headline` for display:

    let aliasesSuffix = '';
    if (note.aliases && Array.isArray(note.aliases) && note.aliases.length > 0) {
      aliasesSuffix = ` (aka: ${(note.aliases as string[]).join(', ')})`;
    }
    return `${i + 1}. ${typeTag}${title}${aliasesSuffix}${detailSuffix} [${note.remId}]`;

#### 4b. Update read command

In `../remnote-cli/src/commands/read.ts`:

Change `--depth` default from `'1'` to `'5'`.

Add CLI options:

    .option('--include-content <mode>', 'Content mode: none | markdown | structured (default: markdown)')
    .option('--child-limit <n>', 'Max children to render (default: 100)')
    .option('--max-content-length <n>', 'Max content characters (default: 100000)')

Pass through to payload:

    if (opts.includeContent) payload.includeContent = opts.includeContent;
    if (opts.childLimit) payload.childLimit = parseInt(opts.childLimit, 10);
    if (opts.maxContentLength) payload.maxContentLength = parseInt(opts.maxContentLength, 10);

Update text formatter to render the new `content` field as the main body:

    const lines: string[] = [];
    if (r.title) lines.push(`Title: ${r.title}`);
    if (r.remId) lines.push(`ID: ${r.remId}`);
    if (r.aliases && Array.isArray(r.aliases) && r.aliases.length > 0) {
      lines.push(`Aliases: ${(r.aliases as string[]).join(', ')}`);
    }
    if (r.content) lines.push(`\n${r.content}`);
    if (r.contentProperties && typeof r.contentProperties === 'object') {
      const cp = r.contentProperties as Record<string, number>;
      lines.push(`\nChildren: ${cp.childrenRendered} rendered / ${cp.childrenTotal} total`);
    }
    return lines.join('\n');

#### 4c. Verification

    cd ../remnote-cli
    npm run build

Test manually:

    remnote read <some-rem-id> --depth 3 --child-limit 50

Verify rendered markdown content appears in text output with proper indentation.

### Milestone 5: Tests, Documentation, and Code Quality

This milestone ensures all code changes are properly tested, documented, and pass quality checks.

#### 5a. Full test suite for bridge plugin

Ensure all tests from Milestones 1 and 2 are in place. Run:

    cd <bridge-repo-root>
    npm run test

All tests must pass. Run code quality:

    ./code-quality.sh

This runs: typecheck, lint, format check, tests, coverage.

#### 5b. Update bridge-search-read-contract.md

In `docs/reference/remnote/bridge-search-read-contract.md`, add new sections:

**`aliases` (optional)** — Array of alternate name strings for the Rem, resolved from `rem.getAliases()`. Omitted when
no aliases exist.

**`content`** — Rendered markdown representation of the Rem's child subtree. For `remnote_read_note`, this is always
present when `includeContent="markdown"` (`remnote_search` or `remnote_read_note`). Rendering
uses indented bullets (`- `) with 2-space indentation per depth level. When a child Rem has a detail (back text),
the title and detail are joined by a type-aware delimiter: `::` for concepts, `;;` for descriptors, `>>` for all other
types.

**`contentProperties`** — Object with `childrenRendered` (number of children included in `content`) and `childrenTotal`
(total children in subtree, capped at 2000). Present whenever `content` is rendered.

**`contentTree` (optional)** — Structured recursive array of content nodes (`remId`, `remType`, `cardDirection?`,
`title`, `detail?`, `headline`, `children`). Present when `includeContent="structured"`.

**`headline`** — Display-oriented full line (`title + delimiter + detail` when detail exists). Provided to keep list
rendering, markdown rendering, and structured-node rendering consistent while preserving `title`/`detail` semantics.

Update existing `content` description in search section to reference the new rendering behavior. Remove or update any
references to the old "first 5 children" behavior.

#### 5c. Update CHANGELOG.md

Under `[Unreleased]`, add entries:

**Enhanced**:

- `remnote_read_note` now returns rendered markdown content with type-aware delimiters (`::`/`;;`/`>>`) in the `content`
  field instead of echoing the title.
- `remnote_search` content preview (when `includeContent="markdown"`) now uses the same unified markdown renderer with
  hierarchy and type-aware delimiters.
- New `aliases` field in search and read results surfaces alternate Rem names from `getAliases()`.
- New `contentProperties` metadata reports `childrenRendered` and `childrenTotal` (capped at 2000) for content
  rendering awareness.
- New parameters for both search and read: `childLimit` (total children across all levels), `maxContentLength`
  (character cap for rendered content).
- `includeContent` is now a mode enum (`none` / `markdown` / `structured`) for both search and read, enabling a
  structured content tree response mode.
- New `headline` field in search/read responses (and structured content nodes) provides display-ready title+detail
  rendering while preserving `title`/`detail` fields.

**Changed**:

- Default depth increased from 3 to 5 for both `remnote_search` and `remnote_read_note`.
- `includeContent` contract changes from boolean to string mode enum as part of a coordinated `0.x` cross-repo release.

#### 5d. MCP Server and CLI quality checks

    cd ../remnote-mcp-server && npm run build
    cd ../remnote-cli && npm run build

Both must succeed with no type errors.

## Concrete Steps

All commands assume the bridge repo root as working directory unless stated otherwise.

Step 1 — Verify current tests pass:

    source node-check.sh
    npm run test

Expected: all tests pass (currently ~60+ tests).

Step 2 — Implement Milestone 1 changes (new methods, interfaces, constants, mock updates):

    Edit: src/api/rem-adapter.ts
    Edit: test/helpers/mocks.ts

Step 3 — Implement Milestone 2 changes (wire into search/readNote, remove getContentPreview):

    Edit: src/api/rem-adapter.ts

Step 4 — Run bridge tests:

    npm run test

Expected: existing tests may need updates for changed return shapes (e.g., readNote no longer includes `children` by
default). Update failing tests to match new behavior.

Step 5 — Run full code quality:

    ./code-quality.sh

Expected: all checks pass.

Step 6 — Implement Milestone 3 (MCP server schemas and tools):

    Edit: ../remnote-mcp-server/src/schemas/remnote-schemas.ts
    Edit: ../remnote-mcp-server/src/tools/index.ts

Step 7 — Build MCP server:

    cd ../remnote-mcp-server && npm run build

Expected: clean build.

Step 8 — Implement Milestone 4 (CLI commands):

    Edit: ../remnote-cli/src/commands/search.ts
    Edit: ../remnote-cli/src/commands/read.ts

Step 9 — Build CLI:

    cd ../remnote-cli && npm run build

Expected: clean build.

Step 10 — Update documentation:

    Edit: docs/reference/remnote/bridge-search-read-contract.md
    Edit: CHANGELOG.md

Step 11 — Final code quality pass:

    cd <bridge-root> && ./code-quality.sh

Expected: all checks pass.

## Validation and Acceptance

### Automated Tests

Run `npm run test` in the bridge repo. Expect all tests to pass, including:

- **Aliases**: readNote on a Rem with aliases returns `aliases: ["Alt 1", "Alt 2"]`; on a Rem without, `aliases` is
  absent.
- **Rendered content**: readNote on a 3-level tree returns `content` like:

      - Level 1 Child A
        - Level 2 Child A1
          - Level 3 Child A1a
        - Level 2 Child A2
      - Level 1 Child B

- **Delimiters**: readNote on a concept Rem with detail renders `- Front :: Back` in content.
- **childLimit**: readNote with `childLimit: 3` on a tree with 10 children stops after 3 lines.
- **maxContentLength**: readNote with `maxContentLength: 20` truncates content to 20 characters.
- **contentProperties**: readNote returns `{ childrenRendered: 5, childrenTotal: 10 }` for a tree with 10 total
  children and 5 rendered within limits.
- **Content modes**: readNote defaults to `includeContent: "markdown"`; `"none"` omits content fields; `"structured"` returns `contentTree`.
- **Search content (markdown)**: search with `includeContent: "markdown"` returns rendered content with contentProperties.
- **Search content (structured)**: search with `includeContent: "structured"` returns `contentTree` with contentProperties.
- **Default depth**: readNote on a 6-level tree with default params renders levels 0-4, not level 5.

### Manual Verification

With the bridge plugin running in RemNote dev mode and the MCP server connected:

1. Call `remnote_read_note` with a known Rem ID that has nested children. Verify `content` contains indented markdown.
2. Call `remnote_search` with `includeContent: "markdown"`. Verify results include rendered content previews.
3. Call `remnote_read_note` with `includeContent: "structured"`. Verify `contentTree` is present with `headline` on nodes.
4. Use `remnote-cli read <id>` and verify the terminal output shows the rendered content tree.

### Build Verification

All three projects must build cleanly:

    cd <bridge-root> && ./code-quality.sh        # TypeScript, lint, format, tests
    cd ../remnote-mcp-server && npm run build     # TypeScript compilation
    cd ../remnote-cli && npm run build            # TypeScript compilation

## Idempotence and Recovery

All changes are additive file edits. Running the steps multiple times produces the same result. If a step fails
partway through:

- Revert uncommitted changes with `git checkout -- .` in the affected repo.
- Re-apply from the beginning of the failing milestone.

No database migrations, no destructive operations, no external state changes. The work is purely code edits,
test additions, and documentation updates.

## Artifacts and Notes

### Example Rendered Content Output

For a Rem "Machine Learning" with children:

    - Supervised Learning :: Learning from labeled data
      - Classification
      - Regression
    - Unsupervised Learning :: Learning from unlabeled data
      - Clustering
      - Dimensionality Reduction
    - Reinforcement Learning >> Agent learns through reward signals

The above uses `::` for concept-type children with detail, `>>` for non-concept children with detail, and plain
bullets for children without detail.

### Example contentProperties

    {
      "childrenRendered": 7,
      "childrenTotal": 42
    }

Tells the consumer: 7 children were rendered in `content` (hit the childLimit or depth limit), but the full subtree
has 42 children. The consumer can request a higher `childLimit` or `depth` to get more.

## Interfaces and Dependencies

### Bridge Plugin (`src/api/rem-adapter.ts`)

New exports:

    export interface ContentProperties {
      childrenRendered: number;
      childrenTotal: number;
    }

Updated exports (changed fields shown):

    export interface SearchParams {
      // ... existing fields ...
      childLimit?: number;
      depth?: number;
      maxContentLength?: number;
    }

    export interface ReadNoteParams {
      // ... existing fields ...
      childLimit?: number;
      maxContentLength?: number;
      includeContent?: 'none' | 'markdown' | 'structured';
    }

    export interface SearchResultItem {
      // ... existing fields ...
      headline: string;
      aliases?: string[];
      contentTree?: ContentTreeNode[];
      contentProperties?: ContentProperties;
    }

New private methods on `RemAdapter`:

    private async getAliases(rem: Rem): Promise<string[] | undefined>
    private getRemTypeDelimiter(remType: RemClassification): string
    private async renderContentMarkdown(
      rem: Rem,
      options: { childLimit: number; depth: number }
    ): Promise<{ markdown: string; childrenRendered: number; maxDepthReached: number }>
    private async countChildren(rem: Rem, cap: number): Promise<number>

Removed private methods:

    private async getContentPreview(rem: Rem): Promise<string | undefined>  // DELETED

New/changed constants:

    const DEFAULT_DEPTH = 5;                          // was DEFAULT_READ_DEPTH = 3
    const DEFAULT_CHILD_LIMIT = 100;                  // NEW
    const CHILDREN_TOTAL_CAP = 2000;                  // NEW
    const DEFAULT_SEARCH_MAX_CONTENT_LENGTH = 3000;   // NEW
    const DEFAULT_READ_MAX_CONTENT_LENGTH = 100000;   // NEW
    // REMOVED: SEARCH_CONTENT_CHILD_LIMIT = 5

### MCP Server (`src/schemas/remnote-schemas.ts`)

Updated Zod schemas add fields: `includeContent` (string mode enum), `childLimit`, `depth`, `maxContentLength`, and
mode-dependent output fields (`content` / `contentTree`).
Default values: see Milestone 3a above.

### CLI (`src/commands/search.ts`, `src/commands/read.ts`)

New CLI options: `--include-content <none|markdown|structured>`, `--child-limit`, `--depth`, `--max-content-length`.
Read command `--depth` default changes from `'1'` to `'5'`.

### Test Helpers (`test/helpers/mocks.ts`)

`MockRem` gains: `_aliases` private field, `setAliasesMock()` method, `getAliases()` async method.

### Dependencies

No new npm packages required. All changes use existing dependencies:

- `@remnote/plugin-sdk` — `Rem.getAliases()` is an existing SDK method.
- `zod` — Already used in MCP server schemas.
- `commander` — Already used in CLI.
