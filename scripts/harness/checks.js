// Assertions over a recorded call. Each returns { name, pass, detail }.
const { saidPhone } = require('../../src/readback');

const said = (rec) => rec.transcript.filter((x) => x.role === 'assistant');
const allSaid = (rec) => said(rec).map((x) => x.content).join(' ');
const short = (s, n = 160) => (s.length > n ? `${s.slice(0, n)}...` : s);
const argsOf = (c) => (c && typeof c.args === 'object' && c.args) || {};
const match = (c, pred) => !pred || (typeof pred === 'function' ? pred(argsOf(c), c) : Object.entries(pred).every(([k, v]) => JSON.stringify(argsOf(c)[k]) === JSON.stringify(v)));

const SPANISH = /\b(usted|gracias|para|cita|quiere|puedo|ayudar|mañana|tarde|hora|dólares|está|con|qué|el|la|los|las|de|por|favor|sí|corte|servicio)\b/gi;
const ENGLISH = /\b(the|you|your|and|for|with|what|would|like|can|help|book|time|thanks|is|are|at)\b/gi;
function langOf(text) {
  const han = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (han >= 2) return 'zh';
  const es = (text.match(SPANISH) || []).length + (/[¿¡ñáéíóú]/i.test(text) ? 2 : 0);
  const en = (text.match(ENGLISH) || []).length;
  if (es === 0 && en === 0) return 'unknown';
  return es > en ? 'es' : 'en';
}

const C = {
  called: (name, pred, label) => (rec) => {
    const hit = rec.tools.find((c) => c.name === name && match(c, pred));
    return { name: label || `called ${name}${pred && typeof pred !== 'function' ? ` ${JSON.stringify(pred)}` : ''}`, pass: !!hit, detail: hit ? JSON.stringify(hit.args) : `calls: ${rec.tools.map((c) => c.name).join(', ') || 'none'}` };
  },
  notCalled: (name, pred, label) => (rec) => {
    const hit = rec.tools.find((c) => c.name === name && match(c, pred));
    return { name: label || `did not call ${name}`, pass: !hit, detail: hit ? JSON.stringify(hit.args) : '' };
  },
  calledOk: (name, pred, label) => (rec) => {
    const hit = rec.tools.find((c) => c.name === name && c.result && c.result.ok && match(c, pred));
    return { name: label || `${name} succeeded`, pass: !!hit, detail: hit ? JSON.stringify(hit.args) : rec.tools.filter((c) => c.name === name).map((c) => c.result && c.result.error).join(',') || 'never called' };
  },
  said: (re, label) => (rec) => {
    const hit = said(rec).find((x) => re.test(x.content));
    return { name: label || `said ${re}`, pass: !!hit, detail: hit ? short(hit.content) : short(allSaid(rec), 300) };
  },
  notSaid: (re, label) => (rec) => {
    const hit = said(rec).find((x) => re.test(x.content));
    return { name: label || `never said ${re}`, pass: !hit, detail: hit ? short(hit.content) : '' };
  },
  // The phone was read back by the agent, and the caller answered, before every successful write with that phone.
  readBackBeforeWrites: () => (rec) => {
    const writes = rec.tools.filter((c) => ['book_appointment', 'take_message'].includes(c.name) && c.result && c.result.ok);
    if (!writes.length) return { name: 'phone read back before each booking or message', pass: false, detail: 'no successful write' };
    for (const w of writes) {
      const phone = String(argsOf(w).customer_phone || argsOf(w).callback_phone || '').replace(/\D/g, '').slice(-10);
      const readIdx = rec.transcript.findIndex((x) => x.role === 'assistant' && x.t < w.t && saidPhone(x.content, phone));
      const answered = readIdx >= 0 && rec.transcript.some((x, i) => i > readIdx && x.role === 'user' && x.t < w.t);
      if (!answered) return { name: 'phone read back before each booking or message', pass: false, detail: `${w.name} ${phone} without a confirmed read back` };
    }
    return { name: 'phone read back before each booking or message', pass: true, detail: `${writes.length} write(s)` };
  },
  // Every assistant line from the nth caller turn (0 based) up to the next listed switch is in `lang`.
  languageAfterTurn: (turnIdx, lang, untilTurn) => (rec) => {
    const from = rec.injected[turnIdx] ? rec.injected[turnIdx].t : Infinity;
    const to = untilTurn !== undefined && rec.injected[untilTurn] ? rec.injected[untilTurn].t : Infinity;
    const lines = said(rec).filter((x) => x.t > from && x.t < to);
    const bad = lines.filter((x) => langOf(x.content) !== lang && langOf(x.content) !== 'unknown');
    return { name: `replies in ${lang} after caller turn ${turnIdx + 1}${untilTurn !== undefined ? ` until turn ${untilTurn + 1}` : ''}`, pass: lines.length > 0 && bad.length === 0, detail: bad.length ? short(bad.map((x) => x.content).join(' | ')) : `${lines.length} lines` };
  },
  voice: (lang) => (rec) => {
    const hit = rec.languages.find((l) => l.language === lang && l.ok);
    return { name: `voice switched to ${lang}`, pass: !!hit, detail: JSON.stringify(rec.languages.map((l) => `${l.language}:${l.ok}`)) };
  },
  // Spanish formal address: no tú forms in any Spanish line.
  usted: () => (rec) => {
    const TU = /\b(tú|tu|tus|te|ti|contigo|quieres|puedes|tienes|prefieres|deseas|necesitas|estás|eres|ayudarte|reservarte|llamarte|confirmarte|dime|dame|avísame|perfecto, \w+, he reservado tu)\b/i;
    const lines = said(rec).filter((x) => langOf(x.content) === 'es');
    const bad = lines.filter((x) => TU.test(x.content));
    return { name: 'Spanish uses usted (no tú forms)', pass: lines.length > 0 && !bad.length, detail: bad.length ? short(bad.map((x) => x.content).join(' | ')) : `${lines.length} Spanish lines` };
  },
  store: (label, fn) => (rec) => {
    let r; try { r = fn(rec.store, rec); } catch (e) { r = `threw ${e.message}`; }
    return { name: label, pass: r === true, detail: r === true ? '' : String(r) };
  },
  ended: () => (rec) => ({ name: 'call ended by agent', pass: !!rec.endedByAgent || rec.tools.some((c) => c.name === 'end_call'), detail: '' }),
  custom: (label, fn) => (rec) => { const r = fn(rec); return { name: label, pass: r === true, detail: r === true ? '' : String(r) }; },
};

// Always on.
const GLOBAL = [
  (rec) => {
    const bad = said(rec).filter((x) => /[\u2014\u2013]/.test(x.content));
    return { name: 'no em or en dashes', pass: !bad.length, detail: bad.map((x) => short(x.content)).join(' | ') };
  },
  (rec) => ({ name: 'no Deepgram errors', pass: !rec.errors.length, detail: rec.errors.map((e) => e.description || e.code).join('; ') }),
  (rec) => {
    const bad = rec.tools.filter((c) => c.result && ['INTERNAL_ERROR', 'BAD_ARGUMENTS', 'UNKNOWN_FUNCTION'].includes(c.result.error));
    return { name: 'no broken tool calls', pass: !bad.length, detail: bad.map((c) => `${c.name}:${c.result.error}`).join(', ') };
  },
  (rec) => {
    const bad = said(rec).filter((x) => /\b(fd|gg|ob|ll|ss)-[a-z]+\b|[{}]|\bservice_id\b|\bstylist_id\b/.test(x.content));
    return { name: 'no internal ids or JSON spoken', pass: !bad.length, detail: bad.map((x) => short(x.content)).join(' | ') };
  },
  (rec) => ({ name: 'agent answered every turn', pass: !rec.notes.some((n) => /no clean end|never went live|runner error/.test(n)), detail: rec.notes.join('; ') }),
];

function grade(rec, checks) {
  const results = [...checks, ...GLOBAL].map((f) => { try { return f(rec); } catch (e) { return { name: f.name || 'check', pass: false, detail: `threw ${e.message}` }; } });
  return { pass: results.every((r) => r.pass), results };
}

module.exports = { C, grade, langOf, said };
