---
description: The pre-deploy checklist for a real (testnet or mainnet) deploy — run before ever setting ALLOW_DEPLOY=1. This is the project's stand-in for a "release health check": there is no running service to smoke-test after the fact, so the check has to happen entirely before the irreversible step, not after it.
---

This project's deploy is a single, irreversible transaction — there is no
"rollback" step and no post-deploy health check that can undo a bug the way
restarting a broken web service can. So this checklist front-loads everything
`HARNESS_REFERENCE.md` §1.9 would normally split into "did it deploy" and "is
it healthy after" into one pre-deploy gate:

1. Run `/verify` — must be READY.
2. Confirm `contract-auditor` has reviewed the exact contract bytecode about to
   be deployed (not an earlier version) and returned READY TO DEPLOY.
3. Confirm `hardhat/console.sol` is not imported anywhere under `contracts/`
   outside `contracts/test/`.
4. Confirm `.env`'s `DEPLOYER_PRIVATE_KEY` is a **testnet-only** key for any
   `sepolia` deploy — never a mainnet key with real funds while this session
   has shell/file access.
5. Confirm the constructor args in `scripts/deploy.ts` are what's actually
   intended (owner address, any initial fee) — there's no "edit it after" once
   deployed.
6. State plainly which network this targets and get an explicit human
   go-ahead before setting `ALLOW_DEPLOY=1` — the guard-bash-deploy hook blocks
   the actual deploy command without it.

After a real deploy: record the deployed address and the exact commit hash
that was deployed in `.claude/BUGS.md` or a note — there is no way to
regenerate "what was actually live" from git history alone once the mempool
has moved on.
