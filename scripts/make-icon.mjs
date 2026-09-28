// アプリアイコン（紫の星空に金色の「紫」）をSVGからPNGに書き出す
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const stars = [[34,36,2.2],[98,30,1.6],[104,96,2],[30,100,1.4],[82,24,1.2],[46,108,1.1]]
  .map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity="0.85"/>`).join('');
const sparkle = (x, y, r) => {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.32;
    pts.push(`${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#f3d48a"/>`;
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 130 130">
  <defs>
    <radialGradient id="bg" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#7b5cf0"/><stop offset="0.55" stop-color="#3a2585"/><stop offset="1" stop-color="#1d1447"/>
    </radialGradient>
  </defs>
  <rect width="130" height="130" fill="url(#bg)"/>
  ${stars}
  ${sparkle(92, 44, 9)}
  <circle cx="65" cy="67" r="40" fill="none" stroke="#f3d48a" stroke-opacity="0.55" stroke-width="1.2"/>
  <text x="65" y="86" text-anchor="middle" font-family="Yu Mincho, YuMincho, MS Mincho, serif" font-weight="700" font-size="56" fill="#f6e2a8">紫</text>
</svg>`;

for (const size of [130, 512]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: true } }).render().asPng();
  const out = size === 130 ? 'public/icon.png' : `public/icon-${size}.png`;
  writeFileSync(out, png);
  console.log(out, png.length, 'bytes');
}
