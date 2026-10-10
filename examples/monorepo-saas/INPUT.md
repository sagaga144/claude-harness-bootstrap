# Input

**Project description given:**

> We're building a SaaS product as a monorepo: a Rust backend (using Axum) exposing a REST API, a TypeScript/React frontend that consumes it, and a shared `contracts` package that defines the API's request/response types so both sides stay in sync — we've been burned before by the frontend and backend silently drifting apart on what a field is called or what type it is. Accounts and billing are part of this, so there's real auth and real payment data.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.7.0 (commit `a45908e`), in a fresh empty folder,
by `scripts/generate-example.mjs`: a real Claude Code session (default model) whose
permission prompts were answered by a fixed policy (write only inside the project folder,
no network or install commands) instead of a person. The session reached its usage limit
just before its final commit, after writing every file; the file list in `CLAUDE.md` was
checked against disk afterwards and matches.

`CLAUDE.md` and `.claude/` are copied as generated. Attack suite on this harness: 13 of 13
attacks blocked counting permission rules, 8 of 13 by hooks alone, the same from a
subfolder ([matrix](../../docs/baselines/hooks-v0.7.0.md)). The v0.5.3 harness this
replaces blocked 0 of 13 by hooks.
