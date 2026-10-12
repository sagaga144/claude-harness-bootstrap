# Input

**Project description given:**

> We're building a desktop app — a local notes app similar to Obsidian, built with Tauri and Svelte, that saves everything as plain markdown files on your computer, has full-text search, and works completely offline with no account or cloud sync.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.7.0 (commit `a45908e`), in a fresh empty folder,
by `scripts/generate-example.mjs`: a real Claude Code session (default model) whose
permission prompts were answered by a fixed policy (write only inside the project folder,
no network or install commands) instead of a person.

`CLAUDE.md` and `.claude/` are copied as generated. Removed: `.claude/session-data/` (the
run's local hook-test fixtures). Attack suite on this harness: 13 of 13 attacks blocked
counting permission rules, 8 of 13 by hooks alone, the same from a subfolder
([matrix](../../docs/baselines/hooks-v0.7.0.md)). The v0.5.0 harness this replaces
blocked 0 of 13 by hooks.

**Edited after generation (2026-10-12):** `.claude/hooks/build-gate.cjs` ran child processes through shell command
strings built with template literals, which security scanners flag as shell injection.
It now passes arguments as a list without a shell (`execFileSync`/`spawnSync`); behavior
is unchanged and was re-tested. The spec was fixed in the same change
(`HARNESS_REFERENCE.md` §1.8), so newly generated harnesses don't do this.
