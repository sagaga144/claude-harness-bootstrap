# Security tooling and authorized testing

> Companion to `HARNESS_REFERENCE.md` (§1.12). Read it only when Step 1 finds the project
> is security tooling or authorized testing.

### 1.12 Scope, scope guard, evidence

**The trait.** Pentest tools, scanners, CTF work, red-team automation, exploit or
detection development. The new risk is Claude pointing a network tool at something nobody
authorized, so the project gets a written scope, a guard that enforces it, and a record of
what was run against what.

**1. `scope.json`, filled in by the user** at the project root. Ask for the authorized
targets and dates in the final report; never invent them. Until it exists, the guard
blocks every network tool.

<!-- reference: security/scope.json -->
```json
{
  "authorization": "Signed engagement letter, ACME-2026-114",
  "window": { "start": "2026-10-01", "end": "2026-12-31" },
  "targets": ["10.10.0.0/16", "192.168.56.10", "lab.example.com", "*.staging.example.com"]
}
```

`targets` takes IPs, CIDR ranges, hostnames and `*.domain` wildcards; loopback is always
allowed, for local labs. Put `scope.json` under the harness's `ask` rules (§1.7): widening
scope is the user's call, never Claude's.

**2. The scope guard**, `PreToolUse: Bash|PowerShell`, registered in §1.7's skeleton next
to the baseline guards. It blocks a network tool aimed at a target outside `targets`,
outside `window`, with no `scope.json`, or with targets read from a file it can't see
(`nmap -iL`); for an allowed run it appends the tool and targets, never the command, to
`.claude/session-data/evidence.jsonl`. Override: `ALLOW_OUT_OF_SCOPE=1`, from the
environment like every guard's. In this project it is part of the security baseline:
write it with the baseline guards, and still try it once after a refused `.claude/` write.

<!-- reference: security/.claude/hooks/guard-scope.cjs -->
```js
#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. Blocks network tools aimed at targets outside scope.json,
// or outside its engagement window, and logs in-scope runs to evidence.jsonl.
// Override: start the session with ALLOW_OUT_OF_SCOPE=1. Exit 0 = allow, 2 = block.
// Fails open on its own errors, except a missing or unreadable scope.json, which blocks.
"use strict";
const fs = require("fs");
const path = require("path");
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}
const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const TOOLS = /\b(?:nmap|masscan|rustscan|naabu|curl|wget|nc|ncat|netcat|socat|sqlmap|ffuf|gobuster|feroxbuster|dirb|nikto|nuclei|hydra|medusa|ssh|scp|httpx|whatweb|wpscan|amass|subfinder|dnsx|dig|nslookup|ping|traceroute|tracert|msfconsole|crackmapexec|netexec|smbclient|Invoke-WebRequest|iwr|Test-NetConnection)(?:\.exe)?\b/i;
const FILE_EXT = /\.(?:txt|json|xml|csv|md|html?|py|js|cjs|sh|ps1|lst|log|ya?ml|conf|nse|gnmap|nmap)$/i;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

const ipToInt = (ip) => ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
function cidr(s) {
  const m = /^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const bits = m[2] === undefined ? 32 : Number(m[2]);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return { net: (ipToInt(m[1]) & mask) >>> 0, bits, mask };
}
function inScope(target, scope) {
  const t = target.toLowerCase();
  if (LOOPBACK.has(t)) return true;
  const tc = cidr(t);
  for (const raw of scope) {
    const s = String(raw).toLowerCase();
    const sc = cidr(s);
    if (tc && sc) { if (tc.bits >= sc.bits && ((tc.net & sc.mask) >>> 0) === sc.net) return true; continue; }
    if (tc || sc) continue;
    if (s.startsWith("*.") ? t.endsWith(s.slice(1)) : t === s) return true;
  }
  return false;
}
// Hosts, IPs, ranges and URL hosts in the part of the command after a network tool.
function targets(cmd) {
  const found = new Set();
  for (const part of cmd.split(/\s*(?:&&|\|\||;|\|)\s*/)) {
    const at = part.search(TOOLS);
    if (at < 0) continue;
    for (let tok of part.slice(at).split(/\s+/).slice(1)) {
      tok = tok.replace(/^['"]|['"]$/g, "");
      if (!tok || tok.startsWith("-")) continue;
      const url = /^[a-z][\w+.-]*:\/\/(?:[^@/]*@)?(\[[^\]]+\]|[^/:?#]+)/i.exec(tok);
      let host = url ? url[1].replace(/^\[|\]$/g, "") : tok.replace(/^[^@\s/]+@/, "").replace(/:[\w/.~-]*$/, "");
      if (/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?$/.test(host)) { found.add(host); continue; }
      if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}$/i.test(host) && !FILE_EXT.test(host)) found.add(host);
      else if (LOOPBACK.has(host.toLowerCase())) found.add(host);
    }
  }
  return [...found];
}
function block(why) {
  if (process.env.ALLOW_OUT_OF_SCOPE === "1") { record("guard-scope", "PreToolUse", "override"); process.exit(0); }
  record("guard-scope", "PreToolUse", "block");
  console.error(`Blocked: ${why}. Only targets in scope.json, inside its window, may be tested. If this target is authorized, add it to scope.json (that's the user's call), or restart the session with ALLOW_OUT_OF_SCOPE=1.`);
  process.exit(2);
}
let cmd = "";
try {
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  cmd = String((input.tool_input && input.tool_input.command) || "");
} catch { process.exit(0); }
if (!TOOLS.test(cmd)) process.exit(0);
let scope;
try { scope = JSON.parse(fs.readFileSync(path.join(ROOT, "scope.json"), "utf8")); } catch { block("there is no readable scope.json"); }
try {
  const today = new Date().toISOString().slice(0, 10);
  const w = scope.window || {};
  if ((w.start && today < w.start) || (w.end && today > w.end)) block(`today (${today}) is outside the engagement window`);
  if (/\b(?:nmap|masscan|naabu|rustscan|nuclei|httpx|dnsx|crackmapexec|netexec)\b[^|;&]*\s(?:-iL|-l|-list|--list|-tL|--input-file|-a)\s/i.test(` ${cmd} `)) {
    block("the targets come from a file this guard can't check; name them in the command");
  }
  const list = targets(cmd);
  const out = list.filter((t) => !inScope(t, scope.targets || []));
  if (out.length > 0) block(`${out.join(", ")} ${out.length === 1 ? "is" : "are"} not in scope`);
  if (list.length > 0) {
    const dir = path.join(ROOT, ".claude", "session-data");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "evidence.jsonl"), JSON.stringify({ ts: new Date().toISOString(), tool: (TOOLS.exec(cmd) || [""])[0], targets: list }) + "\n");
  }
  process.exit(0);
} catch {
  record("guard-scope", "PreToolUse", "fail-open");
  process.exit(0);
}
```

**3. Sandbox and scope agree.** The sandbox's `network.allowedDomains` lists the scope's
hostnames and wildcards; IP ranges can't go there, and the guard covers them.

**4. Findings stay contained.** A path-scoped rule for the findings folder: credentials,
tokens and personal data found while testing never go into commits (the secret scan backs
this up), the friction or evidence logs, or an unredacted report. Tooling meant for others
defaults to safe settings (rate limits on, destructive modules off).

**5. The reviewer.** One `security-tooling-reviewer` (Sonnet), in place of
`security-reviewer`: scope creep in code (a hard-coded target, a scan that follows
redirects off-scope), unsafe defaults in tools others run, findings or credentials leaking
into logs, output or commits.
