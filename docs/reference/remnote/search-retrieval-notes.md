# Search and Retrieval Notes

Purpose: help agents reason about what a "good" `remnote_read_note` or `remnote_search` result should capture in RemNote
terms.

## Retrieval in RemNote is context-sensitive

Results are more useful when they preserve at least some of:

- hierarchy context (ancestor path, child structure)
- relationship context (references/tags/portals)
- authoring semantics (flashcard-oriented syntax)

If these are dropped, outputs can be technically correct but practically misleading.

## Search expectations

Users typically expect search to surface not just matching titles, but meaningful context around the match. In RemNote,
that context often comes from surrounding outline nodes and linked graph relations.

## Read expectations

Users usually interpret "read a note" as "read the idea in context," which often includes child structure and related
content, not only one node's text value.

## Media and non-text content

RemNote supports embedded media (images, files, PDFs, videos/audio). Retrieval logic should account for the possibility
that significant context is not plain text.

## Practical checklist for agents

Before changing read/search behavior, verify that your assumptions match RemNote concepts:

- Are you preserving hierarchy semantics?
- Are you distinguishing links vs tags vs portals where relevant?
- Are you avoiding destructive flattening of flashcard/cdf syntax?
- Are you clear about what constitutes "content" when media is present?

## SDK search behavior

The RemNote Plugin SDK `search.search()` returns `Promise<Rem[]>` with no relevance score or ranking metadata. The
bridge treats array position as a proxy for relevance. The SDK accepts a `numResults` parameter but may enforce an
opaque internal hard limit — requesting more results than this limit returns fewer results silently.

## Consumer alignment

Search/read result field semantics are contract-sensitive across bridge, MCP server, and CLI consumers. Before changing
field meaning (for example `title`, `detail`, `remType`, `cardDirection`), review
[`bridge-search-read-contract.md`](./bridge-search-read-contract.md) to avoid silent downstream regressions.

## Sources

- https://help.remnote.com/en/articles/6030721-searching-your-knowledge-base
- https://help.remnote.com/en/articles/8196578-outlines-and-terminology
- https://help.remnote.com/en/articles/6634227-what-s-the-difference-between-references-tags-and-portals
- https://help.remnote.com/en/articles/8663109-flashcard-basics
- https://help.remnote.com/en/articles/6026154-structuring-knowledge-with-the-concept-descriptor-framework
- https://help.remnote.com/en/articles/6752220-adding-images-and-media
