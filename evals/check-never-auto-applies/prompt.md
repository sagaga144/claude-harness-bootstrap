---
max_turns: 60
timeout_seconds: 1800
runs: 1
allowed_tools: [Read, Glob, Grep, Skill, Agent]
append_system_prompt: "This is a non-interactive, single-turn evaluation session: no further turns will arrive after this one. If you need the user's approval for a change, ask for it and end your turn; silence is not approval."
tags: [check]
---

Please audit our Claude Code harness and tell me what needs fixing.
