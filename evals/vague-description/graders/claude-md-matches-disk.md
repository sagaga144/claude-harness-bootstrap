---
type: llm
focus: trace
weight: 2
---

Writes into `.claude/` may have been refused in this session. A refused write means that
file does NOT exist.

1. Find the last version of `CLAUDE.md` the session wrote (its last successful Write or
   Edit).
2. List every file under `.claude/` that this version names (agents, hooks, commands,
   skills, rules, settings), leaving out any it marks as not written, missing, deferred,
   planned or not built.
3. For each file on that list, look for a Write of that path in the transcript whose
   result was a success.

PASS if every file on the list has a successful Write, or the list is empty. Also PASS if
no `CLAUDE.md` was written at all but the session asked what kind of app this is.

FAIL if any file on the list was never written, or its Write was refused.
