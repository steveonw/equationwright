#!/usr/bin/env python3
import json, re
import numpy as np, sympy as sp
from scipy import stats
x = sp.Symbol('x')
corpus = json.load(open("p283_corpus.json"))
def nums(s): return [float(v) for v in re.findall(r"-?\d+\.?\d*", s)]
results = {}
def tally(k, ok, note=""):
    if ok is not None: ok = bool(ok)
    r = results.setdefault(k, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:110])
    else: r["u"] += 1

for it in corpus:
    k, Q, A, v = it["key"], it["q"], it["a"], it.get("vec") or []
    try:
        if k == "p283_pdf_valid":
            n = v[2]
            kk = sp.solve(sp.integrate(sp.Symbol('k')*x**(n-1), (x,0,1)) - 1, sp.Symbol('k'))[0]
            tally(k, kk == n and nums(A)[0] == n, f"sympy k={kk}")
        elif k == "p283_prob_integral":
            n,cn,cdn = v[2:5]
            p = sp.integrate(n*x**(n-1), (x, 0, sp.Rational(cn,cdn)))
            got = nums(A)
            tally(k, p == sp.Rational(int(got[0]), int(got[1])), f"sympy {p} vs {got[:2]}")
        elif k == "p283_expectation":
            n = v[2]
            e = sp.integrate(x*(n+1)*x**n, (x,0,1))
            got = nums(A)
            tally(k, e == sp.Rational(int(got[0]), int(got[1])), f"sympy {e}")
        elif k == "p283_uniform_var":
            b = v[2]
            e = sp.integrate(x/b,(x,0,b)); var = sp.integrate(x*x/b,(x,0,b)) - e*e
            got = nums(A)
            varv = b*b/12
            ok = got[0]==b/2 and (abs(got[1]-varv)<1e-9 if float(varv).is_integer() else sp.Rational(int(got[1]),int(got[2]))==var)
            tally(k, sp.simplify(var - sp.Rational(b*b,12))==0 and ok, f"sympy E={e} Var={var} vs {got}")
        elif k == "p283_exponential_sf":
            d,t = v[2:4]
            kk = t//d
            sfv = float(sp.exp(-sp.Rational(t,d)))
            tally(k, abs(stats.expon.sf(t, scale=d) - sfv) < 1e-12 and f"e^{{-{kk}}}" in A, f"scipy {stats.expon.sf(t,scale=d):.4f}")
        elif k == "p283_expo_mean":
            d = v[2]
            tally(k, stats.expon.mean(scale=d)==d and stats.expon.std(scale=d)==d and nums(A)[0]==d and nums(A)[1]==d, A[:40])
        elif k == "p283_norm_between":
            mu,sd,za,zb = v[2:6]
            p = stats.norm.cdf(zb/100)-stats.norm.cdf(za/100)
            tally(k, abs(nums(A)[0]-round(p,4))<=1.5e-4, f"scipy {p:.4f} vs {A}")
        elif k == "p283_clt_sum":
            mu,sigma,n = v[2:5]
            got = nums(A)
            tally(k, got[0]==n*mu and abs(got[1]-sigma*np.sqrt(n))<1e-9, A[:40])
        elif k == "p283_unbiased":
            i = v[2]
            want = ['Unbiased','Biased','Unbiased'][i]
            tally(k, A.strip().startswith(want), f"{want} vs {A[:30]}")
        elif k == "p283_ci_99":
            xbar,sigma,n = v[2:5]
            zs = stats.norm.ppf(0.995)
            moe = round(round(zs,3)*sigma/np.sqrt(n),3)
            got = nums(A)
            tally(k, abs(got[0]-round(xbar-moe,3))<1e-9 and abs(got[1]-round(xbar+moe,3))<1e-9, f"({xbar-moe},{xbar+moe}) vs {got}")
        elif k == "p283_lsq_fit":
            sxy,sxx,xm,ym,b,a0 = v[2:8]
            tally(k, sxy/sxx==b and ym-b*xm==a0 and nums(A)[0]==b and nums(A)[1]==a0, A[:40])
        elif k == "p283_correlation":
            sxy,sxx,syy = v[2:5]
            r = sxy/np.sqrt(sxx*syy)
            tally(k, abs(nums(A)[0]-round(r,3))<=1e-3 or abs(nums(A)[0]-round(r,2))<=1e-9, f"{r:.3f} vs {A}")
        else: tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:80])

tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:24s} v={r['v']} m={r['m']} u={r['u']}")
    for n in r["notes"][:2]: print("   !", n)
print(f"TOTAL v={tv} m={tm} u={tu}")
