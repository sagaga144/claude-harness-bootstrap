---
description: Write a session handoff to .claude/session-data/ so a future session (or a fresh context window) can pick this up without re-deriving it.
---

Write `.claude/session-data/handoff-<date>.md` covering: what changed this
session (files touched), why, what's still open (unimplemented steps from
any active plan), the current READY/NOT-READY verdict from the last
`/verify` run if one happened, and any assumption made under ambiguity that
isn't already in CLAUDE.md's Gotchas. Keep it short — this is a pointer for
the next session, not a full report. `.claude/session-data/` is gitignored;
this is scratch state, not a durable spec.
