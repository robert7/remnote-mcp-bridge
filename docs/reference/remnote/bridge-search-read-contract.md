# Bridge Search/Read Contract

Purpose: define the behavior contract for `remnote_search`, `remnote_search_by_tag`, and `remnote_read_note` outputs
so future contributors and agents can reason about expected results without reverse-engineering adapter code.

This document describes output semantics, not implementation details.

## Why this exists

`remnote_search`, `remnote_search_by_tag`, and `remnote_read_note` are consumed by multiple clients (MCP server, CLI,
and AI tools). Small changes to field semantics can break downstream behavior even when code still compiles. This
contract keeps iterations safe and predictable.

## Output field semantics

### `title`

- `title` is the main/front representation of the Rem.
- It should be human-readable and preserve key inline formatting intent.
- It should resolve reference-like rich text where possible (for example Rem references/global names), rather than
  dropping content.

### `headline`

- `headline` is a display-oriented full line combining `title`, a type-aware delimiter, and internal secondary/back
  content when present.
- Format: `"title delimiter back-content"` (e.g. `"Term :: Definition"`, `"Question >> Answer"`).
- Delimiter selection: concept = `::`, descriptor = `;;`, all others = `>>`.
- When no secondary/back content exists, `headline` equals `title`.
- Present in both search and read outputs.

### `parentRemId` (optional)

- `parentRemId` is the Rem ID of the note's direct parent.
- Present in both search and read outputs when the note has a parent.
- Omitted for top-level Rems.

### `parentTitle` (optional)

- `parentTitle` is the rendered title/front text of the direct parent Rem.
- Present in both search and read outputs when the note has a parent.
- Omitted for top-level Rems.
- `parentTitle` is a single-hop parent label, not a full ancestry path.

### `aliases` (optional)

- `aliases` is an array of alternate names for the Rem, surfaced from `rem.getAliases()`.
- Omitted when no aliases exist.
- Present in both search and read outputs.

### `remType`

- `remType` is required in both search and read outputs.
- Current values:
  - `document`
  - `dailyDocument`
  - `concept`
  - `descriptor`
  - `portal`
  - `text`
- Results may be grouped/sorted by this classification for retrieval quality.

### `cardDirection` (optional)

- Present only when flashcard practice direction is meaningful.
- Mapped values exposed to consumers:
  - `forward`
  - `reverse`
  - `bidirectional`
- Omit when SDK reports no direction (`none`) or when the Rem is not a flashcard.

### `content` (optional)

- Rendered markdown representation of the Rem's child subtree.
- Controlled by `includeContent` parameter:
  - `"none"` — omits `content` field entirely.
  - `"markdown"` — renders children as indented markdown with bullet prefixes and type-aware delimiters.
- Default: `"markdown"` for `readNote`, `"none"` for `search`.
- Rendering respects `depth`, `childLimit`, and `maxContentLength` parameters.
- Truncation occurs at line boundaries; incomplete lines are never included.

### `contentStructured` (optional, search only)

- Structured child subtree for `remnote_search` results.
- Present when `includeContent` is `"structured"`.
- Value is an array of child nodes (not the root note itself), each with:
  - `remId`
  - `title`
  - `headline`
  - `remType`
  - optional `aliases`
  - optional `cardDirection`
  - optional `children` (same shape recursively; omitted when empty)
- Rendering respects `depth` and `childLimit` parameters.
- `maxContentLength` does not apply to structured mode.
- Bridge omits RemNote powerup/property metadata children (for example aliases/property rows) from both structured and
  markdown content rendering to avoid redundant/internal noise in retrieval output.
- Bridge trims trailing empty leaf text nodes from rendered child lists (structured and markdown modes).

### `contentProperties` (optional)

- Present when `content` is rendered (i.e. `includeContent` is `"markdown"`).
- Fields:
  - `childrenRendered` — number of children included in the rendered content.
  - `childrenTotal` — total children in the subtree (capped at 2000 to avoid expensive counting).
  - `contentTruncated` — boolean indicating whether content was clipped by `maxContentLength`.

## Rich text rendering invariants

The adapter-level renderer should preserve meaning over exact visual fidelity:

- Resolve Rem references/global names to readable text when possible.
- Guard against true circular references while avoiding false positives for repeated sibling references.
- Surface non-text content with placeholders instead of silent loss (for example `[image]`, `[audio]`, `[drawing]`).
- Keep structural markers (for example card delimiter tokens) out of rendered `title` text.

## Search behavior contract

- Default search limit in bridge is 50 unless caller provides `limit`.
- Default `includeContent` for search is `"none"`.
- Search `includeContent` modes: `"none" | "markdown" | "structured"`.
- Default `depth` for search content rendering is 1.
- Default `childLimit` for search content rendering is 20.
- Default `maxContentLength` for search is 3000.
- Result ordering:
  1. grouped by `remType` priority (`document`/`concept` > `dailyDocument` > `portal` > `descriptor` > `text`)
  2. preserves SDK-provided intra-group ordering as relevance proxy
- Search may still return fewer results than requested due to SDK-side internal limits.
- Bridge search oversamples SDK requests (2x requested limit), deduplicates by `remId`, then trims back to requested
  `limit` to reduce underfilled unique result sets caused by duplicate SDK hits.

## Search-by-tag behavior contract

- `remnote_search_by_tag` accepts:
  - `tag` (required)
  - `limit` (default: 50)
  - `includeContent` (`"none" | "markdown" | "structured"`, default: `"none"`)
  - `depth` (default: 1)
  - `childLimit` (default: 20)
  - `maxContentLength` (default: 3000; markdown mode only)
- Tag lookup accepts either `tag` or `#tag` input.
- For each tagged match, bridge resolves the returned result target as:
  1. nearest ancestor `document` / `dailyDocument` (preferred),
  2. otherwise nearest non-document ancestor,
  3. otherwise the tagged Rem itself (no ancestor case).
- Output item fields and content rendering semantics match `remnote_search`.
- Results are deduplicated by resolved target `remId`.
- Results are sorted with the same type-priority ordering as `remnote_search`.

## Read behavior contract

- Default `includeContent` for read is `"markdown"`.
- Default `depth` for read is 5.
- Default `childLimit` for read is 100.
- Default `maxContentLength` for read is 100000.
- The `children` array and `NoteChild` type have been removed. Use `content` (markdown mode) instead.

## Breaking changes (from pre-0.6.0)

- `includeContent` changed from `boolean` to string enum (`search`: `'none' | 'markdown' | 'structured'`; `read`:
  `'none' | 'markdown'`).
- `children` array removed from `readNote` response.
- `content` in `readNote` changed from echoing `title` to rendered markdown of child subtree.
- Default `depth` for `readNote` changed from 3 to 5.
- New required fields in output: `headline`.
- New optional fields in output: `aliases`, `contentProperties`.
- New optional fields in output: `parentRemId`, `parentTitle`.
- `detail` field removed from `search` and `read_note` outputs; use `headline` for display-ready back-content rendering.

## Cross-repo compatibility notes

- MCP server should advertise these response fields in tool `outputSchema` so AI clients can plan tool usage correctly.
- MCP server should advertise `parentRemId` and `parentTitle` in search/read `outputSchema`.
- MCP server should keep `remnote_search_by_tag` output schema aligned with `remnote_search`.
- CLI text output may summarize/abbreviate some fields for readability; JSON output should preserve full bridge data.
