---
description: Build, type-check, test, and scan for domain-guard issues before calling something ready to ship.
---

Run these checks, in order, and stop at the first hard failure:

1. **Frontend type-check**: `npm run check` (svelte-check). This is the
   real type-check — `npm run build` alone does not catch type errors
   (Vite/esbuild transpile without checking).
2. **Backend check**: `cargo check --manifest-path src-tauri/Cargo.toml`.
   If `cargo` isn't on PATH, say so plainly and skip rather than
   pretending it passed.
3. **Tests**: `npm test` (Vitest) for the frontend; `cargo test
   --manifest-path src-tauri/Cargo.toml` for the backend (currently
   covers `vault::resolve_in_vault`'s path-escape cases — add to these,
   don't replace them).
4. **Domain-guard scan**: grep the diff for any new `std::fs` call in
   `src-tauri/src/**` that doesn't go through `resolve_in_vault`, and any
   new/edited `src-tauri/capabilities/*.json` permission — call both out
   by file:line even if they look intentional, so the user can confirm.
5. **Frontend build**: `npm run build` — confirms the bundle itself
   isn't broken, now that the type-check already ran separately.

Report **READY** or **NOT READY**, with every failing command's actual
output (not a paraphrase) and an exact file:line for each domain-guard
finding. "Ready" never means "the build didn't error" on its own — it
means all four checks above passed.
