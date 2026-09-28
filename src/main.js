import './style.css';
import { buildChart, TIME_OPTIONS, UNKNOWN_TIME_INDEX } from './chart.js';
import { freeSummary, fullReport } from './readings.js';
import { compatibility } from './compat.js';
import { initLine, shareCompat, purchaseReport, fetchPrice } from './line.js';

const $ = (id) => document.getElementById(id);
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
    </dl>`;

  const grid = $('chart-grid');
  grid.innerHTML = '';
  for (const p of chart.palaces) {
    const [row, col] = BRANCH_POS[p.branch] || [1, 1];
    const cell = document.createElement('div');
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
  $('summary-stars').textContent = s.stars.length ? s.stars.join('・') : '主星なし（柔軟タイプ）';
  $('summary-keywords').textContent = s.keywords;
  $('summary-text').textContent = s.text;
  const sections = fullReport(chart);
  $('locked-preview').innerHTML = sections
    .map((sec) => `<div class="locked-item"><strong>${sec.title}</strong><span>${sec.stars.join('・') || '—'}</span></div>`)
    .join('');
}

function renderReport(chart) {
  const sections = fullReport(chart);
  $('report-body').innerHTML = sections.map((sec) => `
    <section class="report-section">
      <h3>${sec.title}<small>${sec.palace}${sec.borrowed ? '（対宮の星を借りて読みます）' : ''}</small></h3>
      <p>${sec.body.replace(/\n/g, '<br />')}</p>
      ${sec.mutagens.length ? `<ul class="mutagens">${sec.mutagens.map((m) => `<li>${m}</li>`).join('')}</ul>` : ''}
    </section>`).join('');
  $('premium-card').hidden = true;
  $('report-card').hidden = false;
}

function showResult(input) {
  currentInput = input;
  currentChart = buildChart(input);
  renderChart(currentChart);
  renderSummary(currentChart);
  const unlocked = store.get('unlocked') || [];
  if (unlocked.includes(chartKey(input))) {
    renderReport(currentChart);
  } else {
    $('premium-card').hidden = !IAP_ENABLED;
    $('report-card').hidden = true;
  }
  $('form-card').hidden = true;
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
  const r = compatibility(currentChart, buildChart(partner));
  lastCompat = { nameA, nameB, ...r };
  $('compat-names').textContent = `${nameA} × ${nameB}`;
  $('compat-score').textContent = String(r.score);
  $('compat-types').textContent = `${r.typeA} × ${r.typeB}`;
  $('compat-text').textContent = r.text;
  $('compat-element').textContent = r.elementText;
  $('compat-result').hidden = false;
  $('share-note').textContent = '';
}

async function onShare() {
  if (!lastCompat) return;
  const res = await shareCompat(lastCompat);
  $('share-note').textContent = {
    sent: '送信しました！',
    cancelled: '',
    copied: 'メッセージをコピーしました。LINEに貼り付けて送ってください。',
    failed: 'シェアできませんでした。',
  }[res] || '';
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
  $('compat-form').addEventListener('submit', onCompat);
  $('share-btn').addEventListener('click', onShare);
  $('restart-btn').addEventListener('click', () => {
    $('result').hidden = true;
    $('form-card').hidden = false;
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
