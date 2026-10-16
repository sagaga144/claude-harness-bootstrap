---
max_turns: 60
timeout_seconds: 1800
runs: 1
allowed_tools: [Read, Glob, Grep, Skill, Agent]
append_system_prompt: "This is a non-interactive, single-turn evaluation session — there is no human available to answer a follow-up question, and no further turns will arrive after this one. If your instructions call for asking the user something, state the question and your recommended answer clearly, then proceed using that recommended default immediately rather than stopping to wait for a reply."
tags: [content, roster]
---

We're building an open-source Python library — a small, focused package for parsing and validating a specific config file format, published to PyPI. Other people's projects will `pip install` it and depend on its API directly. No UI, no server, no database — just a library. Can you set up Claude Code for this project before we start building it?
