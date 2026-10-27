# Shared simulation compilation

> **Legacy (October 27, 2026):** The Python CLI pipeline is kept for reference and its existing regression tests only. It is not the faculty workflow and should not be extended. Faculty and faculty developers use the browser builder ([simulated-patient-builder.html](../web/dist/simulated-patient-builder.html)), which compiles a single instruction file for Carmen AI Assistant. See [web/README.md](../web/README.md).

The build reads explicitly supplied case/activity content. It contains no
patient-name, diagnosis, image-location or case-specific sentence replacements.

```sh
python3 -B scripts/build-simulation.py --activity pipeline/activities/fnp-telehealth-practice/activity.json
python3 -B scripts/validate-pipeline.py --activity pipeline/activities/fnp-telehealth-practice/activity.json
python3 -B scripts/extract-reference-views.py --check
python3 -B -m unittest discover -s tests
```

`build-copilot-case.py` and `build-learning-case.py` retain the previous entry
points. Their default activity is supplied by `pipeline/default-build.json`,
not a case name in Python. Both accept `--activity`. The validator also supports
an explicit activity or the project default. Reference-view extraction remains
a Shannon-specific review utility; its output never feeds compilation.

## Supplied author inputs

Paths are project-relative. These are developer-maintained intermediate inputs;
faculty continue supplying existing documents, not JSON forms.

- Case manifest: `schema_version`, `id`, `component_index_ref` and
  `record_definitions_ref`. Identity metadata, provenance, visual and review
  references are optional additions. Record definitions can be empty.
- Component index: ordered sections with unique IDs, roles and declared headings.
  Each section selects a case-owned `path` or an `activity_binding`.
- Activity bindings: ordered fragments with declared `case` or `activity` scope.
  Referenced files must stay within the corresponding case/activity directory.
- Activity: case binding, shared instructions, author SKILL.md, result-release
  policy, facilitator policy, record-release rules and feedback/deployment
  selections. Scoring and proactive instructional intervention remain disabled.
- Feedback: one `guide_ref`, one `modes_ref` and its rendered `title`. The guide
  must match case/activity, retain its reviewed source hash and disable numeric
  scoring. Domain IDs and criteria are supplied; there is no fixed domain count.
- Deployment: `adapter: native-v1`, bundle/archive/standalone destinations,
  standalone title, and explicit assets (`source_ref` plus `package_path`).
  Assets can be empty. All builds currently produce both export formats.

`pipeline_components.py` assembles text and joins record facts with activity
ownership, availability and discovery rules by stable ID. Duplicate, missing or
unknown rules and attempts to replace factual fields fail. Record content
references identify exact clinical content; author components must actually
include the required report contents. The generated compatibility catalog is an
output for the transcript reviewer, not an author input.

## Metadata and approved visuals

Authored text can use explicit scalar placeholders:

```text
{{case.patient.name}}
{{case.encounter_date}}
{{activity.runtime_revision}}
{{visual.symptom_location}}
{{records.inventory}}
```

Available metadata consists of case `id`, `version`, `encounter_date`, scalar
patient metadata, activity `id` and `runtime_revision`. Visual fields are limited
to `visible_description`, `symptom_location`, `location_answer` and `visual_answer`.
Unknown, unavailable or malformed placeholders fail before writing. Substitution
is one pass; values are never executed or evaluated as more placeholders.
Source paths, raw alternative text and faculty-only review fields are excluded.

A case may supply `visual_ref` and optional `visual_source_document_ref` for a
Word source's embedded title/description. Generic validation checks case identity,
faculty approval, reviewed metadata and required approved text fields. If the
case supplies `photo_ref`, that exact source must be among the selected assets.
No image name, body site, document path or fallback sentence is built into Python.
Cases without visual inputs need no image or Word document.

`{{records.inventory}}` places the derived inventory explicitly. Otherwise a
nonempty inventory is appended. `deployment.inventory_format` selects `explicit`
(the default, including firm-plan permission) or `compact` (the existing Shannon
rendering). Duplicate placement fails. These are text formats, not clinical rules.

## Explicit export variants

The same content is used in both formats unless author inputs provide a variant:

- A component can include `standalone: {path, heading}` for inline-specific text.
- A bound fragment can provide `standalone_path` within its declared scope.
- `standalone_instructions_ref` selects inline-specific base instructions;
  otherwise the selected shared instructions are reused.

Templates are supported in base instructions, SKILL.md, release policy and case
components. If base instructions contain placeholders, supply a separate
`deployment.base_instructions_path` to export the rendered text without changing
the author template. The build result identifies the usable base-instructions
path. An unchanged base file remains usable at its original path.

The builder never discovers export differences by matching patient sentences,
rewriting clinical facts or slicing named clinical sections. Image release and
fallback behavior are authored text, not inferred from packaging.

## Packaging and checks

The fixed offline package contract contains SKILL.md, case, release policy,
learning modes, summary guide and selected assets. Existing 8,000-unit base,
under-20,000-unit skill and 48,000-unit standalone budgets remain. Standalone
counting covers LF/UTF-16, CRLF/UTF-16 and UTF-8. The builder rejects escaping
paths, output/input collisions, duplicate package members and stale unselected
bundle files before writing. Use a clean bundle directory when changing membership.

The manifest validator derives the case from the selected activity. Source maps
may declare an inventory `directory` and `patterns`; these are provided data,
not a hardcoded case folder or file extension. Faculty source access, selected
composition, review references and existing generated catalogs are checked.

Profession, level, mode, setting, variation and assessment timing remain
descriptive unless explicitly used in supplied runtime text. This version does
not implement combined rubrics, new rating systems, consultation permissions,
intervention triggers, automated arbitrary-document interpretation or faculty
approval. Role classification and prompt instructions are not access controls.

## Shannon migration and regression

Shannon now uses this same authored-input path. Her active runtime sections live
under `cases/shannon-anderson/runtime/`; activity fragments and compact inline
instructions live under `activities/fnp-telehealth-practice/runtime-policies/`.
Encounter-result clinical tables and record definitions remain supplied inputs.
See [the migration record](cases/shannon-anderson/migration/README.md) for inactive
snapshots, source hashes and the retired compatibility source.

No new clinical or patient behavior is introduced. Every runtime file and the
record catalog match `tests/shannon-build-baseline.json` byte for byte. ZIP member
payloads are checked; archive metadata/timestamps may vary. The isolated rebuild
removes generated exports first. Independent synthetic cases test metadata,
visual paths, approval checks, format variants, selected assets and feedback
criteria without any Shannon inputs. As of October 26, 2026, all 66 tests pass,
with author-manifest and reference-view checks passing. No live-host or clinical
validation was performed.

`reference-views/shannon-anderson/` remains generated author-review material.
Its sections reconstruct the current runtime byte for byte and must never feed
back into compilation. See [the roadmap](../SIMULATION-PIPELINE-ROADMAP.md),
[the handoff](../HANDOFF.md) and [faculty workflow](../FACULTY-WORKFLOW.md) for
remaining Linda intake, clinical review and live validation work.
