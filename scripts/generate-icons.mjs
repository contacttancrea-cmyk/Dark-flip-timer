import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#16161A"/>
      <stop offset="100%" stop-color="#09090B"/>
    </linearGradient>
    <linearGradient id="topFlap" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#24242B"/>
      <stop offset="100%" stop-color="#19191F"/>
    </linearGradient>
    <linearGradient id="botFlap" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#15151A"/>
      <stop offset="100%" stop-color="#1E1E24"/>
    </linearGradient>
  </defs>
  <!-- Outer Windows Icon Squircle Housing -->
  <rect x="8" y="8" width="240" height="240" rx="52" fill="url(#bgGrad)" stroke="#2E2E38" stroke-width="4"/>
  <!-- Inner Recessed Bezel -->
  <rect x="24" y="28" width="208" height="200" rx="34" fill="#0B0B0E" stroke="#1E1E26" stroke-width="2"/>
  <!-- Left Split-Flap Tile -->
  <rect x="36" y="42" width="86" height="82" rx="14" fill="url(#topFlap)" stroke="#2F2F3B" stroke-width="1.5"/>
  <rect x="36" y="130" width="86" height="82" rx="14" fill="url(#botFlap)" stroke="#252530" stroke-width="1.5"/>
  <!-- Right Split-Flap Tile -->
  <rect x="134" y="42" width="86" height="82" rx="14" fill="url(#topFlap)" stroke="#2F2F3B" stroke-width="1.5"/>
  <rect x="134" y="130" width="86" height="82" rx="14" fill="url(#botFlap)" stroke="#252530" stroke-width="1.5"/>
  <!-- Bold White Numerals "25" -->
  <g fill="#F4F4F6" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, monospace" font-weight="800" font-size="96" text-anchor="middle">
    <text x="79" y="160">2</text>
    <text x="177" y="160">5</text>
  </g>
  <!-- Center Split Gap & Mechanical Hinges -->
  <rect x="32" y="123" width="192" height="6" fill="#08080A"/>
  <rect x="34" y="119" width="6" height="14" rx="2" fill="#525263"/>
  <rect x="118" y="119" width="6" height="14" rx="2" fill="#525263"/>
  <rect x="132" y="119" width="6" height="14" rx="2" fill="#525263"/>
  <rect x="216" y="119" width="6" height="14" rx="2" fill="#525263"/>
  <!-- Subtle Top Amber Precision Indicator -->
  <circle cx="128" cy="28" r="4" fill="#F59E0B"/>
</svg>
`;

// CRC32 implementation for valid PNG chunk creation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// 5x7 bitmap font for crisp numerals "2" and "5" inside the split-flap icon
const DIGIT_2 = [
  '01110',
  '11011',
  '00011',
  '00110',
  '01100',
  '11000',
  '11111',
];

const DIGIT_5 = [
  '11111',
  '11000',
  '11110',
  '00011',
  '00011',
  '11011',
  '01110',
];

function sampleDigit(bitmap, u, v) {
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
  const col = Math.min(4, Math.floor(u * 5));
  const row = Math.min(6, Math.floor(v * 7));
  return bitmap[row][col] === '1';
}

function insideRoundedRect(x, y, rx, ry, rw, rh, radius) {
  if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false;
  const cx = Math.max(rx + radius, Math.min(x, rx + rw - radius));
  const cy = Math.max(ry + radius, Math.min(y, ry + rh - radius));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function renderIconPng(size) {
  const rawData = Buffer.alloc(size * (size * 4 + 1));

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 4 + 1);
    rawData[rowOffset] = 0; // filter type 0 (None)

    // Normalized coordinates [0..256)
    const ny = (y + 0.5) * (256 / size);

    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) * (256 / size);
      const pxOffset = rowOffset + 1 + x * 4;

      // Outer squircle [8, 8, 240, 240], radius 48
      if (!insideRoundedRect(nx, ny, 8, 8, 240, 240, 48)) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Base housing gradient (#16161B to #0A0A0D)
      const gradT = ny / 256;
      let r = Math.round(22 * (1 - gradT) + 10 * gradT);
      let g = Math.round(22 * (1 - gradT) + 10 * gradT);
      let b = Math.round(27 * (1 - gradT) + 13 * gradT);

      // Outer border highlight
      if (!insideRoundedRect(nx, ny, 12, 12, 232, 232, 44)) {
        r = 46;
        g = 46;
        b = 56;
      }

      // Inner recessed chamber
      if (insideRoundedRect(nx, ny, 24, 28, 208, 200, 30)) {
        r = 11;
        g = 11;
        b = 14;
      }

      // Left & right flip cards
      const inLeftCard = insideRoundedRect(nx, ny, 36, 42, 86, 170, 14);
      const inRightCard = insideRoundedRect(nx, ny, 134, 42, 86, 170, 14);

      if (inLeftCard || inRightCard) {
        const isTopHalf = ny < 127;
        if (isTopHalf) {
          r = 32;
          g = 32;
          b = 39;
        } else {
          r = 23;
          g = 23;
          b = 29;
        }

        // Subtle card rim highlight
        const cardX = inLeftCard ? 36 : 134;
        if (!insideRoundedRect(nx, ny, cardX + 2, 44, 82, 166, 12)) {
          r = 48;
          g = 48;
          b = 58;
        }

        // Digit rendering ("2" on left card, "5" on right card)
        const du = (nx - (cardX + 16)) / 54;
        const dv = (ny - 72) / 110;
        const isDigitLit = inLeftCard
          ? sampleDigit(DIGIT_2, du, dv)
          : sampleDigit(DIGIT_5, du, dv);

        if (isDigitLit) {
          r = isTopHalf ? 244 : 230;
          g = isTopHalf ? 244 : 230;
          b = isTopHalf ? 246 : 234;
        }
      }

      // Horizontal split-flap gap across the center (ny between 124 and 130)
      if (ny >= 124 && ny <= 130 && nx >= 32 && nx <= 224) {
        r = 8;
        g = 8;
        b = 10;
      }

      // Mechanical hinge notches on card edges
      const isHingeX =
        (nx >= 34 && nx <= 40) ||
        (nx >= 118 && nx <= 124) ||
        (nx >= 132 && nx <= 138) ||
        (nx >= 216 && nx <= 222);
      if (isHingeX && ny >= 119 && ny <= 135) {
        r = 92;
        g = 92;
        b = 108;
      }

      // Top amber precision indicator dot at (128, 22)
      const dxDot = nx - 128;
      const dyDot = ny - 21;
      if (dxDot * dxDot + dyDot * dyDot <= 20) {
        r = 245;
        g = 158;
        b = 11;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 6; // color type 6 (RGBA)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function buildMultiResIco(pngBuffersWithSizes) {
  const count = pngBuffersWithSizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let dataOffset = 6 + count * 16;

  for (const { size, buffer } of pngBuffersWithSizes) {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size; // width (0 means 256)
    entry[1] = size === 256 ? 0 : size; // height (0 means 256)
    entry[2] = 0; // color palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size of PNG data
    entry.writeUInt32LE(dataOffset, 12); // offset
    dirEntries.push(entry);
    dataOffset += buffer.length;
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffersWithSizes.map((item) => item.buffer),
  ]);
}

const sizes = [16, 32, 48, 64, 128, 256];
const generatedPngs = sizes.map((size) => ({
  size,
  buffer: renderIconPng(size),
}));

const icoBuffer = buildMultiResIco(generatedPngs);
const png256Buffer = generatedPngs.find((p) => p.size === 256).buffer;

for (const dir of ['build', 'public']) {
  const fullDir = path.resolve(process.cwd(), dir);
  fs.mkdirSync(fullDir, { recursive: true });
  fs.writeFileSync(path.join(fullDir, 'icon.svg'), SVG_ICON, 'utf8');
  fs.writeFileSync(path.join(fullDir, 'icon.png'), png256Buffer);
  fs.writeFileSync(path.join(fullDir, 'icon.ico'), icoBuffer);
}

console.log('Generated Dark Flip Timer icons in build/ and public/ (icon.ico, icon.png, icon.svg)');
