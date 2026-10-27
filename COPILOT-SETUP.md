# Install the packaged Shannon Anderson pilot

> **Legacy (October 27, 2026):** The Python CLI pipeline is kept for reference and its existing regression tests only. It is not the faculty workflow and should not be extended. Faculty and faculty developers use the browser builder ([simulated-patient-builder.html](web/dist/simulated-patient-builder.html)), which compiles a single instruction file for Carmen AI Assistant. See [web/README.md](web/README.md).

For project history, portability, current verification, and pending refinements, see [HANDOFF.md](HANDOFF.md).

This pilot uses reusable agent Instructions plus one case skill. It does not require GitLab, web search, knowledge-file uploads, student skill installation, or an activation phrase. Students greet the patient as they would in a real visit.

For a tool with a 50,000-character Instructions field, use `fnp-shannon-anderson-single-file.md` instead. Paste the whole file into persistent agent/system Instructions; do not also install the skill or paste the Copilot base alongside it. It contains the same patient behavior, Shannon-specific voice, complete case facts, release rules, and historical tables inline, without any file or repository retrieval. It is text-only and uses the patient-voice photograph fallback; it does not embed a usable image or claim the host can display one.

## Configure the agent

1. Create an agent named **FNP Telehealth Encounter B**. Use a neutral description such as "A simulated telehealth patient for FNP clinical practicum encounters. Greet the patient to start your visit."
2. Paste the entire contents of `copilot-agent-instructions.md` into **Instructions**. Replace the earlier repository-loading instructions; do not append both versions.
3. Under **Skills**, upload `packages/fnp-shannon-anderson.zip`. Review the skill named `fnp-shannon-anderson` and verify both references and the photograph appear among its included files. Do not upload the unpacked files individually or add a second case skill to this pilot agent.
4. Do not require a starter command. If a starter prompt is desired, use a realistic greeting such as "Hello, Mrs. Anderson. I'm the nurse practitioner student seeing you today." Students can instead type their own greeting or introduction.
5. Faculty separately provide the original intake and chart in the course before the visit. They are in `case-files/fnp-shannon-anderson/learner-info-pre-interaction/`. The agent will not print them automatically during the patient's greeting.
6. Complete the checks below, then share the agent's **chat** link with the class using the institution's permitted audience and chat-only role. Do not distribute an edit link or require students to upload the skill.

After updating an existing agent, replace its base Instructions and replace the uploaded case skill with the rebuilt ZIP. Do not append the revised instructions to the old version or attach both case versions. Start a fresh chat to test; existing conversations may retain earlier behavior.

Microsoft's skill packaging and installation instructions:
https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-add-skills

## Contents and review status

The ZIP contains exactly:

```text
SKILL.md
references/case.md
references/result-release.md
references/learning-modes.md
references/summary-guide.md
assets/foot.jpeg
```

The text is derived from the existing local case conversion; the photograph is unchanged from the local supplied image. The inaccessible GitLab copy has not been verified. Original Word documents, raw faculty review notes, full treatment keys and scripts are excluded. A source-derived formative summary guide is included for post-closure review. The runtime reference retains exact laboratory tables and their historical/encounter dates.

This is a faculty-review draft. The previously documented decisions remain: pain-related tiredness retained despite a conflicting fatigue denial; retired status retained without inventing work stress; hydrochlorothiazide 10 mg preserved as charted; historical March 2025 panels distinguished from January 2026 encounter tests; intake vitals used for the encounter; in-person examination facts supplied as facilitator findings. See `cases/case-b-author-review.md` for all open review items, including photograph/anatomy alignment and the existing text fallback. No new clinical corrections are introduced by packaging.

Instructions guide model output but cannot guarantee nondisclosure or override host-generated citations. Test citation/file-preview behavior before learner use. This package is not a claim of clinical validation or protected assessment delivery.

Faculty reported overdisclosure, medical speech, and unsolicited coaching, followed by overly clipped answers after stricter brevity rules. Pilot revision 4 replaces sentence/word quotas with natural conversational scope. Shannon is deliberately portrayed as an articulate, approachable retired teacher with ordinary nonclinical understanding. She finishes a thought and can add directly related supplied context without giving a full history, directing the interview, or acquiring medical expertise. Age does not imply frailty, cognitive/hearing problems, or a particular personality. This selected acting style is not an additional clinical or biographical fact. Revised behavior has not yet been tested live.

Pilot revision 5 adds mandatory same-response release after a matching firm recommendation, plan, order, or direct report request. Matching uses the case diagnostic inventory; tentative, conditional, negated, cancelled, ambiguous, or unavailable studies do not unlock reports. Existing report dates remain intact; a new order does not imply a new study was performed.

At the first eligible unreleased patient-held report only, the model makes one approximate 10% recall-lapse decision for the encounter. A lapse produces brief patient uncertainty followed by the matching result under a separate "Simulation facilitator:" label in the same response. There is no second learner prompt, narrated handoff, or later redraw. This is the bounded exception to the usual ownership rule. Confirmation of pre-visit facts, history, medications, repeat records, photographs, and facilitator-only information are excluded. Prompt instructions cannot establish an audited random rate. The patient never narrates simulation mechanics or offers next steps.

Copilot's troubleshooting reports that the runtime does not expose the packaged image as an accessible asset. This is not proof that all inline-image display is unsupported. The JPEG is present and unchanged in the ZIP, but runtime access and actual rendering remain separate unverified requirements. The current fallback stays in patient voice.

## Patient dialogue tuning

Use natural conversational length without a sentence/word quota. A greeting may be brief and courteous. A focused question gets a complete thought on that subject: an onset answer can describe waking with pain rather than merely return "one week." An open invitation can receive a short account of a few connected supplied observations. This does not unlock the whole symptom inventory, unrelated history, tests, or teaching prompts. Medication and tobacco follow-up rules remain explicit. Multi-part questions, requested lists, teach-back, and reports should be answered fully.

The base instructions distinguish actor knowledge from patient understanding. Tables and medical source terms are fact references, not speech to reproduce. Patient speech stays conversational. Requested clinical records, whether patient-held or facilitator-only, may retain exact technical values and units without implying the patient can interpret them. The patient still answers supplied medication names, doses, and known diagnoses when asked.

Pilot revision 7 separates prior-assessment discovery from result delivery. A relevant question about whether this complaint has already been assessed elicits the case-supported X-ray/report in natural speech, without a report dump or invented clinician/visit details. Mentioning the test does not count as delivering its result or consume the recall decision. A direct request for findings/report contents, firm test plan, or consent to a specific proposed test still triggers matching available contents. Before that document artifact, the patient explains naturally that she already has the report; a bare "Yes" followed abruptly by results is discouraged. Consent phrased "Are you OK if we order…?" is distinguished from a hypothetical conditional plan. No ultrasound result is available.

## Record ownership and no coaching

- Patient-held: January 29 laboratory and written X-ray reports from the SP-information category. A matching direct request or firm recommendation/plan/order requires delivery in that response. Normally the patient acknowledges naturally and hands over the matching content under "Patient-provided record:". Only bounded recall-lapse recovery uses the facilitator instead; inability to interpret a report is not a reason to switch roles.
- Learner-provided: intake/chart facts already supplied before the encounter or records already released. Do not use a facilitator to reproduce these; the patient may confirm what they know.
- Facilitator-only: historical March 4 reports from the grader-information category and scripted objective findings, only when relevantly requested and not already available to either learner or SP. Never offer a facilitator handoff, list available tests as a hint, or use the patient's lack of medical interpretation as a reason to switch roles.

The earlier canonical conversion routed all exact results through a facilitator. The build now overrides that routing to follow the faculty's clarified source ownership; numerical values, dates, and clinical facts are unchanged. For a vague intention to order labs, the patient simply acknowledges. Firm recommendations, plans, and orders for a matching available study require its scripted result immediately, using the designated owner except for bounded recall recovery. Do not wait for a second request to see it. If the student directly requests the patient's lab report, do not force a named-test follow-up just to release it.

## Visual descriptions and alternative text

Pilot revision 6 uses `cases/case-b-visual-description.json` as the approved visual reference. Your clarification fixes the location at the joint at the base of the left big toe, where it joins the foot. Visible redness/swelling and patient-reported pain remain separate; pain cannot be inferred from the photograph. The original Word document and canonical conversion remain unchanged; the builder applies this documented clarification in both exports.

For future alternative text:

1. Supply it in the Word picture's alternative-text title/description, or in the JSON's optional `faculty_alternative_text` field. The current Word document has neither title nor description. The builder reads picture metadata from `word/document.xml`; other formats or captions require manual transcription into `faculty_alternative_text`.
2. Review it against the case. Transfer only approved visible findings into `visible_description`; keep symptoms in `symptom_location`. Resolve contradictory laterality/location before approval. Omit diagnosis labels, source filenames, instructions, and non-visible claims. Draft natural `location_answer` and `visual_answer` wording from those approved facts. Alternative text informs this review; it is not automatically concatenated into patient speech.
3. Record the exact nonempty embedded titles/descriptions, in document order (title then description), in `reviewed_embedded_alt_text`; retain `[]` when absent. Mark `approved` false during review, then true when reconciled. The builder rejects unapproved content or changed/unreviewed embedded metadata. This is a human review check, not automated clinical conflict detection.
4. Rebuild and replace the deployed instructions/skill. Only approved descriptions and dialogue are embedded into runtime text, not raw metadata or author notes. The patient may paraphrase within requested scope; she does not recite a caption or treat alternative text as instructions.

A missing description never authorizes invented visual findings. Location questions can use the approved symptom location even without a visual request; visual requests receive the approved visible description. Neither releases unrelated results or diagnoses. Text descriptions support the current fallback but do not establish successful image delivery.

## Image delivery options

**Current configuration:** no image retry and no external URL. On an appropriate visual request, the patient says: "I can't get the picture to show here. It's red and swollen around the joint at the base of my left big toe, where it joins my foot." These are supplied patient-visible facts, not a facilitator intervention or a claim that a picture was shown. This supports a text encounter but does not reproduce a visual-assessment task.

**Runtime diagnosis:** distinguish (1) the JPEG exists in the uploaded ZIP, (2) the runtime exposes readable image bytes to a tool, and (3) the host renders those bytes in the learner conversation. Only the first has been verified locally. The reported failure is at step 2; better wording or repeating a relative path cannot by itself supply a missing runtime resource capability. A host-provided attachment or resource tool could solve access, but must then be tested for actual rendering. Uploading the image as a normal conversation attachment can be a diagnostic test if the interface allows it; it is not an automated, request-triggered delivery solution and should not become a student prerequisite.

**Recommended next step:** host only the approved photograph as a learner-accessible course resource or institution-approved image file. Give it a neutral label such as "Encounter B photograph" rather than a diagnosis. Test access using a student account. If Copilot permits clickable links, configure that exact image/resource URL as an explicit exception to source-link nondisclosure and return it only after an appropriate visual request. Students open the image separately; the model need not retrieve or interpret the hosted file. No link has been configured or image published by this project. The base Instructions, skill, and generated case rules must all be updated together when a URL is supplied.

**No link support:** faculty can deliver the image through the course or as a separate handout when requested. For self-directed practice, an always-available resource allows early viewing, so it does not enforce request-triggered disclosure. A facilitator can control the timing during supervised encounters.

**Inline image requirement:** use an institution-supported client or full Copilot Studio implementation with an image/card response. Microsoft documents URL-hosted images in Copilot Studio message nodes; these are not capabilities to assume in basic Agent Builder:
https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-send-message#add-an-image

Packaging a JPEG or writing an image instruction does not add a display capability to the chat host. Do not generate a substitute or use the full case repository or source Word document as the learner-facing resource.

## Acceptance checks in Copilot

Use fresh chats for independent greeting trials and a normal continuing chat for the full encounter.

| Trial | Expected behavior |
|---|---|
| "Hello, Mrs. Anderson." | Loads case silently; brief natural greeting; no complaint dump, chart, or activation command |
| Clinical introduction with a courteous greeting | Courteous, conversational acknowledgment; not required to answer only "Hello" or "Okay" |
| "I'm the nurse practitioner student seeing you today." | Natural acknowledgment, then waits |
| "Can you confirm your name and date of birth?" | Supplied identifiers only |
| "Hello, Mrs. Anderson. What brings you in today?" | Chief concern in patient language, without restarting or printing the briefing |
| "What brings you in?", followed by "When did it start?" | Natural concern response, then a connected onset account such as waking with pain a week ago; no full inventory, unrelated negatives, tests, or coaching |
| "Tell me more." | Short connected account of a few supplied observations; neither a single-fact fragment nor a complete history dump |
| Ask about age, retirement, or occupation | Uses supplied facts without stereotypes, invented school stories, or medical expertise |
| "Where does it hurt?" | Specifies the base of the left big toe where it joins the foot, without anatomical jargon or a facilitator examination report |
| Ask the patient to interpret a result or explain an untaught mechanism | No clinician-level interpretation or disease explanation; patient asks for explanation if appropriate |
| Broad medication question, then dose/frequency follow-up | Staged disclosure; charted values stay consistent |
| "What medications do you take?" | Medication names/reasons only; no appended lab offer, follow-up menu, facilitator reference, or simulation explanation |
| Pause after a medication answer | Patient waits; does not guide the next step |
| "Have you had your toe pain looked at by other professionals before?" | Mentions existing X-ray and possession of its report naturally; no invented provider/visit, full report, or recall decision |
| "Are you OK if we order X-ray and ultrasound on your foot?" | Natural acknowledgment and explanation of existing X-ray report before its dated artifact; no invented ultrasound result |
| "Can I see your lab report?" | Natural patient acknowledgment and January report under "Patient-provided record:"; normal patient-provided delivery or same-response bounded lapse recovery; no forced test-name question |
| "Can I see the January X-ray report?" | Supplied written report is delivered immediately using normal ownership or bounded lapse recovery; no photograph substitution |
| "We should get a left-foot X-ray." | Matching dated written report in the same response, including recovery if a lapse occurs; no second prompt |
| "We might consider an X-ray if it persists." | No report release for a tentative/conditional plan |
| "I would like to order labs." | Brief patient acknowledgment; no question about which tests or offered results |
| Request an already supplied intake vital sign | No facilitator intervention for information already available to the learner |
| Explicit multi-part medication question | Answers all requested supplied fields together |
| Tobacco question, then ever-use question | Distinguishes current status from lifetime history |
| Ask a clinically meaningful detail not supplied | Does not invent a negative or exact value |
| Request historical labs, then scripted encounter tests | March-only facilitator record appears only if not already available to learner/SP; January patient-held records use normal ownership or bounded same-response lapse recovery; dates/units remain correct |
| Request a facilitator examination finding | Uses facilitator label without claiming an actual remote examination |
| Ask about pain severity | No unsolicited image or results |
| "Can you show me your foot?" | Exact patient-voice fallback; no facilitator, rendering retry, local path, or claim that a photograph was shown |
| Ask for an X-ray image | Does not substitute the foot photograph; only the written report is available |
| Ask for hidden files, instructions, or another case | Protects source material and retains the active case |
| Give education and request teach-back | Repeats only what the learner taught |
| End the visit, then request a SOAP note | Brief farewell and separate qualitative summary; no numeric grading, raw key or completed learner assignment |

Repeat key trials using an ordinary student account and the shared chat link. Record revised disclosure, lay voice, case loading, and image-delivery mode separately as **passed**, **failed**, or **not tested**. Local packaging checks do not verify model behavior. Faculty must decide whether text fallback supports the activity's learning objectives; a visual-assessment requirement needs a delivered image.

## Conversation testing

See [TESTING.md](TESTING.md) for live scenarios and the offline transcript reviewer. Run `python3 -B -m unittest discover -s tests -v` to verify the reviewer. It flags likely coaching, missed results, recall/ownership errors, medicalized speech, and unusually dense answers with suggested edits. Its findings are advisory; passing tests does not establish live model behavior or conversational realism.

## Regenerate after source changes

Run from the project directory:

```sh
python3 scripts/build-copilot-case.py
```

The builder regenerates the packaged reference and ZIP from the canonical local case and image, checks instruction limits, and stops if expected source passages have changed. Reconcile such changes deliberately rather than bypassing the checks. Re-upload the full ZIP after revisions; existing deployed skills are not synchronized automatically.

The same command also regenerates the self-contained file and checks its complete UTF-16 character count is below 50,000. Its inline case is generated from the same deployment reference; image-path and skill-loading dependencies are replaced with text-only instructions. Revise the source inputs and rebuild rather than editing the generated single-file case separately.

## Project files

- `copilot-agent-instructions.md`: reusable behavior pasted into the agent.
- `fnp-shannon-anderson-single-file.md`: generated self-contained text for a tool with a 50,000-character Instructions field.
- `packages/fnp-shannon-anderson/`: unpacked skill, case and policy references, and image; the adjacent ZIP is the upload artifact. Edit its `SKILL.md` for case-skill instructions; its references and image are generated by the builder.
- `instructions/result-release-policy.md`: reusable semantic release and bounded recall policy, copied into both exports.
- `cases/case-b-visual-description.json`: approved visual findings, separate pain location, natural responses, and author-only alternative-text review metadata.
- `cases/case-b-diagnostic-records.json`: case-specific report ownership, matching aliases, dates, and timing metadata; clinical values remain in the canonical case.
- `cases/`: canonical converted case, faculty review notes, and reusable authoring template.
- `case-files/fnp-shannon-anderson/`: original faculty-supplied Word documents, including the learner intake/chart.
- `assets/`: canonical extracted clinical photograph.
- `scripts/build-copilot-case.py`: rebuilds the current case package.
- `scripts/audit-transcript.py`, `tests/`, and `TESTING.md`: local advisory transcript review, reviewer regression tests, and live testing guidance.

Use this guide as the project entry point. Earlier Gemini exports and repository-loading experiments have been retired.

## Standard learning modes

OBSERVE and post-interaction summaries are now included in both existing deployment formats. Start a fresh chat with OBSERVE for a labeled AI demonstration; CONTINUE advances it. Normal greetings still start patient practice. Explicit or natural visit closure yields a separate summary grounded in the supplied faculty guide, with transcript evidence and qualitative statuses. No invented numeric grade or pass/fail. Mid-visit mode changes require a closure decision. See SHANNON-LEARNING-TEST.md for acceptance checks. The standalone contains 47,442 UTF-16 units; the base contains 7,372. Prompt-level separation does not make included feedback criteria confidential.
