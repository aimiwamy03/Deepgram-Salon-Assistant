// Caller voices for audio tests. Uses the Voice Agent itself as the TTS engine:
// a throwaway session whose greeting is the caller line, spoken by a chosen
// voice (Aura-2 for English and Spanish, Deepgram managed Cartesia for Mandarin).
// Output is resampled to 16 kHz with ffmpeg and cached on disk, so each line
// costs a few seconds of connection time once.
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { recordUsage } = require('./call');
const lang = require('../../src/languages');

const CACHE = path.join(__dirname, '.cache');
const VOICES = {
  en: { provider: { type: 'deepgram', model: 'aura-2-apollo-en' } },
  es: { provider: { type: 'deepgram', model: 'aura-2-javier-es' } },
  zh: lang.mandarinSpeak(lang.config({})),
};

function synth(text, language = 'en') {
  fs.mkdirSync(CACHE, { recursive: true });
  const key = crypto.createHash('sha1').update(`${language}:${text}`).digest('hex').slice(0, 16);
  const file = path.join(CACHE, `${key}.pcm16k`);
  if (fs.existsSync(file)) return Promise.resolve(fs.readFileSync(file));
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const ws = new WebSocket('wss://agent.deepgram.com/v1/agent/converse', { headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` } });
    const chunks = [];
    const fail = setTimeout(() => { ws.close(); reject(new Error('tts timeout')); }, 30000);
    ws.on('open', () => ws.send(JSON.stringify({
      type: 'Settings',
      audio: { input: { encoding: 'linear16', sample_rate: 16000 }, output: { encoding: 'linear16', sample_rate: 24000, container: 'none' } },
      agent: {
        listen: { provider: { type: 'deepgram', version: 'v1', model: 'nova-3', language: 'multi' } },
        think: { provider: { type: 'open_ai', model: 'gpt-4.1-mini' }, prompt: 'Say nothing.' },
        speak: VOICES[language],
        greeting: text,
      },
    })));
    ws.on('message', (d, isBinary) => {
      if (isBinary) { chunks.push(d); return; }
      const m = JSON.parse(d);
      if (m.type === 'Error') { clearTimeout(fail); ws.close(); reject(new Error(m.description || m.code)); }
      if (m.type === 'AgentAudioDone') {
        clearTimeout(fail);
        ws.close();
        recordUsage({ kind: 'tts', seconds: (Date.now() - t0) / 1000 });
        const raw24 = Buffer.concat(chunks);
        const pcm16 = execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0', '-f', 's16le', '-ar', '16000', '-ac', '1', 'pipe:1'], { input: raw24, maxBuffer: 64 << 20 });
        const out = Buffer.concat([Buffer.alloc(9600), pcm16, Buffer.alloc(16000)]); // 0.3 s lead, 0.5 s tail
        fs.writeFileSync(file, out);
        resolve(out);
      }
    });
    ws.on('error', (e) => { clearTimeout(fail); reject(e); });
  });
}

module.exports = { synth };
