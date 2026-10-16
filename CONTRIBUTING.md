# Contributing

Thanks for looking. The most useful thing you can send is a real run on a project shape
this hasn't seen yet. Fixes to the spec files are welcome too.

## Where the logic lives

All of it is in `plugin/skills/init/`:

- `SKILL.md` is the entry point and trigger description.
- `BOOTSTRAP.md` profiles the project and writes `CLAUDE.md`.
- `HARNESS_REFERENCE.md` is the file-by-file harness spec: hook lifecycle, the
  trait → agent derivation table, the `settings.json` skeleton.

To change what gets built, edit those files.

## Test locally

From the repo root, start Claude Code with the plugin loaded from disk. Run it in a
scratch project folder, not in this repo:

```bash
cd /path/to/scratch-project
claude --plugin-dir /path/to/claude-harness-bootstrap/plugin
```

Then describe a project, or run `/harness-bootstrap:init` explicitly.

## Run the evals

The suite lives in `evals/` at the repo root: 14 cases, each a `prompt.md` (or
`case.yaml`) plus `graders/`. It sits beside the plugin, not inside it, so the plugin that
people install doesn't carry its tests. `claude plugin eval` expects the cases inside the
plugin folder, so `scripts/run-evals.mjs` (below) puts a copy of both together in
`hooks-run/eval-root/` and runs it there. To run `claude plugin eval` by hand, do the same:
copy `plugin/` somewhere, put `evals/` inside it, and run
`claude plugin eval <that folder> --scaffold --allow-tools Write Edit`.

That runs every case with the plugin loaded, plus a no-plugin baseline for comparison.
Useful flags:

- `--case <name>` runs one case, e.g. `--case web-app-auth-db`. Only one `--case` is
  used per command, so run cases one at a time.
- `--runs 3` repeats each case for a steadier score (the cases default to one run).
- `--max-cost-usd <n>` sets a hard spending ceiling.
- `--scaffold` is needed for `retrofit-existing-repo`, which builds a fixture repo with
  `fixture.sh`.
- `--allow-tools Write Edit` lets a run write `CLAUDE.md`. Without it, every grader that
  reads `CLAUDE.md` fails. Writes into `.claude/` stay blocked in eval runs either way, so
  graders check only that those writes were attempted, not the files themselves.

Each run is a full Claude Code session on your own account, so a full suite costs real
usage. Its own reports go to `evals/results/` inside that copy.

On a subscription, a full suite can run into your usage limit partway through. The
per-case runner avoids starting over. It starts nothing without `--go`: without it, it lists
the sessions it would start, so you see a run's size before you spend it.

```bash
node scripts/run-evals.mjs --release          # list what the per-release run would start
node scripts/run-evals.mjs --release --go     # Haiku and Sonnet, with the plugin only
node scripts/run-evals.mjs --go               # every case, with and without the plugin
node scripts/run-evals.mjs --only-with --go   # skip the baseline while iterating (about half the usage)
node scripts/run-evals.mjs --model haiku --runs 3 --go   # one model, three runs per case
```

It runs each case as its own command, waits and retries only a case that was cut off by a
usage limit or a dropped connection, and skips cases already recorded for the same
`plugin/` folder, so a commit that only changes docs or scripts never re-runs anything. A
case that already has a with-plugin result gets only its no-plugin arm. A case that fails only on LLM-judged graders runs twice more and counts on a
majority, shown as a rate like 2/3; a regex or tool check failing counts at once. The
merged table, one column per model, is written to
`evals-run/plugin-<tree>/SUMMARY.md`, where `<tree>` is the git hash of `plugin/`.
`scripts/trace-case.mjs` and `scripts/generate-example.mjs` each start one session, and
also need `--go`.

The hook attack suite needs no model calls and runs in seconds:

```bash
node scripts/test-hooks.mjs          # every example harness
node scripts/check-reference.mjs     # the reference hooks, straight from the spec
```

If you change trigger wording in `SKILL.md`, re-run at least
`self-triggers-on-bare-description`. It exists because the skill once failed to trigger
on a plain project description.

## Before committing

```bash
claude plugin validate ./plugin
```

It must pass. If you changed behavior, bump the version in both
`.claude-plugin/marketplace.json` and `plugin/.claude-plugin/plugin.json` and add a
`CHANGELOG.md` entry.

## Most wanted: runs on new project shapes

So far it has been run against a web app, a CLI, a published library, a desktop app, a
real-time game server, Terraform, a polyglot monorepo, a Solidity contract, a C++ audio
plugin and an ML research repo. Shapes it hasn't seen yet:

- embedded / IoT firmware
- a browser extension actually published to a store
- compiler or language tooling
- bioinformatics pipelines
- robotics

Open a [new project shape](https://github.com/sagaga144/claude-harness-bootstrap/issues/new?template=new-project-shape.yml)
issue with the description you used, what got generated, and where the derivation
guessed wrong. A PR that fixes the spec for that shape is even better.
