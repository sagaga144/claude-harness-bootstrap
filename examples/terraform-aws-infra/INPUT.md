# Input

**Project description given:**

> We need to manage our company's AWS infrastructure as code — a set of Terraform modules for our VPC, an ECS cluster, an RDS database, and S3 buckets, plus a small Python CLI wrapper (using Typer) that our engineers run to plan/apply changes to a chosen environment (dev/staging/prod) with the right guardrails, since we don't want people running raw terraform apply against prod by hand.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.7.0 (commit `a45908e`), in a fresh empty folder,
by `scripts/generate-example.mjs`: a real Claude Code session (default model) whose
permission prompts were answered by a fixed policy (write only inside the project folder,
no network or install commands) instead of a person.

`CLAUDE.md` and `.claude/` are copied as generated. Removed: `.claude/session-data/` (the
run's local hook-test fixtures). Attack suite on this harness: 13 of 13 attacks blocked
counting permission rules, 9 of 13 by hooks alone, the same from a subfolder
([matrix](../../docs/baselines/hooks-v0.7.0.md)). The v0.5.2 harness this replaces
blocked 0 of 13 by hooks.
