# CLAUDE.md

This harness acts in three ways: **automatic** (hooks fire unasked — pushes
guarded, secrets scanned, debug prints flagged), **routed** (plain language
maps to the right agent/command via the Intent Router below), and
**invoked** (you name a slash command or skill directly). You almost never
need the last one — talk plainly and the router handles it.

## Project Overview
**Project:** SaaS Monorepo
**Stack:** Rust (Axum) backend + TypeScript/React frontend + a shared `contracts` TS package, in one npm/Cargo monorepo
**Deployed on:** not yet — local only

## Repo layout (monorepo)

```
crates/backend/          Rust/Axum REST API (Cargo workspace)
packages/contracts/      Shared TS request/response types — source of truth for the API shape
packages/frontend/       React/TS client (Vite), consumes packages/contracts directly
```

Rust can't import TypeScript, so `crates/backend`'s structs are a **hand
mirror** of `packages/contracts` — nothing compiles that boundary for you.
See `.claude/rules/contracts.md`, `.claude/rules/backend-rust.md`.

## Dev Commands

| Package | Build | Test/typecheck | Lint |
|---|---|---|---|
| `crates/backend` (Rust) | `cargo build` | `cargo test` | `cargo clippy --all-targets -- -D warnings` |
| `packages/contracts` (TS) | — (types only) | `npm run typecheck -w contracts` | — |
| `packages/frontend` (TS/React) | `npm run build -w frontend` | `npm run typecheck -w frontend`, `npm test -w frontend` | `npm run lint -w frontend` |
| whole repo | `npm run build` (workspaces) | `npm run typecheck` (workspaces) | `npm run lint` (workspaces) |

**Type-check gap, and it's the one that matters most here:** `vite build`
transpiles TS without type-checking it — run `tsc --noEmit` separately. But
the *bigger* gap is cross-language: `cargo build` and `tsc --noEmit` passing
on both sides is **not** proof the contracts are honored — nothing checks
that a Rust struct's fields still match `packages/contracts`'s TS types.
That's `correctness-reviewer`'s job, not a compiler's, until this project
adds real codegen (see `.claude/rules/contracts.md`).

**Toolchain note:** if `cargo`/`rustc` aren't installed on this machine, the
backend checks above are skipped with a warning, not silently treated as
passing — see the Stop hook.

## Intent Router

| If you say… | Invoke first |
|---|---|
| "broken" / "bug" / "crash" (backend) | `backend-engineer` |
| "broken" / "bug" / "crash" (frontend) | `frontend-engineer` |
| "secure" / "auth" / "permissions" / "payment" / "billing" | `security-reviewer` |
| "add a feature" / "new X" spanning packages | `orch-add-feature` skill |
| "clean up" / "refactor" | built-in `/simplify` |
| "ship" / "release" / "ready to merge" | `/verify` → reviewers → (you push) |
| "how should I build this" / "plan this" | `planner` |
| "review this" / "code review" | built-in `/code-review` skill |
| "the types don't match" / "field renamed" / contract drift | `correctness-reviewer` (contract-parity section) |
| "how does X work" | Read the files, answer inline — no agent |

## Must-Do Automatics

- **Push/publish guard**: `git push`, `cargo publish`, `npm publish` blocked unless `ALLOW_PUSH=1`.
- **Secret scan**: `git commit` blocked if the staged diff looks like it contains a key/token/Stripe secret (`ALLOW_SECRET_COMMIT=1` to override).
- **Protected-file guard**: edits to `.env*`, `Cargo.lock`, `package-lock.json` blocked (`ALLOW_PROTECTED_EDIT=1` to override).
- **Ad-hoc doc guard**: stray `FINDINGS.md`/`REPORT.md` at repo root blocked.
- **Debug-print warning**: `console.log`/`dbg!()` left in an edit gets flagged, not blocked.
- **Sensitive-surface note**: editing `auth`/`billing` or `packages/contracts` prints a reminder to run the matching review.
- **Cost guard**: mid-session model upgrades blocked (this project's cost answer was "keep cost low" — see below).
- **Build gate** (session Stop): `cargo check` + `tsc --noEmit` across the TS packages; blocks only on a real failure, warns (doesn't block) if a toolchain simply isn't installed.

## Agents, Commands & Skills

| Name | Role | Model |
|---|---|---|
| `planner` | file-precise plan before coding | Sonnet |
| `backend-engineer` | implements `crates/backend` | Sonnet |
| `frontend-engineer` | implements `packages/frontend` | Sonnet |
| `correctness-reviewer` | Rust + TS correctness, **and** contract-parity drift across all three packages | Sonnet |
| `security-reviewer` | auth/session/payment review — gates `auth`/`billing` surfaces | Sonnet |
| `/verify` | build → typecheck → contract-parity → domain-guard → READY/NOT-READY | — |
| `orch-add-feature` skill | orchestrates a feature across contracts→backend→frontend in that order | — |
| `/save-session`, `/resume-session` | session handoffs via the `handoff` skill | — |

Built-in tools used as-is, not rebuilt: `/code-review` (fresh-context review), `/simplify`, `planner`/`Explore` where a one-off plan or search doesn't need a persistent named agent.

## Orchestration & Gates

Two human gates: a reviewer must clear >80%-confidence findings before
`/verify` reports READY, and only the user runs `git push` (the hook blocks
Claude from doing it). `security-reviewer` gates `auth`/`billing` specifically
— `orch-add-feature` will not skip it just because `correctness-reviewer`
came back clean.

## Model Routing & Cost

Your guided cost answer was **"keep cost low"** — every agent above is
capped at Sonet-or-below (no Opus, even for `security-reviewer`, despite
real auth + real payment data being about as strong a case as this harness's
rules make for Opus — see the report for that tradeoff spelled out). A
`PreModelSwitch` hook enforces this mid-session too. Ask to change this
anytime — it's a per-session setting, not permanent.

## Memory

This project relies on Claude Code's built-in auto memory (on by default) —
no custom memory system was built. Corrections and preferences you give get
remembered automatically across sessions; `/memory` browses or edits what's
saved. (No team memory-sync mirror was built — this is a solo-machine setup
for now; ask if you want learnings synced across machines later.)

## Code Style

- **Rust**: `cargo clippy -- -D warnings` clean; no `unwrap()`/`expect()` on
  request-derived data; `#[serde(rename_all = "camelCase")]` on every
  request/response struct so the wire format matches `contracts` without
  relying on every field being individually renamed.
- **TypeScript**: `strict: true` (already set in both `tsconfig.json`s);
  import types from `contracts`, never redeclare.
- **contracts package**: `camelCase` field names, one file per API area,
  no business logic — types (and eventually validation) only.

## Security

Real auth + real payment data. `.env*` is git-ignored and edit-guarded.
Never log tokens, passwords, or payment method ids. Every `auth`/`billing`
change goes through `security-reviewer` before it ships — this is the one
review in this harness where a miss has real financial/legal consequences,
not just a bug.

## Environment Variables

`.env` (git-ignored) for local dev: `DATABASE_URL`, `VITE_API_BASE_URL`
(frontend), and whatever the eventual auth/payment provider needs (e.g. a
Stripe secret key) — none of these exist yet, this is a fresh scaffold.

## Bug Tracking Log

See `.claude/BUGS.md` — empty for now.

## Project-Specific Notes (Gotchas)

- Assumed **npm workspaces** (not pnpm/yarn) since only Node/npm were
  confirmed on this machine — cheap to switch later.
- Assumed the `contracts` package is **internal-only** (not published to a
  registry) — no semver discipline applied to it yet.
- `cargo`/`rustc` are **not installed** on this machine as of this bootstrap
  — the backend build/typecheck steps above will warn-and-skip, not silently
  pass, until the Rust toolchain is installed.
- No deploy target named yet — no release/deploy health check section built;
  add one (`.claude/rules` or here) once a real target exists.
- Deferred under "essentials only" (your second guided answer): `refactor-cleaner`,
  `silent-failure-hunter`, a dedicated `data-layer-guard` for the eventual
  DB, and a `ux-designer` for new screens. Ask for any of these anytime —
  nothing is lost, just sequenced.

## Pipeline Flow

```
planner → (contracts edit) → backend-engineer ─┐
                                                  ├→ correctness-reviewer → security-reviewer (if auth/billing) → /verify → you push
                            → frontend-engineer ─┘
```
