#!/usr/bin/env python3
"""Independent audit of LA units 2-3 with sympy Matrix."""
import json, re
import sympy as sp
corpus = json.load(open("la2_corpus.json"))
def ints(s): return [int(v) for v in re.findall(r"-?\d+", s)]
def bmx(tex):
    m = re.search(r"\\begin\{bmatrix\}(.+?)\\end\{bmatrix\}", tex, re.S)
    if not m: return None
    return sp.Matrix([[int(v) for v in re.findall(r"-?\d+", r)] for r in m.group(1).split("\\\\") if r.strip()])
results = {}
def tally(k, ok, note=""):
    r = results.setdefault(k, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:110])
    else: r["u"] += 1

for it in corpus:
    k, Q, A, v = it["key"], it["q"], it["a"], it.get("vec") or []
    try:
        if k == "la_mat_addscale":
            kf = v[2]; a = sp.Matrix(2,2,v[3:7]); b = sp.Matrix(2,2,v[7:11])
            tally(k, bmx(A) == a + kf*b, "add/scale")
        elif k == "la_mat_multiply":
            a = sp.Matrix(2,2,v[2:6]); b = sp.Matrix(2,2,v[6:10])
            tally(k, bmx(A) == a*b, f"{(a*b).tolist()} vs {bmx(A) and bmx(A).tolist()}")
        elif k == "la_mat_transpose":
            a = sp.Matrix(2,3,v[2:8])
            tally(k, bmx(A) == a.T, "transpose")
        elif k == "la_mat_inverse2":
            b,c = v[2:4]; a = sp.Matrix([[1,b],[c,1+b*c]])
            tally(k, bmx(A) == a.inv(), "inverse")
        elif k == "la_det2":
            a,b,c,d,det = v[2:7]
            M = sp.Matrix([[a,b],[c,d]])
            tally(k, M.det() == det and ints(A)[0] == det, f"{M.det()} vs {det}")
        elif k == "la_det3_cofactor":
            M = bmx(Q); det = v[7]
            tally(k, M is not None and M.det() == det and ints(A)[0] == det, f"{M and M.det()} vs {det}")
        elif k == "la_det_scale":
            d0,kf,ans = v[2:5]
            tally(k, kf*kf*d0 == ans and ints(A)[0] == ans, f"{kf*kf*d0} vs {ans}")
        elif k == "la_eigen_values":
            l1,l2,c = v[2:5]
            M = sp.Matrix([[l1+1,1],[c,l2-1]])
            ev = sorted(M.eigenvals().keys())
            tally(k, ev == sorted([l1,l2]) and str(l1) in A and str(l2) in A, f"sympy {ev} vs {[l1,l2]}")
        elif k == "la_eigen_vector":
            l1,l2,kk = v[2:5]
            M = sp.Matrix([[l1,kk],[0,l2]])
            vv = sp.Matrix([kk, l2-l1])
            tally(k, sp.simplify(M*vv - l2*vv) == sp.zeros(2,1) and bmx(A) == vv, "Av = λv check")
        elif k == "la_eigen_charpoly":
            a,b,c,d = v[2:6]
            M = sp.Matrix([[a,b],[c,d]])
            lam = sp.symbols('lam')
            p = sp.expand(M.charpoly(lam).as_expr())
            T, D = a+d, a*d-b*c
            want = lam**2 - T*lam + D
            nums = ints(A)
            tally(k, sp.expand(p - want) == 0 and nums[1] == T, f"charpoly {p}")
        elif k == "la_indep_check":
            dep = v[2]; M = sp.Matrix([[v[3],v[5]],[v[4],v[6]]])
            derived_dep = M.det() == 0
            tally(k, derived_dep == bool(dep) and ((not A.lower().startswith("linearly independent")) == derived_dep), f"det {M.det()}, app {A}")
        elif k == "la_span_dim":
            kind,a,b = v[2:5]
            if kind==1: V = sp.Matrix([[1,0,a],[2,0,2*a],[3,0,3*a]])
            elif kind==2: V = sp.Matrix([[1,0,a],[0,1,b],[1,1,a+b]])
            else: V = sp.Matrix([[1,0,0],[0,1,b],[0,0,1]])
            tally(k, V.rank() == kind if kind!=2 else V.rank()==2, f"rank {V.rank()} vs kind {kind} app {A}")
        elif k == "la_eigen_tracedet":
            l1,l2 = v[2:4]
            nums = ints(A)
            tally(k, nums[0] == l1*l2 and nums[1] == l1+l2, f"det {l1*l2} tr {l1+l2} vs {nums}")
        else: tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:90])

tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:22s} v={r['v']} m={r['m']} u={r['u']}")
    for n in r["notes"][:2]: print("   !", n)
print(f"TOTAL v={tv} m={tm} u={tu}")
