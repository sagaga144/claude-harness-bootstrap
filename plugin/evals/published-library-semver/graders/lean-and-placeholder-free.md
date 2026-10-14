---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 1
---

Check each condition. PASS only if all four hold; FAIL if any one doesn't.

1. The file is under 200 lines.
2. It has no unfilled placeholder: no stand-in in angle or square brackets for a value
   the author should have filled in (such as `<pkg>`, `<project name>`, `[your stack]`),
   and no `TODO`, `TBD` or `FIXME`. Markdown links, HTML tags and command options like
   `--help` are not placeholders.
3. The stack it states names Python, and the file says the package is published (to PyPI
   or as a public library other projects depend on).
4. Every test, lint or build command it lists is a Python-ecosystem command (for example
   `pytest`, `ruff`, `mypy`, `python -m build`, `pip`). None is from another ecosystem,
   such as `npm`, `cargo` or `go`.
