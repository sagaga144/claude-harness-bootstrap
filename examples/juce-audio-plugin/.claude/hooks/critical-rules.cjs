#!/usr/bin/env node
// SessionStart hook: prints the handful of rules that must never be forgotten.
// Fails open (exits 0 printing nothing extra) on any internal error -- a bug
// here must never block a session from starting.

const RULES = `Driftline -- critical rules for this session:
1. processBlock() (Source/PluginProcessor.cpp) and everything it calls
   (DelayLine.h) must NEVER allocate, lock, block, throw, log, or do file/
   network I/O. A single violation is an audible click or dropout, not a
   crash -- see .claude/rules/realtime-audio-thread.md before touching it.
2. Never run "git push" or publish a release without the user explicitly
   asking in this turn.
3. This machine has no C++ toolchain (no cmake found) -- the build-gate
   Stop hook fails open with a warning instead of blocking; don't assume a
   green build means it actually compiles until you verify on a machine
   that has the toolchain.
4. No traditional unit-test framework applies here -- verification is
   static real-time-safety review + offline buffer analysis + manual
   listening in a DAW, not "run the test suite" (see CLAUDE.md Testing).
5. Keep CLAUDE.md lean; new detail about the audio-thread rules belongs in
   the path-scoped rule, not duplicated inline every session.`;

try {
  console.log(RULES);
  process.exit(0);
} catch {
  process.exit(0);
}
