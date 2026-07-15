# HANDOFF — Math Worksheet Builder: the v7.0 Integration Session

You are picking up a long-running project one session from completion. The user
is **Steveon William Walker**, NVCC student, owner and architect. Address him as
a peer; he communicates tersely ("on to 288") and his instincts are consistently
right. His casual ideas have repeatedly turned out to be correct professional
patterns — take them seriously.

## The three laws (never bend)
1. **The app does ALL math. The AI never does math** — it only reads labeled
   mistakes and prescribes practice.
2. **No accounts, no servers, one self-contained HTML file.** BYOK for AI.
3. **Versioned filenames are a permanent archive.** Never overwrite a shipped
   version; never ship a broken one — it lives forever.

## Current state (v6.17.0 — MTH 288 IS DONE)
- App files: Math_Worksheet_Builder_v6_17_0_MTH288.html (+ _OFFLINE edition),
  19 modes covering 17 of the 18 real NVCC catalog courses (MTH 166 = legacy
  duplicate, deliberately skipped). **MTH 288 Discrete is INTEGRATED and
  verified** — six DM_ units, truth-table answer type proven through the full
  quiz pipeline (9,200 audit records PASS, 4,600 quiz runs zero failures,
  10,915-run whole-app regression clean). Do NOT re-integrate it.
  Its evidence lives in spikes/mth288_evidence/.
- ~200+ generators, every expansion course independently audited:
  **13 course audits, all PASS (924 + 9,200 discrete records) in
  `scripts/run_all_audits.py`, exit 0**,
  plus per-course history in AUDIT_REPORT.md. Lifetime: exactly ONE real math
  error ever found (a binomial μ typo, caught by scipy) — everything else was
  auditor artifacts or display bugs. Keep that record.
- Stats engine (`mw_stats_engine_v1`) embedded: mwNormCdf/Sf/Interval, mwInvNorm,
  MW_T_TABLE + mwTCrit, mwBinomial*, descriptive stats, and
  **mwAnswerCapacity(genFn, unitId, 200)** — run it on EVERY new generator;
  require ≥4 distinct answers (conceptual gens with rich traps may pass at 2–3).
- Repo bundle = full open project: CI (.github/workflows), licenses (app =
  all-rights-reserved, gateway = MIT, © Steveon William Walker), scripts/
  (generate_audit_corpora.py, run_all_audits.py, check_repo.py,
  build_release.py), vendor/mathjax/tex-svg.js, samples, gateway, skill.

## YOUR MISSION: integrate MTH 289 (the LAST course) → ship v7.0 "full catalog"

MTH 288 is finished — the user's own AI panel integrated it externally and it
was verified and folded into this bundle. ONLY 289 remains.

The user will upload `repo_bundle.zip` (or point you at it). Inside:
- App: `Math_Worksheet_Builder_v6_17_0_MTH288.html` → copy to working dir as
  `app_fixed.html`.
- `spikes/mw_de_spike_v1.js` — MTH 289 typed DE-solution validator + generator
  factories. Standalone-verified: self-tests 17/17, and
  `spikes/audit_mw_de_spike.py` proved it by **mutation testing** (576 correct
  accepted + numerically confirmed; 2,448 mutated answers ALL rejected).
- `spikes/MTH289_coder_handoff.md` — **READ IT FIRST.** Its pre-integration
  host checks and acceptance checklist are the definition of done.
- Note: the user's panel may deliver a finished 289 release zip instead (that
  is how 288 arrived). If so, your job becomes VERIFY + FOLD IN: run its
  audits yourself, sort deliverables to bundle root, evidence to
  spikes/mth289_evidence/, register its audit in run_all_audits.py, update
  check_repo.py's version manifest, confirm exit 0.

### Integration order (if building 289 here)
1. Embed the kernel at the CUSTOM GENERATORS marker; adapt its generator
   families (separable/linear exist; add systems-via-eigenvalues — LA_Eigen
   machinery is already in the file — Fourier coefficients, transforms-II,
   PDE classify/BVP eigenvalues λₙ=(nπ/L)²). Its typed validator IS the
   answer checker. Sections-first, never mega-units.
2. Capacity check → self-test (scope: all) → corpus extraction
   **through fixTexEscapes** → independent audit (write `de3_audit.py`;
   sympy has fourier_series, laplace_transform, eigenvals; also run the
   spikes/audit_mw_de_spike.py mutation pattern) → browser + quiz pass.
3. **v7.0 finale**: bump appVersion; regenerate ALL corpora
   (`scripts/generate_audit_corpora.py --app <new>.html` — extend its registry
   AND run_all_audits.py's AUDITS list AND check_repo.py's version manifest);
   full `run_all_audits.py` must exit 0; both editions via
   `make_offline_build.py <file> mathjax/tex-svg.js` (tex-svg.js is in
   vendor/mathjax/); SKILL.md course rows; AUDIT_REPORT addendum; README totals;
   rezip bundle; present files.

## House format (exact)
```js
registerGen('UNIT_ID', (rng)=>({ q, a, steps:[...],
  traps:[{ans, why}, ...],            // mistake-labeled, 2 per gen minimum
  vec:[unitIndex('UNIT_ID'), genNum, ...params],  // vec[0] is VALIDATED
  key:'prefix_topic_detail' }));      // topics auto-derive from key parts
```
- UNITS entry: `{ course:'DM', id:'DM_Logic', label:'...', defaultCount:2 }`
  (unitsForMode filters by course automatically; add `<option>` to modeSelect).
- Helpers available: pick, mwNZ, fmtSigned, unitIndex, laMtx/laAug, fnv1a,
  xorshift32, the whole stats engine.

## THE SCARS (each cost a debugging cycle — do not repeat)
- The string `// ===== CUSTOM GENERATORS =====` appears TWICE (help text ~line
  872 + real JS ~3463+). Insert with the pattern
  `"\n// ===== CUSTOM GENERATORS =====\n"` and assert count == 1.
- **`node --check` the extracted main script BEFORE any browser test** (extract
  largest `<script>` block to a file). An escaped apostrophe once killed the
  whole app silently. Avoid `\'` inside single-quoted JS — use ’ or rephrase.
- The tidy pipeline elides coefficient-1 (`e^{1x}`→`e^{x}`, `1x`→`x`) and fixes
  signs (`+ -`→`- `). Corpora MUST be extracted through `fixTexEscapes`;
  auditors compare VALUES not strings wherever possible.
- **Verify the verifier.** ~30 audit flags lifetime; ~28 were the auditor's own
  bugs. Triage before accusing the app — but stay alert: the one real error
  (μ=4 vs 8) looked exactly like the false alarms.
- `np.bool_ is not True` — coerce `bool(ok)` in tally functions.
- `"dependent" in "linearly independent"` is True — never substring-match labels.
- bash tool calls that exceed ~150–280 s get killed; keep server+browser work in
  single timeout-wrapped python heredocs with the HTTP server as a daemon thread.
- pip needs `--break-system-packages`; sympy LaTeX parsing needs
  `antlr4-python3-runtime==4.11`; scipy/numpy for stats audits.

## Definition of done (per course — no exceptions)
- [ ] node --check clean → self-test 0 failures (all units)
- [ ] mwAnswerCapacity ≥ 4 distinct per numeric generator
- [ ] Independent audit: every family verified or hand-verified w/ note
- [ ] Browser worksheet + quiz pass (traps clickable, hints keyed)
- [ ] Handoff acceptance checklists satisfied (blueprint replay, print, mobile)
- [ ] Mode + SKILL.md + README rows; AUDIT_REPORT addendum
- [ ] Both editions shipped, run_all_audits exit 0, bundle rezipped, present_files
- [ ] The user personally answers five questions (his checkbox, not yours)


## ⚠ Delivery warning — learned the hard way (July 2026)

**Never ask an AI chat to display a multi-file release inline.** A 17-file
MTH 288 release locked up the chat client that tried to render it. Chat UIs
are for conversation; they choke on bulk file dumps.

The rule: **AI sessions deliver archives (.zip), humans deliver archives back.**
One zip in, one zip out. Evidence files (audit summaries, corpora, harnesses)
belong in folders like spikes/<course>_evidence/ inside the archive — present,
inspectable, never rendered inline. If a session offers to "show all the
files," ask for the zip instead.

## Tone notes
Ship every session. Explore-session debt is real (many modes still untouched by
human quizzes — remind him once, gently). A real user's bug outranks everything.
He calls you "professor" back sometimes; the project's origin was him asking
four AIs if his worksheet was slop — it wasn't, and everything since has been
about proving correctness independently. v7.0 closes the catalog: 18 real
courses, ~1,000 verified answers, his name on the license. Land it clean.
