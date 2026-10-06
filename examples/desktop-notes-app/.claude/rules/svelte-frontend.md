---
paths:
  - "src/**/*.svelte"
  - "src/**/*.ts"
---

# Svelte + TypeScript frontend conventions

- Talk to the backend only through `src/lib/notes.ts` (or a sibling
  `lib/*.ts` wrapper) — don't call `invoke()` directly from a `.svelte`
  component. Keeps every Tauri command call typed and in one place to
  audit against `src-tauri/capabilities/*.json`.
- This is a local-first, single-window desktop app: no router, no
  server-side rendering, no `fetch()` to anything but `tauri://` /
  `asset://` internals. If a component needs remote data, that's a sign
  the feature request needs a product conversation first, not just code.
- Strict TypeScript (`strict: true` is already on in `tsconfig.json`) —
  don't loosen it to unblock a type error, fix the type.
- `vite build` does not type-check — `svelte-check` is the only thing
  that catches a real type error here (the equivalent of the classic
  `tsc --noEmit` gap other Vite/esbuild/SWC projects have). `npm run
  build` succeeding is not proof the types are right.
- Full-text search (`src/lib/search.ts`, MiniSearch) runs in the
  renderer, in memory, over whatever the vault loader hands it — no
  external search service, ever.
