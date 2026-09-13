
# EquationWright Pass 4A schema index

All schemas use JSON Schema Draft 2020-12 and are normative for the Pass 4A contract.

- `equationwright-capabilities-v1.schema.json` — live engine/catalog/format/feature discovery.
- `equationwright-diagnostic-provenance-v1.schema.json` — optional per-item generator and MC provenance.
- `equationwright-blueprint-slim-v1.schema.json` — routine storage/share/settings replay.
- `equationwright-blueprint-archive-v1.schema.json` — explicit full archival replay package.
- `equationwright-replay-report-v1.schema.json` — exact/mismatch/incompatible replay result.
- `equationwright-curriculum-profile-v1.schema.json` — Generic/VCCS/custom course presentation and crosswalks.
- `equationwright-build-manifest-v1.schema.json` — deterministic source-module and output digest manifest.

JSON Schema validates structure. The main specification defines semantic checks that require the live capability manifest, including known IDs, exact count-key/unit-order equality, total limits, profile/catalog cross-references, and replay field comparison.
