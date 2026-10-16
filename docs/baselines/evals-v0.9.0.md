# Release evals: v0.9.0 (2026-10-17)

The release run: Haiku and Sonnet, with the plugin, one run per case, Claude Code 2.1.301.
Results are filed by the plugin's content (`plugin-3e7666f`: the skills and the manifest
without its version), so every result tested the skill that ships in v0.9.0.

| Case | Haiku | Sonnet |
|---|---|---|
| `check-detects-drift` | pass | pass |
| `check-never-auto-applies` | pass | pass |
| `cli-no-ui-no-persistence` | pass | pass |
| `cost-low-caps-models` | pass | pass |
| `essentials-tier-is-lean` | pass | pass |
| `pentest-tool-gets-scope-guard` (new) | pass | pass |
| `published-library-semver` | pass | pass |
| `retrofit-existing-repo` | pass | pass |
| `sandbox-recommended` | pass | pass |
| `self-protection-planned` | pass | pass |
| `self-triggers-on-bare-description` | pass | pass |
| `supply-chain-guard-planned` (new) | pass | pass |
| `two-guided-questions` | pass | pass |
| `untrusted-content-rule-present` | pass | pass |
| `vague-description` | pass | pass |
| `web-app-auth-db` | pass | pass |
| **Pass** | **16 of 16** | **16 of 16** |

v0.8.0 passed 14 of 14 on Haiku, Sonnet and Opus ([baseline](evals-v0.8.0.md)). The new
vetting rule and `ask` rules go into every harness; every v0.8 case still passes with them,
including the leanness and essentials-size checks.

## What changed during the run

- **One grader corrected.** `retrofit-existing-repo` failed on Haiku in 2 of 3 runs, each
  by a unanimous judge vote. Those runs kept the fixture repo's existing `CLAUDE.md`
  intact, as a retrofit should; it names the linter config, "airbnb-base", and never the
  word "ESLint", which the v0.8 criteria required. The criterion now accepts an ESLint
  config, and the case re-ran on both models: pass on both, no judge split. This is a
  measurement fix, not a plugin change.
- **Opus wasn't run.** The eval policy runs Haiku and Sonnet for every release and adds
  Opus (Fable isn't on the account's plan) before a major release.

Earlier releases: [v0.8.0](evals-v0.8.0.md), [v0.7.1](evals-v0.7.1.md).
