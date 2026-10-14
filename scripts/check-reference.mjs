#!/usr/bin/env node
// Builds the reference harness straight from the spec and runs the hook attack suite
// on it, so the code blocks in HARNESS_REFERENCE.md and LIFECYCLE.md are what gets tested.
//
//   node scripts/check-reference.mjs                 # matrix on stdout
//   node scripts/check-reference.mjs --out docs/baselines/hooks-reference.md
//
// A block is marked in the spec by an HTML comment on the line before its fence:
//   <!-- reference: .claude/hooks/guard-harness.cjs -->

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const root = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim()
const spec = ['HARNESS_REFERENCE.md', 'LIFECYCLE.md']
  .map((f) => readFileSync(join(root, 'plugin', 'skills', 'init', f), 'utf8')).join('\n')
const out = join(root, 'hooks-run', 'reference-harness')
rmSync(out, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })

const blocks = [...spec.matchAll(/<!-- reference: (\S+) -->\r?\n```\w*\r?\n([\s\S]*?)\r?\n```/g)]
if (blocks.length === 0) throw new Error('no reference blocks found in HARNESS_REFERENCE.md')
for (const [, path, body] of blocks) {
  mkdirSync(dirname(join(out, path)), { recursive: true })
  writeFileSync(join(out, path), body + '\n')
  if (path.endsWith('.json')) JSON.parse(body)
  else if (path.endsWith('.cjs')) execFileSync(process.execPath, ['--check', join(out, path)])
  console.log(`extracted ${path}`)
}

const args = process.argv.slice(2)
const r = spawnSync('node', [join(root, 'scripts', 'test-hooks.mjs'), '--harness', out, ...args], { stdio: 'inherit' })
process.exit(r.status ?? 1)
