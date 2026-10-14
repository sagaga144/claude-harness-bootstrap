# Input

**Project description given:**

> We're building a SaaS product as a monorepo: a Rust backend (using Axum) exposing a REST API, a TypeScript/React frontend that consumes it, and a shared `contracts` package that defines the API's request/response types so both sides stay in sync — we've been burned before by the frontend and backend silently drifting apart on what a field is called or what type it is. Accounts and billing are part of this, so there's real auth and real payment data.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.8.0 (commit `1b470d6`), in a fresh empty folder,
by `scripts/generate-example.mjs` on Sonnet: a real Claude Code session (46 turns, about
$0.83) whose permission prompts were answered by a fixed policy (reads inside this
repository, writes only inside the project folder, no network or install commands) instead
of a person.

`CLAUDE.md` and `.claude/` are copied as generated, with no edits. Left out:
`.claude/session-data/` (the friction log and test payloads from the session's own
verification, which the harness's `.gitignore` keeps out of git).

It carries the v0.8 additions: a version stamp (`.claude/harness.json`), guards that record
to the friction log through `.claude/hooks/lib/friction.cjs`, and a line in `CLAUDE.md`
pointing to `/harness-bootstrap:check`. Attack suite on this harness: 12 of 15 attacks
blocked by hooks alone, the same from a subfolder, 15 of 15 counting permission rules, no
harmless command blocked, every friction-log line clean
([matrix](../../docs/baselines/hooks-v0.8.0.md)).
