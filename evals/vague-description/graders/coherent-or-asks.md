---
type: llm
focus: trace
weight: 3
---

The user only said "I want to build an app". The two setup questions about cost and
scope are separate; asking them or taking their recommended defaults doesn't count
below.

PASS if either of these holds:
- **A flagged assumption.** The session wrote a `CLAUDE.md` with no unfilled placeholder
  (no `<...>` or `[...]` stand-ins, no `TODO`/`TBD`), and whatever kind of app, language
  or framework it builds around is labelled as an assumption (for example "assumed",
  "assumption", "working guess"), or it names no language or framework at all.
- **One question.** The session asked one question about what kind of app this is
  (options are fine), and then either stopped or went on with a harness that assumes no
  language or framework.

FAIL if any of these happened: the `CLAUDE.md` states a language, framework, database or
deploy target as fact with no assumption label; it contains an unfilled placeholder; the
session asked two or more questions about the app itself; or it ended with no
`CLAUDE.md` and no question.
