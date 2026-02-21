# Bridge Search/Read Contract

Purpose: define the behavior contract for `remnote_search` and `remnote_read_note` outputs so future contributors and
agents can reason about expected results without reverse-engineering adapter code.

This document describes output semantics, not implementation details.

## Why this exists

`remnote_search` and `remnote_read_note` are consumed by multiple clients (MCP server, CLI, and AI tools). Small
changes to field semantics can break downstream behavior even when code still compiles. This contract keeps iterations
safe and predictable.

## Output field semantics

### `title`

- `title` is the main/front representation of the Rem.
- It should be human-readable and preserve key inline formatting intent.
- It should resolve reference-like rich text where possible (for example Rem references/global names), rather than
  dropping content.

### `detail` (optional)

- `detail` is the secondary/back representation for flashcard/CDF-style Rems.
- Source priority:
  1. `rem.backText` (canonical SDK source)
  2. Fallback from right side of inline card delimiter when `backText` is unavailable
- If no secondary/back content exists, omit `detail`.

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

## Rich text rendering invariants

The adapter-level renderer should preserve meaning over exact visual fidelity:

- Resolve Rem references/global names to readable text when possible.
- Guard against true circular references while avoiding false positives for repeated sibling references.
- Surface non-text content with placeholders instead of silent loss (for example `[image]`, `[audio]`, `[drawing]`).
- Keep structural markers (for example card delimiter tokens) out of rendered `title` text.

## Search behavior contract

- Default search limit in bridge is 50 unless caller provides `limit`.
- Result ordering:
  1. grouped by `remType` priority
  2. preserves SDK-provided intra-group ordering as relevance proxy
- Search may still return fewer results than requested due to SDK-side internal limits.

## Cross-repo compatibility notes

- MCP server should advertise these response fields in tool `outputSchema` so AI clients can plan tool usage correctly.
- CLI text output may summarize/abbreviate some fields for readability; JSON output should preserve full bridge data.

