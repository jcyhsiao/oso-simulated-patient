/* Optional browser QA: PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE can point to an existing installation. */
let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'));
} catch (e) {
  console.error('Playwright is not installed. Set PLAYWRIGHT_MODULE=<path> or install playwright to run browser QA.');
  process.exit(1);
}

const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
(async () => {
  const out = process.env.BROWSER_QA_OUTPUT || '/tmp/simulated-patient-builder-qa'; await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 }, offline: !process.env.BUILDER_URL, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [], connections = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url()) && (r.method() !== 'GET' || !process.env.BUILDER_URL || new URL(r.url()).origin !== new URL(process.env.BUILDER_URL).origin)) connections.push(r.url()); });
  await page.goto(process.env.BUILDER_URL || pathToFileURL(path.resolve('web/dist/simulated-patient-builder.html')).href);
  await page.keyboard.press('Tab');
  if (!(await page.evaluate(() => document.activeElement.textContent)).includes('Skip to main content')) throw Error('Skip link is not first in keyboard order');
  await page.keyboard.press('Enter');
  if (!(await page.locator('#main-content').evaluate(el => el === document.activeElement))) throw Error('Skip link did not focus main content');
  await page.locator('#case-name').fill('Linda Johnson'); await page.locator('#learner-role').fill('Dental hygiene student');

  // WS5: selecting a role chip does not overwrite the developer-entered learner role
  const dhChip = page.locator('.sp-role-chip').filter({ hasText: 'Dental Hygiene' });
  if (await dhChip.count()) {
    await dhChip.click();
    if ((await page.locator('#learner-role').inputValue()) !== 'Dental hygiene student') throw Error('Role chip overwrote learner role');
  }

  // WS2: unlisted symptoms defaults to neutral
  if (!(await page.locator('input[name=unlisted-symptoms][value=neutral]').isChecked())) throw Error('Default unlisted symptoms should be neutral');
  await page.locator('input[name=unlisted-symptoms][value=deny]').check();

  await page.locator('#text-context').fill('Course context: prepare for the later human IPE group discussion.');
  await page.locator('[data-step="1"]').click(); await page.locator('[data-area="patient-parameters-and-disclosable-info"]').click();
  await page.locator('#text-patient-parameters-and-disclosable-info').fill('Linda is 67. Reveal supplied information gradually. When asked about oral health: “My gums bleed when I brush.” Missing facts remain unspecified.');
  const sampleXml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Retained specimen value: 9.2%</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>BP</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>152/92 mmHg</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
  const fixture = path.join(out, 'prepared.docx');
  const python = spawnSync('python3', ['-B', '-c', 'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1],"w",zipfile.ZIP_DEFLATED);z.writestr("word/document.xml",sys.stdin.read());z.close()', fixture], { input: sampleXml, encoding: 'utf8' });
  if (python.status) throw Error(python.stderr);
  await page.locator('#files-patient-parameters-and-disclosable-info').setInputFiles(fixture);
  await page.getByText('Retained specimen value: 9.2%', { exact: false }).waitFor({ state: 'attached' });
  const extracted = await page.locator('[data-input-group="patient-parameters-and-disclosable-info"] pre').textContent();
  if (!extracted.includes('| BP | 152/92 mmHg |')) throw Error('DOCX table not preserved');
  await page.locator('#files-patient-parameters-and-disclosable-info').setInputFiles({ name: 'unsafe-text.md', mimeType: 'text/markdown', buffer: Buffer.from('<img src=x onerror="window.bad=1">\nSECOND SOURCE') });
  await page.getByText('SECOND SOURCE', { exact: false }).waitFor({ state: 'attached' });
  if (await page.evaluate(() => window.bad)) throw Error('Uploaded text executed');
  const files = page.locator('[data-input-group="patient-parameters-and-disclosable-info"] .sp-file');
  await files.nth(1).getByRole('button', { name: 'Move up', exact: true }).click();
  if (!(await files.first().textContent()).includes('unsafe-text.md')) throw Error('Source reordering failed');
  await files.first().getByRole('button', { name: 'Remove', exact: true }).click();
  let chooserEvent = page.waitForEvent('filechooser');
  await files.first().getByRole('button', { name: 'Replace', exact: true }).click();
  let chooser = await chooserEvent; await chooser.setFiles([]);
  if (!(await files.first().textContent()).includes('prepared.docx')) throw Error('Canceling replacement removed the original');
  chooserEvent = page.waitForEvent('filechooser'); await files.first().getByRole('button', { name: 'Replace', exact: true }).click();
  chooser = await chooserEvent; await chooser.setFiles({ name: 'replacement.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await fs.readFile(fixture) });
  await page.getByText('replacement.docx', { exact: true }).waitFor();
  await page.locator('[data-input-group="patient-parameters-and-disclosable-info"] pre').waitFor({ state: 'attached' });

  await page.locator('#files-patient-parameters-and-disclosable-info').setInputFiles({ name: 'not-supported.pdf', mimeType: 'application/pdf', buffer: Buffer.from('unsupported') });
  await page.getByText(/Use TXT, Markdown or DOCX/).waitFor();
  await files.last().getByRole('button', { name: 'Remove', exact: true }).click();
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS9sAAAAASUVORK5CYII=', 'base64');
  await fs.writeFile(path.join(out, 'sample.png'), image);
  await page.locator('#files-patient-parameters-and-disclosable-info').setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: image });
  await page.getByText('Image asset; review description below', { exact: true }).waitFor();
  await page.locator('[data-step="3"]').click(); await page.locator('#build').click();
  await page.getByText('sample.png: review extracted alt text or supply a description', { exact: false }).waitFor();
  await page.locator('[data-step="1"]').click();
  await page.locator('.sp-image-review > summary').click();
  await page.getByLabel('Reviewed patient-visible description').fill('Faculty-described sample image. Disclose only on a relevant visual request.');
  if (process.env.DOCX_SAMPLE) {
    await page.locator('[data-step="0"]').click(); await page.locator('#files-context').setInputFiles(process.env.DOCX_SAMPLE);
    await page.locator('[data-input-group="context"] pre').waitFor({ state: 'attached' });
    const sample = await page.locator('[data-input-group="context"] pre').textContent(); if (!sample.includes('Linda Johnson') || !sample.includes('Profession-Specific Roles')) throw Error('Sample DOCX incomplete');
    await page.locator('[data-input-group="context"] .sp-file').getByRole('button', { name: 'Remove', exact: true }).click();
  }
  await page.locator('[data-step="2"]').click(); await page.locator('#feedback-preset').selectOption('ipe');
  await page.locator('#text-feedback').fill('For dental hygiene learners: identify oral hygiene deficits and xerostomia concerns.');
  await page.locator('[data-step="3"]').click(); await page.locator('#build').click();
  await page.getByText('Feedback: Choose Supplement or Replace', { exact: false }).waitFor();
  await page.locator('[data-step="2"]').click(); await page.locator('input[name=composition][value=supplement]').check();
  await page.screenshot({ path: path.join(out, 'feedback-desktop.png'), fullPage: true });
  await page.locator('[data-step="3"]').click(); await page.locator('#build').click(); await page.locator('#build-result').waitFor({ state: 'visible' });

  let downloadEvent = page.waitForEvent('download'); await page.locator('#download-instructions').click(); let download = await downloadEvent;
  const single = path.join(out, download.suggestedFilename()); await download.saveAs(single);
  if (!download.suggestedFilename().endsWith('-carmen-instructions.md')) throw Error('Filename must end with -carmen-instructions.md');
  const text = await fs.readFile(single, 'utf8');
  if (!text.includes('Assessment timing is managed by a human assessor or timekeeper') || !text.includes('Discovery and result delivery are distinct')) throw Error('New shared runtime policy missing from downloaded export');
  if (!text.includes('9.2%') || !text.includes('Buckeye IPE preliminary feedback') || !text.includes('human IPE group discussion')) throw Error('Export missing supplied inputs');
  if (!text.includes('Faculty policy for this case: if the learner asks about a symptom')) throw Error('Deny policy missing from export');

  await page.locator('[data-step="2"]').click(); await page.locator('input[name=composition][value=replace]').check();
  await page.locator('[data-step="3"]').click(); await page.locator('#build').click();
  if ((await page.locator('#generated-preview').textContent()).includes('# Buckeye IPE preliminary feedback framework')) throw Error('Replacement left preset in export');
  await page.locator('[data-step="0"]').click(); await page.locator('#text-context').fill('X'.repeat(51000));
  await page.locator('[data-step="3"]').click(); await page.locator('#build').click();
  await page.getByText(/exceeds the under-48,000/).waitFor();
  if (await page.locator('#download-instructions').isVisible()) throw Error('Oversized export has downloads');
  await page.locator('[data-step="0"]').click(); await page.locator('#text-context').fill('Course context, not patient facts.');
  await page.locator('[data-step="2"]').click(); await page.locator('#feedback-preset').selectOption('none'); await page.locator('#text-feedback').fill('');
  await page.locator('[data-step="3"]').click(); await page.locator('#build').click();
  if (!(await page.locator('#generated-preview').textContent()).includes('No preliminary feedback is selected')) throw Error('No-feedback export failed');
  await page.evaluate(async () => { await document.fonts.ready; });
  const fonts = await page.evaluate(() => ({ sans: document.fonts.check('16px BuckeyeSans'), serif: document.fonts.check('40px BuckeyeSerif') }));
  if (!fonts.sans || !fonts.serif) throw Error('BUX fonts missing');
  await page.setViewportSize({ width: 360, height: 1000 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Mobile horizontal overflow');
  await page.screenshot({ path: path.join(out, 'export-mobile.png'), fullPage: true });
  await page.locator('#case-save').click(); await page.getByText(/Saved on this device/).waitFor(); await page.reload(); await page.locator('#case-save:enabled').waitFor();
  if ((await page.locator('#case-name').inputValue()) !== 'Linda Johnson') throw Error('Case state not restored after reload');
  if (!(await page.locator('input[name=unlisted-symptoms][value=deny]').isChecked())) throw Error('Unlisted symptoms deny setting not restored after reload');
  if (connections.length || errors.length) throw Error(JSON.stringify({ connections, errors }));
  console.log(JSON.stringify({ mode: process.env.BUILDER_URL ? 'static HTTP' : 'direct HTML, offline', checked: 'DOCX paragraphs/tables and sample, safe text, file ordering/removal, custom composition, actual Carmen instructions download, overflow, no feedback, save/resume, BUX fonts, mobile layout, no content network traffic', screenshots: out }));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
