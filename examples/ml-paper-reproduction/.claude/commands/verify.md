---
description: Syntax/reproducibility gate before treating a change as done — the closest this project has to a build → test pass.
---

Run this project's verification pass and report READY / NOT-READY:

1. Syntax: `python -m py_compile src/*.py` (probe for `python` first with
   `where python`; if absent, say so plainly and skip this step rather than
   treating a missing toolchain as a failure).
2. Notebook integrity: confirm every `notebooks/*.ipynb` parses as JSON with
   a `cells` array (the same check `.claude/hooks/stop-syntax-gate.cjs`
   already runs on `Stop` — this command exists so you can run it on demand
   mid-session, not just at turn end).
3. If `src/data.py`, `src/model.py`, `src/train.py`, or `config.yaml`
   changed: invoke the `correctness-reviewer` agent with the actual diff
   (`git diff`) — it has no memory of this conversation, pass it explicitly.
4. If nothing under `src/` or `config.yaml` changed (e.g. only a notebook or
   README edit), skip step 3 and say so.

Report READY only if every step that applies passed. On NOT-READY, give the
exact file:line and what's wrong — not a vague "needs work."

Remember what this project's "done" actually means: a clean `/verify` proves
the code isn't obviously broken. It does NOT prove the reproduction landed
near the paper's target accuracy — that's a real training run's result,
checked in `notebooks/02_visualize_results.ipynb`, not something this
command can shortcut.
