#!/usr/bin/env node
// SessionStart hook — prints the rules that must never be forgotten.
// Fails open: any internal error still exits 0 so a broken hook never
// blocks session start.
"use strict";

const RULES = [
  "This is a monorepo: crates/backend (Rust/Axum), packages/frontend (React/TS), packages/contracts (shared TS types).",
  "packages/contracts is the single source of truth for API request/response shapes. The frontend imports its types directly; the Rust backend has to hand-mirror them (no compiler enforces parity across the language boundary) — verify field names/types match by hand on every change to either side.",
  "This project handles real auth and real payment data. Anything touching auth, sessions, tokens, or billing/checkout/payment-method code is a security-reviewer-gated surface — do not ship it without that review.",
  "Never commit .env, secrets, or raw payment data. Never log payment_method_id, card numbers, or tokens.",
  "Never run `git push` or a publish command (`cargo publish`, `npm publish`) without the user explicitly asking.",
  "`cargo build` / `vite build` passing is not proof the contracts are honored — see CLAUDE.md's Dev Commands gotcha.",
];

try {
  console.log("Critical rules for this project:");
  for (const r of RULES) console.log(`- ${r}`);
} catch {
  // fail open — never block session start
}
process.exit(0);
