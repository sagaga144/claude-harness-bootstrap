---
description: Full pre-merge gate for Plainvault. Type-check, lint, test both halves, scan the invariants, then report READY or NOT-READY.
---

Run every step, even if an earlier one fails, and report real output. Never claim a step passed that you didn't run.

1. **Frontend types**: `npm run check` (svelte-check; Vite's build never type-checks).
2. **Frontend tests**: `npm test` (Vitest, single run).
3. **Rust format and lint**: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` then `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`.
4. **Rust tests**: `cargo test --manifest-path src-tauri/Cargo.toml`.
5. **Invariant scan** (Grep, report each hit with file:line):
   - filesystem mutation (`fs::write|remove_file|remove_dir|rename|File::create|OpenOptions`) in `src-tauri/src/` outside `src-tauri/src/vault/`
   - `.unwrap()`/`.expect(` in `src-tauri/src/` outside `#[cfg(test)]` modules
   - remote URLs, `fetch(`, `WebSocket` in `src/`; network crates (`reqwest|hyper|ureq`) in `src-tauri/Cargo.toml`
   - `{@html` in `src/` not fed by the sanitizer
   - `console.log` in `src/`, `println!|dbg!` in `src-tauri/src/`
   - CSP in `src-tauri/tauri.conf.json` still `default-src 'self'` with no remote origins
   - every `invoke('x'` in `src/` lives in `src/lib/api.ts`, and every command there is registered in `generate_handler!`
6. **Reviewers**: if `src-tauri/`, `src-tauri/capabilities/`, `tauri.conf.json`, the markdown renderer or any file operation changed (check `git diff --name-only main...HEAD` plus uncommitted changes), invoke the `security-reviewer` agent with that file list. For any non-trivial change, invoke the `correctness-reviewer` agent with the same list. Pass the paths explicitly, since agents don't see this conversation.

A missing toolchain (no `cargo`, no `node_modules`) or a project that isn't scaffolded yet is **NOT-READY**, not a pass. Say exactly what's missing and how to install it.

Report a table: step | result | key output. Then one line: **READY** (everything passed, reviewers PASS) or **NOT-READY** (list the blockers). Never push. Pushing is the user's call.
