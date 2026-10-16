---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 2
---

Find the sentences in the file that mention Claude Code's sandbox.

PASS if at least one of them does either of these:
- says the sandbox is on, and says how to let it reach another domain; or
- says this machine (native Windows) has no sandbox, and says what that means: for
  example that only hooks and permission rules apply, or that WSL2 is safer for
  untrusted code.

FAIL if no sentence mentions the sandbox, or if any sentence says the sandbox protects
the session on native Windows.
