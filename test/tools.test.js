const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setup, firstOpen } = require('./helpers');
const { buildPrompt, buildGreeting } = require('../src/prompt');

const BOOK = { customer_name: 'Alex', customer_phone: '415-555-0100' };

test('search_nearby by ZIP sorts by distance and reports open now, price, rating', () => {
  const { tools } = setup();
  const r = tools.run('search_nearby', { location: '94110' });
  assert.equal(r.ok, true);
  assert.equal(r.results[0].business_id, 'fade-district');
  assert.ok(r.results.every((x) => x.type === 'barbershop'));
  for (let i = 1; i < r.results.length; i++) assert.ok(r.results[i].distance_miles >= r.results[i - 1].distance_miles);
  assert.equal(typeof r.results[0].open_now, 'boolean');
  assert.ok(r.results[0].rating && r.results[0].price);
});

test('search_nearby by neighborhood alias, with price and rating filters', () => {
  const { tools } = setup();
  const r = tools.run('search_nearby', { location: 'Temescal', max_distance_miles: 20 });
  assert.equal(r.results[0].business_id, 'oak-and-blade');
  const cheap = tools.run('search_nearby', { location: 'the mission', max_price_level: 1 });
  assert.deepEqual(cheap.results.map((x) => x.business_id), ['golden-gate-grooming']);
  const rated = tools.run('search_nearby', { location: 'mission', min_rating: 4.75 });
  assert.ok(rated.results.every((x) => x.rating >= 4.75));
});

test('search_nearby open_now filter uses business hours (Monday: Fade District closed)', () => {
  const { tools } = setup(new Date('2026-10-26T17:00:00Z')); // Monday 10 AM Pacific
  const r = tools.run('search_nearby', { location: '94110', open_now: true });
  assert.ok(!r.results.some((x) => x.business_id === 'fade-district'));
  assert.ok(r.results.some((x) => x.business_id === 'golden-gate-grooming'));
});

test('search_nearby unknown location asks for neighborhood or ZIP', () => {
  const { tools } = setup();
  const r = tools.run('search_nearby', { location: 'Narnia' });
  assert.equal(r.error, 'UNKNOWN_LOCATION');
  assert.ok(r.known_areas.length > 0);
});

test('search_nearby with no matches suggests the closest place without filters', () => {
  const { tools } = setup();
  const r = tools.run('search_nearby', { location: '94609', max_price_level: 1, max_distance_miles: 2 });
  assert.equal(r.results.length, 0);
  assert.equal(r.closest_without_filters.business_id, 'oak-and-blade');
});

test('list_services matches caller wording and refuses unknown services', () => {
  const { tools } = setup();
  assert.equal(tools.run('list_services', { service_query: 'a fade' }).match.service_id, 'fd-fade');
  assert.equal(tools.run('list_services', { service_query: 'haircut and beard' }).match.service_id, 'fd-combo');
  const unknown = tools.run('list_services', { service_query: 'perm' });
  assert.equal(unknown.match, null);
  assert.match(unknown.message, /Do not book/);
  const all = tools.run('list_services', {});
  assert.equal(all.services.length, 6);
  const spa = tools.run('list_services', { business_id: 'serenity-skin', service_query: 'botox' });
  assert.equal(spa.match.service_id, 'ss-consult');
});

test('check_availability returns only real future slots, filtered by part of day', () => {
  const { tools, store } = setup();
  const r = tools.run('check_availability', { service_id: 'fd-fade', date: '2026-10-23', part_of_day: 'afternoon' });
  assert.equal(r.ok, true);
  for (const s of r.slots) {
    assert.ok(s.time >= '12:00' && s.time < '17:00');
    assert.ok(store.startTimes(s.stylist_id, s.date, 30).includes(s.time));
  }
  const today = tools.run('check_availability', { service_id: 'fd-fade', date: '2026-10-23' });
  assert.ok(today.slots.every((s) => s.time >= '10:30'), 'today needs 30 min notice after 10:00');
});

test('check_availability edge cases: past, out of range, closed day, stylist mismatch, unknown service', () => {
  const { tools } = setup();
  assert.equal(tools.run('check_availability', { service_id: 'fd-fade', date: '2026-10-22' }).error, 'IN_THE_PAST');
  assert.equal(tools.run('check_availability', { service_id: 'fd-fade', date: '2026-11-15' }).error, 'OUT_OF_RANGE');
  const closed = tools.run('check_availability', { service_id: 'fd-fade', date: '2026-10-26' }); // Monday
  assert.equal(closed.open_that_day, false);
  assert.equal(closed.slots.length, 0);
  assert.ok(closed.next_available && closed.next_available.date > '2026-10-26');
  assert.equal(tools.run('check_availability', { service_id: 'fd-kids', date: '2026-10-24', stylist: 'Marcus' }).error, 'STYLIST_DOES_NOT_OFFER_SERVICE');
  assert.equal(tools.run('check_availability', { service_id: 'fd-fade', date: '2026-10-24', stylist: 'Zed' }).error, 'UNKNOWN_STYLIST');
  assert.equal(tools.run('check_availability', { service_id: 'nope', date: '2026-10-24' }).error, 'UNKNOWN_SERVICE');
  assert.equal(tools.run('check_availability', { service_id: 'fd-fade', date: 'tomorrow' }).error, 'BAD_DATE');
});

test('book_appointment books and the slot disappears from availability', () => {
  const { tools, store } = setup();
  const slot = firstOpen(store, 'fade-district', 'fd-fade', '2026-10-24');
  const r = tools.run('book_appointment', { service_id: 'fd-fade', date: '2026-10-24', ...slot, ...BOOK });
  assert.equal(r.ok, true);
  assert.match(r.appointment.confirmation_code, /^BK\d+$/);
  assert.equal(r.appointment.customer_phone, '4155550100');
  assert.ok(!store.startTimes(slot.stylist_id, '2026-10-24', 30).includes(slot.time));
});

test('DOUBLE BOOKING: second caller cannot take the same stylist and time', () => {
  const { tools, store } = setup();
  const slot = firstOpen(store, 'fade-district', 'fd-fade', '2026-10-24');
  const args = { service_id: 'fd-fade', date: '2026-10-24', ...slot };
  const first = tools.run('book_appointment', { ...args, ...BOOK });
  const second = tools.run('book_appointment', { ...args, customer_name: 'Sam', customer_phone: '5105550199' });
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.error, 'SLOT_TAKEN');
  assert.ok(second.alternatives.length > 0);
  assert.ok(!second.alternatives.some((a) => a.stylist_id === slot.stylist_id && a.date === '2026-10-24' && a.time === slot.time));
  assert.equal([...store.appointments.values()].filter((a) => a.status === 'booked').length, 1);
});

test('DOUBLE BOOKING: long services block every overlapping slot', () => {
  const { tools, store } = setup();
  // Find a Priya balayage (3 hours) start on Saturday.
  const date = ['2026-10-24', '2026-10-27', '2026-10-28', '2026-10-29'].find((d) => store.startTimes('ll-priya', d, 180).length);
  const t = date && store.startTimes('ll-priya', date, 180)[0];
  assert.ok(t, 'fixture has a 3 hour opening');
  const r = tools.run('book_appointment', { business_id: 'luxe-lather', service_id: 'll-balayage', stylist_id: 'll-priya', date, time: t, ...BOOK });
  assert.equal(r.ok, true);
  const mid = `${String(Number(t.slice(0, 2)) + 1).padStart(2, '0')}:${t.slice(3)}`; // one hour in
  const overlap = tools.run('book_appointment', { business_id: 'luxe-lather', service_id: 'll-gloss', stylist_id: 'll-priya', date, time: mid, ...BOOK });
  assert.equal(overlap.error, 'SLOT_TAKEN');
});

test('slot taken mid call (between check and book) is caught at booking time', () => {
  const { tools, store } = setup();
  const offered = tools.run('check_availability', { service_id: 'fd-fade', date: '2026-10-24' }).slots[0];
  store.takeSlotForDemo(offered.stylist_id, offered.date, offered.time); // another caller grabs it
  const r = tools.run('book_appointment', { service_id: 'fd-fade', stylist_id: offered.stylist_id, date: offered.date, time: offered.time, ...BOOK });
  assert.equal(r.error, 'SLOT_TAKEN');
  assert.ok(r.alternatives.length);
});

test('book_appointment validates inputs', () => {
  const { tools, store } = setup();
  const slot = firstOpen(store, 'fade-district', 'fd-fade', '2026-10-24');
  const base = { service_id: 'fd-fade', date: '2026-10-24', ...slot, ...BOOK };
  assert.equal(tools.run('book_appointment', { ...base, customer_phone: '555' }).error, 'BAD_PHONE');
  assert.equal(tools.run('book_appointment', { ...base, customer_name: ' ' }).error, 'MISSING_NAME');
  assert.equal(tools.run('book_appointment', { ...base, time: '7pm' }).error, 'BAD_TIME');
  assert.equal(tools.run('book_appointment', { ...base, service_id: 'fd-kids', stylist_id: 'fd-marcus' }).error, 'STYLIST_DOES_NOT_OFFER_SERVICE');
  assert.equal(tools.run('book_appointment', { ...base, date: '2026-10-23', time: '09:00' }).error, 'IN_THE_PAST');
});

test('find, reschedule, and cancel free and take slots correctly', () => {
  const { tools, store } = setup();
  const a = firstOpen(store, 'fade-district', 'fd-fade', '2026-10-24');
  const booked = tools.run('book_appointment', { service_id: 'fd-fade', date: '2026-10-24', ...a, ...BOOK }).appointment;
  const nm = BOOK.customer_name;
  assert.equal(tools.run('find_appointment', { customer_phone: '(415) 555-0100', customer_name: nm }).appointments.length, 1);

  const b = firstOpen(store, 'fade-district', 'fd-fade', '2026-10-25');
  const moved = tools.run('reschedule_appointment', { confirmation_code: booked.confirmation_code, new_date: '2026-10-25', new_time: b.time, stylist_id: b.stylist_id });
  assert.equal(moved.ok, true);
  assert.ok(store.startTimes(a.stylist_id, '2026-10-24', 30).includes(a.time), 'old slot released');
  assert.ok(!store.startTimes(b.stylist_id, '2026-10-25', 30).includes(b.time), 'new slot taken');

  // Rescheduling onto a taken slot fails and keeps the original booking intact.
  const c = firstOpen(store, 'fade-district', 'fd-fade', '2026-10-24');
  store.takeSlotForDemo(c.stylist_id, '2026-10-24', c.time);
  const fail = tools.run('reschedule_appointment', { confirmation_code: booked.confirmation_code, new_date: '2026-10-24', new_time: c.time, stylist_id: c.stylist_id });
  assert.equal(fail.error, 'SLOT_TAKEN');
  assert.ok(!store.startTimes(b.stylist_id, '2026-10-25', 30).includes(b.time), 'original slot still held');

  const cancelled = tools.run('cancel_appointment', { confirmation_code: booked.confirmation_code.toLowerCase() });
  assert.equal(cancelled.ok, true);
  assert.ok(store.startTimes(b.stylist_id, '2026-10-25', 30).includes(b.time), 'slot released on cancel');
  assert.equal(tools.run('cancel_appointment', { confirmation_code: booked.confirmation_code }).error, 'NOT_FOUND');
  assert.equal(tools.run('find_appointment', { customer_phone: '4155550100', customer_name: BOOK.customer_name }).appointments.length, 0);
});

test('find_appointment needs the name on the booking, not just the phone', () => {
  const { tools, store } = setup();
  const a = firstOpen(store, 'fade-district', 'fd-fade', '2026-10-24');
  tools.run('book_appointment', { service_id: 'fd-fade', date: '2026-10-24', ...a, customer_name: 'José Ramírez', customer_phone: '4155550188' });
  assert.equal(tools.run('find_appointment', { customer_phone: '4155550188' }).error, 'NEED_NAME');
  const wrong = tools.run('find_appointment', { customer_phone: '4155550188', customer_name: 'Pat' });
  assert.equal(wrong.appointments.length, 0);
  assert.match(wrong.say, /Do not say whether the number has other bookings/);
  assert.equal(tools.run('find_appointment', { customer_phone: '415-555-0188', customer_name: 'jose' }).appointments.length, 1, 'first name, accents ignored');
  assert.equal(tools.run('find_appointment', { customer_phone: '4155550188', customer_name: 'Jose Ramirez' }).appointments.length, 1);
});

test('transfer_to_human connects when open, falls back to a message when closed', () => {
  const open = setup().tools.run('transfer_to_human', { reason: 'wants a person' });
  assert.equal(open.status, 'transferring');
  const { tools, store } = setup(new Date('2026-10-24T06:00:00Z')); // Friday 11 PM Pacific
  const closed = tools.run('transfer_to_human', { reason: 'wants a person' });
  assert.equal(closed.status, 'unavailable');
  assert.match(closed.next_open, /Saturday/);
  const msg = tools.run('take_message', { caller_name: 'Jo', callback_phone: '+1 415 555 0123', message: 'Call me about a group booking' });
  assert.equal(msg.ok, true);
  assert.equal(store.messages[0].callback_phone, '4155550123');
  assert.equal(tools.run('take_message', { caller_name: 'Jo', callback_phone: '12', message: 'x' }).error, 'BAD_PHONE');
});

test('run() never throws: bad JSON, empty args, unknown tool', () => {
  const { tools } = setup();
  assert.equal(tools.run('search_nearby', '{bad').error, 'BAD_ARGUMENTS');
  assert.equal(tools.run('list_services', '').ok, true);
  assert.equal(tools.run('teleport', '{}').error, 'UNKNOWN_FUNCTION');
  assert.equal(tools.run('end_call', '{}').status, 'ending');
});

test('copy rule: no em dashes in prompts, greetings, UI, or tool output', () => {
  const { tools, store } = setup();
  const EM = '\u2014';
  for (const b of store.businesses) {
    assert.ok(!buildPrompt({ business: b, now: store.now(), openNow: true }).includes(EM), b.id);
    assert.ok(!buildGreeting(b).includes(EM));
  }
  for (const f of ['index.html', 'app.js']) assert.ok(!fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8').includes(EM), f);
  const outputs = [
    tools.run('search_nearby', { location: '94110' }), tools.run('list_services', { service_query: 'perm' }),
    tools.run('check_availability', { service_id: 'fd-fade', date: '2026-10-26' }), tools.run('transfer_to_human', { reason: 'x' }),
  ];
  assert.ok(!JSON.stringify(outputs).includes(EM));
});

test('med spa prompt forbids medical advice', () => {
  const { store } = setup();
  const p = buildPrompt({ business: store.getBusiness('serenity-skin'), now: store.now(), openNow: true });
  assert.match(p, /Never give medical advice/);
  assert.match(p, /911/);
});

test('list_services understands Spanish and Mandarin service words', () => {
  const { tools } = setup();
  const name = (q) => (tools.run('list_services', { business_id: 'fade-district', service_query: q }).match || {}).name;
  assert.equal(name('corte clásico'), 'Classic Haircut');
  assert.equal(name('corte y barba'), 'Haircut and Beard Combo');
  assert.equal(name('degradado'), 'Skin Fade');
  assert.equal(name('afeitado con toalla caliente'), 'Hot Towel Shave');
  assert.equal(name('儿童理发'), 'Kids Cut (12 and under)');
  assert.equal(name('剪头发和修胡子'), 'Haircut and Beard Combo');
  assert.equal(name('渐变'), 'Skin Fade');
});

test('find_appointment by confirmation code works without the phone and does not reveal it', () => {
  const { tools, store } = setup();
  const slot = firstOpen(store, 'fade-district', 'fd-classic', '2026-10-24');
  const b = tools.run('book_appointment', { service_id: 'fd-classic', date: '2026-10-24', ...slot, ...BOOK });
  const code = b.appointment.confirmation_code;
  const spaced = code.split('').join(' ').toLowerCase();
  const r = tools.run('find_appointment', { confirmation_code: spaced });
  assert.equal(r.ok, true);
  assert.equal(r.appointments[0].confirmation_code, code);
  assert.equal(r.appointments[0].customer_phone, undefined);
  assert.equal(tools.run('find_appointment', { confirmation_code: 'BK9999' }).error, 'NOT_FOUND');
  assert.equal(tools.run('find_appointment', {}).error, 'NEED_CODE_OR_PHONE');
});
