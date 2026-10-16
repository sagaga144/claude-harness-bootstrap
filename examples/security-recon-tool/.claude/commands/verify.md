---
description: Run the full gate (build, vet, format, race tests, scope-test check) and report READY or NOT READY
---

Run these in the project root and report the real output of each; do not summarize a failure away:

1. `go build ./...`
2. `go vet ./...`
3. `gofmt -l .` (any output is a failure)
4. `go test -race ./...`
5. Check that `internal/scope` has table-driven tests covering: an out-of-scope host, a wildcard match, a CNAME or redirect leaving scope, an expired window, a window not yet open, and an IP outside a CIDR entry. Missing cases make the verdict NOT READY.
6. `git status --short`: confirm nothing from `findings/` or `scope.json` is staged.

If Go isn't installed, say so plainly and mark the verdict NOT VERIFIED rather than READY. Never run the tool or any network tool against a real host as part of this.

End with one line: READY, NOT READY (with the failing step), or NOT VERIFIED.
