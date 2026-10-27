# Faculty and developer workflow

The faculty member supplies and reviews the educational case; the developer or authoring assistant turns it into structured inputs, builds the package and checks it. Faculty can continue using Word documents, reports and images. Faculty does not need to write JSON. There is no automated arbitrary-document importer or faculty form application yet.

## What faculty supplies

| Material | What it must establish | How to supply it |
|---|---|---|
| Clinical case | Person, concern, symptoms, history, explicit negatives, patient understanding and concerns; identify unspecified facts | Existing SP teaching sheet or narrative; supporting chart |
| Learner briefing | Exactly what learners know before starting | Door/intake note, chart snapshot or a marked section of the case packet |
| Findings and records | Exact findings, values, units, dates, report wording and images; historical versus encounter context | Original reports, examination sheet and original image files |
| Activity brief | Profession, program, learner stage, course objectives, setting, task, permitted resources, completion expectations and any time limit | A short written brief; use the intake template below |
| Release decisions | Who holds each record, what is preprovided, and when/how additional information may be given | Annotated report list or completed release table |
| Facilitator intervention rules | Observable dead-end/off-track trigger, allowed alternatives, authorized guidance, repeat limits and consequences | Explicit rules in the faculty package; leave unspecified if not yet decided |
| Assessment and debrief | Actual instrument/version, criteria and scoring instructions if assessment is intended; when feedback is available | Faculty rubric and debrief guide, separately marked as concealed |
| Review decisions | Resolution of contradictions, approved portrayal/variants and authorization for the intended use | Written decisions linked to source issues and a reviewed version |

One comprehensive faculty document can contain all of these. Separate files are convenient but not required. Mark sections by audience and intended release. Faculty retains access to the complete case, including material the facilitator may give the learner as needed. The developer derives role-specific views without removing faculty visibility.

## Working sequence

Keep the four existing source folders as the base organization. Add `other-activity-parameters` for syllabus, OSCE directions, rubrics or other supporting documents, in faculty's existing formats. The intake table below is an optional developer review aid, not a required submission format. Organize the assembled experience into experience template, course context, activity/assessment and clinical case; one source can inform several levels.

1. Place original materials under `case-files/<case-name>/`, preserving originals. Existing audience folders are useful. Supply the activity brief and a source list; identify anything missing rather than filling gaps with plausible facts.
2. Developer/assistant inventories the documents and identifies facts, learner-visible material, releasable evidence, concealed expectations and conflicts. Faculty reviews the issues that require clinical or educational judgment.
3. Developer/assistant creates case components and activity bindings. Case facts and record dates are kept separate from the activity's release conditions. A new activity may reuse the clinical case after review of its briefing, available findings, scope and expectations.
4. Faculty reviews readable assembled materials, the release table and any intervention/assessment rules. Do not ask faculty to approve raw JSON as a substitute for reviewing the learner/patient/facilitator experience. A formal approval UI and automatic comprehensive review export are not implemented.
5. Developer builds and runs local validation. Faculty and developer conduct live trials in the intended host, including requested findings, reasonable alternative approaches, closure and potential leakage. Automated equivalence checks do not establish realism or clinical validity.
6. Faculty/institution approves the reviewed version and destination access for intended use. Developer replaces the deployment artifacts and retains the version and review record. The current build does not enforce a formal release-approval gate or provision a learner link.

## Release example from Shannon

The January 29, 2026 written X-ray remains the same clinical record across activities. In current FNP practice, Shannon holds it and matching requests or firm plans can release it under the existing policy. A different approved activity might put it in the initial learner chart. That changes access, not the report's date or contents. A new order must never convert the old report into a newly completed study.

Requested scripted findings and records are normal information delivery. Instructional rescue is separate and requires a faculty-authored trigger. A missed assessment criterion alone is not a trigger. If intervention rules or a scoring instrument are unavailable, the current adapter does not enable those features.

## Current developer edit map

| Change | Author input |
|---|---|
| Clinical prose/components | `pipeline/cases/shannon-anderson/components.json` and active component/clinical paths |
| Record identity, date, aliases and exact-content references | `pipeline/cases/shannon-anderson/records.json` |
| Ownership, availability, result-release/discovery rules | `pipeline/activities/fnp-telehealth-practice/record-release.json` |
| Activity composition and selected shared policies | `pipeline/activities/fnp-telehealth-practice/activity.json` and `policies/` |
| Comprehensive faculty access and intervention draft | `pipeline/activities/fnp-telehealth-practice/facilitator.json` |
| Approved visual clarification | `cases/case-b-visual-description.json` |

`cases/case-b-diagnostic-records.json` is now a generated compatibility catalog used by the transcript reviewer. Do not edit it directly. Earlier snapshot files and generated reference views are not authoring inputs. Some inline rules and Shannon-specific builder transformations still remain; the developer must reconcile those when changing affected content. This is an incremental reference pipeline, not proven multi-case automation.

Developer checks from the project root:

```sh
python3 -B scripts/build-copilot-case.py
python3 -B scripts/validate-pipeline.py
python3 -B scripts/extract-reference-views.py --check
python3 -B -m unittest discover -s tests
```

After an intentional, reviewed runtime change, regenerate reference views and update the relevant migration-baseline tests with change-specific expectations. A stale baseline is not permission to skip review.

## Intake template for the next case or activity

- Case name/version and source documents:
- Profession, program, course and learner stage:
- Intended use and learning objectives:
- Setting and encounter date:
- Learner task, permitted resources, time/completion expectations:
- Information provided before the encounter:
- Patient facts, concerns and communication portrayal:
- Available records/findings and exact source content:

| Record/finding | Date | Patient knows/holds it? | Learner already has it? | Release condition | Delivery role |
|---|---|---|---|---|---|
| [item] | [date or not supplied] | [yes/no/unknown] | [yes/no] | [request/order/other explicit rule] | [patient/facilitator] |

- Authorized instructional intervention rules, or not yet supplied:
- Assessment instrument and scoring policy, or formative practice without scoring:
- Reflection/debrief timing and content:
- Authored variants, or none:
- Conflicts/missing facts requiring faculty decision:
- Faculty reviewer, reviewed version and review status:
