import { createStore } from './store.js';

// ================================================================
//  Constants
// ================================================================
const DEFAULTS = {
  houseName: 'Our Home',
  color: '#455B48',
  names: { a: 'Merona', b: 'Daniel' },
  pets: [{ name: 'Eevee', type: 'cat' }, { name: 'Stella', type: 'cat' }],
};

const CATEGORIES = [
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
  { id: 'bills', label: 'Bills', icon: '🧾' },
  { id: 'home', label: 'For the home', icon: '🛋️' },
  { id: 'other', label: 'Other', icon: '✨' },
];

const DEFAULT_BILLS = [
  { name: 'Property tax (Arnona)', freq: 2, amount: 0, owner: 'shared', icon: '🏛️' },
  { name: 'Electricity', freq: 2, amount: 0, owner: 'shared', icon: '💡' },
  { name: 'Water', freq: 2, amount: 0, owner: 'shared', icon: '💧' },
  { name: 'Gas', freq: 2, amount: 0, owner: 'shared', icon: '🔥' },
  { name: 'Internet', freq: 1, amount: 0, owner: 'shared', icon: '📶' },
  { name: 'Building committee (Va\'ad Bayit)', freq: 1, amount: 0, owner: 'shared', icon: '🏢' },
];

const FREQS = [
  { v: 1, label: 'Every month' },
  { v: 2, label: 'Every 2 months' },
  { v: 3, label: 'Every 3 months' },
  { v: 6, label: 'Every 6 months' },
  { v: 12, label: 'Once a year' },
];

const SOURCES = [
  { id: 'buy', label: 'Buying it', icon: '🛍️' },
  { id: 'secondhand', label: 'Second-hand', icon: '♻️' },
  { id: 'gift', label: 'Gift', icon: '🎁' },
];

// Minimal line icons (24×24, drawn with the current text color)
const svg = (inner, size = 24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS = {
  money: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  bills: '<path d="M5 2.5v19l2.3-1.4 2.4 1.4 2.3-1.4 2.3 1.4 2.4-1.4 2.3 1.4v-19l-2.3 1.4-2.4-1.4L12 3.9 9.7 2.5 7.3 3.9Z"/><path d="M9 9h6M9 13h6"/>',
  shop: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  contract: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 13h6M9 17h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/>',
  project: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  cart: '<circle cx="8" cy="20.5" r="1.2"/><circle cx="18" cy="20.5" r="1.2"/><path d="M2 2.5h2.2l2.5 12a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6l1.5-7.2H5.3"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
};

// Pet illustrations
const EYES = (y, l = 9.5, r = 14.5) => `<circle cx="${l}" cy="${y}" r=".9" fill="currentColor" stroke="none"/><circle cx="${r}" cy="${y}" r=".9" fill="currentColor" stroke="none"/>`;
const PETS = [
  { id: 'cat', label: 'Cat', art: '<path d="M5.5 10.5V4.5l4 3.2q2.5-.9 5 0l4-3.2v6q1 1.6 1 3.5c0 3.6-3.6 5.5-7.5 5.5S4.5 17.6 4.5 14q0-1.9 1-3.5Z"/>' + EYES(13) + '<path d="M11.2 15.6h1.6L12 16.6Z"/>' },
  { id: 'dog', label: 'Dog', art: '<path d="M8 6.5q4-1.8 8 0 2 2.8 2 6.5c0 4-2.7 6-6 6s-6-2-6-6q0-3.7 2-6.5Z"/><path d="M8 6.5Q4 6 3.6 10.5q.4 2.6 2.6 2.3"/><path d="M16 6.5q4-.5 4.4 4q-.4 2.6-2.6 2.3"/>' + EYES(11.5) + '<path d="M10.8 14.6h2.4L12 16Z"/>' },
  { id: 'rabbit', label: 'Rabbit', art: '<path d="M9.6 9.2C8 5.5 8 2.6 9.6 2.6s2 3 2 6.4"/><path d="M14.4 9.2c1.6-3.7 1.6-6.6 0-6.6s-2 3-2 6.4"/><circle cx="12" cy="14.6" r="6"/>' + EYES(13.8) + '<path d="M11.3 16.4h1.4l-.7.8Z"/>' },
  { id: 'bird', label: 'Bird', art: '<path d="M4.5 15.5c0-4.5 2.8-8 7-8.4 2.5-.2 4.2 1 4.8 2.6l3.2 1-3.1 1.1c.3 4.3-2.5 6.7-6.4 6.7-2.6 0-4.5-.9-5.5-3Z"/><path d="M7.6 13.4c1.6 1.8 3.8 1.9 5.4.1"/><circle cx="14" cy="10.4" r=".9" fill="currentColor" stroke="none"/>' },
  { id: 'fish', label: 'Fish', art: '<path d="M2.8 12c3.2-4.6 8-6.2 12.4-3.6Q17.6 10 17.6 12t-2.4 3.6C10.8 18.2 6 16.6 2.8 12Z"/><path d="M17.6 12 21.4 8.2v7.6Z"/><circle cx="13.2" cy="11" r=".9" fill="currentColor" stroke="none"/>' },
  { id: 'hamster', label: 'Hamster', art: '<circle cx="7.4" cy="7.6" r="2.1"/><circle cx="16.6" cy="7.6" r="2.1"/><path d="M5.4 10.4C6.6 8 9 7 12 7s5.4 1 6.6 3.4c1.4 3 .6 6.3-1.9 7.6-3 1.6-6.4 1.6-9.4 0-2.5-1.3-3.3-4.6-1.9-7.6Z"/>' + EYES(12.4) + '<path d="M11.4 14.6h1.2l-.6.7Z"/>' },
  { id: 'other', label: 'Other', art: '<path d="M12 12.4c-2.6 0-5 2.6-5 4.8 0 1.6 1.3 2.4 2.6 2.1 1-.2 1.6-.5 2.4-.5s1.4.3 2.4.5c1.3.3 2.6-.5 2.6-2.1 0-2.2-2.4-4.8-5-4.8Z"/><ellipse cx="6.2" cy="10" rx="1.6" ry="2"/><ellipse cx="9.6" cy="6.4" rx="1.6" ry="2.1"/><ellipse cx="14.4" cy="6.4" rx="1.6" ry="2.1"/><ellipse cx="17.8" cy="10" rx="1.6" ry="2"/>' },
];
const petArt = (type, size = 24) => svg((PETS.find(p => p.id === type) || PETS[PETS.length - 1]).art, size);

const TABS = [
  { id: 'money', label: 'Money' },
  { id: 'bills', label: 'Bills' },
  { id: 'shop', label: 'To buy' },
  { id: 'contract', label: 'Contract' },
];
// What the big + button adds, depending on the open tab
const FAB_ACTION = { money: 'add-expense', bills: 'add-bill', shop: 'add-item', contract: 'add-expense' };

// ================================================================
//  State
// ================================================================
const store = createStore();
let S = null;                       // latest data snapshot
let tab = localStorage.getItem('ourhome-tab') || 'money';
let showArrived = false;
let shopView = localStorage.getItem('ourhome-shopview') || null;   // null = overview, 'home', or a list id
const app = document.getElementById('app');

// ================================================================
//  Helpers
// ================================================================
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '₪' + (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toLocaleDateString('en-CA');
const monthKey = d => (d || '').slice(0, 7);
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDate = s => s ? parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const fmtDateLong = s => s ? parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtMonth = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); };
const toISO = d => d.toLocaleDateString('en-CA');
const addMonths = (s, n) => { const d = parseDate(s); return toISO(new Date(d.getFullYear(), d.getMonth() + n, d.getDate())); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return toISO(d); };
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function cfg() {
  const s = (S && S.settings) || {};
  return {
    ...DEFAULTS, ...s,
    color: DEFAULTS.color,                      // fixed palette
    names: { ...DEFAULTS.names, ...(s.names || {}) },
    pets: Array.isArray(s.pets) ? s.pets : DEFAULTS.pets,
  };
}
const nm = p => cfg().names[p] || p;
const cat = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[3];

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 2600);
}

function applyTheme() {
  const c = cfg().color;
  document.querySelector('meta[name=theme-color]').setAttribute('content', c);
  document.title = cfg().houseName;
}

// ================================================================
//  Calculations
// ================================================================
function balance() {
  // netA > 0  → Daniel (b) owes Merona (a).  netA < 0 → a owes b.
  let netA = 0;
  const paid = { a: 0, b: 0 };
  for (const e of S.expenses) {
    const amt = +e.amount || 0;
    if (e.type === 'transfer') {
      netA += e.from === 'a' ? amt : -amt;
      continue;
    }
    paid[e.paidBy] = (paid[e.paidBy] || 0) + amt;
    const shareA = amt * (e.splitA ?? 50) / 100;
    netA += (e.paidBy === 'a' ? amt : 0) - shareA;
  }
  netA = Math.round(netA * 100) / 100;
  return { netA, paid };
}

function billStatus(b) {
  const now = today();
  const thisMonth = monthKey(now);
  if (b.lastPaid && monthKey(b.lastPaid) === thisMonth) return { state: 'paid', label: 'Paid ' + fmtDate(b.lastPaid) };
  if (!b.lastPaid) return { state: 'due', label: 'Due' };
  const next = addMonths(b.lastPaid, b.freq || 1);
  if (monthKey(next) < thisMonth) return { state: 'due', late: true, label: 'Overdue' };
  if (monthKey(next) <= thisMonth) return { state: 'due', label: 'Due' };
  return { state: 'later', label: 'Next: ' + parseDate(next).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
}

function contractInfo() {
  const c = cfg().contract;
  if (!c || !c.end) return null;
  const notice = +c.noticeDays || 60;
  const deadline = addDays(c.end, -notice);       // last day to tell the landlord
  const reminder = addDays(deadline, -30);         // one month before that
  const t = today();
  return {
    ...c, notice, deadline, reminder,
    daysToEnd: daysBetween(t, c.end),
    daysToDeadline: daysBetween(t, deadline),
    remindNow: t >= reminder && t <= deadline,
  };
}

// ================================================================
//  Rendering
// ================================================================
function render() {
  if (!S) return;
  applyTheme();
  const c = cfg();
  const body = { money: renderMoney, bills: renderBills, shop: renderShop, contract: renderContract }[tab]();
  const ci = contractInfo();
  const banners = [];
  if (store.mode === 'local') {
    banners.push(`<div class="banner"><b>Demo mode:</b> data is saved only on this phone. Once shared sync is set up, you and ${esc(c.names.b)} will see the same data.</div>`);
  }
  if (ci && ci.remindNow && tab !== 'contract') {
    banners.push(`<div class="banner alert">📄 <b>Contract reminder:</b> tell the landlord by <b>${fmtDateLong(ci.deadline)}</b> if you're renewing or leaving (${ci.daysToDeadline} days left).</div>`);
  }
  const qa = document.activeElement && document.activeElement.closest && document.activeElement.closest('#quick-add') ? document.activeElement.value : null;
  app.innerHTML = `
    <header>
      <div>
        <h1>${esc(c.houseName)}</h1>
        <div class="who"><span>${esc(c.names.a)}</span><span>${esc(c.names.b)}</span>${c.pets.map(p => `<span class="pet">${petArt(p.type, 16)}${esc(p.name)}</span>`).join('')}</div>
      </div>
      <button class="gear" data-act="settings" aria-label="Settings"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
    </header>
    <main>${banners.join('')}${body}</main>
    <nav class="tabs">
      ${TABS.slice(0, 2).map(tabBtn).join('')}
      <div class="fab-slot"><button class="fab" data-act="${fabAction()}" aria-label="Add">${svg(ICONS.plus, 30)}</button></div>
      ${TABS.slice(2).map(tabBtn).join('')}
    </nav>`;
  if (qa !== null) { const q = app.querySelector('#quick-add input'); if (q) { q.value = qa; q.focus(); } }
}

function fabAction() {
  if (tab !== 'shop') return FAB_ACTION[tab];
  const L = currentList();
  if (!L) return 'shop-add';
  return L.kind === 'grocery' ? 'quick-focus' : 'add-item';
}

function tabBtn(t) {
  return `<button data-act="tab" data-id="${t.id}" class="${t.id === tab ? 'on' : ''}">${svg(ICONS[t.id])}<span>${t.label}</span></button>`;
}

// ---------------- Money ----------------
function renderMoney() {
  const { netA, paid } = balance();
  let hero;
  if (Math.abs(netA) < 0.01) {
    hero = `<div class="card hero even"><div class="big">All even 🎉</div><div class="sub">Nobody owes anybody</div></div>`;
  } else {
    const to = netA > 0 ? 'a' : 'b';
    const from = netA > 0 ? 'b' : 'a';
    hero = `<div class="card hero">
      <div class="label">${esc(nm(to))} is owed</div>
      <div class="big">${money(Math.abs(netA))}</div>
      <div class="sub">${esc(nm(from))} pays ${esc(nm(to))}</div>
      <div class="btn-row"><button class="btn ghost" data-act="settle">✓ We settled with a transfer</button></div>
    </div>`;
  }

  const sorted = [...S.expenses].sort((x, y) => (y.date || '').localeCompare(x.date || '') || (y.createdAt || 0) - (x.createdAt || 0));
  const groups = {};
  for (const e of sorted) (groups[monthKey(e.date)] ||= []).push(e);

  const list = Object.keys(groups).length ? Object.entries(groups).map(([k, items]) => {
    const total = items.filter(e => e.type !== 'transfer').reduce((s, e) => s + (+e.amount || 0), 0);
    return `<div class="month"><span>${fmtMonth(k)}</span><span>${money(total)}</span></div>
      <div class="list">${items.map(expenseRow).join('')}</div>`;
  }).join('') : `<div class="empty">No expenses yet.<br>Tap the <b>+</b> button below to add one.</div>`;

  return `
    ${hero}
    <div class="card">
      <h2>Paid so far</h2>
      <div class="split2">
        <div class="stat"><div class="n">${money(paid.a)}</div><div class="t">${esc(nm('a'))}</div></div>
        <div class="stat"><div class="n">${money(paid.b)}</div><div class="t">${esc(nm('b'))}</div></div>
      </div>
    </div>
    ${list}`;
}

function splitLabel(e) {
  const a = e.splitA ?? 50;
  if (a === 50) return 'split half-half';
  if (a === 100) return `${nm('a')}'s only`;
  if (a === 0) return `${nm('b')}'s only`;
  return `${nm('a')} ${a}% · ${nm('b')} ${100 - a}%`;
}

function expenseRow(e) {
  if (e.type === 'transfer') {
    return `<button class="row transfer" data-act="edit-expense" data-id="${e.id}">
      <span class="ico">↔️</span>
      <span class="main"><div class="title">Transfer</div><div class="meta">${esc(nm(e.from))} → ${esc(nm(e.to))} · ${fmtDate(e.date)}</div></span>
      <span class="amt">${money(e.amount)}</span></button>`;
  }
  const c = cat(e.category);
  return `<button class="row" data-act="edit-expense" data-id="${e.id}">
    <span class="ico">${c.icon}</span>
    <span class="main"><div class="title">${esc(e.note || c.label)}</div>
      <div class="meta">${esc(nm(e.paidBy))} paid · ${fmtDate(e.date)} · ${esc(splitLabel(e))}</div></span>
    <span class="amt">${money(e.amount)}</span></button>`;
}

// ---------------- Bills ----------------
function renderBills() {
  const bills = [...S.bills].sort((x, y) => (x.order ?? 99) - (y.order ?? 99) || (x.createdAt || 0) - (y.createdAt || 0));
  const st = bills.map(b => ({ b, s: billStatus(b) }));
  const paidN = st.filter(x => x.s.state === 'paid').length;
  const dueN = st.filter(x => x.s.state === 'due').length;
  const totalN = paidN + dueN;
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  const hero = totalN === 0
    ? `<div class="card hero even"><div class="big">Nothing due</div><div class="sub">No bills due in ${monthName}</div></div>`
    : `<div class="card hero ${paidN === totalN ? 'even' : ''}">
        <div class="label">Paid in ${monthName}</div>
        <div class="big">${paidN} of ${totalN}</div>
        <div class="sub">${paidN === totalN ? 'All done this month 🎉' : `${dueN} still to pay`}</div>
      </div>`;

  const rows = st.map(({ b, s }) => `
    <div class="bill-row">
      <button class="open" data-act="edit-bill" data-id="${b.id}">
        <span class="ico" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:21px;background:var(--c-soft);flex:none">${b.icon || '🧾'}</span>
        <span class="main" style="min-width:0">
          <div class="title" style="font-weight:600">${esc(b.name)}</div>
          <div class="meta" style="font-size:14px;color:var(--muted)">
            ${b.amount ? '~' + money(b.amount) + ' · ' : ''}${esc(FREQS.find(f => f.v === +b.freq)?.label || '')} · ${b.owner === 'shared' ? 'shared' : esc(nm(b.owner))}
          </div>
          <span class="pill ${s.state === 'paid' ? 'ok' : s.late ? 'late' : s.state === 'due' ? 'due' : ''}">${esc(s.label)}</span>
        </span>
      </button>
      ${s.state === 'paid'
        ? `<button class="paid-btn done" data-act="pay-bill" data-id="${b.id}">✓ Paid</button>`
        : `<button class="paid-btn" data-act="pay-bill" data-id="${b.id}">I paid</button>`}
    </div>`).join('');

  return `${hero}
    <div class="list">${rows || '<div class="empty">No bills yet</div>'}</div>
    <div class="empty" style="padding:14px">Tap <b>+</b> to add another bill</div>`;
}

// ---------------- Shopping ----------------
const listOf = i => i.listId || 'home';
const HOME_LIST = { id: 'home', kind: 'home', name: 'Home' };

function currentList() {
  if (!shopView) return null;
  if (shopView === 'home') return HOME_LIST;
  return S.lists.find(l => l.id === shopView) || null;
}
function setShopView(v) {
  shopView = v;
  if (v) localStorage.setItem('ourhome-shopview', v); else localStorage.removeItem('ourhome-shopview');
  render(); window.scrollTo(0, 0);
}
function listStats(id) {
  const items = S.items.filter(i => listOf(i) === id);
  const pending = items.filter(i => !i.arrived);
  const spent = items.reduce((s, i) => s + (+(i.expenseId && S.expenses.find(e => e.id === i.expenseId)?.amount) || 0), 0);
  return {
    total: items.length, pending: pending.length, done: items.length - pending.length,
    approx: pending.reduce((s, i) => s + (+i.approx || 0), 0), spent,
  };
}
const sortedLists = kind => S.lists.filter(l => l.kind === kind).sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0));

function renderShop() {
  const L = currentList();
  if (!L) { shopView = null; return renderShopOverview(); }
  return L.kind === 'grocery' ? renderGrocery(L) : renderItemList(L);
}

function listCard(id, icon, title, meta, progress = null) {
  return `<button class="list-card" data-act="open-list" data-id="${id}">
    <span class="ico">${svg(ICONS[icon])}</span>
    <span class="main"><div class="title">${esc(title)}</div><div class="meta">${meta}</div>
      ${progress !== null ? `<div class="bar"><span style="width:${Math.round(progress * 100)}%"></span></div>` : ''}</span>
    <span class="chev">${svg(ICONS.chevron, 20)}</span></button>`;
}

function renderShopOverview() {
  const h = listStats('home');
  const projects = sortedLists('project');
  const groceries = sortedLists('grocery');
  return `
    <div class="list">${listCard('home', 'home', 'Home', h.pending ? `${h.pending} still needed${h.approx ? ' · ~' + money(h.approx) : ''}` : 'Nothing needed right now')}</div>

    <div class="month"><span>Projects</span><button class="link" data-act="new-list" data-id="project">+ New</button></div>
    ${projects.length ? `<div class="list">${projects.map(p => {
      const st = listStats(p.id);
      const meta = st.total ? `${st.done} of ${st.total} done${st.spent ? ' · ' + money(st.spent) + ' spent' : ''}${st.approx ? ' · ~' + money(st.approx) + ' to go' : ''}` : 'No items yet';
      return listCard(p.id, 'project', p.name, esc(meta), st.total ? st.done / st.total : 0);
    }).join('')}</div>` : `<button class="empty-card" data-act="new-list" data-id="project">A project groups everything for one job, like <i>“Balcony makeover”</i> or <i>“Cats' corner”</i>.<br><b>Tap to start one</b></button>`}

    <div class="month"><span>Grocery lists</span><button class="link" data-act="new-list" data-id="grocery">+ New</button></div>
    ${groceries.length ? `<div class="list">${groceries.map(g => {
      const st = listStats(g.id);
      return listCard(g.id, 'cart', g.name, st.pending ? `${st.pending} to get` : (st.total ? 'All in the cart ✓' : 'Empty'));
    }).join('')}</div>` : `<button class="empty-card" data-act="new-list" data-id="grocery">A quick list for the supermarket. Tick things off in the store, then add the receipt total in one go.<br><b>Tap to start one</b></button>`}`;
}

function listHead(L) {
  return `<div class="list-head">
    <button class="back" data-act="shop-back">${svg(ICONS.back, 22)}<span>To buy</span></button>
    ${L.id !== 'home' ? `<button class="icon-btn" data-act="edit-list" data-id="${L.id}" aria-label="Edit list">${svg(ICONS.edit, 20)}</button>` : ''}
  </div>
  <h2 class="list-title">${esc(L.name)}</h2>`;
}

function itemRow(i) {
  const src = SOURCES.find(s => s.id === i.source) || SOURCES[0];
  const who = i.owner === 'both' ? 'Both' : nm(i.owner);
  const bits = [src.label, who];
  if (i.approx) bits.push('~' + money(i.approx));
  if (i.arrived) bits.push('arrived ' + fmtDate(i.arrivedAt));
  else if (i.eta) bits.push('arrives ' + fmtDate(i.eta));
  return `<div class="row ${i.arrived ? 'done' : ''}" style="padding:10px 16px">
    <button class="check ${i.arrived ? 'on' : ''}" data-act="toggle-item" data-id="${i.id}" aria-label="Arrived">${i.arrived ? '✓' : ''}</button>
    <button class="main" style="text-align:left" data-act="edit-item" data-id="${i.id}">
      <div class="title">${esc(i.name)}</div>
      <div class="meta">${esc(bits.join(' · '))}</div>
    </button>
  </div>`;
}

function renderItemList(L) {
  const items = S.items.filter(i => listOf(i) === L.id);
  const pending = items.filter(i => !i.arrived).sort((x, y) => (x.eta || '9999').localeCompare(y.eta || '9999') || (x.createdAt || 0) - (y.createdAt || 0));
  const arrived = items.filter(i => i.arrived).sort((x, y) => (y.arrivedAt || '').localeCompare(x.arrivedAt || ''));
  const st = listStats(L.id);
  const summary = L.kind === 'project' && st.total ? `<div class="card">
      <div class="split2">
        <div class="stat"><div class="n">${st.done} / ${st.total}</div><div class="t">done</div></div>
        <div class="stat"><div class="n">${money(st.spent)}</div><div class="t">spent${st.approx ? ` · ~${money(st.approx)} to go` : ''}</div></div>
      </div>
      <div class="bar" style="margin-top:12px"><span style="width:${Math.round(st.done / st.total * 100)}%"></span></div>
    </div>` : '';
  return `${listHead(L)}${summary}
    ${pending.length ? `<div class="month"><span>Still need (${pending.length})</span><span>${st.approx ? '~' + money(st.approx) : ''}</span></div>
      <div class="list">${pending.map(itemRow).join('')}</div>`
      : `<div class="empty">${items.length ? 'Everything is here 🎉' : 'Nothing here yet.'}<br>Tap <b>+</b> to add something.</div>`}
    ${arrived.length ? `<div class="month"><button class="link" data-act="toggle-arrived">${showArrived ? '▾' : '▸'} Arrived (${arrived.length})</button></div>
      ${showArrived ? `<div class="list">${arrived.map(itemRow).join('')}</div>` : ''}` : ''}`;
}

function renderGrocery(L) {
  const items = S.items.filter(i => listOf(i) === L.id).sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0));
  const toGet = items.filter(i => !i.arrived);
  const got = items.filter(i => i.arrived);
  const row = i => `<div class="row ${i.arrived ? 'done' : ''}" style="padding:8px 16px;min-height:56px">
    <button class="check ${i.arrived ? 'on' : ''}" data-act="toggle-item" data-id="${i.id}" aria-label="Got it">${i.arrived ? '✓' : ''}</button>
    <button class="main" style="text-align:left" data-act="edit-grocery" data-id="${i.id}">
      <div class="title">${esc(i.name)}${i.qty ? ` <span class="qty">${esc(i.qty)}</span>` : ''}</div>
    </button></div>`;
  return `${listHead(L)}
    <form id="quick-add" class="quick-add" autocomplete="off">
      <input name="q" placeholder="Add an item, e.g. Milk" enterkeyhint="done">
      <button type="submit" aria-label="Add">${svg(ICONS.plus, 22)}</button>
    </form>
    ${toGet.length ? `<div class="list">${toGet.map(row).join('')}</div>` : `<div class="empty">${items.length ? 'Everything is in the cart 🎉' : 'Type above to add things.'}</div>`}
    ${got.length ? `<div class="month"><span>In the cart (${got.length})</span></div>
      <div class="list">${got.map(row).join('')}</div>
      <div class="btn-row"><button class="btn" data-act="done-shopping" data-id="${L.id}">Done shopping</button></div>` : ''}`;
}

// ---------------- Contract ----------------
function renderContract() {
  const ci = contractInfo();
  const c = cfg().contract || {};
  if (!ci && !c.start && !c.deposit) {
    return `<div class="card hero">
        <div class="big" style="font-size:40px">📄</div>
        <div class="label">No contract details yet</div>
        <div class="sub">Add your lease dates and deposit, and the app will remind you a month before you need to tell the landlord.</div>
      </div>
      <button class="btn big" data-act="edit-contract">Add contract details</button>`;
  }
  const depositType = { cash: 'Cash', check: 'Check', guarantee: 'Bank guarantee', other: 'Other' }[c.depositType] || '';
  return `
    ${ci ? `<div class="card hero ${ci.remindNow ? '' : 'even'}">
      <div class="label">${ci.daysToDeadline >= 0 ? 'Tell the landlord by' : 'Notice deadline passed'}</div>
      <div class="big" style="font-size:30px">${fmtDateLong(ci.deadline)}</div>
      <div class="sub">${ci.daysToDeadline >= 0 ? `${ci.daysToDeadline} days left · renewing or leaving` : `Lease ends ${fmtDateLong(ci.end)}`}</div>
    </div>` : ''}
    <div class="card">
      <h2>Lease</h2>
      <dl class="facts">
        <dt>Start</dt><dd>${fmtDateLong(c.start)}</dd>
        <dt>End</dt><dd>${fmtDateLong(c.end)}${ci && ci.daysToEnd >= 0 ? ` <span class="pill">${ci.daysToEnd} days</span>` : ''}</dd>
        <dt>Notice needed</dt><dd>${ci ? ci.notice + ' days' : '—'}</dd>
        <dt>Reminder on</dt><dd>${ci ? fmtDateLong(ci.reminder) : '—'}</dd>
        ${c.rent ? `<dt>Rent</dt><dd>${money(c.rent)} / month</dd>` : ''}
      </dl>
    </div>
    <div class="card">
      <h2>Deposit</h2>
      <dl class="facts">
        <dt>Amount</dt><dd>${c.deposit ? money(c.deposit) : '—'}</dd>
        <dt>Type</dt><dd>${esc(depositType) || '—'}</dd>
      </dl>
      ${c.notes ? `<p style="margin:14px 0 0;color:var(--muted);white-space:pre-wrap">${esc(c.notes)}</p>` : ''}
    </div>
    ${ci ? `<button class="btn ghost big" data-act="ics">📅 Add reminder to my phone's calendar</button>` : ''}
    <button class="btn light" data-act="edit-contract">Edit contract details</button>`;
}

// ================================================================
//  Bottom sheet (forms)
// ================================================================
const sheet = document.getElementById('sheet');
const backdrop = document.getElementById('sheet-backdrop');
let sheetHandlers = {};
let sheetHandlersFor = null;   // optional hook for chips with dynamic names

function openSheet(html, handlers = {}) {
  sheetHandlers = handlers;
  sheet.innerHTML = `<div class="grab-zone"><div class="grab"></div></div>${html}`;
  sheet.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  sheet.scrollTop = 0;
  const first = sheet.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 250);
}
function closeSheet() {
  sheet.classList.add('hidden');
  backdrop.classList.add('hidden');
  sheet.innerHTML = '';
  sheet.style.transform = ''; sheet.style.transition = '';
  backdrop.style.opacity = ''; backdrop.style.transition = '';
  sheetHandlers = {};
  sheetHandlersFor = null;
}
backdrop.addEventListener('click', closeSheet);

const chips = (field, options, selected) =>
  `<div class="chips" data-field="${field}">${options.map(o =>
    `<button type="button" data-v="${esc(o.v)}" class="${String(o.v) === String(selected) ? 'on' : ''}">${o.label}</button>`).join('')}</div>`;
const chipVal = field => sheet.querySelector(`.chips[data-field="${field}"] .on`)?.dataset.v;
const val = name => sheet.querySelector(`[name="${name}"]`)?.value.trim();
const num = name => { const v = parseFloat((val(name) || '').replace(',', '.')); return isNaN(v) ? 0 : v; };

sheet.addEventListener('click', e => {
  const chip = e.target.closest('.chips button');
  if (chip) {
    chip.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('on'));
    chip.classList.add('on');
    const field = chip.parentElement.dataset.field;
    const h = sheetHandlers['chip:' + field];
    if (h) h(chip.dataset.v);
    if (sheetHandlersFor) sheetHandlersFor(field, chip.dataset.v);
    return;
  }
  const btn = e.target.closest('[data-sheet]');
  if (btn) {
    const h = sheetHandlers[btn.dataset.sheet];
    if (btn.dataset.sheet === 'close') return closeSheet();
    if (h) h(btn);
  }
});
sheet.addEventListener('submit', e => e.preventDefault());
sheet.addEventListener('change', e => {
  const sel = e.target.closest('select[name^="pettype-"]');
  if (sel) sheet.querySelector(`.pet-edit[data-i="${sel.dataset.i}"] .pet-art`).innerHTML = petArt(sel.value, 30);
});

// Swipe the sheet down to close it (from the handle, or from anywhere when scrolled to the top)
let drag = null;
sheet.addEventListener('touchstart', e => {
  if (e.target.closest('input, textarea, select')) return;
  const onHandle = !!e.target.closest('.grab-zone');
  if (!onHandle && sheet.scrollTop > 0) return;
  drag = { y: e.touches[0].clientY, dy: 0, onHandle };
  sheet.style.transition = 'none';
}, { passive: true });
sheet.addEventListener('touchmove', e => {
  if (!drag) return;
  drag.dy = e.touches[0].clientY - drag.y;
  if (drag.dy <= 0) {
    if (!drag.onHandle) { drag = null; sheet.style.transform = ''; return; }   // let it scroll normally
    drag.dy = 0;
  }
  if (e.cancelable) e.preventDefault();
  sheet.style.transform = `translateY(${drag.dy}px)`;
  backdrop.style.opacity = String(Math.max(0, 1 - drag.dy / 400));
}, { passive: false });
const endDrag = () => {
  if (!drag) return;
  const close = drag.dy > 90;
  drag = null;
  sheet.style.transition = 'transform .2s ease-out';
  backdrop.style.transition = 'opacity .2s ease-out';
  if (close) {
    sheet.style.transform = 'translateY(100%)';
    backdrop.style.opacity = '0';
    setTimeout(closeSheet, 190);
  } else {
    sheet.style.transform = '';
    backdrop.style.opacity = '';
  }
};
sheet.addEventListener('touchend', endDrag);
sheet.addEventListener('touchcancel', endDrag);

const people = () => [{ v: 'a', label: esc(nm('a')) }, { v: 'b', label: esc(nm('b')) }];

// ---------------- Expense form ----------------
function splitChoice(a) { return a === 50 ? '50' : a === 100 ? 'a' : a === 0 ? 'b' : 'custom'; }

function expenseForm(e = null) {
  if (e && e.type === 'transfer') return transferForm(e);
  const x = e || { amount: '', category: 'groceries', paidBy: localStorage.getItem('ourhome-me') || 'a', date: today(), splitA: 50, note: '' };
  const sc = splitChoice(x.splitA ?? 50);
  openSheet(`
    <h3>${e ? 'Edit expense' : 'Add expense'}</h3>
    <div class="field"><label>How much? (₪)</label>
      <input class="amount" name="amount" inputmode="decimal" placeholder="0" value="${esc(x.amount)}" ${e ? '' : 'autofocus'}></div>
    <div class="field"><span class="lbl">What for?</span>
      ${chips('category', CATEGORIES.map(c => ({ v: c.id, label: c.icon + ' ' + c.label })), x.category)}
      <input name="note" placeholder="Details (optional)" value="${esc(x.note)}" style="margin-top:10px"></div>
    <div class="field"><span class="lbl">Who paid?</span>${chips('paidBy', people(), x.paidBy)}</div>
    <div class="field"><label>When?</label><input type="date" name="date" value="${esc(x.date)}"></div>
    <div class="field"><span class="lbl">How do we split it?</span>
      ${chips('split', [{ v: '50', label: 'Half-half' }, { v: 'a', label: `Only ${esc(nm('a'))}'s` }, { v: 'b', label: `Only ${esc(nm('b'))}'s` }, { v: 'custom', label: 'Other…' }], sc)}
      <div id="custom-split" class="${sc === 'custom' ? '' : 'hidden'}" style="margin-top:10px">
        <input name="splitA" inputmode="numeric" value="${sc === 'custom' ? x.splitA : 50}" placeholder="%">
        <div class="hint">${esc(nm('a'))}'s share in % (the rest is ${esc(nm('b'))}'s)</div>
      </div></div>
    <button class="btn" data-sheet="save">${e ? 'Save changes' : 'Add expense'}</button>
    ${e ? `<div class="btn-row"><button class="btn danger" data-sheet="delete">Delete</button><button class="btn light" data-sheet="close">Cancel</button></div>` : ''}
  `, {
    'chip:split': v => sheet.querySelector('#custom-split').classList.toggle('hidden', v !== 'custom'),
    save: () => {
      const amount = num('amount');
      if (amount <= 0) return toast('Please enter an amount');
      const split = chipVal('split');
      let splitA = split === 'a' ? 100 : split === 'b' ? 0 : 50;
      if (split === 'custom') splitA = Math.min(100, Math.max(0, num('splitA')));
      const paidBy = chipVal('paidBy');
      localStorage.setItem('ourhome-me', paidBy);
      const data = { amount, category: chipVal('category'), note: val('note'), paidBy, date: val('date') || today(), splitA };
      if (e) store.update('expenses', e.id, data); else store.add('expenses', data);
      closeSheet();
      toast(e ? 'Saved' : 'Expense added');
    },
    delete: () => {
      if (!confirm('Delete this expense?')) return;
      deleteExpense(e);
      closeSheet();
      toast('Deleted');
    },
  });
}

function deleteExpense(e) {
  store.remove('expenses', e.id);
  // If it came from a bill, put the bill's "last paid" back.
  if (e.billId && S.bills.find(b => b.id === e.billId)?.lastPaid === e.date) {
    store.update('bills', e.billId, { lastPaid: e.prevLastPaid || null });
  }
  // If it came from the shopping list, unlink it.
  const item = S.items.find(i => i.expenseId === e.id);
  if (item) store.update('items', item.id, { expenseId: null });
}

function transferForm(e) {
  openSheet(`
    <h3>Transfer</h3>
    <div class="field"><label>Amount (₪)</label><input class="amount" name="amount" inputmode="decimal" value="${esc(e.amount)}"></div>
    <div class="field"><span class="lbl">Who sent it?</span>${chips('from', people(), e.from)}</div>
    <div class="field"><label>When?</label><input type="date" name="date" value="${esc(e.date)}"></div>
    <button class="btn" data-sheet="save">Save changes</button>
    <div class="btn-row"><button class="btn danger" data-sheet="delete">Delete</button><button class="btn light" data-sheet="close">Cancel</button></div>
  `, {
    save: () => {
      const amount = num('amount');
      if (amount <= 0) return toast('Please enter an amount');
      const from = chipVal('from');
      store.update('expenses', e.id, { amount, from, to: from === 'a' ? 'b' : 'a', date: val('date') || today() });
      closeSheet(); toast('Saved');
    },
    delete: () => { if (confirm('Delete this transfer?')) { store.remove('expenses', e.id); closeSheet(); toast('Deleted'); } },
  });
}

function settleForm() {
  const { netA } = balance();
  if (Math.abs(netA) < 0.01) return;
  const from = netA > 0 ? 'b' : 'a';
  const to = netA > 0 ? 'a' : 'b';
  openSheet(`
    <h3>Settle up</h3>
    <p style="margin-top:0;color:var(--muted)">${esc(nm(from))} transferred to ${esc(nm(to))}:</p>
    <div class="field"><input class="amount" name="amount" inputmode="decimal" value="${Math.abs(netA)}"></div>
    <div class="field"><label>When?</label><input type="date" name="date" value="${today()}"></div>
    <button class="btn" data-sheet="save">✓ Yes, we're even</button>
    <div class="btn-row"><button class="btn light" data-sheet="close">Cancel</button></div>
  `, {
    save: () => {
      const amount = num('amount');
      if (amount <= 0) return toast('Please enter an amount');
      store.add('expenses', { type: 'transfer', amount, from, to, date: val('date') || today() });
      closeSheet(); toast('Settled 🎉');
    },
  });
}

// ---------------- Bill forms ----------------
function payBillForm(b) {
  const s = billStatus(b);
  const defaultPayer = b.owner === 'a' || b.owner === 'b' ? b.owner : (localStorage.getItem('ourhome-me') || 'a');
  openSheet(`
    <h3>${b.icon || '🧾'} ${esc(b.name)}</h3>
    ${s.state === 'paid' ? `<div class="banner">Already marked paid this month (${fmtDate(b.lastPaid)}). Paying again adds another expense.</div>` : ''}
    <div class="field"><label>Amount paid (₪)</label>
      <input class="amount" name="amount" inputmode="decimal" placeholder="0" value="${b.amount || ''}" autofocus></div>
    <div class="field"><span class="lbl">Who paid?</span>${chips('paidBy', people(), defaultPayer)}</div>
    <div class="field"><label>When?</label><input type="date" name="date" value="${today()}"></div>
    <button class="btn" data-sheet="save">✓ Paid — add to expenses</button>
    <div class="btn-row"><button class="btn light" data-sheet="close">Cancel</button></div>
  `, {
    save: () => {
      const amount = num('amount');
      if (amount <= 0) return toast('Please enter an amount');
      const date = val('date') || today();
      const splitA = b.owner === 'a' ? 100 : b.owner === 'b' ? 0 : 50;
      store.add('expenses', clean({ amount, category: 'bills', note: b.name, paidBy: chipVal('paidBy'), date, splitA, billId: b.id, prevLastPaid: b.lastPaid || null }));
      store.update('bills', b.id, { lastPaid: !b.lastPaid || date > b.lastPaid ? date : b.lastPaid, amount: b.amount || amount });
      closeSheet(); toast(b.name + ' paid ✓');
    },
  });
}

function billForm(b = null) {
  const x = b || { name: '', freq: 1, amount: '', owner: 'shared', icon: '🧾' };
  openSheet(`
    <h3>${b ? 'Edit bill' : 'New bill'}</h3>
    <div class="field"><label>Name</label><input name="name" value="${esc(x.name)}" placeholder="e.g. Netflix, Insurance" ${b ? '' : 'autofocus'}></div>
    <div class="field"><span class="lbl">How often?</span>${chips('freq', FREQS.map(f => ({ v: f.v, label: f.label })), x.freq)}</div>
    <div class="field"><label>About how much? (₪)</label><input name="amount" inputmode="decimal" value="${esc(x.amount || '')}" placeholder="0"></div>
    <div class="field"><span class="lbl">Whose bill?</span>${chips('owner', [{ v: 'shared', label: 'Shared' }, ...people()], x.owner)}</div>
    ${b ? `<div class="field"><label>Last paid</label><input type="date" name="lastPaid" value="${esc(x.lastPaid || '')}"></div>` : ''}
    <button class="btn" data-sheet="save">${b ? 'Save' : 'Add bill'}</button>
    ${b ? `<div class="btn-row"><button class="btn danger" data-sheet="delete">Delete bill</button><button class="btn light" data-sheet="close">Cancel</button></div>` : ''}
  `, {
    save: () => {
      const name = val('name');
      if (!name) return toast('Please enter a name');
      const data = { name, freq: +chipVal('freq'), amount: num('amount'), owner: chipVal('owner') };
      if (b) { data.lastPaid = val('lastPaid') || null; store.update('bills', b.id, data); }
      else store.add('bills', { ...data, icon: '🧾', order: 50 + S.bills.length });
      closeSheet(); toast('Saved');
    },
    delete: () => { if (confirm(`Delete “${b.name}”? (Past expenses stay.)`)) { store.remove('bills', b.id); closeSheet(); } },
  });
}

// ---------------- Shopping forms ----------------
function shopChooser() {
  openSheet(`
    <h3>What would you like to add?</h3>
    <button class="choice" data-sheet="item">${svg(ICONS.home)}<span><b>Something for the home</b><small>A thing the house needs</small></span></button>
    <button class="choice" data-sheet="project">${svg(ICONS.project)}<span><b>New project</b><small>Group everything for one job</small></span></button>
    <button class="choice" data-sheet="grocery">${svg(ICONS.cart)}<span><b>New grocery list</b><small>A quick list for the supermarket</small></span></button>
  `, {
    item: () => itemForm(null, 'home'),
    project: () => listForm(null, 'project'),
    grocery: () => listForm(null, 'grocery'),
  });
}

function listForm(L = null, kind = L?.kind) {
  const word = kind === 'project' ? 'project' : 'grocery list';
  const n = L ? S.items.filter(i => listOf(i) === L.id).length : 0;
  openSheet(`
    <h3>${L ? 'Edit ' + word : 'New ' + word}</h3>
    <div class="field"><label>Name</label>
      <input name="name" value="${esc(L?.name || '')}" placeholder="${kind === 'project' ? 'e.g. Balcony makeover' : 'e.g. Weekly shop'}" ${L ? '' : 'autofocus'}></div>
    <button class="btn" data-sheet="save">${L ? 'Save' : 'Create'}</button>
    ${L ? `<div class="btn-row"><button class="btn danger" data-sheet="delete">Delete ${word}</button><button class="btn light" data-sheet="close">Cancel</button></div>` : ''}
  `, {
    save: async () => {
      const name = val('name');
      if (!name) return toast('Give it a name');
      if (L) { store.update('lists', L.id, { name }); closeSheet(); return toast('Saved'); }
      const id = await store.add('lists', { name, kind });
      closeSheet(); tab = 'shop'; localStorage.setItem('ourhome-tab', tab); setShopView(id);
    },
    delete: () => {
      if (!confirm(`Delete “${L.name}”${n ? ` and its ${n} item${n > 1 ? 's' : ''}` : ''}? Expenses already added stay.`)) return;
      S.items.filter(i => listOf(i) === L.id).forEach(i => store.remove('items', i.id));
      store.remove('lists', L.id);
      closeSheet(); setShopView(null);
    },
  });
}

function itemForm(i = null, listId = null) {
  const lid = i ? listOf(i) : (listId || (currentList()?.kind !== 'grocery' && currentList()?.id) || 'home');
  const x = i || { name: '', approx: '', owner: localStorage.getItem('ourhome-me') || 'a', source: 'buy', eta: '' };
  const projects = sortedLists('project');
  openSheet(`
    <h3>${i ? 'Edit item' : 'What do we need?'}</h3>
    <div class="field"><input name="name" value="${esc(x.name)}" placeholder="e.g. Sofa, cat tree, curtains" ${i ? '' : 'autofocus'}></div>
    ${projects.length ? `<div class="field"><span class="lbl">For</span>${chips('listId', [{ v: 'home', label: 'Home' }, ...projects.map(p => ({ v: p.id, label: esc(p.name) }))], lid)}</div>` : ''}
    <div class="field"><span class="lbl">Where from?</span>${chips('source', SOURCES.map(s => ({ v: s.id, label: s.label })), x.source)}</div>
    <div class="field"><span class="lbl">Who's on it?</span>${chips('owner', [...people(), { v: 'both', label: 'Both' }], x.owner)}</div>
    <div class="split2">
      <div class="field"><label>About how much? (₪)</label><input name="approx" inputmode="decimal" value="${esc(x.approx || '')}" placeholder="0"></div>
      <div class="field"><label>Arrives (optional)</label><input type="date" name="eta" value="${esc(x.eta || '')}"></div>
    </div>
    <button class="btn" data-sheet="save">${i ? 'Save' : 'Add to list'}</button>
    ${i ? `<div class="btn-row"><button class="btn danger" data-sheet="delete">Delete</button><button class="btn light" data-sheet="close">Cancel</button></div>` : ''}
  `, {
    save: () => {
      const name = val('name');
      if (!name) return toast('What do we need?');
      const chosen = chipVal('listId') || lid;
      const data = { name, source: chipVal('source'), owner: chipVal('owner'), approx: num('approx'), eta: val('eta') || null, listId: chosen === 'home' ? null : chosen };
      if (i) store.update('items', i.id, data); else store.add('items', { ...data, arrived: false });
      closeSheet(); toast(i ? 'Saved' : 'Added to the list');
    },
    delete: () => { if (confirm(`Delete “${i.name}”?`)) { store.remove('items', i.id); closeSheet(); } },
  });
}

function groceryForm(i) {
  openSheet(`
    <h3>Edit item</h3>
    <div class="field"><label>Item</label><input name="name" value="${esc(i.name)}"></div>
    <div class="field"><label>How many / how much (optional)</label><input name="qty" value="${esc(i.qty || '')}" placeholder="e.g. 2, 1 kg, a big one"></div>
    <button class="btn" data-sheet="save">Save</button>
    <div class="btn-row"><button class="btn danger" data-sheet="delete">Delete</button><button class="btn light" data-sheet="close">Cancel</button></div>
  `, {
    save: () => { const name = val('name'); if (!name) return toast('Type the item'); store.update('items', i.id, { name, qty: val('qty') || null }); closeSheet(); },
    delete: () => { store.remove('items', i.id); closeSheet(); },
  });
}

function doneShopping(L) {
  const got = S.items.filter(i => listOf(i) === L.id && i.arrived);
  openSheet(`
    <h3>Done shopping 🛒</h3>
    <p style="margin-top:0;color:var(--muted)">${got.length} item${got.length > 1 ? 's' : ''} in the cart. Add the receipt total to expenses?</p>
    <div class="field"><label>Receipt total (₪)</label><input class="amount" name="amount" inputmode="decimal" placeholder="0" autofocus></div>
    <div class="field"><span class="lbl">Who paid?</span>${chips('paidBy', people(), localStorage.getItem('ourhome-me') || 'a')}</div>
    <div class="field"><span class="lbl">Split</span>${chips('split', [{ v: '50', label: 'Half-half' }, { v: 'a', label: `Only ${esc(nm('a'))}'s` }, { v: 'b', label: `Only ${esc(nm('b'))}'s` }], '50')}</div>
    <button class="btn" data-sheet="save">Add to expenses & clear the cart</button>
    <div class="btn-row"><button class="btn light" data-sheet="clear">Just clear the cart</button></div>
  `, {
    save: () => {
      const amount = num('amount');
      if (amount <= 0) return toast('Enter the total, or tap “Just clear the cart”');
      const split = chipVal('split');
      store.add('expenses', { amount, category: 'groceries', note: L.name, paidBy: chipVal('paidBy'), date: today(), splitA: split === 'a' ? 100 : split === 'b' ? 0 : 50 });
      got.forEach(i => store.remove('items', i.id));
      closeSheet(); toast('Added to expenses ✓');
    },
    clear: () => { got.forEach(i => store.remove('items', i.id)); closeSheet(); },
  });
}

function toggleItem(i) {
  const L = listOf(i) === 'home' ? HOME_LIST : S.lists.find(l => l.id === i.listId);
  if (L && L.kind === 'grocery') {
    store.update('items', i.id, { arrived: !i.arrived });
    return;
  }
  if (i.arrived) {
    const linked = i.expenseId && S.expenses.find(e => e.id === i.expenseId);
    if (linked && !confirm(`Mark “${i.name}” as not arrived? Its expense (${money(linked.amount)}) will be removed.`)) return;
    if (linked) store.remove('expenses', linked.id);
    store.update('items', i.id, { arrived: false, arrivedAt: null, expenseId: null });
    return;
  }
  if (i.source === 'gift') {
    store.update('items', i.id, { arrived: true, arrivedAt: today() });
    return toast(`${i.name} arrived 🎁`);
  }
  const payer = i.owner === 'a' || i.owner === 'b' ? i.owner : (localStorage.getItem('ourhome-me') || 'a');
  openSheet(`
    <h3>🎉 ${esc(i.name)} arrived!</h3>
    <div class="field"><label>What did it cost? (₪)</label>
      <input class="amount" name="amount" inputmode="decimal" value="${i.approx || ''}" placeholder="0" autofocus></div>
    <div class="field"><span class="lbl">Who paid?</span>${chips('paidBy', people(), payer)}</div>
    <div class="field"><span class="lbl">Split</span>${chips('split', [{ v: '50', label: 'Half-half' }, { v: 'a', label: `Only ${esc(nm('a'))}'s` }, { v: 'b', label: `Only ${esc(nm('b'))}'s` }], '50')}</div>
    <button class="btn" data-sheet="save">✓ Add to expenses</button>
    <div class="btn-row"><button class="btn light" data-sheet="noexp">Arrived, no expense</button></div>
  `, {
    save: async () => {
      const amount = num('amount');
      if (amount <= 0) return toast('Enter the price, or tap “Arrived, no expense”');
      const split = chipVal('split');
      const note = L && L.kind === 'project' ? `${i.name} · ${L.name}` : i.name;
      const expenseId = await store.add('expenses', { amount, category: 'home', note, paidBy: chipVal('paidBy'), date: today(), splitA: split === 'a' ? 100 : split === 'b' ? 0 : 50 });
      store.update('items', i.id, { arrived: true, arrivedAt: today(), expenseId });
      closeSheet(); toast('Arrived & added to expenses ✓');
    },
    noexp: () => { store.update('items', i.id, { arrived: true, arrivedAt: today() }); closeSheet(); },
  });
}

// ---------------- Contract ----------------
function contractForm() {
  const c = cfg().contract || {};
  openSheet(`
    <h3>Contract details</h3>
    <div class="split2">
      <div class="field"><label>Start date</label><input type="date" name="start" value="${esc(c.start || '')}"></div>
      <div class="field"><label>End date</label><input type="date" name="end" value="${esc(c.end || '')}"></div>
    </div>
    <div class="field"><label>Notice needed before the end (days)</label>
      <input name="noticeDays" inputmode="numeric" value="${esc(c.noticeDays || 60)}">
      <div class="hint">How early you must tell the landlord if you're renewing or leaving (check the contract — often 60 or 90 days). You'll get a reminder one month before that.</div></div>
    <div class="field"><label>Monthly rent (₪, optional)</label><input name="rent" inputmode="decimal" value="${esc(c.rent || '')}"></div>
    <div class="field"><label>Deposit (₪)</label><input name="deposit" inputmode="decimal" value="${esc(c.deposit || '')}"></div>
    <div class="field"><span class="lbl">Deposit type</span>${chips('depositType', [{ v: 'cash', label: 'Cash' }, { v: 'check', label: 'Check' }, { v: 'guarantee', label: 'Bank guarantee' }, { v: 'other', label: 'Other' }], c.depositType || 'check')}</div>
    <div class="field"><label>Notes</label><textarea name="notes" placeholder="Landlord's phone, option to extend, etc.">${esc(c.notes || '')}</textarea></div>
    <button class="btn" data-sheet="save">Save</button>
    <div class="btn-row"><button class="btn light" data-sheet="close">Cancel</button></div>
  `, {
    save: () => {
      store.setSettings({ contract: { start: val('start') || null, end: val('end') || null, noticeDays: num('noticeDays') || 60, rent: num('rent'), deposit: num('deposit'), depositType: chipVal('depositType'), notes: val('notes') } });
      closeSheet(); toast('Saved');
    },
  });
}

function downloadICS() {
  const ci = contractInfo();
  if (!ci) return;
  const d = s => s.replace(/-/g, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Our Home//EN', 'BEGIN:VEVENT',
    `UID:ourhome-contract-${d(ci.deadline)}@ourhome`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${d(ci.reminder)}`, `DTEND;VALUE=DATE:${d(addDays(ci.reminder, 1))}`,
    `SUMMARY:🏠 Lease: decide on renewing or leaving`,
    `DESCRIPTION:Tell the landlord by ${fmtDateLong(ci.deadline)}. Lease ends ${fmtDateLong(ci.end)}.`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Lease reminder', 'TRIGGER:PT9H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'lease-reminder.ics';
  a.click();
}

// ---------------- Settings ----------------
function settingsForm() {
  const c = cfg();
  let pets = c.pets.map(p => ({ ...p }));

  const petRows = () => pets.map((p, i) => `
    <div class="pet-edit" data-i="${i}">
      <span class="pet-art">${petArt(p.type, 30)}</span>
      <div class="pet-fields">
        <input name="pet-${i}" value="${esc(p.name)}" placeholder="Pet's name">
        <div class="select-wrap"><select name="pettype-${i}" data-i="${i}" aria-label="What kind of pet">
          ${PETS.map(t => `<option value="${t.id}" ${t.id === p.type ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select></div>
      </div>
      <button type="button" class="icon-btn" data-sheet="remove-pet" data-i="${i}" aria-label="Remove">${svg(ICONS.close, 20)}</button>
    </div>`).join('');

  const readPets = () => pets.forEach((p, i) => {
    p.name = val('pet-' + i) || '';
    p.type = sheet.querySelector(`[name="pettype-${i}"]`)?.value || p.type;
  });
  const redrawPets = () => { sheet.querySelector('#pets').innerHTML = petRows(); };

  const handlers = {
    'add-pet': () => { readPets(); pets.push({ name: '', type: 'cat' }); redrawPets(); sheet.querySelector(`[name="pet-${pets.length - 1}"]`).focus(); },
    'remove-pet': btn => { readPets(); pets.splice(+btn.dataset.i, 1); redrawPets(); },
    save: () => {
      readPets();
      store.setSettings({
        houseName: val('houseName') || DEFAULTS.houseName,
        names: { a: val('nameA') || 'Person 1', b: val('nameB') || 'Person 2' },
        pets: pets.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), type: p.type })),
      });
      closeSheet(); toast('Saved');
    },
    backup: () => {
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...S }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `our-home-backup-${today()}.json`;
      a.click();
    },
    signout: () => { if (confirm('Sign out?')) { closeSheet(); store.signOut(); } },
  };

  openSheet(`
    <h3>Settings</h3>
    <div class="field"><label>Home name</label><input name="houseName" value="${esc(c.houseName)}"></div>
    <div class="split2">
      <div class="field"><label>Person 1</label><input name="nameA" value="${esc(c.names.a)}"></div>
      <div class="field"><label>Person 2</label><input name="nameB" value="${esc(c.names.b)}"></div>
    </div>
    <div class="field"><span class="lbl">Pets</span>
      <div id="pets">${petRows()}</div>
      <button type="button" class="btn ghost" data-sheet="add-pet" style="margin-top:8px">${svg(ICONS.plus, 20)} Add a pet</button>
    </div>
    <button class="btn" data-sheet="save">Save</button>
    <div class="btn-row"><button class="btn light" data-sheet="backup">Download a backup</button></div>
    ${store.mode === 'firebase' ? `<div class="btn-row"><button class="btn light" data-sheet="signout">Sign out (${esc(store.user?.email || '')})</button></div>` : ''}
    <div class="btn-row"><button class="btn light" data-sheet="close">Close</button></div>
  `, handlers);
}

// ================================================================
//  Main click handler
// ================================================================
app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !S) return;
  const id = el.dataset.id;
  const find = (col) => S[col].find(x => x.id === id);
  switch (el.dataset.act) {
    case 'tab':
      if (tab === 'shop' && id === 'shop' && shopView) return setShopView(null);   // tapping "To buy" again goes back to the overview
      tab = id; localStorage.setItem('ourhome-tab', tab); render(); window.scrollTo(0, 0); break;
    case 'shop-add': shopChooser(); break;
    case 'open-list': setShopView(id); break;
    case 'shop-back': setShopView(null); break;
    case 'new-list': listForm(null, id); break;
    case 'edit-list': listForm(find('lists')); break;
    case 'edit-grocery': groceryForm(find('items')); break;
    case 'done-shopping': doneShopping(find('lists')); break;
    case 'quick-focus': app.querySelector('#quick-add input')?.focus(); break;
    case 'settings': settingsForm(); break;
    case 'add-expense': expenseForm(); break;
    case 'edit-expense': expenseForm(find('expenses')); break;
    case 'settle': settleForm(); break;
    case 'pay-bill': payBillForm(find('bills')); break;
    case 'edit-bill': billForm(find('bills')); break;
    case 'add-bill': billForm(); break;
    case 'add-item': itemForm(); break;
    case 'edit-item': itemForm(find('items')); break;
    case 'toggle-item': toggleItem(find('items')); break;
    case 'toggle-arrived': showArrived = !showArrived; render(); break;
    case 'edit-contract': contractForm(); break;
    case 'ics': downloadICS(); break;
  }
});

app.addEventListener('submit', e => {
  if (e.target.id !== 'quick-add') return;
  e.preventDefault();
  const input = e.target.querySelector('input');
  const name = input.value.trim();
  const L = currentList();
  if (!name || !L) return;
  input.value = '';
  store.add('items', { name, listId: L.id, arrived: false });
});

// ================================================================
//  First run: add the standard bills
// ================================================================
let seeding = false;
function seedIfNeeded() {
  if (seeding || S.settings.seeded) return;
  seeding = true;
  store.setSettings({ seeded: true });
  if (S.bills.length === 0) DEFAULT_BILLS.forEach((b, i) => store.add('bills', { ...b, order: i }));
}

// ================================================================
//  Login screen (only when shared sync is on)
// ================================================================
function renderLogin(error = '') {
  app.innerHTML = `
    <div class="login">
      <img class="logo" src="icons/icon-192.png" alt="">
      <h1>${esc(DEFAULTS.houseName)}</h1>
      <p>Sign in to see your home's data</p>
      <form id="login">
        <div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required minlength="6"></div>
        ${error ? `<div class="err">${esc(error)}</div>` : ''}
        <button class="btn" data-mode="in">Sign in</button>
        <div class="btn-row"><button class="btn light" data-mode="up" type="button">First time? Create account</button></div>
        <div style="text-align:center;margin-top:10px"><button class="link" data-mode="reset" type="button">Forgot password</button></div>
      </form>
    </div>`;
  const form = document.getElementById('login');
  const go = async mode => {
    const email = form.email.value.trim(), password = form.password.value;
    try {
      if (mode === 'reset') { if (!email) return renderLogin('Type your email first'); await store.resetPassword(email); return toast('Reset email sent'); }
      if (!email || password.length < 6) return renderLogin('Enter your email and a password of at least 6 characters');
      app.querySelector('.login p').textContent = 'Signing in…';
      if (mode === 'up') await store.signUp(email, password); else await store.signIn(email, password);
    } catch (err) {
      const code = err.code || '';
      renderLogin(code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') ? 'Wrong email or password'
        : code.includes('email-already') ? 'This email already has an account — tap Sign in'
        : code.includes('weak-password') ? 'Password must be at least 6 characters'
        : 'Something went wrong: ' + (err.message || code));
    }
  };
  form.addEventListener('submit', e => { e.preventDefault(); go('in'); });
  form.querySelectorAll('[type=button]').forEach(b => b.addEventListener('click', () => go(b.dataset.mode)));
}

// ================================================================
//  Start
// ================================================================
store.onWriteError = err => toast('Could not save: ' + (err.code === 'permission-denied' ? 'this account is not allowed' : err.message));
store.onChange((snap, err) => {
  if (err) {
    app.innerHTML = `<div class="login"><h1>No access</h1><p>This account isn't allowed to open this home's data. Ask the person who set up the app to add your email (see SETUP.md, step 3).</p><button class="btn light" id="so">Sign out</button></div>`;
    document.getElementById('so').onclick = () => store.signOut();
    return;
  }
  S = snap;
  seedIfNeeded();
  render();
});

store.init(user => {
  if (!user) { S = null; closeSheet(); renderLogin(); }
  else app.innerHTML = '<div class="loading">Loading your home…</div>';
}).catch(err => {
  app.innerHTML = `<div class="login"><h1>Can't connect</h1><p>${esc(err.message)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`;
});

// Feel like an app: no pinch-zoom or double-tap zoom
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
