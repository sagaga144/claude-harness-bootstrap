---
description: Write a session handoff to .claude/session-data/ so a later session (or a fresh context window) can resume without re-deriving context.
---

Use the `handoff` skill to write a structured handoff into
`.claude/session-data/` covering: what changed this session (by package —
backend/frontend/contracts), what's mid-flight, and any contract-parity or
security-review follow-up still outstanding. This directory is gitignored —
it's a local scratch handoff, not durable project history (that belongs in
`.claude/specs/` or a commit message).
