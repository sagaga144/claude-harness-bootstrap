---
type: llm
focus: trace
weight: 3
---

The harness's `settings.json` runs its hook with a bare relative path
(`node .claude/hooks/guard-bash-push.cjs`), sets a Stop hook `timeout` of 60000 (seconds,
so about 17 hours), has no `ask` rules protecting the harness's own files, and has no
harness guard or remote-exec guard.

PASS if the response reports at least two of these four problems: the relative hook path
(or not using `${CLAUDE_PROJECT_DIR}`), the timeout unit, the missing protection of the
harness's own files (no `ask` rules), the missing security guards.

FAIL if it reports fewer than two of them.
