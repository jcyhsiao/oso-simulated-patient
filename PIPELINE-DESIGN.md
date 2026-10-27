# Reusable simulated-patient pipeline

Design decision recorded October 22, 2026. Shannon Anderson is the reference implementation. This document defines the intended architecture; the current builder remains Shannon-specific. No second case, general compiler, intervention engine, or scoring system has been implemented.

## Separate the person from the learning activity

Updated organizing model: level 1 experience template (for example telehealth), level 2 course context (for example an FNP syllabus), level 3 activity/assessment (for example OSCE directions), and level 4 clinical case (Shannon). Compose these logically rather than permanently nesting a case under one course. Preserve the existing four source folders and accept supporting documents under `other-activity-parameters`. Faculty submission formats remain unrestricted. Developer manifests have not yet been fully migrated to four distinct executable levels.

Reusable authoring guidance is drafted in `authoring-skills/simulated-patient-experience/SKILL.md`, with selectively loaded telehealth, course, OSCE and formative-practice references. These are authoring templates, not learner runtime skills. They can be split into independently reusable specialist skills when needed; a separate skill per course or patient is not required. Local drafts are not automatically installed or invoked by the current Python builder.

A clinical case describes the person and available evidence. An activity describes what a particular learner is asked to do with that case. Profession, program, and course profiles supply educational context without changing clinical facts implicitly.

| Component | Owns | Does not own |
|---|---|---|
| Shared simulation framework | Natural conversation, unknown-data handling, role boundaries, disclosure mechanics, explicit closure | Case facts or expected diagnoses |
| Profession profile | Professional role, scope references, terminology | Invented patient knowledge |
| Program profile | Learner preparation and expected responsibilities | Silent changes to case findings |
| Course/activity profile | Objectives, briefing, permitted resources, timing, deliverables, facilitator intervention rules, feedback and assessment | Patient biography or hidden coaching through dialogue |
| Clinical case | Patient facts, concerns, records, findings, provenance, disclosure conditions, approved variants | Learner grading rules |
| Deployment adapter | Platform instructions, packaging, asset delivery and platform limits | Clinical or educational decisions |

Profiles should be composed explicitly rather than treated as unrestricted text overrides. A conflict in clinical facts or educational instructions requires reconciliation, not a last-profile-wins rule. Each released package should identify the exact component versions and approval status.

## Runtime roles

Faculty/facilitator has a comprehensive author view of the whole case, including patient facts, learner materials, releasable findings, educational expectations, and concealed answers. Role separation governs runtime speech and release, not faculty visibility. The faculty package must include information it may give to the learner as needed, with explicit release conditions and exact authorized content. The same approved fact may appear in several role-specific views; ownership describes its runtime source, not exclusive faculty access.

**Patient:** Portrays the person using patient-known facts. Responds naturally to the learner, asks relevant personal questions, and clarifies unfamiliar language without exposing educational expectations. Does not score, interpret the faculty key, or steer the learner through a checklist.

**Facilitator — findings:** Supplies authorized findings and records when their release conditions are met. Routine evidence delivery is distinct from instructional intervention; a learner need not be off track to receive a requested scripted finding.

**Facilitator — intervention:** Steps in only when a faculty-authored rule identifies a dead end or significant departure from the activity. A missed rubric item or a reasonable alternative sequence alone does not authorize intervention. The model must not invent an expected pathway, trigger, or rescue rule when the faculty package is silent. Label interventions separately from patient speech and record the triggering rule and assistance given for faculty review. If the platform cannot retain that record separately, do not expose the concealed rationale in learner-facing dialogue.

**Debrief/evaluator:** Operates after the encounter or at an explicitly authorized activity boundary. Uses the faculty rubric and transcript/submission evidence. Distinguishes observations, interpretation, and unavailable evidence. Scoring is unavailable unless an appropriate instrument and scoring policy have been supplied and reviewed.

These are logical roles; the current chat packaging does not establish technical isolation or confidentiality between them.

## Faculty-authored intervention contract

Each activity must specify:

- Mode: formative practice, assessment, or another named activity.
- Observable trigger and what constitutes a dead end or significant departure.
- Acceptable alternative approaches and exclusions that should not trigger intervention.
- Authorized intervention text or bounded guidance, including how much information may be disclosed.
- Timing, repeat limits, and how the learner resumes.
- Whether assistance affects interpretation of performance or a score, according to faculty policy.
- What to do when the rule cannot be evaluated reliably.

An activity without approved intervention rules has no proactive instructional rescue enabled. Existing request-driven findings remain governed by their own release rules. For an OSCE, faculty must explicitly decide whether and when rescue is allowed; formative coaching must not carry over automatically.

## Variation policy

Conversational variation may change wording and context-sensitive reactions while preserving facts, disclosure boundaries, health literacy, and the task. It must not systematically cue a concealed assessment criterion.

Authored variants change clinical facts, barriers, presentation, or task-relevant difficulty. They require an explicit variant identifier, changed fields, provenance, review, and a check of affected briefing, findings, rubric, and feedback. Do not randomly generate these changes during an encounter. Existing bounded record-recall behavior remains a Shannon-specific policy pending review of its suitability for each activity; it is not a universal default.

## Shannon reference mapping

| Current source | Intended responsibility |
|---|---|
| `copilot-agent-instructions.md` | Starting point for shared runtime behavior; extract case assumptions carefully |
| `cases/case-b-shannon-anderson.md` and original faculty materials | Clinical case and provenance, with unresolved conflicts preserved for review |
| `cases/case-b-diagnostic-records.json` | Evidence ownership, availability, discovery and release metadata |
| `cases/case-b-visual-description.json` | Approved visual facts, fallback and author review |
| `instructions/result-release-policy.md` | Shared release mechanics plus explicitly selected case/activity policies |
| `packages/fnp-shannon-anderson/SKILL.md` | Mixed reference input to separate into portrayal, activity assumptions and adapter instructions |
| `scripts/build-copilot-case.py` | Existing deployment builder; future compiler/adapter extraction candidate |
| `TESTING.md` and local tests | Existing reference checks; do not equate them with clinical or assessment validation |

Shannon's current implementation is FNP telehealth practice. A simulated-patient OSCE is a prospective activity binding, not an already approved station. Gout belongs in instructor-only case context unless the source explicitly establishes that the patient knows that diagnosis. This architecture does not resolve the existing faculty source-review issues.

## Intended build outputs and checks

The eventual pipeline should assemble a learner briefing/chart, patient runtime package, facilitator package, faculty guide, activity-specific rubric/debrief materials, deployment artifacts, and a version/approval manifest. Concealed materials should be separate from learner artifacts. A single prompt containing both is not an access-control mechanism.

Before packaging, check required fields, missing versus negative information, source conflicts, role ownership, matching record dates/units, asset availability, profile compatibility, authorized variants, intervention completeness, and platform limits. Review generated dialogue separately for realism and leakage. Validate the evaluator separately from the patient.

## Next implementation increment

1. Inventory Shannon's existing facts and rules into these responsibilities without silently changing runtime behavior.
2. Define structured case and activity schemas, with explicit unknowns and unresolved approval fields.
3. Create a Shannon case manifest and a current FNP telehealth practice activity binding using supplied materials only.
4. Refactor the existing builder incrementally, checking that the reviewed clinical content and release behavior survive the extraction.
5. Draft an OSCE activity binding only where faculty requirements are supplied; leave unsupported timing, rubrics and intervention triggers unresolved.
6. Validate reuse against a second real case when one becomes available. Until then, describe the pipeline as Shannon-referenced, not demonstrated across professions or cases.
