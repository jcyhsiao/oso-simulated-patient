# Faculty Authoring Workflow: Carmen AI Assistant

> **Current direction (October 28, 2026):** Faculty and instructional builders author simulated patient encounters using the **Gemini Authoring Skill** ([`simulated-patient-experience.zip`](simulated-patient-experience.zip)). The former zero-inference web builder (`web/`) was retired. The Python CLI pipeline (`scripts/`, `pipeline/`, `packages/`) is legacy and kept for regression reference.

---

## 1. What Faculty Supplies

Faculty can supply materials in their existing formats (Word documents, PDFs, clinic notes, rubrics, or pasted text). Documents can be supplied as **separate files** or as a **single master document**.

Simulation content maps into 6 functional categories:

| Prefix / Category | What It Contains | How Faculty Supplies It |
| :--- | :--- | :--- |
| `instructions-` | Activity parameters, clinical setting, intended learner discipline(s), training level, and learning objectives. | Syllabus excerpt, assignment prompt, or a brief narrative. |
| `learner-` | Information the student receives *before* entering the room (door note, triage sheet, initial vitals, baseline chart, or student handout). | Door intake note or chart snapshot. |
| `patient-` | Patient portrayal: demographics, chief concern, disclosable history (HPI attributes or *"If asked about..."* domain prompts), lifestyle, and patient-held reports. | SP teaching sheet, acting script, or patient narrative. |
| `facilitator-` | Concealed findings released only if examined or ordered (physical exam observations, concealed labs, imaging reports). | Faculty clinical sheet, lab printouts, or radiology reports. |
| `consultant-` *(optional)* | Information for explicitly named simulated colleagues (e.g. pharmacy consult note). Leave empty if there are no simulated colleagues. | Specialist consult note (empty if none). |
| `feedback-` *(optional)* | Post-encounter qualitative evaluation criteria, OSCE checklists, IPE team challenges, or reflection prompts. | Faculty rubric, checklist, or competency framework. |

---

## 2. Intake Workflow Options

### Option A: Prefixed Files (Fastest)
Faculty prefix their filenames with the category tags (e.g., `learner-door-note.docx`, `patient-script.docx`, `facilitator-labs.docx`, `feedback-rubric.docx`, `instructions-context.docx`).
- When uploaded to the Gemini Skill, Gemini automatically acknowledges the mapping, extracts facts, audits gaps, confirms the Unlisted Symptom Policy, and compiles the Carmen prompt immediately.

### Option B: Unmarked Files or Combined Documents (Interactive Triage)
Faculty upload existing filenames (e.g., `Scenario.docx`, `Student_Handout.docx`, `Competencies.pdf`) or paste text into the chat.
- The Gemini Skill parses the content and presents a **Proposed Information Mapping by Category** preview showing what specific information landed in each of the 6 categories.
- The skill highlights pedagogical questions (such as whether vitals on a student handout belong in `learner-` upfront or `facilitator-` on demand) and pauses for confirmation before compiling.

---

## 3. Interactive Review & Compilation

1. **Category Information Preview:** Faculty reviews the information digest across the 6 categories.
2. **Clinical Gap Audit:** Gemini flags any contradictory dates, unscripted vitals, or missing required facts.
3. **Unlisted Symptom Policy:** Faculty confirms how the patient handles unmentioned symptoms:
   - **Neutral (Default & Recommended):** Patient expresses lay uncertainty (*"Hmm, that's not something I've paid much attention to"*). Prevents false negatives from misleading clinical reasoning.
   - **Deny:** Patient firmly answers *"No, I haven't noticed anything like that"*. Best for tightly scripted OSCE stations.
4. **Final Export:** Gemini compiles a single Markdown code block strictly under **48,000 maximum units** embedding the locked Carmen runtime scaffolding.
5. **Paste into Carmen:** Faculty copies the generated block with one click and pastes it directly into Carmen AI Assistant instructions.
