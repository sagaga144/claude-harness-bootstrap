---
description: Write a session handoff to .claude/session-data/ so a future session (or a low-context moment now) can resume without re-deriving context.
---

Load the `handoff` skill to write a structured handoff into
`.claude/session-data/handoff-<date>.md` covering: what changed this session, what's
mid-flight, and the next concrete step. Don't duplicate anything already durable in
`specs/` or `.claude/BUGS.md` -- reference it instead of restating it.
