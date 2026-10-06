# NFTMarket — Claude Code Harness

This harness acts on you in three ways: **automatic** (hooks fire unasked — a
push guard, a deploy guard, a build gate), **routed** (plain language goes
through the Intent Router below to the right agent), and **invoked** (you name
a command or skill directly, e.g. `/verify`). You rarely need the third one.

## Project Overview
**Project:** NFTMarket (name assumed — none was given; cheap to rename later)
**Stack:** Solidity 0.8.24 + Hardhat + TypeScript (tests/scripts) + OpenZeppelin Contracts
**Deployed on:** not yet — no RPC/wallet configured in this environment; target is Ethereum, Sepolia testnet first

No traditional backend or database. The contracts ARE the product — anyone can
call `listNFT`/`buyNFT`/`withdrawProceeds` directly once deployed. A web
frontend is planned later but doesn't exist yet.

## Dev Commands

| Command | Does |
|---|---|
| `npm run compile` | `hardhat compile` |
| `npm test` | `hardhat test` — Mocha/Chai over Hardhat's network |
| `npm run coverage` | `hardhat coverage` — line/branch coverage for the contracts |
| `npm run deploy:local` | Deploys to Hardhat's ephemeral in-memory network — always safe |
| `npm run deploy:sepolia` | Deploys to a **live** testnet — blocked by the deploy guard without `ALLOW_DEPLOY=1`, see `/predeploy-check` first |
| `npm run lint` | `solhint` over `contracts/**/*.sol` |

**Type-check gap, this ecosystem's version:** `hardhat compile` succeeding means
the Solidity *compiles* — it does not mean the logic is correct. There is no
"types are right" signal here the way `tsc --noEmit` gives a TS project; the
closest thing to a correctness pass is the test suite plus `contract-auditor`'s
review, neither of which is optional before a real deploy.

**Toolchain note:** this environment has Node/npm/git but Hardhat itself isn't
installed yet (`node_modules/` doesn't exist) — run `npm install` before any of
the above will work. The `build-gate` Stop hook probes for this and fails open
(doesn't block) when the toolchain is simply missing, rather than treating that
as a failing check.

## Intent Router

| If you say… | Invoke first |
|---|---|
| "broken" / "bug" / "revert I don't understand" | `contracts-engineer` |
| "is this safe" / "reentrancy" / "can someone drain this" | `contract-auditor` |
| "add a feature" / "new mechanic" (offers, auctions, royalties...) | `orch-add-feature` |
| "how should I build this" / "plan this" | `planner` |
| "clean up" / "refactor" | built-in `/code-review` skill, then apply its findings |
| "ready to deploy" / "ship it" | `/verify` → `contract-auditor` → `/predeploy-check` → (human go-ahead) |
| "write tests" | `contracts-engineer` (tests live next to the feature, not a separate role here) |
| "how does X work" | Read the contract, answer inline — no agent |
| "check gas cost" | `npm run coverage` / `REPORT_GAS=true npm test`, read inline — no dedicated agent yet (deferred, see below) |

## Must-Do Automatics

| Trigger | Hook | Effect |
|---|---|---|
| Session starts | `critical-rules.cjs` | Prints the 7 rules that must never be forgotten |
| Any `Bash` call | `guard-bash-deploy.cjs` | Blocks `git push` and any live-network deploy command |
| Any `Bash` call | `guard-bash-secrets.cjs` | Blocks `git commit` if the staged diff looks like a private key/API secret |
| Any `Write` call | `guard-ad-hoc-docs.cjs` | Blocks stray `FINDINGS.md`/`REPORT.md` etc. at repo root |
| Any `Edit`/`Write` | `guard-protected-files.cjs` | Blocks edits to `.env`/lockfiles |
| After `Edit`/`Write` | `warn-debug-artifacts.cjs` | Flags `hardhat/console.sol` left in a non-test contract |
| After `Edit`/`Write` | `note-reentrancy-check.cjs` | Advisory note on any `.sol` edit touching `payable`/external calls |
| Model switch requested | `cost-guard.cjs` | Blocks an unrequested escalation to a pricier model (cost answer: keep cost low) |
| Turn ends | `build-gate.cjs` | Runs `hardhat compile` + `hardhat test`; blocks with real errors on failure, fails open if the toolchain isn't installed |

## Agents, Commands & Skills

- **`contracts-engineer`** (Sonnet) — implements contracts/scripts/tests.
- **`contract-auditor`** (Sonnet, capped — see below) — merged correctness +
  security review; the one gate that actually matters before a deploy.
- **`planner`** (Sonnet) — file-precise plan before a non-trivial feature.
- **`/verify`** — compile → test → domain-guard scan → READY/NOT-READY.
- **`/predeploy-check`** — the pre-deploy checklist (see Deploy Health Check).
- **`orch-add-feature`** skill — plan → implement → review → verify, for any new mechanic.
- Session handoffs use the built-in `handoff` skill, not a custom command.

**Deferred under "essentials only"** (Step 1's second question): `refactor-cleaner`,
`silent-failure-hunter`, and a dedicated gas/performance reviewer. Ask for any
of these by name once the core flow is working — none of them are gating
anything safety-critical, which is why they were safe to defer and the
auditor wasn't.

## Model Routing

Guided cost answer: **keep cost low**. Every agent above is capped at Sonnet or
below as a result. One explicit tension worth naming: `contract-auditor` would
normally land on Opus under this harness's own rule (auth/trust-boundary trait)
— arguably more so here than the rule's own example of "a missed authz hole",
since the failure mode is an irreversible on-chain loss of real funds with no
rollback, not a fixable-after-the-fact data exposure. It's capped to Sonnet
anyway per the cost answer. Say the word if you'd rather it ran on Opus.

## Code Style / Testing / Security

- Solidity: checks-effects-interactions, `nonReentrant` on payable functions,
  pull-payment for anything that pays out — see `.claude/rules/solidity-security.md`
  (loads automatically whenever a `.sol` file is in play).
- Tests: Hardhat + Chai + `loadFixture`, one `describe` per public function,
  always include the revert-path tests, not just the happy path.
- Secrets: `.env` (gitignored), never committed — `DEPLOYER_PRIVATE_KEY` is
  testnet-only until there's a real secrets-manager story for mainnet.
- No traditional auth — the trust boundary is "any address on the chain, any
  arguments, any call order." Every public/external function is reviewed with
  that attacker model, not a logged-in-user one.

## Deploy / Release Health Check

Deploying a contract doesn't cleanly fit any single §1.9 flavor: it's a
one-time, human-gated, irreversible mutation (closest to *infrastructure
change*) of something that then becomes a permanently *published artifact*
with a fixed public interface anyone calls forever after (closest to
*published artifact*/library semver discipline, except there's no patch
release). Given that, the health check is entirely pre-deploy, not post:
`/predeploy-check` — `/verify` READY, `contract-auditor` sign-off on the exact
bytecode being deployed, constructor args double-checked, human go-ahead
before `ALLOW_DEPLOY=1`. There's no "check it's still alive" step the way a
live service gets, because there's no running process — once the deploy
transaction lands, "health" just means "the bytecode on-chain matches what was
reviewed," which is a record-keeping problem (log the address + commit hash),
not a monitoring one.

## Project-Specific Notes

Relies on Claude Code's built-in auto memory for cross-session learning —
nothing custom here; `/memory` browses or edits what it's saved.

**Assumptions made:** project name ("NFTMarket") wasn't given, picked and named
here. TypeScript chosen for tests/scripts over plain JS — Hardhat's own
current default and the ecosystem-conventional choice, not asked about since
there was no genuine fork. "Has persistence" profiled as on-chain contract
storage, not a traditional DB — no `<data-layer>-guard` agent was built;
storage/state-invariant risk is covered by `contract-auditor` instead, since
there's no migration-safety or query-guard concern to separate out.

## Pipeline Flow

```
idea/bug → planner (if non-trivial) → contracts-engineer → contract-auditor
   → /verify → (loop back on NOT-READY) → /predeploy-check → human go-ahead → deploy
```
