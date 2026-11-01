'use strict';
// Which reminder an open workout is due for. Kept apart from index.js so it can be tested without the cloud.

const EVERY_MIN = 10;      // one reminder every 10 minutes
const MAX_REMINDERS = 18;  // stops after 3 hours, so a workout left open overnight doesn't buzz all night

// a: the workout in progress (users/{uid}.active), last: what we sent for it so far ({ workoutId, n })
// Returns the reminder number to send now, or 0 for nothing.
function dueReminder(a, last, now) {
  if (!a || a.past || a.waiting || typeof a.start !== 'number') return 0;
  const n = Math.min(Math.floor((now - a.start) / (EVERY_MIN * 60000)), MAX_REMINDERS);
  if (n < 1) return 0;
  const sent = last && last.workoutId === a.id ? last.n || 0 : 0;
  return n > sent ? n : 0;
}

function reminderMessage(a, n) {
  const min = n * EVERY_MIN;
  const time = min < 60 ? `${min} דק׳` : `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')} שעות`;
  return {
    title: `אימון פעיל · ${time}`,
    body: n >= MAX_REMINDERS ? 'האימון עדיין פתוח. זו התזכורת האחרונה. לחץ כדי לסיים.' : 'שכחת לסיים? לחץ כדי לחזור לאימון.',
    tag: 'setou-active', url: './#/workout', dir: 'rtl', lang: 'he',
  };
}

module.exports = { dueReminder, reminderMessage, EVERY_MIN, MAX_REMINDERS };
