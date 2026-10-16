# Examples

Real harnesses, not mockups. Each one came from a one-paragraph description: a fresh
Claude Code session in an empty folder followed the plugin's skill files (`BOOTSTRAP.md`
and `HARNESS_REFERENCE.md`) and took the recommended default for both setup questions
(keep cost low, essentials only). Each folder has `CLAUDE.md`, `.claude/` as generated,
and an `INPUT.md` with the exact description and plugin version.

Three were regenerated with **v0.8.0** (monorepo-saas, terraform-aws-infra,
desktop-notes-app) by [`scripts/generate-example.mjs`](../scripts/generate-example.mjs). They
carry the security baseline (the harness guards its own files, outside text is treated as
data, the sandbox is on where it runs) and the v0.8 additions: a version stamp
(`.claude/harness.json`), guards that record to a friction log, and a pointer to
`/harness-bootstrap:check`. The other four are from the v0.5.x test rounds. The
[attack matrix](../docs/baselines/hooks-v0.8.0.md) shows the difference: the v0.8.0
harnesses block 12 of 15 attacks with hooks (15 of 15 counting their permission rules);
the v0.5.x ones block none with hooks. [security-recon-tool](security-recon-tool/) was
generated with **v0.9.0** and shows the security-tooling profile: a written scope, a scope
guard and an evidence log (13 of 18 attacks blocked by hooks, 18 of 18 counting rules).

Each run also exposed gaps that were fixed in the next release (see
[CHANGELOG](../CHANGELOG.md)), so these show what that version produced, not the latest.

Because cost-low was chosen, every agent is capped at Sonnet or below. Every harness gets a
push guard; the v0.8.0 ones add the harness guard and the remote-exec guard, and a secret
scan or protected-files guard where the project calls for one.

| Example | Traits | What that changed |
|---|---|---|
| [monorepo-saas](monorepo-saas/) | Rust + React monorepo, shared types package, real auth and payment data | Auth and payments, so a `security-reviewer`; accounts and billing records, so a `db-guard` for queries, migrations, owner scoping and payment columns. Shared types, so a `contracts` rule, a correctness reviewer that checks backend, `contracts/` and frontend agree field by field, and a hook that reminds Claude to check the other side when an API-shaped file changes. Separate `backend-engineer` and `frontend-engineer`, with a `project-manager` to order work across packages. v0.8.0. |
| [terraform-aws-infra](terraform-aws-infra/) | Terraform on real AWS plus a Python CLI that wraps apply | Can take down production, so an `infra-reviewer` checks Terraform and the CLI for correctness and security (IAM, public exposure, encryption, destructive plans, guardrail bypasses) before any apply. A `guard-terraform` hook blocks raw state-changing Terraform commands and `-auto-approve`, so changes go through the CLI's per-environment guardrails, and a protected-files guard keeps Terraform state and the provider lock file out of reach. A `cli-engineer` for the Python CLI and a `planner` for new modules. v0.8.0. |
| [multiplayer-game-server](multiplayer-game-server/) | Go WebSocket server, plain JS client, no accounts, no database | Players can't be trusted about their own state, so a `state-integrity-reviewer`. Two deployables in two languages, so `server-engineer` and `client-engineer`. No auth or database, so no security reviewer or persistence guard. |
| [solidity-nft-marketplace](solidity-nft-marketplace/) | Solidity contracts holding funds in escrow, anyone can call them, no backend | Bugs and exploits are the same thing here, so one `contract-auditor` instead of separate correctness and security reviewers. Deploys are irreversible, so a hook blocks live deploys and `/predeploy-check` runs before them. A reentrancy note fires on `payable` edits. |
| [juce-audio-plugin](juce-audio-plugin/) | C++ JUCE plugin, real-time audio thread | The one hard rule (never allocate or lock on the audio thread) gets a `realtime-audio-thread` rule, a `warn-realtime-unsafe` hook, and a correctness reviewer that treats real-time safety as part of correctness. |
| [ml-paper-reproduction](ml-paper-reproduction/) | PyTorch research repo with notebooks, no deploy target, no app | No pass/fail tests, so the turn-end gate is a syntax and notebook-validity check. A `reproducibility-check` skill and a data-leakage/seed reminder hook. Two agents only: `ml-engineer` and `correctness-reviewer`. |
| [desktop-notes-app](desktop-notes-app/) | Tauri + Svelte, local markdown files, offline, no accounts | The vault is the user's data, so a `security-reviewer` checks the webview-to-Rust IPC boundary, vault file access, Tauri capabilities and markdown rendering. One product across two toolchains, so one `tauri-engineer` covering Svelte and Rust, a `correctness-reviewer` that also watches IPC types drifting between the two, and a `project-manager` for planning. v0.8.0. |
| [security-recon-tool](security-recon-tool/) | Go tool for authorized external assessments: subdomain enumeration, httpx, nuclei, findings reports | Pointing a scanner at an unauthorized target is the new risk, so a written `scope.json` (asked for, never invented), a `guard-scope` hook that blocks network tools aimed outside it or outside the engagement window, and an evidence log of what was run against which target. A `security-tooling-reviewer` replaces the generic security reviewer. New Go modules, MCP servers and plugins ask first. v0.9.0. |
