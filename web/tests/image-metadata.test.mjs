import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { imageDescriptionMetadata } from '../image-metadata.mjs';
import { crc32 } from '../zip.mjs';
function chunk(type, data) { const body = Buffer.concat([Buffer.from(type), data]); const result = Buffer.alloc(data.length + 12); result.writeUInt32BE(data.length, 0); body.copy(result, 4); result.writeUInt32BE(crc32(body), result.length - 4); return result; }
test('PNG description fields are extracted as unreviewed source metadata', async () => {
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('tEXt', Buffer.from('Description\0Authored observable description')), chunk('tEXt', Buffer.from('Software\0Not a description')), chunk('zTXt', Buffer.concat([Buffer.from('Comment\0\0'), deflateSync('Compressed authored text')])), chunk('IEND', Buffer.alloc(0))]);
  const result = await imageDescriptionMetadata(png, 'png'); assert.deepEqual(result.map(r => r.text), ['Authored observable description', 'Compressed authored text']); assert.ok(result.every(r => r.label.startsWith('PNG')));
});
test('JPEG EXIF ImageDescription is extracted; missing metadata stays missing', async () => {
  const text = Buffer.from('Authored camera description\0'), tiff = Buffer.alloc(26 + text.length); tiff.write('II'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4); tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x010e, 10); tiff.writeUInt16LE(2, 12); tiff.writeUInt32LE(text.length, 14); tiff.writeUInt32LE(26, 18); text.copy(tiff, 26);
  const payload = Buffer.concat([Buffer.from('Exif\0\0'), tiff]), marker = Buffer.alloc(4); marker[0]=255;marker[1]=225;marker.writeUInt16BE(payload.length+2,2);
  const jpeg = Buffer.concat([Buffer.from([255,216]),marker,payload,Buffer.from([255,217])]);
  assert.equal((await imageDescriptionMetadata(jpeg, 'jpeg'))[0].text, 'Authored camera description');
  assert.deepEqual(await imageDescriptionMetadata(new Uint8Array([255,216,255,217]), 'jpeg'), []);
});
