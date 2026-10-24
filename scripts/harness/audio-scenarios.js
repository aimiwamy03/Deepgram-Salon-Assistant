// Audio scenarios: caller speech is synthesized once (see tts.js) and streamed
// in real time, so STT, end of turn detection, and barge in are exercised.
const { C } = require('./checks');
const { synth } = require('./tts');
const { booked } = require('./scenarios');

const A = (text, language = 'en', extra = {}) => async () => ({ audio: await synth(text, language), text, ...extra });
const build = (specs) => async () => Promise.all(specs.map((s) => (typeof s === 'function' ? s() : s)));
const yesAudio = (text, language = 'en') => async () => { const a = await synth(text, language); return { audio: a, text, skipIf: booked }; };

const S = [
  {
    id: 'audio-en-booking', group: 12, title: 'Spoken English booking with a spoken phone number',
    audio: build([
      A("Hi, I'd like a skin fade with Dani on Saturday at two thirty."),
      A('My name is Sam, and my number is four one five, five five five, zero one five two.'),
      yesAudio("Yes, that's right. Please book it."), yesAudio('Yes.'),
    ]),
    checks: [
      C.calledOk('book_appointment', (a) => a.stylist_id === 'fd-dani' && a.date === '2026-10-24' && a.time === '14:30' && String(a.customer_phone).replace(/\D/g, '').endsWith('4155550152'), 'booked Dani Sat 14:30 for 4155550152 from speech'),
      C.readBackBeforeWrites(),
    ],
  },
  {
    id: 'audio-barge-in', group: 12, title: 'Caller interrupts a long answer',
    audio: build([
      A('What services do you have, and how much is each one?'),
      A('Sorry, just the price of a skin fade please.', 'en', { bargeIn: true, afterMs: 2500 }),
    ]),
    checks: [
      C.custom('agent was speaking when the caller cut in', (rec) => rec.agentSpeakingAtBargeIn === true || 'agent was not speaking'),
      C.custom('agent audio stops within 1.5 s of the caller starting', (rec) => {
        const start = rec.bargeInAt; if (start === undefined) return 'no barge in';
        const us = rec.events.find((e) => e.type === 'UserStartedSpeaking' && e.t >= start);
        if (!us) return 'no UserStartedSpeaking after barge in';
        // The next reply cannot start before the caller's words are transcribed.
        const heard = rec.transcript.find((x) => x.role === 'user' && x.t > us.t);
        const late = rec.audioT.filter((t) => t > us.t + 1500 && (!heard || t < heard.t));
        return late.length === 0 || `${late.length} audio chunks kept coming after the interruption (UserStartedSpeaking at ${us.t} ms)`;
      }),
      C.custom('answers the interruption with the fade price', (rec) => { const t = rec.bargeInAt || 0; return rec.transcript.some((x) => x.role === 'assistant' && x.t > t && /forty[ -]five|\$?45/i.test(x.content)) || 'no fade price after interruption'; }),
    ],
  },
  {
    id: 'audio-es', group: 12, title: 'Spoken Spanish question',
    audio: build([A('Hola, ¿cuánto cuesta un corte clásico, y a qué hora abren mañana?', 'es')]),
    checks: [C.languageAfterTurn(0, 'es'), C.voice('es'), C.said(/cuarenta/i, 'price in Spanish words'), C.said(/nueve/i, 'opening time nine'), C.usted()],
  },
  {
    id: 'audio-zh', group: 12, title: 'Spoken Mandarin question',
    audio: build([A('你好，请问明天几点开门？经典理发多少钱？', 'zh')]),
    checks: [C.languageAfterTurn(0, 'zh'), C.voice('zh'), C.said(/四十|40/, 'price forty'), C.said(/九点|9点/, 'opens at nine')],
  },
];

module.exports = { scenarios: S };
