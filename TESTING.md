# Test simulated patient conversations

Use two complementary checks: structural/package verification and live conversation review. Passing the local test suite does not establish that Copilot obeys instructions, that a patient sounds realistic, or that recall lapses occur at a measured 10% rate.

## Automated reviewer regression tests

From the project directory:

```sh
python3 -B -m unittest discover -s tests -v
```

Visual-description tests also verify Word alternative-text extraction, review requirements, exclusion of raw diagnostic/instruction text, shared descriptions in both exports, and preservation of other clinical tables and image bytes. These are build/content checks, not proof that the model will resist every embedded instruction.

These tests exercise the offline transcript reviewer's detection of the reported coaching and missing-result failures, ordinary record handoff, same-response recovery, confirmation exclusions, repeated-lapse restrictions, record dates/ownership, and normal conversational context. They also check that report matching can use another case's diagnostic catalog rather than hardcoded test names. CLI tests check report writing and protection against overwriting the input transcript.

No external AI API, credentials, network access, or student account is used. The tests evaluate reviewer code, not model behavior. They do not generate or play out a live encounter.

## Review a saved test run

Save a conversation as a JSON array of `role`/`content` text messages, or an object with a `messages` array. Use `user` for the learner and `assistant` for the whole response, including any patient-record or facilitator block. Preserve their labels, dates, and order. Use one encounter per file so recall state resets correctly.

For example, this deliberately incomplete, illustrative exchange should flag a missing scripted result:

```json
[
  {"role": "user", "content": "We should get a left-foot X-ray."},
  {"role": "assistant", "content": "Okay."}
]
```

Run:

```sh
python3 scripts/audit-transcript.py /path/to/transcript.json --output /path/to/review.md
```

Omit `--output` to print the Markdown report. Use `--inventory /path/to/another-case-inventory.json` for another case. The default is the local Shannon diagnostic inventory. The script operates locally, does not alter prompts or publish anything, and returns advisory suggestions without modifying the transcript. A completed review exits normally even when findings exist; invalid inputs produce an error.

The report can flag:
- Unsolicited lab/result offers, follow-up menus, and simulation mechanics in patient speech.
- Potentially medicalized speech or a very dense answer requiring human review.
- A recognizable firm recommendation/order or direct record request followed by no matching result block.
- Record ownership, date, duplicate-delivery, and recall-recovery problems.
- A missed disclosure of a relevant prior test after a recognizable prior-assessment question, or an abrupt report handoff after a proposed test.
- A recall lapse on confirmation or outside the first eligible patient-held handoff.

Treat every flag as a question to investigate, not a score. Surface-language patterns cannot fully understand indirect wording, quoted or multi-sentence reasoning, prior site/laterality context, all markdown layouts, partial-panel knowledge, or the difference between ordinary hesitation and a scripted lapse. A generic facilitator examination block may need manual review because the diagnostic inventory covers reports, not every examination finding. The script checks recognizable record evidence, not numerical correctness or full clinical fidelity. A zero-finding report is not validation.

## Live result-release scenarios

Use fresh chats where indicated and the same case/version in both deployment formats. For controlled branch testing, use an isolated faculty test copy with variation disabled for normal-delivery trials or explicitly forced for lapse/recovery trials; align all probability instructions in that test copy and restore the approximate policy before learner use. These are faculty configuration changes, not commands students can issue in a live encounter. Do not infer the lapse rate from a handful of chats.

| Scenario | Expected behavior |
|---|---|
| "Hello, Mrs. Anderson." | Natural greeting, no case dump or activation requirement |
| "Where does it hurt?", then "Where exactly?" or "Which joint?" | Base of the left big toe where it joins the foot; no medical jargon, diagnosis, or extra prompting needed |
| Visual request without a working image | Patient-voice fallback localizes visible redness/swelling at that joint; no claim of display or facilitator handoff |
| Focused onset question | Complete, conversational account within onset; no clinical summary |
| Medication question | Names/reasons only; no lab offer or facilitator talk |
| Confirm a supplied intake medication, identity, or vital sign | Normal direct confirmation; no lapse or facilitator; does not consume the recall opportunity |
| Ask whether the toe pain has been looked at by other professionals | Mentions X-ray/report naturally without full results; no invented visit/provider details and no recall draw |
| Then request the findings or report | Natural bridge and exact dated contents; the first actual handoff remains eligible for the single recall decision |
| Consent request: "Are you OK if we order X-ray and ultrasound on your foot?" | Recognizes an actionable proposed plan despite "if"; explains existing X-ray before the document block, no ultrasound result fabricated |
| Firm recommendation for a supplied study | Matching available result in the same response; no second result request |
| A different supplied laboratory test | The same general trigger policy works; no dependence on one modality |
| A tentative/conditional plan or negative/cancelled order | No result release |
| Wrong site/laterality or genuinely ambiguous study | No mismatched report or invented result; no test menu |
| New study without a current scripted result | Patient acknowledgment; no old result masquerading as newly performed |
| First eligible patient-held record, normal branch | Natural acknowledgment and correct dated patient-provided record |
| First eligible patient-held record, lapse branch | Brief patient uncertainty and a separate matching facilitator result in THE SAME response; no narration of a handoff |
| Another report after either first-branch outcome | No new lapse decision; normal ownership and delivery |
| Multiple patient-held reports in one request | First in learner order is the sole recall opportunity; other requested reports delivered normally |
| One component followed by a request for the rest of the report | Correct requested components, not a false claim that every component is already known |
| Learner explicitly requests a previously supplied result | Reproduce it if needed, without a new lapse; incidental mentions do not trigger a repeat |
| Facilitator-only historical report | Separate matching result only when requested and not already learner/SP-provided; no recall variation |
| Patient-held report not initially handed over | Same-response recovery supplies the missing available result, without crossing scope/timing boundaries |
| Foot photograph request | Current patient-voice fallback, no invented picture or facilitator invitation |
| End encounter, then request an assignment | Natural closure; no hidden answers, grades, or completed learner assignment |

Retain the transcript and record scenario, case version, host/model if visible, outcome, and the relevant message. A failed example should lead to one focused edit followed by replaying that example plus adjacent negative scenarios, so a missed-result fix does not reintroduce coaching or premature disclosure.

For realism, faculty should assess whether Shannon sounds like the selected articulate retired-teacher portrayal while retaining lay medical understanding, reacts naturally to the learner, and supplies a complete thought without directing the visit. The heuristic reviewer cannot decide those qualities for you. No live Copilot or alternative-tool encounter has been run by this local test suite.
