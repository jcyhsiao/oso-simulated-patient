# Simulated Patient Builder

Single-file instructional compiler for simulated patient encounters in **Carmen AI Assistant**.

Open `dist/simulated-patient-builder.html` directly in a modern web browser. The entire application—BUX styles, fonts, templates, runtime boundaries, professional scope profiles, and feedback presets—is self-contained. No server, package installation, network connection, or external AI API is required.

---

## For faculty

*Product decision (October 27, 2026):* The builder exports a single instruction file (`*-carmen-instructions.md`) designed to be copied directly into **Carmen AI Assistant**. Multi-file skill ZIPs, setup guide downloads, and AI synthesis prompts have been retired in favor of direct browser compilation.

1. **Open the builder**: Open `dist/simulated-patient-builder.html` in any current web browser (Chrome, Edge, Firefox, Safari). It works completely offline with no setup, accounts, or logins.
2. **Describe the case**: Enter the case name, enter the learner's role (e.g., "Family Nurse Practitioner student"), select participating professional roles to establish interprofessional scope boundaries, and choose your policy for unlisted symptoms (neutral non-committal uncertainty by default, or natural lay denial).
3. **Add case materials**: Paste text or attach documents into the four material areas. "Patient parameters and disclosable information" is required; learner background, consultant findings, facilitator observation references, and course context are optional. Word documents (`.docx`), Markdown (`.md`), and plain text (`.txt`) are extracted automatically. Review any extracted image descriptions.
4. **Choose feedback criteria**: Select a feedback preset (FNP OSCE qualitative rubric, Buckeye IPE rubric, or none) and optionally supplement or replace it with your own case-specific criteria.
5. **Compile instructions**: Go to the Export step and click **Build instructions for Carmen AI Assistant**. The builder checks all inputs, enforces closed-world anti-hallucination rules, and verifies instructions remain under the 48,000-unit Carmen budget (surfacing an amber warning if within 3,000 units).
6. **Copy into Carmen AI Assistant**: Click **Copy instructions to clipboard** (or **Download instruction file**), navigate to Carmen AI Assistant, and paste the instructions into your assistant's instruction configuration box.

---

## Saving and backups

Cases save automatically in your browser's local storage (IndexedDB) as you type and import files, including unfinished work, step navigation, and reviewed image descriptions. Refreshing or reopening resumes your active case.

- **My cases**: View, reopen, duplicate, search, and delete saved cases.
- **Start new case**: Safely saves your current work before clearing the form.
- **Save now**: Immediately flushes pending edits.
- **Case backups (`.spcase.zip`)**: Download or import lossless editable backups under the Case menu. Backups contain extracted text, source names, image review metadata, and case settings. Use backups to move cases between computers, different browsers, or after clearing browser caches. (Backups are editable project archives, separate from Carmen AI Assistant exports.)

---

## Supported inputs and privacy

- **Supported text files**: UTF-8 TXT, Markdown, and Word DOCX main-body paragraphs, tables, and text boxes. The importer selects one `AlternateContent` representation rather than duplicating text and preserves paragraph boundaries. Tracked changes must be accepted/rejected in Word before import. PDF/scanned OCR is not supported.
- **Image handling**: Main-body Word, PNG, and JPEG image descriptions and EXIF/alt metadata are displayed as source evidence. Use the review controls to approve the description or exclude the image. Missing descriptions block export. Single-file Carmen instructions contain reviewed descriptions; raw image bytes are not embedded in text instructions.
- **Offline privacy**: Cases are never transmitted to an external server or third-party service. Content is rendered safely as text without executing uploaded HTML. An embedded Content Security Policy (CSP) blocks outbound network requests.

---

## For maintainers

### Development commands

```sh
npm run build      # Rebuilds standalone and static-host HTML bundles
npm test           # Runs all Node test suites
npm run preview    # Serves the built bundle at http://127.0.0.1:4173
```

`web/build.mjs` generates two byte-identical standalone artifacts:
- `web/dist/simulated-patient-builder.html` (primary standalone file)
- `web/dist/index.html` (for optional static web hosting)

The root `vercel.json` provides optional static hosting configuration. No build-time or runtime environment variables are required.

### Architecture and source layout

- `compiler.mjs`: Role-scoped input assembly, conservative unit counting (`Math.max(utf16, crlf, utf8)`), unlisted symptom policy insertion, verbatim role scope preservation, feedback composition, and Carmen AI Assistant instructions markdown generator.
- `app.mjs`: Reactive form state, safe DOM previews, unit breakdown visualization, validation, and Clipboard/Blob download triggers.
- `imports.mjs`: Client-side file extraction for DOCX (using the browser's `DecompressionStream`), Markdown, and plain text.
- `case-storage.mjs`: Validated case schemas (`schema_version: 1`), IndexedDB transactional storage, and `.spcase.zip` backup encoding/decoding.
- `case-session.mjs`: Autosave debouncing, crash recovery, case library dialog, and duplicate/delete handlers.
- `zip.mjs`: Offline ZIP generator and reader.
- `content/`: Shared runtime boundaries (`runtime.md`), setup checks (`setup-checks.md`), feedback presets (`fnp-osce.md`, `buckeye-ipe.md`), and 11 interprofessional learner-role profiles (`professionals/*.md`).
- `tests/`: Automated unit and browser QA suites:
  - `compiler.test.mjs`: Synthetic budget tests (45k warning, 48k block), unlisted symptom policies, verbatim role preservation, profile validation, and format enforcement.
  - `case-storage.test.mjs`: Snapshot round-trips, format normalization, and quota handling.
  - `image-metadata.test.mjs`: EXIF, PNG chunk, and DOCX drawing description extraction.
  - `folder-check.cjs`: Generic CLI tool to compile and report unit breakdowns on any case folder without hardcoded case logic (`node web/tests/folder-check.cjs <folder>`).
