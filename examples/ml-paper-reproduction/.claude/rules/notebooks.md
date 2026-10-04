---
paths: notebooks/**/*.ipynb
---

# Notebook conventions

- Notebooks are JSON (`cells` array of `code`/`markdown` objects), not
  Python source — an edit has to produce valid notebook JSON, not just
  syntactically valid Python pasted into a `source` field.
- Don't hardcode absolute paths (`C:\Users\...`) — both notebooks already
  use `sys.path.append("..")` + relative paths (`../data`, `../checkpoints`)
  so they run the same way for anyone who clones the repo, matching this
  project's reproducibility goal.
- Leave `execution_count: null` and `outputs: []` on any cell you add or
  edit unless you actually ran it — a stale `outputs` block showing numbers
  from a run that no longer matches the current code is worse than no
  output at all.
- Never let a cell print a real secret (`WANDB_API_KEY`, etc.) — unlike
  source files, a notebook's *output* is saved into the file too, so a
  printed env var becomes committed plaintext even if the source line
  itself looks harmless. `.claude/hooks/guard-bash-secrets.cjs` scans the
  staged diff generically, but it can't tell a notebook cell's intent from
  its source — review before committing, don't rely on the hook alone here.
- `02_visualize_results.ipynb` encodes the actual project success
  criterion (`PAPER_TARGET_ACC`, `TOLERANCE`) — if the paper target or
  tolerance changes, update it there, not just in `config.yaml`'s comment.
