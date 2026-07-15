#!/usr/bin/env python3
"""Independent SciPy audit for mw_stats_engine_v1.js.

Requirements:
    python -m pip install scipy numpy
    Node.js available as `node`

Run:
    python audit_mw_stats_engine.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import stats


ENGINE = Path(__file__).with_name("mw_stats_engine_v1.js")

NODE_DRIVER = r'''
const engine = require(process.argv[1]);

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const payload = JSON.parse(input);

  const tValues = [];
  for(const item of payload.tRequests){
    tValues.push(engine.mwTCrit(
      item.df === "inf" ? Infinity : item.df,
      item.alpha
    ));
  }

  process.stdout.write(JSON.stringify({
    cdf: payload.zValues.map(engine.mwNormCdf),
    inv: payload.pValues.map(engine.mwInvNorm),
    tValues,
    smoke: engine.mwRunStatsSmokeTests()
  }));
});
'''


def main() -> int:
    if not ENGINE.exists():
        print(f"ERROR: engine not found: {ENGINE}")
        return 2

    z_values = np.linspace(-8.0, 8.0, 1001)
    p_values = np.linspace(0.001, 0.999, 999)

    dfs = list(range(1, 31)) + [40, 60]
    alphas = [0.10, 0.05, 0.025, 0.01, 0.005]

    t_requests = [
        {"df": df, "alpha": alpha}
        for df in dfs
        for alpha in alphas
    ]
    t_requests += [
        {"df": "inf", "alpha": alpha}
        for alpha in alphas
    ]

    payload = {
        "zValues": z_values.tolist(),
        "pValues": p_values.tolist(),
        "tRequests": t_requests,
    }

    try:
        proc = subprocess.run(
            ["node", "-e", NODE_DRIVER, str(ENGINE)],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            check=False,
        )
    except FileNotFoundError:
        print("ERROR: Node.js was not found.")
        return 2

    if proc.returncode != 0:
        print("ERROR: Node audit driver failed.")
        print(proc.stderr)
        return 2

    result = json.loads(proc.stdout)

    js_cdf = np.asarray(result["cdf"], dtype=float)
    scipy_cdf = stats.norm.cdf(z_values)
    cdf_error = float(np.max(np.abs(js_cdf - scipy_cdf)))

    js_inv = np.asarray(result["inv"], dtype=float)
    scipy_inv = stats.norm.ppf(p_values)
    inv_error = float(np.max(np.abs(js_inv - scipy_inv)))

    table_failures = []
    for request, actual in zip(t_requests, result["tValues"]):
        if request["df"] == "inf":
            expected = round(float(stats.norm.ppf(1 - request["alpha"])), 3)
        else:
            expected = round(
                float(stats.t.ppf(1 - request["alpha"], request["df"])),
                3,
            )

        if abs(float(actual) - expected) > 0.0005:
            table_failures.append((request, actual, expected))

    checks = [
        ("Normal CDF max error <= 1e-6", cdf_error <= 1e-6, cdf_error),
        ("Inverse normal max error <= 1e-4 on p=[.001,.999]",
         inv_error <= 1e-4, inv_error),
        ("Every t-table cell matches to 3 decimals",
         not table_failures, len(table_failures)),
        ("Built-in smoke tests pass",
         result["smoke"]["failed"] == 0, result["smoke"]),
    ]

    failed = False
    for name, passed, detail in checks:
        print(("PASS" if passed else "FAIL") + f": {name}")
        print(f"      {detail}")
        failed = failed or not passed

    if table_failures:
        print("\nFirst t-table mismatches:")
        for failure in table_failures[:10]:
            print(" ", failure)

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
