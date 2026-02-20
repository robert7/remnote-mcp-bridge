# Structure and Linking

## Outline structure signals meaning

In RemNote, position in the outline is semantic context. A child Rem is interpreted in relation to its parent.

Implication for agents:

- For `remnote_read_note`, parent title/path can be as important as node text.
- For `remnote_search`, snippets that ignore local hierarchy can be misleading.

## References, Tags, and Portals are different tools

RemNote distinguishes three important relationship mechanisms:

- Reference (`[[...]]` / `@...`): link one Rem from another.
- Tag (`##...`): classify a Rem with another Rem acting as a tag.
- Portal (`((...))`): display the same underlying content in multiple places.

Implication for agents:

- A matching Rem in search results may be linked context, tagged context, or portal context; they are not
  interchangeable.
- A read response should preserve enough information to tell whether content is original local content versus referenced
  context.

## Backlinks and graph context

References/tags create graph-level context (for example via backlinks and tag relations), beyond tree hierarchy.

Implication for agents:

- A high-quality retrieval strategy may need both tree context (ancestors/children) and graph context (references/tags).

## Properties and structured metadata

RemNote supports property-like metadata conventions for Rems. This can carry typed information that plain text
summarization misses.

Implication for agents:

- Search/read output should avoid flattening property-bearing content into unstructured text whenever possible.

## Sources

- https://help.remnote.com/en/articles/8196578-outlines-and-terminology
- https://help.remnote.com/en/articles/6634227-what-s-the-difference-between-references-tags-and-portals
- https://help.remnote.com/en/articles/6030714-rem-references
- https://help.remnote.com/en/articles/6030742-portals
- https://help.remnote.com/en/articles/6030770-tags
- https://help.remnote.com/en/articles/8126585-properties
