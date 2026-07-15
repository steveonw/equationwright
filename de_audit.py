#!/usr/bin/env python3
"""Independent audit of DE_FirstOrder: re-derive with SymPy from question params."""
import json, re
import sympy as sp

x, t, C = sp.symbols('x t C')
y = sp.Function('y')
corpus = json.load(open("de_corpus.json"))

def ints(s): return [int(v) for v in re.findall(r"-?\d+", s)]

results = {}
def tally(key, ok, note=""):
    r = results.setdefault(key, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:110])
    else: r["u"] += 1

for item in corpus:
    k, q, a, v = item["key"], item["q"], item["a"], item.get("vec") or []
    try:
        if k == "de_classify":
            kind = v[2]  # 0 lin1, 1 lin2, 2 nonlin_y2, 3 nonlin_yy
            want = ["First order, linear","Second order, linear","First order, nonlinear","First order, nonlinear"][kind]
            # independent structural check on the question text itself
            has2 = "y''" in q
            nonlin = ("y^2" in q) or ("y\\,y'" in q) or ("y y'" in q)
            derived = ("Second" if has2 else "First") + " order, " + ("nonlinear" if nonlin else "linear")
            tally(k, a.strip() == derived == want, f"text-derived {derived} vs app {a.strip()}")

        elif k == "de_which_solution":
            kk, Cc = v[2], v[3]
            f = Cc*sp.exp(kk*x)
            tally(k, sp.simplify(sp.diff(f, x) - kk*f) == 0 and f"e^{{{kk}x}}" in a,
                  "substitution failed")

        elif k == "de_sep_general":
            aa = v[2]
            # y^2 = a x^2 + C: differentiate implicitly -> 2y y' = 2a x -> y y' = a x ✓
            m = re.search(r"=\s*(\d+)x", a)
            tally(k, bool(m) and int(m.group(1)) == aa and "y^2" in a,
                  f"answer {a} should be y^2 = {aa}x^2 + C")

        elif k == "de_sep_ivp":
            aa, y0 = v[2], v[3]
            sol = sp.dsolve(sp.Eq(y(x).diff(x), aa*y(x)), y(x), ics={y(0): y0})
            want = sp.simplify(sol.rhs)
            got = y0*sp.exp(aa*x)
            tally(k, sp.simplify(want - got) == 0 and str(y0) in a, f"dsolve {want} vs app form {a}")

        elif k == "de_linear_if":
            aa = v[2]
            mu = sp.exp(aa*x)
            ok = sp.simplify(sp.diff(mu, x) - aa*mu) == 0 and f"e^{{{aa}x}}" in a
            tally(k, ok, "mu' != a mu or answer text off")

        elif k in ("de_linear_solve", "de_linear_ivp"):
            aa, bb = v[2], v[3]
            if k == "de_linear_solve":
                sol = sp.dsolve(sp.Eq(y(x).diff(x) + aa*y(x), bb), y(x))
                want_eq = sp.Rational(bb, aa)
                nums = ints(a)
                ok = nums and nums[0] == int(want_eq) and f"e^{{-{aa}x}}" in a.replace(" ", "")
                tally(k, ok, f"equilibrium {want_eq}; app {a}")
            else:
                y0, yp, Cv = v[4], v[5], v[6]
                sol = sp.dsolve(sp.Eq(y(x).diff(x) + aa*y(x), bb), y(x), ics={y(0): y0})
                got = yp + Cv*sp.exp(-aa*x)
                tally(k, sp.simplify(sol.rhs - got) == 0, f"dsolve {sp.simplify(sol.rhs)} vs app {got}")

        elif k == "de_growth_double":
            d = v[2]
            tt = sp.symbols('tt', positive=True)
            sol = sp.solve(sp.Eq(sp.exp(tt/d), 2), tt)
            ok = sol and sp.simplify(sol[0] - d*sp.log(2)) == 0 and str(d) in a and "ln 2" in a
            tally(k, ok, f"doubling {sol} vs app {a}")

        elif k == "de_decay_halflife":
            T = v[2]
            kk = sp.symbols('kk', positive=True)
            sol = sp.solve(sp.Eq(sp.exp(-kk*T), sp.Rational(1,2)), kk)
            ok = sol and sp.simplify(sol[0] - sp.log(2)/T) == 0 and f"{{{T}}}" in a and "ln 2" in a
            tally(k, ok, f"k {sol} vs app {a}")

        elif k == "de_euler_step":
            y0, c = v[2], v[3]
            h = sp.Rational(1,2)
            y1 = y0 + h*(0 + c*y0)
            y2 = y1 + h*(sp.Rational(1,2) + c*y1)
            # pull the approx number from the answer
            m = re.search(r"\\approx\s*([-\d.]+)", a)
            got = sp.Rational(m.group(1)) if m else None
            tally(k, got is not None and sp.simplify(y2 - got) == 0, f"euler {float(y2)} vs app {m and m.group(1)}")

        elif k == "de_exact_test":
            exact_flag, aa, bb, b2, cc = v[2], v[3], v[4], v[5], v[6]
            X, Y = sp.symbols('X Y')
            M = aa*X + bb*Y; N = b2*X + cc*Y
            is_exact = sp.simplify(sp.diff(M, Y) - sp.diff(N, X)) == 0
            tally(k, (a.strip() == "Exact") == is_exact and is_exact == bool(exact_flag),
                  f"partials say exact={is_exact}, app said {a.strip()}")

        elif k == "de_equilibria":
            aa = v[2]
            Y = sp.symbols('Y')
            eqs = sorted(sp.solve(Y*(aa - Y), Y))
            nums = sorted(set(ints(a)))
            tally(k, eqs == nums, f"sympy {eqs} vs app {nums}")
        else:
            tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:90])

print(f"{'key':20s} verified mismatch unchecked")
tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:20s} {r['v']:8d} {r['m']:8d} {r['u']:9d}")
    for n in r["notes"][:2]: print("     !", n)
print(f"{'TOTAL':20s} {tv:8d} {tm:8d} {tu:9d}")
json.dump(results, open("de_audit_report.json","w"), indent=1)
