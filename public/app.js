const $ = (id) => document.getElementById(id);
let ws, micCtx, playCtx, micStream, sessionId, playHead = 0, sources = [];

async function loadBusinesses() {
  const list = await (await fetch('/api/businesses')).json();
  $('business').innerHTML = list.map((b) => `<option value="${b.id}">${b.name} (${b.neighborhood}${b.open_now ? ', open now' : ', closed now'})</option>`).join('');
}

function add(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  // Display only: show "(415) 555-0100" and "$45" instead of spelled out words. Spoken audio is unchanged.
  el.textContent = role === 'sys' || !window.Digits ? text : window.Digits.toDisplay(text);
  el.title = text; // hover shows the exact words
  $('transcript').appendChild(el);
  $('transcript').scrollTop = 1e9;
}

function setStatus(s) { $('status').textContent = s; }

function playPcm(buf) {
  const pcm = new Int16Array(buf);
  const audio = playCtx.createBuffer(1, pcm.length, 24000);
  const ch = audio.getChannelData(0);
  for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
  const src = playCtx.createBufferSource();
  src.buffer = audio;
  src.connect(playCtx.destination);
  playHead = Math.max(playHead, playCtx.currentTime + 0.02);
  src.start(playHead);
  playHead += audio.duration;
  sources.push(src);
  src.onended = () => { sources = sources.filter((s) => s !== src); };
}

function stopPlayback() { // barge in: the caller started talking
  for (const s of sources) { try { s.stop(); } catch (e) { /* already stopped */ } }
  sources = [];
  playHead = 0;
}

async function refreshState() {
  const st = await (await fetch('/api/state')).json();
  const rows = [
    ...st.appointments.map((a) => `${a.status === 'booked' ? 'Booked' : 'Cancelled'} ${a.confirmation_code}: ${a.service_name} with ${a.stylist_name}, ${a.date} ${a.time} (${a.customer_name})`),
    ...st.messages.map((m) => `Message from ${m.caller_name}: ${m.message}`),
    ...st.handoffs.map((h) => `Handoff (${h.status}): ${h.reason}`),
  ];
  $('state').textContent = '';
  if (!rows.length) { $('state').textContent = 'None yet.'; return; }
  for (const r of rows) { const d = document.createElement('div'); d.textContent = r; $('state').appendChild(d); }
}

function onEvent(msg) {
  switch (msg.type) {
    case 'session': sessionId = msg.session_id; break;
    case 'status':
      if (msg.status === 'live') setStatus('Live, go ahead and talk');
      if (msg.status === 'ended') endCall();
      break;
    case 'ConversationText': add(msg.role, msg.content); break;
    case 'UserStartedSpeaking': stopPlayback(); setStatus('Listening'); break;
    case 'AgentThinking': setStatus('Thinking'); break;
    case 'AgentStartedSpeaking': setStatus('Mia is speaking'); break;
    case 'AgentAudioDone': setStatus('Live, go ahead and talk'); break;
    case 'tool': {
      const el = document.createElement('div');
      el.className = 'tool';
      el.textContent = `${msg.name}(${JSON.stringify(msg.arguments)})\n=> ${JSON.stringify(msg.result).slice(0, 400)}`;
      if ($('tools').querySelector('.hint')) $('tools').innerHTML = '';
      $('tools').prepend(el);
      refreshState();
      break;
    }
    case 'language': {
      const names = { en: 'English', es: 'Spanish', zh: 'Mandarin' };
      add('sys', msg.ok ? `Voice switched to ${names[msg.language]}` : `Could not switch voice to ${names[msg.requested]} (${msg.error || 'error'}), staying in ${names[msg.language]}`);
      break;
    }
    case 'Error': add('sys', `Error: ${msg.description || msg.code}`); break;
    case 'Warning': add('sys', `Warning: ${msg.description}`); break;
    default: break;
  }
}

async function startCall() {
  $('transcript').innerHTML = '';
  setStatus('Connecting');
  micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  micCtx = new AudioContext();
  playCtx = new AudioContext({ sampleRate: 24000 });
  await micCtx.audioWorklet.addModule('mic-worklet.js');
  const node = new AudioWorkletNode(micCtx, 'mic-processor');
  micCtx.createMediaStreamSource(micStream).connect(node);

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/call?business=${encodeURIComponent($('business').value)}`);
  ws.binaryType = 'arraybuffer';
  ws.onmessage = (e) => (typeof e.data === 'string' ? onEvent(JSON.parse(e.data)) : playPcm(e.data));
  ws.onclose = () => endCall();
  node.port.onmessage = (e) => { if (ws.readyState === WebSocket.OPEN) ws.send(e.data); };
  $('call').textContent = 'Hang up';
  $('call').classList.add('live');
}

function endCall() {
  if (ws && ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'hangup' })); ws.close(); }
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  if (micCtx) micCtx.close();
  stopPlayback();
  if (playCtx) playCtx.close();
  micStream = micCtx = playCtx = null;
  ws = null;
  $('call').textContent = 'Start call';
  $('call').classList.remove('live');
  setStatus('Call ended');
}

$('call').onclick = () => (ws ? endCall() : startCall().catch((e) => { add('sys', `Could not start: ${e.message}`); endCall(); }));
$('steal').onclick = async () => {
  if (!sessionId) return add('sys', 'Start a call first.');
  const r = await (await fetch(`/api/dev/take-offered-slot?session=${sessionId}`, { method: 'POST' })).json();
  add('sys', r.ok ? `Another caller just booked ${r.taken.date} ${r.taken.time} with ${r.taken.stylist_name}.` : (r.error || 'Nothing to take yet.'));
};
loadBusinesses();
