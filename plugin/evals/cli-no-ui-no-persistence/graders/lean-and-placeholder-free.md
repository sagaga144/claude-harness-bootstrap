---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 2
---

PASS if the CLAUDE.md is reasonably lean (roughly under 200 lines, no long essay-like
padding), contains no leftover template placeholders (literal bracketed text like
"<real name from the description>", "[bracket]", "TODO", or similar unfilled-in markers),
and its Stack/Dev Commands content is clearly specific to a Python/Typer CLI tool rather
than generic or web-app-shaped boilerplate.

FAIL if the file is bloated, still contains obvious unfilled placeholder text, or
describes a stack/commands that don't match a Python CLI tool.
