---
name: orch-add-feature
description: Orchestrates adding a new marketplace mechanic or contract feature end to end — plan, implement, review, verify. Use when the user asks to add a feature, a new contract function, or a new mechanic (offers, auctions, bundles, royalties, etc.).
---

1. **Plan** — delegate to the `planner` agent with the feature request and the
   current contract's public interface (pass file paths explicitly; the
   subagent starts with no context of this conversation). Get back a
   file-precise plan.
2. **Implement** — delegate to `contracts-engineer` with the plan. It writes
   the contract change and the matching Hardhat test.
3. **Review** — delegate to `contract-auditor` with the diff (or the changed
   file paths) once implementation is done. Do not skip this even for a
   "small" change — the whole premise of this harness is that small changes to
   payable functions are exactly where irreversible bugs hide.
4. **Verify** — run `/verify`. Only report the feature as done once `/verify`
   says READY and `contract-auditor` has signed off.

If `contract-auditor` returns NOT READY, loop back to step 2 with its findings
— don't mark the feature done with open findings, even low-severity ones, and
don't silently downgrade a finding's severity to make the loop end sooner.

Two human gates stay in place regardless of how this orchestrator runs: no
`git push` happens without being asked, and no real deploy happens without an
explicit go-ahead (see `/predeploy-check`) — this orchestrator getting to
READY is not itself permission to deploy.
