# Shared simulated patient pipeline roadmap

Agreed direction October 26 2026. Main project: FNP Simulated Patient at
`/Users/hsiao.62/Developer/skills/con-simulated-patient`.
This roadmap records intended work. It does not change runtime behavior or
establish faculty approval, live platform validation, or assessment validity.

The first milestone is to build Shannon and Linda through a shared, case-agnostic
compiler while preserving Shannon's reviewed source content and established
runtime behavior. The IPE project supplies optional professional interaction and
feedback content. Keep both existing prototypes available during migration.

## Faculty intake stays familiar

Accept existing documents, charts, rubrics and images in their original formats.
Do not require faculty to complete a template or author JSON.

- `learner-info-pre-interaction`: briefing and chart information supplied upfront.
- `sp-give-info-if-appropriately-prompted`: patient information revealed on relevant prompts.
- `grader-give-info-if-needed`: facilitator-accessible evidence and guidance.
- `sp-only-reference-expected-flow`: concealed portrayal and expected-flow material.
- `other-activity-parameters`: objectives, profession, level, directions and rubrics.

Folders indicate intended use, not automatic permission to publish everything
inside them. One document can inform several components. Preserve source
provenance and distinguish supplied facts, proposed additions and unknowns.
Separate facilitator findings, concealed evaluation criteria and intervention
instructions even when they arrive in the same document. Faculty retains a
comprehensive view. Expected flow must not become a forced interview sequence.

## Component responsibilities

| Component | Responsibility |
|---|---|
| Clinical case | Facts, patient concerns and approved portrayal, records, unknowns, provenance |
| Learner configuration | Profession, program, training level and expected scope |
| Activity | Objectives, task, setting, briefing, disclosure, resources and completion |
| Interaction packages | Patient behavior and optional professional colleague behavior |
| Facilitator policy | Requested evidence delivery and separately authorized intervention |
| Feedback packages | Criteria, evidence needs, permitted ratings, assistance interpretation and feedback timing |
| Deployment adapter | Platform packaging, assets, size budgets and context delivery |

Profession and level change the educational expectations, not the underlying
patient facts. Clinical variants require explicit authored changes and review.
Shared code must not depend on a patient's name, diagnosis, fixed profession list
or fixed rubric domains. Case-specific behavior belongs in selected content or
explicit configuration. Conflicting inputs require reconciliation rather than
last-file-wins overrides.

## Interaction and assessment rules

Patient interviewing and professional consultation are selectable experiences.
PRACTICE and OBSERVE are learning controls, separate from those experiences.
Activity rules determine which controls are available and when feedback appears.

For the OSCE configuration discussed with the user, the learner interacts with
the patient and cannot request professional consultation from the facilitator.
The facilitator observes and intervenes only under faculty-approved conditions.
This is an activity-specific rule, not a claim about every OSCE.

Keep these actions distinct:

- Requested scripted findings or records: routine authorized evidence delivery.
- Learner-requested colleague consultation: available only in activities permitting it.
- Proactive facilitator intervention: requires approved triggers and bounded assistance.

Professional profiles define expertise, scope and voice; they do not determine
when an intervention occurs. A missed rubric criterion alone is not an
intervention trigger. No approved intervention policy means no proactive rescue.
Capture the trigger, assistance delivered and subsequent learner evidence where
the platform supports it; do not claim an audited hidden log from prompt text.

BuckIPE and faculty-supplied OSCE rubrics become selectable feedback packages.
Preserve each package's authorized rating rules; do not invent a common numeric
scale, passing threshold or aggregate score. Check whether an activity supplies
the evidence a criterion requires. Distinguish unavailable opportunities from
learner omissions and independent from supported performance. Combined packages
need explicit compatibility and scoring decisions. Demonstration dialogue is
never evidence of human learner performance.

## Step 1 Establish the baseline and agreement

Developer: inspect active author inputs and builder assumptions, run existing
checks and record this architecture. Faculty: no new submission required.

Completion: documented agreement and passing baseline. On October 26, 2026,
51 existing tests passed, author manifests validated and reference views
reconstructed the current runtime byte for byte. No live host trial was run.

## Step 2 Generalize compilation with Shannon preserved

Developer: add explicit activity selection; derive the case, output identities
and selected policies from reviewed inputs. Isolate existing Shannon-specific
transformations in a compatibility path before removing them incrementally.
Separate reusable packaging from clinical and educational decisions. Preserve
the current entry point as needed during transition. Parameterize feedback
selection rather than assuming Shannon or eight domains.

Completion: shared entry point builds Shannon, preserves clinical content and
intended runtime text, retains size checks and passes meaningful regression
checks. Any changed behavior is documented rather than called equivalent.
Descriptive metadata must not masquerade as an implemented runtime switch.

Implementation update October 26, 2026: `scripts/build-simulation.py --activity`
is the shared entry point; legacy commands read their default from supplied
project configuration. Case/activity content, identity metadata, approved visual
fields, format variants, output identities/assets and one feedback guide are
supplied inputs. The initial compatibility adapter has now been retired: its
existing transformations were migrated from active inputs into authored runtime
components and explicit inline instructions, without reading generated outputs
or reference views. No patient name, diagnosis, image source path, sentence
replacement or clinical-section slicing remains in build orchestration.
Source-inventory validation also uses supplied activity/source selections.
Shannon runtime files/catalog match the unchanged pre-refactor baseline byte for
byte, all 66 tests pass, and manifest/reference checks pass. Independent synthetic
cases check custom metadata, visual paths, export variants, feedback criteria and
packaging. The migration record identifies active inputs and inactive snapshots.
Linda and real cross-case validation remain Step 3. Combined rubrics, new timing
controls and intervention policies remain Step 4. No live-host validation or
clinical behavior change is claimed.

## Step 3 Add Linda as the second case

Developer: inventory the instructor's original document and derive case,
briefing, patient responses, findings, activity objectives and review issues.
Faculty: resolve the learner level, upfront versus elicited information,
adaptation of group tasks, timing, goal horizons, patient preferences and
feedback criteria. Do not infer these decisions from example goals.

Completion: readable review materials and a draft Linda package produced through
the shared compiler, without Shannon transformations. Unresolved educational
requirements remain explicit. Missing required decisions block release, not
read-only intake or review drafting.

## Step 4 Add reusable feedback and facilitator policies

Developer: extract the Shannon summary guide; adapt BuckIPE as an optional
package; define a contract for supplied OSCE rubrics. Implement activity-specific
feedback timing and intervention permissions, validating evidence requirements
and unsupported combinations. Faculty supplies any actual OSCE instrument,
scoring rules and intervention triggers before those features activate.

Completion: generated behavior reflects selected policies, required unknowns
are reported and unsupported activation is rejected. Consultation roles remain
optional and are not imported as automatic hints or mandatory participants.

## Step 5 Verify and consolidate

Developer and faculty: rehearse both cases in the intended platform; test natural
entry, relevant and multipart questions, unknowns, records, intervention,
reasonable alternatives, closure, feedback attribution and student access.
Record actual configuration, versions, transcripts and outcomes.

Completion: local checks pass, live limitations are documented, faculty reviews
the intended release and main-project documentation identifies authoritative
inputs and generated outputs. Preserve IPE until useful assets are migrated and
checked; no deletion, publication or new platform provisioning is implied.

## Responsibilities through an activity lifecycle

Faculty/preparer supplies existing materials, reviews readable derived views,
resolves clinical and educational decisions, rehearses and approves intended use.
Developer inventories and structures sources, builds reusable mechanisms,
validates composition and packages reviewed versions.
Learner receives an assigned briefing, conducts the configured encounter,
obtains authorized information, completes required work and receives feedback
at the activity's permitted time. Learners do not choose their assessment rules
or activate unavailable consultation, coaching or demonstration modes.

## Boundaries for this implementation

No faculty authoring application, automatic arbitrary-document importer, new
hosting platform or generalized scoring system is included in the first
milestone. Prompt roles are behavioral boundaries, not technical confidentiality
controls. Existing source conflicts and live-host issues remain open until
reviewed; preserving an old output does not clinically validate it.
