import { AREA_KEYS } from './compiler.mjs';
import { createZip, readZip } from './zip.mjs';
export const CASE_GROUP_KEYS = ['context', ...AREA_KEYS, 'feedback'];
export function newCaseId() { return crypto.randomUUID(); }
function caseString(value) { if (typeof value !== 'string') throw new Error('Invalid case text field.'); return value; }
function caseRole(role) {
  if (!role || typeof role !== 'object') throw new Error('Invalid professional role.');
  return {
    id: caseString(role.id),
    title: caseString(role.title),
    text: caseString(role.text || ''),
    isCustom: Boolean(role.isCustom),
    active: Boolean(role.active)
  };
}
function caseImage(image) {
  if (!image || typeof image !== 'object') throw new Error('Invalid case image.');
  if (image.bytes != null && !(image.bytes instanceof Uint8Array)) throw new Error('Invalid image bytes.');
  if (!Array.isArray(image.metadata)) throw new Error('Invalid image metadata.');
  return { name: caseString(image.name), label: caseString(image.label || image.name), bytes: image.bytes ? image.bytes.slice() : null,
    metadata: image.metadata.map(m => ({ label: caseString(m.label), text: caseString(m.text) })),
    description: caseString(image.description || ''), releaseCondition: caseString(image.releaseCondition || ''),
    excluded: Boolean(image.excluded), reviewOpen: Boolean(image.reviewOpen), warning: caseString(image.warning || '') };
}
export function cleanCaseModel(model) {
  if (!model || !['none', 'fnp', 'ipe'].includes(model.preset) || !['single', 'skills'].includes(model.format) || !['', 'supplement', 'replace'].includes(model.composition)) throw new Error('Invalid case settings.');
  const groups = Object.fromEntries(CASE_GROUP_KEYS.map(key => {
    const group = model.groups?.[key];
    if (!group || !Array.isArray(group.files)) throw new Error('Missing case input group.');
    const files = group.files.map(file => {
      const base = { name: caseString(file.name), status: file.status === 'ready' ? 'ready' : 'error' };
      if (base.status === 'error') return { ...base, error: file.status === 'loading' ? 'Import was interrupted. Remove or replace this source.' : caseString(file.error || 'Source could not be read; remove or replace it.') };
      if (file.kind === 'image') return { ...base, ...caseImage(file), kind: 'image' };
      if (file.kind !== 'text') throw new Error('Invalid source kind.');
      return { ...base, kind: 'text', text: caseString(file.text), warning: caseString(file.warning || ''), images: (file.images || []).map(caseImage) };
    });
    return [key, { text: caseString(group.text), files }];
  }));
  let presetSnapshot = null;
  if (model.preset !== 'none') {
    const preset = model.presetSnapshot;
    if (!preset || preset.key !== model.preset) throw new Error('Missing saved preset content.');
    presetSnapshot = { key: preset.key, title: caseString(preset.title), text: caseString(preset.text), description: caseString(preset.description || ''), version: caseString(preset.version) };
  }
  const roles = Array.isArray(model.roles) ? model.roles.map(caseRole) : [];
  return { name: caseString(model.name), role: caseString(model.role), description: caseString(model.description), groups, preset: model.preset, presetSnapshot, composition: model.composition, format: model.format, roles };
}
export function normalizeCaseSnapshot(snapshot) {
  if (!snapshot || snapshot.schema_version !== 1) throw new Error('Unsupported case version. Keep a backup and open it with a compatible builder.');
  if (typeof snapshot.id !== 'string' || !snapshot.id || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || !Number.isFinite(Date.parse(snapshot.created_at)) || !Number.isFinite(Date.parse(snapshot.saved_at))) throw new Error('Invalid case record.');
  const view = snapshot.view;
  if (!view || !Number.isInteger(view.step) || view.step < 0 || view.step > 3 || !AREA_KEYS.includes(view.area)) throw new Error('Invalid case view.');
  return { schema_version: 1, builder_version: caseString(snapshot.builder_version), id: snapshot.id, revision: snapshot.revision,
    created_at: snapshot.created_at, saved_at: snapshot.saved_at, model: cleanCaseModel(snapshot.model), view: { step: view.step, area: view.area } };
}
export function caseHasWork(model) {
  return Boolean(model.name || model.role || model.description || model.preset !== 'none' || model.format !== 'single' || model.composition || (model.roles && model.roles.some(r => r.active || r.isCustom)) || Object.values(model.groups).some(g => g.text || g.files.length));
}
export function caseConflict(message = 'This case changed in another tab. Open the latest copy or save your work as a separate case.') { const error = new Error(message); error.name = 'CaseConflictError'; return error; }
export async function openCaseStorage(factory = globalThis.indexedDB) {
  if (!factory) throw new Error('Browser storage is unavailable.');
  const db = await new Promise((resolve, reject) => {
    const request = factory.open('simulated-patient-builder-cases', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('cases', { keyPath: 'id' }); request.result.createObjectStore('meta'); };
    request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('Close other builder tabs to enable local saving.'));
    request.onsuccess = () => resolve(request.result);
  });
  db.onversionchange = () => db.close();
  function transaction(stores, mode, operation) {
    return new Promise((resolve, reject) => {
      let result, failure;
      const tx = db.transaction(stores, mode);
      tx.oncomplete = () => resolve(result); tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Local save failed.'));
      try { operation(tx, value => { result = value; }, error => { failure = error; tx.abort(); }); } catch (error) { failure = error; tx.abort(); }
    });
  }
  const storage = {
    list: () => transaction(['cases'], 'readonly', (tx, done) => { tx.objectStore('cases').getAll().onsuccess = event => done(event.target.result); }),
    get: id => transaction(['cases'], 'readonly', (tx, done) => { tx.objectStore('cases').get(id).onsuccess = event => done(event.target.result); }),
    active: () => transaction(['meta'], 'readonly', (tx, done) => { tx.objectStore('meta').get('active').onsuccess = event => done(event.target.result); }),
    activate: id => transaction(['meta'], 'readwrite', tx => { tx.objectStore('meta').put(id, 'active'); }),
    save: (snapshot, expectedRevision) => transaction(['cases', 'meta'], 'readwrite', (tx, done, fail) => {
      const store = tx.objectStore('cases'); store.get(snapshot.id).onsuccess = event => {
        const prior = event.target.result;
        if ((prior?.revision ?? null) !== expectedRevision) { fail(caseConflict()); return; }
        try {
          const record = normalizeCaseSnapshot({ ...snapshot, revision: (expectedRevision ?? 0) + 1 });
          store.put(record); tx.objectStore('meta').put(record.id, 'active'); done(record);
        } catch (error) { fail(error); }
      };
    }),
    remove: (id, expectedRevision) => transaction(['cases', 'meta'], 'readwrite', (tx, done, fail) => {
      const store = tx.objectStore('cases'); store.get(id).onsuccess = event => {
        if ((event.target.result?.revision ?? null) !== expectedRevision) { fail(caseConflict()); return; }
        store.delete(id); const meta = tx.objectStore('meta'); meta.get('active').onsuccess = event => { if (event.target.result === id) meta.delete('active'); };
      };
    }),
    clear: () => transaction(['cases', 'meta'], 'readwrite', tx => { tx.objectStore('cases').clear(); tx.objectStore('meta').clear(); }),
    close: () => db.close(),
  };
  try {
    const probe = newCaseId();
    await transaction(['meta'], 'readwrite', tx => tx.objectStore('meta').put(probe, 'probe-' + probe));
    await transaction(['meta'], 'readwrite', (tx, done, fail) => { const store = tx.objectStore('meta'); store.get('probe-' + probe).onsuccess = event => { if (event.target.result !== probe) fail(new Error('Storage verification failed.')); else store.delete('probe-' + probe); }; });
  } catch (error) { db.close(); throw error; }
  return storage;
}
// Backup serialization walks plain data only. Image bytes never become JSON number arrays.
export function encodeCaseBackup(snapshot) {
  const assets = [];
  function pack(value) {
    if (value instanceof Uint8Array) { const name = `assets/${String(assets.length + 1).padStart(4, '0')}.bin`; assets.push({ name, data: value }); return { case_asset: name }; }
    if (Array.isArray(value)) return value.map(pack);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, pack(entry)]));
    return value;
  }
  const json = JSON.stringify({ backup_format: 'simulated-patient-case', backup_version: 1, snapshot: pack(snapshot) }, null, 2);
  return createZip([{ name: 'case.json', data: json }, ...assets, { name: 'README.txt', data: 'Editable simulated-patient case backup. Open with the builder using Open case backup. Includes extracted content and available images, not original Word archives. Chatbot exports are separate. Keep this file to move or recover your case.\n' }]);
}
export async function decodeCaseBackup(bytes) {
  const zip = await readZip(bytes);
  if (!zip.has('case.json')) throw new Error('This is not an editable case backup.');
  const document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await zip.get('case.json')()));
  if (document.backup_format !== 'simulated-patient-case' || document.backup_version !== 1) throw new Error('Unsupported backup version.');
  const used = new Set(['case.json', 'README.txt']);
  async function unpack(value) {
    if (Array.isArray(value)) return Promise.all(value.map(unpack));
    if (value && typeof value === 'object') {
      if (Object.hasOwn(value, 'case_asset')) {
        if (Object.keys(value).length !== 1 || !/^assets\/\d+\.bin$/.test(value.case_asset) || !zip.has(value.case_asset)) throw new Error('Invalid or missing backup asset.');
        used.add(value.case_asset); return zip.get(value.case_asset)();
      }
      return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, entry]) => [key, await unpack(entry)])));
    }
    return value;
  }
  const snapshot = normalizeCaseSnapshot(await unpack(document.snapshot));
  for (const name of zip.keys()) if (!used.has(name)) throw new Error('Unexpected member in case backup.');
  return snapshot;
}
