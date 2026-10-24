const test = require('node:test');
const assert = require('node:assert/strict');
const { makeValidators } = require('../scripts/validate-settings');
const { buildSettings } = require('../src/settings');
const { setup } = require('./helpers');
const lang = require('../src/languages');

const v = makeValidators();

// The published schema does not set additionalProperties:false, so also check
// that every key we send is a documented property (catches typos like "eot_treshold").
function undocumentedKeys(value, schema, root, at = '') {
  const resolve = (s) => (s && s.$ref ? resolve(s.$ref.replace('#/components/schemas/', '').split('/').reduce((o, k) => o[k], root)) : s);
  schema = resolve(schema);
  if (!schema || typeof value !== 'object' || value === null) return [];
  if (schema.oneOf) {
    const branches = schema.oneOf.map(resolve).filter((o) => !o.type || o.type === (Array.isArray(value) ? 'array' : 'object'));
    const results = branches.map((o) => undocumentedKeys(value, o, root, at));
    return results.reduce((best, r) => (r.length < best.length ? r : best));
  }
  if (Array.isArray(value)) return value.flatMap((x, i) => undocumentedKeys(x, schema.items, root, `${at}[${i}]`));
  if (!schema.properties || !Object.keys(schema.properties).length) return []; // free form, like function parameters
  return Object.entries(value).flatMap(([k, x]) => (schema.properties[k] ? undocumentedKeys(x, schema.properties[k], root, `${at}.${k}`) : [`${at}.${k}`]));
}

test('Settings for every business validates against Deepgram AsyncAPI schema', () => {
  const { store } = setup();
  for (const b of store.businesses) {
    const s = buildSettings({ business: b, now: store.now(), openNow: store.isOpenNow(b) });
    assert.ok(v.settings(s), `${b.id}: ${JSON.stringify(v.settings.errors)}`);
    assert.deepEqual(undocumentedKeys(s, { $ref: '#/components/schemas/AgentV1_AgentV1Settings' }, v.doc.components.schemas), []);
    assert.ok(s.agent.think.prompt.length < 25000, 'managed LLM prompt limit');
  }
});

test('Settings defaults: nova-3 multi listen (covers Mandarin), Aura-2 v1 English speak, documented audio formats', () => {
  const { store } = setup();
  const s = buildSettings({ business: store.businesses[0], now: store.now(), openNow: true, langConfig: lang.config({}) });
  assert.deepEqual([s.agent.listen.provider.version, s.agent.listen.provider.model, s.agent.listen.provider.language], ['v1', 'nova-3', 'multi']);
  assert.equal(s.agent.speak.provider.model, 'aura-2-helena-en');
  assert.equal(s.agent.speak.provider.version, 'v1');
  assert.match(s.agent.speak.provider.model, /^aura-2-/);
  assert.deepEqual(s.audio.input, { encoding: 'linear16', sample_rate: 16000 });
  const writes = s.agent.think.functions.filter((f) => f.defer_until_eot).map((f) => f.name).sort();
  assert.deepEqual(writes, ['book_appointment', 'cancel_appointment', 'end_call', 'reschedule_appointment', 'take_message', 'transfer_to_human']);
});

test('validator rejects bad values (proves the schema check has teeth)', () => {
  const { store } = setup();
  const good = buildSettings({ business: store.businesses[0], now: store.now(), openNow: true });
  const clone = () => JSON.parse(JSON.stringify(good));
  const badVoice = clone(); badVoice.agent.speak.provider.model = 'aura-2-nobody-en';
  const badLlm = clone(); badLlm.agent.think.provider.model = 'gpt-imaginary';
  const badEnc = clone(); badEnc.audio.input.encoding = 'wav';
  const noType = clone(); delete noType.type;
  for (const bad of [badVoice, badLlm, badEnc, noType]) assert.equal(v.settings(bad), false);
  const typo = clone(); typo.agent.listen.provider.eot_treshold = 0.7;
  assert.deepEqual(undocumentedKeys(typo, { $ref: '#/components/schemas/AgentV1_AgentV1Settings' }, v.doc.components.schemas), ['.agent.listen.provider.eot_treshold']);
});

const SCHEMA = (msg) => undocumentedKeys(msg, { $ref: '#/components/schemas/AgentV1_AgentV1Settings' }, v.doc.components.schemas);

test('every STT_MODE and MANDARIN_TTS option builds schema valid Settings and UpdateSpeak', () => {
  const { store } = setup();
  const b = store.businesses[0];
  const envs = [
    {}, { STT_MODE: 'flux-multi' }, { STT_MODE: 'flux-en' },
    { MANDARIN_TTS: 'off' }, { MANDARIN_TTS: 'cartesia', CARTESIA_API_KEY: 'test-not-a-key' },
    { MANDARIN_TTS: 'eleven_labs', ELEVENLABS_API_KEY: 'test-not-a-key', ELEVENLABS_VOICE_ID: 'abc123' },
    { MANDARIN_TTS: 'open_ai', OPENAI_API_KEY: 'test-not-a-key' },
  ];
  for (const env of envs) {
    const cfg = lang.config(env);
    const s = buildSettings({ business: b, now: store.now(), openNow: true, langConfig: cfg });
    assert.ok(v.settings(s), `${JSON.stringify(env)}: ${JSON.stringify(v.settings.errors)}`);
    assert.deepEqual(SCHEMA(s), [], JSON.stringify(env));
    for (const l of ['en', 'es', 'zh']) {
      const speak = lang.speakFor(l, cfg);
      if (!speak) continue;
      assert.ok(v.updateSpeak({ type: 'UpdateSpeak', speak }), `${l} ${JSON.stringify(env)}: ${JSON.stringify(v.updateSpeak.errors)}`);
      const s2 = JSON.parse(JSON.stringify(s)); s2.agent.speak = speak; // same block must also be valid in Settings
      assert.ok(v.settings(s2), `settings with ${l} speak: ${JSON.stringify(v.settings.errors)}`);
      assert.deepEqual(SCHEMA(s2), []);
    }
  }
});

test('language capabilities follow the config flags', () => {
  const { store } = setup();
  assert.deepEqual(lang.capabilities(lang.config({})), { en: true, es: true, zh: true, hearsZh: true, zhVoice: true });
  assert.equal(lang.capabilities(lang.config({ STT_MODE: 'flux-multi' })).zh, false, 'Flux multi has no Mandarin');
  assert.equal(lang.capabilities(lang.config({ MANDARIN_TTS: 'off' })).zh, false);
  assert.equal(lang.speakFor('zh', lang.config({ MANDARIN_TTS: 'eleven_labs' })), null, 'BYO provider without a key stays off');
  assert.equal(lang.speakFor('es', lang.config({})).provider.model, 'aura-2-selena-es');
  const managed = lang.speakFor('zh', lang.config({}));
  assert.equal(managed.provider.type, 'cartesia');
  assert.equal(managed.endpoint, undefined, 'managed Cartesia needs no endpoint or third party key');
  const flux = buildSettings({ business: store.businesses[0], now: store.now(), openNow: true, langConfig: lang.config({ STT_MODE: 'flux-multi' }) });
  assert.deepEqual(flux.agent.listen.provider.language_hints, ['en', 'es']);
  assert.match(flux.agent.think.prompt, /Spanish/);
  assert.doesNotMatch(flux.agent.think.prompt, /"zh"/);
  const def = buildSettings({ business: store.businesses[0], now: store.now(), openNow: true, langConfig: lang.config({}) });
  assert.match(def.agent.think.prompt, /set_language with "en", "es", "zh"/);
  assert.ok(!/\u2014/.test(def.agent.think.prompt), 'no em dashes');
});

test('detectLanguage: STT languages field first, then text', () => {
  assert.equal(lang.detectLanguage({ languages: ['es'], content: 'ok' }), 'es');
  assert.equal(lang.detectLanguage({ content: '我想预约一个理发。' }), 'zh');
  assert.equal(lang.detectLanguage({ content: 'Hola, quiero una cita para un corte el domingo.' }), 'es');
  assert.equal(lang.detectLanguage({ content: 'Hi, I want to book a haircut for Sunday.' }), 'en');
  assert.equal(lang.detectLanguage({ content: 'Dani' }), null);
});
