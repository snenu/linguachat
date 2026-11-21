// Generates the favicon, app icons and the README logo from the bubble mark in
// src/lib/brand.ts. Run: node scripts/icons.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BLUE = "#2340C8";
const MARIGOLD = "#F6B73C";
const INK = "#0F1A3D";

const logo = await readFile(new URL("../src/lib/brand.ts", import.meta.url), "utf8");
const A = logo.match(/BUBBLE_A = "([^"]+)"/)[1];
const B = logo.match(/BUBBLE_B = "([^"]+)"/)[1];

const bubbles = (a = BLUE) => `
  <path d="${A}" fill="${a}"/>
  <path d="${B}" fill="${MARIGOLD}"/>
  <clipPath id="a"><path d="${A}"/></clipPath>
  <path d="${B}" fill="${INK}" clip-path="url(#a)"/>`;

/** Rounded blue tile with the mark; `inset` is the share of the tile the mark leaves free. */
const tile = ({ radius = 12, inset = 0.1 } = {}) => {
  const s = 1 - inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="${radius}" fill="${BLUE}"/>
  <g transform="translate(${48 * inset} ${48 * inset}) scale(${s})">${bubbles("#FFFFFF")}</g>
</svg>`;
};

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${bubbles()}</svg>`;

const png = (svg, size) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer();

/** ICO with embedded PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

await mkdir(new URL("../public/icons/", import.meta.url), { recursive: true });
await mkdir(new URL("../docs/", import.meta.url), { recursive: true });

const favicon = tile({ radius: 11, inset: 0.08 });
await writeFile(new URL("../src/app/icon.svg", import.meta.url), favicon);
await writeFile(
  new URL("../src/app/favicon.ico", import.meta.url),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(favicon, size) })))),
);
// iOS masks its own corners, so the apple icon is full-bleed.
await writeFile(new URL("../src/app/apple-icon.png", import.meta.url), await png(tile({ radius: 0, inset: 0.16 }), 180));
await writeFile(new URL("../public/icons/icon-192.png", import.meta.url), await png(tile({ radius: 0, inset: 0.14 }), 192));
await writeFile(new URL("../public/icons/icon-512.png", import.meta.url), await png(tile({ radius: 0, inset: 0.14 }), 512));
// Maskable icons keep the mark inside the 80% safe zone.
await writeFile(new URL("../public/icons/icon-maskable-512.png", import.meta.url), await png(tile({ radius: 0, inset: 0.22 }), 512));
await writeFile(new URL("../docs/logo.svg", import.meta.url), mark);
await writeFile(new URL("../docs/logo-tile.svg", import.meta.url), favicon);
console.log("icons written");
