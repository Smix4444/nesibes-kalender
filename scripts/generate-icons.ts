/**
 * Genereert alle PWA-iconen uit één SVG-bron met sharp.
 *   npm run icons
 * Het app-icoon is een çiğköfte (rood ovaal met vingerafdruk-ribbels) met een
 * klein kalendertje ernaast.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

/** Het çiğköfte-vormpje met ribbels, los herbruikbaar. */
function kofte(scale = 1): string {
  return `
  <g transform="translate(256 234) rotate(-24) scale(${scale})">
    <ellipse rx="120" ry="80" fill="url(#kofte)"/>
    <g stroke="#7A2516" stroke-opacity="0.45" stroke-width="13" stroke-linecap="round" fill="none">
      <path d="M-68 -48 C -54 -2 -54 10 -68 52"/>
      <path d="M-23 -64 C -9 -8 -9 6 -23 66"/>
      <path d="M23 -64 C 37 -8 37 6 23 66"/>
      <path d="M68 -48 C 82 -2 82 10 68 52"/>
    </g>
    <ellipse rx="120" ry="80" fill="none" stroke="#5E1A10" stroke-opacity="0.3" stroke-width="9"/>
  </g>`;
}

/** Het kalendertje rechtsonder. */
function calendar(): string {
  return `
  <g transform="translate(322 322)">
    <rect x="0" y="0" width="134" height="126" rx="24" fill="#FFFFFF" stroke="#0C1E45" stroke-width="9"/>
    <path d="M0 24 a24 24 0 0 1 24 -24 h86 a24 24 0 0 1 24 24 v16 h-134 z" fill="#12306B"/>
    <circle cx="36" cy="70" r="10" fill="#12306B"/>
    <circle cx="67" cy="70" r="10" fill="#12306B"/>
    <circle cx="98" cy="70" r="10" fill="#12306B"/>
    <circle cx="36" cy="100" r="10" fill="#12306B"/>
    <circle cx="67" cy="100" r="10" fill="#F0863C"/>
  </g>`;
}

function appIcon({ maskable = false }: { maskable?: boolean } = {}): string {
  // Maskable iconen worden door Android rond geknipt: hou de inhoud binnen de
  // veilige zone (±80%) door iets kleiner te schalen.
  const inner = maskable
    ? `<g transform="translate(256 256) scale(0.74) translate(-256 -256)">${kofte()}${calendar()}</g>`
    : `${kofte()}${calendar()}`;

  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1B4A9E"/>
      <stop offset="1" stop-color="#0C1E45"/>
    </linearGradient>
    <linearGradient id="kofte" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#F0863C"/>
      <stop offset="1" stop-color="#C0442A"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#bg)"/>
  ${inner}
</svg>`;
}

/** Android-badge: wit silhouet op transparant, wordt gemaskeerd getoond. */
function badgeIcon(): string {
  return `<svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(36 36) rotate(-24)">
    <ellipse rx="30" ry="20" fill="#FFFFFF"/>
    <g stroke="#000000" stroke-opacity="0" stroke-width="0" fill="none"/>
  </g>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const main512 = Buffer.from(appIcon());
  const maskable512 = Buffer.from(appIcon({ maskable: true }));

  const targets: Array<{ file: string; svg: Buffer; size: number; flatten?: boolean }> = [
    { file: "icon-192.png", svg: main512, size: 192 },
    { file: "icon-512.png", svg: main512, size: 512 },
    { file: "maskable-512.png", svg: maskable512, size: 512 },
    { file: "apple-touch-icon.png", svg: main512, size: 180, flatten: true },
    { file: "badge-72.png", svg: Buffer.from(badgeIcon()), size: 72 },
  ];

  for (const target of targets) {
    let pipeline = sharp(target.svg, { density: 384 }).resize(target.size, target.size);
    // Apple negeert transparantie niet netjes op het beginscherm -> dichte achtergrond.
    if (target.flatten) pipeline = pipeline.flatten({ background: "#12306B" });
    const buffer = await pipeline.png().toBuffer();
    await writeFile(path.join(OUT_DIR, target.file), buffer);
    console.log(`✅ ${target.file} (${target.size}x${target.size}, ${buffer.length} bytes)`);
  }

  // De SVG-bron zelf blijft bewaard, handig als favicon en om later te tweaken.
  await writeFile(path.join(OUT_DIR, "icon.svg"), appIcon());
  console.log("✅ icon.svg");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
