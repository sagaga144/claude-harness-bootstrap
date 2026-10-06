# CIFAR-10 ResNet-20 Reproduction — Claude Code Harness

This harness acts on this project three ways: **automatic** (hooks fire
unasked — a push guard, a secret scan, a syntax gate), **routed** (plain
language goes through the Intent Router below to the right agent/command),
**invoked** (you name a slash command or agent directly). You never have to
learn a command name — plain language always works.

## Project Overview
**Project:** cifar10-resnet20-repro
**Stack:** Python 3.11+ (targets torch 2.2+/torchvision 0.17+; this dev
machine has torch 2.13 CPU-only and no torchvision/wandb installed yet — see
Gotchas), no framework, Jupyter for notebooks, Weights & Biases for run logging.
**Deployed on:** not applicable — no deploy target, no app. "Shipping" for
this project means a training run's result is trustworthy and reproducible.

## Dev Commands

| Command | Does |
|---|---|
| `pip install -r requirements.txt` | install deps |
| `python -m src.train --config config.yaml` | full training run (needs torchvision; ~2hr+ on CPU, this repo has no GPU) |
| `python -m src.train --config config.yaml --epochs 1 --wandb-mode disabled` | smoke test only — not a real run |
| `python -m py_compile src/*.py` | the closest thing this project has to a "build" |
| `jupyter notebook notebooks/` | open the exploration/results notebooks |

**No test framework, and that's a real gap, not an oversight.** This is
numeric-output research code: "correct" means a completed run's test
accuracy lands within ~1-2 points of the paper's reported 91.25% (ResNet-20,
He et al. 2015), not a pass/fail assertion. `py_compile` catches syntax
errors only — it says nothing about whether the science is right. The
actual verification story is: static review (`correctness-reviewer`, for
leakage/shape/reproducibility bugs) + a real run's number checked in
`notebooks/02_visualize_results.ipynb` against `PAPER_TARGET_ACC`. There is
no type-check gap to call out the way a bundler/TS project has — Python here
has no static typing pass at all, by ecosystem default, not as a project gap.

## Intent Router

| If the user says… | Invoke first |
|---|---|
| "broken" / "crash" / "error" | `ml-engineer` to fix, then re-run `/verify` |
| "add X" / "try a different architecture/augmentation" | `/plan-experiment` → `ml-engineer` |
| "is this right" / "review this" / "check the data pipeline" | `correctness-reviewer` |
| "ready" / "can I run this" / "done?" | `/verify` |
| "is this reproducible" / "start a real run" | the `reproducibility-check` skill |
| "how should I build this" / "plan this" | `/plan-experiment` (wraps the built-in `Plan` subagent) |
| "clean up" / "simplify" | built-in `/simplify` |
| "how does X work" | read the files, answer inline — no agent |
| "save my progress" / "pick up where I left off" | `/save-session` / `/resume-session` |
| "did we reproduce the paper" | read `notebooks/02_visualize_results.ipynb`'s output, don't guess |

## Must-Do Automatics

| Event | Hook | Does |
|---|---|---|
| Session start | `critical-rules.cjs` | prints the rules below |
| Before any `Bash` | `guard-bash-push.cjs` | blocks `git push` (`ALLOW_PUSH=1` to override) |
| Before any `Bash` | `guard-bash-secrets.cjs` | blocks `git commit` if the staged diff looks like a secret (W&B key, AWS key, PEM header) |
| Before `Edit`/`Write` | `guard-protected-files.cjs` | blocks edits to `.env`, `checkpoints/`, `wandb/`, the downloaded dataset, `*.pt`/`*.pth`/`*.ckpt` |
| Before `Write` | `guard-adhoc-docs.cjs` | blocks stray `FINDINGS.md`/`REPORT.md` etc. at repo root |
| After `Edit`/`Write` | `warn-debug-statements.cjs` | warns on a leftover `breakpoint()`/`pdb.set_trace()` in a `.py` file (notebooks excluded on purpose — see Gotchas) |
| After `Edit`/`Write` | `note-data-integrity.cjs` | reminds about leakage/seed risk when `src/data.py`, `src/model.py`, or `config.yaml` change |
| Model switch | `guard-model-switch.cjs` | blocks escalating to a pricier model (this project's cost answer was "keep cost low"; `ALLOW_MODEL_UP=1` to override) |
| Turn end | `stop-syntax-gate.cjs` | `python -m py_compile` on every `.py` + JSON-validity check on every `.ipynb`; skips the `.py` half with a warning (not a block) if `python` isn't on PATH |

## Agents, Commands & Skills

**Essentials tier** (this project's Step-1 answer): `ml-engineer` (Sonnet,
implementer), `correctness-reviewer` (Sonnet, the only reviewer this project
needs — no auth/money/deletion/trust boundary to justify a fourth,
stakes-justified role). No custom `planner`/`project-manager` agent —
`/plan-experiment` is a thin wrapper around Claude Code's built-in `Plan`
subagent, pinned to Sonnet on the call itself. That's 3 roles total.

Deferred (full-setup, not essentials): `refactor-cleaner`, `silent-failure-hunter`
(would matter here mainly as "schema drift in the CIFAR-10 pipeline" —
folded into `correctness-reviewer`'s leakage/shape checks for now instead of
a dedicated agent), `performance-reviewer` (training speed isn't the success
metric here). Ask for any of these to be added later — nothing is lost.

Commands: `/verify` (syntax + notebook-integrity + correctness-reviewer gate),
`/plan-experiment`, `/save-session`, `/resume-session`. No `/full-review` —
with only one reviewer agent, a separate multi-dimension command would just
re-call `/verify`.

Skill: `reproducibility-check` (task-triggered — "is this run trustworthy",
not tied to a file path). Rule: `.claude/rules/notebooks.md` (path-scoped to
`notebooks/**/*.ipynb` — file-path-triggered notebook hygiene, a different
trigger than the skill above).

## Orchestration & Gates

Every reviewer finding needs >80% confidence with file:line + a concrete
scenario; "zero findings" is valid. `/verify` is the one gate before calling
something done; nothing here auto-commits or auto-pushes.

## Model Routing

Cost answer from setup: **keep cost low**. Every agent is capped at Sonnet;
Opus/`fable` are not used anywhere in this harness (nothing here has a
trust-boundary or irreversible-action trait that would justify it). See
Gotchas for the one place this was a real judgment call, not just a cap.

## MCP Servers

None wired. No deploy target, no live service, no `github` MCP need beyond
what's already available.

## Code Style / Testing / Environment Variables

- Type hints on new functions (`from __future__ import annotations`
  already used throughout `src/`); no enforced static-typing pass — Python's
  ecosystem default, not this project skipping something.
- `ruff check .` if installed; not enforced by a hook (not confirmed present
  on this machine — probe before assuming).
- Secrets via `.env` (gitignored), templated in `.env.example`. Never commit
  `WANDB_API_KEY`. `guard-bash-secrets.cjs` scans staged diffs for it, but
  notebook *output* cells are a real, separate leak path — see
  `.claude/rules/notebooks.md`.

## Bug Tracking Log

`.claude/BUGS.md` — empty for now; log real bugs here as they're found.

## Project-Specific Notes (Gotchas)

- Relies on Claude Code's built-in auto memory for cross-session learning —
  no custom memory system was built. `/memory` browses/edits what it's saved.
- This dev machine has torch 2.13+cpu installed but **no torchvision, no
  wandb, no GPU, no real W&B account** — confirmed by direct probe, not
  assumed. Any hook/command touching those toolchains fails open with a
  plain warning rather than blocking; don't infer "it's broken" from a
  missing-package error without checking presence first.
- "Has a UI"/"has persistence" were judgment calls: notebooks aren't a UI in
  this table's sense (no interactive app), and filesystem checkpoints/W&B
  logs aren't the DB-shaped "persistence" that row is really about — no
  `<data-layer>-guard` agent was built for that reason.
- Essentials tier assumed `planner` over `project-manager` for
  `/plan-experiment` since this project has real structure to plan against
  (data/model/training-loop/notebooks), not "just start building."
- `warn-debug-statements.cjs` deliberately does not fire on `.ipynb` files —
  `print()`/inline exploration is normal there, not a debug-leftover smell,
  and the hook has no way to judge intent per-cell.

## Pipeline Flow

```
idea/ablation --> /plan-experiment (built-in Plan, Sonnet)
              --> ml-engineer implements (src/, notebooks/)
              --> correctness-reviewer (leakage/shape/repro checks)
              --> /verify (syntax + notebook integrity + reviewer gate)
              --> real training run (human-run; no GPU/W&B here to automate it)
              --> notebooks/02_visualize_results.ipynb checks vs. paper target
```
