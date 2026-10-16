---
max_turns: 60
timeout_seconds: 1800
runs: 1
allowed_tools: [Read, Glob, Grep, Skill, Agent]
append_system_prompt: "This is a non-interactive, single-turn evaluation session — there is no human available to answer a follow-up question, and no further turns will arrive after this one. If your instructions call for asking the user something, state the question and your recommended answer clearly, then proceed using that recommended default immediately rather than stopping to wait for a reply."
tags: [content, roster]
---

I want to build a command-line tool in Python that converts CSV files to JSON and back. It uses Typer for the CLI interface. There's no web UI, no database, no network calls — it just reads and writes local files the user points it at on the command line. Can you set up Claude Code for this project before we start building it?
