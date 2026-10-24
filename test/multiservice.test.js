// Regression tests for the bug Amy hit on a live call: Mia offered and read
// back "a Skin Fade and a Kids Cut with Dani on Sunday, October 25, both at
// twelve noon". One stylist can only do one service at a time.
const test = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('../data/generate-mock');
const { createStore } = require('../src/store');
const { createToolHandlers } = require('../src/tools');
const { FRI_10AM } = require('./helpers');

const SUN = '2026-10-25';
const CALLER = { customer_name: 'Amy', customer_phone: '415-555-0100' };

// Same mock data, but Dani is free 12:00 to 13:30 on Sunday so the exact case is reproducible.
function setupSunday() {
  const data = generate('2026-10-23');
  data.slots['fd-dani'][SUN] = [...new Set([...data.slots['fd-dani'][SUN], '12:00', '12:30', '13:00'])].sort();
  const store = createStore(data, () => FRI_10AM);
  const tools = createToolHandlers(store, { defaultBusinessId: 'fade-district' });
  return { store, tools };
}

test('exact bug: Skin Fade and Kids Cut with Dani both at 12:00 cannot both be booked', () => {
  const { tools } = setupSunday();
  const first = tools.run('book_appointment', { service_id: 'fd-fade', stylist_id: 'fd-dani', date: SUN, time: '12:00', ...CALLER });
  assert.equal(first.ok, true);
  // Second service at the same time with the same stylist, even for a different person (the kid).
  const second = tools.run('book_appointment', { service_id: 'fd-kids', stylist_id: 'fd-dani', date: SUN, time: '12:00', ...CALLER, for_person: 'Leo' });
  assert.equal(second.ok, false);
  assert.equal(second.error, 'SLOT_TAKEN');
  assert.ok(second.alternatives.length > 0);
  assert.ok(second.alternatives.every((a) => !(a.stylist_id === 'fd-dani' && a.date === SUN && a.time === '12:00')));
  // Overlapping half way (12:15 style starts are not on the grid, so try 11:30 + 60 min combos via a 60 min service).
  const combo = tools.run('book_appointment', { service_id: 'fd-combo', stylist_id: 'fd-dani', date: SUN, time: '11:30', ...CALLER, for_person: 'Sam' });
  assert.equal(combo.ok, false);
});

test('check_availability with two services returns back to back blocks sized to the total', () => {
  const { tools } = setupSunday();
  const r = tools.run('check_availability', { service_ids: ['fd-fade', 'fd-kids'], date: SUN, stylist: 'Dani', around_time: '12:00' });
  assert.equal(r.ok, true);
  assert.equal(r.total_duration_min, 60);
  assert.equal(r.total_price, 75);
  const noon = r.slots.find((s) => s.time === '12:00');
  assert.ok(noon, 'noon block should be offered when Dani is free 12:00 to 13:00');
  assert.equal(noon.end_time, '13:00');
  assert.deepEqual(noon.schedule.map((x) => [x.service_id, x.start]), [['fd-fade', '12:00'], ['fd-kids', '12:30']]);
  assert.match(noon.spoken, /Skin Fade at 12 PM, then Kids Cut.* at 12:30 PM, with Dani/);
  for (const s of r.slots) {
    assert.notEqual(s.schedule[0].start, s.schedule[1].start, 'two services never share a start time');
  }
  // 13:00 cannot start a 60 minute block (only 13:00 to 13:30 is open after the patch).
  assert.ok(!r.slots.some((s) => s.time === '13:00'));
});

test('one book_appointment with service_ids books both back to back and holds 60 minutes', () => {
  const { tools, store } = setupSunday();
  const r = tools.run('book_appointment', { service_ids: ['fd-fade', 'fd-kids'], stylist_id: 'fd-dani', date: SUN, time: '12:00', ...CALLER, for_person: 'Amy and Leo' });
  assert.equal(r.ok, true);
  const a = store.appointments.get(r.appointment.confirmation_code);
  assert.deepEqual(a.services.map((x) => [x.service_id, x.start, x.end]), [['fd-fade', '12:00', '12:30'], ['fd-kids', '12:30', '13:00']]);
  assert.equal(a.duration_min, 60);
  assert.equal(a.end_time, '13:00');
  assert.equal(a.price, 75);
  assert.ok(!store.startTimes('fd-dani', SUN, 30).includes('12:00'));
  assert.ok(!store.startTimes('fd-dani', SUN, 30).includes('12:30'));
  assert.ok(store.startTimes('fd-dani', SUN, 30).includes('13:00'));
  // Anything inside the block is now rejected for Dani.
  const clash = tools.run('book_appointment', { service_id: 'fd-classic', stylist_id: 'fd-dani', date: SUN, time: '12:30', customer_name: 'Bo', customer_phone: '510-555-0199' });
  assert.equal(clash.error, 'SLOT_TAKEN');
});

test('same caller and person at overlapping times with two stylists is CALLER_OVERLAP; for_person allows it', () => {
  const data = generate('2026-10-23');
  data.slots['fd-dani'][SUN] = ['12:00', '12:30'];
  data.slots['fd-luis'][SUN] = ['12:00', '12:30'];
  const store = createStore(data, () => FRI_10AM);
  const base = { businessId: 'fade-district', date: SUN, time: '12:00', customerName: 'Amy', customerPhone: '4155550100' };
  assert.equal(store.book({ ...base, serviceId: 'fd-fade', staffId: 'fd-dani' }).ok, true);
  assert.equal(store.book({ ...base, serviceId: 'fd-kids', staffId: 'fd-luis' }).error, 'CALLER_OVERLAP');
  assert.equal(store.book({ ...base, serviceId: 'fd-kids', staffId: 'fd-luis', forPerson: 'Leo' }).ok, true);
});

test('NO_SINGLE_STYLIST when no one stylist offers every requested service', () => {
  const { tools } = setupSunday();
  // Kids Cut (Dani, Luis) + Hot Towel Shave (Marcus, Luis) + Beard Trim (Marcus, Dani): nobody does all three.
  const r = tools.run('check_availability', { service_ids: ['fd-kids', 'fd-shave', 'fd-beard'], date: SUN });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'NO_SINGLE_STYLIST');
});

test('reschedule and cancel move or free the whole multi service block', () => {
  const { tools, store } = setupSunday();
  const r = tools.run('book_appointment', { service_ids: ['fd-fade', 'fd-kids'], stylist_id: 'fd-dani', date: SUN, time: '12:00', ...CALLER });
  const code = r.appointment.confirmation_code;
  const mv = tools.run('reschedule_appointment', { confirmation_code: code, new_date: SUN, new_time: '14:00' });
  assert.equal(mv.ok, true);
  assert.ok(store.startTimes('fd-dani', SUN, 60).includes('12:00'), 'old block released');
  assert.ok(!store.startTimes('fd-dani', SUN, 30).includes('14:30'), 'second half of new block held');
  // Moving into a half open window (13:00 to 13:30 only) is rejected.
  const bad = tools.run('reschedule_appointment', { confirmation_code: code, new_date: SUN, new_time: '13:00' });
  assert.equal(bad.ok, false);
  assert.equal(tools.run('cancel_appointment', { confirmation_code: code }).ok, true);
  assert.ok(store.startTimes('fd-dani', SUN, 60).includes('14:00'));
});
