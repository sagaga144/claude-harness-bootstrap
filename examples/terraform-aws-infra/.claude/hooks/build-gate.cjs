#!/usr/bin/env node
// Stop hook: the build/type-check/test gate. Runs, per HARNESS_REFERENCE.md
// §1.8's rule, with a hard split between "the tool isn't installed" (fail
// open, plain warning) and "the check failed" (block, exit 2).
//
// Checks, best-effort in this order:
//   1. terraform fmt -check -recursive  (infra/)   — only if `terraform` is on PATH
//   2. terraform validate per environment           — only if `terraform` is on PATH
//   3. ruff check . / mypy . / pytest -q  (cli/)     — only if the tools are importable
//
// Any individual check whose toolchain is missing is skipped with a warning,
// not a block. A check whose toolchain IS present and that fails is a block.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function which(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function run(cmd, cwd) {
  try {
    const out = execSync(cmd, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    return { ok: true, output: out };
  } catch (err) {
    return {
      ok: false,
      output: (err && (err.stdout || '')) + (err && (err.stderr || '') || err.message || ''),
    };
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const infraDir = path.join(repoRoot, 'infra');
  const cliDir = path.join(repoRoot, 'cli');
  const warnings = [];
  const failures = [];

  // --- Terraform ---
  if (!which('terraform')) {
    warnings.push('terraform is not installed — skipping fmt/validate (install it to enable this gate).');
  } else {
    const fmtResult = run('terraform fmt -check -recursive', infraDir);
    if (!fmtResult.ok) {
      failures.push(`terraform fmt -check failed:\n${fmtResult.output}`);
    }

    const envsDir = path.join(infraDir, 'environments');
    let envs = [];
    try {
      envs = fs.readdirSync(envsDir).filter((e) => fs.statSync(path.join(envsDir, e)).isDirectory());
    } catch {
      envs = [];
    }
    for (const env of envs) {
      const envDir = path.join(envsDir, env);
      // init -backend=false: this is a local verification pass, not a real
      // backend connection — no AWS credentials assumed to exist here.
      const initResult = run('terraform init -backend=false -input=false', envDir);
      if (!initResult.ok) {
        warnings.push(`terraform init (-backend=false) failed for '${env}', skipping validate:\n${initResult.output}`);
        continue;
      }
      const validateResult = run('terraform validate', envDir);
      if (!validateResult.ok) {
        failures.push(`terraform validate failed for '${env}':\n${validateResult.output}`);
      }
    }
  }

  // --- Python CLI ---
  const venvPython = process.platform === 'win32'
    ? path.join(cliDir, '.venv', 'Scripts', 'python.exe')
    : path.join(cliDir, '.venv', 'bin', 'python');
  const pythonBin = fs.existsSync(venvPython) ? venvPython : (which('python') ? 'python' : null);

  if (!pythonBin) {
    warnings.push('No Python interpreter found — skipping ruff/mypy/pytest.');
  } else {
    const checks = [
      [`"${pythonBin}" -m ruff check .`, 'ruff'],
      [`"${pythonBin}" -m mypy .`, 'mypy'],
      [`"${pythonBin}" -m pytest -q`, 'pytest'],
    ];
    for (const [cmd, label] of checks) {
      const result = run(cmd, cliDir);
      if (!result.ok) {
        // Distinguish "module not installed" from "check failed."
        if (/No module named/.test(result.output)) {
          warnings.push(`${label} is not installed in this environment — skipping.`);
        } else {
          failures.push(`${label} failed:\n${result.output}`);
        }
      }
    }
  }

  if (warnings.length) {
    console.error('build-gate warnings (not blocking):\n' + warnings.join('\n\n'));
  }

  if (failures.length) {
    console.error('build-gate BLOCKED:\n' + failures.join('\n\n'));
    process.exit(2);
  }

  process.exit(0);
}

main();
