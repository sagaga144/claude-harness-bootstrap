---
name: init
description: Use this first, before writing any code, scaffolding files or checking toolchains, whenever the user describes a new project, app or tool they want to build, even with no mention of Claude Code, a harness or setup at all — e.g. "I want to build a command-line tool that..." or "We're building a web app with..." — not only when they explicitly ask for Claude Code to be set up. Also use when they ask for a harness/starter kit/project scaffold, explicitly invoke this skill, or ask to set up, add or improve Claude Code (a harness, CLAUDE.md, hooks or agents) for an existing repo or codebase, which this skill handles as a retrofit. It bootstraps a complete, project-specific Claude Code harness — a lean CLAUDE.md plus the full .claude/ tree (hooks, agents, commands, skills) — from a one-paragraph description, for any stack (web, CLI, backend, mobile, library, data/ML, etc). If they ask for setup but the description is too thin to profile ("I want to build an app"), still invoke this with their own words. Don't choose, assume or announce a stack yourself first; this skill handles a missing app type by asking one question.
---

# Bootstrap a project harness

Read `BOOTSTRAP.md` in this skill's folder and follow it exactly, in order — it is the
actual instruction set, not a summary to paraphrase. It walks through:

1. Profiling the project from the user's description (and the repo, if one exists).
2. Writing a lean, project-specific `CLAUDE.md` — every section derived, no placeholders.
3. Handing off to `HARNESS_REFERENCE.md` (same folder) to build the rest of `.claude/`
   (hooks, agents, commands, skills), verify it, and — once it's run for a real
   session — publish an Operator's Manual artifact documenting it.

Don't ask the user to approve each step. Do the work, then report back what got built and
why, per `BOOTSTRAP.md`'s closing instruction.
