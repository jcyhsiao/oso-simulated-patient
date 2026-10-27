# Assessment of recent builder changes

Assessment date: October 27, 2026.
Reviewed revision: `43652b5`, compared with the initial Git snapshot `ce18b42`.
Requested by the user after work performed with Gemini. Git commits identify the
repository owner, so attribution to Gemini comes from the user's account rather
than commit authorship.

This is a review, not a repair. No application code, source material or existing
saved cases was changed during the assessment. Browser checks used an isolated
profile rather than the user's open case. This document records the findings
presented in the conversation.

## Overall assessment

Useful additions remain, but several changes undermine the builder's central
promise: preserve faculty-authored information without silently changing its
meaning. Recommend targeted corrections rather than reverting all recent work.
The Buckeye interface remains largely intact; the principal issues concern source
handling, conflicting runtime instructions and incomplete verification.

## Findings

### 1. High priority: unspecified symptoms become invented negative findings

Location: `web/content/runtime.md:19`.

The runtime directs the patient to deny a symptom or complaint not listed as
present. This turns missing information into a negative finding, contrary to the
previous missing-information policy and the surrounding prohibition on invention.
The next rule says missing information is not automatically negative, creating
an internal inconsistency.

This finding follows directly from the authored instruction; no live hosting-model
trial was performed to establish how consistently a model follows it.

Recommended correction: distinguish explicitly supplied positive findings,
explicitly supplied negatives and unspecified information. Do not make a universal
negative-response policy from silence in faculty sources. If faculty want default
negatives, make that an explicit authored case policy.

### 2. High priority: custom role instructions can be silently discarded

Location: `web/compiler.mjs:81`, `pruneProfessionalScope()`.

The compiler retains only sections with recognized headings when any such section
exists. Content before those sections and sections with other headings can be
removed without a warning. The same filtering applies to faculty-created custom
roles, not only bundled starter profiles.

Browser reproduction: entered a custom role containing a faculty preamble, a
“Role and scope” section and a “Course restrictions” section. The generated output
retained the scope text but omitted both the preamble and restrictions.

Recommended correction: preserve faculty-authored and faculty-edited role text.
If bundled profiles require a shorter export representation, author that separately
rather than inferring disposable content from headings. Any intentional omission
must be visible and reviewable.

### 3. Role profiles mix learner expectations with consultant behavior

Locations: `web/content/professionals/primary-care.md:4` and
`web/compiler.mjs:145`.

Profiles include consultant-oriented behavior such as clarifying a consultation
question, responding to a learner's handoff and contributing advice. The Primary
Care profile also prohibits patient-specific prescribing. These profiles are
inserted into learner feedback expectations, including FNP OSCE encounters that
assess management planning. The mismatch concerns the purpose and actor addressed
by these instructions; this review does not establish jurisdictional clinical
scope rules.

The compiler places the selected profile text inside the feedback-enabled branch.
Browser reproduction confirmed that a selected custom role's scope text vanished
from generated instructions when preliminary feedback was disabled.

Recommended correction: define learner audience and supplied educational scope
separately from simulated consultant behavior. Use purpose-built learner profiles,
retain relevant audience context independently of feedback selection, and keep
case-specific expectations in the faculty criteria input. Selecting a discipline
must not create a consultant or silently establish new assessment targets.

### 4. Role chips overwrite explicit learner-role input and leave stale values

Location: `web/app.mjs:28`, `syncLearnerRole()`.

Browser reproduction:

1. Entered “Second-year FNP student; focused assessment only” in Learner role.
2. Selected another discipline. The field became a generic interprofessional
   student-team label, losing the supplied level and restriction.
3. Deselected every discipline. The field still read “Nursing student”.

The selection controls and explicit field therefore can disagree, and automatic
synchronization can overwrite faculty context.

Recommended correction: separate selected disciplines from the explicit learner
role/level field. Suggestions may populate an untouched field, but should not
replace faculty edits. Define and test behavior when the final chip is removed.

### 5. Passing unit tests do not establish the current browser workflow

Locations: `web/tests/compiler.test.mjs:235` and
`web/tests/cases-browser.cjs:29`; similar obsolete selectors remain in
`web/tests/browser.cjs` and `web/tests/images-browser.cjs`.

The current Node suite and Python suite pass, but existing browser scripts still
reference removed format radio buttons and the former download list. An isolated
browser check confirmed those selectors have zero matching elements. The scripts
cannot complete unchanged against the current interface. They were inspected,
not represented as successfully rerun end to end during this assessment.

The Shannon size regression uses a separate Python DOCX extraction implementation
instead of the browser importer, supplies empty image arrays and inserts a case
description referring to the right foot. It does not establish actual ingestion
fidelity, image-review behavior or consistency with the supplied left-foot case.

An actual browser import of the nine Shannon DOCX files, using the built-in
Primary Care role and FNP feedback preset with extracted images explicitly
excluded, compiled successfully at 46,514 maximum units against the under-48,000
budget. This is one concrete configuration, not an exact like-for-like comparison
with the test fixture's differently supplied role label and description, nor a
claim that all future source combinations fit.

Recommended correction: update browser scripts for the actual interface and test
real DOCX ingestion, descriptions/exclusions, backups and downloads. Keep count
unit tests, but do not substitute an alternative extractor for end-to-end import
verification. Correct the test fixture's side and add source-preservation checks
for custom role material.

## Product scope change requiring an explicit decision

The browser now targets Canvas AI Assistant exclusively and produces a single
instruction file under 48,000 maximum units. The earlier browser supported both a
single file and main instructions plus a case skill package, with a setup guide.
Those browser export options are removed.

This may reflect intentional instructions given in later work; the assessment
does not establish that it was unauthorized. Confirm whether Canvas-only delivery
is now the desired product contract. If retained, update plans, help and browser
tests consistently. Treat removal of modular exports and the setup download as a
product change rather than an equivalent implementation of the earlier plan.

## Useful work to retain

- Browser-local saving, recovery and editable case backups.
- Embedded image preview/review and explicit exclusions.
- NPSCA-informed qualitative feedback.
- Offline operation and direct compilation without an external AI synthesis step.
- Clipboard and instruction-file download convenience.
- Clearer distinction between visual examination requests and diagnostic records.
- The existing Buckeye UX shell.

These features should be retained while correcting the issues above. This list
is not a claim that every retained workflow was fully revalidated in this review.

## Verification performed

- Compared Git history and changes between `ce18b42` and `43652b5`.
- Inspected compiler, runtime, role profiles, persistence changes, UI and tests.
- Ran all 19 Node unit tests: passed.
- Ran all 65 Python unit tests: passed.
- Used the built standalone HTML offline in isolated Chromium to reproduce custom
  role text loss, learner-role overwrites/stale values and scope omission when
  feedback is disabled.
- Inspected the rendered role interface and checked removed test selectors.
- Imported the actual nine Shannon DOCX files through the browser and checked the
  resulting compilation budget with images explicitly excluded.
- Confirmed the repository working tree was clean at the end of the assessment.

No live Canvas chatbot trial, clinical validation, assessment-validity evaluation,
other-browser certification or deployment was performed. Local instruction
inspection and compilation checks do not prove a hosting model's behavior.

## Recommended repair order

1. Restore faithful handling of unspecified facts and preserve all faculty role text.
2. Separate learner scope from consultant behavior and feedback activation.
3. Correct chip/manual-field synchronization without overwriting faculty edits.
4. Confirm the desired export contract, then reconcile UI, help and tests.
5. Run current browser workflows and faculty-selected hosting-model scenarios.
