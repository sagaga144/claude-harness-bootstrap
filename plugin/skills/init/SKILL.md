---
description: Bootstraps a complete, project-specific Claude Code harness — a lean CLAUDE.md plus the full .claude/ tree (hooks, agents, commands, skills, memory loop) — from a one-paragraph description of a project idea, for any stack (web, CLI, backend, mobile, library, data/ML, etc). Use when the user describes a new project and wants Claude Code set up for it, asks for a harness/starter kit/project scaffold to be built, or explicitly invokes this skill.
---

# Bootstrap a project harness

Read `BOOTSTRAP.md` in this skill's folder and follow it exactly, in order — it is the
actual instruction set, not a summary to paraphrase. It walks through:

1. Profiling the project from the user's description (and the repo, if one exists).
2. Writing a lean, project-specific `CLAUDE.md` — every section derived, no placeholders.
3. Handing off to `HARNESS_REFERENCE.md` (same folder) to build the rest of `.claude/`
   (hooks, agents, commands, skills, memory), verify it, and — once it's run for a real
   session — publish an Operator's Manual artifact documenting it.

Don't ask the user to approve each step. Do the work, then report back what got built and
why, per `BOOTSTRAP.md`'s closing instruction.
