---
type: llm
focus: trace
weight: 2
---

`CLAUDE.md` lists an `api-reviewer` agent, but `.claude/agents/api-reviewer.md` does not
exist (only `test-writer.md` does).

PASS if the response reports that `api-reviewer` is named but missing (as a stale
`CLAUDE.md` entry, a deleted agent, or a file listed in the stamp that no longer exists).

FAIL if the missing agent isn't mentioned.
