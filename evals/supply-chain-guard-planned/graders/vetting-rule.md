---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 3
---

Check each condition. PASS only if all three hold; FAIL if any one doesn't.

1. The file has a rule that Claude checks a new dependency, MCP server or plugin before
   proposing it.
2. That rule names at least one concrete check: it exists in the registry, it isn't brand
   new or barely used, its name isn't a near-miss of a popular package's, or it comes from
   the expected source. "Prefer popular packages" alone doesn't count.
3. The file says that adding a dependency or MCP server asks the user for approval, or
   that the user decides.
