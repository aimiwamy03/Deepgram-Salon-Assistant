// Builds the Deepgram Voice Agent "Settings" message (API v1,
// wss://agent.deepgram.com/v1/agent/converse). Shape checked against the
// AsyncAPI spec in spec/voice-agent-asyncapi.md by scripts/validate-settings.js.
const { definitions } = require('./tools');
const { buildPrompt, buildGreeting } = require('./prompt');
const lang = require('./languages');

const AUDIO = {
  input: { encoding: 'linear16', sample_rate: 16000 }, // browser sends 16 kHz mono PCM
  output: { encoding: 'linear16', sample_rate: 24000, container: 'none' }, // raw PCM back to the browser
};

function buildSettings({ business, now, openNow, voice, llmModel, langConfig } = {}) {
  const cfg = { ...(langConfig || lang.config()) };
  if (voice) cfg.voiceEn = voice;
  const caps = lang.capabilities(cfg);
  const keyterms = [
    business.name,
    ...business.staff.map((s) => s.name.split(',')[0]),
    ...business.services.map((s) => s.name),
  ].slice(0, 40);

  return {
    type: 'Settings',
    tags: ['receptionist-prototype', business.id],
    audio: AUDIO,
    agent: {
      listen: { provider: lang.listenProvider(cfg, keyterms) }, // STT_MODE, see src/languages.js
      think: {
        provider: {
          type: 'open_ai',
          model: llmModel || process.env.LLM_MODEL || 'gpt-4.1-mini', // Deepgram managed, Standard tier
          temperature: 0.4,
        },
        prompt: buildPrompt({ business, now, openNow, languages: caps }),
        functions: definitions, // no endpoint => client side; our server executes them
      },
      speak: lang.speakFor('en', cfg), // calls start in English; the session switches voice with UpdateSpeak
      greeting: buildGreeting(business),
    },
  };
}

module.exports = { buildSettings, AUDIO };
