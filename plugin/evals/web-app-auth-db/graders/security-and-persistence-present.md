---
type: llm
focus: last_message
weight: 2
---

Eval runs can't write into `.claude/`, so the agents usually exist only in the closing
message's list of planned files that weren't written (or, if writes succeeded, in its
summary of what was built). Judge the agents the run actually designed.

PASS if the designed agents clearly include a dedicated security/auth reviewer (gating
login, sessions, or per-user data access) AND a dedicated persistence/data-layer reviewer
or guard (gating database queries, migrations, or config).

FAIL if either is missing, or if no designed agent plausibly covers auth/security review
or persistence/data-layer review at all. Built-in commands like `/security-review` alone
don't count as a dedicated agent.
