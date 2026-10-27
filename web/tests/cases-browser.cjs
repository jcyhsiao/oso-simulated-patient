const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
(async () => {
 const out = process.env.BROWSER_QA_OUTPUT || '/tmp/simulated-patient-cases-qa'; await fs.mkdir(out, { recursive: true });
 const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
 try {
 const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 }, offline: !process.env.BUILDER_URL });
 await context.addInitScript(() => { const original = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(...args) { if (window.failCaseWrites && this.name === 'cases') throw new DOMException('Test quota failure', 'QuotaExceededError'); return original.apply(this, args); }; });
 const page = await context.newPage(), errors = [], connections = [];
 const observe = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('request', r => { if (/^https?:/.test(r.url()) && (!process.env.BUILDER_URL || new URL(r.url()).origin !== new URL(process.env.BUILDER_URL).origin || r.method() !== 'GET')) connections.push(r.url()); }); };
 observe(page);
 const url = process.env.BUILDER_URL || pathToFileURL(path.resolve('web/dist/simulated-patient-builder.html')).href;
 const loaded = async p => { await p.locator('#case-save:enabled').waitFor(); };
 const save = async p => { await p.locator('#case-save').click(); await loaded(p); await p.locator('#case-save-status').filter({ hasText: 'Saved on this device' }).waitFor(); };
 const library = async p => { await p.locator('#case-my-cases').click(); await p.locator('#case-library').waitFor({ state: 'visible' }); };
 const records = p => p.evaluate(() => new Promise((resolve, reject) => { const r = indexedDB.open('simulated-patient-builder-cases', 1); r.onsuccess = () => { const db = r.result, tx = db.transaction('cases'), req = tx.objectStore('cases').getAll(); req.onsuccess = () => resolve(req.result); tx.oncomplete = () => db.close(); }; r.onerror = () => reject(r.error); }));
 await page.goto(url); await loaded(page); assert.equal((await records(page)).length, 0);
 await page.locator('#case-name').fill('Shannon draft 🦷'); await page.locator('#learner-role').fill('FNP student');
 await page.locator('#text-context').fill('Course context preserved');
 await page.locator('[data-step="1"]').click(); await page.locator('[data-area="patient-parameters-and-disclosable-info"]').click();
 await page.locator('#text-patient-parameters-and-disclosable-info').fill('Supplied portrayal and disclosure rules.');
 const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS9sAAAAASUVORK5CYII=', 'base64');
 await page.locator('#files-patient-parameters-and-disclosable-info').setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: image });
 await page.locator('.sp-image-review > summary').click(); await page.getByLabel('Reviewed patient-visible description').fill('Reviewed image description'); await page.getByLabel('When may this be disclosed? (optional)').fill('Only when asked');
 await page.locator('[data-step="2"]').click(); await page.locator('#feedback-preset').selectOption('fnp'); await page.locator('#text-feedback').fill('Case-specific expectation'); await page.locator('input[name=composition][value=supplement]').check();
 await page.locator('[data-step="3"]').click(); await page.locator('input[name=format][value=skills]').check();
 // Autosave incomplete or complete cases without needing Build.
 await page.locator('#case-save-status').filter({ hasText: 'Saved on this device' }).waitFor();
 let saved = await records(page); assert.equal(saved.length, 1); assert.equal(saved[0].view.step, 3); assert.equal(saved[0].model.presetSnapshot.key, 'fnp');
 await page.reload(); await loaded(page); assert.equal(await page.locator('#case-name').inputValue(), 'Shannon draft 🦷'); await page.locator('[data-panel="3"]').waitFor({ state: 'visible' }); assert.equal(await page.locator('#build-result').isVisible(), false);
 await page.locator('#build').click(); await page.locator('#build-result').waitFor({ state: 'visible' }); const built = await page.locator('#generated-preview').textContent();
 assert.match(built, /Reviewed image description/); assert.match(built, /NPSCA qualitative adaptation/);
 await page.locator('#case-toolbar details > summary').click(); let event = page.waitForEvent('download'); await page.locator('#case-backup').click(); let download = await event; const backup = path.join(out, download.suggestedFilename()); await download.saveAs(backup);
 await page.locator('#case-new').click(); await loaded(page); assert.equal(await page.locator('#case-name').inputValue(), ''); assert.equal(await page.locator('#feedback-preset').inputValue(), 'none'); assert.equal(await page.locator('input[name=format]:checked').inputValue(), 'single'); assert.equal((await records(page)).length, 1);
 await page.evaluate(() => { const original = File.prototype.arrayBuffer; File.prototype.arrayBuffer = async function() { if (this.name === 'slow.md') await new Promise(resolve => setTimeout(resolve, 1800)); return original.call(this); }; });
 await page.locator('#files-context').setInputFiles({ name: 'slow.md', mimeType: 'text/markdown', buffer: Buffer.from('Delayed import must not leak into new case') });
 await page.locator('#case-new').click(); await loaded(page); await page.waitForTimeout(2000); assert.equal(await page.locator('.sp-file').count(), 0);
 await library(page); const interrupted = page.locator('.sp-saved-case').filter({ has: page.getByRole('heading', { name: 'Untitled case', exact: true }) });
 await interrupted.getByRole('button', { name: 'Open', exact: true }).click(); await page.locator('#case-library').waitFor({ state: 'hidden' }); await page.getByText('Import was interrupted. Remove or replace this source.').waitFor();
 page.once('dialog', d => d.accept()); await library(page); await page.locator('.sp-saved-case').filter({ has: page.getByRole('heading', { name: 'Untitled case', exact: true }) }).getByRole('button', { name: 'Delete', exact: true }).click(); await loaded(page); await page.locator('#case-library-close').click();
 await page.locator('#case-name').fill('Unfinished'); await save(page); await library(page); assert.equal(await page.locator('.sp-saved-case').count(), 2);
 const shannon = page.locator('.sp-saved-case').filter({ has: page.getByRole('heading', { name: 'Shannon draft 🦷', exact: true }) }); await shannon.getByRole('button', { name: 'Open', exact: true }).click(); await page.locator('#case-library').waitFor({ state: 'hidden' });
 assert.equal(await page.locator('#case-name').inputValue(), 'Shannon draft 🦷'); await page.locator('[data-step="1"]').click(); assert.equal(await page.getByLabel('Reviewed patient-visible description').inputValue(), 'Reviewed image description'); await page.locator('.sp-image-preview').evaluate(img => img.decode());
 await save(page);
 // A second tab resumes the same case but cannot overwrite a newer revision.
 const second = await context.newPage(); observe(second); await second.goto(url); await loaded(second);
 await page.locator('[data-step="0"]').click(); await page.locator('#case-name').fill('First tab wins'); await save(page);
 await second.locator('[data-step="0"]').click(); await second.locator('#case-name').fill('Second tab work'); await second.locator('#case-save').click(); await second.locator('#case-conflict-copy').waitFor({ state: 'visible' });
 await second.locator('#case-conflict-copy').click(); await second.locator('#case-save-status').filter({ hasText: 'Saved on this device' }).waitFor(); assert.equal((await records(second)).length, 3);
 // Quota failure preserves work and blocks Start new until explicit recovery.
 await second.evaluate(() => { window.failCaseWrites = true; }); await second.locator('#case-name').fill('Unsaved quota work'); await second.locator('#case-new').click(); await second.locator('#case-discard-continue').waitFor({ state: 'visible' }); assert.equal(await second.locator('#case-name').inputValue(), 'Unsaved quota work');
 event = second.waitForEvent('download'); await second.locator('#case-recovery-backup').click(); download = await event; await download.saveAs(path.join(out, 'quota-recovery.spcase.zip'));
 await second.evaluate(() => { window.failCaseWrites = false; }); await second.locator('#case-retry').click(); await loaded(second); assert.equal(await second.locator('#case-name').inputValue(), ''); assert.equal((await records(second)).length, 3);
 // Import is a distinct case, with exact image bytes and pinned feedback.
 await second.locator('#case-backup-input').setInputFiles(backup); await second.locator('[data-panel="3"]').waitFor({ state: 'visible' }); await save(second);
 assert.equal((await records(second)).length, 4); saved = await records(second); const restored = saved.filter(r => r.model.name === 'Shannon draft 🦷')[0]; assert.deepEqual(Buffer.from(Object.values(restored.model.groups['patient-parameters-and-disclosable-info'].files[0].bytes)), image);
 await second.locator('#build').click(); await second.locator('#build-result').waitFor({ state: 'visible' }); assert.equal(await second.locator('#generated-preview').textContent(), built);
 await library(second); const row = second.locator('.sp-saved-case').filter({ has: second.getByRole('heading', { name: 'Shannon draft 🦷', exact: true }) }); await row.getByRole('button', { name: 'Duplicate', exact: true }).click(); await second.locator('#case-library').waitFor({ state: 'hidden' }); assert.equal(await second.locator('#case-name').inputValue(), 'Shannon draft 🦷 — copy');
 await library(second); second.once('dialog', d => d.accept()); await second.locator('.sp-saved-case').filter({ has: second.getByRole('heading', { name: 'Shannon draft 🦷 — copy', exact: true }) }).getByRole('button', { name: 'Delete', exact: true }).click(); await loaded(second); assert.equal(await second.locator('#case-name').inputValue(), ''); assert.equal((await records(second)).length, 4); await second.locator('#case-library-close').click();
 await second.setViewportSize({ width: 360, height: 1000 }); await library(second); assert.equal(await second.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await second.screenshot({ path: path.join(out, 'my-cases-mobile.png'), fullPage: true }); await second.locator('#case-library-close').click();
 // A newer app never silently replaces feedback text saved with a case.
 await second.evaluate(() => new Promise(resolve => { const r = indexedDB.open('simulated-patient-builder-cases', 1); r.onsuccess = () => { const db = r.result, tx = db.transaction(['cases', 'meta'], 'readwrite'), store = tx.objectStore('cases'); store.getAll().onsuccess = e => { const record = e.target.result.find(r => r.model.name === 'Shannon draft 🦷'); record.model.presetSnapshot.text = 'OLDER PINNED PRESET'; record.model.presetSnapshot.version = 'older'; store.put(record); tx.objectStore('meta').put(record.id, 'active'); }; tx.oncomplete = () => { db.close(); resolve(); }; }; }));
 await second.reload(); await loaded(second); await second.locator('[data-step="2"]').click(); await second.locator('#update-preset').waitFor({ state: 'visible' }); assert.equal(await second.locator('#preset-preview').textContent(), 'OLDER PINNED PRESET');
 await second.locator('#update-preset').click(); assert.match(await second.locator('#preset-preview').textContent(), /NPSCA qualitative adaptation/); assert.equal(await second.locator('#text-feedback').inputValue(), 'Case-specific expectation'); await save(second);
 await second.setViewportSize({ width: 1280, height: 1000 }); await second.screenshot({ path: path.join(out, 'case-toolbar-desktop.png'), fullPage: true });
 // Unsupported schema is not overwritten; its raw record remains downloadable.
 await second.evaluate(() => new Promise(resolve => { const r = indexedDB.open('simulated-patient-builder-cases', 1); r.onsuccess = () => { const db = r.result, tx = db.transaction(['cases', 'meta'], 'readwrite'); tx.objectStore('cases').put({ schema_version: 99, id: 'future', revision: 1, model: { name: 'Future case' }, saved_at: new Date().toISOString() }); tx.objectStore('meta').put('future', 'active'); tx.oncomplete = () => { db.close(); resolve(); }; }; }));
 await second.reload(); await loaded(second); await second.locator('#case-save-error').filter({ hasText: 'Could not resume' }).waitFor(); await library(second); const future = second.locator('.sp-saved-case').filter({ has: second.getByRole('heading', { name: 'Future case', exact: true }) }); await future.getByRole('button', { name: 'Open', exact: true }).click(); await second.locator('#case-library-error').filter({ hasText: 'Unsupported case version' }).waitFor(); event = second.waitForEvent('download'); await future.getByRole('button', { name: 'Download backup' }).click(); download = await event; await download.saveAs(path.join(out, 'future.spcase.zip')); assert.equal((await records(second)).find(r => r.id === 'future').schema_version, 99);
 second.once('dialog', d => d.accept()); await second.locator('#case-delete-all').click(); await loaded(second); assert.equal((await records(second)).length, 0);
 assert.deepEqual(errors, []); assert.deepEqual(connections, []);
 // Storage-denied mode still permits backup download and import.
 const denied = await browser.newContext({ acceptDownloads: true, offline: !process.env.BUILDER_URL });
 await denied.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: { open() { throw new DOMException('Blocked for test', 'SecurityError'); } } }));
 const p = await denied.newPage(); await p.goto(url); await loaded(p); await p.locator('#case-save-status').filter({ hasText: 'Local saving is unavailable' }).waitFor(); await p.locator('#case-name').fill('Memory only'); await p.locator('#case-save').click(); await loaded(p); await p.locator('#case-save-error').waitFor({ state: 'visible' }); event = p.waitForEvent('download'); await p.locator('#case-recovery-backup').click(); download = await event; await download.saveAs(path.join(out, 'memory-only.spcase.zip'));
 await p.locator('#case-backup-input').setInputFiles(backup); await p.locator('#case-discard-continue').waitFor({ state: 'visible' }); p.once('dialog', d => d.accept()); await p.locator('#case-discard-continue').click(); await loaded(p); assert.equal(await p.locator('#case-name').inputValue(), 'Shannon draft 🦷');
 await denied.close(); await context.close();
 // Close/reopen a real browser profile, rather than relying only on page refresh.
 if (!process.env.BUILDER_URL) {
   const profile = await fs.mkdtemp(path.join(out, 'profile-'));
   const options = { headless: true, offline: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) };
   let persisted = await chromium.launchPersistentContext(profile, options), tab = persisted.pages()[0];
   await tab.goto(url); await loaded(tab); await tab.locator('#case-name').fill('Survives browser restart'); await save(tab); await persisted.close();
   persisted = await chromium.launchPersistentContext(profile, options); tab = persisted.pages()[0]; await tab.goto(url); await loaded(tab); assert.equal(await tab.locator('#case-name').inputValue(), 'Survives browser restart'); await persisted.close();
 }
 console.log('Case QA passed: autosave/resume, unfinished cases, previews and bytes, switching, reset, duplicates/deletion, lossless backups, pinned presets, two-tab conflicts, quota recovery, unsupported schema, denied storage, mobile layout and no content network traffic.');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
