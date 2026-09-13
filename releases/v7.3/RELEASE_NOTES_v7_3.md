# EquationWright v7.3 — Protocols, Replay, Profiles, and Modular Build

## Compatibility baseline

EquationWright v7.3 preserves the approved v7.2 assessed mathematics for the same normalized seed and authoritative assessment settings. The public `appVersion` changes to `v7.3_full_catalog_protocols`, while deterministic compatibility is represented separately by `assessmentCompatibilityId`.

Online and offline v7.3 distributions are packaging variants of the same assessment engine. They share the same `appVersion`, `assessmentCompatibilityId`, `catalogDigest`, and determinism protocol. The offline file is derived from the exact online build with pinned MathJax 3.2.2 inlined; `buildVariant` does not create a different assessment version.

## Routine blueprints now use slim v1

New routine blueprint saves, imports, share links, and locked links use `equationwright-blueprint-slim-v1`. The slim format stores normalized authoritative assessment settings, positive unit order/counts, restrictive unit-scoped topic filters, page settings, curriculum reference, and optional isolated delivery metadata. It intentionally does not contain generated picks, questions, answers, item seeds, diagnostics, or generated timestamps.

`UMWB_BLUEPRINT` remains readable as a legacy v7.2 import format. It is not the default v7.3 writer. An unknown blueprint major format is rejected rather than treated as legacy data.

## Archival replay is explicit

`equationwright-blueprint-archive-v1` is a separate explicit archival export for exact replay, debugging, bug reports, and long-term assessment evidence. It embeds one authoritative slim blueprint plus the ordered item snapshots and stable generator/distractor provenance needed for verification.

Two replay modes are intentionally distinct:

- `strict` requires the archive assessment compatibility fingerprint, determinism protocol, and catalog digest to match the running engine. An incompatible archive is refused; EquationWright does not silently downgrade it to seed-only replay.
- `verify-current` is an explicit cross-fingerprint diagnostic action. It reconstructs and compares the archive item by item. Exactness applies only to that archive and does not declare broad engine compatibility.

Replay reports separate assessed-math exactness from presentation exactness. Curriculum label differences can therefore be reported without claiming that the mathematical assessment changed.

## Diagnostic provenance is opt-in and local by default

`equationwright-diagnostic-provenance-v1` is an explicit advanced/debug export. Normal student result export remains lean. Diagnostic provenance is stripped from teacher/collector submission, class aggregation, and AI/provider transports, including help/follow-up requests and submission retry paths. It is retained only in deliberate local diagnostic-result and archival exports.

Diagnostics may contain stable generator identity, source runtime index, item/distractor seeds, topic identity, vector/parameter fingerprints, MC final-choice provenance, and output digests. They do not contain API keys, Authorization headers, submit URLs, learner aliases, class identity, provider responses, or transport errors.

## Stable catalog identity and assessment compatibility

All 424 published generator families have immutable IDs shaped as `ewg.<unit-id>.<published-ordinal>`. Runtime array position and returned `problem.key` are diagnostics, not long-lived generator identity. The build validates each published ID against its source registration and frozen per-unit runtime position so a reorder or reassignment fails before distribution artifacts are emitted.

`assessmentCompatibilityId` is computed from canonical determinism-critical build inputs, including deterministic core/engine modules, ordered module identity, and the stable generator registry identity. A determinism-critical source change therefore changes the compatibility ID even if a small output sample happens to match. CSS, help text, AI wording, curriculum labels, packaging, and MathJax are excluded from this assessment fingerprint.

## Curriculum profiles

v7.3 ships two built-in `equationwright-curriculum-profile-v1` profiles:

- `org.equationwright.generic`
- `edu.vccs.nvcc.math`

Profiles may group/order known units, provide labels/defaults, and define descriptive crosswalks. They cannot define generators, RNG behavior, answer validators, MC behavior, AI behavior, or mathematical content. Existing mode codes such as `CA`, `C2`, `DE`, and `MIX` remain migration aliases to profile courses.

Custom profiles are local JSON data and must validate completely before registration. Unknown units/topics, executable/HTML fields, duplicate legacy aliases, built-in identity collisions, and semantic-version changes that understate a major/minor profile change are rejected.

## Modular source, one-file releases

Development source is physically split into the approved 48-module classic-script build. End users still receive one online HTML file and one derived offline HTML file. `dist/` is generated and must not be hand edited. The deterministic Python build reads the checked-in module order, validates stable generator bindings, emits canonical online/offline artifacts, records input/output SHA-256 values, and verifies a second clean build is byte-identical.

## Migration notes for integrations

Integrations that previously wrote `UMWB_BLUEPRINT` may continue to import those objects, but should migrate writers to `equationwright-blueprint-slim-v1`. Integrations requiring long-term exact evidence should use explicit archival exports rather than assuming seed-only replay across assessment-incompatible engines. Capability discovery should use `equationwright-capabilities-v1` rather than scraping the application HTML, and generator integrations should store stable `generatorId` instead of runtime indexes or problem keys.

Consumers must reject unknown major public formats and unsupported `requiresExtensions`. Unknown optional data is allowed only under `extensions` as defined by each v1 schema.
