# EquationWright / Math Worksheet Builder

## 🌐 [Open EquationWright Website](https://steveonw.github.io/equationwright/)

**No GitHub account is required.** Open the link above to use EquationWright as a normal website in your browser.

A self-contained math worksheet and quiz generator covering the project’s 18 NVCC mathematics modes with deterministic generation, worked solutions, result export, independent audit tooling, and online/offline distributions.

## Current release: v7.3

Public website: https://steveonw.github.io/equationwright/

Current hosted artifacts:

- Online app: `Math_Worksheet_Builder_v7_3_0_FULL_CATALOG.html`
- Offline app: `Math_Worksheet_Builder_v7_3_0_FULL_CATALOG_OFFLINE.html`
- Complete package: `releases/v7.3/EquationWright_v7_3_FINAL_APPROVED.zip`
- User manual: `EquationWright_v7_3_Complete_User_Manual_with_Developer_Notes.pdf`
- Release notes: `README_v7_3.md`
- Audit report: `AUDIT_REPORT.md`

The root-level v7.3 app files are the public Pages copies of the approved release artifacts under `releases/v7.3/`.

## What the app does

- Covers 18 NVCC mathematics course modes and 81 units.
- Uses seeded deterministic problem generators so an assessment can be reproduced on the same compatible release.
- Supports worksheets and interactive quizzes.
- Provides worked solutions and labeled distractors for common mistakes.
- Exports student and class result data.
- Includes optional AI-tutor workflows while keeping the app itself responsible for generation and grading.
- Ships in online and fully offline variants.

## Repository layout

```text
.github/workflows/       GitHub Actions CI
archive/                 Legacy packages and historical documentation
chat/                    Local chat UI

docs/development/        Development planning documents
gateway/                 Local-AI tutor gateway, Windows executable, source, and chat UI
releases/v7.3/           Approved v7.3 release bundle, evidence, schemas, manifests
samples/                  Example result/blueprint data
scripts/                  Repository, build, and audit orchestration scripts
spikes/                   Historical integration/evidence work
tools/                    Utility scripts and packaged tools
vendor/                   Vendored offline dependencies

index.html                GitHub Pages landing page
Math_Worksheet_Builder_v7_3_0_FULL_CATALOG.html
Math_Worksheet_Builder_v7_3_0_FULL_CATALOG_OFFLINE.html
EquationWright_v7_3_Complete_User_Manual_with_Developer_Notes.pdf
README_v7_3.md            v7.3 release notes
AUDIT_REPORT.md           audit summary
SKILL.md                  quiz-tutor protocol
```

Older versioned HTML files remain at the repository root intentionally so previously shared assessment links can continue to resolve. Large historical ZIP packages are stored under `archive/releases/` instead of cluttering the root.

## Local AI gateway

The `gateway/` directory is an intentional end-user feature, not just build output. It includes the prebuilt Windows `tutor-gateway.exe` plus Go/Python source and the local chat UI.

The gateway can sit between EquationWright and a local OpenAI-compatible model backend such as Ollama, LM Studio, or llama-server. On Windows, `gateway/tutor-gateway.exe` is the no-install launcher; see `gateway/GATEWAY_HOWTO.md` for setup and LAN-use guidance.

## Development checks

Install audit dependencies:

```bash
python -m pip install -r requirements.txt
```

Run the repository inventory check:

```bash
python scripts/check_repo.py --allow-missing-generated
```

Run available audits:

```bash
python scripts/run_all_audits.py --allow-missing
```

Build the Go gateway:

```bash
cd gateway
go build ./...
```

The main GitHub Actions workflow runs compile/inventory/build checks on pushes and pull requests. Audit results are still produced, but the audit step is currently non-blocking so an audit finding does not make the entire repository CI job fail.

## Release organization

`releases/v7.3/` is the authoritative approved v7.3 package. It contains the two application variants plus release evidence, manifests, schemas, examples, the manual, checksums, and the packaged modular source.

The GitHub Pages landing page intentionally uses stable root-level copies of the current app/manual so the public URLs stay simple. Repository checks verify that those public files match the approved v7.3 release artifacts.

Historical ZIPs and release paperwork live under `archive/`. Git history still preserves every earlier location and revision.

## Reproducibility note

For assessment reproducibility, keep the app version/compatibility information together with any saved seed or blueprint. Older versioned HTML files are retained because deterministic output can depend on the release used to generate it.

## Documentation

- `EquationWright_v7_3_Complete_User_Manual_with_Developer_Notes.pdf` — full v7.3 manual
- `README_v7_3.md` — v7.3 protocol and release notes
- `AUDIT_REPORT.md` — audit summary
- `gateway/GATEWAY_HOWTO.md` — local AI gateway setup
- `CONTRIBUTING.md` — contributor guidance
- `SECURITY.md` — security notes

## License

See `LICENSE.md`, `LICENSE-APP.txt`, `LICENSE-GATEWAY.txt`, and `THIRD_PARTY_NOTICES.md`.

Copyright © 2026 Steveon William Walker.