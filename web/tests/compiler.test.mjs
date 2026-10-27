import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { compileEncounter, textCounts, renderScalar, AREA_KEYS, pruneProfessionalScope } from '../compiler.mjs';
import { createZip, readZip } from '../zip.mjs';

const content = {
  version: 'test',
  setup: await readFile(new URL('../content/setup-checks.md', import.meta.url), 'utf8'),
  runtime: await readFile(new URL('../content/runtime.md', import.meta.url), 'utf8'),
  presets: {
    fnp: { title: 'FNP OSCE', text: await readFile(new URL('../content/fnp-osce.md', import.meta.url), 'utf8') },
    ipe: { title: 'Buckeye IPE', text: await readFile(new URL('../content/buckeye-ipe.md', import.meta.url), 'utf8') }
  }
};

function fixture() {
  return {
    name: 'Example person',
    role: 'Example learner',
    description: '',
    groups: Object.fromEntries(['context', ...AREA_KEYS, 'feedback'].map(key => [key, { text: key === AREA_KEYS[3] ? 'Supplied fictional fact: favorite color is blue.' : '', files: [] }])),
    preset: 'none',
    composition: '',
    format: 'synthesis'
  };
}

test('synthesis export retains provided role-scoped material and instructions for Canvas AI Assistant', () => {
  const model = fixture();
  model.groups.context.text = 'Course example: a different patient.';
  model.groups['learner-has-info'].text = 'Learner already knows the color.';
  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  assert.equal(result.files.length, 1);
  const text = result.files[0].data;
  assert.match(text, /Course example: a different patient/);
  assert.match(text, /No preliminary feedback is selected/);
  assert.match(text, /TASK: Generate Instructions for Canvas AI Assistant/);
  assert.match(text, /Course or assignment context/);
});

test('preset/custom feedback combinations preserve independent criteria', () => {
  for (const preset of ['fnp', 'ipe']) {
    const model = fixture();
    model.preset = preset;
    const title = content.presets[preset].title;
    assert.match(compileEncounter(model, content).feedbackLabel, new RegExp(title));
    model.groups.feedback.text = 'CUSTOM TARGET';
    assert.match(compileEncounter(model, content).errors.join(), /Supplement or Replace/);
    model.composition = 'supplement';
    let result = compileEncounter(model, content);
    assert.match(result.feedbackText, /CUSTOM TARGET/);
    assert.match(result.feedbackText, new RegExp(title));
    model.composition = 'replace';
    result = compileEncounter(model, content);
    assert.match(result.feedbackText, /CUSTOM TARGET/);
    assert.doesNotMatch(result.feedbackText, /# FNP OSCE preliminary|# Buckeye IPE preliminary/);
    assert.equal(result.manifest.feedback.preset, null);
  }
  const model = fixture();
  model.groups.feedback.files.push({ status: 'ready', kind: 'text', name: 'criteria.md', text: 'FILE CRITERIA' });
  assert.match(compileEncounter(model, content).feedbackText, /FILE CRITERIA/);
});

test('BuckIPE anchors remain independent and preset contains no housing targets', () => {
  assert.match(content.presets.ipe.text, /0 = an opportunity/);
  assert.match(content.presets.ipe.text, /N\/O/);
  assert.doesNotMatch(content.presets.ipe.text, /mold|housing/);
  assert.doesNotMatch(content.presets.fnp.text, /gout|HCTZ|uric acid/);
});

test('NPSCA qualitative adaptation covers all supplied items in synthesis prompt', () => {
  const preset = content.presets.fnp.text;
  assert.deepEqual([...preset.matchAll(/^(\d+)\. /gm)].map(match => Number(match[1])), Array.from({ length: 17 }, (_, index) => index + 1));
  assert.deepEqual([...preset.matchAll(/^## (.+)$/gm)].map(match => match[1]), ['Communication', 'Promote Caring Relationships', 'Diagnostic Reasoning', 'Patient Management']);
  assert.match(preset, /revised April 10, 2024/);
  assert.match(preset, /Mark physical performance Not assessable/);
  assert.match(preset, /not NPSCA rating levels/);
  assert.match(preset, /Do not map these labels to the original numerical scale/);
  assert.doesNotMatch(preset, /NPSCA is unavailable|No NPSCA instrument/);
  const model = fixture();
  model.preset = 'fnp';
  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  assert.ok(result.files[0].data.includes(preset));
});

test('uploaded text is additive and inclusion order is preserved', () => {
  const model = fixture(), group = model.groups[AREA_KEYS[3]];
  group.files = [{ status: 'ready', kind: 'text', name: 'one.md', text: 'FIRST FILE' }, { status: 'ready', kind: 'text', name: 'two.md', text: 'SECOND FILE' }];
  const result = compileEncounter(model, content);
  assert.match(result.caseText, /favorite color is blue/);
  assert.ok(result.caseText.indexOf('FIRST FILE') < result.caseText.indexOf('SECOND FILE'));
});

test('pruneProfessionalScope strips metadata while preserving operational scope and boundaries', () => {
  const raw = `# PROFESSIONAL: Dental hygiene
ID: DH | Version 0.1 | Reusable draft

## Role and scope
A dental hygienist in a supervised clinic.

## Priorities
Oral health and prevention.

## Boundaries
Do not diagnose systemic disease.

## Review metadata
Owner/reviewer: pending.

## Progressive response rule
The full profile guides your choices.`;

  const pruned = pruneProfessionalScope(raw);
  assert.match(pruned, /## Role and scope\nA dental hygienist in a supervised clinic/);
  assert.match(pruned, /## Priorities\nOral health and prevention/);
  assert.match(pruned, /## Boundaries\nDo not diagnose systemic disease/);
  assert.doesNotMatch(pruned, /Review metadata|Progressive response rule|ID: DH/);
});

test('missing content, failed imports, and unapproved asset descriptions block export', () => {
  const model = fixture();
  model.name = '';
  model.role = '';
  model.groups[AREA_KEYS[3]].text = '';
  model.groups.context.files.push({ name: 'bad.pdf', status: 'error' });
  const result = compileEncounter(model, content);
  assert.equal(result.files.length, 0);
  assert.equal(result.errors.length, 4);
  const assetModel = fixture();
  assetModel.groups[AREA_KEYS[3]].files.push({ name: 'photo.jpg', status: 'ready', kind: 'image', description: '' });
  assert.match(compileEncounter(assetModel, content).errors.join(), /description/);
});

test('ZIP integrity and path checks reject corruption and unsafe members', async () => {
  assert.throws(() => createZip([{ name: '../bad', data: 'x' }]), /Unsafe/);
  assert.throws(() => createZip([{ name: 'a', data: 'x' }, { name: 'a', data: 'x' }]), /Duplicate/);
  const bytes = createZip([{ name: 'test.txt', data: 'hello' }]);
  bytes[38] ^= 1;
  const zip = await readZip(bytes);
  await assert.rejects(zip.get('test.txt')(), /integrity/);
});

test('shared scalar rendering and conservative counting match the Python reference', () => {
  const context = { 'case.patient.name': 'Alex 🦷', 'case.age': 67 };
  const template = 'Hello {{case.patient.name}}\nAge {{case.age}}';
  const result = spawnSync('python3', ['-B', '-c', "import sys,json;sys.path.insert(0,'scripts');from authored_text import render_text;v=json.loads(sys.stdin.read());print(json.dumps(render_text(v['template'],v['context'])))"], { input: JSON.stringify({ template, context }), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const text = JSON.parse(result.stdout);
  assert.equal(renderScalar(template, context), text);
  const counts = textCounts(text);
  assert.equal(counts.utf16, text.length);
  assert.equal(counts.utf8, Buffer.byteLength(text));
  assert.equal(counts.crlf, text.length + 1);
  assert.throws(() => renderScalar('{{private.key}}', context), /Unknown/);
  assert.equal(renderScalar('{{x}}', { x: '{{unexpanded}}' }), '{{unexpanded}}');
});

test('embedded alt text is not exported until reviewed; images stay in assigned source scope', () => {
  const model = fixture();
  const image = { name: 'syllabus.png', metadata: [{ label: 'Word alt description', text: 'UNREVIEWED SOURCE INSTRUCTIONS' }], description: '', bytes: null };
  model.groups.context.files.push({ name: 'course.docx', kind: 'text', status: 'ready', text: 'COURSE CONTEXT', images: [image] });
  let result = compileEncounter(model, content);
  assert.equal(result.files.length, 0);
  assert.match(result.errors.join(), /review extracted alt text/);
  image.description = 'Reviewed course diagram description.';
  result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  assert.doesNotMatch(result.caseText, /UNREVIEWED SOURCE INSTRUCTIONS/);
  assert.ok(result.caseText.indexOf('Reviewed course diagram') < result.caseText.indexOf('Information already provided to the learner'));
  image.excluded = true;
  image.description = '';
  result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.join(), /explicitly excluded/);
});

test('synthesis prompt contains strict guardrails, three-tier architecture, and demeanor instructions', () => {
  const model = fixture();
  model.preset = 'fnp';
  model.groups.context.text = 'Historical classroom logistics: enter the clinic room; overhead warning after 15 minutes.';
  model.groups[AREA_KEYS[3]].text = 'PATIENT FACTS. Patient holds an existing report, available on relevant request.';
  model.groups.feedback.text = 'FACULTY TARGET ONLY';
  model.composition = 'supplement';
  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  const prompt = result.files[0].data;
  assert.match(prompt, /TASK: Generate Instructions for Canvas AI Assistant/);
  assert.match(prompt, /Preserve Clinical Ground Truth/);
  assert.match(prompt, /Demeanor & Emotional Presentation/);
  assert.match(prompt, /Three-Tier Architecture/);
  assert.match(prompt, /Tier 1: Patient Persona & Dialogue/);
  assert.match(prompt, /Tier 2: Facilitator Evidence Delivery/);
  assert.match(prompt, /Tier 3: Post-Encounter Evaluator/);
});

test('selected and custom professional roles synthesize into feedback with provenance notice', () => {
  const model = fixture();
  model.preset = 'ipe';
  model.roles = [
    { id: 'dental-hygiene', title: 'Dental Hygiene', text: '## Role and scope\nDH SCOPE: oral health prevention\n\n## Priorities\nPreventive care', isCustom: false, active: true },
    { id: 'custom-fnp', title: 'Graduate student in the FNP program', text: 'FNP SCOPE: advanced primary care', isCustom: true, active: true }
  ];
  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  assert.match(result.feedbackText, /## Participating learner professional roles and scope boundaries/);
  assert.match(result.feedbackText, /AI-generated starter drafts for faculty review and customization/);
  assert.match(result.feedbackText, /DH SCOPE: oral health prevention/);
  assert.match(result.feedbackText, /FNP SCOPE: advanced primary care/);
  assert.match(result.files[0].data, /Participating Professions:.*Dental Hygiene/);
  assert.equal(result.manifest.participating_roles.length, 2);
  assert.equal(result.manifest.participating_roles[0].title, 'Dental Hygiene');
  assert.equal(result.manifest.participating_roles[1].isCustom, true);
});
