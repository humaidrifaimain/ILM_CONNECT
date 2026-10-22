const assert = require('node:assert/strict');
const { availabilitySessionStarts } = require('../src/lib/session-timing.ts');
const day = new Date(2050, 0, 2);
const date = (hour, minute) => new Date(2050, 0, 2, hour, minute);
const label = instant => `${instant.getHours()}:${String(instant.getMinutes()).padStart(2, '0')}`;

assert.deepEqual(availabilitySessionStarts(day, [13, 14, 15, 16], []).map(label), ['13:00', '13:50', '14:40', '15:30', '16:20']);
const stored = [{ startsAt: date(13, 0).toISOString(), endsAt: date(13, 40).toISOString() }];
assert.equal(label(availabilitySessionStarts(day, [13, 14], stored)[0]), '13:50');
assert.deepEqual(availabilitySessionStarts(day, [13], stored), []);
assert.deepEqual(availabilitySessionStarts(day, [13, 15], []).map(label), ['13:00', '15:00']);
assert.deepEqual(availabilitySessionStarts(day, [], []), []);
const offGrid = [{ startsAt: date(13, 10).toISOString(), endsAt: date(13, 50).toISOString() }];
assert.equal(label(availabilitySessionStarts(day, [13, 14, 15], offGrid)[0]), '14:00');
const overlapping = [...stored, { startsAt: date(13, 20).toISOString(), endsAt: date(14, 0).toISOString() }];
assert.equal(label(availabilitySessionStarts(day, [13, 14, 15], overlapping)[0]), '14:10');
const tomorrow = [{ startsAt: new Date(2050, 0, 3, 13).toISOString(), endsAt: new Date(2050, 0, 3, 13, 40).toISOString() }];
assert.deepEqual(availabilitySessionStarts(day, [13, 14], tomorrow).map(label), ['13:00', '13:50']);
console.log('PASS: 50-minute start cadence, reserved gaps, shift boundaries, disjoint shifts, empty hours, existing off-grid/overlapping sessions, and separate dates');
