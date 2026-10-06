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

The suite lives in `plugin/evals/`: 8 cases, each a `prompt.md` plus `graders/`. From the
repo root:

```bash
claude plugin eval ./plugin --scaffold --allow-tools Write Edit
```

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
usage. Results go to `plugin/evals/results/` (gitignored).

On a subscription, a full suite can run into your usage limit partway through. The
per-case runner avoids starting over:

```bash
node scripts/run-evals.mjs               # every case, with and without the plugin
node scripts/run-evals.mjs --only-with   # skip the baseline while iterating (about half the usage)
```

It runs each case as its own command, waits and retries only a case that was cut off by a
usage limit or a dropped connection, and skips cases already recorded for the current
commit. The merged table is written to `evals-run/<commit>/SUMMARY.md`.

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
