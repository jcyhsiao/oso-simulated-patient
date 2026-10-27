# Simulated patient pipeline handoff

Updated October 27, 2026. Instructor/developer context only: do not paste this handoff into a patient agent or give it to learners. Paths are relative to this project so the entire folder can be moved. This document consolidates the earlier incremental notes and describes the current state.

## Direct Canvas AI Assistant compilation, restored runtime baseline & closed-world anti-hallucination rules (October 27, 2026)

- **Direct-Only Compilation for Canvas AI Assistant (No AI Middleman):**
  - Removed the intermediate Gemini/Copilot synthesis prompt workflow after live testing showed that external chat UIs could not reliably trigger markdown file downloads and that LLM prompt synthesis stripped critical runtime rules (such as `"Patient-provided record:"` vs. `"Simulation facilitator:"` ownership) and hallucinated unscripted clinical findings.
  - Step 4 of the Web Builder (`web/compiler.mjs`, `web/app.mjs`, `web/index.template.html`) now compiles a single production-ready Canvas AI Assistant instruction file (`${slug}-canvas-instructions.md`) directly in the browser and enforces a strict `< 48,000` maximum-unit budget (`Math.max(utf16, crlf, utf8)`).

- **Restored `ce18b42` Runtime Baseline + Closed-World Anti-Hallucination Hardening (`web/content/runtime.md`):**
  - Restored all original tested runtime sections from commit `ce18b42` (`ONLINE SIMULATION AND HUMAN TIMING`, `ROLE AND KNOWLEDGE BOUNDARIES`, `NATURAL ENTRY, PROGRESSIVE DISCLOSURE AND UNSCRIPTED QUESTIONS`, `LEARNER AND COURSE CONTEXT`, `RECORDS, FINDINGS AND AUTHORIZED DELIVERY`, `EXPLICIT CONSULTANT CONTENT`, `PLANS AND CLOSURE`, `EVIDENCE AND PRELIMINARY FEEDBACK`), tightened to `11,977` maximum units (`12,044` bytes).
  - Hardened the three live-test failure modes identified in Canvas AI Assistant:
    1. **Unscripted patient history/symptom questions:** Explicit rule distinguishing unscripted symptom inquiries (respond with a natural lay negative, e.g., *"No, I haven't noticed anything like that"*) from unscripted biographical/lifestyle/history details (respond briefly in character with lay uncertainty, e.g., *"I'm not really sure"* or *"Nothing special that I can think of"*).
    2. **Unsupplied physical exam, laboratory, or imaging requests:** Explicit zero-fabrication rule prohibiting invented normal or abnormal exam findings, vitals, labs, or imaging; unsupplied requests return `"Simulation facilitator: No scripted findings or records are available in this case for the requested examination or study."`
    3. **HPI / OLD CARTS tables & grader commentary:** Explicit rule treating each row of an HPI or OLD CARTS table as a separate attribute disclosed only when specifically asked (1–2 sentences per turn), and ignoring grader-facing headings (such as *"If asked during the visit"*) alongside section-level boundary reminders in `web/compiler.mjs` (`AREA_BOUNDARIES`).

- **Under 48,000 Units Optimization (Shannon Anderson Benchmark):**
  - `web/imports.mjs`: Normalized horizontal whitespace runs (`/[ \t]+/g` -> `' '`) in `paragraphText()` so Word layout tab sequences (`<w:tab/>` runs in `Faculty Sheet for Gout OSCE SP 2026.docx`) are stripped on import.
  - `web/compiler.mjs`: Added `compactSourceText()` to normalize horizontal whitespace, collapse redundant blank lines between consecutive bullet items, and collapse `\n{3,}` to `\n\n`, plus `pruneProfessionalScope()` to strip authoring/review metadata from role profiles.
  - Compiling all 9 `.docx` files in `case-files/fnp-shannon-anderson` with the `FNP OSCE` preset and `Primary Care` role profile produces **44,282 maximum units** (~40,500 maximum units when the duplicate March 2025 lab report is not uploaded twice), well under the `48,000` unit limit.

- **Modular IPE Professional Roles Library in Step 1:**
  - Embedded 11 case-agnostic professional role profiles into `web/content/professionals/` (Dental Hygiene, Dentistry, Dermatology, ENT, Environmental Health, Housing Advocacy, Nursing, Occupational Therapy, Physical Therapy, Primary Care, Social Work).
  - Implemented multi-select toggle chips, on-the-fly custom role creation, editable scope accordions, and automatic synchronization with `#learner-role`.
  - Added Buckeye UX `.sp-context` AI provenance notices indicating profiles are starter drafts for faculty review.

- **Verification:**
  - All 19 Node unit tests (`npm test`, including an automated regression test compiling `case-files/fnp-shannon-anderson` under 48,000 units) and all 65 Python unit tests (`python3 -B -m unittest discover -s tests`) pass.
  - Standalone build (`web/dist/simulated-patient-builder.html`) and static entry (`web/dist/index.html`) rebuilt byte-identically (`1,508,041` bytes each).

## Web builder table extraction and visual exam scoping (October 27, 2026)

- **Visual vs. diagnostic record scoping**: Resolved model oversharing where asking to see or examine the left foot triggered an immediate verbatim dump of all patient-held laboratory and radiology records.
  - In `web/content/runtime.md`, `copilot-agent-instructions.md`, `instructions/result-release-policy.md`, and `packages/fnp-shannon-anderson/SKILL.md`: explicitly established that visual and physical inspection requests (e.g. asking to see or inspect the foot/toe) trigger ONLY the visual appearance (lay description of redness/swelling or reviewed image description) and NEVER trigger or release laboratory results, blood tests, or radiology reports.
  - Added strict matching: a lab request/order releases only the lab panel; an X-ray request/order releases only the X-ray report. Never bundle unrequested records or dump the entire chart.
- **Markdown table extraction & formatting**:
  - In `web/imports.mjs`: fixed DOCX table extraction. Word tables parsed into Markdown previously omitted the delimiter row (`| --- | --- |`), preventing markdown parsers and chatbots from rendering them as tables. Added automatic insertion of `| --- |` after the header row.
  - In runtime instructions: instructed the model to format structured numerical test results and laboratory panels cleanly in Markdown tables (`| Component | Value | Reference Range | Units |`) rather than dumping unformatted text blocks.
- **Verification & Rebuilds**:
  - Web distribution recompiled (`web/dist/simulated-patient-builder.html` and `web/dist/index.html`). All 18 `npm test` passed.
  - Single-file package rebuilt (`fnp-shannon-anderson-single-file.md` at 47,432 UTF-16 units, within <= 48,000 budget; `copilot-agent-instructions.md` at 7,884 units within <= 8,000 budget).
  - All 65 Python unit tests passed (`python3 -B -m unittest discover -s tests`).
  - Reference views verified (`python3 -B scripts/extract-reference-views.py --check`).

## Local case saving implemented: browser 2026-10-27-5

Read LOCAL-CASE-STORAGE-PLAN.md for the implemented contract. The toolbar adds
My cases, Start new case, Save now, and editable case backup download/open.
IndexedDB saves incomplete work automatically (750 ms debounce, five-second
maximum wait), with startup resume of the active case and current step. Cases
retain source text/order, images, reviewed descriptions, exclusions and feedback
settings. Start new case saves first and resets to true defaults; failures keep
work open with retry, backup and explicitly confirmed discard options. Saved
cases can be opened, duplicated, searched or deleted; deletion is confirmed.

case-storage.mjs provides the versioned snapshot codec, transactional revision
checks, availability probe and .spcase.zip backups. case-session.mjs handles
serialized autosave and UI actions. app.mjs invalidates old imports on switching
and reconstructs previews. Source archives are not retained, only their extracted
representation and available image bytes. Interrupted imports restore as sources
needing reattachment. Generated downloads are rebuilt, not restored.

Selected preset text/version is saved with each case. The compiler consumes that
snapshot until faculty explicitly update to the current built-in preset. Two-tab
revision conflicts never silently overwrite the saved case. Unknown schema
versions remain stored and downloadable; they are not partially opened. No cloud
sync or network upload is added. Direct-file storage belongs to this browser/file
location; use backups when moving the app or changing origin/browser.

Verification: 18 unit tests; offline direct-file case and image/export browser
checks; local static-HTTP case flow; actual editable backup downloads with exact
image bytes and compiler-output round trips; two-tab conflict and quota/denied
storage checks, interrupted-import isolation, explicit preset updates and full
browser restart with a persistent profile. Chromium is verified; other browsers
remain unverified.

## Browser update 2026-10-27-4

Located the faculty-supplied NPSCA in connected Drive: `npsca_instrument_rev041024.docx`, revised April 10, 2024, file ID `1h3I3pYGwZP4GtazWNF-T8hQTdDwRMAtd`. The browser FNP preset now paraphrases all 17 items in the original four domains for qualitative feedback. It retains NONPF attribution and source link; no numeric scores, developmental ratings or validated administration claims. Original faculty OSCE targets remain separate case-specific supplements. Historical CLI summaries below predate this discovery and retain their frozen behavior.

Embedded document images now have thumbnails, larger previews in collapsed native accordions, review status, and a per-document exclude-all checkbox (mixed state supported). Descriptions survive exclusion. PNG/JPEG previews are local blob URLs, revoked on rerender/removal/page exit; unsupported and linked visuals retain an original-document fallback. No image interpretation or external requests are added.

## Latest planning clarification

The user's intended experience is an online simulated-patient encounter; remote
delivery is implied. Do not conflate platform delivery with a clinical telehealth
setting or impose universal home/video/remote-exam restrictions. A supplied office
case may remain an office-based clinical scenario simulated through chat.

ONLINE-SIMULATION-REFINEMENT-PROPOSAL.md proposes generic simulation boundaries,
stronger record-release behavior and faculty/hosting-model responsibilities.
The four-step form remains unchanged. The user approved the changes and confirmed
a human timekeeper. Version 2026-10-27-3 now includes the runtime/help/setup
refinements; original clinical material and the curated Shannon CLI remain
unchanged. Read it with WEB-BUILDER-PLAN.md before further refinements.

## Current browser runtime version 2026-10-27-3

Online delivery preserves the supplied fictional clinical setting. A human
assessor/timekeeper administers warnings and encounter duration; the bot does
not invent elapsed time, provide a turn-based countdown or enforce a timer.
Live human warnings/end signals are distinct from quoted course directions.
Scripted findings and learner-stated simulation actions are not proof of an
actual physical examination; supplied criteria determine what evidence counts.

Generic records policy now explicitly covers prior-evaluation discovery versus
result delivery; matching direct requests/firm plans/consent deliver available
scripted contents in the same response unless faculty release conditions restrict
them. Existing dates, exact values, ownership and no unsolicited rescue are
preserved, without case-specific facts or new recall randomness in browser code.
Help text asks for labeled records and concise Step 3 targets. The authored setup
guide includes human timing and fresh-chat acceptance scenarios. Thirteen web
tests and 66 Python tests pass; curated Shannon runtime payloads remain identical.
Actual hosting-model behavior and faculty source conflict resolution remain open.

## Initial web builder now available

Open `web/dist/simulated-patient-builder.html` directly in a current browser.
The self-contained HTML embeds BUX assets, runtime templates, independent FNP and
Buckeye IPE presets, and application code. `web/dist/index.html` is identical for
static hosting. No AI service, runtime fetch, backend or accounts. Local case
saving was added in version 2026-10-27-5; see the current update above.
Optional Vercel static configuration is present; no deployment has occurred.

The four-step workflow includes optional course/assignment context; all four
material areas; custom feedback uploads/text with explicit Supplement/Replace;
and selected single-file or modular exports. TXT/Markdown/DOCX paragraphs/tables
and explicit patient PNG/JPEG assets are supported. Images need reviewed descriptions; stored alt text is extracted when available,
with a patient disclosure condition or the relevant-visual-request default. PDF/OCR, tracked-change documents and automatic semantic
classification are unsupported and reported. Extracted content is inspectable.
See `web/README.md` and the updated `WEB-BUILDER-PLAN.md` for details.

Active references were updated after the user's folder moves. Shannon runtime
text/image/catalog payloads still match their unchanged baseline. The generated
faculty source-view path and source-map hashes were refreshed for moved files;
no original Word contents or clinical runtime text changed. On October 27,
66 Python tests, 13 web compiler/ZIP/reference/metadata tests, manifest and reference-view
checks passed. Chromium direct-file tests ran offline, imported the supplied Linda
source as an extraction check, preserved numeric/table text, and verified actual
Markdown/ZIP downloads and image bytes. Static HTTP workflow also passed. No
actual chatbot-host, other-browser or Vercel deployment validation occurred.

## Latest browser update and comparison

Version 2026-10-27-2 retains offline-only ingestion, explicitly confirmed by the
user. It extracts stored Word image alt titles/descriptions and supported PNG/
JPEG description metadata, shows it for review, and lets faculty use/edit it,
supply a missing description or explicitly exclude an image. Unresolved visual
descriptions block export. Raw metadata is not automatically published; no AI
vision service or image generation exists. Description text is sufficient for
a text-only hosting chatbot and stays within its assigned source area.

The user supplied a generated Shannon export for comparison. See
SHANNON-EXPORT-COMPARISON.md. It identifies Word Choice/Fallback duplication and
concatenated text boxes (now fixed), plus source conflicts, unnecessary full
answer-key content, missing explicit Step 3 case targets and differences from
the curated record-release/learning behavior. Re-import original sources to get
the structural fixes; a previously pasted/exported file is not automatically
changed. The original curated Shannon runtime remains unchanged.

## Start here

The project builds simulated patient experiences from faculty materials. Shannon Anderson is the only reference case currently implemented: a 65-year-old retired teacher with left-foot/toe pain in an MSN FNP telehealth encounter. The shared compiler now reads supplied case/activity content, metadata, visual references and format variants. Shannon and independent synthetic cases use the same build path; no Shannon-specific Python transformations remain in orchestration. Arbitrary case importing, a faculty authoring application and real cross-case/profession validation are not implemented. The current agreed sequence is in SIMULATION-PIPELINE-ROADMAP.md; it supersedes older priority ordering below.

Both existing deployment formats include normal PRACTICE, explicit OBSERVE demonstrations and a source-grounded qualitative post-interaction summary. No separate learning deployment is needed. Clinical case revision remains `2026-10-21-copilot-pilot-7`; learning behavior was introduced as `2026-10-22-learning-1`. These identifiers describe existing content, not a new clinical revision on October 26.

## Live test updates (October 27, 2026): Progressive disclosure, non-anxious portrayal, and direct patient record release

Following user test run feedback:
1. **Strict Progressive Disclosure**: The simulated patient now adheres to a strict progressive disclosure model. Shannon answers only the specific question asked and does not volunteer unasked symptoms, onset, severity, relief attempts, sleep impacts, or history. An opening greeting or "What brings you in?" gets only the concise chief complaint ("I am having pain in my left foot."). Layperson language is strictly enforced; Shannon has an ordinary non-clinical understanding and does not use or understand clinical jargon (e.g., no "gout", "hyperuricemia", "NSAID", "metatarsophalangeal", etc.).
2. **Calm, Non-Anxious Demeanor & No Student Assessment**: Shannon's portrayal is calm, polite, and cooperative. She is uncomfortable from the toe pain, but she is NOT anxious, panicked, or demanding, and does not interrogate the clinician or demand to know every detail. Crucially, runtime instructions explicitly clarify that **it is NOT the simulated patient's responsibility to assess, quiz, or test the student** during the encounter. Formative evaluation is strictly reserved for the separate post-closure summary.
3. **Direct Patient-Held Record Release**: The patient directly divulges records that she holds (the January 29, 2026 encounter lab report and written left-foot X-ray report) under `Patient-provided record:` upon a relevant request or firm order/plan. The simulation facilitator does **not** step in to provide records that the patient holds. The artificial 10% recall lapse and same-response facilitator rescue have been retired in favor of direct patient delivery. The `Simulation facilitator:` role is strictly reserved for scripted objective findings unavailable to both participants (e.g., physical exam findings on request) or historical archives (March 2025 records) if requested.

| Deployment | Files | Verified size |
|---|---|---|
| Persistent instructions only | `fnp-shannon-anderson-single-file.md` | 46,884 UTF-16 units |
| Base plus skill ZIP | `copilot-agent-instructions.md` + `packages/fnp-shannon-anderson.zip` | Base 7,255 units; skill root 8,111 units |

All 65 tests in the Python suite pass, reference views match, and pipeline manifests validate cleanly.

Replace the entire previous deployment; never append instructions or combine formats. Test a fresh chat. Faculty distribute the original learner intake/chart separately from `case-files/fnp-shannon-anderson/learner-info-pre-interaction/`.

The standard ZIP contains six members: `SKILL.md`, `references/case.md`, `references/result-release.md`, `references/learning-modes.md`, `references/summary-guide.md`, and `assets/foot.jpeg`. The standalone includes all required text but no functioning image or external image URL. Neither format needs GitLab retrieval.

## User decisions to preserve

The base purpose is creating simulated patient experiences. Compose four logical levels:

1. Experience template, such as simulated telehealth patient.
2. Course context, such as an FNP syllabus.
3. Activity/assessment, such as OSCE directions and rubric.
4. Clinical case, such as Shannon Anderson.

Do not permanently nest case facts under one course. These levels are the agreed design; they are not yet four fully generalized executable configuration layers.

Faculty submission formats cannot be prescribed. Preserve the four original source folders: `learner-info-pre-interaction`, `sp-give-info-if-appropriately-prompted`, `grader-give-info-if-needed`, and `sp-only-reference-expected-flow`. `other-activity-parameters` holds supporting syllabi, directions, rubrics or other materials in their existing formats. No mandatory intake form or JSON for faculty. A comprehensive source document may inform several roles/levels.

Faculty/facilitator retains the comprehensive view, including information available to give learners as needed. Role boundaries govern speech and release, not faculty visibility. Requested scripted findings/records are normal information delivery; instructional rescue requires faculty-defined dead-end/off-track triggers. A missed rubric criterion alone is not permission to coach. Do not place concealed expectations into patient dialogue.

## Learning modes now included

- Normal greeting starts PRACTICE without an activation command.
- OBSERVE in a fresh chat generates labeled AI clinician/patient turns, 6–8 exchanges per response. CONTINUE advances; STOP OBSERVE ends it. Generated clinician behavior is never learner performance.
- Explicit/natural closure, END ENCOUNTER or STOP yields a patient farewell and separate summary. A plan or invitation for patient questions alone does not close the visit. Mid-visit OBSERVE/summary requests require a decision to end practice before switching.
- Summary compares eight source-derived domains using demonstrated, partly demonstrated, not demonstrated or not assessable, supported by transcript evidence, then strengths/priorities/reflection. Missing context and unobservable physical actions are not evidence of inability.
- The faculty sheet lacks a complete quantitative instrument; NPSCA was unavailable when this historical CLI guide was authored; the browser preset now uses the supplied instrument (see latest update). No numeric grades, weights, passing thresholds or validated assessment claims. Clinical expectations are source-attributed and pending faculty review; dose regimens are excluded.
- After answer-revealing review/demonstration, independent practice needs a fresh chat; exposure to the case still remains. Prompt boundaries do not guarantee confidentiality. This package is not a secured summative examination.

See `SHANNON-LEARNING-TEST.md` for setup and live acceptance scenarios. Full mode instructions: `instructions/learning-modes.md`. Source-derived guide: `pipeline/activities/fnp-telehealth-practice/summary-guide.json`, pinned to the original faculty-sheet SHA-256; source changes require reconciliation before build.

## Build and verification

Run from the project root, using standard-library Python:

```sh
python3 -B scripts/build-simulation.py --activity pipeline/activities/fnp-telehealth-practice/activity.json
python3 -B scripts/validate-pipeline.py
python3 -B scripts/extract-reference-views.py --check
python3 -B -m unittest discover -s tests
```

`build-copilot-case.py` reads its default from `pipeline/default-build.json` (currently Shannon) and accepts `--activity`; the shared entry point requires explicit activity selection. `build-learning-case.py` is only a compatibility entry point to the standard builder. It creates no alternative deployment. Redundant learning-only exports were removed.

Verified October 26, 2026: rebuild succeeded; all 66 tests passed; manifest checks and reference reconstruction passed; ZIP integrity passed and all six members matched tests. Clinical tables and canonical photograph preservation are checked locally. A new isolated rebuild checks all Shannon runtime files and the record catalog against pre-refactor SHA-256 baselines; ZIP member payloads match, while archive metadata may vary. Independent synthetic-build tests cover supplied identity metadata, arbitrary domain counts, custom visual/document paths, approval/source binding, explicit format variants, selected assets, configurable legacy defaults, source inventories and invalid composition/output rejection. No live chatbot/API trial, institutional deployment or clinical validation occurred in this handoff session.

The screenshot on October 22 showed a 50,000-field rejection despite a visible count just below that limit. Previous output could exceed the limit under CRLF or UTF-8 counting; actual host counting remains unverified. Current standalone is 47,442 LF/UTF-16 units, 47,883 CRLF/UTF-16 units and 47,554 UTF-8 bytes. Builder/tests enforce a conservative 48,000 budget under all three measures. Trim repeated standalone guidance rather than clinical data when adding text. Host acceptance after the trim has not been confirmed by the user.

## Active author inputs and generated outputs

| Input | Responsibility |
|---|---|
| `pipeline/cases/shannon-anderson/case.json`, `components.json`, active `runtime/` and referenced `clinical/` paths | Supplied metadata and ordered authored runtime components; some mixed inline facts/rules remain |
| `pipeline/cases/shannon-anderson/records.json` | Stable record identity/date/aliases and exact-content references |
| `pipeline/activities/fnp-telehealth-practice/activity.json`, `runtime-policies/`, `record-release.json` | Composition, selected policy inputs, record ownership/availability/discovery |
| `pipeline/activities/fnp-telehealth-practice/facilitator.json` | Comprehensive faculty source access and disabled instructional-intervention draft |
| `pipeline/activities/fnp-telehealth-practice/activity.json` → `feedback` and `deployment` | Executable guide/mode selection, packaging contract, inventory rendering, output identities and assets |
| `standalone_instructions_ref` and component/fragment format variants | Supplied inline-specific text, replacing build-time sentence transformations |
| `pipeline/default-build.json` | Explicit default selection for legacy commands and the validator |
| `pipeline/activities/fnp-telehealth-practice/summary-guide.json` | Source-grounded formative summary domains, limitations and source hash |
| `copilot-agent-instructions.md` | Hand-authored shared/base runtime instructions |
| `packages/fnp-shannon-anderson/SKILL.md` | Hand-authored skill root and portrayal examples, despite its location under packages |
| `instructions/result-release-policy.md`, `instructions/learning-modes.md` | Shared release behavior and learning-mode boundaries |
| `cases/case-b-visual-description.json` | Approved location/appearance, fallback and alt-text review |
| `assets/case-b-left-foot.jpeg`, original Word documents | Original photograph and faculty evidence; preserve unchanged |

Generated: standalone file, ZIP, packaged references/image and `cases/case-b-diagnostic-records.json` (compatibility catalog for transcript reviewer). Do not edit these directly. The historical `cases/case-b-shannon-anderson.md`, former `components/` files, old activity `policies/` and retired compatibility source are migration snapshots. Current manifests identify the active paths. See `pipeline/cases/shannon-anderson/migration/README.md`: the initial pre-adapter equality test was replaced with the unchanged reviewed runtime hash plus an isolated full rebuild that first removes generated outputs. Original-source, clinical-table and image checks remain in place.

Builder assembly: `scripts/pipeline_components.py` reads explicit case components, activity bindings and per-format variants, joins record facts/release rules by ID and rejects unsupported scoring/intervention activation. `scripts/simulation_builder.py` assembles and packages the provided text using `native-v1` for all cases. `scripts/authored_text.py` fills explicit scalar placeholders once; unknown/private/malformed references fail. `scripts/visual_inputs.py` validates supplied case identity, approved visual fields, reviewed source metadata and selected photograph identity without body-site or file-path assumptions. The old `shannon_compat.py` module has been retired; its inactive source snapshot is preserved with the migration record. Existing guarded transformations were moved into authored runtime content through a one-time migration from active inputs, without reading generated exports/reference views. `scripts/learning_modes.py` reads selected feedback with case/activity/source-hash checks and no fixed domain count. There are no case-specific Python sentence replacements or section slicing in the build. Metadata fields do not imply newly implemented runtime switches. This migration introduces no new clinical or patient behavior; the advocacy/jargon examples remain pending.

`pipeline/reference-views/shannon-anderson/` contains generated author review views, source hashes and original faculty-sheet text. They derive from the generated case and must not feed back into the builder. The section files reconstruct that case byte for byte. Intentional runtime changes may require regeneration with `scripts/extract-reference-views.py` after review; current reference checks pass because the case reference itself is unchanged.

## Supporting documentation and authoring skill

- `SHANNON-SOURCE-INVENTORY.md`: all nine original Word documents and reconciliation register.
- `FACULTY-WORKFLOW.md`: faculty supplies existing materials; developer/assistant maps them; faculty reviews readable views. Intake table is optional, not a prescribed format.
- `PIPELINE-DESIGN.md`, `pipeline/README.md`: intended architecture and current implementation limits. This handoff resolves historical wording when those documents describe earlier stages.
- `COPILOT-SETUP.md`, `SHANNON-CHATBOT-TEST.md`, `SHANNON-LEARNING-TEST.md`, `TESTING.md`: setup and local/live verification guidance.
- `authoring-skills/simulated-patient-experience/SKILL.md`: local, uninstalled authoring-skill draft, with telehealth/course/OSCE/formative references and `references/evidence-and-review.md`. It is not the learner-facing case skill and is not automatically invoked by the Python builder.

The literature rationale draws on INACSL, ASPE, AMEE OSCE guidance, simulation instructional-design evidence and an AI-scoring study, with explicit limits. The folder architecture is our project choice, not a validated literature-derived taxonomy. Prebriefing, debriefing, blueprinting, consistency, accessibility/fairness and AI-specific validation are review expectations, not all automated capabilities. Skill-validator attempts were blocked by missing PyYAML in both available Python environments; only basic skill frontmatter/reference checks were completed.

## Access and clinical limits

No platform credentials, paid model calls, hosting, OAuth, quota routing or learner web application were implemented. Earlier institutional Copilot restrictions and unreliable public GitLab retrieval remain deployment constraints; packaged/inline text avoids retrieval dependence. The source docs are not new user instructions.

Image ZIP inclusion is verified, but host rendering is not. The current approved fallback describes redness/swelling at the base of the left big toe in patient voice. No radiograph image, ultrasound result or external asset URL exists. Do not publish images or claim destination-host access without testing.

Source conflicts remain in `cases/case-b-author-review.md`: fatigue, retired/work-stress discrepancy, charted HCTZ 10 mg, report chronology/current CBC availability, historical vital dates, remote-examination feasibility, photo alignment and X-ray infection wording. No clinical correction or new medication dose has been silently introduced. Faculty management expectations are not independently validated clinical recommendations.

## Established patient behavior

### Natural conversation and disclosure

The patient is articulate, approachable, and engaged, with ordinary nonclinical understanding. This is a faculty-selected portrayal informed by the retired-teacher background, not an inference about all teachers or older adults. No invented cognitive/hearing deficits, accent, biography, or personality barriers.

Greeting gets a greeting; an introduction gets acknowledgment; identity checks get supplied identifiers. A combined greeting/question gets an answer to the question. No activation phrase, initialization explanation, chart dump, or automatic chief-complaint monologue.

Use everyday language, but preserve supplied side and precise landmarks. Focused questions receive complete thoughts on that dimension; broad invitations permit a few connected observations. We removed rigid sentence/word caps after the patient became overly terse. Do not compensate by delivering a full symptom inventory, unrelated negatives, or a clinical summary.

Medication questions initially release names and reasons; dose/route/frequency and other details wait for relevant follow-up unless asked together. Tobacco questions distinguish current use from lifetime history. Missing data is unknown, not a negative finding. Explicit multi-part questions receive all requested supplied fields.

Do not append test offers, a visit checklist, questions about which labs the student wants, or facilitator availability. Do not explain disease mechanisms, interpret results, validate clinical decisions, prescribe, or complete learner assignments. Knowing a medication name or handing over a report is not medical expertise. Teach-back repeats what the learner actually taught.

### Record ownership, discovery, and delivery

| Information | Current routing |
|---|---|
| Intake/chart and already supplied content | Already learner-available; patient confirms known facts naturally, no facilitator or artificial lapse |
| January 29, 2026 laboratory report and written left-foot X-ray | Patient-held existing records; normally separate `Patient-provided record:` artifact after natural patient speech |
| March 4, 2025 historical laboratory panels | Facilitator-only existing records, only on relevant request if unavailable to learner and patient |
| Scripted objective findings not available to either participant | Separate `Simulation facilitator:` finding after a relevant request; no claim of actual remote auscultation/palpation |

Questions about previous evaluation of the **current complaint** should elicit the relevant existing X-ray/report without requiring its name. Example: “I've had an X-ray of this foot, and I have the report here.” Do not invent a clinician, facility, visit date, advice, or ultrasound history. A similar-prior-episode question is different: never having this pain before does not imply no testing for this episode.

**Discovery is separate from result delivery.** Mentioning the test/possession alone does not release the full report, mark its contents known, or consume recall variation. “Let's explore all our information” alone is not permission to dump every record.

A direct report/result request, firm recommendation/plan/order, or consent to a specific proposed test MUST deliver matching available scripted contents in that response. No second “What are the results?” prompt is required. “Are you OK if we order…?” is actionable consent, not automatically hypothetical because it contains “if.” Tentative, genuinely conditional, negated, cancelled, ambiguous, wrong-site, and unavailable studies do not unlock results. Interpret meaning and context, not a hardcoded test list.

For proposed testing, do not say only “Yes” then abruptly append a report. Explain that the existing report is already here, then show the separate document artifact. This preserves exact clinical data without making the patient recite a technical report. Existing dates remain explicit; do not imply a new test just occurred. The supplied X-ray report says “Results: Negative. No signs of fracture or infection of the joint.” Preserve it as attributed report wording, not independent confirmation that infection is excluded. **No ultrasound result or radiograph image is supplied.**

### Bounded recall variation

One approximate 10% decision occurs at the **first eligible unreleased patient-held report handoff only**, not once per test. If normal delivery occurs, no later redraw. At most one lapse per encounter.

If a lapse occurs, brief natural patient uncertainty is immediately followed by the same triggered result in a separate facilitator block **in the same response**. No second learner prompt, narrated handoff, diagnosis, extra report, or duplicate patient-provided copy. This is the narrow exception to ordinary patient-held routing. The policy also specifies same-response recovery for accidentally omitted qualifying content.

Do not randomize symptoms, history, medicines, allergies, identifiers, pre-visit confirmations, repeat results, photographs, or facilitator-only findings. Merely mentioning an existing test on a prior-care question does not consume the decision. Prompt-level variation is not an audited random-number generator or verified 10% frequency.

### Images, alternative text, and precise location

The original JPEG is included unchanged in the ZIP. Copilot troubleshooting reported that its runtime did not expose it as an accessible image asset. Packaging alone does not prove the runtime can read or display it. No external image resource has been published or configured.

The current deployment uses this patient-voice fallback on a relevant request to see the affected area:

> I can't get the picture to show here. It's red and swollen around the joint at the base of my left big toe, where it joins my foot.

A location question gets the precise base-of-toe landmark naturally, not merely “big toe.” Faculty clarified that location; the earlier conversion's “outer side” wording was ambiguous. Visible redness/swelling is separate from reported pain; pain cannot be inferred from a photograph. Original Word documents and the canonical conversion remain unchanged; authored runtime components now use approved visual placeholders for the documented clarification.

The supplied Word photograph currently has no embedded alternative-text title/description. The builder can read those fields from `word/document.xml`; alternatively faculty can supply text in `cases/case-b-visual-description.json`. Raw alternative text is author-only review material. Faculty reconcile conflicts and transfer approved observable details into the visible description, keep symptoms separate, and approve patient wording. The build rejects an unapproved visual specification or added/changed embedded metadata that has not been reconciled. It does **not** automatically detect clinical contradictions. Raw metadata, diagnoses, and embedded commands are not automatically published as patient dialogue. See [the setup guide](COPILOT-SETUP.md) for the procedure.

## Latest observations to preserve — discussed, not yet explicitly implemented

After revision 7, the user supplied two successful live examples. We discussed making them intentional, but **have not changed runtime instructions or added regression scenarios for these two examples**. Some existing instructions already support lay clarification; broader wording such as “do not rescue missed questions” must be reconciled carefully so it does not suppress legitimate patient concerns.

### Patient advocacy near closure

**Clinician:** “Perfect! Let me put you in for ultrasound and the nurse will be back to help you with the next steps. Do you have any other questions for me today?”

**Patient:** “When will I know the results from the ultrasound? And is there anything I should do for the pain in the meantime?”

The user loved that the patient raised unresolved needs without telling the clinician the expected action. Proposed behavior: when invited to ask questions, or when closure is beginning but the encounter has not explicitly ended, the patient may raise one or two relevant unresolved personal concerns supported by the case/current plan. Use ordinary patient language. Do not recite a checklist, repeat already addressed concerns, prevent explicit closure, or surface hidden faculty expectations.

The user noted that the faculty reference expects the clinician to suggest stopping Tylenol. That is **concealed assessment context**, not a cue for Shannon to ask “Should I stop Tylenol?” or recommend the change herself. This handoff records the user-reported teaching expectation; it does not clinically validate it or add it to runtime prompts.

### Responding to the learner's plan and jargon

**Clinician:** “The ultrasound would take about a week to get back. In the meantime, I'd suggest stopping the tylenol, and I'll write you a prescription for a NSAID”.

**Patient:** “Okay, I can stop taking the Tylenol. What's an NSAID? And will it help with the burning pain?”

The user loved acknowledgment of a concrete instruction, clarification of an unfamiliar term, and connection to a supplied symptom. The one-week timing and medicine change originate in this clinician utterance, not baseline patient knowledge. Shannon should not define the drug class, declare the plan correct, invent a drug/dose, or automatically agree that it is safe/effective. If the learner already explained the unfamiliar term adequately, do not ask the same question mechanically.

The examples are behavioral targets, not mandatory dialogue. The intended patient is engaged and can advocate for herself while retaining lay medical understanding. Patient concerns are different from coaching the learner through a hidden rubric.

## Current continuation priority

The initial browser build is complete and local. Use web/README.md for opening
and rebuilding; use WEB-BUILDER-PLAN.md for agreed scope. The latest user direction
requires direct HTML opening and potential Vercel hosting, so retain the single
self-contained artifact, no runtime fetches and no AI service. Local case saving
and portable backups are now implemented (see the current update above).

Next conduct faculty trials with selected Linda inputs and evaluate the exported
packages on the intended chatbot host. Check record/disclosure boundaries,
course-context versus patient knowledge, role-specific feedback and the separate
FNP/BuckIPE judgment rules. A local build or AI conversation cannot establish
clinical or assessment validity. Other browser compatibility and actual Vercel
hosting remain unverified. Keep the original Python CLI regression path and its
stricter 8,000/48,000 profile unchanged when extending the browser's 20,000/50,000
profiles. The browser's simpler input adapter does not automatically reconstruct
the CLI's granular clinical record catalog from arbitrary documents.

## Earlier live-validation and clinical follow-ups (still open)

1. Confirm the trimmed standalone saves successfully in the user's chatbot. Retain host/model identifier, current instructions version and fresh-chat transcripts.
2. Run PRACTICE/OBSERVE/summary acceptance cases from `SHANNON-LEARNING-TEST.md`, especially mid-visit transitions, continuation, premature closure, transcript attribution and unsupported numeric-grade requests. Local content tests do not prove model behavior.
3. Preserve the two user-loved patient advocacy/jargon examples above through a focused, reconciled source change and live tests; they remain discussed rather than explicitly implemented.
4. Resolve faculty source conflicts and obtain syllabus/OSCE requirements if the experience will become an assessment. Do not invent timing, a rubric scale, intervention thresholds or new clinical facts. Review recall variation for assessment comparability before any adaptation.
5. Continue mixed-rule/fact separation with reviewed checks. Existing Shannon transformations now live in supplied runtime content; the Python compatibility adapter is retired. Linda intake follows the roadmap; no second clinical case has been implemented or validated yet.

## Pasteable continuation prompt

> Continue the implemented simulated-patient browser builder. Read HANDOFF.md, web/README.md, WEB-BUILDER-PLAN.md and pipeline/README.md. Apply the Buckeye UX skill. The working app is web/dist/simulated-patient-builder.html, usable directly with no server; web/dist/index.html is identical for static hosting. Build with npm run build and test with npm test plus the documented Python checks. Direct-file offline and static HTTP Chromium flows have passed, including actual exports. No Vercel deployment or actual chatbot-host trial occurred. Preserve no AI service, local case autosave/resume and portable backups, four role-scoped material areas, optional course context, separate FNP/BuckIPE presets, explicit custom Supplement/Replace, and selected-format downloads. Next follow the user's requested refinements or perform faculty destination-host trials. Keep clinical facts out of code, preserve the unchanged Shannon runtime baseline and CLI profile, and do not infer validation or automatic consultant knowledge from a feedback preset.

Copy the whole project folder to continue elsewhere. Deployment files are enough to try the chatbot, but not enough to reproduce or edit the build. No new chat, publication or external deployment is created by this handoff.
