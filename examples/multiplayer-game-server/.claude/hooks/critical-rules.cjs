#!/usr/bin/env node
// SessionStart hook — prints the must-never-forget rules for this project.
// Always exits 0 (SessionStart hooks don't block); stdout is injected as context.

const RULES = `Arena — critical rules for this session:
1. The server is the only source of truth for game state. Never trust a client-sent
   position/velocity/name as fact — validate and clamp it server-side before use.
2. Never let a bad/malformed client message panic the server or take down other players'
   connections — one connection's bad input must stay isolated to that connection.
3. Guard every piece of state shared across goroutines (player map, broadcast ticker) with
   a mutex or a single-owner channel.
4. Never run "git push" or any deploy/release command yourself — the human does that.
5. Client has no build step and no type checker — don't assume "it compiled" proves
   anything about client-side JS; it wasn't checked at all.
6. Keep this session's model tier at Sonnet or below unless explicitly asked to escalate
   (Step 1's cost answer was "keep cost low").`;

process.stdout.write(RULES + "\n");
process.exit(0);
