// Crypto Watch – accessible live dashboard
// Data from CoinGecko API (Demo or Pro).

const COINS = [
  { id: "bitcoin",   symbol: "BTC", name: "Bitcoin",  icon: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
  { id: "ethereum",  symbol: "ETH", name: "Ethereum", icon: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
  { id: "litecoin",  symbol: "LTC", name: "Litecoin", icon: "https://assets.coingecko.com/coins/images/2/large/litecoin.png" },
  { id: "dogecoin",  symbol: "DOGE", name: "Dogecoin", icon: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png" },
  { id: "solana",    symbol: "SOL", name: "Solana",   icon: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
];

// --- Auto-detect Demo vs Pro ---
async function resolveCgAuth() {
  const key = (localStorage.getItem('cg_api_key') || '').trim();
  if (!key) return { base: 'https://api.coingecko.com/api/v3', qp: null, plan: 'none' };

  // Try Demo
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/ping?x_cg_demo_api_key=${encodeURIComponent(key)}`);
    if (r.ok) return { base: 'https://api.coingecko.com/api/v3', qp: 'x_cg_demo_api_key', plan: 'demo' };
  } catch {}

  // Try Pro
  try {
    const r2 = await fetch(`https://pro-api.coingecko.com/api/v3/ping?x_cg_pro_api_key=${encodeURIComponent(key)}`);
    if (r2.ok) return { base: 'https://pro-api.coingecko.com/api/v3', qp: 'x_cg_pro_api_key', plan: 'pro' };
  } catch {}

  return { base: 'https://api.coingecko.com/api/v3', qp: null, plan: 'unknown' };
}

let CG = { base: 'https://api.coingecko.com/api/v3', qp: null, plan: 'none' };
function withKey(url) {
  const key = (localStorage.getItem('cg_api_key') || '').trim();
  if (!key || !CG.qp) return url;
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + CG.qp + '=' + encodeURIComponent(key);
}

const state = {
  currency: localStorage.getItem('currency') || 'eur',
  intervalSec: Number(localStorage.getItem('intervalSec') || 30),
  theme: localStorage.getItem('theme') || null,
  prices: {},
  timers: { main: null },
};

const elCards = document.getElementById('cards');
const elCurrency = document.getElementById('currency');
const elRefresh = document.getElementById('refresh');
const elThemeToggle = document.getElementById('theme-toggle');
const elStatus = document.getElementById('status');
const elError = document.getElementById('error');
const elKey = document.getElementById('api-key');
const elSaveKey = document.getElementById('save-key');

document.getElementById('year').textContent = new Date().getFullYear();

if (elKey && elSaveKey) {
  elKey.value = localStorage.getItem('cg_api_key') || '';
  elSaveKey.addEventListener('click', async () => {
    localStorage.setItem('cg_api_key', elKey.value.trim());
    elError.textContent = '';
    elError.style.display = 'none';
    announce('API key saved. Detecting plan and refreshing data...');
    CG = await resolveCgAuth();
    refreshAll();
  });
}

// Theme
function applyTheme() {
  if (state.theme) {
    document.documentElement.setAttribute('data-theme', state.theme);
    elThemeToggle.setAttribute('aria-pressed', state.theme === 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    elThemeToggle.setAttribute('aria-pressed', 'false');
  }
}
applyTheme();

elThemeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? null : 'light';
  localStorage.setItem('theme', state.theme ?? '');
  applyTheme();
});

// Controls
elCurrency.value = state.currency;
elRefresh.value = String(state.intervalSec);

elCurrency.addEventListener('change', () => {
  state.currency = elCurrency.value;
  localStorage.setItem('currency', state.currency);
  announce(`Currency changed to ${labelForCurrency(state.currency)}.`);
  refreshAll();
});

elRefresh.addEventListener('change', () => {
  state.intervalSec = Number(elRefresh.value);
  localStorage.setItem('intervalSec', state.intervalSec);
  announce(`Refresh interval set to ${state.intervalSec} seconds.`);
  schedule();
});

// Build cards
function buildCards() {
  elCards.innerHTML = '';
  const tpl = document.getElementById('card-template');
  for (const coin of COINS) {
    const node = tpl.content.cloneNode(true);
    const name = node.querySelector('.asset-name');
    const ticker = node.querySelector('.ticker');
    const icon = node.querySelector('.icon');
    const price = node.querySelector('.price');
    const change = node.querySelector('.change');
    const canvas = node.querySelector('canvas.sparkline');
    const desc = node.querySelector('.chart-desc');

    name.textContent = coin.name;
    ticker.textContent = coin.symbol;
    icon.src = coin.icon; icon.alt = '';

    price.id = `price-${coin.id}`;
    change.id = `change-${coin.id}`;
    canvas.id = `spark-${coin.id}`;
    desc.id = `desc-${coin.id}`;
    canvas.setAttribute('aria-describedby', desc.id);

    elCards.appendChild(node);
  }
}

function labelForCurrency(code) {
  return { eur: 'euros', usd: 'US dollars', gbp: 'British pounds' }[code] || code;
}

function formatMoney(value, code) {
  const map = { eur: 'EUR', usd: 'USD', gbp: 'GBP' };
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: map[code] || 'EUR', maximumFractionDigits: 2 }).format(value).replace(/\s*[A-Z]{3}$/,'');
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      let text = '';
      try { text = await res.text(); } catch {}
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ' — ' + text.slice(0,120) : ''}`);
    }
    return res;
  } catch (err) {
    throw new Error('Network error: ' + (err && err.message ? err.message : String(err)));
  }
}

async function fetchPrices() {
  const ids = COINS.map(c => c.id).join(',');
  const vs = ['eur','usd','gbp'].join(',');
  const url = withKey(`${CG.base}/simple/price?ids=${ids}&vs_currencies=${vs}&include_24hr_change=true`);

  const res = await safeFetch(url, { headers: { 'accept': 'application/json' } });
  return res.json();
}

async function fetchChart(coinId, vsCurrency) {
  const url = withKey(`${CG.base}/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=7&interval=hourly`);
  const res = await safeFetch(url, { headers: { 'accept': 'application/json' } });
  return res.json();
}

function renderPrices(data) {
  for (const coin of COINS) {
    const p = data[coin.id];
    if (!p) continue;
    const priceEl = document.getElementById(`price-${coin.id}`);
    const changeEl = document.getElementById(`change-${coin.id}`);

    const price = p[state.currency];
    const ch = p[`${state.currency}_24h_change`];

    const prev = Number(priceEl.dataset.value || NaN);
    priceEl.textContent = formatMoney(price, state.currency);
    priceEl.dataset.value = String(price);

    const up = !Number.isNaN(prev) && price > prev;
    const down = !Number.isNaN(prev) && price < prev;
    if (up || down) {
      priceEl.classList.remove('pulse');
      void priceEl.offsetWidth;
      priceEl.classList.add('pulse');
      setTimeout(()=>priceEl.classList.remove('pulse'), 600);
      announce(`${coin.name} ${up ? 'up' : 'down'} to ${formatMoney(price, state.currency)}.`);
    }

    const chFixed = (ch ?? 0).toFixed(2);
    changeEl.textContent = `${chFixed}% 24h`; 
    changeEl.classList.toggle('up', (ch ?? 0) >= 0);
    changeEl.classList.toggle('down', (ch ?? 0) < 0);
  }
}

function announce(msg) {
  elStatus.textContent = msg;
  setTimeout(() => { elStatus.textContent = ''; }, 500);
}

function showError(msg) {
  elError.textContent = msg;
  elError.style.display = 'block';
}

function drawSparkline(canvas, points, label) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const values = points.map(p => p[1]);
  const min = Math.min(...values), max = Math.max(...values), pad = 6;
  const xStep = (w - pad * 2) / (points.length - 1 || 1);
  const scale = v => max === min ? h/2 : h - pad - ((v - min)/(max - min)) * (h - pad*2);

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, scale(values[0]));
  for (let i = 1; i < values.length; i++) {
    ctx.lineTo(pad + xStep * i, scale(values[i]));
  }
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3ea6ff';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pad, scale(values[0]), 2.5, 0, Math.PI*2);
  ctx.arc(w - pad, scale(values[values.length-1]), 2.5, 0, Math.PI*2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e9eef1';
  ctx.fill();

  const desc = canvas.parentElement.querySelector('.chart-desc');
  const minVal = Math.min(...values).toFixed(2);
  const maxVal = Math.max(...values).toFixed(2);
  desc.textContent = label + `. 7-day range ${minVal} to ${maxVal} in ${labelForCurrency(state.currency)}.`;
}

async function renderCharts() {
  for (const coin of COINS) {
    try {
      const data = await fetchChart(coin.id, state.currency);
      const points = data.prices || [];
      const canvas = document.getElementById(`spark-${coin.id}`);
      if (points.length) drawSparkline(canvas, points, `${coin.name} price`);
    } catch (err) {
      console.error('Chart error', coin.id, err);
    }
  }
}

async function refreshAll() {
  try {
    const data = await fetchPrices();
    if (!data || typeof data !== 'object') throw new Error('Empty response');
    renderPrices(data);
    renderCharts();
    elError.style.display = 'none';
  } catch (err) {
    console.error(err);
    showError('Failed to fetch prices. If you entered a key, make sure it matches your plan (Demo vs Pro). You can try again in a minute.');
  }
}

function schedule() {
  if (state.timers.main) clearInterval(state.timers.main);
  state.timers.main = setInterval(refreshAll, state.intervalSec * 1000);
}

async function init() {
  buildCards();
  CG = await resolveCgAuth();
  refreshAll();
  schedule();
  if (location.hash === '#main') document.getElementById('main').focus();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state.timers.main) clearInterval(state.timers.main);
  } else {
    schedule();
    refreshAll();
  }
});

const style = document.createElement('style');
style.textContent = `.pulse { transition: transform .15s ease; transform: scale(1.02); }`;
document.head.appendChild(style);

init();
