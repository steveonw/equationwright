# Ultimate Math Worksheet Builder

**A single-file math practice system for the full 18-course NVCC mathematics catalog represented by the project.**

One HTML file. No accounts, no server, no installation. It generates worksheets and interactive quizzes from **424 deterministic problem generators across 81 units**, diagnoses *why* you got questions wrong, and provides worked solutions and exportable results for classroom use.

**v7.1 release app:** `Math_Worksheet_Builder_v7_1_0_FULL_CATALOG.html`  
**Offline edition:** `Math_Worksheet_Builder_v7_1_0_FULL_CATALOG_OFFLINE.html`

---

## What's new in v7.1 — Floating Math Scratchpad

v7.1 adds a built-in **floating scratchpad** for working problems directly beside the worksheet or quiz.

Tap **✏ Scratch Pad** and the pad stays available while you scroll through the app. It is one app-wide workspace rather than a separate pad for every problem, so you can move it out of the way, resize or pop it out on larger screens, and keep multiple pages of scratch work.

The scratchpad includes:

- **Pen, eraser, and straight-line tools**
- **Undo / redo**
- **Four quick ink colors**
- **Adjustable pen thickness**
- **Plain, graph, coordinate, and dot paper**
- **Clear page** with undo protection
- **Multiple scratch pages** (up to five)
- **Responsive workspace sizes**: Auto, Small, Medium, and Large
- **Save as PNG** for keeping your work
- **Pop-out mode** on larger screens
- **Mouse, touch, and stylus support**
- **Keyboard shortcuts** on desktop

The scratchpad is intentionally just **digital scrap paper**. It does **not** solve equations, recognize handwriting, call AI, reveal answers, or affect grading. Scratch work stays separate from questions, seeds, and results.

---

## Quick start — Student

1. Open the app (link above, or ask your teacher for an assignment link).
2. Tap **Student** at the top. Tap **Quick Quiz (5)**.
3. Open **✏ Scratch Pad** whenever you want room to work the problem by hand. Your scratch work stays available while you scroll.
4. Answer. Wrong answers show a 💡 hint explaining the *specific mistake* you likely made, and unlock the full worked solution.
5. When you finish, use the buttons under your score:
   - **Review missed questions** — hides what you got right, shows solutions for what you missed
   - **Retake this quiz** — the exact same questions (same seed = same quiz)
   - **Try similar questions** — a fresh quiz built only from the units you missed
   - **Ask AI tutor** — one-tap diagnosis + a custom drill (needs an API key, see below)
   - **Submit results** — sends your results to your teacher's or study group's storage

On a phone: open the link, browser menu → **Add to Home Screen**, and it behaves like an app.

## Quick start — Teacher

1. Open the app in **Teacher** mode (the default).
2. Pick a course mode, set per-unit question counts (or hit a preset), type a **seed** (e.g. `MTH263-Quiz3`), click **Generate**.
3. **Same seed always regenerates the same worksheet** — that's the core trick. Print it, or:
4. Turn on **Quiz Mode** and click **Copy share link**. Anyone opening that link gets that exact quiz on their device. Paste it into Canvas, email, or a group chat.
5. Collect results: students click **Submit results** (see *Class tools* below), or they export JSON files and send them to you. Import either way, get a class dashboard, and export or AI-analyze the aggregated data.

---

## The manual

### Modes and generators

| Mode | Course | Units |
|---|---|---|
| HP | MTH 133 Math for Health Professions | 3 units |
| QR | MTH 154 Quantitative Reasoning | 4 units |
| S155 | MTH 155 Statistical Reasoning | 4 units |
| CA | MTH 161 Precalculus I | 7 units |
| TRIG | MTH 162 Precalculus II: Trigonometry | 6 units + cross-listed Conics |
| PC | MTH 167 Precalculus with Trig | 16 units (CA + TRIG + PC) |
| AC1 | MTH 261 Applied Calculus I | 3 units |
| AC2 | MTH 262 Applied Calculus II | 2 units |
| C1 | MTH 263 Calculus I | 5 units |
| C2 | MTH 264 Calculus II | 5 units |
| C3 | MTH 265 Calculus III | 4 units |
| LA | MTH 266 Linear Algebra | 5 units |
| DE | MTH 267 Differential Equations | 5 units |
| S245 | MTH 245 Statistics I | 4 units |
| ST2 | MTH 246 Statistics II | 4 units |
| P283 | MTH 283 Probability & Statistics | 4 units |
| DM | MTH 288 Discrete Mathematics | 6 units |
| D289 | MTH 289 Differential Equations of Mathematical Physics | 7 units |
| MIX | All courses | all 81 units |

Every question comes from a **seeded generator**: same seed + same settings + same app version = byte-identical worksheet. Different seed = fresh numbers, same skills. Coverage tracks the official NVCC/VCCS course outlines.

### Seeds (the most important concept)

The seed box controls everything. Conventions that work well:

- `MTH263-Quiz3` — a class assignment (reproducible forever *on this app version*)
- `MTH263-Quiz3-MakeupB` — a makeup with different numbers, same skill mix
- `Jordan-SignDrill-2` — a personal drill (name–focus–number)

⚠️ **Seeds are version-locked.** The same seed produces the same questions only on the same app version (adding generators to the bank shifts the selection). The filename carries the version for reproducibility.

### Worksheets vs. Quiz Mode

- **Worksheet mode**: printable pages. Toggle **Answer Key** and **Worked Solutions** to append them. **Print / Save PDF** uses print-optimized styling.
- **Quiz Mode**: interactive multiple choice. Distractors aren't random — most encode *specific real mistakes* (sign errors, forgotten chain rule, domain-vs-range confusion), so a wrong click tells you something useful.

### Presets

**Quick Quiz (5)** · **Homework Practice (15)** (worksheet + solutions) · **Unit Review (20)** (worksheet + key) · **Teacher Copy** (key + solutions on) · **Student Copy** (both off).

### Topics filter

Each unit card has a **Topics** button — uncheck subtopics to exclude them. Topic selections travel inside blueprints and share links.

### Blueprints (save/load/share everything)

A **blueprint** is a small JSON file capturing seed + mode + counts + topics + toggles.

- **Export / Import Blueprint** — file-based save/load
- **Saved blueprints** — a named library stored in your browser
- **Copy share link** — the blueprint encoded into the URL (`#bp=...`). Opening the link recreates the quiz/worksheet; links also apply live if the app is already open. Share links deliberately avoid embedding scratchpad content.

### Teacher / Student mode

**Student** mode forces quiz-on/keys-off, hides all teacher tooling (LaTeX, blueprints, class settings, self-test), shows a banner, and persists. It is a *focus* mode, **not** security — answers remain in the page source and savable by a determined user.

### Results: the data your practice produces

After answering quiz questions:

- **Export results (CSV)** — human/spreadsheet-readable log
- **Export results (JSON)** — machine-readable `mw-quiz-results-v1`: per-question topic, generator, your answer, the correct answer, and — when you fell for a labeled trap — the **mistakeType** and label.

That JSON is the input to everything intelligent below. Paste it into any AI chatbot with the bundled tutor prompt (`SKILL.md`), or use the built-in tutor.

### AI tutor (bring your own key)

Open **AI tutor (bring your own key)** in the controls:

- **Provider**: Anthropic (Claude), Google (Gemini), and **OpenRouter** (one key, hundreds of models — including free ones — with built-in spend limits) are supported. Local llama.cpp-style servers are also usable.
- **API key**: use a **spend-capped, throwaway key** — never your main one. OpenRouter makes this easiest: you set a hard dollar limit when creating the key.
- **Model IDs rotate.** Providers retire models every few months; if you get *"HTTP 404: No endpoints found"*, your model name is stale — check your provider's current model list.
- Then after any quiz: **Ask AI tutor** → diagnosis appears in the page → **Start this drill** loads the AI's prescribed practice quiz.

Design guarantees, enforced in code:

1. **The AI never does math.** It reads your labeled mistakes and prescribes; the app generates and grades.
2. **The AI cannot rewire the app.** Any blueprint it returns passes a whitelist: invented unit IDs are dropped, answer pages are forced off, submit URLs are stripped, and counts are clamped.
3. **Costs almost nothing — measured, not estimated.** In live testing, a full student diagnosis plus a full class analysis on Gemini Flash (via OpenRouter) registered **$0.00 of a $1.00 key** in our test runs.
4. **Privacy**: analysis sends your quiz results (aliases only) directly from your browser to *your chosen* provider. This app has no server and never sees your key or data.

### Class tools (collection & federation)

Open **Class tools** in Teacher mode:

- **Class ID / Assignment ID / Results submit URL** — these travel inside share links. Students who open your link get a working **Submit results** button pointed at *your* storage.
- **Import class results (JSON files)** — drag in student exports, or re-open a saved **class summary** for a read-only dashboard (works fully offline)
- **Load results from URL** — pull everything from your storage node in one click
- **Student-lock PIN**: *Copy locked student link* opens in Student mode and requires your PIN to switch to Teacher — deters casual answer-peeking (not exam security)
- The **dashboard** shows count, average, misses by unit/topic, top mistake patterns, and flags blank answers per student.

**The trust model — two URLs, two powers.** The *submit* (write) URL travels with assignments; holding it only lets you deposit results. The *read* URL you give only to whoever should see the read-only dashboard.

**Privacy rules (please keep them):** students submit under an **alias** (`Student-17`, `Pi-Ana`) — never real names, emails, or IDs. The storage belongs to the teacher or the group, never to the app project.

### Your own storage node in 10 minutes (Google Apps Script)

1. Create a Google Sheet → **Extensions → Apps Script**, paste:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const b = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), b.classId||'', b.assignmentId||'', b.studentAlias||'',
                   b.seed||'', b.mode||'', b.score||0, b.total||0, JSON.stringify(b)]);
  return ContentService.createTextOutput(JSON.stringify({ok:true}))
         .setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  const rows = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getValues();
  const results = rows.map(r => { try { return JSON.parse(r[8]); } catch(_) { return null; } })
                      .filter(x => x && x.format === 'mw-quiz-results-v1');
  return ContentService.createTextOutput(JSON.stringify({results}))
         .setMimeType(ContentService.MimeType.JSON);
}
```

2. **Deploy → New deployment → Web app** → execute as *Me*, access *Anyone with the link*.
3. The deployment URL is both your **submit URL** (paste into Class tools) and your **read URL** (paste into *Load results from URL*). Delete the deployment to revoke everything.

---

## Self-test (for the curious / contributors)

The **Self-test** panel fuzzes every generator. v7.0 structural self-test completed **10,600 deterministic runs with zero failures**. v7.0 independent course audits covered **10,752 verified records with zero mismatches**. v7.1 is a UI-only release (scratchpad) and does not change generators.

---

## Tips

- **Makeup exams**: same counts + topics, new seed suffix (`-MakeupB`). Same skills, different numbers, zero effort.
- **MIX mode defaults to a very large worksheet.** Hit a preset first unless you enjoy 40-page printouts.
- **Struggling with a topic?** Take a quiz, miss honestly, then *Try similar questions* — it rebuilds practice from exactly your misses. With an API key, *Ask AI tutor* is smarter still.
- **Phone use**: the interface is fully responsive; long equations scroll inside their container rather than widening the page.
- **Two editions, one app**: the regular file (~0.8 MB) loads its math engine from a CDN — right choice for the hosted site. The **OFFLINE edition** (~2.9 MB, `..._OFFLINE.html`) has the engine embedded for fully offline use.
- **Keep old versions.** Each release keeps its version in the filename. Old links keep working against old files forever — that's a feature.

## Troubleshooting

- **A share link "does nothing"** → you're on an old app build; reload the page with the link in the address bar, or use the current version's URL.
- **Submit fails from a local file** → use the hosted link; browsers restrict local pages from calling local network addresses. Or just *Export results (JSON)* and send the file.
- **AI tutor error** → check the key, check the provider (OpenAI's API blocks direct browser calls — use Anthropic, Gemini, OpenRouter, a local model, or a proxy).
- **Math renders as raw `\\frac{...}`** → first load needs internet for MathJax; reload once connected or use the offline build.

## What's been verified (and what hasn't)

The v7.x releases contain **81 units and 424 generators**. The v7.0 baseline completed **10,600 deterministic runs with zero failures**. Independent course audits covered **10,752 verified records with zero mismatches**.

v7.1 is a UI feature release (floating scratchpad) and does **not** add or change generators, seed logic, grading, or result formats. Keep v7.1 and older files alongside any assessment you may need to reproduce later — seeds are version-locked.

## Data formats (for AI/tool builders)

- `UMWB_BLUEPRINT` — quiz/worksheet recipe (seed, mode, counts, topics, toggles)
- `mw-quiz-results-v1` — one student's attempt with labeled mistakes
- `mw-class-results-v1` — aggregated class/group summary
- `SKILL.md` — the tutor protocol: teaches any LLM to read results, diagnose patterns, and emit valid blueprints.

---

*Copyright © 2026 Steveon William Walker. The app does all math; the AI never does. Built for practice, not proctoring. Use aliases, own your storage, bring your own key.*
