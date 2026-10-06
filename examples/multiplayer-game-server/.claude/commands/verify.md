---
description: Build, vet, and domain-guard-scan the project; report READY or NOT READY.
---

Run these checks, in order, and stop at the first hard failure:

1. `go build ./...` -- must succeed. If `go` isn't installed, report that plainly as a
   skipped check, not a failure.
2. `go vet ./...` -- must be clean.
3. `go test ./...` -- must pass.
4. Grep `client/**/*.js` for stray `console.log` left in -- warn, don't fail, on a hit.
5. Grep `server/**` files under the trust-boundary paths (`hub`, `conn`, `protocol`,
   `handler`) for any obviously-missing validation on a freshly-read client field (this is
   a lightweight scan, not a substitute for actually invoking
   `state-integrity-reviewer` on real protocol changes).

Report a single plain verdict at the end: **READY** or **NOT READY**, with the specific
failing check(s) named if not ready. Don't soften a NOT READY into a maybe.
