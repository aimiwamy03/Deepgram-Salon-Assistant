// End to end without a real key: browser client -> our server -> fake Deepgram.
const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { makeValidators } = require('../scripts/validate-settings');
const { createServer } = require('../server');
const { FRI_10AM } = require('./helpers');

const v = makeValidators();
const FAKE_KEY = 'test-key-123';

function fakeDeepgram() {
  const wss = new WebSocket.Server({ port: 0 });
  const state = { auth: null, settings: null, received: [], audioBytes: 0, conn: null };
  wss.on('connection', (ws, req) => {
    state.auth = req.headers.authorization;
    state.conn = ws;
    ws.send(JSON.stringify({ type: 'Welcome', request_id: 'req-1' }));
    ws.on('message', (data, isBinary) => {
      if (isBinary) { state.audioBytes += data.length; return; }
      const msg = JSON.parse(data);
      if (msg.type === 'Settings') {
        state.settings = msg;
        ws.send(JSON.stringify({ type: 'SettingsApplied' }));
      } else state.received.push(msg);
    });
  });
  return new Promise((r) => wss.on('listening', () => r({ wss, state, url: `ws://127.0.0.1:${wss.address().port}` })));
}

const waitFor = async (fn, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { const x = fn(); if (x) return x; await new Promise((r) => setTimeout(r, 10)); }
  throw new Error('timed out');
};

async function startCall(opts = {}) {
  const dg = await fakeDeepgram();
  const app = createServer({ apiKey: FAKE_KEY, agentUrl: dg.url, clock: () => FRI_10AM, ...opts });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const port = app.server.address().port;
  const browser = new WebSocket(`ws://127.0.0.1:${port}/call?business=fade-district`);
  const events = []; const audio = []; const raw = [];
  browser.on('message', (d, isBinary) => { if (isBinary) audio.push(d); else { raw.push(String(d)); events.push(JSON.parse(d)); } });
  await new Promise((r) => browser.on('open', r));
  await waitFor(() => events.find((e) => e.type === 'status' && e.status === 'live'));
  const stop = async () => { browser.close(); dg.wss.close(); await new Promise((r) => app.server.close(r)); };
  return { dg, app, browser, events, audio, raw, port, stop };
}

test('proxy: auth header, valid Settings, audio both ways, key never reaches browser', async () => {
  const c = await startCall();
  try {
    assert.equal(c.dg.state.auth, `Token ${FAKE_KEY}`);
    assert.ok(v.settings(c.dg.state.settings), JSON.stringify(v.settings.errors));
    assert.ok(c.events.find((e) => e.type === 'Welcome'));
    c.browser.send(Buffer.alloc(1600)); // 50 ms of 16 kHz silence
    await waitFor(() => c.dg.state.audioBytes === 1600);
    c.dg.state.conn.send(Buffer.alloc(4800), { binary: true });
    await waitFor(() => c.audio.length === 1);
    c.dg.state.conn.send(JSON.stringify({ type: 'ConversationText', role: 'assistant', content: 'Hi there' }));
    await waitFor(() => c.events.find((e) => e.type === 'ConversationText'));
    assert.ok(!c.raw.join('').includes(FAKE_KEY));
  } finally { await c.stop(); }
});

// What Deepgram reports when the agent reads the number back and the caller answers.
function readBack(conn, words = 'four one five, five five five, zero one zero zero', reply = 'Yes, that is right.') {
  conn.send(JSON.stringify({ type: 'ConversationText', role: 'assistant', content: `Your number is ${words}, is that right?` }));
  conn.send(JSON.stringify({ type: 'ConversationText', role: 'user', content: reply }));
}

test('proxy: function calls execute server side and double booking is refused', async () => {
  const c = await startCall();
  try {
    const conn = c.dg.state.conn;
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fc_1', name: 'check_availability', arguments: JSON.stringify({ service_id: 'fd-fade', date: '2026-10-24' }), client_side: true }] }));
    const r1 = await waitFor(() => c.dg.state.received.find((m) => m.id === 'fc_1'));
    assert.ok(v.functionCallResponse(r1));
    const slot = JSON.parse(r1.content).slots[0];
    const book = (id, name) => conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id, name: 'book_appointment', client_side: true, arguments: JSON.stringify({ service_id: 'fd-fade', stylist_id: slot.stylist_id, date: slot.date, time: slot.time, customer_name: name, customer_phone: '4155550100' }) }] }));
    readBack(conn);
    book('fc_2', 'Alex');
    const r2 = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'fc_2'))).content);
    book('fc_3', 'Sam');
    const r3 = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'fc_3'))).content);
    assert.equal(r2.ok, true);
    assert.equal(r3.error, 'SLOT_TAKEN');
    // The browser sees the tool log for the UI.
    assert.equal(c.events.filter((e) => e.type === 'tool').length, 3);
    // Server side functions (client_side false) get no response from us.
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fc_srv', name: 'whatever', arguments: '{}', client_side: false }] }));
    // A cancelled id gets no response.
    conn.send(JSON.stringify({ type: 'FunctionCallCancelled', functions: [{ id: 'fc_4', name: 'list_services' }] }));
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fc_4', name: 'list_services', arguments: '{}', client_side: true }] }));
    await new Promise((r) => setTimeout(r, 150));
    assert.ok(!c.dg.state.received.find((m) => m.id === 'fc_srv' || m.id === 'fc_4'));
  } finally { await c.stop(); }
});

test('demo endpoint: another caller takes the offered slot, then booking it fails', async () => {
  const c = await startCall();
  try {
    const conn = c.dg.state.conn;
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'a', name: 'check_availability', arguments: JSON.stringify({ service_id: 'fd-classic', date: '2026-10-24' }), client_side: true }] }));
    await waitFor(() => c.dg.state.received.find((m) => m.id === 'a'));
    const sid = c.events.find((e) => e.type === 'session').session_id;
    const res = await (await fetch(`http://127.0.0.1:${c.port}/api/dev/take-offered-slot?session=${sid}`, { method: 'POST' })).json();
    assert.equal(res.ok, true);
    const s = res.taken;
    readBack(conn);
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'b', name: 'book_appointment', client_side: true, arguments: JSON.stringify({ service_id: 'fd-classic', stylist_id: s.stylist_id, date: s.date, time: s.time, customer_name: 'Alex', customer_phone: '4155550100' }) }] }));
    const r = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'b'))).content);
    assert.equal(r.error, 'SLOT_TAKEN');
  } finally { await c.stop(); }
});

test('silence: checks in once, then says goodbye and ends the call', async () => {
  const c = await startCall({ silenceMs: 80 });
  try {
    const conn = c.dg.state.conn;
    conn.send(JSON.stringify({ type: 'AgentAudioDone' }));
    const first = await waitFor(() => c.dg.state.received.find((m) => m.type === 'InjectAgentMessage'));
    assert.ok(v.injectAgentMessage(first));
    assert.match(first.message, /still there/);
    conn.send(JSON.stringify({ type: 'AgentAudioDone' }));
    await waitFor(() => c.dg.state.received.filter((m) => m.type === 'InjectAgentMessage').length === 2);
    conn.send(JSON.stringify({ type: 'AgentAudioDone' }));
    await waitFor(() => c.events.find((e) => e.type === 'status' && e.status === 'ended'), 3000);
  } finally { await c.stop(); }
});

test('server boot: health, businesses, page, and refusal without a key', async () => {
  const app = createServer({ apiKey: '' });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true, has_key: false });
    assert.equal((await (await fetch(`${base}/api/businesses`)).json()).length, 5);
    const page = await (await fetch(`${base}/`)).text();
    assert.match(page, /Start call/);
    assert.equal((await fetch(`${base}/../server.js`)).status, 404);
    const ws = new WebSocket(`${base.replace('http', 'ws')}/call`);
    const msg = await new Promise((r) => ws.on('message', (d) => r(JSON.parse(d))));
    assert.equal(msg.code, 'NO_KEY');
  } finally { await new Promise((r) => app.server.close(r)); }
});

test('language: set_language sends a schema valid UpdateSpeak and answers only after SpeakUpdated', async () => {
  const lang = require('../src/languages');
  const c = await startCall({ langConfig: lang.config({}) });
  try {
    const conn = c.dg.state.conn;
    assert.equal(c.dg.state.settings.agent.listen.provider.model, 'nova-3');
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fl_1', name: 'set_language', arguments: '{"language":"es"}', client_side: true }] }));
    const upd = await waitFor(() => c.dg.state.received.find((m) => m.type === 'UpdateSpeak'));
    assert.ok(v.updateSpeak(upd), JSON.stringify(v.updateSpeak.errors));
    assert.equal(upd.speak.provider.model, 'aura-2-selena-es');
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(!c.dg.state.received.find((m) => m.id === 'fl_1'), 'no FunctionCallResponse before SpeakUpdated');
    conn.send(JSON.stringify({ type: 'SpeakUpdated' }));
    const r = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'fl_1'))).content);
    assert.equal(r.ok, true);
    assert.equal(r.language, 'es');
    assert.ok(c.events.find((e) => e.type === 'language' && e.language === 'es' && e.ok));
    // Same language again: no second UpdateSpeak.
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fl_2', name: 'set_language', arguments: '{"language":"es"}', client_side: true }] }));
    await waitFor(() => c.dg.state.received.find((m) => m.id === 'fl_2'));
    assert.equal(c.dg.state.received.filter((m) => m.type === 'UpdateSpeak').length, 1);
    // Caller speaks Mandarin: early switch from the transcript, to Deepgram managed Cartesia.
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'user', content: '你好，我想预约理发。' }));
    const zh = await waitFor(() => c.dg.state.received.filter((m) => m.type === 'UpdateSpeak')[1]);
    assert.equal(zh.speak.provider.type, 'cartesia');
    assert.equal(zh.speak.provider.language, 'zh');
    conn.send(JSON.stringify({ type: 'SpeakUpdated' }));
    await waitFor(() => c.events.find((e) => e.type === 'language' && e.language === 'zh'));
  } finally { await c.stop(); }
});

test('language: MANDARIN_TTS=off returns NO_VOICE and keeps the voice; a rejected switch rolls back', async () => {
  const lang = require('../src/languages');
  const c = await startCall({ langConfig: lang.config({ MANDARIN_TTS: 'off' }), speakUpdateTimeoutMs: 200 });
  try {
    const conn = c.dg.state.conn;
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fz', name: 'set_language', arguments: '{"language":"zh"}', client_side: true }] }));
    const r = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'fz'))).content);
    assert.equal(r.error, 'NO_VOICE');
    assert.ok(!c.dg.state.received.find((m) => m.type === 'UpdateSpeak'));
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fe', name: 'set_language', arguments: '{"language":"es"}', client_side: true }] }));
    await waitFor(() => c.dg.state.received.find((m) => m.type === 'UpdateSpeak'));
    conn.send(JSON.stringify({ type: 'Error', code: 'BAD_SPEAK', description: 'nope' }));
    const r2 = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'fe'))).content);
    assert.equal(r2.error, 'VOICE_SWITCH_FAILED');
    assert.ok(c.events.find((e) => e.type === 'language' && e.ok === false && e.language === 'en'));
  } finally { await c.stop(); }
});

test('read back gate: no booking or message until the agent says the number and the caller answers', async () => {
  const c = await startCall();
  try {
    const conn = c.dg.state.conn;
    const call = (id, name, args) => conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id, name, client_side: true, arguments: JSON.stringify(args) }] }));
    const res = async (id) => JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === id))).content);
    const r0 = JSON.parse((await (async () => { call('ca', 'check_availability', { service_id: 'fd-fade', date: '2026-10-24' }); return waitFor(() => c.dg.state.received.find((m) => m.id === 'ca')); })()).content);
    const slot = r0.slots[0];
    const args = { service_id: 'fd-fade', stylist_id: slot.stylist_id, date: slot.date, time: slot.time, customer_name: 'Ana', customer_phone: '(415) 555-0123' };
    // 1. Never read back.
    call('b1', 'book_appointment', args);
    const r1 = await res('b1');
    assert.equal(r1.error, 'READ_BACK_PHONE_FIRST');
    assert.equal(r1.reason, 'NOT_READ_BACK');
    assert.match(r1.say, /415, 555, 0123/);
    // 2. A different number read back does not count.
    readBack(conn, 'four one five, five five five, zero one zero zero');
    call('b2', 'book_appointment', args);
    assert.equal((await res('b2')).error, 'READ_BACK_PHONE_FIRST');
    // 3. Read back, but the caller has not answered yet.
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'assistant', content: 'Cuatro uno cinco, cinco cinco cinco, cero uno dos tres. ¿Es correcto?' }));
    call('b3', 'book_appointment', args);
    const r3 = await res('b3');
    assert.equal(r3.reason, 'NOT_CONFIRMED');
    assert.equal(c.app.store.appointments.size, 0);
    // 4. Caller answers: now it books.
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'user', content: 'Sí.' }));
    call('b4', 'book_appointment', args);
    assert.equal((await res('b4')).ok, true);
    // take_message is gated the same way; Mandarin digits count.
    call('m1', 'take_message', { caller_name: 'Li', callback_phone: '6505550199', message: 'Call me' });
    assert.equal((await res('m1')).error, 'READ_BACK_PHONE_FIRST');
    readBack(conn, '六五零，五五五，零一九九', '对');
    call('m2', 'take_message', { caller_name: 'Li', callback_phone: '6505550199', message: 'Call me' });
    assert.equal((await res('m2')).ok, true);
  } finally { await c.stop(); }
});

test('language: set_language is refused when the caller is clearly speaking another language', async () => {
  const lang = require('../src/languages');
  const c = await startCall({ langConfig: lang.config({}) });
  try {
    const conn = c.dg.state.conn;
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'user', content: "Book me with Marcus this Sunday at eleven. He told me he'd come in on his day off just for me." }));
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fl_x', name: 'set_language', arguments: '{"language":"es"}', client_side: true }] }));
    const r = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'fl_x'))).content);
    assert.equal(r.error, 'CALLER_LANGUAGE_MISMATCH');
    assert.ok(!c.dg.state.received.find((m) => m.type === 'UpdateSpeak'));
    // Asking for Spanish in English is allowed.
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'user', content: 'Can we do this in Spanish please?' }));
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fl_y', name: 'set_language', arguments: '{"language":"es"}', client_side: true }] }));
    await waitFor(() => c.dg.state.received.find((m) => m.type === 'UpdateSpeak'));
    conn.send(JSON.stringify({ type: 'SpeakUpdated' }));
    const ok = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'fl_y'))).content);
    assert.equal(ok.ok, true);
  } finally { await c.stop(); }
});

test('transfer: a live transfer ends the AI leg after Mia says she is connecting', async () => {
  const c = await startCall();
  try {
    const conn = c.dg.state.conn;
    conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id: 'fl_t', name: 'transfer_to_human', arguments: '{"reason":"asked"}', client_side: true }] }));
    const r = JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === 'fl_t'))).content);
    assert.equal(r.status, 'transferring');
    const closed = new Promise((res) => conn.on('close', res));
    conn.send(JSON.stringify({ type: 'AgentAudioDone' }));
    await Promise.race([closed, new Promise((_, rej) => setTimeout(() => rej(new Error('call did not end')), 3000))]);
  } finally { await c.stop(); }
});

test('transcript: em and en dashes from the model are replaced before the browser sees them', () => {
  const { noDashes } = require('../src/session');
  assert.equal(noDashes('I want to get it right—nine or nine thirty?'), 'I want to get it right, nine or nine thirty?');
  assert.equal(noDashes('Saturday – ten'), 'Saturday, ten');
});

test('confirm gate: no cancel in the same breath as the lookup; allowed after Mia asks and the caller says yes', async () => {
  const c = await startCall();
  try {
    const conn = c.dg.state.conn;
    const call = async (id, name, args) => {
      conn.send(JSON.stringify({ type: 'FunctionCallRequest', functions: [{ id, name, arguments: JSON.stringify(args), client_side: true }] }));
      return JSON.parse((await waitFor(() => c.dg.state.received.find((m) => m.id === id))).content);
    };
    const slot = (await call('c0', 'check_availability', { service_id: 'fd-classic', date: '2026-10-24' })).slots[0];
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'assistant', content: 'I can book that. Your number is four one five, five five five, zero one zero zero, right?' }));
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'user', content: 'Yes.' }));
    const b = await call('c1', 'book_appointment', { service_id: 'fd-classic', stylist_id: slot.stylist_id, date: '2026-10-24', time: slot.time, customer_name: 'Alex', customer_phone: '4155550100' });
    assert.equal(b.ok, true, JSON.stringify(b));
    const code = b.appointment.confirmation_code;
    await call('c2', 'find_appointment', { confirmation_code: code });
    const early = await call('c3', 'cancel_appointment', { confirmation_code: code });
    assert.equal(early.error, 'CONFIRM_FIRST');
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'assistant', content: 'I found your classic haircut Saturday. Cancel it?' }));
    conn.send(JSON.stringify({ type: 'ConversationText', role: 'user', content: 'Yes please.' }));
    const ok = await call('c4', 'cancel_appointment', { confirmation_code: code });
    assert.equal(ok.ok, true, JSON.stringify(ok));
  } finally { await c.stop(); }
});
