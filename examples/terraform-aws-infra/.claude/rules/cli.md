---
paths:
  - "cli/**"
---

# `infra` CLI conventions

- Layout: `cli/pyproject.toml` (uv, `[project.scripts] infra = "infra_cli.main:app"`, dev deps: pytest, ruff, mypy), `cli/src/infra_cli/{main,guardrails,terraform,plan,git,aws,config,audit}.py`, `cli/tests/`.
- `main.py` holds only Typer wiring. Each command is: parse → build a context dataclass → call pure guardrail functions → call `terraform.py`. Guardrail functions raise `GuardrailError(code, message)`, and `main.py` maps them to exit codes.
- Exit codes (keep stable, document in `--help` epilog): `0` ok, `1` terraform failed, `2` usage error (Typer default), `3` guardrail refused, `4` user declined confirmation.
- Terraform invocation: always `terraform -chdir=envs/<env>`. `plan` writes `-out=.plans/<env>-<shortsha>.tfplan` and a sidecar JSON (env, commit, created_at, sha256 of plan). `apply` verifies the sidecar before passing the plan file. It never calls `apply` without a plan file.
- Destroy detection: `terraform show -json <planfile>` → any `resource_changes[].change.actions` containing `"delete"` means destructive.
- Account mapping in `config.py` (or `infra.toml`): `{dev: "...", staging: "...", prod: "..."}`. It's not secret, but a change to it is reviewed like a guardrail change.
- Use `rich`/Typer echo for output. Destroy/replace lists in red. Prompts via `typer.prompt`, and the prod confirmation requires typing `prod` exactly.
- Tests mock `subprocess.run`, STS and git, and use `CliRunner`. Fixtures include sample `terraform show -json` payloads (update-only, replace, delete).
