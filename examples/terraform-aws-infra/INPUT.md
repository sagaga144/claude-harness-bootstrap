# Input

**Project description given:**

> We need to manage our company's AWS infrastructure as code — a set of Terraform modules for our VPC, an ECS cluster, an RDS database, and S3 buckets, plus a small Python CLI wrapper (using Typer) that our engineers run to plan/apply changes to a chosen environment (dev/staging/prod) with the right guardrails, since we don't want people running raw terraform apply against prod by hand.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.8.0 (commit `1b470d6`), in a fresh empty folder,
by `scripts/generate-example.mjs` on Sonnet: a real Claude Code session (33 turns, about
$0.70) whose permission prompts were answered by a fixed policy (reads inside this
repository, writes only inside the project folder, no network or install commands) instead
of a person.

`CLAUDE.md` and `.claude/` are copied as generated, with no edits. Left out:
`.claude/session-data/` (the friction log and test payloads from the session's own
verification, which the harness's `.gitignore` keeps out of git).

It carries the v0.8 additions: a version stamp (`.claude/harness.json`), guards that record
to the friction log through `.claude/hooks/lib/friction.cjs`, and a line in `CLAUDE.md`
pointing to `/harness-bootstrap:check`. Attack suite on this harness: 12 of 15 attacks
blocked by hooks alone, the same from a subfolder, 15 of 15 counting permission rules, no
harmless command blocked, every friction-log line clean
([matrix](../../docs/baselines/hooks-v0.8.0.md)).
