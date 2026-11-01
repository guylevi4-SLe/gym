'use strict';
// Open-workout reminders: every minute, find people with a workout in progress and send each phone
// a notification once every 10 minutes (see reminders.js). The phone shows it, and the watch mirrors it.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const webpush = require('web-push');
const { dueReminder, reminderMessage } = require('./reminders');

admin.initializeApp();
const db = admin.firestore();

// The notification key pair is made once, here, and never leaves the cloud except for its public half,
// which the app reads from public/vapid when someone turns reminders on.
async function vapidKeys() {
  const ref = db.doc('config/vapid');
  let keys = (await ref.get()).data();
  if (!keys?.privateKey) {
    keys = webpush.generateVAPIDKeys();
    await db.runTransaction(async t => {
      const cur = (await t.get(ref)).data();
      if (cur?.privateKey) keys = cur; else t.set(ref, keys);
    });
  }
  const pub = db.doc('public/vapid');
  if ((await pub.get()).data()?.publicKey !== keys.publicKey) await pub.set({ publicKey: keys.publicKey });
  return keys;
}

exports.workoutReminders = onSchedule(
  { schedule: 'every 1 minutes', region: 'europe-west1', memory: '256MiB', timeoutSeconds: 60, retryCount: 0 },
  async () => {
    const keys = await vapidKeys();
    webpush.setVapidDetails('https://guylevi4-sle.github.io/gym/', keys.publicKey, keys.privateKey);
    const now = Date.now();
    const open = await db.collection('users').where('active', '!=', null).get();
    await Promise.all(open.docs.map(async u => {
      const a = u.get('active');
      const stateRef = db.doc(`reminders/${u.id}`);
      const n = dueReminder(a, (await stateRef.get()).data(), now);
      if (!n) return;
      // mark it sent first, so a slow phone never gets the same reminder twice
      await stateRef.set({ workoutId: a.id, n, at: now });
      const payload = JSON.stringify(reminderMessage(a, n));
      const devices = await u.ref.collection('devices').get();
      await Promise.all(devices.docs.map(d => webpush.sendNotification(d.get('sub'), payload, { TTL: 600, urgency: 'high' })
        .catch(err => {
          // 404 / 410: the phone turned notifications off or removed the app
          if (err.statusCode === 404 || err.statusCode === 410) return d.ref.delete();
          console.warn('push failed', u.id, err.statusCode || err.message);
        })));
    }));
  },
);
