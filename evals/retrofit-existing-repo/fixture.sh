#!/usr/bin/env bash
set -e

mkdir -p src .claude/agents

cat > package.json <<'EOF'
{
  "name": "inventory-api",
  "version": "1.0.0",
  "scripts": { "test": "jest", "lint": "eslint ." },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "eslint-config-airbnb-base": "^15.0.0"
  }
}
EOF

cat > .eslintrc.json <<'EOF'
{ "extends": "airbnb-base" }
EOF

cat > src/index.js <<'EOF'
// Existing Express app entry point.
const express = require('express');
const app = express();
module.exports = app;
EOF

cat > src/index.test.js <<'EOF'
const app = require('./index');
test('app exists', () => {
  expect(app).toBeDefined();
});
EOF

cat > CLAUDE.md <<'EOF'
# Inventory API — SENTINEL-DO-NOT-REMOVE-EXISTING-CONTENT-MARKER-77421

This is a real, already-tailored harness for this project, in use for months.
It documents the real dev commands and the existing Jest + airbnb-base
conventions this team already follows.

## Dev Commands
`npm test`, `npm run lint`
EOF

cat > .claude/agents/existing-reviewer.md <<'EOF'
---
name: existing-reviewer
description: A pre-existing, tailored reviewer agent for this project. Use for any code review request.
tools: Read, Grep, Glob
model: sonnet
---

This is real, already-tailored content for this project — SENTINEL-AGENT-MARKER-77421.
EOF

git init -q
git config user.email "fixture@example.com"
git config user.name "fixture"
git add -A
git commit -q -m "existing project with a harness already"
