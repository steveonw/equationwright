#!/usr/bin/env python3
"""Run every independent audit and write a combined machine-readable summary."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from pathlib import Path

AUDITS = [
    # "general" is informational: its unchecked records are parser limits
    # documented in AUDIT_REPORT.md, not mathematical failures.
    ("general (informational)", "audit.py", "audit_corpus.json"),
    ("applied_calculus", "ac_audit.py", "ac_corpus.json"),
    ("differential_equations_1", "de_audit.py", "de_corpus.json"),
    ("differential_equations_2", "de2_audit.py", "de2_corpus.json"),
    ("linear_algebra_1", "la_audit.py", "la_corpus.json"),
    ("linear_algebra_2", "la2_audit.py", "la2_corpus.json"),
    ("quantitative_reasoning", "qr_audit.py", "qr_corpus.json"),
    ("statistics_2", "st2_audit.py", "st2_corpus.json"),
    ("health_professions", "hp_audit.py", "hp_corpus.json"),
    ("statistical_reasoning", "s155_audit.py", "s155_corpus.json"),
    ("statistics_1", "s245_audit.py", "s245_corpus.json"),
    ("prob_stats_283", "p283_audit.py", "p283_corpus.json"),
    ("discrete_288", "dm288_audit.py", "dm288_full_corpus.json"),
    ("differential_equations_3_mth289", "de3_audit.py", "de3_corpus.json"),
]

TOTAL_PATTERNS = [
    re.compile(r"records:\s*(\d+)[\s\S]*?failures:\s*(\d+)"),
    re.compile(r"^TOTAL\s+(\d+)\s+(\d+)\s+(\d+)\s*$", re.M),
    re.compile(r"^TOTAL\s+v=(\d+)\s+m=(\d+)\s+u=(\d+)\s*$", re.M),
    re.compile(r"VERIFIED:\s*(\d+)\s+MISMATCH:\s*(\d+)\s+UNCHECKED:\s*(\d+)"),
]


@dataclass
class Result:
    name: str
    status: str
    verified: int = 0
    mismatches: int = 0
    unchecked: int = 0
    returncode: int = 0
    script: str = ""
    corpus: str = ""
    message: str = ""


def parse_total(text: str) -> tuple[int, int, int] | None:
    for pattern in TOTAL_PATTERNS:
        matches = list(pattern.finditer(text))
        if matches:
            groups = [int(x) for x in matches[-1].groups()]
            if len(groups) == 2:  # records/failures format
                return groups[0], groups[1], 0
            return groups[0], groups[1], groups[2]
    return None


def execute_audit(root: Path, python: str, item: tuple[str, str, str]) -> Result:
    name, script_name, corpus_name = item
    script = root / script_name
    corpus = root / corpus_name
    if not script.exists():
        return Result(name, "MISSING_SCRIPT", script=script_name, corpus=corpus_name)
    if not corpus.exists():
        return Result(name, "MISSING_CORPUS", script=script_name, corpus=corpus_name)

    proc = subprocess.run(
        [python, script.name],
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    total = parse_total(proc.stdout)
    if proc.returncode != 0:
        return Result(name, "ERROR", returncode=proc.returncode,
                      script=script_name, corpus=corpus_name,
                      message=proc.stdout[-2000:])
    if total is None:
        return Result(name, "UNPARSED", script=script_name,
                      corpus=corpus_name, message=proc.stdout[-2000:])
    verified, mismatches, unchecked = total
    status = "FAIL" if mismatches else ("WARN" if unchecked else "PASS")
    return Result(name, status, verified, mismatches, unchecked, proc.returncode,
                  script_name, corpus_name)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="repository root")
    ap.add_argument("--python", default=sys.executable)
    ap.add_argument("--summary", default="audit_summary.json")
    ap.add_argument("--allow-missing", action="store_true")
    ap.add_argument("--fail-on-unchecked", action="store_true")
    ap.add_argument("--jobs", type=int, default=1,
                    help="number of audits to run concurrently (default: 1)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    jobs = max(1, min(args.jobs, len(AUDITS)))
    if jobs == 1:
        results = [execute_audit(root, args.python, item) for item in AUDITS]
    else:
        with ThreadPoolExecutor(max_workers=jobs) as pool:
            results = list(pool.map(lambda item: execute_audit(root, args.python, item), AUDITS))

    width = max(len(r.name) for r in results)
    print(f"{'audit':{width}s}  status           verified mismatch unchecked")
    for r in results:
        print(f"{r.name:{width}s}  {r.status:15s} {r.verified:8d} {r.mismatches:8d} {r.unchecked:9d}")

    summary = {
        "execution": {"jobs": jobs},
        "results": [asdict(r) for r in results],
        "totals": {
            "verified": sum(r.verified for r in results),
            "mismatches": sum(r.mismatches for r in results),
            "unchecked": sum(r.unchecked for r in results),
        },
        "course_audit_totals_excluding_general_informational": {
            "verified": sum(r.verified for r in results if "informational" not in r.name),
            "mismatches": sum(r.mismatches for r in results if "informational" not in r.name),
            "unchecked": sum(r.unchecked for r in results if "informational" not in r.name),
        },
    }
    (root / args.summary).write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    missing = any(r.status.startswith("MISSING") for r in results)
    errors = any(r.status in {"ERROR", "UNPARSED", "FAIL"}
                 and "informational" not in r.name for r in results)
    unchecked = any(r.unchecked for r in results if "informational" not in r.name)
    if errors or (unchecked and args.fail_on_unchecked):
        return 1
    if missing and not args.allow_missing:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
