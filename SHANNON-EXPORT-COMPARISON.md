# Shannon browser export compared with the curated Shannon instructions

October 27, 2026. Static content comparison, not a live chatbot trial or clinical
review. The supplied browser export is an earlier snapshot; image ingestion and
Word extraction have subsequently been revised. No patient facts or prescribing
recommendations are being validated here.

## Compared inputs

- User-pasted browser output:
  /Users/hsiao.62/.codex/attachments/a0a03388-c251-4904-84ef-ab210fb86729/Pasted text.txt
- Earlier curated, generated Shannon runtime:
  fnp-shannon-anderson-single-file.md
- Supporting reference: packages/fnp-shannon-anderson/references/case.md and
  pipeline/activities/fnp-telehealth-practice/summary-guide.json.

The pasted text contains both an instructions file and a setup guide, with FILE
labels added by the export preview. Counts below isolate the instruction portion
and exclude those labels and the setup guide; paste boundaries may add a newline.

| Measure | Pasted browser instructions | Curated Shannon single file |
|---|---:|---:|
| LF UTF-16 units | 40,008 | 47,442 |
| CRLF UTF-16 units | 40,795 | 47,883 |
| UTF-8 bytes | 40,460 | 47,554 |

The browser snapshot has more size headroom, even with substantial source
repetition. Shorter packaging does not establish clinical or behavioral equivalence.

## Advantages of the browser export

1. Explicit learner role and actual course/assignment context. The sample supplies
   graduate FNP learner context, an office/primary-care task, original 20-minute
   directions, deliverables and reflection prompts. Those were not the curated
   telehealth activity configuration. This is an intentional activity difference,
   not a demonstrated regression or proof of host timing/recording capabilities.
2. Direct source labeling for each input file and a clear four-area role map.
   Supplied records retain dates, values and tables rather than being silently
   summarized. Faculty control what is upfront versus patient/facilitator-held.
3. Reusable case-independent behavior and a separately selected feedback framework.
   The FNP preset no longer carries another patient's gout-specific targets.
   No simulated consultants are created when the consultant area is empty.
4. Good retained general boundaries: natural entry, lay patient language, unknowns
   remain unknown, course context is not patient knowledge, explicit closure,
   evidence-grounded preliminary feedback and no invented grading totals.
5. Explicitly authored visual wording. The pasted patient block gives the base-of-
   left-big-toe landmark and visible redness/swelling. That is stronger than relying
   on the source's ambiguous outer-aspect wording or an unavailable image display.
6. Portable single-file use with a separate setup guide and no runtime retrieval.

## Highest-value improvements

### Correct extraction structure before cleaning up substantive repetition

The pasted intake repeats the entire note. Chart labels and content appear twice,
with strings such as INTAKE NOTEDate and Demographics:Demographics:. Inspection of
the originals found Word AlternateContent Choice/Fallback pairs: the chart has
42 pairs and 84 text-box representations, and the intake has three pairs. The
previous importer read both representations and joined text-box paragraphs.

The current importer now selects one representation and preserves text-box
paragraph boundaries. This corrects OOXML extraction structure; it is not semantic
deduplication. Repetition intentionally present in separate faculty materials is
still preserved. Re-import the original documents and rebuild to obtain the fix;
an already-pasted historical export does not change automatically. Verify visual
reading order in extracted previews because XML order is not page geometry.

### Keep the full answer key out of patient/runtime reference context when unnecessary

The supplied facilitator area includes the complete confidential faculty grading
sheet with explicit prescribing material, plus historical reports containing
interpretation and next-step commentary. The curated runtime had deliberately
excluded most explicit treatment-key/dose material while retaining source-derived
feedback targets and exact record values.

Generic concealment instructions are useful but are not technical confidentiality.
Prefer selected observation/findings excerpts in the facilitator area, and relevant
learning targets in Step 3. Keep technical report contents distinct from the
patient's own medical understanding. Do not clinically correct the source by guesswork.

### Supply case-specific feedback targets explicitly

The pasted export selects the generic FNP OSCE framework but has no separate
faculty-provided case-specific criteria block. The full faculty sheet sits in the
facilitator area, which the new wrapper says does not independently activate
rated criteria. This makes case-specific feedback less explicit than the curated
Shannon summary guide.

Place the chosen Shannon encounter targets in Step 3 as Supplement to the FNP
framework. This can include the relevant faculty expectations without copying the
entire treatment key. The preset preserves its own qualitative judgments; added
targets without anchors receive narrative observations, not invented scores.

### Preserve deliberate record-delivery behavior if it remains desired

The curated runtime specifies stable record identities, patient versus facilitator
ownership, dates, prior-assessment discovery, direct requests/firm plans/consent
triggers and same-response delivery without a second results prompt. It also
includes a bounded approximate recall policy. The simple browser snapshot has
mostly the source documents plus general requested-record instructions.

Consequently, the browser output does not explicitly preserve all those tested
Shannon refinements. Faculty can author reusable record-release instructions or
provide a richer optional record-policy input later. Do not automatically infer
all ownership/trigger decisions from arbitrary document titles. Omission of recall
randomness is a policy difference to decide deliberately, not an inherent defect.

### Reconcile source conflicts before expecting stable portrayal

The pasted patient source includes both fatigue from poor sleep and a no-fatigue
negative. The faculty source retains work stress while the chart identifies a
retired teacher. The curated version explicitly managed or flagged these issues;
raw extraction reintroduces both statements. The new wrapper correctly says not
to invent a resolution, but this can still leave the hosting model with conflicting
instructions. Use reconciled faculty excerpts or explicit clarification text.

Do not treat the office-based course directions and curated telehealth limitations
as interchangeable. A successful package does not create actual auscultation,
video recording, an elapsed-time warning or a physical examination.

## Feature differences to decide intentionally

The curated version includes OBSERVE demonstrations and detailed continuation,
practice-transition and feedback-attribution rules. The browser's initial patient-
encounter workflow does not export OBSERVE. That is consistent with its narrower
initial scope; add it only if wanted as a reusable learning feature.

Conversely, the browser runtime explicitly permits patient clarification of jargon
and supported personal concerns without revealing hidden expectations. The older
handoff described some specific advocacy/jargon refinements as pending. Neither
instruction set has been behaviorally proven equivalent by this static comparison.

## Image ingestion update

The browser now extracts stored Word image title/description metadata and supported
PNG description fields or JPEG EXIF/XMP descriptions. It performs no AI inference.
Raw extracted metadata is visible for review but is not exported automatically.
Faculty can use/edit a reviewed description, supply one when absent, or explicitly
exclude an irrelevant image. Unresolved image descriptions block export. Visual
text stays in its assigned source area; a course illustration does not become a
patient fact. Text-only exports carry descriptions without requiring image generation
or display. Available raster bytes can accompany modular exports.

## Recommended next comparison

Re-import the original sources with the updated extractor, keep the existing
patient-visible landmark clarification, place concise case targets in Step 3,
and remove unnecessary grading/dose and report-commentary material from the
facilitator block. Then compare actual fresh-chat transcripts for natural entry,
fatigue, record discovery, firm-plan result delivery, visual requests, closure
and case-specific feedback. The curated file remains the reviewed behavioral
reference until those differences are reconciled and tested.


Follow-up: approved browser version 2026-10-27-3 now includes the generic online-
simulation, human-timekeeping and explicit record-delivery rules described in
ONLINE-SIMULATION-REFINEMENT-PROPOSAL.md. This addresses the reusable-policy gap;
it does not infer missing case routing, reconcile clinical source conflicts or
prove equivalence to the curated Shannon runtime. Rebuild exported packages to
include those changes, then conduct the proposed fresh-chat trials.
