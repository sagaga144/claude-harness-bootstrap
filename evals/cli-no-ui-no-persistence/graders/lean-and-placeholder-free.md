---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 2
---

Check each condition. PASS only if all four hold; FAIL if any one doesn't.

1. The file is under 200 lines.
2. It has no unfilled placeholder: no stand-in in angle or square brackets for a value
   the author should have filled in (such as `<pkg>`, `<project name>`, `[your stack]`),
   and no `TODO`, `TBD` or `FIXME`. Markdown links, HTML tags and command options like
   `--help` are not placeholders, and neither is a stand-in for a value nobody can know
   when the harness is set up, such as a future release's version (`==<version>`) or an
   argument the user supplies each time (`<file>`).
3. The stack it states names Python and Typer.
4. Every test, lint or run command it lists is a Python-ecosystem command (for example
   `pytest`, `ruff`, `mypy`, `python -m ...`, `pip`, `uv`). None is from another
   ecosystem, such as `npm`, `cargo`, `go` or `gradle`.
