#!/usr/bin/env python3
"""Rebuild the offline HTML and optionally the Go gateway from a repository root."""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], cwd: Path) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--root", default=".")
    p.add_argument("--app", default="Math_Worksheet_Builder_v7_0_0_FULL_CATALOG.html")
    p.add_argument("--skip-gateway", action="store_true")
    args = p.parse_args()

    root = Path(args.root).resolve()
    app = root / args.app
    mathjax = root / "vendor/mathjax/tex-svg.js"
    builder = root / "make_offline_build.py"
    chat_source = root / "chat/LocalChat.html"
    chat_embed = root / "gateway/localchat.html"

    for needed in (app, mathjax, builder):
        if not needed.exists():
            print(f"ERROR: missing {needed}", file=sys.stderr)
            return 2

    run([sys.executable, str(builder), str(app), str(mathjax)], root)

    if chat_source.exists():
        chat_embed.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(chat_source, chat_embed)
        print(f"synced {chat_source.relative_to(root)} -> {chat_embed.relative_to(root)}")

    if not args.skip_gateway:
        go = shutil.which("go")
        if not go:
            print("WARN: Go not found; skipped gateway build")
        else:
            run([go, "build", "-o", "tutor-gateway.exe", "."], root / "gateway")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
