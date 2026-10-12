#!/usr/bin/env node
// Prints a trace written by trace-case.mjs as a readable session: text, tool calls and
// their results, in order.
//
//   node scripts/show-trace.mjs hooks-run/trace/cost-low-caps-models-haiku-native.jsonl

import { readFileSync } from 'node:fs'

const short = (s, n) => String(s).replace(/[A-Z]:[\\/][^"\s]*?trace[\\/]+[^\\/"]+[\\/]+/gi, '').replace(/\s+/g, ' ').slice(0, n)
for (const line of readFileSync(process.argv[2], 'utf8').trim().split('\n')) {
  const o = JSON.parse(line)
  if (o.kind === 'text') console.log(`TEXT: ${short(o.text, 900)}`)
  else if (o.kind === 'tool_use') console.log(`CALL: ${o.tool} ${short(o.input, 150)}`)
  else if (o.kind === 'tool_result') console.log(`  -> ${o.error ? 'ERROR' : 'ok'} ${short(o.content, 200)}`)
  else if (o.kind === 'permission') console.log(`  perm ${o.decision} ${o.tool} ${o.why ?? ''}`)
  else console.log(`${o.kind}: ${short(JSON.stringify(o), 200)}`)
}
