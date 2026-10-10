---
paths:
  - "modules/**"
  - "envs/**"
  - "**/*.tf"
  - "**/*.tfvars"
  - "**/*.tftest.hcl"
---

# Terraform conventions (terraform-aws-infra)

- **Module contract**: `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`, `README.md`. No `provider` or `backend` blocks in modules. Every input has `description` + `type`. Constrain with `validation` (CIDR via `can(cidrhost(...))`, env in `["dev","staging","prod"]`).
- **Env roots** (`envs/<env>/`): `backend.tf` (S3, key `<env>/terraform.tfstate`, `use_lockfile = true`, `encrypt = true`), `providers.tf` (region, `allowed_account_ids = [<env account>]`, `default_tags`), `main.tf` composing modules, `terraform.tfvars` with non-secret values only. The three roots should differ in values, not structure.
- `allowed_account_ids` in every env's provider block is a second, Terraform-level account guard on top of the CLI's check. Keep it.
- **Naming**: resources inside a module use `this` for the single primary resource; names/identifiers derive from `"${var.name}-${var.environment}"`.
- **Address stability**: prefer `for_each` over a map with stable keys to `count`. Any rename or key change ships with a `moved {}` block in the same diff.
- **Stateful protection**: RDS and S3 primary resources carry `lifecycle { prevent_destroy = true }` in staging/prod roots. Since `prevent_destroy` can't be variable, use the module input `deletion_protection` plus RDS's own flag, and document it in the module README.
- **Secrets**: `manage_master_user_password = true` for RDS. Outputs exposing secrets/ARNs of secrets are `sensitive = true`. No literals.
- **Versions**: pin `required_version = ">= 1.10"` and the AWS provider with `~>` major in each module. `.terraform.lock.hcl` committed in env roots only and changed via `terraform init -upgrade`, never by hand.
- **Tests**: `tests/*.tftest.hcl` per module with `command = plan` and `assert` blocks on key arguments (encryption on, public access blocked, deletion protection wiring). Mock the provider (`mock_provider "aws" {}`) so tests need no credentials.
