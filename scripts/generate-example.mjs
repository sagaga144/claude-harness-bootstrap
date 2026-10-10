#!/usr/bin/env node
// Regenerates an example harness from its INPUT.md with the plugin in this repo, in a
// real Claude Code session that can write into .claude/ (eval runs can't).
//
//   node scripts/generate-example.mjs monorepo-saas
//   node scripts/generate-example.mjs monorepo-saas --model sonnet
//
// Needs the Agent SDK in .tools/ (gitignored):
//   cd .tools && npm install @anthropic-ai/claude-agent-sdk@0.3.296
//
// The session runs in hooks-run/gen/<name>/ under a fixed policy, answered in code
// instead of by a person: it may read this repository, write only inside its own
// folder, and run only local shell commands (no network tools, no paths outside its
// folder). It gets no user or plugin settings from this machine, only the plugin under
// test. Like the evals, it takes the recommended default for every setup question.
// Output: hooks-run/gen/<name>/ plus hooks-run/gen/<name>.log (every decision).

import { execSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const name = args[0]
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined }
if (!name) throw new Error('usage: generate-example.mjs <example-name> [--model <alias>]')

const root = execSync('git rev-parse --show-toplevel').toString().trim()
const { query } = await import(pathToFileURL(join(root, '.tools', 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'sdk.mjs')).href)

const input = readFileSync(join(root, 'examples', name, 'INPUT.md'), 'utf8')
const description = input.split('\n').filter((l) => l.startsWith('> ')).map((l) => l.slice(2)).join('\n').trim()
if (!description) throw new Error(`no "> " description lines in examples/${name}/INPUT.md`)

const target = join(root, 'hooks-run', 'gen', name)
const log = join(root, 'hooks-run', 'gen', `${name}.log`)
rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
mkdirSync(target, { recursive: true })
writeFileSync(log, '')
// A neutral local identity, so example commits never carry anyone's real email.
for (const cmd of ['git init -q', 'git config user.name "Example Project"', 'git config user.email "example@example.invalid"',
  'git commit -q --allow-empty -m "Empty project"']) execSync(cmd, { cwd: target, stdio: 'ignore' })

const norm = (p) => resolve(p).replaceAll('\\', '/').toLowerCase()
const under = (p, dir) => norm(p) === norm(dir) || norm(p).startsWith(norm(dir) + '/')
const note = (line) => appendFileSync(log, line + '\n')

const NETWORK = /\b(curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod|ssh|scp|nc|ncat|npx|pnpx|bunx|uvx)\b|\b(npm|pnpm|yarn|bun)\s+(i|install|add|ci|publish)\b|\bpip3?\s+install\b|\bcargo\s+(install|add|publish)\b|\bgo\s+(get|install)\b|\bgit\s+(push|clone|fetch|pull)\b/i
// Absolute paths and parent-directory hops, in Windows and POSIX spellings.
const OUTSIDE = /(^|[\s'"=(])([a-z]:[\\/]|\/[a-z]\/|~[\\/]|\.\.[\\/]|\/(?:etc|usr|home|tmp|var|users)\b)/i

function decide(tool, inp) {
  const file = inp.file_path ?? inp.notebook_path ?? inp.path
  if (['Read', 'Glob', 'Grep', 'LS'].includes(tool)) {
    return !file || under(isAbsolute(file) ? file : join(target, file), root) ? null : 'reads stay inside this repository'
  }
  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
    return file && under(isAbsolute(file) ? file : join(target, file), target) ? null : 'writes stay inside the project folder'
  }
  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(inp.command ?? '')
    if (NETWORK.test(cmd)) return 'no network or install commands in this run'
    const outside = cmd.replaceAll(target, '.').replaceAll(target.replaceAll('\\', '/'), '.')
    if (OUTSIDE.test(outside)) return 'commands stay inside the project folder'
    return null
  }
  if (['Skill', 'Agent', 'Task', 'TodoWrite', 'ToolSearch'].includes(tool)) return null
  return `${tool} isn't used in this run`
}

const q = query({
  prompt: description,
  options: {
    cwd: target,
    model: opt('--model'),
    maxTurns: 200,
    settingSources: ['project'],
    plugins: [{ type: 'local', path: join(root, 'plugin') }],
    disallowedTools: ['AskUserQuestion', 'WebFetch', 'WebSearch'],
    permissionMode: 'default',
    systemPrompt: {
      type: 'preset', preset: 'claude_code',
      append: 'This is a non-interactive session: no human can answer a follow-up question. If your instructions call for asking the user something, state the question and your recommended answer, then proceed with that recommended default immediately.',
    },
    canUseTool: async (tool, inp) => {
      const why = decide(tool, inp)
      note(`${why ? 'DENY ' : 'allow'} ${tool} ${JSON.stringify(inp.command ?? inp.file_path ?? inp.skill ?? inp.description ?? '').slice(0, 160)}${why ? ` (${why})` : ''}`)
      return why ? { behavior: 'deny', message: why } : { behavior: 'allow', updatedInput: inp }
    },
  },
})

for await (const m of q) {
  if (m.type === 'result') {
    note(`RESULT ${m.subtype} turns=${m.num_turns} cost=$${m.total_cost_usd?.toFixed?.(2) ?? '?'}`)
    console.log(`${name}: ${m.subtype} in ${m.num_turns} turns ($${m.total_cost_usd?.toFixed?.(2) ?? '?'}). Output in hooks-run/gen/${name}/`)
  }
}
