/*
Load this script after Math_Worksheet_Builder_v6_10_0.html, then run:
  await MWExportAuditCorpora(6)
It downloads the eight deterministic audit-corpus JSON files.
*/
(function () {
  "use strict";

  const groups = {
    "audit_corpus.json": ["CA", "TRIG", "PC", "C1", "C2", "C3"],
    "ac_corpus.json": ["AC1", "AC2"],
    "de_corpus.json": ["DE_Basics", "DE_Methods", "DE_AppsNum"],
    "de2_corpus.json": ["DE_SecondOrder", "DE_Laplace"],
    "la_corpus.json": ["LA_Systems", "LA_RowRed", "LA_SolutionSets"],
    "la2_corpus.json": ["LA_MatrixAlg", "LA_Eigen"],
    "qr_corpus.json": ["QR"],
    "st2_corpus.json": ["ST2"]
  };

  function buildCorpus(selectors, samples) {
    const selected = new Set();
    for (const unit of UNITS) {
      if (selectors.includes(unit.course) || selectors.includes(unit.id)) selected.add(unit.id);
    }
    const rows = [];
    for (const unitId of selected) {
      const gens = Gens[unitId] || [];
      for (let genIndex = 0; genIndex < gens.length; genIndex++) {
        for (let sample = 0; sample < samples; sample++) {
          const seed = fnv1a(`AUDIT|${unitId}|${genIndex}|${sample}`) >>> 0;
          const problem = gens[genIndex](xorshift32(seed));
          rows.push({
            unitId, genIndex, sample, seed,
            key: String(problem.key || ""),
            q: String(problem.q || ""),
            a: String(problem.a || ""),
            steps: Array.isArray(problem.steps) ? problem.steps : [],
            traps: Array.isArray(problem.traps) ? problem.traps : [],
            vec: Array.isArray(problem.vec) ? problem.vec : []
          });
        }
      }
    }
    return rows;
  }

  function download(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.MWExportAuditCorpora = async function (samples = 6) {
    if (typeof UNITS === "undefined" || typeof Gens === "undefined") {
      throw new Error("Load this script after the worksheet-builder application.");
    }
    samples = Math.max(1, Math.min(200, Number(samples) || 6));
    const summary = {};
    for (const [filename, selectors] of Object.entries(groups)) {
      const rows = buildCorpus(selectors, samples);
      summary[filename] = rows.length;
      download(filename, rows);
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    console.table(summary);
    return summary;
  };
})();
