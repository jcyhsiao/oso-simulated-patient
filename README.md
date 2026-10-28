# Simulated Patient Authoring & Pipeline

> **Current direction (October 28, 2026):** Authoring simulated patient encounters for **Carmen AI Assistant** is powered by the **Gemini Authoring Skill** (`simulated-patient-experience`). The previous zero-inference browser web builder (`web/`) has been retired. The Python CLI pipeline (`scripts/`, `pipeline/`, `packages/`) and Shannon CLI reference outputs are retained for regression checks and baseline testing.

---

## 1. Authoring with the Gemini Skill

The authoring workflow uses the builder's Gemini quota (Gemini Skills or Google AI Studio) to ingest raw case documents, perform category mapping, dynamically synthesize learner scope, audit clinical gaps, and assemble a single instruction file strictly under the **48,000 maximum unit budget** for Carmen AI Assistant.

- **Skill Package Archive:** Upload [`simulated-patient-experience.zip`](simulated-patient-experience.zip) into Gemini Skills.
- **Skill Specification:** See [`authoring-skills/simulated-patient-experience/SKILL.md`](authoring-skills/simulated-patient-experience/SKILL.md).
- **Locked Carmen Runtime:** Embeds [`references/carmen-runtime.md`](authoring-skills/simulated-patient-experience/references/carmen-runtime.md) and enforces [`references/prompt-structure.md`](authoring-skills/simulated-patient-experience/references/prompt-structure.md).

### Functional Category Idiom
Materials map into 6 functional categories using prefixes or conversational triage:
1. `instructions-`: Activity parameters, setting, learner discipline(s), and training level.
2. `learner-`: Pre-interaction briefing (door note, triage sheet, student handout, or chart snapshot).
3. `patient-`: Patient portrayal, demographics, chief concern, and progressive disclosure history (attribute tables or domain prompts).
4. `facilitator-`: Concealed clinical observations, physical exam findings, vital signs, and diagnostic lab/imaging panels.
5. `consultant-`: Optional explicitly named simulated colleagues.
6. `feedback-`: Post-encounter qualitative rubrics, IPE team care-plan challenges, or reflection questions.

---

## 2. Sample Case Materials

Ready-to-use sample folders for testing the authoring skill:
- **Focused Clinical / OSCE Case (Shannon Anderson):** [`sample-shannon-files/`](sample-shannon-files/) (10 prefixed files).
- **Interprofessional / Complex Care Case (Linda Johnson):** [`sample-linda-files/`](sample-linda-files/) (Combined scenario, student handout, and BuckIPE framework).

---

## 3. Legacy Python Pipeline Verification

The Python reference test suite remains active to verify regression baselines:

```sh
python3 -B -m unittest discover -s tests -v
```

All 65 tests pass.
