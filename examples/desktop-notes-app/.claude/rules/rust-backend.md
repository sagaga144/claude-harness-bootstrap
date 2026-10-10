---
paths:
  - "src-tauri/**"
---

# Rust backend conventions (src-tauri/)

- Layout: `src/vault/` (only module allowed to touch the filesystem: path resolution, atomic write, trash, watcher), `src/search/` (index build/update/query), `src/commands.rs` (thin `#[tauri::command]` fns that call into those), `src/error.rs` (`AppError`).
- `AppError`: a `thiserror` enum that implements `serde::Serialize` (as `{ kind, message }`) so the frontend gets a typed error. Commands return `Result<T, AppError>`. No `unwrap`/`expect` outside tests.
- Path safety: `vault::resolve(root, rel) -> Result<PathBuf>` joins, canonicalizes (or canonicalizes the parent for not-yet-existing files), and checks `starts_with(canonical_root)`. Every command that takes a path calls it first. On Windows, also reject drive/UNC prefixes and reserved device names.
- Atomic write: write to a temp file (for example `tempfile::NamedTempFile::new_in(parent)`), `sync_all`, then `persist` over the target. Delete with `trash::delete`. Rename refuses to overwrite an existing target.
- Conflict detection: save takes the mtime/hash the editor loaded; if the file on disk differs, return `AppError::Conflict` rather than writing.
- Search: the index lives under `app_data_dir()/index/<vault-id>/`, never inside the vault. It's rebuildable and versioned (bump a schema version and rebuild on mismatch). File watcher events (`notify`, debounced) update it incrementally. Skip non-`.md`, hidden dirs (`.git`, `.obsidian`, `.trash`), and non-UTF-8 files with a logged warning.
- Heavy work (initial index, full rebuild) runs in `tauri::async_runtime::spawn_blocking` and reports progress via events. It never blocks a command.
- Shared state: `app.manage(...)` with `Mutex`/`RwLock`. Never hold a lock across `.await`.
- Tests: `cargo test` with a `tempfile::TempDir` vault. Cover path traversal (`../`, absolute, symlink escape), atomic save, conflict, trash, and index update on rename.
