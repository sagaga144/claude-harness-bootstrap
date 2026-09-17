# Claude Harness Bootstrap

Describe your project in one paragraph. Get back a complete, project-specific
[Claude Code](https://claude.com/claude-code) harness — a lean `CLAUDE.md`, guard hooks, a
reviewer/implementer agent roster, and slash commands — tailored to whatever your project
actually *is* (web app, CLI tool, backend service, library, mobile app, infra-as-code, a
smart contract, a real-time/audio project, a data or ML pipeline...), not a one-size-fits-
all web template with brackets to fill in. No Claude Code experience required — you don't
need to know what a hook or a subagent is for this to work: setup opens with two short,
plain-language questions (how much to spend, how much to build right now), each with a
recommended answer already picked, and closes by telling you exactly what to try first.

## Install

```
/plugin marketplace add sagaga144/claude-harness-bootstrap
/plugin install harness-bootstrap@harness-bootstrap
```

## Use

In any project folder — empty or already has code:

```
/harness-bootstrap:init
```

then describe your project idea. Claude asks two quick questions first — how much to lean
toward keeping your Claude usage cost down, and whether you want just the essentials
working first or the full setup right away — each with a recommended default, then
profiles the project (language, whether it has a UI, persistence, auth or any other trust
boundary, is a published library, etc.), writes a lean project-specific `CLAUDE.md`, builds
the rest of `.claude/`, verifies every hook actually works, and — once the harness has run
for a real session — publishes an "Operator's Manual" artifact documenting exactly what
got built and how to drive it.

You usually don't even need the slash command — just describe a new project and ask
Claude to set it up for Claude Code; the skill can trigger on its own from the
description.

## What it builds

- A lean, derived `CLAUDE.md` (under 200 lines) — real content for *this* project, not a
  template.
- `.claude/hooks/` — deterministic guards (blocks pushes/deploys/releases without an
  override, scans commits for secrets, gates on a broken build) plus judgment-call hooks
  for checks a regex can't make.
- `.claude/agents/` — picked by the project's actual traits, not a fixed list: a UI gets a
  framework reviewer, persistence gets a data-layer guard, auth/secrets/any other trust
  boundary gets a security reviewer, a published library gets a semver/breaking-change
  reviewer, and so on. Every agent defaults to the cheapest model tier that reliably does
  the job — Opus is reserved for the rare, genuinely high-stakes case, never handed out by
  role, and your cost-priority answer from setup caps it further if you asked to keep cost
  low.
- `.claude/rules/` — conventions scoped to just the files they apply to (a data layer's
  query rules, one package's style in a monorepo) instead of bloating `CLAUDE.md` with
  detail that isn't always relevant.
- `.claude/commands/` + `.claude/skills/` — `/verify`, orchestrator pipelines. No custom
  memory system gets built — Claude Code's own built-in auto memory already handles
  learning across sessions; the harness only adds anything extra for a team that
  specifically wants learnings synced across machines.
- An Operator's Manual — a published, project-specific HTML reference for how to drive
  the harness day to day.

## Grounded in Anthropic's own documentation, not guesswork

Every mechanic this generates is built on how Claude Code actually works and what
Anthropic's own published guidance for it recommends — checked against the current docs
directly, not assumed from memory:

- **`CLAUDE.md` discipline** — the under-200-line target, "include what Claude can't
  guess, exclude what it can derive," path-scoped rules for detail that only sometimes
  applies — straight from Anthropic's own memory and best-practices guidance.
- **Hooks for certainty, judgment calls for everything else** — deterministic checks as
  `command` hooks; anything needing real judgment as `prompt`/`agent` hooks; every guard
  fails open on its own internal error — matching Claude Code's actual hook contract, not
  a home-grown assumption about it.
- **Subagents with real context isolation and an explicit tool allowlist** — reviewers
  stay read-only, each call starts with a genuinely fresh context, per how Claude Code's
  subagent contract actually works.
- **Native auto memory, not a reinvented one** — Claude Code ships its own cross-session
  memory now, so the harness relies on that instead of building a redundant custom system;
  a call made specifically because of what the current docs say it already does.
- **Cost-aware model tiers** — cheapest tier that reliably does the job by default, Opus
  reserved for genuinely high-stakes cases, following Claude Code's own model-routing
  behavior rather than an arbitrary convention.

This isn't a one-time read. The two spec files below get re-checked against the current
docs periodically and updated when something's changed or turned out to be wrong — this
project has caught and discarded an outright wrong claim about Claude Code's model lineup
this way before it ever made it into a generated harness, rather than just trusting the
first plausible-sounding answer.

## How it works, and how to change it

The actual logic lives in `plugin/skills/init/`:

- **`SKILL.md`** — the skill's entry point and trigger description.
- **`BOOTSTRAP.md`** — checks whether a harness already exists, profiles the project from
  its description, writes the `CLAUDE.md`, hands off to build the rest.
- **`HARNESS_REFERENCE.md`** — the full file-by-file harness spec: the hook lifecycle
  table, the trait → agent derivation table, the `settings.json` skeleton, and the
  Operator's Manual recipe.

Those two files *are* the project — edit them to change what gets built. Test changes
locally before publishing:

```bash
claude --plugin-dir ./plugin
```

then either describe a project, or run `/harness-bootstrap:init` explicitly. Validate the
manifest with `claude plugin validate ./plugin` before committing a change.

## Contributing

It's been run for real (not just imagined) against a web app, a CLI, a published library,
a desktop app, a real-time game server, Terraform infra-as-code, a polyglot monorepo, a
Solidity smart contract, a real-time C++ audio plugin, and an ML research repo with
notebooks — plus retrofitting onto existing, messy repos both with and without a prior
harness. PRs welcome, especially runs against shapes it hasn't hit yet (embedded/IoT, a
browser extension actually published to a store, compiler/language tooling, bioinformatics,
robotics). Include what you profiled, what got built, and where the derivation logic
guessed wrong.

## License

MIT — see [LICENSE](LICENSE).
