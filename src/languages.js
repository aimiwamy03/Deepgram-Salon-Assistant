// Language support: English, Spanish, and Mandarin.
//
// Listening (STT), chosen by STT_MODE:
//   nova3-multi (default)  nova-3 with language "multi". Per Deepgram's model
//                          docs this is the multilingual model that covers
//                          Mandarin (zh). Turn taking uses Deepgram's standard
//                          endpointing, not Flux's end of turn model.
//   flux-multi             flux-general-multi with language_hints. Better turn
//                          taking, but its 10 languages do not include Mandarin.
//   flux-en                flux-general-en, English only (the original setup).
//
// Speaking (TTS): one voice per language, switched mid call with UpdateSpeak.
//   en  Deepgram Aura-2 English voice (VOICE_EN, default aura-2-helena-en)
//   es  Deepgram Aura-2 Spanish voice (VOICE_ES, default aura-2-selena-es,
//       one of the five codeswitching voices, so English words inside a
//       Spanish reply still sound right)
//   zh  Aura has no Mandarin, so MANDARIN_TTS picks the provider:
//       cartesia (default)  Deepgram managed Cartesia, billed through the
//                           Deepgram key, no extra key. Docs: "Cartesia is
//                           included in the Standard pricing tier".
//       eleven_labs         BYO ElevenLabs key (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID)
//       open_ai             BYO OpenAI key (OPENAI_API_KEY, OPENAI_TTS_VOICE)
//       off                 no Mandarin voice; Mia answers Mandarin callers in
//                           English and offers a callback.

const SUPPORTED = ['en', 'es', 'zh'];
const NAMES = { en: 'English', es: 'Spanish', zh: 'Mandarin Chinese' };

// Public Cartesia library voice "Chinese Female Conversational".
const DEFAULT_CARTESIA_ZH_VOICE = 'e90c6678-f0d3-4767-9883-5d0ecf5894a8';

function config(env = process.env) {
  return {
    sttMode: env.STT_MODE || 'nova3-multi',
    voiceEn: env.VOICE_EN || env.VOICE_MODEL || 'aura-2-helena-en',
    voiceEs: env.VOICE_ES || 'aura-2-selena-es',
    mandarinTts: (env.MANDARIN_TTS || 'cartesia').toLowerCase(),
    cartesiaModel: env.CARTESIA_MODEL || 'sonic-2',
    cartesiaVoiceZh: env.CARTESIA_VOICE_ZH || DEFAULT_CARTESIA_ZH_VOICE,
    cartesiaKey: env.CARTESIA_API_KEY || '', // only for BYO Cartesia; managed needs none
    elevenKey: env.ELEVENLABS_API_KEY || '',
    elevenVoiceZh: env.ELEVENLABS_VOICE_ID || '',
    elevenModel: env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5',
    openaiKey: env.OPENAI_API_KEY || '',
    openaiVoice: env.OPENAI_TTS_VOICE || 'alloy',
  };
}

function listenProvider(cfg, keyterms) {
  switch (cfg.sttMode) {
    case 'flux-en':
      return { type: 'deepgram', version: 'v2', model: 'flux-general-en', keyterms, eot_threshold: 0.7, eot_timeout_ms: 5000 };
    case 'flux-multi':
      return { type: 'deepgram', version: 'v2', model: 'flux-general-multi', language_hints: ['en', 'es'], keyterms, eot_threshold: 0.7, eot_timeout_ms: 5000 };
    case 'nova3-multi':
    default:
      return { type: 'deepgram', version: 'v1', model: 'nova-3', language: 'multi', keyterms };
  }
}

// Which languages Mia can actually hear and answer out loud with this config.
function capabilities(cfg) {
  const hearsZh = cfg.sttMode === 'nova3-multi';
  const hearsEs = cfg.sttMode !== 'flux-en';
  const zhVoice = mandarinSpeak(cfg) !== null;
  return { en: true, es: hearsEs, zh: hearsZh && zhVoice, hearsZh, zhVoice };
}

function mandarinSpeak(cfg) {
  switch (cfg.mandarinTts) {
    case 'cartesia':
      // Managed by Deepgram: no endpoint block. Set CARTESIA_API_KEY to bring your own Cartesia account instead.
      return {
        provider: { type: 'cartesia', model_id: cfg.cartesiaModel, voice: { mode: 'id', id: cfg.cartesiaVoiceZh }, language: 'zh' },
        ...(cfg.cartesiaKey ? { endpoint: { url: 'https://api.cartesia.ai/tts/bytes', headers: { 'x-api-key': cfg.cartesiaKey } } } : {}),
      };
    case 'eleven_labs':
      if (!cfg.elevenKey || !cfg.elevenVoiceZh) return null;
      return {
        provider: { type: 'eleven_labs', model_id: cfg.elevenModel, language: 'zh' },
        endpoint: { url: `wss://api.elevenlabs.io/v1/text-to-speech/${cfg.elevenVoiceZh}/multi-stream-input`, headers: { 'xi-api-key': cfg.elevenKey } },
      };
    case 'open_ai':
      if (!cfg.openaiKey) return null;
      return {
        provider: { type: 'open_ai', model: 'tts-1', voice: cfg.openaiVoice },
        endpoint: { url: 'https://api.openai.com/v1/audio/speech', headers: { authorization: `Bearer ${cfg.openaiKey}` } },
      };
    default:
      return null;
  }
}

// The agent.speak block for a language, or null if that language has no voice.
function speakFor(lang, cfg) {
  if (lang === 'es') return { provider: { type: 'deepgram', version: 'v1', model: cfg.voiceEs, speed: 1.0 } };
  if (lang === 'zh') return mandarinSpeak(cfg);
  return { provider: { type: 'deepgram', version: 'v1', model: cfg.voiceEn, speed: 1.0 } };
}

// Best effort language guess from one caller turn. Prefers the STT's own
// detection (Flux multi sends `languages` on user ConversationText), then
// falls back to the text itself.
function detectLanguage(msg) {
  if (Array.isArray(msg.languages) && msg.languages.length) {
    const top = String(msg.languages[0]).toLowerCase().split('-')[0];
    if (SUPPORTED.includes(top)) return top;
  }
  const text = String(msg.content || '');
  const han = (text.match(/[\u3400-\u9fff]/g) || []).length;
  if (han >= 2) return 'zh';
  const words = text.toLowerCase().match(/[a-záéíóúñü¿¡]+/g) || [];
  if (!words.length) return null;
  const es = new Set(['hola', 'quiero', 'quisiera', 'necesito', 'puedo', 'para', 'cita', 'corte', 'gracias', 'por', 'favor', 'mañana', 'hoy', 'sí', 'buenos', 'buenas', 'días', 'tardes', 'una', 'el', 'la', 'los', 'las', 'con', 'mi', 'es', 'de', 'que', 'hablo', 'español', 'cuánto', 'cuesta', 'barbería', 'domingo', 'sábado', 'nombre', 'teléfono', 'número', 'llamo', 'usted', 'puede', 'tiene', 'hay', 'cuándo', 'dónde', 'qué', 'mejor', 'está', 'estoy', 'bueno', 'claro', 'no', 'sí', 'tarde', 'semana', 'próximo', 'próxima']);
  const en = new Set(['the', 'i', 'want', 'to', 'a', 'an', 'is', 'my', 'and', 'for', 'can', 'please', 'yes', 'book', 'haircut', 'what', 'how', 'thanks', 'you', 'it', 'that', 'do', 'have', 'with', 'this', 'at', 'on', 'he', 'she', 'his', 'her', 'told', 'just', 'day', 'off', 'of', 'in', 'would', 'like', 'need', 'get', 'could', 'are', 'we', 'me', 'your', 'be', 'not', 'so', 'if', 'about', 'there', 'anyway', 'put', 'actually', 'what', 'when', 'next', 'week', 'okay', 'sure', 'no', 'appointment', 'time']);
  let s = 0, e = 0;
  for (const w of words) { if (es.has(w)) s++; if (en.has(w)) e++; }
  if (/[ñ¿¡áéíóú]/.test(text)) s += 1;
  if (s >= 2 && s > e) return 'es';
  if (e >= 2 && e > s) return 'en';
  return null;
}

module.exports = { SUPPORTED, NAMES, DEFAULT_CARTESIA_ZH_VOICE, config, listenProvider, capabilities, speakFor, mandarinSpeak, detectLanguage };
