---
name: add-endpoint
description: Contract-first workflow for adding or changing an API endpoint or any feature that spans backend and frontend in Ledgerline. Use when the user asks for a new feature, screen backed by data, endpoint, or a change to a request/response shape (e.g. "add team invites", "let users update their billing email", "rename this field").
---

# Add or change an endpoint, contract-first

Order matters: the contract is defined once, in Rust, and both sides are derived from it. That ordering is what stops frontend/backend drift.

Subagents see only what you pass them. Every Agent call below includes the plan path, the file list and the decisions so far in its prompt.

## Gate 1: plan (human checkpoint)
1. If the change spans more than one layer or touches auth/billing, invoke `planner` with the user's request verbatim and any files already identified. Otherwise sketch the contract inline.
2. Show the user the **contract shape** (Rust struct + resulting JSON example) and any open questions. **Stop and wait for approval.** In a non-interactive run, state the recommended answer to each open question and proceed with it.

## Build
3. `backend-engineer`: contract types in `crates/contracts`, then `npm run contracts:gen`, then migration (new file only), handler and tests.
4. `frontend-engineer`: consume the regenerated types from `@ledgerline/contracts`, add the API client function and UI, with tests. If it reports a missing or ill-fitting contract field, loop back to step 3; never patch around it in TS.

## Review
5. Run `/verify`. It invokes `correctness-reviewer` (including contract parity) and, based on the paths touched, `security-reviewer` and `db-guard`.
6. Fix every critical/high finding through the relevant engineer agent and re-run `/verify` until READY. Stop after 3 rounds and report what's still failing rather than looping.

## Gate 2: hand back (human checkpoint)
7. Summarize what changed per layer, the final contract, reviewer verdicts and anything deferred. Commit on a feature branch if asked. **Never push**; the user does that.
