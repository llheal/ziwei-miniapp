// 相性診断（エンターテインメント）。紫微斗数の複数の観点から二人の縁を読み解く。
//   1. 命宮主星の組み合わせ  2. 夫妻宮と相手の命宮の照合  3. 生年四化の飛び先（飛星四化）
//   4. 五行局の関係（比和・相生・相剋）  5. 生年支の関係（三合・六合・六冲）
import { MUTAGEN_TABLE } from './fortune.js';
import { PALACE_THEMES } from './readings.js';

export const TYPES = {
  leader: { label: 'リーダー型', stars: ['紫微', '天府', '太陽', '武曲'] },
  action: { label: '行動・変革型', stars: ['七殺', '破軍', '貪狼', '廉貞'] },
  thinker: { label: '知性・調整型', stars: ['天機', '巨門', '天相', '天梁'] },
  heart: { label: '感性・癒し型', stars: ['天同', '太陰'] },
};

const typeOfStar = (name) => Object.keys(TYPES).find((k) => TYPES[k].stars.includes(name));

export function typeOf(chart) {
  return typeOfStar(chart.soul.majorStars[0]?.name) || 'thinker';
}

// 命宮主星タイプの組み合わせ（キーはタイプ名の昇順）
const PAIRS = {
  'leader|leader': {
    base: 78, name: '双璧の関係', talk: 72, work: 88,
    essence: 'ともに「帝王」の気質を持つ、格の高い組み合わせです。互いの器の大きさや責任感をひと目で見抜き、深い敬意から関係が始まります。二人が同じ目標を掲げたとき、周囲を巻き込む大きな力を生み出すペアです。',
    strength: '判断が早く、物事を前に進める推進力は抜群。互いに依存しすぎない自立した関係を築けるため、仕事でも家庭でも「頼れる二人」として一目置かれます。',
    caution: 'どちらも主導権を握りたいタイプのため、意見が分かれると譲り合えずに平行線になりがち。相手のプライドを尊重するあまり、本音を言わずに距離ができることもあります。',
    secret: '分野ごとに「決める人」をあらかじめ決めておくこと。相手に任せた後は口を出さない潔さが、二人の信頼を不動のものにします。',
  },
  'action|leader': {
    base: 84, name: '開拓と統率の関係', talk: 76, work: 92,
    essence: '道を切り開く「将軍」の星と、全体をまとめる「帝王」の星の組み合わせ。行動力と統率力が噛み合い、互いに足りない力を補い合える、目標達成に強い関係です。',
    strength: '行動・変革型が新しい流れをつくり、リーダー型がそれを形にして定着させる。変化とチャンスに強く、二人でいると人生のステージが一段ずつ上がっていく実感を得られます。',
    caution: 'スピードを重んじる行動・変革型と、段取りを重んじるリーダー型とでは、物事を進めるペースに差が出やすいもの。「急かされている」「止められている」と感じる場面に注意が必要です。',
    secret: '始める前に「ゴール」と「期限」だけを共有し、進め方は相手に任せること。役割分担が明確になるほど、二人の相乗効果は大きくなります。',
  },
  'leader|thinker': {
    base: 90, name: '君臣相得の関係', talk: 88, work: 95,
    essence: '決断する「君主」と、知恵を授ける「軍師」の組み合わせ。紫微斗数でも理想的とされる配置で、互いの長所を最大限に引き出し合える、非常にバランスの取れた関係です。',
    strength: '知性・調整型の分析力と先見性が、リーダー型の決断に確かな裏づけを与えます。リーダー型は安心して前に進み、知性・調整型は自分の知恵が生かされる喜びを感じられます。',
    caution: '知性・調整型は考えを内に秘めがちなため、リーダー型が「相談なしに決めてしまう」ことがすれ違いの原因に。逆に、慎重すぎる意見が重荷に感じられることもあります。',
    secret: '大切なことを決める前に「どう思う？」と一言たずねる習慣を。知性・調整型は、自分の意見が求められていると感じたときに最も力を発揮します。',
  },
  'heart|leader': {
    base: 88, name: '陽と月の関係', talk: 82, work: 80,
    essence: '力強く周囲を照らすリーダー型と、やわらかな光で人を包む感性・癒し型。太陽と月のように異なる輝きを持つ二人が補い合う、温かく安定した関係です。',
    strength: 'リーダー型は感性・癒し型の優しさに心からくつろぎ、感性・癒し型はリーダー型の頼もしさに守られていると感じます。家庭的な安心感を育みやすく、長期的な関係に向いたペアです。',
    caution: 'リーダー型の率直な物言いが、繊細な感性・癒し型を知らず知らず傷つけてしまうことも。感性・癒し型が我慢を重ねると、気づいたときには心の距離が開いていることがあります。',
    secret: '感謝とねぎらいの言葉をこまめに伝えること。リーダー型が相手の気持ちを言葉で確かめ、感性・癒し型が小さな本音を早めに打ち明けることで、絆は揺るぎないものになります。',
  },
  'action|action': {
    base: 76, name: '両雄並立の関係', talk: 74, work: 84,
    essence: '殺・破・狼の星に代表される、変化と挑戦のエネルギーを持つ者同士。出会った瞬間から強く惹かれ合い、刺激に満ちた関係が始まる情熱的な組み合わせです。',
    strength: '互いの挑戦心に火をつけ合い、一人では踏み出せなかった世界へと進んでいけるペア。同じ目標に向かったときの推進力は、全タイプの中でも屈指です。',
    caution: 'どちらも自分のペースで動きたいため、衝突が起きるとヒートアップしやすい傾向があります。刺激を求めるあまり、関係そのものが落ち着かないと感じる時期もあるでしょう。',
    secret: '「二人で挑む目標」を持つこと。エネルギーが互いではなく同じ方向に向いたとき、この組み合わせは最強のパートナーシップへと変わります。',
  },
  'action|thinker': {
    base: 82, name: '勇と智の関係', talk: 80, work: 93,
    essence: '勇猛果敢な行動・変革型と、冷静沈着な知性・調整型。「勇」と「智」を兼ね備えたこのペアは、アイデアを形にするスピードと確かさを両立できる名コンビです。',
    strength: '知性・調整型が描いた戦略を、行動・変革型が驚くほどの速さで実行に移します。互いに持たない力を尊敬し合えるため、学びの多い、成長し続ける関係です。',
    caution: '行動を急ぐ側と、熟考したい側。決断のタイミングがずれると、「慎重すぎる」「無謀だ」と互いを評価しがちです。',
    secret: '「考える時間」と「動く時間」を分けて決めておくこと。相手の得意なフェーズでは主導権を委ねることで、二人の力は何倍にもなります。',
  },
  'action|heart': {
    base: 86, name: '情熱と安らぎの関係', talk: 80, work: 76,
    essence: '燃えるような情熱を持つ行動・変革型と、穏やかな安らぎをもたらす感性・癒し型。正反対の魅力が引き合う、ドラマチックでありながら居心地のよい関係です。',
    strength: '行動・変革型は感性・癒し型のそばで心から休息でき、感性・癒し型は行動・変革型に新しい世界へ連れ出してもらえます。互いに、自分にないものを自然に学び合えるペアです。',
    caution: '行動・変革型の変化の速さに、感性・癒し型が不安を覚えることも。反対に、感性・癒し型の慎重さが行動・変革型には物足りなく映る場面があります。',
    secret: '変化を起こすときは、行動・変革型が理由と見通しを丁寧に伝えること。安心感を土台にすれば、二人の冒険はより大きく実り豊かなものになります。',
  },
  'thinker|thinker': {
    base: 80, name: '知音の関係', talk: 94, work: 86,
    essence: '知性と洞察力を持つ者同士が出会う、「知音」と呼ぶにふさわしい関係。言葉を交わすほど理解が深まり、互いの考えを尊重し合える、信頼に満ちた組み合わせです。',
    strength: '会話が尽きず、どんな問題も話し合いで乗り越えられる知的なペア。計画性と調整力に優れ、堅実に物事を築き上げていくことができます。',
    caution: 'どちらも慎重で考えすぎる傾向があるため、大切な決断が先送りになりがち。理屈で話し合うあまり、気持ちの面がおろそかになることもあります。',
    secret: '「正しさ」よりも「気持ち」を分かち合う時間を意識的につくること。ときには理屈抜きに楽しむ体験が、二人の関係に温かさと推進力を与えます。',
  },
  'heart|thinker': {
    base: 89, name: '以心伝心の関係', talk: 92, work: 78,
    essence: '理解力に優れた知性・調整型と、共感力に優れた感性・癒し型。言葉にしなくても気持ちが通じ合う、穏やかで心地よい「以心伝心」の関係です。',
    strength: '知性・調整型は感性・癒し型の気持ちを的確に汲み取り、感性・癒し型は知性・調整型の心を優しく癒やします。争いが少なく、安心して長く寄り添えるペアです。',
    caution: '互いに相手を思いやるあまり、本音を飲み込んでしまうことがあります。察し合える関係だからこそ、小さな不満が言葉にされずに積み重なる点には注意が必要です。',
    secret: '「言わなくてもわかる」に頼りすぎず、うれしいことも困ったことも言葉にして伝え合うこと。それだけで、二人の関係は揺るぎない安らぎへと育ちます。',
  },
  'heart|heart': {
    base: 85, name: '比翼の関係', talk: 88, work: 70,
    essence: '優しさと感受性を持つ者同士。「比翼の鳥」のように寄り添い、一緒にいるだけで心が満たされる、温もりに満ちた関係です。',
    strength: '価値観や感じ方が近く、相手の喜びを自分の喜びとして感じられるペア。穏やかな時間を共有するほど、幸福感が深まっていきます。',
    caution: 'どちらも受け身になりやすく、決断や変化が必要な場面で二人とも立ち止まってしまうことがあります。居心地のよさに甘えて、関係が停滞しないよう気をつけましょう。',
    secret: '記念日や小さな目標を決めて、二人で新しい体験を重ねること。優しさに「前へ進む力」が加わると、二人の未来は一層豊かに広がります。',
  },
};

// 五行：相生（木→火→土→金→水→木）と相剋（木→土→水→火→金→木）
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

function elementRelation(a, b, nameA, nameB) {
  if (!a || !b) return { kind: '—', bonus: 3, text: '', tip: '' };
  if (a === b) {
    return { kind: '比和', bonus: 5,
      text: `二人とも「${a}」の五行局を持つ「比和」の関係。価値観や物事のリズムが近く、自然体でいられる安心感があります。似ているからこそ、互いに足りない面を意識して補い合うと、関係はさらに豊かになります。`,
      tip: '似た者同士だからこそ、ときには相手と違う視点を取り入れてみましょう。' };
  }
  const gen = (x, y, nx, ny) => ({ kind: '相生', bonus: 8,
    text: `${nx}の「${x}」が${ny}の「${y}」を生む「相生」の関係。${nx}が${ny}を育て、支える自然な流れがあり、${ny}は${nx}のそばで才能を伸ばしやすくなります。一緒にいるほど互いの運気が高まる、吉とされる組み合わせです。`,
    tip: `${nx}が与え、${ny}が受け取る流れがあります。${ny}からも感謝を言葉で返すと、循環がより良くなります。` });
  const ctl = (x, y, nx, ny) => ({ kind: '相剋', bonus: 1,
    text: `${nx}の「${x}」が${ny}の「${y}」を剋す「相剋」の関係。${nx}が${ny}を引き締め、鍛える流れがあります。ほどよい緊張感は成長の原動力にもなるため、${nx}が言葉選びに優しさを添えれば、互いを高め合う関係になります。`,
    tip: `${nx}は指摘より励ましを、${ny}は受け身にならず自分の考えを伝えることを意識しましょう。` });
  if (GENERATES[a] === b) return gen(a, b, nameA, nameB);
  if (GENERATES[b] === a) return gen(b, a, nameB, nameA);
  if (CONTROLS[a] === b) return ctl(a, b, nameA, nameB);
  return ctl(b, a, nameB, nameA);
}

// 生年支（十二支）の関係
const SANHE = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
const LIUHE = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
const CHONG = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const pairIn = (list, a, b) => list.some((g) => g.includes(a) && g.includes(b));

function branchRelation(a, b) {
  if (!a || !b) return { kind: '—', bonus: 2, text: '' };
  if (a === b) return { kind: '同支', bonus: 3, text: `二人とも「${a}」年の生まれ。考え方や行動のリズムが似ていて、出会ってすぐに打ち解けやすい関係です。` };
  if (pairIn(LIUHE, a, b)) return { kind: '六合', bonus: 7, text: `生まれ年の十二支が「六合」（${a}・${b}）の関係。目に見えない縁で結ばれ、自然と惹かれ合う相性です。一緒にいると不思議と物事がまとまりやすくなります。` };
  if (pairIn(SANHE, a, b)) return { kind: '三合', bonus: 6, text: `生まれ年の十二支が「三合」（${a}・${b}）の関係。同じ志を持つ仲間のように協力し合える、吉とされる組み合わせです。` };
  if (pairIn(CHONG, a, b)) return { kind: '六冲', bonus: -2, text: `生まれ年の十二支が「六冲」（${a}・${b}）の関係。正反対の性質を持つため強く惹かれ合う一方、ぶつかり合うことも。違いを認め合えれば、互いを大きく成長させる関係になります。` };
  return { kind: '平', bonus: 2, text: `生まれ年の十二支（${a}・${b}）は穏やかな関係。互いのペースを尊重しながら、ゆっくりと絆を育てていける相性です。` };
}

const palaceLabel = (p) => (p.name === '命宮' ? '命宮' : `${p.name}宮`);

/** 夫妻宮（理想のパートナー像）と相手の命宮の照合 */
function spouseMatch(from, to, nameFrom, nameTo) {
  const spouse = from.palaces.find((p) => p.name === '夫妻');
  const spouseStars = spouse.majorStars.map((s) => s.name);
  const toStars = to.soul.majorStars.map((s) => s.name);
  const list = spouseStars.join('・') || '主星なし';
  const exact = toStars.find((s) => spouseStars.includes(s));
  if (exact) {
    return { bonus: 8, text: `${nameFrom}の夫妻宮には${exact}があり、${nameTo}の命宮の星と一致します。${nameFrom}が心の奥で求めるパートナー像を、${nameTo}はそのまま体現している存在です。` };
  }
  const toType = typeOfStar(toStars[0]);
  if (toType && spouseStars.some((s) => typeOfStar(s) === toType)) {
    return { bonus: 5, text: `${nameFrom}の夫妻宮（${list}）は、${nameTo}と同じ「${TYPES[toType].label}」の星。${nameFrom}にとって${nameTo}は、理想に近いパートナー像を持つ相手です。` };
  }
  return { bonus: 1, text: `${nameFrom}の夫妻宮（${list}）が描く理想像とは異なるタイプの${nameTo}。だからこそ、${nameFrom}にとって新鮮な発見と刺激をもたらす存在になります。` };
}

/** 生年四化の飛び先：fromの化祿・化忌が toの命盤のどの宮に入るか */
function flyingMutagens(from, to, nameFrom, nameTo) {
  const stem = (from.chineseDate || '').charAt(0);
  const table = MUTAGEN_TABLE[stem];
  if (!table) return { bonus: 0, lines: [] };
  const find = (star) => to.palaces.find((p) => p.ownMajorStars.some((s) => s.name === star) || p.minorStars.some((s) => s.name === star));
  const lines = [];
  let bonus = 0;
  const lu = find(table[0]);
  if (lu) {
    if (['命宮', '夫妻', '福德', '財帛'].includes(lu.name)) bonus += 4;
    lines.push(`<span class="mk mk-祿">化祿</span>${nameFrom}の生年化祿（${table[0]}）は${nameTo}の<strong>${palaceLabel(lu)}</strong>に入ります。${nameFrom}は${nameTo}の「${PALACE_THEMES[lu.name]}」に恵みと喜びをもたらす存在です。`);
  }
  const ji = find(table[3]);
  if (ji) {
    if (['命宮', '夫妻'].includes(ji.name)) bonus -= 2;
    lines.push(`<span class="mk mk-忌">化忌</span>${nameFrom}の生年化忌（${table[3]}）は${nameTo}の<strong>${palaceLabel(ji)}</strong>に入ります。${nameTo}は${nameFrom}と過ごす中で「${PALACE_THEMES[ji.name]}」について深く考えるきっかけを得るでしょう。互いの成長につながるテーマです。`);
  }
  return { bonus, lines };
}

function levelOf(score) {
  if (score >= 95) return '運命の相手級';
  if (score >= 88) return '最高の相性';
  if (score >= 80) return '好相性';
  if (score >= 70) return '良い相性';
  return '成長し合える相性';
}

const clamp = (v) => Math.round(Math.max(45, Math.min(98, v)));

export function compatibility(chartA, chartB, nameA = 'あなた', nameB = 'お相手') {
  const ta = typeOf(chartA);
  const tb = typeOf(chartB);
  const pair = PAIRS[[ta, tb].sort().join('|')];
  const elem = elementRelation(chartA.element, chartB.element, nameA, nameB);
  const branch = branchRelation(chartA.chineseDate?.charAt(1), chartB.chineseDate?.charAt(1));
  const spouseAB = spouseMatch(chartA, chartB, nameA, nameB);
  const spouseBA = spouseMatch(chartB, chartA, nameB, nameA);
  const flyAB = flyingMutagens(chartA, chartB, nameA, nameB);
  const flyBA = flyingMutagens(chartB, chartA, nameB, nameA);

  const extras = elem.bonus + branch.bonus + (spouseAB.bonus + spouseBA.bonus) / 2 + flyAB.bonus + flyBA.bonus;
  const score = clamp(pair.base * 0.7 + 13 + extras * 0.9);

  const subScores = [
    { label: '恋愛', score: clamp(score - 6 + (spouseAB.bonus + spouseBA.bonus) * 0.8) },
    { label: '結婚・生活', score: clamp(score - 4 + elem.bonus + branch.bonus * 0.5) },
    { label: '価値観', score: clamp(score - 8 + elem.bonus * 1.2 + (ta === tb ? 4 : 0)) },
    { label: 'コミュニケーション', score: clamp(pair.talk * 0.6 + score * 0.4) },
    { label: '仕事・協力', score: clamp(pair.work * 0.6 + score * 0.4) },
  ];
  const weakest = [...subScores].sort((a, b) => a.score - b.score)[0];
  const WEAK_TIPS = {
    恋愛: 'ときめきを保つために、二人だけの特別な時間を定期的につくりましょう。',
    '結婚・生活': '生活のルールやお金の使い方は、早めに話し合って二人の基準を決めておくと安心です。',
    価値観: '考え方の違いは「間違い」ではなく「視点の違い」。相手の背景に関心を持つことが理解への近道です。',
    コミュニケーション: '結論を急がず、相手の話を最後まで聞く姿勢が、すれ違いを防ぐ一番の方法です。',
    '仕事・協力': '得意分野で役割を分けると、二人の力がぶつからずに生かされます。',
  };

  return {
    score,
    level: levelOf(score),
    typeA: TYPES[ta].label,
    typeB: TYPES[tb].label,
    pairName: pair.name,
    subScores,
    sections: [
      { title: `二人の関係の本質 ─ ${pair.name}`, body: pair.essence },
      { title: '二人の強み', body: pair.strength },
      { title: 'すれ違いやすいポイント', body: pair.caution },
      { title: '夫妻宮から見る相性', body: `${spouseAB.text}<br><br>${spouseBA.text}` },
      { title: '飛星四化から見る縁', list: [...flyAB.lines, ...flyBA.lines] },
      { title: `五行局の相性 ─ ${elem.kind}`, body: elem.text },
      { title: `生まれ年の十二支 ─ ${branch.kind}`, body: branch.text },
    ],
    tips: [pair.secret, elem.tip, WEAK_TIPS[weakest.label]].filter(Boolean),
    // シェア・旧表示用
    text: pair.essence,
    elementText: elem.text,
  };
}
