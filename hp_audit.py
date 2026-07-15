#!/usr/bin/env python3
"""Independent audit of HP generators: pure arithmetic recompute."""
import json, re
corpus = json.load(open("hp_corpus.json"))
def nums(s): return [float(v) for v in re.findall(r"-?\d+\.?\d*", s)]
results = {}
def tally(k, ok, note=""):
    r = results.setdefault(k, {"v":0,"m":0,"u":0,"notes":[]})
    if ok is True: r["v"] += 1
    elif ok is False: r["m"] += 1; r["notes"].append(note[:110])
    else: r["u"] += 1

for it in corpus:
    k, Q, A, v = it["key"], it["q"], it["a"], it.get("vec") or []
    try:
        if k == "hp_metric_convert":
            kind, n = v[2:4]
            want = [n*1000, n*500/1000, n*1000][kind]
            tally(k, abs(nums(A)[0] - want) < 1e-9, f"{want} vs {A}")
        elif k == "hp_lb_kg":
            kg = v[2]
            lb = round(kg*2.2, 1)
            tally(k, abs(lb/2.2 - kg) < 1e-9 and nums(A)[0] == kg, f"{lb}/2.2 vs {kg}")
        elif k == "hp_tsp_ml":
            tsp = v[2]
            tally(k, nums(A)[0] == tsp*5, A)
        elif k == "hp_dose_formula":
            D,H,Qm,give = v[2:6]
            tally(k, abs(D/H*Qm - give) < 1e-9 and nums(A)[0] == give, f"{D/H*Qm} vs {give}")
        elif k == "hp_dose_tablets":
            order,tab = v[2:4]
            tally(k, nums(A)[0] == order/tab, f"{order/tab} vs {A}")
        elif k == "hp_dose_weight":
            rate,kg = v[2:4]
            tally(k, nums(A)[0] == rate*kg, A)
        elif k == "hp_dose_divided":
            daily,hrs,per,each = v[2:6]
            tally(k, 24//hrs == per and daily/per == each and nums(A)[0] == each, f"{daily}/{per} vs {each}")
        elif k == "hp_iv_mlhr":
            vol,hrs,rate = v[2:5]
            tally(k, vol/hrs == rate and nums(A)[0] == rate, f"{vol/hrs} vs {rate}")
        elif k == "hp_iv_gtt":
            rate,gtt,drops = v[2:5]
            tally(k, abs(rate*gtt/60 - drops) < 1e-9 and nums(A)[0] == drops, f"{rate*gtt/60} vs {drops}")
        elif k == "hp_percent_solution":
            pct,vol,g = v[2:5]
            tally(k, pct*vol/100 == g and nums(A)[0] == g, f"{pct*vol/100} vs {g}")
        elif k == "hp_dilution":
            C1,C2,V2,V1 = v[2:6]
            tally(k, C1*V1 == C2*V2 and nums(A)[0] == V1, f"C1V1={C1*V1} C2V2={C2*V2}")
        else: tally(k, None)
    except Exception as e:
        tally(k, None, str(e)[:80])

tv=tm=tu=0
for kk in sorted(results):
    r = results[kk]; tv+=r["v"]; tm+=r["m"]; tu+=r["u"]
    print(f"{kk:22s} v={r['v']} m={r['m']} u={r['u']}")
    for n in r["notes"][:2]: print("   !", n)
print(f"TOTAL v={tv} m={tm} u={tu}")
