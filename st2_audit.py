#!/usr/bin/env python3
"""Independent audit of ST2 generators: recompute every statistic."""
import json, re
corpus = json.load(open("st2_corpus.json"))
def ints(s): return [int(v) for v in re.findall(r"-?\d+", s)]
results = {}
def tally(k, ok, note=""):
    r = results.setdefault(k, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:110])
    else: r["u"] += 1

VALID_DESIGN = ['Completely randomized design','Randomized block design','Matched pairs design']
CONF = ['Family income','Hot weather (temperature)']

for it in corpus:
    k, Q, A, v = it["key"], it["q"], it["a"], it.get("vec") or []
    try:
        if k == "st2_chi_stat":
            E,d1,d2,chi = v[2:6]
            calc = (2*d1*d1 + 2*d2*d2)/E
            tally(k, abs(calc - chi) < 1e-9 and str(chi if chi%1 else int(chi)) in A, f"{calc} vs {chi}")
        elif k == "st2_chi_expected":
            r1,c1,total,E100 = v[2:6]
            calc = round(r1*c1/total*100)
            tally(k, calc == E100, f"{r1*c1/total} vs {E100/100}")
        elif k == "st2_chi_decision":
            r,c,chi,crit,rej = v[2:7]
            df = (r-1)*(c-1)
            derived = chi > crit
            tally(k, derived == bool(rej) and f"df = {df}" in A and (("Reject" in A) == derived or ("Fail" in A) == (not derived)),
                  f"df {df}, {chi}>{crit}={derived}, app {A[:40]}")
        elif k == "st2_anova_df":
            kk,n,N = v[2:5]
            tally(k, N == kk*n and str(kk-1) in A and str(N-kk) in A, A[:50])
        elif k == "st2_anova_f":
            ssb,dfb,ssw,dfw,F = v[2:7]
            calc = (ssb/dfb)/(ssw/dfw)
            tally(k, abs(calc - F) < 1e-9 and ints(A)[0] == F, f"{calc} vs {F}")
        elif k == "st2_anova_decision":
            F,crit,rej = v[2:5]
            derived = F > crit
            tally(k, derived == bool(rej) and (("Reject" in A) == derived), f"{F}>{crit}={derived}, app {A[:30]}")
        elif k == "st2_reg_predict":
            a,b,x0 = v[2:5]
            tally(k, ints(A)[0] == a + b*x0, f"{a+b*x0} vs {A}")
        elif k == "st2_reg_residual":
            a,b,x0,y,res = v[2:7]
            tally(k, y - (a + b*x0) == res and ints(A)[0] == res, f"{y-(a+b*x0)} vs {res}")
        elif k == "st2_reg_slope_meaning":
            b = v[2]
            tally(k, f"{b} more points" in A and "average" in A, A[:60])
        elif k == "st2_reg_r2":
            r2 = v[2]
            tally(k, f"{r2}" in A and "variation" in A, A[:60])
        elif k == "st2_design_identify":
            i = v[2]
            tally(k, A.strip() == VALID_DESIGN[i], f"{VALID_DESIGN[i]} vs {A}")
        elif k == "st2_design_confound":
            i = v[2]
            tally(k, A.strip() == CONF[i], f"{CONF[i]} vs {A}")
        elif k == "st2_nonparam_sign":
            plus,minus,n = v[2:5]
            tally(k, plus + minus == n and str(plus) in A and (str(n)+"/2" in A.replace(" ","") or f"{n/2}" in A), A[:60])
        elif k == "st2_nonparam_when":
            i = v[2]
            want = "ordinal" if i==0 else "non-normal"
            tally(k, want in A, f"want {want} in {A[:50]}")
        else:
            tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:80])

tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:24s} v={r['v']} m={r['m']} u={r['u']}")
    for n in r["notes"][:2]: print("   !", n)
print(f"TOTAL v={tv} m={tm} u={tu}")
