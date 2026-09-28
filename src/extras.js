// 星のアイコン・開運アドバイス・運勢バランス（レーダーチャート）など、結果を楽しく見せるための追加コンテンツ。
import { zoneScore } from './fortune.js';

export const STAR_ICONS = {
  紫微: '👑', 天機: '🧠', 太陽: '☀️', 武曲: '💰', 天同: '🍀', 廉貞: '🔥', 天府: '🏛️',
  太陰: '🌙', 貪狼: '🎭', 巨門: '🗣️', 天相: '🤝', 天梁: '🛡️', 七殺: '⚔️', 破軍: '🌪️',
};

// 五行ごとの開運要素
const ELEMENT_LUCK = {
  木: { colors: ['グリーン', 'ミントグリーン', 'オリーブ'], hex: ['#3f9e5a', '#7fcfb0', '#8a9a3c'], direction: '東', numbers: [3, 8], items: ['観葉植物', '木製の小物', 'お気に入りの本', 'ハーブティー'], spot: '緑の多い公園や森' },
  火: { colors: ['レッド', 'コーラルピンク', 'オレンジ'], hex: ['#d9453b', '#f08a7a', '#f0913a'], direction: '南', numbers: [2, 7], items: ['キャンドル', '赤い小物', 'サングラス', 'スパイスの効いた料理'], spot: '日当たりの良いカフェや展望台' },
  土: { colors: ['ベージュ', 'マスタード', 'ブラウン'], hex: ['#c8a97e', '#d4a22a', '#8a5a3c'], direction: '南西', numbers: [5, 10], items: ['陶器のマグ', 'ストール', '天然素材のバッグ', '根菜の料理'], spot: '山や温泉、古い町並み' },
  金: { colors: ['ホワイト', 'ゴールド', 'シルバー'], hex: ['#f4f1ea', '#d4af37', '#b8bcc6'], direction: '西', numbers: [4, 9], items: ['腕時計', 'アクセサリー', '白いハンカチ', '金属製の小物'], spot: '美術館やホテルのラウンジ' },
  水: { colors: ['ネイビー', 'ブルー', 'ブラック'], hex: ['#27406e', '#3a7bd5', '#2b2b35'], direction: '北', numbers: [1, 6], items: ['ガラスの小物', 'ミネラルウォーター', '香水', '青いペン'], spot: '海辺や川沿い、水族館' },
};
// 自分の五行を生かしてくれる五行（生じる側）
const SUPPORTER = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
const STEM_ELEMENT = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };

/** その人の開運アドバイス（五行局から） */
export function luckProfile(chart) {
  const base = ELEMENT_LUCK[SUPPORTER[chart.element]] || ELEMENT_LUCK.土;
  const own = ELEMENT_LUCK[chart.element] || ELEMENT_LUCK.土;
  return {
    element: SUPPORTER[chart.element],
    color: base.colors[0], colorHex: base.hex[0],
    subColor: own.colors[0], subColorHex: own.hex[0],
    direction: base.direction,
    numbers: base.numbers,
    item: base.items[0],
    spot: base.spot,
  };
}

/** 今日のラッキー（日の十干と生年月日から毎日変わる） */
export function dailyLuck(chart, stem, date = new Date()) {
  const dayElement = STEM_ELEMENT[stem] || '土';
  // 日の五行と自分を生かす五行を日替わりで組み合わせる
  const pick = date.getDate() % 2 === 0 ? SUPPORTER[chart.element] : dayElement;
  const luck = ELEMENT_LUCK[pick] || ELEMENT_LUCK.土;
  const seed = date.getFullYear() * 400 + (date.getMonth() + 1) * 31 + date.getDate() + chart.birthYear;
  const i = seed % luck.colors.length;
  return {
    color: luck.colors[i], colorHex: luck.hex[i],
    item: luck.items[seed % luck.items.length],
    number: luck.numbers[seed % 2],
    direction: luck.direction,
  };
}

// 運勢バランス（レーダーチャート）の6分野と対応する宮
const AREAS = [
  ['恋愛', '夫妻'], ['仕事', '官祿'], ['金運', '財帛'], ['人間関係', '僕役'], ['健康', '疾厄'], ['家庭', '田宅'],
];

export function areaScores(chart) {
  return AREAS.map(([label, palace]) => {
    const p = chart.palaces.find((x) => x.name === palace);
    return { label, score: p ? zoneScore(chart, p.index) : 50 };
  });
}

/** 6分野のレーダーチャート（SVG） */
export function radarChart(areas) {
  const S = 260;
  const c = S / 2;
  const R = 88;
  const n = areas.length;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const rings = [0.25, 0.5, 0.75, 1]
    .map((f) => `<polygon class="rd-ring" points="${areas.map((_, i) => pt(i, R * f).join(',')).join(' ')}"/>`).join('');
  const axes = areas.map((_, i) => `<line class="rd-axis" x1="${c}" y1="${c}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}"/>`).join('');
  const shape = areas.map((a, i) => pt(i, (R * a.score) / 100).join(',')).join(' ');
  const dots = areas.map((a, i) => { const [x, y] = pt(i, (R * a.score) / 100); return `<circle class="rd-dot" cx="${x}" cy="${y}" r="3.5"/>`; }).join('');
  const labels = areas.map((a, i) => {
    const [x, y] = pt(i, R + 24);
    return `<text class="rd-label" x="${x}" y="${y - 4}" text-anchor="middle">${a.label}</text><text class="rd-score" x="${x}" y="${y + 10}" text-anchor="middle">${a.score}</text>`;
  }).join('');
  return `<svg class="radar" viewBox="0 0 ${S} ${S}" role="img" aria-label="運勢バランス">${rings}${axes}<polygon class="rd-shape" points="${shape}"/>${dots}${labels}</svg>`;
}
