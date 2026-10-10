---
paths:
  - "src/**"
---

# Svelte frontend conventions (src/)

- SvelteKit with `adapter-static` and `export const ssr = false` in the root `+layout.ts`. It's an SPA inside the Tauri webview, with no server and no `+page.server.ts`/`+server.ts`.
- Svelte 5 runes only in new code: `$state`, `$derived`, `$effect`, `$props`. Shared state lives in `src/lib/state/*.svelte.ts` modules exporting rune-based objects, not legacy stores.
- All IPC goes through `src/lib/api.ts`: one typed async function per Rust command, wrapping `invoke` and mapping `AppError` (`{ kind, message }`) to a typed error. Components never call `invoke` directly. Event subscriptions (`listen`) are wrapped there too and return the unlisten fn, which the caller tears down in `$effect`'s cleanup.
- Markdown rendering: one module (`src/lib/markdown/`) parses and sanitizes (DOMPurify). It's the only producer of HTML passed to `{@html}`. Wikilinks `[[Note]]`/`[[Note|alias]]` and `#tags` are parsed there with linear-time patterns.
- Editor: debounce autosave (around 500ms) and save on blur/close. Pass the loaded mtime to `saveNote` so the backend can detect conflicts, and show a conflict UI. Never silently overwrite.
- Search box: debounce (around 150ms), cancel stale results by request id, and highlight using offsets returned by the backend rather than re-matching in JS.
- Offline: assets (fonts, icons) are bundled locally in `static/`. Never import from a CDN.
- Tests: Vitest for pure logic in `src/lib/**` (`*.test.ts` beside the file). Mock `@tauri-apps/api/core` `invoke` in tests.
