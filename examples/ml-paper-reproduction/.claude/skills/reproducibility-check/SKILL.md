---
name: reproducibility-check
description: Use before/after starting a real training run, or whenever "is this run trustworthy/reproducible" comes up — checks that a run can actually be pointed to later and rerun to the same result. Not tied to any specific file path; triggered by the task ("start a run", "is this reproducible", "someone else needs to rerun this").
---

# reproducibility-check

This project's definition of done is "within ~1-2 points of the paper's
accuracy, and reproducible if rerun later" — the second half is easy to
silently lose. Before calling a run trustworthy, confirm:

1. **Config is committed, not just local.** `config.yaml` at the commit
   used for the run matches what's in git — an uncommitted local tweak
   means nobody else can reproduce the number, including future-you.
2. **Seed is fixed and unchanged mid-series.** If comparing multiple runs
   (ablations), only vary the one thing being ablated — not the seed too,
   or you can't tell whether a delta is the change or just run-to-run noise.
3. **The run's actual command is recorded**, not just "I ran training" —
   `python -m src.train --config config.yaml` plus any CLI overrides used
   (`--epochs`, `--wandb-mode`). Put it in the W&B run notes or the commit
   message, not only in scrollback.
4. **W&B mode is honest about what happened.** `--wandb-mode offline` or
   `disabled` means there's no online dashboard link to hand anyone — say so
   rather than implying a shareable run exists.
5. **The result was checked against the paper's number**, not just that
   the script exited 0 — `notebooks/02_visualize_results.ipynb`'s
   `PAPER_TARGET_ACC`/`TOLERANCE` check is the actual pass/fail, not the
   training script's own exit code.
6. **Library versions are pinned** (`requirements.txt`) — a "same seed, same
   config" rerun on a different torch/torchvision version is not guaranteed
   to land on the same number; note the versions actually used if they ever
   drift from `requirements.txt`'s stated minimums.

If any of these isn't true, say so explicitly rather than calling the run
"reproducible" by default — this is the one claim this project can't afford
to get wrong silently.
