# Input

**Project description given:**

> We're building a Go command-line tool for our security team's authorized external assessments: it enumerates a client's subdomains, probes which hosts are live with httpx, runs nuclei templates against them, and turns the results into a findings report for the client. Every engagement has a signed scope and a date window, and the tool must never touch anything outside it.

**Setup answers** (the run had no human attached, so it took the recommended default for both):

1. Cost vs. thoroughness: **Keep cost low** (recommended to start)
2. How much to build now: **Just the essentials for now** (recommended to start)

**Generated with:** harness-bootstrap v0.9.0 (commit `79cc342`), in a fresh empty folder, by
`scripts/generate-example.mjs` on Sonnet: a real Claude Code session (46 turns, about
$0.79) whose permission prompts were answered by a fixed policy (reads inside this
repository, writes only inside the project folder, no network or install commands) instead
of a person.

`CLAUDE.md`, `.claude/` and `scripts/` are copied as generated, with one edit: the
session ran before the plugin's version number was raised to 0.9.0, so its stamp
(`.claude/harness.json`) said `0.8.1`; that one field now reads `0.9.0`. Left out:
`.claude/session-data/` (the session's own test payloads and logs, which the harness's
`.gitignore` keeps out of git).

There is no `scope.json`: the setup asked for the authorized targets and dates instead of
inventing them, and until the file exists the scope guard blocks every network tool. Attack
suite on this harness: 13 of 18 attacks blocked by hooks, the same from a subfolder, 18 of
18 counting permission rules, every friction-log line clean. The one harmless command it
blocks is an in-scope scan, because no scope is filled in yet; with the reference example
`scope.json` added, it allows that scan and still blocks the out-of-scope one
([matrix](../../docs/baselines/hooks-v0.9.0.md)).
