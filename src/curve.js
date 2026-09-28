// 運勢曲線（SVG の折れ線グラフ）。外部ライブラリを使わずに描画する。

/** 点列を通るなめらかな曲線（Catmull-Rom → ベジェ） */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * @param {{label: string, score: number}[]} points
 * @param {{current?: number, peak?: number, id: string}} opts current: 「今」の点、peak: ★を付ける点（省略時は最高点）
 */
export function lineChart(points, { current = -1, peak: peakIndex, id }) {
  const W = 340;
  const H = 190;
  const padL = 26;
  const padR = 14;
  const padT = 22;
  const padB = 30;
  const n = points.length;
  const x = (i) => padL + (n === 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const y = (s) => padT + ((100 - s) / 100) * (H - padT - padB);
  const pts = points.map((p, i) => [x(i), y(p.score)]);
  const line = smoothPath(pts);
  const area = `${line} L${pts[n - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z`;
  const peak = peakIndex ?? points.reduce((a, p, i) => (p.score > points[a].score ? i : a), 0);

  const grid = [20, 40, 60, 80]
    .map((v) => `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="cv-grid"/><text x="${padL - 6}" y="${y(v) + 3}" class="cv-axis" text-anchor="end">${v}</text>`)
    .join('');
  const labels = points
    .map((p, i) => (n <= 12 || i % 2 === 0 ? `<text x="${x(i)}" y="${H - 10}" class="cv-axis" text-anchor="middle">${p.label}</text>` : ''))
    .join('');
  const dots = pts
    .map(([px, py], i) => {
      if (i === current) {
        return `<circle cx="${px}" cy="${py}" r="6" class="cv-now"/><text x="${px}" y="${py - 11}" class="cv-now-label" text-anchor="middle">今</text>`;
      }
      if (i === peak) {
        return `<circle cx="${px}" cy="${py}" r="4.5" class="cv-peak"/><text x="${px}" y="${py - 9}" class="cv-peak-label" text-anchor="middle">★</text>`;
      }
      return `<circle cx="${px}" cy="${py}" r="3" class="cv-dot"/>`;
    })
    .join('');

  return `<svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="運勢の推移グラフ">
    <defs><linearGradient id="${id}-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#7b5cf0" stop-opacity="0.35"/><stop offset="1" stop-color="#7b5cf0" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#${id}-fill)"/>
    <path d="${line}" class="cv-line"/>
    ${dots}
    ${labels}
  </svg>`;
}
