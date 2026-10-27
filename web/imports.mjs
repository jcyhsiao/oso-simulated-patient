import { readZip } from './zip.mjs';
import { imageDescriptionMetadata } from './image-metadata.mjs';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function wordXml(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Documents with XML entity declarations are unsupported. Paste the relevant text instead.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('The DOCX contains malformed XML.');
  return doc;
}
function paragraphText(element) {
  let text = '';
  function visit(node) {
    if (node.nodeType !== 1) return;
    if (node.namespaceURI === W && node.localName === 'txbxContent') { text += '\n\n' + extractWordBody(node) + '\n\n'; return; }
    if (node.namespaceURI === W && node.localName === 't') { text += node.textContent; return; }
    if (node.namespaceURI === W && ['tab', 'br', 'cr'].includes(node.localName)) { text += node.localName === 'tab' ? '\t' : '\n'; return; }
    for (const child of node.children) visit(child);
  }
  visit(element);
  return text;
}
function extractWordBody(element) {
  const blocks = [];
  for (const child of element.children) {
    if (child.namespaceURI !== W) continue;
    if (child.localName === 'p') {
      const text = paragraphText(child);
      if (text.trim()) blocks.push((child.getElementsByTagNameNS(W, 'numPr').length ? '• ' : '') + text);
    } else if (child.localName === 'tbl') {
      const rows = Array.from(child.children).filter(c => c.localName === 'tr').map(row => Array.from(row.children).filter(c => c.localName === 'tc').map(cell => extractWordBody(cell).replace(/\n+/g, ' / ').replace(/\|/g, '\\|')));
      if (rows.length) {
        const cols = Math.max(...rows.map(r => r.length));
        const tableRows = rows.map(row => '| ' + [...row, ...Array(cols - row.length).fill('')].join(' | ') + ' |');
        if (tableRows.length >= 1) tableRows.splice(1, 0, '| ' + Array(cols).fill('---').join(' | ') + ' |');
        blocks.push(tableRows.join('\n'));
      }
    } else if (['sdt', 'sdtContent', 'customXml'].includes(child.localName)) blocks.push(extractWordBody(child));
  }
  return blocks.filter(Boolean).join('\n\n');
}
function selectWordRepresentations(doc) {
  const namespace = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
  for (const alternate of [...doc.getElementsByTagNameNS(namespace, 'AlternateContent')]) {
    if (!alternate.parentNode) continue;
    const selected = [...alternate.children].find(child => child.localName === 'Choice') || [...alternate.children].find(child => child.localName === 'Fallback');
    if (selected) for (const child of [...selected.childNodes]) alternate.parentNode.insertBefore(child, alternate);
    alternate.remove();
  }
}
async function wordImages(body, entries) {
  const relationReader = entries.get('word/_rels/document.xml.rels');
  const relations = new Map();
  if (relationReader) {
    const rel = wordXml(await relationReader());
    for (const item of rel.getElementsByTagNameNS('*', 'Relationship')) relations.set(item.getAttribute('Id'), { target: item.getAttribute('Target'), external: item.getAttribute('TargetMode') === 'External' });
  }
  const drawings = [...body.getElementsByTagNameNS(W, 'drawing'), ...body.getElementsByTagNameNS(W, 'pict')];
  const images = [];
  for (const [index, drawing] of drawings.entries()) {
    const metadata = [];
    for (const node of drawing.getElementsByTagNameNS('*', '*')) {
      if (['docPr', 'cNvPr'].includes(node.localName)) {
        for (const field of ['title', 'descr']) if (node.getAttribute(field)?.trim()) metadata.push({ label: field === 'descr' ? 'Word alt description' : 'Word alt title', text: node.getAttribute(field).trim() });
      }
      if (node.localName === 'shape' && node.getAttribute('alt')?.trim()) metadata.push({ label: 'Word shape alt text', text: node.getAttribute('alt').trim() });
    }
    const imageNode = [...drawing.getElementsByTagNameNS('*', '*')].find(node => ['blip', 'imagedata'].includes(node.localName));
    if (!imageNode && drawing.getElementsByTagNameNS(W, 'txbxContent').length) continue;
    const rid = imageNode?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', imageNode.localName === 'blip' ? 'embed' : 'id');
    const relation = relations.get(rid); let name = `embedded-visual-${index + 1}`, bytes = null, warning = '';
    if (relation && !relation.external && relation.target) {
      const parts = relation.target.startsWith('/') ? [] : ['word'];
      for (const part of relation.target.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') { if (!parts.length) throw new Error('Image relationship escapes the document archive.'); parts.pop(); }
        else parts.push(part);
      }
      const member = parts.join('/'); name = member.split('/').pop();
      if (/\.(png|jpe?g)$/i.test(name) && entries.has(member)) {
        bytes = await entries.get(member)();
        if (!metadata.length) metadata.push(...await imageDescriptionMetadata(bytes, name.split('.').pop().toLowerCase()));
      } else warning = 'Original image format is not packaged; a reviewed description can still be included.';
    } else warning = 'Linked or non-raster visual: no external retrieval is performed. Supply or review its description.';
    images.push({ name, label: `Embedded visual ${index + 1}`, bytes, metadata, description: '', releaseCondition: '', excluded: false, warning });
  }
  return images;
}
export async function importPreparedFile(file, allowImage = false) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg'].includes(extension)) {
    if (!allowImage) throw new Error('Image assets belong in the Patient area, with an authored description.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid = extension === 'png' ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 : bytes[0] === 255 && bytes[1] === 216;
    if (!valid) throw new Error('The image contents do not match its filename.');
    const metadata = await imageDescriptionMetadata(bytes, extension);
    return { kind: 'image', bytes, metadata, description: '', releaseCondition: '', excluded: false, warning: metadata.length ? 'Embedded description metadata found. Review it before using it; it is not a new visual interpretation.' : 'No embedded description found. Supply a description offline; image pixels are not interpreted.' };
  }
  if (['txt', 'md', 'markdown'].includes(extension)) {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()).replace(/^\uFEFF/, ''); } catch { throw new Error('Save this text file as UTF-8 or paste its contents.'); }
    if (!text.trim()) throw new Error('This file contains no text.');
    return { kind: 'text', text: text.replace(/\r\n?/g, '\n') };
  }
  if (extension !== 'docx') throw new Error('Use TXT, Markdown or DOCX. PDF, scanned documents and other formats are not supported yet; paste relevant excerpts.');
  const entries = await readZip(await file.arrayBuffer()), read = entries.get('word/document.xml');
  if (!read) throw new Error('This file has no Word document body.');
  const doc = wordXml(await read());
  selectWordRepresentations(doc);
  if (doc.getElementsByTagNameNS(W, 'ins').length || doc.getElementsByTagNameNS(W, 'del').length) throw new Error('Accept/reject tracked changes in Word first, or paste the intended final text.');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('This DOCX has no document body.');
  const text = extractWordBody(body), images = await wordImages(body, entries);
  if (!text.trim() && !images.length) throw new Error('No paragraph/table text could be extracted. Scanned pages and image text are not read; paste the intended text.');
  const notes = ['Extracted main-body paragraphs and table cells. List items use bullets; verify original numbering in the extracted preview.'];
  if ([...entries.keys()].some(key => /^word\/(footnotes|endnotes|comments|header\d*|footer\d*)\.xml$/.test(key))) notes.push('Headers, footers, notes and comments are not included; paste any relevant content separately.');
  if (body.getElementsByTagNameNS(W, 'txbxContent').length) notes.push('Text-box paragraphs are extracted in document order; verify their visual reading order.');
  if (images.length) notes.push(`${images.length} embedded visual(s) found. Review extracted alt text or supply missing descriptions below; unreviewed metadata is not exported.`);
  if ([...entries.keys()].some(key => key.startsWith('word/media/')) && !images.length) notes.push('Unreferenced or unsupported embedded media was not extracted; inspect the original document.');
  return { kind: 'text', text, images, warning: notes.join(' ') };
}
