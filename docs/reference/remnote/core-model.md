# Core Model

## The atomic unit: Rem

A Rem is RemNote's atomic object for notes and knowledge structure. In practice, many entities are represented as Rems,
including regular notes and organizational nodes.

Practical bridge implication:

- `remId` is the durable identity anchor for most retrieval/update operations.
- Returning only plain text without structure often loses important meaning.

## Hierarchy is first-class

RemNote is outline-first. Rems exist in parent/child hierarchies, with ancestor/descendant relationships and top-level
placement.

Practical bridge implication:

- `remnote_read_note` should be interpreted as reading a subtree, not just one flat node.
- Depth defaults and truncation policy directly shape user trust in read results.

## Document, Folder, Top-level Rem are orthogonal attributes

"Document", "Folder", and "Top-level Rem" are not one simple type enum in everyday usage. A Rem can be top-level and
also behave as a document/folder depending on settings and context.

Practical bridge implication:

- Avoid assuming a single rigid type model in response formatting.
- Preserve structural context, because users think in outlines/documents, not only isolated nodes.

## Rem vs Flashcard

A key distinction in RemNote concepts: flashcards are generated from Rem content and syntax; they are not the same thing
as regular content nodes.

Practical bridge implication:

- Read/search output should not treat every Rem as equivalent factual prose.
- Some Rem text primarily encodes card-generation behavior and should be interpreted accordingly.

## Daily documents are system-generated documents

Daily docs are date-based documents created and organized by RemNote.

Practical bridge implication:

- `remnote_append_journal` should align with daily-doc semantics rather than generic note creation.

## Sources

- https://help.remnote.com/en/articles/8017859-rems
- https://help.remnote.com/en/articles/8196578-outlines-and-terminology
- https://help.remnote.com/en/articles/8032170-what-s-the-difference-between-a-document-a-folder-and-a-top-level-rem
- https://help.remnote.com/en/articles/6030703-documents-and-folders
- https://help.remnote.com/en/articles/6752031-daily-documents
- https://help.remnote.com/en/articles/8663109-flashcard-basics
