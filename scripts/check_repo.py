#!/usr/bin/env python3
"""Check whether a Math Worksheet Builder checkout has its reproducibility files."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

REQUIRED = [
    "Math_Worksheet_Builder_v6_17_0_MTH288.html",
    "Math_Worksheet_Builder_v6_17_0_MTH288_OFFLINE.html",
    "Math_Worksheet_Builder_v7_0_0_FULL_CATALOG.html",
    "Math_Worksheet_Builder_v7_0_0_FULL_CATALOG_OFFLINE.html",
    "make_offline_build.py",
    "audit.py", "ac_audit.py", "de_audit.py", "de2_audit.py",
    "la_audit.py", "la2_audit.py", "qr_audit.py", "st2_audit.py",
    "hp_audit.py", "s155_audit.py", "s245_audit.py", "p283_audit.py",
    "dm288_audit.py", "de3_audit.py",
    "gateway/tutor-gateway-main.go",
    "gateway/tutor_gateway.py",
    "gateway/localchat.html",
    "gateway/go.mod",
    "vendor/mathjax/tex-svg.js",
    "requirements.txt",
    "LICENSE.md",
    "THIRD_PARTY_NOTICES.md",
    "HANDOFF_v7_0_RELEASE.md",
    "spikes/mth289_evidence/MTH289_integration_report.md",
    "spikes/mth289_evidence/mth289_capacity_report.json",
    "spikes/mth289_evidence/mth289_structural_selftest_summary.json",
]

GENERATED = [
    "audit_corpus.json", "ac_corpus.json", "de_corpus.json", "de2_corpus.json",
    "la_corpus.json", "la2_corpus.json", "qr_corpus.json", "st2_corpus.json",
    "hp_corpus.json", "s155_corpus.json", "s245_corpus.json", "p283_corpus.json",
    "dm288_full_corpus.json", "de3_corpus.json",
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--root", default=".")
    p.add_argument("--allow-missing-generated", action="store_true")
    args = p.parse_args()
    root = Path(args.root).resolve()

    failures: list[str] = []
    warnings: list[str] = []

    for rel in REQUIRED:
        if not (root / rel).is_file():
            failures.append(f"missing required file: {rel}")

    for rel in GENERATED:
        path = root / rel
        if not path.is_file():
            target = warnings if args.allow_missing_generated else failures
            target.append(f"missing generated audit corpus: {rel}")
        else:
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                rows = data.get("records") if isinstance(data, dict) else data
                if not isinstance(rows, list) or not rows:
                    failures.append(f"invalid/empty corpus: {rel}")
            except Exception as exc:
                failures.append(f"invalid JSON {rel}: {exc}")

    chat_a = root / "chat/LocalChat.html"
    chat_b = root / "gateway/localchat.html"
    if chat_a.exists() and chat_b.exists() and digest(chat_a) != digest(chat_b):
        warnings.append("chat/LocalChat.html and gateway/localchat.html differ")

    readme = root / "README.md"
    manual = root / "WORKSHEET_MANUAL.md"
    if readme.exists() and manual.exists() and digest(readme) == digest(manual):
        warnings.append("README.md and WORKSHEET_MANUAL.md are duplicates")

    app_files = list(root.glob("Math_Worksheet_Builder_v*.html"))
    for app in app_files:
        text = app.read_text(encoding="utf-8", errors="replace")
        if "Copyright (c) 2026 Steveon William Walker" not in text:
            warnings.append(f"copyright notice not found in {app.name}")
        if re.search(r"(?:api[_-]?key|gateway[_-]?key)\s*[:=]\s*['\"][^'\"]{8,}", text, re.I):
            warnings.append(f"possible embedded credential in {app.name}")

    for item in warnings:
        print("WARN:", item)
    for item in failures:
        print("FAIL:", item)
    print(f"checked {root}: {len(failures)} failure(s), {len(warnings)} warning(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
