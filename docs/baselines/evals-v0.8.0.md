# Release evals: v0.8.0 (2026-10-16)

The major-release run, on Haiku, Sonnet and Opus, with and without the plugin, one run
per case, Claude Code 2.1.299 to 2.1.300. Results are filed by the plugin's content
(`plugin-ef693fd`: everything in `plugin/` except the eval cases, which each have their
own version), so every result below tested the exact skill that ships in v0.8.0.

| Case | Haiku | Sonnet | Opus |
|---|---|---|---|
| `check-detects-drift` | pass (without: fail) | pass (without: fail) | pass (without: pass) |
| `check-never-auto-applies` | pass (without: pass) | pass (without: pass) | pass (without: pass) |
| `cli-no-ui-no-persistence` | pass (without: pass) | pass (without: pass) | pass (without: pass) |
| `cost-low-caps-models` | pass (without: pass) | pass (without: pass) | pass (without: pass) |
| `essentials-tier-is-lean` | pass (without: pass) | pass (without: pass) | pass (without: pass) |
| `published-library-semver` | pass (without: fail) | pass (without: fail) | pass (without: fail) |
| `retrofit-existing-repo` | pass (without: pass) | pass (without: fail) | pass (without: pass) |
| `sandbox-recommended` | pass (without: fail) | pass (without: fail) | pass (without: fail) |
| `self-protection-planned` | pass (without: fail) | pass (without: fail) | pass (without: fail) |
| `self-triggers-on-bare-description` | pass (without: n/a) | pass (without: n/a) | pass (without: n/a) |
| `two-guided-questions` | pass (without: fail) | pass (without: fail) | pass (without: fail) |
| `untrusted-content-rule-present` | pass (without: fail) | pass (without: fail) | pass (without: fail) |
| `vague-description` | pass (without: fail) | pass (without: fail) | 2/3 (without: fail) |
| `web-app-auth-db` | pass (without: fail) | pass (without: fail) | pass (without: fail) |
| **With the plugin** | **14 of 14** | **14 of 14** | **14 of 14** |
| Without (of 13 scorable) | 5 | 4 | 6 |

"Without" is plain Claude Code with no plugin, scored on the checks that can pass without
it: the "did the skill fire" check and graders marked `arm: with-only` are left out, and
`self-triggers-on-bare-description` has nothing left to score. Plain Claude Code never
passes the security and setup cases on any model: sandbox setup, self-protection, the
untrusted-content rule, the two setup questions, semver discipline for a library, and the
reviewers an authenticated web app needs.

## How the run was done, and what changed during it

- **Fable wasn't run.** It isn't covered by the account's plan, so the roadmap's four-model
  run became three. One run per case instead of three, to keep the cost down; a case that
  fails only on judge votes gets two more runs (Opus `vague-description`: one split, then
  two passes).
- **The Haiku and Sonnet with-plugin results came from the release check before the major
  run**, on the identical plugin. A one-line spec change made after that check (a pointer
  to `/harness-bootstrap:check` in `CLAUDE.md`) was moved to v0.9 so those results still
  applied. The no-plugin arm for those two models ran on its own, with a stand-in plugin
  that has no skills.
- **Two graders changed after Opus missed them, and the affected cases re-ran on all three
  models, with and without the plugin.**
  - `published-library-semver` looked for the word "semver". Opus planned a reviewer for
    breaking changes and the rule that a breaking change needs a major version, without
    the word. The check now also accepts "semantic version" or a major-version rule.
  - The leanness graders (`published-library-semver`, `cli-no-ui-no-persistence`) counted
    `pip install confcheck==<version>`, in a step that runs after a future release, as an
    unfilled placeholder. They now say a stand-in for a value nobody can know at setup
    time is not one.
  These are measurement fixes, not plugin fixes; they're stated here so the numbers can
  be read with them in mind.
- **All nine LLM-judged graders were rewritten for v0.8** as lists of checkable conditions,
  so results on those graders aren't strictly comparable with v0.7.1's.

Earlier releases: [v0.7.1](evals-v0.7.1.md) (12 of 12 on Haiku and Sonnet),
[v0.7.0](evals-v0.7.0.md), [v0.6.1](evals-v0.6.1.md).
