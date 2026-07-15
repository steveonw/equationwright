# Contributing

1. Work from source files, not a generated offline release.
2. Give every generator a stable `key`, numeric `vec`, answer, and worked steps.
3. Add realistic distractors when a generator is used in quiz mode.
4. Run the in-app self-test with fixed seeds.
5. Export the audit corpora and run `python scripts/run_all_audits.py`.
6. Rebuild the standard and offline releases.
7. Do not include real student names, results, model files, or credentials.

Course changes should document the affected course, unit, learning outcome,
generator keys, test seeds, and faculty-review status.

## ⚠ Delivery warning — learned the hard way (July 2026)

**Never ask an AI chat to display a multi-file release inline.** A 17-file
MTH 288 release locked up the chat client that tried to render it. Chat UIs
are for conversation; they choke on bulk file dumps.

The rule: **AI sessions deliver archives (.zip), humans deliver archives back.**
One zip in, one zip out. Evidence files (audit summaries, corpora, harnesses)
belong in folders like spikes/<course>_evidence/ inside the archive — present,
inspectable, never rendered inline. If a session offers to "show all the
files," ask for the zip instead.
