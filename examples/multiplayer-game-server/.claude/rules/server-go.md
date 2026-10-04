---
paths:
  - "server/**/*.go"
---

# Go server conventions

- `gofmt`-clean, errors wrapped with `%w` so callers can `errors.Is`/`errors.As`.
- Never `panic` inside anything reachable from a client connection or message handler — a
  malformed message from one player must never take the process (or other players) down.
  Recover at the connection boundary if you must, but prefer never panicking there at all.
- Anything read off an incoming client message (position, velocity, input flags, chosen
  name) is untrusted. Validate and clamp it before it touches shared game state — this is
  this project's actual trust boundary even though there's no login/auth concept.
- Shared state (the player map, the broadcast ticker, anything touched by more than one
  goroutine) must be protected by a mutex or owned by a single goroutine that others talk
  to only via channels. Don't let two goroutines read/write it raw.
- The broadcast loop's tick rate is a real correctness property, not just a performance
  knob — a stalled or drifting ticker desyncs every connected client at once. Treat timing
  bugs in the hub/broadcast loop with the same seriousness as a logic bug.
- Prefer table-driven tests (`go test ./...`) for anything with more than one input case.
