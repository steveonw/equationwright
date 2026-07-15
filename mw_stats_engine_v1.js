/*
 * Math Worksheet Builder — Small Statistics Engine v1
 *
 * Design contract
 * ----------------
 * - Pure numerical helpers only: no HTML, TeX, course IDs, quiz logic, or RNG.
 * - Use full JavaScript Number precision internally.
 * - Round only when a generator constructs its displayed `a` or `steps` strings.
 * - Invalid numerical inputs return NaN.
 * - Unsupported discrete table lookups throw RangeError because they indicate
 *   a generator-programming error.
 * - Binomial helpers are intentionally limited to 0 <= n <= 100.
 * - The inverse-normal helper is intentionally limited to probabilities
 *   represented by mwNormCdf on the bracket [-8, 8].
 *
 * Paste this block after the existing general numeric helpers and before UNITS.
 */

// =======================================================
// Probability utilities
// =======================================================

function mwClampProbability(value){
  value = Number(value);
  if(!Number.isFinite(value)) return NaN;
  if(value <= 0) return 0;
  if(value >= 1) return 1;
  return value;
}

// Standard normal density φ(z).
function mwNormPdf(z){
  z = Number(z);
  if(Number.isNaN(z)) return NaN;
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

// Standard normal CDF Φ(z).
// Abramowitz–Stegun 7.1.26 error-function approximation.
function mwNormCdf(z){
  z = Number(z);

  if(Number.isNaN(z)) return NaN;
  if(z === Infinity) return 1;
  if(z === -Infinity) return 0;
  if(z === 0) return 0.5;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;

  const p  = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1 / (1 + p * x);
  const poly =
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t);

  const erf = sign * (1 - poly * Math.exp(-x * x));
  return mwClampProbability(0.5 * (1 + erf));
}

// Standard normal survival probability P(Z > z).
// This wrapper improves readability and avoids a separate `1 - cdf` operation.
// The A&S approximation still has limited relative accuracy in extreme tails.
function mwNormSf(z){
  return mwNormCdf(-Number(z));
}

// P(lower <= Z <= upper), with support for infinite endpoints.
function mwNormInterval(lower, upper){
  lower = Number(lower);
  upper = Number(upper);

  if(Number.isNaN(lower) ||
     Number.isNaN(upper) ||
     lower > upper){
    return NaN;
  }

  if(lower === upper) return 0;

  const value = lower >= 0
    ? mwNormSf(lower) - mwNormSf(upper)
    : mwNormCdf(upper) - mwNormCdf(lower);

  return mwClampProbability(value);
}

// Inverse standard normal CDF by bisection.
// Returns NaN instead of silently saturating when p is outside the supported
// CDF range of the fixed [-8, 8] bracket.
function mwInvNorm(p){
  p = Number(p);

  if(Number.isNaN(p) || p < 0 || p > 1) return NaN;
  if(p === 0) return -Infinity;
  if(p === 1) return Infinity;
  if(p === 0.5) return 0;

  let lo = -8;
  let hi = 8;

  const pLo = mwNormCdf(lo);
  const pHi = mwNormCdf(hi);

  if(p < pLo || p > pHi) return NaN;

  for(let i = 0; i < 60; i++){
    const mid = (lo + hi) / 2;

    if(mwNormCdf(mid) < p){
      lo = mid;
    }else{
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

// =======================================================
// Descriptive statistics
// =======================================================

// Arithmetic mean with compensated summation.
function mwMean(values){
  if(!Array.isArray(values) || values.length === 0) return NaN;

  let sum = 0;
  let correction = 0;

  for(const value of values){
    const x = Number(value);
    if(!Number.isFinite(x)) return NaN;

    const adjusted = x - correction;
    const next = sum + adjusted;
    correction = (next - sum) - adjusted;
    sum = next;
  }

  return sum / values.length;
}

// Median without mutating the caller's array.
function mwMedian(values){
  if(!Array.isArray(values) || values.length === 0) return NaN;

  const sorted = values.map(Number);
  if(sorted.some(x => !Number.isFinite(x))) return NaN;

  sorted.sort((a, b) => a - b);

  const n = sorted.length;
  const middle = Math.floor(n / 2);

  return n % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

// Numerically stable single-pass mean and sum of squared deviations.
function mwWelford(values){
  if(!Array.isArray(values)){
    return { count: 0, mean: NaN, m2: NaN };
  }

  let count = 0;
  let mean = 0;
  let m2 = 0;

  for(const value of values){
    const x = Number(value);

    if(!Number.isFinite(x)){
      return { count: 0, mean: NaN, m2: NaN };
    }

    count++;
    const delta = x - mean;
    mean += delta / count;
    const delta2 = x - mean;
    m2 += delta * delta2;
  }

  return { count, mean, m2 };
}

function mwPopulationVariance(values){
  if(!Array.isArray(values) || values.length === 0) return NaN;

  const result = mwWelford(values);
  return result.count > 0 ? result.m2 / result.count : NaN;
}

function mwPopulationSD(values){
  const variance = mwPopulationVariance(values);
  return Number.isFinite(variance) ? Math.sqrt(Math.max(0, variance)) : NaN;
}

function mwSampleVariance(values){
  if(!Array.isArray(values) || values.length < 2) return NaN;

  const result = mwWelford(values);
  return result.count >= 2 ? result.m2 / (result.count - 1) : NaN;
}

function mwSampleSD(values){
  const variance = mwSampleVariance(values);
  return Number.isFinite(variance) ? Math.sqrt(Math.max(0, variance)) : NaN;
}

function mwZScore(x, mean, sd){
  x = Number(x);
  mean = Number(mean);
  sd = Number(sd);

  if(!Number.isFinite(x) ||
     !Number.isFinite(mean) ||
     !Number.isFinite(sd) ||
     sd <= 0){
    return NaN;
  }

  return (x - mean) / sd;
}

// =======================================================
// Counting and binomial distribution
// =======================================================

// Exact while the result remains a safe JavaScript integer.
function mwFactorial(n){
  n = Number(n);

  if(!Number.isInteger(n) || n < 0 || n > 170) return NaN;

  let result = 1;
  for(let k = 2; k <= n; k++) result *= k;

  return result;
}

// Exact integer result only. Returns NaN beyond Number.MAX_SAFE_INTEGER.
function mwCombination(n, r){
  n = Number(n);
  r = Number(r);

  if(!Number.isInteger(n) ||
     !Number.isInteger(r) ||
     n < 0 ||
     r < 0 ||
     r > n){
    return NaN;
  }

  r = Math.min(r, n - r);

  let result = 1;
  for(let k = 1; k <= r; k++){
    result = result * (n - r + k) / k;
  }

  const rounded = Math.round(result);
  return Number.isSafeInteger(rounded) ? rounded : NaN;
}

// P(X = x) for X ~ Binomial(n, p).
// Intended and audited for integer 0 <= n <= 100.
function mwBinomialPmf(n, p, x){
  n = Number(n);
  p = Number(p);
  x = Number(x);

  if(!Number.isInteger(n) ||
     !Number.isInteger(x) ||
     n < 0 ||
     n > 100 ||
     x < 0 ||
     x > n ||
     !Number.isFinite(p) ||
     p < 0 ||
     p > 1){
    return NaN;
  }

  if(p === 0) return x === 0 ? 1 : 0;
  if(p === 1) return x === n ? 1 : 0;

  const r = Math.min(x, n - x);
  let coefficient = 1;

  for(let k = 1; k <= r; k++){
    coefficient *= (n - r + k) / k;
  }

  return mwClampProbability(
    coefficient *
    Math.pow(p, x) *
    Math.pow(1 - p, n - x)
  );
}

// P(X <= x) for X ~ Binomial(n, p).
function mwBinomialCdf(n, p, x){
  n = Number(n);
  p = Number(p);
  x = Number(x);

  if(!Number.isFinite(x)) return NaN;
  x = Math.floor(x);

  if(!Number.isInteger(n) ||
     n < 0 ||
     n > 100 ||
     !Number.isFinite(p) ||
     p < 0 ||
     p > 1){
    return NaN;
  }

  if(x < 0) return 0;
  if(x >= n) return 1;
  if(p === 0) return 1;
  if(p === 1) return 0;

  let term = Math.pow(1 - p, n); // P(X = 0)
  let total = term;

  for(let k = 0; k < x; k++){
    term *=
      ((n - k) / (k + 1)) *
      (p / (1 - p));

    total += term;
  }

  return mwClampProbability(total);
}

// P(X >= x) for X ~ Binomial(n, p).
function mwBinomialSf(n, p, x){
  n = Number(n);
  p = Number(p);
  x = Number(x);

  if(!Number.isFinite(x)) return NaN;
  x = Math.ceil(x);

  if(!Number.isInteger(n) ||
     n < 0 ||
     n > 100 ||
     !Number.isFinite(p) ||
     p < 0 ||
     p > 1){
    return NaN;
  }

  if(x <= 0) return 1;
  if(x > n) return 0;
  if(p === 0) return 0;
  if(p === 1) return 1;

  let term = Math.pow(p, n); // P(X = n)
  let total = term;

  for(let k = n; k > x; k--){
    term *=
      (k / (n - k + 1)) *
      ((1 - p) / p);

    total += term;
  }

  return mwClampProbability(total);
}

// =======================================================
// Student-t critical-value table
// Columns are RIGHT-TAIL probabilities.
// Values independently generated/audited with scipy.stats.t.ppf(1-alpha, df).
// =======================================================

const MW_T_RIGHT_TAIL_ALPHAS = Object.freeze([
  0.100, 0.050, 0.025, 0.010, 0.005
]);

const MW_T_SUPPORTED_DFS = Object.freeze([
   1,  2,  3,  4,  5,  6,  7,  8,  9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  40, 60
]);

const MW_T_TABLE = Object.freeze({
  1: Object.freeze({'0.100': 3.078, '0.050': 6.314, '0.025': 12.706, '0.010': 31.821, '0.005': 63.657}),
  2: Object.freeze({'0.100': 1.886, '0.050': 2.920, '0.025': 4.303, '0.010': 6.965, '0.005': 9.925}),
  3: Object.freeze({'0.100': 1.638, '0.050': 2.353, '0.025': 3.182, '0.010': 4.541, '0.005': 5.841}),
  4: Object.freeze({'0.100': 1.533, '0.050': 2.132, '0.025': 2.776, '0.010': 3.747, '0.005': 4.604}),
  5: Object.freeze({'0.100': 1.476, '0.050': 2.015, '0.025': 2.571, '0.010': 3.365, '0.005': 4.032}),
  6: Object.freeze({'0.100': 1.440, '0.050': 1.943, '0.025': 2.447, '0.010': 3.143, '0.005': 3.707}),
  7: Object.freeze({'0.100': 1.415, '0.050': 1.895, '0.025': 2.365, '0.010': 2.998, '0.005': 3.499}),
  8: Object.freeze({'0.100': 1.397, '0.050': 1.860, '0.025': 2.306, '0.010': 2.896, '0.005': 3.355}),
  9: Object.freeze({'0.100': 1.383, '0.050': 1.833, '0.025': 2.262, '0.010': 2.821, '0.005': 3.250}),
  10: Object.freeze({'0.100': 1.372, '0.050': 1.812, '0.025': 2.228, '0.010': 2.764, '0.005': 3.169}),
  11: Object.freeze({'0.100': 1.363, '0.050': 1.796, '0.025': 2.201, '0.010': 2.718, '0.005': 3.106}),
  12: Object.freeze({'0.100': 1.356, '0.050': 1.782, '0.025': 2.179, '0.010': 2.681, '0.005': 3.055}),
  13: Object.freeze({'0.100': 1.350, '0.050': 1.771, '0.025': 2.160, '0.010': 2.650, '0.005': 3.012}),
  14: Object.freeze({'0.100': 1.345, '0.050': 1.761, '0.025': 2.145, '0.010': 2.624, '0.005': 2.977}),
  15: Object.freeze({'0.100': 1.341, '0.050': 1.753, '0.025': 2.131, '0.010': 2.602, '0.005': 2.947}),
  16: Object.freeze({'0.100': 1.337, '0.050': 1.746, '0.025': 2.120, '0.010': 2.583, '0.005': 2.921}),
  17: Object.freeze({'0.100': 1.333, '0.050': 1.740, '0.025': 2.110, '0.010': 2.567, '0.005': 2.898}),
  18: Object.freeze({'0.100': 1.330, '0.050': 1.734, '0.025': 2.101, '0.010': 2.552, '0.005': 2.878}),
  19: Object.freeze({'0.100': 1.328, '0.050': 1.729, '0.025': 2.093, '0.010': 2.539, '0.005': 2.861}),
  20: Object.freeze({'0.100': 1.325, '0.050': 1.725, '0.025': 2.086, '0.010': 2.528, '0.005': 2.845}),
  21: Object.freeze({'0.100': 1.323, '0.050': 1.721, '0.025': 2.080, '0.010': 2.518, '0.005': 2.831}),
  22: Object.freeze({'0.100': 1.321, '0.050': 1.717, '0.025': 2.074, '0.010': 2.508, '0.005': 2.819}),
  23: Object.freeze({'0.100': 1.319, '0.050': 1.714, '0.025': 2.069, '0.010': 2.500, '0.005': 2.807}),
  24: Object.freeze({'0.100': 1.318, '0.050': 1.711, '0.025': 2.064, '0.010': 2.492, '0.005': 2.797}),
  25: Object.freeze({'0.100': 1.316, '0.050': 1.708, '0.025': 2.060, '0.010': 2.485, '0.005': 2.787}),
  26: Object.freeze({'0.100': 1.315, '0.050': 1.706, '0.025': 2.056, '0.010': 2.479, '0.005': 2.779}),
  27: Object.freeze({'0.100': 1.314, '0.050': 1.703, '0.025': 2.052, '0.010': 2.473, '0.005': 2.771}),
  28: Object.freeze({'0.100': 1.313, '0.050': 1.701, '0.025': 2.048, '0.010': 2.467, '0.005': 2.763}),
  29: Object.freeze({'0.100': 1.311, '0.050': 1.699, '0.025': 2.045, '0.010': 2.462, '0.005': 2.756}),
  30: Object.freeze({'0.100': 1.310, '0.050': 1.697, '0.025': 2.042, '0.010': 2.457, '0.005': 2.750}),
  40: Object.freeze({'0.100': 1.303, '0.050': 1.684, '0.025': 2.021, '0.010': 2.423, '0.005': 2.704}),
  60: Object.freeze({'0.100': 1.296, '0.050': 1.671, '0.025': 2.000, '0.010': 2.390, '0.005': 2.660}),
  inf: Object.freeze({'0.100': 1.282, '0.050': 1.645, '0.025': 1.960, '0.010': 2.326, '0.005': 2.576})
});

function mwTCrit(df, rightTailAlpha){
  let rowKey;

  if(df === Infinity || df === 'inf'){
    rowKey = 'inf';
  }else{
    const numericDf = Number(df);

    if(!Number.isInteger(numericDf) || numericDf < 1){
      throw new RangeError(`Invalid t degrees of freedom: ${df}`);
    }

    rowKey = String(numericDf);
  }

  const alpha = Number(rightTailAlpha);

  if(!Number.isFinite(alpha)){
    throw new RangeError(`Invalid t right-tail alpha: ${rightTailAlpha}`);
  }

  const alphaKey = alpha.toFixed(3);
  const row = MW_T_TABLE[rowKey];

  if(!row || row[alphaKey] == null){
    throw new RangeError(
      `Unsupported t lookup: df=${df}, rightTailAlpha=${rightTailAlpha}`
    );
  }

  return row[alphaKey];
}

// =======================================================
// Regression smoke tests
// =======================================================

function mwRunStatsSmokeTests(){
  const tests = [
    { name:'Phi(0)', got:mwNormCdf(0), expected:0.5, tolerance:1e-12 },
    { name:'Phi(1.96)', got:mwNormCdf(1.96), expected:0.9750021049, tolerance:5e-6 },
    { name:'Phi(-1.96)', got:mwNormCdf(-1.96), expected:0.0249978951, tolerance:5e-6 },
    { name:'CDF + SF', got:mwNormCdf(1.25) + mwNormSf(1.25), expected:1, tolerance:1e-12 },
    { name:'Normal symmetry', got:mwNormCdf(1.25) + mwNormCdf(-1.25), expected:1, tolerance:1e-12 },
    { name:'Normal interval', got:mwNormInterval(-1.96, 1.96), expected:0.9500042097, tolerance:1e-5 },
    { name:'InvNorm(0.975)', got:mwInvNorm(0.975), expected:1.9599639845, tolerance:1e-4 },
    { name:'Mean', got:mwMean([2,4,6,8]), expected:5, tolerance:1e-12 },
    { name:'Median odd', got:mwMedian([9,1,5]), expected:5, tolerance:0 },
    { name:'Median even', got:mwMedian([1,2,8,10]), expected:5, tolerance:0 },
    { name:'Population variance', got:mwPopulationVariance([1,2,3,4,5]), expected:2, tolerance:1e-12 },
    { name:'Sample variance', got:mwSampleVariance([1,2,3,4,5]), expected:2.5, tolerance:1e-12 },
    { name:'Combination 10 choose 3', got:mwCombination(10,3), expected:120, tolerance:0 },
    { name:'Binomial PMF', got:mwBinomialPmf(10,0.5,3), expected:0.1171875, tolerance:1e-12 },
    { name:'Binomial CDF', got:mwBinomialCdf(10,0.5,3), expected:0.171875, tolerance:1e-12 },
    { name:'Binomial SF', got:mwBinomialSf(10,0.5,7), expected:0.171875, tolerance:1e-12 },
    { name:'t critical df=10 alpha=.025', got:mwTCrit(10,0.025), expected:2.228, tolerance:0 },
    { name:'t critical infinity alpha=.005', got:mwTCrit(Infinity,0.005), expected:2.576, tolerance:0 }
  ];

  const results = tests.map(test => ({
    ...test,
    pass:
      Number.isFinite(test.got) &&
      Math.abs(test.got - test.expected) <= test.tolerance
  }));

  results.push({
    name: 'Binomial CDF rejects NaN x',
    got: mwBinomialCdf(10, 0.5, NaN),
    expected: NaN,
    tolerance: 0,
    pass: Number.isNaN(mwBinomialCdf(10, 0.5, NaN))
  });

  return {
    passed: results.filter(result => result.pass).length,
    failed: results.filter(result => !result.pass).length,
    results
  };
}

// =======================================================
// Optional app-level generator diagnostic
// Requires the builder's existing fnv1a() and xorshift32() helpers.
// It does not alter Quiz Mode.
// =======================================================

function mwAnswerCapacity(genFn, unitId, samples = 200){
  if(typeof genFn !== 'function') return { samples:0, distinct:0, errors:['Generator is not a function.'] };

  const answers = new Set();
  const errors = [];

  for(let i = 0; i < samples; i++){
    try{
      const seed = `stats-capacity|${unitId}|${genFn.name || 'anonymous'}|${i}`;
      const rng = xorshift32(fnv1a(seed));
      const problem = genFn(rng);

      if(problem && typeof problem.a === 'string'){
        answers.add(problem.a);
      }else{
        errors.push(`Sample ${i} returned no answer string.`);
      }
    }catch(error){
      errors.push(`Sample ${i}: ${error && error.message ? error.message : String(error)}`);
    }
  }

  return {
    samples,
    distinct: answers.size,
    errors
  };
}

// Conditional exports allow the same file to be audited under Node.
// They do nothing when this code is pasted into the browser HTML.
if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    mwClampProbability,
    mwNormPdf,
    mwNormCdf,
    mwNormSf,
    mwNormInterval,
    mwInvNorm,
    mwMean,
    mwMedian,
    mwWelford,
    mwPopulationVariance,
    mwPopulationSD,
    mwSampleVariance,
    mwSampleSD,
    mwZScore,
    mwFactorial,
    mwCombination,
    mwBinomialPmf,
    mwBinomialCdf,
    mwBinomialSf,
    MW_T_RIGHT_TAIL_ALPHAS,
    MW_T_SUPPORTED_DFS,
    MW_T_TABLE,
    mwTCrit,
    mwRunStatsSmokeTests
  };
}
