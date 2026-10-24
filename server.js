// Local demo server: serves the web page, exposes read-only demo state, and
// bridges each browser call to Deepgram's Voice Agent API.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { createStore, loadMockData } = require('./src/store');
const { createToolHandlers } = require('./src/tools');
const { CallSession } = require('./src/session');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function createServer({ apiKey = process.env.DEEPGRAM_API_KEY, agentUrl = process.env.DEEPGRAM_AGENT_URL, clock, silenceMs, langConfig, speakUpdateTimeoutMs, requireReadBack } = {}) {
  const store = createStore(loadMockData(clock), clock);
  const sessions = new Map();
  const publicDir = path.join(__dirname, 'public');

  const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, has_key: !!apiKey });
    }
    if (req.method === 'GET' && url.pathname === '/api/businesses') {
      return json(res, 200, store.businesses.map((b) => ({ id: b.id, name: b.name, type: b.type, neighborhood: b.neighborhood, open_now: store.isOpenNow(b) })));
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      return json(res, 200, { appointments: [...store.appointments.values()], messages: store.messages, handoffs: store.handoffs });
    }
    // Demo only: pretend another caller grabbed the first slot this call was just offered.
    if (req.method === 'POST' && url.pathname === '/api/dev/take-offered-slot') {
      const s = sessions.get(url.searchParams.get('session'));
      const slot = s && s.lastOffered[0];
      if (!slot) return json(res, 404, { ok: false, error: 'No offered slot in this call yet.' });
      const ok = store.takeSlotForDemo(slot.stylist_id, slot.date, slot.time);
      return json(res, 200, { ok, taken: slot });
    }
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const full = path.join(publicDir, path.normalize(file));
    if (!full.startsWith(publicDir) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  });

  const wss = new WebSocketServer({ server, path: '/call' });
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const business = store.getBusiness(url.searchParams.get('business')) || store.businesses[0];
    if (!apiKey) {
      ws.send(JSON.stringify({ type: 'Error', code: 'NO_KEY', description: 'DEEPGRAM_API_KEY is not set on the server. Add it and restart.' }));
      return ws.close();
    }
    const tools = createToolHandlers(store, { defaultBusinessId: business.id });
    const s = new CallSession({ browser: ws, business, store, tools, apiKey, agentUrl, silenceMs, langConfig, speakUpdateTimeoutMs, requireReadBack, log: console.log });
    sessions.set(s.id, s);
    ws.on('close', () => sessions.delete(s.id));
  });

  return { server, store, sessions };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1'; // local only by default
  const { server } = createServer();
  server.listen(port, host, () => {
    console.log(`Receptionist demo on http://${host}:${port}`);
    if (!process.env.DEEPGRAM_API_KEY) console.log('Note: DEEPGRAM_API_KEY is not set, calls will be refused until you add it.');
  });
}

module.exports = { createServer };
