#!/usr/bin/env python3
"""
make_offline_build.py — produce the OFFLINE edition of the Math Worksheet Builder.

Takes the regular app HTML (which loads MathJax from a CDN with local fallbacks)
and embeds MathJax's self-contained SVG engine directly inside the file. The
result is ONE html file that renders math with no internet, no folders, no
loader logic — forever.

Usage:
    python make_offline_build.py Math_Worksheet_Builder_vX_Y_Z.html
    (expects tex-svg.js next to this script, or pass its path as arg 2)

Get tex-svg.js once from:
    https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js
"""
import sys, os, re

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    app_path = sys.argv[1]
    mj_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__) or ".", "tex-svg.js")

    src = open(app_path, encoding="utf-8").read()
    lib = open(mj_path, encoding="utf-8").read()

    # inline-safety: a </script> inside the JS would end our tag early
    lib = lib.replace("</script>", "<\\/script>")

    # find the loader <script> block (marked by its comment) and replace it wholesale
    m = re.search(r"<script>\s*/\* Math engine loader.*?</script>", src, re.S)
    if not m:
        # fall back: a plain CDN tag (older versions)
        m = re.search(r'<script[^>]*src="https://cdn\.jsdelivr\.net/npm/mathjax[^"]*"[^>]*>\s*</script>', src)
    if not m:
        print("ERROR: couldn't find the MathJax loader/tag in", app_path); sys.exit(2)

    embedded = ("<script>\n/* MathJax (tex-svg) EMBEDDED for the offline edition — "
                "no network, no folders, no loader. */\n" + lib + "\n</script>")
    out = src[:m.start()] + embedded + src[m.end():]

    # label the build (same generators + seeds as the regular edition -> same quizzes)
    out = out.replace("appVersion: 'v", "appVersion: 'OFFLINE_v", 1)

    dest = re.sub(r"\.html$", "_OFFLINE.html", app_path)
    open(dest, "w", encoding="utf-8").write(out)
    print(f"wrote {dest}  ({len(out):,} bytes; regular was {len(src):,})")

if __name__ == "__main__":
    main()
