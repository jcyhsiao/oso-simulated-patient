import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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

test('canvas direct export produces ready-to-paste instructions and enforces under-48,000 unit budget', () => {
  const model = fixture();
  model.groups.context.text = 'Course example: a different patient.';
  model.groups['learner-has-info'].text = 'Learner already knows the color.';
  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].name, 'example-person-canvas-instructions.md');
  assert.ok(result.instructionCounts.maximum < 48000);
  assert.match(result.directInstructions, /# Example person — Simulated Patient Instructions/);
  assert.match(result.directInstructions, /STRICT CLOSED-WORLD GROUNDING/);

  const huge = fixture();
  huge.groups[AREA_KEYS[3]].text = 'a'.repeat(49000);
  const blocked = compileEncounter(huge, content);
  assert.equal(blocked.files.length, 0);
  assert.match(blocked.errors.join(), /under-48,000/);
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
  assert.match(text, /If the learner asks about a symptom or complaint not listed as present/);
  assert.match(text, /If the learner asks for biographical, lifestyle, dietary, or historical details not specified/);
  assert.match(text, /Unsupplied exams, labs, and imaging \(STRICT ZERO-FABRICATION RULE\):/);
  assert.match(text, /When a source document lists history in an HPI or OLD CARTS table/);
  assert.match(text, /Boundary: Concealed facilitator reference\./);
  assert.match(text, /Boundary: Patient portrayal and patient-held records\./);
  assert.doesNotMatch(content.runtime, /Shannon|Anderson|gout|HCTZ|hydrochlorothiazide|indomethacin|uric acid|first MTP/i);
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
  assert.match(result.files[0].data, /Participating professions:.*Dental Hygiene/i);
  assert.equal(result.manifest.participating_roles.length, 2);
  assert.equal(result.manifest.participating_roles[0].title, 'Dental Hygiene');
  assert.equal(result.manifest.participating_roles[1].isCustom, true);
});

test('fnp-shannon-anderson case files compile comfortably under the 48,000 unit budget', async () => {
  const baseDir = new URL('../../case-files/fnp-shannon-anderson/', import.meta.url);
  function loadDoc(relPath) {
    const fullPath = fileURLToPath(new URL(relPath, baseDir));
    const name = relPath.split('/').pop();
    const pyScript = [
      'import sys, json, re, zipfile, xml.etree.ElementTree as ET',
      'W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"',
      'MC = "{http://schemas.openxmlformats.org/markup-compatibility/2006}"',
      'def clean_mc(el):',
      '    for c in list(el):',
      '        if c.tag == MC + "AlternateContent":',
      '            ch = c.find(MC + "Choice")',
      '            if ch is not None:',
      '                i = list(el).index(c); el.remove(c)',
      '                for sub in reversed(list(ch)): el.insert(i, sub)',
      '                continue',
      '        clean_mc(c)',
      'with zipfile.ZipFile(sys.argv[1]) as z:',
      '    root = ET.fromstring(z.read("word/document.xml"))',
      'clean_mc(root)',
      'lines = [re.sub(r"[ \\t]+", " ", "".join(t.text or "" for t in p.iter(W + "t"))).strip() for p in root.iter(W + "p")]',
      'print(json.dumps("\\n".join(x for x in lines if x)))'
    ].join('\n');
    const py = spawnSync('python3', ['-B', '-c', pyScript, fullPath], { encoding: 'utf8' });
    assert.equal(py.status, 0, py.stderr);
    return { name, status: 'ready', kind: 'text', text: JSON.parse(py.stdout), images: [] };
  }

  const primaryCareText = await readFile(new URL('../content/professionals/primary-care.md', import.meta.url), 'utf8');
  const model = {
    name: 'Shannon Anderson',
    role: 'Primary Care / Advanced Practice Provider (FNP/AGPCNP) student',
    description: '67-year-old female presenting to an outpatient primary care clinic with acute right foot pain.',
    groups: {
      context: { text: '', files: [] },
      'learner-has-info': {
        text: '',
        files: [
          loadDoc('learner-has-info/Shannon Anderson Case B Chart Snapshot.docx'),
          loadDoc('learner-has-info/Shannon Anderson Case B DOOR Intake Note SP 2026.docx'),
        ]
      },
      'consultants-have-info': { text: '', files: [] },
      'facilitator-observation-reference': {
        text: '',
        files: [
          loadDoc('facilitator-observation-reference/Faculty Sheet for Gout OSCE SP 2026.docx'),
          loadDoc('facilitator-observation-reference/Shannon Anderson Case B Lab 032025.docx'),
          loadDoc('facilitator-observation-reference/Shannon Anderson Case B Lab Report 0325 Faculty Copy.docx'),
        ]
      },
      'patient-parameters-and-disclosable-info': {
        text: '',
        files: [
          loadDoc('patient-parameters-and-disclosable-info/Teaching of SP for Gout Case B SP 2026.docx'),
          loadDoc('patient-parameters-and-disclosable-info/Shannon Anderson Case B Lab Interpratation During Visit.docx'),
          loadDoc('patient-parameters-and-disclosable-info/The Ohio State Radiology Report Case B.docx'),
          loadDoc('patient-parameters-and-disclosable-info/Left Foot Image.docx'),
        ]
      },
      feedback: { text: '', files: [] }
    },
    preset: 'fnp',
    composition: '',
    roles: [{ id: 'primary-care', title: 'Primary Care / Advanced Practice Provider (FNP/AGPCNP)', text: primaryCareText, isCustom: false, active: true }]
  };

  const result = compileEncounter(model, content);
  assert.deepEqual(result.errors, []);
  assert.equal(result.files.length, 1);
  assert.ok(result.instructionCounts.maximum < 48000, `Expected < 48,000 maximum units, got ${result.instructionCounts.maximum}`);
});
