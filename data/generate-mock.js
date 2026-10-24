// Generates data/mock.json: fictional Bay Area beauty businesses plus open
// 30-minute slot starts for each staff member for the next 7 days.
// Run `npm run seed` to refresh. The server also regenerates in memory on boot
// if the file's slots are stale.
const fs = require('fs');
const path = require('path');
const { localParts, addDays, weekdayOf, toMin, fromMin } = require('../src/time');

const SLOT_MIN = 30;
const DAYS = 7;

const neighborhoods = [
  { name: 'Mission District', aliases: ['mission', 'the mission'], city: 'San Francisco', zip: '94110', lat: 37.7599, lng: -122.4148 },
  { name: 'Hayes Valley', aliases: ['hayes'], city: 'San Francisco', zip: '94102', lat: 37.7765, lng: -122.4241 },
  { name: 'SoMa', aliases: ['south of market', 'soma'], city: 'San Francisco', zip: '94103', lat: 37.7726, lng: -122.4099 },
  { name: 'Noe Valley', aliases: ['noe'], city: 'San Francisco', zip: '94114', lat: 37.7502, lng: -122.4337 },
  { name: 'Outer Sunset', aliases: ['sunset', 'the sunset', 'inner sunset'], city: 'San Francisco', zip: '94122', lat: 37.7590, lng: -122.4851 },
  { name: 'Temescal', aliases: ['north oakland'], city: 'Oakland', zip: '94609', lat: 37.8331, lng: -122.2636 },
  { name: 'Downtown Oakland', aliases: ['oakland', 'uptown oakland'], city: 'Oakland', zip: '94612', lat: 37.8044, lng: -122.2712 },
  { name: 'Downtown Berkeley', aliases: ['berkeley'], city: 'Berkeley', zip: '94704', lat: 37.8665, lng: -122.2550 },
  { name: 'Downtown Palo Alto', aliases: ['palo alto'], city: 'Palo Alto', zip: '94301', lat: 37.4443, lng: -122.1598 },
];

const businesses = [
  {
    id: 'fade-district', name: 'Fade District Barbers', type: 'barbershop',
    address: '2848 Mission St, San Francisco, CA 94110', neighborhood: 'Mission District', zip: '94110',
    lat: 37.7531, lng: -122.4185, phone: '(415) 555-0142', rating: 4.8, review_count: 312, price_level: 2,
    hours: { mon: null, tue: ['09:00', '19:00'], wed: ['09:00', '19:00'], thu: ['09:00', '20:00'], fri: ['09:00', '20:00'], sat: ['09:00', '18:00'], sun: ['10:00', '16:00'] },
    policies: { cancellation: 'Free cancellation up to 4 hours before. Later cancellations may be charged half the service price.', walk_ins: 'Walk-ins welcome when a chair is free.' },
    services: [
      { id: 'fd-classic', name: 'Classic Haircut', duration_min: 30, price: 40 },
      { id: 'fd-fade', name: 'Skin Fade', duration_min: 30, price: 45 },
      { id: 'fd-beard', name: 'Beard Trim and Line Up', duration_min: 30, price: 25 },
      { id: 'fd-combo', name: 'Haircut and Beard Combo', duration_min: 60, price: 60 },
      { id: 'fd-kids', name: 'Kids Cut (12 and under)', duration_min: 30, price: 30 },
      { id: 'fd-shave', name: 'Hot Towel Shave', duration_min: 30, price: 38 },
    ],
    staff: [
      { id: 'fd-marcus', name: 'Marcus', role: 'Master Barber', services: ['fd-classic', 'fd-fade', 'fd-beard', 'fd-combo', 'fd-shave'], days: ['tue', 'wed', 'thu', 'fri', 'sat'] },
      { id: 'fd-dani', name: 'Dani', role: 'Barber', services: ['fd-classic', 'fd-fade', 'fd-beard', 'fd-combo', 'fd-kids'], days: ['wed', 'thu', 'fri', 'sat', 'sun'] },
      { id: 'fd-luis', name: 'Luis', role: 'Barber', services: ['fd-classic', 'fd-fade', 'fd-kids', 'fd-shave'], days: ['tue', 'thu', 'fri', 'sun'] },
    ],
  },
  {
    id: 'golden-gate-grooming', name: 'Golden Gate Grooming Co.', type: 'barbershop',
    address: '1720 Irving St, San Francisco, CA 94122', neighborhood: 'Outer Sunset', zip: '94122',
    lat: 37.7637, lng: -122.4770, phone: '(415) 555-0177', rating: 4.5, review_count: 188, price_level: 1,
    hours: { mon: ['08:00', '18:00'], tue: ['08:00', '18:00'], wed: ['08:00', '18:00'], thu: ['08:00', '18:00'], fri: ['08:00', '18:00'], sat: ['08:00', '17:00'], sun: null },
    policies: { cancellation: 'Please cancel at least 2 hours ahead.', walk_ins: 'Walk-ins welcome.' },
    services: [
      { id: 'gg-cut', name: 'Haircut', duration_min: 30, price: 30 },
      { id: 'gg-fade', name: 'Fade', duration_min: 30, price: 35 },
      { id: 'gg-shave', name: 'Hot Towel Shave', duration_min: 30, price: 35 },
      { id: 'gg-senior', name: 'Senior Cut (65 and over)', duration_min: 30, price: 22 },
    ],
    staff: [
      { id: 'gg-tony', name: 'Tony', role: 'Owner and Barber', services: ['gg-cut', 'gg-fade', 'gg-shave', 'gg-senior'], days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
      { id: 'gg-kenji', name: 'Kenji', role: 'Barber', services: ['gg-cut', 'gg-fade', 'gg-senior'], days: ['mon', 'wed', 'thu', 'fri', 'sat'] },
    ],
  },
  {
    id: 'oak-and-blade', name: 'Oak and Blade Barbershop', type: 'barbershop',
    address: '4920 Telegraph Ave, Oakland, CA 94609', neighborhood: 'Temescal', zip: '94609',
    lat: 37.8362, lng: -122.2622, phone: '(510) 555-0119', rating: 4.7, review_count: 241, price_level: 3,
    hours: { mon: ['10:00', '20:00'], tue: ['10:00', '20:00'], wed: ['10:00', '20:00'], thu: ['10:00', '20:00'], fri: ['10:00', '20:00'], sat: ['09:00', '17:00'], sun: null },
    policies: { cancellation: 'Free cancellation up to 12 hours before.', walk_ins: 'Appointments only.' },
    services: [
      { id: 'ob-cut', name: 'Signature Cut', duration_min: 60, price: 65 },
      { id: 'ob-fade', name: 'Taper or Fade', duration_min: 30, price: 50 },
      { id: 'ob-beard', name: 'Beard Sculpt', duration_min: 30, price: 35 },
      { id: 'ob-loc', name: 'Loc Retwist', duration_min: 90, price: 95 },
    ],
    staff: [
      { id: 'ob-andre', name: 'Andre', role: 'Master Barber', services: ['ob-cut', 'ob-fade', 'ob-beard', 'ob-loc'], days: ['mon', 'tue', 'wed', 'fri', 'sat'] },
      { id: 'ob-sam', name: 'Sam', role: 'Barber', services: ['ob-cut', 'ob-fade', 'ob-beard'], days: ['tue', 'wed', 'thu', 'fri', 'sat'] },
    ],
  },
  {
    id: 'luxe-lather', name: 'Luxe and Lather Salon', type: 'salon',
    address: '412 Hayes St, San Francisco, CA 94102', neighborhood: 'Hayes Valley', zip: '94102',
    lat: 37.7769, lng: -122.4239, phone: '(415) 555-0163', rating: 4.9, review_count: 527, price_level: 3,
    hours: { mon: null, tue: ['10:00', '19:00'], wed: ['10:00', '19:00'], thu: ['10:00', '20:00'], fri: ['10:00', '20:00'], sat: ['09:00', '18:00'], sun: ['10:00', '17:00'] },
    policies: { cancellation: 'Free cancellation up to 24 hours before. Color services need a 24 hour notice.', walk_ins: 'Appointments recommended.' },
    services: [
      { id: 'll-cut', name: "Women's Haircut and Style", duration_min: 60, price: 85 },
      { id: 'll-mens', name: "Men's Haircut", duration_min: 30, price: 55 },
      { id: 'll-blowout', name: 'Blowout', duration_min: 60, price: 55 },
      { id: 'll-color', name: 'Single Process Color', duration_min: 120, price: 140 },
      { id: 'll-balayage', name: 'Balayage', duration_min: 180, price: 260 },
      { id: 'll-gloss', name: 'Gloss Treatment', duration_min: 30, price: 45 },
    ],
    staff: [
      { id: 'll-priya', name: 'Priya', role: 'Senior Stylist and Colorist', services: ['ll-cut', 'll-blowout', 'll-color', 'll-balayage', 'll-gloss'], days: ['tue', 'wed', 'thu', 'fri', 'sat'] },
      { id: 'll-jordan', name: 'Jordan', role: 'Stylist', services: ['ll-cut', 'll-mens', 'll-blowout', 'll-gloss'], days: ['wed', 'thu', 'fri', 'sat', 'sun'] },
      { id: 'll-elena', name: 'Elena', role: 'Colorist', services: ['ll-color', 'll-balayage', 'll-gloss', 'll-blowout'], days: ['tue', 'thu', 'sat', 'sun'] },
    ],
  },
  {
    id: 'serenity-skin', name: 'Serenity Skin Med Spa', type: 'medspa',
    address: '355 University Ave, Palo Alto, CA 94301', neighborhood: 'Downtown Palo Alto', zip: '94301',
    lat: 37.4467, lng: -122.1611, phone: '(650) 555-0108', rating: 4.6, review_count: 143, price_level: 4,
    hours: { mon: ['09:00', '18:00'], tue: ['09:00', '18:00'], wed: ['09:00', '18:00'], thu: ['09:00', '19:00'], fri: ['09:00', '19:00'], sat: ['10:00', '16:00'], sun: null },
    policies: { cancellation: 'Please give 48 hours notice. Late cancellations may incur a 50 dollar fee.', walk_ins: 'By appointment only.', medical: 'Injectables and laser treatments require a consultation with a licensed provider first.' },
    services: [
      { id: 'ss-hydrafacial', name: 'HydraFacial', duration_min: 60, price: 199 },
      { id: 'ss-consult', name: 'Injectables Consultation', duration_min: 30, price: 0 },
      { id: 'ss-peel', name: 'Chemical Peel', duration_min: 60, price: 150 },
      { id: 'ss-laser', name: 'Laser Hair Removal, Small Area', duration_min: 30, price: 120 },
    ],
    staff: [
      { id: 'ss-alicia', name: 'Alicia Gomez, NP', role: 'Nurse Practitioner', services: ['ss-consult', 'ss-laser', 'ss-peel'], days: ['mon', 'tue', 'thu', 'fri'] },
      { id: 'ss-rachel', name: 'Rachel', role: 'Licensed Esthetician', services: ['ss-hydrafacial', 'ss-peel'], days: ['mon', 'wed', 'thu', 'fri', 'sat'] },
    ],
  },
];

// Small deterministic PRNG so the "already booked" pattern is stable per day.
function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function generate(startDate = localParts().date) {
  const slots = {};
  for (const b of businesses) {
    for (const s of b.staff) {
      slots[s.id] = {};
      for (let i = 0; i < DAYS; i++) {
        const date = addDays(startDate, i);
        const wd = weekdayOf(date);
        const hours = b.hours[wd];
        if (!hours || !s.days.includes(wd)) continue;
        const rand = rng(`${s.id}:${date}`);
        const open = [];
        // Existing bookings come in blocks of 1 to 4 slots, so longer services
        // (color, balayage) still find room on most days.
        let busy = 0;
        for (let m = toMin(hours[0]); m + SLOT_MIN <= toMin(hours[1]); m += SLOT_MIN) {
          if (busy === 0 && rand() < 0.2) busy = 1 + Math.floor(rand() * 4);
          if (busy > 0) { busy--; continue; }
          open.push(fromMin(m));
        }
        slots[s.id][date] = open;
      }
    }
  }
  return {
    generated_for: startDate,
    timezone: 'America/Los_Angeles',
    slot_minutes: SLOT_MIN,
    note: 'Fictional demo data. slots[staff_id][date] lists OPEN 30 minute start times in local Bay Area time.',
    neighborhoods,
    businesses,
    slots,
  };
}

if (require.main === module) {
  const out = path.join(__dirname, 'mock.json');
  fs.writeFileSync(out, JSON.stringify(generate(), null, 2));
  console.log(`Wrote ${out}`);
}

module.exports = { generate };
