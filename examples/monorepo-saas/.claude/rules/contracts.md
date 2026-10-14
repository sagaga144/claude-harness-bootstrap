---
paths:
  - "contracts/**"
---

# contracts/ — the API's single source of truth

- Every request body, response body and error body the API exposes is defined here, once. Backend and frontend consume these definitions; neither redeclares them.
- Pick one naming convention on the wire (recommended: `camelCase`) and apply it through one mechanism, e.g. `#[serde(rename_all = "camelCase")]` on the Rust side. Never rename a single field ad hoc.
- Be explicit about optionality: absent field vs `null` vs empty are three different things. Prefer one.
- 64-bit integers: JS numbers lose precision above 2^53. Ids and money-as-minor-units that can exceed that go over the wire as strings.
- Money = integer minor units + ISO currency code. Timestamps = RFC 3339 UTC strings.
- Enums are closed string unions with stable values; adding a variant is a change the frontend must handle.
- A breaking change (remove/rename/retype a field) needs the backend and frontend updated in the same change set.
- If types are generated, edit the source, regenerate, and commit the output; never hand-edit generated files.
- No business logic in this package, and no secrets or server-only fields (password hashes, internal ids) in any type.
