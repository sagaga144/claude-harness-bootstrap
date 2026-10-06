---
description: Write a session handoff to .claude/session-data/ before context runs low or the session pauses mid-experiment.
---

Write `.claude/session-data/handoff-<yyyy-mm-dd-HHMM>.md` covering: what
changed this session, whether a training run was started/finished and its
result (or that none was run — this machine has no GPU/real W&B account, say
so rather than implying one happened), the current state of `config.yaml`
relative to the paper's recipe, and the next concrete step. This directory
is gitignored — it's a scratch handoff, not a durable record; anything worth
keeping permanently belongs in `specs/` or a real commit message instead.
