#!/usr/bin/env python3
"""Independent exact audit for the MTH 289 full-catalog integration.

The corpus is produced by executing the shipped generators with deterministic
seeds and passing q/a through fixTexEscapes. This auditor recomputes every
answer family from the numeric/model parameters rather than trusting the
generator's displayed answer.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CORPUS = ROOT / "de3_corpus.json"


def norm(value: object) -> str:
    s = str(value or "")
    s = s.replace(r"\(", "").replace(r"\)", "")
    s = s.replace(r"\left", "").replace(r"\right", "")
    s = s.replace(r"\dfrac", r"\frac").replace(r"\tfrac", r"\frac")
    s = s.replace("−", "-").replace("–", "-").replace("—", "-")
    s = re.sub(r"\s+", "", s)
    s = s.replace("+-", "-").replace("--", "+")
    return s


def frac_tex(value: Fraction) -> str:
    if value.denominator == 1:
        return str(value.numerator)
    sign = "-" if value.numerator < 0 else ""
    return rf"{sign}\frac{{{abs(value.numerator)}}}{{{value.denominator}}}"


def monomial_tex(value: Fraction, variable: str, power: int) -> str:
    variable_part = "" if power == 0 else variable if power == 1 else rf"{variable}^{{{power}}}"
    if not variable_part:
        return frac_tex(value)
    if value == 1:
        return variable_part
    if value == -1:
        return "-" + variable_part
    return frac_tex(value) + variable_part





def scalar_var(coeff: int, variable: str) -> str:
    return variable if coeff == 1 else f"-{variable}" if coeff == -1 else f"{coeff}{variable}"


def negative_scalar_var(coeff: int, variable: str) -> str:
    return f"-{variable}" if coeff == 1 else f"-{coeff}{variable}"

def signed_x_term(value: Fraction, power: int) -> str:
    sign = "+" if value >= 0 else "-"
    mag = abs(value)
    coeff = "" if mag == 1 else frac_tex(mag)
    xpart = "x" if power == 1 else f"x^{power}"
    return f"{sign}{coeff}{xpart}"

def rate_term(rate: int) -> str:
    return "t" if rate == 1 else "-t" if rate == -1 else f"{rate}t"


def amp_exp(amplitude: int, rate: int) -> str:
    lead = "" if amplitude == 1 else "-" if amplitude == -1 else str(amplitude)
    return rf"{lead}e^{{{rate_term(rate)}}}"

def matrix_col(v1: int, v2: int) -> str:
    return rf"\begin{{bmatrix}}{v1} \\ {v2}\end{{bmatrix}}"


def rat(obj: dict) -> Fraction:
    return Fraction(int(obj["numerator"]), int(obj["denominator"]))


def render_typed(question: dict, solution: dict) -> str:
    dep = question["dependentVariable"]
    ind = question["independentVariable"]
    if solution["type"] == "exp-power":
        amp = rat(solution["amplitude"])
        coeff = rat(solution["exponentCoefficient"])
        power = int(solution["exponentPower"])
        leading = "" if amp == 1 else "-" if amp == -1 else frac_tex(amp)
        return rf"\({dep}={leading}e^{{{monomial_tex(coeff, ind, power)}}}\)"

    eq = rat(solution["equilibrium"])
    transient = rat(solution["transient"])
    rate = rat(solution["rate"])
    exponent = monomial_tex(rate, ind, 1)
    if transient == 1:
        exp_term = rf"e^{{{exponent}}}"
    elif transient == -1:
        exp_term = rf"-e^{{{exponent}}}"
    else:
        exp_term = rf"{frac_tex(transient)}e^{{{exponent}}}"
    if eq == 0:
        body = exp_term
    elif transient < 0:
        pos = -transient
        pos_term = rf"e^{{{exponent}}}" if pos == 1 else rf"{frac_tex(pos)}e^{{{exponent}}}"
        body = f"{frac_tex(eq)}-{pos_term}"
    else:
        body = f"{frac_tex(eq)}+{exp_term}"
    return rf"\({dep}={body}\)"


def expected_answer(spec: dict) -> str:
    fam = spec["family"]

    if fam in {"typed-separable", "typed-linear"}:
        q = spec["questionModel"]
        sol = spec["solutionModel"]
        if fam == "typed-separable":
            a = rat(q["parameters"]["a"])
            n = int(q["parameters"]["n"])
            y0 = rat(q["condition"]["dependentValue"])
            assert sol["type"] == "exp-power"
            assert rat(sol["amplitude"]) == y0
            assert rat(sol["exponentCoefficient"]) == a / (n + 1)
            assert int(sol["exponentPower"]) == n + 1
        else:
            a = rat(q["parameters"]["a"])
            b = rat(q["parameters"]["b"])
            y0 = rat(q["condition"]["dependentValue"])
            equilibrium = b / a
            assert sol["type"] == "equilibrium-plus-exponential"
            assert rat(sol["equilibrium"]) == equilibrium
            assert rat(sol["transient"]) == y0 - equilibrium
            assert rat(sol["rate"]) == -a
        return render_typed(q, sol)

    if fam == "systems-eigenvalues":
        return rf"\(\lambda_1={spec['l1']},\ \lambda_2={spec['l2']}\)"
    if fam == "systems-eigenvector":
        k, gap = int(spec["k"]), int(spec["gap"])
        assert spec["v"] == [k, gap]
        # (l1-l2)k + k*gap = 0 because gap=l2-l1.
        assert (int(spec["l1"]) - int(spec["l2"])) * k + k * gap == 0
        return rf"\({matrix_col(k, gap)}\) (or any nonzero multiple)"
    if fam == "systems-diagonal-general":
        return rf"\(x=C_1e^{{{rate_term(int(spec['a']))}}},\quad y=C_2e^{{{rate_term(int(spec['b']))}}}\)"
    if fam == "systems-classification":
        l1, l2 = int(spec["l1"]), int(spec["l2"])
        answer = "Stable node" if l1 < 0 and l2 < 0 else "Unstable node" if l1 > 0 and l2 > 0 else "Saddle"
        assert answer == spec["answer"]
        return answer
    if fam == "systems-diagonal-ivp":
        return rf"\(x={amp_exp(int(spec['x0']), int(spec['a']))},\quad y={amp_exp(int(spec['y0']), int(spec['b']))}\)"
    if fam == "systems-complex-classification":
        alpha, beta = int(spec["alpha"]), int(spec["beta"])
        assert beta != 0
        answer = "Stable spiral" if alpha < 0 else "Unstable spiral" if alpha > 0 else "Center"
        assert answer == spec["answer"]
        return answer

    if fam == "series-xy-recurrence":
        return rf"\(a_{{n+2}}=\frac{{{spec['c']}a_{{n-1}}}}{{(n+2)(n+1)}}\)"
    if fam == "series-xy-terms":
        c, a0, a1 = map(int, (spec["c"], spec["a0"], spec["a1"]))
        a3, a4 = Fraction(c*a0, 6), Fraction(c*a1, 12)
        assert [a3.numerator, a3.denominator] == spec["a3"]
        assert [a4.numerator, a4.denominator] == spec["a4"]
        t1 = signed_x_term(Fraction(a1), 1)
        t3 = signed_x_term(a3, 3)
        t4 = signed_x_term(a4, 4)
        return rf"\(y={a0}{t1}{t3}{t4}+\cdots\)"
    if fam == "series-harmonic-recurrence":
        return rf"\(a_{{n+2}}=-\frac{{{spec['k']}a_n}}{{(n+2)(n+1)}}\)"
    if fam == "series-harmonic-terms":
        k, A, B = map(int, (spec["k"], spec["A"], spec["B"]))
        a2, a3 = Fraction(-k*A, 2), Fraction(-k*B, 6)
        assert [a2.numerator, a2.denominator] == spec["a2"]
        assert [a3.numerator, a3.denominator] == spec["a3"]
        return (rf"\(y={A}{signed_x_term(Fraction(B), 1)}"
                rf"{signed_x_term(a2, 2)}"
                rf"{signed_x_term(a3, 3)}+\cdots\)")
    if fam == "series-point-classification":
        answer = "Ordinary point" if int(spec["x0"]) != int(spec["c"]) else "Singular point"
        assert answer == spec["answer"]
        return answer

    if fam == "fourier-parity":
        answer = (r"\(a_0=a_n=0\); only sine coefficients may remain"
                  if spec["odd"] else
                  r"\(b_n=0\); only cosine coefficients and a_0 may remain")
        assert answer == spec["answer"]
        return answer
    if fam == "fourier-square-bn":
        A, n = int(spec["A"]), int(spec["n"])
        return r"\(0\)" if n % 2 == 0 else rf"\(\frac{{{4*A}}}{{{n}\pi}}\)"
    if fam == "fourier-square-b1":
        return rf"\(\frac{{{4*int(spec['A'])}}}{{\pi}}\)"
    if fam == "fourier-sawtooth-bn":
        n = int(spec["n"])
        value = Fraction(2 * (1 if n % 2 else -1), n)
        body = str(value.numerator) if value.denominator == 1 else rf"\frac{{{value.numerator}}}{{{value.denominator}}}"
        return rf"\({body}\)"
    if fam == "fourier-constant-a0":
        return rf"\({2*int(spec['c'])}\)"
    if fam == "fourier-absx-an":
        n = int(spec["n"])
        return r"\(0\)" if n % 2 == 0 else rf"\(-\frac{{4}}{{{n*n}\pi}}\)"

    if fam == "transform-first-shift-forward":
        a = int(spec["a"])
        return rf"\(F(s-{a})\)" if a > 0 else rf"\(F(s+{abs(a)})\)"
    if fam == "transform-first-shift-inverse":
        a, b = int(spec["a"]), int(spec["b"])
        return rf"\(e^{{{scalar_var(a, 't')}}}\sin({scalar_var(b, 't')})\)"
    if fam == "transform-unit-step":
        c = int(spec["c"])
        return rf"\(\frac{{e^{{{negative_scalar_var(c, 's')}}}}}{{s}}\)"
    if fam == "transform-delayed-sine":
        b, c = int(spec["b"]), int(spec["c"])
        return rf"\(e^{{{negative_scalar_var(c, 's')}}}\frac{{{b}}}{{s^2+{b*b}}}\)"
    if fam == "transform-delayed-sine-inverse":
        b, c = int(spec["b"]), int(spec["c"])
        return rf"\(u(t-{c})\sin({b}(t-{c}))\)"
    if fam == "transform-pulse":
        a, b = int(spec["a"]), int(spec["b"])
        return rf"\(\frac{{e^{{{negative_scalar_var(a, 's')}}}-e^{{{negative_scalar_var(b, 's')}}}}}{{s}}\)"

    if fam == "pde-classification":
        labels = ["Heat equation", "Wave equation", "Laplace equation"]
        answer = labels[int(spec["kind"])]
        assert answer == spec["answer"]
        return answer
    if fam == "pde-heat-separation":
        return rf"\(X''+\lambda X=0,\quad T'+{spec['k']}\lambda T=0\)"
    if fam == "pde-wave-separation":
        c = int(spec["c"])
        return rf"\(X''+\lambda X=0,\quad T''+{c*c}\lambda T=0\)"

    if fam == "bvp-dirichlet-eigenvalues":
        L = int(spec["L"])
        return rf"\(\lambda_n=\left(\frac{{n\pi}}{{{L}}}\right)^2,\quad n=1,2,3,\ldots\)"
    if fam == "bvp-dirichlet-eigenfunction":
        L, n = int(spec["L"]), int(spec["n"])
        return rf"\(X_{n}(x)=\sin\left(\frac{{{n}\pi x}}{{{L}}}\right)\)"
    if fam == "bvp-smallest-eigenvalue":
        L = int(spec["L"])
        return rf"\(\lambda_1=\frac{{\pi^2}}{{{L*L}}}\)"
    if fam == "bvp-mixed-eigenvalues":
        L = int(spec["L"])
        return rf"\(\lambda_n=\left(\frac{{(n+\frac12)\pi}}{{{L}}}\right)^2,\quad n=0,1,2,\ldots\)"
    if fam == "bvp-neumann-eigenpair":
        L, n = int(spec["L"]), int(spec["n"])
        return (rf"\(\lambda_{n}=\left(\frac{{{n}\pi}}{{{L}}}\right)^2,"
                rf"\quad X_{n}(x)=\cos\left(\frac{{{n}\pi x}}{{{L}}}\right)\)")

    raise KeyError(f"unknown family: {fam}")


def main() -> int:
    rows = json.loads(CORPUS.read_text(encoding="utf-8"))
    failures: list[dict] = []
    counts: Counter[str] = Counter()

    for index, row in enumerate(rows):
        try:
            spec = row.get("auditSpec")
            if not isinstance(spec, dict):
                raise AssertionError("missing auditSpec")
            family = str(spec.get("family", ""))
            counts[family] += 1
            if not row.get("q") or not row.get("a"):
                raise AssertionError("empty q/a")
            vec = row.get("vec")
            if not isinstance(vec, list) or not vec or any(not isinstance(x, (int, float)) for x in vec):
                raise AssertionError("invalid numeric vec")
            traps = row.get("traps")
            if not isinstance(traps, list) or len(traps) < 2:
                raise AssertionError("fewer than two traps")
            expected = expected_answer(spec)
            if norm(row["a"]) != norm(expected):
                raise AssertionError(f"answer mismatch: got {row['a']!r}; expected {expected!r}")
        except Exception as exc:
            failures.append({
                "index": index,
                "unitId": row.get("unitId"),
                "genIndex": row.get("genIndex"),
                "sample": row.get("sample"),
                "key": row.get("key"),
                "family": (row.get("auditSpec") or {}).get("family"),
                "error": str(exc),
            })

    print("MTH 289 integration audit")
    for family in sorted(counts):
        print(f"{family:42s} {counts[family]:4d}")
    print(f"TOTAL {len(rows)} {len(failures)} 0")

    summary = {
        "status": "PASS" if not failures else "FAIL",
        "records": len(rows),
        "verified": len(rows) - len(failures),
        "mismatches": len(failures),
        "unchecked": 0,
        "families": dict(sorted(counts.items())),
        "failures": failures[:100],
    }
    (ROOT / "de3_audit_summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )

    if failures:
        for failure in failures[:20]:
            print("FAIL", json.dumps(failure, ensure_ascii=False))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
