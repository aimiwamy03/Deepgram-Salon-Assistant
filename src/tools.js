// Tool (function) definitions sent to Deepgram in Settings.agent.think.functions,
// plus the handlers our server runs when Deepgram sends a FunctionCallRequest.
// Every handler returns a plain object; the session serializes it as the
// FunctionCallResponse content. Handlers never throw for bad input.
const { addDays, spoken, spokenDate, toMin } = require('./time');

const BIZ = { type: 'string', description: 'Business id, for example "fade-district". Defaults to the business that was called.' };

const definitions = [
  {
    name: 'search_nearby',
    description: 'Find barbershops, salons, or med spas on our network near a neighborhood, city, or ZIP code in the Bay Area. Use when the caller asks for other options nearby.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Neighborhood, city, or 5 digit ZIP, as the caller said it. Example: "Mission", "94609", "Oakland".' },
        business_type: { type: 'string', enum: ['barbershop', 'salon', 'medspa', 'any'], description: 'Kind of business. Default barbershop.' },
        open_now: { type: 'boolean', description: 'Only return places open right now.' },
        max_price_level: { type: 'integer', minimum: 1, maximum: 4, description: '1 is budget, 4 is premium.' },
        min_rating: { type: 'number', description: 'Minimum star rating, 1 to 5.' },
        max_distance_miles: { type: 'number', description: 'Default 10.' },
      },
      required: ['location'],
    },
  },
  {
    name: 'list_services',
    description: 'List services, prices, durations, and which stylists offer each, for a business. Pass service_query to match what the caller asked for.',
    parameters: {
      type: 'object',
      properties: {
        business_id: BIZ,
        service_query: { type: 'string', description: 'What the caller asked for in their words, for example "fade and beard".' },
      },
    },
  },
  {
    name: 'check_availability',
    description: 'Get open appointment times on a date. For more than one service, pass all of them in service_ids: each returned time is a back to back block with one stylist, sized to the total duration. Always call this before offering times. Never invent times.',
    parameters: {
      type: 'object',
      properties: {
        business_id: BIZ,
        service_ids: { type: 'array', items: { type: 'string' }, description: 'Service ids from list_services, in the order they should happen. Use one id for a single service.' },
        service_id: { type: 'string', description: 'Single service id. Same as service_ids with one item.' },
        date: { type: 'string', description: 'Local date, YYYY-MM-DD. Resolve words like "tomorrow" using the current date in your instructions.' },
        stylist: { type: 'string', description: 'Stylist id or first name, if the caller has a preference.' },
        part_of_day: { type: 'string', enum: ['any', 'morning', 'afternoon', 'evening'], description: 'Morning is before 12, afternoon 12 to 5, evening after 5.' },
        around_time: { type: 'string', description: 'Preferred start, 24 hour HH:MM local time. Results are sorted nearest first.' },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Book one appointment block. For several services with one stylist, pass them all in service_ids in one call; they are booked back to back starting at time. Only call after you read the details back and the caller clearly said yes.',
    defer_until_eot: true,
    parameters: {
      type: 'object',
      properties: {
        business_id: BIZ,
        service_ids: { type: 'array', items: { type: 'string' }, description: 'Service ids in order. They run back to back, never at the same time.' },
        service_id: { type: 'string', description: 'Single service id. Same as service_ids with one item.' },
        stylist_id: { type: 'string', description: 'Stylist id from check_availability.' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'Start of the first service, 24 hour HH:MM local time, exactly as returned by check_availability.' },
        customer_name: { type: 'string' },
        customer_phone: { type: 'string', description: 'Callback number, digits only.' },
        for_person: { type: 'string', description: 'Who the service is for if not the caller, for example "Alex\'s son Leo".' },
      },
      required: ['stylist_id', 'date', 'time', 'customer_name', 'customer_phone'],
    },
  },
  {
    name: 'find_appointment',
    description: 'Look up an upcoming appointment before changing or cancelling it. Pass confirmation_code if the caller has it. Otherwise pass both the name and the phone number the booking was made under.',
    parameters: {
      type: 'object',
      properties: {
        confirmation_code: { type: 'string', description: 'Code like BK1001, if the caller has it.' },
        customer_phone: { type: 'string', description: 'Phone number the booking was made with, digits only.' },
        customer_name: { type: 'string', description: 'Name the booking was made under, as the caller says it.' },
        business_id: BIZ,
      },
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Move an existing appointment to a new open time. Read the new time back and get a yes first.',
    defer_until_eot: true,
    parameters: {
      type: 'object',
      properties: {
        confirmation_code: { type: 'string' },
        new_date: { type: 'string', description: 'YYYY-MM-DD' },
        new_time: { type: 'string', description: '24 hour HH:MM' },
        stylist_id: { type: 'string', description: 'Optional new stylist.' },
      },
      required: ['confirmation_code', 'new_date', 'new_time'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an existing appointment after the caller confirms. Mention the cancellation policy first.',
    defer_until_eot: true,
    parameters: {
      type: 'object',
      properties: { confirmation_code: { type: 'string' } },
      required: ['confirmation_code'],
    },
  },
  {
    name: 'transfer_to_human',
    description: 'Hand the call to a staff member. Use when the caller asks for a person, is upset, has a medical or complaint question, or you are stuck.',
    defer_until_eot: true,
    parameters: {
      type: 'object',
      properties: {
        business_id: BIZ,
        reason: { type: 'string', description: 'One short sentence for the staff member.' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'take_message',
    description: 'Leave a message for the team when no one can take the call. Collect name, callback number, and the message first.',
    defer_until_eot: true,
    parameters: {
      type: 'object',
      properties: {
        business_id: BIZ,
        caller_name: { type: 'string' },
        callback_phone: { type: 'string' },
        message: { type: 'string' },
        urgent: { type: 'boolean' },
      },
      required: ['caller_name', 'callback_phone', 'message'],
    },
  },
  {
    name: 'set_language',
    description: 'Switch your speaking voice to the caller\'s language. Call this first, before you reply, whenever the caller speaks a different language than your last reply. Then reply in that language.',
    parameters: {
      type: 'object',
      properties: { language: { type: 'string', enum: ['en', 'es', 'zh'], description: 'en English, es Spanish, zh Mandarin Chinese.' } },
      required: ['language'],
    },
  },
  {
    name: 'end_call',
    description: 'End the call after you have said goodbye and the caller has nothing else.',
    defer_until_eot: true,
    parameters: { type: 'object', properties: {} },
  },
];

function haversineMiles(a, b) {
  const R = 3958.8;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const PRICE_WORDS = { 1: 'budget friendly', 2: 'moderate', 3: 'upscale', 4: 'premium' };

function createToolHandlers(store, { defaultBusinessId } = {}) {
  const biz = (id) => store.getBusiness(id || defaultBusinessId);
  const unknownBiz = (id) => ({ ok: false, error: 'UNKNOWN_BUSINESS', message: `No business with id ${id}.` });

  function resolveLocation(q) {
    const s = String(q || '').toLowerCase().trim();
    const zip = s.match(/\b\d{5}\b/);
    const hoods = store.data.neighborhoods;
    if (zip) return hoods.find((n) => n.zip === zip[0]) || null;
    return hoods.find((n) => n.name.toLowerCase() === s)
      || hoods.find((n) => n.aliases.some((a) => s.includes(a)))
      || hoods.find((n) => s.includes(n.name.toLowerCase()) || s.includes(n.city.toLowerCase()))
      || null;
  }

  const handlers = {
    search_nearby(args) {
      const where = resolveLocation(args.location);
      if (!where) {
        return { ok: false, error: 'UNKNOWN_LOCATION', message: 'Could not place that location. Ask for a neighborhood or ZIP code.', known_areas: store.data.neighborhoods.map((n) => `${n.name} (${n.zip})`) };
      }
      const type = args.business_type || 'barbershop';
      const maxMi = args.max_distance_miles || 10;
      const results = store.businesses
        .filter((b) => type === 'any' || b.type === type)
        .map((b) => ({ b, miles: haversineMiles(where, b) }))
        .filter(({ b, miles }) => miles <= maxMi
          && (!args.open_now || store.isOpenNow(b))
          && (!args.max_price_level || b.price_level <= args.max_price_level)
          && (!args.min_rating || b.rating >= args.min_rating))
        .sort((x, y) => x.miles - y.miles)
        .slice(0, 3)
        .map(({ b, miles }) => {
          const open = store.isOpenNow(b);
          const h = store.hoursToday(b, store.now().date);
          const next = open ? null : store.nextOpening(b);
          return {
            business_id: b.id, name: b.name, type: b.type, neighborhood: b.neighborhood, address: b.address, phone: b.phone,
            distance_miles: Math.round(miles * 10) / 10, rating: b.rating, review_count: b.review_count,
            price_level: b.price_level, price: PRICE_WORDS[b.price_level],
            starting_price: Math.min(...b.services.filter((s) => s.price > 0).map((s) => s.price)),
            open_now: open,
            hours_today: h ? `${spoken(h[0])} to ${spoken(h[1])}` : 'closed today',
            next_open: next && next.spoken,
          };
        });
      const out = { ok: true, searched_near: `${where.name}, ${where.city} ${where.zip}`, results };
      if (!results.length) {
        // Tell the agent what it would find without the filters, so it can offer a concrete option.
        const nearest = store.businesses.filter((b) => type === 'any' || b.type === type)
          .map((b) => ({ b, miles: haversineMiles(where, b) })).sort((x, y) => x.miles - y.miles)[0];
        out.note = 'Nothing matched every filter. Offer the closest option below or ask which filter to drop.';
        if (nearest) {
          out.closest_without_filters = { business_id: nearest.b.id, name: nearest.b.name, neighborhood: nearest.b.neighborhood, distance_miles: Math.round(nearest.miles * 10) / 10, rating: nearest.b.rating, price: PRICE_WORDS[nearest.b.price_level], open_now: store.isOpenNow(nearest.b) };
        }
      }
      return out;
    },

    list_services(args) {
      const b = biz(args.business_id);
      if (!b) return unknownBiz(args.business_id);
      const { match, suggestions } = store.matchService(b, args.service_query);
      const fmt = (s) => ({
        service_id: s.id, name: s.name, price: s.price === 0 ? 'free' : `$${s.price}`, duration_min: s.duration_min,
        stylists: b.staff.filter((st) => st.services.includes(s.id)).map((st) => ({ stylist_id: st.id, name: st.name, role: st.role })),
      });
      if (args.service_query && match) return { ok: true, business: b.name, match: fmt(match) };
      if (args.service_query && !match) {
        return { ok: true, business: b.name, match: null, message: 'No exact match. Tell the caller what is offered and ask which one they want. Do not book a service that is not on this list.', closest: suggestions.slice(0, 4).map(fmt) };
      }
      return { ok: true, business: b.name, services: b.services.map(fmt), policies: b.policies };
    },

    check_availability(args) {
      const b = biz(args.business_id);
      if (!b) return unknownBiz(args.business_id);
      const wanted = (Array.isArray(args.service_ids) && args.service_ids.length ? args.service_ids : [args.service_id]).filter(Boolean);
      const ids = wanted.map((q) => (b.services.find((s) => s.id === q) || store.matchService(b, q).match || {}).id);
      if (!ids.length || ids.some((x) => !x)) return { ok: false, error: 'UNKNOWN_SERVICE', message: 'Call list_services first and use service ids from it.' };
      const plan = store.planServices(b, ids);
      if (plan.error) return plan.error;
      const bad = store.validateWhen(args.date);
      if (bad) return bad;
      const names = plan.services.map((s) => s.name);
      let staff = b.staff.filter((s) => ids.every((id) => s.services.includes(id)));
      if (!staff.length) {
        return {
          ok: false, error: 'NO_SINGLE_STYLIST', message: `No one stylist does all of ${names.join(' and ')}. Check each service separately and book them at times that do not overlap.`,
          stylists_per_service: plan.services.map((s) => ({ service_id: s.id, name: s.name, stylists: b.staff.filter((st) => st.services.includes(s.id)).map((st) => st.name) })),
        };
      }
      if (args.stylist) {
        const st = store.getStaff(b, args.stylist);
        if (!st) return { ok: false, error: 'UNKNOWN_STYLIST', message: `No stylist named ${args.stylist}.`, stylists: staff.map((s) => s.name) };
        if (!staff.includes(st)) return { ok: false, error: 'STYLIST_DOES_NOT_OFFER_SERVICE', message: `${st.name} does not do all of ${names.join(' and ')}.`, stylists_who_do: staff.map((s) => s.name) };
        staff = [st];
      }
      const inPart = (t) => {
        const m = toMin(t);
        switch (args.part_of_day) {
          case 'morning': return m < 720;
          case 'afternoon': return m >= 720 && m < 1020;
          case 'evening': return m >= 1020;
          default: return true;
        }
      };
      const target = args.around_time && /^\d{2}:\d{2}$/.test(args.around_time) ? toMin(args.around_time) : null;
      const collect = (date) => {
        const opts = [];
        for (const st of staff) for (const t of store.startTimes(st.id, date, plan.totalMin)) if (inPart(t)) opts.push({ st, t });
        opts.sort((x, y) => (target === null ? toMin(x.t) - toMin(y.t) : Math.abs(toMin(x.t) - target) - Math.abs(toMin(y.t) - target)));
        return opts.slice(0, 4).map(({ st, t }) => {
          const sched = store.schedule(plan.services, t);
          const slot = { stylist_id: st.id, stylist_name: st.name, date, time: t, end_time: sched[sched.length - 1].end };
          if (sched.length > 1) {
            slot.schedule = sched.map((x) => ({ service_id: x.service_id, name: x.name, start: x.start }));
            slot.spoken = `${sched.map((x) => `${x.name} at ${spoken(x.start)}`).join(', then ')}, with ${st.name}`;
          } else slot.spoken = `${spoken(t)} with ${st.name}`;
          return slot;
        });
      };
      const hours = store.hoursToday(b, args.date);
      const slots = collect(args.date);
      const result = {
        ok: true, business: b.name,
        services: plan.services.map((s) => ({ service_id: s.id, name: s.name, price: s.price, duration_min: s.duration_min })),
        total_duration_min: plan.totalMin, total_price: plan.services.reduce((n, s) => n + s.price, 0),
        date: args.date, spoken_date: spokenDate(args.date), open_that_day: !!hours, slots,
      };
      if (plan.services.length === 1) result.service = result.services[0];
      else result.note = 'Each slot is one back to back block with one stylist. The services happen one after another, never at the same time. Read back each service with its own start time.';
      if (!slots.length) {
        // Look ahead for the next days that do have something.
        for (let i = 1; i <= 6; i++) {
          const d = addDays(args.date, i);
          if (d > store.windowEnd()) break;
          const more = collect(d);
          if (more.length) { result.next_available = { date: d, spoken_date: spokenDate(d), slots: more.slice(0, 3) }; break; }
        }
        result.message = hours ? 'No openings matching that request on this date.' : `${b.name} is closed that day.`;
      }
      return result;
    },

    book_appointment(args) {
      const b = biz(args.business_id);
      if (!b) return unknownBiz(args.business_id);
      const r = store.book({
        businessId: b.id, serviceId: args.service_id, serviceIds: Array.isArray(args.service_ids) ? args.service_ids : null,
        staffId: args.stylist_id, date: args.date, time: args.time,
        customerName: args.customer_name, customerPhone: args.customer_phone, forPerson: args.for_person,
      });
      if (r.ok) r.say = `Booked. Give the caller confirmation code ${r.appointment.confirmation_code.split('').join(' ')}. This demo sends no text or email, so do not promise one.`;
      if (r.error === 'SLOT_TAKEN') r.say = 'Apologize briefly, that time is not available. Offer the alternatives.';
      return r;
    },

    find_appointment(args) {
      if (String(args.confirmation_code || '').trim()) {
        const r = store.findByCode(args.confirmation_code);
        if (!r.ok) r.say = 'No upcoming booking has that code. Ask them to spell it again, or look it up with their name and phone number.';
        return r;
      }
      const b = args.business_id ? biz(args.business_id) : null;
      if (!String(args.customer_phone || '').trim()) return { ok: false, error: 'NEED_CODE_OR_PHONE', message: 'Ask for the confirmation code, or for the name and phone number the booking is under.' };
      if (!String(args.customer_name || '').trim()) return { ok: false, error: 'NEED_NAME', message: 'Ask for the name the booking is under, then look it up with the name and number together.' };
      const r = store.findAppointments(args.customer_phone, b && b.id, args.customer_name);
      if (r.ok && !r.appointments.length) {
        r.say = 'No upcoming booking matches that name and number together. Do not say whether the number has other bookings. Ask them to check the details or give the confirmation code.';
      }
      return r;
    },

    reschedule_appointment(args) {
      return store.reschedule(args.confirmation_code, { date: args.new_date, time: args.new_time, staffId: args.stylist_id });
    },

    cancel_appointment(args) {
      return store.cancel(args.confirmation_code);
    },

    transfer_to_human(args) {
      const b = biz(args.business_id);
      if (!b) return unknownBiz(args.business_id);
      const open = store.isOpenNow(b);
      const record = { business_id: b.id, reason: args.reason || '', at: new Date().toISOString(), status: open ? 'transferring' : 'unavailable' };
      store.handoffs.push(record);
      if (open) {
        return { ok: true, status: 'transferring', say: 'If the caller described urgent symptoms and you have not yet said so, first tell them to hang up and call 911 if it is an emergency. Then tell the caller in one short sentence that you are connecting them to the front desk. Say nothing after that; the call is handed over.', demo_note: 'Prototype: no real transfer happens. With Twilio this becomes a warm transfer to the shop line.' };
      }
      const next = store.nextOpening(b);
      return { ok: true, status: 'unavailable', reason: 'closed', next_open: next && next.spoken, say: 'No one is in right now. Offer to take a message so the team can call back.' };
    },

    take_message(args) {
      const b = biz(args.business_id);
      if (!b) return unknownBiz(args.business_id);
      const phone = store.normPhone(args.callback_phone);
      if (!phone) return { ok: false, error: 'BAD_PHONE', message: 'Need a 10 digit callback number.' };
      if (!args.message) return { ok: false, error: 'MISSING_MESSAGE' };
      const m = { id: `MSG${store.messages.length + 1}`, business_id: b.id, caller_name: args.caller_name, callback_phone: phone, message: args.message, urgent: !!args.urgent, at: new Date().toISOString() };
      store.messages.push(m);
      return { ok: true, message_id: m.id, say: 'Tell the caller the team will call them back, usually within one business day.' };
    },

    end_call() {
      return { ok: true, status: 'ending' };
    },

    // The voice switch itself (UpdateSpeak) happens in the call session, which
    // owns the Deepgram socket. This handler only validates the argument.
    set_language(args) {
      const l = String(args.language || '').toLowerCase().split('-')[0];
      if (!['en', 'es', 'zh'].includes(l)) return { ok: false, error: 'UNSUPPORTED_LANGUAGE', message: 'Supported: en, es, zh.' };
      return { ok: true, language: l };
    },
  };

  function run(name, rawArgs) {
    const fn = handlers[name];
    if (!fn) return { ok: false, error: 'UNKNOWN_FUNCTION', message: `No tool named ${name}.` };
    let args = rawArgs;
    if (typeof rawArgs === 'string') {
      try { args = rawArgs.trim() ? JSON.parse(rawArgs) : {}; } catch { return { ok: false, error: 'BAD_ARGUMENTS', message: 'Arguments were not valid JSON.' }; }
    }
    try {
      return fn(args || {});
    } catch (e) {
      return { ok: false, error: 'INTERNAL_ERROR', message: e.message };
    }
  }

  return { handlers, run };
}

module.exports = { definitions, createToolHandlers, haversineMiles };
