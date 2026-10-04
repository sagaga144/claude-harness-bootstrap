# CLAUDE.md

This project's Claude Code harness acts in three ways: **automatic**
(hooks fire unasked — real-time-safety scans, push/secret guards, the build
gate), **routed** (plain language you type gets matched to the right
agent/command by the Intent Router below — you never need to name one),
and **invoked** (you name a slash command or skill directly, e.g. `/verify`).
You should never need to learn the names below to get value from them.

## Project Overview
**Project:** Driftline (no name was given in the description; picked one and
noting it here rather than leaving a placeholder — cheap to rename later)
**Stack:** C++20 + JUCE 8 framework, CMake (via `FetchContent`), VST3 + AU
+ Standalone targets
**Deployed on:** not yet — local only, no distribution target chosen

## Dev Commands
| Command | Does |
|---|---|
| `cmake -S . -B build` | Configure — the closest thing this project has to a fast "does it hang together" check |
| `cmake --build build` | Full build (all formats) |
| `pluginval --strictness-level 5 <path-to-built-plugin>` | Ecosystem-standard plugin validator (Tracktion's `pluginval`) — format compliance, parameter automation stress-testing, some real-time-safety stress testing. Not runnable yet: needs a built plugin, and this machine has no C++ toolchain installed at all (checked: `cmake` is not on PATH). Run once a toolchain exists. |

**Known gap, this ecosystem's version of "build passing ≠ types checked":**
a clean CMake configure/build proves the code compiles — it proves **nothing**
about real-time safety. Code can build perfectly and still allocate/lock on
the audio thread and click audibly the first time it runs under load. Don't
treat a green build as a substitute for the real-time-safety review below.

## Intent Router
| If you say… | Invoke first |
|---|---|
| "click" / "pop" / "dropout" / "glitch" | `correctness-reviewer` — this is almost always a real-time-safety violation, not a DSP-math bug |
| "add a knob" / "add a parameter" / "add a feature" | `orch-add-feature` skill |
| "change the delay algorithm" / "DSP change" | `planner` → `plugin-engineer` |
| "the GUI" / "layout" / "the knobs look wrong" | `plugin-engineer` (GUI half) |
| "is this safe" / "check the audio thread" / "is this real-time safe" | `correctness-reviewer` |
| "clean up" / "refactor" | `/simplify` (built into Claude Code) |
| "ship" / "release" / "ready to merge" | `/verify` → `correctness-reviewer` → (you push) |
| "how should I build this" / "plan this" | `planner` |
| "how does X work" | Read the files, answer inline — no agent |
| "slow" / "too much CPU" | `correctness-reviewer` — no separate performance-reviewer under essentials; folded in since a real-time budget miss *is* this project's correctness concern (see Model Routing note) |

## Must-Do Automatics
| Event | Hook | Does |
|---|---|---|
| Session start | `critical-rules.cjs` | Prints the 5 rules that must never be forgotten (real-time contract, no-toolchain gap, no push, etc.) |
| Before any Bash | `guard-bash-push.cjs` | Blocks `git push`/publish commands unless `ALLOW_PUSH=1` |
| Before any Bash | `guard-secret-scan.cjs` | Blocks `git commit` if the staged diff looks like it contains a secret |
| Before writing a file | `guard-adhoc-doc.cjs` | Blocks stray `FINDINGS.md`/`REPORT.md` at repo root |
| Before editing/writing a file | `guard-protected-files.cjs` | Blocks edits to `.env`/lockfiles |
| After editing/writing a `.cpp`/`.h` | `warn-debug-print.cjs` | Flags a stray `std::cout`/`printf`/`DBG()` left in source (advisory) |
| After editing/writing `PluginProcessor.cpp` or `DelayLine.h` | `warn-realtime-unsafe.cjs` | Regex scan for allocation/locking/blocking-I/O patterns in the audio-thread path (advisory) |
| Before a model switch | `cost-guard.cjs` | Blocks escalating past Sonnet — this project's cost answer was "keep cost low" |
| End of turn | `build-gate.cjs` | Runs `cmake` configure if a toolchain is present; probes for `cmake` first and fails open with a plain warning if it's missing (it is, on this machine) rather than blocking |

## Agents, Commands & Skills
| Name | Role | Model |
|---|---|---|
| `planner` | File-precise plan before non-trivial changes | Sonnet |
| `plugin-engineer` | Implements DSP + GUI (one implementer, one toolchain) | Sonnet |
| `correctness-reviewer` | C++ correctness **and** real-time-safety, merged (see Model Routing) | Sonnet |
| `/verify` | Build (if possible) → real-time-safety review → domain-guard recheck → READY/NOT READY | — |
| `orch-add-feature` (skill) | plan → implement → review → verify, for any new parameter/DSP/GUI capability | — |
| `/save-session`, `/resume-session` | Session handoffs via `.claude/session-data/` | — |

Also available, built into Claude Code itself (not rebuilt here):
`Explore` for read-only fan-out search, `/code-review` for a fresh-context
adversarial pass, `/simplify` for cleanup, `/goal` if an unattended
multi-turn run ever needs condition-gating.

## Orchestration & Gates
`correctness-reviewer` only blocks on >80%-confidence findings with an exact
file:line and failure scenario; a clean pass is a valid verdict, not a sign
to invent findings. Two human gates: nothing is pushed without you asking,
and — specific to this project — a clean review/build is *necessary but not
sufficient*; an audio plugin's real "done" still wants a human actually
listening to it, which no agent here can do for you.

## Model Routing
This project's guided cost answer was **"keep cost low"** — every agent is
capped at Sonnet (no Opus, even where stakes might otherwise justify it).
Concretely: `planner` stayed Sonnet because a 3-knob delay plugin isn't
architecturally hard enough to earn Opus even before the cost cap applies.
`correctness-reviewer` stayed Sonnet under the cap too — but flagging the
tension plainly, since this is the one norm-departure worth naming: it's
also this project's single most stakes-justified reviewer (the real-time
contract is "the whole game," per the project description), the usual
`security-reviewer`-style trait this table would put on Opus. It's capped
at Sonnet under your cost answer; say so if you'd rather it ran on Opus. No
`security-reviewer` was built — no auth, secrets, or trust boundary exists
in this project.

## MCP Servers
None configured — no deploy/release target exists yet to wire one to.

## Code Style
- C++20, RAII throughout. No raw `new`/`delete` outside `prepareToPlay()`-time
  setup.
- JUCE naming conventions: `PascalCase` classes, `camelCase` methods/members.
- No `.clang-format` committed yet — default to JUCE's own house style
  (4-space indent, braces on their own line for functions/classes, `auto`
  where the type is obvious from the initializer).
- Audio-thread code (`processBlock()` and anything it calls) follows
  `.claude/rules/realtime-audio-thread.md` — this is not optional style
  guidance, it's the project's hard correctness constraint.

## Testing
No traditional unit-test framework applies — you cannot assert "does this
sound right" with `pytest`/`cargo test`. Verification here is three
different things, not one:
1. **Real-time-safety static review** — `correctness-reviewer` + the
   `warn-realtime-unsafe.cjs` hook. This is the primary safety net and the
   only one that runs every edit.
2. **Offline numerical buffer analysis** (build later, once a toolchain
   exists) — feed a synthetic buffer (impulse, sine sweep) through
   `DriftlineAudioProcessor::processBlock()` directly, outside any DAW, and
   assert numeric properties: first echo lands at the expected sample count
   for a given delay-time parameter, feedback decay matches the expected
   ratio, dry/wet blend matches the mix parameter. No harness for this
   exists yet in this repo — build it as a small standalone executable
   target if/when this project's scale warrants it.
3. **Manual listening in a DAW**, plus `pluginval` once built — the actual
   ground truth for "does it sound right" and for plugin-format compliance;
   neither is automatable by this harness today.

## Security
No auth, secrets, or network surface. `guard-secret-scan.cjs` and the
`.env`/lockfile protections in `settings.json` are generic hygiene, kept for
when this project inevitably adds a CI config or similar. Don't commit
rendered audio files or crash dumps that might contain a user's actual audio.

## Environment Variables
None needed at runtime — a plugin is loaded in-process by the host DAW, not
configured via env vars. Hook overrides only: `ALLOW_PUSH`,
`ALLOW_COMMIT_SECRETS`, `ALLOW_ADHOC_DOC`, `ALLOW_PROTECTED_EDIT`,
`ALLOW_MODEL_UPGRADE`.

## Memory
This project relies on Claude Code's built-in auto memory (on by default) —
not a custom system. Use `/memory` to browse or edit what's been saved. No
`INSTINCTS.md`/`/learn` trio was built; it would just duplicate what auto
memory already does, and this is a solo project with no need for the
optional team memory-sync mirror.

## Bug Tracking Log
`.claude/BUGS.md` — empty so far.

## Project-Specific Notes (Gotchas)
- **No C++ toolchain on this machine** (`cmake` not found via `where`) — the
  build gate fails open with a warning rather than blocking; nothing in this
  repo has actually been compiled yet. Verify on a machine with JUCE's
  toolchain before trusting that it builds.
- **Project name assumed** ("Driftline") — the description named no project;
  rename freely, it's cheap.
- **No traditional test framework** — see Testing above; this was derived
  from scratch for the domain, not filled from an existing convention.
- **`<framework>-reviewer` + `ux-designer` from the standard "has a UI" trait
  row were deferred, not built** — see Testing/agents notes; JUCE's own
  `Component`/listener-lifecycle concerns are folded into
  `correctness-reviewer` instead of a dedicated JUCE-component reviewer, and
  `ux-designer` didn't fit a fixed 3-knob single-panel GUI closely enough to
  be worth building under essentials. Ask for either if the GUI grows past a
  handful of controls.
- **Essentials tier chosen** (this project's guided setup answer) — deferred:
  a dedicated JUCE-GUI reviewer, `ux-designer`, `refactor-cleaner`,
  `silent-failure-hunter`, a separate `performance-reviewer` (folded into
  `correctness-reviewer` instead — see Model Routing). Ask for any of these
  by name once the plugin has more surface area to justify them.

## Pipeline Flow
```
idea/request
   -> planner (file-precise plan, real-time-boundary called out explicitly)
   -> plugin-engineer (DSP + GUI implementation)
   -> correctness-reviewer (C++ correctness + real-time-safety, merged)
   -> /verify (build if possible, re-scan, READY/NOT READY)
   -> you: manual listening in a DAW (the one step no agent can do)
   -> you: commit / push (never automatic)
```
