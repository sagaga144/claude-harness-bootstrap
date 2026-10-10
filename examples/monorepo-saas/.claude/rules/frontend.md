---
paths:
  - "packages/web/**"
---

# Frontend (packages/web) conventions

- TypeScript `strict: true`, plus `noUncheckedIndexedAccess`. No `any`, no `@ts-ignore`, and no `as` on API data.
- API access: `src/api/client.ts` holds one `request<TReq, TRes>()` wrapper (base URL from `VITE_API_URL`, `credentials: "include"`, which parses `ApiErrorBody` into a typed error). Each resource gets `src/api/<resource>.ts` with typed functions using `@ledgerline/contracts` types only.
- Server state: TanStack Query (`useQuery`/`useMutation`) with keys from `src/api/keys.ts`. No hand-rolled fetch-in-`useEffect`.
- Layout: `src/routes/` (pages), `src/components/` (shared UI), `src/features/<feature>/` (feature-local components and hooks).
- Every `VITE_*` env var ships to the browser. Never put a secret in one; the payment provider's *publishable* key is the only payment value allowed here.
- Billing UI uses the provider's hosted checkout/elements; our code never sees card fields.
- Tests: Vitest + Testing Library, `*.test.tsx` beside the component. Mock at the `src/api/` boundary, not `fetch`.
