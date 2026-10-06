---
description: Thin wrapper around Claude Code's built-in Plan subagent, pinned to this project's cost tier — use before a non-trivial change to the data pipeline, model, or training loop.
---

This project doesn't need a custom `planner` agent — Claude Code already
ships one (the built-in `Plan` subagent). Invoke it with the Agent tool,
`subagent_type: "Plan"`, and pass `model: "sonnet"` explicitly on the call
(this project's Step-1 cost answer was "keep cost low," and nothing enforces
a model tier on a built-in subagent unless the invocation says so).

Give it, in the prompt:
- What's changing and why (new architecture variant, a new augmentation, an
  ablation) — this project's paper-reproduction target and current
  `config.yaml` contents, since the subagent starts with no context of this
  conversation.
- That any change touching `src/data.py`'s train/test handling or
  `src/utils.set_seed` needs to preserve the reproducibility contract
  (`CLAUDE.md`'s Gotchas + the `note-data-integrity` hook's reminder).

Hand the resulting plan to the `ml-engineer` agent to implement, one
file-precise step at a time.
