---
description: Run Driftline's full pre-ship check — configure/build, real-time-safety audit, and a plain READY/NOT-READY verdict.
---

Run this project's version of the standard "ready to ship" gate:

1. **Configure/build** (if a C++ toolchain is available on this machine —
   probe with `where cmake`/`command -v cmake` first, don't infer from a
   failure): `cmake -S . -B build`, then `cmake --build build`. If no
   toolchain is present, say so plainly and skip to step 2 rather than
   claiming a build result that didn't happen.
2. **Real-time-safety audit** — invoke `correctness-reviewer` (Sonnet) on
   the current diff, with special attention to `Source/PluginProcessor.cpp`
   and `Source/DelayLine.h` against `.claude/rules/realtime-audio-thread.md`.
   This is the one check this project cannot skip regardless of whether a
   toolchain is present — real-time safety is a code-reading review, not a
   compiler output.
3. **Domain-guard scan** — confirm `.claude/hooks/warn-realtime-unsafe.cjs`
   raised no unresolved findings on the files touched this session (re-run
   it against the current file content if unsure).
4. **State/param sanity** — if parameters changed, confirm
   `createParameterLayout()`, `processBlock()`'s reads, and the GUI
   attachments in `PluginEditor.cpp` all agree (same param IDs, compatible
   ranges).

End with a plain **READY** or **NOT READY** verdict and, if NOT READY, the
exact blocking finding(s) with file:line. This does not push or commit —
that's a separate, explicit step the user asks for.
