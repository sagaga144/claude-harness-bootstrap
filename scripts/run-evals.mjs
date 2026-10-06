#!/usr/bin/env node
// Runs the plugin eval suite one case at a time, so a subscription usage limit
// only costs a retry of the case it interrupted, not the whole suite.
//
//   node scripts/run-evals.mjs                 # every case, with and without the plugin
//   node scripts/run-evals.mjs --only-with     # skip the no-plugin baseline (about half the usage)
//   node scripts/run-evals.mjs --case web-app-auth-db --case vague-description
//   node scripts/run-evals.mjs --wait-min 20 --max-tries 12
//
// Results: evals-run/<commit>/<case>.json plus evals-run/<commit>/SUMMARY.md.
// A case already recorded for this commit without errors is skipped, so re-running
// the script after an interruption picks up where it left off.

import { spawnSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const onlyCases = args.flatMap((a, i) => (a === '--case' ? [args[i + 1]] : []));
const waitMin = Number(opt('--wait-min', 20));
const maxTries = Number(opt('--max-tries', 12));

const root = execSync('git rev-parse --show-toplevel').toString().trim();
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain -- plugin').toString().trim() !== '';
const outDir = join(root, 'evals-run', commit + (dirty ? '-dirty' : ''));
mkdirSync(outDir, { recursive: true });

const evalsDir = join(root, 'plugin', 'evals');
const cases = readdirSync(evalsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'results')
  .map((d) => d.name)
  .filter((c) => onlyCases.length === 0 || onlyCases.includes(c));

// A run that hit a usage limit, dropped its connection or had a judge call fail
// says nothing about the plugin, so it's retried instead of being recorded.
const INTERRUPTED = /session limit|usage limit|rate limit|ECONNRESET|Connection dropped|judge call failed|overloaded/i;
function interruption(result) {
  for (const c of result.cases ?? []) {
    for (const runs of Object.values(c.arms ?? {})) {
      for (const r of runs) {
        if (r.error && INTERRUPTED.test(r.error)) return r.error;
        for (const g of r.graders ?? []) if (INTERRUPTED.test(g.explanation ?? '')) return g.explanation;
      }
    }
  }
  return null;
}

const sleep = (min) => new Promise((res) => setTimeout(res, min * 60_000));

for (const c of cases) {
  const file = join(outDir, `${c}.json`);
  if (existsSync(file) && !interruption(JSON.parse(readFileSync(file, 'utf8')))) {
    console.log(`= ${c}: already recorded for ${commit}, skipping`);
    continue;
  }
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    console.log(`> ${c}: attempt ${attempt}`);
    const cmd = ['plugin', 'eval', './plugin', '--case', c, '--scaffold', '--allow-tools', 'Write', 'Edit',
      '--no-publish', '--json', file, ...(flag('--only-with') ? ['--ablation', 'none'] : [])];
    spawnSync('claude', cmd, { cwd: root, stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' });
    const why = existsSync(file) ? interruption(JSON.parse(readFileSync(file, 'utf8'))) : 'no result written';
    if (!why) { console.log(`  recorded`); break; }
    console.log(`  interrupted (${why.slice(0, 80)}); waiting ${waitMin} min`);
    if (attempt === maxTries) console.log(`  giving up on ${c} after ${maxTries} tries`);
    else await sleep(waitMin);
  }
}

// Merge everything recorded for this commit into one table.
const rows = [];
let claudeVersion = '';
let passed = 0;
for (const c of cases) {
  const file = join(outDir, `${c}.json`);
  if (!existsSync(file)) { rows.push(`| \`${c}\` | not run | | |`); continue; }
  const res = JSON.parse(readFileSync(file, 'utf8'));
  claudeVersion = res.claudeVersion;
  const k = res.cases[0];
  const pass = (arm) => (k.arms[arm] ?? []).length ? k.arms[arm].every((r) => r.passed) : null;
  const w = pass('with'), wo = pass('without');
  const bad = interruption(res) ? ' (interrupted)' : '';
  if (w && !bad) passed++;
  const diff = wo === null ? 'not run' : w && !wo ? 'changes the outcome' : w === wo ? 'same' : 'worse';
  rows.push(`| \`${c}\` | ${w ? 'pass' : 'fail'}${bad} | ${wo === null ? '—' : wo ? 'pass' : 'fail'} | ${diff} |`);
}
const summary = `# Eval results for ${commit}${dirty ? ' (uncommitted plugin changes)' : ''}

Claude Code ${claudeVersion}. Each case run on its own (one command per case), all on this commit.

**${passed} of ${cases.length} pass with the plugin.**

| Case | With plugin | Without plugin | Plugin vs. plain Claude Code |
|---|---|---|---|
${rows.join('\n')}
`;
writeFileSync(join(outDir, 'SUMMARY.md'), summary);
console.log('\n' + summary);
