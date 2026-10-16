#!/usr/bin/env node
// Checks the plugin folder against the plugin directory's fetch limit. The directory
// refuses to fetch a commit whose plugin folder is too large, and says only "files in the
// repository the scanner won't accept". The limit isn't published: v0.7.0's folder
// (123,989 bytes) was accepted, v0.7.1's (126,302) was refused. So this fails above the
// largest size known to pass, and warns within 2 kB of it. No model calls.
//
//   node scripts/check-size.mjs          # the committed plugin/ at HEAD (what GitHub serves)
//   node scripts/check-size.mjs --ref v0.8.1

import { execFileSync } from 'node:child_process'

const LARGEST_ACCEPTED = 123_989
const WARN_MARGIN = 2_000

const args = process.argv.slice(2)
const i = args.indexOf('--ref')
const ref = i >= 0 ? args[i + 1] : 'HEAD'
const rows = execFileSync('git', ['ls-tree', '-r', '-l', ref, '--', 'plugin']).toString().trim().split('\n').filter(Boolean)
const files = rows.map((l) => { const [meta, path] = l.split('\t'); return { path, bytes: Number(meta.trim().split(/\s+/)[3]) } })
const total = files.reduce((n, f) => n + f.bytes, 0)

for (const f of [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 5)) console.log(`${String(f.bytes).padStart(8)}  ${f.path}`)
console.log(`plugin/ at ${ref}: ${total} bytes in ${files.length} files (largest accepted: ${LARGEST_ACCEPTED})`)
if (total > LARGEST_ACCEPTED) {
  console.error(`Too large by ${total - LARGEST_ACCEPTED} bytes: the plugin directory may refuse to fetch it. Move tests, docs or scripts out of plugin/, or trim the spec.`)
  process.exit(1)
}
if (total > LARGEST_ACCEPTED - WARN_MARGIN) console.log(`Warning: within ${LARGEST_ACCEPTED - total} bytes of the largest accepted size.`)
else console.log(`OK: ${LARGEST_ACCEPTED - total} bytes of room.`)
