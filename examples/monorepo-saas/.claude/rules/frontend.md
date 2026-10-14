---
paths:
  - "frontend/**"
---

# frontend/ — React + TypeScript conventions

- All API calls go through one typed client module whose request/response types are imported from `contracts/`. Components never call `fetch` directly.
- Never `as`-cast API data. If runtime validation of responses is added, it is derived from the contract, not written separately.
- `npm run build` does not type-check (Vite/esbuild); `npx tsc --noEmit` is the real check.
- Every request has loading, error and empty states. Error messages shown to users come from the contract's error shape, not raw server text.
- Auth tokens: prefer httpOnly cookies set by the server; never `localStorage`. Never log tokens or payment details.
- Payment: card entry only via the provider's hosted fields/elements; the client sends the provider token or session id, never an amount the server will trust.
- UI permission checks are cosmetic; the backend is the authority.
