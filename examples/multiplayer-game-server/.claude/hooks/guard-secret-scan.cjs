#!/usr/bin/env node
// PreToolUse: Bash — blocks `git commit` if the staged diff looks like it contains a
// secret (API key, private key block, token-shaped assignment). Exit 0 = allow, 2 = block.
// Fails open on any internal error, including "git not installed" / "no commits yet".

const fs = require("fs");
const { execSync } = require("child_process");

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/, // AWS access key id shape
  /\bsk-[A-Za-z0-9]{20,}\b/, // generic "sk-..." style API key
  /(api|secret|access)[_-]?key\s*[:=]\s*['"][A-Za-z0-9\/+_-]{16,}['"]/i,
  /\bghp_[A-Za-z0-9]{30,}\b/, // GitHub personal access token
];

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch (err) {
    process.exit(0);
  }

  try {
    const command = (input && input.tool_input && input.tool_input.command) || "";
    if (!/\bgit\s+commit\b/.test(command)) {
      process.exit(0);
    }

    let diff;
    try {
      // Explicit stdio control: don't let a failing/empty-repo git dump raw usage text
      // into the transcript through inherited stderr.
      diff = execSync("git diff --cached", { stdio: ["ignore", "pipe", "pipe"] }).toString();
    } catch (err) {
      // No commits yet, git missing, not a repo, nothing staged, etc. — fail open, this
      // guard's job is to catch secrets, not to diagnose git itself.
      process.exit(0);
    }

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(diff)) {
        process.stderr.write(
          "Blocked: the staged diff looks like it contains a secret/key (matched " +
            pattern +
            "). Remove it before committing, or if this is a false positive, unstage and " +
            "commit manually.\n"
        );
        process.exit(2);
      }
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
}

main();
