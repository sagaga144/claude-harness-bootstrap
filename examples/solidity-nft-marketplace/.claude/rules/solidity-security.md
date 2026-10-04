---
paths: contracts/**/*.sol
---

# Solidity security conventions (this file only loads when a `.sol` file is in play)

This project's failure modes are not what a typical CLAUDE.md's generic
"correctness" advice covers (type errors, panics, races) — Solidity has its own
well-known ways for code that compiles cleanly to still lose real, unrecoverable
money. When touching a contract:

- **Checks-Effects-Interactions.** State changes before external calls, always.
  `buyNFT` is the canonical example in this codebase — read it before writing
  a new payable function, and match its shape.
- **Pull over push.** Never send ETH to an address as a side effect of a sale
  or action; credit a `proceeds` balance and let the recipient call
  `withdrawProceeds`. A push payment to a misbehaving/non-payable address can
  block or DoS the whole flow.
- **`nonReentrant` on anything `payable`.** Not optional, not "only if it looks
  risky" — every payable external function gets it.
- **No bare `unchecked` blocks without a comment proving the arithmetic can't
  wrap** given the real value ranges involved (token IDs, wei amounts, bps).
- **Trust boundary = any address, not a user role.** There's no session/login
  here — every `external`/`public` function's attacker model is "anyone on the
  chain, any arguments, any call order, possibly from another contract in the
  same transaction." Write access-control checks (and think about reentrancy)
  with that model, not a web app's "logged-in user vs. guest" one.
- **Hard-cap anything owner-adjustable that affects user funds** (fees, in this
  codebase) — an owner key being compromised or careless should never be able
  to expropriate more than the stated cap.
- **`hardhat/console.sol` never ships.** Fine while iterating; strip it before
  anything gets deployed for real — the `warn-debug-artifacts` hook flags this,
  but don't rely on it as the only check.
- **Once deployed, it's immutable.** There is no patch release for a live
  contract without a proxy pattern designed in from the start (this project
  doesn't use one yet). Treat pre-deploy review as the only real chance to
  catch a bug — see `/predeploy-check`.

For anything non-trivial, ask for `contract-auditor`'s review before calling it
done — see the Intent Router in the root `CLAUDE.md`.
