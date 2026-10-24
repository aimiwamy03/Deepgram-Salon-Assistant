// One phone call: bridges a browser WebSocket to Deepgram's agent WebSocket.
// Browser -> server: binary 16 kHz linear16 mic audio, or small JSON controls.
// Server -> browser: binary 24 kHz linear16 agent audio, plus JSON events for
// the transcript and tool log. The Deepgram key only ever lives on this server.
const WebSocket = require('ws');
const { buildSettings } = require('./settings');
const lang = require('./languages');
const { phoneReadBack } = require('./readback');
const { normPhone } = require('./store');

const noDashes = (t) => String(t).replace(/\s*[\u2013\u2014]\s*/g, ', ').replace(/,\s*([,.?!])/g, '$1');

const DEFAULT_AGENT_URL = 'wss://agent.deepgram.com/v1/agent/converse';
const FORWARD_TYPES = new Set([
  'Welcome', 'SettingsApplied', 'ConversationText', 'UserStartedSpeaking', 'AgentThinking',
  'AgentStartedSpeaking', 'AgentAudioDone', 'Error', 'Warning', 'FunctionCallCancelled', 'SpeakUpdated',
]);

// Silence check in and goodbye, per voice language.
const CHECK_IN = {
  en: ['Are you still there? Take your time.', "I'll let you go for now. Feel free to call back anytime. Bye!"],
  es: ['¿Sigue ahí? Tómese su tiempo.', 'Lo dejo por ahora. Llámenos cuando guste. ¡Adiós!'],
  zh: ['您还在吗？不着急。', '那我先挂了，欢迎随时再打来。再见！'],
};

let nextSessionId = 1;

class CallSession {
  constructor({ browser, business, store, tools, apiKey, agentUrl, silenceMs = 15000, keepAliveMs = 8000, speakUpdateTimeoutMs = 4000, langConfig, requireReadBack = true, log = () => {} }) {
    this.id = String(nextSessionId++);
    this.browser = browser;
    this.business = business;
    this.store = store;
    this.tools = tools;
    this.log = log;
    this.silenceMs = silenceMs;
    this.ready = false;
    this.closed = false;
    this.silenceStrikes = 0;
    this.pendingEnd = false;
    this.cancelled = new Set();
    this.lastOffered = [];
    this.history = []; // [{ role, content }] as Deepgram reports it, for the phone read back gate
    this.requireReadBack = requireReadBack;
    this.langConfig = langConfig || lang.config();
    this.language = 'en'; // language of the current voice
    this.speakUpdateTimeoutMs = speakUpdateTimeoutMs;
    this.speakWaiters = [];
    this.switching = Promise.resolve();

    this.toBrowser({ type: 'session', session_id: this.id, business: { id: business.id, name: business.name } });

    this.dg = new WebSocket(agentUrl || DEFAULT_AGENT_URL, { headers: { Authorization: `Token ${apiKey}` } });
    this.dg.on('open', () => {
      const settings = buildSettings({ business, now: store.now(), openNow: store.isOpenNow(business), langConfig: this.langConfig });
      this.dg.send(JSON.stringify(settings));
      this.keepAlive = setInterval(() => this.sendDg({ type: 'KeepAlive' }), keepAliveMs);
    });
    this.dg.on('message', (data, isBinary) => this.onDeepgram(data, isBinary));
    this.dg.on('unexpected-response', (_req, res) => {
      this.toBrowser({ type: 'Error', code: `HTTP_${res.statusCode}`, description: res.statusCode === 401 ? 'Deepgram rejected the API key.' : `Deepgram returned HTTP ${res.statusCode}.` });
      this.close();
    });
    this.dg.on('error', (e) => { this.toBrowser({ type: 'Error', code: 'UPSTREAM', description: e.message }); this.close(); });
    this.dg.on('close', (code, reason) => { this.toBrowser({ type: 'status', status: 'ended', code, reason: String(reason || '') }); this.close(); });

    browser.on('message', (data, isBinary) => {
      if (isBinary) { if (this.ready && this.dg.readyState === WebSocket.OPEN) this.dg.send(data); return; }
      let msg; try { msg = JSON.parse(data); } catch { return; }
      if (msg.type === 'hangup') this.close();
      // Typed input, for testing without a mic. Sent to Deepgram as InjectUserMessage.
      if (msg.type === 'text' && typeof msg.content === 'string' && msg.content.trim()) {
        this.resetSilence();
        this.sendDg({ type: 'InjectUserMessage', content: msg.content.trim().slice(0, 500) });
      }
    });
    browser.on('close', () => this.close());
  }

  toBrowser(obj) {
    if (this.browser.readyState === WebSocket.OPEN) this.browser.send(JSON.stringify(obj));
  }

  sendDg(obj) {
    if (this.dg && this.dg.readyState === WebSocket.OPEN) this.dg.send(JSON.stringify(obj));
  }

  onDeepgram(data, isBinary) {
    if (isBinary) { if (this.browser.readyState === WebSocket.OPEN) this.browser.send(data, { binary: true }); return; }
    let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
    // Amy's style rule: no em or en dashes in anything the caller or owner reads.
    // The model sometimes writes one anyway (TTS just pauses), so tidy the transcript.
    if (msg.type === 'ConversationText' && msg.role === 'assistant' && /[\u2013\u2014]/.test(msg.content || '')) {
      msg.content = noDashes(msg.content);
      msg.dash_removed = true;
    }
    if (FORWARD_TYPES.has(msg.type)) this.toBrowser(msg);
    switch (msg.type) {
      case 'SettingsApplied': this.ready = true; this.toBrowser({ type: 'status', status: 'live' }); break;
      case 'UserStartedSpeaking': this.resetSilence(); break;
      case 'ConversationText':
        if (typeof msg.content === 'string') this.history.push({ role: msg.role, content: msg.content, languages: msg.languages });
        if (msg.role === 'user') {
          this.resetSilence();
          // Early switch from the caller's own words, so the reply can already use the right voice.
          const l = lang.detectLanguage(msg);
          if (l && l !== this.language && lang.speakFor(l, this.langConfig)) this.switchLanguage(l, 'detected');
        }
        break;
      case 'SpeakUpdated': this.settleSpeak(true); break;
      case 'Error': this.settleSpeak(false, msg); break;
      case 'AgentStartedSpeaking': this.clearSilence(); break;
      case 'AgentAudioDone':
        if (this.pendingEnd) { setTimeout(() => this.close(), 1500); break; } // let the goodbye finish playing
        this.armSilence();
        break;
      case 'FunctionCallCancelled': for (const f of msg.functions || []) this.cancelled.add(f.id); break;
      case 'FunctionCallRequest': this.onFunctionCall(msg); break;
      default: break;
    }
  }

  // Switch the agent voice with UpdateSpeak and wait for SpeakUpdated (or an Error).
  switchLanguage(l, source) {
    const speak = lang.speakFor(l, this.langConfig);
    if (!speak) return Promise.resolve({ ok: false, error: 'NO_VOICE' });
    this.switching = this.switching.then(() => {
      if (l === this.language) return { ok: true, language: l, changed: false };
      const prev = this.language;
      this.language = l;
      this.sendDg({ type: 'UpdateSpeak', speak });
      return new Promise((resolve) => {
        const done = (ok, err) => {
          clearTimeout(timer);
          this.speakWaiters = this.speakWaiters.filter((w) => w !== done);
          if (!ok) this.language = prev;
          this.toBrowser({ type: 'language', language: this.language, requested: l, source, ok, ...(ok ? {} : { error: err && (err.description || err.code) }) });
          resolve(ok ? { ok: true, language: l, changed: true } : { ok: false, error: 'VOICE_SWITCH_FAILED', language: prev });
        };
        const timer = setTimeout(() => done(false, { description: 'timeout' }), this.speakUpdateTimeoutMs);
        this.speakWaiters.push(done);
      });
    });
    return this.switching;
  }

  settleSpeak(ok, err) {
    const w = this.speakWaiters[0];
    if (w) w(ok, err);
  }

  async languageTool(fn) {
    const v = this.tools.run('set_language', fn.arguments);
    if (!v.ok) return v;
    const l = v.language;
    // Only switch when the caller actually spoke that language (or asked for it).
    const lastUser = [...this.history].reverse().find((h) => h.role === 'user');
    if (lastUser && l !== this.language) {
      const said = lang.detectLanguage(lastUser);
      const asked = /spanish|espa[nñ]ol|chinese|mandarin|中文|普通话|国语|english|ingl[eé]s|英文|英语/i.test(String(lastUser.content || ''));
      if (said && said !== l && !asked) {
        return { ok: false, error: 'CALLER_LANGUAGE_MISMATCH', language: this.language, say: `The caller's last words were in ${lang.NAMES[said]}. Do not switch. Answer in ${lang.NAMES[said]}.` };
      }
    }
    if (!lang.speakFor(l, this.langConfig)) {
      return { ok: false, error: 'NO_VOICE', language: this.language, say: `There is no ${lang.NAMES[l]} voice set up. Apologize in simple English, say you can help in English${this.langConfig.sttMode !== 'flux-en' ? ' or Spanish' : ''}, and offer to take a message for a callback.` };
    }
    const r = await this.switchLanguage(l, 'tool');
    return r.ok ? { ok: true, language: l, say: `Voice is now ${lang.NAMES[l]}. Reply in ${lang.NAMES[l]}.` } : { ...r, say: `Could not switch voice. Keep replying in ${lang.NAMES[this.language]}.` };
  }

  // Writes that store a callback number only run after the agent has said that
  // exact number back and the caller has answered. Otherwise the tool tells the
  // model to read it back first. Returns null when the write may go ahead.
  readBackGate(fn) {
    if (!this.requireReadBack || !['book_appointment', 'take_message'].includes(fn.name)) return null;
    const args = safeParse(fn.arguments) || {};
    const phone = normPhone(fn.name === 'book_appointment' ? args.customer_phone : args.callback_phone);
    if (!phone) return null; // the tool itself rejects a bad number
    const r = phoneReadBack(this.history, phone);
    if (r.ok) return null;
    const groups = `${phone.slice(0, 3)}, ${phone.slice(3, 6)}, ${phone.slice(6)}`;
    return {
      ok: false, error: 'READ_BACK_PHONE_FIRST', reason: r.reason, phone_groups: groups,
      say: r.reason === 'NOT_CONFIRMED'
        ? 'Nothing was saved yet. Ask the caller if that number is right and wait for their answer, then call this again.'
        : `Nothing was saved yet. First read the callback number back digit by digit in three groups (${groups}), in the caller's language, and ask if it is right. Call this again only after they confirm.`,
    };
  }

  // Changing or cancelling a booking needs a caller answer after Mia has
  // described it: the lookup (or new time check) and the write cannot happen
  // in the same breath. Returns null when the write may go ahead.
  confirmGate(fn) {
    if (!['cancel_appointment', 'reschedule_appointment'].includes(fn.name)) return null;
    const after = this.history.slice(this.lastLookupAt || 0);
    const spoke = after.findIndex((h) => h.role === 'assistant');
    const answered = spoke >= 0 && after.slice(spoke + 1).some((h) => h.role === 'user');
    if (answered) return null;
    return {
      ok: false, error: 'CONFIRM_FIRST',
      say: fn.name === 'cancel_appointment'
        ? 'Nothing was cancelled yet. Tell the caller which booking you found, mention the cancellation policy, and ask if they want to cancel it. Call this again only after they say yes.'
        : 'Nothing was changed yet. Read the new day and time back to the caller and ask if that works. Call this again only after they say yes.',
    };
  }

  async onFunctionCall(msg) {
    for (const fn of msg.functions || []) {
      if (fn.client_side === false) continue; // Deepgram runs server side functions itself
      if (this.cancelled.has(fn.id)) continue;
      const result = fn.name === 'set_language' ? await this.languageTool(fn) : (this.readBackGate(fn) || this.confirmGate(fn) || this.tools.run(fn.name, fn.arguments));
      if (['find_appointment', 'check_availability'].includes(fn.name) && result && result.ok) this.lastLookupAt = this.history.length;
      if (fn.name === 'check_availability' && result.ok) this.lastOffered = result.slots || [];
      if (fn.name === 'end_call') this.pendingEnd = true;
      // Prototype: a warm transfer hands the line over, so Mia hangs up after saying so.
      if (fn.name === 'transfer_to_human' && result && result.status === 'transferring') this.pendingEnd = true;
      // Tool results are English JSON; remind the model which language to keep speaking.
      if (this.language !== 'en' && result && typeof result === 'object' && !result.reply_language) result.reply_language = lang.NAMES[this.language];
      this.toBrowser({ type: 'tool', name: fn.name, arguments: safeParse(fn.arguments), result });
      // A cancel can race with a fast handler; per the docs, send nothing for a cancelled id.
      if (this.cancelled.has(fn.id)) continue;
      this.sendDg({ type: 'FunctionCallResponse', id: fn.id, name: fn.name, content: JSON.stringify(result) });
    }
  }

  // Silence handling: check in once after silenceMs, then say goodbye and hang up.
  armSilence() {
    this.clearSilence();
    this.silenceTimer = setTimeout(() => {
      this.silenceStrikes += 1;
      const [checkIn, bye] = CHECK_IN[this.language] || CHECK_IN.en;
      if (this.silenceStrikes === 1) {
        this.sendDg({ type: 'InjectAgentMessage', message: checkIn });
      } else {
        this.pendingEnd = true;
        this.sendDg({ type: 'InjectAgentMessage', message: bye });
      }
    }, this.silenceMs);
  }

  resetSilence() { this.silenceStrikes = 0; this.clearSilence(); }
  clearSilence() { clearTimeout(this.silenceTimer); }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.clearSilence();
    clearInterval(this.keepAlive);
    for (const w of [...this.speakWaiters]) w(false, { description: 'call ended' });
    try { this.dg.close(); } catch { /* ignore */ }
    this.toBrowser({ type: 'status', status: 'ended' });
    try { this.browser.close(); } catch { /* ignore */ }
    this.log(`session ${this.id} closed`);
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return s; } }

module.exports = { noDashes, CallSession, DEFAULT_AGENT_URL };
