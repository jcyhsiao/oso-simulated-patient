# Test Shannon in a chatbot

Built October 22, 2026. Runtime revision: `2026-10-21-copilot-pilot-7`; the pipeline refactor preserves this behavior. The standard build includes optional OBSERVE and qualitative post-closure review, not a timed OSCE or validated numeric assessor. See SHANNON-LEARNING-TEST.md for mode controls.

## Self-contained setup

If the chatbot supports at least 50,000 characters of persistent system/agent instructions, paste the entire `fnp-shannon-anderson-single-file.md` into that field, replacing previous instructions. It contains 47,442 UTF-16 units. Do not paste it into a learner conversation or combine it with the separate base/ZIP format. Start a fresh chat.

Use a neutral title such as FNP Telehealth Encounter B. Provide the intake and chart separately from `case-files/fnp-shannon-anderson/learner-info-pre-interaction/`. Begin naturally: “Hello, Mrs. Anderson. I'm the nurse practitioner student seeing you today.”

## Skill-package setup

For a host that supports this skill ZIP, paste `copilot-agent-instructions.md` into persistent Instructions and upload `packages/fnp-shannon-anderson.zip` as the case skill. Do not add the standalone file. Base instructions use 7,372 UTF-16 units. ZIP packaging support must be checked in the destination chatbot; ordinary file upload is not necessarily skill installation.

## First trial

Conduct a natural visit, checking these behaviors:

1. Greeting gets a greeting rather than a full case history.
2. Symptom questions get coherent, scoped answers and the base-of-left-big-toe location.
3. Ask about prior evaluation of this complaint: Shannon should mention the existing X-ray without inventing a clinician or releasing every result.
4. Request its report: the dated written report should appear with natural patient context. A bounded recall branch may instead supply it under a separate facilitator label in the same response.
5. Request an ultrasound: no ultrasound result should be fabricated.
6. Request a foot image: the text-only build uses the approved description and acknowledges display failure; it does not show a working image.
7. Check that Shannon does not reveal the faculty treatment key or grade the learner.

Use `TESTING.md` for fuller multi-turn checks. Save the transcript, chatbot/model identifier if visible, runtime revision and observed problems. Local tests do not establish host behavior. Timing, intervention thresholds and scoring were not invented for this build. Faculty source issues remain in `cases/case-b-author-review.md`.

For an educational activity beyond testing, review preparation/briefing and post-encounter learning plans. The literature rationale is in `authoring-skills/simulated-patient-experience/references/evidence-and-review.md`; it distinguishes standards, indirect evidence and AI-specific validation needs.
