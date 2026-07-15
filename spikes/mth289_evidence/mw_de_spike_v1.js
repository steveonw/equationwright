/*
 * Math Worksheet Builder — MTH 289 Differential Equations Spike v1
 *
 * Scope:
 * - Exact rational arithmetic.
 * - Two typed IVP families:
 *     1) y' = a x^n y, y(0) = y0
 *     2) y' + a y = b, y(0) = y0
 * - Typed canonical solution models.
 * - Exact family-specific validation.
 * - Deterministic numerical audit as defense in depth.
 * - Canary generator factories compatible with q/a/steps/vec/key.
 *
 * Non-goals:
 * - General CAS, parser, differentiator, simplifier, or ODE solver.
 */

const MW_DE_SCHEMA_VERSION = 1;

const MW_DE_FAMILIES = Object.freeze({
  separablePowerY: Object.freeze({
    code: 101,
    id: 'separable-power-y-v1',
    choiceFamily: 'de-v1:separable-exp-power'
  }),
  linearConstantForcing: Object.freeze({
    code: 201,
    id: 'linear-constant-forcing-v1',
    choiceFamily: 'de-v1:linear-equilibrium-exp'
  })
});

const MW_DE_AUDIT_POINTS = Object.freeze([
  -1.25,
  -0.7,
  0.31,
  0.83,
  1.4
]);

function mwGreatestCommonDivisor(left, right){
  let a = Math.abs(left);
  let b = Math.abs(right);

  while(b !== 0){
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

function mwRational(numerator, denominator = 1){
  if(
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    denominator === 0
  ){
    throw new RangeError('Invalid rational value.');
  }

  let n = numerator;
  let d = denominator;

  if(d < 0){
    n = -n;
    d = -d;
  }

  if(n === 0){
    return Object.freeze({
      numerator: 0,
      denominator: 1
    });
  }

  const divisor = mwGreatestCommonDivisor(n, d);

  return Object.freeze({
    numerator: n / divisor,
    denominator: d / divisor
  });
}

function mwValidateRational(value){
  if(
    !value ||
    typeof value !== 'object' ||
    !Number.isSafeInteger(value.numerator) ||
    !Number.isSafeInteger(value.denominator) ||
    value.denominator <= 0
  ){
    throw new TypeError('Invalid rational model.');
  }

  const normalized = mwRational(
    value.numerator,
    value.denominator
  );

  if(
    normalized.numerator !== value.numerator ||
    normalized.denominator !== value.denominator
  ){
    throw new TypeError('Rational model is not normalized.');
  }

  return true;
}

function mwRationalAdd(left, right){
  mwValidateRational(left);
  mwValidateRational(right);

  return mwRational(
    left.numerator * right.denominator +
      right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function mwRationalSubtract(left, right){
  return mwRationalAdd(
    left,
    mwRationalNegate(right)
  );
}

function mwRationalMultiply(left, right){
  mwValidateRational(left);
  mwValidateRational(right);

  return mwRational(
    left.numerator * right.numerator,
    left.denominator * right.denominator
  );
}

function mwRationalNegate(value){
  mwValidateRational(value);

  return mwRational(
    -value.numerator,
    value.denominator
  );
}

function mwRationalEqual(left, right){
  mwValidateRational(left);
  mwValidateRational(right);

  return (
    left.numerator === right.numerator &&
    left.denominator === right.denominator
  );
}

function mwRationalIsZero(value){
  mwValidateRational(value);
  return value.numerator === 0;
}

function mwRationalIsOne(value){
  mwValidateRational(value);
  return value.numerator === value.denominator;
}

function mwRationalIsNegativeOne(value){
  mwValidateRational(value);
  return value.numerator === -value.denominator;
}

function mwRationalToNumber(value){
  mwValidateRational(value);
  return value.numerator / value.denominator;
}

function mwRationalKey(value){
  mwValidateRational(value);
  return `${value.numerator}/${value.denominator}`;
}

function mwRenderRational(value){
  mwValidateRational(value);

  if(value.denominator === 1){
    return String(value.numerator);
  }

  const sign = value.numerator < 0 ? '-' : '';
  const absoluteNumerator = Math.abs(value.numerator);

  return (
    `${sign}\\frac{${absoluteNumerator}}` +
    `{${value.denominator}}`
  );
}

function mwValidateVariableName(name){
  if(
    typeof name !== 'string' ||
    !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)
  ){
    throw new TypeError(
      `Invalid variable name: ${String(name)}`
    );
  }

  return true;
}

function mwCloneRational(value){
  mwValidateRational(value);
  return mwRational(value.numerator, value.denominator);
}

function mwCreateInitialCondition(
  independentValue,
  dependentValue
){
  mwValidateRational(independentValue);
  mwValidateRational(dependentValue);

  return {
    type: 'initial-value',
    independentValue:
      mwCloneRational(independentValue),
    dependentValue:
      mwCloneRational(dependentValue)
  };
}

function mwCreateSeparablePowerQuestion({
  a,
  n,
  y0,
  independentVariable = 'x',
  dependentVariable = 'y'
}){
  mwValidateRational(a);
  mwValidateRational(y0);
  mwValidateVariableName(independentVariable);
  mwValidateVariableName(dependentVariable);

  if(!Number.isSafeInteger(n) || n < 0 || n > 12){
    throw new RangeError(
      'Separable exponent n must be an integer from 0 through 12.'
    );
  }

  if(mwRationalIsZero(a)){
    throw new RangeError(
      'Separable coefficient a must be nonzero.'
    );
  }

  return {
    schemaVersion: MW_DE_SCHEMA_VERSION,
    type: 'de-ivp',
    family: MW_DE_FAMILIES.separablePowerY.id,
    independentVariable,
    dependentVariable,
    parameters: {
      a: mwCloneRational(a),
      n
    },
    condition: mwCreateInitialCondition(
      mwRational(0),
      y0
    ),
    requestedForm: 'explicit',
    domain: {
      type: 'all-real'
    }
  };
}

function mwCreateLinearConstantQuestion({
  a,
  b,
  y0,
  independentVariable = 'x',
  dependentVariable = 'y',
  teachingMethod = 'integrating-factor'
}){
  mwValidateRational(a);
  mwValidateRational(b);
  mwValidateRational(y0);
  mwValidateVariableName(independentVariable);
  mwValidateVariableName(dependentVariable);

  if(mwRationalIsZero(a)){
    throw new RangeError(
      'Linear coefficient a must be nonzero.'
    );
  }

  return {
    schemaVersion: MW_DE_SCHEMA_VERSION,
    type: 'de-ivp',
    family:
      MW_DE_FAMILIES.linearConstantForcing.id,
    independentVariable,
    dependentVariable,
    parameters: {
      a: mwCloneRational(a),
      b: mwCloneRational(b)
    },
    condition: mwCreateInitialCondition(
      mwRational(0),
      y0
    ),
    requestedForm: 'explicit',
    teachingMethod,
    domain: {
      type: 'all-real'
    }
  };
}

function mwValidateDEQuestionModel(question){
  if(
    !question ||
    typeof question !== 'object' ||
    question.schemaVersion !==
      MW_DE_SCHEMA_VERSION ||
    question.type !== 'de-ivp'
  ){
    throw new TypeError(
      'Invalid differential-equation question model.'
    );
  }

  mwValidateVariableName(
    question.independentVariable
  );

  mwValidateVariableName(
    question.dependentVariable
  );

  if(
    !question.condition ||
    question.condition.type !==
      'initial-value'
  ){
    throw new TypeError(
      'An initial-value condition is required.'
    );
  }

  mwValidateRational(
    question.condition.independentValue
  );

  mwValidateRational(
    question.condition.dependentValue
  );

  if(
    !mwRationalIsZero(
      question.condition.independentValue
    )
  ){
    throw new RangeError(
      'The v1 spike supports only initial point 0.'
    );
  }

  if(
    !question.domain ||
    question.domain.type !== 'all-real'
  ){
    throw new TypeError(
      'The v1 spike supports only all-real domains.'
    );
  }

  if(
    question.family ===
    MW_DE_FAMILIES.separablePowerY.id
  ){
    mwValidateRational(question.parameters.a);

    if(
      mwRationalIsZero(
        question.parameters.a
      ) ||
      !Number.isSafeInteger(
        question.parameters.n
      ) ||
      question.parameters.n < 0
    ){
      throw new TypeError(
        'Invalid separable question parameters.'
      );
    }

    return true;
  }

  if(
    question.family ===
    MW_DE_FAMILIES.linearConstantForcing.id
  ){
    mwValidateRational(question.parameters.a);
    mwValidateRational(question.parameters.b);

    if(
      mwRationalIsZero(
        question.parameters.a
      )
    ){
      throw new TypeError(
        'Invalid linear question parameters.'
      );
    }

    return true;
  }

  throw new RangeError(
    `Unsupported DE family: ${String(question.family)}`
  );
}

function mwCreateExpPowerSolution({
  amplitude,
  exponentCoefficient,
  exponentPower
}){
  mwValidateRational(amplitude);
  mwValidateRational(exponentCoefficient);

  if(
    !Number.isSafeInteger(exponentPower) ||
    exponentPower < 1
  ){
    throw new RangeError(
      'Exponent power must be a positive integer.'
    );
  }

  return {
    schemaVersion: MW_DE_SCHEMA_VERSION,
    type: 'exp-power',
    amplitude: mwCloneRational(amplitude),
    exponentCoefficient:
      mwCloneRational(exponentCoefficient),
    exponentPower
  };
}

function mwCreateEquilibriumExpSolution({
  equilibrium,
  transient,
  rate
}){
  mwValidateRational(equilibrium);
  mwValidateRational(transient);
  mwValidateRational(rate);

  return {
    schemaVersion: MW_DE_SCHEMA_VERSION,
    type: 'equilibrium-plus-exponential',
    equilibrium: mwCloneRational(equilibrium),
    transient: mwCloneRational(transient),
    rate: mwCloneRational(rate)
  };
}

function mwValidateDESolutionModel(solution){
  if(
    !solution ||
    typeof solution !== 'object' ||
    solution.schemaVersion !==
      MW_DE_SCHEMA_VERSION
  ){
    throw new TypeError(
      'Invalid differential-equation solution model.'
    );
  }

  if(solution.type === 'exp-power'){
    mwValidateRational(solution.amplitude);
    mwValidateRational(
      solution.exponentCoefficient
    );

    if(
      !Number.isSafeInteger(
        solution.exponentPower
      ) ||
      solution.exponentPower < 1
    ){
      throw new TypeError(
        'Invalid exp-power solution.'
      );
    }

    return true;
  }

  if(
    solution.type ===
    'equilibrium-plus-exponential'
  ){
    mwValidateRational(solution.equilibrium);
    mwValidateRational(solution.transient);
    mwValidateRational(solution.rate);
    return true;
  }

  throw new RangeError(
    `Unsupported DE solution type: ${String(solution.type)}`
  );
}

function mwDESolveQuestion(question){
  mwValidateDEQuestionModel(question);

  if(
    question.family ===
    MW_DE_FAMILIES.separablePowerY.id
  ){
    const exponentPower =
      question.parameters.n + 1;

    const exponentCoefficient =
      mwRational(
        question.parameters.a.numerator,
        question.parameters.a.denominator *
          exponentPower
      );

    return mwCreateExpPowerSolution({
      amplitude:
        question.condition.dependentValue,
      exponentCoefficient,
      exponentPower
    });
  }

  if(
    question.family ===
    MW_DE_FAMILIES.linearConstantForcing.id
  ){
    const a = question.parameters.a;
    const b = question.parameters.b;

    const equilibrium = mwRational(
      b.numerator * a.denominator,
      b.denominator * a.numerator
    );

    const transient = mwRationalSubtract(
      question.condition.dependentValue,
      equilibrium
    );

    return mwCreateEquilibriumExpSolution({
      equilibrium,
      transient,
      rate: mwRationalNegate(a)
    });
  }

  throw new RangeError(
    `No solver recipe for ${question.family}.`
  );
}

function mwDEVerificationReport({
  status,
  modelValid,
  familyCompatible,
  equationSatisfied,
  conditionsSatisfied,
  domainValid,
  requestedFormSatisfied,
  method,
  details = {}
}){
  return {
    status,
    modelValid,
    familyCompatible,
    equationSatisfied,
    conditionsSatisfied,
    domainValid,
    requestedFormSatisfied,
    method,
    details
  };
}

function mwDECheckSeparablePowerIVP(
  question,
  candidate
){
  try{
    mwValidateDEQuestionModel(question);
    mwValidateDESolutionModel(candidate);
  }catch(error){
    return mwDEVerificationReport({
      status: 'fail',
      modelValid: false,
      familyCompatible: false,
      equationSatisfied: false,
      conditionsSatisfied: false,
      domainValid: false,
      requestedFormSatisfied: false,
      method: 'exact-family-identity',
      details: {
        reason: error.message
      }
    });
  }

  const familyCompatible =
    question.family ===
      MW_DE_FAMILIES.separablePowerY.id &&
    candidate.type === 'exp-power';

  if(!familyCompatible){
    return mwDEVerificationReport({
      status: 'fail',
      modelValid: true,
      familyCompatible: false,
      equationSatisfied: false,
      conditionsSatisfied: false,
      domainValid: true,
      requestedFormSatisfied: false,
      method: 'exact-family-identity',
      details: {
        reason: 'family-or-solution-type-mismatch'
      }
    });
  }

  const expectedPower =
    question.parameters.n + 1;

  const equationSatisfied =
    candidate.exponentPower ===
      expectedPower &&
    mwRationalEqual(
      mwRationalMultiply(
        candidate.exponentCoefficient,
        mwRational(
          candidate.exponentPower
        )
      ),
      question.parameters.a
    );

  const conditionsSatisfied =
    mwRationalEqual(
      candidate.amplitude,
      question.condition.dependentValue
    );

  const requestedFormSatisfied = true;
  const domainValid = true;

  return mwDEVerificationReport({
    status:
      equationSatisfied &&
      conditionsSatisfied &&
      requestedFormSatisfied &&
      domainValid
        ? 'pass'
        : 'fail',
    modelValid: true,
    familyCompatible: true,
    equationSatisfied,
    conditionsSatisfied,
    domainValid,
    requestedFormSatisfied,
    method: 'exact-family-identity'
  });
}

function mwDECheckLinearConstantIVP(
  question,
  candidate
){
  try{
    mwValidateDEQuestionModel(question);
    mwValidateDESolutionModel(candidate);
  }catch(error){
    return mwDEVerificationReport({
      status: 'fail',
      modelValid: false,
      familyCompatible: false,
      equationSatisfied: false,
      conditionsSatisfied: false,
      domainValid: false,
      requestedFormSatisfied: false,
      method: 'exact-family-identity',
      details: {
        reason: error.message
      }
    });
  }

  const familyCompatible =
    question.family ===
      MW_DE_FAMILIES.linearConstantForcing.id &&
    candidate.type ===
      'equilibrium-plus-exponential';

  if(!familyCompatible){
    return mwDEVerificationReport({
      status: 'fail',
      modelValid: true,
      familyCompatible: false,
      equationSatisfied: false,
      conditionsSatisfied: false,
      domainValid: true,
      requestedFormSatisfied: false,
      method: 'exact-family-identity',
      details: {
        reason: 'family-or-solution-type-mismatch'
      }
    });
  }

  const equationSatisfied =
    mwRationalEqual(
      candidate.rate,
      mwRationalNegate(
        question.parameters.a
      )
    ) &&
    mwRationalEqual(
      mwRationalMultiply(
        question.parameters.a,
        candidate.equilibrium
      ),
      question.parameters.b
    );

  const conditionsSatisfied =
    mwRationalEqual(
      mwRationalAdd(
        candidate.equilibrium,
        candidate.transient
      ),
      question.condition.dependentValue
    );

  const requestedFormSatisfied = true;
  const domainValid = true;

  return mwDEVerificationReport({
    status:
      equationSatisfied &&
      conditionsSatisfied &&
      requestedFormSatisfied &&
      domainValid
        ? 'pass'
        : 'fail',
    modelValid: true,
    familyCompatible: true,
    equationSatisfied,
    conditionsSatisfied,
    domainValid,
    requestedFormSatisfied,
    method: 'exact-family-identity'
  });
}

function mwDEVerifySolution(question, candidate){
  mwValidateDEQuestionModel(question);

  if(
    question.family ===
    MW_DE_FAMILIES.separablePowerY.id
  ){
    return mwDECheckSeparablePowerIVP(
      question,
      candidate
    );
  }

  if(
    question.family ===
    MW_DE_FAMILIES.linearConstantForcing.id
  ){
    return mwDECheckLinearConstantIVP(
      question,
      candidate
    );
  }

  return mwDEVerificationReport({
    status: 'inconclusive',
    modelValid: false,
    familyCompatible: false,
    equationSatisfied: false,
    conditionsSatisfied: false,
    domainValid: false,
    requestedFormSatisfied: false,
    method: 'unsupported-family',
    details: {
      reason: question.family
    }
  });
}

function mwNearlyEqual(
  left,
  right,
  absoluteTolerance = 1e-10,
  relativeTolerance = 1e-9
){
  if(
    !Number.isFinite(left) ||
    !Number.isFinite(right)
  ){
    return false;
  }

  const difference = Math.abs(left - right);
  const scale = Math.max(
    1,
    Math.abs(left),
    Math.abs(right)
  );

  return (
    difference <=
      absoluteTolerance +
      relativeTolerance * scale
  );
}

function mwDEEvaluateSolution(solution, x){
  mwValidateDESolutionModel(solution);

  if(!Number.isFinite(x)){
    throw new TypeError(
      'Evaluation point must be finite.'
    );
  }

  if(solution.type === 'exp-power'){
    const amplitude =
      mwRationalToNumber(solution.amplitude);

    const coefficient =
      mwRationalToNumber(
        solution.exponentCoefficient
      );

    return amplitude * Math.exp(
      coefficient *
      Math.pow(x, solution.exponentPower)
    );
  }

  const equilibrium =
    mwRationalToNumber(solution.equilibrium);

  const transient =
    mwRationalToNumber(solution.transient);

  const rate =
    mwRationalToNumber(solution.rate);

  return (
    equilibrium +
    transient * Math.exp(rate * x)
  );
}

function mwDEEvaluateDerivative(solution, x){
  mwValidateDESolutionModel(solution);

  if(solution.type === 'exp-power'){
    const y = mwDEEvaluateSolution(
      solution,
      x
    );

    const coefficient =
      mwRationalToNumber(
        solution.exponentCoefficient
      );

    return (
      y *
      coefficient *
      solution.exponentPower *
      Math.pow(
        x,
        solution.exponentPower - 1
      )
    );
  }

  const transient =
    mwRationalToNumber(solution.transient);

  const rate =
    mwRationalToNumber(solution.rate);

  return (
    transient *
    rate *
    Math.exp(rate * x)
  );
}

function mwDENumericAudit(
  question,
  solution,
  points = MW_DE_AUDIT_POINTS
){
  mwValidateDEQuestionModel(question);
  mwValidateDESolutionModel(solution);

  const failures = [];

  for(const x of points){
    const y = mwDEEvaluateSolution(
      solution,
      x
    );

    const derivative =
      mwDEEvaluateDerivative(
        solution,
        x
      );

    let left;
    let right;

    if(
      question.family ===
      MW_DE_FAMILIES.separablePowerY.id
    ){
      left = derivative;

      right =
        mwRationalToNumber(
          question.parameters.a
        ) *
        Math.pow(
          x,
          question.parameters.n
        ) *
        y;
    }else{
      left =
        derivative +
        mwRationalToNumber(
          question.parameters.a
        ) *
        y;

      right =
        mwRationalToNumber(
          question.parameters.b
        );
    }

    if(!mwNearlyEqual(left, right)){
      failures.push({
        x,
        left,
        right,
        difference: Math.abs(left - right)
      });
    }
  }

  const initialX =
    mwRationalToNumber(
      question.condition.independentValue
    );

  const initialExpected =
    mwRationalToNumber(
      question.condition.dependentValue
    );

  const initialActual =
    mwDEEvaluateSolution(
      solution,
      initialX
    );

  const initialConditionPassed =
    mwNearlyEqual(
      initialActual,
      initialExpected
    );

  return {
    status:
      failures.length === 0 &&
      initialConditionPassed
        ? 'pass'
        : 'fail',
    method: 'deterministic-numeric-audit',
    points: [...points],
    residualFailures: failures,
    initialConditionPassed,
    initialActual,
    initialExpected
  };
}

function mwRenderMonomial(
  coefficient,
  variable,
  power
){
  mwValidateRational(coefficient);
  mwValidateVariableName(variable);

  if(
    !Number.isSafeInteger(power) ||
    power < 0
  ){
    throw new RangeError(
      'Monomial power must be nonnegative.'
    );
  }

  const variablePart =
    power === 0
      ? ''
      : power === 1
        ? variable
        : `${variable}^{${power}}`;

  if(!variablePart){
    return mwRenderRational(coefficient);
  }

  if(mwRationalIsOne(coefficient)){
    return variablePart;
  }

  if(mwRationalIsNegativeOne(coefficient)){
    return `-${variablePart}`;
  }

  return (
    `${mwRenderRational(coefficient)}` +
    `${variablePart}`
  );
}

function mwRenderExponentTerm(
  coefficient,
  variable,
  power
){
  return mwRenderMonomial(
    coefficient,
    variable,
    power
  );
}

function mwRenderExpPowerSolution(
  solution,
  dependentVariable = 'y',
  independentVariable = 'x'
){
  mwValidateDESolutionModel(solution);

  if(solution.type !== 'exp-power'){
    throw new TypeError(
      'Expected exp-power solution.'
    );
  }

  const exponent = mwRenderExponentTerm(
    solution.exponentCoefficient,
    independentVariable,
    solution.exponentPower
  );

  let leading;

  if(mwRationalIsOne(solution.amplitude)){
    leading = '';
  }else if(
    mwRationalIsNegativeOne(
      solution.amplitude
    )
  ){
    leading = '-';
  }else{
    leading =
      mwRenderRational(
        solution.amplitude
      );
  }

  return (
    `${dependentVariable}=` +
    `${leading}e^{${exponent}}`
  );
}

function mwRenderLinearSolution(
  solution,
  dependentVariable = 'y',
  independentVariable = 'x'
){
  mwValidateDESolutionModel(solution);

  if(
    solution.type !==
    'equilibrium-plus-exponential'
  ){
    throw new TypeError(
      'Expected equilibrium-plus-exponential solution.'
    );
  }

  const equilibrium =
    solution.equilibrium;

  const transient =
    solution.transient;

  const exponent = mwRenderMonomial(
    solution.rate,
    independentVariable,
    1
  );

  let exponentialTerm;

  if(mwRationalIsOne(transient)){
    exponentialTerm = `e^{${exponent}}`;
  }else if(
    mwRationalIsNegativeOne(transient)
  ){
    exponentialTerm = `-e^{${exponent}}`;
  }else{
    exponentialTerm =
      `${mwRenderRational(transient)}` +
      `e^{${exponent}}`;
  }

  if(mwRationalIsZero(equilibrium)){
    return (
      `${dependentVariable}=` +
      `${exponentialTerm}`
    );
  }

  const equilibriumText =
    mwRenderRational(equilibrium);

  if(transient.numerator < 0){
    const positiveTransient =
      mwRational(
        -transient.numerator,
        transient.denominator
      );

    const positiveTerm =
      mwRationalIsOne(positiveTransient)
        ? `e^{${exponent}}`
        : `${mwRenderRational(positiveTransient)}` +
          `e^{${exponent}}`;

    return (
      `${dependentVariable}=` +
      `${equilibriumText}-${positiveTerm}`
    );
  }

  return (
    `${dependentVariable}=` +
    `${equilibriumText}+${exponentialTerm}`
  );
}

function mwRenderDESolution(
  question,
  solution
){
  mwValidateDEQuestionModel(question);
  mwValidateDESolutionModel(solution);

  if(solution.type === 'exp-power'){
    return mwRenderExpPowerSolution(
      solution,
      question.dependentVariable,
      question.independentVariable
    );
  }

  return mwRenderLinearSolution(
    solution,
    question.dependentVariable,
    question.independentVariable
  );
}

function mwRenderSeparableQuestion(question){
  mwValidateDEQuestionModel(question);

  const x = question.independentVariable;
  const y = question.dependentVariable;
  const a = question.parameters.a;
  const n = question.parameters.n;
  const y0 =
    question.condition.dependentValue;

  let rightSide;

  if(n === 0){
    if(mwRationalIsOne(a)){
      rightSide = y;
    }else if(mwRationalIsNegativeOne(a)){
      rightSide = `-${y}`;
    }else{
      rightSide =
        `${mwRenderRational(a)}${y}`;
    }
  }else{
    const xPart =
      n === 1 ? x : `${x}^{${n}}`;

    if(mwRationalIsOne(a)){
      rightSide = `${xPart}${y}`;
    }else if(mwRationalIsNegativeOne(a)){
      rightSide = `-${xPart}${y}`;
    }else{
      rightSide =
        `${mwRenderRational(a)}` +
        `${xPart}${y}`;
    }
  }

  return (
    `Solve the initial-value problem ` +
    `\\(\\frac{d${y}}{d${x}}=` +
    `${rightSide},\\quad ` +
    `${y}(0)=${mwRenderRational(y0)}\\).`
  );
}

function mwRenderLinearQuestion(question){
  mwValidateDEQuestionModel(question);

  const x = question.independentVariable;
  const y = question.dependentVariable;
  const a = question.parameters.a;
  const b = question.parameters.b;
  const y0 =
    question.condition.dependentValue;

  let leftSide = `${y}'`;

  if(a.numerator > 0){
    if(mwRationalIsOne(a)){
      leftSide += `+${y}`;
    }else{
      leftSide +=
        `+${mwRenderRational(a)}${y}`;
    }
  }else{
    const positiveA = mwRational(
      -a.numerator,
      a.denominator
    );

    if(mwRationalIsOne(positiveA)){
      leftSide += `-${y}`;
    }else{
      leftSide +=
        `-${mwRenderRational(positiveA)}${y}`;
    }
  }

  return (
    `Solve the initial-value problem ` +
    `\\(${leftSide}=` +
    `${mwRenderRational(b)},\\quad ` +
    `${y}(0)=${mwRenderRational(y0)}\\).`
  );
}

function mwRenderDEQuestion(question){
  mwValidateDEQuestionModel(question);

  if(
    question.family ===
    MW_DE_FAMILIES.separablePowerY.id
  ){
    return mwRenderSeparableQuestion(
      question
    );
  }

  return mwRenderLinearQuestion(
    question
  );
}

function mwBuildSeparableSteps(
  question,
  solution
){
  const x = question.independentVariable;
  const y = question.dependentVariable;
  const a = question.parameters.a;
  const n = question.parameters.n;
  const exponentPower =
    solution.exponentPower;
  const exponentCoefficient =
    solution.exponentCoefficient;
  const y0 =
    question.condition.dependentValue;

  const xPower =
    n === 0
      ? ''
      : n === 1
        ? x
        : `${x}^{${n}}`;

  const rightIntegral =
    mwRenderExponentTerm(
      exponentCoefficient,
      x,
      exponentPower
    );

  return [
    `Separate variables: ` +
      `\\(\\frac{1}{${y}}\\,d${y}=` +
      `${mwRenderRational(a)}` +
      `${xPower}\\,d${x}\\).`,

    `Integrate: ` +
      `\\(\\ln|${y}|=` +
      `${rightIntegral}+C_1\\).`,

    `Exponentiate and absorb the sign into the constant: ` +
      `\\(${y}=C_2e^{${rightIntegral}}\\).`,

    `Use \\(${y}(0)=${mwRenderRational(y0)}\\), ` +
      `so \\(C_2=${mwRenderRational(y0)}\\).`,

    `Therefore, ` +
      `\\(${mwRenderDESolution(question, solution)}\\).`,

    `Check: the exact identities are ` +
      `\\(m=n+1\\), \\(Cm=a\\), and ` +
      `\\(A=${mwRenderRational(y0)}\\).`
  ];
}

function mwBuildLinearSteps(
  question,
  solution
){
  const x = question.independentVariable;
  const y = question.dependentVariable;
  const a = question.parameters.a;
  const b = question.parameters.b;
  const y0 =
    question.condition.dependentValue;
  const equilibrium =
    solution.equilibrium;
  const transient =
    solution.transient;

  const ax = mwRenderMonomial(a, x, 1);
  const minusAx = mwRenderMonomial(
    mwRationalNegate(a),
    x,
    1
  );

  return [
    `The integrating factor is ` +
      `\\(\\mu(${x})=e^{${ax}}\\).`,

    `After multiplication, ` +
      `\\(\\left(e^{${ax}}${y}\\right)'=` +
      `${mwRenderRational(b)}e^{${ax}}\\).`,

    `Integrate: ` +
      `\\(e^{${ax}}${y}=` +
      `${mwRenderRational(equilibrium)}` +
      `e^{${ax}}+C\\).`,

    `Thus ` +
      `\\(${y}=${mwRenderRational(equilibrium)}` +
      `+Ce^{${minusAx}}\\).`,

    `Use \\(${y}(0)=${mwRenderRational(y0)}\\), ` +
      `giving \\(C=${mwRenderRational(transient)}\\).`,

    `Therefore, ` +
      `\\(${mwRenderDESolution(question, solution)}\\).`,

    `Check: \\(K=-a\\), \\(aE=b\\), and ` +
      `\\(E+T=${mwRenderRational(y0)}\\).`
  ];
}

function mwBuildDESteps(
  question,
  solution
){
  mwValidateDEQuestionModel(question);
  mwValidateDESolutionModel(solution);

  if(
    question.family ===
    MW_DE_FAMILIES.separablePowerY.id
  ){
    return mwBuildSeparableSteps(
      question,
      solution
    );
  }

  return mwBuildLinearSteps(
    question,
    solution
  );
}

function mwDESolutionKey(solution){
  mwValidateDESolutionModel(solution);

  if(solution.type === 'exp-power'){
    return [
      'de-answer-v1',
      'exp-power',
      mwRationalKey(solution.amplitude),
      mwRationalKey(
        solution.exponentCoefficient
      ),
      String(solution.exponentPower)
    ].join(':');
  }

  return [
    'de-answer-v1',
    'equilibrium-exp',
    mwRationalKey(solution.equilibrium),
    mwRationalKey(solution.transient),
    mwRationalKey(solution.rate)
  ].join(':');
}

function mwDEChoiceFamily(question){
  mwValidateDEQuestionModel(question);

  if(
    question.family ===
    MW_DE_FAMILIES.separablePowerY.id
  ){
    return (
      MW_DE_FAMILIES.separablePowerY
        .choiceFamily
    );
  }

  return (
    MW_DE_FAMILIES.linearConstantForcing
      .choiceFamily
  );
}

function mwBuildDEAnswerSpec(
  question,
  solution
){
  return {
    schemaVersion: MW_DE_SCHEMA_VERSION,
    type: 'de-explicit-solution',
    validatorId: 'de-solution-v1',
    model: solution,
    key: mwDESolutionKey(solution),
    choiceFamily:
      mwDEChoiceFamily(question),
    choiceCapacity: 256
  };
}

function mwDECountCorrectChoices(
  retainedProblem,
  candidateProblems
){
  const question =
    retainedProblem?.deSpec?.questionModel ||
    retainedProblem?.questionModel;

  return candidateProblems.filter(problem => {
    const solution =
      problem?.answerSpec?.model ||
      problem?.answerModel;

    if(!solution) return false;

    return (
      mwDEVerifySolution(
        question,
        solution
      ).status === 'pass'
    );
  }).length;
}

function mwPickRequired(rng, values, pickFn){
  if(typeof pickFn !== 'function'){
    throw new TypeError(
      'A seeded pick function is required.'
    );
  }

  return pickFn(rng, values);
}

const MW_DE_SEPARABLE_N_POOL =
  Object.freeze([0, 1, 2, 3]);

const MW_DE_MULTIPLIER_POOL =
  Object.freeze([-3, -2, -1, 1, 2, 3]);

const MW_DE_Y0_POOL =
  Object.freeze([
    -5, -4, -3, -2, -1,
    1, 2, 3, 4, 5
  ]);

const MW_DE_LINEAR_A_POOL =
  Object.freeze([-4, -3, -2, -1, 1, 2, 3, 4]);

const MW_DE_EQUILIBRIUM_POOL =
  Object.freeze([-4, -3, -2, -1, 0, 1, 2, 3, 4]);

const MW_DE_TRANSIENT_POOL =
  Object.freeze([-4, -3, -2, -1, 1, 2, 3, 4]);

function mwCreateSeparableIVPGenerator({
  unitId,
  pickFn,
  unitIndexFn,
  generatorKey =
    'd289_separable_power_ivp_v1'
}){
  if(
    typeof unitId !== 'string' ||
    !unitId
  ){
    throw new TypeError('unitId is required.');
  }

  if(typeof unitIndexFn !== 'function'){
    throw new TypeError(
      'unitIndexFn is required.'
    );
  }

  return function genD289SeparableIVP(rng){
    const n = mwPickRequired(
      rng,
      MW_DE_SEPARABLE_N_POOL,
      pickFn
    );

    const multiplier = mwPickRequired(
      rng,
      MW_DE_MULTIPLIER_POOL,
      pickFn
    );

    const y0Integer = mwPickRequired(
      rng,
      MW_DE_Y0_POOL,
      pickFn
    );

    const a = mwRational(
      multiplier * (n + 1)
    );

    const question =
      mwCreateSeparablePowerQuestion({
        a,
        n,
        y0: mwRational(y0Integer)
      });

    const solution =
      mwDESolveQuestion(question);

    const exactReport =
      mwDEVerifySolution(
        question,
        solution
      );

    const numericAudit =
      mwDENumericAudit(
        question,
        solution
      );

    if(
      exactReport.status !== 'pass' ||
      numericAudit.status !== 'pass'
    ){
      throw new Error(
        'Generated separable solution failed verification.'
      );
    }

    const answerSpec =
      mwBuildDEAnswerSpec(
        question,
        solution
      );

    const deSpec = {
      schemaVersion: MW_DE_SCHEMA_VERSION,
      familyId:
        MW_DE_FAMILIES.separablePowerY.id,
      familyCode:
        MW_DE_FAMILIES.separablePowerY.code,
      questionModel: question,
      verification: {
        exact: exactReport,
        numericAudit
      }
    };

    return {
      q: mwRenderDEQuestion(question),
      a:
        `\\(${mwRenderDESolution(
          question,
          solution
        )}\\)`,
      steps:
        mwBuildDESteps(
          question,
          solution
        ),
      vec: [
        unitIndexFn(unitId),
        MW_DE_FAMILIES
          .separablePowerY.code,
        a.numerator,
        a.denominator,
        n,
        y0Integer
      ],
      key: generatorKey,
      answerSpec,
      deSpec,

      // Temporary compatibility aliases.
      answerKey: answerSpec.key,
      choiceFamily:
        answerSpec.choiceFamily,
      choiceCapacity:
        answerSpec.choiceCapacity,
      answerModel:
        answerSpec.model,
      questionModel: question
    };
  };
}

function mwCreateLinearIVPGenerator({
  unitId,
  pickFn,
  unitIndexFn,
  generatorKey =
    'd289_linear_constant_ivp_v1'
}){
  if(
    typeof unitId !== 'string' ||
    !unitId
  ){
    throw new TypeError('unitId is required.');
  }

  if(typeof unitIndexFn !== 'function'){
    throw new TypeError(
      'unitIndexFn is required.'
    );
  }

  return function genD289LinearIVP(rng){
    const aInteger = mwPickRequired(
      rng,
      MW_DE_LINEAR_A_POOL,
      pickFn
    );

    const equilibriumInteger =
      mwPickRequired(
        rng,
        MW_DE_EQUILIBRIUM_POOL,
        pickFn
      );

    const transientInteger =
      mwPickRequired(
        rng,
        MW_DE_TRANSIENT_POOL,
        pickFn
      );

    const a = mwRational(aInteger);
    const equilibrium =
      mwRational(equilibriumInteger);
    const transient =
      mwRational(transientInteger);

    const b = mwRationalMultiply(
      a,
      equilibrium
    );

    const y0 = mwRationalAdd(
      equilibrium,
      transient
    );

    const question =
      mwCreateLinearConstantQuestion({
        a,
        b,
        y0
      });

    const solution =
      mwDESolveQuestion(question);

    const exactReport =
      mwDEVerifySolution(
        question,
        solution
      );

    const numericAudit =
      mwDENumericAudit(
        question,
        solution
      );

    if(
      exactReport.status !== 'pass' ||
      numericAudit.status !== 'pass'
    ){
      throw new Error(
        'Generated linear solution failed verification.'
      );
    }

    const answerSpec =
      mwBuildDEAnswerSpec(
        question,
        solution
      );

    const deSpec = {
      schemaVersion: MW_DE_SCHEMA_VERSION,
      familyId:
        MW_DE_FAMILIES
          .linearConstantForcing.id,
      familyCode:
        MW_DE_FAMILIES
          .linearConstantForcing.code,
      questionModel: question,
      verification: {
        exact: exactReport,
        numericAudit
      }
    };

    return {
      q: mwRenderDEQuestion(question),
      a:
        `\\(${mwRenderDESolution(
          question,
          solution
        )}\\)`,
      steps:
        mwBuildDESteps(
          question,
          solution
        ),
      vec: [
        unitIndexFn(unitId),
        MW_DE_FAMILIES
          .linearConstantForcing.code,
        a.numerator,
        a.denominator,
        b.numerator,
        b.denominator,
        y0.numerator,
        y0.denominator
      ],
      key: generatorKey,
      answerSpec,
      deSpec,

      // Temporary compatibility aliases.
      answerKey: answerSpec.key,
      choiceFamily:
        answerSpec.choiceFamily,
      choiceCapacity:
        answerSpec.choiceCapacity,
      answerModel:
        answerSpec.model,
      questionModel: question
    };
  };
}

function mwRunDESpikeSelfTests(){
  const results = [];

  function check(name, run){
    try{
      const pass = run() === true;

      results.push({
        name,
        pass,
        detail: pass
          ? ''
          : 'returned false'
      });
    }catch(error){
      results.push({
        name,
        pass: false,
        detail:
          error && error.message
            ? error.message
            : String(error)
      });
    }
  }

  check('Rational normalization', () => {
    const value = mwRational(-6, -8);

    return (
      value.numerator === 3 &&
      value.denominator === 4
    );
  });

  check('Rational arithmetic', () => {
    const left = mwRational(1, 2);
    const right = mwRational(1, 3);

    return (
      mwRationalEqual(
        mwRationalAdd(left, right),
        mwRational(5, 6)
      ) &&
      mwRationalEqual(
        mwRationalMultiply(left, right),
        mwRational(1, 6)
      )
    );
  });

  const separableQuestion =
    mwCreateSeparablePowerQuestion({
      a: mwRational(4),
      n: 3,
      y0: mwRational(5)
    });

  const separableSolution =
    mwDESolveQuestion(
      separableQuestion
    );

  check('Separable solution construction', () =>
    separableSolution.type ===
      'exp-power' &&
    mwRationalEqual(
      separableSolution.amplitude,
      mwRational(5)
    ) &&
    mwRationalEqual(
      separableSolution
        .exponentCoefficient,
      mwRational(1)
    ) &&
    separableSolution.exponentPower === 4
  );

  check('Separable exact verification', () =>
    mwDEVerifySolution(
      separableQuestion,
      separableSolution
    ).status === 'pass'
  );

  check('Separable numeric audit', () =>
    mwDENumericAudit(
      separableQuestion,
      separableSolution
    ).status === 'pass'
  );

  check('Separable mutation rejection', () => {
    const mutations = [
      {
        ...separableSolution,
        amplitude: mwRational(6)
      },
      {
        ...separableSolution,
        exponentCoefficient:
          mwRational(2)
      },
      {
        ...separableSolution,
        exponentPower: 3
      }
    ];

    return mutations.every(
      candidate =>
        mwDEVerifySolution(
          separableQuestion,
          candidate
        ).status === 'fail'
    );
  });

  const linearQuestion =
    mwCreateLinearConstantQuestion({
      a: mwRational(2),
      b: mwRational(6),
      y0: mwRational(1)
    });

  const linearSolution =
    mwDESolveQuestion(
      linearQuestion
    );

  check('Linear solution construction', () =>
    linearSolution.type ===
      'equilibrium-plus-exponential' &&
    mwRationalEqual(
      linearSolution.equilibrium,
      mwRational(3)
    ) &&
    mwRationalEqual(
      linearSolution.transient,
      mwRational(-2)
    ) &&
    mwRationalEqual(
      linearSolution.rate,
      mwRational(-2)
    )
  );

  check('Linear exact verification', () =>
    mwDEVerifySolution(
      linearQuestion,
      linearSolution
    ).status === 'pass'
  );

  check('Linear numeric audit', () =>
    mwDENumericAudit(
      linearQuestion,
      linearSolution
    ).status === 'pass'
  );

  check('Linear mutation rejection', () => {
    const mutations = [
      {
        ...linearSolution,
        equilibrium: mwRational(4)
      },
      {
        ...linearSolution,
        transient: mwRational(-3)
      },
      {
        ...linearSolution,
        rate: mwRational(-1)
      }
    ];

    return mutations.every(
      candidate =>
        mwDEVerifySolution(
          linearQuestion,
          candidate
        ).status === 'fail'
    );
  });

  check('Canonical rendering', () =>
    mwRenderDESolution(
      separableQuestion,
      separableSolution
    ) === 'y=5e^{x^{4}}' &&
    mwRenderDESolution(
      linearQuestion,
      linearSolution
    ) === 'y=3-2e^{-2x}'
  );

  function makeRng(seed){
    let state = seed >>> 0;

    return function next(){
      state =
        (1664525 * state +
          1013904223) >>> 0;

      return state / 4294967296;
    };
  }

  function localPick(rng, values){
    return values[
      Math.floor(rng() * values.length)
    ];
  }

  const unitIndexFn = unitId =>
    unitId === 'D289_Separable'
      ? 1
      : 2;

  const genSeparable =
    mwCreateSeparableIVPGenerator({
      unitId: 'D289_Separable',
      pickFn: localPick,
      unitIndexFn
    });

  const genLinear =
    mwCreateLinearIVPGenerator({
      unitId:
        'D289_LinearFirstOrder',
      pickFn: localPick,
      unitIndexFn
    });

  check('Separable generator deterministic', () =>
    JSON.stringify(
      genSeparable(makeRng(12345))
    ) ===
    JSON.stringify(
      genSeparable(makeRng(12345))
    )
  );

  check('Linear generator deterministic', () =>
    JSON.stringify(
      genLinear(makeRng(54321))
    ) ===
    JSON.stringify(
      genLinear(makeRng(54321))
    )
  );

  check('Generator vec values numeric', () =>
    [
      genSeparable(makeRng(1)),
      genLinear(makeRng(2))
    ].every(problem =>
      problem.vec.every(value =>
        typeof value === 'number' &&
        Number.isFinite(value)
      )
    )
  );

  function collectDistinct(
    generator,
    retainedSeed
  ){
    const retained =
      generator(
        makeRng(retainedSeed)
      );

    const choices = [retained];

    for(
      let seed = retainedSeed + 1;
      seed < retainedSeed + 1000 &&
      choices.length < 4;
      seed++
    ){
      const candidate =
        generator(makeRng(seed));

      if(
        candidate.choiceFamily ===
          retained.choiceFamily &&
        !choices.some(
          existing =>
            existing.answerKey ===
            candidate.answerKey
        ) &&
        !choices.some(
          existing =>
            existing.a === candidate.a
        ) &&
        mwDEVerifySolution(
          retained.deSpec.questionModel,
          candidate.answerSpec.model
        ).status !== 'pass'
      ){
        choices.push(candidate);
      }
    }

    return {
      retained,
      choices
    };
  }

  check(
    'Separable exact-one-correct choices',
    () => {
      const set = collectDistinct(
        genSeparable,
        100
      );

      return (
        set.choices.length === 4 &&
        mwDECountCorrectChoices(
          set.retained,
          set.choices
        ) === 1
      );
    }
  );

  check(
    'Linear exact-one-correct choices',
    () => {
      const set = collectDistinct(
        genLinear,
        200
      );

      return (
        set.choices.length === 4 &&
        mwDECountCorrectChoices(
          set.retained,
          set.choices
        ) === 1
      );
    }
  );

  check('Blueprint regeneration', () => {
    const problem =
      genLinear(makeRng(77));

    const regenerated =
      mwDESolveQuestion(
        problem.deSpec.questionModel
      );

    return (
      mwDESolutionKey(regenerated) ===
      problem.answerKey
    );
  });

  return {
    passed:
      results.filter(result => result.pass)
        .length,
    failed:
      results.filter(result => !result.pass)
        .length,
    results
  };
}

if(
  typeof module !== 'undefined' &&
  module.exports
){
  module.exports = {
    MW_DE_SCHEMA_VERSION,
    MW_DE_FAMILIES,
    MW_DE_AUDIT_POINTS,
    mwGreatestCommonDivisor,
    mwRational,
    mwValidateRational,
    mwRationalAdd,
    mwRationalSubtract,
    mwRationalMultiply,
    mwRationalNegate,
    mwRationalEqual,
    mwRationalIsZero,
    mwRationalToNumber,
    mwRationalKey,
    mwRenderRational,
    mwCreateInitialCondition,
    mwCreateSeparablePowerQuestion,
    mwCreateLinearConstantQuestion,
    mwValidateDEQuestionModel,
    mwCreateExpPowerSolution,
    mwCreateEquilibriumExpSolution,
    mwValidateDESolutionModel,
    mwDESolveQuestion,
    mwDECheckSeparablePowerIVP,
    mwDECheckLinearConstantIVP,
    mwDEVerifySolution,
    mwNearlyEqual,
    mwDEEvaluateSolution,
    mwDEEvaluateDerivative,
    mwDENumericAudit,
    mwRenderDEQuestion,
    mwRenderDESolution,
    mwBuildDESteps,
    mwDESolutionKey,
    mwDEChoiceFamily,
    mwBuildDEAnswerSpec,
    mwDECountCorrectChoices,
    mwCreateSeparableIVPGenerator,
    mwCreateLinearIVPGenerator,
    mwRunDESpikeSelfTests
  };
}

if(
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
){
  const report =
    mwRunDESpikeSelfTests();

  for(const result of report.results){
    console.log(
      `${result.pass ? 'PASS' : 'FAIL'}: ` +
      `${result.name}` +
      (
        result.detail
          ? ` — ${result.detail}`
          : ''
      )
    );
  }

  console.log(
    `\n${report.passed} passed, ` +
    `${report.failed} failed.`
  );

  if(report.failed > 0){
    process.exitCode = 1;
  }
}
