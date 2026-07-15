# MTH 288 Answer-Type Spike — Coder Handoff

## Goal

Prove one narrow vertical slice inside Math Worksheet Builder:

1. A small propositional-logic kernel can generate and evaluate symbolic expressions.
2. A symbolic truth-sequence answer can still be returned through the existing `a` string.
3. Four-row and eight-row truth-column generators work through worksheet, answer-key, Quiz Mode, blueprint replay, print, and mobile paths.
4. Every generated multiple-choice item has exactly one answer that fits the retained question.
5. Existing generators remain unchanged.

This spike deliberately excludes classification quizzes, equivalence-choice quizzes, translation, inference rules, and proof steps.

## Host-program checks before integration

Confirm these against the real HTML:

- `vec` contains only finite numbers.
- Blueprints preserve nested plain objects.
- Blueprint save takes a clone/snapshot rather than keeping a mutable reference.
- Quiz collection can read metadata from retained and sibling problems.
- Quiz collection can require matching `choiceFamily`.
- Existing answer normalization preserves strings such as `T F T T`.
- Every random choice uses the supplied seeded `rng`; never use `Math.random()`.

## Starter code

Use `mw_logic_spike_v1.js`. It includes:

- rules for `not`, `and`, `or`, `implies`, and `iff`;
- plain-object expression constructors;
- structural validation and cycle checks;
- strict Boolean assignment reading;
- evaluator and explicit truth-row generation;
- truth sequences, signatures, classification, and equivalence;
- structural serializer;
- deliberately unambiguous renderer;
- automatic subexpression extraction;
- truth-sequence answer model and canonical key;
- retained-question correctness checking;
- two- and three-variable curated templates;
- canary generator factory;
- standalone smoke tests.

Run:

```bash
node mw_logic_spike_v1.js
```

## Integration order

### 1. Insert the pure kernel

Place it after ordinary helpers and before MTH 288 generator registration.

Do not add DOM, course, quiz-collection, or formatting state to the evaluator.

### 2. Add two temporary units

Use project-appropriate IDs, for example:

```js
D288_Truth4
D288_Truth8
```

### 3. Register the canaries

```js
const genD288Truth4Canary = mwCreateTruthColumnGenerator({
  unitId: 'D288_Truth4',
  templates: MW_LOGIC_TEMPLATES_2VAR,
  pickFn: pick,
  unitIndexFn: unitIndex,
  generatorKey: 'd288_truth4_canary'
});

genD288Truth4Canary.meta = {
  topicId: 'truth-tables',
  topicLabel: 'Truth Tables'
};

registerGen('D288_Truth4', genD288Truth4Canary);
```

```js
const genD288Truth8Canary = mwCreateTruthColumnGenerator({
  unitId: 'D288_Truth8',
  templates: MW_LOGIC_TEMPLATES_3VAR,
  pickFn: pick,
  unitIndexFn: unitIndex,
  generatorKey: 'd288_truth8_canary'
});

genD288Truth8Canary.meta = {
  topicId: 'truth-tables',
  topicLabel: 'Truth Tables'
};

registerGen('D288_Truth8', genD288Truth8Canary);
```

The `vec` is numeric:

```js
[
  unitIndex(unitId),
  template.code,
  variableCount,
  rowCount,
  signatureInteger
]
```

Keep symbolic strings in `logicSpec`.

## Minimal Quiz Mode patch

Use nested metadata as authoritative:

```js
problem.answerSpec.key
problem.answerSpec.choiceFamily
problem.answerSpec.model
problem.logicSpec.questionModel
```

Temporary aliases are included for a smaller initial patch:

```js
problem.answerKey
problem.choiceFamily
problem.answerModel
problem.questionModel
```

Require compatible families:

```js
const retainedFamily =
  retained.answerSpec?.choiceFamily ||
  retained.choiceFamily ||
  null;

const candidateFamily =
  candidate.answerSpec?.choiceFamily ||
  candidate.choiceFamily ||
  null;

if(retainedFamily && candidateFamily &&
   retainedFamily !== candidateFamily){
  rejectCandidate();
}
```

Deduplicate semantic and visible identity:

```js
const semanticKey =
  candidate.answerSpec?.key ||
  candidate.answerKey ||
  normalizeMCAnswer(candidate.a);

const displayKey = normalizeMCAnswer(candidate.a);

if(seenSemanticKeys.has(semanticKey)){
  rejectCandidate();
}

if(seenDisplayKeys.has(displayKey)){
  rejectCandidate();
}
```

Do not replace the quiz collector. Add these checks to it.

## Exact-one-correct test

For the spike:

```js
const correctCount =
  mwCountCorrectTruthColumnChoices(
    retainedProblem,
    displayedProblems
  );

if(correctCount !== 1){
  throw new Error(
    `Expected exactly one correct choice; found ${correctCount}.`
  );
}
```

Truth sequences are safe because different sequences are mutually exclusive.

Do not enable equivalent-expression or proof-step choice families until they have retained-question validators.

## Blueprint snapshot

Save:

```js
problem.logicSpec.questionModel
```

Example:

```js
{
  schemaVersion: 1,
  type: 'truth-column',
  variables: ['p', 'q'],
  expression: {
    op: 'implies',
    args: [
      { op: 'var', name: 'p' },
      { op: 'var', name: 'q' }
    ]
  }
}
```

On load:

1. validate schema version;
2. validate expression;
3. verify every declared variable is used;
4. regenerate question and answer from the snapshot;
5. never trust unvalidated loaded objects.

## Required tests

### Kernel

- Exhaustive truth rules.
- Exact two- and three-variable row order.
- Signature length equals `2 ** variables.length`.
- Assignment values must be real Booleans.
- Serializer is deterministic.
- Renderer distinguishes left- and right-nested implication.
- Equivalence uses the union of variables.
- No evaluator, renderer, or serializer mutates its input.

### Generators

- Same seed produces identical output.
- Every declared variable appears.
- `a` matches symbolic evaluation.
- `steps` match `a`.
- Every `vec` value is finite and numeric.
- Four-row answers have four truth values.
- Eight-row answers have eight truth values.
- Four distinct canonical answers can be collected within the existing retry limit.

### Quiz Mode

- All choices share `choiceFamily`.
- Semantic keys are distinct.
- Visible answers are distinct.
- Exactly one choice answers the retained question.
- Correct-answer tracking survives shuffling.

### Full application

- Worksheet.
- Answer key.
- Worked solutions.
- Topic/unit filters.
- Seed replay.
- Blueprint save/load.
- Print/PDF.
- Mobile.
- Existing full self-test.
- No behavior changes outside MTH 288.

## Spike pass condition

The spike passes when both canaries satisfy every test above in the real program.

After that, build in this order:

1. Classification; declare `choiceCapacity: 3`.
2. Answer-first equivalence-law templates.
3. Retained-question validators for expression choices.
4. Separate inference registry and inference checker.
5. Curated English/symbolic paired templates.
6. Curated proof-state and proof-step spike.

Do not add a theorem prover, unrestricted English parser, unrestricted random AST generator, or general proof search.
