#!/usr/bin/env python3
"""Build a deterministic release ZIP and refresh its SHA256 manifest."""
from __future__ import annotations

import argparse
import hashlib
import os
import zipfile
from pathlib import Path

FIXED_ZIP_TIME = (2026, 9, 13, 0, 0, 0)
CHECKSUM_NAME = "SHA256SUMS.txt"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("release_dir", type=Path)
    parser.add_argument("--package-name", default="EquationWright_v7_3_FINAL_APPROVED.zip")
    args = parser.parse_args()

    release_dir = args.release_dir.resolve()
    package = release_dir / args.package_name
    if not release_dir.is_dir():
        raise SystemExit(f"release directory not found: {release_dir}")

    payload_files = sorted(
        p for p in release_dir.rglob("*")
        if p.is_file() and p.name not in {args.package_name, CHECKSUM_NAME}
    )

    checksum_lines = []
    for path in payload_files:
        rel = path.relative_to(release_dir).as_posix()
        checksum_lines.append(f"{sha256(path)}  {rel}")
    checksum_path = release_dir / CHECKSUM_NAME
    checksum_path.write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")

    files_for_zip = sorted(
        p for p in release_dir.rglob("*")
        if p.is_file() and p.name != args.package_name
    )

    root_name = Path(args.package_name).stem
    temp_package = package.with_name(package.name + ".tmp")
    if temp_package.exists():
        temp_package.unlink()

    with zipfile.ZipFile(temp_package, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in files_for_zip:
            rel = path.relative_to(release_dir).as_posix()
            info = zipfile.ZipInfo(f"{root_name}/{rel}", date_time=FIXED_ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            zf.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

    os.replace(temp_package, package)

    # Verify every checksum against the packaged bytes.
    with zipfile.ZipFile(package, "r") as zf:
        manifest = zf.read(f"{root_name}/{CHECKSUM_NAME}").decode("utf-8")
        for line in manifest.splitlines():
            if not line.strip():
                continue
            expected, rel = line.split("  ", 1)
            data = zf.read(f"{root_name}/{rel}")
            actual = hashlib.sha256(data).hexdigest()
            if actual != expected:
                raise SystemExit(f"checksum mismatch: {rel}")

    print(f"built {package} ({package.stat().st_size} bytes, {len(files_for_zip)} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
