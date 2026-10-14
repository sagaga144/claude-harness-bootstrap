#!/usr/bin/env node
// Re-runs one eval case under the same conditions as `claude plugin eval` and logs the
// whole session (assistant text, tool calls, tool results) to a file in this repo, so an
// eval failure can be read rather than guessed at. The eval tool keeps its traces in the
// system temp folder and deletes them; this keeps them.
//
//   node scripts/trace-case.mjs web-app-auth-db --model sonnet        # says what it would run
//   node scripts/trace-case.mjs web-app-auth-db --model sonnet --go   # runs it
//
// Same as an eval run: the case's prompt, its append_system_prompt, its allowed_tools
// plus Write and Edit (what run-evals.mjs passes), the plugin under test loaded, no user
// settings, writes into .claude/ refused (eval runs can't write there), and the case's
// fixture.sh run first if it has one. Output: hooks-run/trace/<case>-<model>/ (the
// project) and hooks-run/trace/<case>-<model>.jsonl (the session). Needs the Agent SDK in
// .tools/ (see generate-example.mjs).

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const name = args[0]
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const model = opt('--model', 'sonnet')
// --native: refuse .claude/ writes with the message Claude Code itself gives in an eval
// (it runs in don't-ask mode), so the session reacts as it would there. The
// policy below still applies either way: nothing is written outside the project.
const native = args.includes('--native')
const NATIVE_REFUSAL = "Permission to use Write has been denied because Claude Code is running in don't ask mode. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed."
if (!name) throw new Error('usage: trace-case.mjs <case> [--model <alias>]')
// One real model session. Nothing starts without --go; without it, say what would run.
if (!args.includes('--go')) {
  console.log(`Would run 1 session: case ${name} on ${model}${native ? ' (native refusals)' : ''}. Nothing was run; add --go to start it.`)
  process.exit(0)
}

const root = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim()
const sdkRoot = existsSync(join(root, '.tools')) ? root : resolve(root, '..', '..')
const { query } = await import(pathToFileURL(join(sdkRoot, '.tools', 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'sdk.mjs')).href)

const caseDir = join(root, 'plugin', 'evals', name)
const raw = readFileSync(join(caseDir, 'prompt.md'), 'utf8')
const [, front = '', body = raw] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw) ?? []
const field = (k) => front.split(/\r?\n/).map((l) => /^(\w+):\s*(.*)$/.exec(l)).find((m) => m && m[1] === k)?.[2]
const allowed = (field('allowed_tools') ?? '[]').replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean)
const append = JSON.parse(field('append_system_prompt') ?? '""')
const maxTurns = Number(field('max_turns') ?? 60)
const tools = [...new Set([...allowed, 'Write', 'Edit'])]

// The project lives outside any git repo, like an eval's temp folder: a session started
// inside this repo's checkout notices that and may build the project somewhere else.
const project = join(opt('--projects', 'C:/Users/sag23/projects/harness-qa/trace-runs'), `${name}-${model}`)
const log = join(root, 'hooks-run', 'trace', `${name}-${model}${native ? '-native' : ''}.jsonl`)
rmSync(project, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
mkdirSync(project, { recursive: true })
writeFileSync(log, '')
const out = (o) => appendFileSync(log, JSON.stringify(o) + '\n')
if (existsSync(join(caseDir, 'fixture.sh'))) execFileSync('bash', [join(caseDir, 'fixture.sh')], { cwd: project, stdio: 'ignore' })

const norm = (p) => resolve(p).replaceAll('\\', '/').toLowerCase()
const inside = (p, dir) => norm(p) === norm(dir) || norm(p).startsWith(norm(dir) + '/')
const pluginDir = join(root, 'plugin')

out({ kind: 'start', case: name, model, native, tools, maxTurns })
const policy = async (tool, inp) => {
  const file = inp.file_path ?? inp.path
  const abs = file ? (isAbsolute(file) ? file : join(project, file)) : undefined
  let why = null
  if (['Write', 'Edit'].includes(tool)) {
    if (!abs || !inside(abs, project)) why = 'outside the project'
    else if (inside(abs, join(project, '.claude'))) why = native ? NATIVE_REFUSAL : 'eval runs cannot write into .claude/'
  } else if (['Read', 'Glob', 'Grep'].includes(tool)) {
    if (!abs ? false : !inside(abs, project) && !inside(abs, pluginDir)) why = 'outside the project and the plugin'
    if (tool === 'Glob' && /^[a-z]:[\/]|^//i.test(String(inp.pattern ?? '')) && !inside(String(inp.pattern).replace(/[*?].*$/, '') || '/', project)) why = 'outside the project and the plugin'
  } else if (!tools.includes(tool)) why = `${tool} is not allowed in this case`
  out({ kind: 'permission', tool, file: file ?? null, decision: why ? 'deny' : 'allow', why })
  return why ? { behavior: 'deny', message: why === NATIVE_REFUSAL ? why : `Permission denied: ${why}` } : { behavior: 'allow', updatedInput: inp }
}

for await (const m of query({
  prompt: body.trim(),
  options: {
    cwd: project, model, maxTurns, settingSources: [], permissionMode: 'default',
    tools, plugins: [{ type: 'local', path: pluginDir }],
    systemPrompt: { type: 'preset', preset: 'claude_code', append },
    canUseTool: policy,
  },
})) {
  if (m.type === 'assistant') {
    for (const c of m.message.content ?? []) {
      if (c.type === 'text') out({ kind: 'text', text: c.text })
      if (c.type === 'tool_use') out({ kind: 'tool_use', tool: c.name, input: JSON.stringify(c.input).slice(0, 400) })
    }
  } else if (m.type === 'user') {
    for (const c of Array.isArray(m.message?.content) ? m.message.content : []) {
      if (c.type === 'tool_result') out({ kind: 'tool_result', error: !!c.is_error, content: JSON.stringify(c.content).slice(0, 300) })
    }
  } else if (m.type === 'result') {
    out({ kind: 'result', subtype: m.subtype, turns: m.num_turns, cost: m.total_cost_usd })
    console.log(`${name} on ${model}: ${m.subtype}, ${m.num_turns} turns. CLAUDE.md written: ${existsSync(join(project, 'CLAUDE.md'))}. Log: ${log}`)
  }
}
