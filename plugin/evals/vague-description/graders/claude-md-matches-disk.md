---
type: llm
focus: trace
weight: 2
---

Look at every Write/Edit the run made and its result. Writes into `.claude/` may have been
blocked or denied by permissions; a blocked write means that file does NOT exist.

PASS if the final `CLAUDE.md` only names agent, hook, command, skill and rule files that
were actually written successfully, OR if it clearly marks any that were not written as
missing/not built. Also PASS if no `CLAUDE.md` was written at all but the run asked what
kind of app this is.

FAIL if the final `CLAUDE.md` describes an agent, hook, command, skill or rule file as if
it exists when the transcript shows its write was blocked, denied, or never attempted.
