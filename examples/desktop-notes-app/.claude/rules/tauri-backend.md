---
paths:
  - "src-tauri/**/*.rs"
  - "src-tauri/capabilities/*.json"
  - "src-tauri/tauri.conf.json"
---

# Tauri backend conventions

- Every filesystem-touching command goes through `vault::resolve_in_vault`
  first. Never call `std::fs` on a path built from raw frontend input —
  this is this app's one real trust boundary (there's no auth, but the
  webview can still ask the backend to touch an arbitrary path unless the
  backend refuses).
- `src-tauri/capabilities/*.json` lists exactly what native APIs the
  webview may call. Add the narrowest permission that satisfies the
  feature in front of you (e.g. `fs:allow-read-text-file`, not a
  wildcard `fs:*`), and say in the commit/PR why a new one was added.
- Return `Result<T, String>` from `#[tauri::command]` functions and let
  the frontend surface the message — don't `.unwrap()`/`.expect()` on
  anything derived from user input or disk I/O; a panic here crashes the
  whole app, not just one request.
- Prefer `thiserror` for internal error types; convert to `String` only
  at the `#[tauri::command]` boundary.
- No network calls from this crate. The whole point of this app is
  working offline with no account/cloud sync — a new dependency that
  makes an HTTP request is a bug, not a feature, unless the user has
  explicitly asked for a sync/import feature.
