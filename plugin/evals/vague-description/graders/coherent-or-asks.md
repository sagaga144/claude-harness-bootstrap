---
type: llm
focus: trace
weight: 3
---

PASS if the response either (a) produces a coherent, internally-consistent,
placeholder-free harness built around one reasonable, clearly-stated assumption about
what kind of app this is, with that assumption clearly flagged as an assumption rather
than presented as a stated fact, or (b) asks one focused clarifying question about what
kind of app this is before proceeding.

FAIL if the response guesses wildly across many unstated specifics (stack, deploy target,
whether it has a database, etc.) while presenting them as facts with no flagged
assumption, produces literal unfilled template placeholders (e.g. "<real name from the
description>", "[bracket]", "TODO"), errors out without producing anything or asking
anything, or asks several clarifying questions in a row rather than proceeding.
