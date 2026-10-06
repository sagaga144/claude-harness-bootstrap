---
name: orch-add-feature
description: Orchestrates adding a new parameter, DSP feature, or GUI control to Driftline end to end — plan, implement, review, verify. Use when the user asks to add a knob, change the delay algorithm, or add any new user-facing capability.
---

# Add a feature to Driftline

This project's version of "add a feature" is almost always one of: a new
plugin parameter, a change to the delay DSP algorithm, or a GUI addition.
Run this sequence:

1. **Plan** — invoke `planner` (Sonnet) with the request verbatim plus
   pointers to `Source/PluginProcessor.h`/`.cpp` and
   `.claude/rules/realtime-audio-thread.md`. Require the plan to name every
   file it touches and, if the audio thread is involved, exactly what gets
   pre-allocated in `prepareToPlay()`.
2. **Implement** — invoke `plugin-engineer` (Sonnet) with the plan's full
   text (subagents start with a fresh context — paste the plan in, don't
   reference "the plan from step 1" and assume it carries over).
3. **Review** — invoke `correctness-reviewer` (Sonnet) on the resulting diff.
   If it returns NOT READY, send its exact findings back to
   `plugin-engineer` and repeat step 3 after the fix — don't loop through
   `planner` again unless the finding reveals the plan itself was wrong.
4. **Verify** — run `/verify`.
5. **Report** — summarize what changed, the reviewer's verdict, and
   anything still needing a human ear (manual listening test) before this
   is really "done" for an audio plugin — a clean review and a clean build
   are necessary, not sufficient, the way they might be for a typical CRUD
   feature.

Two human gates, same as any other project this harness builds: nothing
gets pushed without the user asking, and step 5's report is where the
human is expected to actually listen to the result before calling it
finished — that's this project's equivalent of a human reviewing a UI
screenshot.
