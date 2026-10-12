# Release evals: v0.7.0 (2026-10-12)

`node scripts/run-evals.mjs --release` on commit `7ed89f3` (v0.7.0), Claude Code 2.1.296:
Haiku and Sonnet, with the plugin only, one run per case. Claude Code stopped the run
partway through Sonnet because the machine ran low on memory and later hit the usage
limit; it was resumed until every case had a result. One run per case is noisy; treat single results as signals.

| Case | Haiku | Sonnet |
|---|---|---|
| `cli-no-ui-no-persistence` | pass | fail (dev commands, leanness, roster) |
| `cost-low-caps-models` | fail (no Sonnet/Haiku tier written) | fail (same) |
| `essentials-tier-is-lean` | pass | pass |
| `published-library-semver` | pass | pass |
| `retrofit-existing-repo` | pass | pass |
| `sandbox-recommended` | fail (no sandbox in the settings write) | pass |
| `self-protection-planned` | pass | pass |
| `self-triggers-on-bare-description` | fail (skill not invoked) | pass |
| `two-guided-questions` | pass | pass |
| `untrusted-content-rule-present` | pass | pass |
| `vague-description` | pass | pass |
| `web-app-auth-db` | pass | fail (stopped after 15 turns with no `CLAUDE.md` written) |
| **Pass** | **9 of 12** | **9 of 12** |

Compared with v0.6.1 ([baseline](evals-v0.6.1.md)): Haiku went from 3 of 8 to 9 of 12, and
`retrofit-existing-repo` now passes on both models after the skill's trigger fix.
`cost-low-caps-models` still fails on both. The improvement loop's dry run proposed a
cause: with no one to answer the two setup questions, smaller models may stop before
writing agent files. That edit is on branch `improve/202610101751-2adea09`, untested
against the evals.

To finish: re-run `node scripts/run-evals.mjs --release` in `.worktrees/eval-v0.7.0`; it
skips the recorded cases.
