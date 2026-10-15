#!/usr/bin/env node
// Runs the plugin eval suite one case at a time, so a subscription usage limit
// only costs a retry of the case it interrupted, not the whole suite.
//
// Nothing runs without --go. Without it the script only lists the sessions it would start
// (and rebuilds SUMMARY.md from what's recorded), so a run's size is seen before it's spent.
//
//   node scripts/run-evals.mjs --release                 # list what a release run would start
//   node scripts/run-evals.mjs --release --go            # start it
//   node scripts/run-evals.mjs                 # every case, with and without the plugin
//   node scripts/run-evals.mjs --only-with     # skip the no-plugin baseline (about half the usage)
//   node scripts/run-evals.mjs --case web-app-auth-db --case vague-description
//   node scripts/run-evals.mjs --model haiku --model sonnet --runs 3
//   node scripts/run-evals.mjs --release       # Haiku + Sonnet, with the plugin only, 1 run each
//   node scripts/run-evals.mjs --major         # Haiku, Sonnet, Opus, Fable; both arms; 3 runs each
//   node scripts/run-evals.mjs --heldout C:/path/to/heldout-evals --model sonnet --runs 3
//   node scripts/run-evals.mjs --wait-min 20 --max-tries 12
//   node scripts/run-evals.mjs --release --keep-temp --temp C:/path/eval-tmp
//                                              # keep each session's files and trace, in that folder
//
// Results: evals-run/plugin-<hash>/<model>/<case>.json plus SUMMARY.md there, where <hash>
// covers everything in plugin/ except evals/, and <case>.case records the git hash of that
// case's own folder. A docs or script commit re-runs nothing; editing one case's grader
// re-runs that case only; changing the skill re-runs everything. A case already recorded
// for this plugin, case version and model without errors is skipped, so re-running after
// an interruption picks up where it
// left off. With no --model, the account's default model runs, filed under "default".

import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

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
const keepTemp = flag('--keep-temp');
const go = flag('--go');
// --temp <dir>: where the eval keeps its session folders (TEMP/TMP for the child), so a
// kept trace can be read without leaving the allowed folders.
const tempDir = opt('--temp');
let planned = 0;
const runs = opt('--runs', preset.runs);

const git = (...a) => execFileSync('git', a).toString().trim();
const root = git('rev-parse', '--show-toplevel');
const commit = git('rev-parse', '--short', 'HEAD');
const dirty = git('status', '--porcelain', '--', 'plugin') !== '';
// A result depends on the plugin itself (skills, manifest: everything but evals/) and on
// its own case's folder. Results are filed under the first and checked against the second,
// so editing one case's grader re-runs that case only, and a docs commit re-runs nothing.
const pluginEntries = git('ls-tree', 'HEAD', 'plugin/').split('\n').filter((l) => !/\tplugin\/evals$/.test(l)).join('\n');
const pluginTree = createHash('sha1').update(pluginEntries).digest('hex').slice(0, 7);
const caseTree = (c) => { try { return git('rev-parse', '--short', `HEAD:plugin/evals/${c}`); } catch { return 'none'; } };

// On Windows, npm installs claude as a .cmd shim, which Node can only start through a
// shell. Find the executable the shim wraps and run that instead, so the eval arguments
// (file paths included) never go through a shell.
function claudeBin() {
  if (process.platform !== 'win32') return { bin: 'claude', shell: false };
  try {
    const shim = execFileSync('where', ['claude.cmd']).toString().split(/\r?\n/)[0].trim();
    const target = /"%dp0%\\([^"]+\.exe)"/i.exec(readFileSync(shim, 'utf8'))?.[1];
    if (target && existsSync(join(dirname(shim), target))) return { bin: join(dirname(shim), target), shell: false };
  } catch { /* fall through */ }
  return { bin: 'claude', shell: true };
}
const claude = claudeBin();

// --heldout <dir>: run the held-out cases in <dir>/cases against a copy of this plugin made
// inside <dir>, and keep their results there too. Nothing about them lands in this repo,
// where the improvement loop's sessions could read it.
const heldout = opt('--heldout');
const tag = `plugin-${pluginTree}${dirty ? `-dirty-${commit}` : ''}`;
const outRoot = heldout ? join(heldout, 'results', tag) : join(root, 'evals-run', tag);
const evalRoot = heldout ? join(heldout, 'runs', tag) : root;
if (heldout) {
  rmSync(evalRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  cpSync(join(root, 'plugin'), join(evalRoot, 'plugin'), { recursive: true, filter: (src) => !/[\\/]evals[\\/]results/.test(src) });
  cpSync(join(heldout, 'cases'), join(evalRoot, 'plugin', 'heldout'), { recursive: true });
}

const evalsDir = join(evalRoot, 'plugin', heldout ? 'heldout' : 'evals');
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

// One case, retried only when a usage limit or a dropped connection cut it off.
// `target` is the plugin to load; `oneArm` runs it alone, with no comparison arm.
async function runCase(model, c, file, runCount, target = './plugin', oneArm = onlyWith) {
  if (!go) {
    planned += Number(runCount ?? 1) * (oneArm ? 1 : 2);
    console.log(`would run: ${model} ${c}${target === './plugin' ? (oneArm ? ' (with the plugin)' : ' (with and without the plugin)') : ' (without the plugin)'}${runCount ? `, ${runCount} run(s)` : ''}`);
    return;
  }
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    console.log(`> ${model} ${c}${target === './plugin' ? '' : ' (without the plugin)'}: attempt ${attempt}${runCount ? ` (${runCount} runs)` : ''}`);
    const cmd = ['plugin', 'eval', target, ...(heldout ? ['--eval-dir', 'heldout'] : []), '--case', c, '--scaffold', '--allow-tools', 'Write', 'Edit',
      '--no-publish', '--json', file,
      ...(model === 'default' ? [] : ['--model', model]),
      ...(runCount ? ['--runs', String(runCount)] : []),
      ...(oneArm ? ['--ablation', 'none'] : []),
      ...(keepTemp ? ['--keep-temp'] : [])];
    const env = tempDir ? { ...process.env, TEMP: tempDir, TMP: tempDir } : process.env;
    if (tempDir) mkdirSync(tempDir, { recursive: true });
    spawnSync(claude.bin, cmd, { cwd: evalRoot, env, stdio: ['ignore', 'ignore', 'inherit'], shell: claude.shell });
    const why = existsSync(file) ? interruption(JSON.parse(readFileSync(file, 'utf8'))) : 'no result written';
    if (!why) { console.log(`  recorded`); return; }
    console.log(`  interrupted (${why.slice(0, 80)}); waiting ${waitMin} min`);
    if (attempt === maxTries) console.log(`  giving up on ${model} ${c} after ${maxTries} tries`);
    else await sleep(waitMin);
  }
}

// A case that failed only on LLM graders (three judge votes) may be a split vote, not a
// real failure, so it gets two more runs before it counts (docs/ROADMAP.md, "Judge
// noise"). A regex or tool check failing is a real failure on the first run.
function judgeOnlyFailure(res) {
  const k = res.cases?.[0];
  if (!k) return false;
  const llm = new Set((k.graders ?? []).filter((g) => g.type === 'llm').map((g) => g.name));
  const failed = (k.arms?.with ?? []).flatMap((r) => (r.graders ?? []).filter((g) => !g.passed).map((g) => g.name));
  return failed.length > 0 && failed.every((name) => llm.has(name));
}

// The no-plugin arm on its own, for a case whose with-plugin result is already recorded
// (claude plugin eval runs "with" alone or both arms, never "without" alone). It loads a
// stand-in plugin that has only a manifest and the eval cases, no skills.
let baselinePlugin = null;
function standIn() {
  if (baselinePlugin) return baselinePlugin;
  baselinePlugin = join(root, 'hooks-run', 'baseline-plugin');
  rmSync(baselinePlugin, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  mkdirSync(join(baselinePlugin, '.claude-plugin'), { recursive: true });
  writeFileSync(join(baselinePlugin, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'no-plugin-baseline', version: '0.0.0', description: 'Stand-in with no skills, for the no-plugin eval arm.' }, null, 2));
  cpSync(join(root, 'plugin', 'evals'), join(baselinePlugin, 'evals'), { recursive: true, filter: (src) => !/[\\/]evals[\\/]results/.test(src) });
  return baselinePlugin;
}

for (const model of models) {
  const outDir = join(outRoot, model);
  mkdirSync(outDir, { recursive: true });
  for (const c of cases) {
    const file = join(outDir, `${c}.json`);
    // Results recorded against an older version of this case's own folder (a grader
    // changed, say) are set aside, so the case runs again; other cases keep theirs.
    const marker = join(outDir, `${c}.case`);
    if (existsSync(file) && (!existsSync(marker) || readFileSync(marker, 'utf8').trim() !== caseTree(c))) {
      const stale = join(outDir, 'stale', existsSync(marker) ? readFileSync(marker, 'utf8').trim() : 'unknown');
      console.log(`  ${model} ${c}: the case changed since its results were recorded; setting them aside`);
      if (go) {
        mkdirSync(stale, { recursive: true });
        for (const f of readdirSync(outDir)) if (f.startsWith(`${c}.`)) renameSync(join(outDir, f), join(stale, f));
      } else {
        planned += Number(runs ?? 1) * (onlyWith ? 1 : 2);
        console.log(`would run: ${model} ${c} again${onlyWith ? '' : ' (with and without the plugin)'}`);
        continue;
      }
    }
    if (go) writeFileSync(marker, caseTree(c));
    if (existsSync(file) && !interruption(JSON.parse(readFileSync(file, 'utf8')))) {
      console.log(`= ${model} ${c}: already recorded for plugin ${pluginTree}, skipping`);
    } else {
      await runCase(model, c, file, runs);
    }
    const without = join(outDir, `${c}.without.json`);
    const hasWithout = (f) => existsSync(f) && (JSON.parse(readFileSync(f, 'utf8')).cases?.[0]?.arms?.without?.length ?? 0) > 0;
    const withoutDone = existsSync(without) && !interruption(JSON.parse(readFileSync(without, 'utf8')));
    if (!onlyWith && !heldout && existsSync(file) && !hasWithout(file) && !withoutDone) {
      await runCase(model, c, without, runs, standIn(), true);
    }
    const rerun = join(outDir, `${c}.rerun.json`);
    const done = existsSync(rerun) && !interruption(JSON.parse(readFileSync(rerun, 'utf8')));
    if (!done && existsSync(file) && judgeOnlyFailure(JSON.parse(readFileSync(file, 'utf8')))) {
      console.log(`  ${model} ${c}: failed only on judge votes, running it twice more`);
      await runCase(model, c, rerun, 2, './plugin', true); // the no-plugin arm isn't what's in doubt
    }
  }
}

// Merge everything recorded for this commit into one table, a column per model.
// A cell is the pass rate across runs, so flaky cases show as 2/3 rather than fail.
let claudeVersion = '';
const rate = (list) => (list && list.length ? { pass: list.filter((r) => r.passed).length, of: list.length } : null);
const fmt = (r) => (r === null ? '—' : typeof r === 'string' ? r : r.of === 1 ? (r.pass ? 'pass' : 'fail') : `${r.pass}/${r.of}`);
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
    const rerunFile = join(outRoot, model, `${c}.rerun.json`);
    const extra = existsSync(rerunFile) ? JSON.parse(readFileSync(rerunFile, 'utf8')).cases[0].arms.with ?? [] : [];
    const w = rate([...k.arms.with, ...extra]);
    // A no-plugin arm run on its own is scored as claude plugin eval scores its own: the
    // check that the plugin's skill fired doesn't count, since it can't pass without it.
    const withoutFile = join(outRoot, model, `${c}.without.json`);
    const alone = existsSync(withoutFile) ? JSON.parse(readFileSync(withoutFile, 'utf8')).cases[0] : null;
    const pluginOnly = new Set((alone?.graders ?? []).filter((g) => g.type === 'tool_used' && g.config?.tool === 'Skill').map((g) => g.name));
    const rescored = (alone?.arms.with ?? []).map((r) => ({ passed: (r.graders ?? []).every((g) => g.passed || pluginOnly.has(g.name)) }));
    // A case whose only check is the skill firing has nothing to score without the plugin.
    const nothingLeft = alone && (alone.graders ?? []).every((g) => pluginOnly.has(g.name));
    const wo = nothingLeft ? 'n/a' : rate(k.arms.without?.length ? k.arms.without : rescored);
    const bad = interruption(res) ? ' (interrupted)' : '';
    if (w && (w.pass === w.of || (extra.length && w.pass * 2 > w.of)) && !bad) totals[model]++;
    cells.push(`${fmt(w)}${wo ? ` (without: ${fmt(wo)})` : ''}${bad}`);
  }
  rows.push(`| \`${c}\` | ${cells.join(' | ')} |`);
}
const summary = `# Eval results for plugin ${pluginTree} (commit ${commit})${dirty ? ' (uncommitted plugin changes)' : ''}

Claude Code ${claudeVersion}. Each case run on its own (one command per case), all on this plugin folder.
${runs ? `${runs} run(s) per case; a cell like 2/3 is the pass rate.` : 'Runs per case: each case\'s default.'}
${onlyWith ? 'With the plugin only (no baseline arm).' : 'In parentheses: the same case without the plugin. Where the with-plugin result came first, the no-plugin arm ran on its own with a stand-in plugin that has no skills, scored like claude plugin eval scores its own (the skill-fired check left out).'}

${models.map((m) => `**${m}: ${totals[m]} of ${cases.length} pass.**`).join('  \n')}

A case passes when every run passes. One that failed only on judge votes was run twice
more and passes on a majority; its cell shows the rate (e.g. 2/3).

| Case | ${models.join(' | ')} |
|---|${models.map(() => '---').join('|')}|
${rows.join('\n')}
`;
mkdirSync(outRoot, { recursive: true });
writeFileSync(join(outRoot, 'SUMMARY.md'), summary);
console.log('\n' + summary);
if (!go) console.log(planned === 0 ? 'Nothing to run: every case is recorded for this plugin.' : `Dry run: ${planned} session(s) would start. Nothing was run; add --go to start them.`);
