---
type: llm
focus: trace
weight: 2
---

Eval runs can't write into `.claude/`, so the agents may exist only as attempted Write
calls (to `.claude/agents/...`) or as a roster in `CLAUDE.md`. Judge the agents the run
actually designed, from either source.

PASS if the designed agents clearly include a dedicated security/auth reviewer (gating
login, sessions, or per-user data access) AND a dedicated persistence/data-layer reviewer
or guard (gating database queries, migrations, or config).

FAIL if either is missing, or if no designed agent plausibly covers auth/security review
or persistence/data-layer review at all. Built-in commands like `/security-review` alone
don't count as a dedicated agent.
