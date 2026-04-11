# Tag Readback Limitations

Purpose: document the current gap between the bridge contract and live RemNote SDK behavior for readable tag metadata
on `read_note` and plain `search` results.

Use this note when:

- explaining the current limitation to users,
- handing context to future agent sessions,
- deciding whether a consumer can rely on `tags` in read/search output yet.

Related docs:

- [`./guides/development-execute-bridge-commands.md`](./guides/development-execute-bridge-commands.md)
- [`./guides/development-execute-bridge-commands-screenshots.md`](./guides/development-execute-bridge-commands-screenshots.md)
- [`./reference/remnote/bridge-search-read-contract.md`](./reference/remnote/bridge-search-read-contract.md)

## 1) What we implemented

The bridge contract was extended to add optional `tags` metadata on:

- `read_note`
- `search`
- `search_by_tag`
- structured child nodes returned when `includeContent: "structured"` is used

The bridge implementation first tried direct per-Rem tag lookup by feature-detecting `rem.getTags()`.

That implementation was then broadened to also accept a second possible SDK shape:

- `getTags()` returning tag Rem IDs
- `getTags()` returning tag Rem-like objects with `_id` / `text`

That contract was propagated across companion repos:

- `remnote-mcp-bridge`
- `remnote-mcp-server`
- `remnote-cli`

Unit tests, schemas, CLI rendering, and docs were updated accordingly.

## 2) What does not work live

In live RemNote runtime, `read_note` and plain `search` still do not reliably return `tags`.

Observed behavior:

- `create_note` with tags works
- `update_note` tag add/remove works
- `search_by_tag` works because it starts from the tag Rem and uses `taggedRem()`
- `read_note` returns note metadata but omits `tags`
- plain `search` likewise omits `tags` in live integration runs

This means the missing capability is reverse lookup from:

- note Rem -> applied tags

not forward lookup from:

- tag Rem -> tagged notes

## 3) What diagnostics we added, and what they show

The bridge currently emits temporary adapter warnings in live DevTools when tag readback fails.

Current warning prefix:

```text
[automation-bridge:adapter]
```

Current diagnostics check:

- whether `rem.getTags()` exists
- whether `getTags()` returns IDs vs. Rem-like objects
- whether metadata-related methods exist on the note Rem prototype
- whether the note exposes hidden metadata children through `getChildrenRem()`
- whether `plugin.rem` exposes namespace methods useful for a reverse-index fallback

### Live findings so far

For a real tagged note created in RemNote:

- `getTags()` was missing on the note Rem
- tag-related methods on the note prototype were absent
- metadata/powerup/property methods on the note prototype were also absent
- `getChildrenRem()` returned only visible content children, not hidden tag metadata children
- `plugin.rem.getAll()` exists live, along with `findOne`, `findByName`, `findMany`, and create helpers

In other words, current evidence suggests that the live normal-note `PluginRem` wrapper does not expose a direct
reverse tag-read path.

### What this seems to mean

The current direct strategy is blocked by the live SDK surface, not by MCP server / CLI consumers and not by bridge
serialization.

That is why:

- unit tests can pass,
- `search_by_tag` can work,
- but `read_note` and plain `search` still fail to return `tags` in live runtime.

## 4) Current workarounds and non-workarounds

Available workarounds today:

- If the caller already knows the tag, use `search_by_tag` instead of relying on `read_note.tags`.
- Use tag add/remove on write flows (`create_note`, `update_note`) normally; write support works.
- Do not treat `read_note.tags` or plain `search.tags` as live-reliable until the bridge resolves the SDK gap.

What we are intentionally not doing right now:

- We are not using `plugin.rem.getAll()` as a KB-wide fallback scan for every `read_note` or `search`.
- We are not returning partial / best-effort tag subsets based on arbitrary scan caps.

Reason:

- `getAll()` appears to enumerate the whole knowledge base and may be too expensive on large KBs.
- A hard scan cap would make tags nondeterministic and could return misleading partial results.
- Note-local child scanning did not expose hidden tag metadata in the live Rem wrapper we tested.

Possible future workaround in the bridge:

- build a carefully cached reverse index from the tag side only if SDK/runtime behavior makes that feasible without
  unacceptable cost.

## 5) Practical status

Status as of April 11, 2026:

- contract/schema/CLI support for readable `tags` exists
- live bridge readback for `read_note` and plain `search` remains unresolved
- temporary diagnostics remain in place specifically to document and probe the SDK limitation
- live MCP server / CLI integration suites no longer assert `tags` on `read_note` / plain `search`

Until that changes, treat readable tags on note retrieval surfaces as an intended feature with an unresolved live SDK
limitation.
