#!/usr/bin/env node
// PreToolUse:Bash — blocks `git commit` if the staged diff contains something that
// looks like a private key, mnemonic, or API secret. Override: ALLOW_COMMIT_SECRET=1.
// Fails open on any internal error, including "git diff itself failed" (e.g. no
// commits yet) — a broken check must never silently become an unblockable commit
// gate, and must never mistake "git has nothing to diff yet" for "check failed".
"use strict";

const { execSync } = require("child_process");

function readStdin() {
  try {
    const fs = require("fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const SECRET_PATTERNS = [
  // Raw EVM private key (0x + 64 hex chars)
  /\b0x[a-fA-F0-9]{64}\b/,
  // A 12-24 word BIP-39 style mnemonic block is hard to regex reliably; instead
  // flag an actual .env-style assignment (line-anchored against the ADDED-LINES
  // text built below, which has the diff's leading "+" already stripped — so
  // this doesn't also match a source-code reference like
  // `const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY`, which
  // names the variable but assigns no literal secret).
  // [ \t]* (not \s*) around the "=" deliberately — \s* would also match a
  // newline and let the value half match content from the *next* added line
  // (e.g. "DEPLOYER_PRIVATE_KEY=" followed by a blank value, then the next
  // line "REPORT_GAS=false" gets swallowed in as if it were this key's value).
  /^[ \t]*["']?DEPLOYER_PRIVATE_KEY["']?[ \t]*=[ \t]*(?!process\.env)[ \t]*\S+/m,
  /^[ \t]*["']?MNEMONIC["']?[ \t]*=[ \t]*(?!process\.env)[ \t]*\S+/m,
  // Common RPC/API key provider secrets
  /\b(alchemy|infura)[a-zA-Z0-9_-]{0,20}(api)?key[a-zA-Z0-9_-]*\s*[:=]\s*['"]?[a-zA-Z0-9]{16,}/i,
  // Generic AWS-style access key id
  /\bAKIA[0-9A-Z]{16}\b/,
];

// A unified diff prefixes every changed line with "+" or "-" (and file
// headers with "+++"/"---"), which breaks any line-anchored (^) pattern above
// — "+DEPLOYER_PRIVATE_KEY=..." doesn't start with the variable name, "+"
// does. Scan only genuinely ADDED lines, with that prefix stripped, so the
// line-anchored patterns see the same text a plain .env file would contain.
function addedLinesOnly(diff) {
  return diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
  }

  const command = String(payload?.tool_input?.command ?? "");
  const isCommit = /\bgit\s+commit\b/.test(command);
  if (!isCommit || process.env.ALLOW_COMMIT_SECRET) {
    process.exit(0);
    return;
  }

  let diff;
  try {
    // Explicit stdio control: don't let a failing git process's stderr print
    // itself into the transcript — capture it and decide in code instead.
    diff = execSync("git diff --cached", {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
  } catch (err) {
    // git failing here (no commits yet, not a repo, etc.) is "can't check", not
    // "check failed" — fail open, don't block the commit over an unrelated git
    // state issue.
    process.exit(0);
    return;
  }

  const added = addedLinesOnly(diff);
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(added)) {
      process.stderr.write(
        "Blocked: the staged diff looks like it contains a private key or API secret " +
          `(matched ${pattern}). Remove it before committing, or set ALLOW_COMMIT_SECRET=1 ` +
          "if this is a deliberate false positive.\n"
      );
      process.exit(2);
      return;
    }
  }

  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0); // fail open
}
