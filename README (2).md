# Ultimate Math Worksheet Builder

**A single-file math practice system for the full 18-course NVCC mathematics catalog represented by the project.**

One HTML file. No accounts, no server, no installation. It generates worksheets and interactive quizzes from **424 deterministic problem generators across 81 units**, diagnoses *why* you got questions wrong (not just *that* you did), and can close the loop with an AI tutor using **your own** API key — while the app itself does all the math, so the AI can never hallucinate an answer.

**v7.1 release app:** `Math_Worksheet_Builder_v7_1_0_FULL_CATALOG.html`  
**Offline edition:** `Math_Worksheet_Builder_v7_1_0_FULL_CATALOG_OFFLINE.html`

## What's new in v7.1 — Floating Math Scratchpad

v7.1 adds a built-in **floating scratchpad** for working problems directly beside the worksheet or quiz.

Tap **✏ Scratch Pad** and the pad stays available while you scroll through the app. It is one app-wide workspace rather than a separate pad for every problem, so you can move it out of the way, keep working, minimize it, and reopen it without cluttering the question layout.

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

The scratchpad is intentionally just **digital scrap paper**. It does **not** solve equations, recognize handwriting, call AI, reveal answers, or affect grading. Scratch work stays separate from quiz answers and result data. It is also hidden when you print or save a worksheet as PDF.

On phones and tablets, the pad automatically stays inside the available screen area and the launcher sits above the mobile **Generate** button so the two controls do not overlap.

---

## Quick start — Student

1. Open the app (or your teacher's assignment link).
2. Tap **Student** at the top, then **Quick Quiz (5)**.
3. Open **✏ Scratch Pad** whenever you want room to work the problem by hand. Your scratch work stays available while you scroll.
4. Answer the quiz. Wrong answers show a 💡 hint explaining the *specific mistake* you likely made and unlock the full worked solution.
5. When you finish, use the buttons under your score:
   - **Review missed questions** — hides what you got right and shows solutions for what you missed
   - **Retake this quiz** — the exact same questions
   - **Try similar questions** — a fresh quiz built from the units you missed
   - **Ask AI tutor** — one-tap diagnosis + custom drill (requires your own API key)
   - **Submit results** — sends results to your teacher's or study group's storage, when configured

On a phone: open the link, browser menu → **Add to Home Screen**, and it behaves much like an app. The scratchpad works with touch, so you can do the problem directly on the same device.

## Quick start — Teacher

1. Open the app in **Teacher** mode (the default).
2. Pick a course mode, set per-unit question counts (or use a preset), type a **seed** such as `MTH263-Quiz3`, and click **Generate**.
3. Same seed + same settings + same app version regenerates the same worksheet.
4. Print it, or turn on **Quiz Mode** and use **Copy share link** to send the exact assignment to students.
5. Students can use the scratchpad without changing the assignment, answer key, grading, seed, or result data.
6. Collect results through your own storage URL or exported JSON files, then use the class dashboard or AI analysis tools if desired.

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

Every question comes from a **seeded generator**: same seed + same settings + same app version = the same worksheet. Different seed = fresh numbers, same skills. Coverage tracks the VCCS/NVCC course outlines represented by the project.

### Seeds (the most important concept)

The seed box controls reproducibility. Conventions that work well:

- `MTH263-Quiz3` — a class assignment
- `MTH263-Quiz3-MakeupB` — different numbers, same skill mix
- `Jordan-SignDrill-2` — a personal drill

⚠️ **Seeds are version-locked.** Archive the HTML file alongside any assessment you may need to reproduce later. The v7.1 scratchpad does not participate in question generation, but the versioned filename is still the release boundary for reproducibility.

### Worksheets vs. Quiz Mode

- **Worksheet mode**: printable pages. Toggle **Answer Key** and **Worked Solutions** to append them. **Print / Save PDF** uses print-optimized styling. The floating scratchpad is intentionally excluded from print output.
- **Quiz Mode**: interactive multiple choice. Distractors often encode *specific real mistakes* such as sign errors, forgotten chain rule, or domain/range confusion. That labeled mistake powers hints, analytics, and optional AI diagnosis.

### Floating Scratchpad

The scratchpad is designed for the part of math practice that normally happens on notebook paper.

**Everyday controls** stay visible: Pen, Eraser, Line, Undo, Redo, quick colors, Paper, and Clear. Less-frequent controls such as thickness, exact paper style, workspace size, Save PNG, and page management stay out of the way until needed.

It is a **fixed floating panel**, so scrolling the worksheet does not scroll the scratchpad off screen. On desktop it can be moved and resized. On smaller screens it uses bounded responsive sizing so even the Large workspace cannot extend beyond the usable viewport.

Scratchpad state is independent from EquationWright's math engine:

- It does not modify generated problems.
- It does not modify seeds or blueprints.
- It does not submit scratch work with quiz results.
- It does not influence answer checking or scores.
- It does not contain a calculator, CAS, solver, handwriting recognizer, or AI tutor.

That separation is deliberate: the app presents and grades the mathematics; the scratchpad simply gives the learner a place to *do* the mathematics.

### Presets

**Quick Quiz (5)** · **Homework Practice (15)** · **Unit Review (20)** · **Teacher Copy** · **Student Copy**. Each distributes the total across the current mode's units and generates immediately.

### Topics filter

Each unit card has a **Topics** button. Uncheck subtopics to exclude them. Topic selections travel inside blueprints and share links.

### Blueprints

A **blueprint** is a small JSON recipe containing seed + mode + counts + topics + toggles.

- **Export / Import Blueprint** — file-based save/load
- **Saved blueprints** — named browser-local library
- **Copy share link** — embeds the recipe in the URL and regenerates the assignment from the seed

Scratchpad drawings are deliberately **not** included in blueprints or share links.

### Teacher / Student mode

**Student** mode forces quiz-on/keys-off, hides teacher tooling, shows a focus banner, and persists. It is a *focus* mode, **not** exam security — answers exist in the page source. EquationWright is built for practice, homework, review, and learning, not proctored testing.

### Results

After answering quiz questions:

- **Export results (CSV)** — spreadsheet-readable log
- **Export results (JSON)** — machine-readable `mw-quiz-results-v1` containing per-question topic, generator, selected/correct answers, and labeled mistake patterns where available

Scratchpad marks are not included in either format.

### AI tutor (bring your own key)

The optional tutor analyzes **results and labeled mistakes**, not scratchpad handwriting. The app continues to generate and grade all mathematics itself.

Supported paths include Anthropic, Google/Gemini, OpenRouter, OpenAI-compatible local endpoints, and local llama.cpp-style servers. Use a spend-capped throwaway API key when connecting to a hosted provider.

Design guarantees:

1. **The AI never does the assessed math.** The app generates and grades.
2. **The AI cannot rewire the app.** Returned drills are validated against allowed unit IDs and safe settings.
3. **Privacy remains user-controlled.** Results go directly from the browser to the provider you selected; the EquationWright project has no central results server.
4. **The scratchpad does not send handwriting to AI.** It remains a separate local workspace.

### Class tools

Teacher mode can attach Class ID, Assignment ID, and a teacher-owned Results submit URL to share links. Students can submit under aliases, import/export JSON, and teachers can aggregate results into the built-in class dashboard.

Keep student data minimal: aliases rather than real names, emails, or IDs. This is homework-trust collection, not secure assessment infrastructure.

### Offline edition

There are still **two editions of the same app**:

- `Math_Worksheet_Builder_v7_1_0_FULL_CATALOG.html` — normal web/hosted build, approximately **0.8 MB**, with MathJax loaded externally when needed
- `Math_Worksheet_Builder_v7_1_0_FULL_CATALOG_OFFLINE.html` — approximately **2.9 MB**, with the math engine embedded in the HTML

Both editions contain the same 424 problem generators and the same v7.1 scratchpad. The scratchpad itself has no external dependencies, so it works normally in the offline build.

`make_offline_build.py` remains the release path for embedding MathJax into future master HTML versions.

### Self-test and verification

v7.1 does **not** add or modify a math generator. Its math catalog is inherited from the v7.0 full-catalog release: **81 units and 424 generators**.

The v7.0 baseline completed **10,600 deterministic structural runs with zero failures** and the independent course-audit suite covered **10,752 verified records with zero mathematical mismatches**, including the MTH 288 and MTH 289 audit corpora.

Because v7.1 is a UI feature release, the new release work focuses on preserving that catalog while adding the scratchpad without changing generator logic, seed logic, grading, or result formats. Browser/device acceptance remains important: test the regular and offline editions, scrolling, phone layout, touch/stylus drawing, print/PDF output, and normal quiz generation.

---

## Tips

- **Use the scratchpad instead of copying the problem to paper.** On a tablet or phone, keep the question visible and work directly beside it.
- **For graphs or calculus sketches**, switch Paper to Graph or Coordinate mode and use the Line tool when useful.
- **For longer work**, use multiple scratch pages rather than clearing a page you may want to revisit.
- **Makeup exams**: same counts + topics, new seed suffix (`-MakeupB`). Same skills, different numbers.
- **MIX mode defaults to a very large worksheet.** Use a preset first unless you really want a huge review packet.
- **Struggling with a topic?** Take a quiz, miss honestly, then use **Try similar questions** to rebuild practice from exactly your misses.
- **Phone use**: the interface and scratchpad are responsive; long equations scroll inside their containers rather than widening the page.
- **Keep old versions.** Versioned files are permanent archives. That makes old assignments reproducible against the release they were created with.

## Troubleshooting

- **Scratchpad covers something I need** → drag it to another part of the screen, minimize it, or choose a smaller Workspace size. On phones, use Auto sizing.
- **I cleared the scratchpad accidentally** → Clear is undoable; use **Undo** immediately.
- **I want the scratch work in my printed worksheet** → scratch work is intentionally excluded from print/PDF. Use **Save PNG** first if you want a separate copy.
- **A share link does nothing** → make sure you are opening it with the matching/current app version.
- **Submit fails from a local file** → browser security may restrict local pages from calling network addresses; use the hosted build or export results JSON.
- **AI tutor error** → check the provider, API key, model ID, and endpoint. Model IDs rotate over time.
- **Math renders as raw `\\frac{...}`** → the normal edition may need internet for MathJax on first load; use the offline edition when no connection is available.

## Data formats (for AI/tool builders)

- `UMWB_BLUEPRINT` — quiz/worksheet recipe (seed, mode, counts, topics, toggles)
- `mw-quiz-results-v1` — one student's attempt with labeled mistakes
- `mw-class-results-v1` — aggregated class/group summary
- `SKILL.md` — tutor protocol for reading results, diagnosing patterns, and emitting valid practice blueprints

Scratchpad content is intentionally outside these formats.

---

*Copyright © 2026 Steveon William Walker. The app does all math; the AI never does. The scratchpad gives you room to do the work yourself. Built for practice, not proctoring. Use aliases, own your storage, bring your own key.*
