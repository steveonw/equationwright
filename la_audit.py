#!/usr/bin/env python3
"""Independent audit of LA_Systems generators: re-derive from question text with SymPy."""
import json, re, sys
import sympy as sp

x, y, z, t = sp.symbols('x y z t')
corpus = json.load(open("la_corpus.json"))

def ints(s):
    return [int(v) for v in re.findall(r"-?\d+", s)]

def parse_lin_eq(eq_tex, three=False):
    """General: any subset of x,y,z terms with invisible 1-coefficients."""
    eq_tex = eq_tex.replace("\\,", " ").strip()
    if "=" not in eq_tex: return None
    lhs, rhs = eq_tex.split("=", 1)
    try: rhs = int(rhs.strip())
    except ValueError: return None
    co = {"x": 0, "y": 0, "z": 0}
    for sign, mag, var in re.findall(r"([+-]?)\s*(\d*)\s*([xyz])", lhs):
        v = int(mag) if mag else 1
        if sign == "-": v = -v
        co[var] += v
    has_z = "z" in lhs
    return ((co["x"], co["y"], co["z"] if has_z else None), rhs)

def eqs_from_cases(q):
    m = re.search(r"\\begin\{cases\}(.+?)\\end\{cases\}", q, re.S)
    if not m: return []
    return [r.strip() for r in m.group(1).split("\\\\") if r.strip()]

def answer_tuple(a):
    m = re.search(r"=\s*\(([^)]+)\)", a)
    if not m: return None
    return [int(v) for v in re.findall(r"-?\d+", m.group(1))]

def parse_bmatrix(tex):
    m = re.search(r"\\begin\{bmatrix\}(.+?)\\end\{bmatrix\}", tex, re.S)
    if not m: return None
    rows = [r for r in m.group(1).split("\\\\") if r.strip()]
    return sp.Matrix([[int(v) for v in re.findall(r"-?\d+", r)] for r in rows])

results = {}
def tally(key, ok, note=""):
    rec = results.setdefault(key, {"v":0, "m":0, "u":0, "notes":[]})
    if ok is True: rec["v"] += 1
    elif ok is False:
        rec["m"] += 1
        if note: rec["notes"].append(note[:110])
    else: rec["u"] += 1

for item in corpus:
    k, q, a = item["key"], item["q"], item["a"]
    try:
        if k in ("la_sys_solve2", "la_sys_solve3", "la_backsub"):
            rows = eqs_from_cases(q)
            parsed = [parse_lin_eq(r) for r in rows]
            if any(p is None for p in parsed): tally(k, None); continue
            three = len(rows) == 3
            eqs = []
            for (co, rhs) in parsed:
                expr = co[0]*x + co[1]*y + (co[2]*z if co[2] is not None else 0)
                eqs.append(sp.Eq(expr, rhs))
            sol = sp.solve(eqs, [x, y, z][:3 if three else 2], dict=True)
            want = answer_tuple(a)
            if not sol or want is None: tally(k, None); continue
            s = sol[0]
            got = [s[x], s[y]] + ([s[z]] if three else [])
            tally(k, [int(v) for v in got] == want, f"sympy {got} vs app {want} :: {q[:60]}")

        elif k == "la_sys_classify":
            rows = eqs_from_cases(q)
            parsed = [parse_lin_eq(r) for r in rows]
            if any(p is None for p in parsed): tally(k, None); continue
            (a1, b1, _), c1 = parsed[0]; (a2, b2, _), c2 = parsed[1]
            det = a1*b2 - a2*b1
            if det != 0: label = "Exactly one solution"
            elif a1*c2 == a2*c1 and b1*c2 == b2*c1: label = "Infinitely many solutions"
            else: label = "No solution"
            tally(k, label == a.strip(), f"sympy {label} vs app {a.strip()}")

        elif k == "la_sys_hvalue":
            rows = eqs_from_cases(q)
            p1 = parse_lin_eq(rows[0]); p2 = parse_lin_eq(rows[1])
            if not (p1 and p2): tally(k, None); continue
            (a1, b1, _), c1 = p1; (a2, b2, _), _ = p2
            kmul = a2 // a1
            want_h = kmul * c1
            got = ints(a)
            tally(k, got and got[0] == want_h, f"h should be {want_h}, app said {got}")

        elif k == "la_rank_small":
            M = parse_bmatrix(q)
            want = ints(a)
            tally(k, M is not None and want and M.rank() == want[0],
                  f"sympy rank {M.rank() if M is not None else '?'} vs app {want}")

        elif k == "la_rref_identify":
            M = parse_bmatrix(a)
            if M is None: tally(k, None); continue
            tally(k, M.rref()[0] == M, "app's RREF answer is not actually in RREF")

        elif k == "la_matrix_terms":
            M = parse_bmatrix(q)
            lbl = a.strip().lower()
            if M is None: tally(k, None); continue
            n = M.rows
            above_zero = all(M[i, j] == 0 for i in range(n) for j in range(i+1, n))  # zeros ABOVE diag
            below_zero = all(M[i, j] == 0 for i in range(n) for j in range(i))       # zeros BELOW diag
            diag = above_zero and below_zero
            ident = diag and all(M[i, i] == 1 for i in range(n))
            symm = M == M.T
            ok = ((lbl == "identity" and ident) or
                  (lbl == "diagonal" and diag and not ident) or
                  (lbl == "upper triangular" and below_zero and not diag) or
                  (lbl == "lower triangular" and above_zero and not diag) or
                  (lbl == "symmetric" and symm and not diag and not below_zero and not above_zero))
            tally(k, ok, f"label {lbl} vs pattern above0={above_zero} below0={below_zero} sym={symm}")

        elif k == "la_rowop_apply":
            v = item.get("vec") or []
            if len(v) < 9: tally(k, None); continue
            _, _, kmul, r1a, r1b, r1c, r2a, r2b, r2c = v[:9]
            want = [r2a + kmul*r1a, r2b + kmul*r1b, r2c + kmul*r1c]
            got = ints(a)
            tally(k, got == want, f"expected {want}, app {got}")

        elif k == "la_rowop_identify":
            v = item.get("vec") or []
            kmul = v[2] if len(v) > 2 else None
            ok = kmul is not None and (f"- {kmul}R_1" in a or f"- {kmul}R_" in a)
            tally(k, ok, f"answer {a} should subtract {kmul}R1")

        elif k == "la_sys_param":
            rows = eqs_from_cases(q)
            p1 = parse_lin_eq(rows[0])
            if not p1: tally(k, None); continue
            (a1, b1, _), c1 = p1
            tail = a.split("=")[-1]
            nums = ints(tail)
            coef_t = abs(nums[1]) if len(nums) >= 2 else (1 if re.search(r"[-+]\s*t", tail) else None)
            ok = len(nums) >= 1 and nums[0] == c1 and coef_t == abs(b1)
            # substitute (c1 - b1 t, t) into eq1: must hold identically
            expr = a1*(c1 - b1*t) + b1*t
            tally(k, ok and sp.simplify(expr - c1) == 0, f"param answer {nums} vs eq (b={b1}, c={c1})")

        elif k == "la_sys_word":
            nums_q = ints(q)   # adult price, child price, total, revenue (order varies; search)
            madult = re.search(r"\$(\d+).*?\$(\d+).*?(\d+)\s+tickets.*?\$(\d+)", q, re.S)
            if not madult: tally(k, None); continue
            pa, pc, tot, rev = (int(g) for g in madult.groups())
            sol = sp.solve([sp.Eq(x + y, tot), sp.Eq(pa*x + pc*y, rev)], [x, y], dict=True)
            got = ints(a)
            ok = bool(sol) and got[:2] == [int(sol[0][x]), int(sol[0][y])]
            tally(k, ok, f"sympy {sol} vs app {got[:2]}")
        else:
            tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:80])

print(f"{'key':22s} verified mismatch unchecked")
tv = tm = tu = 0
for k in sorted(results):
    r = results[k]
    tv += r["v"]; tm += r["m"]; tu += r["u"]
    print(f"{k:22s} {r['v']:8d} {r['m']:8d} {r['u']:9d}")
    for n in r["notes"][:2]: print("     !", n)
print(f"{'TOTAL':22s} {tv:8d} {tm:8d} {tu:9d}")
json.dump(results, open("la_audit_report.json", "w"), indent=1)
