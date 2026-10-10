---
paths:
  - "crates/contracts/**"
  - "packages/contracts/**"
---

# Contracts conventions

- `crates/contracts` has no business logic and no dependencies beyond `serde`, `ts-rs` (and `uuid`/`chrono`/`time` with their ts-rs features). Axum, sqlx and anything else from the server stay out, so the crate stays a pure shape definition.
- Every type: `#[derive(Debug, Clone, Serialize, Deserialize, TS)]`, `#[serde(rename_all = "camelCase")]`, `#[ts(export)]`. Enums: `#[serde(tag = "type", rename_all = "camelCase")]` for data-carrying variants, plain `rename_all` for unit variants.
- Optional fields: `Option<T>` plus `#[serde(default, skip_serializing_if = "Option::is_none")]` plus `#[ts(optional)]`, so the TS reads `field?: T`. Use plain `Option<T>` (TS `T | null`) only when `null` is meaningful.
- Ids are `Uuid` (TS `string`). Money is `i64` minor units, `#[ts(type = "number")]`, with a `currency: String` beside it. Timestamps are RFC 3339 strings.
- One error envelope for every route: `ApiErrorBody { code: ErrorCode, message: String }`. `ErrorCode` is an enum, so the frontend can switch on it exhaustively.
- Naming: `<Action><Resource>Request` / `<Resource>Response`, e.g. `CreateInviteRequest`, `InviteResponse`.
- Renaming or retyping a field is a breaking API change: update the handler and every frontend usage in the same change.
- `packages/contracts/src/generated/` is regenerated output (`npm run contracts:gen`) and is committed so the frontend builds without cargo. `packages/contracts/src/index.ts` only re-exports it.
