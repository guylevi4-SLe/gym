'use strict';
/* Cloud sync: login, a shared "family" (gyms + machines), and private per-person workouts.
   Loaded before app.js; its functions use app.js globals (S, photos, ui, render, toast...) at call time.

   Firestore layout:
     users/{uid}                     name, email, familyId, settings, active (workout in progress)
     users/{uid}/workouts/{id}       finished workouts (private)
     users/{uid}/routines/{id}       routines (private)
     users/{uid}/plans/{id}          planned workouts (private)
     families/{fid}                  name, members [uid], created. The id doubles as the invite code.
     families/{fid}/gyms/{id}        shared gyms
     families/{fid}/exercises/{id}   shared machines/exercises, photo as a small JPEG data URL
     families/{fid}/profiles/{uid}   name, color, current gym (visible to family members)
*/

let FB = null;           // the Firebase SDK module
let fbAuth = null, fs = null;
let cloudUser = null;    // Firebase user
let cloudDoc = null;     // users/{uid} data
let synced = {};         // path -> stable JSON of what the server (or our queued write) holds
let unsubs = [];
let localState = null, localPhotos = null;   // this device's pre-account data, for migrating
let deferredRender = false;

const isCloud = () => !!window.FIREBASE_CONFIG && localModeChoice() !== 'local';
function localModeChoice() { try { return localStorage.getItem('gym-mode'); } catch (_) { return null; } }
function setLocalModeChoice(v) { try { v ? localStorage.setItem('gym-mode', v) : localStorage.removeItem('gym-mode'); } catch (_) { /* ignore */ } }

function stable(v) {
  if (v === undefined) return undefined;
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(x => stable(x) ?? 'null').join(',') + ']';
  return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  const a = new Uint32Array(8); crypto.getRandomValues(a);
  return Array.from(a, n => CODE_CHARS[n % CODE_CHARS.length]).join('');
}

const AUTH_ERRORS = {
  'auth/invalid-email': 'כתובת המייל לא תקינה',
  'auth/missing-password': 'צריך להזין סיסמה',
  'auth/weak-password': 'הסיסמה קצרה מדי. צריך לפחות 6 תווים',
  'auth/email-already-in-use': 'כבר יש חשבון עם המייל הזה. עבור ל"כניסה" למטה',
  'auth/invalid-credential': 'המייל או הסיסמה לא נכונים. אם עוד לא נרשמת, עבור ל"הרשמה" למטה',
  'auth/wrong-password': 'המייל או הסיסמה לא נכונים. אם עוד לא נרשמת, עבור ל"הרשמה" למטה',
  'auth/user-not-found': 'אין חשבון עם המייל הזה. לחץ "הרשמה"',
  'auth/too-many-requests': 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות',
  'auth/network-request-failed': 'לא הצלחתי להתחבר לשרת. בדוק שיש אינטרנט ונסה שוב',
  'auth/operation-not-allowed': 'ההרשמה עם מייל עוד לא הופעלה ב-Firebase',
  'auth/unauthorized-domain': 'הכתובת של האפליקציה לא מאושרת ב-Firebase',
  timeout: 'השרת לא ענה. בדוק את החיבור ונסה שוב',
};
const authMsg = e => AUTH_ERRORS[e?.code] || `משהו השתבש (${e?.code || e?.message || 'unknown'}). צלם את ההודעה ושלח לי`;

/* ---------- Start ---------- */

async function startCloud() {
  localState = S; localPhotos = photos;
  S = blankState(); photos = {};
  ui.cloudScreen = 'loading';
  render();
  try {
    FB = await import('./vendor/firebase.js');
  } catch (_) {
    ui.cloudScreen = 'offline-first';
    render();
    return;
  }
  const app = FB.initializeApp(window.FIREBASE_CONFIG);
  fbAuth = FB.initializeAuth(app, { persistence: [FB.indexedDBLocalPersistence, FB.browserLocalPersistence] });
  fs = FB.initializeFirestore(app, { localCache: FB.persistentLocalCache({}), ignoreUndefinedProperties: true });
  if (window.FIREBASE_EMULATOR) {
    FB.connectAuthEmulator(fbAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    FB.connectFirestoreEmulator(fs, '127.0.0.1', 8080);
  }
  FB.onAuthStateChanged(fbAuth, onAuth);
}

function blankState() {
  return {
    version: 1, users: [], exercises: [], routines: [], plans: [], gyms: [], workouts: [], active: {},
    settings: { currentUserId: null, restSeconds: 90, weeklyGoal: 3 },
  };
}

async function onAuth(user) {
  unsubs.forEach(u => u()); unsubs = []; synced = {};
  S = blankState(); photos = {};
  cloudUser = user; cloudDoc = null;
  if (!user) { ui.cloudScreen = 'auth'; render(); return; }
  ui.cloudScreen = 'loading'; render();
  try {
    const snap = await FB.getDoc(FB.doc(fs, 'users', user.uid));
    cloudDoc = snap.exists() ? snap.data() : null;
  } catch (_) { cloudDoc = null; }
  if (!cloudDoc?.familyId) { ui.cloudScreen = 'setup'; render(); return; }
  subscribe();
}

/* ---------- Live data ---------- */

function subscribe() {
  const uidv = cloudUser.uid, fid = cloudDoc.familyId;
  S.settings.currentUserId = uidv;
  applyUserDoc(cloudDoc);
  let pending = 6;
  const first = () => { if (--pending === 0) { ui.cloudScreen = null; render(); } };
  const watch = (ref, onData) => {
    let seen = false;
    unsubs.push(FB.onSnapshot(ref, snap => { onData(snap); if (!seen) { seen = true; first(); } }, () => { if (!seen) { seen = true; first(); } }));
  };
  const watchList = (path, key, map) => watch(FB.collection(fs, ...path), snap => {
    const prefix = path.join('/') + '/';
    Object.keys(synced).filter(k => k.startsWith(prefix)).forEach(k => delete synced[k]);
    const list = snap.docs.map(d => {
      const data = d.data();
      synced[prefix + d.id] = stable(data);
      return map({ ...data, id: d.id });
    });
    changed(key, list);
  });

  watch(FB.doc(fs, 'users', uidv), snap => {
    if (!snap.exists()) return;
    cloudDoc = snap.data();
    synced['users/' + uidv] = stable(cloudDoc);
    applyUserDoc(cloudDoc);
    maybeRender();
  });
  watchList(['families', fid, 'gyms'], 'gyms', g => g);
  watchList(['families', fid, 'exercises'], 'exercises', ex => {
    if (ex.photo) photos[ex.id] = ex.photo; else delete photos[ex.id];
    const { photo, ...rest } = ex;
    return { ...rest, notes: rest.notes || {}, targets: rest.targets || {}, gymIds: rest.gymIds || [] };
  });
  watchList(['families', fid, 'profiles'], 'users', p => p);
  watchList(['users', uidv, 'workouts'], 'workouts', w => ({ ...w, userId: uidv }));
  watchList(['users', uidv, 'routines'], 'routines', r => ({ ...r, userId: uidv }));
  watchList(['users', uidv, 'plans'], 'plans', p => ({ ...p, userId: uidv }));
}

function applyUserDoc(d) {
  const uidv = cloudUser.uid;
  S.settings = { ...S.settings, ...(d.settings || {}), currentUserId: uidv };
  if (d.active) S.active[uidv] = d.active; else delete S.active[uidv];
}

function changed(key, list) {
  if (key === 'users') {
    // my own profile first, so me() finds it even before it syncs
    const mine = list.find(u => u.id === cloudUser.uid);
    if (!mine) list.unshift({ id: cloudUser.uid, name: cloudDoc?.name || '', color: COLORS[0] });
  }
  const before = stable(S[key]);
  S[key] = list;
  if (stable(list) !== before) maybeRender();
}

function maybeRender() {
  if (ui.cloudScreen) return;
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) { deferredRender = true; return; }
  render();
}
document.addEventListener('focusout', () => {
  if (!deferredRender) return;
  setTimeout(() => {
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
    deferredRender = false; render();
  }, 50);
});

/* ---------- Writing ---------- */

function userDocData() {
  const uidv = cloudUser.uid;
  return {
    ...(cloudDoc || {}),
    name: S.users.find(u => u.id === uidv)?.name || cloudDoc?.name || '',
    settings: { restSeconds: S.settings.restSeconds, weeklyGoal: S.settings.weeklyGoal },
    active: S.active[uidv] || null,
  };
}

function cloudPush() {
  if (!cloudUser || !cloudDoc?.familyId || ui.cloudScreen) return;
  const uidv = cloudUser.uid, fid = cloudDoc.familyId;
  const want = {};
  want['users/' + uidv] = userDocData();
  for (const g of S.gyms) want[`families/${fid}/gyms/${g.id}`] = { name: g.name };
  for (const ex of S.exercises) {
    const { id, ...rest } = ex;
    want[`families/${fid}/exercises/${id}`] = { ...rest, photo: photos[id] || null };
  }
  const meP = S.users.find(u => u.id === uidv);
  if (meP) want[`families/${fid}/profiles/${uidv}`] = { name: meP.name, color: meP.color || COLORS[0], gymId: meP.gymId || null };
  for (const w of S.workouts.filter(w => w.userId === uidv)) { const { id, userId, ...rest } = w; want[`users/${uidv}/workouts/${id}`] = rest; }
  for (const r of S.routines.filter(r => r.userId === uidv)) { const { id, userId, ...rest } = r; want[`users/${uidv}/routines/${id}`] = rest; }
  for (const p of S.plans.filter(p => p.userId === uidv)) { const { id, userId, ...rest } = p; want[`users/${uidv}/plans/${id}`] = rest; }

  const writes = [];
  for (const [path, data] of Object.entries(want)) {
    const js = stable(data);
    if (synced[path] !== js) { synced[path] = js; writes.push(['set', path, data]); }
  }
  // Deletions: only within collections this user manages.
  const mine = [`families/${fid}/gyms/`, `families/${fid}/exercises/`, `users/${uidv}/workouts/`, `users/${uidv}/routines/`, `users/${uidv}/plans/`];
  for (const path of Object.keys(synced)) {
    if (!(path in want) && mine.some(p => path.startsWith(p) && !path.slice(p.length).includes('/'))) {
      delete synced[path]; writes.push(['del', path]);
    }
  }
  for (const [op, path, data] of writes) {
    const ref = FB.doc(fs, path);
    (op === 'set' ? FB.setDoc(ref, data) : FB.deleteDoc(ref)).catch(err => {
      console.error('sync failed', path, err);
      delete synced[path];
      toast('לא הצלחתי לשמור בענן. השינוי יישמר כשהחיבור יחזור');
    });
  }
}

/* ---------- Account actions ---------- */

// iPhone keyboards and autofill can slip in invisible direction marks, spaces or full-width characters.
function cleanEmail(v) {
  return String(v || '').normalize('NFKC').replace(/[\s\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, '').toLowerCase();
}
function busy(btn, on) {
  document.querySelectorAll('#app .btn').forEach(b => { b.disabled = on; });
  if (btn) { if (on) { btn.dataset.label = btn.textContent; btn.textContent = 'רגע...'; } else if (btn.dataset.label) btn.textContent = btn.dataset.label; }
}
function withTimeout(promise, ms = 20000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject({ code: 'timeout' }), ms))]);
}
async function cloudSignIn(create, btn) {
  const email = cleanEmail($('#auth-email').value), pass = $('#auth-pass').value;
  ui.authError = ''; ui.authDetail = ''; ui.authEmail = email;
  if (!email) { ui.authError = 'צריך להזין מייל'; render(); return; }
  if (!FB || !fbAuth) { ui.authError = 'האפליקציה עוד נטענת. נסה שוב בעוד רגע'; render(); return; }
  busy(btn, true);
  try {
    if (create) await withTimeout(FB.createUserWithEmailAndPassword(fbAuth, email, pass));
    else await withTimeout(FB.signInWithEmailAndPassword(fbAuth, email, pass));
  } catch (e) {
    console.error('auth failed', e);
    busy(btn, false);
    ui.authError = authMsg(e);
    ui.authDetail = `${create ? 'הרשמה' : 'כניסה'} · ${e?.code || e?.message || 'unknown'} · "${email}" (${email.length})`;
    render();
  }
}
async function cloudResetPassword() {
  const email = cleanEmail($('#auth-email').value);
  if (!email) { ui.authError = 'הזן קודם את כתובת המייל'; render(); return; }
  try { await FB.sendPasswordResetEmail(fbAuth, email); toast('שלחתי מייל לאיפוס הסיסמה', 4000); }
  catch (e) { ui.authError = authMsg(e); ui.authEmail = email; render(); }
}

async function cloudSetup(join, btn) {
  const name = $('#setup-name').value.trim();
  if (!name) { ui.authError = 'איך קוראים לך?'; render(); return; }
  const uidv = cloudUser.uid;
  busy(btn, true);
  try {
    let fid;
    if (join) {
      fid = $('#setup-code').value.trim().toUpperCase().replace(/\s/g, '');
      if (!fid) { ui.authError = 'הזן את קוד ההצטרפות'; ui.setupName = name; render(); return; }
      const fam = await FB.getDoc(FB.doc(fs, 'families', fid));
      if (!fam.exists()) { ui.authError = 'לא מצאתי קבוצה עם הקוד הזה. בדוק אותו שוב'; ui.setupName = name; render(); return; }
      if (!fam.data().members.includes(uidv)) await FB.updateDoc(FB.doc(fs, 'families', fid), { members: [...fam.data().members, uidv] });
    } else {
      fid = newCode();
      await FB.setDoc(FB.doc(fs, 'families', fid), { name: `המשפחה של ${name}`, members: [uidv], created: Date.now() });
    }
    const profiles = await countProfiles(fid);
    await FB.setDoc(FB.doc(fs, 'families', fid, 'profiles', uidv), { name, color: COLORS[profiles % COLORS.length], gymId: null });
    cloudDoc = { name, email: cloudUser.email, familyId: fid, settings: { restSeconds: 90, weeklyGoal: 3 }, active: null, created: Date.now() };
    await FB.setDoc(FB.doc(fs, 'users', uidv), cloudDoc);
    ui.authError = '';
    subscribe();
  } catch (e) {
    console.error(e);
    busy(btn, false);
    ui.authError = `לא הצלחתי לשמור (${e?.code || e?.message || 'unknown'}). בדוק את החיבור ונסה שוב`; ui.setupName = name; render();
  }
}
async function countProfiles(fid) {
  return new Promise(resolve => {
    const un = FB.onSnapshot(FB.collection(fs, 'families', fid, 'profiles'), s => { un(); resolve(s.size); }, () => resolve(0));
  });
}

async function cloudSignOut() {
  if (!await ask('להתנתק מהחשבון בטלפון הזה? הנתונים נשמרים בענן ויחזרו כשתתחבר שוב.', 'התנתק')) return;
  await FB.signOut(fbAuth);
  location.hash = '#/home';
}

function familyCode() { return cloudDoc?.familyId || ''; }

async function shareInvite() {
  const url = location.origin + location.pathname;
  const text = window.LANG === 'en'
    ? `Come train with me on Setou! Open ${url} in Safari, add it to your Home Screen, sign up and join with the code: ${familyCode()}`
    : `בוא להתאמן איתי ב־Setou! פתח את ${url} בספארי, הוסף למסך הבית, הירשם והצטרף עם הקוד: ${familyCode()}`;
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('ההזמנה הועתקה. הדבק אותה בוואטסאפ'); }
  catch (_) { toast(`הקוד: ${familyCode()}`, 5000); }
}

/* ---------- Moving this phone's data into the account ---------- */

function localUsersToMigrate() {
  if (!localState?.users?.length) return [];
  return localState.users.filter(u => {
    try { if (localStorage.getItem('gym-migrated-' + u.id)) return false; } catch (_) { /* ignore */ }
    return localState.workouts.some(w => w.userId === u.id) || localState.routines.some(r => r.userId === u.id) || localState.exercises.length;
  });
}

async function migrateLocal(localUserId) {
  const L = localState, uidv = cloudUser.uid;
  const gymIds = new Set(S.gyms.map(g => g.id));
  for (const g of L.gyms || []) if (!gymIds.has(g.id)) S.gyms.push({ id: g.id, name: g.name });
  const exIds = new Set(S.exercises.map(e => e.id));
  for (const ex of L.exercises) {
    if (exIds.has(ex.id)) continue;
    const notes = {};
    if (ex.notes?.[localUserId]) notes[uidv] = ex.notes[localUserId];
    const targets = {};
    if (ex.targets?.[localUserId]) targets[uidv] = ex.targets[localUserId];
    S.exercises.push({ ...ex, notes, targets, gymIds: ex.gymIds || [] });
    if (localPhotos[ex.id]) photos[ex.id] = localPhotos[ex.id];
  }
  for (const w of L.workouts.filter(w => w.userId === localUserId)) S.workouts.push({ ...w, userId: uidv });
  for (const r of L.routines.filter(r => r.userId === localUserId)) S.routines.push({ ...r, userId: uidv });
  for (const p of (L.plans || []).filter(p => p.userId === localUserId)) S.plans.push({ ...p, userId: uidv });
  const lu = L.users.find(u => u.id === localUserId);
  const meP = S.users.find(u => u.id === uidv);
  if (meP && lu?.gymId && !meP.gymId) meP.gymId = lu.gymId;
  try { localStorage.setItem('gym-migrated-' + localUserId, '1'); } catch (_) { /* ignore */ }
  cloudPush();
  render();
  toast('הנתונים מהטלפון הועברו לחשבון ✓', 3500);
}

/* ---------- Screens ---------- */

function cloudScreen() {
  const s = ui.cloudScreen;
  const err = ui.authError ? `<p style="color:var(--danger);margin:0">${esc(ui.authError)}</p>${ui.authDetail ? `<p class="muted small" style="margin:0"><bdi dir="ltr">${esc(ui.authDetail)}</bdi></p>` : ''}` : '';
  if (s === 'loading') return `<div class="welcome" style="padding-top:28vh">${brand('lg')}<p class="muted">טוען...</p></div>`;
  if (s === 'offline-first') return `<div class="empty plain" style="padding-top:20vh"><span class="big-ic">${ico('cloud')}</span>
      בפתיחה הראשונה צריך חיבור לאינטרנט. התחבר ונסה שוב.
      <div style="margin-top:16px"><button class="btn primary" data-act="reload">נסה שוב</button></div></div>`;
  if (s === 'auth') {
    // One action per screen, so a tap that lands after the keyboard closes can't hit the wrong button.
    const signup = ui.authMode !== 'signin';
    return `${langToggle()}<div class="welcome stack">
      ${brand('lg')}
      <h1 class="center">${signup ? 'הרשמה' : 'כניסה'}</h1>
      <p class="muted center" style="margin-top:0">${signup ? 'פעם ראשונה? בחר מייל וסיסמה חדשה לאפליקציה.' : 'כניסה לחשבון שכבר יצרת.'}</p>
      <input class="input" id="auth-email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="מייל" value="${esc(ui.authEmail || '')}" dir="ltr">
      <input class="input" id="auth-pass" type="password" autocapitalize="off" autocorrect="off" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'סיסמה חדשה (לפחות 6 תווים)' : 'סיסמה'}" dir="ltr">
      ${err}
      <button class="btn primary big" data-act="${signup ? 'sign-up' : 'sign-in'}">${signup ? 'צור חשבון' : 'כניסה'}</button>
      <button class="link" style="display:block;margin:8px auto 0" data-act="auth-mode" data-v="${signup ? 'signin' : 'signup'}">${signup ? 'כבר יש לך חשבון? כניסה' : 'אין לך חשבון? הרשמה'}</button>
      ${signup ? '' : `<button class="link" style="display:block;margin:0 auto" data-act="reset-pass">שכחתי סיסמה</button>`}
      <hr>
      <button class="link" style="display:block;margin:0 auto;color:var(--muted)" data-act="local-mode">המשך בלי חשבון (נשמר רק בטלפון הזה)</button>
    </div>`;
  }
  if (s === 'setup') return `<div style="padding-top:6vh" class="stack">
      <h1>כמעט סיימנו</h1>
      <label class="field"><span>איך קוראים לך?</span>
        <input class="input" id="setup-name" value="${esc(ui.setupName || localState?.users?.[0]?.name || '')}" autocomplete="off"></label>
      ${err}
      <div class="card stack">
        <b>יש לך קוד הצטרפות מחבר או מבן משפחה?</b>
        <input class="input" id="setup-code" placeholder="למשל: K7QM2XPA" autocomplete="off" dir="ltr" style="text-transform:uppercase;letter-spacing:2px">
        <p class="muted small" style="margin:0">בקבוצה מתאמנים יחד: חדרי הכושר ורשימת המכשירים משותפים, ולא צריך להגדיר אותם מחדש. המשקלים, האימונים, היעדים וההערות שלך נשארים פרטיים.</p>
        <button class="btn primary block" data-act="setup-join">הצטרף לקבוצה</button>
      </div>
      <div class="card stack">
        <b>אין לך קוד?</b>
        <p class="muted small" style="margin:0">תיצור קבוצה חדשה ותקבל קוד שאפשר לשלוח למשפחה ולחברים.</p>
        <button class="btn block" data-act="setup-new">צור קבוצה חדשה</button>
      </div>
      <button class="link" style="display:block;margin:0 auto;color:var(--muted)" data-act="sign-out-now">התנתק</button>
    </div>`;
  return '';
}

function cloudSettingsSection() {
  if (!cloudUser) return `<h2>חשבון</h2>
    <p class="muted small" style="margin-top:0">כרגע הנתונים נשמרים רק בטלפון הזה. עם חשבון הם יישמרו בענן, יופיעו בכל מכשיר, ותוכל לשתף מכשירים עם המשפחה והחברים.</p>
    <button class="btn primary block" data-act="cloud-mode">התחבר או הירשם</button>`;
  const fam = S.users;
  const migr = localUsersToMigrate();
  return `<h2>חשבון</h2>
    <div class="card"><div class="muted small">מחובר בתור</div><b style="display:block"><bdi dir="ltr">${esc(cloudUser.email)}</bdi></b></div>
    <h2>הקבוצה שלי</h2>
    ${fam.map(u => `<div class="card list-item">
      <span class="avatar">${esc((u.name || '?').trim()[0] || '?')}</span>
      <b class="grow">${esc(u.name)}</b>${u.id === cloudUser.uid ? '<span class="tag">אני</span>' : ''}
    </div>`).join('')}
    <div class="card stack" style="margin-top:10px">
      <div class="muted small">קוד הצטרפות לקבוצה. מי שנרשם עם הקוד הזה משתף איתך את חדרי הכושר ורשימת המכשירים. המשקלים, האימונים, היעדים וההערות של כל אחד נשארים פרטיים.</div>
      <div style="font-size:26px;font-weight:800;letter-spacing:4px;text-align:center" dir="ltr">${esc(familyCode())}</div>
      <button class="btn primary block" data-act="share-invite">${ico('share')}<span>שלח הזמנה</span></button>
    </div>
    ${migr.length ? `<h2>נתונים מהטלפון</h2>
      <p class="muted small" style="margin-top:0">יש בטלפון הזה נתונים מלפני שהתחברת. של מי להעביר לחשבון שלך?</p>
      ${migr.map(u => `<button class="btn block" style="margin-top:8px" data-act="migrate" data-id="${u.id}">העבר את הנתונים של ${esc(u.name)}</button>`).join('')}` : ''}
    <hr>
    <label class="field"><span>השם שלי</span>
      <input class="input" data-in="my-name" value="${esc(me()?.name || '')}" autocomplete="off"></label>
    <button class="btn block danger" data-act="sign-out">התנתק</button>`;
}

Object.assign(window, { cloudActions: {
  'sign-in': (d, el) => cloudSignIn(false, el),
  'sign-up': (d, el) => cloudSignIn(true, el),
  'reset-pass': cloudResetPassword,
  'setup-new': (d, el) => cloudSetup(false, el),
  'setup-join': (d, el) => cloudSetup(true, el),
  'sign-out': cloudSignOut,
  'sign-out-now': () => FB.signOut(fbAuth),
  'share-invite': shareInvite,
  migrate: d => migrateLocal(d.id),
  'local-mode': () => { setLocalModeChoice('local'); location.reload(); },
  'cloud-mode': () => { setLocalModeChoice(null); location.hash = '#/home'; location.reload(); },
  reload: () => location.reload(),
  'auth-mode': d => {
    ui.authMode = d.v; ui.authError = ''; ui.authDetail = '';
    const e = document.querySelector('#auth-email'); if (e) ui.authEmail = cleanEmail(e.value);
    render();
  },
} });
