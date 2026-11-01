'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { dueReminder, reminderMessage } = require('../reminders');

const MIN = 60000, start = 1_000_000_000_000;
const a = { id: 'w1', start };

test('nothing before 10 minutes', () => assert.equal(dueReminder(a, null, start + 9 * MIN), 0));
test('first reminder at 10 minutes', () => assert.equal(dueReminder(a, null, start + 10 * MIN), 1));
test('not twice for the same 10 minutes', () => assert.equal(dueReminder(a, { workoutId: 'w1', n: 1 }, start + 15 * MIN), 0));
test('next one at 20 minutes', () => assert.equal(dueReminder(a, { workoutId: 'w1', n: 1 }, start + 20 * MIN), 2));
test('a new workout starts counting again', () => assert.equal(dueReminder(a, { workoutId: 'old', n: 5 }, start + 10 * MIN), 1));
test('a missed slot sends one catch-up, not several', () => assert.equal(dueReminder(a, { workoutId: 'w1', n: 1 }, start + 45 * MIN), 4));
test('stops after 3 hours', () => {
  assert.equal(dueReminder(a, null, start + 200 * MIN), 18);
  assert.equal(dueReminder(a, { workoutId: 'w1', n: 18 }, start + 500 * MIN), 0);
});
test('no reminders while waiting for the first machine, or for a workout logged afterwards', () => {
  assert.equal(dueReminder({ ...a, waiting: true }, null, start + 30 * MIN), 0);
  assert.equal(dueReminder({ ...a, past: 60 }, null, start + 30 * MIN), 0);
  assert.equal(dueReminder(null, null, start), 0);
});
test('message shows the time', () => {
  assert.equal(reminderMessage(a, 2).title, 'אימון פעיל · 20 דק׳');
  assert.equal(reminderMessage(a, 9).title, 'אימון פעיל · 1:30 שעות');
});
