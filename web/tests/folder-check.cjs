#!/usr/bin/env node
let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'));
} catch (e) {
  console.error('Playwright is not installed. Set PLAYWRIGHT_MODULE=<path> or install playwright to run folder-check.');
  process.exit(1);
}

const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const KNOWN_AREAS = [
  'context',
  'learner-has-info',
  'consultants-have-info',
  'facilitator-observation-reference',
  'patient-parameters-and-disclosable-info',
  'feedback'
];

async function main() {
  const args = process.argv.slice(2);
  const targetFolder = args.find(a => !a.startsWith('--'));

  if (!targetFolder) {
    console.log('Usage: node web/tests/folder-check.cjs <case-folder-path> [--preset fnp|ipe|none] [--roles id1,id2] [--unlisted neutral|deny]');
    process.exit(1);
  }

  const resolvedTarget = path.resolve(targetFolder);
  try {
    const stat = await fs.stat(resolvedTarget);
    if (!stat.isDirectory()) {
      console.error(`Error: ${targetFolder} is not a directory.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: cannot access folder ${targetFolder}: ${err.message}`);
    process.exit(1);
  }

  // Parse options
  let preset = 'none';
  let roles = [];
  let unlisted = 'neutral';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--preset' && args[i + 1]) {
      preset = args[++i];
    } else if (args[i] === '--roles' && args[i + 1]) {
      roles = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    } else if (args[i] === '--unlisted' && args[i + 1]) {
      unlisted = args[++i];
    }
  }

  // Scan subfolders
  const entries = await fs.readdir(resolvedTarget, { withFileTypes: true });
  const areaFiles = new Map();

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const areaName = entry.name;
      if (KNOWN_AREAS.includes(areaName)) {
        const subDir = path.join(resolvedTarget, areaName);
        const files = (await fs.readdir(subDir))
          .filter(f => /\.(docx|md|markdown|txt|png|jpe?g)$/i.test(f))
          .map(f => path.join(subDir, f));
        areaFiles.set(areaName, files);
      } else {
        console.log(`Note: skipping unrecognized subfolder: ${areaName}`);
      }
    }
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {})
  });

  try {
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 }, offline: true });
    const page = await context.newPage();
    const htmlPath = path.resolve('web/dist/simulated-patient-builder.html');
    await page.goto(pathToFileURL(htmlPath).href);

    // Wait for UI to load
    await page.locator('#case-save:enabled').waitFor();

    // Fill placeholder case metadata
    await page.locator('#case-name').fill('Folder check');
    await page.locator('#learner-role').fill('Folder check learner');

    // Set unlisted symptoms policy
    if (unlisted === 'deny') {
      await page.locator('input[name=unlisted-symptoms][value=deny]').check();
    } else {
      await page.locator('input[name=unlisted-symptoms][value=neutral]').check();
    }

    // Activate roles if requested
    for (const roleId of roles) {
      const chip = page.locator(`.sp-role-chip[data-role-id="${roleId}"]`);
      if (await chip.count()) {
        await chip.click();
      } else {
        console.warn(`Warning: role chip not found for ID '${roleId}'`);
      }
    }

    // Upload context files if present
    if (areaFiles.has('context') && areaFiles.get('context').length > 0) {
      await page.locator('#files-context').setInputFiles(areaFiles.get('context'));
      await page.waitForTimeout(500);
    }

    // Material areas
    await page.locator('[data-step="1"]').click();
    const materialAreas = [
      'learner-has-info',
      'consultants-have-info',
      'facilitator-observation-reference',
      'patient-parameters-and-disclosable-info'
    ];

    for (const area of materialAreas) {
      const files = areaFiles.get(area) || [];
      if (files.length > 0) {
        await page.locator(`[data-area="${area}"]`).click();
        await page.locator(`#files-${area}`).setInputFiles(files);
        // Wait for preview elements or text to be processed
        await page.waitForTimeout(600);
      }
    }

    // Bulk exclude any extracted images to check text compilation cleanly
    const bulkExclude = page.getByLabel('Exclude all images from the package', { exact: true });
    if (await bulkExclude.count()) {
      await bulkExclude.check();
    }

    // Feedback
    await page.locator('[data-step="2"]').click();
    if (preset !== 'none') {
      await page.locator('#feedback-preset').selectOption(preset);
    }
    if (areaFiles.has('feedback') && areaFiles.get('feedback').length > 0) {
      await page.locator('#files-feedback').setInputFiles(areaFiles.get('feedback'));
      await page.waitForTimeout(500);
      if (preset !== 'none') {
        await page.locator('input[name=composition][value=supplement]').check();
      }
    }

    // Build
    await page.locator('[data-step="3"]').click();
    await page.locator('#build').click();

    // Check results
    const errorsBox = page.locator('#build-errors');
    const hasErrors = await errorsBox.isVisible();
    const errors = hasErrors ? await errorsBox.locator('li').allTextContents() : [];

    const warningsBox = page.locator('#build-warnings');
    const hasWarnings = await warningsBox.isVisible();
    const warnings = hasWarnings ? await warningsBox.locator('p, li').allTextContents() : [];

    const badge = page.locator('#instruction-count-badge');
    const badgeText = (await badge.count()) ? await badge.textContent() : 'N/A';

    console.log('\n=== Folder Check Report ===');
    console.log(`Folder:   ${resolvedTarget}`);
    console.log(`Preset:   ${preset}`);
    console.log(`Roles:    ${roles.length ? roles.join(', ') : 'none'}`);
    console.log(`Policy:   ${unlisted}`);
    console.log(`Status:   ${badgeText}`);

    if (errors.length) {
      console.log('\nErrors:');
      for (const err of errors) console.log(`  - ${err}`);
    }

    if (warnings.length) {
      console.log('\nWarnings:');
      for (const warn of warnings) console.log(`  - ${warn}`);
    }

    // Print breakdown table if available
    const tableRows = page.locator('#instruction-breakdown table tbody tr');
    const rowCount = await tableRows.count();
    if (rowCount > 0) {
      console.log('\nUnit Breakdown:');
      for (let i = 0; i < rowCount; i++) {
        const cells = await tableRows.nth(i).locator('td').allTextContents();
        if (cells.length === 2) {
          console.log(`  ${cells[0].padEnd(45)} : ${cells[1].padStart(8)} units`);
        }
      }
    }
    console.log('===========================\n');

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
