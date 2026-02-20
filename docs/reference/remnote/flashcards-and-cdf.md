# Flashcards and CDF

## Flashcards are generated from authoring syntax

RemNote uses in-line syntax and structures to generate flashcards (for example descriptor separators, cloze patterns,
and related constructs).

Implication for agents:

- Raw Rem text can encode study intent, not only narrative content.
- Read/search outputs that strip syntax may remove critical meaning.

## Concept-Descriptor Framework (CDF)

CDF is a central RemNote knowledge-modeling approach. It structures how concepts and descriptors are represented and
studied.

Implication for agents:

- For retrieval quality, preserving concept/describer relationships is often better than returning only a flat
  concatenated string.

## Multiple flashcard behaviors exist

RemNote supports multiple card-generation behaviors and card scheduling semantics.

Implication for agents:

- `remnote_read_note` consumers may need to distinguish "this is content" vs "this drives cards".
- `remnote_search` ranking/snippets should not implicitly assume every match is equivalent study material.

## Authoring context matters

Editor syntax and authoring patterns determine how content is interpreted downstream.

Implication for agents:

- A robust agent should treat Rem text as structured authoring language, not plain markdown-like text.

## Sources

- https://help.remnote.com/en/articles/8663109-flashcard-basics
- https://help.remnote.com/en/articles/6025481-creating-flashcards
- https://help.remnote.com/en/articles/6026154-structuring-knowledge-with-the-concept-descriptor-framework
- https://help.remnote.com/en/articles/6030541-5-minute-editor-overview
- https://help.remnote.com/en/articles/6044066-remnote-in-5-minutes
