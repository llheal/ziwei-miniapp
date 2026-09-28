import { astro } from 'iztro';

// 時辰の選択肢（iztro の timeIndex に対応）
export const TIME_OPTIONS = [
  { index: 0, label: '0:00〜0:59（早子）' },
  { index: 1, label: '1:00〜2:59（丑）' },
  { index: 2, label: '3:00〜4:59（寅）' },
  { index: 3, label: '5:00〜6:59（卯）' },
  { index: 4, label: '7:00〜8:59（辰）' },
  { index: 5, label: '9:00〜10:59（巳）' },
  { index: 6, label: '11:00〜12:59（午）' },
  { index: 7, label: '13:00〜14:59（未）' },
  { index: 8, label: '15:00〜16:59（申）' },
  { index: 9, label: '17:00〜18:59（酉）' },
  { index: 10, label: '19:00〜20:59（戌）' },
  { index: 11, label: '21:00〜22:59（亥）' },
  { index: 12, label: '23:00〜23:59（晩子）' },
];

// 出生時刻が不明な場合は正午（午の刻）で計算する
export const UNKNOWN_TIME_INDEX = 6;

const PALACE_ORDER = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];

function simplifyPalace(p) {
  const majorStars = p.majorStars.map((s) => ({ name: s.name, brightness: s.brightness || '', mutagen: s.mutagen || '' }));
  return {
    index: p.index,
    name: p.name,
    stem: p.heavenlyStem,
    branch: p.earthlyBranch,
    majorStars,
    ownMajorStars: majorStars, // 借星する前の本来の主星（格局・運勢の判定用）
    minorStars: p.minorStars.map((s) => ({ name: s.name, brightness: s.brightness || '', mutagen: s.mutagen || '' })),
    isBody: Boolean(p.isBodyPalace),
    decadal: { range: p.decadal?.range || [0, 0], stem: p.decadal?.heavenlyStem || '' },
    borrowed: false,
  };
}

/**
 * 命盤を作成する。主星のない宮は対宮（6つ先の宮）の主星を借りる（借星安宮）。
 * @param {{date: string, timeIndex: number, gender: '男'|'女'}} input
 */
export function buildChart({ date, timeIndex, gender }) {
  const a = astro.bySolar(date, timeIndex, gender, true, 'ja-JP');
  const palaces = a.palaces.map(simplifyPalace);

  const byIndex = new Map(palaces.map((p) => [p.index, p]));
  for (const p of palaces) {
    if (p.majorStars.length === 0) {
      const opposite = byIndex.get((p.index + 6) % 12);
      if (opposite && opposite.majorStars.length > 0) {
        p.majorStars = opposite.majorStars.map((s) => ({ ...s }));
        p.borrowed = true;
      }
    }
  }

  const find = (name) => palaces.find((p) => p.name === name);
  const element = (a.fiveElementsClass || '').charAt(0); // 例: 「土の五局」→「土」

  const chart = {
    solarDate: a.solarDate,
    lunarDate: a.lunarDate,
    chineseDate: a.chineseDate,
    time: a.time,
    timeRange: a.timeRange,
    zodiac: a.zodiac,
    sign: a.sign,
    fiveElementsClass: a.fiveElementsClass,
    element,
    soulStar: a.soul,
    bodyStar: a.body,
    birthYear: Number(String(date).slice(0, 4)),
    palaces,
    body: palaces.find((p) => p.isBody) || find('命宮'),
    soul: find('命宮'),
    spouse: find('夫妻'),
    career: find('官祿'),
    wealth: find('財帛'),
    order: PALACE_ORDER,
  };
  // 流月・流日の算出に iztro の命盤オブジェクトを使う（列挙しないので保存・比較の対象外）
  Object.defineProperty(chart, 'astrolabe', { value: a, enumerable: false });
  return chart;
}
