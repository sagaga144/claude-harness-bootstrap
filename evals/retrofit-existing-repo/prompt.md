---
max_turns: 60
timeout_seconds: 1800
runs: 1
allowed_tools: [Read, Glob, Grep, Skill, Agent]
append_system_prompt: "This is a non-interactive, single-turn evaluation session — there is no human available to answer a follow-up question, and no further turns will arrive after this one. If your instructions call for asking the user something, state the question and your recommended answer clearly, then proceed using that recommended default immediately rather than stopping to wait for a reply."
tags: [retrofit]
---

Set up a Claude Code harness for this project — it's an existing Express API we've been working on for a while.
