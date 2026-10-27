// Portable, case-independent input adapter. No patient facts are supplied by code.
export const AREA_KEYS = ['learner-has-info', 'consultants-have-info', 'facilitator-observation-reference', 'patient-parameters-and-disclosable-info'];
export const AREA_LABELS = {
  context: 'Course or assignment context — contextual, not patient facts or automatic grading criteria',
  'learner-has-info': 'Information already provided to the learner',
  'consultants-have-info': 'Explicitly supplied consultant information',
  'facilitator-observation-reference': 'Concealed facilitator observation context — not independent rated criteria',
  'patient-parameters-and-disclosable-info': 'Patient portrayal and disclosable information',
  feedback: 'Faculty-provided case-specific expectations or custom feedback criteria',
};
export function textCounts(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  const counts = { utf16: normalized.length, crlf: normalized.replace(/\n/g, '\r\n').length, utf8: new TextEncoder().encode(normalized).length };
  return { ...counts, maximum: Math.max(...Object.values(counts)) };
}
export function slugify(text) { return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 58) || 'patient-case'; }
export function renderScalar(text, context) {
  const pattern = /\{\{\s*([A-Za-z_][A-Za-z0-9_.]*)\s*\}\}/g;
  if (/[{}]{2}/.test(text.replace(pattern, ''))) throw new Error('Malformed author placeholder');
  return text.replace(pattern, (_, key) => {
    if (!Object.hasOwn(context, key)) throw new Error(`Unknown or unavailable author placeholder: ${key}`);
    if (!['string', 'number'].includes(typeof context[key])) throw new Error(`Author placeholder is not scalar text: ${key}`);
    return String(context[key]);
  });
}
export function sourceImages(group = {}) {
  return (group.files || []).filter(file => file.status === 'ready').flatMap(file =>
    file.kind === 'image' ? [{ image: file, source: file.name }] : (file.images || []).map(image => ({ image, source: `${file.name} — ${image.label}` })));
}
export function includedSources(group = {}, options = {}) {
  const sources = group.text?.trim() ? [{ label: 'Pasted text', text: group.text }] : [];
  for (const file of (group.files || []).filter(file => file.status === 'ready')) {
    let text = file.kind === 'text' ? file.text : '';
    const visuals = file.kind === 'image' ? [file] : file.images || [];
    for (const image of visuals.filter(image => !image.excluded && image.description?.trim())) {
      text += `\n\nReviewed visual description (${image.label || image.name}):\n${image.description}\n`;
      if (options.key === 'patient-parameters-and-disclosable-info') text += `Disclosure: ${image.releaseCondition?.trim() || 'Only on a relevant request for this image or its supplied visual information.'}\n`;
      if (options.format === 'skills' && options.paths?.has(image)) text += `Selected asset: ${options.paths.get(image)}. Display only if actually supported and under its supplied release condition; otherwise use this description. Never promise display or expose a path as a substitute.\n`;
      else if (options.format === 'single') text += 'This text-only export contains the reviewed description, not photograph bytes or an image attachment. Do not generate an image or claim successful display.\n';
    }
    if (text.trim()) sources.push({ label: file.name, text });
  }
  return sources;
}
function sourceBlock(key, group, options = {}) {
  const sources = includedSources(group, { ...options, key });
  if (!sources.length) return `## ${AREA_LABELS[key]}\n\nNo material supplied.\n`;
  return `## ${AREA_LABELS[key]}\n\n` + sources.map((source, index) => `### Source ${index + 1}: ${source.label.replace(/[\r\n]/g, ' ')}\n\n${source.text}\n`).join('\n');
}
function selectedCasePreset(model, content) {
  if (model.presetSnapshot?.key === model.preset && typeof model.presetSnapshot.text === 'string' && typeof model.presetSnapshot.title === 'string') return model.presetSnapshot;
  return content.presets[model.preset];
}
export function feedbackChoice(model, content) {
  const selected = model.preset || 'none';
  if (!['none', 'fnp', 'ipe'].includes(selected)) throw new Error('Unknown feedback preset.');
  const custom = includedSources(model.groups.feedback).length > 0;
  if (selected !== 'none' && custom && !['supplement', 'replace'].includes(model.composition)) throw new Error('Choose Supplement or Replace for the supplied feedback criteria.');
  const usePreset = selected !== 'none' && !(custom && model.composition === 'replace');
  return { custom, usePreset, enabled: usePreset || custom,
    label: usePreset ? `${selectedCasePreset(model, content).title}${custom ? ' + faculty criteria' : ''}` : custom ? 'Faculty-provided criteria only' : 'No preliminary feedback' };
}
export function pruneProfessionalScope(text) {
  if (!text) return '';
  const sections = [];
  const lines = text.split('\n');
  let currentSection = null;
  let keep = false;
  const allowedHeadings = [
    'role and scope',
    'priorities',
    'visible judgment process',
    'focused information needs',
    'contribution',
    'boundaries',
    'referral and continued responsibility'
  ];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      const heading = headingMatch[1].split('—')[0].trim().toLowerCase();
      keep = allowedHeadings.some(h => heading.startsWith(h));
      if (keep) {
        currentSection = [line];
        sections.push(currentSection);
      } else {
        currentSection = null;
      }
    } else if (keep && currentSection) {
      currentSection.push(line);
    }
  }

  if (!sections.length) return text.trim();
  return sections.map(s => s.join('\n').trim()).join('\n\n');
}

export function compileEncounter(model, content) {
  const errors = [], warnings = [];
  if (!model.name?.trim()) errors.push('Case: enter a case name.');
  if (!model.role?.trim()) errors.push('Case: enter the learner role.');
  for (const [key, group] of Object.entries(model.groups)) {
    for (const file of group.files || []) {
      if (file.status !== 'ready') errors.push(`${AREA_LABELS[key]}: ${file.name} ${file.status === 'loading' ? 'is still being read.' : 'could not be read; remove or replace it.'}`);
      if (file.warning) warnings.push(`${file.name}: ${file.warning}`);
    }
  }
  if (!includedSources(model.groups['patient-parameters-and-disclosable-info']).length) errors.push('Materials: add patient parameters and disclosable information. Image assets alone are not patient instructions.');
  const visuals = Object.entries(model.groups).flatMap(([key, group]) => sourceImages(group).map(record => ({ ...record, key })));
  for (const { image, source } of visuals) {
    if (image.excluded) { warnings.push(`${source}: image explicitly excluded; no description or bytes are included.`); continue; }
    if (!image.description?.trim()) errors.push(`${source}: review extracted alt text or supply a description. Image pixels are not interpreted offline.`);
  }
  let feedback;
  try { feedback = feedbackChoice(model, content); } catch (error) { errors.push(`Feedback: ${error.message}`); }
  if (errors.length) return { errors, warnings, files: [] };
  const name = model.name.trim().replace(/[\r\n]/g, ' '), role = model.role.trim().replace(/[\r\n]/g, ' '), slug = slugify(name);
  const activeRoles = (model.roles || []).filter(r => r.active && r.title?.trim());
  const roleListing = activeRoles.map(r => r.title.trim()).join(', ');
  const assetFiles = visuals.filter(({ image }) => !image.excluded && image.bytes).map(({ image, source }, i) => ({ ...image, source, image, path: `assets/${String(i + 1).padStart(2, '0')}-${slugify(image.name.replace(/\.[^.]+$/, ''))}.${image.name.split('.').pop().toLowerCase()}` }));
  const paths = new Map(assetFiles.map(asset => [asset.image, asset.path]));
  const options = { format: 'single', paths };
  let caseText = `# Authored case materials\n\n` + sourceBlock('context', model.groups.context, options) + '\n';
  for (const key of AREA_KEYS) caseText += sourceBlock(key, model.groups[key], options) + '\n';
  let feedbackText = '# Post-encounter preliminary feedback criteria\n\n';
  if (!feedback.enabled) feedbackText += 'No preliminary feedback is selected. End with the patient farewell; do not generate ratings, rubric summaries or unsolicited debriefing.\n';
  else {
    feedbackText += 'Activate only after explicit encounter closure. Mark output as preliminary AI-generated feedback for faculty review.\n\n';
    if (activeRoles.length) {
      feedbackText += '## Participating learner professional roles and scope boundaries\n\n';
      feedbackText += 'Note: Preset profiles are AI-generated starter drafts for faculty review and customization; they are not validated clinical practice standards.\n';
      feedbackText += 'Evaluate learner actions according to their stated professional role and scope boundaries. Do not penalize one profession for omitting procedures or prescribing that lie within another profession’s scope.\n\n';
      for (const r of activeRoles) {
        const pruned = pruneProfessionalScope(r.text);
        feedbackText += `### Professional Scope: ${r.title.trim()}\n\n${pruned}\n\n`;
      }
    }
    if (feedback.usePreset) feedbackText += selectedCasePreset(model, content).text + '\n\n';
    if (feedback.custom) feedbackText += `### ${feedback.usePreset ? 'Supplemental case-specific criteria' : 'Faculty-defined feedback criteria (no built-in preset included)'}\n\n` + sourceBlock('feedback', model.groups.feedback, options) + '\n';
    feedbackText += 'Use the supplied learner role to select relevant profession-labeled expectations; do not judge an individual against every profession. Supplemental targets without explicit compatible rating instructions receive narrative observations, not invented numeric anchors. Flag conflicting criteria and withhold affected judgments; do not silently reconcile scales, weights or passing rules. No feedback target becomes patient knowledge or an interview hint.\n';
  }

  const synthesisPrompt = `# TASK: Generate Instructions for Canvas AI Assistant (Simulated Patient)

You are an expert instructional designer in health sciences simulation. Below is prepared, reviewed clinical and educational material for an encounter with **${name}**.

Your task is to synthesize this material into a cohesive, high-fidelity system prompt ready to be pasted into the **Canvas AI Assistant** instructions.

---

## STRICT GENERATION GUARDRAILS

1. **Preserve Clinical Ground Truth:**
   - NEVER alter, round, or invent vital signs, lab values, diagnostic records, or medications.
   - Use only the supplied medical, social, and symptom facts.

2. **Demeanor & Emotional Presentation:**
   - Reflect the emotional presentation, pain level, and communication style specified in the case parameters (e.g., pain, fatigue, anxiety, depression, or distress) while remaining clinically realistic and avoiding exaggerated caricature.

3. **Three-Tier Architecture:**
   - **Tier 1: Patient Persona & Dialogue**
     - Speak exclusively in natural lay language.
     - Reveal information progressively based on what the learner asks (never dump the whole history at greeting).
     - The patient does NOT know their own clinical staging, laboratory measurements, or diagnostic codes (e.g., they describe symptoms like bleeding gums or pain, not formal diagnoses).
   - **Tier 2: Facilitator Evidence Delivery**
     - Scripted physical examination findings, lab results, and oral findings are released ONLY when the learner explicitly examines or requests them.
     - Provide findings as objective simulated records, labeled clearly and separate from patient speech.
   - **Tier 3: Post-Encounter Evaluator**
     - Activates ONLY after explicit closure of the patient visit.
     - Provide preliminary, formative qualitative feedback for faculty review using the supplied criteria.
     - Assess each participating profession according to its own scope boundaries. Do NOT penalize one profession for omitting procedures or prescribing that lie within another profession’s scope.

4. **Output Format:**
   - Provide the complete, polished system prompt in a single markdown code block, ready to be copied and pasted directly into the Canvas AI Assistant instructions field.

---

## STRUCTURED CASE DATA & PREPARED INPUTS

### Encounter Identity
- **Case Name:** ${name}
- **Learner Audience:** ${role}
${activeRoles.length > 1 ? `- **Participating Professions:** ${roleListing}\n` : ''}${model.description?.trim() ? '- **Case Description:** ' + model.description.trim() + '\n' : ''}

${caseText}

${feedbackText}
`;

  const manifest = { schema_version: 1, builder_version: content.version, case_name: name, learner_role: role, participating_roles: activeRoles.map(r => ({ id: r.id, title: r.title.trim(), isCustom: Boolean(r.isCustom) })), export_format: 'synthesis', feedback: { preset: feedback.usePreset ? model.preset : null, preset_version: feedback.usePreset ? model.presetSnapshot?.version || content.version : null, custom: feedback.custom, composition: feedback.custom ? feedback.usePreset ? 'supplement' : 'custom-only' : null }, sources: Object.fromEntries(Object.entries(model.groups).map(([key, group]) => [key, includedSources(group).map(s => s.label)])), assets: assetFiles.map(a => a.path) };

  const files = [
    { name: `${slug}-synthesis-prompt.md`, data: synthesisPrompt, type: 'text/markdown;charset=utf-8' }
  ];

  return { errors, warnings, files, synthesisPrompt, manifest, caseText, feedbackText, feedbackLabel: feedback.label };
}
