# Simulated Patient Builder

Initial local build, October 27, 2026. Open `dist/simulated-patient-builder.html`
directly in a current browser. The complete app, BUX styles/fonts, templates and
feedback presets are embedded; no local server, package installation, AI API or
network connection is required to use the built file. The source and optional
build command require Node.js 22 or later, with no npm dependencies.

## Use

1. Enter a case name and learner role. Optionally paste/upload course context.
2. Paste/upload material in the four role-scoped areas. Patient text is required;
   the other three areas are optional. Text and files are additive; pasted text
   comes first, followed by the listed files. Inspect, reorder, replace or remove
   file inputs as needed. No automatic classification or deduplication occurs.
3. Select FNP OSCE, Buckeye IPE or no built-in preset. Add optional custom criteria
   as text/files. A preset plus custom criteria requires explicit Supplement or
   Replace. No preset and no custom criteria produces no preliminary feedback.
4. Choose single instructions or main instructions plus a case skill ZIP. Build,
   inspect counts/notes/contents, and download the selected files and setup guide.

Changing an input invalidates previous downloads. Cases now save automatically
in IndexedDB when browser storage is available, including unfinished work and
reviewed image descriptions. Refresh/reopen resumes the active case and step.
My cases opens, duplicates, searches and deletes local cases; Start new case saves
the current work before clearing the form. Save now flushes pending edits.
Saving failures preserve the open form and offer retry/backup recovery.

Use Case backup to download/open editable `.spcase.zip` files. They contain source
names, extracted text, available image bytes and review/settings state, but not
original Word archives. They are separate from chatbot exports. Backup import
creates a new case; generated chatbot downloads require a fresh build. Saved
feedback preset text stays pinned until explicitly updated. Browser clearing,
private sessions and eviction can remove local cases; use downloaded backups to
protect work or move between browsers, HTML file paths and hosted origins.

Cases are not saved to a server. All content is shown as text rather than
executing uploaded HTML. No backend exists; the embedded CSP
blocks network connections and runs only the build-hashed application script.
Prompt roles in an exported chatbot are behavioral boundaries, not technical
confidentiality.

Supported inputs: UTF-8 TXT, Markdown, DOCX main-body paragraphs/tables/text boxes,
and explicit PNG/JPEG assets in Patient. The importer selects one Word
AlternateContent representation rather than repeating Choice and Fallback, and
keeps text-box paragraph boundaries. Word lists use bullets; original numbering,
headers/footers, notes and comments are not extracted. Relevant omissions are
reported in file notes. Inspect extracted text
and paste any additional relevant sections. Tracked changes must be resolved in
Word or supplied as pasted final text. PDF/scanned text/OCR is not supported.

Image ingestion stays entirely offline. Main-body Word images expose stored
alt titles/descriptions; PNG text-description fields and JPEG EXIF ImageDescription
or XMP title/description fields are also inspected when available. A filename is
not alt text, and metadata is not a new interpretation of image pixels.

Extracted metadata is displayed as source evidence, not exported automatically.
Use the review action to copy it into an editable reviewed description, supply a
missing description, or explicitly exclude an irrelevant image. Missing unresolved
descriptions block export. Patient visuals have an optional disclosure-condition
field; the default is a relevant visual request. Images from course, learner,
facilitator or feedback documents keep their descriptions in that source area,
so course examples do not become patient facts. Layout text boxes are extracted
as text, not mistaken for clinical images. Non-raster/linked visuals can carry a
reviewed description, but unavailable bytes are not fetched or fabricated.

Modular exports preserve available raster bytes; a host must actually support asset access
and rendering. Single-file exports contain descriptions but no image bytes.
Neither image contents nor consultant roles are inferred from a document.

## Development and static hosting

```sh
npm run build
npm test
npm run preview
```

`web/build.mjs` writes two byte-identical standalone artifacts:
`web/dist/index.html` and `web/dist/simulated-patient-builder.html`.
The preview serves the same artifact on http://127.0.0.1:4173.
The root `vercel.json` declares `node web/build.mjs` and `web/dist` for a future
static Vercel deployment. No Vercel project was created or deployment performed.
The directory can also be served by any static host. No runtime environment
variables, external assets or server functions are needed. Project configuration
reference: https://vercel.com/docs/project-configuration/vercel-json.

## Source layout and presets

- `compiler.mjs`: simple role-scoped input adapter, conservative counts, selected
  feedback composition and export payloads; no patient facts in the compiler.
- `zip.mjs`: stored ZIP output and integrity-checked stored/deflated DOCX reading.
- `imports.mjs`: explicit file-format extraction. Uses the browser's
  DecompressionStream for deflated DOCX; unsupported browsers can use pasted text.
- `app.mjs`: editable form state, safe previews, import invalidation and Blob downloads.
- `case-storage.mjs`: validated case snapshots, transactional IndexedDB storage,
  revision conflicts and editable backup ZIP encoding/decoding.
- `case-session.mjs`: autosave, restore, case library, backups and recovery actions.
- `content/`: authored runtime boundaries and independent versioned feedback
  presets. FNP uses the supplied April 10, 2024 NPSCA for qualitative feedback; BuckIPE uses
  ipe-bots/review/BUCKIPE-RUBRIC-AND-REPORT.md. Housing/gout-specific targets are not
  in the reusable presets. Full criteria are inspectable in the UI and export.
- `vendor/`: the user's supplied BUX asset set and provenance.

The existing structured Python compiler and Shannon CLI profile are retained.
The simpler browser form is an additional input path; it does not automatically
reconstruct granular record definitions from arbitrary documents. Scalar-template
behavior and conservative counts are checked against the Python reference, and
ZIPs are independently read with Python. This is not a claim that a Linda form
export is byte-equivalent to the Shannon clinical runtime.

New browser limits are strictly under 50,000 maximum units for standalone and
under 20,000 for main/skill instructions, checking LF/UTF-16, CRLF/UTF-16 and UTF-8.
Reference files in the skill ZIP are not truncated to the main-instruction limit.
The existing Shannon 8,000/48,000 profile remains unchanged. No content is silently
summarized or deleted to fit. These packaging checks do not establish a host's
actual context capacity or reliably loaded skill references.

## Verification

`npm test` runs 18 compiler/ZIP/reference/metadata/case-snapshot tests. Existing Python checks:

```sh
python3 -B scripts/validate-pipeline.py
python3 -B scripts/extract-reference-views.py --check
python3 -B -m unittest discover -s tests
```

Optional end-to-end browser QA uses an existing Playwright installation:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
BROWSER_EXECUTABLE=/absolute/path/to/chrome-headless-shell \
node web/tests/browser.cjs
```

Set `BUILDER_URL=http://127.0.0.1:4173` to run against static HTTP, or omit it for
direct-file offline testing. Optional `DOCX_SAMPLE` adds a real source extraction
check; the sample is removed before building outputs, not assigned as patient
content. Test data/downloads/screenshots go to `/tmp/simulated-patient-builder-qa`
unless `BROWSER_QA_OUTPUT` is supplied. The script exercises inputs, DOCX values
and tables, safe text, ordering/removal/replacement/cancellation, images, feedback
composition, actual downloads, independent ZIP verification, overflow, no-feedback,
refresh resume, keyboard skip navigation, fonts, mobile overflow and network/CSP
errors. Browser QA was run in Chromium; other browsers and actual chatbot-host
behavior remain unverified.

Browser API references: https://compression.spec.whatwg.org/ and
https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString.


For offline image-specific browser QA, use the same environment variables with
`node web/tests/images-browser.cjs`. It checks stored Word alt fields, explicit
review, missing descriptions, exclusion, role-scoped output, actual image bytes
in a downloaded ZIP, Word fallback/text-box handling and narrow layouts. No image
generation or vision-model API is present.

See ../SHANNON-EXPORT-COMPARISON.md for the comparison of the user-pasted browser
export and the older curated Shannon runtime, including extraction issues that
were fixed in version 2026-10-27-2 and remaining source/content-policy differences.


Version 2026-10-27-3 includes the approved online-simulation refinements. Preserve
the fictional clinical setting; do not force a clinical telehealth visit. A human
timekeeper manages assessment timing, warnings and the live end signal. The bot
must not infer elapsed time or create recording/timer capabilities from source
logistics. Generic record rules separate discovery from same-response delivery
under direct requests, firm plans and consent, while preserving explicit faculty
release restrictions and exact supplied data. `content/setup-checks.md` is an
authored faculty setup/trial guide shared by both exports. These are exported
behavioral instructions, not proof that a hosting model follows them.

### October 27 follow-up (2026-10-27-4)

The FNP preset now uses a qualitative adaptation of all 17 items in the faculty-supplied NPSCA (April 10, 2024 revision), with NONPF attribution and source provenance in `content/fnp-osce.md`. Local descriptive judgments do not map to NPSCA scores or developmental levels. Case-specific clinical expectations remain supplied separately.

Embedded PNG/JPEG images show local thumbnails and expanded previews in initially collapsed accordions. Each document has an exclude-all-images checkbox with mixed state; re-inclusion preserves reviewed descriptions. Unsupported or external visuals require review in the original document. Preview URLs are separate from download URLs and cleaned up when source rows are replaced, removed or rerendered and on page exit.

### Local saving verification (2026-10-27-5)

Run `node web/tests/cases-browser.cjs` with the same Playwright environment
variables for autosave/resume, incomplete cases, switching/reset, image reviews
and byte preservation, duplicates/deletion, editable backup round trips, pinned
presets, multi-tab conflicts, quota errors, denied storage, future schema recovery
and mobile layout. Direct-file tests also close/reopen a persistent Chromium
profile and verify that interrupted imports cannot populate a newly started case.
`BUILDER_URL` selects static HTTP; otherwise direct HTML runs
offline. Outputs go to `/tmp/simulated-patient-cases-qa` by default. Browser storage
availability is probed with a real write/read/delete before the UI claims saving
works. Only committed transactions produce a saved status. The first release
supports schema version 1; newer versions are rejected without overwriting them.

See ../LOCAL-CASE-STORAGE-PLAN.md for the full interaction and persistence contract.
