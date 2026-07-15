#!/usr/bin/env python3
"""Independent audit of QR generators: pure recomputation."""
import json, re
corpus = json.load(open("qr_corpus.json"))
def ints(s): return [int(v) for v in re.findall(r"-?\d+", s)]
results = {}
def tally(k, ok, note=""):
    r = results.setdefault(k, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:110])
    else: r["u"] += 1

EXPRS = [lambda p,q: (p and q) or (not p),
         lambda p,q: p and ((not q) or p),
         lambda p,q: not (p or q)]
NEGS = ['Some students did not pass','No phones are cheap','Some cars are free','All tests are hard']
VALID = [True, True, False, False]

for it in corpus:
    k, Q, A, v = it["key"], it["q"], it["a"], it.get("vec") or []
    try:
        if k == "qr_prop_solve":
            a,b,d,w = v[2:6]
            tally(k, a*d//b == w and ints(A)[0] == w, f"{a}*{d}/{b} vs {A}")
        elif k == "qr_prop_unitprice":
            ozA,pA,ozB,pB,cheap = v[2:7]
            derived = 0 if pA/ozA < pB/ozB else 1
            tally(k, derived == cheap and ("Brand A" in A) == (cheap==0), f"{pA/ozA} vs {pB/ozB}, app {A[:20]}")
        elif k == "qr_percent_change":
            a0,b0,pct = v[2:5]
            calc = round((b0-a0)/a0*100)
            tally(k, calc == pct and str(abs(pct)) in A, f"{calc} vs {pct}")
        elif k == "qr_prop_scale":
            kk,i = v[2:4]
            tally(k, str(kk*i) in A, A)
        elif k == "qr_fin_simple":
            P,r,t,I = v[2:6]
            tally(k, P*r*t//100 == I and str(I) in A, f"{P*r*t/100} vs {I}")
        elif k == "qr_fin_compound":
            P,r,Aamt = v[2:5]
            calc = P*(1+r/100)**2
            tally(k, abs(calc - Aamt) < 1e-6 and str(int(Aamt)) in A.replace(',',''), f"{calc} vs {Aamt}")
        elif k == "qr_fin_downpayment":
            price,pct,down = v[2:5]
            tally(k, price*pct//100 == down and str(price-down) in A, f"financed {price-down} vs {A}")
        elif k == "qr_fin_loan_interest":
            P,mo,n,I = v[2:6]
            tally(k, mo*n - P == I and str(I) in A, f"{mo*n-P} vs {I}")
        elif k == "qr_logic_negation":
            i = v[2]
            tally(k, NEGS[i] in A, f"expected {NEGS[i]}, app {A[:40]}")
        elif k == "qr_logic_truthvalue":
            which,pv,qv,val = v[2:6]
            derived = EXPRS[which](bool(pv), bool(qv))
            tally(k, derived == bool(val) and A.strip() == ("True" if derived else "False"),
                  f"derived {derived}, app {A.strip()}")
        elif k == "qr_logic_valid":
            i,valid = v[2:4]
            tally(k, VALID[i] == bool(valid) and A.strip() == ("Valid" if VALID[i] else "Invalid"),
                  f"form {i} valid={VALID[i]}, app {A}")
        elif k == "qr_set_union":
            nA,nB,both,u = v[2:6]
            tally(k, nA+nB-both == u and str(u) in A, f"{nA+nB-both} vs {u}")
        elif k == "qr_model_build":
            f,per,n = v[2:5]
            tally(k, str(per*n+f) in A and f"{per}x + {f}" in A, A[:50])
        elif k == "qr_model_slope":
            m,b = v[2:4]
            tally(k, f"${m}" in A and ("gigabyte" in A), A[:50])
        elif k == "qr_model_solve":
            m,b,n,tgt = v[2:6]
            tally(k, m*n+b == tgt and ints(A)[0] == n, f"{(tgt-b)/m} vs {n}")
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
