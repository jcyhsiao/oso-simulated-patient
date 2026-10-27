import { compileEncounter, AREA_KEYS, AREA_LABELS, feedbackChoice, slugify } from './compiler.mjs';
import { createZip } from './zip.mjs';
import { importPreparedFile } from './imports.mjs';
import { setupCaseSession } from './case-session.mjs';

const byId = id => document.getElementById(id);
const groups = Object.fromEntries(['context', ...AREA_KEYS, 'feedback'].map(key => [key, { text: '', files: [] }]));
const groupElements = new Map();
const previewUrls = new Map();
function revokePreviews(key) {
  for (const url of previewUrls.get(key) || []) URL.revokeObjectURL(url);
  previewUrls.delete(key);
}
let activeStep = 0, selectedArea = AREA_KEYS[0], revision = 0, urls = [];
let caseSession, presetSnapshot = null, importGeneration = 0;
let roles = [];

function defaultRoles() {
  return Object.values(APP_CONTENT.professionals || {}).map(p => ({
    id: p.id,
    title: p.title,
    text: p.text,
    isCustom: false,
    active: false,
  }));
}

function syncLearnerRole() {
  const active = roles.filter(r => r.active);
  if (!active.length) return;
  const roleInput = byId('learner-role');
  if (active.length === 1) {
    roleInput.value = `${active[0].title} student`;
  } else {
    roleInput.value = `Interprofessional student team (${active.map(r => r.title).join(', ')})`;
  }
}

function renderRoles() {
  const selectedContainer = byId('selected-roles-container');
  const availableContainer = byId('available-roles-container');
  const details = byId('active-roles-details');
  const countEl = byId('active-roles-count');
  const editor = byId('active-roles-editor');
  if (!selectedContainer || !availableContainer || !editor) return;

  selectedContainer.replaceChildren();
  availableContainer.replaceChildren();
  editor.replaceChildren();

  const active = roles.filter(r => r.active);
  if (countEl) countEl.textContent = String(active.length);
  if (details) details.hidden = active.length === 0;

  if (active.length === 0) {
    selectedContainer.append(element('span', 'No roles currently selected (using manual role title below).', 'sp-help'));
  } else {
    for (const role of active) {
      const chip = element('span', undefined, 'sp-chip');
      chip.setAttribute('aria-pressed', 'true');
      const label = element('span', role.title);
      const removeBtn = element('button', '✕', 'sp-chip-remove');
      removeBtn.type = 'button';
      removeBtn.title = `Deselect ${role.title}`;
      removeBtn.setAttribute('aria-label', `Deselect ${role.title}`);
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        role.active = false;
        renderRoles();
        syncLearnerRole();
        update();
      });
      chip.append(label, removeBtn);
      selectedContainer.append(chip);

      const card = element('div', undefined, 'sp-role-card');
      const header = element('div', undefined, 'sp-role-card-header');
      header.append(element('span', role.title), element('span', role.isCustom ? 'Custom role' : 'AI draft profile', 'sp-badge-ai'));

      const textarea = element('textarea');
      textarea.rows = 4;
      textarea.value = role.text;
      textarea.placeholder = 'Role scope and boundaries...';
      textarea.addEventListener('input', () => {
        role.text = textarea.value;
        update();
      });

      const actions = element('div', undefined, 'sp-file-actions');
      if (!role.isCustom) {
        const resetBtn = element('button', 'Reset to preset default', 'sp-button');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', () => {
          const original = APP_CONTENT.professionals?.[role.id];
          if (original) {
            role.text = original.text;
            textarea.value = original.text;
            update();
          }
        });
        actions.append(resetBtn);
      }
      card.append(header, textarea, actions);
      editor.append(card);
    }
  }

  const available = roles.filter(r => !r.active);
  for (const role of available) {
    const chip = element('button', `+ ${role.title}`, 'sp-chip');
    chip.type = 'button';
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      role.active = true;
      renderRoles();
      syncLearnerRole();
      update();
    });
    availableContainer.append(chip);
  }
}

const revoked = () => { for (const url of urls) URL.revokeObjectURL(url); urls = []; };
function invalidate() {
  revision++; revoked(); byId('build-result').hidden = true; byId('build-errors').hidden = true;
  if (byId('copy-instructions')) byId('copy-instructions').hidden = true;
  if (byId('download-instructions')) byId('download-instructions').hidden = true;
  byId('build-status').textContent = '';
}
function model() {
  for (const [key, refs] of groupElements) groups[key].text = refs.text.value;
  return { name: byId('case-name').value, role: byId('learner-role').value, description: byId('case-description').value,
    groups, preset: byId('feedback-preset').value, presetSnapshot,
    composition: document.querySelector('input[name=composition]:checked')?.value || '',
    format: 'canvas-direct',
    roles: roles.map(r => ({ ...r })) };
}
function selectionLabel(current) {
  try { return feedbackChoice(current, APP_CONTENT).label; }
  catch { return 'Choose Supplement or Replace'; }
}
function update() {
  invalidate(); const current = model(), custom = groups.feedback.text.trim() || groups.feedback.files.some(f => f.status === 'ready' && f.kind === 'text');
  byId('summary-name').textContent = current.name.trim() || 'Not entered';
  byId('summary-role').textContent = current.role.trim() || 'Not entered';
  byId('summary-feedback').textContent = selectionLabel(current); byId('feedback-included').textContent = selectionLabel(current);
  byId('summary-format').textContent = 'Canvas AI Assistant';
  byId('feedback-composition').hidden = !(custom && current.preset !== 'none');
  const preset = current.presetSnapshot || APP_CONTENT.presets[current.preset];
  byId('update-preset').hidden = !preset || preset.text === APP_CONTENT.presets[current.preset]?.text;
  byId('preset-description').textContent = preset?.description || 'Add faculty criteria below, or leave the inputs empty to omit preliminary feedback.';
  byId('preset-preview').textContent = preset?.text || 'No built-in preset is selected.';
  byId('build').disabled = Object.values(groups).some(g => g.files.some(f => f.status === 'loading'));
  caseSession?.changed();
}
function showStep(step, focus = false) {
  if (activeStep !== step) caseSession?.changed();
  activeStep = step;
  document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== step; });
  document.querySelectorAll('[data-step]').forEach(button => { if (Number(button.dataset.step) === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
  byId('back').hidden = step === 0; byId('next').hidden = step === 3;
  byId('step-status').textContent = `Step ${step + 1} of 4`;
  byId('next').textContent = ['Continue to materials', 'Continue to feedback', 'Continue to export', ''][step];
  if (focus) {
    const heading = document.querySelector(`[data-panel="${step}"] h2`); heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true });
  }
}
function showArea(area) {
  if (selectedArea !== area) caseSession?.changed();
  selectedArea = area;
  document.querySelectorAll('[data-area-panel]').forEach(panel => { panel.hidden = panel.dataset.areaPanel !== area; });
  document.querySelectorAll('[data-area]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.area === area)));
}
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function action(label, fn, disabled = false) { const button = element('button', label, 'sp-button'); button.type = 'button'; button.disabled = disabled; button.addEventListener('click', fn); return button; }
function imageControls(image, key, parent, index = 0, onExclusion = () => {}) {
  const container = element('details', undefined, 'sp-image-review'); container.open = Boolean(image.reviewOpen);
  container.addEventListener('toggle', () => { if (Boolean(image.reviewOpen) !== container.open) { image.reviewOpen = container.open; caseSession?.changed(); } });
  const summary = element('summary'), title = element('span', `Image ${index + 1} · ${image.name}`), status = element('span', undefined, 'sp-image-status');
  let previewUrl;
  if (image.bytes) {
    previewUrl = URL.createObjectURL(new Blob([image.bytes], { type: image.bytes[0] === 137 ? 'image/png' : 'image/jpeg' }));
    previewUrls.set(key, [...(previewUrls.get(key) || []), previewUrl]);
    const thumbnail = element('img', undefined, 'sp-image-thumbnail'); thumbnail.src = previewUrl; thumbnail.alt = ''; summary.append(thumbnail);
  }
  summary.append(title, status); container.append(summary); parent.append(container);
  if (previewUrl) {
    const preview = element('img', undefined, 'sp-image-preview'); preview.src = previewUrl; preview.alt = `Extracted image ${index + 1} from this source; review its description below.`;
    preview.addEventListener('error', () => { preview.hidden = true; container.append(element('p', 'This image could not be displayed. Review it in the original document.', 'sp-help')); });
    container.append(preview);
  } else container.append(element('p', 'Preview unavailable for this visual. Review it in the original document.', 'sp-help'));
  if (image.warning) container.append(element('p', image.warning, 'sp-help'));
  const excludedLabel = element('label', undefined, 'sp-image-exclude'), excluded = element('input');
  excluded.type = 'checkbox'; excluded.checked = Boolean(image.excluded);
  excludedLabel.append(excluded, document.createTextNode(' Exclude this image from the package'));
  container.append(excludedLabel);
  const fields = element('fieldset'); fields.disabled = Boolean(image.excluded);
  if (image.metadata?.length) {
    const details = element('details'); details.open = true; details.append(element('summary', 'Extracted alt text / description metadata'));
    details.append(element('pre', image.metadata.map(value => `${value.label}: ${value.text}`).join('\n'), 'sp-preview'));
    details.append(element('p', 'Review against the source. Keep observable details; do not turn diagnoses, source commands or course examples into patient facts.', 'sp-help'));
    const use = action('Use reviewed extracted text', () => { image.description = image.metadata.map(value => value.text).join('\n'); input.value = image.description; sync(); update(); });
    details.append(use); fields.append(details);
  } else fields.append(element('p', 'No usable alt text or embedded description was found. Supply a description below or exclude this image. No AI interpretation is performed.', 'sp-help'));
  const label = element('label', key === 'patient-parameters-and-disclosable-info' ? 'Reviewed patient-visible description' : 'Reviewed description for this source', 'sp-field');
  const input = element('textarea'); input.rows = 3; input.value = image.description || ''; input.autocomplete = 'off';
  input.addEventListener('input', () => { image.description = input.value; sync(); update(); }); label.append(input); fields.append(label);
  if (key === 'patient-parameters-and-disclosable-info') {
    const releaseLabel = element('label', 'When may this be disclosed? (optional)', 'sp-field'), release = element('input'); release.type = 'text'; release.value = image.releaseCondition || '';
    release.placeholder = 'Default: only on a relevant visual request'; release.addEventListener('input', () => { image.releaseCondition = release.value; update(); }); releaseLabel.append(release); fields.append(releaseLabel);
  }
  function sync() {
    excluded.checked = Boolean(image.excluded); fields.disabled = excluded.checked;
    status.textContent = image.excluded ? 'Excluded' : image.description?.trim() ? 'Description supplied' : 'Needs description';
  }
  excluded.addEventListener('change', () => { image.excluded = excluded.checked; sync(); onExclusion(); update(); });
  container.append(fields);
  sync(); return sync;
}
function renderFiles(key) {
  revokePreviews(key);
  const list = groupElements.get(key).list; list.replaceChildren();
  groups[key].files.forEach((file, index) => {
    const item = element('li', undefined, 'sp-file'); item.append(element('span', file.name, 'sp-filename'));
    item.append(element('p', file.status === 'loading' ? 'Reading locally…' : file.status === 'error' ? file.error : file.kind === 'image' ? 'Image asset; review description below' : `${file.text.length.toLocaleString()} extracted UTF-16 units`, file.status === 'error' ? 'sp-error' : 'sp-help'));
    if (file.warning && file.status === 'ready' && file.kind !== 'image') item.append(element('p', file.warning, 'sp-help'));
    if (file.status === 'ready' && file.kind === 'text') {
      const details = element('details'); details.append(element('summary', 'Inspect extracted text'));
      details.append(element('pre', file.text, 'sp-preview')); item.append(details);
    }
    if (file.status === 'ready' && file.kind === 'image') imageControls(file, key, item);
    if (file.status === 'ready' && file.images?.length) {
      const bulkLabel = element('label', undefined, 'sp-image-exclude'), bulk = element('input'); bulk.type = 'checkbox';
      bulkLabel.append(bulk, document.createTextNode(' Exclude all images from the package')); item.append(bulkLabel);
      const syncBulk = () => { const count = file.images.filter(image => image.excluded).length; bulk.checked = count === file.images.length; bulk.indeterminate = count > 0 && count < file.images.length; };
      const syncImages = file.images.map((image, imageIndex) => imageControls(image, key, item, imageIndex, syncBulk));
      bulk.addEventListener('change', () => { for (const image of file.images) image.excluded = bulk.checked; syncImages.forEach(sync => sync()); syncBulk(); update(); });
      syncBulk();
    }
    const actions = element('div', undefined, 'sp-file-actions');
    actions.append(action('Move up', () => { [groups[key].files[index - 1], groups[key].files[index]] = [file, groups[key].files[index - 1]]; renderFiles(key); update(); }, index === 0));
    actions.append(action('Move down', () => { [groups[key].files[index + 1], groups[key].files[index]] = [file, groups[key].files[index + 1]]; renderFiles(key); update(); }, index === groups[key].files.length - 1));
    actions.append(action('Replace', () => {
      const picker = document.createElement('input'); picker.type = 'file'; picker.accept = groupElements.get(key).file.accept;
      picker.addEventListener('change', () => { if (picker.files.length) addFiles(key, [...picker.files], file); }); picker.click();
    }));
    actions.append(action('Remove', () => { groups[key].files = groups[key].files.filter(entry => entry !== file); renderFiles(key); update(); }));
    item.append(actions); list.append(item);
  });
}
async function addFiles(key, selected, replacing = null) {
  const generation = importGeneration;
  const records = selected.map(file => ({ name: file.name, status: 'loading', source: file }));
  if (replacing) { const index = groups[key].files.indexOf(replacing); if (index < 0) return; groups[key].files.splice(index, 1, ...records); }
  else groups[key].files.push(...records);
  renderFiles(key); update();
  await Promise.all(records.map(async record => {
    try {
      const imported = await importPreparedFile(record.source, key === 'patient-parameters-and-disclosable-info');
      if (generation !== importGeneration || !groups[key].files.includes(record)) return;
      Object.assign(record, imported, { status: 'ready' });
    } catch (error) {
      if (generation !== importGeneration || !groups[key].files.includes(record)) return;
      record.status = 'error'; record.error = error.message;
    }
    delete record.source; renderFiles(key); update();
  }));
}
for (const target of document.querySelectorAll('[data-input-group]')) {
  const key = target.dataset.inputGroup;
  const label = element('label', key === 'context' ? 'Paste relevant excerpts' : 'Paste prepared text', 'sp-field');
  const text = element('textarea'); text.id = `text-${key}`; text.rows = key === 'context' ? 5 : 8; text.spellcheck = false; text.autocomplete = 'off';
  text.addEventListener('input', update); label.append(text);
  const fileLabel = element('label', key === 'patient-parameters-and-disclosable-info' ? 'Add files or image assets' : 'Add files', 'sp-field');
  const file = element('input'); file.type = 'file'; file.multiple = true; file.id = `files-${key}`;
  file.accept = '.txt,.md,.markdown,.docx' + (key === 'patient-parameters-and-disclosable-info' ? ',.png,.jpg,.jpeg' : '');
  file.addEventListener('change', () => { const selected = [...file.files]; file.value = ''; addFiles(key, selected); }); fileLabel.append(file);
  const note = element('p', 'TXT, Markdown and DOCX paragraphs/tables. PDF and scanned text are not supported; paste excerpts instead. Pasted text is included first, followed by the listed files.', 'sp-help');
  const list = element('ul', undefined, 'sp-files'); list.setAttribute('aria-label', `${AREA_LABELS[key]} attached files`); list.setAttribute('aria-live', 'polite');
  target.append(label, fileLabel, note, list); groupElements.set(key, { text, file, list });
}
function buildPackage() {
  invalidate(); const currentRevision = revision, result = compileEncounter(model(), APP_CONTENT);
  if (result.errors.length) {
    const box = byId('build-errors'); box.replaceChildren(element('h3', 'Please resolve these build issues'));
    const list = element('ul'); result.errors.forEach(error => list.append(element('li', error))); box.append(list); box.hidden = false;
    box.setAttribute('tabindex', '-1'); box.focus(); return;
  }
  try {
    if (revision !== currentRevision) return;
    const warnings = byId('build-warnings'); warnings.replaceChildren();
    if (result.warnings.length) { warnings.append(element('h3', 'Build notes')); const list = element('ul'); result.warnings.forEach(note => list.append(element('li', note))); warnings.append(list); }

    byId('generated-preview').textContent = result.directInstructions;

    const badge = byId('instruction-count-badge');
    if (badge && result.instructionCounts) {
      const count = result.instructionCounts.maximum;
      badge.textContent = `${count.toLocaleString()} / 48,000 units`;
      badge.style.backgroundColor = count < 48000 ? '#e6f4ea' : '#fce8e6';
      badge.style.color = count < 48000 ? '#137333' : '#ba0c2f';
    }

    byId('build-result').hidden = false;
    if (byId('copy-instructions')) byId('copy-instructions').hidden = false;
    if (byId('download-instructions')) byId('download-instructions').hidden = false;
    byId('build-status').textContent = 'Instructions compiled! Click "Copy instructions to clipboard" below, then paste directly into Canvas AI Assistant.';
  } catch (error) { byId('build-errors').textContent = `Could not compile instructions: ${error.message}`; byId('build-errors').hidden = false; revoked(); }
}
for (const button of document.querySelectorAll('[data-step]')) button.addEventListener('click', () => showStep(Number(button.dataset.step), true));
for (const button of document.querySelectorAll('[data-area]')) button.addEventListener('click', () => showArea(button.dataset.area));
byId('next').addEventListener('click', () => showStep(activeStep + 1, true)); byId('back').addEventListener('click', () => showStep(activeStep - 1, true));
for (const id of ['case-name', 'learner-role', 'case-description']) byId(id).addEventListener('input', update);
function chooseCurrentPreset() { const key = byId('feedback-preset').value; presetSnapshot = key === 'none' ? null : { ...APP_CONTENT.presets[key], key, version: APP_CONTENT.version }; update(); }
byId('feedback-preset').addEventListener('change', chooseCurrentPreset);
byId('update-preset').addEventListener('click', chooseCurrentPreset); document.querySelectorAll('input[name=composition]').forEach(input => input.addEventListener('change', update));
byId('build').addEventListener('click', buildPackage);
byId('copy-instructions')?.addEventListener('click', async () => {
  const text = byId('generated-preview').textContent;
  try {
    await navigator.clipboard.writeText(text);
    byId('build-status').textContent = 'Copied instructions to clipboard! Paste directly into Canvas AI Assistant.';
  } catch {
    byId('build-status').textContent = 'Clipboard access denied. Select all text in the preview below and copy manually.';
  }
});
byId('download-instructions')?.addEventListener('click', () => {
  const text = byId('generated-preview').textContent;
  const name = byId('case-name').value.trim() || 'simulated-patient';
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  urls.push(url);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(name)}-canvas-instructions.md`;
  a.click();
  byId('build-status').textContent = 'Download started.';
});
window.addEventListener('pagehide', () => { revoked(); for (const key of previewUrls.keys()) revokePreviews(key); });
window.addEventListener('pageshow', event => { if (event.persisted) { for (const key of groupElements.keys()) renderFiles(key); update(); } });
byId('add-custom-role-btn')?.addEventListener('click', () => {
  byId('custom-role-form').hidden = false;
  byId('custom-role-title').focus();
});
byId('cancel-custom-role-btn')?.addEventListener('click', () => {
  byId('custom-role-form').hidden = true;
  byId('custom-role-title').value = '';
  byId('custom-role-text').value = '';
});
byId('save-custom-role-btn')?.addEventListener('click', () => {
  const title = byId('custom-role-title').value.trim();
  if (!title) return;
  const text = byId('custom-role-text').value.trim();
  const newRole = {
    id: `custom-${Date.now()}`,
    title,
    text: text || `# PROFESSIONAL: ${title}\nAI-authored custom role for faculty review.\n\n## Role and scope\n${title} participating in this simulation.`,
    isCustom: true,
    active: true
  };
  roles.push(newRole);
  byId('custom-role-title').value = '';
  byId('custom-role-text').value = '';
  byId('custom-role-form').hidden = true;
  renderRoles();
  syncLearnerRole();
  update();
});
roles = defaultRoles();
renderRoles();
showStep(0); showArea(selectedArea); update();

caseSession = setupCaseSession({
  version: APP_CONTENT.version,
  read: () => ({ model: model(), view: { step: activeStep, area: selectedArea } }),
  apply: record => {
    importGeneration++;
    const state = record?.model;
    byId('case-name').value = state?.name || ''; byId('learner-role').value = state?.role || ''; byId('case-description').value = state?.description || '';
    roles = (state?.roles && state.roles.length) ? state.roles.map(r => ({ ...r })) : defaultRoles();
    renderRoles();
    for (const [key, refs] of groupElements) { groups[key] = state ? state.groups[key] : { text: '', files: [] }; refs.text.value = groups[key].text; refs.file.value = ''; renderFiles(key); }
    presetSnapshot = state?.presetSnapshot || null; byId('feedback-preset').value = state?.preset || 'none';
    for (const input of document.querySelectorAll('input[name=composition]')) input.checked = input.value === state?.composition;
    showStep(record?.view.step ?? 0); showArea(record?.view.area || AREA_KEYS[0]); update();
  },
  lock: locked => { document.querySelector('.sp-workspace').inert = locked; document.querySelector('.sp-steps').inert = locked; for (const button of document.querySelectorAll('#case-toolbar button')) button.disabled = locked; },
  focus: () => showStep(activeStep, true),
});
