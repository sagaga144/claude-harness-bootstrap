#!/usr/bin/env node
// PostToolUse: Edit|Write — non-blocking reminder note when a change touches
// a security-reviewer-gated surface (auth/billing/payment) or the contracts
// package (drift risk). Always exits 0.
"use strict";

function readStdin() {
  try {
    const data = require("fs").readFileSync(0, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

try {
  const input = readStdin();
  const filePath = ((input && input.tool_input && input.tool_input.file_path) || "").replace(
    /\\/g,
    "/"
  );

  // Check the contracts-package path FIRST and more specifically: a file
  // like packages/contracts/src/billing.ts would also match the auth/billing
  // surface regex below (it ends in "/billing.ts"), which used to swallow
  // the more useful drift-check note for any contract file literally named
  // auth.ts/billing.ts. Path prefix is a more specific signal than filename.
  if (/^packages\/contracts\//.test(filePath)) {
    console.log(
      `Note: ${filePath} changed a shared contract type. Check crates/backend's matching ` +
        "struct and packages/frontend's callers for drift before this ships."
    );
  } else if (/\/(auth|billing)\.(rs|ts|tsx)$/.test(filePath) || /routes\/(auth|billing)/.test(filePath)) {
    console.log(
      `Note: ${filePath} is on a security-reviewer-gated surface (auth/payment data). ` +
        "Run security-reviewer before this ships."
    );
  }
  process.exit(0);
} catch {
  process.exit(0);
}
