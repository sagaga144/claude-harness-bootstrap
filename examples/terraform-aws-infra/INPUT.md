# Input

**Project description given:**

> We need to manage our company's AWS infrastructure as code — a set of Terraform modules for our VPC, an ECS cluster, an RDS database, and S3 buckets, plus a small Python CLI wrapper (using Typer) that our engineers run to plan/apply changes to a chosen environment (dev/staging/prod) with the right guardrails, since we don't want people running raw terraform apply against prod by hand.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.5.2, in a fresh empty folder. Gaps this run exposed
were fixed in v0.5.3; see the [changelog](../../CHANGELOG.md#053-2026-09-09).

`CLAUDE.md` and `.claude/` are copied as generated. Removed: `.claude/session-data/`
(local hook-test fixtures and an unpublished Operator's Manual draft) and the project code
the run scaffolded alongside the harness.
