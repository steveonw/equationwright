
// ===================================================================
// MTH 288 DISCRETE MATHEMATICS — curated, exact, auditable generators
// ===================================================================

function dmFact(n){
  if(!Number.isSafeInteger(n) || n < 0 || n > 20){
    throw new RangeError('dmFact supports integers from 0 through 20.');
  }
  let out = 1;
  for(let i=2;i<=n;i++) out *= i;
  return out;
}

function dmChoose(n,r){
  if(!Number.isSafeInteger(n) || !Number.isSafeInteger(r) || r < 0 || r > n){
    return 0;
  }
  const k = Math.min(r, n-r);
  let out = 1;
  for(let i=1;i<=k;i++) out = out * (n-k+i) / i;
  return Math.round(out);
}

function dmPerm(n,r){
  if(!Number.isSafeInteger(n) || !Number.isSafeInteger(r) || r < 0 || r > n){
    return 0;
  }
  let out = 1;
  for(let i=0;i<r;i++) out *= (n-i);
  return out;
}

function dmUniqueSorted(values){
  return [...new Set(values)].sort((a,b)=>{
    if(typeof a === 'number' && typeof b === 'number') return a-b;
    return String(a).localeCompare(String(b));
  });
}

function dmSetUnion(a,b){ return dmUniqueSorted([...a,...b]); }
function dmSetIntersection(a,b){
  const bs = new Set(b);
  return dmUniqueSorted(a.filter(x=>bs.has(x)));
}
function dmSetDifference(a,b){
  const bs = new Set(b);
  return dmUniqueSorted(a.filter(x=>!bs.has(x)));
}
function dmSetSymDiff(a,b){
  return dmSetUnion(dmSetDifference(a,b), dmSetDifference(b,a));
}
function dmSetMask(values){
  let mask = 0;
  for(const value of values){
    if(Number.isSafeInteger(value) && value >= 0 && value < 30){
      mask |= (1 << value);
    }
  }
  return mask >>> 0;
}
function dmRenderSet(values){
  const body = values.length ? values.join(', ') : '\\varnothing';
  return values.length ? `\\{${body}\\}` : '\\varnothing';
}
function dmRenderOrderedPairs(pairs){
  return `\\{${pairs.map(([a,b])=>`(${a},${b})`).join(', ')}\\}`;
}
function dmTextAnswer(text){ return `\\(\\text{${text}}\\)`; }
function dmTrap(ans, why){ return {ans, why}; }
function dmTruthLetters(values){ return values.map(v=>v ? 'T' : 'F').join(' '); }

function dmMakeProblem({
  q,a,steps,traps,unitId,genNum,vecTail,key,auditSpec
}){
  const cleanTraps = [];
  const seen = new Set([normalizeMCAnswer(fixTexEscapes(a))]);
  for(const trap of (traps || [])){
    if(!trap || trap.ans == null) continue;
    const trapKey = normalizeMCAnswer(fixTexEscapes(trap.ans));
    if(!trapKey || seen.has(trapKey)) continue;
    seen.add(trapKey);
    cleanTraps.push(trap);
  }
  return {
    q,
    a,
    steps,
    traps:cleanTraps,
    vec:[unitIndex(unitId), genNum, ...(vecTail || [])],
    key,
    auditSpec
  };
}

function dmNumericTrapSet(expected, entries){
  const traps = [];
  const seen = new Set([String(expected)]);

  for(const entry of entries || []){
    const value = typeof entry === 'number' ? entry : entry.value;
    const why = typeof entry === 'number'
      ? 'Recheck the counting or substitution rule used for this problem.'
      : entry.why;

    if(!Number.isFinite(value)) continue;

    const normalized = String(value);
    if(seen.has(normalized)) continue;

    seen.add(normalized);
    traps.push(dmTrap(`\\(${value}\\)`, why));

    if(traps.length === 3) return traps;
  }

  for(let delta=1;traps.length<3;delta++){
    for(const value of [expected-delta, expected+delta]){
      if(!Number.isFinite(value)) continue;
      const normalized = String(value);
      if(seen.has(normalized)) continue;
      seen.add(normalized);
      traps.push(dmTrap(
        `\\(${value}\\)`,
        'This is close to the correct value, but it does not follow the required rule exactly.'
      ));
      if(traps.length === 3) break;
    }
  }

  return traps;
}

function dmTupleTrapSet(expected, entries){
  const traps = [];
  const expectedKey = expected.join(',');
  const seen = new Set([expectedKey]);

  for(const entry of entries || []){
    const values = entry.values;
    if(!Array.isArray(values) || values.some(x=>!Number.isFinite(x))) continue;

    const key = values.join(',');
    if(seen.has(key)) continue;

    seen.add(key);
    traps.push(dmTrap(
      `\\((${values.join(', ')})\\)`,
      entry.why
    ));

    if(traps.length === 3) return traps;
  }

  for(let index=0;traps.length<3;index++){
    const values = expected.map((value,i)=>value+(i===index%expected.length ? 1 : 0));
    const key = values.join(',');
    if(seen.has(key)) continue;
    seen.add(key);
    traps.push(dmTrap(
      `\\((${values.join(', ')})\\)`,
      'One recurrence substitution has been evaluated incorrectly.'
    ));
  }

  return traps;
}

const DM_SET_CASES = Object.freeze([
  Object.freeze({U:[1,2,3,4,5,6,7,8], A:[1,2,4,7], B:[2,3,5,7]}),
  Object.freeze({U:[1,2,3,4,5,6,7,8], A:[1,3,5,8], B:[2,3,6,8]}),
  Object.freeze({U:[1,2,3,4,5,6,7,8], A:[2,4,6,8], B:[1,2,3,4]}),
  Object.freeze({U:[1,2,3,4,5,6,7,8], A:[1,4,5,7], B:[3,4,6,7]}),
  Object.freeze({U:[1,2,3,4,5,6,7,8], A:[2,3,5,6], B:[1,3,6,8]}),
  Object.freeze({U:[1,2,3,4,5,6,7,8], A:[1,2,6,8], B:[2,4,5,8]})
]);

// -------------------- DM_Logic --------------------
// Two- and three-variable truth-table canaries are registered by the kernel block.

registerGen('DM_Logic', (rng)=>{
  const p = mwLogicVar('p');
  const qv = mwLogicVar('q');
  const cases = [
    {id:1, expr:mwLogicBinary('or',p,mwLogicNot(p)), label:'Tautology'},
    {id:2, expr:mwLogicBinary('and',p,mwLogicNot(p)), label:'Contradiction'},
    {id:3, expr:mwLogicBinary('and',p,qv), label:'Contingency'},
    {id:4, expr:mwLogicBinary('implies',p,qv), label:'Contingency'},
    {id:5, expr:mwLogicBinary('iff',p,qv), label:'Contingency'},
    {id:6, expr:mwLogicNot(mwLogicBinary('and',p,qv)), label:'Contingency'}
  ];
  const c = pick(rng,cases);
  const vars = ['p','q'];
  const values = mwTruthSequence(c.expr,vars);
  const sequence = dmTruthLetters(values);
  const answer = `\\(\\text{${c.label}};\\ ${sequence}\\)`;
  const wrongLabels = ['Tautology','Contradiction','Contingency'].filter(x=>x!==c.label);
  return dmMakeProblem({
    q:`Classify \\(${mwRenderLogicExpression(c.expr)}\\) and give its final truth-table column in row order \\(TT,TF,FT,FF\\).`,
    a:answer,
    steps:[
      `Evaluate the expression in the standard row order \\(TT,TF,FT,FF\\).`,
      `The final column is \\(${sequence}\\).`,
      c.label==='Tautology'
        ? 'Every row is true, so the expression is a tautology.'
        : c.label==='Contradiction'
          ? 'Every row is false, so the expression is a contradiction.'
          : 'The column contains both true and false values, so the expression is a contingency.'
    ],
    traps:[
      dmTrap(`\\(\\text{${wrongLabels[0]}};\\ ${sequence}\\)`,'The truth values may be right, but the classification does not match the entire column.'),
      dmTrap(`\\(\\text{${wrongLabels[1]}};\\ ${sequence}\\)`,'Classification depends on whether all, none, or only some rows are true.'),
      dmTrap(`\\(\\text{${c.label}};\\ ${sequence.split(' ').reverse().join(' ')}\\)`,'The standard row order is TT, TF, FT, FF; reversing the rows changes the answer.')
    ],
    unitId:'DM_Logic',genNum:3,
    vecTail:[c.id,mwTruthSignatureInteger(values)],
    key:'dm_logic_classify',
    auditSpec:{family:'logic-classify',expression:mwCloneLogicExpression(c.expr),variables:vars,classification:c.label,values}
  });
});

registerGen('DM_Logic', (rng)=>{
  const cases = [
    {id:1, op:'and', symbol:'\\land', name:'conjunction'},
    {id:2, op:'or', symbol:'\\lor', name:'disjunction'},
    {id:3, op:'implies', symbol:'\\to', name:'implication'},
    {id:4, op:'iff', symbol:'\\leftrightarrow', name:'biconditional'}
  ];
  const c = pick(rng,cases);
  const p=mwLogicVar('p'), q=mwLogicVar('q'), r=mwLogicVar('r');
  const expr = mwLogicBinary(c.op,mwLogicNot(p),mwLogicBinary('or',q,r));
  const answer = `\\(${c.symbol}\\) — ${c.name}`;
  const traps = cases.filter(x=>x.id!==c.id).map(x=>
    dmTrap(`\\(${x.symbol}\\) — ${x.name}`,'The main connective is the outermost operator, not one nested inside a parenthesized part.')
  );
  return dmMakeProblem({
    q:`Identify the main connective of \\(${mwRenderLogicExpression(expr)}\\).`,
    a:answer,
    steps:[
      'Work from the outside inward.',
      `The entire expression joins its two largest parts with \\(${c.symbol}\\), so the main connective is ${c.name}.`
    ],
    traps,
    unitId:'DM_Logic',genNum:4,vecTail:[c.id],
    key:'dm_logic_main_connective',
    auditSpec:{family:'logic-main-connective',expression:mwCloneLogicExpression(expr),expectedOp:c.op}
  });
});

registerGen('DM_Logic', (rng)=>{
  const cases = [
    {
      id:1,
      prompt:'\\(\\forall x\\,P(x)\\)',
      answer:'\\(\\exists x\\,\\neg P(x)\\)',
      traps:[
        '\\(\\forall x\\,\\neg P(x)\\)',
        '\\(\\exists x\\,P(x)\\)',
        '\\(\\neg\\exists x\\,P(x)\\)'
      ],
      rule:'Negating a universal statement changes \\(\\forall\\) to \\(\\exists\\) and negates the predicate.'
    },
    {
      id:2,
      prompt:'\\(\\exists x\\,P(x)\\)',
      answer:'\\(\\forall x\\,\\neg P(x)\\)',
      traps:[
        '\\(\\exists x\\,\\neg P(x)\\)',
        '\\(\\forall x\\,P(x)\\)',
        '\\(\\neg\\forall x\\,\\neg P(x)\\)'
      ],
      rule:'Negating an existential statement changes \\(\\exists\\) to \\(\\forall\\) and negates the predicate.'
    },
    {
      id:3,
      prompt:'\\(\\forall x\\,(P(x)\\to Q(x))\\)',
      answer:'\\(\\exists x\\,(P(x)\\land\\neg Q(x))\\)',
      traps:[
        '\\(\\exists x\\,(\\neg P(x)\\to\\neg Q(x))\\)',
        '\\(\\forall x\\,(P(x)\\land\\neg Q(x))\\)',
        '\\(\\exists x\\,(\\neg P(x)\\lor Q(x))\\)'
      ],
      rule:'Negate the quantifier, then use \\(\\neg(P\\to Q)\\equiv P\\land\\neg Q\\).'
    },
    {
      id:4,
      prompt:'\\(\\exists x\\,(P(x)\\land Q(x))\\)',
      answer:'\\(\\forall x\\,(\\neg P(x)\\lor\\neg Q(x))\\)',
      traps:[
        '\\(\\forall x\\,(\\neg P(x)\\land\\neg Q(x))\\)',
        '\\(\\exists x\\,(\\neg P(x)\\lor\\neg Q(x))\\)',
        '\\(\\forall x\\,(P(x)\\lor Q(x))\\)'
      ],
      rule:'Negate the quantifier, then apply De Morgan’s law to the conjunction.'
    }
  ];
  const c=pick(rng,cases);
  return dmMakeProblem({
    q:`Write the logical negation of ${c.prompt}.`,
    a:c.answer,
    steps:[c.rule,`Therefore the negation is ${c.answer}.`],
    traps:c.traps.map(ans=>dmTrap(ans,'A correct quantifier negation switches the quantifier and pushes the negation through the predicate correctly.')),
    unitId:'DM_Logic',genNum:5,vecTail:[c.id],
    key:'dm_logic_quantifier_negation',
    auditSpec:{family:'quantifier-negation',caseId:c.id,expected:c.answer}
  });
});

registerGen('DM_Logic', (rng)=>{
  const cases = [
    {id:1,left:'\\neg(p\\land q)',right:'\\neg p\\lor\\neg q',law:'De Morgan’s law'},
    {id:2,left:'p\\to q',right:'\\neg p\\lor q',law:'implication law'},
    {id:3,left:'p\\leftrightarrow q',right:'(p\\to q)\\land(q\\to p)',law:'biconditional law'},
    {id:4,left:'\\neg\\neg p',right:'p',law:'double-negation law'},
    {id:5,left:'p\\lor(p\\land q)',right:'p',law:'absorption law'}
  ];
  const c=pick(rng,cases);
  const others=cases.filter(x=>x.id!==c.id).slice(0,3);
  return dmMakeProblem({
    q:`Which equivalence correctly simplifies \\(${c.left}\\)?`,
    a:`\\(${c.right}\\) — ${c.law}`,
    steps:[
      `Apply the ${c.law}.`,
      `\\(${c.left}\\equiv ${c.right}\\).`
    ],
    traps:others.map(x=>dmTrap(`\\(${x.right}\\) — ${x.law}`,'This is a valid law in another setting, but it does not match the given expression.')),
    unitId:'DM_Logic',genNum:6,vecTail:[c.id],
    key:'dm_logic_equivalence_law',
    auditSpec:{family:'logic-law',caseId:c.id,left:c.left,right:c.right,law:c.law}
  });
});

registerGen('DM_Logic', (rng)=>{
  const cases = [
    {id:1,english:'If \\(p\\), then \\(q\\).',answer:'\\(p\\to q\\)',traps:['\\(q\\to p\\)','\\(p\\land q\\)','\\(p\\leftrightarrow q\\)']},
    {id:2,english:'\\(p\\) only if \\(q\\).',answer:'\\(p\\to q\\)',traps:['\\(q\\to p\\)','\\(p\\lor q\\)','\\(p\\leftrightarrow q\\)']},
    {id:3,english:'\\(p\\) if \\(q\\).',answer:'\\(q\\to p\\)',traps:['\\(p\\to q\\)','\\(p\\land q\\)','\\(p\\leftrightarrow q\\)']},
    {id:4,english:'\\(p\\) is sufficient for \\(q\\).',answer:'\\(p\\to q\\)',traps:['\\(q\\to p\\)','\\(p\\lor q\\)','\\(\\neg p\\to q\\)']},
    {id:5,english:'\\(p\\) is necessary for \\(q\\).',answer:'\\(q\\to p\\)',traps:['\\(p\\to q\\)','\\(p\\land q\\)','\\(p\\leftrightarrow q\\)']}
  ];
  const c=pick(rng,cases);
  return dmMakeProblem({
    q:`Translate into symbols: ${c.english}`,
    a:c.answer,
    steps:[
      c.id===2 ? '“Only if” introduces the necessary condition on the right side of the implication.'
        : c.id===3 ? '“p if q” means q is sufficient for p.'
        : c.id===5 ? 'If p is necessary for q, then q cannot occur without p.'
        : 'Identify the sufficient condition as the antecedent and the necessary condition as the consequent.',
      `The translation is ${c.answer}.`
    ],
    traps:c.traps.map(ans=>dmTrap(ans,'Check the direction of the implication and the meanings of “if,” “only if,” “necessary,” and “sufficient.”')),
    unitId:'DM_Logic',genNum:7,vecTail:[c.id],
    key:'dm_logic_translation',
    auditSpec:{family:'logic-translation',caseId:c.id,expected:c.answer}
  });
});

registerGen('DM_Logic', (rng)=>{
  const p=mwLogicVar('p'),q=mwLogicVar('q');
  const cases=[
    {id:1,left:mwLogicBinary('implies',p,q),right:mwLogicBinary('or',mwLogicNot(p),q)},
    {id:2,left:mwLogicNot(mwLogicBinary('and',p,q)),right:mwLogicBinary('or',mwLogicNot(p),mwLogicNot(q))},
    {id:3,left:mwLogicBinary('or',p,q),right:mwLogicBinary('and',p,q)},
    {id:4,left:mwLogicBinary('iff',p,q),right:mwLogicBinary('and',mwLogicBinary('implies',p,q),mwLogicBinary('implies',q,p))},
    {id:5,left:mwLogicBinary('implies',p,q),right:mwLogicBinary('implies',q,p)}
  ];
  const c=pick(rng,cases);
  const vars=['p','q'];
  const leftVals=mwTruthSequence(c.left,vars);
  const rightVals=mwTruthSequence(c.right,vars);
  const equivalent=leftVals.every((v,i)=>v===rightVals[i]);
  const leftSeq=dmTruthLetters(leftVals), rightSeq=dmTruthLetters(rightVals);
  const answer=equivalent
    ? `\\(\\text{Equivalent};\\ ${leftSeq}=${rightSeq}\\)`
    : `\\(\\text{Not equivalent};\\ ${leftSeq}\\ne ${rightSeq}\\)`;
  return dmMakeProblem({
    q:`Determine whether \\(${mwRenderLogicExpression(c.left)}\\) and \\(${mwRenderLogicExpression(c.right)}\\) are logically equivalent. Include both final columns.`,
    a:answer,
    steps:[
      `Left column: \\(${leftSeq}\\).`,
      `Right column: \\(${rightSeq}\\).`,
      equivalent ? 'The columns match in every row, so the expressions are equivalent.'
        : 'At least one row differs, so the expressions are not equivalent.'
    ],
    traps:[
      dmTrap(equivalent ? `\\(\\text{Not equivalent};\\ ${leftSeq}=${rightSeq}\\)` : `\\(\\text{Equivalent};\\ ${leftSeq}\\ne ${rightSeq}\\)`,'Equivalence is determined by whether every corresponding truth-table entry matches.'),
      dmTrap(`\\(\\text{Equivalent};\\ ${rightSeq}=${rightSeq}\\)`,'Both actual columns must be computed; copying one column does not establish equivalence.'),
      dmTrap(`\\(\\text{Not equivalent};\\ ${leftSeq.split(' ').reverse().join(' ')}\\ne ${rightSeq}\\)`,'Use the standard row order TT, TF, FT, FF.')
    ],
    unitId:'DM_Logic',genNum:8,vecTail:[c.id,equivalent?1:0,mwTruthSignatureInteger(leftVals),mwTruthSignatureInteger(rightVals)],
    key:'dm_logic_equivalence_check',
    auditSpec:{family:'logic-equivalence',left:mwCloneLogicExpression(c.left),right:mwCloneLogicExpression(c.right),variables:vars,equivalent,leftValues:leftVals,rightValues:rightVals}
  });
});

// -------------------- DM_Sets --------------------
registerGen('DM_Sets', (rng)=>{
  const c=pick(rng,DM_SET_CASES);
  const expected=dmSetUnion(c.A,c.B);
  return dmMakeProblem({
    q:`Let \\(A=${dmRenderSet(c.A)}\\) and \\(B=${dmRenderSet(c.B)}\\). Find \\(A\\cup B\\).`,
    a:`\\(${dmRenderSet(expected)}\\)`,
    steps:['A union contains every element appearing in either set.',`\\(A\\cup B=${dmRenderSet(expected)}\\).`],
    traps:[
      dmTrap(`\\(${dmRenderSet(dmSetIntersection(c.A,c.B))}\\)`,'This is the intersection, which keeps only elements common to both sets.'),
      dmTrap(`\\(${dmRenderSet(dmSetDifference(c.A,c.B))}\\)`,'This is A minus B, not the union.'),
      dmTrap(`\\(${dmRenderSet(dmSetSymDiff(c.A,c.B))}\\)`,'This omits elements shared by both sets; union includes them.')
    ],
    unitId:'DM_Sets',genNum:1,vecTail:[dmSetMask(c.A),dmSetMask(c.B),dmSetMask(expected)],
    key:'dm_sets_union',
    auditSpec:{family:'set-union',A:c.A,B:c.B,expected}
  });
});

registerGen('DM_Sets', (rng)=>{
  const c=pick(rng,DM_SET_CASES);
  const expected=dmSetIntersection(c.A,c.B);
  return dmMakeProblem({
    q:`Let \\(A=${dmRenderSet(c.A)}\\) and \\(B=${dmRenderSet(c.B)}\\). Find \\(A\\cap B\\).`,
    a:`\\(${dmRenderSet(expected)}\\)`,
    steps:['Intersection keeps only elements that occur in both sets.',`\\(A\\cap B=${dmRenderSet(expected)}\\).`],
    traps:[
      dmTrap(`\\(${dmRenderSet(dmSetUnion(c.A,c.B))}\\)`,'This is the union, which includes elements from either set.'),
      dmTrap(`\\(${dmRenderSet(dmSetDifference(c.A,c.B))}\\)`,'This is A minus B.'),
      dmTrap(`\\(${dmRenderSet(dmSetDifference(c.B,c.A))}\\)`,'This is B minus A.')
    ],
    unitId:'DM_Sets',genNum:2,vecTail:[dmSetMask(c.A),dmSetMask(c.B),dmSetMask(expected)],
    key:'dm_sets_intersection',
    auditSpec:{family:'set-intersection',A:c.A,B:c.B,expected}
  });
});

registerGen('DM_Sets', (rng)=>{
  const c=pick(rng,DM_SET_CASES);
  const expected=dmSetDifference(c.A,c.B);
  return dmMakeProblem({
    q:`Let \\(A=${dmRenderSet(c.A)}\\) and \\(B=${dmRenderSet(c.B)}\\). Find \\(A\\setminus B\\).`,
    a:`\\(${dmRenderSet(expected)}\\)`,
    steps:['Start with A and remove every element that also belongs to B.',`\\(A\\setminus B=${dmRenderSet(expected)}\\).`],
    traps:[
      dmTrap(`\\(${dmRenderSet(dmSetDifference(c.B,c.A))}\\)`,'Set difference is directional; this computes B minus A.'),
      dmTrap(`\\(${dmRenderSet(dmSetIntersection(c.A,c.B))}\\)`,'This keeps the shared elements instead of removing them.'),
      dmTrap(`\\(${dmRenderSet(dmSetUnion(c.A,c.B))}\\)`,'This combines both sets rather than subtracting.')
    ],
    unitId:'DM_Sets',genNum:3,vecTail:[dmSetMask(c.A),dmSetMask(c.B),dmSetMask(expected)],
    key:'dm_sets_difference',
    auditSpec:{family:'set-difference',A:c.A,B:c.B,expected}
  });
});

registerGen('DM_Sets', (rng)=>{
  const c=pick(rng,DM_SET_CASES);
  const expected=dmSetDifference(c.U,c.A);
  return dmMakeProblem({
    q:`In universe \\(U=${dmRenderSet(c.U)}\\), let \\(A=${dmRenderSet(c.A)}\\). Find \\(A^c\\).`,
    a:`\\(${dmRenderSet(expected)}\\)`,
    steps:['The complement contains the elements of U that are not in A.',`\\(A^c=U\\setminus A=${dmRenderSet(expected)}\\).`],
    traps:[
      dmTrap(`\\(${dmRenderSet(c.A)}\\)`,'The complement is what remains outside A within the stated universe.'),
      dmTrap(`\\(${dmRenderSet(c.U)}\\)`,'The whole universe includes elements that are in A.'),
      dmTrap(`\\(${dmRenderSet(dmSetDifference(c.A,c.U))}\\)`,'A is contained in U, so A minus U is empty; the subtraction order is reversed.')
    ],
    unitId:'DM_Sets',genNum:4,vecTail:[dmSetMask(c.U),dmSetMask(c.A),dmSetMask(expected)],
    key:'dm_sets_complement',
    auditSpec:{family:'set-complement',U:c.U,A:c.A,expected}
  });
});

registerGen('DM_Sets', (rng)=>{
  const n=randInt(rng,2,8);
  const expected=2**n;
  return dmMakeProblem({
    q:`A finite set has \\(${n}\\) elements. How many elements are in its power set?`,
    a:`\\(${expected}\\)`,
    steps:['Each original element has two choices: included or not included.',`Therefore \\(|\\mathcal P(A)|=2^{${n}}=${expected}\\).`],
    traps:dmNumericTrapSet(expected,[
      {value:n*n, why:'The power set count is exponential, not n squared.'},
      {value:dmFact(n), why:'Factorials count orderings, not subsets.'},
      {value:2*n, why:'Each element doubles the number of subsets, so the factors multiply.'},
      {value:expected-1, why:'This omits one of the subsets.'},
      {value:expected+1, why:'The number of subsets is exactly a power of two.'}
    ]),
    unitId:'DM_Sets',genNum:5,vecTail:[n,expected],
    key:'dm_sets_power_count',
    auditSpec:{family:'power-set-count',n,expected}
  });
});

registerGen('DM_Sets', (rng)=>{
  const bases=[
    ['a','b'],
    ['x','y'],
    [1,2],
    [2,4],
    ['p','q','r'],
    [1,2,3]
  ];
  const base=pick(rng,bases);
  const subsets=[];
  const count=2**base.length;
  for(let mask=0;mask<count;mask++){
    subsets.push(base.filter((_,i)=>(mask&(1<<i))!==0));
  }
  const rendered=`\\{${subsets.map(s=>dmRenderSet(s)).join(', ')}\\}`;
  const missingEmpty=`\\{${subsets.filter(s=>s.length).map(s=>dmRenderSet(s)).join(', ')}\\}`;
  const onlySingles=`\\{${base.map(x=>dmRenderSet([x])).join(', ')}\\}`;
  return dmMakeProblem({
    q:`List the power set of \\(A=${dmRenderSet(base)}\\).`,
    a:`\\(${rendered}\\)`,
    steps:[
      `A set with \\(${base.length}\\) elements has \\(2^{${base.length}}=${count}\\) subsets.`,
      'Include the empty set, every singleton, all larger subsets, and the original set.'
    ],
    traps:[
      dmTrap(`\\(${missingEmpty}\\)`,'The empty set is always an element of the power set.'),
      dmTrap(`\\(${onlySingles}\\)`,'The power set contains all subsets, not only singletons.'),
      dmTrap(`\\(${dmRenderSet(base)}\\)`,'The original set is one element of its power set, not the entire power set.')
    ],
    unitId:'DM_Sets',genNum:6,vecTail:[base.length,count],
    key:'dm_sets_power_list',
    auditSpec:{family:'power-set-list',base,expected:subsets}
  });
});

registerGen('DM_Sets', (rng)=>{
  const both=randInt(rng,4,18);
  const onlyA=randInt(rng,5,24);
  const onlyB=randInt(rng,5,24);
  const a=onlyA+both;
  const b=onlyB+both;
  const union=onlyA+onlyB+both;
  return dmMakeProblem({
    q:`In a survey, \\(${a}\\) students study Java, \\(${b}\\) study Python, and \\(${both}\\) study both. How many study at least one of the two languages?`,
    a:`\\(${union}\\)`,
    steps:[`Use inclusion–exclusion: \\(|A\\cup B|=|A|+|B|-|A\\cap B|\\).`,`\\(${a}+${b}-${both}=${union}\\).`],
    traps:[
      dmTrap(`\\(${a+b}\\)`,'Adding both totals double-counts students in the overlap.'),
      dmTrap(`\\(${onlyA+onlyB}\\)`,'This omits the students who study both languages.'),
      dmTrap(`\\(${a+b+both}\\)`,'The overlap must be subtracted once, not added.')
    ],
    unitId:'DM_Sets',genNum:7,vecTail:[a,b,both,union],
    key:'dm_sets_inclusion_exclusion',
    auditSpec:{family:'two-set-inclusion-exclusion',a,b,both,expected:union}
  });
});

registerGen('DM_Sets', (rng)=>{
  const m=randInt(rng,2,7), n=randInt(rng,2,7);
  const expected=m*n;
  return dmMakeProblem({
    q:`If \\(|A|=${m}\\) and \\(|B|=${n}\\), find \\(|A\\times B|\\).`,
    a:`\\(${expected}\\)`,
    steps:['For each element of A, there are |B| choices for the second coordinate.',`\\(|A\\times B|=${m}\\cdot${n}=${expected}\\).`],
    traps:[
      dmTrap(`\\(${m+n}\\)`,'Cartesian-product choices multiply rather than add.'),
      dmTrap(`\\(${Math.max(m,n)}\\)`,'The product contains one ordered pair for every combination of coordinates.'),
      dmTrap(`\\(${m*n*2}\\)`,'A×B already accounts for ordered pairs in the specified direction; do not double it.')
    ],
    unitId:'DM_Sets',genNum:8,vecTail:[m,n,expected],
    key:'dm_sets_cartesian_size',
    auditSpec:{family:'cartesian-size',m,n,expected}
  });
});

// -------------------- DM_Counting --------------------
registerGen('DM_Counting', (rng)=>{
  const tops=randInt(rng,3,9), bottoms=randInt(rng,2,7), shoes=randInt(rng,2,5);
  const expected=tops*bottoms*shoes;
  return dmMakeProblem({
    q:`A student has \\(${tops}\\) shirts, \\(${bottoms}\\) pairs of pants, and \\(${shoes}\\) pairs of shoes. How many outfits choose one of each?`,
    a:`\\(${expected}\\)`,
    steps:['Apply the product rule because one independent choice is made from each category.',`\\(${tops}\\cdot${bottoms}\\cdot${shoes}=${expected}\\).`],
    traps:[
      dmTrap(`\\(${tops+bottoms+shoes}\\)`,'The sum rule is not used when all three choices are made together.'),
      dmTrap(`\\(${tops*bottoms+shoes}\\)`,'All independent stages must be multiplied.'),
      dmTrap(`\\(${tops+bottoms*shoes}\\)`,'The product rule applies across every category.')
    ],
    unitId:'DM_Counting',genNum:1,vecTail:[tops,bottoms,shoes,expected],
    key:'dm_count_product_rule',
    auditSpec:{family:'product-rule',factors:[tops,bottoms,shoes],expected}
  });
});

registerGen('DM_Counting', (rng)=>{
  const n=randInt(rng,5,10), r=randInt(rng,2,Math.min(5,n));
  const expected=dmPerm(n,r);
  return dmMakeProblem({
    q:`How many ordered arrangements of \\(${r}\\) objects can be chosen from \\(${n}\\) distinct objects?`,
    a:`\\(${expected}\\)`,
    steps:[`Order matters, so use \\(P(${n},${r})=\\dfrac{${n}!}{(${n}-${r})!}\\).`,`The value is \\(${expected}\\).`],
    traps:[
      dmTrap(`\\(${dmChoose(n,r)}\\)`,'This is a combination and ignores order.'),
      dmTrap(`\\(${n**r}\\)`,'This would allow repetition; the objects are chosen without replacement.'),
      dmTrap(`\\(${dmFact(r)}\\)`,'This arranges only a fixed set of r objects and ignores which objects were selected.')
    ],
    unitId:'DM_Counting',genNum:2,vecTail:[n,r,expected],
    key:'dm_count_permutation',
    auditSpec:{family:'permutation',n,r,expected}
  });
});

registerGen('DM_Counting', (rng)=>{
  const n=randInt(rng,6,14), r=randInt(rng,2,Math.min(6,n-1));
  const expected=dmChoose(n,r);
  return dmMakeProblem({
    q:`A committee of \\(${r}\\) people is selected from \\(${n}\\) people. How many committees are possible?`,
    a:`\\(${expected}\\)`,
    steps:[`Order does not matter, so use \\(\\binom{${n}}{${r}}\\).`,`\\(\\binom{${n}}{${r}}=${expected}\\).`],
    traps:[
      dmTrap(`\\(${dmPerm(n,r)}\\)`,'This counts different orders of the same committee separately.'),
      dmTrap(`\\(${n**r}\\)`,'This allows repeated selections and ordered slots.'),
      dmTrap(`\\(${dmFact(n)}\\)`,'This orders all n people rather than choosing a committee.')
    ],
    unitId:'DM_Counting',genNum:3,vecTail:[n,r,expected],
    key:'dm_count_combination',
    auditSpec:{family:'combination',n,r,expected}
  });
});

registerGen('DM_Counting', (rng)=>{
  const cases=[
    {id:1,word:'LEVEL',counts:[2,2,1]},
    {id:2,word:'BANANA',counts:[3,2,1]},
    {id:3,word:'BALLOON',counts:[2,2,1,1,1]},
    {id:4,word:'TATTOO',counts:[2,2,2]},
    {id:5,word:'PEPPER',counts:[3,2,1]}
  ];
  const c=pick(rng,cases);
  const n=c.counts.reduce((a,b)=>a+b,0);
  const denom=c.counts.reduce((a,b)=>a*dmFact(b),1);
  const expected=dmFact(n)/denom;
  return dmMakeProblem({
    q:`How many distinct arrangements of the letters in ${c.word} are possible?`,
    a:`\\(${expected}\\)`,
    steps:[
      `Begin with \\(${n}!\\) arrangements and divide by a factorial for each repeated-letter count.`,
      `\\(\\dfrac{${n}!}{${c.counts.filter(x=>x>1).map(x=>`${x}!`).join('\\,')}}=${expected}\\).`
    ],
    traps:[
      dmTrap(`\\(${dmFact(n)}\\)`,'This treats repeated copies of the same letter as distinct.'),
      dmTrap(`\\(${dmFact(n)/Math.max(...c.counts)}\\)`,'Repeated objects require division by factorials, not merely by their counts.'),
      dmTrap(`\\(${denom}\\)`,'The product of repetition factorials is the divisor, not the final count.')
    ],
    unitId:'DM_Counting',genNum:4,vecTail:[c.id,n,expected],
    key:'dm_count_repeated_letters',
    auditSpec:{family:'multiset-permutation',word:c.word,counts:c.counts,expected}
  });
});

registerGen('DM_Counting', (rng)=>{
  const types=randInt(rng,3,7);
  const total=randInt(rng,4,12);
  const positive=rng()<0.5;
  const expected=positive ? dmChoose(total-1,types-1) : dmChoose(total+types-1,types-1);
  return dmMakeProblem({
    q:positive
      ? `How many ways can \\(${total}\\) identical items be distributed among \\(${types}\\) distinct boxes if every box receives at least one item?`
      : `How many ways can \\(${total}\\) identical items be distributed among \\(${types}\\) distinct boxes if boxes may be empty?`,
    a:`\\(${expected}\\)`,
    steps:positive
      ? [`Use positive stars and bars: \\(\\binom{${total}-1}{${types}-1}\\).`,`The count is \\(${expected}\\).`]
      : [`Use nonnegative stars and bars: \\(\\binom{${total}+${types}-1}{${types}-1}\\).`,`The count is \\(${expected}\\).`],
    traps:positive ? [
      dmTrap(`\\(${dmChoose(total+types-1,types-1)}\\)`,'This formula allows empty boxes, contrary to the condition.'),
      dmTrap(`\\(${dmChoose(total,types)}\\)`,'This does not place the correct number of bars among the available gaps.'),
      dmTrap(`\\(${types**total}\\)`,'This treats the identical items as distinct.')
    ] : [
      dmTrap(`\\(${dmChoose(total-1,types-1)}\\)`,'This formula forces every box to be nonempty.'),
      dmTrap(`\\(${dmChoose(total+types,types)}\\)`,'This uses one extra star and one extra bar.'),
      dmTrap(`\\(${types**total}\\)`,'This treats the identical items as distinct.')
    ],
    unitId:'DM_Counting',genNum:5,vecTail:[types,total,positive?1:0,expected],
    key:'dm_count_stars_bars',
    auditSpec:{family:'stars-bars',types,total,positive,expected}
  });
});

registerGen('DM_Counting', (rng)=>{
  const boxes=randInt(rng,3,9);
  const guaranteed=randInt(rng,2,6);
  const expected=(guaranteed-1)*boxes+1;
  return dmMakeProblem({
    q:`What is the minimum number of objects placed into \\(${boxes}\\) boxes that guarantees at least one box contains \\(${guaranteed}\\) objects?`,
    a:`\\(${expected}\\)`,
    steps:[
      `To avoid ${guaranteed} in any box, place at most ${guaranteed-1} in each box.`,
      `That allows \\(${boxes}(${guaranteed-1})=${expected-1}\\) objects, so one more gives \\(${expected}\\).`
    ],
    traps:[
      dmTrap(`\\(${boxes*guaranteed}\\)`,'The guarantee occurs one before filling every box to the target.'),
      dmTrap(`\\(${boxes+guaranteed}\\)`,'The pigeonhole bound multiplies the maximum safe occupancy by the number of boxes.'),
      dmTrap(`\\(${expected-1}\\)`,'At this many objects, every box could still contain only the safe maximum.')
    ],
    unitId:'DM_Counting',genNum:6,vecTail:[boxes,guaranteed,expected],
    key:'dm_count_pigeonhole',
    auditSpec:{family:'pigeonhole-minimum',boxes,guaranteed,expected}
  });
});

registerGen('DM_Counting', (rng)=>{
  const n=randInt(rng,5,12), k=randInt(rng,1,n-1);
  const expected=dmChoose(n,k);
  return dmMakeProblem({
    q:`How many binary strings of length \\(${n}\\) contain exactly \\(${k}\\) ones?`,
    a:`\\(${expected}\\)`,
    steps:[`Choose the ${k} positions occupied by ones.`,`\\(\\binom{${n}}{${k}}=${expected}\\).`],
    traps:dmNumericTrapSet(expected,[
      {value:2**n, why:'This counts all binary strings, not only those with exactly k ones.'},
      {value:dmPerm(n,k), why:'The selected positions form an unordered subset.'},
      {value:n*k, why:'The positions must be chosen as a combination.'},
      {value:expected-1, why:'This omits one valid choice of positions.'},
      {value:expected+1, why:'The exact count is the binomial coefficient.'}
    ]),
    unitId:'DM_Counting',genNum:7,vecTail:[n,k,expected],
    key:'dm_count_binary_exact',
    auditSpec:{family:'binary-exact-ones',n,k,expected}
  });
});

registerGen('DM_Counting', (rng)=>{
  const letters=randInt(rng,2,5), digits=randInt(rng,2,4);
  const noRepeat=rng()<0.5;
  let expected;
  if(noRepeat){
    expected=dmPerm(26,letters)*dmPerm(10,digits);
  }else{
    expected=(26**letters)*(10**digits);
  }
  return dmMakeProblem({
    q:`A code has \\(${letters}\\) letters followed by \\(${digits}\\) digits. ${noRepeat?'No character may repeat within its section.':'Repetition is allowed.'} How many codes are possible?`,
    a:`\\(${expected}\\)`,
    steps:noRepeat
      ? [`Use falling products: \\(P(26,${letters})P(10,${digits})\\).`,`The count is \\(${expected}\\).`]
      : [`Each letter slot has 26 choices and each digit slot has 10 choices.`,`\\(26^{${letters}}10^{${digits}}=${expected}\\).`],
    traps:[
      dmTrap(`\\(${26**letters*10**digits}\\)`,noRepeat ? 'This allows repetition, but the question forbids it.' : 'This is the repetition-allowed count; compare it carefully with the stated condition.'),
      dmTrap(`\\(${dmChoose(26,letters)*dmChoose(10,digits)}\\)`,'This ignores the order of positions.'),
      dmTrap(`\\(${26*letters+10*digits}\\)`,'Independent slot choices multiply; they do not add.')
    ],
    unitId:'DM_Counting',genNum:8,vecTail:[letters,digits,noRepeat?1:0,expected],
    key:'dm_count_codes',
    auditSpec:{family:'codes',letters,digits,noRepeat,expected}
  });
});

// -------------------- DM_RelFunc --------------------
const DM_RELATION_CASES = Object.freeze([
  Object.freeze({
    id:1,set:[1,2,3],pairs:[[1,1],[2,2],[3,3]],
    props:{reflexive:true,symmetric:true,antisymmetric:true,transitive:true}
  }),
  Object.freeze({
    id:2,set:[1,2,3],pairs:[[1,1],[2,2],[3,3],[1,2],[1,3],[2,3]],
    props:{reflexive:true,symmetric:false,antisymmetric:true,transitive:true}
  }),
  Object.freeze({
    id:3,set:[1,2,3],pairs:[[1,1],[2,2],[3,3],[1,2],[2,1]],
    props:{reflexive:true,symmetric:true,antisymmetric:false,transitive:true}
  }),
  Object.freeze({
    id:4,set:[1,2,3],pairs:[[1,1],[2,2],[3,3],[1,2],[2,1],[2,3],[3,2]],
    props:{reflexive:true,symmetric:true,antisymmetric:false,transitive:false}
  }),
  Object.freeze({
    id:5,set:[1,2,3],pairs:[[1,2],[2,3],[3,1]],
    props:{reflexive:false,symmetric:false,antisymmetric:true,transitive:false}
  })
]);

function dmRelationPropLabel(props){
  const names=[];
  if(props.reflexive) names.push('reflexive');
  if(props.symmetric) names.push('symmetric');
  if(props.antisymmetric) names.push('antisymmetric');
  if(props.transitive) names.push('transitive');
  return names.length ? names.join(', ') : 'none of the listed properties';
}

registerGen('DM_RelFunc', (rng)=>{
  const c=pick(rng,DM_RELATION_CASES);
  const label=dmRelationPropLabel(c.props);
  const trapProps=[
    {reflexive:true,symmetric:true,antisymmetric:false,transitive:true},
    {reflexive:true,symmetric:false,antisymmetric:true,transitive:true},
    {reflexive:false,symmetric:false,antisymmetric:true,transitive:false},
    {reflexive:true,symmetric:true,antisymmetric:false,transitive:false}
  ].map(dmRelationPropLabel).filter(x=>x!==label);
  while(trapProps.length<3) trapProps.push('reflexive only');
  return dmMakeProblem({
    q:`On \\(A=${dmRenderSet(c.set)}\\), let \\(R=${dmRenderOrderedPairs(c.pairs)}\\). Which properties does \\(R\\) have?`,
    a:dmTextAnswer(label),
    steps:[
      'Check every diagonal pair for reflexivity, reversed pairs for symmetry, two-way distinct pairs for antisymmetry, and composable pairs for transitivity.',
      `The correct property list is: ${label}.`
    ],
    traps:trapProps.slice(0,3).map(x=>dmTrap(dmTextAnswer(x),'Test each relation property from its definition; one counterexample is enough to disprove a property.')),
    unitId:'DM_RelFunc',genNum:1,vecTail:[c.id,c.pairs.length],
    key:'dm_relation_properties',
    auditSpec:{family:'relation-properties',set:c.set,pairs:c.pairs,expected:c.props}
  });
});

registerGen('DM_RelFunc', (rng)=>{
  const m=pick(rng,[2,3,4,5]);
  const a=randInt(rng,0,m-1);
  const universe=Array.from({length:16},(_,i)=>i);
  const expected=universe.filter(x=>x%m===a);
  return dmMakeProblem({
    q:`On \\(U=${dmRenderSet(universe)}\\), use congruence modulo \\(${m}\\). List the equivalence class \\([${a}]_${m}\\).`,
    a:`\\(${dmRenderSet(expected)}\\)`,
    steps:[`Numbers are equivalent when they have the same remainder modulo ${m}.`,`Select the elements of U congruent to ${a}: \\(${dmRenderSet(expected)}\\).`],
    traps:[
      dmTrap(`\\(${dmRenderSet(universe.filter(x=>x%m===(a+1)%m))}\\)`,'This is the next residue class, not the requested one.'),
      dmTrap(`\\(${dmRenderSet(universe.filter(x=>x<=a))}\\)`,'An equivalence class is determined by congruence, not by being less than a.'),
      dmTrap(`\\(${dmRenderSet([a])}\\)`,'The class contains every element of U with the same remainder, not only its representative.')
    ],
    unitId:'DM_RelFunc',genNum:2,vecTail:[m,a,dmSetMask(expected)],
    key:'dm_relation_equivalence_class',
    auditSpec:{family:'mod-equivalence-class',modulus:m,residue:a,universe,expected}
  });
});

registerGen('DM_RelFunc', (rng)=>{
  const n=pick(rng,[4,5,6,7,8,9]);
  const a=randInt(rng,1,n-1);
  const b=randInt(rng,0,n-1);
  const g=gcd(a,n);
  const classification=g===1 ? 'bijective' : 'neither injective nor surjective';
  return dmMakeProblem({
    q:`Define \\(f:\\mathbb Z_${n}\\to\\mathbb Z_${n}\\) by \\(f(x)\\equiv ${a}x+${b}\\pmod{${n}}\\). Classify \\(f\\).`,
    a:dmTextAnswer(classification),
    steps:[
      `An affine map modulo n is bijective exactly when \\(\\gcd(a,n)=1\\).`,
      `\\(\\gcd(${a},${n})=${g}\\), so the map is ${classification}.`
    ],
    traps:[
      dmTrap(dmTextAnswer('injective but not surjective'),'For finite sets of equal size, injective and surjective are equivalent.'),
      dmTrap(dmTextAnswer('surjective but not injective'),'For a finite function from a set to itself, surjectivity implies injectivity.'),
      dmTrap(dmTextAnswer(g===1?'neither injective nor surjective':'bijective'),'The gcd of the multiplier and the modulus decides whether multiplication is invertible.')
    ],
    unitId:'DM_RelFunc',genNum:3,vecTail:[n,a,b,g],
    key:'dm_function_mod_classify',
    auditSpec:{family:'mod-affine-classification',n,a,b,g,expected:classification}
  });
});

registerGen('DM_RelFunc', (rng)=>{
  const a=pick(rng,[-3,-2,-1,1,2,3]), b=randInt(rng,-5,5);
  const c=pick(rng,[-3,-2,-1,1,2,3]), d=randInt(rng,-5,5);
  const x=randInt(rng,-4,4);
  const gx=c*x+d;
  const expected=a*gx+b;
  return dmMakeProblem({
    q:`Let \\(f(x)=${a}x${fmtSigned(b)}\\) and \\(g(x)=${c}x${fmtSigned(d)}\\). Find \\((f\\circ g)(${x})\\).`,
    a:`\\(${expected}\\)`,
    steps:[`First, \\(g(${x})=${c}(${x})${fmtSigned(d)}=${gx}\\).`,`Then \\(f(${gx})=${a}(${gx})${fmtSigned(b)}=${expected}\\).`],
    traps:dmNumericTrapSet(expected,[
      {value:c*(a*x+b)+d, why:'This computes g∘f instead of f∘g.'},
      {value:(a+c)*x+b+d, why:'Function composition is substitution, not addition of formulas.'},
      {value:a*x+b+c*x+d, why:'This adds f(x) and g(x) rather than composing them.'},
      {value:expected-1, why:'A substitution or arithmetic step is off by one.'},
      {value:expected+1, why:'A substitution or arithmetic step is off by one.'}
    ]),
    unitId:'DM_RelFunc',genNum:4,vecTail:[a,b,c,d,x,expected],
    key:'dm_function_composition',
    auditSpec:{family:'function-composition-linear',a,b,c,d,x,expected}
  });
});

registerGen('DM_RelFunc', (rng)=>{
  const a=pick(rng,[-4,-3,-2,-1,1,2,3,4]), b=randInt(rng,-6,6);
  const numerator = b===0 ? 'x' : `x${fmtSigned(-b)}`;
  const answer = a===1 ? `\\(f^{-1}(x)=${numerator}\\)`
    : a===-1 ? `\\(f^{-1}(x)=-(${numerator})\\)`
    : `\\(f^{-1}(x)=\\dfrac{${numerator}}{${a}}\\)`;
  return dmMakeProblem({
    q:`Find the inverse of \\(f(x)=${a}x${fmtSigned(b)}\\).`,
    a:answer,
    steps:[
      `Write \\(y=${a}x${fmtSigned(b)}\\), interchange x and y, and solve for y.`,
      `\\(x=${a}y${fmtSigned(b)}\\Rightarrow y=\\dfrac{x${fmtSigned(-b)}}{${a}}\\).`
    ],
    traps:[
      dmTrap(`\\(f^{-1}(x)=\\dfrac{x${fmtSigned(b)}}{${a}}\\)`,'The constant must be moved with the opposite sign before dividing by a.'),
      dmTrap(`\\(f^{-1}(x)=\\dfrac{-x${fmtSigned(b)}}{${a}}\\)`,'This reverses the slope as well as moving the constant.'),
      dmTrap(`\\(f^{-1}(x)=\\dfrac{${a}}{x${fmtSigned(-b)}}\\)`,'An inverse function is not the reciprocal of the original formula.'),
      dmTrap(`\\(f^{-1}(x)=${b}\\)`,'Keeping only the constant does not undo the original function.')
    ],
    unitId:'DM_RelFunc',genNum:5,vecTail:[a,b],
    key:'dm_function_inverse',
    auditSpec:{family:'linear-inverse',a,b}
  });
});

registerGen('DM_RelFunc', (rng)=>{
  const n=randInt(rng,3,7);
  const pairs=[];
  for(let i=1;i<=n;i++){
    for(let j=1;j<=n;j++){
      if((i+j)%2===0) pairs.push([i,j]);
    }
  }
  const expected=pairs.length;
  return dmMakeProblem({
    q:`On \\(A=\\{1,2,\\dots,${n}\\}\\), define \\(iRj\\) when \\(i+j\\) is even. How many ordered pairs are in \\(R\\)?`,
    a:`\\(${expected}\\)`,
    steps:[
      'A sum is even when the two numbers have the same parity.',
      `Count odd–odd pairs and even–even pairs to obtain \\(${expected}\\).`
    ],
    traps:[
      dmTrap(`\\(${n*n}\\)`,'Not every ordered pair has an even sum.'),
      dmTrap(`\\(${Math.floor(n*n/2)}\\)`,'Parity counts depend on the exact numbers of odd and even elements.'),
      dmTrap(`\\(${n}\\)`,'The relation includes many off-diagonal pairs as well as diagonal pairs.')
    ],
    unitId:'DM_RelFunc',genNum:6,vecTail:[n,expected],
    key:'dm_relation_pair_count',
    auditSpec:{family:'relation-even-sum-count',n,expected,pairs}
  });
});

// -------------------- DM_Graphs --------------------
registerGen('DM_Graphs', (rng)=>{
  const n=randInt(rng,4,9);
  const cases=[
    {id:1,name:'cycle',degrees:Array(n).fill(2),edges:n},
    {id:2,name:'path',degrees:[1,...Array(Math.max(0,n-2)).fill(2),1],edges:n-1},
    {id:3,name:'star',degrees:[n-1,...Array(n-1).fill(1)],edges:n-1},
    {id:4,name:'complete',degrees:Array(n).fill(n-1),edges:n*(n-1)/2}
  ];
  const c=pick(rng,cases);
  const missingIndex=randInt(rng,0,c.degrees.length-1);
  const expected=c.degrees[missingIndex];
  const known=c.degrees.filter((_,i)=>i!==missingIndex);
  const knownSum=known.reduce((a,b)=>a+b,0);
  return dmMakeProblem({
    q:`A graph has \\(${c.edges}\\) edges. The degrees of all but one vertex are \\(${known.join(', ')}\\). Find the missing degree.`,
    a:`\\(${expected}\\)`,
    steps:[`The degree sum is twice the number of edges: \\(2|E|=${2*c.edges}\\).`,`Subtract the known degrees: \\(${2*c.edges}-${knownSum}=${expected}\\).`],
    traps:[
      dmTrap(`\\(${2*c.edges}\\)`,'This is the total degree sum, not the missing degree.'),
      dmTrap(`\\(${expected+1}\\)`,'Subtract the known degree sum exactly; do not add one.'),
      dmTrap(`\\(${expected===0?2:expected-1}\\)`,'The handshake calculation determines the missing degree exactly.')
    ],
    unitId:'DM_Graphs',genNum:1,vecTail:[c.id,n,c.edges,missingIndex,expected],
    key:'dm_graph_handshake_missing',
    auditSpec:{family:'handshake-missing',graphType:c.name,edges:c.edges,degrees:c.degrees,missingIndex,known,expected}
  });
});

registerGen('DM_Graphs', (rng)=>{
  const n=randInt(rng,4,10);
  const degree=pick(rng,[2,4,6]);
  const sum=n*degree;
  const expected=sum/2;
  return dmMakeProblem({
    q:`A graph has \\(${n}\\) vertices, each of degree \\(${degree}\\). How many edges does it have?`,
    a:`\\(${expected}\\)`,
    steps:[`The degree sum is \\(${n}\\cdot${degree}=${sum}\\).`,`By the handshake lemma, \\(|E|=${sum}/2=${expected}\\).`],
    traps:[
      dmTrap(`\\(${sum}\\)`,'Each edge contributes two to the degree sum.'),
      dmTrap(`\\(${n+degree}\\)`,'Vertex count and degree do not add to give edges.'),
      dmTrap(`\\(${expected+1}\\)`,'Apply the exact half-degree-sum formula.')
    ],
    unitId:'DM_Graphs',genNum:2,vecTail:[n,degree,expected],
    key:'dm_graph_edges_degree_sum',
    auditSpec:{family:'regular-graph-edges',n,degree,expected}
  });
});

registerGen('DM_Graphs', (rng)=>{
  const cases=[
    {id:1,name:'cycle',degrees:[2,2,2,2,2],answer:'Euler circuit'},
    {id:2,name:'path',degrees:[1,2,2,2,1],answer:'Euler path but no Euler circuit'},
    {id:3,name:'star',degrees:[3,1,1,1],answer:'neither'},
    {id:4,name:'complete K4',degrees:[3,3,3,3],answer:'neither'},
    {id:5,name:'complete K5',degrees:[4,4,4,4,4],answer:'Euler circuit'}
  ];
  const c=pick(rng,cases);
  const odd=c.degrees.filter(d=>d%2).length;
  return dmMakeProblem({
    q:`A connected graph has degree sequence \\(${c.degrees.join(', ')}\\). Does it have an Euler path, an Euler circuit, or neither?`,
    a:dmTextAnswer(c.answer),
    steps:[
      `Count odd-degree vertices: ${odd}.`,
      odd===0 ? 'A connected graph with zero odd vertices has an Euler circuit.'
        : odd===2 ? 'A connected graph with exactly two odd vertices has an Euler path but not a circuit.'
        : 'A connected graph with more than two odd vertices has neither.'
    ],
    traps:['Euler circuit','Euler path but no Euler circuit','neither','Hamilton circuit']
      .filter(x=>x!==c.answer).slice(0,3)
      .map(x=>dmTrap(dmTextAnswer(x),'Euler classification is determined by connectedness and the number of odd-degree vertices.')),
    unitId:'DM_Graphs',genNum:3,vecTail:[c.id,odd],
    key:'dm_graph_euler_classify',
    auditSpec:{family:'euler-classification',degrees:c.degrees,connected:true,expected:c.answer}
  });
});

registerGen('DM_Graphs', (rng)=>{
  const n=randInt(rng,4,18);
  const expected=n-1;
  return dmMakeProblem({
    q:`How many edges does a tree with \\(${n}\\) vertices have?`,
    a:`\\(${expected}\\)`,
    steps:['Every finite tree with n vertices has exactly n−1 edges.',`\\(${n}-1=${expected}\\).`],
    traps:[
      dmTrap(`\\(${n}\\)`,'A connected graph with one cycle may have n edges; a tree has no cycles.'),
      dmTrap(`\\(${n+1}\\)`,'Adding extra edges would create cycles.'),
      dmTrap(`\\(${n*(n-1)/2}\\)`,'This is the number of edges in a complete graph.')
    ],
    unitId:'DM_Graphs',genNum:4,vecTail:[n,expected],
    key:'dm_graph_tree_edges',
    auditSpec:{family:'tree-edges',n,expected}
  });
});

registerGen('DM_Graphs', (rng)=>{
  const n=randInt(rng,4,12);
  const expected=n*(n-1)/2;
  return dmMakeProblem({
    q:`How many edges are in the complete graph \\(K_${n}\\)?`,
    a:`\\(${expected}\\)`,
    steps:[`Every pair of distinct vertices determines one edge.`,`\\(|E|=\\binom{${n}}{2}=${expected}\\).`],
    traps:[
      dmTrap(`\\(${n*n}\\)`,'Loops and duplicate directions are not edges of a simple complete graph.'),
      dmTrap(`\\(${n*(n-1)}\\)`,'This counts each undirected edge twice.'),
      dmTrap(`\\(${n-1}\\)`,'That is the edge count of a tree, not a complete graph.')
    ],
    unitId:'DM_Graphs',genNum:5,vecTail:[n,expected],
    key:'dm_graph_complete_edges',
    auditSpec:{family:'complete-graph-edges',n,expected}
  });
});

registerGen('DM_Graphs', (rng)=>{
  const m=randInt(rng,2,8), n=randInt(rng,2,8);
  const expected=m*n;
  return dmMakeProblem({
    q:`How many edges are in the complete bipartite graph \\(K_{${m},${n}}\\)?`,
    a:`\\(${expected}\\)`,
    steps:[`Each of the ${m} vertices in one part connects to all ${n} vertices in the other part.`,`\\(|E|=${m}\\cdot${n}=${expected}\\).`],
    traps:[
      dmTrap(`\\(${m+n}\\)`,'The part sizes add to the vertex count, not the edge count.'),
      dmTrap(`\\(${m*(m-1)/2+n*(n-1)/2}\\)`,'Complete bipartite graphs have no edges within either part.'),
      dmTrap(`\\(${(m+n)*(m+n-1)/2}\\)`,'This is the complete graph on all vertices, including forbidden within-part edges.')
    ],
    unitId:'DM_Graphs',genNum:6,vecTail:[m,n,expected],
    key:'dm_graph_bipartite_edges',
    auditSpec:{family:'complete-bipartite-edges',m,n,expected}
  });
});

registerGen('DM_Graphs', (rng)=>{
  const n=randInt(rng,5,12);
  const total=n*(n-1)/2;
  const edges=randInt(rng,n-1,total-1);
  const expected=total-edges;
  return dmMakeProblem({
    q:`A simple graph on \\(${n}\\) vertices has \\(${edges}\\) edges. How many edges does its complement have?`,
    a:`\\(${expected}\\)`,
    steps:[`There are \\(\\binom{${n}}{2}=${total}\\) possible edges.`,`The complement has \\(${total}-${edges}=${expected}\\) edges.`],
    traps:[
      dmTrap(`\\(${total}\\)`,'This is the total possible number of edges before removing the original graph’s edges.'),
      dmTrap(`\\(${edges}\\)`,'The complement need not have the same edge count as the original.'),
      dmTrap(`\\(${total+edges}\\)`,'Complement edges are the missing edges, so subtract.')
    ],
    unitId:'DM_Graphs',genNum:7,vecTail:[n,edges,total,expected],
    key:'dm_graph_complement_edges',
    auditSpec:{family:'graph-complement-edges',n,edges,expected}
  });
});

registerGen('DM_Graphs', (rng)=>{
  const n=randInt(rng,3,14);
  const even=n%2===0;
  const expected=even ? 'bipartite with chromatic number 2' : 'not bipartite with chromatic number 3';
  return dmMakeProblem({
    q:`Classify the cycle graph \\(C_${n}\\): is it bipartite, and what is its chromatic number?`,
    a:dmTextAnswer(expected),
    steps:[
      even ? 'An even cycle alternates between two color classes.' : 'An odd cycle cannot be two-colored without a conflict.',
      even ? '\\(\\chi(C_n)=2\\) for even n.' : '\\(\\chi(C_n)=3\\) for odd n.'
    ],
    traps:[
      dmTrap(dmTextAnswer('bipartite with chromatic number 3'),'A bipartite graph with at least one edge has chromatic number 2.'),
      dmTrap(dmTextAnswer('not bipartite with chromatic number 2'),'A graph is bipartite exactly when it is two-colorable.'),
      dmTrap(dmTextAnswer(even?'not bipartite with chromatic number 3':'bipartite with chromatic number 2'),'Cycle parity determines bipartiteness.')
    ],
    unitId:'DM_Graphs',genNum:8,vecTail:[n,even?1:0,even?2:3],
    key:'dm_graph_cycle_color',
    auditSpec:{family:'cycle-coloring',n,bipartite:even,chromatic:even?2:3}
  });
});

// -------------------- DM_ProofRec --------------------
registerGen('DM_ProofRec', (rng)=>{
  const cases=[
    {id:1,scenario:'Assume an integer is not odd and show it must be even.',answer:'direct proof'},
    {id:2,scenario:'Assume the conclusion is false and derive a contradiction.',answer:'proof by contradiction'},
    {id:3,scenario:'To prove \\(P\\to Q\\), prove \\(\\neg Q\\to\\neg P\\).',answer:'proof by contrapositive'},
    {id:4,scenario:'Prove a base case, assume \\(P(k)\\), and establish \\(P(k+1)\\).',answer:'mathematical induction'}
  ];
  const c=pick(rng,cases);
  const others=cases.filter(x=>x.id!==c.id);
  return dmMakeProblem({
    q:`Identify the proof method: ${c.scenario}`,
    a:dmTextAnswer(c.answer),
    steps:[`The described structure matches ${c.answer}.`],
    traps:others.map(x=>dmTrap(dmTextAnswer(x.answer),'Match the defining structure of the method, not merely the topic of the statement.')),
    unitId:'DM_ProofRec',genNum:1,vecTail:[c.id],
    key:'dm_proof_method',
    auditSpec:{family:'proof-method',caseId:c.id,expected:c.answer}
  });
});

registerGen('DM_ProofRec', (rng)=>{
  const n=randInt(rng,1,6);
  const lhs=n*(n+1)/2;
  const rhs=lhs;
  return dmMakeProblem({
    q:`For the claim \\(1+2+\\cdots+n=\\dfrac{n(n+1)}2\\), verify the statement at \\(n=${n}\\).`,
    a:`\\(${lhs}=${rhs}\\)`,
    steps:[`The left side is \\(1+\\cdots+${n}=${lhs}\\).`,`The right side is \\(\\dfrac{${n}(${n+1})}{2}=${rhs}\\), so the case holds.`],
    traps:[
      dmTrap(`\\(${lhs}=${rhs+1}\\)`,'Evaluate the formula exactly at the stated value of n.'),
      dmTrap(`\\(${lhs+n}=${rhs}\\)`,'Do not include the next term when checking the current case.'),
      dmTrap(`\\(${n}=${rhs}\\)`,'The left side is a sum, not merely its final term.')
    ],
    unitId:'DM_ProofRec',genNum:2,vecTail:[n,lhs],
    key:'dm_proof_base_case',
    auditSpec:{family:'induction-base-sum',n,lhs,rhs}
  });
});

registerGen('DM_ProofRec', (rng)=>{
  const k=randInt(rng,2,9);
  const answer=`\\(1+3+\\cdots+(2k-1)+(2k+1)=k^2+2k+1=(k+1)^2\\)`;
  return dmMakeProblem({
    q:`In an induction proof of \\(1+3+\\cdots+(2n-1)=n^2\\), assume the claim holds for \\(n=k\\). Which step correctly proves the \\(k+1\\) case?`,
    a:answer,
    steps:[
      'The next odd term is \\(2(k+1)-1=2k+1\\).',
      'Use the hypothesis \\(1+3+\\cdots+(2k-1)=k^2\\).',
      '\\(k^2+(2k+1)=(k+1)^2\\).'
    ],
    traps:[
      dmTrap(`\\(1+3+\\cdots+(2k-1)+2k=k^2+2k\\)`,'The next odd term is 2k+1, not 2k.'),
      dmTrap(`\\(1+3+\\cdots+(2k+1)=(k+1)^2\\) by assuming the statement for \\(k+1\\)`,'This assumes the conclusion instead of using the induction hypothesis at k.'),
      dmTrap(`\\(k^2+(2k-1)=(k+1)^2\\)`,'The term 2k−1 is already included in the induction hypothesis.')
    ],
    unitId:'DM_ProofRec',genNum:3,vecTail:[k],
    key:'dm_proof_induction_step',
    auditSpec:{family:'induction-next-step',k,expected:'k^2+(2k+1)=(k+1)^2'}
  });
});

registerGen('DM_ProofRec', (rng)=>{
  const r=pick(rng,[-3,-2,-1,2,3,4]);
  const b=randInt(rng,-5,5);
  const a0=randInt(rng,-5,5);
  const values=[a0];
  for(let i=1;i<=3;i++) values.push(r*values[i-1]+b);
  return dmMakeProblem({
    q:`Let \\(a_0=${a0}\\) and \\(a_n=${r}a_{n-1}${fmtSigned(b)}\\). Find \\(a_1,a_2,a_3\\).`,
    a:`\\((${values.slice(1).join(', ')})\\)`,
    steps:[
      `\\(a_1=${r}(${values[0]})${fmtSigned(b)}=${values[1]}\\).`,
      `\\(a_2=${r}(${values[1]})${fmtSigned(b)}=${values[2]}\\).`,
      `\\(a_3=${r}(${values[2]})${fmtSigned(b)}=${values[3]}\\).`
    ],
    traps:dmTupleTrapSet(values.slice(1),[
      {
        values:[values[0],values[1],values[2]],
        why:'The question asks for a1 through a3, not a0 through a2.'
      },
      {
        values:[values[1]-b,values[2]-b,values[3]-b],
        why:'The constant term b must be included at every step.'
      },
      {
        values:[r*a0,r*r*a0,r*r*r*a0],
        why:'This ignores the added constant b.'
      },
      {
        values:[values[1]+1,values[2],values[3]],
        why:'The first recurrence substitution has an arithmetic error.'
      },
      {
        values:[values[1],values[2]+1,values[3]],
        why:'The second recurrence substitution has an arithmetic error.'
      }
    ]),
    unitId:'DM_ProofRec',genNum:4,vecTail:[r,b,a0,...values.slice(1)],
    key:'dm_recurrence_iterate',
    auditSpec:{family:'first-order-recurrence-iterate',r,b,a0,expected:values.slice(1)}
  });
});

registerGen('DM_ProofRec', (rng)=>{
  const r=pick(rng,[-2,-1,2,3]);
  const equilibrium=randInt(rng,-4,4);
  const b=(1-r)*equilibrium;
  let a0=randInt(rng,-5,5);
  if(a0===equilibrium) a0+=1;
  const coefficient=a0-equilibrium;
  const rTerm=r===1?'1':String(r);
  const formula=`a_n=${equilibrium}${coefficient>=0?'+':''}${coefficient}(${rTerm})^n`;
  return dmMakeProblem({
    q:`Solve the recurrence \\(a_n=${r}a_{n-1}${fmtSigned(b)}\\) with \\(a_0=${a0}\\).`,
    a:`\\(${formula}\\)`,
    steps:[
      `The equilibrium L satisfies \\(L=${r}L${fmtSigned(b)}\\), so \\(L=${equilibrium}\\).`,
      `Then \\(a_n-L=${r}(a_{n-1}-L)\\).`,
      `Therefore \\(a_n=${equilibrium}+(${a0}-${equilibrium})(${r})^n=${formula}\\).`
    ],
    traps:[
      dmTrap(`\\(a_n=${a0}(${r})^n\\)`,'This omits the equilibrium shift caused by the constant term.'),
      dmTrap(`\\(a_n=${equilibrium}${coefficient>=0?'+':''}${coefficient}n\\)`,'The homogeneous part is geometric, not linear in n.'),
      dmTrap(`\\(a_n=${equilibrium}${coefficient>=0?'+':''}${coefficient}(${b})^n\\)`,'The geometric rate is r, not the added constant b.')
    ],
    unitId:'DM_ProofRec',genNum:5,vecTail:[r,b,equilibrium,a0,coefficient],
    key:'dm_recurrence_first_order_solve',
    auditSpec:{family:'first-order-recurrence-closed',r,b,equilibrium,a0,coefficient}
  });
});

registerGen('DM_ProofRec', (rng)=>{
  let r1=pick(rng,[-3,-2,-1,1,2,3]);
  let r2=pick(rng,[-3,-2,-1,1,2,3]);
  if(r2===r1) r2 = r1===3 ? 2 : r1+1;
  const s=r1+r2;
  const p=r1*r2;
  const roots=dmUniqueSorted([r1,r2]);
  return dmMakeProblem({
    q:`Find the characteristic roots of \\(a_n=${s}a_{n-1}${fmtSigned(-p)}a_{n-2}\\).`,
    a:`\\(r=${roots[0]},\\ ${roots[1]}\\)`,
    steps:[
      `The characteristic equation is \\(r^2-${s}r${fmtSigned(p)}=0\\).`,
      `Factor as \\((r-${r1})(r-${r2})=0\\).`,
      `The roots are \\(${roots[0]}\\) and \\(${roots[1]}\\).`
    ],
    traps:[
      dmTrap(`\\(r=${-roots[0]},\\ ${-roots[1]}\\)`,'Watch the signs when converting factors to roots.'),
      dmTrap(`\\(r=${s},\\ ${p}\\)`,'The recurrence coefficients are not themselves the roots.'),
      dmTrap(`\\(r=${roots[0]+1},\\ ${roots[1]+1}\\)`,'Substitute candidate roots into the characteristic polynomial.')
    ],
    unitId:'DM_ProofRec',genNum:6,vecTail:[r1,r2,s,p],
    key:'dm_recurrence_characteristic_roots',
    auditSpec:{family:'second-order-characteristic',r1,r2,s,p,expected:roots}
  });
});

registerGen('DM_ProofRec', (rng)=>{
  const cases=[
    {id:1,expr:'3n^2+7n+4',theta:'\\Theta(n^2)'},
    {id:2,expr:'5n^3-n+8',theta:'\\Theta(n^3)'},
    {id:3,expr:'n\\log n+4n',theta:'\\Theta(n\\log n)'},
    {id:4,expr:'2^n+n^5',theta:'\\Theta(2^n)'},
    {id:5,expr:'7\\log n+20',theta:'\\Theta(\\log n)'},
    {id:6,expr:'4n+100',theta:'\\Theta(n)'}
  ];
  const c=pick(rng,cases);
  const traps=cases.filter(x=>x.id!==c.id).slice(0,3);
  return dmMakeProblem({
    q:`Give the tight asymptotic order of \\(f(n)=${c.expr}\\).`,
    a:`\\(${c.theta}\\)`,
    steps:['For large n, retain the fastest-growing term and ignore constant factors and lower-order terms.',`The dominant growth rate is \\(${c.theta}\\).`],
    traps:traps.map(x=>dmTrap(`\\(${x.theta}\\)`,'Tight Θ notation is determined by the dominant term of the given function.')),
    unitId:'DM_ProofRec',genNum:7,vecTail:[c.id],
    key:'dm_growth_theta',
    auditSpec:{family:'theta-classification',caseId:c.id,expression:c.expr,expected:c.theta}
  });
});

registerGen('DM_ProofRec', (rng)=>{
  const cases=[
    {id:1,left:'x\\land(x\\lor y)',right:'x',law:'absorption'},
    {id:2,left:'x\\lor(x\\land y)',right:'x',law:'absorption'},
    {id:3,left:'x\\land 1',right:'x',law:'identity'},
    {id:4,left:'x\\lor 0',right:'x',law:'identity'},
    {id:5,left:'x\\land\\neg x',right:'0',law:'complement'},
    {id:6,left:'x\\lor\\neg x',right:'1',law:'complement'}
  ];
  const c=pick(rng,cases);
  const trapPool = [
    {value:'0',law:'domination',why:'This would require an AND with 0 or a direct contradiction.'},
    {value:'1',law:'domination',why:'This would require an OR with 1 or a direct tautology.'},
    {value:'x',law:'identity',why:'The expression simplifies to x only when the matching identity or absorption pattern applies.'},
    {value:'y',law:'absorption',why:'Absorption preserves the repeated variable x, not the other variable.'},
    {value:'\\neg x',law:'complement',why:'A complement law produces 0 or 1, not the negation by itself.'},
    {value:'x\\land y',law:'distribution',why:'No distributive expansion is needed for this expression.'}
  ];
  const correctKey=normalizeMCAnswer(`\\(${c.right}\\) — ${c.law} law`);
  const traps=[];
  const seen=new Set([correctKey]);
  for(const item of trapPool){
    const ans=`\\(${item.value}\\) — ${item.law} law`;
    const key=normalizeMCAnswer(ans);
    if(seen.has(key)) continue;
    seen.add(key);
    traps.push(dmTrap(ans,item.why));
    if(traps.length===3) break;
  }
  return dmMakeProblem({
    q:`Simplify the Boolean expression \\(${c.left}\\) and identify the law used.`,
    a:`\\(${c.right}\\) — ${c.law} law`,
    steps:[`Apply the ${c.law} law.`,`\\(${c.left}=${c.right}\\).`],
    traps,
    unitId:'DM_ProofRec',genNum:8,vecTail:[c.id],
    key:'dm_boolean_simplify',
    auditSpec:{family:'boolean-simplify',caseId:c.id,left:c.left,expected:c.right,law:c.law}
  });
});
