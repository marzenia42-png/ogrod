// tests/garden-tests.js
//
// Smoke + integration tests dla Ogród Marzeń.
// Uruchom z root projektu:   node tests/garden-tests.js
//
// Nie modyfikuje żadnego kodu produkcyjnego ani żywego localStorage —
// wszystko działa na in-memory mockach. Importuje czyste JS helpery
// (src/lib/* i src/data/*) bezpośrednio, JSX jest pominięty.

import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────
// 1. Mock browser globals (localStorage + fetch) — MUST come before
//    dynamic imports of production code that reads them at load time.
// ─────────────────────────────────────────────────────────────

class MockLocalStorage {
  constructor() { this.store = new Map(); }
  getItem(k)   { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear()      { this.store.clear(); }
  get length() { return this.store.size; }
  key(i)       { return [...this.store.keys()][i] ?? null; }
}

globalThis.window = { localStorage: new MockLocalStorage() };
globalThis.localStorage = globalThis.window.localStorage;
// addPhoto uses URL.createObjectURL in compressImage path only — not exercised here.

let lastFloraCall = null;
let mockFloraStatus = 200;  // override per-test for error paths
let mockFloraBody = null;

globalThis.fetch = async (url, opts = {}) => {
  if (typeof url === 'string' && url.includes('/functions/v1/garden-flora')) {
    const body = opts.body ? JSON.parse(opts.body) : null;
    lastFloraCall = { url, body, headers: opts.headers ?? {} };
    if (mockFloraStatus !== 200) {
      return {
        ok: false,
        status: mockFloraStatus,
        async text() { return mockFloraBody || 'mock error body'; },
        async json() { return { error: 'mock' }; },
      };
    }
    const lastMsg = body?.messages?.at(-1);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          response: `[MOCK FLORA] słyszę: "${(lastMsg?.content || '').slice(0, 40)}" · miesiąc=${body?.context?.monthName ?? 'brak'} · pogoda=${body?.context?.weather ? 'tak' : 'brak'}`,
        };
      },
      async text() { return ''; },
    };
  }
  throw new Error(`Unexpected fetch in tests: ${url}`);
};

// ─────────────────────────────────────────────────────────────
// 2. Dynamic imports — must come AFTER globals are mocked.
// ─────────────────────────────────────────────────────────────

const storage    = await import('../src/lib/plantStorage.js');
const floraApi   = await import('../src/lib/floraApi.js');
const plantsData = await import('../src/data/plants.js');
const recipesData = await import('../src/data/recipes.js');

const {
  PHOTO_LIMIT,
  loadPhotos, addPhoto,
  addPlantNote, loadPlantNotes,
  addEvent, loadEvents,
  loadCustomRecipes, addCustomRecipe, deleteCustomRecipe,
} = storage;
const { callFlora } = floraApi;
const { PLANTS, ACTIONS } = plantsData;
const { RECIPES, RECIPE_TYPES } = recipesData;

// ─────────────────────────────────────────────────────────────
// 3. Mock users
// ─────────────────────────────────────────────────────────────

function uid(p) { return `${p}-${Math.random().toString(36).slice(2, 8)}`; }

const users = [
  {
    label: 'User A — ogród przydomowy',
    plants: [
      { id: uid('pa1'), name: 'Pomidor', variety: 'Malinowy',  months: [5,6,7,8,9],          type: 'naturalny', text: 'Pomidor · Malinowy' },
      { id: uid('pa2'), name: 'Jabłoń',  variety: 'Antonówka', months: [2,3,4,5,6,11],       type: 'chemia',    text: 'Jabłoń · Antonówka' },
      { id: uid('pa3'), name: 'Bazylia', variety: '',          months: [5,6,7,8],            type: 'naturalny', text: 'Bazylia' },
      { id: uid('pa4'), name: 'Róża',    variety: 'New Dawn',  months: [3,4,5,6,7,10,11],    type: 'chemia',    text: 'Róża · New Dawn' },
      { id: uid('pa5'), name: 'Marchew', variety: '',          months: [4,5,6,7,8],          type: 'naturalny', text: 'Marchew' },
    ],
    diary: {
      '2026-05-09': 'Posadzono 10 sadzonek pomidora — odmiana Malinowy z osłonek',
      '2026-05-10': 'Oprysk Miedzianem 50WP na jabłoni przed kwitnieniem (parch)',
    },
  },
  {
    label: 'User B — balkon',
    plants: [
      { id: uid('pb1'), name: 'Geranium',  variety: '',         months: [5,6,7,8,9],         type: 'naturalny', text: 'Geranium' },
      { id: uid('pb2'), name: 'Lawenda',   variety: 'Hidcote',  months: [4,5,7,8,11],        type: 'ciecie',    text: 'Lawenda · Hidcote' },
      { id: uid('pb3'), name: 'Truskawka', variety: 'Honeoye',  months: [3,4,5,6,7,8,9],     type: 'naturalny', text: 'Truskawka · Honeoye' },
    ],
    diary: {
      '2026-05-08': 'Przesadzono truskawki Honeoye do większych skrzynek z drenażem',
    },
  },
  {
    label: 'User C — działka',
    plants: [
      { id: uid('pc1'), name: 'Ziemniak',   variety: 'Bryza',   months: [4,5,6,7,8],         type: 'ochrona',   text: 'Ziemniak · Bryza' },
      { id: uid('pc2'), name: 'Ogórek',     variety: '',        months: [5,6,7,8],           type: 'naturalny', text: 'Ogórek' },
      { id: uid('pc3'), name: 'Cukinia',    variety: '',        months: [5,6,7,8,9],         type: 'naturalny', text: 'Cukinia' },
      { id: uid('pc4'), name: 'Słonecznik', variety: '',        months: [4,5,6,7,8,9],       type: 'naturalny', text: 'Słonecznik' },
      { id: uid('pc5'), name: 'Koper',      variety: '',        months: [4,5,6,7],           type: 'naturalny', text: 'Koper' },
      { id: uid('pc6'), name: 'Czosnek',    variety: '',        months: [3,4,5,6,7],         type: 'naturalny', text: 'Czosnek' },
      { id: uid('pc7'), name: 'Porzeczka',  variety: 'Czarna',  months: [2,3,4,5,9],         type: 'chemia',    text: 'Porzeczka · Czarna' },
    ],
    diary: {
      '2026-05-09': 'Posadzono ziemniaki — rząd Bryza, rząd Vineta',
      '2026-05-10': 'Wsiano koper i marchewkę razem, koniec łóżka warzywnego',
      '2026-05-11': 'Pierwszy zbiór szczypiorku z czosnku',
    },
  },
];

// ─────────────────────────────────────────────────────────────
// 4. Test runner — results collector
// ─────────────────────────────────────────────────────────────

const results = [];
const PASS = '✅', FAIL = '❌', WARN = '⚠️';

function ok(user, label, note)   { results.push({ user, status: PASS, label, note }); }
function fail(user, label, err)  { results.push({ user, status: FAIL, label, err: err?.message || String(err) }); }
function warn(user, label, note) { results.push({ user, status: WARN, label, note }); }

const DIARY_PREFIX  = 'garden-diary-';
const PLANTS_KEY    = 'garden-custom-plants';

// ─────────────────────────────────────────────────────────────
// 5. Tests per user
// ─────────────────────────────────────────────────────────────

for (const user of users) {
  localStorage.clear();
  const u = user.label;

  // ── Test 1: plants save/load ────────────────────────────────
  try {
    localStorage.setItem(PLANTS_KEY, JSON.stringify(user.plants));
    const reloaded = JSON.parse(localStorage.getItem(PLANTS_KEY));
    assert.equal(reloaded.length, user.plants.length, `count: ${reloaded.length} vs ${user.plants.length}`);
    for (const p of user.plants) {
      const back = reloaded.find((x) => x.id === p.id);
      assert.ok(back, `roślina ${p.name} zaginęła po reload`);
      assert.equal(back.name, p.name);
      assert.deepEqual(back.months, p.months);
      if (p.variety) assert.equal(back.variety, p.variety);
    }
    ok(u, `zapis/odczyt ${user.plants.length} roślin`);
  } catch (e) {
    fail(u, 'zapis/odczyt roślin', e);
  }

  // ── Test 2: diary write/read ────────────────────────────────
  try {
    for (const [date, text] of Object.entries(user.diary)) {
      localStorage.setItem(DIARY_PREFIX + date, text);
    }
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DIARY_PREFIX)) {
        entries.push({ date: k.slice(DIARY_PREFIX.length), text: localStorage.getItem(k) });
      }
    }
    assert.equal(entries.length, Object.keys(user.diary).length);
    for (const [date, text] of Object.entries(user.diary)) {
      const e = entries.find((x) => x.date === date);
      assert.ok(e, `wpis z ${date} nieznaleziony`);
      assert.equal(e.text, text);
    }
    ok(u, `dziennik — ${entries.length} wpisów zapisane i odczytane`);
  } catch (e) {
    fail(u, 'dziennik', e);
  }

  // ── Test 3: recipes (built-in + add/delete custom) ──────────
  try {
    assert.ok(Array.isArray(RECIPES) && RECIPES.length >= 11, `RECIPES: ${RECIPES?.length}`);
    assert.ok(RECIPES.every((r) => r.id && r.name && Array.isArray(r.steps) && r.steps.length > 0), 'shape receptury niepoprawny');
    assert.ok(RECIPES.some((r) => r.id === 'banan'),    'brak receptury "banan"');
    assert.ok(RECIPES.some((r) => r.id === 'pokrzywa'), 'brak gnojówki z pokrzywy');
    assert.ok(RECIPES.some((r) => r.id === 'czosnek'),  'brak oprysku czosnkowego');
    assert.ok(RECIPES.every((r) => RECIPE_TYPES.some((t) => t.key === r.type)),
              'jakaś receptura ma niezdefiniowany type');

    const before = loadCustomRecipes().length;
    const added = addCustomRecipe({
      name: `Test recipe ${user.label}`,
      type: 'oprysk',
      target: 'test target',
      appliesTo: 'pomidor, ogórek',
      frequency: 'co 7 dni',
      steps: ['rozpuść w wodzie', 'opryskaj liście'],
    });
    assert.equal(added.length, before + 1, 'addCustomRecipe nie zwiększyło');
    const customId = added.find((r) => r.name.startsWith('Test recipe')).id;
    const afterDel = deleteCustomRecipe(customId);
    assert.equal(afterDel.length, before, 'deleteCustomRecipe nie zmniejszyło');

    ok(u, `receptury — ${RECIPES.length} wbudowanych + add/delete custom`);
  } catch (e) {
    fail(u, 'receptury', e);
  }

  // ── Test 4: FLORA mock (success + 502 error path) ───────────
  try {
    mockFloraStatus = 200;
    lastFloraCall = null;
    const res = await callFlora({
      messages: [{ role: 'user', content: `Witaj FLORA, jestem ${user.label}, co podlewać?` }],
      context: {
        monthName: 'maj', dateStr: '11 maja 2026', timeStr: '09:30',
        weather: { temperature: 14, humidity: 65, wind: 12 },
        notes: [{ date: '2026-05-10', text: 'Sucho w gruncie' }],
        diary: Object.entries(user.diary).slice(0, 2).map(([date, text]) => ({ date, text })),
      },
    });
    assert.ok(res.response.includes('[MOCK FLORA]'), 'mock prefix nie znaleziony');
    assert.ok(res.response.includes('maj'), 'context monthName nie przekazany');
    assert.ok(res.response.includes('pogoda=tak'), 'context weather nie przekazany');
    assert.ok(lastFloraCall, 'fetch nie wywołany');
    assert.ok(lastFloraCall.headers.apikey, 'brak apikey w nagłówku — anon JWT zniknął?');
    assert.ok(String(lastFloraCall.headers.Authorization).startsWith('Bearer '), 'brak Bearer w Authorization');

    // 502 error path — callFlora powinien rzucić
    mockFloraStatus = 502;
    let threw = false;
    try {
      await callFlora({ messages: [{ role: 'user', content: 'fail' }], context: {} });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 502, 'status zaginął w error');
    }
    assert.ok(threw, 'callFlora nie zgłosił błędu przy 502');
    mockFloraStatus = 200;

    ok(u, 'FLORA — sukces + error path (502)');
  } catch (e) {
    fail(u, 'FLORA mock', e);
    mockFloraStatus = 200;
  }

  // ── Test 5: photo gallery limit (PHOTO_LIMIT = 3) ───────────
  try {
    assert.equal(PHOTO_LIMIT, 3, `PHOTO_LIMIT spadło z 3 (=${PHOTO_LIMIT})`);
    const plantId = user.plants[0].id;
    const tinyDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD//w==';
    addPhoto(plantId, tinyDataUrl);
    addPhoto(plantId, tinyDataUrl);
    addPhoto(plantId, tinyDataUrl);
    assert.equal(loadPhotos(plantId).length, 3, 'po 3 uploadach nie ma 3 zdjęć');

    let blocked = false;
    try {
      addPhoto(plantId, tinyDataUrl);
    } catch (err) {
      blocked = true;
      assert.match(err.message, /Maksymalnie 3/, `error msg źle: ${err.message}`);
    }
    assert.ok(blocked, '4. zdjęcie nie zostało zablokowane!');
    assert.equal(loadPhotos(plantId).length, 3, 'limit przekroczony mimo error');

    ok(u, `galeria — limit ${PHOTO_LIMIT} respektowany (4. próba zablokowana)`);
  } catch (e) {
    fail(u, 'galeria limit', e);
  }

  // ── Bonus: event log + plant-specific notes ─────────────────
  try {
    const plantId = user.plants[0].id;
    const ev = addEvent(plantId, 'podlano', 'pierwsze podlanie testu');
    assert.equal(ev.length, 1);
    assert.equal(ev[0].type, 'podlano');
    assert.match(ev[0].date, /^\d{4}-\d{2}-\d{2}$/);

    addEvent(plantId, 'oprysknieto', 'test oprysku');
    addEvent(plantId, 'nieznany_typ', 'fallback do "inne"');
    const all = loadEvents(plantId);
    assert.equal(all.length, 3);
    assert.equal(all[0].type, 'inne', 'nieznany typ nie został zmapowany do inne');

    addPlantNote(plantId, 'plant-specific note');
    assert.equal(loadPlantNotes(plantId).length, 1);

    ok(u, 'wydarzenia + per-plant notatki');
  } catch (e) {
    warn(u, 'event log / plant notes (bonus)', e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// 6. Global sanity (data shape, runs once, not per user)
// ─────────────────────────────────────────────────────────────

try {
  assert.ok(Array.isArray(PLANTS) && PLANTS.length === 14, `PLANTS count: ${PLANTS?.length}`);
  assert.ok(Array.isArray(ACTIONS) && ACTIONS.length >= 80, `ACTIONS count: ${ACTIONS?.length}`);
  const knownCategories = new Set(['chemia', 'naturalny', 'nawozenie', 'ciecie', 'ochrona']);
  const unknownTypes = ACTIONS.filter((a) => !knownCategories.has(a.type)).map((a) => a.type);
  assert.equal(unknownTypes.length, 0, `nieznane typy akcji: ${[...new Set(unknownTypes)].join(', ')}`);
  ok('Global', `14 wbudowanych roślin + ${ACTIONS.length} akcji, wszystkie w 5 kategoriach`);
} catch (e) {
  fail('Global', 'data shape (plants.js)', e);
}

// ─────────────────────────────────────────────────────────────
// 7. Raport
// ─────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log(' OGRÓD MARZEŃ — RAPORT TESTÓW');
console.log('══════════════════════════════════════════════════');

const grouped = new Map();
for (const r of results) {
  if (!grouped.has(r.user)) grouped.set(r.user, []);
  grouped.get(r.user).push(r);
}

for (const [user, items] of grouped) {
  console.log(`\n── ${user} ──`);
  for (const r of items) {
    console.log(`  ${r.status}  ${r.label}`);
    if (r.err)  console.log(`        ${r.err}`);
    if (r.note) console.log(`        ${r.note}`);
  }
}

const passes = results.filter((r) => r.status === PASS).length;
const fails  = results.filter((r) => r.status === FAIL).length;
const warns  = results.filter((r) => r.status === WARN).length;

console.log('\n══════════════════════════════════════════════════');
console.log(` SUMA:   ✅ ${passes}    ❌ ${fails}    ⚠️ ${warns}`);
console.log('══════════════════════════════════════════════════\n');

process.exit(fails > 0 ? 1 : 0);
