# RemNote Domain Reference for Bridge Development

Purpose: give AI agents a concise, reliable concept map of RemNote's domain model before changing bridge behavior, especially `remnote_read_note` and `remnote_search`.

## How to use this reference

1. Start with `core-model.md` to align on what a Rem is (and what is not a Rem).
2. Read `structure-and-links.md` to understand hierarchy, references, tags, and portals.
3. Read `flashcards-and-cdf.md` when interpreting Rem text that may encode card semantics.
4. Read `search-retrieval-notes.md` before changing read/search output behavior.

## Bridge action relevance

- `remnote_read_note`: depends heavily on hierarchy semantics, references/portals context, and Rem text interpretation.
- `remnote_search`: depends on search behavior expectations, query scope, and what should be returned as summary context.
- `remnote_create_note` / `remnote_update_note`: should preserve Rem hierarchy and text semantics.
- `remnote_append_journal`: maps to daily document behavior.

## Source index (official docs)

Core model and terminology:

- https://help.remnote.com/en/articles/8017859-rems
- https://help.remnote.com/en/articles/8196578-outlines-and-terminology
- https://help.remnote.com/en/articles/8032170-what-s-the-difference-between-a-document-a-folder-and-a-top-level-rem
- https://help.remnote.com/en/articles/6030703-documents-and-folders

Flashcards and CDF:

- https://help.remnote.com/en/articles/8663109-flashcard-basics
- https://help.remnote.com/en/articles/6025481-creating-flashcards
- https://help.remnote.com/en/articles/6026154-structuring-knowledge-with-the-concept-descriptor-framework

Linking and relationships:

- https://help.remnote.com/en/articles/6634227-what-s-the-difference-between-references-tags-and-portals
- https://help.remnote.com/en/articles/6030714-rem-references
- https://help.remnote.com/en/articles/6030742-portals
- https://help.remnote.com/en/articles/6030770-tags
- https://help.remnote.com/en/articles/8126585-properties

Search and editor behavior:

- https://help.remnote.com/en/articles/6030721-searching-your-knowledge-base
- https://help.remnote.com/en/articles/6030541-5-minute-editor-overview
- https://help.remnote.com/en/articles/6044066-remnote-in-5-minutes

Media and daily docs:

- https://help.remnote.com/en/articles/6752220-adding-images-and-media
- https://help.remnote.com/en/articles/6752031-daily-documents
