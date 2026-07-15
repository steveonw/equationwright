#!/usr/bin/env python3
"""Generate deterministic audit corpora by running the browser generators.

Requires Playwright (`pip install -r requirements-dev.txt` and, when needed,
`playwright install chromium`). The script serves the repository over a
loopback HTTP server, opens the worksheet app, invokes each registered
generator with fixed seeds, and writes the nine browser-generated corpus JSON files.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import os
import socketserver
import threading
from pathlib import Path

GROUPS = {
    "audit_corpus.json": ["CA", "TRIG", "PC", "C1", "C2", "C3"],
    "ac_corpus.json": ["AC1", "AC2"],
    "de_corpus.json": ["DE_Basics", "DE_Methods", "DE_AppsNum"],
    "de2_corpus.json": ["DE_SecondOrder", "DE_Laplace"],
    "la_corpus.json": ["LA_Systems", "LA_RowRed", "LA_SolutionSets"],
    "la2_corpus.json": ["LA_MatrixAlg", "LA_Eigen"],
    "qr_corpus.json": ["QR"],
    "st2_corpus.json": ["ST2"],
    "de3_corpus.json": ["D289"],
}

JS = r"""
({selectors, samples}) => {
  const selected = new Set();
  for (const u of UNITS) {
    if (selectors.includes(u.course) || selectors.includes(u.id)) selected.add(u.id);
  }
  const rows = [];
  for (const unitId of selected) {
    const gens = Gens[unitId] || [];
    for (let gi = 0; gi < gens.length; gi++) {
      for (let sample = 0; sample < samples; sample++) {
        const seed = (fnv1a('AUDIT|' + unitId + '|' + gi + '|' + sample)) >>> 0;
        const problem = gens[gi](xorshift32(seed));
        rows.push({
          unitId,
          genIndex: gi,
          sample,
          seed,
          key: String(problem.key || ''),
          q: (typeof fixTexEscapes==='function' ? fixTexEscapes(String(problem.q || '')) : String(problem.q || '')),
          a: (typeof fixTexEscapes==='function' ? fixTexEscapes(String(problem.a || '')) : String(problem.a || '')),
          steps: Array.isArray(problem.steps) ? problem.steps : [],
          traps: Array.isArray(problem.traps) ? problem.traps : [],
          vec: Array.isArray(problem.vec) ? problem.vec : [],
          auditSpec: problem.auditSpec || undefined,
          answerSpec: problem.answerSpec || undefined,
          deSpec: problem.deSpec || undefined
        });
      }
    }
  }
  return rows;
}
"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--root", default=".")
    p.add_argument("--app", default="Math_Worksheet_Builder_v7_0_0_FULL_CATALOG.html")
    p.add_argument("--samples", type=int, default=6)
    p.add_argument("--browser", help="optional Chromium/Chrome executable")
    args = p.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit("Playwright is required: pip install -r requirements-dev.txt")

    root = Path(args.root).resolve()
    app = root / args.app
    if not app.exists():
        raise SystemExit(f"missing app: {app}")

    handler = functools.partial(QuietHandler, directory=str(root))
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{server.server_address[1]}/{app.name}"
        with sync_playwright() as pw:
            launch = {"headless": True}
            if args.browser:
                launch["executable_path"] = args.browser
            browser = pw.chromium.launch(**launch)
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=120_000)
            page.wait_for_function("typeof Gens !== 'undefined' && typeof UNITS !== 'undefined'")
            for filename, selectors in GROUPS.items():
                group_samples = 20 if filename == "de3_corpus.json" else args.samples
                rows = page.evaluate(JS, {"selectors": selectors, "samples": group_samples})
                (root / filename).write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
                print(f"wrote {filename}: {len(rows)} rows")
            browser.close()
        server.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
