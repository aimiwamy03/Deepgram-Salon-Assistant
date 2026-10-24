// One scripted live call through our own server (so the real session, tools,
// read back gate, and voice switching are exercised), driven by text injection
// or by streamed caller audio. Records everything the browser would see.
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const FRAME = 1600; // 50 ms of 16 kHz mono linear16
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Real time audio pump: plays queued caller audio, otherwise silence.
function pump(ws) {
  let queue = Buffer.alloc(0);
  let onDrained = null;
  const timer = setInterval(() => {
    if (ws.readyState !== 1) return;
    if (queue.length) {
      ws.send(queue.subarray(0, FRAME));
      queue = queue.subarray(FRAME);
      if (!queue.length && onDrained) { const f = onDrained; onDrained = null; f(); }
    } else ws.send(Buffer.alloc(FRAME));
  }, 50);
  return {
    play: (pcm) => new Promise((resolve) => { queue = Buffer.concat([queue, pcm]); onDrained = resolve; }),
    stop: () => clearInterval(timer),
  };
}

function createBarrier(parties) {
  let waiting = 0; let release; const p = new Promise((r) => { release = r; });
  return { wait: () => { waiting += 1; if (waiting >= parties) release(); return p; } };
}

/**
 * turns: array of
 *   "text"                          inject as the caller
 *   { say: string | (ctx) => string|null }
 *   { audio: Buffer, text }         stream real caller audio (text is for the log)
 *   { bargeIn: true, afterMs, audio|say }  start while the agent is still speaking its next reply
 *   { wait: ms }                    stay silent (silence handling)
 *   { barrier }                     wait for other parallel calls to reach the same point
 */
async function runCall({ port, business, turns, label = 'call', settleMs = 1300, turnTimeoutMs = 30000, maxMs = 150000, quiet = false }) {
  const t0 = Date.now();
  const rec = { label, business, transcript: [], tools: [], events: [], languages: [], errors: [], warnings: [], notes: [], audioBytes: 0, injected: [], audioT: [] };
  const now = () => Date.now() - t0;
  const log = (s) => { if (!quiet) console.log(`[${label} ${(now() / 1000).toFixed(1)}s] ${s}`); };
  const ws = new WebSocket(`ws://127.0.0.1:${port}/call?business=${business}`);
  let audio = null;
  let lastActivity = 0; let lastAudioDone = -1; let lastAssistantText = -1; let lastTool = -1; let lastToolName = '';
  let agentSpeaking = false; let ended = false; let live = false; let agentStartedAt = -1;
  const waiters = new Set();
  const poke = () => { for (const w of [...waiters]) w(); };
  const until = (pred, ms) => new Promise((resolve) => {
    if (pred()) return resolve(true);
    const timer = setTimeout(() => { waiters.delete(check); resolve(false); }, ms);
    const check = () => { if (pred()) { clearTimeout(timer); waiters.delete(check); resolve(true); } };
    waiters.add(check);
  });

  ws.on('message', (d, isBinary) => {
    if (isBinary) {
      // Deepgram does not always send AgentStartedSpeaking, so agent audio itself marks speech.
      rec.audioBytes += d.length; rec.audioT.push(now());
      if (!agentSpeaking) { agentSpeaking = true; agentStartedAt = now(); }
      lastActivity = now(); poke(); return;
    }
    const m = JSON.parse(d);
    const t = now();
    rec.events.push({ t, type: m.type, ...(m.type === 'tool' ? { name: m.name } : {}), ...(m.type === 'ConversationText' ? { role: m.role } : {}) });
    switch (m.type) {
      case 'status':
        if (m.status === 'live') { live = true; audio = pump(ws); }
        if (m.status === 'ended') ended = true;
        break;
      case 'ConversationText':
        rec.transcript.push({ t, role: m.role, content: String(m.content || '').replace(/[\u2018\u2019]/g, "'") });
        if (m.dash_removed) rec.warnings.push(`model wrote a dash (removed by server): ${m.content}`);
        if (m.role === 'assistant') lastAssistantText = t;
        lastActivity = t;
        log(`${m.role === 'user' ? 'CALLER' : 'MIA   '}: ${m.content}`);
        break;
      case 'tool':
        rec.tools.push({ t, name: m.name, args: m.arguments, result: m.result });
        lastTool = t; lastToolName = m.name; lastActivity = t;
        log(`TOOL  ${m.name} ${JSON.stringify(m.arguments)} -> ${m.result && (m.result.ok ? 'ok' : m.result.error)}`);
        break;
      case 'AgentStartedSpeaking': agentSpeaking = true; agentStartedAt = t; lastActivity = t; break;
      case 'AgentAudioDone': agentSpeaking = false; lastAudioDone = t; lastActivity = t; break;
      case 'AgentThinking': case 'UserStartedSpeaking': case 'FunctionCallCancelled': lastActivity = t; break;
      case 'language': rec.languages.push(m); log(`VOICE ${m.language} (${m.source}, ok=${m.ok})`); break;
      case 'Error': rec.errors.push(m); log(`ERROR ${JSON.stringify(m)}`); break;
      case 'Warning': rec.warnings.push(m); log(`WARN ${JSON.stringify(m)}`); break;
      default: break;
    }
    poke();
  });
  ws.on('close', () => { ended = true; poke(); });
  const tick = setInterval(poke, 200);

  // The agent's turn is over when its audio finished, nothing happened for settleMs,
  // and it does not still owe an answer to a tool result.
  const owesReply = () => lastTool > lastAssistantText && lastToolName !== 'end_call';
  const turnDone = (since) => ended || (lastAudioDone > since && !agentSpeaking && !owesReply() && now() - lastActivity >= settleMs);

  const hardStop = setTimeout(() => { rec.notes.push('hit maxMs'); try { ws.close(); } catch { /* */ } }, maxMs);
  try {
    if (!(await until(() => live || ended, 15000))) throw new Error('never went live');
    let since = -1;
    let lastInjectAt = -1; // when the previous caller turn started
    for (const turn of turns) {
      const tt = typeof turn === 'string' ? { say: turn } : turn;
      if (tt.bargeIn) {
        // Start talking over the agent's next reply.
        const ok = await until(() => ended || (agentSpeaking && agentStartedAt > lastInjectAt), turnTimeoutMs);
        if (ended) break;
        if (!ok) { rec.notes.push('barge in: agent never started speaking'); }
        await sleep(tt.afterMs || 1200);
        rec.bargeInAt = now();
        rec.agentSpeakingAtBargeIn = agentSpeaking;
      } else {
        const ok = await until(() => turnDone(since), turnTimeoutMs);
        if (ended) break;
        if (!ok) rec.notes.push(`no clean end of agent turn before injecting turn ${rec.injected.length + 1}`);
      }
      if (tt.skipIf && tt.skipIf(rec)) continue;
      if (tt.barrier) { log(`barrier ${tt.barrier.name || ''}`); await tt.barrier.wait(); }
      if (tt.wait) { log(`(silent ${tt.wait} ms)`); await until(() => ended, tt.wait); since = now(); continue; }
      const ctx = { rec, last: [...rec.transcript].reverse().find((x) => x.role === 'assistant') };
      const text = typeof tt.say === 'function' ? tt.say(ctx) : tt.say;
      if (!tt.audio && !text) continue; // adaptive turn chose to stay quiet
      since = now();
      lastInjectAt = since;
      if (tt.audio) {
        log(`CALLER(audio): ${tt.text || ''}`);
        rec.injected.push({ t: since, audio: true, text: tt.text });
        await audio.play(tt.audio);
        since = now(); // the agent's reply comes after the caller stops talking
      } else if (text) {
        rec.injected.push({ t: since, text });
        ws.send(JSON.stringify({ type: 'text', content: text }));
      }
    }
    await until(() => turnDone(since), turnTimeoutMs);
    await until(() => ended, 2500); // a goodbye or transfer hangs up shortly after the last line
  } catch (e) {
    rec.notes.push(`runner error: ${e.message}`);
  } finally {
    clearTimeout(hardStop);
    clearInterval(tick);
    if (audio) audio.stop();
    rec.endedByAgent = ended;
    try { ws.send(JSON.stringify({ type: 'hangup' })); } catch { /* */ }
    await sleep(300);
    try { ws.close(); } catch { /* */ }
    rec.elapsed_s = Math.round(now() / 100) / 10;
  }
  return rec;
}

// Usage ledger shared by all harness runs (connection seconds only, never the key).
const LEDGER = path.join(__dirname, '..', '..', 'live-results', 'usage.jsonl');
function recordUsage(entry) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.appendFileSync(LEDGER, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}
function usedSeconds() {
  if (!fs.existsSync(LEDGER)) return 0;
  return fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + (JSON.parse(l).seconds || 0), 0);
}

module.exports = { runCall, createBarrier, recordUsage, usedSeconds, LEDGER, sleep };
