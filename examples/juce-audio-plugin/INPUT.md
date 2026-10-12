# Input

**Project description given:**

> I want to build an audio plugin — a simple stereo delay effect (VST3/AU) using the JUCE framework in C++, that musicians load in their DAW (digital audio workstation) to process sound in real time. It has a handful of knobs (delay time, feedback, mix) and a basic GUI. The hard constraint is the audio processing callback: it runs on a real-time thread and must never allocate memory, take a lock, or do anything that could block, or you get audible clicks/dropouts — that's the whole game with this kind of software.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.5.5, in a fresh empty folder. Gaps this run exposed
were fixed in v0.5.6; see the [changelog](../../CHANGELOG.md#056-2026-09-09).

`CLAUDE.md` and `.claude/` are copied as generated. Removed: `.claude/session-data/`
(local hook-test fixtures and an unpublished Operator's Manual draft) and the project code
the run scaffolded alongside the harness.

**Edited after generation (2026-10-12):** `.claude/hooks/build-gate.cjs` ran child processes through shell command
strings built with template literals, which security scanners flag as shell injection.
It now passes arguments as a list without a shell (`execFileSync`/`spawnSync`); behavior
is unchanged and was re-tested. The spec was fixed in the same change
(`HARNESS_REFERENCE.md` §1.8), so newly generated harnesses don't do this.
