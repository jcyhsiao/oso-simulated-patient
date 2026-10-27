// Extract supplied descriptions only. No pixel interpretation or network requests.
function cleanMetadata(value) { return value.replace(/\0+$/g, '').trim(); }
export async function imageDescriptionMetadata(bytes, extension) {
  const values = [], decoder = new TextDecoder('utf-8');
  const add = (label, value) => { value = cleanMetadata(value); if (value) values.push({ label, text: value }); };
  const interesting = /^(description|image description|title|caption|comment|alt|alt text|alttext)$/i;
  if (extension === 'png') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let at = 8; at + 12 <= bytes.length;) {
      const length = view.getUint32(at), end = at + 8 + length;
      if (end + 4 > bytes.length) break;
      const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8)), data = bytes.subarray(at + 8, end);
      if (['tEXt', 'iTXt', 'zTXt'].includes(type)) {
        const zero = data.indexOf(0), key = zero < 0 ? '' : new TextDecoder('iso-8859-1').decode(data.subarray(0, zero));
        if (interesting.test(key)) {
          try {
            let text;
            if (type === 'tEXt') text = new TextDecoder('iso-8859-1').decode(data.subarray(zero + 1));
            else if (type === 'zTXt') {
              if (data[zero + 1] !== 0) throw new Error('Unsupported text compression');
              text = decoder.decode(await new Response(new Blob([data.subarray(zero + 2)]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
            } else {
              const compressed = data[zero + 1], languageEnd = data.indexOf(0, zero + 3), translatedEnd = data.indexOf(0, languageEnd + 1);
              if (languageEnd < 0 || translatedEnd < 0 || data[zero + 2] !== 0) throw new Error('Malformed PNG text');
              const body = data.subarray(translatedEnd + 1);
              text = compressed ? decoder.decode(await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()) : decoder.decode(body);
            }
            add(`PNG ${key}`, text);
          } catch { /* Bad optional metadata is not a visual description. */ }
        }
      }
      at = end + 4;
    }
  } else if (['jpg', 'jpeg'].includes(extension)) {
    for (let at = 2; at + 4 <= bytes.length;) {
      if (bytes[at] !== 255) break;
      const marker = bytes[at + 1]; if ([0xda, 0xd9].includes(marker)) break;
      const size = (bytes[at + 2] << 8) | bytes[at + 3], end = at + 2 + size;
      if (size < 2 || end > bytes.length) break;
      const segment = bytes.subarray(at + 4, end);
      if (marker === 0xe1 && decoder.decode(segment.subarray(0, 6)) === 'Exif\0\0') {
        try {
          const tiff = segment.subarray(6), view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength), little = tiff[0] === 73;
          if (!(little && tiff[1] === 73 || tiff[0] === 77 && tiff[1] === 77) || view.getUint16(2, little) !== 42) throw new Error('Invalid TIFF');
          const offset = view.getUint32(4, little), count = view.getUint16(offset, little);
          for (let i = 0; i < count; i++) {
            const entry = offset + 2 + i * 12;
            if (view.getUint16(entry, little) === 0x010e && view.getUint16(entry + 2, little) === 2) {
              const length = view.getUint32(entry + 4, little), start = length <= 4 ? entry + 8 : view.getUint32(entry + 8, little);
              if (start + length <= tiff.length) add('EXIF ImageDescription', decoder.decode(tiff.subarray(start, start + length)));
            }
          }
        } catch { /* Ignore malformed optional metadata. */ }
      }
      if (marker === 0xe1) {
        const packet = decoder.decode(segment), xmpStart = packet.indexOf('<x:xmpmeta'), xmpEnd = packet.lastIndexOf('</x:xmpmeta>');
        if (xmpStart >= 0 && xmpEnd > xmpStart && !/<!DOCTYPE|<!ENTITY/i.test(packet)) {
          const doc = new DOMParser().parseFromString(packet.slice(xmpStart, xmpEnd + 12), 'application/xml');
          if (!doc.getElementsByTagName('parsererror').length) {
            for (const field of ['description', 'title']) {
              for (const item of doc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', field)) add(`XMP ${field}`, item.textContent);
            }
          }
        }
      }
      at = end;
    }
  }
  return values;
}
export function candidateDescription(metadata) { return metadata.map(value => `${value.label}: ${value.text}`).join('\n'); }
