# Local case saving and recovery

Proposed and implemented October 27, 2026, browser version 2026-10-27-5. This supersedes the
original no-project-saving boundary for the next browser release. Keep the
four-step builder, offline operation, direct HTML opening and static hosting.
No account, cloud sync or backend is required.

## Implemented experience

Add a compact case toolbar above the four steps:

```text
[My cases]  [Start new case]  [Save now]  [Case backup ▾]
Shannon Anderson                          Saved on this device · 10:42 AM
```

- Automatically save changes after a short pause (approximately 750 ms), with
  a maximum wait of five seconds during continuous typing. Save completed file
  imports and explicit actions promptly. Show Saving…, Saved on this device,
  or Could not save—your changes remain open. Report saved only after the
  storage transaction commits. Save now forces a pending write and provides a
  clear manual action; saving never requires a complete or exportable case.
- On reopening, restore the most recently active case and its current step.
  Show a quiet message: “Resumed Shannon Anderson. Last saved …”. If no case
  exists, open the empty Step 1. Do not persist a never-edited blank form.
- My cases opens a compact panel/dialog, with case name, learner role, last-saved
  time and current step. Sort by recently edited; allow name search. Actions:
  Open, Duplicate, Download backup and Delete. Untitled cases appear as
  “Untitled case” until faculty enter a name. Duplicate names are allowed;
  identity comes from an internal ID.
- A case is editable at any stage. Do not call it complete merely because it was
  saved or exported. No folders, tags, collaboration or version-history UI in
  this first release.
- Keep the working form visible while using My cases. Close returns focus to
  its trigger. Keyboard users can reach all actions; saving status uses a quiet
  live region and does not announce every keystroke.

## Starting over and switching cases

Primary action: **Start new case**. Explain beside it or in help: “Your current
case stays in My cases.” Commit the current nonempty case, then create a new
case ID and show an empty Step 1 with the app's normal defaults: no feedback
preset, single-file export, no text or files. No confirmation is needed when
saving succeeds. Do not inherit learner role, criteria or image descriptions.

Opening another case follows the same save-before-switch rule. Duplicate saves
the current state under a new ID and opens that copy, named “[name] — copy”.
Changing a case name never creates a second case or renames another record.

If the current work cannot be saved, keep it open and show concrete choices:
Retry save, Download backup, or Discard current changes and continue. Do not
silently switch or clear the form. The explicitly destructive choice requires
confirmation. A backup download request alone does not prove the user has saved
that file; leave the form intact until they explicitly continue.

Delete is separate from Start new case. Confirm with the case name and explain
that deletion removes this browser's copy. Deleting the active case clears its
form, download links, previews and pending writes, then opens a blank Step 1.
Also offer “Delete all saved cases” within My cases settings, with a count and
explicit confirmation. Starting over never deletes the library.

## What is saved

Store a versioned, plain-data snapshot of the current editable state:

- Case ID, display name, description, learner role, creation/save timestamps,
  record revision, snapshot schema version and builder version.
- All six input groups: context, the four source roles, and feedback. Preserve
  pasted text and ordered imported sources, source names, extraction warnings
  and extracted text exactly as currently edited/imported.
- Images, including supported bytes, source metadata, reviewed descriptions,
  release conditions and per-image exclusions. Derive the document-wide
  exclude-all/mixed checkbox from those flags on restore.
- Feedback selection and Supplement/Replace choice; selected export format.
- Active step, selected material area and image accordion open/closed state.
- Selected built-in preset version and the exact preset text used by that case.
  Opening an older case must not silently replace its feedback criteria with a
  newly shipped preset. Offer a visible update-to-current-preset action; retain
  custom criteria and composition. Preset snapshot use is an explicit compiler
  input, not an arbitrary uploaded template or executable instruction.

Do not save DOM nodes, object URLs, file-picker values, downloads or build-success
state. Recreate local image previews from saved bytes; invalidate outputs and
rebuild before download. The ready imported representation is sufficient for
resuming the current form: original DOCX/TXT uploads are not retained for future
re-extraction in this first version. Explain this in backup help. No filesystem
access or re-upload is needed to resume already extracted material.

Incomplete imports must never become fake ready files. Save their filename and
an interrupted/error marker if necessary, then ask for reattachment on restore.
File picker selection cannot be programmatically restored. Avoid rolling back
other edits while an import runs. Never require clinical/build validation to
save incomplete work.

## Local storage implementation

Use IndexedDB for case records and binary image assets; do not serialize image
bytes into localStorage. IndexedDB is asynchronous and suitable for structured
records and binary content. localStorage may hold small nonessential display
preferences, but case recovery must not depend on it.

Start with one transactionally written case snapshot per record, including its
image buffers. Avoid a separate asset graph until measured case sizes justify
it; this makes an atomic save, deletion and backup easier to verify. Do not add
an arbitrary application file/case limit. Report browser quota failures while
preserving the in-memory work and last committed copy.

Create a dedicated storage module and a versioned snapshot codec; keep the
clinical compiler independent. Capture form state into an immutable snapshot,
then serialize writes per case. An older async save must not overwrite a newer
revision or change the active case after navigation. Flush on case switching,
manual save and page visibility changes; do not rely on unload-time async work
for correctness. Cancel stale import callbacks and pending writes on reset or
delete so removed cases cannot reappear.

Use revision checks in write transactions to detect another tab editing the
same case. On conflict, preserve current unsaved work and offer Open latest or
Save as a separate copy; do not use silent last-write-wins. Do not add automatic
merging of clinical text or reviewed image descriptions.

At startup, probe actual storage availability by writing/reading/deleting a test
record. If storage is blocked or unavailable, continue in memory with a visible
“Local saving is unavailable here” status and backup actions. Never claim a
case was saved based solely on the presence of an API. Reopening must validate
snapshot structure and migrate known schema versions without overwriting the
last readable copy on failure. Unknown newer schemas remain downloadable and
are not partially loaded.

## Direct HTML, hosting and portable backups

Browser storage belongs to a browser profile and origin. Hosted preview URLs,
production domains and another browser do not automatically share cases. Direct
file behavior needs testing in each supported browser, including reopening and
moving/renaming the HTML file. Do not promise file-path-independent retention.

Provide **Download case backup** and **Open case backup** in the same release.
Use an editable `.spcase.zip` with a schema-versioned JSON snapshot, available
image bytes and a short readme. This is distinct from the chatbot instruction
and skill exports, which are not lossless editable case files. Keep original
source labels, warnings, exclusions, custom text and pinned preset content.

Validate ZIP paths, duplicate members, declared assets and schema before
opening. Render text safely and never execute imported content. Import creates
a new case ID by default, preventing an incoming backup from overwriting a local
case. Build validation still runs separately. Backups work even when browser
storage is unavailable, enabling migration from direct HTML to static hosting.

Tell faculty: “Cases are saved in this browser on this device. Download a case
backup to move it or keep another copy.” Browser data clearing, private sessions
and browser-managed eviction can remove local copies. Keep this notice concise
and adjacent to saved cases/backup actions. Update the existing memory-only
sidebar and README; continue to state accurately that no case data is uploaded.

## Implementation sequence and acceptance checks

1. Add the snapshot codec, IndexedDB adapter, availability probe and schema
   handling. Test exact round trips for Unicode, all input groups, both feedback
   composition modes, image bytes, descriptions, exclusions and ordered files.
2. Add serialized autosave, truthful status, explicit Save now and startup
   restore. Test interrupted imports, refresh/reopen, failed writes, quota errors,
   migration failure and preservation of the last committed snapshot.
3. Add My cases, Open, Duplicate, Start new case and deletion. Test that switching
   saves first, reset returns to true defaults, and late imports/writes cannot
   populate the new case or resurrect deleted records. Test multi-tab conflicts.
4. Add portable backup/open and pinned preset handling. Verify backups opened
   in a fresh profile reproduce both compiler outputs and original image bytes
   with the same builder/preset inputs, apart from intentionally changed IDs or
   timestamps. Restored outputs must require a fresh build.
5. Verify direct HTML offline and static HTTP, desktop and narrow-screen UI,
   keyboard/focus behavior, denied storage and corrupted backup paths. Explicitly
   record tested browser/version combinations; file storage behavior is not
   assumed from hosted tests. Confirm all persistence is local and no network
   capability is introduced. Update handoff, plan and user help with actual
   implemented behavior.

Ship these together so local saving, safe starting over and portable recovery
form one usable feature. Full history, cloud sync and retaining original Word
archives can follow after faculty use establishes a need.

## Technical references

- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API):
  synchronous Web Storage and the asynchronous IndexedDB alternative.
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage):
  undefined, browser-dependent behavior for direct file URLs.
- [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria):
  origin-scoped storage, quota failures and eviction constraints.
