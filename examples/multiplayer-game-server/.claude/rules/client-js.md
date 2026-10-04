---
paths:
  - "client/**/*.js"
---

# Client JS conventions

- Plain ES modules, no framework, no dependencies, no bundler — the project brief is
  explicit about this. Don't introduce a `package.json`/npm dependency to solve something
  vanilla JS/canvas already does directly.
- One small, explicit app-state object rather than scattered globals.
- Render loop via `requestAnimationFrame`, not `setInterval` — decouple simulation/network
  tick rate from paint rate.
- Treat every value that arrives over the WebSocket as the server's authoritative truth for
  *other* players; your own player's position may be client-predicted for responsiveness,
  but must reconcile to what the server says, never the other way around.
- There is no type checker and no build step here at all — a typo'd property name or wrong
  message-shape assumption is only caught by actually opening the browser console. Don't
  treat "the code looks right" as verification; run it.
- Sweep `console.log` before considering a change done (the harness's PostToolUse hook will
  remind you, but don't rely on the reminder alone).
