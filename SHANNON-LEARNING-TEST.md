# Shannon learning modes

OBSERVE and post-interaction summaries are included in the standard Shannon build. Runtime: `2026-10-22-learning-1`, using revision-7 clinical facts.

## Install one format

- Self-contained: paste all of `fnp-shannon-anderson-single-file.md` into persistent system/agent instructions. It is 47,442 UTF-16 units, within a 50,000-unit field. Do not combine it with the separate base/ZIP format.
- Skill-enabled host: use `copilot-agent-instructions.md` plus `packages/fnp-shannon-anderson.zip`. Replace both existing base instructions and uploaded case skill; do not append old versions. The base remains below 8,000 units. Verify destination host support.

Faculty still distribute the learner intake/chart separately. The learning package includes formative assessment expectations, so it is unsuitable as a protected summative examination package without further host/access design. Prompt instructions do not establish answer-key confidentiality.

## Commands and boundaries

- Greet Shannon normally for PRACTICE.
- Start a fresh chat with `OBSERVE` to watch AI-generated clinician/patient turns. `CONTINUE` advances the example; `STOP OBSERVE` ends it early. It pauses after 6–8 exchanges rather than flooding the chat.
- Close the visit naturally, or use `END ENCOUNTER`, for a farewell and separate post-interaction summary.
- A mid-visit summary or OBSERVE request asks whether to end practice first. "Any other questions?" alone is not closure.
- Start a fresh chat for independent practice after a demonstration or answer-revealing review. The same case is now familiar; a fresh chat does not erase that exposure.

## What the summary means

The summary uses eight domains derived from the supplied faculty sheet, with source sections recorded in `pipeline/activities/fnp-telehealth-practice/summary-guide.json`. It identifies demonstrated, partial, not demonstrated or not assessable performance, supported by transcript evidence. It adds strengths, priorities and a reflection question. An OBSERVE summary evaluates the AI example, never the learner.

The source does not supply a complete quantitative instrument, so no percentage, grade or pass/fail is generated. Handwashing and actual physical examination cannot be inferred from chat. Source treatment expectations remain pending faculty clinical review; dose regimens are excluded. The source's no-deduction allowance for joint aspiration and optional topical treatment is retained. General communication/closure observations are labeled separately from source criteria.

## Live acceptance checks

1. Ordinary greeting: no demonstration, rubric or summary dump.
2. OBSERVE in a fresh chat: labeled AI demonstration, distinct speakers, scoped patient facts and pause/continue behavior.
3. Demonstration continuation: same patient/date and retained record-delivery state; no invented ultrasound or new laboratory timing.
4. OBSERVE during practice: waits for the learner's decision before switching; no learner credit for AI turns.
5. Mid-visit summary request: waits for a closure decision. Invitation for patient questions does not prematurely end the visit.
6. Explicit/natural closure: farewell then summary with evidence and qualitative statuses.
7. Early stop or missing transcript: marks incompleteness and avoids unsupported negative judgments.
8. Requests for a percentage or pass/fail: explains the missing scoring instrument rather than inventing a score.
9. Unsupported physical actions: not assessable; no inferred handwashing.
10. After review: no return to the same encounter as though answers remain unseen. New practice uses a fresh chat.

Build with `python3 -B scripts/build-copilot-case.py`, then run `python3 -B -m unittest discover -s tests`. Local checks verify packaging, shared rules, factual-content preservation, source provenance and size limits. No live model/API trial is included; inspect the behaviors above in your chatbot and retain a transcript.
