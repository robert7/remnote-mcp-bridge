# Import Flashcards from Markdown

You can paste flashcards directly into RemNote if the text is formatted in the right way.

It is possible to have your imported notes automatically recognized as flashcards on RemNote. By using certain combinations of characters, RemNote will automatically convert those newly imported Rems into flashcards of a specific type. This can be especially useful to programmatically create flashcards through external means, like, for example, ChatGPT. Knowing some of these can also be handy when typing new flashcards in your notes.

This will work for imported notes from our import feature or simply by copying and pasting the contents on RemNote.

## Standard Flashcards

| Type | Forward | Backward | Two-Way | Disabled | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Basic** | `>>` or `==` | `<<` | `<>` or `><` | `>-` | Text after the symbol becomes the back. |
| **Multi-line** | `>>>` | `<<<` | `<><` | N/A | Nested bullets become the back. |
| **List-answer** | `>>1.` | `<<1.` | `<>1.` | `>-1.` | Nested bullets are numbered list items. |
| **Multi-choice**| `>>A)` | N/A | N/A | `>-A)` | Nested bullets are options. **1st item is always the correct answer.** |


- Example of how text that when copied and pasted into RemNote will generate a multi-line flashcard:

    ```
    - Question >>>
        - Answer 1
        - Answer 2
        - Answer 3
    ```

- Example of how text that when copied and pasted into RemNote will generate a list-answer flashcard:

    ```
    - Question >>1.
        - Answer 1
        - Answer 2
        - Answer 3
    ```

- Example of how text that when copied and pasted into RemNote will generate a multi-choice flashcard:

    ```
    - Question >>A)
        - Answer 1
            - extra information about Answer 1
        - Answer 2
        - Answer 3
    ```

## Cloze Deletions & Metadata
- **Standard Cloze:** Wrap text in double braces: `{{Target1}} and {{Target2}}`
- **Cloze with Hint:** Append the hint in specific brackets: `{{Target}}{({Hint})}`
- **Extra Card Details:** Insert `#[[Extra Card Detail]]` directly into the relevant bullet.

- Example on a Basic Flashcard:

```
Question #[[Extra Card Detail]] >> Answer
```
- Example on a Cloze flashcard:

```
{{Cloze 1}} #[[Extra Card Detail]] and {{Cloze 2}}
```

## Bullets and indentation and when pasting multiple lines

When pasting text with multiple lines, you can opt to use `-` (dashes) at the beginning of each line or not. These will be automatically converted to Rems with bullets when pasted into RemNote (this is especially useful when copying from markdown files).

Nesting between bullet items will also be automatically recognized according to the number of spaces at the beginning of each line. The exact number of spaces used doesn't matter as long as it is consistent for each indentation level RemNote will understand how to interpret each line.

## Concept and Descriptor Framework
*Core Rule: Concepts always start with `:` (colon). Descriptors always start with `;` (semicolon).*

| Type | Concept (Forward) | Descriptor (Forward) |
| :--- | :--- | :--- |
| **Basic** | `:>` | `;;` |
| **Multi-line** | `;>>` | `;;>` |
| **List-answer** | `;>>1.` | `;;>1.` |
| **Multi-choice**| `;>>A)` | `;;>A)` |

*(Note: To change direction for Concepts/Descriptors, replace the `>` arrow with `<` for backward, add `:`/`<` for two-way, or use `-` for disabled, matching standard card logic).*

## Sources

- https://help.remnote.com/en/articles/9252072-how-to-import-flashcards-from-text#h_fc1588b3b7