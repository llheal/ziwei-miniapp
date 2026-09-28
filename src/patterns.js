// 紫微斗数の格局判定と「人生の総合鑑定」。命宮と三方四正（命宮・財帛・官祿・遷移）の星の組み合わせから判定する。
// 方針：吉格を中心に紹介し、不安をあおる凶格の表現は用いない。
import { STARS, PALACE_THEMES } from './readings.js';
import { ELEMENT_CLASS } from './star-texts.js';
import { decadalFortunes } from './fortune.js';
import { TYPES, typeOf } from './compat.js';

const names = (p) => (p ? [...p.ownMajorStars, ...p.minorStars].map((s) => s.name) : []);
const has = (p, star) => names(p).includes(star);
const hasMutagen = (p, kind) => (p ? [...p.ownMajorStars, ...p.minorStars].some((s) => s.mutagen === kind) : false);

function context(chart) {
  const byIndex = new Map(chart.palaces.map((p) => [p.index, p]));
  const soul = chart.soul;
  const at = (offset) => byIndex.get((((soul.index + offset) % 12) + 12) % 12);
  const zone = [0, 4, 8, 6].map(at); // 命宮・三合・対宮
  const byBranch = (b) => chart.palaces.find((p) => p.branch === b);
  return {
    soul, at, zone, byBranch,
    soulHas: (...stars) => stars.every((s) => has(soul, s)),
    inZone: (star) => zone.some((p) => has(p, star)),
    zoneMutagen: (kind) => zone.some((p) => hasMutagen(p, kind)),
    soulBranch: (...bs) => bs.includes(soul.branch),
  };
}

const PATTERNS = [
  { name: '紫府同宮格', test: (c) => c.soulHas('紫微', '天府'),
    text: '帝王の星と財庫の星が同じ宮に並ぶ格。器が大きく、人をまとめながら豊かさを築いていく人生です。' },
  { name: '君臣慶会格', test: (c) => c.soulHas('紫微') && c.inZone('左輔') && c.inZone('右弼'),
    text: '王の星を補佐の星が支える格。良き協力者に恵まれ、組織の中心で力を発揮します。' },
  { name: '紫府朝垣格', test: (c) => !c.soulHas('紫微', '天府') && c.inZone('紫微') && c.inZone('天府'),
    text: '紫微と天府が命宮を見守る格。安定感と品格を備え、着実に地位を高めていきます。' },
  { name: '極向離明格', test: (c) => c.soulHas('紫微') && c.soulBranch('午'),
    text: '帝王の星が最も明るい南に座す格。気品と統率力に恵まれ、人の上に立つ運を持ちます。' },
  { name: '殺破狼格', test: (c) => ['七殺', '破軍', '貪狼'].some((s) => c.soulHas(s)),
    text: '変化と挑戦の星が命宮に集まる格。人生の転機が多く、動くほど運を切り開く開拓者タイプです。' },
  { name: '七殺朝斗格', test: (c) => c.soulHas('七殺') && c.soulBranch('寅', '申', '子', '午'),
    text: '将軍の星が帝王の星に向き合う格。困難を突破し、自らの力で地位を築く実力派の人生です。' },
  { name: '英星入廟格', test: (c) => c.soulHas('破軍') && c.soulBranch('子', '午'),
    text: '変革の星が最も輝く位置にある格。逆境を力に変え、新しい時代を切り開くリーダーの素質があります。' },
  { name: '雄宿朝元格', test: (c) => c.soulHas('廉貞') && c.soulBranch('寅', '申'),
    text: '情熱の星が本来の力を発揮する格。こだわりと実行力で、専門分野の第一人者を目指せます。' },
  { name: '機月同梁格', test: (c) => ['天機', '太陰', '天同', '天梁'].some((s) => c.soulHas(s)) && ['天機', '太陰', '天同', '天梁'].filter((s) => c.inZone(s)).length >= 3,
    text: '知恵と優しさの星がそろう格。組織や専門分野で信頼を積み重ね、安定した人生を築きます。' },
  { name: '府相朝垣格', test: (c) => c.inZone('天府') && c.inZone('天相'),
    text: '財庫と調整の星が命宮を守る格。衣食に恵まれ、人の縁に支えられる安定型の人生です。' },
  { name: '日月並明格', test: (c) => ['太陽', '太陰'].every((s) => c.zone.some((p) => p.ownMajorStars.some((m) => m.name === s && ['廟', '旺'].includes(m.brightness)))),
    text: '太陽と月が明るく輝く格。表でも裏でも力を発揮でき、名声と人望に恵まれます。' },
  { name: '陽梁昌祿格', test: (c) => c.inZone('太陽') && c.inZone('天梁') && c.inZone('文昌') && (c.inZone('祿存') || c.zoneMutagen('祿')),
    text: '学問と名誉の格。試験・資格・専門性で頭角を現し、社会的な評価を得やすい人生です。' },
  { name: '日照雷門格', test: (c) => c.soulHas('太陽') && c.soulBranch('卯'),
    text: '朝日が昇るように運が伸びていく格。若いうちから才能を発揮し、名声を得やすい人生です。' },
  { name: '金燦光輝格', test: (c) => c.soulHas('太陽') && c.soulBranch('午'),
    text: '真昼の太陽が輝く格。明るく堂々としたエネルギーで、多くの人を照らします。' },
  { name: '月朗天門格', test: (c) => c.soulHas('太陰') && c.soulBranch('亥'),
    text: '夜空に満月が輝く格。穏やかな魅力と感性で人を惹きつけ、財にも恵まれやすい人生です。' },
  { name: '月生滄海格', test: (c) => c.soulHas('太陰', '天同') && c.soulBranch('子'),
    text: '静かな海に月が映る格。清らかな感性と品のある魅力で、周りに癒しを与えます。' },
  { name: '明珠出海格', test: (c) => c.soulBranch('未') && c.soul.ownMajorStars.length === 0 && has(c.byBranch('卯'), '太陽') && has(c.byBranch('亥'), '太陰'),
    text: '太陽と月に照らされる明珠の格。人の縁と環境に恵まれ、遅咲きでも大きく輝きます。' },
  { name: '石中隠玉格', test: (c) => c.soulHas('巨門') && c.soulBranch('子', '午'),
    text: '石の中に宝玉を秘めた格。若い頃は実力が見えにくくても、年齢とともに才能が光り輝きます。' },
  { name: '巨日同宮格', test: (c) => c.soulHas('巨門', '太陽'),
    text: '言葉と光の星が並ぶ格。発信力と説得力で、多くの人に影響を与える人生です。' },
  { name: '機梁加会格', test: (c) => c.soulHas('天機', '天梁'),
    text: '知恵と守護の星が並ぶ格。参謀や専門家として重用され、人を導く立場で輝きます。' },
  { name: '武貪同行格', test: (c) => c.soulHas('武曲', '貪狼'),
    text: '財と多才の星が並ぶ格。若い頃の努力が実を結び、中年以降に大きく財を成しやすい大器晩成型です。' },
  { name: '火貪格', test: (c) => c.zone.some((p) => has(p, '貪狼') && (has(p, '火星') || has(p, '鈴星'))),
    text: '爆発的な幸運をもたらす格。チャンスの波に乗ると一気に飛躍する可能性を秘めています。' },
  { name: '文桂文華格', test: (c) => c.soulHas('文昌', '文曲'),
    text: '学問と芸術の星が命宮に並ぶ格。知性と感性を兼ね備え、才能で人生を切り開きます。' },
  { name: '左右夾命格', test: (c) => (has(c.at(1), '左輔') && has(c.at(-1), '右弼')) || (has(c.at(-1), '左輔') && has(c.at(1), '右弼')),
    text: '補佐の星に両側から守られる格。人の助けに恵まれ、困ったときも必ず支えが現れます。' },
  { name: '昌曲夾命格', test: (c) => (has(c.at(1), '文昌') && has(c.at(-1), '文曲')) || (has(c.at(-1), '文昌') && has(c.at(1), '文曲')),
    text: '学問と芸術の星に挟まれる格。知性と表現力に恵まれ、文化的な分野で活躍できます。' },
  { name: '魁鉞拱命格', test: (c) => c.inZone('天魁') && c.inZone('天鉞'),
    text: '貴人の星に守られる格。目上の人や思わぬ人からの引き立てで道が開けます。' },
  { name: '祿馬交馳格', test: (c) => c.zone.some((p) => has(p, '天馬') && (has(p, '祿存') || hasMutagen(p, '祿'))),
    text: '財と移動の星が出会う格。動くほど財が生まれ、活動範囲が広いほど豊かになります。' },
  { name: '三奇加会格', test: (c) => c.zoneMutagen('祿') && c.zoneMutagen('權') && c.zoneMutagen('科'),
    text: '祿・權・科の三つの吉化が集まる格。財・力・名誉のすべてに恵まれる、とても恵まれた配置です。' },
  { name: '権祿巡逢格', test: (c) => c.zoneMutagen('祿') && c.zoneMutagen('權') && !c.zoneMutagen('科'),
    text: '財と権力の吉化がそろう格。実力が正当に評価され、豊かさにつながります。' },
];

/** 命盤に見られる格局 [{name, text}] */
export function detectPatterns(chart) {
  const c = context(chart);
  // 多くの命盤に見られる格局は後ろに回し、珍しい格局を先に紹介する
  const COMMON = ['府相朝垣格', '殺破狼格', '紫府朝垣格', '機月同梁格', '魁鉞拱命格'];
  const found = PATTERNS.filter((p) => {
    try { return p.test(c); } catch { return false; }
  })
    .map(({ name, text }) => ({ name, text }))
    .sort((a, b) => COMMON.indexOf(a.name) - COMMON.indexOf(b.name));
  if (found.length === 0) {
    const stars = chart.soul.majorStars.map((s) => s.name);
    const lead = stars.join('・') || '無主星';
    found.push({
      name: `${lead}坐命`,
      text: stars.length
        ? `命宮に${lead}が座る命盤。${STARS[stars[0]]?.keywords || ''}を軸に、自分らしい道を築いていく人生です。`
        : '命宮に主星を持たない柔軟な命盤。環境や出会いによって多彩な才能が引き出される人生です。',
    });
  }
  return found;
}

const TYPE_NOUN = { leader: '統率者', action: '開拓者', thinker: '軍師', heart: '癒し人' };

/** 人生の総合鑑定 */
export function lifeOverview(chart) {
  const patterns = detectPatterns(chart);
  const decades = decadalFortunes(chart).filter((d) => d.start <= 85);
  const active = decades.filter((d) => d.start <= 64); // 人生の主な活動期で山と谷を判断する
  const peak = active.reduce((a, b) => (b.score > a.score ? b : a), active[0]);
  const low = active.reduce((a, b) => (b.score < a.score ? b : a), active[0]);
  const type = typeOf(chart);
  const timing = peak.start <= 24 ? '若くして輝く' : peak.start <= 44 ? '働き盛りに花開く' : '大器晩成の';
  const title = `${timing}${TYPE_NOUN[type]}`;

  const soulStars = chart.soul.majorStars.map((s) => s.name);
  const keywords = soulStars.map((n) => STARS[n]?.keywords).filter(Boolean).join('・');
  const bodyTheme = PALACE_THEMES[chart.body.name] || '';
  const bodyText = chart.body.name === '命宮'
    ? '身宮が命宮と重なっているため、生まれ持った性格を一生まっすぐ貫くタイプです。'
    : `身宮は${chart.body.name}宮にあり、人生の後半にかけて「${bodyTheme}」がより大切なテーマになります。`;

  const paragraphs = [
    `あなたは命宮に${soulStars.join('・') || '主星を持たない柔軟な配置'}を持つ${TYPES[type].label}。${keywords ? `「${keywords}」が人生を貫くキーワードです。` : ''}`,
    `命盤には${patterns.map((p) => `「${p.name}」`).join('')}が見られます。${patterns[0].text}`,
    `運気の流れを見ると、${peak.start}〜${peak.end}歳ごろ（数え年）が人生の大きな飛躍期。${peak.theme}が活躍の舞台になります。${low !== peak ? `${low.start}〜${low.end}歳ごろは力をためる準備期で、ここで整えた土台が次の飛躍を支えます。` : ''}`,
    `${chart.fiveElementsClass}の人は、${ELEMENT_CLASS[chart.element] || ''}${bodyText}`,
    `生まれ年の陰陽と性別から見ると、あなたは「${chart.yinYang.label}」で、大限は${chart.yinYang.forward ? '順行' : '逆行'}します。命宮との関係は「${chart.yinYang.harmony ? '陰陽順理' : '陰陽反背'}」で、${chart.yinYang.harmony ? '生まれ持った気質を素直に生かすほど運が開けます。' : '経験を重ねるほど実力が磨かれていく、後半に強い人生です。'}`,
  ];
  return { title, patterns, paragraphs, peak, decades };
}
