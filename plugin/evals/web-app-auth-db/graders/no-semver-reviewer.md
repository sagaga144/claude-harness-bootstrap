---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 1
---

PASS if the document's *actual, currently-built* agent roster contains no
`semver-reviewer` or breaking-change/API-surface reviewer — this project is an app, not a
published library, so that role isn't warranted. A forward-looking mention in Gotchas/
notes that such an agent would be added *later* if the project is ever published as a
library (clearly framed as not built now) does not count against this.

FAIL only if a semver/breaking-change reviewer is actually present in the current roster
(built now), not merely mentioned as a hypothetical future addition.
