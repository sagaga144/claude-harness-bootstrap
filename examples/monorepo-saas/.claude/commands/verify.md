---
description: Build → type-check → domain-guard scan → READY/NOT-READY across the whole monorepo before shipping.
---

Run this monorepo's real checks and report a plain verdict. Don't ask
permission for each step — run them and report.

1. **Backend build**: `cargo check --workspace` from the repo root. If
   `cargo`/`rustc` isn't installed, say so plainly and mark this step
   "skipped — toolchain not installed", not "passed" and not "failed".
2. **Frontend + contracts type-check**: `npm run typecheck --workspaces --if-present`
   from the repo root (runs `tsc --noEmit` in both `packages/contracts` and
   `packages/frontend`). If `node_modules` isn't populated, say so plainly
   and mark "skipped — dependencies not installed", not "passed".
3. **Contract-parity scan**: invoke the `correctness-reviewer` agent's
   section 3 (contract parity) directly, scoped to whatever changed in this
   session.
4. **Domain-guard scan**: grep for anything touching `routes/auth.rs`,
   `routes/billing.rs`, or an auth/billing frontend surface in the current
   diff (`git diff --stat`); if found, say plainly that `security-reviewer`
   must run before this ships and hasn't yet (unless it already has this
   session).
5. **Verdict**: print `READY` only if every step that actually ran passed
   and no gated surface is missing its review; otherwise `NOT READY` with
   the specific blocking reason(s).
