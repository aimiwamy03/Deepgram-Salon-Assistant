// In-memory business data plus booking state. All writes are synchronous, so
// within one Node process a slot can never be handed to two callers: the
// "check every needed slot, then take them" step cannot interleave.
const fs = require('fs');
const path = require('path');
const { localParts, addDays, weekdayOf, toMin, fromMin, spoken, spokenDate, isDate, isTime } = require('./time');
const { generate } = require('../data/generate-mock');

const MOCK_PATH = path.join(__dirname, '..', 'data', 'mock.json');

function loadMockData(clock = () => new Date()) {
  let data = JSON.parse(fs.readFileSync(MOCK_PATH, 'utf8'));
  const today = localParts(clock()).date;
  if (data.generated_for !== today) data = generate(today); // keep the 7 day window current
  return data;
}

const digits = (s) => String(s || '').replace(/\D/g, '');
function normPhone(p) {
  let d = digits(p);
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length === 10 ? d : null;
}
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Callers name services in Spanish or Mandarin too. Map common words to the
// English service vocabulary before matching. Longer phrases come first.
const FOREIGN_TERMS = [
  ['corte de pelo', 'haircut'], ['corte de cabello', 'haircut'], ['toalla caliente', 'hot towel'], ['depilacion laser', 'laser hair removal'],
  ['corte', 'cut'], ['pelo', 'hair'], ['cabello', 'hair'], ['barba', 'beard'], ['clasico', 'classic'], ['ninos', 'kids'], ['nino', 'kids'], ['nina', 'kids'], ['hijo', 'kids'], ['hija', 'kids'],
  ['degradado', 'fade'], ['desvanecido', 'fade'], ['afeitado', 'shave'], ['afeitada', 'shave'], ['rasurado', 'shave'], ['tinte', 'color'], ['mechas', 'highlights'], ['reflejos', 'highlights'],
  ['peinado', 'blowout'], ['secado', 'blowout'], ['consulta', 'consultation'], ['depilacion', 'hair removal'], ['perfilado', 'line up'], ['contorno', 'line up'], ['brillo', 'gloss'], ['rastas', 'loc'],
  ['激光脱毛', 'laser hair removal'], ['修胡子', 'beard trim'], ['剪头发', 'haircut'], ['剪头', 'haircut'], ['剪发', 'haircut'], ['理发', 'haircut'], ['胡子', 'beard'], ['胡须', 'beard'],
  ['渐变', 'fade'], ['渐层', 'fade'], ['儿童', 'kids'], ['小孩', 'kids'], ['孩子', 'kids'], ['刮脸', 'shave'], ['剃须', 'shave'], ['修面', 'shave'], ['热毛巾', 'hot towel'],
  ['染发', 'color'], ['挑染', 'highlights'], ['吹头发', 'blowout'], ['吹发', 'blowout'], ['面部护理', 'facial'], ['脸部护理', 'facial'], ['咨询', 'consultation'], ['肉毒素', 'botox'], ['肉毒', 'botox'],
  ['填充', 'filler'], ['经典', 'classic'], ['普通', 'classic'], ['男士', 'men'], ['女士', 'women'], ['和', ' and '],
];
function toEnglishTerms(query) {
  let q = ` ${String(query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')} `;
  for (const [from, to] of FOREIGN_TERMS) {
    q = /[a-z]/.test(from) ? q.replace(new RegExp(`(?<![a-z])${from}(?![a-z])`, 'g'), to) : q.split(from).join(` ${to} `);
  }
  return q.trim();
}

const SERVICE_SYNONYMS = {
  fade: ['fade', 'taper', 'skin fade'],
  beard: ['beard', 'line up', 'lineup', 'edge up'],
  shave: ['shave', 'straight razor', 'hot towel'],
  color: ['color', 'colour', 'dye', 'single process', 'roots'],
  balayage: ['balayage', 'highlights', 'ombre'],
  blowout: ['blowout', 'blow out', 'blow dry'],
  consult: ['consult', 'consultation', 'botox', 'filler', 'injectable', 'injectables', 'lip'],
  hydrafacial: ['hydrafacial', 'hydra facial', 'facial'],
  laser: ['laser', 'hair removal'],
  kids: ['kid', 'kids', 'child', 'son', 'daughter'],
};

function createStore(data, clock = () => new Date()) {
  const slots = JSON.parse(JSON.stringify(data.slots)); // staffId -> date -> [open starts]
  const appointments = new Map(); // code -> appointment
  const messages = [];
  const handoffs = [];
  let seq = 1000;

  const now = () => localParts(clock());
  const businesses = data.businesses;
  const getBusiness = (id) => businesses.find((b) => b.id === id) || null;
  const getStaff = (b, idOrName) => {
    if (!idOrName) return null;
    const q = norm(idOrName);
    return b.staff.find((s) => s.id === idOrName || norm(s.name) === q || norm(s.name).split(' ')[0] === q.split(' ')[0]) || null;
  };
  const windowEnd = () => addDays(data.generated_for, 6);

  function matchService(b, query) {
    if (!query) return { match: null, suggestions: b.services };
    const exact = b.services.find((s) => s.id === query || norm(s.name) === norm(query));
    if (exact) return { match: exact, suggestions: [] };
    const q = norm(toEnglishTerms(query));
    const exact2 = b.services.find((s) => norm(s.name) === q);
    if (exact2) return { match: exact2, suggestions: [] };
    const scored = b.services.map((s) => {
      const name = norm(s.name);
      let score = 0;
      for (const word of q.split(' ')) if (word.length > 2 && name.includes(word)) score += 2;
      for (const syns of Object.values(SERVICE_SYNONYMS)) {
        const qHit = syns.some((w) => q.includes(w));
        const sHit = syns.some((w) => name.includes(w));
        if (qHit && sHit) score += 3;
      }
      if (/\bhair ?cut\b|\bcut\b|\btrim\b/.test(q) && /cut/.test(name)) score += 1;
      return { s, score };
    }).filter((x) => x.score > 0).sort((a, b2) => b2.score - a.score);
    if (scored.length && (scored.length === 1 || scored[0].score > scored[1].score)) {
      return { match: scored[0].s, suggestions: [] };
    }
    return { match: null, suggestions: scored.length ? scored.map((x) => x.s) : b.services };
  }

  function hoursToday(b, date) {
    return b.hours[weekdayOf(date)] || null;
  }

  function isOpenNow(b) {
    const n = now();
    const h = hoursToday(b, n.date);
    return !!h && toMin(n.time) >= toMin(h[0]) && toMin(n.time) < toMin(h[1]);
  }

  function nextOpening(b) {
    const n = now();
    for (let i = 0; i < 8; i++) {
      const d = addDays(n.date, i);
      const h = hoursToday(b, d);
      if (!h) continue;
      if (i === 0 && toMin(n.time) >= toMin(h[1])) continue;
      if (i === 0 && toMin(n.time) >= toMin(h[0])) return { date: d, time: n.time, open_now: true };
      return { date: d, time: h[0], spoken: `${spokenDate(d)} at ${spoken(h[0])}` };
    }
    return null;
  }

  // Start times (HH:MM) on `date` where `staff` can fit `durationMin`.
  function startTimes(staffId, date, durationMin) {
    const open = new Set((slots[staffId] || {})[date] || []);
    const need = Math.ceil(durationMin / data.slot_minutes);
    const n = now();
    const minStart = date === n.date ? toMin(n.time) + 30 : -1; // need 30 min notice today
    return [...open].sort().filter((t) => {
      if (toMin(t) < minStart) return false;
      for (let k = 0; k < need; k++) if (!open.has(fromMin(toMin(t) + k * data.slot_minutes))) return false;
      return true;
    });
  }

  function validateWhen(date, time) {
    if (!isDate(date)) return { ok: false, error: 'BAD_DATE', message: 'Date must be YYYY-MM-DD.' };
    if (time !== undefined && !isTime(time)) return { ok: false, error: 'BAD_TIME', message: 'Time must be 24 hour HH:MM local time.' };
    const n = now();
    if (date < n.date || (date === n.date && time && toMin(time) <= toMin(n.time))) {
      return { ok: false, error: 'IN_THE_PAST', message: `That time has already passed. It is now ${spokenDate(n.date)}, ${spoken(n.time)}.` };
    }
    if (date > windowEnd()) {
      return { ok: false, error: 'OUT_OF_RANGE', message: `The calendar is only open through ${spokenDate(windowEnd())}.` };
    }
    return null;
  }

  function takeSlots(staffId, date, time, durationMin) {
    if (!startTimes(staffId, date, durationMin).includes(time)) return false;
    const need = Math.ceil(durationMin / data.slot_minutes);
    const day = slots[staffId][date];
    for (let k = 0; k < need; k++) {
      const t = fromMin(toMin(time) + k * data.slot_minutes);
      day.splice(day.indexOf(t), 1);
    }
    return true;
  }

  function releaseSlots(staffId, date, time, durationMin) {
    const need = Math.ceil(durationMin / data.slot_minutes);
    slots[staffId][date] = slots[staffId][date] || [];
    const day = slots[staffId][date];
    for (let k = 0; k < need; k++) {
      const t = fromMin(toMin(time) + k * data.slot_minutes);
      if (!day.includes(t)) day.push(t);
    }
    day.sort();
  }

  function describe(a) {
    const plan = (a.services || []).map((x) => `${x.name} at ${spoken(x.start)}`).join(', then ');
    return { ...a, spoken_when: `${spokenDate(a.date)} at ${spoken(a.time)}`, spoken_plan: plan || undefined };
  }

  // Resolve one or more service ids into a back to back plan for one stylist.
  function planServices(b, serviceIds) {
    const ids = (Array.isArray(serviceIds) ? serviceIds : [serviceIds]).filter(Boolean);
    if (!ids.length) return { error: { ok: false, error: 'UNKNOWN_SERVICE', message: 'Use service ids from list_services.' } };
    const services = [];
    for (const id of ids) {
      const svc = b.services.find((x) => x.id === id);
      if (!svc) return { error: { ok: false, error: 'UNKNOWN_SERVICE', message: `Unknown service id ${id}. Use ids from list_services.` } };
      services.push(svc);
    }
    return { services, totalMin: services.reduce((n, x) => n + x.duration_min, 0) };
  }

  // [{service_id, name, start, end}] with each service starting when the previous one ends.
  function schedule(services, time) {
    let m = toMin(time);
    return services.map((x) => {
      const item = { service_id: x.id, name: x.name, price: x.price, duration_min: x.duration_min, start: fromMin(m), end: fromMin(m + x.duration_min) };
      m += x.duration_min;
      return item;
    });
  }

  const overlaps = (a, date, time, durationMin) => a.date === date
    && toMin(a.time) < toMin(time) + durationMin && toMin(time) < toMin(a.time) + a.duration_min;

  // Second line of defense next to the slot sets: no two live bookings for one
  // staff member may overlap, whatever the slot data says.
  function staffConflict(staffId, date, time, durationMin, exceptCode) {
    return [...appointments.values()].find((a) => a.status === 'booked' && a.confirmation_code !== exceptCode
      && a.stylist_id === staffId && overlaps(a, date, time, durationMin)) || null;
  }

  // One person cannot sit in two chairs at once. Different people on the same
  // phone (a parent and a child) are told apart by for_person.
  const personKey = (p) => norm(p || 'caller');
  function personConflict(phone, forPerson, date, time, durationMin, exceptCode) {
    return [...appointments.values()].find((a) => a.status === 'booked' && a.confirmation_code !== exceptCode
      && a.customer_phone === phone && personKey(a.for_person) === personKey(forPerson) && overlaps(a, date, time, durationMin)) || null;
  }

  function book({ businessId, serviceId, serviceIds, staffId, date, time, customerName, customerPhone, forPerson }) {
    const b = getBusiness(businessId);
    if (!b) return { ok: false, error: 'UNKNOWN_BUSINESS' };
    const plan = planServices(b, serviceIds && serviceIds.length ? serviceIds : [serviceId]);
    if (plan.error) return plan.error;
    const st = getStaff(b, staffId);
    if (!st) return { ok: false, error: 'UNKNOWN_STYLIST' };
    const missing = plan.services.find((x) => !st.services.includes(x.id));
    if (missing) return { ok: false, error: 'STYLIST_DOES_NOT_OFFER_SERVICE', message: `${st.name} does not do ${missing.name}.` };
    const bad = validateWhen(date, time);
    if (bad) return bad;
    const phone = normPhone(customerPhone);
    if (!phone) return { ok: false, error: 'BAD_PHONE', message: 'Need a 10 digit callback number.' };
    if (!customerName || !String(customerName).trim()) return { ok: false, error: 'MISSING_NAME' };
    const ids = plan.services.map((x) => x.id);
    const clash = staffConflict(st.id, date, time, plan.totalMin);
    if (clash) {
      return { ok: false, error: 'SLOT_TAKEN', message: `${st.name} already has a booking then. One stylist cannot do two services at the same time.`, alternatives: alternatives(b, ids, plan.totalMin, date, time, st.id) };
    }
    const mine = personConflict(phone, forPerson, date, time, plan.totalMin);
    if (mine) {
      return { ok: false, error: 'CALLER_OVERLAP', message: `This overlaps ${mine.service_name} at ${spoken(mine.time)} that was just booked for the same person. Book the next service right after it ends, or pass for_person if it is for someone else.`, existing: describe(mine) };
    }
    if (!takeSlots(st.id, date, time, plan.totalMin)) {
      return { ok: false, error: 'SLOT_TAKEN', message: 'That time was just taken or is not open.', alternatives: alternatives(b, ids, plan.totalMin, date, time, st.id) };
    }
    const code = `BK${++seq}`;
    const items = schedule(plan.services, time);
    const appt = {
      confirmation_code: code, business_id: b.id, business_name: b.name,
      service_id: ids[0], service_ids: ids, service_name: plan.services.map((x) => x.name).join(' then '), services: items,
      price: plan.services.reduce((n, x) => n + x.price, 0), duration_min: plan.totalMin, end_time: fromMin(toMin(time) + plan.totalMin),
      stylist_id: st.id, stylist_name: st.name, date, time,
      customer_name: String(customerName).trim(), customer_phone: phone, for_person: forPerson ? String(forPerson).trim() : null, status: 'booked',
    };
    appointments.set(code, appt);
    return { ok: true, appointment: describe(appt) };
  }

  function alternatives(b, serviceIds, totalMin, date, time, preferStaffId, limit = 4) {
    const out = [];
    const staffList = [...b.staff.filter((s) => s.id === preferStaffId), ...b.staff.filter((s) => s.id !== preferStaffId)]
      .filter((s) => serviceIds.every((id) => s.services.includes(id)));
    for (let i = 0; i < 7 && out.length < limit; i++) {
      const d = addDays(date, i);
      if (d > windowEnd()) break;
      const opts = [];
      for (const s of staffList) for (const t of startTimes(s.id, d, totalMin)) opts.push({ s, t });
      const target = i === 0 && time ? toMin(time) : 0;
      opts.sort((x, y) => Math.abs(toMin(x.t) - target) - Math.abs(toMin(y.t) - target));
      for (const { s, t } of opts) {
        if (out.length >= limit) break;
        out.push({ stylist_id: s.id, stylist_name: s.name, date: d, time: t, spoken: `${spokenDate(d)} at ${spoken(t)} with ${s.name}` });
      }
    }
    return out;
  }

  function cancel(code) {
    const a = appointments.get(codeKey(code));
    if (!a || a.status !== 'booked') return { ok: false, error: 'NOT_FOUND' };
    releaseSlots(a.stylist_id, a.date, a.time, a.duration_min);
    a.status = 'cancelled';
    return { ok: true, appointment: describe(a) };
  }

  function reschedule(code, { date, time, staffId }) {
    const a = appointments.get(codeKey(code));
    if (!a || a.status !== 'booked') return { ok: false, error: 'NOT_FOUND' };
    const b = getBusiness(a.business_id);
    const st = staffId ? getStaff(b, staffId) : getStaff(b, a.stylist_id);
    if (!st) return { ok: false, error: 'UNKNOWN_STYLIST' };
    if (!a.service_ids.every((id) => st.services.includes(id))) return { ok: false, error: 'STYLIST_DOES_NOT_OFFER_SERVICE' };
    const bad = validateWhen(date, time);
    if (bad) return bad;
    if (staffConflict(st.id, date, time, a.duration_min, a.confirmation_code)) {
      return { ok: false, error: 'SLOT_TAKEN', alternatives: alternatives(b, a.service_ids, a.duration_min, date, time, st.id) };
    }
    if (personConflict(a.customer_phone, a.for_person, date, time, a.duration_min, a.confirmation_code)) {
      return { ok: false, error: 'CALLER_OVERLAP', message: 'That overlaps another booking for the same person.' };
    }
    // Free the old slot first so moving within an overlapping window works, then restore on failure.
    releaseSlots(a.stylist_id, a.date, a.time, a.duration_min);
    if (!takeSlots(st.id, date, time, a.duration_min)) {
      takeSlots(a.stylist_id, a.date, a.time, a.duration_min);
      return { ok: false, error: 'SLOT_TAKEN', alternatives: alternatives(b, a.service_ids, a.duration_min, date, time, st.id) };
    }
    const services = a.service_ids.map((id) => b.services.find((x) => x.id === id));
    Object.assign(a, { date, time, stylist_id: st.id, stylist_name: st.name, services: schedule(services, time), end_time: fromMin(toMin(time) + a.duration_min) });
    return { ok: true, appointment: describe(a) };
  }

  // A booking matches a name when the first names agree (case and accents
  // ignored), or the full names do. Phone plus name, never phone alone.
  const nameKey = (x) => norm(String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  function sameName(onFile, said) {
    const a = nameKey(onFile); const b = nameKey(said);
    if (!a || !b) return false;
    return a === b || a.split(' ')[0] === b.split(' ')[0];
  }
  const codeKey = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  function findByCode(code) {
    const a = appointments.get(codeKey(code));
    if (!a || a.status !== 'booked') return { ok: false, error: 'NOT_FOUND' };
    const d = describe(a);
    delete d.customer_phone; // the code is enough to manage the booking, not to learn the number
    return { ok: true, appointments: [d] };
  }

  function findAppointments(phone, businessId, name) {
    const p = normPhone(phone);
    if (!p) return { ok: false, error: 'BAD_PHONE' };
    const list = [...appointments.values()].filter((a) => a.customer_phone === p && a.status === 'booked'
      && (!businessId || a.business_id === businessId) && (name === undefined || sameName(a.customer_name, name)));
    return { ok: true, appointments: list.map(describe) };
  }

  return {
    data, businesses, now, getBusiness, getStaff, matchService, isOpenNow, nextOpening, hoursToday,
    startTimes, validateWhen, alternatives, planServices, schedule, book, cancel, reschedule, findAppointments, findByCode, windowEnd,
    messages, handoffs, appointments, normPhone,
    // Demo helper: simulate another caller grabbing a slot.
    takeSlotForDemo: (staffId, date, time, durationMin = 30) => takeSlots(staffId, date, time, durationMin),
  };
}

module.exports = { createStore, loadMockData, normPhone, toEnglishTerms };
