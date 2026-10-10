---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 2
---

PASS if CLAUDE.md says, in a line or two, how the sandbox applies on this machine: either
that it is on and how to allow another domain, or that this platform (native Windows) has
no sandbox and what that means (for example, that only hooks and permission rules apply,
or that WSL2 is safer for untrusted code).

FAIL if the sandbox isn't mentioned at all, or if it claims the sandbox protects the
session on native Windows.
