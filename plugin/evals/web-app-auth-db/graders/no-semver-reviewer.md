---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 1
---

This project is an app, not a published library.

First list the agents the file presents as part of the harness now: the ones in its
agent roster or agents section. Leave out any agent the file marks as not built,
deferred, planned, missing, "add later" or "if it's ever published", and the built-in
agents such as `Explore` and `Plan`.

PASS if no agent on that list is a semver, versioning, breaking-change, public-API or
API-surface reviewer, judged by its name and its one-line description. Also PASS if the
list is empty.

FAIL if any agent on that list is one of those.
