# Online simulated patient refinement proposal

October 27, 2026. Approved by the user and implemented in browser version
2026-10-27-3 for the runtime, help text and setup guide. The user explicitly
confirmed that assessment timing is handled by a human. Faculty source cleanup
and actual hosting-model trials remain pending. This responds to the Shannon
export comparison and the clarification that patients are simulated online.

## Intended experience

The product builds online simulated-patient encounters. Online delivery is
inherent to the product, not a selectable interaction type or evidence that the
fictional clinical encounter must be a real-world telehealth visit. A primary
care office case can remain an office-based clinical scenario delivered through
a chatbot. Do not replace its clinical setting with a home/video appointment,
apply universal telehealth clinical restrictions, or discard physical-examination
expectations merely because learners interact online.

Keep the four-step form, browser-local processing, direct HTML opening, potential
static hosting and independent feedback presets. No new delivery-mode selector,
project saving, AI service or live chatbot is proposed.

## Shared responsibilities

| Concern | SPA responsibility | Hosting model responsibility | Faculty responsibility |
|---|---|---|---|
| Online delivery | Package explicit online-simulation boundaries without changing the case's clinical setting. | Translate physical classroom logistics into the supported simulation interaction; do not claim real platform actions. | Supply any meaningful clinical-setting changes and activity requirements. |
| Source structure | Preserve paragraphs, tables, text boxes, source labels and one Word representation; flag unsupported content. | Read repeated compatible facts without repeating them as a monologue. | Remove unnecessary substantive duplication and choose relevant excerpts. |
| Clinical conflicts | Keep sources distinct and offer a place for explicit clarification; no semantic arbitration. | Identify the conflict and avoid guessing or inventing a reconciliation. | Decide the intended facts and provide clearly scoped corrections. |
| Natural conversation | Include reusable patient behavior/disclosure instructions. | Give scoped lay answers, clarify jargon and respond to meaningful/multipart prompts. | Supply desired portrayal and case-specific disclosure boundaries. |
| Records and findings | Include explicit reusable release rules and labeled source areas. | Interpret relevant requests/plans, match supplied records and return only authorized contents. | Establish which records/findings exist, who can provide them and any exceptions. |
| Preliminary feedback | Export only selected preset/custom criteria and preserve their rules. | Apply criteria to observable learner evidence, with limitations and assistance attribution. | Supply case targets and any additional compatible rating instructions. |

The SPA can package rules and check explicit input structure. It cannot determine
whether two free-text clinical statements are equivalent, find an unstated record
owner, or decide whether a treatment expectation is correct. The hosting model
can interpret language and compatible facts but cannot author missing clinical or
assessment decisions merely to complete the encounter.

## Proposed reusable runtime changes

### Explain online simulation without forcing clinical telehealth

Human assessment timing is explicitly authoritative. No chatbot timer or timing
selector is introduced. Live warnings and end signals come from the human
timekeeper; quoted warnings in source documents are not live control messages.

Include a concise declaration in both export formats:

> This is an online simulated-patient encounter. Preserve the supplied fictional
> clinical setting. Classroom logistics in source documents do not establish
> actual platform capabilities. Do not claim that recording, an overhead warning,
> elapsed-time enforcement, a real physical examination or a new test occurred.
> Learners may request or describe simulated examination actions. Provide only
> authorized scripted findings and distinguish them from actions actually observed.

This governs the representation of actions; it does not remove clinical tasks,
mandate a video encounter, invent a home setting or automatically change the
faculty's examination rubric. A learner's stated action may be evidence of a
simulated action or intention, not proof of a physically observed performance.
Feedback should use the criterion's supplied evidence requirements and label the
difference, rather than automatically fail the learner or claim an actual exam.

Do not reject an otherwise coherent case merely because an old source says
"enter the room". Clinical contradictions and obsolete logistics are different
problems. Unresolved clinical facts remain a faculty issue.

### Strengthen generic record and findings delivery

Add the following shared behavior without naming Shannon or particular tests:

- Treat learner-has-info as already available. Confirm relevant supplied facts
  naturally; do not manufacture uncertainty or a facilitator handoff.
- Distinguish source roles from content types. A patient-area source explicitly
  authored as a patient-held report can be delivered as a separate record;
  technical report wording is not patient medical expertise. Facilitator reference
  includes concealed teaching material as well as possibly releasable evidence;
  uploading the full file never makes every paragraph a finding to print.
- Follow explicit faculty ownership/release instructions. Do not infer a consultant
  or a record owner merely from a profession name or document filename. If routing
  is missing or contradictory, identify the setup gap instead of guessing.
- A relevant question about previous evaluation can reveal an explicitly supplied
  existing test/record without dumping its contents. Discovery and result delivery
  are separate; do not require an exact test-name keyword.
- A direct result/report request or firm plan/order/consent for a matching supplied
  available test delivers the authorized contents in that same response. Genuine
  hypotheticals, negations, cancellations, wrong-site tests and unsupplied studies
  do not release results. Do not add a second results-prompt requirement.
- Preserve report dates, values, units, scope and attributed report wording. An
  existing report is not a new test just performed. Release only matching content;
  never append a test menu, diagnosis, treatment advice or interpretation as the
  patient's independent knowledge.
- Keep requested scripted findings distinct from unsolicited coaching. A missed
  criterion alone does not authorize a rescue or hidden-rubric hint.
- Do not add random recall variation to the browser baseline. The curated Shannon
  CLI's approximate recall policy remains unchanged; reintroducing variation in
  browser exports would require a separate deliberate activity decision.

The rules handle conversation once faculty have supplied the facts and routing.
They do not make the SPA a semantic record classifier or turn every table into a
patient-held report automatically.

### Keep feedback evidence specific and attributable

Preserve the separate FNP and Buckeye IPE preset contracts. Strengthen the shared
instructions to distinguish real observed actions, learner-stated simulated
actions, proposed plans and unsupported claims. Apply case targets from Step 3;
facilitator context and a syllabus do not silently activate all their expectations
as rated criteria. Later human IPE discussion is not observed in a patient chat.
No new scores, weights, pass/fail thresholds or automatic clinical corrections.

## Small form/help changes

Keep Case → Materials → Feedback → Export unchanged. Prefer improved labels/help
and inspectable output over additional mandatory fields:

1. Explain near the case description that this is an online simulation of the
   supplied clinical setting. No visible telehealth selector or badge is needed.
2. In Patient and Facilitator help, ask faculty to label records/findings and their
   ownership/release conditions within their prepared text. Explain that a full
   grading sheet is not a learner-facing findings document.
3. In Step 3, keep the existing case-specific-expectations label and recommend
   concise criteria rather than unnecessarily embedding a full prescribing key.
4. Permit explicit faculty clarification text in the appropriate existing area.
   It should identify the conflicting statement and intended replacement. File
   order alone is never an authority or last-file-wins rule. If two purported
   clarifications conflict, the hosting model reports the unresolved decision.
5. Update the setup guide to identify simulated versus actually observed actions,
   and list the initial fresh-chat tests. Show actual output size effects; do not
   truncate faculty content to accommodate longer shared instructions.

These help changes do not ask faculty to author JSON or use a project-management
workspace. No AI classification, automatic clinical correction or new image
service is introduced.

## Faculty source cleanup for Shannon

Before treating a browser export as equivalent to the curated Shannon reference:

- Resolve the fatigue statement/negative and retirement/work-stress discrepancy.
  Do not ask the hosting model to choose a clinical interpretation by itself.
- Preserve the already supplied base-of-left-big-toe clarification and reviewed
  visual description, keeping observed appearance separate from reported pain.
- Supply concise Step 3 targets for the desired encounter and learner level.
  Include case-specific reference expectations without unnecessary dose keys.
- Label the existing patient-held reports, historical facilitator records and
  scripted findings, including dates and any release exceptions.
- Decide which source examination tasks remain part of the online simulation and
  what counts as evidence for each. Keep the clinical setting as supplied.
- Mark original room/recording/time-warning arrangements as logistics if they do
  not actually exist in the selected hosting platform. Do not infer that an
  elapsed-time feature or recording will occur from the document alone.

The app can help package those decisions; it cannot supply faculty approval or
validate the treatment expectations. Relevant learner-facing task instructions
may remain in learner-has-info even when criteria also appear in Step 3.

## Implementation order and verification

1. Add the online-simulation declaration and record-delivery policy as reusable
   authored runtime text, plus focused help/setup changes. Do not modify the
   original curated Shannon CLI packet or clinical source documents.
2. Add deterministic compiler checks for policy inclusion in both formats,
   source/feedback separation, no hardcoded case facts and output limits.
3. Rebuild the self-contained HTML and verify direct-file offline operation,
   source extraction, visual descriptions and actual selected-format downloads.
4. Trial fresh conversations on the intended hosting model using reconciled
   faculty inputs. Local string tests do not prove conversational behavior.

Acceptance scenarios for the host trial:

- Greeting and combined greeting/question without an automatic history dump.
- Known learner facts confirmed without artificial concealment or recall lapses.
- Natural prior-evaluation question reveals an explicitly authored existing test,
  while a direct request/firm plan/consent delivers matching contents immediately.
- Hypothetical, cancelled, wrong-site and unsupplied tests do not invent results.
- Requested scripted examination findings are clearly simulated; receiving them
  is not credited as proof of actually performing a physical examination.
- Source instructions mentioning a clinic room do not force a telehealth clinical
  setting or produce a false claim of recording/timing enforcement.
- Image requests receive only reviewed descriptions under their release rules,
  without requiring the host to generate or display an image.
- Unresolved clinical contradictions are flagged without an invented history.
- Explicit closure yields selected, evidence-grounded preliminary feedback, while
  a plan or invitation for questions alone does not end the encounter.

## Intended outcome

The browser export gains consistent online-simulation and record-delivery behavior
while keeping faculty ownership of case facts and evaluation intent. Natural
language interpretation remains with the hosting model. The SPA retains its simple
offline packaging workflow, and no clinical telehealth workflow is imposed merely
because delivery occurs online.


## Implementation verification

The shared browser runtime, all four-step form/help changes and the authored setup
checks are included in both self-contained HTML entry points. Version is
2026-10-27-3. Thirteen web tests and 66 Python tests pass, including checks of
policy inclusion in both formats, human timing, source/feedback separation,
faculty release exceptions and existing size budgets. The curated Shannon
runtime text/image/catalog baseline and original clinical sources are unchanged.
The direct-file offline browser check verifies actual Markdown/ZIP downloads and
that the new shared policies appear in downloaded instructions. These tests
verify packaging and application behavior, not a hosting model's compliance.
