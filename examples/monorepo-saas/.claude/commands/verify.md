---
description: Full pre-ship gate. Runs Rust, contracts-drift, and web checks, then the reviewers the diff calls for, and ends READY or NOT-READY.
---

Run every step even if an earlier one fails, then report one table (step | result | key error lines). Don't fix anything during `/verify`; report only.

1. **Rust:** `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`
2. **Contracts drift:** `npm run contracts:check` (regenerates the TS from `crates/contracts` and fails if `packages/contracts/src/generated` differs from what's committed)
3. **Web:** `npm run typecheck -w packages/web` (Vite builds don't type-check; this is the real check), `npm run lint -w packages/web`, `npm test -w packages/web`, `npm run build -w packages/web`
4. **Domain scan** of `git diff main...HEAD` plus uncommitted changes:
   - an API-shaped `interface`/`type` declared in `packages/web` instead of imported from `@ledgerline/contracts`
   - a handler returning `serde_json::json!` instead of a contract type
   - `console.log`, `dbg!`, `println!` in shipped source
   - a modified (not added) file in `crates/api/migrations/`
5. **Reviewers.** Invoke via the Agent tool, passing the diff range and the changed file list explicitly in the prompt (they don't see this conversation):
   - always: `correctness-reviewer`
   - if any changed path matches auth/session/login/password/billing/payment/subscription/invoice/webhook, or touches the auth extractor or CORS/cookie config: `security-reviewer`
   - if `crates/api/migrations/` or any sqlx query changed: `db-guard`

If a toolchain is missing (no `cargo`, no `node_modules`), mark that step **SKIPPED (tool missing)**. That is NOT-READY, not a pass. If the scaffolding doesn't exist yet (no `Cargo.toml`/`package.json`), say so and stop.

**Verdict:** READY only if every step passed and every reviewer verdict is PASS. Anything else is **NOT-READY**, with the blocking items listed first. Fail closed: an unclear result is NOT-READY.
