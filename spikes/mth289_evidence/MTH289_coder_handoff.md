# MTH 289 Spike — Coder Handoff

## Included files

- `mw_de_spike_v1.js`: browser/Node starter implementation.
- `audit_mw_de_spike.py`: independent standard-library Python audit.

## Run the checks

```bash
node --check mw_de_spike_v1.js
node mw_de_spike_v1.js
python3 audit_mw_de_spike.py
```

The JavaScript self-test should report `17 passed, 0 failed`.

## Register the two canaries

Use project-appropriate unit IDs.

```js
const genD289SeparableCanary =
  mwCreateSeparableIVPGenerator({
    unitId: 'D289_Separable',
    pickFn: pick,
    unitIndexFn: unitIndex,
    generatorKey:
      'd289_separable_power_ivp_v1'
  });

genD289SeparableCanary.meta = {
  topicId: 'first-order-separable',
  topicLabel: 'Separable Equations'
};

registerGen(
  'D289_Separable',
  genD289SeparableCanary
);
```

```js
const genD289LinearCanary =
  mwCreateLinearIVPGenerator({
    unitId: 'D289_LinearFirstOrder',
    pickFn: pick,
    unitIndexFn: unitIndex,
    generatorKey:
      'd289_linear_constant_ivp_v1'
  });

genD289LinearCanary.meta = {
  topicId: 'first-order-linear',
  topicLabel: 'First-Order Linear Equations'
};

registerGen(
  'D289_LinearFirstOrder',
  genD289LinearCanary
);
```

## Quiz collector patch

Require compatible choice families:

```js
const retainedFamily =
  retained.answerSpec?.choiceFamily ||
  retained.choiceFamily ||
  null;

const candidateFamily =
  candidate.answerSpec?.choiceFamily ||
  candidate.choiceFamily ||
  null;

if(
  retainedFamily &&
  candidateFamily &&
  retainedFamily !== candidateFamily
){
  rejectCandidate(
    'choice-family-mismatch'
  );
}
```

Deduplicate semantic and display identity:

```js
const semanticKey =
  candidate.answerSpec?.key ||
  candidate.answerKey ||
  normalizeMCAnswer(candidate.a);

const displayKey =
  normalizeMCAnswer(candidate.a);

if(seenSemanticKeys.has(semanticKey)){
  rejectCandidate(
    'duplicate-semantic-key'
  );
}

if(seenDisplayKeys.has(displayKey)){
  rejectCandidate(
    'duplicate-display'
  );
}
```

Reject a sibling solution that also solves the retained IVP:

```js
const report =
  mwDEVerifySolution(
    retained.deSpec.questionModel,
    candidate.answerSpec.model
  );

if(report.status === 'pass'){
  rejectCandidate(
    'also-solves-retained-ivp'
  );
}
```

After collection and again after shuffling:

```js
const correctCount =
  mwDECountCorrectChoices(
    retained,
    displayedProblems
  );

if(correctCount !== 1){
  throw new Error(
    `Expected exactly one correct DE choice; ` +
    `found ${correctCount}.`
  );
}
```

## Blueprint behavior

Save the authoritative model:

```js
problem.deSpec.questionModel
```

On load:

```js
mwValidateDEQuestionModel(
  savedQuestionModel
);

const regeneratedSolution =
  mwDESolveQuestion(
    savedQuestionModel
  );

const verification =
  mwDEVerifySolution(
    savedQuestionModel,
    regeneratedSolution
  );

if(verification.status !== 'pass'){
  throw new Error(
    'Saved MTH 289 blueprint failed verification.'
  );
}
```

Regenerate `q`, `a`, and `steps` from the question model.

## Important integration notes

- Keep `vec` numeric.
- Do not move TeX, keys, or model strings into `vec`.
- Use only the supplied seeded `rng`.
- Keep `answerSpec` and `deSpec` as authoritative metadata.
- The top-level aliases in the starter are temporary compatibility fields.
- Exact typed validation is the proof.
- The numeric audit is defense in depth, not a replacement for exact validation.
- Do not add a general symbolic simplifier during this spike.

## Host application acceptance checks

- Worksheet.
- Answer key.
- Worked solutions.
- Quiz Mode.
- Exactly one correct choice.
- Seed replay.
- Blueprint replay.
- Topic/unit filtering.
- Print/PDF.
- Mobile layout.
- Existing self-test.
- No regression in existing generators.
