---
paths:
  - "crates/api/**"
  - "Cargo.toml"
---

# Backend (crates/api) conventions

- Layout: `src/routes/<resource>.rs` (router + handlers), `src/repo/<resource>.rs` (sqlx), `src/auth/` (extractors, sessions, password hashing), `src/billing/` (provider client and webhooks), `src/error.rs` (`ApiError` → `ApiErrorBody`), `src/config.rs`.
- State: one `AppState { db: PgPool, config: Arc<Config>, .. }`, passed via `State<AppState>`. No globals or `lazy_static` for runtime config.
- Handlers: `async fn(State, AuthUser, Json<ContractReq>) -> Result<Json<ContractResp>, ApiError>`. Auth is an extractor, so a handler that forgets it doesn't compile against `AuthUser`.
- Repo functions take the owner/org id as an explicit parameter; there is no "get by id" without an owner on owned tables.
- Config is read once from the environment at startup (`DATABASE_URL`, `SESSION_SECRET`, `PAYMENT_*`), failing fast with a clear message if anything is missing.
- Errors: `thiserror` in the library code, `anyhow` only in `main.rs`. Internal error text is logged with `tracing`, never returned.
- Tests: unit tests in-module; integration tests in `crates/api/tests/` against a real Postgres (`#[sqlx::test]`), covering the happy path, unauthenticated (401) and wrong-owner (404, not 403, to avoid leaking existence) cases.
- `sqlx::query!` macros need `DATABASE_URL` or the offline `.sqlx/` cache. Run `cargo sqlx prepare --workspace` after changing queries and commit `.sqlx/`.
