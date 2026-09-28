// 大限（10年運）・流年（1年運）の運勢スコアを算出する（エンターテインメント目的の目安）。
// 宮の強さ = 主星の明るさ + 吉星/煞星 + 四化。三方四正（本宮・対宮・三合の2宮）を重み付けして合算する。
import { PALACE_TEXTS, PALACE_TEXTS_FALLBACK, MINOR_STARS } from './star-texts.js';
import { PALACE_THEMES, STARS } from './readings.js';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 十干四化：[化祿, 化權, 化科, 化忌]
export const MUTAGEN_TABLE = {
  甲: ['廉貞', '破軍', '武曲', '太陽'],
  乙: ['天機', '天梁', '紫微', '太陰'],
  丙: ['天同', '天機', '文昌', '廉貞'],
  丁: ['太陰', '天同', '天機', '巨門'],
  戊: ['貪狼', '太陰', '右弼', '天機'],
  己: ['武曲', '貪狼', '天梁', '文曲'],
  庚: ['太陽', '武曲', '太陰', '天同'],
  辛: ['巨門', '太陽', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左輔', '武曲'],
  癸: ['破軍', '巨門', '太陰', '貪狼'],
};
const MUTAGEN_KINDS = ['祿', '權', '科', '忌'];
const MUTAGEN_WEIGHT = { 祿: 8, 權: 5, 科: 4, 忌: -6 };
const MUTAGEN_YEAR_TEXT = {
  祿: 'チャンスや恵みが巡ってきます',
  權: '主導権を握り、力を発揮できます',
  科: '評価や良いご縁に恵まれます',
  忌: 'こだわりが出やすいテーマ。丁寧に向き合うと成長につながります',
};

const BRIGHT_SCORE = { 廟: 9, 旺: 7, 得: 5, 利: 3, 平: 1, 不: -2, 陷: -4 };
const GOOD_MAJOR = new Set(['紫微', '天府', '太陽', '太陰', '天同', '天梁', '武曲', '天相']);
const NATAL_MUTAGEN = { 祿: 4, 權: 3, 科: 3, 忌: -3 };

export function stemBranchOfYear(year) {
  return { stem: STEMS[(((year - 4) % 10) + 10) % 10], branch: BRANCHES[(((year - 4) % 12) + 12) % 12] };
}

function palaceStrength(p) {
  let s = 0;
  const majors = p.ownMajorStars.length ? p.ownMajorStars : p.majorStars;
  const factor = p.ownMajorStars.length ? 1 : 0.6; // 借星は弱めに評価
  for (const m of majors) {
    s += factor * ((BRIGHT_SCORE[m.brightness] ?? 0) + (GOOD_MAJOR.has(m.name) ? 3 : 1));
    if (m.mutagen) s += NATAL_MUTAGEN[m.mutagen] || 0;
  }
  for (const m of p.minorStars) {
    const info = MINOR_STARS[m.name];
    if (info) s += info.good ? 3 : -3;
    if (m.mutagen) s += NATAL_MUTAGEN[m.mutagen] || 0;
  }
  return s;
}

const ZONE = [[0, 1], [6, 0.6], [4, 0.5], [8, 0.5]]; // 本宮・対宮・三合

function starPalaceIndex(chart, starName) {
  const p = chart.palaces.find((x) => x.ownMajorStars.some((s) => s.name === starName) || x.minorStars.some((s) => s.name === starName));
  return p ? p.index : -1;
}

/** 四化の飛び先 [{kind, star, index}] */
export function mutagenLandings(chart, stem) {
  return (MUTAGEN_TABLE[stem] || []).map((star, i) => ({ kind: MUTAGEN_KINDS[i], star, index: starPalaceIndex(chart, star) }));
}

function zoneScore(chart, idx, landings = []) {
  const byIndex = new Map(chart.palaces.map((p) => [p.index, p]));
  let total = 0;
  for (const [offset, w] of ZONE) {
    const p = byIndex.get((idx + offset) % 12);
    if (!p) continue;
    total += w * palaceStrength(p);
    for (const l of landings) if (l.index === p.index) total += w * MUTAGEN_WEIGHT[l.kind];
  }
  // 多数の命盤で計測した分布（中央値≈30, 10〜90%点≈14〜45）を 40〜80点に対応づける
  return Math.round(Math.max(20, Math.min(97, 60 + (total - 30.5) * 1.29)));
}

export function scoreLabel(score) {
  if (score >= 82) return { label: '飛躍期', tone: 'top', note: '大きなチャンスをつかみやすい、勢いのある時期です。' };
  if (score >= 68) return { label: '上昇期', tone: 'up', note: '追い風が吹き、努力が実を結びやすい時期です。' };
  if (score >= 54) return { label: '安定期', tone: 'mid', note: '地に足をつけて着実に前進できる時期です。' };
  if (score >= 40) return { label: '準備期', tone: 'low', note: '力をためて次の飛躍に備える、充電の時期です。' };
  return { label: '内省期', tone: 'low', note: '自分を見つめ直し、土台を整えることで次の運気が開けます。' };
}

const themeOf = (p) => PALACE_THEMES[p.name] || '';
const palaceLabel = (p) => (p.name === '命宮' ? '命宮' : `${p.name}宮`);
const starsOf = (p) => p.majorStars.map((s) => s.name);

/** 大限（10年ごとの運勢）一覧。年齢は数え年。 */
export function decadalFortunes(chart) {
  return [...chart.palaces]
    .filter((p) => p.decadal.range[0] > 0)
    .sort((a, b) => a.decadal.range[0] - b.decadal.range[0])
    .map((p) => {
      const landings = mutagenLandings(chart, p.decadal.stem);
      const score = zoneScore(chart, p.index, landings);
      const [start, end] = p.decadal.range;
      const keys = starsOf(p).map((n) => (STARS[n]?.keywords || '').split('・')[0]).filter(Boolean);
      const lu = landings.find((l) => l.kind === '祿' && l.index >= 0);
      const luPalace = lu ? chart.palaces.find((x) => x.index === lu.index) : null;
      return {
        start, end, palace: palaceLabel(p), theme: themeOf(p), stars: starsOf(p), score, ...scoreLabel(score),
        text: `${themeOf(p)}が人生の中心テーマになる10年。${keys.length ? `「${keys.join('」「')}」の力を生かすと運が開けます。` : '環境の変化を柔軟に取り入れると運が開けます。'}${luPalace ? `${palaceLabel(luPalace)}（${themeOf(luPalace)}）に恵みが巡ります。` : ''}`,
      };
    });
}

/** 指定した年の流年運勢 */
export function yearlyFortune(chart, year, decades = decadalFortunes(chart)) {
  const { stem, branch } = stemBranchOfYear(year);
  const age = year - chart.birthYear + 1; // 数え年
  const p = chart.palaces.find((x) => x.branch === branch);
  const landings = mutagenLandings(chart, stem);
  const decade = decades.find((d) => age >= d.start && age <= d.end);
  const own = zoneScore(chart, p.index, landings);
  const score = Math.round(decade ? own * 0.7 + decade.score * 0.3 : own);
  const lead = p.majorStars[0]?.name;
  const advice = (lead && PALACE_TEXTS[lead]?.year) || PALACE_TEXTS_FALLBACK.year;
  const mutagens = landings.filter((l) => l.index >= 0).map((l) => {
    const target = chart.palaces.find((x) => x.index === l.index);
    return { kind: l.kind, star: l.star, palace: palaceLabel(target), theme: themeOf(target), text: MUTAGEN_YEAR_TEXT[l.kind] };
  });
  const helpers = p.minorStars.filter((m) => MINOR_STARS[m.name]?.good).map((m) => m.name);
  return {
    year, age, stem, branch, palace: palaceLabel(p), theme: themeOf(p), stars: starsOf(p), score, ...scoreLabel(score),
    advice, mutagens, helpers, decade,
  };
}

export function yearlyFortunes(chart, fromYear, count) {
  const decades = decadalFortunes(chart);
  return Array.from({ length: count }, (_, i) => yearlyFortune(chart, fromYear + i, decades));
}
