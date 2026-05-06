# Documentation Index

## Guides

### Installation

- [Install via RemNote Marketplace (Beginner Guide)](guides/install-plugin-via-marketplace-beginner.md) — Easiest path for most users: find, install, and enable the Automation Bridge plugin from the RemNote marketplace.
- [Run the Plugin Locally (Beginner Guide)](guides/development-run-plugin-locally.md) — Clone the repo and load the plugin into RemNote from a local dev server for development or source-level testing.

### Usage & Connection

- [Connection Lifecycle](guides/connection-lifecycle.md) — How the bridge connects after RemNote starts, what reconnect/backoff behavior looks like, and what each sidebar status means.
- [Bridge / Consumer Version Compatibility](guides/bridge-consumer-version-compatibility.md) — How to match bridge plugin versions with the `remnote-mcp-server` package during the `0.x` pre-stable period.

### Development

- [Execute Bridge Commands from RemNote Developer Console](guides/development-execute-bridge-commands.md) — Run bridge actions directly inside the RemNote plugin console to inspect raw results without the MCP server or CLI in the middle.
- [Execute Bridge Commands — Screenshot Walkthrough](guides/development-execute-bridge-commands-screenshots.md) — Visual step-by-step companion to the console guide above, with annotated screenshots.
- [Pull Request Guide](guides/pull-request-guide.md) — Cross-repo PR policy and submission checklist for contributing to `remnote-mcp-bridge` and `remnote-mcp-server`.

---

## Reference: RemNote Domain

> Targeted at contributors and AI agents reasoning about bridge behavior.

- [RemNote Domain Reference (index)](reference/remnote/README.md) — Entry point and navigation guide for all RemNote domain reference material.
- [Core Model](reference/remnote/core-model.md) — The Rem as RemNote's atomic unit: what it is and how it maps to notes, concepts, and structure.
- [Structure and Linking](reference/remnote/structure-and-links.md) — How outline position carries semantic meaning and how Rem links work.
- [Flashcards and CDF](reference/remnote/flashcards-and-cdf.md) — How RemNote generates flashcards from authoring syntax and the Custom Data Format.
- [Import Flashcards from Markdown](reference/remnote/import-flashcard-from-markdown.md) — Markdown syntax patterns that RemNote recognizes as flashcard types on import.
- [Search and Retrieval Notes](reference/remnote/search-retrieval-notes.md) — What a good `search` or `read_note` result should capture, for agents and contributors reasoning about output quality.
- [Bridge Search/Read Contract](reference/remnote/bridge-search-read-contract.md) — Formal behavior contract for `search`, `search_by_tag`, and `read_note` outputs.
