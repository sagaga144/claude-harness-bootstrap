#!/usr/bin/env node
// SessionStart hook: print the handful of rules that must never be forgotten.
// Always exits 0 -- this hook informs, it never blocks.

const RULES = [
  "This is a research reproduction project: success = test accuracy within ~1-2 points of the paper's reported number (see config.yaml's header comment), on a fixed seed -- NOT just 'the training script exited 0'.",
  "Reproducibility means: same config.yaml (seed included) -> same result within noise, rerunnable by someone else later. Don't change config.yaml defaults casually; if you do, say what changed and why in the commit.",
  "Never tune hyperparameters against the test set -- src/data.py uses CIFAR-10's published train/test split as-is; test accuracy is a report, not a target to optimize against directly.",
  "No deploy target. 'Shipping' for this project means a training run's result is trustworthy and reproducible, not a live service.",
  "git push is blocked by a guard hook (ALLOW_PUSH=1 to override) -- never push without being asked first.",
  "Never commit real W&B API keys or .env -- use .env.example as the template.",
];

try {
  console.log("[critical-rules]\n" + RULES.map((r) => `- ${r}`).join("\n"));
} catch {
  // never fail this hook
}
process.exit(0);
