---
description: Run every check (Rust, TypeScript, contract parity) and report READY or NOT-READY
---

Verify the whole monorepo. Run each step for the packages that exist (skip a package whose manifest isn't there yet, and say so), in this order, and report the real output of any failure:

1. `backend/`: `cargo check`, then `cargo clippy --all-targets -- -D warnings`, then `cargo fmt --check`, then `cargo test`.
2. `contracts/`: `npx tsc --noEmit`, `npm run lint`, `npm test`. If a codegen script exists, run it and confirm `git status` shows no diff in the generated files (a diff means the committed output is stale).
3. `frontend/`: `npx tsc --noEmit` (the build alone does not type-check), `npm run lint`, `npm test`, `npm run build`.
4. Contract parity: for each request/response type changed in `git diff`, confirm the Rust type, the `contracts/` definition and the frontend usage agree on field names, types and optionality. For anything beyond a trivial change, invoke the `correctness-reviewer` agent and pass it the changed file paths explicitly.
5. Secrets: `git diff` and `git diff --cached` contain no keys, tokens or `.env` content.

If a tool isn't installed, say which and mark that step SKIPPED, not passed.

End with one line: `READY` only if nothing failed and nothing relevant was skipped; otherwise `NOT-READY` followed by the list of failures and skips. Never push.
