import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { compileEncounter, textCounts, renderScalar, AREA_KEYS } from '../compiler.mjs';
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
    format: 'carmen',
    unlistedSymptoms: 'neutral'
  };
}

test('carmen direct export produces ready-to-paste instructions and enforces under-48,000 unit budget', () => {
  const model = fixture();
  model.groups.context.text = 'Course example: a different patient.';
  model.groups['learner-has-info'].text = 'Learner already knows the color.';
  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].name, 'example-person-carmen-instructions.md');
  assert.ok(result.instructionCounts.maximum < 48000);
  assert.match(result.directInstructions, /# Example person — Simulated Patient Instructions/);
  assert.match(result.directInstructions, /STRICT CLOSED-WORLD GROUNDING/);

  const huge = fixture();
  huge.groups[AREA_KEYS[3]].text = 'a'.repeat(49000);
  const blocked = compileEncounter(huge, content);
  assert.equal(blocked.files.length, 0);
  assert.match(blocked.errors.join(), /under-48,000/);
});

test('synthetic budget tests enforce 45,000 warning and 48,000 hard block with area breakdowns', () => {
  const model46 = fixture();
  const baseRes = compileEncounter(model46, content);
  model46.groups[AREA_KEYS[3]].text = 'A'.repeat(46000 - baseRes.instructionCounts.maximum);
  const result46 = compileEncounter(model46, content);
  assert.deepEqual(result46.errors, []);
  assert.ok(result46.instructionCounts.maximum >= 45000 && result46.instructionCounts.maximum < 48000);
  assert.match(result46.warnings.join(), /within 3,000 units/);
  assert.equal(result46.files.length, 1);
  assert.ok(result46.areaCounts);
  assert.ok(result46.areaCounts['patient-parameters-and-disclosable-info'] > 30000);

  const model49 = fixture();
  model49.groups[AREA_KEYS[3]].text = 'B'.repeat(49000 - baseRes.instructionCounts.maximum);
  const result49 = compileEncounter(model49, content);
  assert.equal(result49.files.length, 0);
  assert.match(result49.errors.join(), /under-48,000 unit budget/);
  assert.ok(result49.areaCounts);
});

test('unlisted symptom policy inserts neutral or deny policy and requires marker in runtime', () => {
  const neutralModel = fixture();
  neutralModel.unlistedSymptoms = 'neutral';
  const neutralResult = compileEncounter(neutralModel, content);
  assert.deepEqual(neutralResult.errors, []);
  assert.match(neutralResult.directInstructions, /Symptoms the materials neither list as present nor explicitly deny are UNSPECIFIED/);
  assert.match(neutralResult.directInstructions, /non-committal lay uncertainty/);
  assert.equal(neutralResult.manifest.unlisted_symptoms, 'neutral');

  const denyModel = fixture();
  denyModel.unlistedSymptoms = 'deny';
  const denyResult = compileEncounter(denyModel, content);
  assert.deepEqual(denyResult.errors, []);
  assert.match(denyResult.directInstructions, /Faculty policy for this case: if the learner asks about a symptom or complaint the materials do not list as present, answer with a natural lay negative/);
  assert.equal(denyResult.manifest.unlisted_symptoms, 'deny');

  const badContent = {
    ...content,
    runtime: 'Runtime without policy marker'
  };
  assert.throws(() => compileEncounter(neutralModel, badContent), /Runtime is missing the unlisted-detail policy marker/);
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

test('BuckIPE anchors remain independent', () => {
  assert.match(content.presets.ipe.text, /0 = an opportunity/);
  assert.match(content.presets.ipe.text, /N\/O/);
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

test('professional roles are preserved verbatim outside inline case block and decouple from feedback', () => {
  const model = fixture();
  model.preset = 'none';
  model.role = 'Hand-entered learner role';
  model.roles = [
    { id: 'dental-hygiene', title: 'Dental Hygiene', text: '# PROFESSIONAL: Dental Hygiene\n\n## Role and scope\nVerbatim DH scope text.\n\n## Section 2\nCustom details.', isCustom: false, active: true },
    { id: 'custom-nurse', title: 'Clinical Nurse Specialist', text: 'Custom CNS role text with arbitrary headings and notes.', isCustom: true, active: true }
  ];
  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);

  // Identity block contains developer role and selected professional roles
  assert.match(result.directInstructions, /Learner role: Hand-entered learner role/);
  assert.match(result.directInstructions, /Selected professional roles: Dental Hygiene, Clinical Nurse Specialist/);

  // Dedicated section present outside inline case block
  assert.match(result.directInstructions, /# Learner audience and professional scope/);
  assert.match(result.directInstructions, /### Dental Hygiene\n\n## Role and scope\nVerbatim DH scope text/);
  assert.match(result.directInstructions, /### Clinical Nurse Specialist\n\nCustom CNS role text with arbitrary headings and notes/);

  // Verbatim preservation - no pruning of custom text
  assert.match(result.directInstructions, /Custom details/);
  assert.match(result.directInstructions, /arbitrary headings and notes/);

  // Verify location: roles section appears before BEGIN INLINE CASE
  const rolesIndex = result.directInstructions.indexOf('# Learner audience and professional scope');
  const inlineIndex = result.directInstructions.indexOf('BEGIN INLINE CASE');
  assert.ok(rolesIndex !== -1);
  assert.ok(inlineIndex !== -1);
  assert.ok(rolesIndex < inlineIndex, 'Roles section must appear before BEGIN INLINE CASE');

  // Verify feedback block when preset is none
  assert.match(result.feedbackText, /No preliminary feedback is selected/);

  // Manifest
  assert.equal(result.manifest.participating_roles.length, 2);
  assert.equal(result.manifest.participating_roles[0].title, 'Dental Hygiene');
  assert.equal(result.manifest.participating_roles[1].title, 'Clinical Nurse Specialist');
  assert.equal(result.manifest.participating_roles[1].isCustom, true);
});

test('bundled professional role profiles satisfy learner-role structure, length, and content constraints', async () => {
  const profDir = new URL('../content/professionals/', import.meta.url);
  const files = (await readdir(profDir)).filter(f => f.endsWith('.md')).sort();
  assert.equal(files.length, 11, 'Must have exactly 11 professional profiles');

  const requiredHeadings = [
    '## Role and scope',
    '## Typical focus in a patient encounter',
    '## Contributions within scope',
    '## Scope considerations for feedback',
    '## Interprofessional collaboration'
  ];

  let totalChars = 0;
  for (const filename of files) {
    const text = await readFile(new URL(filename, profDir), 'utf8');
    totalChars += text.length;

    // Has title
    assert.match(text, /^# PROFESSIONAL:\s*(.+)$/m, `${filename} must have # PROFESSIONAL: title`);

    // Contains all 5 headings
    for (const heading of requiredHeadings) {
      assert.ok(text.includes(heading), `${filename} is missing heading: ${heading}`);
    }

    // Length in [700, 1300]
    assert.ok(text.length >= 700 && text.length <= 1300, `${filename} length (${text.length}) not in [700, 1300]`);

    // Does not match forbidden consultant/review patterns
    assert.doesNotMatch(text, /consultation question|handoff|Progressive response rule|Review metadata|Reuse rules|25–70 words/i, `${filename} contains forbidden legacy consultant patterns`);

    if (filename === 'primary-care.md') {
      assert.doesNotMatch(text, /prescribe patient-specific/i, 'primary-care.md contains forbidden prescribe patient-specific');
    }
  }

  assert.ok(totalChars <= 14000, `Total profiles length (${totalChars}) must be <= 14,000 chars`);
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

test('online simulation, human timekeeping, authorized record rules, and closed-world anti-hallucination rules are present', () => {
  const model = fixture();
  model.preset = 'fnp';
  model.groups.context.text = 'Historical classroom logistics: enter the clinic room; overhead warning after 15 minutes.';
  model.groups['facilitator-observation-reference'].text = 'FACILITATOR PHYSICAL EXAM AND HISTORICAL RECORDS';
  model.groups[AREA_KEYS[3]].text = 'PATIENT FACTS. Patient holds an existing report, available on relevant request.';
  model.groups.feedback.text = 'FACULTY TARGET ONLY';
  model.composition = 'supplement';
  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  const text = result.files[0].data;
  assert.match(text, /Preserve the supplied fictional clinical setting, including an office-based scenario/i);
  assert.match(text, /Assessment timing is managed by a human assessor or timekeeper/i);
  assert.match(text, /Do not run an imaginary timer, infer elapsed time from turns, announce a countdown\/overhead warning/i);
  assert.match(text, /Interpret physical classroom directions within the simulation/i);
  assert.match(text, /Discovery and result delivery are distinct/i);
  assert.match(text, /Patient-provided record:/);
  assert.match(text, /Simulation facilitator:/);
  assert.match(text, /Visual vs\. diagnostic requests:/);
  assert.match(text, /Symptoms the materials neither list as present nor explicitly deny are UNSPECIFIED/);
  assert.match(text, /Biographical, lifestyle, dietary or historical details not in the materials/);
  assert.match(text, /Unsupplied exams, labs, and imaging \(STRICT ZERO-FABRICATION RULE\):/);
  assert.match(text, /When a source document lists history in an HPI or OLD CARTS table/);
  assert.match(text, /Boundary: Concealed facilitator reference\./);
  assert.match(text, /Boundary: Patient portrayal and patient-held records\./);
});
