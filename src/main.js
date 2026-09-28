import './style.css';
import { buildChart, TIME_OPTIONS, UNKNOWN_TIME_INDEX } from './chart.js';
import { freeSummary, fullReport, palaceDetails } from './readings.js';
import { ELEMENT_CLASS, YIN_YANG, YIN_YANG_DIRECTION, YIN_YANG_HARMONY } from './star-texts.js';
import { lifeOverview } from './patterns.js';
import { decadalFortunes, yearlyFortunes, monthlyFortunes, dailyFortune } from './fortune.js';
import { lineChart } from './curve.js';
import { STAR_ICONS, luckProfile, dailyLuck, areaScores, radarChart } from './extras.js';
import { compatibility } from './compat.js';
import { initLine, shareCompat, shareResult, purchaseReport, fetchPrice } from './line.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DEFAULT_PRICE_LABEL = '980円';
// アプリ内課金の利用審査が通るまでは無料機能のみで公開する（VITE_IAP_ENABLED=true で有料レポートを表示）
const IAP_ENABLED = import.meta.env.VITE_IAP_ENABLED === 'true' || import.meta.env.DEV;

const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 保存できなくても動作は継続 */ } },
};

let currentChart = null;
let currentInput = null;
let lastCompat = null;

function fillTimeSelect(select) {
  const unknown = new Option('わからない', 'unknown');
  select.add(unknown);
  for (const t of TIME_OPTIONS) select.add(new Option(t.label, String(t.index)));
  select.value = 'unknown';
}

function readBirth(form) {
  const data = new FormData(form);
  const date = data.get('date');
  if (!date) return { error: '生年月日を入力してください。' };
  const timeRaw = data.get('time');
  const timeIndex = timeRaw === 'unknown' ? UNKNOWN_TIME_INDEX : Number(timeRaw);
  return { date, timeIndex, timeUnknown: timeRaw === 'unknown', gender: data.get('gender') || '女' };
}

function chartKey(input) {
  return `${input.date}|${input.timeIndex}|${input.gender}`;
}

// 伝統的な命盤の配置（地支ごとの位置）
const BRANCH_POS = {
  巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4],
  辰: [2, 1], 酉: [2, 4],
  卯: [3, 1], 戌: [3, 4],
  寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4],
};

function renderChart(chart) {
  $('basic-info').innerHTML = `
    <dl>
      <div><dt>旧暦</dt><dd>${chart.lunarDate}</dd></div>
      <div><dt>干支</dt><dd>${chart.chineseDate}</dd></div>
      <div><dt>五行局</dt><dd>${chart.fiveElementsClass}</dd></div>
      <div><dt>命主 / 身主</dt><dd>${chart.soulStar} / ${chart.bodyStar}</dd></div>
      <div><dt>陰陽</dt><dd>${chart.yinYang.label}（大限${chart.yinYang.forward ? '順行' : '逆行'}）</dd></div>
      <div><dt>陰陽の配置</dt><dd>${chart.yinYang.harmony ? '陰陽順理' : '陰陽反背'}</dd></div>
    </dl>`;

  const grid = $('chart-grid');
  grid.innerHTML = '';
  for (const p of chart.palaces) {
    const [row, col] = BRANCH_POS[p.branch] || [1, 1];
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.dataset.palace = p.name;
    cell.className = 'palace' + (p.name === '命宮' ? ' is-soul' : '');
    cell.style.gridRow = String(row);
    cell.style.gridColumn = String(col);
    const majors = p.majorStars.map((s) =>
      `<span class="star${p.borrowed ? ' borrowed' : ''}">${s.name}${s.mutagen ? `<em>${s.mutagen}</em>` : ''}</span>`).join('');
    const minors = p.minorStars.slice(0, 3).map((s) => `<span class="minor">${s.name}</span>`).join('');
    cell.innerHTML = `
      <div class="stars">${majors || '<span class="empty">—</span>'}</div>
      <div class="minors">${minors}</div>
      <div class="palace-name">${p.name}<small>${p.stem}${p.branch}</small></div>`;
    grid.appendChild(cell);
  }
  const center = document.createElement('div');
  center.className = 'chart-center';
  center.innerHTML = `<p>${chart.solarDate}</p><p>${chart.time}（${chart.timeRange}）</p><p>${chart.zodiac}年・${chart.sign}</p>`;
  grid.appendChild(center);
}

function renderSummary(chart) {
  const s = freeSummary(chart);
  $('summary-stars').textContent = s.stars.length ? s.stars.map((n) => `${STAR_ICONS[n] || ''} ${n}`).join('・') : '主星なし（柔軟タイプ）';
  $('summary-keywords').textContent = s.keywords;
  $('summary-text').textContent = s.text;
  const sections = fullReport(chart);
  $('locked-preview').innerHTML = sections
    .map((sec) => `<div class="locked-item"><strong>${sec.title}</strong><span>${sec.stars.join('・') || '—'}</span></div>`)
    .join('');
}

const OPEN_PALACES = ['命宮', '夫妻', '官祿', '財帛'];
const list = (items, cls) => (items.length ? `<ul class="${cls}">${items.map((m) => `<li>${m}</li>`).join('')}</ul>` : '');

const starLabel = (s) => `${STAR_ICONS[s.name] || ''}${s.name}${s.brightness ? `<small>${s.brightness}</small>` : ''}`;

function palaceHead(p) {
  return `
    <span class="pd-name">${p.name}${p.isBody ? '<em>身宮</em>' : ''}</span>
    <span class="pd-theme">${p.theme}</span>
    <span class="pd-stars">${p.stars.map(starLabel).join('・') || '主星なし'}${p.borrowed ? '<small>（対宮の星を借りて読みます）</small>' : ''}</span>`;
}

function palaceBody(p) {
  return `
    ${p.paragraphs.map((x) => `<p>${x.star ? `<strong>【${x.star}】</strong>` : ''}${x.text}</p>`).join('')}
    ${list(p.brightNotes, 'bright-notes')}
    ${list(p.supports.map((s) => `<span class="${s.good ? 'good' : 'tough'}">${s.name}</span>${s.text}`), 'support-list')}
    ${list(p.mutagens, 'mutagens')}`;
}

/** 命盤の宮をタップしたときの解説シート */
function openPalaceSheet(palaceName) {
  const p = palaceDetails(currentChart).find((x) => x.key === palaceName);
  if (!p) return;
  $('sheet-content').innerHTML = `<div class="sheet-head" id="sheet-title">${palaceHead(p)}</div>${palaceBody(p)}`;
  $('sheet').hidden = false;
  document.body.classList.add('no-scroll');
}

function closeSheet() {
  $('sheet').hidden = true;
  document.body.classList.remove('no-scroll');
}

function renderReport(chart) {
  const body = chart.body.name === '命宮' ? '命宮（命身同宮）' : `${chart.body.name}宮`;
  const profile = `
    <section class="report-section">
      <h3>基本プロフィール</h3>
      <dl class="profile-list">
        <div><dt>五行局</dt><dd><strong>${chart.fiveElementsClass}</strong>　${ELEMENT_CLASS[chart.element] || ''}</dd></div>
        <div><dt>身宮</dt><dd><strong>${body}</strong>　人生の後半にかけて重みを増すテーマを表します。</dd></div>
        <div><dt>命主 / 身主</dt><dd><strong>${chart.soulStar} / ${chart.bodyStar}</strong>　生まれ持った運命の守り星と、人生を通じて育てていく星です。</dd></div>
        <div><dt>陰陽</dt><dd><strong>${chart.yinYang.label}</strong>　${YIN_YANG[chart.yinYang.label]}${YIN_YANG_DIRECTION[chart.yinYang.forward]}</dd></div>
        <div><dt>陰陽の配置</dt><dd><strong>${chart.yinYang.harmony ? '陰陽順理' : '陰陽反背'}</strong>　${YIN_YANG_HARMONY[chart.yinYang.harmony]}</dd></div>
      </dl>
    </section>`;
  const palaces = palaceDetails(chart).map((p) => `
    <details class="palace-detail" ${OPEN_PALACES.includes(p.key) ? 'open' : ''}>
      <summary>${palaceHead(p)}</summary>
      ${palaceBody(p)}
    </details>`).join('');
  $('report-body').innerHTML = `${profile}
    <section class="report-section">
      <h3>十二宮の詳細解説<small>タップすると各宮の解説を開閉できます</small></h3>
      ${palaces}
    </section>`;
  $('premium-card').hidden = true;
  $('report-card').hidden = false;
}

function renderLife(chart) {
  const life = lifeOverview(chart);
  $('life-title').textContent = life.title;
  $('life-patterns').innerHTML = life.patterns.map((p) => `<span class="chip">${p.name}</span>`).join('');
  $('life-text').innerHTML = life.paragraphs.map((t) => `<p>${t}</p>`).join('');
  $('pattern-list').innerHTML = life.patterns.map((p) => `<div class="pattern-item"><h3>${p.name}</h3><p>${p.text}</p></div>`).join('');
  const age = new Date().getFullYear() - chart.birthYear + 1;
  const points = life.decades.map((d) => ({ label: `${d.start}`, score: d.score }));
  const current = life.decades.findIndex((d) => age >= d.start && age <= d.end);
  const peak = life.decades.indexOf(life.peak);
  $('life-curve-mini').innerHTML = lineChart(points, { current, peak, id: 'mini' }) + '<p class="curve-caption">人生の運勢曲線（横軸は各大限の開始年齢・★は人生の飛躍期）</p>';

  const areas = areaScores(chart);
  const sorted = [...areas].sort((a, b) => b.score - a.score);
  $('radar').innerHTML = radarChart(areas);
  $('radar-text').innerHTML = `あなたがもっとも力を発揮しやすいのは<strong>「${sorted[0].label}」</strong>、次いで<strong>「${sorted[1].label}」</strong>。
    「${sorted[sorted.length - 1].label}」は、意識して時間をかけるほど伸びていく分野です。`;

  const luck = luckProfile(chart);
  $('luck-grid').innerHTML = luckItems([
    ['ラッキーカラー', `<i class="swatch" style="background:${luck.colorHex}"></i>${luck.color}`],
    ['サブカラー', `<i class="swatch" style="background:${luck.subColorHex}"></i>${luck.subColor}`],
    ['ラッキー方位', luck.direction],
    ['ラッキーナンバー', luck.numbers.join('・')],
    ['開運アイテム', luck.item],
    ['開運スポット', luck.spot],
  ]);
  $('luck-note').textContent = `${chart.fiveElementsClass}のあなたを後押しするのは「${luck.element}」の気。迷ったときは、これらを身の回りに取り入れてみましょう。`;
  lastLife = life;
}

const luckItems = (rows) => rows.map(([k, v]) => `<div class="luck-item"><span>${k}</span><strong>${v}</strong></div>`).join('');
let lastLife = null;

function renderToday(chart) {
  const today = new Date();
  const d = dailyFortune(chart, today);
  const luck = dailyLuck(chart, d.stem, today);
  $('today-label').textContent = `${today.getMonth() + 1}月${today.getDate()}日（${d.stem}${d.branch}日）の運勢`;
  const DAY = {
    top: ['絶好調の日', 'チャンスをつかみやすい一日。気になっていたことに思い切って動いてみましょう。'],
    up: ['追い風の日', '物事がスムーズに進みやすい一日。人との約束や相談ごとに向いています。'],
    mid: ['安定の日', '落ち着いて過ごせる一日。いつもの習慣を丁寧にこなすと運気が整います。'],
    low: ['充電の日', '無理をせず、休息や準備にあてると吉。明日への力がたまります。'],
  }[d.tone];
  $('today-title').innerHTML = `<span class="score-badge ${d.tone}">${d.score}</span>今日は${DAY[0]}`;
  $('today-text').innerHTML = `${DAY[1]}今日は<strong>${d.palace}</strong>（${d.theme}）に関わることが運を動かすカギになります。`;
  $('today-luck').innerHTML = luckItems([
    ['ラッキーカラー', `<i class="swatch" style="background:${luck.colorHex}"></i>${luck.color}`],
    ['ラッキーアイテム', luck.item],
    ['ラッキーナンバー', String(luck.number)],
    ['吉方位', luck.direction],
  ]);
}

function renderMonths(chart) {
  const year = new Date().getFullYear();
  const nowMonth = new Date().getMonth();
  const months = monthlyFortunes(chart, year);
  $('month-title').textContent = `${year}年の流月（月ごとの運勢）`;
  $('month-curve').innerHTML = lineChart(months.map((m) => ({ label: `${m.month}`, score: m.score })), { current: nowMonth, id: 'month' });
  $('month-grid').innerHTML = months.map((m, i) => `
    <div class="month-cell ${m.tone} ${i === nowMonth ? 'is-now' : ''}">
      <span class="mc-month">${m.month}月</span>
      <span class="mc-score">${m.score}</span>
      <span class="mc-label">${m.label}</span>
      <span class="mc-theme">${m.palace}</span>
    </div>`).join('') + `<p class="advice month-tip">今月のひとこと：${months[nowMonth].tip}</p>`;
}

function renderFortune(chart) {
  const thisYear = new Date().getFullYear();
  const years = yearlyFortunes(chart, thisYear, 12);
  const now = years[0];
  $('year-now-label').textContent = `${now.year}年（${now.stem}${now.branch}年）の運勢・数え年${now.age}歳`;
  $('year-now-title').innerHTML = `<span class="score-badge ${now.tone}">${now.score}</span>${now.label}`;
  $('year-now').innerHTML = `
    <p>${now.note}</p>
    <p>今年は<strong>${now.palace}</strong>が流年の命宮にあたり、「${now.theme}」が一年の主役になります。${now.stars.length ? `この宮の星は${now.stars.join('・')}。` : ''}</p>
    <p class="advice">${now.advice}</p>
    <h3>今年の四化（運気の流れ）</h3>
    <ul class="mutagen-year">${now.mutagens.map((m) => `<li><span class="mk mk-${m.kind}">化${m.kind}</span><strong>${m.palace}</strong>（${m.theme}）：${m.text}</li>`).join('')}</ul>
    ${now.decade ? `<p class="small">現在の大限：${now.decade.start}〜${now.decade.end}歳（${now.decade.palace}・${now.decade.label}）</p>` : ''}`;
  $('year-curve').innerHTML = lineChart(years.map((y) => ({ label: `'${String(y.year).slice(2)}`, score: y.score })), { current: 0, id: 'year' });
  $('year-list').innerHTML = years.map((y) => `
    <div class="fortune-row">
      <span class="fr-when">${y.year}年<small>${y.age}歳</small></span>
      <span class="fr-bar"><i class="${y.tone}" style="width:${y.score}%"></i></span>
      <span class="fr-label ${y.tone}">${y.label}</span>
      <span class="fr-text">${y.palace}：${y.theme}</span>
    </div>`).join('');

  const decades = decadalFortunes(chart).filter((d) => d.start <= 95);
  const age = thisYear - chart.birthYear + 1;
  const current = decades.findIndex((d) => age >= d.start && age <= d.end);
  const lifePeak = lifeOverview(chart).peak;
  const peak = decades.findIndex((d) => d.start === lifePeak.start);
  $('life-curve').innerHTML = lineChart(decades.map((d) => ({ label: `${d.start}`, score: d.score })), { current, peak, id: 'life' });
  $('decade-list').innerHTML = decades.map((d, i) => `
    <div class="decade-row ${i === current ? 'is-now' : ''}">
      <div class="dr-head"><strong>${d.start}〜${d.end}歳</strong>${i === current ? '<em>現在</em>' : ''}<span class="fr-label ${d.tone}">${d.label}</span><span class="score-badge small ${d.tone}">${d.score}</span></div>
      <p><span class="dr-palace">${d.palace}${d.stars.length ? `（${d.stars.join('・')}）` : ''}</span>${d.text}</p>
    </div>`).join('');
}

function selectTab(name) {
  document.querySelectorAll('#tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  $('tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showResult(input) {
  currentInput = input;
  currentChart = buildChart(input);
  renderChart(currentChart);
  renderSummary(currentChart);
  renderLife(currentChart);
  renderFortune(currentChart);
  renderToday(currentChart);
  renderMonths(currentChart);
  $('share-result-note').textContent = '';
  document.querySelectorAll('#tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === 'chart')));
  document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.dataset.panel !== 'chart'; });
  const unlocked = store.get('unlocked') || [];
  // 課金機能を公開するまでは詳細レポートも無料で表示する
  if (!IAP_ENABLED || unlocked.includes(chartKey(input))) {
    renderReport(currentChart);
  } else {
    $('premium-card').hidden = !IAP_ENABLED;
    $('report-card').hidden = true;
  }
  $('form-card').hidden = true;
  $('intro-card').hidden = true;
  $('result').hidden = false;
  store.set('lastInput', input);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function onBuy() {
  const btn = $('buy-btn');
  btn.disabled = true;
  $('buy-note').textContent = '';
  try {
    const ok = await purchaseReport();
    if (!ok) throw new Error('購入が完了しませんでした');
    const unlocked = store.get('unlocked') || [];
    unlocked.push(chartKey(currentInput));
    store.set('unlocked', unlocked);
    renderReport(currentChart);
  } catch (e) {
    $('buy-note').textContent = e.message || '購入できませんでした。時間をおいてお試しください。';
  } finally {
    btn.disabled = false;
  }
}

function onCompat(e) {
  e.preventDefault();
  const form = e.target;
  const partner = readBirth(form);
  if (partner.error) {
    $('compat-error').textContent = partner.error;
    $('compat-error').hidden = false;
    return;
  }
  $('compat-error').hidden = true;
  const data = new FormData(form);
  const nameA = (data.get('nameA') || '').trim() || 'あなた';
  const nameB = (data.get('nameB') || '').trim() || 'お相手';
  // 呼び名は利用者の入力なので、HTMLに埋め込む前にエスケープする
  const r = compatibility(currentChart, buildChart(partner), escapeHtml(nameA), escapeHtml(nameB));
  lastCompat = { nameA, nameB, score: r.score, typeA: r.typeA, typeB: r.typeB };
  $('compat-names').textContent = `${nameA} × ${nameB}`;
  $('compat-score').textContent = String(r.score);
  $('compat-level').textContent = `${r.level}｜${r.pairName}`;
  $('compat-types').textContent = `${r.typeA} × ${r.typeB}`;
  $('compat-bars').innerHTML = r.subScores.map((s) => `
    <div class="cb-row"><span class="cb-label">${s.label}</span><span class="fr-bar"><i style="width:${s.score}%"></i></span><span class="cb-score">${s.score}</span></div>`).join('');
  $('compat-sections').innerHTML = r.sections.map((s) => `
    <section class="compat-section">
      <h3>${s.title}</h3>
      ${s.body ? `<p>${s.body}</p>` : ''}
      ${s.list?.length ? `<ul class="mutagen-year">${s.list.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
    </section>`).join('');
  $('compat-tips').innerHTML = `<h3>関係を深める3つのヒント</h3><ol>${r.tips.map((t) => `<li>${t}</li>`).join('')}</ol>`;
  $('compat-result').hidden = false;
  $('share-note').textContent = '';
}

const SHARE_NOTES = {
  sent: '送信しました！',
  cancelled: '',
  copied: 'メッセージをコピーしました。LINEに貼り付けて送ってください。',
  failed: 'シェアできませんでした。',
};

async function onShare() {
  if (!lastCompat) return;
  const res = await shareCompat(lastCompat);
  $('share-note').textContent = SHARE_NOTES[res] || '';
}

async function onShareResult() {
  if (!lastLife || !currentChart) return;
  const res = await shareResult({
    title: lastLife.title,
    patterns: lastLife.patterns.map((p) => p.name),
    stars: currentChart.soul.majorStars.map((s) => s.name).join('・'),
  });
  $('share-result-note').textContent = SHARE_NOTES[res] || '';
}

async function main() {
  fillTimeSelect(document.querySelector('#birth-form select[name="time"]'));
  fillTimeSelect(document.querySelector('#compat-form select[name="time"]'));

  $('birth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = readBirth(e.target);
    if (input.error) {
      $('form-error').textContent = input.error;
      $('form-error').hidden = false;
      return;
    }
    $('form-error').hidden = true;
    showResult(input);
  });
  $('buy-btn').addEventListener('click', onBuy);
  $('tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) selectTab(tab.dataset.tab);
  });
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.goto)));
  $('compat-form').addEventListener('submit', onCompat);
  $('share-btn').addEventListener('click', onShare);
  $('share-result-btn').addEventListener('click', onShareResult);
  $('chart-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('[data-palace]');
    if (cell) openPalaceSheet(cell.dataset.palace);
  });
  $('sheet').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeSheet();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('sheet').hidden) closeSheet();
  });
  $('restart-btn').addEventListener('click', () => {
    $('result').hidden = true;
    $('form-card').hidden = false;
    $('intro-card').hidden = false;
  });

  const line = await initLine();
  if (!IAP_ENABLED) {
    const last = store.get('lastInput');
    if (last && last.date) showResult(last);
    return;
  }
  const price = await fetchPrice();
  $('buy-btn').textContent = `詳細レポートを見る（${price ? `${price.price}${price.currency === 'JPY' ? '円' : ` ${price.currency}`}` : DEFAULT_PRICE_LABEL}）`;
  if (!line.enabled && import.meta.env.DEV) {
    $('buy-note').textContent = '開発モード：ボタンを押すとテストとして解放されます。';
  }

  const last = store.get('lastInput');
  if (last && last.date) showResult(last);
}

main();
