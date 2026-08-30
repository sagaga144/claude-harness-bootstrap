# Claude Harness Bootstrap

Describe your project in one paragraph. Get back a complete, project-specific
[Claude Code](https://claude.com/claude-code) harness — a lean `CLAUDE.md`, guard hooks,
a reviewer/implementer agent roster, slash commands, and a learning-memory loop — tailored
to whatever your project actually *is* (web app, CLI tool, backend service, library,
mobile app, data pipeline...), not a one-size-fits-all web template with brackets to fill
in. No Claude Code experience required — you don't need to know what a hook or a subagent
is for this to work.

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

then describe your project idea. Claude profiles the project (language, whether it has a
UI, persistence, auth, is a published library, etc.), writes a lean project-specific
`CLAUDE.md`, builds the rest of `.claude/`, verifies every hook actually works, and — once
the harness has run for a real session — publishes an "Operator's Manual" artifact
documenting exactly what got built and how to drive it.

You usually don't even need the slash command — just describe a new project and ask
Claude to set it up for Claude Code; the skill can trigger on its own from the
description.

## What it builds

- A lean, derived `CLAUDE.md` — real content for *this* project, not a template.
- `.claude/hooks/` — deterministic guards (blocks pushes/deploys/releases without an
  override, scans commits for secrets, gates on a broken build) plus judgment-call hooks
  for checks a regex can't make.
- `.claude/agents/` — picked by the project's actual traits, not a fixed list: a UI gets
  a framework reviewer, persistence gets a data-layer guard, auth/secrets gets a security
  reviewer (Opus), a published library gets a semver/breaking-change reviewer, and so on.
- `.claude/commands/` + `.claude/skills/` — `/verify`, orchestrator pipelines, a
  learning loop (`INSTINCTS.md` + `/learn`).
- An Operator's Manual — a published, project-specific HTML reference for how to drive
  the harness day to day.

## How it works, and how to change it

The actual logic lives in `plugin/skills/init/`:

- **`SKILL.md`** — the skill's entry point and trigger description.
- **`BOOTSTRAP.md`** — Steps 1-3: profile the project from its description, write the
  `CLAUDE.md`, hand off to build the rest.
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

PRs welcome — especially dry runs against project shapes this hasn't been tested on yet
(mobile apps, data/ML pipelines, monorepos, retrofitting onto an existing messy repo).
Include what you profiled, what got built, and where the derivation logic guessed wrong.

## License

MIT — see [LICENSE](LICENSE).
