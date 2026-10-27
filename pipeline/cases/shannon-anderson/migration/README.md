# Migration from compatibility transformations to authored runtime text

October 26, 2026. This is a content-preserving author-input migration, not a new
clinical revision or faculty approval. The existing clinical revision remains
`2026-10-21-copilot-pilot-7`.

The former `shannon-compat-v1` adapter transformed active ordered components and
activity policy fragments at build time. Those existing operations were executed
once against the active inputs to produce editable runtime components and
explicit export variants. Generated deployment files and reference views were
not read as migration inputs. Their pre-existing hashes remain regression
expectations, not authoring sources.

## Active inputs after migration

- `../components.json` selects runtime sections under `../runtime/` and existing
  encounter-results fact tables under `../clinical/`.
- The symptom table under `../runtime/clinical/` uses the approved visual-location
  placeholder. All other symptom rows preserve the prior content.
- Activity `runtime-policies/` contains the current history/results policy
  fragments and the already-compacted standalone instructions.
- Explicit component `standalone` entries supply the existing inline-loading
  wording and text-only image guidance. No sentence matching or heading slicing
  occurs in the new build.
- Identity and revision placeholders read supplied case/activity metadata.
  Approved appearance, location and fallback placeholders read the selected
  visual specification after approval, case-binding and metadata checks.
- `{{records.inventory}}` places the record catalog at its existing location.
  The activity selects its existing compact rendering to preserve runtime bytes.

Record facts, patient-held versus facilitator routing, prior-assessment
behavior, ordinary patient understanding, natural entry, recall variation,
clinical data, image fallback and feedback content are unchanged. The original
Word documents, photograph and historical canonical clinical Markdown remain
unchanged. The two proposed advocacy/jargon behaviors are still pending.

## Inactive historical material

`initial-components.json` records the previous ordering and references.
`compatibility-v1-source.txt` preserves the retired implementation for provenance;
it is not executable build code and the builder does not load it.
`source-hashes.json` records the pre-migration inputs and adapter hash.

The former `components/` case files, original `policies/` activity files and
`clinical/section-04-table.md` preserve pre-adapter source snapshots. They are not
active runtime inputs unless explicitly referenced by a current manifest. The
encounter-results clinical files remain active through current activity bindings;
historical record definitions and facilitator examination references now point to the corresponding active runtime sections.

The old test asserting equality between pre-adapter assembly and the canonical
snapshot has been replaced by a check of the authored runtime against the
unchanged pre-refactor runtime hash. The isolated full rebuild also deletes all
generated Shannon exports before reconstructing every file and comparing it to
`tests/shannon-build-baseline.json`. Existing clinical-table, original-image,
source-hash and reference-view checks remain in place.
