import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const file = fileURLToPath(new URL('./dist/index.html', import.meta.url));
const server = http.createServer(async (request, response) => {
  if (!['/', '/index.html', '/simulated-patient-builder.html'].includes(request.url)) { response.writeHead(404); response.end('Not found'); return; }
  try { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(await readFile(file)); }
  catch { response.writeHead(503); response.end('Run npm run build first.'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
