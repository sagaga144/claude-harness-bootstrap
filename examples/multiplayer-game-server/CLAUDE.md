# Arena — Project Harness

This harness acts on your project in three ways: **automatic** (hooks fire on their own —
you'll never ask for these), **routed** (plain language you type gets matched to the right
agent/command by the Intent Router below — you never need to name anything), and
**invoked** (you or Claude name a specific slash command or agent directly). You almost
never need to think about which mode you're in.

## Project Overview
**Project:** Arena (working title — no name was given in the project description; rename
anytime, it's just a label)
**Stack:** Go 1.x (server, `net/http` + `gorilla/websocket` or stdlib `net/http` websocket
lib of your choice) + plain JavaScript with HTML5 Canvas (client, no framework, no build
step, no bundler)
**Deployed on:** not yet — local only

## Dev Commands
- Server: `go build ./...`, `go run ./server`, `go test ./...`, `go vet ./...`
- Client: no build step — edit `client/*.js` and reload the browser. Assumed the Go server
  also serves the static client files (`net/http.FileServer`) so there's one process to run
  in dev — confirm/adjust if you intended a separate static host.
- **Type-check gap, client side:** the client has *no* type checker, linter, or build step
  at all — not even the usual "bundler transpiles but doesn't type-check" trap, there's no
  bundler. `go build` passing only proves the server compiles; a typo'd property name or
  wrong message-shape assumption in client JS is invisible until it throws in a live
  browser console. Treat any client-side change as unverified until manually exercised.

## Intent Router
| If you say… | Invoke first |
|---|---|
| "broken" / "bug" / "crash" (server) | `go-correctness-reviewer` |
| "broken" / "bug" / "crash" (client/canvas) | `client-engineer` (no client reviewer built yet — see Gotchas) |
| "laggy" / "desync" / "rubber-banding" / "tick rate" | `go-correctness-reviewer` (covers concurrency + broadcast-loop timing, see Agents) |
| "cheating" / "flying" / "out of bounds" / "speedhack" / "someone's teleporting" | `state-integrity-reviewer` |
| "add a feature" / "new X" | `planner` |
| "how should I build this" / "plan this" | `planner` |
| "clean up" / "refactor" | `/simplify` (built-in) |
| "ship" / "release" / "ready to merge" | `/verify` → review → (you push) |
| "new message type" / "protocol change" | `planner` first, then `state-integrity-reviewer` on the result |
| "write tests" | `go-correctness-reviewer`/`server-engineer` directly for now — no dedicated `test-writer` yet, see Gotchas |
| "how does X work" | Read the files, answer inline — no agent |

## Must-Do Automatics (hooks)
| When | What fires | Effect |
|---|---|---|
| Session start | critical-rules injector | Prints the must-never-forget rules below |
| Before any `Bash` call | push guard | Blocks `git push` unless `ALLOW_PUSH=1` |
| Before `git commit` | secret scan | Blocks the commit if the staged diff looks like a key/token |
| Before writing a new file | ad-hoc-doc guard | Blocks stray `FINDINGS.md`/`REPORT.md` at repo root |
| Before editing/writing | protected-file guard | Blocks edits to `.env`, `go.sum`, lockfiles |
| After editing/writing | console.log warn | Flags stray `console.log` left in `client/**` |
| After editing/writing | state-integrity note | On any file touching incoming client messages (`server/**/hub*.go`, `server/**/conn*.go`, or anything under `server/protocol/`), reminds you the value came from an untrusted client and must be validated/clamped server-side before use |
| Before switching model mid-session | cost guard | Blocks escalating to a pricier model without an explicit ask (Step 1's "keep cost low" answer) |
| End of turn | build gate | Runs `go build ./...` (+ `go vet ./...`); blocks with the actual errors on failure. Warns (doesn't block) if `go` isn't installed at all |

## Agents, Commands & Skills
| Name | Role | Model |
|---|---|---|
| `server-engineer` | Implements the Go WebSocket server, game loop, broadcast | Sonnet |
| `client-engineer` | Implements the canvas client, WS handling, rendering | Sonnet |
| `go-correctness-reviewer` | Go failure modes: panics, unhandled errors, goroutine/channel races, broadcast-loop timing | Sonnet |
| `state-integrity-reviewer` | Server-authoritative trust boundary: never trust client-reported position/velocity/name; validate, clamp, rate-limit | Sonnet |
| `planner` | Thin wrapper around the built-in `Plan` subagent — adds this project's real-time-architecture checklist | Sonnet |
| `/verify` | build → vet → domain-guard scan → READY/NOT-READY | — |
| `/save-session`, `/resume-session` | Session handoffs | — |

Deferred for now (essentials-first, see Gotchas): `refactor-cleaner`, `silent-failure-hunter`,
`ux-designer`, `test-writer`, `/full-review`, `orch-add-feature`. Ask for any of these by
name whenever you want them — nothing below was permanently dropped.

## Orchestration & Gates
Every reviewer above reports only >80%-confidence findings with exact file:line + a
concrete failure scenario; "zero findings" is a valid clean result. Two human gates:
you review before anything ships, and you (never Claude) run the actual `git push`.
`/verify` must be READY before you're told something's ready to ship.

## Model Routing
Cheapest tier that reliably does the job (Step 1 answer: **keep cost low**, so every agent
below is capped at Sonnet — nothing here runs Opus even where the "stakes" table would
otherwise justify it). See the Agents table above for the per-agent tier and AGENT_TIERS
notes in the final report for the one-line reason behind each.

## MCP Servers
None configured — no deploy target yet (Step 1 profile: "not yet"). Add a deploy-platform
MCP once you pick one; `github` is worth adding once this has a remote.

## Code Style
- **Go:** `gofmt`-clean, wrap errors with `%w`, never `panic` inside a connection handler
  (a bad client message must not take down the process or other players' connections),
  guard every piece of state shared across goroutines (the player map, the broadcast
  ticker) with a mutex or a single-owner channel — don't let two goroutines touch it raw.
- **Client JS:** plain ES modules, no globals beyond one small app-state object, render
  loop via `requestAnimationFrame`, no dependencies (the brief is explicit: "no framework").

## Testing
- Server: `go test ./...`, table-driven per Go convention. No test framework declared for
  the client (none exists for framework-less vanilla JS by default) — client changes get
  manual browser verification until/unless you ask for a client test setup.

## Security
No accounts, no login — but there is a real trust boundary: **every value a client sends
(position, velocity, input, chosen name) is untrusted input**, even though there's no
traditional "auth" concept. The server is the only source of truth for game state; a client
message is a request to move, never a statement of where it now is. Cap/sanitize the
player-name string (length, strip control characters) before it's ever broadcast to other
clients' canvases.

## Environment Variables
None required yet (no DB, no API keys). When a deploy target is picked, expect at least a
`PORT` for the Go server and an allowed-origin check on the WebSocket upgrade.

## Bug Tracking Log
See `.claude/BUGS.md` — empty until the project accumulates real bugs.

## Project-Specific Notes (Gotchas)
- No project name was in the description — "Arena" is a placeholder working title, not a
  real decision.
- Assumed the Go server serves the static client files itself (one dev process) since the
  description didn't say how the client is hosted — revisit if you intended a separate
  static host or CDN.
- Assumed no test framework for the client (vanilla JS, nothing declared).
- Relies on Claude Code's built-in auto memory for cross-session learning — no custom
  memory system was built. Use `/memory` to browse or edit what it's saved.
- Essentials-tier build (Step 1 answer #2): deferred `refactor-cleaner`,
  `silent-failure-hunter`, `ux-designer`, `test-writer`, `/full-review`, and
  `orch-add-feature`. Say "build the full setup" any time to add them.

## Pipeline Flow
`server-engineer` / `client-engineer` (build) → `go-correctness-reviewer` +
`state-integrity-reviewer` (review, in parallel) → `/verify` (gate) → you review → you push.
