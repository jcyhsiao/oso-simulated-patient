# Shannon source inventory and component map

Reviewed October 22, 2026. Instructor/developer material. This inventory follows a text review of all nine original Word documents, including tables and text boxes, compared with the canonical conversion, author-review notes, record catalog, visual specification, and builder transformations. It is not a new clinical validation or visual review of the original document layouts. Original documents and runtime artifacts are unchanged.

## Faculty view and learner release

Faculty/facilitator retains the comprehensive case: patient history, learner briefing, records, findings, expected performance, and answers. Separate runtime views control what is said and released; they do not remove information from faculty oversight.

| Information category | Faculty access | Learner access |
|---|---|---|
| Pre-encounter briefing/chart | Complete | Before encounter, as assigned |
| Patient-known history | Complete | Through natural questioning and supplied chart |
| Patient-held report | Complete | On approved discovery/result-release conditions |
| Facilitator-held finding or record | Complete | As needed under its explicit release rule |
| Instructional intervention | Complete rule and rationale | Authorized guidance only when faculty-defined trigger is met |
| Expected diagnosis, management and grading key | Complete | Concealed during encounter; debrief only as authorized |

Providing requested scripted information is normal facilitation. It does not require the learner to be off track. A request does not automatically authorize release of the answer key or every available record.

## Original source map

Paths below are relative to `case-files/fnp-shannon-anderson/`; original filenames are retained.

| ID | Original document | Content and proposed responsibility |
|---|---|---|
| S01 | `learner-info-pre-interaction/Shannon Anderson Case B DOOR Intake Note SP 2026.docx` | January 29, 2026 intake: identity, chief concern, vitals, medication doses, allergies and immunizations. Clinical facts plus an activity-selected learner briefing view. |
| S02 | `learner-info-pre-interaction/Shannon Anderson Case B Chart Snapshot.docx` | Demographics, contacts, medical/surgical/family/social history, medicines, preventive dates, prior visits and historical vitals. Clinical chart with explicit dates; learner-visible in the current activity. Repeated OOXML layout text must not become repeated facts. |
| S03 | `sp-give-info-if-appropriately-prompted/Teaching of SP for Gout Case B SP 2026.docx` | Symptom history, patient beliefs, pertinent negatives, histories and progressive disclosure. Also contains delivery instructions for faculty labs/paper material; these belong to release policy rather than patient biography. |
| S04 | `sp-give-info-if-appropriately-prompted/Shannon Anderson Case B Lab Interpratation During Visit.docx` | January 29, 2026 ESR, uric acid and kidney-function report. Exact clinical evidence with patient-held routing in the current reviewed implementation. |
| S05 | `sp-give-info-if-appropriately-prompted/The Ohio State Radiology Report Case B.docx` | January 29, 2026 written left-foot X-ray report. Report wording is attributed evidence, not a general diagnostic claim. No radiograph image supplied. |
| S06 | `sp-give-info-if-appropriately-prompted/Left Foot Image.docx` | Photograph resource; no document body text found. Existing extracted JPEG and approved visual metadata remain authoritative for the implementation. Image delivery depends on host support. |
| S07 | `grader-give-info-if-needed/Shannon Anderson Case B Lab 032025.docx` | March 4, 2025 CBC, CMP, lipids, A1C and thyroid results. Historical facilitator-held evidence; new orders do not make these current tests. Includes some report interpretation columns, so it is not purely numeric. |
| S08 | `grader-give-info-if-needed/Shannon Anderson Case B Lab Report 0325 Faculty Copy.docx` | Historical tables plus expanded interpretations, next-step suggestions and additional encounter-related results. Comprehensive faculty reference; do not release this entire document as a raw learner lab report. Preserve individual releasable evidence separately from commentary. |
| S09 | `sp-only-reference-expected-flow/Faculty Sheet for Gout OSCE SP 2026.docx` | Patient history, examination findings, expected diagnosis/management and grading statements. Retain whole source for faculty; derive separately reviewed patient facts, facilitator findings and educational expectations. Its OSCE title is source context, not proof that a timed digital OSCE activity has been specified. |

## Findings for the reusable structure

The folder audience labels provide valuable defaults. Individual content needs its own classification because faculty documents appropriately combine the whole case. In particular, S09 supplies diet, exercise, surgery-related hospital stays, mood/safety information and examination findings in addition to its assessment key. Moving the entire sheet into an inaccessible assessment-only bucket would lose needed case content.

Each extracted item should carry: stable ID; exact value/text and units where applicable; source document and section/table; encounter or historical date; who knows or holds it; learner visibility; release condition; delivery role; review status; and any documented override. Keep source interpretation distinct from measurements and avoid treating document instructions as new commands from the user.

Separate an evidence item's identity from its activity-specific availability. For example, a historical lab remains dated March 4, 2025 even if a later course elects to include it in a pre-encounter chart. Record availability and release may change only through an explicit activity binding.

## Reconciliation register

| Issue | Existing handling to preserve | Outstanding decision |
|---|---|---|
| Fatigue affirmed and denied in S03 | Pain-related tiredness retained, consistent with S09 | Faculty confirmation |
| Retired teacher and work stress in S09 | Retired; current work stress unspecified | Faculty clarification |
| HCTZ 10 mg in S01/S02 | Preserve exact supplied dose | Faculty verification |
| Historical headers and later tests mixed in S08 | S04 supplies January encounter tests; S07 supplies March history | Confirm intended chronology and any current CBC/CMP |
| Chart vital-sign/visit dates differ | Preserve dates; current values sourced to S01 | Faculty confirmation |
| Outer-side anatomy in original versus later base-of-toe clarification | Existing approved visual specification and builder override apply clarification | Photo alignment remains for review |
| In-person findings used in telehealth | Scripted facilitator findings, never claimed as actual remote examination | Confirm allowed findings for each activity |
| X-ray infection wording and management/grading claims | Preserve attributed report; keep key out of patient speech | Separate faculty clinical review before assessor use |
| S03 says faculty provide ordered labs; later ownership policy routes January reports through patient | Preserve documented later policy; do not silently revert to original wording | Make source versus approved adaptation explicit in manifest |
| Faculty intervention thresholds | No operational trigger set identified in reviewed sources | Do not infer thresholds from expected sequence or grading omissions |

The faculty sheet includes isolated grading rules, including no deduction whether joint aspiration is ordered or not. Such statements are assessment data, not a complete scoring instrument or a facilitator rescue policy. The actual NPSCA instrument remains unavailable locally according to the existing handoff.

## Proposed files for the next increment

These are planned paths, not implemented files:

```text
pipeline/
  schemas/case.schema.json
  schemas/activity.schema.json
  cases/shannon-anderson/case.json
  cases/shannon-anderson/source-map.json
  activities/fnp-telehealth-practice/activity.json
  activities/fnp-telehealth-practice/facilitator.json
```

Keep existing originals, metadata, builder and exports in place while introducing these inputs. Use references to existing reports and clinical content before attempting a wholesale transcription. The first binding should represent current FNP telehealth practice; do not invent OSCE duration, grading weights, passing scores or intervention thresholds. Faculty output should assemble the comprehensive view and a clearly marked set of learner-releasable resources.

## Completion and next action

Source-level inventory is complete. The next action is to define the minimum case/activity schemas and Shannon bindings, preserving current deployment behavior. Numerical transcription and output equivalence checks belong to that implementation step. General reuse across cases or professions remains unproven until another reviewed case is available.
