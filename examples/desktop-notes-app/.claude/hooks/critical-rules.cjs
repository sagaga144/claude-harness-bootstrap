#!/usr/bin/env node
// SessionStart hook: prints the handful of rules that must never be
// forgotten. Pure stdout, no tool access needed, must never block a
// session from starting — always exits 0.

const RULES = `Local Notes — critical rules for this session:
1. Every filesystem command in src-tauri must resolve paths through
   vault::resolve_in_vault — never call std::fs directly on a raw
   frontend-supplied path (path-traversal risk, not "auth" in the usual
   sense, but the equivalent trust boundary for this app).
2. This app is offline-only: no network calls, no telemetry, no account.
   Don't add a dependency that phones home.
3. Notes are the user's real files on disk. Destructive vault operations
   (delete, overwrite, bulk rewrite) need an explicit confirmation step —
   there is no server-side backup to fall back on.
4. Never edit src-tauri/capabilities/*.json to add a broader permission
   than the feature in front of you actually needs.
5. git push, npm publish, cargo publish and any release command are
   guarded — see .claude/hooks/guard-bash-push.cjs. Ask the user before
   overriding with ALLOW_PUSH=1.
6. Cost priority for this project is "keep cost low" (set at bootstrap) —
   agents default to Haiku/Sonnet; don't escalate to Opus without asking.
`;

process.stdout.write(RULES);
process.exit(0);
