# Simulated patient package builder implementation proposal

> **Product decision (October 27, 2026):** The builder targets **Carmen AI Assistant** exclusively, exporting a single instruction file (`*-carmen-instructions.md`) strictly under 48,000 maximum units. The earlier multi-file skill ZIP, setup-guide downloads, and intermediate LLM synthesis options described in sections below have been retired. Direct browser compilation with no AI middleman is the authoritative workflow. See [web/README.md](web/README.md) and [HANDOFF.md](HANDOFF.md).

Planning agreed October 26, 2026; initial local implementation completed
October 27, 2026. Open web/dist/simulated-patient-builder.html directly in a
current browser. The same self-contained artifact is available as web/dist/index.html
for static hosting. Vercel configuration is included; no deployment was performed.
The Python compiler remains the clinical reference path. See web/README.md for
use, source layout, tested behavior and limitations.

Verification: 66 Python tests, 18 browser-compiler/ZIP/reference/metadata/case-storage tests, manifest
and reference-view checks pass. Chromium end-to-end checks passed for direct HTML
with networking disabled and local static HTTP, with actual Markdown/ZIP downloads.
The direct-file check includes the supplied Linda document's extraction and original
image-byte preservation. Other browsers and live chatbot-host behavior are unverified.

## Latest delivery clarification and proposed next refinement

The user clarified that online delivery is inherent to these simulated-patient
encounters. It does not imply that every fictional clinical case is a real-world
telehealth visit. Preserve supplied clinical settings and examination tasks;
distinguish simulated/learner-stated actions from physically observed performance.
Do not add a telehealth selector, force home/video settings, or strip exam criteria.

See [ONLINE-SIMULATION-REFINEMENT-PROPOSAL.md](ONLINE-SIMULATION-REFINEMENT-PROPOSAL.md)
for proposed runtime, record-release, help/setup and faculty-source improvements.
The user approved that proposal and confirmed human assessment timing. Runtime,
help/setup and export checks are implemented in browser version 2026-10-27-3; the
curated Shannon payloads remain unchanged. Faculty source cleanup and actual
hosting-model trials are still pending.

## Local saving follow-up — implemented October 27

The user has now requested local case saving, unfinished-work recovery and quick
starting over. [LOCAL-CASE-STORAGE-PLAN.md](LOCAL-CASE-STORAGE-PLAN.md) documents the
implemented release 2026-10-27-5: automatic IndexedDB saves, My cases, safe Start
new case, portable case backups and direct-file storage checks. This supersedes
the earlier no-project-saving scope. Earlier single-session descriptions below
record the original release; the local-saving plan is now authoritative.

## Product boundary

A browser-local SPA packages faculty-prepared material into instructions for a
simulated patient encounter. Faculty enter a case name, optional description and
learner role, with optional course/assignment context; supply material in four
explicitly assigned areas; choose feedback
inputs and an export format; then build and download. Local autosave, a case library and editable backups
are now implemented. There is no account, AI service, document authoring workspace
or live chatbot.

The implementation processes text and supported files in the browser. Cases save
locally in IndexedDB when available and can be moved through editable backups.
Reopening resumes the active case. Static hosting
is sufficient; no application backend exists. Styles, fonts, presets and scripts
are embedded so direct file opening requires no runtime network requests.

## User interaction

Use four navigable steps with in-memory values retained when moving backward:

1. Case details: required case name and learner role; optional description and
   optional course/assignment context through pasted text and/or uploaded files.
2. Case materials: four areas, each supporting pasted text and multiple files.
3. Feedback: a built-in preset and/or uploaded/pasted custom criteria, including
   case-specific expectations for learners in different professions.
4. Export: choose format, build, inspect messages/counts and download.

No interaction-type selector or feedback-timing selector is included. The
experience is a simulated patient encounter. The baseline feedback trigger is
explicit encounter closure; any preset-specific exception must be supplied as
part of the preset, not inferred from an activity label. Feedback remains
separate from patient speech and never becomes unsolicited interview hints.

## Optional course or assignment context

In Step 1, keep Learner role as a short explicit field. Under it, offer an
optional Course or assignment context area with a prominent Paste relevant
excerpts textarea and an upload picker for syllabi or assignment instructions.
Support text and multiple files together, using the same supported extraction
formats, source labels, ordering and removal controls as the other inputs.
Faculty do not need to rewrite a syllabus or supply JSON.

This context informs the hosting model about learner preparation and expected
scope, course objectives, assigned tasks, required deliverables, permitted
resources and appropriate terminology. The SPA extracts and labels supplied
content; it does not use AI to summarize, select relevant passages, infer a
training level or convert objectives into criteria. Encourage relevant excerpts
while permitting supported full-document uploads.

Keep these inputs distinct in the portable model and generated instructions:

- Learner role: who is participating and their explicitly supplied level/scope.
- Course/assignment context: what the learner is preparing for or asked to do.
- Step 3 feedback criteria: what the host should use for preliminary evaluation.

Uploading a syllabus does not activate every outcome as an assessment criterion.
If a syllabus or assignment includes a rubric that faculty want used for
feedback, they also place that rubric or the selected excerpts in Step 3. Shared
source material in both places is permitted and remains explicitly labeled.
Neither the SPA nor the hosting model should silently treat contextual material
as overriding the selected feedback preset or supplied patient facts. The host
flags conflicts or ambiguous scope rather than inventing a resolution.

Clinical examples in a course document are not facts about this simulated
patient. Directions addressed to students remain assignment context: they do
not instruct the patient to complete the learner's SOAP note, reflection or care
plan. Preserve patient speech and concealed feedback boundaries.

Include all retained context text in the selected export, with its own source
labels; count it toward the generated size limits. Do not silently truncate or
summarize a full syllabus to fit. If extraction is unsupported or the selected
export is too large, report that explicitly and let faculty paste excerpts,
remove material or change export format. No course upload is required to build.

## Case material areas

Preserve these exact machine identifiers and show readable labels:

- learner-has-info: already provided to learners; do not print an automatic
  briefing or pretend these facts require rediscovery.
- consultants-have-info: optional, faculty-prepared content for named consultants
  available within the encounter. An empty area creates no simulated consultants.
  Merely naming professions in learning expectations does not create consultants.
- facilitator-observation-reference: concealed observation context, intended
  encounter flow and case-building guidance. It can help interpret evidence but
  does not automatically add rated criteria or authorize intervention. Put
  explicit learner performance expectations in Step 3.
- patient-parameters-and-disclosable-info: patient portrayal and supplied facts,
  disclosed on relevant questions. This area is required.

Each area has a textarea and file picker. Text and files are additive; input-mode
switching must not discard either. File names, extracted content and inclusion
order remain inspectable, with remove/replace controls. Preserve source labels
and paragraph/table structure. No semantic classification, summarization,
deduplication or automatic conflict reconciliation is performed. Legitimate
shared knowledge across areas remains shared.

Initial text formats: pasted text, TXT, Markdown and DOCX paragraphs/tables.
Embedded image alt text and supported PNG/JPEG description metadata are extracted
for explicit review. Faculty use/edit supplied descriptions, provide missing
text, or exclude irrelevant images. Raw metadata is never automatically exported;
no AI service or pixel interpretation is used. Descriptions retain their assigned
source area and do not automatically become patient facts. Unsupported files receive a
specific message. Selectable-text PDF extraction can follow; scanned PDFs/OCR
are outside the initial release. A filename alone never substitutes for contents.

## Where Linda's profession-specific expectations belong

The DH 3880 document's Profession-Specific Roles section defines what learners
from each discipline should identify and potentially recommend. Its primary
home is Step 3 as faculty-provided case-specific feedback criteria. It neither
establishes simulated consultants nor provides new patient knowledge.

Example configuration: learner role Dental hygiene student; built-in preset
Buckeye IPE; pasted dental hygiene expectations; composition Supplement. The
preset supplies the interprofessional framework and its own rating rules; the
pasted material supplies Linda-specific learning targets. Preserve which targets
are source expectations and which criteria are rated; do not fabricate numeric
anchors or weights for added targets. Additional targets can receive narrative
feedback unless faculty explicitly supply compatible rating instructions.

Faculty may paste the relevant profession's section or provide several clearly
labeled profession sections. The SPA preserves those labels and the learner role;
it does not use AI or keyword guessing to select a profession, classify passages
or discard other sections. Exported feedback instructions ask the hosting model
to apply the relevant targets to the stated learner role and available evidence,
flag ambiguous scope, and distinguish patient-interview evidence from later
human-group performance.

Some profession-specific reflection questions are intentionally learner-facing.
They may also appear in learner-has-info if faculty assign them upfront. Shared
information is allowed; the SPA does not deduplicate it or convert expectations
into patient hints. There is no need to duplicate the full criteria block into
Step 2 merely to make it usable for feedback.

## Feedback input behavior

Built-in choices: FNP OSCE, Buckeye IPE and no built-in preset. Custom criteria
support both pasted text and multiple files, using the same extraction behavior.
Label this input "Case-specific expectations or custom feedback criteria" so
faculty can recognize the profession-specific material that belongs here.

- Preset with no custom criteria: export the preset alone.
- Preset with custom criteria: require an explicit Supplement or Replace choice.
- Supplement: retain preset rules and include separately labeled additional
  faculty criteria. Do not invent common weights, scales or aggregate scores.
- Replace: omit the preset and use the supplied criteria instead.
- No built-in preset with custom criteria: faculty-defined feedback only.
- No preset and no custom criteria: no preliminary feedback package.

The form can show which sources are included and which are excluded. The SPA
cannot adjudicate semantic conflicts. Exported feedback instructions require the
host to flag conflicting criteria and withhold affected judgments rather than
silently reconcile them. Custom material can define criteria and permitted
ratings but does not override patient knowledge or authorize facilitator rescue.

Presets are separate, versioned static content packages:

- FNP OSCE: extract reusable encounter domains and qualitative evidence rules
  from the current summary guide. Keep Shannon's gout-specific targets with
  Shannon's Step 3 case-specific feedback content, not in the reusable preset.
- Buckeye IPE: use ipe-bots/review/BUCKIPE-RUBRIC-AND-REPORT.md and its official
  competency references. Preserve its N/O, 0, 1 and 2 local formative anchors,
  selected outcome IDs and no-aggregate/pass-fail rules. Remove housing-specific
  examples from the reusable core; do not import consultation behavior or
  coaching prompts merely by selecting this feedback preset.

Each package owns its criteria, evidence requirements, permitted judgments and
response format. There is no conversion between the two presets. Missing
opportunities are distinguished from omissions; proposed plans are distinguished
from actions; AI-generated dialogue is never human learner evidence. Later human
team discussion cannot be assessed without an explicitly supplied record.

## Compiler work

The current Python compiler consumes structured authored components and
filesystem references. A browser cannot run that implementation directly. The
form also provides broader role-scoped text rather than the current finely
structured record catalog. This requires an explicit input adapter and a browser
implementation of the shared assembly contract.

1. Define a portable in-memory input model for case details, optional labeled
   course/assignment context, the four areas, labeled sources/assets, feedback
   selection/composition and export profile.
2. Map role-scoped content into fixed reusable instruction sections without
   making new clinical decisions. Preserve the existing structured-manifest path
   for Shannon and future richer inputs; the simpler form is an additional path.
3. Share static templates, preset content and output fixtures across runtimes.
   Keep identity/clinical facts out of compiler code. Port deterministic assembly,
   validation, source labeling, size counting and ZIP packaging to the browser.
4. Support optional/no feedback, custom criteria and the independent BuckIPE
   contract; the current single qualitative-guide requirement is insufficient.
5. Generate only the selected export format. Keep the Python implementation as a
   reference and regression path rather than delete it during migration.

No AI API, credential provisioning, external model calls or AI extraction is
required for any of these steps. The exported package supplies instructions to
the user's eventual hosting model. Prompt boundaries do not implement technical
confidentiality in that host.

## Export contract

- Single file: one complete instruction document under 50,000 characters.
- Instructions plus case skill packages: main instructions under 20,000
  characters, selected reference/feedback content and explicitly supplied assets
  in the case skill ZIP. Package members and setup instructions are explicit.
- Display actual generated counts. Retain conservative UTF-16/newline/UTF-8 checks
  and make budgets explicit profiles. Preserve the existing Shannon CLI's
  8,000-unit base and 48,000-unit standalone profile unchanged.
- Overflow blocks the affected export and offers format switching or input
  revision. Never silently remove case facts, supplied criteria or source data.
- Learner-facing upfront content remains distinguishable from concealed runtime
  context. Provide an optional extracted briefing download only if desired later;
  packaging does not claim the learner has actually received it.
- No image bytes are represented as a working inline attachment in a text-only
  export. Missing visual descriptions/delivery routes are reported explicitly.

Build feedback stays on the export step: actionable errors, output counts,
included feedback sources, filenames and setup directions. There is no mandatory
clinical-review wizard, grading dashboard or live rehearsal screen.

## Buckeye UX design and asset plan

Apply the explicitly requested personal Buckeye UX skill. Adapt its shell and
spacing patterns rather than importing the behavior of another application.
There is currently no web entry point, framework, package metadata, public asset
layout or application CSP to preserve; the current project is a Python/Markdown
pipeline and has no Git metadata/repository URL. Do not invent a GitHub link.

- Slim dark organization strip above a white app-name row; use the supplied
  Ohio State identity for this university-related tool without adding seals,
  department names or official university navigation. Keep identity configurable.
- Light gray canvas, white cards, quiet gray borders, dark ink and restrained
  scarlet primary actions. Center the shell with responsive gutters.
- BuckeyeSans interface text and a concise BuckeyeSerif hero heading.
- Four small numbered steps with aria-current derived from the active screen.
  Use the existing paste/upload controls and preserve entered text across steps.
- Static maintained revision metadata, not the visitor's current date. The design
  preview identifies its own revision; the app will identify its actual release.
- Footer: Built with Buckeye UX. Add browser-local processing assurances only
  after the implemented app's file handling/network behavior has been verified.
- Use the skill's bundled BUX 1.7.1 CSS, JS, icons and fonts together for the
  actual app; preserve copyright notices and record provenance in asset docs.
  Keep vendor and scoped app styles separate; do not introduce a new framework
  solely for styling. No BUX version string is displayed in the product header.
- Define same-origin asset/CSP behavior for the chosen static build. Verify actual
  font loading, keyboard focus, skip navigation, long names, narrow layouts,
  reduced motion, and dynamic feedback/export states. Use real disabled controls
  and render all uploaded/pasted content safely as text.

The preview embeds the supplied regular font faces and adapts the shell styling
without installing a complete web app or vendor bundle. Its copyright/provenance
note is retained in the source. Its GitHub link and unverified processing badge
are omitted deliberately. The style change does not alter export formats,
patient facts, feedback judgments, data retention or input limits.

## Implementation sequence and completion checks

### Foundation and preset packaging

Update active source references for the user's renamed folders; keep historical
snapshots historical. Restore source checks and prove Shannon runtime payloads
remain identical. Establish the portable input/export contracts and separate
FNP and BuckIPE preset packages with version/source metadata. Define Step 3
case-specific expectations separately from general preset criteria and Step 2
facilitator observation context.

Completion: old CLI builds and regression checks pass; new preset contracts and
role boundaries have focused tests; no clinical content is embedded in code.

### Browser compiler and paste-first workflow

Implement case details with optional pasted course/assignment context, four case
text inputs, custom feedback composition, selected export generation and
in-memory navigation. Provide browser assembly fixtures
matching the reference compiler where contracts overlap. Implement the Buckeye UX
shell and bundled assets at this stage, with browser-local claims gated on verification.

Completion: both formats build from pasted inputs; selected/no/custom feedback
combinations work; replacing criteria really excludes the preset; overflow and
missing inputs block download without deleting entered material.

### File and asset support

Add local TXT/Markdown/DOCX extraction, multiple-file ordering/removal, source
labels and explicit asset packaging. Support course/assignment uploads in Step 1
as well as case materials and feedback uploads. Plain text is never treated as HTML or
executed as build directives.

Completion: paragraphs/tables and supplied values survive extraction; unsupported
formats are reported; text and uploads are both included; working files are not
uploaded. Their extracted editable representation is now persisted locally
under the local-saving follow-up contract.

### End-to-end verification

Use Shannon as the regression case and faculty-selected Linda excerpts as the
simple-form case. Test keyboard navigation, small screens, long filenames,
empty optional sections, custom feedback combinations, file replacement,
overflow, ZIP contents and download payloads. For Linda, confirm that Step 3
profession-specific targets guide feedback without leaking into patient speech
or creating simulated consultants. Test that syllabus examples do not become
patient facts, contextual outcomes do not silently become feedback criteria,
context is included in output counts and an empty context field is valid. Check
actual BUX font faces, focus and CSP. Then test actual exported packages
in the intended chatbot host, including feedback attribution and closure.

Completion: browser workflows and reference checks pass; actual host observations
are documented separately from local package correctness. No new clinical or
assessment-validity claim follows from a successful build.

## Mockup scope

The updated Buckeye UX in-conversation design demonstrates case details, the four
input areas, independent presets/custom criteria and export/result layouts. It
uses short illustrative Linda excerpts, placing profession-specific learner
expectations in Step 3 and a separate observation-context example in Step 2. It does not extract documents, compile
case content, download a real package or implement persistence. Its result
examples are labeled as such. The Buckeye UX mockup predates the latest optional
course/assignment-context field; the written Step 1 contract above is authoritative
for the initial build. Review the flow and field behavior before building the
application.


## Maintenance and next-build checklist

1. Read this plan, HANDOFF.md and pipeline/README.md. Use the Buckeye UX skill at
   /Users/hsiao.62/.codex/skills/buckeye-ux/SKILL.md and its bundled assets.
2. Active source references have been reconciled with the renamed folders and
   the Shannon baseline reverified. Keep original-source and runtime payload
   checks when extending either compiler; historical snapshots remain unchanged.
3. The independent FNP/Buckeye IPE presets and role-scoped adapter are implemented
   in web/content/ and web/compiler.mjs, including optional course/assignment context.
   Preserve each preset's anchors and the custom Supplement/Replace behavior.
4. The paste/upload workflow and selected-format downloads are implemented. Next
   conduct faculty trials of exported packages in the intended chatbot host, and
   verify other browsers as needed. AI services and a live chatbot remain outside scope. Local case persistence
   was added in version 2026-10-27-5 (see the local-saving follow-up). Potential Vercel hosting is configured but not deployed.

Reference design:
/Users/hsiao.62/.codex/visualizations/2026/10/26/01a17962-e0f4-7460-b72b-922b9dcbd668/patient-builder-buckeye-ux.html

Reference feedback material:
/Users/hsiao.62/Developer/skills/ipe-bots/review/BUCKIPE-RUBRIC-AND-REPORT.md

Linda source for faculty-selected excerpts:
/Users/hsiao.62/Downloads/DH 3880 Interprofessional Case for assignment development.docx


## Image and export-comparison follow-up October 27

The user confirmed retaining fully offline ingestion, with extracted descriptions
and missing-description flags rather than an online AI service. Implemented in
version 2026-10-27-2: Word main-body alt titles/descriptions and available raster
bytes, supported PNG/JPEG description fields, explicit use/edit/exclusion controls,
missing-description build checks, and text descriptions usable by a chatbot that
cannot generate/display images. Raw metadata is author-review evidence only.

The user's Shannon export also exposed duplicate Choice/Fallback representations
and concatenated text boxes. Those extraction-structure issues are corrected;
semantic repetition across supplied materials is still preserved. Re-import and
rebuild to apply fixes. SHANNON-EXPORT-COMPARISON.md records the static comparison
with the unchanged curated Shannon instructions, including full grading-key
exposure, source conflicts, missing explicit case-specific targets and record
release-policy differences. No clinical correction or chatbot equivalence is
inferred from the fixes.


## Online simulation refinements implemented October 27

Version 2026-10-27-3 packages explicit human timekeeping and online-simulation
boundaries without converting a supplied office case into clinical telehealth.
No JavaScript timer, automatic turn-based closure or new interaction/timing field
is added. Live human warnings and end instructions are distinguished from quoted
course logistics. Feedback distinguishes actual observations, learner-stated
simulated actions and intentions according to supplied criteria.

Generic record policy now separates discovery from delivery; direct requests,
firm plans/orders/recommendations and consent to a supplied available test trigger
same-response delivery unless faculty conditions restrict them. Hypothetical,
negated, cancelled, wrong-site and unavailable tests do not unlock invented
results. Ownership, dates, exact values, source roles, existing-content tracking
and no unsolicited rescue remain explicit. The browser baseline adds no random
recall variation. The four-step help text and authored setup guide explain source
labeling, concise Step 3 targets, faculty clarifications and fresh-chat checks.
