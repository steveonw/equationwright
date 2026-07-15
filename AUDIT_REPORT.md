# Independent Math Audit — Math Worksheet Builder v7.0 Full Catalog

**Question asked:** are the answers on the worksheets actually right?

**Method:** an independent verifier. The app computes every answer with its own
JavaScript; this audit re-derived answers with **SymPy** (a symbolic mathematics
engine sharing no code with the app) and compared. Where both engines agree from
independent derivations, that is genuine verification — not review, not vibes.

## What was checked

- **1,005 problems sampled**: 5 seeded runs of every one of the 212 generator keys
  across all 30 units (CA / Trig / Precalc / Calc I–III).
- **Machine-verified: 113 instances across 24 generator families** — derivatives
  (power/product/quotient/chain/trig/exp-log/implicit/definition), limits
  (two-sided, one-sided piecewise, infinity), indefinite integrals (verified by
  differentiating the app's antiderivative), definite integrals, equation solving
  (linear/quadratic/radical/log/exponential, ±-form roots), continuity-k,
  log expansion, synthetic division (quotient·divisor+remainder ≡ dividend),
  FTC/Leibniz-rule, and more.
- **Hand-verified: ~23 further instances across 5 families** whose formats resisted
  automatic LaTeX parsing (unit-circle exact values, Leibniz-rule formulas, average
  values, partial derivatives) — every one checked directly against SymPy or by
  exact computation.

## Findings

**Zero mathematical errors.** Every checked answer was correct. Every apparent
mismatch traced to the audit's own parser, and was then resolved by hand — in the
app's favor each time.

**Two real display-layer defects found and fixed** (correct math, malformed text):

1. `ca_quad_formula` printed `x = \frac{--6 ± …}` when the quadratic's *b* was
   negative — "−b" rendered as literal `--6`. Fixed in the answer *and* the worked
   solution.
2. A **formatting sweep** of the whole corpus found ~40 generators emitting
   `a + -3`, `x - -3`, coefficient `1x`, exponent `e^{1x}`, or dead `0x` terms.
   Fixed centrally with identity-preserving cleanup in the string pipeline
   (guards protect `21x`, `\frac{1}{2}`, ordinals like `1st`, etc.), applied
   uniformly so multiple-choice keying stays consistent. Post-fix sweep: clean.

## Honest limits

- 869 of the 1,005 sampled instances were **not machine-checkable** by this
  harness: word problems, graph-reading questions, multi-part answers
  ("find the asymptotes and…"), and set-up-style answers have no single
  expression to compare. Sampled families among these were eyeballed; they are
  *not* systematically verified.
- 5 samples per generator verifies the *formula logic*, not every coefficient
  the RNG can produce. The generators are parameter-templates, so a correct
  formula is strong evidence — but not exhaustive proof.
- Style note (not an error): `c1_avg_value_*` prints rounded decimals
  (e.g. 5.667 for 17/3); exact fractions would suit a calculus course better.

## Reproduce it

`audit.py` (this folder) + the app: extract the corpus via the browser console
loop in the script header, `pip install sympy antlr4-python3-runtime==4.11`,
then `python audit.py`. Mismatches print for human triage — and the triage rule
matters: **verify the verifier before accusing the app.** Every mismatch in this
audit was the auditor's fault.

*Audit performed July 2026 against v6.3.6. The fixes it produced are in v6.3.6.*


## Addendum — MTH 266 Unit 1 (v6.4.1, July 2026)

The LA_Systems unit (12 new generators) was audited at build time with a dedicated
harness (`la_audit.py`): **72/72 sampled instances independently verified with
SymPy — every family, zero mismatches, zero unchecked.** Systems re-solved with
`sp.solve`, ranks recomputed with `Matrix.rank()`, the RREF answer re-verified with
`Matrix.rref()`, row operations and parametric solution sets re-derived symbolically.
The audit caught (and the build fixed) one fresh display defect — a degenerate
`0x`/missing-term row in the 3×3 disguise step — and one tidy-pipeline gap
(zero-term removal did not know the variable z). First unit in the bank with
100% machine-verified sampling.

## Addendum — MTH 267 Unit 1 (v6.5.0, July 2026)

DE_FirstOrder (12 generators) audited at build time (`de_audit.py`): **72/72
sampled instances independently verified — zero mismatches.** IVPs re-solved with
`sp.dsolve`, doubling time and half-life re-derived symbolically, Euler steps
recomputed with exact rationals, exactness re-tested via cross-partials,
equilibria via `solve`. Second consecutive unit at 100% machine-verified sampling.

## Addendum — MTH 261/262 (v6.6.0, July 2026)

Applied Calculus I & II (17 generators, 5 sections) audited at build time
(`ac_audit.py`): **102/102 sampled instances independently verified.** Marginals
re-differentiated, profit maxima and revenue-max prices re-solved, elasticities
recomputed as exact rationals, surpluses and present values re-integrated,
critical points and D-tests re-derived. Third consecutive build at 100%.

## Addendum — MTH 154 (v6.7.0, July 2026)

Quantitative Reasoning (14 generators, 4 sections: proportional reasoning,
financial literacy, logic & sets, linear modeling): **90/90 verified on the
first audit run — zero fixes required in app or auditor.** Truth tables and
argument forms recomputed in code; all arithmetic re-derived. Fourth
consecutive 100% build; first with no fix cycle at all.

## Addendum — MTH 246 (v6.8.0, July 2026)

Statistics II (14 generators, 4 sections) built without a distribution engine:
test statistics computed exactly, decisions made against critical values given
in each question (exam-style). **84/84 verified first run, zero fixes** — chi-square
statistics, expected counts, and dfs recomputed; F re-derived from mean squares;
predictions, residuals, and design/logic labels re-checked. Fifth consecutive
100% build; second with no fix cycle.

## Addendum — MTH 266 complete (v6.9.0, July 2026)

LA units 2-3 (13 generators: matrix algebra, inverses, determinants 2x2/3x3/
properties, eigenvalues/eigenvectors, characteristic polynomial, independence,
span dimension, trace-det from eigenvalues): **78/78 verified** — products,
inverses, determinants, eigenvalues, and ranks all recomputed with sympy.Matrix;
Av = λv checked directly. Both audit flags were checker bugs (a substring match:
"dependent" ⊂ "independent"). MTH 266 is the first fully complete post-expansion
course: 25 generators, 5 sections, 150/150 lifetime verified.

## Addendum — MTH 267 complete (v6.10.0, July 2026)

DE units 2-3 (12 generators: characteristic roots, general solutions for real/
repeated/complex roots, second-order IVPs, undetermined-coefficient forms,
spring-mass frequency, Laplace transforms/inverses/derivative rule/IVP setup):
**72/72 verified** — every solution substituted back into its ODE symbolically,
transforms recomputed with sympy.laplace_transform. All 10 audit flags were
checker artifacts (coefficient-1 elision by the display pipeline). One build-time
bug: an escaped apostrophe broke the script parse — caught by node --check,
fixed before any ship. MTH 267 complete: 24 generators, 5 sections,
144/144 lifetime verified.

## Addendum — MTH 133 (v6.11.0, July 2026)

Math for Health Professions (11 generators, 3 sections: conversions, dosage
calculations, IV rates & solutions): **66/66 verified first run, zero fixes.**
Every dose, drip rate, and dilution recomputed; the C1V1 = C2V2 identity checked
directly. Third build with no fix cycle. Traps encode the clinically dangerous
errors: flipped D/H, skipped percent conversion, missing ÷60 on drip rates.

## Addendum — Stats Engine (v6.12.0, July 2026)

The statistics engine (mw_stats_engine_v1: normal PDF/CDF/SF/interval/inverse,
descriptive stats via Welford, binomial PMF/CDF/SF, SciPy-audited t-table with
the 0.005 column, answer-capacity diagnostic) was designed by the project owner,
reviewed by a four-model AI panel across three critique rounds, coded to the
panel's consensus, and then **independently audited against SciPy**:
normal CDF max error 6.97e-8 over 1,001 points (spec 1e-6); inverse normal
2.03e-5 over p in [.001,.999]; all 165 t-table cells match scipy.stats.t.ppf to
3 decimals; 19/19 built-in smoke tests including a pinned regression test for
the binomial NaN guard. Re-verified in-app after integration: 19/19, full
self-test green. The audit script (stats_engine_audit.py) ships in the repo.

## Addendum — MTH 155 (v6.13.0, July 2026)

Statistical Reasoning (12 generators, 4 sections), the first course built on the
SciPy-audited stats engine: **72/72 verified against scipy.stats** (normal
probabilities to 4 decimals, sample SDs, CIs, means/medians recomputed with
numpy). The engine's own answer-capacity diagnostic caught a real defect at
build time — a constant-answer SD generator (distinct answers: 1 in 200) —
exactly the quiz-collision failure the review panel predicted; fixed before
ship (now 6 distinct patterns). One auditor bug (numpy bool_ vs the True
singleton). The honest gap stands documented: the outline's simulation and
statistical-software outcomes do not fit seeded multiple choice.

## Addendum — MTH 245 (v6.14.0, July 2026)

Statistics I (12 generators, 4 sections) on the stats engine: **72/72 verified
against scipy.stats** — binomial PMF/CDF, CLT probabilities, and t-intervals
(critical values cross-checked against scipy.t.ppf; dfs drawn only from
MW_T_SUPPORTED_DFS, so the table can never miss). The capacity diagnostic
flagged one constant-answer conceptual generator at build time; fixed. One audit flag was a checker bug — and one was **the first genuine mathematical
error in the audit program history**: a mean/SD parameter combo stating mu = 4
for n = 16, p = 0.5 (correct: 8). Caught by scipy before any student saw it,
fixed, re-verified 72/72. After ~1,000 verified instances, the independent
audit finally earned its existence in the most direct way possible.

## Addendum — MTH 283 (v6.15.0, July 2026)

Probability & Statistics, calculus-based (12 generators, 4 sections): **72/72
verified first run** — pdf constants and probabilities re-integrated with SymPy,
exponential/normal values against scipy.stats, CI critical value against
scipy.norm.ppf, least-squares and correlation recomputed. Capacity diagnostic
caught two thin generators pre-ship (four correlation combos all reduced to
r = 0.5). The stats trilogy (155, 245, 283) is complete on one engine.

## Addendum — MTH 288 complete (v6.17.0, July 2026)

Discrete Mathematics added 46 generators in six sections and introduced the
truth-sequence semantic answer type. Its independent corpus contains **9,200
records across 45 answer families, zero mismatches**. The full multiple-choice
pipeline completed 4,600 quiz runs with zero failures, including 200 semantic
truth-table runs. Whole-app structural regression at that release completed
10,915 runs with zero failures and zero determinism failures. Evidence is
archived under `spikes/mth288_evidence/`.

## Addendum — MTH 289 complete (v7.0.0, July 2026)

Differential Equations of Mathematical Physics adds **35 generators in seven
sections**: typed first-order IVP review, systems via eigenvalues, power-series
solutions, Fourier series, Laplace transforms II, PDE classification and
separation, and boundary-value eigenproblems.

The independent `de3_audit.py` re-derived **700/700 corpus records with zero
mismatches and zero unchecked records**. The typed DE-solution kernel separately
passed 17/17 self-tests and mutation testing: 816 valid separable/linear models
were accepted and numerically confirmed, while **2,448 deliberately corrupted
answers were all rejected**. Both typed first-order generator families produce
four unique quiz choices with exactly one semantically valid solution.

The v7.0 whole-app structural harness covered **81 units, 424 generators and
10,600 deterministic runs with zero failures and zero autofixes**. Numeric
generators met the answer-capacity requirement; narrowly ranged conceptual
classification generators are documented exceptions with rich labeled traps.
Across the course-audit suite, the catalog now carries **10,752 independently
verified records with zero mathematical mismatches**.

Automated checks do not certify visual layout. Final human acceptance remains:
open both editions in a real browser, print or save a worksheet as PDF, inspect
the mobile layout, replay a blueprint, and personally answer five MTH 289
questions.
