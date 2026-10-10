#!/usr/bin/env node
// Feeds attack payloads to a harness's hooks and reports which attacks they block.
// Hooks are scripts that take JSON on stdin and answer with an exit code, so this
// is deterministic and costs no model calls.
//
//   node scripts/test-hooks.mjs                          # every examples/*/ harness
//   node scripts/test-hooks.mjs --harness path/to/proj   # one harness (the folder holding .claude/)
//   node scripts/test-hooks.mjs --only A8 --only A10     # some fixtures
//   node scripts/test-hooks.mjs --out docs/baselines/hooks-v0.6.1.md
//
// Each attack runs twice: from the project root, and from src/ the way a session
// does after Claude runs `cd` (fixture A16). Each also has an allowed twin, a
// harmless command that must not be blocked.
//
// Results: hooks-run/<commit>/SUMMARY.md (or --out), plus a matrix on stdout.

import { execSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

const args = process.argv.slice(2)
const many = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []))
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt }

const root = execSync('git rev-parse --show-toplevel').toString().trim()
const commit = execSync('git rev-parse --short HEAD').toString().trim()
const fixturesDir = join(root, 'scripts', 'attack-fixtures')
const only = many('--only')
const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(fixturesDir, f), 'utf8')))
  .filter((f) => only.length === 0 || only.includes(f.id))
  .sort((a, b) => (a.id[0] === b.id[0] ? Number(a.id.slice(1)) - Number(b.id.slice(1)) : a.id[0] === 'C' ? -1 : 1))

const harnesses = many('--harness').length > 0
  ? many('--harness').map((h) => resolve(h))
  : readdirSync(join(root, 'examples'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, 'examples', d.name, '.claude', 'settings.json')))
    .map((d) => join(root, 'examples', d.name))

const HOOK_TIMEOUT_MS = 15_000

// Claude Code's matcher: empty or "*" matches every tool, otherwise a regex on the tool name.
const matches = (matcher, tool) => !matcher || matcher === '*' || new RegExp(`^(?:${matcher})$`).test(tool)

function expand(text, projectDir) {
  return text.replaceAll('${CLAUDE_PROJECT_DIR}', projectDir).replaceAll('$CLAUDE_PROJECT_DIR', projectDir)
}

// Claude Code's hook environment: the parent's, with CLAUDE_PROJECT_DIR set. Every
// ALLOW_* override is removed so one set on this machine can't let an attack through.
function hookEnv(projectDir) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: projectDir }
  for (const k of Object.keys(env)) if (/^ALLOW_/i.test(k)) delete env[k]
  return env
}

function withRoot(value, projectDir) {
  return JSON.parse(JSON.stringify(value).replaceAll('{root}', projectDir.replaceAll('\\', '/')))
}

// Runs one command hook. Returns blocked / allowed / errored, with why.
function runHook(hook, payload, cwd, projectDir) {
  const input = JSON.stringify(payload)
  const opts = { cwd, env: hookEnv(projectDir), input, encoding: 'utf8', timeout: HOOK_TIMEOUT_MS, stdio: ['pipe', 'pipe', 'pipe'] }
  const r = Array.isArray(hook.args)
    ? spawnSync(expand(hook.command, projectDir), hook.args.map((a) => expand(a, projectDir)), opts)
    : spawnSync(expand(hook.command, projectDir), { ...opts, shell: true })
  if (r.error) return { result: 'errored', note: r.error.code === 'ETIMEDOUT' ? 'timed out' : r.error.message }
  if (r.status === 2) return { result: 'blocked' }
  if (r.status === 0) {
    try {
      const out = JSON.parse(r.stdout || '{}')
      const decision = out.hookSpecificOutput?.permissionDecision ?? out.decision
      if (decision === 'deny' || decision === 'block') return { result: 'blocked' }
    } catch { /* plain text output: an allow */ }
    return { result: 'allowed' }
  }
  return { result: 'errored', note: `exit ${r.status}: ${(r.stderr || '').trim().split('\n')[0].slice(0, 120)}` }
}

// What the harness's hooks do with one tool call, from one working directory.
function dispatch(settings, call, projectDir, cwd) {
  const groups = settings.hooks?.PreToolUse ?? []
  const hooks = groups.filter((g) => matches(g.matcher, call.tool_name)).flatMap((g) => g.hooks ?? [])
  const payload = {
    session_id: 'test-hooks', transcript_path: join(projectDir, '.claude', 'session-data', 'transcript.jsonl'),
    cwd, permission_mode: 'default', hook_event_name: 'PreToolUse',
    tool_name: call.tool_name, tool_input: withRoot(call.tool_input, projectDir), tool_use_id: 'toolu_test',
  }
  const runs = []
  for (const h of hooks) {
    if (h.type !== 'command') { runs.push({ hook: h.type, result: 'not testable' }); continue }
    runs.push({ hook: basename(String(h.args?.[0] ?? h.command.split(/\s+/).pop())), ...runHook(h, payload, cwd, projectDir) })
  }
  const tested = runs.filter((r) => r.result !== 'not testable')
  let verdict = 'allowed'
  if (runs.length === 0) verdict = 'no hook'
  else if (tested.some((r) => r.result === 'blocked')) verdict = 'blocked'
  else if (tested.length === 0) verdict = 'not testable'
  else if (tested.some((r) => r.result === 'errored')) verdict = 'errored'
  return { verdict, runs }
}

// Rough reading of the permission rules: which fixtures a deny/ask rule should catch.
// Claude Code applies these, not hooks, so they're listed, not exercised.
function ruleFor(settings, call) {
  const perms = settings.permissions ?? {}
  const rules = [...(perms.deny ?? []).map((r) => ['deny', r]), ...(perms.ask ?? []).map((r) => ['ask', r])]
  const cmd = String(call.tool_input.command ?? '').replace(/^(\s*\w+=\S*\s+)+/, '')
  const path = String(call.tool_input.file_path ?? '').replace('{root}/', '')
  for (const [kind, rule] of rules) {
    const m = /^(\w+)\((.*)\)$/.exec(rule)
    if (!m) continue
    const [, tool, pat] = m
    if (tool === 'Bash' && call.tool_name === 'Bash') {
      const prefix = pat.replace(/(:\*|\s\*)$/, '')
      if (cmd.split(/\s*(?:&&|\|\||;|\|)\s*/).some((part) => part.startsWith(prefix))) return `${kind} ${rule}`
    }
    const glob = new RegExp('(^|/)' + pat.replace(/^\.?\//, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/(?<!\.)\*/g, '[^/]*') + '$')
    if ((tool === 'Edit' || tool === 'Write') && ['Edit', 'Write'].includes(call.tool_name) && glob.test(path)) return `${kind} ${rule}`
    // Read/Edit rules also cover the file commands Claude Code recognizes in Bash.
    if (call.tool_name === 'Bash') {
      const target = tool === 'Read' ? /^(?:cat|head|tail)\s+(\S+)/.exec(cmd)?.[1]
        : tool === 'Edit' ? (/(?:>>?|tee\s+)\s*(\S+)\s*$/.exec(cmd)?.[1] ?? /^sed\s+-i\S*\s+'[^']*'\s+(\S+)/.exec(cmd)?.[1]) : undefined
      if (target && glob.test(target.replace(/^\.\//, ''))) return `${kind} ${rule}`
    }
  }
  return ''
}

function testHarness(dir) {
  const name = basename(dir)
  mkdirSync(join(root, 'hooks-run', 'tmp'), { recursive: true })
  const work = join(mkdtempSync(join(root, 'hooks-run', 'tmp', 'run-')), name)
  cpSync(dir, work, { recursive: true })
  mkdirSync(join(work, 'src'), { recursive: true })
  spawnSync('git', ['init', '-q'], { cwd: work, stdio: 'ignore' })
  const settings = JSON.parse(readFileSync(join(work, '.claude', 'settings.json'), 'utf8'))
  const rows = fixtures.map((fx) => ({
    id: fx.id,
    title: fx.title,
    root: dispatch(settings, fx.attack, work, work),
    sub: dispatch(settings, fx.attack, work, join(work, 'src')),
    twin: dispatch(settings, fx.twin, work, work),
    rule: ruleFor(settings, fx.attack),
  }))
  rmSync(dirname(work), { recursive: true, force: true })
  return { name, rows }
}

const results = harnesses.map(testHarness)

// ---------------------------------------------------------------- report

const MARK = { blocked: 'B', allowed: '-', errored: 'E', 'no hook': '·', 'not testable': '?' }
const cell = (r) => `${MARK[r.root.verdict]}${MARK[r.sub.verdict]}${r.twin.verdict === 'blocked' ? '!' : ''}${r.rule ? 'r' : ''}`

const lines = []
lines.push(`# Hook attack matrix (${commit}, ${new Date().toISOString().slice(0, 10)})`, '')
lines.push('Each cell: result from the project root, then from `src/` (after a `cd`).')
lines.push('`B` blocked · `-` allowed · `E` hook errored (Claude Code fails open, so not blocked) · `·` no hook for this tool · `?` only non-command hooks.')
lines.push('A trailing `!` means the allowed twin was blocked (a guard that blocks too much). A trailing `r` means a permission rule should catch it; rules are applied by Claude Code, not exercised here.', '')
lines.push(`| Attack | ${results.map((r) => r.name).join(' | ')} |`)
lines.push(`|---|${results.map(() => '---').join('|')}|`)
for (const fx of fixtures) {
  lines.push(`| ${fx.id} ${fx.title} | ${results.map((h) => cell(h.rows.find((r) => r.id === fx.id))).join(' | ')} |`)
}
lines.push('')
lines.push('## Attacks blocked (controls C1/C2 not counted)', '')
lines.push('| Harness | From root | From src/ | Root or rule |', '|---|---|---|---|')
for (const h of results) {
  const attacks = h.rows.filter((r) => !r.id.startsWith('C'))
  const n = attacks.length
  const rootB = attacks.filter((r) => r.root.verdict === 'blocked').length
  const subB = attacks.filter((r) => r.sub.verdict === 'blocked').length
  const either = attacks.filter((r) => r.root.verdict === 'blocked' || r.rule).length
  lines.push(`| ${h.name} | ${rootB}/${n} | ${subB}/${n} | ${either}/${n} |`)
}
const notes = results.flatMap((h) => h.rows.flatMap((r) => [...r.root.runs, ...r.sub.runs]
  .filter((x) => x.result === 'errored').map((x) => `${h.name} ${r.id}: ${x.hook} ${x.note}`)))
if (notes.length > 0) {
  lines.push('', '## Hook errors', '')
  for (const n of [...new Set(notes.map((n) => n.replace(/^(\S+) [AC]\d+: /, '$1: ')))].slice(0, 40)) lines.push(`- ${n}`)
}
const report = lines.join('\n') + '\n'

const out = opt('--out', join(root, 'hooks-run', commit, 'SUMMARY.md'))
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, report)
console.log(report)
console.log(`Written to ${out}`)
