---
paths:
  - "findings/**"
  - "report/**"
  - "internal/report/**"
---

# Findings and report handling

- Findings can contain client credentials, tokens, session cookies and personal data. Treat everything in `findings/` as sensitive client data.
- None of it goes into commits, `.claude/session-data/` logs, test fixtures or chat summaries. Quote the finding's template ID, host and severity, not the captured secret.
- The client report redacts secrets and personal data before rendering (keep a short prefix at most, e.g. `AKIA…`), and escapes all client-controlled text (response banners, titles, headers) before it reaches HTML or Markdown.
- Host names from the target become file names only after sanitizing (no path separators, no `..`).
- The evidence log records tool, target and time only; never request or response bodies.
