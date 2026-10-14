---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 2
---

This project has no UI and no database.

First list the agents the file presents as part of the harness now: the ones in its
agent roster or agents section. Leave out any agent the file marks as not built,
deferred, planned, missing, "add later" or "if the project grows", and the built-in
agents such as `Explore` and `Plan`.

PASS if no agent on that list is about a UI or about stored data, judged by its name and
its one-line description: nothing like a UI, frontend, UX, design or accessibility
reviewer, and nothing like a database, persistence, data-layer, migration, schema or SQL
guard or reviewer. Also PASS if the list is empty.

FAIL if any agent on that list is one of those.
