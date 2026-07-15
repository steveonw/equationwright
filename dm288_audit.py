#!/usr/bin/env python3
from __future__ import annotations
import json, math, re, sys
from collections import Counter
from pathlib import Path

CORPUS = Path(__file__).with_name("dm288_full_corpus.json")

def norm(s):
    s = str(s)
    s = s.replace("\\left","").replace("\\right","")
    return re.sub(r"[\s{}\\()]", "", s).lower()

def first_integer(answer):
    m = re.fullmatch(r"\s*\\\(\s*(-?\d+)\s*\\\)\s*", answer)
    if not m:
        raise AssertionError(f"not a plain integer answer: {answer}")
    return int(m.group(1))

def factorial(n):
    return math.factorial(n)

def perm(n,r):
    return math.factorial(n)//math.factorial(n-r)

def choose(n,r):
    return math.comb(n,r)

def eval_logic(node, env):
    op=node["op"]
    if op=="var": return bool(env[node["name"]])
    args=node.get("args",[])
    if op=="not": return not eval_logic(args[0],env)
    a=eval_logic(args[0],env); b=eval_logic(args[1],env)
    if op=="and": return a and b
    if op=="or": return a or b
    if op=="implies": return (not a) or b
    if op=="iff": return a==b
    raise AssertionError(f"unknown logic op {op}")

def truth_rows(variables):
    n=len(variables)
    for row in range(2**n):
        yield {
            v: ((row // (2**(n-i-1))) % 2 == 0)
            for i,v in enumerate(variables)
        }

def truth_values(expr, variables):
    return [eval_logic(expr,row) for row in truth_rows(variables)]

def relation_properties(items,pairs):
    S=set(items); R={tuple(p) for p in pairs}
    reflexive=all((x,x) in R for x in S)
    symmetric=all((b,a) in R for a,b in R)
    antisymmetric=all(a==b or (b,a) not in R for a,b in R)
    transitive=all((a,c) in R for a,b in R for b2,c in R if b==b2)
    return dict(reflexive=reflexive,symmetric=symmetric,
                antisymmetric=antisymmetric,transitive=transitive)

LOGIC_LAWS={
  1:(r"\neg(p\land q)",r"\neg p\lor\neg q","De Morgan’s law"),
  2:(r"p\to q",r"\neg p\lor q","implication law"),
  3:(r"p\leftrightarrow q",r"(p\to q)\land(q\to p)","biconditional law"),
  4:(r"\neg\neg p","p","double-negation law"),
  5:(r"p\lor(p\land q)","p","absorption law"),
}
TRANSLATIONS={
  1:r"\(p\to q\)", 2:r"\(p\to q\)", 3:r"\(q\to p\)",
  4:r"\(p\to q\)", 5:r"\(q\to p\)"
}
QUANTIFIERS={
  1:r"\(\exists x\,\neg P(x)\)",
  2:r"\(\forall x\,\neg P(x)\)",
  3:r"\(\exists x\,(P(x)\land\neg Q(x))\)",
  4:r"\(\forall x\,(\neg P(x)\lor\neg Q(x))\)",
}
PROOF_METHODS={
  1:"direct proof",2:"proof by contradiction",
  3:"proof by contrapositive",4:"mathematical induction"
}
THETA={
  1:r"\Theta(n^2)",2:r"\Theta(n^3)",3:r"\Theta(n\log n)",
  4:r"\Theta(2^n)",5:r"\Theta(\log n)",6:r"\Theta(n)"
}
BOOLEAN={
  1:(r"x\land(x\lor y)","x","absorption"),
  2:(r"x\lor(x\land y)","x","absorption"),
  3:(r"x\land 1","x","identity"),
  4:(r"x\lor 0","x","identity"),
  5:(r"x\land\neg x","0","complement"),
  6:(r"x\lor\neg x","1","complement"),
}

NUMERIC_FAMILIES={
 "power-set-count": lambda s: 2**s["n"],
 "two-set-inclusion-exclusion": lambda s: s["a"]+s["b"]-s["both"],
 "cartesian-size": lambda s: s["m"]*s["n"],
 "product-rule": lambda s: math.prod(s["factors"]),
 "permutation": lambda s: perm(s["n"],s["r"]),
 "combination": lambda s: choose(s["n"],s["r"]),
 "multiset-permutation": lambda s: factorial(sum(s["counts"]))//math.prod(factorial(x) for x in s["counts"]),
 "stars-bars": lambda s: choose(s["total"]-1,s["types"]-1) if s["positive"] else choose(s["total"]+s["types"]-1,s["types"]-1),
 "pigeonhole-minimum": lambda s: s["boxes"]*(s["guaranteed"]-1)+1,
 "binary-exact-ones": lambda s: choose(s["n"],s["k"]),
 "codes": lambda s: (perm(26,s["letters"])*perm(10,s["digits"])) if s["noRepeat"] else 26**s["letters"]*10**s["digits"],
 "function-composition-linear": lambda s: s["a"]*(s["c"]*s["x"]+s["d"])+s["b"],
 "relation-even-sum-count": lambda s: sum(1 for i in range(1,s["n"]+1) for j in range(1,s["n"]+1) if (i+j)%2==0),
 "regular-graph-edges": lambda s: s["n"]*s["degree"]//2,
 "tree-edges": lambda s: s["n"]-1,
 "complete-graph-edges": lambda s: s["n"]*(s["n"]-1)//2,
 "complete-bipartite-edges": lambda s: s["m"]*s["n"],
 "graph-complement-edges": lambda s: s["n"]*(s["n"]-1)//2-s["edges"],
}

def check_record(r):
    spec=r.get("auditSpec")
    if spec is None:
        # truth-column semantic canaries
        ans=r["answerSpec"]; logic=r["logicSpec"]
        qm=logic["questionModel"]
        vals=truth_values(qm["expression"],qm["variables"])
        assert vals==ans["model"]["values"]
        sig="".join("1" if x else "0" for x in vals)
        assert ans["key"]==f"logic-v1:truth-sequence:{','.join(qm['variables'])}:{sig}"
        display=" ".join("T" if x else "F" for x in vals)
        assert r["a"]==display
        return

    fam=spec["family"]
    if fam in NUMERIC_FAMILIES:
        expected=NUMERIC_FAMILIES[fam](spec)
        assert spec["expected"]==expected, (fam,spec,expected)
        assert first_integer(r["a"])==expected
    elif fam.startswith("set-"):
        A=set(spec["A"])
        if fam=="set-union": expected=sorted(A|set(spec["B"]))
        elif fam=="set-intersection": expected=sorted(A&set(spec["B"]))
        elif fam=="set-difference": expected=sorted(A-set(spec["B"]))
        elif fam=="set-complement": expected=sorted(set(spec["U"])-A)
        else: raise AssertionError(fam)
        assert spec["expected"]==expected
        for x in expected: assert str(x) in r["a"]
    elif fam=="power-set-list":
        base=spec["base"]; got={tuple(x) for x in spec["expected"]}
        expected={tuple(base[i] for i in range(len(base)) if mask&(1<<i)) for mask in range(2**len(base))}
        assert got==expected and len(got)==2**len(base)
    elif fam=="logic-classify":
        vals=truth_values(spec["expression"],spec["variables"])
        cls="Tautology" if all(vals) else "Contradiction" if not any(vals) else "Contingency"
        assert vals==spec["values"] and cls==spec["classification"]
        assert cls.lower() in r["a"].lower()
    elif fam=="logic-main-connective":
        assert spec["expression"]["op"]==spec["expectedOp"]
    elif fam=="logic-equivalence":
        left=truth_values(spec["left"],spec["variables"]); right=truth_values(spec["right"],spec["variables"])
        assert left==spec["leftValues"] and right==spec["rightValues"]
        assert (left==right)==spec["equivalent"]
    elif fam=="logic-law":
        assert tuple([spec["left"],spec["right"],spec["law"]])==LOGIC_LAWS[spec["caseId"]]
        assert norm(spec["right"]) in norm(r["a"])
    elif fam=="logic-translation":
        assert spec["expected"]==TRANSLATIONS[spec["caseId"]]
        assert norm(spec["expected"])==norm(r["a"])
    elif fam=="quantifier-negation":
        assert spec["expected"]==QUANTIFIERS[spec["caseId"]]
        assert norm(spec["expected"])==norm(r["a"])
    elif fam=="relation-properties":
        assert relation_properties(spec["set"],spec["pairs"])==spec["expected"]
        labels=[k for k,v in spec["expected"].items() if v]
        for label in labels: assert label in r["a"]
    elif fam=="mod-equivalence-class":
        expected=[x for x in spec["universe"] if x%spec["modulus"]==spec["residue"]]
        assert spec["expected"]==expected
    elif fam=="mod-affine-classification":
        g=math.gcd(spec["a"],spec["n"])
        expected="bijective" if g==1 else "neither injective nor surjective"
        assert spec["g"]==g and spec["expected"]==expected
        assert expected in r["a"]
    elif fam=="linear-inverse":
        assert spec["a"]!=0
        # f^{-1}(f(x)) = x checked at several exact integer points
        for x in (-3,-1,0,2,5):
            y=spec["a"]*x+spec["b"]
            assert (y-spec["b"])/spec["a"]==x
        assert "f^{-1}" in r["a"]
    elif fam=="handshake-missing":
        degrees=spec["degrees"]; expected=2*spec["edges"]-sum(spec["known"])
        assert sum(degrees)==2*spec["edges"] and degrees[spec["missingIndex"]]==expected==spec["expected"]
        assert first_integer(r["a"])==expected
    elif fam=="euler-classification":
        odd=sum(d%2 for d in spec["degrees"])
        expected="Euler circuit" if spec["connected"] and odd==0 else "Euler path but no Euler circuit" if spec["connected"] and odd==2 else "neither"
        assert spec["expected"]==expected and expected.lower() in r["a"].lower()
    elif fam=="cycle-coloring":
        bip=(spec["n"]%2==0); chrom=2 if bip else 3
        assert spec["bipartite"]==bip and spec["chromatic"]==chrom
    elif fam=="proof-method":
        assert spec["expected"]==PROOF_METHODS[spec["caseId"]] and spec["expected"] in r["a"]
    elif fam=="induction-base-sum":
        n=spec["n"]
        lhs=n*(n+1)//2
        rhs=n*(n+1)//2
        assert spec["lhs"]==lhs and spec["rhs"]==rhs
        assert f"{lhs}={rhs}" in norm(r["a"])
    elif fam=="induction-next-step":
        k=spec["k"]
        assert k*k+(2*k+1)==(k+1)**2
        assert spec["expected"]=="k^2+(2k+1)=(k+1)^2"
    elif fam=="first-order-recurrence-iterate":
        vals=[]; cur=spec["a0"]
        for _ in range(3):
            cur=spec["r"]*cur+spec["b"]; vals.append(cur)
        assert vals==spec["expected"]
        for v in vals: assert str(v) in r["a"]
    elif fam=="first-order-recurrence-closed":
        assert spec["b"]==(1-spec["r"])*spec["equilibrium"]
        for n in range(6):
            closed=spec["equilibrium"]+spec["coefficient"]*(spec["r"]**n)
            if n==0: assert closed==spec["a0"]
            else:
                prev=spec["equilibrium"]+spec["coefficient"]*(spec["r"]**(n-1))
                assert closed==spec["r"]*prev+spec["b"]
    elif fam=="second-order-characteristic":
        roots=sorted([spec["r1"],spec["r2"]])
        assert spec["s"]==sum(roots) and spec["p"]==roots[0]*roots[1] and spec["expected"]==roots
        for root in roots: assert root*root-spec["s"]*root+spec["p"]==0
    elif fam=="theta-classification":
        assert spec["expected"]==THETA[spec["caseId"]]
        assert norm(spec["expected"])==norm(r["a"])
    elif fam=="boolean-simplify":
        left,expected,law=BOOLEAN[spec["caseId"]]
        assert (spec["left"],spec["expected"],spec["law"])==(left,expected,law)
        # brute force the six identities
        for x in (False,True):
            for y in (False,True):
                if spec["caseId"]==1: value=x and (x or y)
                elif spec["caseId"]==2: value=x or (x and y)
                elif spec["caseId"]==3: value=x and True
                elif spec["caseId"]==4: value=x or False
                elif spec["caseId"]==5: value=x and (not x)
                else: value=x or (not x)
                target={"0":False,"1":True,"x":x}[expected]
                assert value==target
    else:
        raise AssertionError(f"unhandled family {fam}")

    traps=r.get("traps") or []
    if not (r.get("answerSpec") and r.get("logicSpec")):
        assert len(traps)>=2
    trap_answers=[re.sub(r"\\s+","",str(t["ans"])) for t in traps]
    assert len(trap_answers)==len(set(trap_answers))
    assert re.sub(r"\\s+","",str(r["a"])) not in trap_answers
    assert all(str(t.get("why","")).strip() for t in traps)

def main():
    data=json.loads(CORPUS.read_text())
    failures=[]; counts=Counter()
    for index,r in enumerate(data["records"]):
        fam=(r.get("auditSpec") or {}).get("family","truth-column")
        counts[fam]+=1
        try:
            check_record(r)
        except Exception as exc:
            failures.append({
                "index":index,"unit":r["unit"],"gi":r["gi"],"key":r["key"],
                "seed":r["seed"],"family":fam,"error":repr(exc),
                "question":r["q"],"answer":r["a"],"auditSpec":r.get("auditSpec")
            })
            if len(failures)>=50: break
    summary={
      "status":"PASS" if not failures else "FAIL",
      "records":len(data["records"]),
      "families":len(counts),
      "counts":dict(sorted(counts.items())),
      "failures":failures
    }
    Path(__file__).with_name("dm288_audit_summary.json").write_text(json.dumps(summary,indent=2))
    print(f"MTH 288 independent audit: {summary['status']}")
    print(f"records: {summary['records']}")
    print(f"families: {summary['families']}")
    print(f"failures: {len(failures)}")
    if failures:
        print(json.dumps(failures[:5],indent=2))
        return 1
    return 0

if __name__=="__main__":
    raise SystemExit(main())
