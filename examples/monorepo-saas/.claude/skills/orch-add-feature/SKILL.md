---
name: orch-add-feature
description: Orchestrates adding a feature that spans the API surface (contracts + backend + frontend) — use when the user asks to add or change a feature that touches more than one package.
---

# Add a feature across the monorepo

This project's core risk is contracts/backend/frontend drift, so this
orchestrator enforces a fixed order rather than letting packages be edited
in parallel.

1. **Plan** — invoke the `planner` agent (pass `model: "sonnet"` explicitly
   on the Agent-tool call; don't rely on the agent frontmatter alone). Give
   it the feature request verbatim. It returns a file-precise plan naming
   exact `contracts/`, `crates/backend/`, and `packages/frontend/` files.
2. **Contracts first** — if the plan adds/changes any type, edit
   `packages/contracts/src/*.ts` before touching backend or frontend code.
3. **Backend** — invoke `backend-engineer` (`model: "sonnet"`) with the
   plan's backend steps and the exact contract types from step 2 pasted into
   the prompt (a subagent's context starts fresh — it never sees this
   orchestration's history unless you paste it in).
4. **Frontend** — invoke `frontend-engineer` (`model: "sonnet"`) with the
   plan's frontend steps and the same contract types pasted in.
5. **Review** — invoke `correctness-reviewer` (`model: "sonnet"`). If the
   plan flagged an auth/billing surface, also invoke `security-reviewer`
   (`model: "sonnet"`). Do not skip security-reviewer because
   correctness-reviewer came back clean — they check different things.
6. **Report** — summarize what changed per package, the review verdicts, and
   run `/verify` before telling the user it's ready to ship. The user pushes,
   not you.
