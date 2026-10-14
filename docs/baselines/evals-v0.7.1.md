# Release evals: v0.7.1 (2026-10-14)

`node scripts/run-evals.mjs --release` on commit `38a866c`, Claude Code 2.1.299: Haiku and
Sonnet, with the plugin only, one run per case. The plugin files are the same in the
release commit; only the version number and docs changed after the run. Every case
passed on its first run, so none needed the judge-split reruns.

| Case | Haiku | Sonnet |
|---|---|---|
| `cli-no-ui-no-persistence` | pass | pass |
| `cost-low-caps-models` | pass | pass |
| `essentials-tier-is-lean` | pass | pass |
| `published-library-semver` | pass | pass |
| `retrofit-existing-repo` | pass | pass |
| `sandbox-recommended` | pass | pass |
| `self-protection-planned` | pass | pass |
| `self-triggers-on-bare-description` | pass | pass |
| `two-guided-questions` | pass | pass |
| `untrusted-content-rule-present` | pass | pass |
| `vague-description` | pass | pass |
| `web-app-auth-db` | pass | pass |
| **Pass** | **12 of 12** | **12 of 12** |

v0.7.0 passed 9 of 12 on each ([baseline](evals-v0.7.0.md)).

## What the misses were, and what fixed them

Eval runs refuse every write into `.claude/` with "Permission to use Write has been denied
because Claude Code is running in don't ask mode … STOP and explain to the user". Most
v0.7.0 misses came from how the setup reacted to that:

- **Nothing written.** The `.claude/` files were attempted first; after the refusal some
  sessions stopped before writing `CLAUDE.md`. Fix: `CLAUDE.md` first, then
  `settings.json`, then the guard hooks.
- **Security files skipped.** A first fix stopped all `.claude/` writes after one refusal,
  so the harness guard was never attempted (`self-protection-planned`, Sonnet). Then the
  "don't ask mode" wording led Sonnet to skip the guards about half the time even when
  told to try them. Fix: each security file is tried once, and the spec says why a
  session-wide-sounding refusal doesn't cover a different path. Sonnet: 3 of 3 after,
  2 of 4 before.
- **Skill not invoked** (`self-triggers-on-bare-description`, Haiku). Haiku read "I want
  to build X" as a request to start coding. Fix: the skill's description says it comes
  before any code. Haiku: 4 of 4 traced runs after, about 1 in 2 before.
- **Grader out of date** (`published-library-semver`, Haiku). The planned
  `semver-reviewer` was named in the closing report, as 0.7.1 intends, but the grader
  read only `CLAUDE.md`. It now reads the report and accepts "semantic versioning". The
  same run used `src/<pkg>/` in a path, which the leanness judges read as a placeholder;
  the spec now says to use the picked name.
- **Judge split** (`cli-no-ui-no-persistence`, Sonnet, once): leanness voted 2 to 1
  against, then passed 3 of 3 on rerun with the same plugin.

## How the misses were found

Eval traces live in the system temp folder and are deleted after the run. Running with
`TEMP`/`TMP` pointed at a folder outside the repo and `--keep-temp` keeps each session's
`trace.jsonl`. `scripts/trace-case.mjs --native` re-runs a case through the Agent SDK with
the same refusal text. An earlier version used a different message ("… is a sensitive
file"), so its traces passed where the eval failed.

One run per case is noisy; a single pass is a signal, not a guarantee.
