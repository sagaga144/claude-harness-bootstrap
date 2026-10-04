---
paths:
  - "packages/frontend/**"
---

# Frontend (React/TS) conventions

- Import every request/response shape from `contracts` (`import type { ... } from "contracts"`)
  — never redeclare or duplicate a shape locally in `packages/frontend/src`.
  A locally-redeclared type is exactly how frontend/backend drift used to
  happen on this project; the whole point of the `contracts` package is that
  it doesn't happen again.
- API calls go through `src/api/client.ts` (or a sibling file in the same
  style) — don't scatter raw `fetch()` calls through components.
- `vite build` succeeding does **not** mean the frontend type-checks — Vite
  transpiles TS with esbuild and does not type-check. Run
  `npm run typecheck -w frontend` (`tsc --noEmit`) separately; the Stop hook
  runs this for you, but don't rely on `vite build` alone during manual
  testing.
- Never render or log a raw payment method id or auth token. Never store an
  access token in `localStorage` without discussing the tradeoff — prefer an
  httpOnly cookie or in-memory storage for anything auth-related.
- New screens/components touching `auth`/`billing` data go through
  security-reviewer before shipping, same as the backend routes they call.
