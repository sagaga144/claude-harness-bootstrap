#!/usr/bin/env node
// PostToolUse: Edit|Write. Formats the edited file (terraform fmt / ruff format) when the
// tool is installed, and adds a review note when a risky infra setting or a guardrail
// file was touched. Never blocks. Missing tools are skipped silently.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function which(cmd) {
  const exts = process.platform === "win32" ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    for (const ext of exts) {
      const p = path.join(dir, cmd + ext.toLowerCase());
      try { if (fs.statSync(p).isFile()) return p; } catch {}
    }
  }
  return null;
}
function venvRuff(root) {
  for (const p of ["cli/.venv/Scripts/ruff.exe", "cli/.venv/bin/ruff"]) {
    const full = path.join(root, p);
    if (fs.existsSync(full)) return full;
  }
  return which("ruff");
}
const RISKY = [
  [/force_destroy\s*=\s*true/, "S3 force_destroy = true"],
  [/deletion_protection\s*=\s*false/, "RDS deletion_protection = false"],
  [/skip_final_snapshot\s*=\s*true/, "RDS skip_final_snapshot = true"],
  [/prevent_destroy\s*=\s*false/, "prevent_destroy = false"],
  [/publicly_accessible\s*=\s*true/, "publicly_accessible = true"],
  [/0\.0\.0\.0\/0|::\/0/, "open CIDR (0.0.0.0/0 or ::/0)"],
  [/"Action"\s*:\s*"\*"|actions\s*=\s*\[\s*"\*"\s*\]|"Principal"\s*:\s*"\*"/, "wildcard IAM action/principal"],
  [/block_public_(?:acls|policy)\s*=\s*false|restrict_public_buckets\s*=\s*false|ignore_public_acls\s*=\s*false/, "S3 public access block disabled"],
  [/storage_encrypted\s*=\s*false/, "RDS storage_encrypted = false"],
];

try {
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const file = String((input.tool_input && input.tool_input.file_path) || "");
  if (!file) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const rel = path.relative(root, file).split(path.sep).join("/");
  const notes = [];
  const opts = { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 };

  if (/\.(?:tf|tfvars|tftest\.hcl)$/i.test(file)) {
    const tf = which("terraform");
    if (tf) {
      const r = spawnSync(tf, ["fmt", file], opts);
      if (r.status !== 0) notes.push(`terraform fmt failed on ${rel} (syntax error?): ${(r.stderr || "").trim().slice(0, 400)}`);
    }
    let text = "";
    try { text = fs.readFileSync(file, "utf8"); } catch {}
    const hits = RISKY.filter(([re]) => re.test(text)).map(([, what]) => what);
    if (hits.length) notes.push(`${rel} contains: ${hits.join(", ")}. If this is new or not dev-only, run infra-safety-reviewer before calling it done.`);
    if (/^envs\/prod\//.test(rel)) notes.push(`${rel} is a PROD root: infra-safety-reviewer is required, and the user must approve the plan.`);
  } else if (/\.py$/i.test(file) && /^cli\//.test(rel)) {
    const ruff = venvRuff(root);
    if (ruff) spawnSync(ruff, ["format", file], opts);
    if (/guardrail|apply|confirm|account/i.test(path.basename(file))) {
      notes.push(`${rel} looks like a CLI guardrail/apply path: keep every refusal tested, and run infra-safety-reviewer.`);
    }
  }

  if (notes.length) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n") } }));
  }
  process.exit(0);
} catch {
  process.exit(0);
}
