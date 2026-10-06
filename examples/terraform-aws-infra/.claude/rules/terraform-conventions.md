---
paths:
  - "infra/**/*.tf"
  - "infra/**/*.tfvars"
---

# Terraform conventions (this project)

- Module layout: `infra/modules/<name>/{main.tf,variables.tf,outputs.tf}` — three
  files, always, in that split. Don't add a fourth file to a module unless it's
  genuinely large enough to need one (none currently are).
- Every module resource block gets tags via `merge(var.tags, { Name = ... })` —
  don't hardcode a `Name` tag without merging the caller's tags in, environment
  filtering in the AWS console depends on this.
- Environment root configs (`infra/environments/<env>/main.tf`) only ever
  reference modules by relative path (`../../modules/<name>`) and only ever set
  `local.env`/`local.name`/`local.tags` once at the top — don't repeat the
  environment name as a literal string elsewhere in the file.
- `provider "aws" {}` blocks live only in each environment root, never inside a
  module — a module that hardcodes its own provider block can't be reused
  across environments/regions.
- Naming pattern for anything globally unique (S3 bucket names, in particular):
  `acme-<env>-<purpose>`. Two environments producing the same literal name is a
  real apply-time failure `terraform validate` won't catch — double check this
  by hand when adding a bucket.
- `deletion_protection`, `skip_final_snapshot`, `force_destroy`, and any
  security-group ingress CIDR are exactly the settings `infra-security-reviewer`
  checks first — don't relax one of these as an incidental part of an unrelated
  change without calling it out explicitly.
- Run `terraform fmt -recursive` before every commit that touches `infra/`; CI
  has no formatter auto-fix, `build-gate.cjs`'s `fmt -check` will block on drift.
