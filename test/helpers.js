const { generate } = require('../data/generate-mock');
const { createStore } = require('../src/store');
const { createToolHandlers } = require('../src/tools');

// Friday Oct 23 2026, 10:00 AM Pacific (17:00 UTC).
const FRI_10AM = new Date('2026-10-23T17:00:00Z');

function setup(now = FRI_10AM, businessId = 'fade-district') {
  const clock = () => now;
  const store = createStore(generate('2026-10-23'), clock);
  const tools = createToolHandlers(store, { defaultBusinessId: businessId });
  return { store, tools, clock };
}

// First open start for a service at a business on a date (any stylist).
function firstOpen(store, businessId, serviceId, date) {
  const b = store.getBusiness(businessId);
  const svc = b.services.find((s) => s.id === serviceId);
  for (const st of b.staff.filter((s) => s.services.includes(serviceId))) {
    const t = store.startTimes(st.id, date, svc.duration_min)[0];
    if (t) return { stylist_id: st.id, time: t };
  }
  return null;
}

module.exports = { setup, firstOpen, FRI_10AM };
