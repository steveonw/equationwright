#!/usr/bin/env python3
"""Independent audit of S155 generators: recompute with numpy/scipy."""
import json, re
import numpy as np
from scipy import stats
corpus = json.load(open("s155_corpus.json"))
def nums(s): return [float(v) for v in re.findall(r"-?\d+\.?\d*", s)]
results = {}
def tally(k, ok, note=""):
    if ok is not None: ok = bool(ok)   # numpy bool_ is not the True singleton
    r = results.setdefault(k, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:110])
    else: r["u"] += 1

for it in corpus:
    k, Q, A, v = it["key"], it["q"], it["a"], it.get("vec") or []
    try:
        if k == "s155_mean_median":
            data = v[2:]
            mean, med = np.mean(data), np.median(data)
            got = nums(A)
            tally(k, abs(got[0]-round(mean,1))<1e-9 and got[1]==med, f"{mean},{med} vs {got}")
        elif k == "s155_sample_sd":
            # data are in the question
            data = [float(x) for x in re.findall(r"-?\d+", Q.split(":")[1].split(".")[0])]
            sd = np.std(data, ddof=1)
            tally(k, abs(nums(A)[0]-round(sd,2))<1e-9, f"scipy {sd:.4f} vs {A}")
        elif k == "s155_outlier_effect":
            out = v[2]; data = v[3:]
            newmean = round(np.mean(data+[out]),1)
            newmed = np.median(data+[out])
            got = nums(A)
            tally(k, abs(got[0]-newmean)<1e-9 and abs(got[1]-newmed)<1e-9, f"{newmean},{newmed} vs {got}")
        elif k == "s155_z_score":
            mu,sd,x,z = v[2:6]
            tally(k, (x-mu)/sd == z and nums(A)[0]==z, f"{(x-mu)/sd} vs {z}")
        elif k == "s155_norm_left":
            mu,sd,z100 = v[2:5]
            p = stats.norm.cdf(z100/100)
            tally(k, abs(nums(A)[0]-round(p,4))<=1e-4, f"scipy {p:.4f} vs {A}")
        elif k == "s155_norm_between":
            mu,sd,za100,zb100 = v[2:6]
            p = stats.norm.cdf(zb100/100)-stats.norm.cdf(za100/100)
            tally(k, abs(nums(A)[0]-round(p,4))<=1.5e-4, f"scipy {p:.4f} vs {A}")
        elif k == "s155_empirical":
            kind = v[2]
            want = ['68','95','99.7','16','2.5'][kind]
            tally(k, want in A, f"{want} in {A}")
        elif k == "s155_r_interpret":
            rv = v[2]
            strength = 'strong' if abs(rv)>=80 else 'moderate' if abs(rv)>=50 else 'weak'
            dirn = 'positive' if rv>0 else 'negative'
            tally(k, strength in A.lower() and dirn in A.lower(), f"{strength} {dirn} vs {A}")
        elif k == "s155_causation":
            tally(k, "not imply causation" in A or "does not imply" in A, A[:50])
        elif k == "s155_ci_compute":
            xbar,sigma,n = v[2:5]
            se = sigma/np.sqrt(n); moe = round(1.96*se,2)
            lo, hi = round(xbar-moe,2), round(xbar+moe,2)
            got = nums(A)
            tally(k, abs(got[0]-lo)<1e-9 and abs(got[1]-hi)<1e-9, f"({lo},{hi}) vs {got}")
        elif k == "s155_ci_meaning":
            lvl = None
            m = re.search(r"captures the true mean in (\d+)", A)
            qm = re.search(r"A (\d+)", Q)
            tally(k, m and qm and m.group(1)==qm.group(1), A[:60])
        elif k == "s155_pvalue_meaning":
            pv1000 = v[2]
            pct = pv1000/10
            tally(k, f"{pct:.1f}" in A and "H_0" in A.replace("H₀","H_0"), f"{pct} in {A[:60]}")
        else: tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:80])

tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:24s} v={r['v']} m={r['m']} u={r['u']}")
    for n in r["notes"][:2]: print("   !", n)
print(f"TOTAL v={tv} m={tm} u={tu}")
