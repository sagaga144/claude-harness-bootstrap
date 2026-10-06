#!/usr/bin/env node
// PostToolUse:Edit|Write — flags Hardhat's debug-only `console.sol` left in a
// contract. This project has no traditional "shipped source" the generic
// web-app console.log warn was designed for (deploy scripts under scripts/ and
// tests legitimately use console.log, and neither ships) — the real,
// well-known Solidity-specific gotcha is `import "hardhat/console.sol"` (or a
// leftover `console.log(...)` call inside a .sol file) surviving into a
// contract that gets deployed: it inflates the compiled bytecode/gas cost and
// signals debug code shipped to mainnet. So this hook is scoped to *.sol only,
// not a literal port of the generic version.
"use strict";

function readStdin() {
  try {
    const fs = require("fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
    return;
  }

  const filePath = String(payload?.tool_input?.file_path ?? "");
  if (!/\.sol$/i.test(filePath)) {
    process.exit(0);
    return;
  }

  // Test-only mock contracts are allowed to import console.sol for debugging.
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("/test/") || normalized.includes("contracts/test/")) {
    process.exit(0);
    return;
  }

  const content = String(payload?.tool_input?.content ?? payload?.tool_input?.new_string ?? "");
  const hasConsoleImport = /import\s+["']hardhat\/console\.sol["']/.test(content);
  const hasConsoleLog = /\bconsole\.log\s*\(/.test(content);

  if (hasConsoleImport || hasConsoleLog) {
    process.stderr.write(
      `Warning: ${filePath} imports or calls hardhat/console.sol. Fine during ` +
        "development, but strip it before this contract compiles for a real deploy " +
        "— it's debug-only tooling that has no business in deployed bytecode.\n"
    );
    process.exit(2);
    return;
  }

  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0);
}
