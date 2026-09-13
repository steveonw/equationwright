#!/usr/bin/env python3
"""Check repository inventory, public Pages links, and approved release mirrors."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote

REQUIRED = [
    # Public/current release surface.
    "index.html",
    "Math_Worksheet_Builder_v7_3_0_FULL_CATALOG.html",
    "Math_Worksheet_Builder_v7_3_0_FULL_CATALOG_OFFLINE.html",
    "EquationWright_v7_3_Complete_User_Manual_with_Developer_Notes.pdf",
    "README_v7_3.md",
    "releases/v7.3/app/EquationWright_v7_3_ONLINE.html",
    "releases/v7.3/app/EquationWright_v7_3_OFFLINE.html",
    "releases/v7.3/EquationWright_v7_3_Complete_User_Manual_with_Developer_Notes.pdf",
    "releases/v7.3/RELEASE_NOTES_v7_3.md",
    "releases/v7.3/EquationWright_v7_3_FINAL_APPROVED.zip",

    # Historical versioned HTML retained for reproducibility / old links.
    "Math_Worksheet_Builder_v6_17_0_MTH288.html",
    "Math_Worksheet_Builder_v6_17_0_MTH288_OFFLINE.html",
    "Math_Worksheet_Builder_v7_0_0_FULL_CATALOG.html",
    "Math_Worksheet_Builder_v7_0_0_FULL_CATALOG_OFFLINE.html",
    "Math_Worksheet_Builder_v7_1_0_FULL_CATALOG.html",
    "Math_Worksheet_Builder_v7_1_0_FULL_CATALOG_OFFLINE.html",

    # Build / audit / gateway essentials.
    "make_offline_build.py",
    "audit.py", "ac_audit.py", "de_audit.py", "de2_audit.py",
    "la_audit.py", "la2_audit.py", "qr_audit.py", "st2_audit.py",
    "hp_audit.py", "s155_audit.py", "s245_audit.py", "p283_audit.py",
    "dm288_audit.py", "de3_audit.py",
    "gateway/tutor-gateway.exe",
    "gateway/tutor-gateway-main.go",
    "gateway/tutor_gateway.py",
    "gateway/localchat.html",
    "gateway/go.mod",
    "vendor/mathjax/tex-svg.js",
    "requirements.txt",
    "LICENSE.md",
    "THIRD_PARTY_NOTICES.md",
    "archive/releases/v7.0/HANDOFF_v7_0_RELEASE.md",
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

# These public GitHub Pages files must be byte-for-byte identical to the
# corresponding approved v7.3 release artifacts.
PUBLIC_RELEASE_MIRRORS = {
    "Math_Worksheet_Builder_v7_3_0_FULL_CATALOG.html":
        "releases/v7.3/app/EquationWright_v7_3_ONLINE.html",
    "Math_Worksheet_Builder_v7_3_0_FULL_CATALOG_OFFLINE.html":
        "releases/v7.3/app/EquationWright_v7_3_OFFLINE.html",
    "EquationWright_v7_3_Complete_User_Manual_with_Developer_Notes.pdf":
        "releases/v7.3/EquationWright_v7_3_Complete_User_Manual_with_Developer_Notes.pdf",
    "README_v7_3.md": "releases/v7.3/RELEASE_NOTES_v7_3.md",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def local_page_links(index: Path) -> list[str]:
    text = index.read_text(encoding="utf-8", errors="replace")
    links: list[str] = []
    for href in re.findall(r'href=["\']([^"\']+)["\']', text, flags=re.I):
        href = href.strip()
        if not href or href.startswith(("#", "http://", "https://", "mailto:", "javascript:")):
            continue
        target = unquote(href.split("#", 1)[0].split("?", 1)[0])
        if target:
            links.append(target)
    return links


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

    for public_rel, approved_rel in PUBLIC_RELEASE_MIRRORS.items():
        public = root / public_rel
        approved = root / approved_rel
        if public.is_file() and approved.is_file() and digest(public) != digest(approved):
            failures.append(
                f"public release mirror differs from approved artifact: {public_rel} != {approved_rel}"
            )

    index = root / "index.html"
    if index.is_file():
        for rel in local_page_links(index):
            if not (root / rel).exists():
                failures.append(f"broken local index.html link: {rel}")

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

    # Scan public versioned applications for an expected copyright marker and
    # obvious accidentally embedded credentials.
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
