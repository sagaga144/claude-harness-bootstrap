# Input

**Project description given:**

> We're building a SaaS product as a monorepo: a Rust backend (using Axum) exposing a REST API, a TypeScript/React frontend that consumes it, and a shared `contracts` package that defines the API's request/response types so both sides stay in sync — we've been burned before by the frontend and backend silently drifting apart on what a field is called or what type it is. Accounts and billing are part of this, so there's real auth and real payment data.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.5.3, in a fresh empty folder. Gaps this run exposed
were fixed in v0.5.4; see the [changelog](../../CHANGELOG.md#054-2026-09-09).

`CLAUDE.md` and `.claude/` are copied as generated. Removed: `.claude/session-data/`
(local hook-test fixtures and an unpublished Operator's Manual draft) and the project code
the run scaffolded alongside the harness.
