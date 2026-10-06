# Local Notes — Claude Code Harness

This harness acts on this project in three ways:
- **Automatic** — hooks fire on their own (a guard before a risky command, a check after an edit, a gate before the session stops). You never ask for these.
- **Routed** — plain language gets matched to the right agent/command by the Intent Router below. Just describe what you want.
- **Invoked** — you name a slash command (`/verify`) or a skill directly.

## Project Overview
**Project:** Local Notes
**Stack:** Tauri 2 (Rust backend) + Svelte 4 + TypeScript + Vite (frontend), plain markdown files on disk as storage, MiniSearch for in-process full-text search
**Deployed on:** not yet — local only, no deploy/release target confirmed

## Dev Commands

| Command | Does |
|---|---|
| `npm run dev` | Frontend dev server (Vite) — pair with `npm run tauri dev` for the real desktop window |
| `npm run build` | Frontend production bundle — **does not type-check** |
| `npm run check` | Real type-check (`svelte-check`) — the thing `npm run build` skips |
| `npm test` | Vitest, frontend only |
| `cargo check --manifest-path src-tauri/Cargo.toml` | Rust compile check |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust tests (currently: `vault::resolve_in_vault` path-escape cases) |

**Type-check gap:** `npm run build` (Vite/esbuild) transpiles without checking types — a clean build is not proof the types are right. `npm run check` is the real gate, and it's what `/verify` and the `Stop` hook actually run.

## Intent Router

| If you say… | Invoke first |
|---|---|
| "broken" / "bug" / "crash" | `correctness-reviewer`, then `app-engineer` to fix |
| "add a feature" / "new X" | `planner` first for anything touching both layers, then `app-engineer` |
| "how should I build this" / "plan this" | `planner` |
| "write tests" / "add test coverage" | `test-writer` |
| "ship" / "ready to merge" / "is this done" | `/verify` |
| "clean up" / "refactor" | `app-engineer`, ask for a `correctness-reviewer` pass after |
| "review this" / "check my work" | `correctness-reviewer` |
| "how does X work" | Read the files, answer inline — no agent |
| "save where I am" / "pick this back up later" | the built-in `handoff` skill |

## Must-Do Automatics

| Trigger | What fires |
|---|---|
| Session starts | `critical-rules.cjs` prints the 6 rules that must never be forgotten |
| Before any `Bash` command | `guard-bash-push.cjs` blocks `git push`/publish/release commands; `guard-secret-scan.cjs` blocks `git commit` if the staged diff looks like it contains a key/token |
| Before writing a file | `guard-adhoc-doc.cjs` blocks a stray `FINDINGS.md`/`REPORT.md` at repo root |
| Before editing/writing | `guard-protected-files.cjs` blocks direct edits to `.env*` and lockfiles |
| After editing/writing | `warn-debug-print.cjs` flags a leftover `console.log`/`dbg!`/`println!`; `note-filesystem-guard.cjs` reminds you to re-check the vault path guard when a `src-tauri/src/*.rs` file changes |
| Switching to a pricier model | `cost-guard.cjs` blocks Opus/fable — this project's cost answer is "keep cost low" |
| Session/turn ends | `build-gate.cjs` runs `npm run check` (and `cargo check` if Rust is installed) and blocks with the real error output on failure |

## Agents, Commands & Skills

**Agents** (essentials tier — built now):

| Agent | Model | Why |
|---|---|---|
| `planner` | Sonnet | File-precise plans before code; ordinary complexity, no reason to escalate |
| `app-engineer` | Sonnet | Full-stack implementer (Rust + Svelte) — one agent, not split, until either layer's context genuinely needs isolation |
| `correctness-reviewer` | Haiku | Runs `svelte-check`/`cargo check`/`clippy` and reads the output — mechanical |
| `test-writer` | Sonnet | Real test-writing judgment, Vitest + `cargo test` |

**Deferred** (essentials tier, not "full setup") — ask for these by name when you want them: `ux-designer` (new-screen UX review), a dedicated filesystem/capabilities-permissions guard, `performance-reviewer`, `refactor-cleaner`, `silent-failure-hunter`, and the `orch-add-feature` orchestrator skill. Nothing is lost — they just weren't built on day one.

**Built-in, not rebuilt:** `/code-review` (fresh-context adversarial review), `Explore`/`Plan` subagents, `/goal` for unattended gating, and the `handoff` skill for session save/resume — all ship with Claude Code already, so this harness doesn't duplicate them.

**Commands:** `/verify` — build → type-check → test → domain-guard scan → READY/NOT-READY.

## Orchestration & Gates

Two human gates: nothing gets pushed without you asking (`guard-bash-push.cjs`), and `/verify` must say READY before something is called done. `correctness-reviewer` reports only >80%-confidence findings; zero findings is a valid clean result, not a sign to invent one.

## Model Routing

Cost priority (set at bootstrap): **keep cost low.** Every agent above is capped at Sonnet or below; `correctness-reviewer` is Haiku because the check itself is mechanical. `cost-guard.cjs` enforces this at the hook level too — a switch to Opus/fable gets blocked unless you explicitly override it.

## MCP Servers

None configured. No deploy target is confirmed yet, so there's no deploy-platform MCP to wire in (see Gotchas).

## Code Style

- Rust: `Result<T, String>` at the `#[tauri::command]` boundary, `thiserror` internally; no `.unwrap()`/`.expect()` on anything derived from disk I/O or frontend input.
- TypeScript: `strict: true` — don't loosen it to unblock an error, fix the type.
- Every filesystem path that originates from the frontend goes through `vault::resolve_in_vault` before touching disk — this project's one real trust boundary, in place of the "auth" this app doesn't have.
- No network calls anywhere in `src-tauri` — the product is offline by design.

## Testing

Vitest for `src/**` (mock `invoke()`, never spin up a real Tauri process for a unit test); `cargo test` for `src-tauri/src/**`, with `vault::resolve_in_vault`'s path-escape behavior as the highest-priority coverage.

## Security

No accounts, no network, no secrets of the app's own. The real surface is the Tauri IPC boundary: `src-tauri/capabilities/*.json` must stay as narrow as the current feature set needs, and every filesystem command must refuse a path that resolves outside the vault root.

## Environment Variables

None yet (no `.env` needed — fully offline, no API keys). Hook overrides (not app config): `ALLOW_PUSH=1`, `ALLOW_COMMIT_SECRET=1`, `ALLOW_ADHOC_DOC=1`, `ALLOW_PROTECTED_EDIT=1`, `ALLOW_MODEL_ESCALATION=1`.

## Bug Tracking Log

See `.claude/BUGS.md`. Empty at bootstrap.

## Project-Specific Notes (Gotchas)

- This project relies on Claude Code's built-in auto memory for cross-session learning (on by default) — no custom memory system here. Use `/memory` to browse or edit what's been saved.
- No deploy/release target was named in the project description, so no release-health-check section was built. A desktop app still needs one eventually (code signing, installer distribution, e.g. via `tauri-action` to GitHub Releases) — ask for it once a real target is chosen; don't assume GitHub Releases is it.
- `app-engineer` is one full-stack agent covering both Rust and Svelte rather than two split-by-layer agents — revisit the split if either layer's context routinely gets crowded.
- The Tauri IPC/capabilities boundary (`src-tauri/capabilities/*.json`) is this project's closest analog to "auth" even though it has none in the traditional sense — treated as a trust boundary throughout this file rather than skipped.
- `cargo`/`rustc` were not present on the machine this harness was built on — `build-gate.cjs` and `/verify` both skip the Rust-side check gracefully (with a warning) rather than blocking every turn on a missing toolchain. Install Rust to get real coverage there.

## Pipeline Flow

```
planner → app-engineer → correctness-reviewer → test-writer → /verify → (you) commit/push
```
