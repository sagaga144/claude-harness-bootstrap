---
paths:
  - "backend/**"
---

# backend/ — Rust + Axum conventions

- Handlers are thin: extract, authorize, call domain logic, map to a contract response type. Return the contract type, never a database row struct.
- One error enum implementing `IntoResponse`; it produces the error body shape from `contracts/` and never leaks internals (SQL errors, stack traces) or whether an account exists.
- Auth is a layer/extractor that every non-public route goes through; public routes are listed explicitly in one place.
- Authorization is per resource: load by `(id, owner)` in one query rather than load-then-check.
- Secrets and config come from environment variables read once at startup into a typed config; fail fast if missing.
- Payment webhooks: verify the signature over the raw bytes before parsing, store the provider event id with a unique constraint for idempotency, return 2xx only after the work is durably recorded.
- Log with `tracing` and structured fields; never log request bodies on auth or billing routes.
- Tests: handler tests through the router with a test database; at least one wrong-user test per resource endpoint.
