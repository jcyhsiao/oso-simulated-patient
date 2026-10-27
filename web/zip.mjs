// Minimal standard ZIP support: stored exports and stored/deflated DOCX entries.
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function safeMember(name) {
  if (!name || name.startsWith('/') || name.includes('\\') || name.split('/').some(p => p === '..' || p === '.')) throw new Error('Unsafe ZIP member path.');
}
export function createZip(files) {
  const chunks = [], directory = [], names = new Set(); let offset = 0, directorySize = 0;
  for (const file of files) {
    safeMember(file.name);
    if (names.has(file.name)) throw new Error('Duplicate ZIP member.');
    names.add(file.name);
    const name = encoder.encode(file.name), data = typeof file.data === 'string' ? encoder.encode(file.data) : new Uint8Array(file.data);
    const crc = crc32(data), local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true); lv.setUint16(12, 33, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    chunks.push(local, data); directory.push(central); offset += local.length + data.length; directorySize += central.length;
  }
  if (files.length > 65535 || offset + directorySize > 0xffffffff) throw new Error('ZIP64 output is not supported.');
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
  const result = new Uint8Array(offset + directorySize + 22); let at = 0;
  for (const chunk of [...chunks, ...directory, end]) { result.set(chunk, at); at += chunk.length; }
  return result;
}
export async function readZip(bytes) {
  bytes = new Uint8Array(bytes); const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const check = (start, length) => { if (start < 0 || start + length > bytes.length) throw new Error('Truncated ZIP file.'); };
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0) throw new Error('This is not a supported ZIP/DOCX file.');
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('Multi-volume ZIP files are not supported.');
  const count = view.getUint16(end + 10, true); let at = view.getUint32(end + 16, true); const entries = new Map();
  if (count === 65535 || at === 0xffffffff) throw new Error('ZIP64 documents are not supported.');
  for (let i = 0; i < count; i++) {
    check(at, 46); if (view.getUint32(at, true) !== 0x02014b50) throw new Error('Invalid ZIP directory.');
    const flags = view.getUint16(at + 8, true), method = view.getUint16(at + 10, true), crc = view.getUint32(at + 16, true), compressed = view.getUint32(at + 20, true), size = view.getUint32(at + 24, true);
    const nl = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true), local = view.getUint32(at + 42, true);
    check(at + 46, nl + extra + comment); const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nl)); safeMember(name);
    if (flags & 1) throw new Error('Encrypted documents are not supported.');
    if (entries.has(name)) throw new Error('Duplicate entries in document ZIP.');
    entries.set(name, async () => {
      check(local, 30); if (view.getUint32(local, true) !== 0x04034b50) throw new Error('Invalid ZIP entry.');
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true); check(start, compressed);
      let data = bytes.slice(start, start + compressed);
      if (method === 8) {
        try { data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); }
        catch { throw new Error('Could not decompress this DOCX. Try a current browser or paste the relevant text.'); }
      } else if (method !== 0) throw new Error('Unsupported document compression.');
      if (data.length !== size || crc32(data) !== crc) throw new Error('Document ZIP integrity check failed.');
      return data;
    });
    at += 46 + nl + extra + comment;
  }
  return entries;
}
