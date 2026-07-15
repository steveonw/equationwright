#!/usr/bin/env python3
"""Fetch the exact MathJax browser bundle used by the offline builder.

The repository completion pack already includes an extracted copy at
vendor/mathjax/tex-svg.js. This utility is provided for controlled refreshes.
"""
from __future__ import annotations

import argparse
import hashlib
import sys
import urllib.request
from pathlib import Path

DEFAULT_URL = "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--url", default=DEFAULT_URL)
    p.add_argument("--output", default="vendor/mathjax/tex-svg.js")
    p.add_argument("--sha256", dest="expected", help="optional expected SHA-256")
    p.add_argument("--force", action="store_true")
    args = p.parse_args()

    out = Path(args.output)
    if out.exists() and not args.force:
        print(f"exists: {out} ({sha256(out)})")
        return 0

    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".part")
    print(f"downloading {args.url}")
    try:
        with urllib.request.urlopen(args.url, timeout=60) as response, tmp.open("wb") as f:
            while True:
                block = response.read(1024 * 1024)
                if not block:
                    break
                f.write(block)
    except Exception as exc:
        tmp.unlink(missing_ok=True)
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    digest = sha256(tmp)
    if args.expected and digest.lower() != args.expected.lower():
        tmp.unlink(missing_ok=True)
        print(f"ERROR: SHA-256 mismatch: {digest}", file=sys.stderr)
        return 2

    tmp.replace(out)
    print(f"wrote {out} ({out.stat().st_size:,} bytes; sha256={digest})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
