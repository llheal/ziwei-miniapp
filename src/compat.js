// 相性診断（エンターテインメント）。命宮の主星タイプと五行局の関係から算出する。

export const TYPES = {
  leader: { label: 'リーダー型', stars: ['紫微', '天府', '太陽', '武曲'] },
  action: { label: '行動・変革型', stars: ['七殺', '破軍', '貪狼', '廉貞'] },
  thinker: { label: '知性・調整型', stars: ['天機', '巨門', '天相', '天梁'] },
  heart: { label: '感性・癒し型', stars: ['天同', '太陰'] },
};

export function typeOf(chart) {
  const main = chart.soul.majorStars[0]?.name;
  for (const [key, t] of Object.entries(TYPES)) {
    if (t.stars.includes(main)) return key;
  }
  return 'thinker';
}

const PAIRS = {
  'leader|leader': { base: 78, text: 'お互いに頼れる存在同士。主導権を交代で持つルールを決めると、最強のパートナーになります。' },
  'action|leader': { base: 84, text: '行動力と統率力の組み合わせ。一方が道を切り開き、もう一方がまとめる、目標達成に強いペアです。' },
  'leader|thinker': { base: 90, text: '決める人と考える人。役割分担が自然にできる、とてもバランスの良い関係です。' },
  'heart|leader': { base: 88, text: '頼もしさと優しさが補い合う関係。感謝の言葉をこまめに伝えると、さらに絆が深まります。' },
  'action|action': { base: 76, text: 'エネルギーあふれる刺激的な関係。同じ目標に向かうと、驚くほどの推進力を生みます。' },
  'action|thinker': { base: 82, text: '勢いと戦略の組み合わせ。アイデアを形にするスピードが抜群のコンビです。' },
  'action|heart': { base: 86, text: '情熱と安らぎのペア。一緒にいると、お互いにないものを自然と学び合えます。' },
  'thinker|thinker': { base: 80, text: '会話が尽きない知的な関係。話し合いで何でも乗り越えられる、信頼のペアです。' },
  'heart|thinker': { base: 89, text: '理解と共感で結ばれる関係。お互いの気持ちを察し合える、穏やかで心地よいペアです。' },
  'heart|heart': { base: 85, text: '一緒にいるだけで癒される関係。二人の時間を大切にするほど、幸せが増えていきます。' },
};

// 五行の相生：木→火→土→金→水→木
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

function elementRelation(a, b) {
  if (!a || !b) return { bonus: 3, text: '' };
  if (a === b) return { bonus: 4, text: `二人とも「${a}」の気質。価値観が近く、安心感のある関係です。` };
  if (GENERATES[a] === b || GENERATES[b] === a) {
    return { bonus: 7, text: `「${a}」と「${b}」は互いを育てる相生の関係。一緒にいるほど運気が高まります。` };
  }
  return { bonus: 2, text: `「${a}」と「${b}」は個性の違いが刺激になる関係。違いを楽しむ気持ちが鍵です。` };
}

export function compatibility(chartA, chartB) {
  const ta = typeOf(chartA);
  const tb = typeOf(chartB);
  const key = [ta, tb].sort().join('|');
  const pair = PAIRS[key] || { base: 80, text: '' };
  const rel = elementRelation(chartA.element, chartB.element);
  const score = Math.min(98, pair.base + rel.bonus);
  return {
    score,
    typeA: TYPES[ta].label,
    typeB: TYPES[tb].label,
    text: pair.text,
    elementText: rel.text,
  };
}
