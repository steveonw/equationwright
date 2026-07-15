#!/usr/bin/env python3
import json, re
import numpy as np
from scipy import stats
corpus = json.load(open("s245_corpus.json"))
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
        if k == "s245_prob_or":
            pa,pb,pab = v[2:5]
            tally(k, abs(nums(A)[0]-(pa+pb-pab)/100)<1e-9, A)
        elif k == "s245_prob_and_indep":
            pa,pb = v[2:4]
            tally(k, abs(nums(A)[0]-pa*pb/10000)<1e-9, A)
        elif k == "s245_prob_conditional":
            ab,b = v[2:4]
            got = nums(A)
            tally(k, got[0]==ab and got[1]==b and abs(got[2]-round(ab/b,2))<0.011, A)
        elif k == "s245_binom_pmf":
            n,p100,kk = v[2:5]
            want = stats.binom.pmf(kk, n, p100/100)
            tally(k, abs(nums(A)[0]-round(want,4))<=1e-4, f"scipy {want:.4f} vs {A}")
        elif k == "s245_binom_meansd":
            n,p100,mu,sig = v[2:6]
            p = p100/100
            tally(k, n*p==mu and abs(np.sqrt(n*p*(1-p))-sig)<1e-9, f"{n*p},{np.sqrt(n*p*(1-p))} vs {mu},{sig}")
        elif k == "s245_binom_cdf":
            n,p100,kk = v[2:5]
            want = stats.binom.cdf(kk, n, p100/100)
            tally(k, abs(nums(A)[0]-round(want,4))<=1e-4, f"scipy {want:.4f} vs {A}")
        elif k == "s245_clt_se":
            mu,sigma,n = v[2:5]
            got = nums(A)
            tally(k, got[0]==mu and abs(got[1]-sigma/np.sqrt(n))<1e-9, A)
        elif k == "s245_clt_prob":
            mu,sigma,n,z100 = v[2:6]
            want = stats.norm.sf(z100/100)
            tally(k, abs(nums(A)[0]-round(want,4))<=1e-4, f"scipy {want:.4f} vs {A}")
        elif k == "s245_clt_shape":
            tally(k, "normal" in A.lower() and ("CLT" in A or "Central Limit" in A), A[:50])
        elif k == "s245_ci_t":
            n,xbar,s,t1000 = v[2:6]
            df = n-1
            tstar = stats.t.ppf(0.975, df)
            ok_t = abs(round(tstar,3)-t1000/1000)<=0.0005
            se = s/np.sqrt(n); moe = round(t1000/1000*se,3)
            got = nums(A)
            tally(k, ok_t and abs(got[0]-round(xbar-moe,3))<1e-9 and abs(got[1]-round(xbar+moe,3))<1e-9,
                  f"t*={tstar:.3f} interval vs {got}")
        elif k == "s245_ht_z":
            mu0,sigma,n,z100,rej = v[2:7]
            z = z100/100
            tally(k, (abs(z)>1.96)==bool(rej) and abs(nums(A)[0]-z)<1e-9 and (("Reject" in A)==bool(rej)), A[:50])
        elif k == "s245_ht_pvalue":
            z10 = v[2]
            z = z10/10
            p = 2*stats.norm.sf(abs(z))
            tally(k, abs(nums(A)[0]-round(p,4))<=1e-4 and (("Reject" in A)==(p<0.05)), f"scipy {p:.4f} vs {A[:40]}")
        else: tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:80])

tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:24s} v={r['v']} m={r['m']} u={r['u']}")
    for n in r["notes"][:2]: print("   !", n)
print(f"TOTAL v={tv} m={tm} u={tu}")
