# Examples

Real harnesses, not mockups. Each one came from a one-paragraph description: a fresh
Claude Code session in an empty folder followed the plugin's skill files (`BOOTSTRAP.md`
and `HARNESS_REFERENCE.md`) and took the recommended default for both setup questions
(keep cost low, essentials only). Each folder has `CLAUDE.md`, `.claude/` as generated,
and an `INPUT.md` with the exact description and plugin version.

Three were regenerated with **v0.7.0** (monorepo-saas, terraform-aws-infra,
desktop-notes-app) by [`scripts/generate-example.mjs`](../scripts/generate-example.mjs) and
carry the security baseline: the harness guards its own files, outside text is treated as
data, and the sandbox is on where it runs. The other four are from the v0.5.x test rounds.
The [attack matrix](../docs/baselines/hooks-v0.7.0.md) shows the difference: the v0.7.0
harnesses block 8 or 9 of 13 attacks with hooks (13 of 13 counting their permission
rules); the v0.5.x ones block none with hooks.

Each run also exposed gaps that were fixed in the next release (see
[CHANGELOG](../CHANGELOG.md)), so these show what that version produced, not the latest.

Because cost-low was chosen, every agent is capped at Sonnet or below. Every harness also
gets a push guard, a secret scan and a protected-files guard; the v0.7.0 ones add the
harness guard and the remote-exec guard.

| Example | Traits | What that changed |
|---|---|---|
| [monorepo-saas](monorepo-saas/) | Rust + React monorepo, shared types package, real auth and payment data | Auth and payments, so a `security-reviewer`; accounts and billing records, so a `db-guard` for migrations, owner scoping and money transactions. Shared types, so a `contracts` rule and a correctness reviewer that checks frontend/backend drift. Separate `backend-engineer` and `frontend-engineer`, and an `add-endpoint` skill that runs planner → backend → frontend → `/verify`. v0.7.0. |
| [terraform-aws-infra](terraform-aws-infra/) | Terraform on real AWS plus a Python CLI that wraps apply | Can take down production, so an `infra-safety-reviewer` gates `envs/prod/`, IAM, security groups, encryption and deletion protection. A `guard-terraform` hook blocks raw `terraform apply` outside the CLI, and `/review-plan` reads a plan before anything is applied. One engineer per half (Terraform, CLI). v0.7.0. |
| [multiplayer-game-server](multiplayer-game-server/) | Go WebSocket server, plain JS client, no accounts, no database | Players can't be trusted about their own state, so a `state-integrity-reviewer`. Two deployables in two languages, so `server-engineer` and `client-engineer`. No auth or database, so no security reviewer or persistence guard. |
| [solidity-nft-marketplace](solidity-nft-marketplace/) | Solidity contracts holding funds in escrow, anyone can call them, no backend | Bugs and exploits are the same thing here, so one `contract-auditor` instead of separate correctness and security reviewers. Deploys are irreversible, so a hook blocks live deploys and `/predeploy-check` runs before them. A reentrancy note fires on `payable` edits. |
| [juce-audio-plugin](juce-audio-plugin/) | C++ JUCE plugin, real-time audio thread | The one hard rule (never allocate or lock on the audio thread) gets a `realtime-audio-thread` rule, a `warn-realtime-unsafe` hook, and a correctness reviewer that treats real-time safety as part of correctness. |
| [ml-paper-reproduction](ml-paper-reproduction/) | PyTorch research repo with notebooks, no deploy target, no app | No pass/fail tests, so the turn-end gate is a syntax and notebook-validity check. A `reproducibility-check` skill and a data-leakage/seed reminder hook. Two agents only: `ml-engineer` and `correctness-reviewer`. |
| [desktop-notes-app](desktop-notes-app/) | Tauri + Svelte, local markdown files, offline, no accounts | The vault is the user's data, so all filesystem writes are confined to one module and a `security-reviewer` checks the webview-to-native boundary. The untrusted-content rule is extended to the contents of notes themselves. One product across two toolchains, so one `app-engineer` covering Rust and Svelte, with a path-scoped rule for each side, and a `project-manager` for planning. v0.7.0. |
