---
paths:
  - "cli/**/*.py"
---

# Python CLI conventions (this project)

- `guardrails.py` stays free of `subprocess`, `typer`, and any AWS/network
  dependency — it's pure decision logic on purpose, so it can be unit-tested
  in milliseconds without a real `terraform` binary or AWS credentials. If a
  new check needs to shell out or touch the filesystem, put the shelling-out
  in `main.py` and keep only the yes/no decision in `guardrails.py`.
- `config.py` is the single source of truth for which environments exist and
  how much guardrail each gets (`ENVIRONMENTS` dict). Never branch on
  `env == "prod"` as a string literal elsewhere — read `environment.is_production`
  / `environment.requires_second_approval` instead, so a future environment
  (e.g. a second prod region) inherits the right guardrails automatically.
- Every `@app.command()` in `main.py` stays thin: parse args, call
  `config`/`guardrails`, `subprocess.run` the actual terraform invocation,
  report the result. No guardrail logic inline in a command function.
- Type hints are required on every function signature — `mypy --strict` is
  configured in `pyproject.toml` and is not optional for new code.
- Any new guardrail function gets a test in `cli/tests/test_guardrails.py`
  covering both the blocked and allowed path, plus the env-var override if it
  has one — see the existing tests for the pattern.
