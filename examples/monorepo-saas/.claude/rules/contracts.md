---
paths:
  - "packages/contracts/**"
---

# `contracts` package conventions

This package is the single source of truth for API request/response shapes.
It's the direct answer to "we've been burned before by the frontend and
backend silently drifting apart on field names/types."

- One file per API area (`auth.ts`, `billing.ts`, ...), re-exported from
  `index.ts`. Keep names in `camelCase` — that's the JS/TS convention the
  frontend expects; the Rust backend is responsible for mapping to its own
  `snake_case` structs on its side (see `.claude/rules/backend-rust.md`).
- This package has **no runtime dependents on the Rust side** — nothing
  generates `crates/backend`'s serde structs from these types, and nothing
  generates these types from the Rust structs either. That's a real,
  currently-unclosed gap, not an oversight to silently work around: a change
  here is only as safe as the correctness-reviewer's manual parity check
  catches it. If this project's API surface grows much further, consider an
  actual codegen step (e.g. deriving OpenAPI from the Rust side with `utoipa`
  and generating these types from that, rather than maintaining this package
  by hand) — flagged here rather than solved, since it's an architecture
  decision for the user, not something to do silently.
- Treat every change here as touching two other packages even though the
  diff is contained to this one — check `crates/backend/src/routes/*.rs` and
  `packages/frontend/src/**` for the same field before considering the
  change done.
- This package is internal-only (not published to a registry) — no semver
  discipline needed yet. If it's ever extracted into a standalone published
  package, revisit that.
