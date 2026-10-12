/**
 * Rebuild the raster icons from the schoolhouse drawing in src/app/icon.svg.
 *
 *   node scripts/make-icons.mjs
 *
 * Browsers that take an SVG favicon use icon.svg directly, which also switches
 * to a lighter blue on a dark tab. This writes the two files for everything
 * else: favicon.ico (16, 32 and 48 px) for browsers that do not take SVG, and
 * apple-icon.png (180 px, on white, because iOS fills transparency with black).
 * Rendered with the Chromium that Playwright already installs for the tests.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BLUE = "#1a73e8";
// The same shapes as icon.svg, with the door and windows painted white so they
// stay visible on any tab color (the SVG leaves them as openings instead).
const house = (extra = "") => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" ${extra}>
  <g fill="${BLUE}">
    <path d="M15.2 1h1.6v6h-1.6z"/><path d="M16.8 1l5.7 1.8-5.7 1.8z"/>
    <path d="M16 6l14 10H2z"/><path d="M5 16h22v13H5z"/>
  </g>
  <g fill="#ffffff">
    <path d="M13.5 21h5v8h-5z"/><path d="M7.5 19H11v3.5H7.5z"/><path d="M21 19h3.5v3.5H21z"/>
  </g>
</svg>`;

const browser = await chromium.launch();

async function render(size, html, transparent) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:${transparent ? "transparent" : "#ffffff"}}</style>${html}`,
  );
  const png = await page.screenshot({ omitBackground: transparent, type: "png" });
  await page.close();
  return png;
}

// favicon.ico: an ICO container holding PNG images.
const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) {
  images.push(await render(size, house(`width="${size}" height="${size}"`), true));
}
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((size, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); // width
  entry.writeUInt8(size, 1); // height
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(images[i].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return entry;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...images]));

// apple-icon.png: the house at about two thirds of a white 180 px square.
const apple = await render(
  180,
  `<div style="width:180px;height:180px;display:flex;align-items:center;justify-content:center">${house('width="124" height="124"')}</div>`,
  false,
);
writeFileSync("src/app/apple-icon.png", apple);

await browser.close();
console.log(`favicon.ico (${sizes.join(", ")} px) and apple-icon.png (180 px) written to src/app/`);
