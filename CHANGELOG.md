# Changelog

## 0.6.0 (2026-10-06)

Mostly about showing what the plugin generates, plus behavior fixes found while
re-running the evals.

- **Real example outputs** in [`examples/`](examples/): seven complete harnesses from the
  v0.5.x test rounds (SaaS monorepo, Terraform on AWS, game server, Solidity, JUCE audio
  plugin, ML research, desktop app), so you can see what you get before installing.
- **README rewrite**: quickstart first, then what it generates, then the eval suite and
  what it caught.
- **Community files**: `CONTRIBUTING.md` (local testing, running the evals, the most
  wanted contributions), `SECURITY.md`, and issue forms for bugs and new project shapes.
- Shorter plugin description in the marketplace listing.

**Fixes**

- A description that names no app type ("I want to build an app") no longer gets a
  made-up stack. The skill asks one question, "what kind of app is this?". With no answer
  possible, it builds a stack-neutral minimal harness: push guard and secret scan only.
- `CLAUDE.md` never describes files that don't exist. If writes into `.claude/` are
  denied (you can refuse that permission prompt), `CLAUDE.md` lists only what was
  written, and the closing message names each planned file that's missing and why.
- An authenticated app that stores users' own data now keeps its data-layer guard under
  "essentials only", alongside the security reviewer.

**Evals**

- The command now needs `--allow-tools Write Edit`. Eval runs still can't write into
  `.claude/`, so new graders check that those writes were attempted, and that `CLAUDE.md`
  doesn't describe files that were never written.
- New `scripts/run-evals.mjs` runs the suite one case at a time and retries only a case
  cut off by a usage limit, so a full run can finish on a subscription.
- Result on Claude Code 2.1.291: all 8 cases pass. The plugin changed the outcome versus
  plain Claude Code in 4 of them.

## 0.5.9 (2026-09-20)

- A plain project description is now enough to start the setup. Before this, the skill
  only triggered if you also asked to "set up Claude Code"; the eval suite caught it.
- New eval case, `self-triggers-on-bare-description`, to keep that from regressing.
- All 8 eval cases passed with the plugin loaded (on Claude Code 2.1.278).

## 0.5.8 (2026-09-19)

- First automated eval suite (7 cases, run with `claude plugin eval`) covering the
  plugin's main promises: the right agents for a CLI, a web app with auth and a
  database, and a published library; retrofitting an existing repo; the two setup
  questions; the low-cost model cap; vague descriptions.
- Removed a leftover line in the skill description that still promised a custom memory
  system that had already been dropped.

## 0.5.7 (2026-09-10)

Tested on an ML research repo (reproducing a paper in PyTorch, with notebooks).

- Recognizes projects whose main risk is a run that finishes cleanly but gives a wrong
  result, and suggests writing down a checkable target instead of pretending a reviewer
  can verify the number.
- Agents on notebook projects can be given the notebook-editing tool.

## 0.5.6 (2026-09-09)

Tested on a real-time C++ audio plugin (JUCE).

- Recognizes hard real-time rules (no allocation or locking on the audio thread) as
  their own kind of correctness constraint instead of filing them under performance.
- Projects with no pass/fail test command get a verification approach that fits them.
- Fixed a rule from an earlier release that had the condition for shrinking the agent
  roster backwards.

## 0.5.5 (2026-09-09)

Tested on a Solidity / Hardhat NFT marketplace.

- Merges the correctness and security reviewers when, as with smart contracts, they're
  the same concern.
- Handles trust boundaries where anyone can call anything, not only logged-in vs. guest.
- For irreversible deploys, all checking happens before the deploy, not after.
- Added Solidity/Hardhat dev commands, including invariant fuzzing.
- Hooks of the newer type now signal a block in one consistent way.

## 0.5.4 (2026-09-09)

Tested on a polyglot monorepo (Rust backend, TypeScript frontend, shared types package).

- Monorepo guidance: one harness at the root, package-specific detail in scoped rules.
- Guards against frontend and backend drifting apart on shared types.
- Fixed toolchain checks on Windows: a missing toolchain was being treated as a failed
  check and blocking work. It now checks the tool exists before running it.

## 0.5.3 (2026-09-09)

Tested on Terraform modules plus a Python CLI that applies them to AWS.

- Infrastructure changes are treated as their own kind of shipping, with checks aimed at
  "the plan ran as written but was the wrong change".
- If you choose low cost, the summary now says so when that also caps the reviewer that
  gates destructive infrastructure changes, instead of applying it silently.
- Built-in reviewers can be pinned to a model tier.
- Added Terraform's native test tooling to the dev commands.

## 0.5.2 (2026-09-09)

Tested on a Go/WebSocket multiplayer game server with a vanilla JS client.

- The lean setup keeps one implementer per real deployable when a project has more than
  one.
- Review guidance for code with no compiler or build step.
- Server-authoritative trust boundaries (don't trust what the client says about its own
  state) are named explicitly, so the lean setup doesn't drop that reviewer.
- Concurrency bugs are separated from raw performance. Long-running services get health
  checks for "still alive and working", not just "started".

## 0.5.1 (2026-09-09)

Tested on a Tauri + Svelte desktop app.

- The lean setup no longer drops a reviewer that real stakes call for (money, deletion,
  auth or another trust boundary).
- Broadened "trust boundary" beyond web auth, e.g. a desktop app's UI-to-native boundary.
- Guidance for one product built from two toolchains.
- Toolchain checks distinguish "not installed" from "check failed".
