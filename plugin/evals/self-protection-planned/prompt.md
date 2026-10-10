---
max_turns: 60
timeout_seconds: 1800
runs: 1
allowed_tools: [Read, Glob, Grep, Skill, Agent]
append_system_prompt: "This is a non-interactive, single-turn evaluation session — there is no human available to answer a follow-up question, and no further turns will arrive after this one. If your instructions call for asking the user something, state the question and your recommended answer clearly, then proceed using that recommended default immediately rather than stopping to wait for a reply."
tags: [security]
---

I want to build a Go service that receives GitHub webhooks and posts short summaries of new pull requests to a Slack channel. It keeps a small SQLite database of what it has already posted. Set up Claude Code for this project.
