#!/usr/bin/env python3
from pathlib import Path
import json, re, subprocess, sys

ROOT=Path(__file__).resolve().parent
APP=ROOT/"Math_Worksheet_Builder_v6_17_0_MTH288.html"

def run(cmd, timeout=300):
    print("+", " ".join(map(str,cmd)))
    p=subprocess.run(cmd,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
    print(p.stdout)
    if p.returncode:
        raise SystemExit(p.returncode)

text=APP.read_text(encoding="utf-8")
scripts=re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>",text,re.S|re.I)
main=max(scripts,key=len)
temp=ROOT/"_mth288_main_check.js"
temp.write_text(main,encoding="utf-8")
try:
    run(["node","--check",temp.name])
finally:
    temp.unlink(missing_ok=True)

run(["node","mth288_full_structural_audit.js"])
run(["node","mth288_full_quiz_audit.js"])
run(["node","export_dm288_full_corpus.js"])
run([sys.executable,"dm288_audit.py"])
print("MTH 288 release checks: PASS")
