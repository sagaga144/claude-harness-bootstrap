#!/usr/bin/env bash
# A project whose harness has drifted since setup: a database arrived with no data-layer
# guard, an agent CLAUDE.md names was deleted, hooks use bare relative paths and a
# millisecond timeout, and the harness's own files aren't under ask rules.
set -e

mkdir -p src migrations .claude/agents .claude/hooks

cat > package.json <<'EOF'
{
  "name": "orders-api",
  "version": "1.4.0",
  "scripts": { "test": "vitest run", "lint": "eslint ." },
  "dependencies": { "express": "^4.19.0", "pg": "^8.11.0", "knex": "^3.1.0" },
  "devDependencies": { "vitest": "^1.6.0", "eslint": "^9.0.0" }
}
EOF

cat > migrations/20261001_create_orders.js <<'EOF'
exports.up = (knex) => knex.schema.createTable('orders', (t) => {
  t.increments('id');
  t.integer('customer_id').notNullable();
  t.decimal('total', 10, 2).notNullable();
});
exports.down = (knex) => knex.schema.dropTable('orders');
EOF

cat > src/index.js <<'EOF'
const express = require('express');
const db = require('knex')({ client: 'pg', connection: process.env.DATABASE_URL });
const app = express();
app.get('/orders/:id', async (req, res) => res.json(await db('orders').where({ id: req.params.id }).first()));
module.exports = app;
EOF

cat > CLAUDE.md <<'EOF'
# Orders API — DRIFT-FIXTURE-SENTINEL-55120

Express API, no database (all state is in memory for now).

## Dev Commands
`npm test`, `npm run lint`

## Agents
| Agent | Use |
|---|---|
| `api-reviewer` | reviews route handlers for error handling |
| `test-writer` | writes Vitest tests |
EOF

cat > .claude/agents/test-writer.md <<'EOF'
---
name: test-writer
description: Writes Vitest tests for this API.
tools: Read, Grep, Glob, Write, Edit, Bash
model: sonnet
---
Write focused Vitest tests next to the code they cover.
EOF

cat > .claude/hooks/guard-bash-push.cjs <<'EOF'
#!/usr/bin/env node
"use strict";
try {
  if (process.env.ALLOW_PUSH === "1") process.exit(0);
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (/\bgit\s+push\b/i.test(cmd)) { console.error("Blocked: push."); process.exit(2); }
  process.exit(0);
} catch { process.exit(0); }
EOF

cat > .claude/settings.json <<'EOF'
{
  "permissions": { "deny": ["Read(.env)", "Bash(curl:*)"] },
  "hooks": {
    "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "node .claude/hooks/guard-bash-push.cjs" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "npm test", "timeout": 60000 }] }]
  }
}
EOF

cat > .claude/harness.json <<'EOF'
{
  "generator": "harness-bootstrap",
  "version": "0.7.0",
  "generatedAt": "2026-09-01",
  "mode": "fresh",
  "profile": { "language": "JavaScript", "projectType": "backend/API service", "ui": false, "persistence": false, "trustBoundary": "none", "published": false, "deployTarget": "not yet", "costAnswer": "keep cost low", "scopeAnswer": "essentials" },
  "files": ["CLAUDE.md", ".claude/settings.json", ".claude/hooks/guard-bash-push.cjs", ".claude/agents/api-reviewer.md", ".claude/agents/test-writer.md"]
}
EOF

git init -q
git config user.email "fixture@example.com"
git config user.name "Fixture"
git add -A
git commit -q -m "Orders API with its harness"
