import { caseHasWork, normalizeCaseSnapshot, newCaseId, openCaseStorage, encodeCaseBackup, decodeCaseBackup } from './case-storage.mjs';
import { slugify } from './compiler.mjs';

export function setupCaseSession(hooks) {
  const get = id => document.getElementById(id);
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
  const button = (text, fn) => { const el = node('button', text, 'sp-button'); el.type = 'button'; el.addEventListener('click', () => void run(fn)); return el; };
  let storage = null, ready = false, busy = false, applying = false, epoch = 0, changes = 0, committed = 0, timer, maximumTimer, tail = Promise.resolve(), pendingAction = null;
  let identity = freshIdentity(), lastFailure = null;
  const status = get('case-save-status'), errors = get('case-save-error'), recovery = get('case-recovery-actions'), library = get('case-library'), rows = get('case-library-rows');
  function freshIdentity() { return { id: newCaseId(), revision: null, created_at: new Date().toISOString() }; }
  function time(value) { return new Date(value).toLocaleString(); }
  function say(text) { status.textContent = text; }
  function cancelTimers() { clearTimeout(timer); clearTimeout(maximumTimer); timer = maximumTimer = null; }
  function snapshot() { const value = hooks.read(); return normalizeCaseSnapshot({ schema_version: 1, builder_version: hooks.version, ...identity, revision: identity.revision ?? 0, saved_at: new Date().toISOString(), ...value }); }
  function failure(error) {
    lastFailure = error; errors.textContent = error.name === 'CaseConflictError' ? error.message : `Could not save locally: ${error.message}. Your changes remain open. Retry or download a case backup.`;
    errors.hidden = false; recovery.hidden = false; get('case-conflict-copy').hidden = get('case-conflict-latest').hidden = error.name !== 'CaseConflictError';
    get('case-discard-continue').hidden = !pendingAction; say('Changes are not saved');
  }
  function clearFailure() { lastFailure = null; pendingAction = null; errors.hidden = true; recovery.hidden = true; }
  function changed() {
    if (!ready || applying) return;
    changes++; clearTimeout(timer);
    say(storage ? 'Unsaved changes' : 'Local saving is unavailable here — download a case backup');
    timer = setTimeout(() => void flush(), 750);
    if (!maximumTimer) maximumTimer = setTimeout(() => void flush(), 5000);
  }
  async function flush() {
    cancelTimers();
    const turn = epoch, version = changes;
    if (!ready) return false;
    if (identity.revision === null && !caseHasWork(hooks.read().model)) { say(storage ? 'New case · saved automatically when you begin' : 'Local saving is unavailable here — download a case backup'); return true; }
    if (!storage) { failure(new Error('Browser storage is unavailable here')); return false; }
    if (committed === version && identity.revision !== null && !lastFailure) return true;
    let captured;
    try { captured = snapshot(); } catch (error) { failure(error); return false; }
    const job = tail.then(async () => {
      if (turn !== epoch) return false;
      if (committed >= version && identity.revision !== null && !lastFailure) return true;
      say('Saving…');
      try {
        const record = await storage.save(captured, identity.revision);
        if (turn !== epoch) return false;
        identity.revision = record.revision; committed = version; clearFailure();
        say(changes === version ? `Saved on this device · ${time(record.saved_at)}` : 'Unsaved changes');
        return true;
      } catch (error) { if (turn === epoch) failure(error); return false; }
    });
    tail = job.then(() => {}, () => {});
    return job;
  }
  function activate(record = null) {
    cancelTimers(); epoch++; changes = committed = 0; clearFailure();
    identity = record ? { id: record.id, revision: record.revision, created_at: record.created_at } : freshIdentity();
    applying = true;
    try { hooks.apply(record); } finally { applying = false; }
    say(record ? `Resumed ${record.model.name || 'Untitled case'} · last saved ${time(record.saved_at)}` : storage ? 'New case · saved automatically when you begin' : 'Local saving is unavailable here — download a case backup');
  }
  async function guarded(action) {
    const ok = await flush();
    if (!ok) { if (library.open) library.close(); pendingAction = action; get('case-discard-continue').hidden = false; recovery.hidden = false; return; }
    // A completed import may have changed the form while the write was in flight.
    if (changes !== committed && caseHasWork(hooks.read().model)) return guarded(action);
    await action();
  }
  async function run(fn) {
    if (busy || !ready) return;
    busy = true; hooks.lock(true); get('case-toolbar').setAttribute('aria-busy', 'true');
    try { await fn(); } catch (error) { errors.textContent = error.message; errors.hidden = false; if (library.open) { get('case-library-error').textContent = error.message; get('case-library-error').hidden = false; } }
    finally { busy = false; hooks.lock(false); get('case-toolbar').removeAttribute('aria-busy'); }
  }
  function download(record) {
    const blob = new Blob([encodeCaseBackup(record)], { type: 'application/zip' }), url = URL.createObjectURL(blob);
    const link = node('a'); link.href = url; link.download = `${slugify(record.model?.name || 'untitled-case')}.spcase.zip`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    say('Case backup download requested. Confirm the file is saved before discarding work.');
  }
  async function openRecord(raw) {
    const record = normalizeCaseSnapshot(raw);
    await guarded(async () => { await storage.activate(record.id); activate(record); library.close(); hooks.focus(); });
  }
  async function duplicateRecord(raw = snapshot()) {
    const record = normalizeCaseSnapshot(raw);
    await guarded(async () => {
      record.id = newCaseId(); record.revision = 0; record.created_at = record.saved_at = new Date().toISOString(); record.model.name = `${record.model.name || 'Untitled case'} — copy`;
      activate(record); identity.revision = null; changes++; await flush(); library.close(); hooks.focus();
    });
  }
  async function refreshLibrary() {
    rows.replaceChildren(); get('case-library-error').hidden = true;
    if (!storage) { rows.append(node('p', 'Local saving is unavailable here. Use case backups to save and reopen your work.')); return; }
    const query = get('case-search').value.toLowerCase();
    const records = (await storage.list()).sort((a, b) => String(b.saved_at).localeCompare(String(a.saved_at)));
    for (const record of records.filter(record => String(record.model?.name || 'Untitled case').toLowerCase().includes(query))) {
      const row = node('section', undefined, 'sp-saved-case'), name = String(record.model?.name || 'Untitled case');
      row.append(node('h3', name));
      row.append(node('p', `${record.model?.role || 'Learner role not entered'} · Step ${Number(record.view?.step ?? 0) + 1} · ${record.saved_at ? time(record.saved_at) : 'Unknown save time'}`, 'sp-help'));
      const actions = node('div', undefined, 'sp-file-actions');
      actions.append(button('Open', () => openRecord(record)), button('Duplicate', () => duplicateRecord(record)), button('Download backup', () => download(record)), button('Delete', async () => {
        if (!confirm(`Delete “${name}” from this browser? Downloaded backups are unaffected.`)) return;
        if (record.id === identity.id) { cancelTimers(); await tail; }
        await storage.remove(record.id, record.revision);
        if (record.id === identity.id) { activate(); hooks.focus(); }
        await refreshLibrary();
      })); row.append(actions); rows.append(row);
    }
    if (!rows.children.length) rows.append(node('p', records.length ? 'No matching cases.' : 'No saved cases yet. Begin a case and it will save automatically.'));
    get('case-delete-all').disabled = !records.length;
  }
  get('case-my-cases').addEventListener('click', () => void run(async () => { await flush(); await refreshLibrary(); library.showModal(); get('case-search').focus(); }));
  get('case-library-close').addEventListener('click', () => library.close());
  library.addEventListener('close', () => get('case-my-cases').focus());
  get('case-search').addEventListener('input', () => void refreshLibrary().catch(error => { errors.textContent = error.message; errors.hidden = false; }));
  get('case-new').addEventListener('click', () => void run(() => guarded(async () => { await storage?.activate(null); activate(); hooks.focus(); })));
  get('case-save').addEventListener('click', () => void run(flush));
  get('case-backup').addEventListener('click', () => void run(() => download(snapshot())));
  get('case-open-backup').addEventListener('click', () => get('case-backup-input').click());
  get('case-backup-input').addEventListener('change', event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    void run(async () => {
      const record = await decodeCaseBackup(await file.arrayBuffer());
      await guarded(async () => { record.id = newCaseId(); record.revision = 0; record.created_at = new Date().toISOString(); activate(record); identity.revision = null; changes++; await flush(); hooks.focus(); });
    });
  });
  get('case-retry').addEventListener('click', () => void run(async () => {
    const continuation = pendingAction;
    if (!storage) storage = await openCaseStorage();
    if (await flush()) { if (continuation) await guarded(continuation); }
  }));
  get('case-recovery-backup').addEventListener('click', () => void run(() => download(snapshot())));
  get('case-discard-continue').addEventListener('click', () => void run(async () => {
    const continuation = pendingAction;
    if (continuation && confirm('Discard the current unsaved changes and continue? The last saved copy, if any, remains.')) { cancelTimers(); await tail; clearFailure(); await continuation(); }
  }));
  get('case-conflict-copy').addEventListener('click', () => void run(async () => {
    cancelTimers(); await tail; identity = freshIdentity(); changes++; clearFailure(); await flush();
  }));
  get('case-conflict-latest').addEventListener('click', () => void run(async () => {
    const latest = normalizeCaseSnapshot(await storage.get(identity.id));
    if (confirm('Open the latest saved case and discard this tab’s unsaved changes? Download a backup first if you need this work.')) { await storage.activate(latest.id); activate(latest); hooks.focus(); }
  }));
  get('case-delete-all').addEventListener('click', () => void run(async () => {
    const count = (await storage.list()).length;
    if (confirm(`Delete all ${count} saved cases from this browser? The current form will also be cleared. Downloaded backups are unaffected.`)) { cancelTimers(); await tail; await storage.clear(); activate(); await refreshLibrary(); }
  }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
  window.addEventListener('beforeunload', event => { if (ready && changes !== committed && caseHasWork(hooks.read().model)) { event.preventDefault(); event.returnValue = ''; } });
  hooks.lock(true);
  const initialization = (async () => {
    try {
      storage = await openCaseStorage();
      const id = await storage.active(), record = id ? await storage.get(id) : null;
      if (record) activate(normalizeCaseSnapshot(record)); else activate();
    } catch (error) {
      if (storage) { errors.textContent = `Could not resume the saved case: ${error.message} Open My cases to download or delete its stored copy.`; errors.hidden = false; say('Saved case could not be resumed'); }
      else say('Local saving is unavailable here — download a case backup');
    } finally { ready = true; hooks.lock(false); get('case-toolbar').removeAttribute('aria-busy'); }
  })();
  return { changed, flush, initialization };
}
