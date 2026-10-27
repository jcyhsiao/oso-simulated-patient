import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => readFile(path.join(root, name), 'utf8');
const runtime = await read('content/runtime.md');
const content = { version: '2026-10-27-5', runtime, setup: await read('content/setup-checks.md'), presets: {
  fnp: { title: 'FNP OSCE', description: 'NPSCA-informed qualitative feedback: 17 items in four domains, using the supplied April 10, 2024 revision. Supply case-specific targets separately; no numeric grades or pass/fail.', text: await read('content/fnp-osce.md') },
  ipe: { title: 'Buckeye IPE', description: 'Six BuckIPE domains with local N/O, 0, 1 and 2 formative anchors. No aggregate score or pass/fail; unavailable opportunities remain N/O.', text: await read('content/buckeye-ipe.md') },
} };
async function inlineCss(filename) {
  let css = await readFile(filename, 'utf8');
  const imports = [...css.matchAll(/@import\s+["']([^"']+)["'];/g)];
  for (const match of imports) css = css.replace(match[0], await inlineCss(path.resolve(path.dirname(filename), match[1])));
  const urls = [...css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)];
  for (const match of urls) {
    if (/^(data:|#)/.test(match[1])) continue;
    if (/^[a-z]+:/i.test(match[1])) throw new Error('External assets are not allowed in the standalone build.');
    const bytes = await readFile(path.resolve(path.dirname(filename), match[1]));
    css = css.replace(match[0], `url(data:font/woff2;base64,${bytes.toString('base64')})`);
  }
  return css;
}
const css = await inlineCss(path.join(root, 'vendor/bux/bux-styles.min.css')) + '\n' + await read('app.css');
// Buildless application sources have static local imports only; flatten them for file:// use.
const sources = await Promise.all(['zip.mjs', 'compiler.mjs', 'image-metadata.mjs', 'imports.mjs', 'case-storage.mjs', 'case-session.mjs', 'app.mjs'].map(read));
const script = '"use strict";\n(()=>{\nconst APP_CONTENT=' + JSON.stringify(content).replace(/</g, '\\u003c') + ';\n' + sources.map(source => source.replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '')).join('\n') + '\n})();';
if (/<\/script/i.test(script)) throw new Error('Unsafe script terminator in app source.');
const hash = createHash('sha256').update(script).digest('base64');
const csp = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
let html = (await read('index.template.html')).replace('__CSP__', csp).replace('__STYLES__', () => css).replace('__SCRIPT__', () => script);
await mkdir(path.join(root, 'dist'), { recursive: true });
for (const name of ['index.html', 'simulated-patient-builder.html']) await writeFile(path.join(root, 'dist', name), html);
console.log(`Built standalone and static-host entry points (${Buffer.byteLength(html).toLocaleString()} bytes each).`);
