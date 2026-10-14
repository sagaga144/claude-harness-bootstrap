---
description: Full local gate — type-check, lint, tests, invariant scan — ends in READY or NOT-READY
---

Run the checks below in order and report each result. Do not fix anything; just report.

1. If `package.json` doesn't exist yet, say the app isn't scaffolded and stop with NOT-READY (nothing to verify).
2. `npm run check` (svelte-check / TypeScript). Passing `npm run build` is not a substitute.
3. `npm test` (Vitest), if a `test` script exists.
4. If `cargo` is installed (`cargo --version`): 
   - `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
   - `cargo test --manifest-path src-tauri/Cargo.toml`
   If `cargo` is missing, mark the Rust half **UNVERIFIED** (that is not a pass).
5. Invariant scan (Grep, report any hit with `file:line`):
   - network use: `reqwest`, `ureq`, `hyper`, `fetch(` to `http`, `XMLHttpRequest`, `https?://` in `tauri.conf.json` CSP or capabilities, an `updater` plugin
   - `unwrap()` / `expect(` in `src-tauri/src/` outside `#[cfg(test)]`
   - `console.log` / `dbg!` / `println!` in shipped source
   - `{@html` in `src/` (must be sanitized input)
   - capability entries containing `fs:`, `shell:` or `http:` wildcards
6. Final line: `READY` only if every step ran and passed and nothing is UNVERIFIED; otherwise `NOT-READY` followed by the list of failures and unverified items.
