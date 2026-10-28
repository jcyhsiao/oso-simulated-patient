# Simulated Patient Pipeline & Authoring Skill Handoff

Updated October 28, 2026. Instructor/developer context only: do not paste this handoff into a patient agent or give it to learners. Paths are relative to this project so the entire folder can be moved. This document consolidates earlier incremental notes and describes the current state.

> **Current direction (October 28, 2026):** The primary authoring workflow is the **Gemini Authoring Skill** ([`simulated-patient-experience.zip`](simulated-patient-experience.zip)). It uses the builder's own Gemini quota (in Gemini Skills or Google AI Studio) to ingest case materials, perform category mapping, dynamically synthesize learner scope, audit clinical gaps, and assemble a single instruction prompt strictly under the **48,000 maximum unit budget** for **Carmen AI Assistant**. The earlier zero-inference browser web builder (`web/`) was retired. The Python CLI pipeline (`pipeline/`, `scripts/`, `packages/`) is **legacy**: kept for reference and baseline regression tests (`npm test` runs all 65 Python unit tests).

---

## 1. Architectural Decisions (October 28, 2026)

### A. Transition from Web Form to Gemini Inference Skill
- **The Problem with Zero Inference:** The browser form builder acted as a rigid clipboard/assembler, putting 100% of the cognitive burden on faculty to manually slice clinical notes into buckets, reformat tables into Markdown, and manually prune text when over budget.
- **The Gemini Skill Advantage:** By wrapping a specialized Agent Skill (`SKILL.md`) around the builder's Gemini quota:
  - Gemini's 1M+ token context window ingests raw, messy case packets (multi-page Word docs, PDFs, clinic notes, and rubrics) without manual pre-splitting.
  - Gemini performs entity classification, OLD CARTS structuring, table formatting, and intelligent compression to stay under the 48,000 unit budget.
  - The runtime scaffolding ([`references/carmen-runtime.md`](authoring-skills/simulated-patient-experience/references/carmen-runtime.md)) is **locked and self-contained** in the skill, preventing the model drift and hallucinated negatives that occurred in early intermediate synthesis experiments.

### B. Functional Category Idiom (6 Categories)
Simulation materials map into 6 functional categories using prefixes or conversational triage:

| Category / Prefix | Functional Role & Content |
| :--- | :--- |
| `instructions-` | **Activity & learner context:** Target learner discipline(s), training level (single profession or interprofessional cohort), clinical setting, learning objectives, and activity structure. |
| `learner-` | **Pre-interaction briefing:** Door note, triage sheet, student handout, or baseline chart known to the learner *before* the encounter begins. |
| `patient-` | **Patient portrayal & progressive disclosure:** Demographics, chief concern, symptom attributes, domain-grouped interview responses (*"If asked about..."*), psychosocial/lifestyle history, and patient-held reports. |
| `facilitator-` | **Concealed clinical findings & records:** Scripted physical/clinical exam findings, vital signs (if held back), concealed laboratory panels, and imaging reports delivered only when requested or ordered. |
| `consultant-` *(optional)* | **Active simulated consultants:** Scripted findings or opinions from explicitly named colleagues whom the learner can consult during the encounter. *(Note: Learner professions listed in an IPE case or rubric are learner roles, NOT simulated consultants.)* |
| `feedback-` *(optional)* | **Post-encounter evaluation & reflection:** Qualitative grading checklists, competency frameworks (all domains preserved), profession-specific identification/recommendation targets, team care-plan challenges, and debrief reflection questions. |

### C. Dual-Path Intake & Category Information Confirmation
1. **Path A — Files Marked with Category Prefixes:** Acknowledges the prefix assignments (`learner-`, `patient-`, etc.), summarizes extracted facts per category, checks the Unlisted Symptom Policy, and compiles.
2. **Path B — Unmarked Files or Combined Documents / Pasted Text:** When files lack prefixes or combine multiple areas (e.g. Linda Johnson scenario + student handout), the skill extracts and presents a **Proposed Information Mapping by Category** preview showing the actual extracted information in each of the 6 buckets. It explicitly raises pedagogical overlap questions:
   > *"I notice clinical findings (vitals and oral exam observations) appear in the student handout. Should these be provided to the learner upfront in `learner-`, held back until requested in `facilitator-`, or included in both?"*

### D. Dynamic Markdown Tables & `(Not Provided)` Rule
- **GFM/CommonMark Paragraph Rule:** In CommonMark/GFM, a table *cannot* interrupt an open paragraph. Every table must be preceded by a markdown subheader (`### <Panel Name>`) and an **empty blank line** (`\n\n`).
- **Dynamic Columns (No Invented Ranges):** Columns are determined dynamically from what the source provides (e.g., `| Parameter | Value |` when no reference ranges exist, or `| Test | Result | Reference Range | Units | Interpretation |` for full laboratory panels).
- **No Hallucinated Data:** The model never invents reference ranges, units, or clinical interpretations. If a single cell is missing within an otherwise supplied column, it writes `(Not Provided)`.

### E. Complete Feedback & Competency Domain Extraction
- When faculty supply a competency framework (such as BuckIPE Competencies), rubric, or reflection guide, the skill preserves **all** competency domains (e.g., all 6 BuckIPE domains: VE, RR, CC, TT, EBP, CL) and discipline-specific reflection prompts without silently dropping domains.

### F. Single Export File for Carmen AI Assistant (< 48,000 Maximum Units)
- Step 4 in the skill compiles a single, continuous markdown block ready to copy and paste into Carmen AI Assistant instructions.
- Enforces strict `< 48,000` maximum units (`Math.max(utf16_length, crlf_length, utf8_bytes)`).
- Warns when approaching budget (`>= 45,000` units).
- If over budget, the model intelligently condenses narrative background and repetitive handout prose while strictly preserving all verbatim patient quotes, clinical findings, numerical values, dates, and medication details.

### G. Zero Hardcoding Verified
- [`SKILL.md`](authoring-skills/simulated-patient-experience/SKILL.md) and [`references/`](authoring-skills/simulated-patient-experience/references/) contain zero hardcoded case names, diagnoses, medications, body sites, or specific professions. Synthetic placeholders (`<Case Name>`, `<Discipline>`, `<Parameter>`) are used throughout.

---

## 2. Directory Structure & Key Artifacts

```
con-simulated-patient/
├── simulated-patient-experience.zip          # Uploadable skill archive for Gemini Skills
├── authoring-skills/
│   ├── simulated-patient-experience.zip      # Mirror of skill archive
│   └── simulated-patient-experience/
│       ├── SKILL.md                          # Self-contained authoring prompt (100% self-sufficient)
│       ├── references/
│       │   ├── carmen-runtime.md             # Locked runtime rules & unlisted policy variants
│       │   └── prompt-structure.md           # Output template & <48k budget specification
│       └── archive/                          # Legacy Oct 22 references (course-context, telehealth, etc.)
├── sample-shannon-files/                     # Archetype A: Focused Clinical / OSCE Case (10 prefixed files)
│   ├── learner-chart-snapshot.docx
│   ├── learner-door-intake-note.docx
│   ├── patient-sp-teaching-script.docx
│   ├── patient-radiology-report.docx
│   ├── patient-lab-interpretation.docx
│   ├── patient-left-foot-image.docx
│   ├── facilitator-lab-032025.docx
│   ├── facilitator-lab-report-faculty-copy.docx
│   ├── feedback-faculty-grading-sheet.docx
│   ├── feedback-npsca_instrument_rev041024.docx
│   └── instructions-activity-parameters.md
├── sample-linda-files/                       # Archetype B: Complex Interprofessional Care (Linda Johnson)
│   ├── Interprofessional-Simulated-Patient-Scenario-Linda-Johnson.md  # Unprefixed combined scenario
│   ├── learner-IPE-Simulation-Student-Handout-DENTHYG-3880.md          # Student handout
│   ├── DH 3880 Interprofessional Case for assignment development.docx
│   └── BuckIPE Competencies _ Office of Interprofessional Practice and Education.pdf
├── pipeline/                                 # Legacy Python reference pipeline
├── scripts/                                  # Legacy build and validation scripts
├── tests/                                    # 65 Python regression tests (npm test)
└── package.json                              # Project metadata ("test": "python3 -B -m unittest discover -s tests")
```

---

## 3. How to Test the Skill

1. **Upload to Gemini Skills:**
   - In your Gemini Skills interface, upload [`simulated-patient-experience.zip`](simulated-patient-experience.zip).
2. **Test Run 1 — Multi-File Focused Encounter (Shannon Anderson):**
   - Upload the files in [`sample-shannon-files/`](sample-shannon-files/).
   - Observe: Gemini recognizes the prefixes, extracts structured OLD CARTS history, formats lab panels as clean tables with blank lines, confirms the Neutral unlisted policy, and outputs a single Carmen markdown prompt under 48k units.
3. **Test Run 2 — Combined-Document IPE Encounter (Linda Johnson):**
   - Upload the files in [`sample-linda-files/`](sample-linda-files/) (the scenario, student handout, and BuckIPE PDF).
   - Observe: Gemini uses Path B, presents the **Proposed Information Mapping by Category** preview, asks whether vitals/oral findings belong in `learner-` or `facilitator-`, includes all 6 BuckIPE competency domains, dynamically scopes the 7 learner disciplines, and outputs the final Carmen prompt.

---

## 4. Verification

```sh
npm test
# Equivalent to: python3 -B -m unittest discover -s tests
```
All 65 Python unit tests pass cleanly.

---

## 5. Pasteable Continuation Prompt

> Continue the Carmen AI Assistant simulated patient authoring pipeline. Read HANDOFF.md, README.md, FACULTY-WORKFLOW.md, and authoring-skills/simulated-patient-experience/SKILL.md. The active authoring workflow is the Gemini Skill (simulated-patient-experience.zip and authoring-skills/simulated-patient-experience/). The zero-inference web builder (web/) has been scrapped and retired. The Python CLI pipeline (scripts/, pipeline/, packages/) is legacy: kept for regression checks (npm test passes 65 unit tests). The skill ingests raw materials across 6 categories (instructions-, learner-, patient-, facilitator-, consultant-, feedback-), supports both prefixed files and unmarked/combined documents via Category Information Mapping previews, dynamically determines table columns without hallucinating ranges (using (Not Provided) when needed), enforces mandatory table spacing (### heading + blank line), preserves all competency domains from feedback frameworks, and compiles a single Carmen AI Assistant prompt under 48,000 maximum units with locked runtime rules. Two test sample suites are ready: sample-shannon-files/ (focused OSCE) and sample-linda-files/ (complex IPE). Next follow the user's directions or evaluate destination-host Carmen AI Assistant trial encounters.
