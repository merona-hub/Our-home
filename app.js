import { createStore } from './store.js';

// ================================================================
//  Constants
// ================================================================
const DEFAULTS = {
  houseName: 'Our Home',
  color: '#2a9d8f',
  names: { a: 'Merona', b: 'Daniel' },
  pets: 'Eevee & Stella',
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

const COLORS = ['#2a9d8f', '#3a86ff', '#7b61ff', '#e76f51', '#e05780', '#2b9348', '#c9822b', '#264653'];

const TABS = [
  { id: 'money', label: 'Money', icon: '💰' },
  { id: 'bills', label: 'Bills', icon: '🧾' },
  { id: 'shop', label: 'To buy', icon: '🛍️' },
  { id: 'contract', label: 'Contract', icon: '📄' },
];

// ================================================================
//  State
// ================================================================
const store = createStore();
let S = null;                       // latest data snapshot
let tab = localStorage.getItem('ourhome-tab') || 'money';
let showArrived = false;
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
  return { ...DEFAULTS, ...s, names: { ...DEFAULTS.names, ...(s.names || {}) } };
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
  document.documentElement.style.setProperty('--c', c);
  document.documentElement.style.setProperty('--c-soft', c + '1f');
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
  app.innerHTML = `
    <header>
      <div>
        <h1>${esc(c.houseName)}</h1>
        <div class="who">${esc(c.names.a)} · ${esc(c.names.b)}${c.pets ? ' · ' + esc(c.pets) + ' 🐾' : ''}</div>
      </div>
      <button class="gear" data-act="settings" aria-label="Settings"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
    </header>
    <main>${banners.join('')}${body}</main>
    <nav class="tabs">
      ${TABS.map(t => `<button data-act="tab" data-id="${t.id}" class="${t.id === tab ? 'on' : ''}"><span class="i">${t.icon}</span>${t.label}</button>`).join('')}
    </nav>`;
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
  }).join('') : `<div class="empty">No expenses yet.<br>Tap “Add expense” to start.</div>`;

  return `
    ${hero}
    <button class="btn big" data-act="add-expense">＋ Add expense</button>
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
          <span class="pill ${s.state === 'paid' ? 'ok' : s.state === 'due' ? 'due' : ''}">${esc(s.label)}</span>
        </span>
      </button>
      ${s.state === 'paid'
        ? `<button class="paid-btn done" data-act="pay-bill" data-id="${b.id}">✓ Paid</button>`
        : `<button class="paid-btn" data-act="pay-bill" data-id="${b.id}">I paid</button>`}
    </div>`).join('');

  return `${hero}
    <div class="list">${rows || '<div class="empty">No bills yet</div>'}</div>
    <div class="btn-row"><button class="btn ghost" data-act="add-bill">＋ Add a bill</button></div>`;
}

// ---------------- Shopping ----------------
function renderShop() {
  const pending = S.items.filter(i => !i.arrived).sort((x, y) => (x.eta || '9999').localeCompare(y.eta || '9999') || (x.createdAt || 0) - (y.createdAt || 0));
  const arrived = S.items.filter(i => i.arrived).sort((x, y) => (y.arrivedAt || '').localeCompare(x.arrivedAt || ''));
  const approx = pending.reduce((s, i) => s + (+i.approx || 0), 0);

  const row = i => {
    const src = SOURCES.find(s => s.id === i.source) || SOURCES[0];
    const who = i.owner === 'both' ? 'Both' : nm(i.owner);
    const bits = [src.icon + ' ' + src.label, who];
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
  };

  return `
    <button class="btn big" data-act="add-item">＋ Add something we need</button>
    ${pending.length ? `<div class="month"><span>Still need (${pending.length})</span><span>${approx ? '~' + money(approx) : ''}</span></div>
      <div class="list">${pending.map(row).join('')}</div>`
      : `<div class="empty">Nothing on the list 🎉</div>`}
    ${arrived.length ? `<div class="month"><button class="link" data-act="toggle-arrived">${showArrived ? '▾' : '▸'} Arrived (${arrived.length})</button></div>
      ${showArrived ? `<div class="list">${arrived.map(row).join('')}</div>` : ''}` : ''}`;
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

function openSheet(html, handlers = {}) {
  sheetHandlers = handlers;
  sheet.innerHTML = `<div class="grab"></div>${html}`;
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
  sheetHandlers = {};
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
    const h = sheetHandlers['chip:' + chip.parentElement.dataset.field];
    if (h) h(chip.dataset.v);
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
function itemForm(i = null) {
  const x = i || { name: '', approx: '', owner: localStorage.getItem('ourhome-me') || 'a', source: 'buy', eta: '' };
  openSheet(`
    <h3>${i ? 'Edit item' : 'What do we need?'}</h3>
    <div class="field"><input name="name" value="${esc(x.name)}" placeholder="e.g. Sofa, cat tree, curtains" ${i ? '' : 'autofocus'}></div>
    <div class="field"><span class="lbl">Where from?</span>${chips('source', SOURCES.map(s => ({ v: s.id, label: s.icon + ' ' + s.label })), x.source)}</div>
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
      const data = { name, source: chipVal('source'), owner: chipVal('owner'), approx: num('approx'), eta: val('eta') || null };
      if (i) store.update('items', i.id, data); else store.add('items', { ...data, arrived: false });
      closeSheet(); toast(i ? 'Saved' : 'Added to the list');
    },
    delete: () => { if (confirm(`Delete “${i.name}”?`)) { store.remove('items', i.id); closeSheet(); } },
  });
}

function toggleItem(i) {
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
      const expenseId = await store.add('expenses', { amount, category: 'home', note: i.name, paidBy: chipVal('paidBy'), date: today(), splitA: split === 'a' ? 100 : split === 'b' ? 0 : 50 });
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
  openSheet(`
    <h3>Settings</h3>
    <div class="field"><label>Home name</label><input name="houseName" value="${esc(c.houseName)}"></div>
    <div class="field"><span class="lbl">Main color</span>
      <div class="swatches" data-field="color">${COLORS.map(col => `<button type="button" data-color="${col}" class="${col === c.color ? 'on' : ''}" style="background:${col}"></button>`).join('')}</div></div>
    <div class="split2">
      <div class="field"><label>Person 1</label><input name="nameA" value="${esc(c.names.a)}"></div>
      <div class="field"><label>Person 2</label><input name="nameB" value="${esc(c.names.b)}"></div>
    </div>
    <div class="field"><label>Pets</label><input name="pets" value="${esc(c.pets)}"></div>
    <button class="btn" data-sheet="save">Save</button>
    <div class="btn-row"><button class="btn light" data-sheet="backup">⬇️ Download a backup</button></div>
    ${store.mode === 'firebase' ? `<div class="btn-row"><button class="btn light" data-sheet="signout">Sign out (${esc(store.user?.email || '')})</button></div>` : ''}
    <div class="btn-row"><button class="btn light" data-sheet="close">Close</button></div>
  `, {
    save: () => {
      const color = sheet.querySelector('.swatches .on')?.dataset.color || c.color;
      store.setSettings({ houseName: val('houseName') || DEFAULTS.houseName, color, names: { a: val('nameA') || 'Person 1', b: val('nameB') || 'Person 2' }, pets: val('pets') });
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
  });
  sheet.querySelector('.swatches').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    sheet.querySelectorAll('.swatches button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    document.documentElement.style.setProperty('--c', b.dataset.color);
  });
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
    case 'tab': tab = id; localStorage.setItem('ourhome-tab', tab); render(); window.scrollTo(0, 0); break;
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
