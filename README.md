# Simulated patient builder and pipeline

A browser-local package builder plus a portable, faculty-review Shannon Anderson reference case for MSN Family Nurse Practitioner encounters. Students begin with a natural greeting. Runtime case revision: `2026-10-21-copilot-pilot-7`.

Open **[the standalone builder](web/dist/simulated-patient-builder.html)** directly
in a current browser. No server or installation is needed to use the built HTML.
It includes case/context inputs, the four material areas, separate FNP/Buckeye IPE
presets, custom feedback, TXT/Markdown/DOCX extraction and selected-format downloads.
Cases autosave locally, with resume, My cases, Start new case and portable editable
case backups. See [the saving contract](LOCAL-CASE-STORAGE-PLAN.md). Stored image alt text can be reviewed and included as descriptions without image generation. Re-import Word sources to use the fallback/text-box extraction fixes.
See [web/README.md](web/README.md) for supported formats, local build/test commands
and limitations. `vercel.json` supports potential static hosting; nothing is deployed.

Both standard deployment formats now include OBSERVE demonstrations and source-grounded post-interaction summaries. See [SHANNON-LEARNING-TEST.md](SHANNON-LEARNING-TEST.md). Build with `python3 -B scripts/build-copilot-case.py`. Use the existing standalone file or base instructions plus case ZIP; no separate learning build is needed. Feedback is qualitative, without numeric grades or pass/fail.

Last verified October 27, 2026: all 65 Python tests, 18 web compiler/ZIP/metadata/case-storage tests and manifest/reference checks pass. Direct-file offline and static-HTTP Chromium workflows were checked with actual downloads. The standalone is 46,884 UTF-16 units; the ZIP has six members. Progressive disclosure, calm lay portrayal (no student assessment in dialogue), and direct patient-held record release are implemented. [HANDOFF.md](HANDOFF.md) is the consolidated current-state guide and includes a pasteable continuation prompt.

- **Initial web builder plan:** [WEB-BUILDER-PLAN.md](WEB-BUILDER-PLAN.md) records the agreed single-session workflow, optional course context, feedback presets/custom criteria, Buckeye UX design and implementation sequence. The initial local app is implemented; its exported packages still need destination-host trials.
- **Resume or move this project:** [HANDOFF.md](HANDOFF.md) records goals, decisions, current implementation, successful dialogue examples, limitations, and work still to do. Copy the whole project folder to continue editing elsewhere.
- **Reusable pipeline direction:** [PIPELINE-DESIGN.md](PIPELINE-DESIGN.md) separates clinical cases from learner activities, profiles, facilitator intervention, and deployment. Shannon is the reference implementation; the shared compiler now supports explicit activity selection, with a native path checked using a synthetic case. Linda intake and real cross-case validation remain next.
- **Current authoring inputs:** [pipeline/README.md](pipeline/README.md) explains activity-selected compilation, authoritative inputs, feedback selection and output packaging. Case text, metadata, visual references and export variants are supplied inputs; no Shannon-specific build adapter is used.
- **Faculty and developer workflow:** [FACULTY-WORKFLOW.md](FACULTY-WORKFLOW.md) describes what to supply, how source documents become reviewed inputs, and includes an intake/release template.
- **Configure a chat agent:** [COPILOT-SETUP.md](COPILOT-SETUP.md).
- **Test and review encounters:** [TESTING.md](TESTING.md).
- **Review unresolved source issues:** [faculty review notes](cases/case-b-author-review.md).

Use either [base instructions](copilot-agent-instructions.md) plus the [case ZIP](packages/fnp-shannon-anderson.zip), or the [single-file instructions](fnp-shannon-anderson-single-file.md) in a tool with a 50,000-character persistent instruction field. Do not combine both formats. Image display is not configured; patient-language text fallback is included.

Build and check with standard-library Python:

```sh
python3 -B scripts/build-simulation.py --activity pipeline/activities/fnp-telehealth-practice/activity.json
python3 -B -m unittest discover -s tests -v
```

The handoff contains instructor-only context; do not paste it into the patient agent or share it as a learner briefing. Local checks do not establish live model behavior or clinical validation.
