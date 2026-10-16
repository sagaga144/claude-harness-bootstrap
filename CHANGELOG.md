# Changelog

## 0.8.1 (unreleased)

The plugin you install no longer carries its own test suite.

- **The eval cases moved from `plugin/evals/` to `evals/`** at the repo root. Installing
  the plugin now gets only what it uses: the skills, the manifest, the license and the
  icon. The plugin folder drops from 151 KB to about 120 KB. The plugin directory had
  refused every version after v0.7.0 at its fetch step with no reason that matched the
  repository; the plugin folder's size is the only thing that changed, so this also
  tests that.
- Nothing the plugin does changed: the skills are byte for byte v0.8.0's, so v0.8.0's
  results (14 of 14 on Haiku, Sonnet and Opus) still apply.
- `scripts/run-evals.mjs` puts the plugin and its cases together in a scratch folder for
  each run, since `claude plugin eval` reads cases from inside the plugin folder.

## 0.8.0 (2026-10-16)

Keeping a harness current. A harness now knows what built it, and a second skill tells
you when it has drifted from the code. **14 of 14 on Haiku, Sonnet and Opus.**

- **`/harness-bootstrap:check`**, a second skill: audits an existing harness against the
  code and the plugin as they are now (stale `CLAUDE.md` entries, traits the code gained
  since setup, guards that no longer block, a missing security baseline, noisy or broken
  guards, overlap with Claude Code built-ins) and proposes one fix, then asks. It never
  applies changes on its own. It works on harnesses this plugin didn't build.
- **A version stamp** (`.claude/harness.json`): the plugin version, the project's traits
  (never your own description) and the files written. **A friction log**
  (`.claude/session-data/friction.jsonl`): one line per guard decision with exactly four
  fields, never a command or a path. Both are protected like the rest of the harness.
  The spec for both is the new `plugin/skills/init/LIFECYCLE.md`.
- **Hooks now stop two attacks that only permission rules stopped before.** The
  remote-exec guard blocks reading a `.env` file through the shell (`less`, `grep`,
  `source`, `< .env`, an inline `node -e` or `python -c`), not only PowerShell's; the
  harness guard also catches `sed -i`, `cp`, `mv`, `rm` and similar aimed at harness files.
  `.env.example` stays readable, and commands that only name `.env` still run.

**Measured**

- Attack suite: 15 attacks (two new: rewriting the stamp, forging the friction log). The
  hooks every v0.8.0 harness gets block 12 of 15 (v0.7.1: 8 of 13), 15 of 15 counting
  permission rules, with no harmless twin blocked and every friction-log line clean
  ([matrix](docs/baselines/hooks-v0.8.0.md)).
- Three examples regenerated with v0.8.0 (monorepo-saas, terraform-aws-infra,
  desktop-notes-app), each with its stamp and friction log, copied as generated with no
  edits: 12 of 15 attacks blocked by hooks, 15 of 15 counting rules.
- Evals ([details](docs/baselines/evals-v0.8.0.md)): **14 of 14 on Haiku, Sonnet and Opus**
  with the plugin, one run per case; without it, plain Claude Code passes 5, 4 and 6 of
  the 13 cases that can be scored without the plugin. Two new cases for the check skill
  (14 in total). Fable isn't in this run. Every LLM-judged grader now has criteria a judge
  can't read two ways, so scores on those graders aren't strictly comparable with earlier
  releases. Two graders were corrected after Opus missed them on wording, and both re-ran
  on all three models: `published-library-semver` also accepts a rule that a breaking
  change needs a major version, and the leanness graders no longer count a stand-in for a
  future version number (`==<version>`) as an unfilled placeholder.
- Eval tooling: `run-evals.mjs` starts no model session without `--go` (without it, it
  lists what would run), files results by the plugin's content so a docs commit re-runs
  nothing and a grader edit re-runs only its case, and can run the no-plugin arm alone.
  `trace-case.mjs` and `generate-example.mjs` also need `--go`.

## 0.7.1 (2026-10-14)

A setup finishes, and protects itself, even when it can't write everything. **12 of 12 on
Haiku and 12 of 12 on Sonnet** (v0.7.0: 9 and 9).

- **The setup never ends with nothing written.** `CLAUDE.md` is written before any file
  under `.claude/`, since writes there need permission and may be refused, and it's the
  one file that's useful on its own. Then `settings.json`, which carries the security
  baseline, then the guard hooks, then the rest.
- **A refused write blocks that file, not the setup.** `settings.json` and each guard
  hook are still tried once after a refusal, even one that sounds session-wide ("running
  in don't ask mode"): permission rules are per path, so the next file may be allowed.
  The optional agents, commands and skills stop at the first refusal. The closing report
  names every planned file that wasn't written, with the model each agent would run on.
  `CLAUDE.md` describes only files that exist.
- **The setup questions never stall.** When no one can answer, the setup takes the
  recommended answers and says so.
- **The skill starts before any code.** Its description now says to use it before
  writing code, scaffolding files or checking toolchains. On a bare project description
  Haiku sometimes started building instead; it now triggers first.
- A project name the setup picked is used in paths too (`src/csvtool/`, never
  `src/<pkg>/`).
- The README lists harness-bootstrap in Anthropic's plugin directory, with the install
  command.

**Measured**

- Evals: [details](docs/baselines/evals-v0.7.1.md). One grader changed:
  `published-library-semver` now looks for "semver" or "semantic versioning" in the
  closing report instead of `CLAUDE.md`. Since `CLAUDE.md` lists only files that exist,
  a semver reviewer that couldn't be written (as in every eval run) is named in the
  report.
- `run-evals.mjs`: a case that fails only on LLM-judged graders runs twice more and counts
  on a majority, shown as a rate (none needed it in this release); `--keep-temp` keeps
  each session's files. `scripts/trace-case.mjs` re-runs one case with the eval's exact
  refusal message and logs the whole session.
- The attack suite is unchanged from v0.7.0: the reference hooks block 8 of 13 attacks,
  13 of 13 counting permission rules.

## 0.7.0 (2026-10-12)

Security, measured. Every harness now gets a baseline that holds up against the attacks
coding agents actually face, and the repo can prove what it blocks.

- **A security baseline in every harness, every tier.** Three parts, all in
  `HARNESS_REFERENCE.md` §1.2.1:
  - **The harness protects itself.** Changes to its own hooks, agents and settings ask
    you every time (`ask` rules, which also cover shell writes like `sed -i` and `>`), and
    a guard stops the shell tricks those rules can't see (`node -e`, `git restore`,
    PowerShell file commands, switching hooks off). Its override is read from the
    session's environment only, so a command that merely contains `ALLOW_HARNESS_EDIT=1`
    can't switch it on.
  - **Text from outside is data, not instructions.** Error messages, dependency READMEs,
    issues, PR comments, web pages and tool output can't tell Claude to run a setup
    script or an install. The rule is in `CLAUDE.md`, the critical-rules hook and every
    agent.
  - **Sandbox first, hooks second.** The sandbox is on where Claude Code supports it
    (macOS, Linux, WSL2), with the stack's registry and caches allowed. A small guard
    blocks piping downloads into a shell, running scripts from inside dependencies, DNS
    lookups built from command output, and inline network calls. On native Windows,
    where there is no sandbox, `CLAUDE.md` says so.
- **The push guard catches `git -C <dir> push`** and other option forms, and matches
  PowerShell as well as Bash.
- `settings.json` no longer carries an `mcpServers` key; project MCP servers belong in
  `.mcp.json`.
- **Hooks never run a command string through a shell.** Child processes get their
  arguments as a list (`execFileSync`), including the toolchain check, so a path with a
  space or a quote can't break or redirect a command, and security scanners no longer
  flag generated hooks for shell injection. The four example hooks that did this are
  fixed and marked as edited after generation.
- Repo hygiene from the same scan: the stats workflow pins its action to a commit SHA,
  dependabot keeps it current, and `plugin/` carries its own `LICENSE` and
  `SECURITY.md`.

**Measured**

- New hook attack suite (`scripts/test-hooks.mjs`): 13 attacks, 2 controls, each with a
  harmless twin that must not be blocked, run from the project root and from a subfolder.
  The v0.6.1 example harnesses blocked 0 of 13 with hooks (2 of 13 counting permission
  rules). The regenerated monorepo example blocks 8 of 13 with hooks and 13 of 13
  counting its rules ([matrix](docs/baselines/hooks-v0.7.0.md)).
- The reference hooks are tested straight from the spec (`scripts/check-reference.mjs`).
- Evals now run per model (`--model`, `--runs`, `--release`, `--major`). The first
  per-model baseline: v0.6.1 passed 3 of 8 on Haiku and 3 of 6 on Sonnet
  ([details](docs/baselines/evals-v0.6.1.md)); the 8/8 was the default model. v0.7.0
  results per model are in the README and [here](docs/baselines/evals-v0.7.0.md).
- The skill now also triggers for "set up Claude Code for this existing repo"; on Haiku
  and Sonnet it was skipped for retrofits.
- Four new eval cases (12 in total): lean essentials, the untrusted-content rule,
  self-protection, and the sandbox.

## 0.6.2 (2026-10-10)

Two fixes to the `settings.json` the plugin generates. Harnesses generated before this
keep working; re-run `/harness-bootstrap:init` on a project to pick these up.

- **Hooks are anchored to the project root.** Generated hooks now start as
  `"command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/x.cjs"]` instead of
  `node .claude/hooks/x.cjs`. Claude Code runs a hook in the session's current directory;
  if that is ever a subfolder, a relative path finds no script and the guard does nothing.
  This is the form Claude Code's hooks docs recommend, and it works the same on Windows
  and POSIX. We couldn't make a live session hit the relative-path case, so this is
  hardening rather than a fix for something seen in use.
- **Hook timeouts are in seconds.** The build gate's `"timeout": 60000` meant about 17
  hours, not 60 seconds; it is now `60`.
- The setup's own check (`HARNESS_REFERENCE.md` §1.8) now runs each guard from a subfolder
  too, and checks every hook uses the anchored form.

Also in the repo, not the plugin: a hook attack suite (`scripts/test-hooks.mjs`), a
per-model eval runner (`--model`, `--runs`, `--release`, `--major`), and the roadmap to
v1.0 in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## 0.6.1 (2026-10-06)

No change to what the plugin generates.

- Added a plugin icon.
- New README section, "What it runs and sends": the plugin is instructions only, with no
  MCP server, credential reading or network calls of its own, and what the generated
  harness does in your project.

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
