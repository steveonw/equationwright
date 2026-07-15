#!/usr/bin/env python3
"""Independent math audit: re-derive app answers with SymPy and compare."""
import json, re, sys
import sympy as sp
from sympy.parsing.latex import parse_latex

corpus = json.load(open("audit_corpus.json"))

# ---------------- latex cleanup ----------------
def clean(tex):
    t = tex
    t = t.replace(r"\displaystyle", " ").replace(r"\dfrac", r"\frac")
    t = t.replace(r"\!", "").replace(r"\,", " ").replace(r"\;", " ").replace(r"\ ", " ")
    t = t.replace(r"\big(", "(").replace(r"\big)", ")").replace(r"\Big(", "(").replace(r"\Big)", ")")
    t = t.replace(r"\left", "").replace(r"\right", "")
    t = re.sub(r"\\(sin|cos|tan|sec|csc|cot)\^\{?(\d)\}?", r"\\\1SQPOW\2", t)  # \cos^2 x -> mark
    t = re.sub(r"\\(arcsin|arccos|arctan)", r"\\operatorname{\1}", t) if False else t
    return t

def fix_trig_pow(t):
    # \cosSQPOW2 x  or \cosSQPOW2(x...)  -> (\cos(ARG))**n
    def rep(m):
        fn, n, arg = m.group(1), m.group(2), m.group(3)
        return r"(\%s{(%s)})^{%s}" % (fn, arg.strip(), n)
    t = re.sub(r"\\(sin|cos|tan|sec|csc|cot)SQPOW(\d)\s*\(?\s*([A-Za-z0-9^{}\\ ]+?)\)?(?=[\s\)\-\+\=,]|$)", rep, t)
    return t

def P(tex):
    """parse a latex snippet to sympy"""
    t = clean(tex)
    t = fix_trig_pow(t)
    t = re.sub(r"(?<![A-Za-z\\])e\^\{([^{}]*)\}", r"\\exp(\1)", t)   # e^{2x} -> exp(2x)
    t = re.sub(r"(?<![A-Za-z\\])e\^([A-Za-z0-9])", r"\\exp(\1)", t)
    t = t.strip().strip("$")
    return parse_latex(t)

def mathblocks(s):
    return re.findall(r"\\\((.*?)\\\)", s, re.S)

def last_eq_rhs(tex):
    """split on top-level '=' and return last part (also return full)"""
    depth = 0; parts = []; cur = ""
    for ch in tex:
        if ch in "{([": depth += 1
        if ch in "})]": depth -= 1
        if ch == "=" and depth == 0:
            parts.append(cur); cur = ""
        else: cur += ch
    parts.append(cur)
    return parts[-1].strip()

def eq(a, b):
    try:
        d = sp.simplify(a - b)
        if d == 0: return True
        if sp.simplify(sp.expand_log(a - b, force=True)) == 0: return True
        r = a.equals(b)
        return bool(r)
    except Exception:
        try: return bool(a.equals(b))
        except Exception: return False

x, t_, k = sp.symbols("x t k")

# ---------------- family checkers ----------------
def check_derivative(item):
    q, a = item["q"], item["a"]
    qb = mathblocks(q)
    ab = mathblocks(a)
    if not qb or not ab: return None
    # expression to differentiate
    m = re.search(r"f\(x\)\s*=\s*(.+)$", qb[0], re.S)
    if m: expr_tex = m.group(1)
    else:
        m = re.search(r"\\frac\{d\}\{dx\}\s*\\?[bB]ig\((.+)\\?[bB]ig\)", q, re.S) or \
            re.search(r"\\frac\{d\}\{dx\}\((.+)\)", q, re.S)
        if not m: return None
        expr_tex = m.group(1).replace(r"\big", "")
    ans_tex = last_eq_rhs(ab[0])
    try:
        f = P(expr_tex); ans = P(ans_tex)
        return eq(sp.diff(f, x), ans)
    except Exception:
        return None

def check_limit(item):
    q, a = item["q"], item["a"]
    m = re.search(r"\\lim_\{x\s*\\to\s*([^}]+)\}\s*(.+?)\\\)", q, re.S)
    if not m: return None
    pt_tex, expr_tex = m.group(1), m.group(2)
    # piecewise: pick the branch by the approach side
    pw = re.search(r"\\begin\{cases\}(.+?)\\end\{cases\}", q, re.S)
    if pw:
        mm = re.match(r"\s*(-?[\d.]+)\s*\^\{?([+-])\}?", pt_tex.strip()) or \
             re.match(r"\s*(-?[\d.]+)\s*\^([+-])", pt_tex.strip())
        if not mm: return None
        pt_v, side = float(mm.group(1)), mm.group(2)
        branches = [b for b in pw.group(1).split(r"\\") if b.strip()]
        chosen = None
        for br in branches:
            bits = br.split("&")
            if len(bits) != 2: continue
            expr_b, cond = bits[0].strip(), bits[1].strip()
            lt = re.search(r"x\s*(<|\\le)\s*(-?[\d.]+)", cond)
            ge = re.search(r"x\s*(\\ge|>)\s*(-?[\d.]+)", cond)
            if side == "-" and lt and float(lt.group(2)) == pt_v: chosen = expr_b
            if side == "+" and ge and float(ge.group(2)) == pt_v: chosen = expr_b
        if not chosen: return None
        ab = mathblocks(a)
        if not ab: return None
        try:
            return eq(P(chosen).subs(x, sp.Rational(str(pt_v)).limit_denominator()), P(last_eq_rhs(ab[0])))
        except Exception: return None
    ab = mathblocks(a)
    if not ab: return None
    ans_raw = last_eq_rhs(ab[0]).strip()
    try:
        side = "+-"
        pt_tex = pt_tex.strip()
        dirn = None
        if pt_tex.endswith("^-") or pt_tex.endswith("^{-}"): dirn = "-"; pt_tex = pt_tex.split("^")[0]
        if pt_tex.endswith("^+") or pt_tex.endswith("^{+}"): dirn = "+"; pt_tex = pt_tex.split("^")[0]
        pt = sp.oo if r"\infty" in pt_tex else (-sp.oo if r"-\infty" in pt_tex else P(pt_tex))
        f = P(expr_tex)
        lim = sp.limit(f, x, pt, dir=dirn) if dirn else sp.limit(f, x, pt)
        if ans_raw in ("DNE", r"\text{DNE}"):
            return not lim.is_finite if lim is not None else None
        if r"\infty" in ans_raw:
            want = -sp.oo if ans_raw.strip().startswith("-") else sp.oo
            return lim == want
        return eq(lim, P(ans_raw))
    except Exception:
        return None

def check_indef_integral(item):
    q, a = item["q"], item["a"]
    m = re.search(r"\\int\s*(.+?)\\?,?\s*dx", clean(q), re.S)
    if not m: return None
    ab = mathblocks(a)
    if not ab: return None
    ans_tex = last_eq_rhs(ab[0])
    if "+C" not in ans_tex.replace(" ", ""): return None
    ans_tex = re.sub(r"\+\s*C\s*$", "", ans_tex.strip())
    try:
        integrand = P(m.group(1)); F = P(ans_tex)
        return eq(sp.diff(F, x), integrand)
    except Exception:
        return None

def check_def_integral(item):
    q, a = item["q"], item["a"]
    src = clean(q) + " || " + clean(a)
    m = re.search(r"\\int_\{?([^}\s^]+)\}?\^\{?([^}\s]+)\}?\s*(.+?)\s*d([xt])", clean(a) if r"\int" in a else clean(q), re.S)
    if not m: return None
    lo_tex, hi_tex, expr_tex, var = m.groups()
    ab = mathblocks(a)
    if not ab: return None
    ans_tex = last_eq_rhs(ab[-1])
    if "C" == ans_tex.strip(): return None
    try:
        v = sp.Symbol(var)
        lo = sp.oo if r"\infty" in lo_tex else P(lo_tex)
        hi = sp.oo if r"\infty" in hi_tex else P(hi_tex)
        f = P(expr_tex).subs(x, v) if var != "x" else P(expr_tex)
        val = sp.integrate(f, (v, lo, hi))
        if "diverge" in a.lower(): return val.is_finite is False or val in (sp.oo, -sp.oo)
        return eq(sp.simplify(val), P(ans_tex))
    except Exception:
        return None

def check_solve(item):
    q, a = item["q"], item["a"]
    qb = mathblocks(q)
    if not qb: return None
    m = re.search(r"(.+?)=(.+)", qb[0], re.S)
    if not m: return None
    try:
        lhs, rhs = P(m.group(1)), P(m.group(2))
        sols = sp.solve(sp.Eq(lhs, rhs), x)
        # collect x=... values from answer
        vals = []
        for blk in mathblocks(a):
            for part in re.split(r",|\\text\{[^}]*\}|\bor\b", blk):
                mm = re.search(r"x\s*=\s*(.+)", part.strip())
                if mm:
                    rhs = last_eq_rhs(mm.group(1))
                    try:
                        if r"\pm" in rhs:
                            vals.append(P(rhs.replace(r"\pm", "+")))
                            vals.append(P(rhs.replace(r"\pm", "-")))
                        else:
                            vals.append(P(rhs))
                    except Exception: pass
        if not vals: return None
        # every stated value must satisfy; count match if sets align
        ok_each = all(any(eq(v, s) for s in sols) for v in vals)
        return ok_each and len(vals) >= min(len(sols), len(vals))
    except Exception:
        return None

def check_cont_k(item):
    q, a = item["q"], item["a"]
    m = re.search(r"\\frac\{([^}]+)\}\{\(?([^}]+?)\)?\}\s*,?\s*&?\s*x\s*\\ne\s*([\-0-9]+)", q)
    if not m: return None
    ab = mathblocks(a)
    if not ab: return None
    try:
        num, den, pt = P(m.group(1)), P(m.group(2)), sp.Integer(int(m.group(3)))
        want = sp.limit(num/den, x, pt)
        return eq(want, P(last_eq_rhs(ab[0])))
    except Exception:
        return None

def check_avg_value(item):
    q, a = item["q"], item["a"]
    mf = re.search(r"f\(x\)\s*=\s*(.+?)\\\)", q, re.S)
    mi = re.search(r"\[\s*([^,\]]+)\s*,\s*([^\]]+?)\s*\]", clean(q))
    ab = mathblocks(a)
    if not (mf and mi and ab): return None
    try:
        f = P(mf.group(1))
        lo = P(mi.group(1)); hi = P(mi.group(2).replace(r"\pi", "pi")) if r"\pi" in mi.group(2) else P(mi.group(2))
        if r"\pi" in mi.group(2): hi = sp.pi
        val = sp.integrate(f, (x, lo, hi)) / (hi - lo)
        return eq(sp.simplify(val), P(last_eq_rhs(ab[-1])))
    except Exception:
        return None


def check_identity(item):
    """answer is an equivalent form of the question's expression (factor, vertex form, etc.)"""
    qb, ab = mathblocks(item["q"]), mathblocks(item["a"])
    if not qb or not ab: return None
    qtex = qb[0]
    if "=" in qtex and "x^2" not in qtex.split("=")[0]:
        pass
    try:
        lhs = P(last_eq_rhs(qtex)) if "=" in qtex else P(qtex)
        rhs_tex = ab[-1]
        rhs = P(last_eq_rhs(rhs_tex))
        return eq(sp.expand(lhs), sp.expand(rhs))
    except Exception:
        return None

def check_trig_value(item):
    qb, ab = mathblocks(item["q"]), mathblocks(item["a"])
    if not qb or not ab: return None
    m = re.search(r"\\(sin|cos|tan|sec|csc|cot)", qb[0])
    if not m: return None
    try:
        expr = P(qb[0])
        # degrees like 60^\circ
        if r"\circ" in qb[0]:
            deg = re.search(r"(-?\d+)\s*\^\{?\\circ\}?", qb[0])
            if not deg: return None
            fn = m.group(1)
            expr = getattr(sp, fn)(sp.rad(int(deg.group(1))))
        return eq(sp.simplify(expr), P(last_eq_rhs(ab[0])))
    except Exception:
        return None

def check_ftc(item):
    q, a = item["q"], item["a"]
    m = re.search(r"\\int_\{?([^}^]+)\}?\^\{?([^}]+)\}?\s*(.+?)\s*\\?,?\s*dt", clean(q), re.S)
    ab = mathblocks(a)
    if not m or not ab: return None
    try:
        lo_tex, hi_tex, g_tex = m.groups()
        t = sp.Symbol("t")
        g = P(g_tex)
        hi = P(hi_tex); lo = P(lo_tex)
        want = g.subs(t, hi)*sp.diff(hi, x) - g.subs(t, lo)*sp.diff(lo, x)
        return eq(sp.simplify(want), P(last_eq_rhs(ab[0])))
    except Exception:
        return None

def check_partial(item):
    q, a = item["q"], item["a"]
    y = sp.Symbol("y")
    mf = re.search(r"f\(x,\s*y\)\s*=\s*(.+?)\\\)", q, re.S)
    ab = mathblocks(a)
    if not mf or not ab: return None
    wrt = y if re.search(r"f_y|partial y", q) else x
    try:
        f = P(mf.group(1))
        return eq(sp.diff(f, wrt), P(last_eq_rhs(ab[0])))
    except Exception:
        return None

def check_synth_div(item):
    q, a = item["q"], item["a"]
    m = re.search(r"divide\s*\\\((.+?)\\\)\s*by\s*\\\((.+?)\\\)", q, re.S)
    mq = re.search(r"Quotient:\s*\\\((.+?)\\\)", a, re.S)
    mr = re.search(r"Remainder:\s*\\?\(?\s*(-?\d+)", a)
    if not (m and mq and mr): return None
    try:
        dividend, divisor = P(m.group(1)), P(m.group(2))
        quot, rem = P(mq.group(1)), sp.Integer(int(mr.group(1)))
        return eq(sp.expand(quot*divisor + rem), sp.expand(dividend))
    except Exception:
        return None

FAMILIES = [
    (re.compile(r"synth_div", re.I), check_synth_div),
    (re.compile(r"deriv|diff", re.I), check_derivative),
    (re.compile(r"limit|lhopital|infty", re.I), check_limit),
    (re.compile(r"usub|int_parts|int_power|antider|indef", re.I), check_indef_integral),
    (re.compile(r"def_?int|ftc_eval|area|riemann|improper", re.I), check_def_integral),
    (re.compile(r"solve|equation|quad_formula|factor_solve", re.I), check_solve),
    (re.compile(r"cont_piecewise", re.I), check_cont_k),
    (re.compile(r"factor|vertex_form|complete_square|diff_squares|expand|simplif|log_expand|log_combine", re.I), check_identity),
    (re.compile(r"unit_circle|trig_value|exact_value|special_angle", re.I), check_trig_value),
    (re.compile(r"ftc", re.I), check_ftc),
    (re.compile(r"partial", re.I), check_partial),
    (re.compile(r"linear_solve|abs_value$|radical|log_solve|exp_solve|expo", re.I), check_solve),
    (re.compile(r"avg_value", re.I), check_avg_value),
]

results = {"VERIFIED": 0, "MISMATCH": [], "UNCHECKED": 0}
per_key = {}
for item in corpus:
    fn = None
    for pat, f in FAMILIES:
        if pat.search(item["key"]): fn = f; break
    verdict = fn(item) if fn else None
    rec = per_key.setdefault(item["key"], {"v":0,"m":0,"u":0})
    if verdict is True:
        results["VERIFIED"] += 1; rec["v"] += 1
    elif verdict is False:
        results["MISMATCH"].append(item); rec["m"] += 1
    else:
        results["UNCHECKED"] += 1; rec["u"] += 1

checked_keys = sum(1 for r in per_key.values() if r["v"] > 0)
print(f"VERIFIED: {results['VERIFIED']}  MISMATCH: {len(results['MISMATCH'])}  UNCHECKED: {results['UNCHECKED']}")
print(f"generator keys with >=1 verification: {checked_keys} / {len(per_key)}")
json.dump({"per_key": per_key, "mismatches": results["MISMATCH"]}, open("audit_report.json","w"), indent=1)
print("\n--- MISMATCHES (need human eyes) ---")
for m_ in results["MISMATCH"][:12]:
    print(f"[{m_['key']}] Q: {m_['q'][:100]}")
    print(f"          A: {m_['a'][:80]}")
