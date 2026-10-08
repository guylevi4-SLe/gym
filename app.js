'use strict';
const APP_VERSION = '20.46';  // shown in settings; bump the minor (20.2, 20.3…) each release, together with ?v= in index.html and CACHE in sw.js

/* ================= Storage (IndexedDB) ================= */

let db;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gym', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv');
      req.result.createObjectStore('photos');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idb(store, mode, fn) {
  if (!db) return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}
const kvGet = k => idb('kv', 'readonly', s => s.get(k));
const kvSet = (k, v) => idb('kv', 'readwrite', s => s.put(v, k));
const photoSet = (id, data) => cloudUser ? Promise.resolve() : idb('photos', 'readwrite', s => s.put(data, id));
const photoDel = id => cloudUser ? Promise.resolve() : idb('photos', 'readwrite', s => s.delete(id));
const photoAll = () => !db ? Promise.resolve({}) : new Promise((resolve, reject) => {
  const out = {};
  const req = db.transaction('photos').objectStore('photos').openCursor();
  req.onsuccess = () => {
    const c = req.result;
    if (c) { out[c.key] = c.value; c.continue(); } else resolve(out);
  };
  req.onerror = () => reject(req.error);
});

/* ================= State ================= */

let S = {
  version: 1,
  users: [],
  exercises: [],   // shared by all users: {id, name, type, muscle, hasPhoto, notes: {userId: text}}
  routines: [],    // per user: {id, userId, name, exerciseIds}
  plans: [],       // per user, planned visits: {id, userId, at, gymId, routineId, notes, started}
  gyms: [],        // {id, name}; exercises with no gymIds are available everywhere
  workouts: [],    // finished: {id, userId, start, end, routineId, entries: [{exerciseId, sets}]}
  active: {},      // userId -> workout in progress
  settings: { currentUserId: null, restSeconds: 90, weeklyGoal: 3 },
};
let photos = {};   // exerciseId -> dataURL
let saveTimer = null;
// State is written to IndexedDB and mirrored to localStorage, so a lost database never means a lost user.
function mirror() {
  try { localStorage.setItem('gym-state', JSON.stringify(S)); } catch (_) { /* storage full or blocked */ }
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, cloudUser ? 800 : 250);
}
function saveNow() {
  clearTimeout(saveTimer);
  if (cloudUser) { cloudPush(); return Promise.resolve(); }
  mirror();
  return kvSet('state', S).catch(() => {});
}

const TYPES = {
  machine: { label: 'מכשיר', icon: '🏋️' },
  free: { label: 'משקולות חופשיות', icon: '💪' },
  bodyweight: { label: 'משקל גוף', icon: '🤸' },
  cardio: { label: 'אירובי / חימום', icon: '🏃' },
  stretch: { label: 'שחרור / מתיחות', icon: '🧘' },
};
const MUSCLES = ['חזה', 'גב', 'כתפיים', 'יד קדמית', 'יד אחורית', 'רגליים', 'ישבן', 'בטן', 'כל הגוף', 'אירובי'];
// Topics the machines are grouped by (Guy's order), in the ready-made list, the machines screen and the workout picker
const TOPICS = ['אירובי / חימום', 'רגליים', 'גב', 'חזה', 'כתפיים', 'ידיים', 'בטן / ליבה', 'משקולות', 'רב־תכליתי', 'שחרור / מתיחות'];
// Ready-made list so nobody starts from an empty screen: [topic, [[name, type, muscle], …]]
const CATALOG = [
  ['אירובי / חימום', [
    ['הליכון', 'cardio', 'אירובי'], ['אליפטי', 'cardio', 'אירובי'], ['אופני כושר', 'cardio', 'אירובי'],
    ['אופני כושר עם משענת', 'cardio', 'אירובי'], ['מכונת חתירה', 'cardio', 'אירובי'], ['מדרגות', 'cardio', 'אירובי'],
    ['אופני ידיים', 'cardio', 'אירובי'], ['קפיצה בחבל', 'cardio', 'אירובי'],
  ]],
  ['רגליים', [
    ['לחיצת רגליים', 'machine', 'רגליים'], ['לחיצת רגליים בישיבה (Seated Leg Press)', 'machine', 'רגליים'], ['פשיטת ברכיים', 'machine', 'רגליים'], ['כפיפת ברכיים בשכיבה', 'machine', 'רגליים'],
    ['כפיפת ברכיים בישיבה', 'machine', 'רגליים'], ['מקרב ירכיים', 'machine', 'רגליים'], ['מרחיק ירכיים', 'machine', 'ישבן'], ['פשיטת ירך לאחור במכונה (Glute Kickback)', 'machine', 'ישבן'],
    ['תאומים במכונה', 'machine', 'רגליים'], ['סקוואט משקל גוף', 'bodyweight', 'רגליים'],
  ]],
  ['גב', [
    ['פולי עליון', 'machine', 'גב'], ['חתירה בכבל בישיבה', 'machine', 'גב'], ['חתירה במכונה', 'machine', 'גב'], ['פשיטת גב', 'machine', 'גב'],
    ['מתח', 'bodyweight', 'גב'],
  ]],
  ['חזה', [
    ['לחיצת חזה במכונה', 'machine', 'חזה'], ['פרפר (Pec Deck)', 'machine', 'חזה'], ['לחיצת חזה בשיפוע במכונה', 'machine', 'חזה'],
    ['שכיבות סמיכה', 'bodyweight', 'חזה'],
  ]],
  ['כתפיים', [
    ['לחיצת כתפיים במכונה', 'machine', 'כתפיים'], ['הרחקת כתפיים במכונה', 'machine', 'כתפיים'], ['פרפר הפוך', 'machine', 'כתפיים'],
  ]],
  ['ידיים', [
    ['כפיפת מרפקים במכונה', 'machine', 'יד קדמית'], ['פשיטת מרפקים בכבל', 'machine', 'יד אחורית'], ['מקבילים', 'bodyweight', 'יד אחורית'],
  ]],
  ['בטן / ליבה', [
    ['כפיפות בטן במכונה', 'machine', 'בטן'], ['כפיפות בטן', 'bodyweight', 'בטן'], ['הרמות רגליים בתלייה', 'bodyweight', 'בטן'],
  ]],
  ['משקולות', [
    ['לחיצת חזה במוט', 'free', 'חזה'], ['לחיצת חזה במשקולות', 'free', 'חזה'], ['סקוואט במוט', 'free', 'רגליים'],
    ['דדליפט', 'free', 'גב'], ['חתירה במוט', 'free', 'גב'], ['חתירה במשקולת יד', 'free', 'גב'],
    ['לחיצת כתפיים במשקולות', 'free', 'כתפיים'], ['הרחקה לצדדים', 'free', 'כתפיים'],
    ['כפיפת מרפקים במשקולות', 'free', 'יד קדמית'], ['פטישים', 'free', 'יד קדמית'], ['פשיטת מרפקים מעל הראש', 'free', 'יד אחורית'],
    ['מכרעים (לאנג׳ים)', 'free', 'רגליים'], ['גשר ישבן (היפ תראסט)', 'free', 'ישבן'],
  ]],
  ['רב־תכליתי', [
    ['הצלבת כבלים', 'machine', 'חזה'], ['סמית׳ סקוואט', 'machine', 'רגליים'], ['מתח עם סיוע', 'machine', 'גב'], ['מקבילים עם סיוע', 'machine', 'יד אחורית'],
  ]],
  ['שחרור / מתיחות', [
    ['גליל שחרור (פומרולר)', 'stretch', 'כל הגוף'], ['מתיחת רגליים', 'stretch', 'רגליים'], ['מתיחת גב וכתפיים', 'stretch', 'גב'],
  ]],
];
const RENAMED = { 'בעיטה לאחור במכונה (Glute Kickback)': 'פשיטת ירך לאחור במכונה (Glute Kickback)' };
const CATALOG_TOPIC = Object.fromEntries(CATALOG.flatMap(([t, items]) => items.map(([n]) => [n, t])));
const MUSCLE_TOPIC = { 'רגליים': 'רגליים', 'ישבן': 'רגליים', 'גב': 'גב', 'חזה': 'חזה', 'כתפיים': 'כתפיים', 'יד קדמית': 'ידיים', 'יד אחורית': 'ידיים', 'בטן': 'בטן / ליבה', 'אירובי': 'אירובי / חימום' };
function topicOf(ex) {
  if (CATALOG_TOPIC[ex.name]) return CATALOG_TOPIC[ex.name];
  if (ex.type === 'cardio') return 'אירובי / חימום';
  if (ex.type === 'stretch') return 'שחרור / מתיחות';
  if (ex.type === 'free') return 'משקולות';
  return MUSCLE_TOPIC[ex.muscle] || 'רב־תכליתי';
}
// Workout-day tags (Push / Pull / Legs / Core). Set automatically from the muscle; ex.split overrides ('none' = no tag).
const SPLITS = { push: 'Push', pull: 'Pull', legs: 'Legs', core: 'Core' };
const MUSCLE_SPLIT = { 'חזה': 'push', 'כתפיים': 'push', 'יד אחורית': 'push', 'גב': 'pull', 'יד קדמית': 'pull', 'רגליים': 'legs', 'ישבן': 'legs', 'בטן': 'core' };
const autoSplit = ex => ex.type === 'cardio' || ex.type === 'stretch' ? null : /פרפר הפוך|reverse fly|rear delt/i.test(ex.name) ? 'pull' : MUSCLE_SPLIT[ex.muscle] || null;
const splitOf = ex => ex.split ? (ex.split === 'none' ? null : ex.split) : autoSplit(ex);
const splitChips = (act, cur, extra = '') => `<div class="chips" style="margin-bottom:12px">
  <button class="chip ${!cur ? 'on' : ''}" data-act="${act}" data-v="" ${extra}>כל הימים</button>
  ${Object.entries(SPLITS).map(([k, l]) => `<button class="chip ${cur === k ? 'on' : ''}" data-act="${act}" data-v="${k}" ${extra}>${l}</button>`).join('')}
</div>`;
// Exercises for a day workout at the current gym: up to 6 of that tag, the ones you've done first; Full body = one per area, least recently done
function dayExercises(day, gym = curGymId()) {
  const at = S.exercises.filter(e => atGym(e, gym));
  const lastDone = id => lastPerformance(id)?.date || 0;
  const order = e => TOPICS.indexOf(topicOf(e));
  if (day === 'full') {
    return ['רגליים', 'גב', 'חזה', 'כתפיים', 'ידיים', 'בטן / ליבה'].map(t => {
      const l = at.filter(e => topicOf(e) === t || (t !== 'בטן / ליבה' && topicOf(e) === 'משקולות' && MUSCLE_TOPIC[e.muscle] === t));
      const used = l.filter(e => lastDone(e.id)).sort((a, b) => lastDone(a.id) - lastDone(b.id));
      return used[0] || l[0];
    }).filter(Boolean);
  }
  return at.filter(e => splitOf(e) === day)
    .sort((a, b) => (!lastDone(a.id) - !lastDone(b.id)) || order(a) - order(b))
    .slice(0, 6).sort((a, b) => order(a) - order(b));
}

// Exercises split into topic sections, in TOPICS order: [[topic, exercises], …]
const byTopic = list => TOPICS.map(t => [t, list.filter(e => topicOf(e) === t)]).filter(([, l]) => l.length);

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = sel => document.querySelector(sel);
const me = () => S.users.find(u => u.id === S.settings.currentUserId);
const exById = id => S.exercises.find(e => e.id === id);
const gymById = id => S.gyms.find(g => g.id === id);
const curGymId = () => (me()?.gymId && gymById(me().gymId)) ? me().gymId : null;
const atGym = (ex, gymId) => !gymId || !ex.gymIds?.length || ex.gymIds.includes(gymId);
const myActive = () => S.active[S.settings.currentUserId];
const myWorkouts = () => S.workouts.filter(w => w.userId === S.settings.currentUserId).sort((a, b) => b.start - a.start);
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const fmtNum = n => n == null ? '' : (Math.round(n * 100) / 100).toString();

// Search and sort by the name as shown (built-in names are translated in English)
const nameHas = (e, f) => e.name.includes(f) || trName(e.name).toLowerCase().includes(f.toLowerCase());
const byName = (a, b) => trName(a.name).localeCompare(trName(b.name), window.LANG === 'en' ? 'en' : 'he');

function measure(ex) {
  if (!ex) return 'weight';
  if (ex.type === 'cardio') return 'cardio';
  if (ex.type === 'stretch') return 'time';
  if (ex.type === 'bodyweight') return 'reps';
  return 'weight';
}

/* ================= Formatting ================= */

// Language comes from i18n.js (window.LANG); dates follow it.
const loc = () => window.LANG === 'en' ? (/^en/.test(navigator.language) ? navigator.language : 'en-GB') : 'he-IL';
// Built-in exercise names are stored in Hebrew; show them translated when the app is in English.
const trName = n => window.tr ? tr(n) : n;

const DAY = 864e5;
function fmtDate(t) {
  const d = new Date(t), today = new Date();
  const days = Math.round((startOfDay(today) - startOfDay(d)) / DAY);
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 7) return d.toLocaleDateString(loc(), { weekday: 'long' });
  return d.toLocaleDateString(loc(), { day: 'numeric', month: 'long' });
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
function startOfWeek(d = new Date()) { const x = new Date(startOfDay(d)); x.setDate(x.getDate() - x.getDay()); return x.getTime(); }
function fmtDur(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} דק׳`;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} שע׳`;
}
function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
}
const timed = kind => kind === 'cardio' || kind === 'time';
function setText(set, kind) {
  if (timed(kind)) return [set.minutes != null && `${fmtNum(set.minutes)} דק׳`, set.km != null && `${fmtNum(set.km)} ק״מ`].filter(Boolean).join(' · ');
  if (kind === 'reps') return `${set.reps ?? '?'} חזרות`;
  return `\u2066${fmtNum(set.weight) || 0}×${set.reps ?? '?'}\u2069`;  // isolate so RTL keeps weight×reps order
}
// What the user did last time, as one line (shown in the workout, exercise screen and routine editor)
function lastLine(ex) {
  const last = lastPerformance(ex.id);
  return last ? `בפעם הקודמת (${fmtDate(last.date)}${lastGym(ex, last)}): ${setsSummary(last.sets, measure(ex))}` : 'עוד לא עשית את התרגיל הזה';
}
function setsSummary(sets, kind) {
  if (!sets.length) return '';
  if (kind !== 'weight') return sets.map(s => setText(s, kind)).join(', ');
  const same = sets.every(s => s.weight === sets[0].weight && s.reps === sets[0].reps);
  if (same) return `${sets.length} סטים × ${sets[0].reps ?? '?'} חזרות · ${fmtNum(sets[0].weight) || 0} ק״ג`;
  return sets.map(s => setText(s, kind)).join(', ') + ' ק״ג';
}

/* ================= Queries ================= */

// A machine marked at 2+ gyms may differ between them (another brand, other weights), so last time, prefill,
// target and notes are kept per gym: the gym of the active workout, else the gym you're at now.
const ctxGym = () => myActive() ? myActive().gymId : curGymId();
const perGym = ex => ex?.gymIds?.length > 1 && ex.gymIds.includes(ctxGym()) ? ctxGym() : null;
const myKey = ex => S.settings.currentUserId + (perGym(ex) ? '@' + perGym(ex) : '');
// Notes/targets saved before a machine was kept per gym belong to its first gym
const oldKeyOk = ex => !perGym(ex) || perGym(ex) === ex.gymIds[0];
const myNote = ex => ex.notes?.[myKey(ex)] ?? (oldKeyOk(ex) ? ex.notes?.[S.settings.currentUserId] : null) ?? '';
function lastPerformance(exerciseId, userId = S.settings.currentUserId, gym = perGym(exById(exerciseId))) {
  let any = null;
  for (const w of S.workouts.filter(w => w.userId === userId).sort((a, b) => b.start - a.start)) {
    const e = w.entries.find(e => e.exerciseId === exerciseId);
    if (!e || !e.sets.length) continue;
    const r = { date: w.start, sets: e.sets, gymId: w.gymId || null };
    if (!gym || w.gymId === gym) return r;
    any = any || r;
  }
  return any;  // not done at this gym yet: fall back to the latest anywhere
}
// " · gym name" after a last-time line, only for machines kept per gym
const lastGym = (ex, last) => perGym(ex) && gymById(last?.gymId) ? ` · ${gymById(last.gymId).name}` : '';
function weekStats() {
  const from = startOfWeek();
  const ws = myWorkouts().filter(w => w.start >= from);
  return { count: ws.length, minutes: Math.round(ws.reduce((t, w) => t + (w.end - w.start), 0) / 60000) };
}
function streakWeeks() {
  const goal = S.settings.weeklyGoal || 1;
  let n = 0, wk = startOfWeek();
  const ws = myWorkouts();
  const thisWeek = ws.filter(w => w.start >= wk).length;
  if (thisWeek >= goal) n++;
  for (;;) {
    const prev = new Date(wk); prev.setDate(prev.getDate() - 7);
    const c = ws.filter(w => w.start >= prev.getTime() && w.start < wk).length;
    if (c < goal) break;
    n++; wk = prev.getTime();
  }
  return n;
}

/* ================= UI helpers ================= */

const ui = { planDraft: null, modal: null, exFilter: '', exGym: null, exSplit: '', rSplit: '' };

function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.textContent = ''; }, ms);
}
function ask(msg, okLabel = 'אישור', danger = true) {
  return new Promise(resolve => {
    ui.modal = { type: 'confirm', msg, okLabel, danger, resolve };
    renderModal();
  });
}
function closeModal() {
  const r = ui.modal?.resolve;
  ui.modal = null; renderModal();
  if (r) r(false);
}
function go(hash) { location.hash = hash; }
function keepSheetScroll(fn) {
  const top = document.querySelector('.sheet')?.scrollTop;
  fn();
  const s2 = document.querySelector('.sheet'); if (s2) s2.scrollTop = top;
}
// Gyms a catalog item gets: machines and cardio equipment belong to the chosen gyms; free weights and bodyweight work anywhere
function catalogGyms(m, name, type) {
  return (type === 'machine' || type === 'cardio') && name !== 'קפיצה בחבל' ? m.gymIds.filter(id => gymById(id)) : [];
}
async function removeExercise(id) {
  S.exercises = S.exercises.filter(e => e.id !== id);
  S.routines.forEach(r => { r.exerciseIds = r.exerciseIds.filter(x => x !== id); });
  Object.values(S.active).forEach(a => { a.entries = a.entries.filter(e => e.exerciseId !== id); });
  delete photos[id]; await photoDel(id);
}

// Line icons (24×24, stroke = currentColor). Class "flip" mirrors direction-dependent ones in English.
const ICONS = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>',
  dumbbell: '<rect x="4.5" y="6.5" width="3.5" height="11" rx="1.2"/><rect x="16" y="6.5" width="3.5" height="11" rx="1.2"/><path d="M2 10v4M22 10v4M8 12h8"/>',
  plan: '<rect x="4.5" y="4" width="15" height="17" rx="2.5"/><path d="M9 4V2.8h6V4"/><path d="m8.5 10.5 1.5 1.5 2.5-2.5M14.5 11h1.5M8.5 16h7"/>',
  history: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  back: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  next: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  pin: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  play: '<path class="fill" d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  flame: '<path d="M12 21.5c3.9 0 6.5-2.6 6.5-6.3 0-3.3-2.2-5.4-3.7-7.2-.4 1.8-1.3 3-2.4 3.5.3-2.8-.7-5.9-3.3-8.5.2 3.4-1.5 5.3-2.8 7C5.2 11.6 5.5 13.4 5.5 15.2c0 3.7 2.6 6.3 6.5 6.3z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" class="fill"/>',
  down: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  edit: '<path d="M4 20h4.2L19.4 8.8a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5h6V7"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  share: '<path d="M12 14.5V3.5M8 7.5l4-4 4 4"/><path d="M7 10.5H6a1.5 1.5 0 0 0-1.5 1.5v7.5A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5h-1"/>',
  camera: '<path d="M4.5 7.5h3l1.8-2.5h5.4l1.8 2.5h3a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V9a1.5 1.5 0 0 1 1.5-1.5z"/><circle cx="12" cy="13.3" r="3.5"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-9.5 8.5"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" class="fill"/><circle cx="12" cy="12" r="1.4" class="fill"/><circle cx="18.5" cy="12" r="1.4" class="fill"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  up: '<path d="m6.5 14.5 5.5-5.5 5.5 5.5"/>',
  note: '<path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-3.8-6 3.8v-16a1 1 0 0 1 1-1z"/>',
  last: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5M12 7.5V12l3 2"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1" class="fill"/><circle cx="4.5" cy="12" r="1" class="fill"/><circle cx="4.5" cy="17.5" r="1" class="fill"/>',
  trophy: '<path d="M8 4h8v5.5a4 4 0 0 1-8 0V4z"/><path d="M8 6H4.5v1.5A3 3 0 0 0 8 10.4M16 6h3.5v1.5a3 3 0 0 1-3.5 2.9M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8z"/>',
  users: '<circle cx="9" cy="8" r="3.3"/><path d="M3 19.5c.5-3.3 2.9-5.2 6-5.2s5.5 1.9 6 5.2"/><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M17.8 14.6c1.8.7 2.9 2.3 3.2 4.9"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.5-1-2.6 0-1 .8-1.7 1.8-1.7h2.2a3.7 3.7 0 0 0 3.7-3.7C20.5 6.8 16.7 3.5 12 3.5z"/><circle cx="7.8" cy="11" r="1.1" class="fill"/><circle cx="10.5" cy="7.3" r="1.1" class="fill"/><circle cx="15" cy="7.6" r="1.1" class="fill"/>',
  cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.2 4.7 4.7 0 0 0 7 18.5z"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
};
const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
// Logo: an animated dumbbell next to the "Setou" wordmark, "C'est tout" underneath
const brandMark = `<svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="markGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
  <g class="lift"><path class="handle" d="M13 23C10.5 15 12 6.5 24 6.5S37.5 15 35 23"/><path class="bell" d="M24 16.5c9.4 0 16 6.3 16 14.3 0 4.3-1.9 8-4.8 10.7a2.5 2.5 0 0 1-1.7.7h-19a2.5 2.5 0 0 1-1.7-.7C9.9 38.8 8 35.1 8 30.8c0-8 6.6-14.3 16-14.3z"/><text x="24" y="35" text-anchor="middle">8kg</text></g>
  <ellipse class="shadow" cx="24" cy="46" rx="12" ry="1.6"/></svg>`;
const brand = (cls = '') => `<div class="brand ${cls}" dir="ltr">${brandMark}<div class="brand-txt"><span class="word">Setou</span><span class="tagline">C'est tout</span></div></div>`;

// The animated illustration always shows; a machine photo is extra (on the machine page and a button in the workout).
function thumb(ex, cls = '') {
  return `<div class="thumb ${cls}">${window.exerciseIcon ? exerciseIcon(ex) : ico('dumbbell')}</div>`;
}
function avatar(u, act = 'go-users') {
  if (!u) return '';
  return `<button class="avatar" data-act="${act}" aria-label="${esc(u.name)}">${esc(u.name.trim()[0] || '?')}</button>`;
}
function topbar(title, back) {
  return `<div class="topbar">
    ${back ? `<button class="back" data-act="back" aria-label="חזרה">${ico('back', 'flip')}</button>` : `<h1>${title}</h1>`}
    ${avatar(me())}
  </div>${back ? `<h1>${title}</h1>` : ''}`;
}
// Hebrew / English switch: a two-position toggle that always sits the same way (EN left, עב right),
// so it does not jump sides when the page direction flips.
const langSwitch = () => { const en = window.LANG === 'en';
  return `<button class="lang-toggle ${en ? 'en' : 'he'}" dir="ltr" translate="no" role="switch" aria-checked="${en}" aria-label="Language" data-act="lang" data-v="${en ? 'he' : 'en'}">
    <span class="knob"></span><span class="opt">EN</span><span class="opt">עב</span></button>`; };
const langToggle = () => `<div class="lang-top">${langSwitch()}</div>`;
const emptyState = (icon, text) => `<div class="empty"><span class="big-ic">${ico(icon)}</span>${text}</div>`;

/* ================= Screens ================= */

function screenOnboarding() {
  return `${langToggle()}<div class="welcome stack">
    ${brand('lg')}
    <h1>ברוך הבא!</h1>
    <p class="muted">איך קוראים לך? אפשר להוסיף עוד משתמשים אחר כך, למשל את הבן.</p>
    <input class="input" id="new-user-name" placeholder="השם שלך" autocomplete="off">
    <button class="btn primary big" data-act="create-first-user">יאללה, מתחילים</button>
  </div>`;
}

// Weekly goal ring for the home screen
function ring(done, goal) {
  const C = 2 * Math.PI * 50, f = Math.min(1, done / Math.max(1, goal));
  return `<div class="ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
    <circle class="track" cx="60" cy="60" r="50"/><circle class="val" cx="60" cy="60" r="50" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - f)).toFixed(1)}" ${f ? '' : 'stroke-opacity="0"'}/></svg>
    <div class="txt"><b class="num" dir="ltr">${done}<small style="font-size:20px;opacity:.55">/${goal}</small></b><span>אימונים</span></div></div>`;
}

function screenHome() {
  const u = me(), a = myActive(), st = weekStats(), goal = S.settings.weeklyGoal;
  const streak = streakWeeks();
  const recent = myWorkouts().slice(0, 3);
  const routines = S.routines.filter(r => r.userId === u.id);
  const plans = upcomingPlans();
  let msg;
  if (st.count >= goal) msg = 'עמדת ביעד השבועי! כל אימון נוסף הוא בונוס 🔥';
  else if (st.count === 0) msg = 'שבוע חדש, הזדמנות חדשה. בוא נפתח אותו!';
  else msg = `עוד ${goal - st.count} ${goal - st.count === 1 ? 'אימון' : 'אימונים'} ליעד השבועי`;

  return `<div class="topbar">${brand()}<div class="top-end">${langSwitch()}${avatar(u)}</div></div>
    <h1 class="greet">שלום ${esc(u.name)}</h1>
    ${gymChip()}
    <div class="hero">
      <div class="hero-top">
        ${ring(st.count, goal)}
        <div class="grow"><div class="hero-label">השבוע</div><div class="hero-msg">${msg}</div></div>
      </div>
      <div class="kpis">
        <div class="kpi"><span class="k-ic">${ico('bolt')}</span><b class="num">${st.count}</b><span>אימונים</span></div>
        <div class="kpi"><span class="k-ic">${ico('clock')}</span><b class="num">${st.minutes}</b><span>דקות</span></div>
        <div class="kpi"><span class="k-ic">${ico('flame')}</span><b class="num">${streak}</b><span>שבועות ברצף</span></div>
      </div>
    </div>
    <div style="margin-top:16px">
      ${a ? `<button class="btn primary big cta" data-act="go-workout">${ico('play')}<span>המשך אימון</span> · <span data-elapsed></span></button>`
          : `<button class="btn primary big cta" data-act="start-empty">${ico('play')}<span>התחל אימון</span></button>
             <button class="link block" style="margin:6px auto 0" data-act="past-new">${ico('history')}<span> הוסף אימון שכבר עשיתי</span></button>`}
    </div>
    ${!a && S.exercises.length ? `<div class="section-head"><h2>אימון לפי יום</h2></div>
      <div class="chips day-chips">${[...Object.entries(SPLITS).filter(([k]) => k !== 'core'), ['full', 'Full body']].map(([k, l]) => `<button class="chip" data-act="start-day" data-v="${k}">${ico('play')}<span>${l}</span></button>`).join('')}</div>` : ''}
    ${!a && routines.length ? `<div class="section-head"><h2>התוכניות שלי</h2></div>
      <div class="rail">${routines.map(r => `<button class="rcard tap" data-act="start-routine" data-id="${r.id}">
        <b>${esc(r.name)}</b><span class="muted">${r.exerciseIds.filter(exById).length} תרגילים</span><span class="go">${ico('play')}</span>
      </button>`).join('')}</div>` : ''}
    <div class="section-head"><h2>אימונים מתוכננים</h2><button class="btn sm" data-act="plan-new">${ico('plus')}<span>תכנן אימון</span></button></div>
    ${plans.map(planRow).join('') || '<p class="muted small" style="margin:0">עוד לא תכננת. לחץ על "תכנן אימון" כדי לקבוע יום ושעה.</p>'}
    <div class="section-head"><h2>אימונים אחרונים</h2>${recent.length ? `<button class="link" data-act="go" data-to="#/history">הכל</button>` : ''}</div>
    ${recent.length ? recent.map(workoutRow).join('') : emptyState('history', 'עוד אין אימונים. האימון הראשון מחכה לך!')}`;
}

/* ---- Planned workouts ---- */
const upcomingPlans = () => S.plans
  .filter(p => p.userId === S.settings.currentUserId && !p.started && p.at > startOfDay(new Date()))
  .sort((a, b) => a.at - b.at);
function fmtPlanWhen(t) {
  const d = new Date(t), days = Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
  const day = days === 0 ? 'היום' : days === 1 ? 'מחר' : d.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' });
  return `${day} · ${d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })}`;
}
function planRow(p) {
  const r = S.routines.find(r => r.id === p.routineId), g = gymById(p.gymId);
  const today = startOfDay(new Date(p.at)) === startOfDay(new Date());
  return `<div class="card tap list-item" data-act="plan-edit" data-id="${p.id}">
    ${dateTile(p.at)}
    <div class="grow">
      <div class="card-title">${fmtPlanWhen(p.at)}</div>
      ${g || r ? `<div class="meta">${g ? `<span>${ico('pin')}${esc(g.name)}</span>` : ''}${r ? `<span>${ico('plan')}${esc(r.name)}</span>` : ''}</div>` : ''}
      ${p.notes ? `<div class="muted small" style="margin-top:4px;white-space:pre-line">${esc(p.notes)}</div>` : ''}
    </div>
    ${today && !myActive() ? `<button class="btn sm primary" data-act="plan-start" data-id="${p.id}">${ico('play')}<span>התחל</span></button>` : ''}
  </div>`;
}
const pad2 = n => String(n).padStart(2, '0');
const toLocalInput = t => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const icsTime = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function planEvent(p) {
  const r = S.routines.find(r => r.id === p.routineId), g = gymById(p.gymId);
  return { title: `${trName('אימון')}${r ? ' – ' + r.name : ''}`, where: g?.name || '', notes: p.notes || '', start: p.at, end: p.at + 75 * 60000 };
}
function planIcs(p) {
  const ev = planEvent(p), x = s => s.replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Setou//EN', 'BEGIN:VEVENT', `UID:${p.id}@gym-app`, `DTSTAMP:${icsTime(Date.now())}`,
    `DTSTART:${icsTime(ev.start)}`, `DTEND:${icsTime(ev.end)}`, `SUMMARY:${x(ev.title)}`,
    ev.where && `LOCATION:${x(ev.where)}`, ev.notes && `DESCRIPTION:${x(ev.notes)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${x(ev.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}
function googleCalUrl(p) {
  const ev = planEvent(p);
  return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: ev.title, dates: `${icsTime(ev.start)}/${icsTime(ev.end)}`, details: ev.notes, location: ev.where,
  });
}

// Calendar-style day tile used by planned and past workouts
function dateTile(t) {
  const d = new Date(t);
  return `<div class="when"><b class="num">${d.getDate()}</b><span>${d.toLocaleDateString(loc(), { month: 'short' })}</span></div>`;
}

function gymChip() {
  const g = gymById(curGymId());
  return `<button class="chip gym-chip" data-act="pick-gym">${ico('pin')}<span>${g ? esc(g.name) : 'בחר חדר כושר'}</span>${ico('down')}</button>`;
}

const wName = w => w.name || S.routines.find(r => r.id === w.routineId)?.name || '';
function workoutRow(w) {
  const sets = w.entries.reduce((t, e) => t + e.sets.length, 0);
  const names = w.entries.map(e => exById(e.exerciseId)?.name).filter(Boolean);
  return `<div class="card tap list-item" data-act="go" data-to="#/workout/${w.id}">
    ${dateTile(w.start)}
    <div class="grow">
      <div class="row between"><span class="card-title">${fmtDate(w.start)}${wName(w) ? ` · <span>${esc(wName(w))}</span>` : ''}</span>${ico('next', 'flip muted')}</div>
      <div class="meta"><span>${ico('clock')}${fmtDur(w.end - w.start)}</span><span>${ico('list')}${sets} סטים</span>${gymById(w.gymId) ? `<span>${ico('pin')}${esc(gymById(w.gymId).name)}</span>` : ''}</div>
      <div class="muted small" style="margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(names.map(trName).join(' · ')) || '—'}</div>
    </div>
  </div>`;
}

function screenWorkout() {
  const a = myActive();
  if (!a) { go('#/home'); return ''; }
  return `<div class="wk-head row between">
      <div><div class="meta" style="margin:0"><span>${a.routineName ? esc(a.routineName) : 'אימון'}</span>${gymById(a.gymId) ? `<span>${ico('pin')}${esc(gymById(a.gymId).name)}</span>` : ''}</div>${a.past ? `<div class="muted small" style="margin-top:4px">אימון שכבר עשית · ${esc(fmtDate(a.start))} · ${new Date(a.start).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })} · ${a.past} דק׳</div>
        <div class="muted small">מה שרשום כאן יישמר, בלי צורך לסמן ✓. תקן את המספרים והסר תרגיל שלא עשית.</div>` : `<div class="elapsed" style="font-size:34px;line-height:1.1" data-elapsed></div>`}</div>
      <button class="btn primary" data-act="finish-workout">${ico('check')}<span>${a.past ? 'שמור אימון' : 'סיים אימון'}</span></button>
    </div>
    ${a.entries.length ? a.entries.map((e, i) => entryCard(e, i)).join('') : emptyState('dumbbell', 'הוסף את התרגיל או המכשיר הראשון')}
    <div class="stack" style="margin-top:14px">
      <button class="btn big" data-act="pick-exercise">${ico('plus')}<span>הוסף תרגיל</span></button>
      <button class="btn block danger" data-act="cancel-workout">בטל אימון</button>
    </div>`;
}

function setMyNote(ex, text) {
  ex.notes = ex.notes || {};
  ex.notes[myKey(ex)] = text;
  save();
}

function entryCard(e, i) {
  const ex = exById(e.exerciseId);
  if (!ex) return '';
  const kind = measure(ex);
  const last = lastPerformance(ex.id);
  const note = myNote(ex);
  const cols = kind === 'cardio' ? ['דקות', 'ק״מ'] : kind === 'time' ? ['דקות'] : kind === 'reps' ? ['חזרות'] : ['ק״ג', 'חזרות'];
  const fields = kind === 'cardio' ? ['minutes', 'km'] : kind === 'time' ? ['minutes'] : kind === 'reps' ? ['reps'] : ['weight', 'reps'];
  return `<div class="card ex-card">
    <div class="ex-head">
      ${thumb(ex)}
      <div class="grow">
        <b>${esc(ex.name)}</b>
        <div class="last">${ico('last')}<span>${last ? `בפעם הקודמת (${fmtDate(last.date)}${esc(lastGym(ex, last))}): ${esc(setsSummary(last.sets, kind))}` : 'פעם ראשונה על התרגיל הזה'}</span></div>
        ${myTarget(ex) && targetText(myTarget(ex), kind) ? `<div class="last">${ico('target')}<span>יעד: ${esc(targetText(myTarget(ex), kind))}</span></div>` : ''}
        ${note ? `<button class="note note-btn" data-act="note-edit" data-id="${ex.id}">${ico('note')}<span>${esc(note)}</span></button>`
          : `<button class="note-add" data-act="note-edit" data-id="${ex.id}">${ico('edit')}<span>הערה לפעם הבאה</span></button>`}
      </div>
      ${photos[ex.id] ? `<button class="del-set" data-act="photo-open" data-id="${ex.id}" aria-label="תמונה">${ico('camera')}</button>` : ''}
      <button class="del-set" data-act="entry-menu" data-i="${i}" aria-label="אפשרויות">${ico('more')}</button>
    </div>
    <table class="sets">
      <tr><th>סט</th>${last ? '<th>קודם</th>' : ''}${cols.map(c => `<th>${c}</th>`).join('')}<th></th><th></th></tr>
      ${e.sets.map((s, j) => `<tr class="${s.done ? 'done' : ''}">
        <td class="num">${j + 1}</td>
        ${last ? `<td class="prev">${last.sets[j] ? esc(setText(last.sets[j], kind)) : '–'}</td>` : ''}
        ${fields.map(f => `<td><input inputmode="decimal" data-in="set" data-i="${i}" data-j="${j}" data-f="${f}" class="${String(fmtNum(s[f])).length > 3 ? 'long' : ''}" value="${fmtNum(s[f])}" placeholder="${f === 'weight' ? 'ק״ג' : '0'}"></td>`).join('')}
        <td style="width:50px"><button class="check" data-act="toggle-set" data-i="${i}" data-j="${j}" aria-label="סיימתי">${ico('check')}</button></td>
        <td style="width:28px"><button class="del-set" data-act="del-set" data-i="${i}" data-j="${j}" aria-label="מחק סט">${ico('x')}</button></td>
      </tr>`).join('')}
    </table>
    <button class="btn sm block" data-act="add-set" data-i="${i}" style="margin-top:4px">${ico('plus')}<span>סט</span></button>
  </div>`;
}

function screenExercises() {
  const f = ui.exFilter.trim();
  const gym = ui.exGym;
  const list = S.exercises.filter(e => (!f || nameHas(e, f) || e.muscle === f) && atGym(e, gym) && (!ui.exSplit || splitOf(e) === ui.exSplit)).sort(byName);
  return `${topbar('המכשירים והתרגילים שלי')}
    <div class="row" style="margin-bottom:12px">
      <label class="search grow">${ico('search')}<input class="input" data-in="ex-filter" placeholder="חיפוש" value="${esc(ui.exFilter)}"></label>
      <button class="btn primary" data-act="go" data-to="#/exercise-new">${ico('plus')}<span>חדש</span></button>
    </div>
    <button class="btn block" style="margin-bottom:12px" data-act="open-catalog">${ico('list')}<span>הוסף מהרשימה המוכנה</span></button>
    ${S.gyms.length ? `<div class="chips" style="margin-bottom:12px">
      <button class="chip ${!gym ? 'on' : ''}" data-act="ex-gym" data-id="">הכל</button>
      ${S.gyms.map(g => `<button class="chip ${gym === g.id ? 'on' : ''}" data-act="ex-gym" data-id="${g.id}">${ico('pin')}<span>${esc(g.name)}</span></button>`).join('')}
    </div>` : ''}
    ${splitChips('ex-split', ui.exSplit)}
    ${list.length ? byTopic(list).map(([t, l]) => `<h2 class="topic">${t}</h2><div class="grid">${l.map(ex => `
      <div class="tile tap" data-act="go" data-to="#/exercise/${ex.id}">
        ${thumb(ex)}
        <div class="body"><div class="name">${esc(ex.name)}</div><span class="tag accent">${esc(ex.muscle || TYPES[ex.type].label)}</span></div>
      </div>`).join('')}</div>`).join('')
    : emptyState(S.exercises.length ? 'search' : 'camera', S.exercises.length ? 'לא נמצא' : 'עוד אין מכשירים. בחר מהרשימה המוכנה, או צלם מכשיר בחדר הכושר ותן לו שם.')}`;
}

function screenExercise(id) {
  const ex = exById(id);
  if (!ex) { go('#/exercises'); return ''; }
  const kind = measure(ex);
  const hist = [];
  for (const w of myWorkouts()) {
    const e = w.entries.find(e => e.exerciseId === id);
    if (e && e.sets.length) hist.push({ date: w.start, sets: e.sets, gymId: w.gymId });
  }
  let best = '';
  if (kind === 'weight' && hist.length) {
    const max = Math.max(...hist.flatMap(h => h.sets.map(s => s.weight || 0)));
    best = `<div class="stat"><b>${fmtNum(max)}</b><span>שיא (ק״ג)</span></div>`;
  }
  return `${topbar(esc(ex.name), true)}
    ${thumb(ex, 'lg')}
    <div class="row" style="margin:10px 0"><span class="tag">${TYPES[ex.type].label}</span>${ex.muscle ? `<span class="tag accent">${esc(ex.muscle)}</span>` : ''}</div>
    ${window.musclesCard ? musclesCard(ex) : ''}
    ${S.gyms.length ? `<div class="field"><span class="label">${ico('pin')} <span>באיזה חדר כושר יש את זה? (בלי סימון = בכל מקום)</span></span>
      <div class="chips">${S.gyms.map(g => `<button class="chip ${(ex.gymIds || []).includes(g.id) ? 'on' : ''}" data-act="ex-gym-toggle" data-id="${ex.id}" data-gym="${g.id}">${ico('pin')}<span>${esc(g.name)}</span></button>`).join('')}</div>
    </div>` : ''}
    <div class="field"><span class="label">${ico('plan')} <span>מתאים ליום</span></span>
      <div class="chips">${[...Object.entries(SPLITS), ['none', 'ללא']].map(([k, l]) => `<button class="chip ${(splitOf(ex) || 'none') === k ? 'on' : ''}" data-act="ex-split-set" data-id="${ex.id}" data-v="${k}">${l}</button>`).join('')}</div>
      ${ex.split ? `<button class="link small" style="margin-top:6px" data-act="ex-split-set" data-id="${ex.id}" data-v="">החזר לאוטומטי</button>` : `<div class="muted small" style="margin-top:6px">נקבע אוטומטית לפי השריר. אפשר לשנות.</div>`}
    </div>
    ${(() => { const last = lastPerformance(ex.id); return `<div class="card field"><span class="label">${ico('last')} <span>הפעם האחרונה</span>${last ? ` <span class="muted">· ${esc(fmtDate(last.date) + lastGym(ex, last))}</span>` : ''}</span>
      ${last ? `<div class="chips" style="margin-top:4px">${last.sets.map((st, j) => `<span class="chip last-set"><span class="muted">${j + 1}</span><b>${esc(setText(st, kind))}</b></span>`).join('')}</div>`
        : '<div class="muted">עוד לא עשית את התרגיל הזה</div>'}
    </div>`; })()}
    ${perGym(ex) ? `<div class="muted small" style="margin:-4px 0 10px">${ico('pin')} <span>מוצג לפי ${esc(gymById(perGym(ex)).name)}. המשקלים, היעד וההערות נשמרים בנפרד לכל חדר כושר.</span></div>` : ''}
    <label class="field"><span>ההערות שלי (גובה מושב, מיקום ידית...)</span>
      <textarea class="input" data-in="ex-note" data-id="${ex.id}" placeholder="למשל: מושב בחור 4, משענת 2">${esc(myNote(ex))}</textarea>
    </label>
    <details class="card target-box"><summary>${ico('target')} <span>היעד שלי</span> <span class="muted small open-hint">(לחץ לפתיחה)</span>${targetText(myTarget(ex), kind) ? `<span class="muted tgt-sum">${esc(targetText(myTarget(ex), kind))}</span>` : ''}</summary>
      <div class="muted small" style="margin:8px 0">ימולא אוטומטית כשמתחילים אימון</div>
      ${targetFields(ex)}
    </details>
    <div class="stats" style="grid-template-columns:repeat(${best ? 2 : 1},1fr);margin-top:6px">
      <div class="stat"><b>${hist.length}</b><span>פעמים</span></div>${best}
    </div>
    ${photos[ex.id] ? `<div class="card list-item tap" style="margin-top:12px" data-act="photo-open" data-id="${ex.id}">
      <img class="photo-mini" src="${photos[ex.id]}" alt=""><div class="grow"><b>התמונה שלי</b><div class="muted small">לחץ להגדלה</div></div>${ico('camera', 'muted')}
    </div>` : ''}
    <h2>היסטוריה</h2>
    ${hist.length ? hist.slice(0, 20).map(h => `<div class="card list-item">${dateTile(h.date)}<div class="grow"><div class="card-title">${fmtDate(h.date)}</div><div class="muted small">${esc(setsSummary(h.sets, kind))}${(ex.gymIds || []).length > 1 && gymById(h.gymId) ? ` · ${esc(gymById(h.gymId).name)}` : ''}</div></div></div>`).join('')
      : emptyState('history', 'עוד לא עשית את התרגיל הזה')}
    <hr>
    <button class="btn block" data-act="go" data-to="#/exercise-edit/${ex.id}">${ico('edit')}<span>עריכה</span></button>`;
}

function screenExerciseEdit(id) {
  const ex = id ? exById(id) : null;
  if (id && !ex) { go('#/exercises'); return ''; }
  const draft = ui.draft || (ui.draft = ex ? { ...ex, gymIds: [...(ex.gymIds || [])], photo: photos[ex.id] || null } : { name: '', type: 'machine', muscle: '', photo: null, gymIds: curGymId() ? [curGymId()] : [] });
  draft.gymIds = draft.gymIds || [];
  return `${topbar(ex ? 'עריכת תרגיל' : 'מכשיר / תרגיל חדש', true)}
    <label class="field"><span>תמונה</span>
      ${draft.photo ? `<div class="photo-view"><img src="${draft.photo}" alt=""></div>` : `<div class="thumb lg">${ico('camera')}</div>`}
    </label>
    <div class="btns" style="margin:-4px 0 16px">
      <label class="btn">${ico('camera')}<span>צלם</span><input type="file" accept="image/*" capture="environment" data-in="photo" hidden></label>
      <label class="btn">${ico('image')}<span>מהגלריה</span><input type="file" accept="image/*" data-in="photo" hidden></label>
      ${draft.photo ? `<button class="btn danger" data-act="photo-clear">הסר</button>` : ''}
    </div>
    <label class="field"><span>שם</span>
      <input class="input" data-in="draft" data-f="name" value="${esc(draft.name)}" placeholder="למשל: לחיצת חזה במכונה" autocomplete="off">
    </label>
    <div class="field"><span class="label">סוג</span>
      <div class="chips">${Object.entries(TYPES).map(([k, t]) => `<button class="chip ${draft.type === k ? 'on' : ''}" data-act="draft-set" data-f="type" data-v="${k}">${t.label}</button>`).join('')}</div>
    </div>
    <div class="field"><span class="label">קבוצת שרירים</span>
      <div class="chips">${MUSCLES.map(m => `<button class="chip ${draft.muscle === m ? 'on' : ''}" data-act="draft-set" data-f="muscle" data-v="${m}">${m}</button>`).join('')}</div>
    </div>
    ${S.gyms.length ? `<div class="field"><span class="label">באיזה חדר כושר? (בלי סימון = בכל מקום)</span>
      <div class="chips">${S.gyms.map(g => `<button class="chip ${draft.gymIds.includes(g.id) ? 'on' : ''}" data-act="draft-gym" data-id="${g.id}">${ico('pin')}<span>${esc(g.name)}</span></button>`).join('')}</div>
    </div>` : ''}
    <div class="stack" style="margin-top:22px">
      <button class="btn primary big" data-act="save-exercise" data-id="${ex ? ex.id : ''}">שמור</button>
      ${ex ? `<button class="btn block danger" data-act="delete-exercise" data-id="${ex.id}">מחק תרגיל</button>` : ''}
    </div>`;
}

function screenRoutines() {
  const rs = S.routines.filter(r => r.userId === S.settings.currentUserId);
  return `${topbar('תוכניות האימון שלי')}
    <p class="muted" style="margin-top:0">תוכנית היא רשימה קבועה של תרגילים, למשל "אימון א" ו"אימון ב". מתחילים אותה בלחיצה אחת.</p>
    ${rs.map(r => `<div class="card">
      <div class="row between"><span class="card-title" style="font-size:18px">${esc(r.name)}</span><button class="btn sm ghost" data-act="go" data-to="#/routine/${r.id}">${ico('edit')}<span>עריכה</span></button></div>
      <div class="meta" style="margin:2px 0 4px"><span>${ico('list')}${r.exerciseIds.filter(exById).length} תרגילים</span></div>
      <div class="muted small" style="margin:0 0 12px">${esc(r.exerciseIds.map(id => exById(id)?.name).filter(Boolean).map(trName).join(' · ')) || 'אין תרגילים'}</div>
      <button class="btn primary block" data-act="start-routine" data-id="${r.id}">${ico('play')}<span>התחל</span></button>
    </div>`).join('') || emptyState('plan', 'עוד אין תוכניות')}
    <button class="btn big" style="margin-top:14px" data-act="go" data-to="#/routine/new">${ico('plus')}<span>תוכנית חדשה</span></button>`;
}

function screenRoutineEdit(id) {
  const r = id === 'new' ? null : S.routines.find(r => r.id === id);
  if (id !== 'new' && !r) { go('#/routines'); return ''; }
  const draft = ui.draft || (ui.draft = r ? { name: r.name, exerciseIds: [...r.exerciseIds] } : { name: '', exerciseIds: [] });
  const sorted = [...S.exercises].sort(byName);
  return `${topbar(r ? 'עריכת תוכנית' : 'תוכנית חדשה', true)}
    <label class="field"><span>שם התוכנית</span>
      <input class="input" data-in="draft" data-f="name" value="${esc(draft.name)}" placeholder="למשל: אימון א - פלג גוף עליון" autocomplete="off">
    </label>
    <h2>תרגילים בתוכנית (${draft.exerciseIds.length})</h2>
    ${draft.exerciseIds.map((xid, i) => { const ex = exById(xid); return ex ? `<div class="card stack">
      <div class="list-item">
        <b class="num muted" style="font-size:20px">${i + 1}</b><div class="grow card-title">${esc(ex.name)}</div>
        <button class="btn sm" data-act="r-move" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="למעלה">${ico('up')}</button>
        <button class="btn sm" data-act="r-move" data-i="${i}" data-d="1" ${i === draft.exerciseIds.length - 1 ? 'disabled' : ''} aria-label="למטה">${ico('down')}</button>
        <button class="btn sm danger" data-act="r-remove" data-i="${i}" aria-label="הסר">${ico('x')}</button>
      </div>
      ${targetFields(ex, true)}
      <div class="muted small">${ico('last')} <span>${esc(lastLine(ex))}</span></div>
    </div>` : ''; }).join('') || '<p class="muted">בחר תרגילים מהרשימה למטה</p>'}
    <h2>הוסף תרגיל</h2>
    ${sorted.length ? splitChips('r-split', ui.rSplit) : ''}
    ${sorted.length ? `<div class="chips">${sorted.filter(e => !draft.exerciseIds.includes(e.id) && (!ui.rSplit || splitOf(e) === ui.rSplit)).map(e => `<button class="chip" data-act="r-add" data-id="${e.id}">${ico('plus')}<span>${esc(e.name)}</span></button>`).join('')}</div>`
      : `<p class="muted">קודם צריך להוסיף מכשירים בלשונית "מכשירים".</p>`}
    <div class="stack" style="margin-top:22px">
      <button class="btn primary big" data-act="save-routine" data-id="${r ? r.id : ''}">שמור</button>
      ${r ? `<button class="btn block danger" data-act="delete-routine" data-id="${r.id}">מחק תוכנית</button>` : ''}
    </div>`;
}

function screenHistory() {
  const ws = myWorkouts();
  const monthFrom = new Date(); monthFrom.setDate(1); monthFrom.setHours(0, 0, 0, 0);
  const month = ws.filter(w => w.start >= monthFrom.getTime());
  const st = weekStats();
  let lastMonth = '';
  return `${topbar('היסטוריה')}
    <button class="btn block" style="margin-bottom:12px" data-act="past-new">${ico('plus')}<span>הוסף אימון שכבר עשיתי</span></button>
    <div class="stats">
      <div class="stat"><b>${st.count}</b><span>השבוע</span></div>
      <div class="stat"><b>${month.length}</b><span>החודש</span></div>
      <div class="stat"><b>${ws.length}</b><span>סה״כ</span></div>
    </div>
    ${ws.length ? ws.map(w => {
      const m = new Date(w.start).toLocaleDateString(loc(), { month: 'long', year: 'numeric' });
      const head = m !== lastMonth ? `<h2>${m}</h2>` : '';
      lastMonth = m;
      return head + workoutRow(w);
    }).join('') : emptyState('history', 'כאן יופיעו האימונים שלך')}`;
}

function screenWorkoutView(id) {
  const w = S.workouts.find(w => w.id === id);
  if (!w) { go('#/history'); return ''; }
  const d = new Date(w.start);
  return `${topbar(fmtDate(w.start), true)}
    <p class="muted" style="margin-top:0">${d.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' })} · ${d.toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })} · ${fmtDur(w.end - w.start)}</p>
    ${wName(w) || gymById(w.gymId) ? `<div class="meta" style="margin:-4px 0 12px">${wName(w) ? `<span>${ico('plan')}${esc(wName(w))}</span>` : ''}${gymById(w.gymId) ? `<span>${ico('pin')}${esc(gymById(w.gymId).name)}</span>` : ''}</div>` : ''}
    ${w.entries.map(e => { const ex = exById(e.exerciseId); return `<div class="card list-item">
      ${thumb(ex)}<div class="grow"><b>${esc(ex?.name || 'תרגיל שנמחק')}</b><div class="muted small">${esc(setsSummary(e.sets, measure(ex)))}</div></div>
    </div>`; }).join('')}
    <hr>
    <button class="btn block danger" data-act="delete-workout" data-id="${w.id}">${ico('trash')}<span>מחק אימון</span></button>`;
}

function screenUsers() {
  const cloud = !!cloudUser;
  return `${topbar(cloud ? 'הגדרות' : 'משתמשים והגדרות', true)}
    <div class="row between card" style="margin:8px 0 4px"><b>${ico('globe')} <span>שפה</span></b>${langSwitch()}</div>
    ${cloud ? cloudSettingsSection() : `<h2>מי מתאמן?</h2>
    ${S.users.map(u => `<div class="card list-item tap" data-act="switch-user" data-id="${u.id}">
      <span class="avatar">${esc(u.name.trim()[0] || '?')}</span>
      <b class="grow">${esc(u.name)}</b>
      ${u.id === S.settings.currentUserId ? '<span class="tag accent">פעיל</span>' : ''}
    </div>`).join('')}
    <div class="row" style="margin-top:12px">
      <input class="input grow" id="add-user-name" placeholder="שם משתמש חדש" autocomplete="off">
      <button class="btn primary" data-act="add-user">הוסף</button>
    </div>
    ${window.FIREBASE_CONFIG ? cloudSettingsSection() : ''}`}
    <h2>חדרי כושר</h2>
    ${S.gyms.map(g => `<div class="card list-item">
      <span class="tag accent" style="padding:8px">${ico('pin')}</span><b class="grow">${esc(g.name)}</b>
      <button class="btn sm" data-act="rename-gym" data-id="${g.id}" aria-label="שנה שם">${ico('edit')}</button>
      <button class="btn sm danger" data-act="delete-gym" data-id="${g.id}" aria-label="מחק">${ico('trash')}</button>
    </div>`).join('') || '<p class="muted small" style="margin-top:0">עוד אין חדרי כושר</p>'}
    <div class="row" style="margin-top:12px">
      <input class="input grow" id="new-gym-name" placeholder="שם חדר כושר חדש" autocomplete="off">
      <button class="btn primary" data-act="add-gym">הוסף</button>
    </div>
    <h2>הגדרות</h2>
    <label class="field"><span>זמן מנוחה בין סטים (שניות)</span>
      <input class="input" inputmode="numeric" data-in="setting" data-f="restSeconds" value="${S.settings.restSeconds}">
    </label>
    <label class="field"><span>יעד אימונים בשבוע</span>
      <input class="input" inputmode="numeric" data-in="setting" data-f="weeklyGoal" value="${S.settings.weeklyGoal}">
    </label>
    <h2>צבעים</h2>
    <div class="chips">${[['gold', 'שחור וזהב'], ['goldlight', 'לבן וזהב'], ['blue', 'כחול'], ['green', 'ירוק']].map(([v, l]) => `<button class="chip ${(document.documentElement.dataset.palette || 'gold') === v ? 'on' : ''}" data-act="palette" data-v="${v}"><span style="width:14px;height:14px;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.75);background:${{ blue: '#3b82f6', gold: '#f5c518', goldlight: 'linear-gradient(135deg, #fff 50%, #c99700 50%)', green: '#34d399' }[v]}"></span><span>${l}</span></button>`).join('')}</div>
    <h2>גיבוי</h2>
    ${cloud ? `<p class="muted small" style="margin-top:0">הנתונים שלך נשמרים בענן. אפשר גם לשמור עותק כקובץ.</p>
    <div class="btns"><button class="btn" data-act="export">${ico('download')}<span>שמור גיבוי</span></button></div>`
    : `<p class="muted small" style="margin-top:0">כרגע הנתונים שמורים רק בטלפון הזה. מומלץ לשמור גיבוי מדי פעם.</p>
    <div class="btns">
      <button class="btn" data-act="export">${ico('download')}<span>שמור גיבוי</span></button>
      <label class="btn">${ico('upload')}<span>שחזר מגיבוי</span><input type="file" accept="application/json,.json" data-in="import" hidden></label>
    </div>`}
    <h2>התקנה</h2>
    <div class="card list-item" style="align-items:flex-start"><span class="tag accent" style="padding:8px">${ico('phone')}</span><div class="grow"><b>באייפון</b>
      <p class="muted small" style="margin:4px 0 0">בספארי: לחץ על כפתור השיתוף ואז "הוסף למסך הבית". האפליקציה תיפתח במסך מלא ותעבוד גם בלי קליטה.</p></div></div>
    <div class="card list-item" style="align-items:flex-start"><span class="tag accent" style="padding:8px">${ico('download')}</span><div class="grow"><b>במחשב (כרום או אדג׳)</b>
      <p class="muted small" style="margin:4px 0 0">פתח את האתר בדפדפן ולחץ על סמל ההתקנה בצד שורת הכתובת. אם הוא לא מופיע: תפריט שלוש הנקודות, ואז "שמירה ושיתוף" ואז "התקנת Setou". אחרי ההתקנה אפשר להצמיד לשורת המשימות.</p></div></div>
    <div class="card list-item" style="align-items:flex-start"><span class="tag accent" style="padding:8px">${ico('download')}</span><div class="grow"><b>במק (ספארי)</b>
      <p class="muted small" style="margin:4px 0 0">בתפריט "קובץ" בחר "הוסף ל־Dock".</p></div></div>
    <div class="center" style="margin-top:30px">${brand()}<p class="muted small" style="margin:6px 0 0">גרסה ${APP_VERSION}</p></div>
    ${cloud ? '' : `<hr>
    <button class="btn block danger" data-act="delete-user" data-id="${S.settings.currentUserId}">מחק את המשתמש ${esc(me()?.name)}</button>`}`;
}

/* ================= Modals ================= */

// Day chips + hour:minute arrows, easier on a phone than the native date-time field.
// kind 'past' (logging a workout already done) offers today/yesterday/2 days ago; 'plan' offers today/tomorrow/day after.
const whenDraft = k => k === 'past' ? ui.pastDraft : ui.planDraft;
function whenPicker(kind, t) {
  const at = new Date(t), past = kind === 'past';
  const off = Math.round((startOfDay(at) - startOfDay(new Date())) / DAY) * (past ? -1 : 1);
  const today = toLocalInput(Date.now()).slice(0, 10);
  return `<div><span class="muted small">באיזה יום?</span><div class="chips" style="margin-top:6px">
      ${[0, 1, 2].map(n => `<button class="chip ${off === n ? 'on' : ''}" data-act="when-day" data-k="${kind}" data-v="${past ? -n : n}">${(past ? ['היום', 'אתמול', 'שלשום'] : ['היום', 'מחר', 'מחרתיים'])[n]}</button>`).join('')}
      <label class="chip ${off > 2 || off < 0 ? 'on' : ''}" style="position:relative">${ico('calendar')}<span>${off > 2 || off < 0 ? esc(at.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'numeric' })) : 'תאריך אחר'}</span>
        <input type="date" data-in="when" data-k="${kind}" ${past ? `max="${today}"` : `min="${today}"`} value="${toLocalInput(t).slice(0, 10)}" style="position:absolute;inset:0;opacity:0;width:100%"></label>
    </div></div>
    <div><span class="muted small">${past ? 'באיזו שעה התחלת?' : 'באיזו שעה?'}</span>
      <div class="time-pick" dir="ltr">
        <div class="tp-col"><button class="btn sm" data-act="when-time" data-k="${kind}" data-v="60" aria-label="+1h">${ico('up')}</button><b class="num">${pad2(at.getHours())}</b><button class="btn sm" data-act="when-time" data-k="${kind}" data-v="-60" aria-label="-1h">${ico('down')}</button></div>
        <b class="num tp-sep">:</b>
        <div class="tp-col"><button class="btn sm" data-act="when-time" data-k="${kind}" data-v="5" aria-label="+5m">${ico('up')}</button><b class="num">${pad2(at.getMinutes())}</b><button class="btn sm" data-act="when-time" data-k="${kind}" data-v="-5" aria-label="-5m">${ico('down')}</button></div>
      </div></div>`;
}
function renderModal() {
  const m = ui.modal, el = $('#modal');
  if (!m) { el.innerHTML = ''; return; }
  if (m.type === 'pick') {
    const a = myActive();
    const inWorkout = new Set(a ? a.entries.map(e => e.exerciseId) : []);
    const f = (m.filter || '').trim();
    const list = S.exercises.filter(e => (!f || nameHas(e, f)) && atGym(e, a?.gymId) && (!m.split || splitOf(e) === m.split)).sort(byName);
    el.innerHTML = `<div class="sheet" data-stop>
      <div class="row between"><h2>בחר תרגיל</h2><button class="btn sm" data-act="close-modal">סגור</button></div>
      <label class="search" style="display:block;margin-bottom:10px">${ico('search')}<input class="input" data-in="pick-filter" placeholder="חיפוש" value="${esc(m.filter || '')}"></label>
      ${splitChips('pick-split', m.split)}
      ${byTopic(list).map(([t, l]) => `<h2 class="topic">${t}</h2>${l.map(ex => `<div class="card list-item tap" data-act="add-entry" data-id="${ex.id}">
        ${thumb(ex)}<div class="grow"><b>${esc(ex.name)}</b><div class="muted small">${esc(ex.muscle || TYPES[ex.type].label)}${inWorkout.has(ex.id) ? ' · כבר באימון' : ''}</div></div>
      </div>`).join('')}`).join('') || `<div class="empty">${S.exercises.length ? 'לא נמצא' : 'עוד אין מכשירים'}</div>`}
      <div class="btns" style="margin-top:12px">
        <button class="btn" data-act="open-catalog">${ico('list')}<span>מהרשימה</span></button>
        <button class="btn" data-act="new-ex-from-workout">${ico('plus')}<span>חדש</span></button>
      </div>
    </div>`;
  } else if (m.type === 'catalog') {
    const n = m.picked.length;
    el.innerHTML = `<div class="sheet" data-stop>
      <div class="row between"><h2>רשימה מוכנה</h2><button class="btn sm" data-act="close-modal">סגור</button></div>
      ${S.gyms.length ? `<div class="field" style="margin-top:0"><span class="label">באיזה חדר כושר יש את המכשירים?</span>
        <div class="chips">${S.gyms.map(g => `<button class="chip ${m.gymIds.includes(g.id) ? 'on' : ''}" data-act="catalog-gym" data-id="${g.id}">${ico('pin')}<span>${esc(g.name)}</span></button>`).join('')}</div>
        <div class="muted small" style="margin-top:6px">משקולות חופשיות ותרגילים בלי ציוד זמינים בכל מקום.</div>
      </div>` : ''}
      <p class="muted small" style="margin-top:0">בחר מה להוסיף. מה שכבר ברשימה שלך מסומן ב־✓, ולחיצה עליו מסירה אותו.</p>
      ${CATALOG.map(([title, items]) => `<h2 class="topic">${title}</h2>
        <div class="chips">${items.map(([name, type]) => {
          const ex = S.exercises.find(e => e.name === name);
          if (ex && !(catalogGyms(m, name, type).some(id => !(ex.gymIds || []).includes(id)) && (ex.gymIds || []).length))
            return `<button class="chip" style="opacity:.55" data-act="catalog-remove" data-id="${ex.id}">${ico('check')}<span>${esc(name)}</span>${ico('x')}</button>`;
          return `<button class="chip ${m.picked.includes(name) ? 'on' : ''}" data-act="catalog-toggle" data-v="${esc(name)}">${esc(name)}</button>`;
        }).join('')}</div>`).join('')}
      <div style="position:sticky;bottom:0;padding-top:12px;background:var(--bg)">
        <button class="btn primary big" data-act="catalog-add" ${n ? '' : 'disabled'}>${n ? `הוסף ${n}` : 'בחר תרגילים'}</button>
      </div>
    </div>`;
  } else if (m.type === 'plan') {
    const d = ui.planDraft, rs = S.routines.filter(r => r.userId === S.settings.currentUserId), saved = S.plans.some(p => p.id === d.id);
    el.innerHTML = `<div class="sheet stack" data-stop>
      <div class="row between"><h2>${saved ? 'אימון מתוכנן' : 'תכנון אימון'}</h2><button class="btn sm" data-act="close-modal">סגור</button></div>
      ${whenPicker('plan', d.at)}
      ${S.gyms.length ? `<div><span class="muted small">איפה?</span><div class="chips" style="margin-top:6px">${S.gyms.map(g => `<button class="chip ${d.gymId === g.id ? 'on' : ''}" data-act="plan-set" data-f="gymId" data-v="${g.id}">${ico('pin')}<span>${esc(g.name)}</span></button>`).join('')}</div></div>` : ''}
      ${rs.length ? `<div><span class="muted small">איזו תוכנית? (לא חובה)</span><div class="chips" style="margin-top:6px">${rs.map(r => `<button class="chip ${d.routineId === r.id ? 'on' : ''}" data-act="plan-set" data-f="routineId" data-v="${r.id}">${esc(r.name)}</button>`).join('')}</div></div>` : ''}
      <label class="field" style="margin:0"><span>הערות</span><textarea class="input" data-in="plan" data-f="notes" placeholder="למשל: יום רגליים, להביא אוזניות">${esc(d.notes || '')}</textarea></label>
      <button class="btn primary block" data-act="plan-save">${saved ? 'שמור שינויים' : 'שמור'}</button>
      ${saved ? `<div class="btns"><button class="btn" data-act="plan-ics">${ico('calendar')}<span>ליומן באייפון</span></button><button class="btn" data-act="plan-google">${ico('calendar')}<span>ליומן גוגל</span></button></div>
      <button class="btn block danger" data-act="plan-delete" data-id="${d.id}">מחק</button>` : ''}
    </div>`;
  } else if (m.type === 'photo') {
    const ex = exById(m.id);
    el.innerHTML = `<div class="sheet stack" data-stop>
      <div class="row between"><h2>${esc(ex?.name || '')}</h2><button class="btn sm" data-act="close-modal">סגור</button></div>
      <img src="${photos[m.id] || ''}" alt="" style="width:100%;max-height:70vh;object-fit:contain;border-radius:16px;background:#000">
    </div>`;
  } else if (m.type === 'past') {
    const d = ui.pastDraft, rs = S.routines.filter(r => r.userId === S.settings.currentUserId);
    const how = [['', 'אימון ריק'], ...Object.entries(SPLITS).filter(([k]) => k !== 'core').map(([k, l]) => ['day:' + k, `יום ${l}`]), ['day:full', 'יום Full body'], ...rs.map(r => ['r:' + r.id, r.name])];
    el.innerHTML = `<div class="sheet stack" data-stop>
      <div class="row between"><h2>אימון שכבר עשית</h2><button class="btn sm" data-act="close-modal">סגור</button></div>
      ${whenPicker('past', d.at)}
      <div><span class="muted small">כמה זמן נמשך? (דקות)</span><div class="chips" style="margin-top:6px">
        ${[30, 45, 60, 75, 90, 120].map(n => `<button class="chip ${+d.minutes === n ? 'on' : ''}" data-act="past-set" data-f="minutes" data-v="${n}">${n}</button>`).join('')}
        <input class="input" style="width:76px;padding:8px;text-align:center" inputmode="numeric" data-in="past" data-f="minutes" value="${[30, 45, 60, 75, 90, 120].includes(+d.minutes) ? '' : esc(d.minutes)}" placeholder="אחר">
      </div></div>
      ${S.gyms.length ? `<div><span class="muted small">איפה?</span><div class="chips" style="margin-top:6px">${S.gyms.map(g => `<button class="chip ${d.gymId === g.id ? 'on' : ''}" data-act="past-set" data-f="gymId" data-v="${g.id}">${ico('pin')}<span>${esc(g.name)}</span></button>`).join('')}</div></div>` : ''}
      <div><span class="muted small">מה עשית?</span><div class="chips" style="margin-top:6px">${how.map(([k, l]) => `<button class="chip ${d.how === k ? 'on' : ''}" data-act="past-set" data-f="how" data-v="${k}">${esc(l)}</button>`).join('')}</div></div>
      <button class="btn primary block" data-act="past-start">${ico('edit')}<span>המשך לרישום התרגילים</span></button>
    </div>`;
  } else if (m.type === 'gym') {
    const cur = curGymId();
    el.innerHTML = `<div class="sheet stack" data-stop>
      <div class="row between"><h2>איפה אתה מתאמן?</h2><button class="btn sm" data-act="close-modal">סגור</button></div>
      ${S.gyms.map(g => `<button class="btn block ${g.id === cur ? 'primary' : ''}" data-act="set-gym" data-id="${g.id}">${ico('pin')}<span>${esc(g.name)}</span></button>`).join('')}
      ${S.gyms.length ? `<button class="btn block ${!cur ? 'primary' : ''}" data-act="set-gym" data-id="">בלי חדר כושר מסוים</button>` : '<p class="muted">עוד אין חדרי כושר. הוסף את הראשון:</p>'}
      <div class="row"><input class="input grow" id="new-gym-name" placeholder="למשל: אייקון רעננה" autocomplete="off"><button class="btn primary" data-act="add-gym">הוסף</button></div>
    </div>`;
  } else if (m.type === 'rename-gym') {
    el.innerHTML = `<div class="sheet stack" data-stop>
      <h2>שינוי שם</h2>
      <input class="input" id="rename-gym-name" value="${esc(gymById(m.id)?.name)}" autocomplete="off">
      <button class="btn primary block" data-act="save-gym-name" data-id="${m.id}">שמור</button>
      <button class="btn block" data-act="close-modal">ביטול</button>
    </div>`;
  } else if (m.type === 'confirm') {
    el.innerHTML = `<div class="sheet stack" data-stop>
      <p style="font-size:18px;margin:4px 0 8px">${esc(m.msg)}</p>
      <button class="btn block ${m.danger ? 'danger' : 'primary'}" data-act="confirm-ok">${esc(m.okLabel)}</button>
      <button class="btn block" data-act="confirm-no">ביטול</button>
    </div>`;
  } else if (m.type === 'note') {
    const ex = exById(m.id);
    el.innerHTML = `<div class="sheet stack" data-stop>
      <h2>הערה לפעם הבאה</h2>
      <div class="muted small" style="margin-top:-6px">${esc(ex.name)}. ההערה תופיע אוטומטית כשתגיע למכשיר הזה שוב.</div>
      <textarea class="input" id="note-text" rows="3" placeholder="למשל: היה כבד, להוריד ל־40 ק״ג">${esc(myNote(ex))}</textarea>
      <button class="btn primary block" data-act="note-save" data-id="${ex.id}">שמור</button>
      ${myNote(ex) ? `<button class="btn block danger" data-act="note-clear" data-id="${ex.id}">מחק הערה</button>` : ''}
      <button class="btn block" data-act="close-modal">ביטול</button>
    </div>`;
    setTimeout(() => { const t = $('#note-text'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 50);
  } else if (m.type === 'entry') {
    const a = myActive(), n = a.entries.length;
    el.innerHTML = `<div class="sheet stack" data-stop>
      <h2>${esc(exById(a.entries[m.i].exerciseId)?.name)}</h2>
      <button class="btn block" data-act="entry-move" data-i="${m.i}" data-d="-1" ${m.i === 0 ? 'disabled' : ''}>${ico('up')}<span>הזז למעלה</span></button>
      <button class="btn block" data-act="entry-move" data-i="${m.i}" data-d="1" ${m.i === n - 1 ? 'disabled' : ''}>${ico('down')}<span>הזז למטה</span></button>
      <button class="btn block danger" data-act="entry-remove" data-i="${m.i}">הסר מהאימון</button>
      <button class="btn block" data-act="close-modal">סגור</button>
    </div>`;
  }
}

/* ================= Rest timer ================= */

const rest = { endsAt: 0, total: 0, alerted: false };
let audioCtx;
function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (_) { /* no audio */ }
}
function beep() {
  try {
    if (!audioCtx) return;
    [0, 0.25, 0.5].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.2);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch (_) { /* no audio */ }
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}
function startRest(sec = S.settings.restSeconds) {
  rest.total = sec * 1000;
  rest.endsAt = Date.now() + rest.total;
  rest.alerted = false;
  tick();
}
function renderRest() {
  const el = $('#rest');
  document.body.classList.toggle('resting', !!rest.endsAt);
  if (!rest.endsAt) { el.innerHTML = ''; el.className = ''; return; }
  const left = rest.endsAt - Date.now();
  if (left <= 0 && !rest.alerted) { rest.alerted = true; beep(); }
  if (left < -60000) { rest.endsAt = 0; el.innerHTML = ''; el.className = ''; return; }
  el.className = left <= 0 ? 'over' : '';
  const pct = Math.max(0, Math.min(100, (1 - left / rest.total) * 100));
  el.innerHTML = `<div class="bar" style="width:${pct}%"></div>
    <div class="time">${left > 0 ? ico('clock') + clock(left + 999) : 'יאללה, סט הבא! 💪'}</div>
    <button class="btn sm" data-act="rest-add" data-v="-15">−15</button>
    <button class="btn sm" data-act="rest-add" data-v="15">+15</button>
    <button class="btn sm" data-act="rest-stop">${left > 0 ? 'דלג' : 'סגור'}</button>`;
}

/* ================= Wake lock (screen stays on during a workout) ================= */

let wakeLock = null;
async function updateWakeLock() {
  const want = !!myActive() && !myActive().past && document.visibilityState === 'visible';
  try {
    if (want && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!want && wakeLock) {
      await wakeLock.release(); wakeLock = null;
    }
  } catch (_) { wakeLock = null; }
}

/* ================= Render ================= */

function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, id] = h.split('/');
  return { name, id };
}

let lastRoute = '';
function render() {
  // Built-in names that were renamed after people already added them
  for (const e of S.exercises) if (RENAMED[e.name]) { e.name = RENAMED[e.name]; save(); }
  const app = $('#app');
  if (ui.cloudScreen) {
    app.innerHTML = cloudScreen();
    $('#nav').innerHTML = ''; $('#banner').innerHTML = '';
    renderModal();
    return;
  }
  if (!S.users.length) {
    app.innerHTML = screenOnboarding();
    $('#nav').innerHTML = ''; $('#banner').innerHTML = '';
    return;
  }
  const r = route();
  const key = r.name + '/' + (r.id || '');
  if (key !== lastRoute) {
    if (!['exercise-new', 'exercise-edit', 'routine'].includes(r.name)) ui.draft = null;
    // Machines screen opens on "all gyms · all days"; coming back from a machine page keeps the filter
    if (r.name === 'exercises' && !/^exercise/.test(lastRoute)) { ui.exGym = null; ui.exSplit = ''; }
    lastRoute = key;
    window.scrollTo(0, 0);
  }
  const screens = {
    home: screenHome, workout: () => r.id ? screenWorkoutView(r.id) : screenWorkout(),
    exercises: screenExercises, exercise: () => screenExercise(r.id),
    'exercise-new': () => screenExerciseEdit(null), 'exercise-edit': () => screenExerciseEdit(r.id),
    routines: screenRoutines, routine: () => screenRoutineEdit(r.id),
    history: screenHistory, users: screenUsers,
  };
  app.innerHTML = (screens[r.name] || screenHome)();

  const tab = { home: 'home', workout: r.id ? 'history' : 'home', exercises: 'exercises', exercise: 'exercises', 'exercise-new': 'exercises', 'exercise-edit': 'exercises', routines: 'routines', routine: 'routines', history: 'history' }[r.name];
  const tabs = [['home', 'home', 'בית'], ['exercises', 'dumbbell', 'מכשירים'], ['routines', 'plan', 'תוכניות'], ['history', 'history', 'היסטוריה']];
  $('#nav').innerHTML = tabs.map(([k, ic, l]) => `<a href="#/${k}" class="${tab === k ? 'on' : ''}"><span class="pill">${ico(ic)}</span><span>${l}</span></a>`).join('');
  $('#banner').innerHTML = myActive() && !(r.name === 'workout' && !r.id) ? `<div data-act="go-workout">${ico('dumbbell')}<span>אימון פעיל</span> · <span data-elapsed></span> · <span>לחץ לחזרה</span></div>` : '';
  renderModal();
  tick();
  updateWakeLock();
}

function tick() {
  const a = myActive();
  document.querySelectorAll('[data-elapsed]').forEach(el => { el.textContent = !a ? '' : a.past ? fmtDate(a.start) : clock(Date.now() - a.start); });
  renderRest();
}
setInterval(tick, 1000);

/* ================= Photos ================= */

function resizeImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}

/* ================= Workout actions ================= */

const myTarget = ex => ex?.targets?.[myKey(ex)] || (oldKeyOk(ex) ? ex?.targets?.[S.settings.currentUserId] : null) || null;
function targetText(t, kind) {
  if (!t) return '';
  if (timed(kind)) return [t.minutes != null && `${fmtNum(t.minutes)} דק׳`, t.km != null && `${fmtNum(t.km)} ק״מ`].filter(Boolean).join(' · ');
  const parts = [`${t.sets || 3} סטים`];
  if (t.reps != null) parts.push(`${t.reps} חזרות`);
  if (kind === 'weight' && t.weight != null) parts.push(`${fmtNum(t.weight)} ק״ג`);
  return parts.join(' × ');
}
// Inputs for an exercise's target; the same values show in the exercise screen and the routine editor.
function targetFields(ex, titled) {
  const kind = measure(ex), t = myTarget(ex) || {}, ls = lastPerformance(ex.id)?.sets || [];
  const ph = { sets: ls.length || null, reps: ls[0]?.reps, weight: ls.length ? Math.max(...ls.map(x => x.weight || 0)) || null : null, minutes: ls[0]?.minutes, km: ls[0]?.km };
  const f = kind === 'cardio' ? [['minutes', 'דקות'], ['km', 'ק״מ']] : kind === 'time' ? [['minutes', 'דקות']]
    : kind === 'reps' ? [['sets', 'סטים'], ['reps', 'חזרות']]
    : [['sets', 'סטים'], ['reps', 'חזרות'], ['weight', 'ק״ג']];
  return `${titled ? `<div class="small" style="margin-bottom:-2px"><b>יעד</b> <span class="muted">(לא חובה · אם ריק, מתחילים לפי הפעם האחרונה)</span></div>` : ''}
  <div class="row" style="gap:8px">${f.map(([k, l]) => `<label class="grow" style="min-width:0">
    <span class="muted small" style="display:block;margin-bottom:4px">${l}</span>
    <input class="input" style="text-align:center;padding:8px 4px" inputmode="decimal" data-in="target" data-id="${ex.id}" data-f="${k}" value="${fmtNum(t[k])}" placeholder="${ph[k] != null ? fmtNum(ph[k]) : '—'}">
  </label>`).join('')}</div>`;
}
function newSetsFor(exId) {
  const ex = exById(exId), kind = measure(ex);
  const t = myTarget(ex);
  if (t && Object.values(t).some(v => v != null)) {
    if (timed(kind)) return [{ minutes: t.minutes ?? null, km: t.km ?? null, done: false }];
    const one = kind === 'reps' ? { reps: t.reps ?? null } : { weight: t.weight ?? null, reps: t.reps ?? null };
    return Array.from({ length: Math.max(1, Math.min(10, t.sets || 3)) }, () => ({ ...one, done: false }));
  }
  const last = lastPerformance(exId);
  if (last) return last.sets.map(s => ({ ...s, done: false }));
  const blank = timed(kind) ? { minutes: null, km: null } : kind === 'reps' ? { reps: null } : { weight: null, reps: null };
  return Array.from({ length: timed(kind) ? 1 : 3 }, () => ({ ...blank, done: false }));
}
// past = { at, minutes, gymId } logs a workout that already happened (entered later, e.g. at home)
function startWorkout(routine, day, past) {
  const uidv = S.settings.currentUserId;
  const ids = day ? dayExercises(day, past ? past.gymId : curGymId()).map(e => e.id) : (routine?.exerciseIds || []).filter(exById);
  S.active[uidv] = {
    id: uid(), userId: uidv, start: past ? past.at : Date.now(),
    routineId: routine?.id || null, routineName: routine?.name || (day ? `יום ${day === 'full' ? 'Full body' : SPLITS[day]}` : null), gymId: past ? past.gymId : curGymId(),
    entries: [],
    ...(past ? { past: past.minutes } : {}),
  };
  S.active[uidv].entries = ids.map(id => ({ exerciseId: id, sets: newSetsFor(id) }));  // after the line above, so prefill uses this workout's gym
  save();
  go('#/workout');
  if (!ids.length) { ui.modal = { type: 'pick', split: day && day !== 'full' ? day : '' }; renderModal(); }
  else if (day) toast(`הוכנו ${ids.length} תרגילים. אפשר להסיר או להוסיף.`);
}
async function finishWorkout() {
  const a = myActive();
  // in a workout logged afterwards, any set with numbers counts, no need to tick each one
  const filled = s => s.done || (a.past && Object.entries(s).some(([k, v]) => k !== 'done' && v != null));
  const entries = a.entries
    .map(e => ({ exerciseId: e.exerciseId, sets: e.sets.filter(filled).map(({ done, ...s }) => s) }))
    .filter(e => e.sets.length);
  if (!entries.length) {
    if (!await ask(a.past ? 'לא רשמת אף סט. לצאת בלי לשמור?' : 'לא סימנת אף סט כמבוצע (✓). לסיים בלי לשמור?')) return;
    delete S.active[a.userId];
    rest.endsAt = 0; save(); go('#/home');
    return;
  }
  const w = { id: a.id, userId: a.userId, start: a.start, end: a.past ? a.start + a.past * 60000 : Date.now(), routineId: a.routineId, name: a.routineName || null, gymId: a.gymId || null, entries };
  S.workouts.push(w);
  delete S.active[a.userId];
  rest.endsAt = 0;
  saveNow();
  const sets = entries.reduce((t, e) => t + e.sets.length, 0);
  const st = weekStats();
  const goal = S.settings.weeklyGoal;
  const extra = st.count === goal ? ' עמדת ביעד השבועי! 🏆' : st.count < goal ? ` עוד ${goal - st.count} ליעד השבועי.` : '';
  toast(`כל הכבוד! 💪 ${fmtDur(w.end - w.start)}, ${sets} סטים.${extra}`, 4500);
  go(a.past ? '#/history' : '#/home');
}

/* ================= Event handling ================= */

const actions = {
  back: () => history.length > 1 ? history.back() : go('#/home'),
  go: d => go(d.to),
  'go-users': () => go('#/users'),
  'go-workout': () => go('#/workout'),
  'close-modal': () => closeModal(),
  'confirm-ok': () => { const r = ui.modal.resolve; ui.modal = null; renderModal(); r(true); },
  'confirm-no': () => closeModal(),
  lang: d => { window.setLang?.(d.v); render(); },
  palette: d => {
    document.documentElement.dataset.palette = d.v;
    try { localStorage.setItem('gym-palette', d.v); } catch (e) {}
    render();
  },

  'create-first-user': () => {
    const name = $('#new-user-name').value.trim();
    if (!name) return $('#new-user-name').focus();
    const u = { id: uid(), name, color: COLORS[0], created: Date.now() };
    S.users.push(u); S.settings.currentUserId = u.id; saveNow(); go('#/home'); render();
  },
  'add-user': () => {
    const name = $('#add-user-name').value.trim();
    if (!name) return $('#add-user-name').focus();
    S.users.push({ id: uid(), name, color: COLORS[S.users.length % COLORS.length], created: Date.now() });
    save(); render(); toast(`${name} נוסף. לחץ על השם כדי לעבור אליו.`);
  },
  'switch-user': d => { S.settings.currentUserId = d.id; rest.endsAt = 0; save(); go('#/home'); toast(`שלום ${me().name}!`); },
  'delete-user': async d => {
    const u = S.users.find(u => u.id === d.id);
    if (!u || !await ask(`למחוק את ${u.name} ואת כל האימונים שלו? אי אפשר לבטל.`)) return;
    S.users = S.users.filter(x => x.id !== u.id);
    S.workouts = S.workouts.filter(w => w.userId !== u.id);
    S.routines = S.routines.filter(r => r.userId !== u.id);
    S.plans = S.plans.filter(p => p.userId !== u.id);
    delete S.active[u.id];
    S.exercises.forEach(e => { if (e.notes) delete e.notes[u.id]; });
    S.settings.currentUserId = S.users[0]?.id || null;
    save(); go('#/home'); render();
  },

  'pick-gym': () => { ui.modal = { type: 'gym' }; renderModal(); },
  'plan-new': () => {
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(18, 0, 0, 0);
    ui.planDraft = { id: uid(), at: t.getTime(), gymId: curGymId(), routineId: null, notes: '' };
    ui.modal = { type: 'plan' }; renderModal();
  },
  'plan-edit': d => {
    const p = S.plans.find(p => p.id === d.id); if (!p) return;
    ui.planDraft = { ...p }; ui.modal = { type: 'plan' }; renderModal();
  },
  'plan-set': d => {
    ui.planDraft[d.f] = ui.planDraft[d.f] === d.v ? null : d.v; renderModal();
  },
  'plan-save': () => {
    const d = ui.planDraft, i = S.plans.findIndex(p => p.id === d.id);
    if (d.at < Date.now() - 5 * 60000) { toast('הזמן שבחרת כבר עבר'); return; }
    const p = { id: d.id, userId: S.settings.currentUserId, at: d.at, gymId: d.gymId || null, routineId: d.routineId || null, notes: (d.notes || '').trim(), started: false };
    if (i >= 0) S.plans[i] = p; else S.plans.push(p);
    save(); render();
    if (i >= 0) { ui.modal = null; renderModal(); toast('נשמר ✓'); }
    else { renderModal(); toast('האימון נקבע ✓ אפשר להוסיף אותו ליומן'); }
  },
  'plan-delete': async d => {
    if (!await ask('למחוק את האימון המתוכנן?')) return;
    S.plans = S.plans.filter(p => p.id !== d.id); save(); render();
  },
  'plan-start': d => {
    const p = S.plans.find(p => p.id === d.id); if (!p) return;
    if (myActive()) { toast('יש כבר אימון פעיל'); return go('#/workout'); }
    p.started = true;
    if (p.gymId && gymById(p.gymId)) me().gymId = p.gymId;
    startWorkout(S.routines.find(r => r.id === p.routineId));
  },
  'plan-ics': () => {
    const p = S.plans.find(p => p.id === ui.planDraft.id); if (!p) return;
    const file = new File([planIcs(p)], 'workout.ics', { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  },
  'plan-google': () => {
    const p = S.plans.find(p => p.id === ui.planDraft.id); if (p) window.open(googleCalUrl(p), '_blank');
  },
  'set-gym': d => {
    me().gymId = d.id || null;
    const a = myActive(); if (a && !a.entries.length) a.gymId = me().gymId;
    ui.modal = null; save(); render();
  },
  'add-gym': () => {
    const inp = $('#new-gym-name'), name = inp.value.trim();
    if (!name) return inp.focus();
    const g = { id: uid(), name };
    S.gyms.push(g);
    if (!curGymId()) me().gymId = g.id;
    if (ui.modal?.type === 'gym') { me().gymId = g.id; ui.modal = null; renderModal(); }
    save(); render(); toast(`${name} נוסף ✓`);
  },
  'rename-gym': async d => {
    const g = gymById(d.id);
    ui.modal = { type: 'rename-gym', id: g.id }; renderModal();
  },
  'save-gym-name': d => {
    const name = $('#rename-gym-name').value.trim();
    if (name) gymById(d.id).name = name;
    ui.modal = null; save(); render();
  },
  'delete-gym': async d => {
    const g = gymById(d.id);
    if (!await ask(`למחוק את ${g.name}? המכשירים שלו יישארו ויופיעו בכל המקומות.`)) return;
    S.gyms = S.gyms.filter(x => x.id !== g.id);
    S.exercises.forEach(e => { if (e.gymIds) e.gymIds = e.gymIds.filter(x => x !== g.id); });
    S.users.forEach(u => { if (u.gymId === g.id) u.gymId = null; });
    save(); render();
  },
  'ex-gym': d => { ui.exGym = d.id || null; render(); },
  'open-catalog': () => {
    const gym = curGymId();
    ui.modal = { type: 'catalog', picked: [], gymIds: gym ? [gym] : [], fromWorkout: ui.modal?.type === 'pick' || location.hash === '#/workout' };
    renderModal();
  },
  'catalog-toggle': d => {
    const p = ui.modal.picked, i = p.indexOf(d.v);
    if (i >= 0) p.splice(i, 1); else p.push(d.v);
    keepSheetScroll(renderModal);
  },
  'catalog-gym': d => {
    const ids = ui.modal.gymIds, i = ids.indexOf(d.id);
    if (i >= 0) ids.splice(i, 1); else ids.push(d.id);
    keepSheetScroll(renderModal);
  },
  'catalog-remove': async d => {
    const back = ui.modal, ex = exById(d.id);
    const top = document.querySelector('.sheet')?.scrollTop;
    if (await ask(`להסיר את "${ex.name}" מהרשימה שלך? ההיסטוריה שלו תישאר באימונים שכבר נשמרו.`, 'הסר')) {
      await removeExercise(d.id); save(); render();
    }
    ui.modal = back; renderModal();
    const s2 = document.querySelector('.sheet'); if (s2) s2.scrollTop = top;
  },
  'catalog-add': () => {
    const m = ui.modal;
    const all = CATALOG.flatMap(([, items]) => items);
    const added = [];
    for (const name of m.picked) {
      const [, type, muscle] = all.find(x => x[0] === name);
      const gymIds = catalogGyms(m, name, type);
      const old = S.exercises.find(e => e.name === name);
      // already in the list at another gym: just mark it at the chosen gyms too
      if (old) { old.gymIds = [...new Set([...(old.gymIds || []), ...gymIds])]; added.push(old); continue; }
      const ex = { id: uid(), name, type, muscle, gymIds, notes: {}, created: Date.now() };
      S.exercises.push(ex); added.push(ex);
    }
    const a = myActive();
    if (m.fromWorkout && a) {
      if (added.length === 1) { a.entries.push({ exerciseId: added[0].id, sets: newSetsFor(added[0].id) }); ui.modal = null; }
      else ui.modal = { type: 'pick' };
    } else ui.modal = null;
    save(); render();
    toast(`נוספו ${added.length} ✓`);
  },
  'draft-gym': d => {
    const ids = ui.draft.gymIds, i = ids.indexOf(d.id);
    if (i >= 0) ids.splice(i, 1); else ids.push(d.id);
    render();
  },
  'start-empty': () => startWorkout(null),
  'start-day': d => startWorkout(null, d.v),
  'past-new': () => {
    if (myActive()) { toast('יש כבר אימון פעיל'); return go('#/workout'); }
    const t = new Date(Date.now() - 90 * 60000); t.setMinutes(Math.floor(t.getMinutes() / 15) * 15, 0, 0);
    ui.pastDraft = { at: t.getTime(), minutes: 60, gymId: curGymId(), how: '' };
    ui.modal = { type: 'past' }; renderModal();
  },
  'past-set': d => {
    const p = ui.pastDraft;
    p[d.f] = d.v;
    keepSheetScroll(renderModal);
  },
  'when-day': d => {
    const p = whenDraft(d.k), t = new Date(p.at), n = new Date(); n.setDate(n.getDate() + +d.v);
    n.setHours(t.getHours(), t.getMinutes(), 0, 0); p.at = n.getTime(); keepSheetScroll(renderModal);
  },
  'when-time': d => {
    const p = whenDraft(d.k), t = new Date(p.at), day = t.getDate();
    t.setMinutes(t.getMinutes() + +d.v);
    if (t.getDate() !== day) t.setMinutes(t.getMinutes() - Math.sign(+d.v) * 1440);  // wrap within the same day
    p.at = t.getTime(); keepSheetScroll(renderModal);
  },
  'past-start': () => {
    const p = ui.pastDraft, mins = Math.round(num(p.minutes));
    if (!(mins > 0)) { toast('כמה דקות נמשך האימון?'); return; }
    if (p.at > Date.now()) { toast('האימון צריך להיות בעבר'); return; }
    ui.modal = null;
    const day = p.how.startsWith('day:') ? p.how.slice(4) : null;
    const routine = p.how.startsWith('r:') ? S.routines.find(r => r.id === p.how.slice(2)) : null;
    startWorkout(routine, day, { at: p.at, minutes: mins, gymId: p.gymId || null });
  },
  'ex-split': d => { ui.exSplit = d.v; render(); },
  'r-split': d => { ui.rSplit = d.v; render(); },
  'pick-split': d => { ui.modal.split = d.v; keepSheetScroll(renderModal); },
  'ex-split-set': d => {
    const ex = exById(d.id);
    if (!d.v || d.v === (autoSplit(ex) || 'none')) delete ex.split; else ex.split = d.v;
    save(); render();
  },
  'start-routine': d => {
    if (myActive()) { toast('יש כבר אימון פעיל'); return go('#/workout'); }
    startWorkout(S.routines.find(r => r.id === d.id));
  },
  'finish-workout': finishWorkout,
  'cancel-workout': async () => {
    if (!await ask('לבטל את האימון? מה שרשמת בו לא יישמר.')) return;
    delete S.active[S.settings.currentUserId]; rest.endsAt = 0; save(); go('#/home');
  },
  'pick-exercise': () => {
    const a = myActive(), day = Object.keys(SPLITS).find(k => a?.routineName === `יום ${SPLITS[k]}`);
    ui.modal = { type: 'pick', split: day || '' }; renderModal();
  },
  'add-entry': d => {
    const a = myActive();
    a.entries.push({ exerciseId: d.id, sets: newSetsFor(d.id) });
    ui.modal = null; save(); render();
    requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight));
  },
  'new-ex-from-workout': () => { ui.modal = null; ui.returnToWorkout = true; go('#/exercise-new'); },
  'note-edit': d => { ui.modal = { type: 'note', id: d.id }; renderModal(); },
  'note-save': d => { setMyNote(exById(d.id), ($('#note-text')?.value || '').trim()); ui.modal = null; renderModal(); render(); },
  'note-clear': d => { setMyNote(exById(d.id), ''); ui.modal = null; renderModal(); render(); },
  'entry-menu': d => { ui.modal = { type: 'entry', i: +d.i }; renderModal(); },
  'entry-move': d => {
    const a = myActive(), i = +d.i, j = i + +d.d;
    [a.entries[i], a.entries[j]] = [a.entries[j], a.entries[i]];
    ui.modal = null; save(); render();
  },
  'entry-remove': d => { myActive().entries.splice(+d.i, 1); ui.modal = null; save(); render(); },
  'add-set': d => {
    const e = myActive().entries[+d.i];
    const prev = e.sets[e.sets.length - 1];
    const ex = exById(e.exerciseId), kind = measure(ex);
    e.sets.push(prev ? { ...prev, done: false } : (timed(kind) ? { minutes: null, km: null, done: false } : kind === 'reps' ? { reps: null, done: false } : { weight: null, reps: null, done: false }));
    save(); render();
  },
  'del-set': d => { myActive().entries[+d.i].sets.splice(+d.j, 1); save(); render(); },
  'toggle-set': d => {
    unlockAudio();
    const e = myActive().entries[+d.i], s = e.sets[+d.j];
    s.done = !s.done;
    save(); render();
    if (s.done && !myActive().past && !timed(measure(exById(e.exerciseId)))) startRest();
  },
  'rest-add': d => { rest.endsAt += +d.v * 1000; rest.total += +d.v * 1000; rest.alerted = false; tick(); },
  'rest-stop': () => { rest.endsAt = 0; tick(); },

  'draft-set': d => { ui.draft[d.f] = ui.draft[d.f] === d.v && d.f === 'muscle' ? '' : d.v; render(); },
  'photo-open': d => { ui.modal = { type: 'photo', id: d.id }; renderModal(); },
  'photo-clear': () => { ui.draft.photo = null; render(); },
  'save-exercise': async d => {
    const dr = ui.draft;
    if (!dr.name.trim()) { toast('צריך לתת שם'); return; }
    let ex = d.id ? exById(d.id) : null;
    if (!ex) { ex = { id: uid(), notes: {}, created: Date.now() }; S.exercises.push(ex); }
    Object.assign(ex, { name: dr.name.trim(), type: dr.type, muscle: dr.muscle, gymIds: [...(dr.gymIds || [])] });
    if (dr.photo) { photos[ex.id] = dr.photo; await photoSet(ex.id, dr.photo); }
    else if (photos[ex.id]) { delete photos[ex.id]; await photoDel(ex.id); }
    ui.draft = null;
    await saveNow();
    if (ui.returnToWorkout && myActive()) {
      ui.returnToWorkout = false;
      myActive().entries.push({ exerciseId: ex.id, sets: newSetsFor(ex.id) });
      save(); go('#/workout');
    } else if (d.id) {
      history.back();
    } else {
      go('#/exercises');
    }
    toast('נשמר ✓');
  },
  'delete-exercise': async d => {
    const ex = exById(d.id);
    if (!await ask(`למחוק את "${ex.name}"? ההיסטוריה שלו תישאר באימונים שכבר נשמרו.`)) return;
    await removeExercise(d.id);
    ui.draft = null; save(); go('#/exercises');
  },
  'ex-gym-toggle': d => {
    const ex = exById(d.id), ids = ex.gymIds = ex.gymIds || [], i = ids.indexOf(d.gym);
    if (i >= 0) ids.splice(i, 1); else ids.push(d.gym);
    save(); render();
  },

  'r-add': d => { ui.draft.exerciseIds.push(d.id); render(); },
  'r-remove': d => { ui.draft.exerciseIds.splice(+d.i, 1); render(); },
  'r-move': d => {
    const ids = ui.draft.exerciseIds, i = +d.i, j = i + +d.d;
    [ids[i], ids[j]] = [ids[j], ids[i]]; render();
  },
  'save-routine': d => {
    const dr = ui.draft;
    if (!dr.name.trim()) { toast('צריך לתת שם לתוכנית'); return; }
    let r = d.id ? S.routines.find(r => r.id === d.id) : null;
    if (!r) { r = { id: uid(), userId: S.settings.currentUserId }; S.routines.push(r); }
    r.name = dr.name.trim(); r.exerciseIds = [...dr.exerciseIds];
    ui.draft = null; save(); go('#/routines'); toast('התוכנית נשמרה ✓');
  },
  'delete-routine': async d => {
    if (!await ask('למחוק את התוכנית?')) return;
    S.routines = S.routines.filter(r => r.id !== d.id); ui.draft = null; save(); go('#/routines');
  },
  'delete-workout': async d => {
    if (!await ask('למחוק את האימון הזה מההיסטוריה?')) return;
    S.workouts = S.workouts.filter(w => w.id !== d.id); save(); history.back();
  },

  export: async () => {
    const data = JSON.stringify({ app: 'gym', exported: Date.now(), state: S, photos });
    const file = new File([data], `setou-backup-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Setou backup' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
};

const inputs = {
  past: el => { if (el.value) ui.pastDraft[el.dataset.f] = el.value; },
  when: el => {
    const p = whenDraft(el.dataset.k), [y, m, dd] = el.value.split('-').map(Number); if (!y) return;
    const t = new Date(p.at); t.setFullYear(y, m - 1, dd); p.at = t.getTime(); keepSheetScroll(renderModal);
  },
  plan: el => {
    if (el.dataset.f === 'at') { const t = new Date(el.value).getTime(); if (!isNaN(t)) ui.planDraft.at = t; }
    else ui.planDraft[el.dataset.f] = el.value;
  },
  set: el => {
    el.classList.toggle('long', el.value.length > 3);
    const s = myActive().entries[+el.dataset.i].sets[+el.dataset.j];
    s[el.dataset.f] = num(el.value);
    save();
  },
  'ex-filter': el => {
    ui.exFilter = el.value;
    const pos = el.selectionStart;
    render();
    const n = document.querySelector('[data-in="ex-filter"]');
    n.focus(); n.setSelectionRange(pos, pos);
  },
  'pick-filter': el => {
    ui.modal.filter = el.value;
    const pos = el.selectionStart;
    renderModal();
    const n = document.querySelector('[data-in="pick-filter"]');
    n.focus(); n.setSelectionRange(pos, pos);
  },
  'ex-note': el => setMyNote(exById(el.dataset.id), el.value),
  draft: el => { ui.draft[el.dataset.f] = el.value; },
  target: el => {
    const ex = exById(el.dataset.id), uidv = S.settings.currentUserId;
    ex.targets = ex.targets || {};
    const t = { ...(myTarget(ex) || {}) };
    const v = num(el.value);
    t[el.dataset.f] = el.dataset.f === 'sets' && v != null ? Math.round(v) : v;
    ex.targets[myKey(ex)] = t;
    save();
  },
  'my-name': el => { const u = me(); if (u && el.value.trim()) { u.name = el.value.trim(); save(); } },
  setting: el => {
    const v = parseInt(el.value, 10);
    if (v > 0) { S.settings[el.dataset.f] = v; save(); }
  },
};

const changes = {
  photo: async el => {
    const f = el.files[0];
    if (!f) return;
    try { ui.draft.photo = await resizeImage(f); render(); } catch (_) { toast('לא הצלחתי לקרוא את התמונה'); }
  },
  import: async el => {
    const f = el.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== 'gym' || !data.state) throw new Error('not a backup');
      if (!await ask('לשחזר מהגיבוי? כל הנתונים הנוכחיים בטלפון יוחלפו.')) return;
      S = { plans: [], ...data.state }; photos = data.photos || {};
      await idb('photos', 'readwrite', s => s.clear());
      for (const [k, v] of Object.entries(photos)) await photoSet(k, v);
      await saveNow(); go('#/home'); render(); toast('הגיבוי שוחזר ✓');
    } catch (_) { toast('הקובץ הזה לא נראה כמו גיבוי של האפליקציה'); }
  },
};

document.addEventListener('click', e => {
  if (e.target.id === 'modal') { closeModal(); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act] || window.cloudActions?.[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-in]');
  if (el && inputs[el.dataset.in]) inputs[el.dataset.in](el);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-in]');
  if (el && changes[el.dataset.in]) { changes[el.dataset.in](el); el.value = ''; }
});
document.addEventListener('focusin', e => {
  // Select the whole number when tapping a set field, so typing replaces it.
  if (e.target.matches('.sets input')) setTimeout(() => e.target.select(), 0);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'new-user-name') actions['create-first-user']();
  if (e.key === 'Enter' && e.target.id === 'add-user-name') actions['add-user']();
  if (e.key === 'Enter' && e.target.id === 'new-gym-name') actions['add-gym']();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveNow();
  updateWakeLock();
  tick();
});
window.addEventListener('hashchange', render);

/* ================= Boot ================= */

(async function boot() {
  try {
    let saved = null;
    try {
      db = await openDB();
      saved = await kvGet('state');
      photos = await photoAll();
    } catch (_) { db = null; }
    if (!saved || !saved.users?.length) {
      try { saved = JSON.parse(localStorage.getItem('gym-state')) || saved; } catch (_) { /* no mirror */ }
    }
    if (saved) S = { ...S, ...saved, settings: { ...S.settings, ...saved.settings } };
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (err) {
    $('#app').innerHTML = `<div class="empty">לא הצלחתי לפתוח את האחסון בטלפון. נסה לפתוח שוב.</div>`;
    return;
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
  if (isCloud()) startCloud(); else render();
})();
