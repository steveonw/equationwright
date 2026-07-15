/*
 * MTH 288 Answer-Type Spike v1
 * Pure logic kernel + truth-sequence canary generator factory.
 * No Math.random(), DOM, quiz collection, or course-specific rendering.
 */

const MW_LOGIC_SCHEMA_VERSION = 1;

const MW_LOGIC_RULES = Object.freeze({
  not: Object.freeze({arity:1, symbol:'\\neg', evaluate:a => !a}),
  and: Object.freeze({arity:2, symbol:'\\land', evaluate:(a,b) => a && b}),
  or: Object.freeze({arity:2, symbol:'\\lor', evaluate:(a,b) => a || b}),
  implies: Object.freeze({arity:2, symbol:'\\to', evaluate:(a,b) => !a || b}),
  iff: Object.freeze({arity:2, symbol:'\\leftrightarrow', evaluate:(a,b) => a === b})
});

const MW_LOGIC_BINARY_OPERATOR_IDS = Object.freeze([
  'and','or','implies','iff'
]);

function mwLogicVar(name){
  if(typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)){
    throw new TypeError(`Invalid logic variable: ${String(name)}`);
  }
  return {op:'var', name};
}

function mwLogicNot(expr){
  return {op:'not', args:[expr]};
}

function mwLogicBinary(op,left,right){
  const rule = MW_LOGIC_RULES[op];
  if(!rule || rule.arity !== 2){
    throw new RangeError(`Not a binary logic operator: ${String(op)}`);
  }
  return {op, args:[left,right]};
}

function mwValidateLogicExpression(expr, limits = {}){
  const maxNodes = Number.isInteger(limits.maxNodes) ? limits.maxNodes : 64;
  const maxDepth = Number.isInteger(limits.maxDepth) ? limits.maxDepth : 12;
  const active = new Set();
  let count = 0;

  function visit(node, depth){
    if(!node || typeof node !== 'object' || Array.isArray(node)){
      throw new TypeError('Logic node must be a plain object.');
    }
    if(active.has(node)) throw new TypeError('Cyclic logic expression.');
    if(++count > maxNodes) throw new RangeError('Logic expression is too large.');
    if(depth > maxDepth) throw new RangeError('Logic expression is too deep.');

    active.add(node);

    if(node.op === 'var'){
      if(typeof node.name !== 'string' ||
         !/^[A-Za-z][A-Za-z0-9_]*$/.test(node.name)){
        throw new TypeError('Invalid variable node.');
      }
      if(Object.prototype.hasOwnProperty.call(node,'args')){
        throw new TypeError('Variable nodes must not have args.');
      }
      active.delete(node);
      return;
    }

    const rule = MW_LOGIC_RULES[node.op];
    if(!rule) throw new RangeError(`Unknown operator: ${String(node.op)}`);
    if(!Array.isArray(node.args) || node.args.length !== rule.arity){
      throw new TypeError(`Invalid arguments for ${node.op}.`);
    }
    node.args.forEach(arg => visit(arg, depth + 1));
    active.delete(node);
  }

  visit(expr,0);
  return true;
}

function mwLogicVariables(expr){
  mwValidateLogicExpression(expr);
  const names = new Set();

  (function visit(node){
    if(node.op === 'var'){
      names.add(node.name);
      return;
    }
    node.args.forEach(visit);
  })(expr);

  return [...names].sort();
}

function mwLogicUsesAllVariables(expr, variables){
  if(!Array.isArray(variables) || variables.length === 0) return false;
  const actual = mwLogicVariables(expr);
  const expected = [...variables].sort();
  return actual.length === expected.length &&
    actual.every((name,i) => name === expected[i]);
}

function mwReadLogicAssignment(assignment, variable){
  if(!assignment || typeof assignment !== 'object' ||
     !Object.prototype.hasOwnProperty.call(assignment, variable)){
    throw new RangeError(`Missing truth value for ${variable}.`);
  }
  const value = assignment[variable];
  if(typeof value !== 'boolean'){
    throw new TypeError(`Truth value for ${variable} must be Boolean.`);
  }
  return value;
}

function mwEvaluateLogic(expr, assignment){
  mwValidateLogicExpression(expr);

  function evalNode(node){
    if(node.op === 'var'){
      return mwReadLogicAssignment(assignment,node.name);
    }
    const values = node.args.map(evalNode);
    const result = MW_LOGIC_RULES[node.op].evaluate(...values);
    if(typeof result !== 'boolean'){
      throw new TypeError(`Rule ${node.op} did not return Boolean.`);
    }
    return result;
  }

  return evalNode(expr);
}

function mwTruthAssignments(variables){
  if(!Array.isArray(variables) || variables.length === 0){
    throw new TypeError('At least one variable is required.');
  }
  if(new Set(variables).size !== variables.length){
    throw new TypeError('Variables must be unique.');
  }
  if(variables.some(v => typeof v !== 'string' ||
     !/^[A-Za-z][A-Za-z0-9_]*$/.test(v))){
    throw new TypeError('Invalid variable list.');
  }
  if(variables.length > 4){
    throw new RangeError('Spike supports at most four variables.');
  }

  const rows = [];
  const rowCount = 2 ** variables.length;

  for(let row=0; row<rowCount; row++){
    const assignment = Object.create(null);

    variables.forEach((variable,index) => {
      const block = 2 ** (variables.length-index-1);
      assignment[variable] = Math.floor(row/block) % 2 === 0;
    });

    rows.push(assignment);
  }

  return rows;
}

function mwTruthSequence(expr, variables){
  const values = mwTruthAssignments(variables).map(
    assignment => mwEvaluateLogic(expr,assignment)
  );
  const expected = 2 ** variables.length;
  if(values.length !== expected){
    throw new Error(`Expected ${expected} truth rows, got ${values.length}.`);
  }
  return values;
}

function mwTruthSignature(expr, variables){
  return mwTruthSequence(expr,variables)
    .map(value => value ? '1' : '0')
    .join('');
}

function mwTruthSignatureInteger(values){
  if(!Array.isArray(values) || values.length === 0 ||
     values.some(v => typeof v !== 'boolean')){
    throw new TypeError('Expected a Boolean truth sequence.');
  }
  let result = 0;
  for(const value of values) result = result*2 + (value ? 1 : 0);
  if(!Number.isSafeInteger(result)){
    throw new RangeError('Truth signature exceeds safe integer range.');
  }
  return result;
}

function mwClassifyLogicExpression(expr, variables){
  const sig = mwTruthSignature(expr,variables);
  if(/^1+$/.test(sig)) return 'tautology';
  if(/^0+$/.test(sig)) return 'contradiction';
  return 'contingency';
}

function mwAreLogicallyEquivalent(left,right){
  const variables = [...new Set([
    ...mwLogicVariables(left),
    ...mwLogicVariables(right)
  ])].sort();

  return mwTruthSignature(left,variables) ===
    mwTruthSignature(right,variables);
}

// Structural identity only; use truth signatures for equivalence.
function mwSerializeLogicExpression(expr){
  mwValidateLogicExpression(expr);
  if(expr.op === 'var') return expr.name;
  return `${expr.op}(${expr.args.map(mwSerializeLogicExpression).join(',')})`;
}

// Conservative spike renderer: binary expressions are fully parenthesized.
function mwRenderLogicExpression(expr){
  mwValidateLogicExpression(expr);
  if(expr.op === 'var') return expr.name;

  if(expr.op === 'not'){
    const child = expr.args[0];
    const rendered = mwRenderLogicExpression(child);
    return child.op === 'var' || child.op === 'not'
      ? `${MW_LOGIC_RULES.not.symbol}${rendered}`
      : `${MW_LOGIC_RULES.not.symbol}\\left(${rendered}\\right)`;
  }

  const left = mwRenderLogicExpression(expr.args[0]);
  const right = mwRenderLogicExpression(expr.args[1]);
  return `\\left(${left} ${MW_LOGIC_RULES[expr.op].symbol} ${right}\\right)`;
}

function mwLogicSubexpressions(expr){
  mwValidateLogicExpression(expr);
  const result = [];
  const seen = new Set();

  (function visit(node){
    if(node.op === 'var') return;
    node.args.forEach(visit);
    const key = mwSerializeLogicExpression(node);
    if(!seen.has(key)){
      seen.add(key);
      result.push(node);
    }
  })(expr);

  return result;
}

function mwCloneLogicExpression(expr){
  mwValidateLogicExpression(expr);
  return expr.op === 'var'
    ? {op:'var', name:expr.name}
    : {op:expr.op, args:expr.args.map(mwCloneLogicExpression)};
}

function mwRenderTruthSequence(values){
  if(!Array.isArray(values) || values.length === 0 ||
     values.some(v => typeof v !== 'boolean')){
    throw new TypeError('Expected a nonempty Boolean truth sequence.');
  }
  return values.map(v => v ? 'T' : 'F').join(' ');
}

function mwBuildTruthSequenceAnswerSpec(variables, values){
  const signature = values.map(v => {
    if(typeof v !== 'boolean') throw new TypeError('Truth values must be Boolean.');
    return v ? '1' : '0';
  }).join('');

  return {
    schemaVersion:MW_LOGIC_SCHEMA_VERSION,
    type:'truth-sequence',
    model:{type:'truth-sequence', variables:[...variables], values:[...values]},
    key:`logic-v1:truth-sequence:${variables.join(',')}:${signature}`,
    choiceFamily:`logic-v1:truth-sequence:${values.length}`,
    choiceCapacity:2 ** values.length
  };
}

function mwValidateTruthColumnQuestionModel(model){
  if(!model || model.schemaVersion !== MW_LOGIC_SCHEMA_VERSION ||
     model.type !== 'truth-column' || !Array.isArray(model.variables)){
    throw new TypeError('Invalid truth-column question model.');
  }
  mwValidateLogicExpression(model.expression);
  if(!mwLogicUsesAllVariables(model.expression,model.variables)){
    throw new Error('Expression must use every declared variable.');
  }
  return true;
}

function mwTruthColumnAnswerIsCorrect(questionModel, candidateModel){
  mwValidateTruthColumnQuestionModel(questionModel);

  if(!candidateModel || candidateModel.type !== 'truth-sequence' ||
     !Array.isArray(candidateModel.variables) ||
     !Array.isArray(candidateModel.values)){
    return false;
  }

  if(candidateModel.variables.length !== questionModel.variables.length ||
     candidateModel.variables.some((v,i) => v !== questionModel.variables[i])){
    return false;
  }

  const expected = mwTruthSequence(
    questionModel.expression,
    questionModel.variables
  );

  return candidateModel.values.length === expected.length &&
    candidateModel.values.every((v,i) => v === expected[i]);
}

function mwCountCorrectTruthColumnChoices(retainedProblem, candidates){
  const questionModel = retainedProblem?.logicSpec?.questionModel ||
    retainedProblem?.questionModel;

  return candidates.filter(problem => {
    const answerModel = problem?.answerSpec?.model ||
      problem?.answerModel;
    return mwTruthColumnAnswerIsCorrect(questionModel,answerModel);
  }).length;
}

function mwBuildTruthTableSteps(expr,variables){
  const rows = mwTruthAssignments(variables);
  const values = mwTruthSequence(expr,variables);
  const order = rows.map(row =>
    variables.map(v => row[v] ? 'T' : 'F').join('')
  ).join(', ');

  const steps = [`Use row order \\(${variables.join(', ')}\\): ${order}.`];

  rows.forEach((row,index) => {
    const assignment = variables.map(
      v => `\\(${v}=${row[v] ? 'T' : 'F'}\\)`
    ).join(', ');
    steps.push(
      `${assignment} gives \\(${mwRenderLogicExpression(expr)}=` +
      `${values[index] ? 'T' : 'F'}\\).`
    );
  });

  steps.push(`Final column: \\(${mwRenderTruthSequence(values)}\\).`);
  return steps;
}

const MW_LOGIC_TEMPLATES_2VAR = Object.freeze([
  Object.freeze({code:101,id:'binary-basic-v1',variables:Object.freeze(['p','q']),
    build(rng,pickFn){return mwLogicBinary(
      pickFn(rng,MW_LOGIC_BINARY_OPERATOR_IDS),mwLogicVar('p'),mwLogicVar('q')
    );}}),
  Object.freeze({code:102,id:'negated-left-v1',variables:Object.freeze(['p','q']),
    build(rng,pickFn){return mwLogicBinary(
      pickFn(rng,MW_LOGIC_BINARY_OPERATOR_IDS),mwLogicNot(mwLogicVar('p')),mwLogicVar('q')
    );}}),
  Object.freeze({code:103,id:'negated-right-v1',variables:Object.freeze(['p','q']),
    build(rng,pickFn){return mwLogicBinary(
      pickFn(rng,MW_LOGIC_BINARY_OPERATOR_IDS),mwLogicVar('p'),mwLogicNot(mwLogicVar('q'))
    );}}),
  Object.freeze({code:104,id:'negated-both-v1',variables:Object.freeze(['p','q']),
    build(rng,pickFn){return mwLogicBinary(
      pickFn(rng,MW_LOGIC_BINARY_OPERATOR_IDS),
      mwLogicNot(mwLogicVar('p')),mwLogicNot(mwLogicVar('q'))
    );}}),
  Object.freeze({code:105,id:'negated-whole-v1',variables:Object.freeze(['p','q']),
    build(rng,pickFn){return mwLogicNot(mwLogicBinary(
      pickFn(rng,MW_LOGIC_BINARY_OPERATOR_IDS),mwLogicVar('p'),mwLogicVar('q')
    ));}})
]);

const MW_LOGIC_TEMPLATES_3VAR = Object.freeze([
  Object.freeze({code:201,id:'left-grouped-v1',variables:Object.freeze(['p','q','r']),
    build(rng,pickFn){return mwLogicBinary(
      pickFn(rng,['and','or','implies']),
      mwLogicBinary(pickFn(rng,['and','or','implies']),mwLogicVar('p'),mwLogicVar('q')),
      mwLogicVar('r')
    );}}),
  Object.freeze({code:202,id:'right-grouped-v1',variables:Object.freeze(['p','q','r']),
    build(rng,pickFn){return mwLogicBinary(
      pickFn(rng,['and','or','implies']),mwLogicVar('p'),
      mwLogicBinary(pickFn(rng,['and','or','implies']),mwLogicVar('q'),mwLogicVar('r'))
    );}}),
  Object.freeze({code:203,id:'left-negated-v1',variables:Object.freeze(['p','q','r']),
    build(rng,pickFn){return mwLogicBinary(
      pickFn(rng,['and','or','implies']),
      mwLogicBinary(pickFn(rng,['and','or','implies']),mwLogicNot(mwLogicVar('p')),mwLogicVar('q')),
      mwLogicVar('r')
    );}}),
  Object.freeze({code:204,id:'mixed-negation-v1',variables:Object.freeze(['p','q','r']),
    build(rng,pickFn){return mwLogicBinary(
      pickFn(rng,['and','or','implies']),
      mwLogicBinary(pickFn(rng,['and','or','implies']),mwLogicVar('p'),mwLogicNot(mwLogicVar('q'))),
      mwLogicNot(mwLogicVar('r'))
    );}})
]);

function mwCreateTruthColumnGenerator(options){
  const {unitId,templates,pickFn,unitIndexFn,
    generatorKey='d288_truth_column_v1'} = options || {};

  if(typeof unitId !== 'string' || !unitId) throw new TypeError('unitId required.');
  if(!Array.isArray(templates) || !templates.length) throw new TypeError('templates required.');
  if(typeof pickFn !== 'function') throw new TypeError('pickFn required.');
  if(typeof unitIndexFn !== 'function') throw new TypeError('unitIndexFn required.');

  return function genD288TruthColumn(rng){
    const template = pickFn(rng,templates);
    const variables = [...template.variables];
    const expression = template.build(rng,pickFn);

    mwValidateLogicExpression(expression,{maxNodes:16,maxDepth:5});
    if(!mwLogicUsesAllVariables(expression,variables)){
      throw new Error(`Template ${template.id} omitted a declared variable.`);
    }

    const values = mwTruthSequence(expression,variables);
    const answerSpec = mwBuildTruthSequenceAnswerSpec(variables,values);
    const questionModel = {
      schemaVersion:MW_LOGIC_SCHEMA_VERSION,
      type:'truth-column',
      variables,
      expression:mwCloneLogicExpression(expression)
    };
    const logicSpec = {
      schemaVersion:MW_LOGIC_SCHEMA_VERSION,
      templateId:template.id,
      templateCode:template.code,
      expressionKey:mwSerializeLogicExpression(expression),
      questionModel
    };

    return {
      q:`Complete the final truth-table column for ` +
        `\\(${mwRenderLogicExpression(expression)}\\).`,
      a:mwRenderTruthSequence(values),
      steps:mwBuildTruthTableSteps(expression,variables),
      vec:[
        unitIndexFn(unitId),
        template.code,
        variables.length,
        values.length,
        mwTruthSignatureInteger(values)
      ],
      key:generatorKey,
      answerSpec,
      logicSpec,

      // Temporary aliases for a minimal host-app patch.
      answerKey:answerSpec.key,
      choiceFamily:answerSpec.choiceFamily,
      choiceCapacity:answerSpec.choiceCapacity,
      answerModel:answerSpec.model,
      questionModel
    };
  };
}

function mwRunLogicSpikeSelfTests(){
  const tests = [];
  const add = (name,fn) => {
    try{
      const pass = fn() === true;
      tests.push({name,pass,detail:pass ? '' : 'returned false'});
    }catch(error){
      tests.push({name,pass:false,detail:error.message || String(error)});
    }
  };

  const p=mwLogicVar('p'), q=mwLogicVar('q'), r=mwLogicVar('r');

  const expected = {
    and:[true,false,false,false],
    or:[true,true,true,false],
    implies:[true,false,true,true],
    iff:[true,false,false,true]
  };

  MW_LOGIC_BINARY_OPERATOR_IDS.forEach(op => add(`${op} truth rule`,() =>
    mwTruthSequence(mwLogicBinary(op,p,q),['p','q'])
      .every((v,i) => v === expected[op][i])
  ));

  add('NOT truth rule',() =>
    mwEvaluateLogic(mwLogicNot(p),{p:true}) === false &&
    mwEvaluateLogic(mwLogicNot(p),{p:false}) === true
  );

  add('two-variable row order',() =>
    JSON.stringify(mwTruthAssignments(['p','q']).map(x => [x.p,x.q])) ===
    JSON.stringify([[true,true],[true,false],[false,true],[false,false]])
  );

  add('three-variable signature length',() =>
    mwTruthSignature(
      mwLogicBinary('implies',mwLogicBinary('and',p,q),r),
      ['p','q','r']
    ).length === 8
  );

  add('equivalence uses variable union',() =>
    mwAreLogicallyEquivalent(
      p,
      mwLogicBinary('and',p,mwLogicBinary('or',q,mwLogicNot(q)))
    )
  );

  add('renderer preserves implication grouping',() =>
    mwRenderLogicExpression(
      mwLogicBinary('implies',mwLogicBinary('implies',p,q),r)
    ) !==
    mwRenderLogicExpression(
      mwLogicBinary('implies',p,mwLogicBinary('implies',q,r))
    )
  );

  add('strict assignment rejects string false',() => {
    try{ mwEvaluateLogic(p,{p:'false'}); return false; }
    catch(error){ return error instanceof TypeError; }
  });

  add('classification helper',() =>
    mwClassifyLogicExpression(mwLogicBinary('or',p,mwLogicNot(p)),['p']) === 'tautology' &&
    mwClassifyLogicExpression(mwLogicBinary('and',p,mwLogicNot(p)),['p']) === 'contradiction'
  );

  function makeRng(seed){
    let state = seed >>> 0;
    return () => {
      state = (1664525*state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  const localPick = (rng,arr) => arr[Math.floor(rng()*arr.length)];
  const unitIndexFn = id => id === 'D288_Truth4' ? 1 : 2;

  const gen4 = mwCreateTruthColumnGenerator({
    unitId:'D288_Truth4',
    templates:MW_LOGIC_TEMPLATES_2VAR,
    pickFn:localPick,
    unitIndexFn,
    generatorKey:'d288_truth4_canary'
  });
  const gen8 = mwCreateTruthColumnGenerator({
    unitId:'D288_Truth8',
    templates:MW_LOGIC_TEMPLATES_3VAR,
    pickFn:localPick,
    unitIndexFn,
    generatorKey:'d288_truth8_canary'
  });

  add('four-row canary deterministic',() =>
    JSON.stringify(gen4(makeRng(12345))) ===
    JSON.stringify(gen4(makeRng(12345)))
  );

  add('eight-row canary deterministic',() =>
    JSON.stringify(gen8(makeRng(98765))) ===
    JSON.stringify(gen8(makeRng(98765)))
  );

  add('canary vec is numeric and finite',() =>
    [gen4(makeRng(1)),gen8(makeRng(2))].every(problem =>
      problem.vec.every(v => typeof v === 'number' && Number.isFinite(v))
    )
  );

  add('exactly one correct truth-column choice',() => {
    const retained = gen4(makeRng(42));
    const choices = [retained];

    for(let seed=43; seed<300 && choices.length<4; seed++){
      const candidate = gen4(makeRng(seed));
      if(candidate.choiceFamily === retained.choiceFamily &&
         !choices.some(x => x.answerKey === candidate.answerKey)){
        choices.push(candidate);
      }
    }

    return choices.length === 4 &&
      mwCountCorrectTruthColumnChoices(retained,choices) === 1;
  });

  return {
    passed:tests.filter(t => t.pass).length,
    failed:tests.filter(t => !t.pass).length,
    results:tests
  };
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    MW_LOGIC_SCHEMA_VERSION,MW_LOGIC_RULES,MW_LOGIC_BINARY_OPERATOR_IDS,
    MW_LOGIC_TEMPLATES_2VAR,MW_LOGIC_TEMPLATES_3VAR,
    mwLogicVar,mwLogicNot,mwLogicBinary,mwValidateLogicExpression,
    mwLogicVariables,mwLogicUsesAllVariables,mwReadLogicAssignment,
    mwEvaluateLogic,mwTruthAssignments,mwTruthSequence,mwTruthSignature,
    mwTruthSignatureInteger,mwClassifyLogicExpression,
    mwAreLogicallyEquivalent,mwSerializeLogicExpression,
    mwRenderLogicExpression,mwLogicSubexpressions,mwCloneLogicExpression,
    mwRenderTruthSequence,mwBuildTruthSequenceAnswerSpec,
    mwValidateTruthColumnQuestionModel,mwTruthColumnAnswerIsCorrect,
    mwCountCorrectTruthColumnChoices,mwBuildTruthTableSteps,
    mwCreateTruthColumnGenerator,mwRunLogicSpikeSelfTests
  };
}

if(typeof require !== 'undefined' && typeof module !== 'undefined' &&
   require.main === module){
  const report = mwRunLogicSpikeSelfTests();
  report.results.forEach(result =>
    console.log(`${result.pass ? 'PASS' : 'FAIL'}: ${result.name}` +
      (result.detail ? ` — ${result.detail}` : ''))
  );
  console.log(`\n${report.passed} passed, ${report.failed} failed.`);
  if(report.failed) process.exitCode = 1;
}
