#!/usr/bin/env node
// Builds the reference harnesses straight from the spec and runs the hook attack suite
// on them, so the code blocks in HARNESS_REFERENCE.md, LIFECYCLE.md and
// SECURITY_TOOLING.md are what gets tested.
//
//   node scripts/check-reference.mjs                 # matrix on stdout
//   node scripts/check-reference.mjs --out docs/baselines/hooks-reference.md
//
// A block is marked in the spec by an HTML comment on the line before its fence:
//   <!-- reference: .claude/hooks/guard-harness.cjs -->
// Blocks under "security/" belong to the security-tooling project type (§1.12): they are
// laid over a copy of the base harness to make a second one, reference-security, with the
// scope guard registered beside the baseline guards, as the spec says.

import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const root = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim()
const spec = ['HARNESS_REFERENCE.md', 'LIFECYCLE.md', 'SECURITY_TOOLING.md']
  .map((f) => readFileSync(join(root, 'plugin', 'skills', 'init', f), 'utf8')).join('\n')
const base = join(root, 'hooks-run', 'reference-harness')
const security = join(root, 'hooks-run', 'reference-security')
for (const d of [base, security]) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })

const blocks = [...spec.matchAll(/<!-- reference: (\S+) -->\r?\n```\w*\r?\n([\s\S]*?)\r?\n```/g)]
if (blocks.length === 0) throw new Error('no reference blocks found in the spec')

function write(dir, path, body) {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), body + '\n')
  if (path.endsWith('.json')) JSON.parse(body)
  else if (path.endsWith('.cjs')) execFileSync(process.execPath, ['--check', join(dir, path)])
  console.log(`extracted ${path}`)
}
for (const [, path, body] of blocks.filter(([, p]) => !p.startsWith('security/'))) write(base, path, body)

cpSync(base, security, { recursive: true })
for (const [, path, body] of blocks.filter(([, p]) => p.startsWith('security/'))) write(security, path.slice('security/'.length), body)
// Register the scope guard in the Bash|PowerShell PreToolUse entry, next to the baseline
// guards, and put scope.json under the harness's ask rules.
const settingsPath = join(security, '.claude', 'settings.json')
const settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
const entry = settings.hooks.PreToolUse.find((e) => e.matcher === 'Bash|PowerShell')
if (!entry) throw new Error('no Bash|PowerShell PreToolUse entry in the reference settings.json')
const guard = entry.hooks[0]
entry.hooks.push({ ...guard, ...(guard.args ? { args: [guard.args[0].replace(/[^/]+\.cjs$/, 'guard-scope.cjs')] } : { command: guard.command.replace(/[^/"]+\.cjs/, 'guard-scope.cjs') }) })
settings.permissions.ask.push('Edit(scope.json)', 'Write(scope.json)')
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
// The spec's example window has fixed dates; widen it here so the test doesn't start
// blocking its in-scope twin once those dates pass.
const scopePath = join(security, 'scope.json')
writeFileSync(scopePath, JSON.stringify({ ...JSON.parse(readFileSync(scopePath, 'utf8')), window: { start: '2000-01-01', end: '2099-12-31' } }, null, 2) + '\n')

const args = process.argv.slice(2)
const r = spawnSync(process.execPath, [join(root, 'scripts', 'test-hooks.mjs'), '--harness', base, '--harness', security, ...args], { stdio: 'inherit' })
process.exit(r.status ?? 1)
