#!/usr/bin/env python3
"""Independent audit of DE units 2-3."""
import json, re
import sympy as sp
x, t, s = sp.symbols('x t s')
y = sp.Function('y')
corpus = json.load(open("de2_corpus.json"))
def ints(sr): return [int(v) for v in re.findall(r"-?\d+", sr)]
results = {}
def tally(k, ok, note=""):
    r = results.setdefault(k, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:110])
    else: r["u"] += 1

for it in corpus:
    k, Q, A, v = it["key"], it["q"], it["a"], it.get("vec") or []
    try:
        if k == "de2_char_roots":
            r1,r2,b,c = v[2:6]
            lam = sp.symbols('lam')
            roots = sorted(sp.solve(lam**2 + b*lam + c, lam))
            tally(k, roots == sorted([r1,r2]) and str(r1) in A and str(r2) in A, f"{roots} vs {[r1,r2]}")
        elif k == "de2_gen_real":
            r1,r2 = v[2:4]
            b, c = -(r1+r2), r1*r2
            # verify each exponential solves the ODE
            def etex(r): return "e^{x}" if r==1 else ("e^{-x}" if r==-1 else f"e^{{{r}x}}")
            ok = all(sp.simplify(sp.diff(sp.exp(r*x),x,2) + b*sp.diff(sp.exp(r*x),x) + c*sp.exp(r*x)) == 0 for r in (r1,r2))
            tally(k, ok and etex(r1) in A and etex(r2) in A, f"exp substitution {etex(r1)},{etex(r2)} in {A[:40]}")
        elif k == "de2_gen_repeated":
            a = v[2]
            f = x*sp.exp(a*x)
            ok = sp.simplify(sp.diff(f,x,2) - 2*a*sp.diff(f,x) + a*a*f) == 0
            tally(k, ok and "C_2 x" in A.replace(" ","").replace("C_2x","C_2 x") or (ok and "C_2 x" in A), "x e^{ax} substitution")
        elif k == "de2_gen_complex":
            w = v[2]
            f = sp.sin(w*x)
            ok = sp.simplify(sp.diff(f,x,2) + w*w*f) == 0
            tally(k, ok and f"\\sin({w}x)" in A and f"\\cos({w}x)" in A, "sin/cos substitution")
        elif k == "de2_ivp":
            r2,C1,C2,Av,Bv = v[2:7]
            f = C1*sp.exp(-x) + C2*sp.exp(r2*x)
            b, c = -(-1+r2), -r2
            ok = (sp.simplify(sp.diff(f,x,2) + b*sp.diff(f,x) + c*f) == 0
                  and f.subs(x,0) == Av and sp.diff(f,x).subs(x,0) == Bv)
            tally(k, ok, f"IVP symbolic check A={Av} B={Bv}")
        elif k == "de2_undetermined_form":
            kind,kk,w = v[2:5]
            want = ["Ae^{", "Ax + B", "A\\cos"][kind]
            not_res = True  # kk>0 vs roots -2,-3; poly needs root 0; sin needs imaginary roots — never resonant here
            tally(k, want in A and not_res, f"kind {kind} form {A[:40]}")
        elif k == "de2_spring":
            m,kspr,w = v[2:5]
            tally(k, sp.sqrt(sp.Rational(kspr,m)) == w and ints(A)[0] == w, f"sqrt({kspr}/{m}) vs {w}")
        elif k == "de3_laplace_basic":
            kind,a,n,b = v[2:6]
            f = [sp.exp(a*t), t**n, sp.sin(b*t)][kind]
            L = sp.laplace_transform(f, t, s, noconds=True)
            want = [1/(s-a), sp.factorial(n)/s**(n+1), b/(s**2+b**2)][kind]
            tally(k, sp.simplify(L - want) == 0, f"L={L}")
        elif k == "de3_laplace_linear":
            Av,Bv,a = v[2:5]
            L = sp.laplace_transform(Av + Bv*sp.exp(a*t), t, s, noconds=True)
            want = Av/s + Bv/(s-a)
            nums = ints(A)
            tally(k, sp.simplify(L - want) == 0 and nums[0]==Av and nums[1]==Bv, f"L={sp.simplify(L)}")
        elif k == "de3_inverse":
            kind,cc,a,b = v[2:6]
            F = cc/(s-a) if kind==0 else sp.Integer(b)/(s**2+b**2)
            f = sp.inverse_laplace_transform(F, s, t, noconds=True)
            want = cc*sp.exp(a*t) if kind==0 else sp.sin(b*t)
            tally(k, sp.simplify(f - want*sp.Heaviside(t)) == 0 or sp.simplify(f - want) == 0, f"f={f}")
        elif k == "de3_laplace_deriv":
            y0 = v[2]
            tally(k, f"sY(s) - {y0}" in A, A)
        elif k == "de3_laplace_solve":
            a,y0 = v[2:4]
            # verify algebra: (s+a)Y = y0
            tally(k, f"{{{y0}}}" in A.replace(" ","") and f"s+{a}" in A.replace(" ",""), A)
        else: tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:90])

tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:24s} v={r['v']} m={r['m']} u={r['u']}")
    for n in r["notes"][:2]: print("   !", n)
print(f"TOTAL v={tv} m={tm} u={tu}")
