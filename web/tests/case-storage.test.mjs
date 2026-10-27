import test from 'node:test';
import assert from 'node:assert/strict';
import { CASE_GROUP_KEYS, cleanCaseModel, normalizeCaseSnapshot, encodeCaseBackup, decodeCaseBackup, caseHasWork } from '../case-storage.mjs';
import { compileEncounter } from '../compiler.mjs';
import { createZip } from '../zip.mjs';
function caseFixture() {
  return { schema_version: 1, builder_version: 'test', id: 'original', revision: 3, created_at: '2026-10-27T12:00:00Z', saved_at: '2026-10-27T13:00:00Z', view: { step: 2, area: 'patient-parameters-and-disclosable-info' }, model: {
    name: 'Case 🦷', role: 'Learner', description: 'Optional\ncontext', preset: 'fnp', presetSnapshot: { key: 'fnp', title: 'Pinned preset', text: 'ORIGINAL PRESET', description: 'Original', version: 'old' }, composition: 'supplement', format: 'skills',
    roles: [
      { id: 'dh', title: 'Dental Hygiene', text: 'DH scope', isCustom: false, active: true },
      { id: 'custom-fnp', title: 'Graduate student in the FNP program', text: 'FNP scope', isCustom: true, active: false }
    ],
    groups: Object.fromEntries(CASE_GROUP_KEYS.map(key => [key, { text: 'Authored ' + key, files: [{ status: 'ready', kind: 'text', name: key + '.docx', text: 'Extracted ' + key, warning: 'Verify source', images: [{ name: 'a.png', label: 'Visual 1', bytes: new Uint8Array([137, 80, 78, 71]), metadata: [{ label: 'Alt', text: 'Unreviewed source' }], description: 'Reviewed description', releaseCondition: 'When asked', excluded: key === 'context', reviewOpen: true }] }] }]))
  } };
}
test('editable backups round-trip all groups, settings, image review and bytes', async () => {
  const original = normalizeCaseSnapshot(caseFixture()); const restored = await decodeCaseBackup(encodeCaseBackup(original));
  assert.deepEqual(restored, original);
  const content = { version: 'new', runtime: 'Runtime', presets: { fnp: { title: 'Changed preset', text: 'NEW PRESET' } } };
  const before = compileEncounter(original.model, content), after = compileEncounter(restored.model, content);
  assert.deepEqual(after, before); assert.match(after.feedbackText, /ORIGINAL PRESET/); assert.doesNotMatch(after.feedbackText, /NEW PRESET/);
  assert.equal(after.manifest.feedback.preset_version, 'old');
});
test('saving incomplete work records interrupted imports without preserving source handles', () => {
  const record = caseFixture(); record.model.name = ''; record.model.role = '';
  record.model.groups.context.files.push({ name: 'unfinished.docx', status: 'loading', source: { privateHandle: true } });
  const cleaned = normalizeCaseSnapshot(record), file = cleaned.model.groups.context.files.at(-1);
  assert.equal(file.status, 'error'); assert.match(file.error, /interrupted/); assert.equal(file.source, undefined);
  assert.equal(record.model.groups.context.files.at(-1).status, 'loading');
  assert.equal(caseHasWork(cleaned.model), true);
});
test('invalid and future snapshots are rejected without mutation', () => {
  const record = caseFixture(); record.schema_version = 2;
  assert.throws(() => normalizeCaseSnapshot(record), /Unsupported case version/); assert.equal(record.schema_version, 2);
  record.schema_version = 1; record.model.groups.context.files[0].images[0].bytes = [1, 2];
  assert.throws(() => normalizeCaseSnapshot(record), /Invalid image bytes/);
  assert.throws(() => cleanCaseModel({ ...record.model, presetSnapshot: null }), /Missing saved preset|Invalid image/);
});
test('case backups reject missing assets, unexpected files, invalid settings and corrupt JSON', async () => {
  const record = caseFixture(); record.model.groups.context.files[0].images[0].bytes = { case_asset: 'assets/0001.bin' };
  const container = { backup_format: 'simulated-patient-case', backup_version: 1, snapshot: record };
  await assert.rejects(decodeCaseBackup(createZip([{ name: 'case.json', data: JSON.stringify(container) }])), /missing backup asset/);
  await assert.rejects(decodeCaseBackup(createZip([{ name: 'case.json', data: '{' }])), SyntaxError);
  await assert.rejects(decodeCaseBackup(createZip([{ name: 'references/case.md', data: 'Chatbot export' }])), /not an editable/);
  const valid = caseFixture(); valid.model.format = 'execute';
  assert.throws(() => normalizeCaseSnapshot(valid), /Invalid case settings/);
});
