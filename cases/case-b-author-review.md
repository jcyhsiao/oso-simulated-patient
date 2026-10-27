# Case B author review

This is an instructor-only conversion record, not part of the patient encounter. The packet is a practice draft pending faculty review. Original Word files are unchanged. No clinical treatment recommendations have been independently validated or added.

## Source map

All paths below are relative to `case-files/fnp-shannon-anderson/`.

| Source | Use in packet |
|---|---|
| sp-give-info-if-appropriately-prompted/Teaching of SP for Gout Case B SP 2026.docx | Opening, symptom responses, social history, test-order release convention |
| sp-give-info-if-appropriately-prompted/Shannon Anderson Case B Lab Interpratation During Visit.docx | Encounter laboratory values and January 29, 2026 date |
| sp-give-info-if-appropriately-prompted/The Ohio State Radiology Report Case B.docx | Written X-ray report and date; no image |
| sp-give-info-if-appropriately-prompted/Left Foot Image.docx | Actual foot photograph, extracted unchanged as assets/case-b-left-foot.jpeg; request-triggered release |
| learner-info-pre-interaction/Shannon Anderson Case B DOOR Intake Note SP 2026.docx | Encounter date, identity, vital signs, medicines, allergies, vaccinations |
| learner-info-pre-interaction/Shannon Anderson Case B Chart Snapshot.docx | Chart facts, medication details, diagnosis years, family/social history, preventive dates, contacts |
| grader-give-info-if-needed/Shannon Anderson Case B Lab 032025.docx | Historical laboratory tables dated March 4, 2025 |
| grader-give-info-if-needed/Shannon Anderson Case B Lab Report 0325 Faculty Copy.docx | Cross-checks of historical values and encounter values; diagnostic commentary excluded from learner-facing results |
| sp-only-reference-expected-flow/Faculty Sheet for Gout OSCE SP 2026.docx | Examination findings, additional history, concealed diagnosis and broad encounter sequence; prescribing/grading key not imported into patient dialogue |

## Decisions needing faculty review

| Source issue | Draft handling | Faculty decision needed |
|---|---|---|
| Patient teaching sheet both describes fatigue from poor sleep and later says no fatigue | Retains pain-related tiredness, consistent with detailed history and faculty sheet | Confirm intended fatigue response |
| Retired teacher also described as having lots of work stress | Retains retired status; current occupational stress left unspecified | Confirm whether any current stressor should be scripted |
| Hydrochlorothiazide is listed as 10 mg daily in intake/chart | Preserves 10 mg exactly; no dose normalization | Verify intended dose in original case |
| Faculty report includes March 4, 2025 header and later encounter-related tests; standalone encounter report is January 29, 2026 | Uses standalone January report for encounter tests; March report for historical panels | Confirm chronology and whether new blood count/metabolic panel results are intended |
| Chart labels vitals September 5, 2025 but lists annual visit September 9; intake supplies same values January 29 | Uses intake for encounter vitals and retains chart distinction | Confirm dates |
| Source says results on paper are shown when students ask to see feet; a foot image was subsequently supplied | Releases the supplied photo on relevant visual request; does not release unrelated tests | Confirm image presentation works in chosen learner interface |
| Source says faculty give results if learner orders labs, but no general timing policy | Explicitly permits same-visit scripted encounter results after a relevant order; no invented results | Confirm desired timing and panels |
| Faculty source has in-person auscultation/pulse findings; intended use is telehealth | Releases them as facilitator-provided recorded findings on request | Confirm which objective findings should be available remotely |
| Report says X-ray has no signs of joint infection | Preserves as attributed report wording without using it to declare infection excluded | Faculty clinical review of report wording and diagnostic teaching |
| Faculty text contains prescribing regimens, diagnostic assertions, and generated-looking commentary | Leaves management/grading key out of the operational patient packet; no unsolicited clinical recommendations | Review separately if building an assessor; NPSCA itself remains unavailable |
| No detailed patient reaction/persona script beyond concern and discomfort | Uses neutral adult language and established concerns, with no invented barriers/preferences | Add standardized reaction/teach-back scripts if needed for consistency |
| The added photograph has no textual caption or side marker | Uses faculty designation as the left-foot case image; does not infer laterality or extra clinical findings from appearance | Faculty has clarified pain at the base of the left big toe joint; revision 6 applies that location. Confirm photograph alignment separately; no new image interpretation is asserted |
| Prompt text cannot transport an image or guarantee that Gemini can redisplay a Knowledge image | Packages the original JPEG separately, with an explicit failure response | Test actual image display; approve text fallback or supply an accessible image delivery mechanism |

The original intake/chart embedded images were inspected: generic person icon and clinic branding only. The subsequently supplied Left Foot Image document contains one actual foot photograph. It has been extracted byte-for-byte without editing. No radiograph image is supplied.

## Checks completed and remaining

Read all nine Word files, including table text and textbox content, and inspected all three embedded images. Removed duplicate chart/intake text introduced by repeated layout content. Historical laboratory values, ranges, and units are retained in source table order. Compared shared historical table cells between the learner and faculty laboratory reports. Encounter numeric values were checked against the January report. Original source interpretation text is not treated as medical authority.

The canonical conversion predates faculty clarification of record ownership. Copilot pilot revisions 3 and later override its general facilitator routing: January laboratory and written X-ray reports from the SP-information category are handed over as patient-held records when requested. The facilitator supplies only requested scripted information that neither learner nor SP already has; March historical records remain facilitator-only unless already provided. No clinical values are changed. Unsolicited offers to review records or summon a facilitator are prohibited. The image-access fallback now stays in patient voice; local ZIP inclusion is verified, but Copilot reports that the runtime does not expose the asset. See COPILOT-SETUP.md and the builder for current deployment rules.

Pilot revision 4 adds a faculty-requested acting style: articulate, approachable, and engaged, informed by Shannon's supplied retired-teacher background without inferring medical expertise or age-related deficits. It replaces rigid response-length caps with complete, scoped conversational answers. These are portrayal instructions, not newly discovered source traits or clinical facts. The single-file export uses the same facts and voice without requiring a packaged skill; both formats need live behavioral retesting.

Pilot revision 5 requires matching scripted results after firm recommendations/plans/orders as well as direct requests. The general policy lives in `instructions/result-release-policy.md`; case-specific matching/ownership metadata lives in `cases/case-b-diagnostic-records.json`. One approximate 10% decision at the first eligible unreleased patient-held report can produce a brief recall lapse, but a separate facilitator block must supply the same result in the same response. This is a bounded exception to ordinary ownership, not permission to coach or delay. Pre-visit confirmations, history, medications, images, repeat records, and facilitator-only information are excluded; there is no later redraw. No report dates, values, or clinical facts are changed. Both exports include the same policy. The local transcript reviewer has regression tests, but neither those tests nor prompt-based variation establish live realism or a measured random rate. See `TESTING.md` for limitations and live scenarios.

Pilot revision 6 records the faculty clarification that pain is at the base of the left big toe where it joins the foot. Approved text distinguishes visible redness/swelling from reported pain and replaces the ambiguous outside/outer-side wording in runtime location answers. Original source documents and the canonical conversion remain unchanged. `cases/case-b-visual-description.json` stores approved content separately from raw alternative text. The Word photograph has no embedded alternative-text title/description; later additions require reconciliation before rebuilding. Raw metadata is not published. The more precise description is used in both text fallbacks; it is not a new AI interpretation of the image. Automated checks cover metadata review, export consistency, and preservation of other clinical rows, not live patient behavior.

Pilot revision 7 responds to faculty testing in which a broad prior-assessment question failed to elicit the X-ray, followed by an abrupt record block after consent to imaging. The existing written report supports mentioning the test and possession on a relevant question about assessment of this complaint. No named professional, facility, prior-visit date, advice, or ultrasound history is added. Mentioning the record is separate from requesting its contents and does not consume recall variation. Actual handoffs retain exact dates/wording, with a natural explanation of possession before the separate document artifact. Consent to a specific proposed test is treated as actionable rather than hypothetical. Both supplied utterances are covered by advisory reviewer regressions; live naturalness remains unverified.

Remaining: faculty decisions above, behavioral trials in Copilot using the acceptance checks in COPILOT-SETUP.md, and institutional review of the delivery method if used for assessment. Do not describe this conversion as clinically validated or Copilot-tested.
