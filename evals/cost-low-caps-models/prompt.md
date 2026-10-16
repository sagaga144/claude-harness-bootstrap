---
max_turns: 60
timeout_seconds: 1800
runs: 1
allowed_tools: [Read, Glob, Grep, Skill, Agent]
append_system_prompt: "This is a non-interactive, single-turn evaluation session — there is no human available to answer a follow-up question, and no further turns will arrive after this one. If your instructions call for asking the user something else, state the question and your recommended answer clearly, then proceed using that recommended default immediately rather than stopping to wait for a reply."
tags: [cost]
---

I want to build a small Next.js web app with user accounts and a Postgres database for tracking my personal reading list. Can you set up Claude Code for this project? Please keep my Claude usage cost as low as possible while setting this up — I don't want expensive model calls for something this small.
