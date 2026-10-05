# Claude Harness Bootstrap

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/sagaga144/claude-harness-bootstrap)](https://github.com/sagaga144/claude-harness-bootstrap/releases)
[![evals: 6/8 passing](https://img.shields.io/badge/evals-6%2F8%20passing-yellow.svg)](#tested-not-just-prompted)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757.svg)](https://claude.com/claude-code)

Describe your project in one paragraph. Get a complete, project-specific Claude Code
setup: `CLAUDE.md`, guard hooks, reviewer agents and slash commands.

<!-- demo.gif goes here -->

## Quickstart

In Claude Code:

```
/plugin marketplace add sagaga144/claude-harness-bootstrap
/plugin install harness-bootstrap@harness-bootstrap
```

Then, in any project folder (empty or existing):

```
/harness-bootstrap:init
```

Describe your project. You'll get two quick questions (how much to keep Claude usage cost
down, and whether to build just the essentials or the full setup now), each with a
recommended answer already picked. You don't need to know what a hook or a subagent is.

You can also skip the slash command and just describe a new project. The skill triggers
on the description alone.

## See what it generates

Real output, committed as generated. This is the `.claude/` tree for a Rust + React SaaS
monorepo with real auth and payment data
([description](examples/monorepo-saas/INPUT.md)):

```
.claude/
├── agents/
│   ├── backend-engineer.md
│   ├── correctness-reviewer.md     # also checks frontend/backend type drift
│   ├── frontend-engineer.md
│   ├── planner.md
│   └── security-reviewer.md        # auth + payments
├── commands/
│   ├── resume-session.md
│   ├── save-session.md
│   └── verify.md
├── hooks/
│   ├── build-gate.cjs
│   ├── cost-guard.cjs
│   ├── critical-rules.cjs
│   ├── guard-adhoc-doc.cjs
│   ├── guard-bash-push.cjs
│   ├── guard-protected-files.cjs
│   ├── guard-secret-scan.cjs
│   ├── note-sensitive-surface.cjs
│   └── warn-debug-print.cjs
├── rules/
│   ├── backend-rust.md
│   ├── contracts.md
│   └── frontend-react.md
├── skills/
│   └── orch-add-feature/SKILL.md
├── BUGS.md
└── settings.json
```

Seven examples, each a different shape:
[SaaS monorepo](examples/monorepo-saas/) ·
[Terraform on AWS](examples/terraform-aws-infra/) ·
[multiplayer game server](examples/multiplayer-game-server/) ·
[Solidity marketplace](examples/solidity-nft-marketplace/) ·
[JUCE audio plugin](examples/juce-audio-plugin/) ·
[ML paper reproduction](examples/ml-paper-reproduction/) ·
[desktop notes app](examples/desktop-notes-app/).
[`examples/README.md`](examples/README.md) says what each project's traits changed in its
harness.

## Tested, not just prompted

The plugin ships with an eval suite in [`plugin/evals/`](plugin/evals/). Each case is a
real Claude Code session that gets a project description, with graders that check what
came out. Each case also runs once without the plugin, for comparison.

**Latest result (v0.6.0, Claude Code 2.1.289, 2026-10-05): 6 of 8 pass.** 8 cases. In 3 of
them the plugin changes the outcome versus plain Claude Code; the rest are regression
guards. Eval runs can't write into `.claude/`, so the generated agents and hooks are
shown in [`examples/`](examples/) rather than graded.

| Case | What it checks | Result | Plugin vs. plain Claude Code |
|---|---|---|---|
| `self-triggers-on-bare-description` | A plain project description, with no mention of Claude Code or setup, is enough to start it. | pass | changes the outcome |
| `two-guided-questions` | The two setup questions (cost, scope) actually get asked. | pass | changes the outcome |
| `cli-no-ui-no-persistence` | A local-files CLI gets no UI reviewer or persistence guard, dev commands match its toolchain, `CLAUDE.md` stays lean, and it tries to build the `.claude/` tree. | pass | changes the outcome (plain Claude Code doesn't try to build `.claude/`) |
| `published-library-semver` | A library published to PyPI gets a semver / breaking-change reviewer. | pass | same |
| `retrofit-existing-repo` | On a repo with a harness already in place, it keeps the existing agent and `CLAUDE.md` and follows the repo's own conventions. | pass | same |
| `cost-low-caps-models` | Asking to keep cost low means no agent runs on Opus. | pass | same |
| `web-app-auth-db` | An authenticated web app with a database gets a security reviewer and a dedicated persistence guard, a secret scan, and no semver reviewer. | **fail** | same (both fail) |
| `vague-description` | "I want to build an app" gets one flagged assumption or one question, not a pile of confident guesses, and `CLAUDE.md` never describes files that weren't written. | **fail** (passed 3 of 5 runs) | same (both fail) |

Why the two fail:

- **`web-app-auth-db`**: with "essentials only" chosen, it plans a security reviewer but
  covers the database with a hook instead of a dedicated persistence agent, which this
  case requires.
- **`vague-description`**: the plugin now builds a stack-neutral harness when no app type
  is given. But before the plugin loads, Claude Code itself sometimes announces a guessed
  stack, and the judge counts that against it.

Six cases come from one full run. A usage limit cut off the last two, so those were run
again on their own, on the same code.

Run them from the repo root:

```bash
claude plugin eval ./plugin --scaffold --allow-tools Write Edit
```

`--scaffold` lets `retrofit-existing-repo` build its fixture repo, and
`--allow-tools Write Edit` lets runs write the `CLAUDE.md` the graders check. Each case is
a full session on your own account; use `--case <name>` to run one. More in
[CONTRIBUTING.md](CONTRIBUTING.md#run-the-evals).

**What it caught.** The README always said you could just describe a project. The first
eval run showed that wasn't true: the skill only triggered if you also asked to "set up
Claude Code". Its trigger condition was narrower than its job. That was fixed in 0.5.9,
and `self-triggers-on-bare-description` now guards against it coming back.

## Why not a template pack?

A template pack gives you generic pieces to pick from and fill in. This works the other
way round: it profiles your project's actual traits (language, UI or not, persistence,
auth or another trust boundary, published or not, how it ships) and derives the harness
from those. A CLI with no database gets no persistence guard; a published library gets a
semver reviewer that an app doesn't. It has been run against a web app, a CLI, a
published library, a desktop app, a game server, Terraform, a monorepo, Solidity, a C++
audio plugin and an ML research repo.

## What it builds

- **`CLAUDE.md`**, under 200 lines, written for this project.
- **`.claude/hooks/`**: deterministic guards (blocks pushes, deploys and releases without
  an override, scans commits for secrets, gates on a broken build) plus judgment-call
  hooks for checks a regex can't make. Every hook is run once to check it works.
- **`.claude/agents/`**, picked by the project's traits: a UI gets a framework reviewer,
  persistence gets a data-layer guard, a trust boundary gets a security reviewer, a
  published library gets a semver reviewer. Each agent uses the cheapest model tier that
  reliably does the job; Opus is kept for the rare high-stakes case, and choosing low cost
  at setup caps it further.
- **`.claude/rules/`**: conventions scoped to the files they apply to, instead of
  bloating `CLAUDE.md`.
- **`.claude/commands/`** and **`.claude/skills/`**: `/verify` and orchestrator
  pipelines. No custom memory system; Claude Code's built-in auto memory already does
  that.
- **An Operator's Manual**: once the harness has run for a real session, a published
  HTML page describing what got built and how to drive it.

## Grounded in Anthropic's docs

The mechanics follow Claude Code's documented behavior, checked against the current docs
rather than assumed:

- **`CLAUDE.md` discipline**: the under-200-line target, "include what Claude can't
  guess", path-scoped rules for detail that only sometimes applies.
- **Hooks**: deterministic checks as `command` hooks, judgment calls as `prompt`/`agent`
  hooks, and every guard fails open on its own internal error.
- **Subagents**: reviewers are read-only with an explicit tool allowlist, and each call
  starts with a fresh context.
- **Native auto memory** instead of a reinvented one.
- **Cost-aware model tiers** that follow Claude Code's own model routing.

The spec files are re-checked against the docs from time to time. That has already
caught a wrong claim about the model lineup before it reached a generated harness.

## How it works

The logic lives in [`plugin/skills/init/`](plugin/skills/init/):

- **`SKILL.md`**: entry point and trigger description.
- **`BOOTSTRAP.md`**: checks for an existing harness, profiles the project, writes
  `CLAUDE.md`, hands off to build the rest.
- **`HARNESS_REFERENCE.md`**: the file-by-file spec, including the hook lifecycle, the
  trait → agent derivation table, the `settings.json` skeleton and the Operator's Manual
  recipe.

Edit those files to change what gets built.

## Contributing

Runs on project shapes it hasn't seen yet are the most useful contribution (embedded /
IoT, browser extensions, compiler tooling, bioinformatics, robotics). See
[CONTRIBUTING.md](CONTRIBUTING.md) for local testing, the evals and validation.

If this saved you setup time, a star helps other Claude Code users find it.

## License

MIT. See [LICENSE](LICENSE).
