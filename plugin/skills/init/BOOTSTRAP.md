# Claude Code Harness Bootstrap — Instructions for Claude

> **Not a template to copy or fill in.** This file, plus its companion
> `HARNESS_REFERENCE.md`, is what a user hands to a fresh Claude Code session —
> together with one paragraph describing their project idea — to get a complete,
> project-specific harness built automatically. The user should not need to know what a
> hook, an agent, or `.claude/` even is. They describe the project; you infer everything
> else, write real content (no `[bracket]` placeholders survive into the output), build
> the files, verify them, and report what you built.
>
> This works whether the project folder is empty (greenfield) or already has code
> (retrofit) — Step 1 covers both.

---

## Do this, in order

1. **Profile the project** from the description (and the repo, if one exists) — Step 1.
2. **Write a lean, project-specific `CLAUDE.md`** into the project root — Step 2 gives you
   the section-by-section spec; every section is *derived*, not templated.
3. **Build the `.claude/` harness** — hand off to `HARNESS_REFERENCE.md` Part 1,
   using the profile from Step 1 to pick real hooks/agents/commands for *this* project,
   not the web-app examples shown there (those are illustrations of the pattern, not a
   fixed list).
4. **Verify** every hook and `settings.json` per `HARNESS_REFERENCE.md` §1.8.
5. **Publish the Operator's Manual** per `HARNESS_REFERENCE.md` Part 2, once the
   harness exists.
6. Commit the result on a branch. Never push without being asked.

Don't ask the user to approve each step — do the work, then summarize what you built and
why. Only stop to ask when Step 1 hits a genuine fork (see "When to ask" below); everything
else, make the best call and note the assumption in the output CLAUDE.md's Gotchas.

---

## Step 1 — Profile the project

You need to determine, before writing anything:

| Question | How to find it |
|---|---|
| **Language / runtime** | Existing repo: read the manifest (`package.json`, `pyproject.toml`/`requirements.txt`, `go.mod`, `Cargo.toml`, `Gemfile`, `*.csproj`, `pom.xml`/`build.gradle`, `composer.json`, `mix.exs`, `pubspec.yaml`...). Empty repo: infer from the description's explicit mentions ("in Rust", "a FastAPI service") or the closest conventional default for the project type (see below). |
| **Project type** | One of: web frontend, full-stack web app, backend/API service, CLI tool, library/package, mobile app, browser extension, data/ML pipeline, game, infra/automation, other. Drives dev commands, test story, and deploy story. |
| **Has a UI?** | Web/mobile/desktop app, or a TUI → yes. Pure library/CLI/backend service → usually no. |
| **Has persistence?** | Talks to a DB, filesystem-as-store, or external state → yes. |
| **Has auth or handles secrets/user input directly?** | API keys, login, PII, payment, anything network-facing → yes. |
| **Multi-language / i18n?** | Only if the description says so or a repo already has translation files. |
| **Is it a published package/library?** | Public API surface, semver, consumers you can't see → different discipline than an app (see Code Style / Testing below). |
| **Deploy target, if any** | Named platform (Vercel, Fly, a Docker registry, an app store, PyPI, crates.io...) or "not yet" — don't invent one. |
| **Existing conventions** | If retrofitting a real repo: read 3-5 existing files to match naming, test framework, and lint config already in use rather than imposing a different one. While you're in there, check for **declared-but-unused** signals too — a dependency in the manifest that's never imported, a config file (`.eslintrc`, etc.) with no script wired to run it — these are exactly the "looks done but isn't" gaps worth a line in the output CLAUDE.md's Gotchas. |

**When to ask:** only if the *language/runtime* is genuinely undecidable — the description
names no stack, no repo exists to infer from, and the project type has no single dominant
default (e.g. "a tool that syncs my notes" could be a CLI in almost anything). Ask one
question, offer the 2-3 most likely options. For everything else — test framework choice,
folder layout, which linter — pick the ecosystem-conventional default and move on.

---

## Step 2 — Write the project's `CLAUDE.md`

Keep the *output* file lean — it loads every session, so no fat: aim for the tables and
brevity of the shape below, not an essay. Fill every section with real content derived
from the Step 1 profile. Where a subsection below shows examples across a couple of
stacks, that's to make the *pattern* concrete — derive the equivalent for whatever you
actually profiled, not literally one of the examples shown.

**The leanness test, per line**: would removing this line cause Claude to make a mistake
it otherwise wouldn't? If not, cut it. Concretely: include Bash commands Claude can't
guess, code-style rules that differ from the ecosystem's defaults, real testing
instructions, repo etiquette, and genuinely non-obvious gotchas. Exclude anything Claude
can figure out by reading the code, standard-language conventions it already knows, and
detailed API docs (link instead of inlining). A rule the project only needs *sometimes*
(not every session) belongs in a Skill, not a CLAUDE.md line — see
`HARNESS_REFERENCE.md` §1.3 for that split.

### Header + the one idea

Open with the "three modes" framing — automatic (hooks fire unasked), routed (plain
language → Intent Router), invoked (named commands/agents) — this part is genuinely
stack-agnostic, keep it near-verbatim. Then:

```
## Project Overview
**Project:** <real name from the description>
**Stack:** <real, e.g. "React 18 + TypeScript + Vite + Supabase" or "Python 3.12 + Typer + SQLite">
**Deployed on:** <real target, or "not yet — local only">
```

### Dev Commands

Pull real commands for the detected ecosystem — don't guess syntax.

| Project type | Typical commands |
|---|---|
| Node/web (npm) | `npm run dev`, `npm run build`, `npm test`, `npm run lint` |
| Python | `pytest`, `ruff check .` / `ruff format`, `python -m mypy .` if typed |
| Go | `go build ./...`, `go test ./...`, `go vet ./...` |
| Rust | `cargo build`, `cargo test`, `cargo clippy` |

If the ecosystem has a known **type-check gap** (bundlers that transpile without
type-checking — Vite/esbuild/SWC for TS; a Python project with no static typing pass at
all), call it out explicitly the way the original web example did for `tsc --noEmit` —
this is a real, recurring trap, generalize the *lesson* ("build passing ≠ types/contracts
checked") to whatever the stack's equivalent gap is, if any.

### Intent Router

Derive 8-12 rows mapping plain-language requests → the agent/command you're about to
build in Step 3. The *shape* is universal; the targets are project-specific:

| If the user says… | Invoke first |
|---|---|
| "broken" / "bug" / "crash" | your bug-hunter agent or `/fix-defect` orchestrator |
| "slow" / "optimize" | `performance-reviewer` (only if perf matters for this project) |
| "secure" / "auth" / "permissions" | `security-reviewer` (only if it has auth/secrets/user input) |
| "add a feature" / "new X" | `project-manager` or `/add-feature` orchestrator |
| "clean up" / "refactor" | `/simplify` |
| "ship" / "release" / "ready to merge" | `/verify` → review → (user pushes) |
| "how should I build this" / "plan this" | `project-manager` / `planner` agent |
| "write tests" | `/test-writer` |
| "how does X work" | Read the files, answer inline — no agent |

Drop rows for capabilities the project doesn't have (no i18n row for a single-language
CLI; no "deploy" row for a project with no deploy target yet).

### Must-Do Automatics, Agents, Commands & Skills, Learning Loop, Orchestration & Gates,
### Model Routing, MCP Servers

Same idea throughout: keep the *table shapes and discipline* from a mature harness
(reviewer >80%-confidence gate, fail-closed verdicts, two human gates around autonomous
work, Opus only for hard subtasks, INSTINCTS.md + `/learn` loop) — these are genuinely
universal — but populate every row from the Step 1 profile. `HARNESS_REFERENCE.md`
§1.4 has the trait → agent derivation table; use it here too so the two files agree. If
the profile found a real deploy *or release* target, add a Deploy/Release Health Check
subsection derived from §1.9 — don't assume the live-service flavor by default; a CLI or
library's "shipping" means a release pipeline finishing, not a URL reaching "ready."

### Code Style / Testing / Security / Environment Variables

Derive from the real ecosystem's idioms (ask "what would a senior engineer in this stack
write in the team style guide" — strict typing discipline if the language has it, the
real test-runner's conventions, the real secret-storage convention — `.env` for
Node/Python, a secrets manager reference for something deployed, etc.). If it's a
**published library**, add: semver discipline, no breaking a public export without a
major bump, changelog entry per user-facing change — this replaces most of the
UI-specific advice (a11y, CSS tokens) that only applies when there's a UI.

### Bug Tracking Log, Project-Specific Notes

Keep as-is in structure (`.claude/BUGS.md`, a Gotchas section) — genuinely universal,
just empty/growing as the project accumulates real bugs and traps. Note any assumption
you made under ambiguity here (e.g. "assumed pytest since no test framework was declared").

### Pipeline Flow

Redraw the arrow-diagram for whichever agents you actually built in Step 3 — drop stages
that don't apply (no `ux-designer` stage for a project with no UI).

---

## Step 3 — Build the harness, verify, publish

Hand off to `HARNESS_REFERENCE.md`:

- **Part 1** — the file-by-file build order (hooks → rules → agents → commands/skills →
  memory → `settings.json`), with §1.4's trait table telling you which reviewer agents
  this specific project actually needs.
- **§1.8** — verify every hook by piping a sample payload through it and confirming the
  exit code, and validate `settings.json` parses, before calling the harness done.
- **Part 2** — once the harness has run for at least one real session, publish the
  Operator's Manual artifact (real inventory counts, not estimates).

Report back to the user in plain language what got built and why — the stack you
detected, the agents/hooks you chose and the trait that justified each one, and the one
or two assumptions you made if the description left anything ambiguous.
