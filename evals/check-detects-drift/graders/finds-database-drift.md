---
type: llm
focus: trace
weight: 3
---

The project's harness was set up for an API with no database, but the code now uses
Postgres (`pg`, `knex`, a `migrations/` folder, queries in `src/index.js`).

PASS if the response reports that the project now has a database the harness doesn't
account for, and proposes adding a data-layer guard (a reviewer or guard for queries and
migrations) or equivalent coverage. Saying the stamp or `CLAUDE.md` claims "no database"
while the code has one also counts.

FAIL if the database goes unmentioned, or is mentioned without saying the harness lacks
coverage for it.
