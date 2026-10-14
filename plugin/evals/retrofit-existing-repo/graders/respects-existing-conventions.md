---
type: llm
focus: { source: file, path: CLAUDE.md }
weight: 2
---

The repository already uses Jest for tests and ESLint with the airbnb-base config.

Check each condition. PASS only if all three hold; FAIL if any one doesn't.

1. The file names Jest as the test framework, or gives a test command that runs Jest
   (`jest`, `npx jest`, or `npm test` described as running Jest).
2. The file names ESLint as the linter (airbnb-base may or may not be mentioned).
3. The file never presents another test framework (pytest, vitest, mocha, ava, tap) or
   another linter (biome, standard, tslint) as this project's own.
