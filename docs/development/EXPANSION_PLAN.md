# Expansion Plan v3 — The Final Leg (July 2026)

State: 14 courses live, 2 complete (266, 267), 636/636 expansion instances
independently verified, three consecutive zero-fix builds. What remains is the
hard 30%: three infrastructure problems and five courses. This plan turns each
infrastructure problem into a concrete design so the build sessions stay
one-sitting sized.

---

## Piece 1 — The Stats Engine (unlocks 155, 245, 283)

**What it is:** three self-contained additions to the app's math core, no
libraries, no lookups outside the file (protocol rule intact):

1. `mwNormCdf(z)` — standard normal CDF via the Abramowitz–Stegun erf
   approximation (7.1.26): five constants, one polynomial, max error ~1.5e-7.
   About 8 lines of JS.
2. `mwInvNorm(p)` — inverse normal by bisection over `mwNormCdf` on [-8, 8]
   to 1e-9. Slower than a rational approximation but trivially correct and
   auditable — the right trade for this project.
3. `MW_T_TABLE` — embedded critical t-values (df 1–30, 40, 60, inf x the four
   standard alpha levels). Tables are how the course itself works, they audit
   exactly, and they cost ~1 KB. Computing the t CDF is not worth its bugs.

**Engine definition of done (before ANY course generator is written):**
- `mwNormCdf` matches scipy.stats.norm.cdf within 1e-6 on a 1,000-point grid
- `mwInvNorm(mwNormCdf(z)) = z` round-trips within 1e-6
- every `MW_T_TABLE` entry matches scipy.stats.t.ppf to 3 decimals
- the audit harness for all three ships WITH the engine (scipy is the
  independent second mathematician here, same role SymPy has played)

**Course sessions on top of it:**
- **MTH 155 Statistical Reasoning** (~35 gens, 4 sections): descriptive stats
  (mean/median/SD with computation-friendly small sets), normal & z-scores +
  empirical rule, correlation/regression reading, inference interpretation
  (what a CI means, what a p-value is NOT). Honest gap, documented: the
  outline simulation/software outcomes do not fit seeded MC.
- **MTH 245 Statistics I** (~40 gens, 5 sections): probability rules, discrete
  & binomial distributions, sampling distributions/CLT, confidence intervals
  (z and t via the table), hypothesis tests with computed test statistics and
  table-based decisions. Shares every helper with 155 — fast follow.
- **MTH 283 Probability & Statistics** (~35 gens, 4 sections): continuous
  random variables via integration (the C2 integral machinery finally meets
  the stats engine), expectation/variance, CLT applications, least squares.
  The most mathematically satisfying course in the catalog.

## Piece 2 — New Answer Types (unlocks 288 Discrete)

**The finding from design review:** most discrete answers are already strings —
sets in roster notation {1, 2, 4, 8}, counts, big-O classes, congruence
values, valid/invalid labels. The MC pipeline handles those today. Only two
genuinely new shapes exist:

1. **Truth-table rows** — answer is a column of T/F values. Design: render as a
   monospace string "T F F T" (order fixed by the standard row ordering
   printed in the question). No renderer changes; the normalizer treats it as
   a string. Spike test: confirm dedupe does not collapse near-identical rows.
2. **Proof-step selection** — induction and direct proofs become "which step is
   valid/next," with the wrong steps as mistake-labeled traps (assuming the
   conclusion, off-by-one in the inductive hypothesis, unjustified quantifier
   swap). Pure string MC — the trap machinery was built for exactly this.

So "new answer types" collapses from an infrastructure project into a
**half-session spike**: one truth-table generator + one proof-step generator run
through the full quiz pipeline before the course build proper. If dedupe or the
normalizer chokes on either, fix at the buildMC choke point, re-run self-test.

**Course sessions:**
- **288 part 1** (~25 gens): logic (truth tables, equivalences, quantifier
  negation), sets (operations, power sets, Venn counts), counting (product
  rule, permutations, combinations, pigeonhole).
- **288 part 2** (~25 gens): relations (properties, equivalence), functions
  (injective/surjective), graphs (degrees, handshake lemma, Euler paths),
  induction-step selection, Boolean simplification, recurrences (iterate 3
  terms; solve linear homogeneous with the characteristic-root machinery
  already built for DE).

## Piece 3 — MTH 289 (the deliberately-last course)

The MC-fit problem dissolves the same way Stats II did: **ask for components,
not essays.** Five sections, ~35 gens:

- **Systems of DEs**: eigenvalue method on 2x2 (the LA_Eigen machinery is
  literally already in the file) — eigenvalues of the system matrix, match the
  general solution form, classify the equilibrium (node/saddle/spiral).
- **Series solutions**: recurrence relation from y'' = xy-style equations;
  first three nonzero terms given a0, a1.
- **Fourier series**: coefficients of standard square/sawtooth waves — exact
  forms like 4/(n pi); which harmonics vanish (odd/even function traps).
- **Transforms II**: shifts e^{at}f(t) <-> F(s-a), unit step u(t-c),
  transform of a piecewise signal.
- **PDEs & BVPs**: classify (heat/wave/Laplace), separation-of-variables setup
  (the ODE pair that falls out), boundary-value eigenvalues lambda_n = (n pi/L)^2.

Everything above is exact, integer-or-pi-clean, and SymPy re-derivable
(sympy.fourier_series, eigenvals, laplace_transform all exist — the audit
writes itself).

---

## The Sessions

| # | Session | Gate before it |
|---|---|---|
| 1 | Stats engine spike + scipy audit + **MTH 155** | EXPLORE: 8 untouched modes owe quizzes first |
| 2 | **MTH 245** | 155 used in real studying |
| 3 | **MTH 283** | — |
| 4 | Answer-type spike + **288 part 1** | EXPLORE |
| 5 | **288 part 2** | — |
| 6 | **MTH 289** | EXPLORE |
| 7 | Full-catalog audit sweep (re-run every harness end-to-end), README verification totals updated, tag **v7.0 "full catalog"** | — |

Seven sessions to a complete NVCC math catalog: 19 courses, ~810 generators at
the density actually achieved (105 gens / 5 courses so far beats the estimate).

## Standing rules (now with scars to prove them)
- node --check the injected JS before the browser ever loads (the apostrophe
  incident, v6.10.0).
- Coefficient-1 elision: the display pipeline is cleaner than your string
  checks expect — auditors compare VALUES, not strings, wherever possible.
- Verify the verifier: 25 of 27 lifetime audit flags were the auditor fault;
  the other 2 were display bugs. Zero math errors, ever. Keep it that way.
- Ship every session; explore between; a real user outranks everything.
- The last checkbox never automates: five questions, answered by you.
