---
description: Review a terraform plan for an environment against the stated goal, flag every destroy/replace, and get an infra-safety verdict before a human applies.
argument-hint: <dev|staging|prod> [path to plan text/json, or paste plan output]
---

Environment and input: $ARGUMENTS

1. **Get the plan, read-only.**
   - If the user pasted plan output or gave a file path (`terraform show -json` output or `infra plan` text), use that.
   - Otherwise, if credentials are available, run `uv run --project cli infra plan --env <env>` (read-only). If it fails on credentials or the account check, **stop and say so plainly**: no plan was reviewed. Don't infer a plan from code and call it reviewed.
   - Never run `apply`, never pass `-auto-approve`, never read `*.tfstate`.
2. **Ask for or restate the goal** in one sentence (from the conversation, the branch's commits, or `.claude/specs/`).
3. **Summarize the diff**: counts of add / change / destroy / **replace**, then a table of every resource with `delete` or `["delete","create"]` / `["create","delete"]` actions: address, the attribute forcing replacement, data at risk (yes/no).
4. **Diff against the goal**: list changes the goal doesn't explain (drift, unexpected replacements, cross-env leakage, tag-only noise). Unexplained changes are findings, not noise.
5. **Delegate** to the `infra-safety-reviewer` agent (`model: "sonnet"`), passing the env, the goal, the plan summary from step 3/4 (including the replace table verbatim) and the changed file paths. It has no other context.
6. **Verdict**:
   - **SAFE TO APPLY**: goal fully explains the diff, no unaccepted destroy/replace, reviewer says SAFE. Then print the exact command for the *user* to run: `uv run --project cli infra apply --env <env> --plan-file <file>` (+ `--allow-destroy` only if the user explicitly accepted the listed destroys).
   - **NOT SAFE**: list what must change or what the user must explicitly accept.

Claude never runs the apply. After the user applies, ask them to paste the `infra apply` output and confirm the applied counts match the reviewed plan.
