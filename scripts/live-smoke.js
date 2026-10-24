// Short live check against the real Deepgram Voice Agent API. Uses
// DEEPGRAM_API_KEY from env (never printed). Starts the server in process on a
// random local port, opens one call, streams silence, injects one typed caller
// line, and waits for a tool call, a spoken reply, and agent audio. About 30 s.
const WebSocket = require('ws');
const { createServer } = require('../server');

// Caller lines, separated by "|". Each is injected after the agent finishes speaking.
const LINES = (process.argv[2] || "Hi, I'd like to book a skin fade tomorrow afternoon. What times do you have?").split('|').map((x) => x.trim());
const BUSINESS = process.argv[3] || 'fade-district';
const TIMEOUT_MS = 30000 + 20000 * LINES.length;

(async () => {
  if (!process.env.DEEPGRAM_API_KEY) { console.error('DEEPGRAM_API_KEY not set'); process.exit(2); }
  const { server } = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/call?business=${BUSINESS}`);
  const seen = { welcome: false, settingsApplied: false, tools: [], text: [], audioBytes: 0, errors: [], warnings: [], languages: [], speakUpdated: 0 };
  const t0 = Date.now();
  let silence, done = false, next = 0, waitingForReply = false;
  const finish = (code) => {
    if (done) return;
    done = true;
    clearInterval(silence);
    try { ws.send(JSON.stringify({ type: 'hangup' })); ws.close(); } catch { /* ignore */ }
    server.close();
    console.log(JSON.stringify({ ...seen, elapsed_s: Math.round((Date.now() - t0) / 100) / 10 }, null, 2));
    setTimeout(() => process.exit(code), 300);
  };
  const timer = setTimeout(() => finish(1), TIMEOUT_MS);
  ws.on('message', (d, isBinary) => {
    if (isBinary) { seen.audioBytes += d.length; return; }
    const m = JSON.parse(d);
    if (m.type === 'Welcome') seen.welcome = true;
    if (m.type === 'SettingsApplied') seen.settingsApplied = true;
    if (m.type === 'Error') seen.errors.push(m);
    if (m.type === 'Warning') seen.warnings.push(m);
    if (m.type === 'SpeakUpdated') seen.speakUpdated += 1;
    if (m.type === 'language') { seen.languages.push(m); console.log(`[language] ${JSON.stringify(m)}`); }
    if (m.type === 'Error') console.log(`[error] ${JSON.stringify(m)}`);
    if (m.type === 'ConversationText') { seen.text.push(`${m.role}: ${m.content}`); console.log(`[${m.role}] ${m.content}`); }
    if (m.type === 'tool') { seen.tools.push({ name: m.name, arguments: m.arguments, ok: m.result.ok, error: m.result.error, slots: m.result.slots && m.result.slots.map((x) => x.spoken || x.time) }); console.log(`[tool] ${m.name} ${JSON.stringify(m.arguments)}`); }
    if (m.type === 'status' && m.status === 'live') {
      silence = setInterval(() => ws.readyState === 1 && ws.send(Buffer.alloc(1600)), 50); // 50 ms of silence
    }
    if (m.type === 'ConversationText' && m.role === 'assistant') waitingForReply = false;
    // After each agent turn (greeting first), inject the next caller line; stop after the last reply.
    if (m.type === 'AgentAudioDone' && !waitingForReply) {
      if (next < LINES.length) {
        console.log(`[inject] ${LINES[next]}`);
        ws.send(JSON.stringify({ type: 'text', content: LINES[next++] }));
        waitingForReply = true;
      } else { clearTimeout(timer); finish(0); }
    }
    if (m.type === 'status' && m.status === 'ended') { clearTimeout(timer); finish(seen.errors.length ? 1 : 0); }
  });
})();
