// =====================================================================
//  Our Home — Claude connector
//  A small "MCP" server that lets Claude add groceries, things to buy,
//  to-dos, expenses and trip plans to the Our Home app.
//
//  Runs on Cloudflare Workers (free). Paste this whole file into the
//  Cloudflare editor. Settings it needs (Cloudflare → Settings → Variables):
//    BOT_EMAIL         the email of Claude's own login in Firebase
//    BOT_PASSWORD      that login's password            (type: Secret)
//    CONNECTOR_SECRET  a long random code; part of the link  (type: Secret)
//
//  Claude can add, tick off and delete items, and create projects.
// =====================================================================

const FIREBASE_API_KEY = 'AIzaSyDcuDZYgdvoYY16cb_EnBIz_l6zHdhIp1s';
const FIREBASE_PROJECT = 'our-home-ba5e2';

const DEFAULT_NAMES = { a: 'Merona', b: 'Daniel' };
const CATEGORIES = ['groceries', 'bills', 'home', 'other'];
const TRIP_CATEGORIES = ['flights', 'hotel', 'food', 'activities', 'transport', 'shopping', 'other'];

// ---------------------------------------------------------------------
//  Firebase (sign-in + Firestore REST)
// ---------------------------------------------------------------------
let tokenCache = null;

function bases(env) {
  return {
    auth: env.AUTH_BASE || 'https://identitytoolkit.googleapis.com',
    fs: env.FIRESTORE_BASE || 'https://firestore.googleapis.com',
  };
}

async function idToken(env) {
  if (tokenCache && tokenCache.exp > Date.now()) return tokenCache.token;
  const r = await fetch(`${bases(env).auth}/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.BOT_EMAIL, password: env.BOT_PASSWORD, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Could not sign in to the app (' + (j.error?.message || r.status) + '). Check BOT_EMAIL and BOT_PASSWORD.');
  tokenCache = { token: j.idToken, exp: Date.now() + (Number(j.expiresIn || 3600) - 300) * 1000 };
  return j.idToken;
}

const docRoot = env => `${bases(env).fs}/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
const homePath = 'homes/main';

function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)])) } };
}
function dec(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(dec);
  if ('mapValue' in val) return decFields(val.mapValue.fields || {});
  return null;
}
const decFields = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, dec(v)]));
const fromDoc = d => ({ ...decFields(d.fields), id: d.name.split('/').pop() });

async function fsFetch(env, path, opts = {}) {
  const token = await idToken(env);
  const r = await fetch(`${docRoot(env)}/${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (r.status === 404 && (!opts.method || opts.method === 'GET')) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 403) throw new Error("The app refused access. Add Claude's email (BOT_EMAIL) to the Firestore rules.");
    throw new Error('Database error: ' + (j.error?.message || r.status));
  }
  return j;
}

async function list(env, col) {
  const out = [];
  let page = '';
  do {
    const j = await fsFetch(env, `${homePath}/${col}?pageSize=300${page ? '&pageToken=' + encodeURIComponent(page) : ''}`);
    if (!j) break;
    (j.documents || []).forEach(d => out.push(fromDoc(d)));
    page = j.nextPageToken || '';
  } while (page);
  return out;
}
async function add(env, col, data) {
  const j = await fsFetch(env, `${homePath}/${col}`, {
    method: 'POST',
    body: JSON.stringify({ fields: enc({ ...data, createdAt: Date.now(), by: 'Claude' }).mapValue.fields }),
  });
  return j.name.split('/').pop();
}
async function update(env, col, id, patch) {
  const data = { ...patch, updatedAt: Date.now(), by: 'Claude' };
  const mask = Object.keys(data).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  await fsFetch(env, `${homePath}/${col}/${id}?${mask}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: enc(data).mapValue.fields }),
  });
}
async function remove(env, col, id) {
  await fsFetch(env, `${homePath}/${col}/${id}`, { method: 'DELETE' });
}
async function getSettings(env) {
  const d = await fsFetch(env, `${homePath}/meta/settings`);
  return d ? decFields(d.fields) : {};
}
async function setSetting(env, key, value) {
  await fsFetch(env, `${homePath}/meta/settings?updateMask.fieldPaths=${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { [key]: enc(value) } }),
  });
}

// ---------------------------------------------------------------------
//  Helpers that mirror how the app works
// ---------------------------------------------------------------------
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const norm = s => String(s || '').trim().toLowerCase();
const round2 = n => Math.round(n * 100) / 100;

function people(settings) {
  const names = { ...DEFAULT_NAMES, ...(settings.names || {}) };
  return {
    names,
    who(x, { allowBoth = false } = {}) {
      const n = norm(x);
      if (!n) return null;
      if (allowBoth && ['both', 'us', 'we', 'together'].includes(n)) return 'both';
      if (n === norm(names.a) || n === 'a' || n === 'person 1') return 'a';
      if (n === norm(names.b) || n === 'b' || n === 'person 2') return 'b';
      throw new Error(`I don't know "${x}". Use ${names.a} or ${names.b}${allowBoth ? ' or both' : ''}.`);
    },
  };
}
const symbols = { ILS: '₪', USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', CHF: 'CHF ', JPY: '¥' };
const fmt = (n, cur) => (symbols[cur] || cur + ' ') + round2(+n || 0).toLocaleString('en-US');

async function rate(from, to, date) {
  if (from === to) return 1;
  const day = !date || date >= today() ? 'latest' : date;
  for (const url of [`https://api.frankfurter.dev/v1/${day}?base=${from}&symbols=${to}`, `https://api.frankfurter.app/${day}?from=${from}&to=${to}`]) {
    try { const r = await fetch(url); if (r.ok) { const v = (await r.json()).rates?.[to]; if (v) return v; } } catch (e) { /* next */ }
  }
  throw new Error(`Couldn't get the ${from}→${to} exchange rate right now.`);
}

function balance(expenses) {
  let netA = 0;
  for (const e of expenses) {
    const amt = +e.amount || 0;
    if (e.type === 'transfer') { netA += e.from === 'a' ? amt : -amt; continue; }
    netA += (e.paidBy === 'a' ? amt : 0) - amt * (e.splitA ?? 50) / 100;
  }
  return round2(netA);
}

function findProject(lists, name) {
  const projects = lists.filter(l => l.kind === 'project');
  if (!projects.length) throw new Error('There are no projects yet. Create one in the app first (To buy → + New project).');
  if (!name) {
    const bigs = projects.filter(p => !p.parentId);
    if (bigs.length === 1) return bigs[0];
    throw new Error('Which project? Options: ' + projectNames(lists).join(', '));
  }
  const n = norm(name).replace(/\s*[›>\/]\s*/g, '›');
  const full = p => { const parent = p.parentId && projects.find(x => x.id === p.parentId); return norm(parent ? parent.name + '›' + p.name : p.name); };
  return projects.find(p => full(p) === n) || projects.find(p => norm(p.name) === n)
    || projects.find(p => full(p).includes(n) || norm(p.name).includes(n))
    || (() => { throw new Error(`No project called "${name}". Options: ${projectNames(lists).join(', ')}`); })();
}
function projectNames(lists) {
  const projects = lists.filter(l => l.kind === 'project');
  return projects.map(p => { const parent = p.parentId && projects.find(x => x.id === p.parentId); return parent ? `${parent.name} › ${p.name}` : p.name; });
}
function findTrip(trips, name) {
  if (!trips.length) throw new Error('There are no trips yet. Create one in the app first (Travel → + New trip).');
  if (name) {
    const n = norm(name);
    const t = trips.find(t => norm(t.name) === n) || trips.find(t => norm(t.name).includes(n) || norm(t.dest).includes(n) || n.includes(norm(t.dest || '~~')));
    if (!t) throw new Error(`No trip called "${name}". Trips: ${trips.map(t => t.name).join(', ')}`);
    return t;
  }
  const d = today();
  const now = trips.find(t => t.start && t.end && d >= t.start && d <= t.end);
  const next = trips.filter(t => t.start && t.start >= d).sort((a, b) => a.start.localeCompare(b.start))[0];
  if (now || next) return now || next;
  if (trips.length === 1) return trips[0];
  throw new Error('Which trip? Trips: ' + trips.map(t => t.name).join(', '));
}

// ---------------------------------------------------------------------
//  Tools Claude can use
// ---------------------------------------------------------------------
const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const numb = (description) => ({ type: 'number', description });

const TOOLS = [
  {
    name: 'get_overview',
    description: "Summary of the home: who owes whom, what's on the grocery list, open to-dos, projects and trips. Use this first when you need context.",
    inputSchema: { type: 'object', properties: {} },
    run: async (env) => {
      const [s, expenses, items, lists, todos, trips] = await Promise.all([getSettings(env), list(env, 'expenses'), list(env, 'items'), list(env, 'lists'), list(env, 'todos'), list(env, 'trips')]);
      const { names } = people(s); const cur = s.currency || 'ILS';
      const net = balance(expenses);
      const groceries = items.filter(i => i.listId === 'groceries' && !i.arrived);
      const out = [];
      out.push(Math.abs(net) < 0.01 ? 'Balance: all even.' : `Balance: ${net > 0 ? names.b : names.a} owes ${net > 0 ? names.a : names.b} ${fmt(Math.abs(net), cur)}.`);
      out.push(`Groceries to get (${groceries.length}): ${groceries.map(g => g.name + ((g.count || 1) > 1 ? ` ×${g.count}` : '')).join(', ') || 'none'}.`);
      const pnames = projectNames(lists);
      out.push(`Projects: ${pnames.join(', ') || 'none'}.`);
      out.push(`Open to-dos: ${todos.filter(t => !t.done).length}.`);
      out.push(`Trips: ${trips.map(t => `${t.name}${t.start ? ` (${t.start}${t.end ? ' to ' + t.end : ''})` : ''}`).join(', ') || 'none'}.`);
      out.push(`People: ${names.a}, ${names.b}. Main currency: ${cur}. Today: ${today()}.`);
      return out.join('\n');
    },
  },
  {
    name: 'list_groceries',
    description: 'Show the grocery list: what still needs buying and what is already in the cart.',
    inputSchema: { type: 'object', properties: {} },
    run: async (env) => {
      const items = (await list(env, 'items')).filter(i => i.listId === 'groceries');
      const line = i => `- ${i.name}${(i.count || 1) > 1 ? ' ×' + i.count : ''}${i.qty ? ` (${i.qty})` : ''}${i.store ? ` · ${i.store}` : ''}`;
      const need = items.filter(i => !i.arrived), cart = items.filter(i => i.arrived);
      return `To get (${need.length}):\n${need.map(line).join('\n') || '(nothing)'}\n\nIn the cart (${cart.length}):\n${cart.map(line).join('\n') || '(nothing)'}`;
    },
  },
  {
    name: 'add_groceries',
    description: 'Add one or more items to the shared grocery list. If an item is already on the list, its quantity goes up instead.',
    inputSchema: {
      type: 'object', required: ['items'],
      properties: {
        items: { type: 'array', items: { type: 'object', required: ['name'], properties: {
          name: str('Item, e.g. "Milk"'), count: numb('How many (default 1)'),
          details: str('Size or details, e.g. "1 kg", "low-fat" (optional)'), store: str('Where to buy it, e.g. "Shufersal" (optional)'),
        } } },
      },
    },
    run: async (env, { items }) => {
      const [existing, s] = await Promise.all([list(env, 'items'), getSettings(env)]);
      const counts = { ...(s.groceryCounts || {}) };
      const done = [];
      for (const it of items) {
        const name = String(it.name || '').trim(); if (!name) continue;
        const n = Math.max(1, Math.round(+it.count || 1));
        const same = existing.find(i => i.listId === 'groceries' && !i.arrived && norm(i.name) === norm(name));
        if (same) { same.count = (same.count || 1) + n; await update(env, 'items', same.id, { count: same.count }); done.push(`${name} (now ×${same.count})`); }
        else {
          const id = await add(env, 'items', { name, listId: 'groceries', count: n, qty: it.details || null, store: it.store || null, arrived: false });
          existing.push({ id, name, listId: 'groceries', count: n, arrived: false });
          done.push(name + (n > 1 ? ` ×${n}` : ''));
        }
        const k = norm(name), c = counts[k] || {};
        counts[k] = { name, count: (c.count || 0) + 1, store: it.store || c.store || '', hidden: false };
      }
      await setSetting(env, 'groceryCounts', counts);
      return `Added to groceries: ${done.join(', ')}.`;
    },
  },
  {
    name: 'check_off_groceries',
    description: 'Mark grocery items as bought (moves them to "in the cart"). Does not delete anything.',
    inputSchema: { type: 'object', required: ['names'], properties: { names: { type: 'array', items: { type: 'string' } } } },
    run: async (env, { names }) => {
      const items = (await list(env, 'items')).filter(i => i.listId === 'groceries' && !i.arrived);
      const done = [], missing = [];
      for (const nm of names) {
        const it = items.find(i => norm(i.name) === norm(nm)) || items.find(i => norm(i.name).includes(norm(nm)));
        if (it) { await update(env, 'items', it.id, { arrived: true }); done.push(it.name); } else missing.push(nm);
      }
      return `${done.length ? 'In the cart: ' + done.join(', ') + '.' : ''}${missing.length ? ' Not on the list: ' + missing.join(', ') + '.' : ''}`.trim();
    },
  },
  {
    name: 'list_projects',
    description: 'List the "To buy" projects (e.g. Home, and parts like Living room) with what still needs buying in each.',
    inputSchema: { type: 'object', properties: {} },
    run: async (env) => {
      const [lists, items, s] = await Promise.all([list(env, 'lists'), list(env, 'items'), getSettings(env)]);
      const cur = s.currency || 'ILS';
      const projects = lists.filter(l => l.kind === 'project');
      if (!projects.length) return 'No projects yet.';
      const block = p => {
        const its = items.filter(i => i.listId === p.id);
        const need = its.filter(i => !i.arrived);
        return `${p.parentId ? '  • ' : '■ '}${p.name}${p.budget ? ` (budget ${fmt(p.budget, cur)})` : ''}${p.deadline ? ` (deadline ${p.deadline})` : ''}: ${need.length} to buy${need.length ? ' — ' + need.map(i => i.name + ((i.count || 1) > 1 ? ' ×' + i.count : '')).join(', ') : ''}`;
      };
      return projects.filter(p => !p.parentId).map(b => [block(b), ...projects.filter(p => p.parentId === b.id).map(block)].join('\n')).join('\n');
    },
  },
  {
    name: 'add_shopping_item',
    description: 'Add something to buy to a project (e.g. a sofa for "Home › Living room"). Not for groceries.',
    inputSchema: {
      type: 'object', required: ['name'],
      properties: {
        name: str('What to buy'), project: str('Project or part, e.g. "Living room" or "Home › Kitchen". Optional if there is only one project.'),
        count: numb('Quantity (default 1)'), price_each: numb('Rough price per item, in the main currency (optional)'),
        store: str('Where to buy it (optional)'), link: str('Product link (optional)'),
        priority: str('high, normal or low', { enum: ['high', 'normal', 'low'] }),
        who: str("Who's on it: a person's name, both, or undecided (optional)"),
        source: str('buy, secondhand, gift or owned (default buy)', { enum: ['buy', 'secondhand', 'gift', 'owned'] }),
        arrives: str('Expected arrival date YYYY-MM-DD (optional)'),
      },
    },
    run: async (env, a) => {
      const [lists, s] = await Promise.all([list(env, 'lists'), getSettings(env)]);
      const p = findProject(lists, a.project);
      const ppl = people(s);
      const owner = !a.who || norm(a.who) === 'undecided' ? 'none' : ppl.who(a.who, { allowBoth: true });
      const options = a.store || a.link ? [{ id: 'o1', where: a.store || '', link: a.link || '', price: a.price_each || '', chosen: true }] : [];
      await add(env, 'items', {
        name: a.name, listId: p.id, count: Math.max(1, Math.round(+a.count || 1)), source: a.source || 'buy', owner, priority: a.priority || 'normal',
        approx: +a.price_each || 0, eta: a.arrives || null, seller: a.store || null, link: a.link || null, options, arrived: false,
      });
      return `Added "${a.name}" to ${p.name}.`;
    },
  },
  {
    name: 'create_project',
    description: 'Create a project in "To buy" (e.g. "Home", "Wedding"), or a sub-project inside one (e.g. "Living room" inside "Home").',
    inputSchema: {
      type: 'object', required: ['name'],
      properties: {
        name: str('Name of the new project or sub-project'),
        parent: str('For a sub-project: the big project it belongs to, e.g. "Home". Leave empty for a big project.'),
        budget: numb('Budget in the main currency (optional)'), deadline: str('Deadline YYYY-MM-DD (optional)'),
      },
    },
    run: async (env, a) => {
      const lists = await list(env, 'lists');
      let parentId = null, parentName = '';
      if (a.parent) {
        const n = norm(a.parent);
        const big = lists.find(l => l.kind === 'project' && !l.parentId && norm(l.name) === n) || lists.find(l => l.kind === 'project' && !l.parentId && norm(l.name).includes(n));
        if (!big) throw new Error(`No big project called "${a.parent}". Big projects: ${lists.filter(l => l.kind === 'project' && !l.parentId).map(l => l.name).join(', ') || 'none'}`);
        parentId = big.id; parentName = big.name;
      }
      const dup = lists.find(l => l.kind === 'project' && (l.parentId || null) === parentId && norm(l.name) === norm(a.name));
      if (dup) return `"${dup.name}" already exists${parentName ? ' in ' + parentName : ''}.`;
      await add(env, 'lists', { name: a.name.trim(), kind: 'project', parentId, budget: +a.budget || null, deadline: a.deadline || null });
      return parentName ? `Created sub-project "${a.name}" in ${parentName}.` : `Created project "${a.name}".`;
    },
  },
  {
    name: 'delete_items',
    description: 'Delete things by name: grocery items, things to buy in a project, to-dos, or a trip\'s places / plan items. If a name matches more than one thing, nothing is deleted and you get the options so you can ask which one.',
    inputSchema: {
      type: 'object', required: ['names', 'from'],
      properties: {
        names: { type: 'array', items: { type: 'string' }, description: 'Names of the things to delete' },
        from: str('Where: "groceries", "project" (things to buy), "todos", "trip places" or "trip plan"', { enum: ['groceries', 'project', 'todos', 'trip places', 'trip plan'] }),
        project: str('Project name, to narrow down things to buy or to-dos (optional)'),
        trip: str('Trip name, for trip places / plan / to-dos (optional)'),
      },
    },
    run: async (env, a) => {
      const [items, lists, todos, trips, tripitems] = await Promise.all([list(env, 'items'), list(env, 'lists'), list(env, 'todos'), list(env, 'trips'), list(env, 'tripitems')]);
      const where = a.from;
      let pool, col, label;
      const proj = a.project ? findProject(lists, a.project) : null;
      const projIds = proj ? [proj.id, ...lists.filter(l => l.parentId === proj.id).map(l => l.id)] : null;
      const trip = a.trip ? findTrip(trips, a.trip) : null;
      if (where === 'groceries') { col = 'items'; pool = items.filter(i => i.listId === 'groceries'); label = i => i.name; }
      else if (where === 'project') { col = 'items'; pool = items.filter(i => i.listId && i.listId !== 'groceries' && (!projIds || projIds.includes(i.listId))); label = i => `${i.name} (${lists.find(l => l.id === i.listId)?.name || '?'})`; }
      else if (where === 'todos') { col = 'todos'; pool = todos.filter(t => (!projIds || (t.parentType === 'list' && projIds.includes(t.parentId))) && (!trip || (t.parentType === 'trip' && t.parentId === trip.id))); label = t => t.title; }
      else {
        const t = trip || findTrip(trips, null);
        col = 'tripitems'; pool = tripitems.filter(x => x.tripId === t.id && x.kind === (where === 'trip plan' ? 'plan' : 'place')); label = x => x.title;
      }
      const nameOf = x => x.name || x.title || '';
      const done = [], missing = [], unclear = [];
      for (const nm of a.names) {
        let m = pool.filter(x => norm(nameOf(x)) === norm(nm));
        if (!m.length) m = pool.filter(x => norm(nameOf(x)).includes(norm(nm)));
        if (!m.length) { missing.push(nm); continue; }
        if (m.length > 1) { unclear.push(`"${nm}" matches: ${m.map(label).join('; ')}`); continue; }
        await remove(env, col, m[0].id); done.push(label(m[0]));
      }
      return [done.length ? 'Deleted: ' + done.join(', ') + '.' : '', missing.length ? 'Not found: ' + missing.join(', ') + '.' : '',
        unclear.length ? 'Not deleted, more than one match (ask which one, or give the project): ' + unclear.join(' | ') : ''].filter(Boolean).join(' ') || 'Nothing to delete.';
    },
  },
  {
    name: 'add_todo',
    description: 'Add a task to the to-do list of a project or a trip.',
    inputSchema: {
      type: 'object', required: ['title'],
      properties: {
        title: str('The task'), project: str('Project name, if it belongs to a project'), trip: str('Trip name, if it belongs to a trip'),
        due: str('By when, YYYY-MM-DD (optional)'), who: str("Who's on it (optional)"),
      },
    },
    run: async (env, a) => {
      const s = await getSettings(env);
      let parentType, parent;
      if (a.trip) { parentType = 'trip'; parent = findTrip(await list(env, 'trips'), a.trip); }
      else { parentType = 'list'; parent = findProject(await list(env, 'lists'), a.project); }
      const owner = a.who ? people(s).who(a.who, { allowBoth: true }) : 'none';
      await add(env, 'todos', { title: a.title, parentType, parentId: parent.id, done: false, due: a.due || null, owner });
      return `Added to-do "${a.title}" to ${parent.name}.`;
    },
  },
  {
    name: 'list_todos',
    description: 'Show open to-dos, for all projects and trips or just one.',
    inputSchema: { type: 'object', properties: { project: str('Only this project (optional)'), trip: str('Only this trip (optional)'), include_done: { type: 'boolean' } } },
    run: async (env, a) => {
      const [todos, lists, trips] = await Promise.all([list(env, 'todos'), list(env, 'lists'), list(env, 'trips')]);
      let filter = () => true;
      if (a.project) { const p = findProject(lists, a.project); filter = t => t.parentType === 'list' && t.parentId === p.id; }
      if (a.trip) { const tr = findTrip(trips, a.trip); filter = t => t.parentType === 'trip' && t.parentId === tr.id; }
      const parentName = t => (t.parentType === 'trip' ? trips : lists).find(x => x.id === t.parentId)?.name || '?';
      const rows = todos.filter(filter).filter(t => a.include_done || !t.done);
      return rows.length ? rows.map(t => `- [${t.done ? 'x' : ' '}] ${t.title} (${parentName(t)}${t.due ? ', by ' + t.due : ''})`).join('\n') : 'No to-dos.';
    },
  },
  {
    name: 'complete_todo',
    description: 'Tick off a to-do as done.',
    inputSchema: { type: 'object', required: ['title'], properties: { title: str('The task (or part of its text)') } },
    run: async (env, { title }) => {
      const todos = (await list(env, 'todos')).filter(t => !t.done);
      const t = todos.find(x => norm(x.title) === norm(title)) || todos.find(x => norm(x.title).includes(norm(title)));
      if (!t) return `No open to-do matching "${title}".`;
      await update(env, 'todos', t.id, { done: true });
      return `Done: "${t.title}".`;
    },
  },
  {
    name: 'add_expense',
    description: 'Record an expense in the shared money tab. By default it is split half-half. Amounts in another currency are converted to the main currency.',
    inputSchema: {
      type: 'object', required: ['amount', 'paid_by'],
      properties: {
        amount: numb('How much was paid'), currency: str('Currency code if not the main currency, e.g. USD, EUR, JPY (optional)'),
        paid_by: str("Who paid (a person's name)"), description: str('What it was for, e.g. "Dinner at Taizu"'),
        category: str('groceries, bills, home or other; on a trip: flights, hotel, food, activities, transport, shopping or other'),
        date: str('YYYY-MM-DD (default today)'),
        split: str('"half" (default), "only <name>" if it was only one person\'s, or a percentage for the first person like "70"'),
        trip: str('Trip name if this is a trip expense (optional)'),
      },
    },
    run: async (env, a) => {
      const [s, trips] = await Promise.all([getSettings(env), list(env, 'trips')]);
      const ppl = people(s); const main = s.currency || 'ILS';
      const paidBy = ppl.who(a.paid_by);
      const date = a.date || today();
      const amount = +a.amount; if (!(amount > 0)) throw new Error('The amount must be more than 0.');
      let splitA = 50;
      const sp = norm(a.split);
      if (sp && sp !== 'half' && sp !== '50') {
        const m = sp.match(/^only\s+(.+)$/) || sp.match(/^(.+?)(?:'s)?\s+only$/);
        if (m) splitA = ppl.who(m[1]) === 'a' ? 100 : 0;
        else if (!isNaN(parseFloat(sp))) splitA = Math.min(100, Math.max(0, parseFloat(sp)));
      }
      const trip = a.trip ? findTrip(trips, a.trip) : null;
      const cur = (a.currency || main).toUpperCase();
      const r = await rate(cur, main, date);
      const cats = trip ? TRIP_CATEGORIES : CATEGORIES;
      const category = cats.includes(norm(a.category)) ? norm(a.category) : (trip ? 'other' : 'other');
      await add(env, 'expenses', {
        amount: round2(amount * r), origAmount: cur === main ? null : amount, origCurrency: cur === main ? null : cur, rate: cur === main ? null : r,
        category, note: a.description || '', paidBy, date, splitA, tripId: trip ? trip.id : null,
      });
      const net = balance([...(await list(env, 'expenses'))]);
      return `Added ${fmt(amount, cur)}${cur !== main ? ` (= ${fmt(amount * r, main)})` : ''} paid by ${ppl.names[paidBy]}${trip ? ' to ' + trip.name : ''}. ` +
        (Math.abs(net) < 0.01 ? 'You are all even.' : `Now ${net > 0 ? ppl.names.b : ppl.names.a} owes ${net > 0 ? ppl.names.a : ppl.names.b} ${fmt(Math.abs(net), main)}.`);
    },
  },
  {
    name: 'get_balance',
    description: 'Who owes whom, and the latest expenses.',
    inputSchema: { type: 'object', properties: { recent: numb('How many recent expenses to show (default 10)') } },
    run: async (env, a) => {
      const [s, expenses] = await Promise.all([getSettings(env), list(env, 'expenses')]);
      const { names } = people(s); const cur = s.currency || 'ILS';
      const net = balance(expenses);
      const recent = expenses.sort((x, y) => (y.date || '').localeCompare(x.date || '') || (y.createdAt || 0) - (x.createdAt || 0)).slice(0, a.recent || 10);
      return (Math.abs(net) < 0.01 ? 'All even.' : `${net > 0 ? names.b : names.a} owes ${net > 0 ? names.a : names.b} ${fmt(Math.abs(net), cur)}.`) +
        '\n\nRecent:\n' + recent.map(e => e.type === 'transfer' ? `- ${e.date} transfer ${names[e.from]} → ${names[e.to]} ${fmt(e.amount, cur)}` : `- ${e.date} ${e.note || e.category} ${fmt(e.amount, cur)} (${names[e.paidBy]} paid)`).join('\n');
    },
  },
  {
    name: 'list_trips',
    description: 'List trips with dates, budget and what is planned.',
    inputSchema: { type: 'object', properties: {} },
    run: async (env) => {
      const [trips, expenses, ti, s] = await Promise.all([list(env, 'trips'), list(env, 'expenses'), list(env, 'tripitems'), getSettings(env)]);
      const cur = s.currency || 'ILS';
      if (!trips.length) return 'No trips yet.';
      return trips.map(t => {
        const spent = expenses.filter(e => e.tripId === t.id && e.type !== 'transfer').reduce((x, e) => x + (+e.amount || 0), 0);
        const mine = ti.filter(x => x.tripId === t.id);
        return `■ ${t.name}${t.dest ? ` (${t.dest})` : ''}${t.start ? `, ${t.start} to ${t.end || '?'}` : ''}. Spent ${fmt(spent, cur)}${t.budget ? ' of ' + fmt(t.budget, cur) : ''}. ` +
          `Places: ${mine.filter(x => x.kind === 'place').map(x => x.title).join(', ') || 'none'}. Bookings: ${mine.filter(x => x.kind === 'booking').length}. Plan items: ${mine.filter(x => x.kind === 'plan').length}.`;
      }).join('\n');
    },
  },
  {
    name: 'add_trip_place',
    description: 'Save a place we want to visit on a trip (restaurant, sight, shop…).',
    inputSchema: { type: 'object', required: ['name'], properties: { name: str('The place'), trip: str('Trip name (default: the current or next trip)'), notes: str('Notes (optional)'), link: str('Link, e.g. Google Maps (optional)') } },
    run: async (env, a) => {
      const t = findTrip(await list(env, 'trips'), a.trip);
      await add(env, 'tripitems', { tripId: t.id, kind: 'place', title: a.name, notes: a.notes || null, link: a.link || null, done: false });
      return `Saved "${a.name}" to ${t.name} → Places.`;
    },
  },
  {
    name: 'add_trip_plan',
    description: 'Add something to the day-by-day plan of a trip.',
    inputSchema: { type: 'object', required: ['title'], properties: { title: str('What'), trip: str('Trip name (default: the current or next trip)'), date: str('YYYY-MM-DD'), time: str('HH:MM, 24-hour (optional)'), notes: str('Notes or address (optional)') } },
    run: async (env, a) => {
      const t = findTrip(await list(env, 'trips'), a.trip);
      await add(env, 'tripitems', { tripId: t.id, kind: 'plan', title: a.title, date: a.date || null, time: a.time || null, notes: a.notes || null });
      return `Added "${a.title}" to the ${t.name} plan${a.date ? ' on ' + a.date : ''}${a.time ? ' at ' + a.time : ''}.`;
    },
  },
];

// ---------------------------------------------------------------------
//  MCP (Model Context Protocol) over HTTP
// ---------------------------------------------------------------------
const INSTRUCTIONS = 'Our Home is a shared household app for two people. Use these tools to add, tick off and delete groceries, things to buy, to-dos and trip plans, create projects and sub-projects, and record expenses. Before deleting, make sure it is what the person asked for. When unsure about names of projects or trips, call get_overview first.';

async function handleRpc(env, msg) {
  const { id, method, params } = msg;
  const ok = result => ({ jsonrpc: '2.0', id, result });
  if (method === 'initialize') {
    return ok({
      protocolVersion: params?.protocolVersion || '2025-06-18',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'our-home', title: 'Our Home', version: '1.0.0' },
      instructions: INSTRUCTIONS,
    });
  }
  if (method === 'ping') return ok({});
  if (method === 'tools/list') return ok({ tools: TOOLS.map(({ run, ...t }) => t) });
  if (method === 'tools/call') {
    const tool = TOOLS.find(t => t.name === params?.name);
    if (!tool) return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Unknown tool: ' + params?.name } };
    try {
      const text = await tool.run(env, params.arguments || {});
      return ok({ content: [{ type: 'text', text }] });
    } catch (err) {
      return ok({ content: [{ type: 'text', text: err.message || String(err) }], isError: true });
    }
  }
  if (method === 'resources/list') return ok({ resources: [] });
  if (method === 'prompts/list') return ok({ prompts: [] });
  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // The link is https://<worker>/mcp/<CONNECTOR_SECRET>
    if (parts[0] !== 'mcp' || !env.CONNECTOR_SECRET || parts[1] !== env.CONNECTOR_SECRET) {
      return new Response(parts[0] === 'mcp' ? 'Wrong link.' : 'Our Home connector is running.', { status: parts[0] === 'mcp' ? 401 : 200 });
    }
    if (request.method === 'GET') return new Response('Use POST', { status: 405, headers: { Allow: 'POST' } });
    if (request.method === 'DELETE') return new Response(null, { status: 204 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    let body;
    try { body = await request.json(); } catch (e) {
      return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
    }
    const msgs = Array.isArray(body) ? body : [body];
    const replies = [];
    for (const m of msgs) {
      if (m.id === undefined || m.id === null) continue;      // notifications need no reply
      replies.push(await handleRpc(env, m));
    }
    if (!replies.length) return new Response(null, { status: 202 });
    return Response.json(Array.isArray(body) ? replies : replies[0]);
  },
};
