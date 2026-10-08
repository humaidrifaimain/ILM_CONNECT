import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendarRange } from '../src/lib/calendar-range.ts';

const key = date => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

test('current week includes yesterday and today but no earlier dates', () => {
  const today = new Date(2026, 9, 8, 13);
  const range = calendarRange(today, 'week', today);
  assert.deepEqual(range.days.map(key), ['2026-10-7', '2026-10-8', '2026-10-9', '2026-10-10', '2026-10-11']);
  assert.equal(range.canGoPrevious, false);
});

test('day navigation reaches yesterday but cannot go further back', () => {
  const today = new Date(2026, 9, 8, 13);
  const current = calendarRange(today, 'day', today);
  assert.equal(current.canGoPrevious, true);
  const yesterday = calendarRange(current.previousDate, 'day', today);
  assert.equal(key(yesterday.days[0]), '2026-10-7');
  assert.equal(yesterday.canGoPrevious, false);
  assert.equal(key(calendarRange(new Date(2020, 0, 1), 'day', today).days[0]), '2026-10-7');
});

test('Monday can navigate to the preceding Sunday without exposing its earlier week', () => {
  const monday = new Date(2026, 9, 12, 13);
  const range = calendarRange(monday, 'week', monday);
  assert.equal(range.canGoPrevious, true);
  const previous = calendarRange(range.previousDate, 'week', monday);
  assert.deepEqual(previous.days.map(key), ['2026-10-11']);
  assert.equal(previous.canGoPrevious, false);
});

test('month navigation preserves yesterday across a year boundary', () => {
  const today = new Date(2027, 0, 1, 13);
  const range = calendarRange(today, 'month', today);
  assert.equal(key(range.days[0]), '2026-12-31');
  assert.equal(range.canGoPrevious, true);
  const previous = calendarRange(range.previousDate, 'month', today);
  assert.equal(key(previous.days[0]), '2026-12-31');
  assert.equal(previous.canGoPrevious, false);
});

test('future ranges remain navigable and the cutoff advances at midnight', () => {
  const today = new Date(2026, 9, 8, 13);
  for (const view of ['day', 'week', 'month']) {
    const range = calendarRange(new Date(2026, 10, 15), view, today);
    assert.equal(range.canGoPrevious, true);
    assert.ok(range.days.every(day => day >= range.minimumDate));
  }
  const tomorrow = new Date(2026, 9, 9);
  assert.equal(key(calendarRange(new Date(2026, 9, 7), 'day', tomorrow).days[0]), '2026-10-8');
});

test('the cutoff uses local calendar days across daylight saving transitions', () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    for (const today of [new Date(2026, 2, 9, 13), new Date(2026, 10, 2, 13)]) {
      const range = calendarRange(today, 'week', today);
      const expected = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      assert.equal(+range.minimumDate, +expected);
      assert.equal(range.minimumDate.getHours(), 0);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
