# Examples

Real harnesses, not mockups. Each one came from a one-paragraph description during the
v0.5.x test rounds: a fresh Claude Code session in an empty folder followed the plugin's
skill files (`BOOTSTRAP.md` and `HARNESS_REFERENCE.md`) and took the recommended default
for both setup questions (keep cost low, essentials only). Each folder has `CLAUDE.md`,
`.claude/` as generated, and an `INPUT.md` with the exact description and plugin version.

Each run also exposed gaps that were fixed in the next release (see
[CHANGELOG](../CHANGELOG.md)), so these show what that version produced, not the latest.

Because cost-low was chosen, every agent is capped at Sonnet or below. Every harness also
gets the same base guards: push guard, secret scan, protected-files guard and a model-switch
cost guard.

| Example | Traits | What that changed |
|---|---|---|
| [monorepo-saas](monorepo-saas/) | Rust + React monorepo, shared types package, real auth and payment data | Auth and payments, so a `security-reviewer` and a `note-sensitive-surface` hook. Shared types, so a `contracts` rule and a correctness reviewer that checks frontend/backend drift. Separate `backend-engineer` and `frontend-engineer`. No database yet, so the data-layer guard is listed as deferred, not built. |
| [terraform-aws-infra](terraform-aws-infra/) | Terraform on real AWS plus a Python CLI that wraps apply | Can take down production, so `infra-security-reviewer` gates RDS, IAM and security-group changes. A hook blocks raw `terraform apply` outside the CLI. `/plan-infra-change` wraps the built-in Plan agent. One engineer per half (Terraform, CLI). |
| [multiplayer-game-server](multiplayer-game-server/) | Go WebSocket server, plain JS client, no accounts, no database | Players can't be trusted about their own state, so a `state-integrity-reviewer`. Two deployables in two languages, so `server-engineer` and `client-engineer`. No auth or database, so no security reviewer or persistence guard. |
| [solidity-nft-marketplace](solidity-nft-marketplace/) | Solidity contracts holding funds in escrow, anyone can call them, no backend | Bugs and exploits are the same thing here, so one `contract-auditor` instead of separate correctness and security reviewers. Deploys are irreversible, so a hook blocks live deploys and `/predeploy-check` runs before them. A reentrancy note fires on `payable` edits. |
| [juce-audio-plugin](juce-audio-plugin/) | C++ JUCE plugin, real-time audio thread | The one hard rule (never allocate or lock on the audio thread) gets a `realtime-audio-thread` rule, a `warn-realtime-unsafe` hook, and a correctness reviewer that treats real-time safety as part of correctness. |
| [ml-paper-reproduction](ml-paper-reproduction/) | PyTorch research repo with notebooks, no deploy target, no app | No pass/fail tests, so the turn-end gate is a syntax and notebook-validity check. A `reproducibility-check` skill and a data-leakage/seed reminder hook. Two agents only: `ml-engineer` and `correctness-reviewer`. |
| [desktop-notes-app](desktop-notes-app/) | Tauri + Svelte, local markdown files, offline, no accounts | One product across two toolchains, so one `app-engineer` covering Rust and Svelte, with a path-scoped rule for each side. A hook reminds you to re-check the vault path guard when Rust code changes. This run deferred a dedicated filesystem-permissions guard; that was the gap fixed in v0.5.1, so later versions keep a stakes-justified reviewer even on the lean path. |
