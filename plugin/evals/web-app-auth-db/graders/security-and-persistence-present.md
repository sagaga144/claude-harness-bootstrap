---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 2
---

PASS if the document's agent roster clearly includes a dedicated security/auth reviewer
(gating login, sessions, or per-user data access) AND a dedicated persistence/data-layer
reviewer or guard (gating database queries, migrations, or config).

FAIL if either is missing, or if the roster has no agent that plausibly covers auth/
security review or persistence/data-layer review at all.
