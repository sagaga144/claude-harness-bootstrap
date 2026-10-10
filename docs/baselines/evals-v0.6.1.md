# Eval baseline per model: v0.6.1 (2026-10-10)

`node scripts/run-evals.mjs --release` on commit `9d62c6e` (the v0.6.1 plugin), Claude
Code 2.1.296: Haiku and Sonnet, with the plugin only, **one run per case**. The run was
stopped partway through Sonnet by Claude Code because the machine ran low on memory, so
Sonnet has 6 usable results, not 8. One run per case is noisy; treat single passes and
fails as signals, not verdicts.

| Case | Haiku | Sonnet |
|---|---|---|
| `self-triggers-on-bare-description` | fail: skill not invoked | pass |
| `two-guided-questions` | pass | pass |
| `web-app-auth-db` | fail: semver reviewer planned, no secret scan in `CLAUDE.md` | not run (stopped) |
| `published-library-semver` | pass | fail: no semver reviewer, `CLAUDE.md` not lean |
| `vague-description` | pass | not counted: cut off by a usage limit after one turn |
| `cli-no-ui-no-persistence` | fail: dev commands, leanness, roster | pass |
| `retrofit-existing-repo` | fail: skill not invoked | fail: skill not invoked |
| `cost-low-caps-models` | fail: no Sonnet/Haiku tier written | fail: no Sonnet/Haiku tier written |
| **Pass** | **3 of 8** | **3 of 6** |

## What this says

- **The 8/8 in the README is for the account's default model**, one run per case like
  this table. On Haiku and Sonnet, v0.6.1 is far less reliable. This is the gap the
  roadmap's "every Claude model" goal is about, now measured.
- **Two cases fail on both models:**
  - `retrofit-existing-repo`: neither model invoked the skill for "Set up a Claude Code
    harness for this project, it's an existing Express API". The skill's trigger
    description leans on describing a *new* project; an existing repo plus "set up a
    harness" may not read as a match to smaller models.
  - `cost-low-caps-models`: both runs ended in 10 to 12 turns without the Sonnet/Haiku
    tier appearing in the trace. A likely cause: eval runs can't write into `.claude/`, and
    smaller models may stop at the first refused write instead of continuing to write the
    agent files the grader looks for. Not confirmed: the traces went to the system temp
    folder and were cleaned up. Next time, keep them (`claude plugin eval --keep-temp`)
    and inspect.
- Haiku's misses on the CLI and web-app cases are about following the spec's detail
  (roster rules, dev commands, leanness), which fits the roadmap's concern that the 55KB
  spec is a lot for a small model. **This triggers Step 2.1** (split the spec into parts
  loaded on demand), and it should be judged by re-running this table.

## To finish this baseline

Re-run the missing Sonnet cases (`web-app-auth-db`, `vague-description`) when the
machine has memory to spare: `node scripts/run-evals.mjs --release` in the
`.worktrees/eval-v0.6.1` checkout picks up where it stopped.
