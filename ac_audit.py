#!/usr/bin/env python3
"""Independent audit of AC1/AC2 generators."""
import json, re
import sympy as sp

x, y, q, t = sp.symbols('x y q t')
corpus = json.load(open("ac_corpus.json"))

def ints(s): return [int(v) for v in re.findall(r"-?\d+", s)]
results = {}
def tally(key, ok, note=""):
    r = results.setdefault(key, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:120])
    else: r["u"] += 1

for it in corpus:
    k, Q, A, v = it["key"], it["q"], it["a"], it.get("vec") or []
    try:
        if k == "ac1_marg_cost":
            a,b,c,x0 = v[2:6]
            C = a*x**2 + b*x + c
            tally(k, ints(A)[1] == int(sp.diff(C,x).subs(x,x0)), f"{A}")
        elif k == "ac1_marg_revenue":
            m,n,x0 = v[2:5]
            R = x*(m - n*x)
            tally(k, ints(A)[1] == int(sp.diff(R,x).subs(x,x0)), f"{A}")
        elif k == "ac1_profit_max":
            m,n,b,xs = v[2:6]
            sol = sp.solve(sp.Eq(m - 2*n*x, b), x)
            tally(k, sol and int(sol[0]) == xs == ints(A)[0], f"solve {sol} vs {xs}")
        elif k == "ac1_marg_interpret":
            x0, mc = v[2:4]
            tally(k, str(x0+1) in A and str(mc) in A, A)
        elif k == "ac1_elast_value":
            a,b,p0 = v[2:5]
            E = sp.Rational(b*p0, a - b*p0)
            nums = ints(A)
            if len(nums) == 1: got = sp.Integer(nums[0])
            else: got = sp.Rational(nums[0], nums[1])
            tally(k, sp.simplify(E - got) == 0, f"E={E} vs {got}")
        elif k == "ac1_elast_classify":
            a,b,p0,above = v[2:6]
            elastic = sp.Rational(b*p0, a - b*p0) > 1
            tally(k, (A.strip()=="Elastic") == bool(elastic) and bool(elastic)==bool(above), f"E>1={elastic}, app {A}")
        elif k == "ac1_elast_revmax":
            a,b,half = v[2:5]
            sol = sp.solve(sp.diff(x*(a - b*x), x), x)
            tally(k, sol and sp.simplify(sol[0] - half) == 0 and ints(A)[0] == half, f"{sol} vs {half}")
        elif k == "ac1_fin_amount":
            P,rp,T = v[2:5]
            m = re.search(r"e\^\{([\d.]+)\}", A)
            expv = float(m.group(1)) if m else (1.0 if re.search(str(P)+r"e(?![\^a-z])", A) else None)
            tally(k, expv is not None and abs(expv - rp*T/100) < 1e-9 and str(P) in A,
                  f"exp {m and m.group(1)} vs {rp*T/100}")
        elif k == "ac1_fin_time":
            d,mult = v[2:4]
            sol = sp.solve(sp.Eq(sp.exp(t/d), mult), t)
            tally(k, sol and sp.simplify(sol[0] - d*sp.log(mult)) == 0 and str(d) in A and f"ln {mult}" in A, f"{sol}")
        elif k == "ac1_fin_rate":
            T,mult = v[2:4]
            r = sp.symbols('r', positive=True)
            sol = sp.solve(sp.Eq(sp.exp(r*T), mult), r)
            tally(k, sol and sp.simplify(sol[0] - sp.log(mult)/T) == 0 and f"{{{T}}}" in A and f"ln {mult}" in A, f"{sol}")
        elif k == "ac2_consumer_surplus":
            d0,m,p0,q0 = v[2:6]
            cs = sp.integrate(d0 - m*q, (q, 0, q0)) - p0*q0
            tally(k, ints(A)[0] == int(cs), f"CS={cs} vs {A}")
        elif k == "ac2_producer_surplus":
            s0,n,p0,q0 = v[2:6]
            ps = p0*q0 - sp.integrate(s0 + n*q, (q, 0, q0))
            tally(k, ints(A)[0] == int(ps), f"PS={ps} vs {A}")
        elif k == "ac2_present_value":
            R,d = v[2:4]
            pv = sp.integrate(R*sp.exp(-t/sp.Integer(d)), (t, 0, d))
            want = R*d*(1 - sp.exp(-1))
            m = re.search(r"=\s*(\d+)\(1 - e", A.replace("\\,",""))
            tally(k, sp.simplify(pv - want) == 0 and bool(m) and int(m.group(1)) == R*d,
                  f"pv={sp.simplify(pv)} app coef {m and m.group(1)}")
        elif k == "ac2_avg_revenue":
            m,n,B = v[2:5]
            avg = sp.integrate(m*x - n*x**2, (x, 0, B))/B
            tally(k, ints(A)[0] == int(avg), f"avg={avg} vs {A}")
        elif k == "ac2_partial_eval":
            a,b,c,x0,y0 = v[2:7]
            f = a*x**2 + b*x*y + c*y**2
            tally(k, ints(A)[0] == int(sp.diff(f,x).subs({x:x0,y:y0})), f"{A}")
        elif k == "ac2_critical_point":
            a,b,xa,yb = v[2:6]
            f = x**2 + y**2 - a*x - b*y
            sol = sp.solve([sp.diff(f,x), sp.diff(f,y)], [x,y])
            got = ints(A)[:2]
            tally(k, [int(sol[x]), int(sol[y])] == got == [xa,yb], f"{sol} vs {got}")
        elif k == "ac2_dtest":
            kind,a,b,c = v[2:6]
            D = 4*a*c - b*b
            fxx = 2*a
            derived = "Saddle point" if D < 0 else ("Local minimum" if fxx > 0 else "Local maximum")
            want = ["Local minimum","Local maximum","Saddle point"][kind]
            tally(k, A.strip() == derived == want, f"D={D} fxx={fxx} -> {derived}; app {A.strip()}")
        else:
            tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:90])

print(f"{'key':24s} verified mismatch unchecked")
tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:24s} {r['v']:8d} {r['m']:8d} {r['u']:9d}")
    for n in r["notes"][:2]: print("     !", n)
print(f"{'TOTAL':24s} {tv:8d} {tm:8d} {tu:9d}")
json.dump(results, open("ac_audit_report.json","w"), indent=1)
