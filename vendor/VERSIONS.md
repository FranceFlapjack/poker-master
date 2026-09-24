# Vendored libraries

| Library | Version | Licence | Files |
|---|---|---|---|
| marked | 18.0.12 | MIT | marked/marked.esm.js |

Update by `npm pack <lib>@<ver>` in a scratch folder and copying the same files.
The table (`js/table.js`), the rules (`js/engine/rules.js`) and every piece of poker maths under
`js/engine/` are our own; no poker library is vendored. That is deliberate — the drill verifier
(`scripts/verify-drills.mjs`) checks lesson answers against this engine, so the engine has to be
something we can reason about and fix, not a black box.
