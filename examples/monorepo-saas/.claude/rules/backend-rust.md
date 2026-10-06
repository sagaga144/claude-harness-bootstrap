---
paths:
  - "crates/backend/**"
---

# Backend (Rust/Axum) conventions

- Handlers live in `crates/backend/src/routes/<area>.rs`, one file per API
  area (`auth.rs`, `billing.rs`, ...), registered in `routes/mod.rs` and
  merged in `main.rs`.
- Every request/response struct here is a hand-mirror of a type in
  `packages/contracts/src/<area>.ts`. When you add or change a field: update
  both sides in the same change, and check field *names* carefully — Rust
  convention is `snake_case`, the contracts/TS side is `camelCase`, and axum's
  `Json` extractor will silently produce `null`/default values (or a 422) on
  a name mismatch rather than a compile error. This is the exact drift the
  `contracts` package exists to prevent, and nothing currently compiles this
  boundary for you.
- Never `unwrap()`/`expect()` on request-derived data (headers, JSON bodies,
  path/query params) — return a proper `4xx` via axum's `IntoResponse` instead
  of panicking the handler.
- `auth.rs` and `billing.rs` are security-reviewer-gated: real auth (session
  issuance, password handling) and real payment data (checkout, payment
  method references) live there. Never log a raw payment method id, card
  number, or auth token — hash/redact before any `tracing::` call.
- Run `cargo clippy --workspace --all-targets -- -D warnings` before
  considering backend work done; `cargo check` alone (what the Stop hook
  runs) is a lower bar than clippy's lints.
