#!/usr/bin/env node
// SessionStart hook — prints the rules that must never be forgotten on this
// project. Fails open: if anything here throws, print nothing rather than
// block the session from starting.
"use strict";

const RULES = [
  "This is an escrow-backed marketplace moving real ETH once deployed — a bug here " +
    "can mean an irreversible, unrecoverable loss of real money. There is no rollback.",
  "Never deploy to `sepolia` or any live network without: full test suite green, " +
    "the contract-auditor agent's sign-off, and an explicit human go-ahead. `npm run " +
    "deploy:local` (the ephemeral Hardhat network) is always fine.",
  "Every function that moves ETH or an NFT follows checks-effects-interactions: " +
    "state changes before external calls, `nonReentrant` on anything payable.",
  "Proceeds are pulled (withdrawProceeds), never pushed on sale — never change buyNFT " +
    "to send ETH directly to the seller.",
  "Never edit `.env`, commit a private key, or paste one into a file the session can " +
    "read — the guard-bash-secrets hook blocks commits, but don't rely on it alone.",
  "Once deployed to any live network, the contract is immutable — there is no patch " +
    "release. Treat pre-deploy review as the only chance to catch a bug.",
  "Relies on Claude Code's built-in auto memory (`/memory`) — no custom INSTINCTS.md " +
    "system here.",
];

try {
  const lines = ["Project rules (NFTMarket):", ...RULES.map((r) => `- ${r}`)];
  process.stdout.write(lines.join("\n") + "\n");
} catch {
  // Fail open — never block session start over a formatting bug.
}
process.exit(0);
