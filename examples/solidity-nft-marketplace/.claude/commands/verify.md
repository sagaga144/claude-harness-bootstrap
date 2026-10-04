---
description: Compile, run the full test suite, and check for domain-specific red flags before calling anything ready.
---

Run, in order, and report a single READY / NOT-READY verdict at the end:

1. `npm run compile` — if `node_modules/` is missing, say so plainly and stop;
   don't guess at what compilation would produce.
2. `npm run test` — every test must pass. A skipped or pending test counts as
   NOT-READY, not as passing.
3. Grep `contracts/` for the domain red flags: a `payable` function with no
   `nonReentrant`, an `unchecked` block with no comment justifying it, a
   low-level `.call(` whose return value isn't checked, `console.sol` still
   imported outside `contracts/test/`.
4. If anything in contracts/**/*.sol changed since the last verdict, say
   plainly that contract-auditor should review it before this is READY —
   `/verify` passing tests is necessary but not sufficient for a deploy-stakes
   project like this one.

End with: **READY** (compiles, tests pass, no red flags, auditor has signed off
if contracts changed) or **NOT-READY** (name exactly what's missing).
