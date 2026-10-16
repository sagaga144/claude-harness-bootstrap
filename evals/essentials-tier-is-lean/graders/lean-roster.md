---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 3
---

This is a small, local-only Rust CLI with no high-stakes traits (no auth, no database, no
network, not published), set up under "just the essentials".

PASS if all of these hold for what is actually built now (not things described as
deferred or "add later"):
- CLAUDE.md is under 200 lines;
- the agent roster built now has at most 3 agents;
- the hooks built now number at most 8 (the security baseline's harness guard,
  remote-exec guard and push guard count toward this, as do a secret scan, a
  critical-rules hook and a build gate).

FAIL if any of the three limits is exceeded by what is built now.
