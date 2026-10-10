#!/usr/bin/env node
// Runs the plugin eval suite one case at a time, so a subscription usage limit
// only costs a retry of the case it interrupted, not the whole suite.
//
//   node scripts/run-evals.mjs                 # every case, with and without the plugin
//   node scripts/run-evals.mjs --only-with     # skip the no-plugin baseline (about half the usage)
//   node scripts/run-evals.mjs --case web-app-auth-db --case vague-description
//   node scripts/run-evals.mjs --model haiku --model sonnet --runs 3
//   node scripts/run-evals.mjs --release       # Haiku + Sonnet, with the plugin only, 1 run each
//   node scripts/run-evals.mjs --major         # Haiku, Sonnet, Opus, Fable; both arms; 3 runs each
//   node scripts/run-evals.mjs --wait-min 20 --max-tries 12
//
// Results: evals-run/<commit>/<model>/<case>.json plus evals-run/<commit>/SUMMARY.md,
// with one column per model. A case already recorded for this commit and model
// without errors is skipped, so re-running after an interruption picks up where it
// left off. With no --model, the account's default model runs, filed under "default".

import { spawnSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const many = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const onlyCases = many('--case');
const waitMin = Number(opt('--wait-min', 20));
const maxTries = Number(opt('--max-tries', 12));

// The eval policy from docs/ROADMAP.md: every release runs Haiku and Sonnet with the
// plugin only; a major release runs all four models, both arms, three runs each.
const preset = flag('--major') ? { models: ['haiku', 'sonnet', 'opus', 'fable'], onlyWith: false, runs: 3 }
  : flag('--release') ? { models: ['haiku', 'sonnet'], onlyWith: true, runs: 1 }
  : { models: [], onlyWith: false, runs: undefined };
const models = many('--model').length > 0 ? many('--model') : preset.models.length > 0 ? preset.models : ['default'];
const onlyWith = flag('--only-with') || preset.onlyWith;
const runs = opt('--runs', preset.runs);

const root = execSync('git rev-parse --show-toplevel').toString().trim();
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain -- plugin').toString().trim() !== '';
const outRoot = join(root, 'evals-run', commit + (dirty ? '-dirty' : ''));

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

for (const model of models) {
  const outDir = join(outRoot, model);
  mkdirSync(outDir, { recursive: true });
  for (const c of cases) {
    const file = join(outDir, `${c}.json`);
    if (existsSync(file) && !interruption(JSON.parse(readFileSync(file, 'utf8')))) {
      console.log(`= ${model} ${c}: already recorded for ${commit}, skipping`);
      continue;
    }
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      console.log(`> ${model} ${c}: attempt ${attempt}`);
      const cmd = ['plugin', 'eval', './plugin', '--case', c, '--scaffold', '--allow-tools', 'Write', 'Edit',
        '--no-publish', '--json', file,
        ...(model === 'default' ? [] : ['--model', model]),
        ...(runs ? ['--runs', String(runs)] : []),
        ...(onlyWith ? ['--ablation', 'none'] : [])];
      spawnSync('claude', cmd, { cwd: root, stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' });
      const why = existsSync(file) ? interruption(JSON.parse(readFileSync(file, 'utf8'))) : 'no result written';
      if (!why) { console.log(`  recorded`); break; }
      console.log(`  interrupted (${why.slice(0, 80)}); waiting ${waitMin} min`);
      if (attempt === maxTries) console.log(`  giving up on ${model} ${c} after ${maxTries} tries`);
      else await sleep(waitMin);
    }
  }
}

// Merge everything recorded for this commit into one table, a column per model.
// A cell is the pass rate across runs, so flaky cases show as 2/3 rather than fail.
let claudeVersion = '';
const rate = (list) => (list && list.length ? { pass: list.filter((r) => r.passed).length, of: list.length } : null);
const fmt = (r) => (r === null ? '—' : r.of === 1 ? (r.pass ? 'pass' : 'fail') : `${r.pass}/${r.of}`);
const totals = Object.fromEntries(models.map((m) => [m, 0]));
const rows = [];
for (const c of cases) {
  const cells = [];
  for (const model of models) {
    const file = join(outRoot, model, `${c}.json`);
    if (!existsSync(file)) { cells.push('not run'); continue; }
    const res = JSON.parse(readFileSync(file, 'utf8'));
    claudeVersion = res.claudeVersion ?? claudeVersion;
    const k = res.cases[0];
    const w = rate(k.arms.with);
    const wo = rate(k.arms.without);
    const bad = interruption(res) ? ' (interrupted)' : '';
    if (w && w.pass === w.of && !bad) totals[model]++;
    cells.push(`${fmt(w)}${wo ? ` (without: ${fmt(wo)})` : ''}${bad}`);
  }
  rows.push(`| \`${c}\` | ${cells.join(' | ')} |`);
}
const summary = `# Eval results for ${commit}${dirty ? ' (uncommitted plugin changes)' : ''}

Claude Code ${claudeVersion}. Each case run on its own (one command per case), all on this commit.
${runs ? `${runs} run(s) per case; a cell like 2/3 is the pass rate.` : 'Runs per case: each case\'s default.'}
${onlyWith ? 'With the plugin only (no baseline arm).' : 'In parentheses: the same case without the plugin.'}

${models.map((m) => `**${m}: ${totals[m]} of ${cases.length} pass every run.**`).join('  \n')}

| Case | ${models.join(' | ')} |
|---|${models.map(() => '---').join('|')}|
${rows.join('\n')}
`;
mkdirSync(outRoot, { recursive: true });
writeFileSync(join(outRoot, 'SUMMARY.md'), summary);
console.log('\n' + summary);
