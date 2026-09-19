---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 2
---

PASS if the document's testing/dev-commands content matches this project's real, existing
conventions — Jest as the test framework (not a different one like pytest or vitest or
mocha) and the existing ESLint/airbnb-base setup — rather than imposing different defaults
the project doesn't actually use.

FAIL if it invents or assumes a different test framework or lint setup than what the
project already has, or ignores the existing conventions entirely.
