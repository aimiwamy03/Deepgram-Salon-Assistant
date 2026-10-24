# AI Receptionist Prototype (Deepgram Voice Agent)

A browser mic demo of Mia, a virtual front desk for barbershops, salons, and med spas. She books appointments (service, time, stylist, read back, confirm) and finds nearby barbers (by neighborhood or ZIP, open now, price, rating). Data is fictional and lives in memory, so restarting the server resets all bookings.

See `DESIGN.md` for call flows, tool schemas, persona, and edge cases.

## Run it

Needs Node 18 or newer and Chrome (or another Chromium browser).

```bash
cd /workspace/receptionist
npm install
export DEEPGRAM_API_KEY=your_key_here    # or put it in .env and use: npm run start:env
npm start
```

Open http://127.0.0.1:3000, pick which business Mia answers for, click **Start call**, allow the mic, and talk. Use headphones so she does not hear herself.

Things to try:

- "I'd like a skin fade tomorrow afternoon." Then pick a time, give a name and number, and say yes.
- "Are there any barbershops open now near 94609?"
- Click **Another caller takes the first offered slot** after Mia offers times, then ask for that time. She should say it was just taken and offer others.
- "Can I talk to a real person?" (try after hours to get the message flow)
- Pick Serenity Skin Med Spa and ask "Is Botox safe while pregnant?" She should decline to advise and offer a consult.

Optional settings: `PORT` (default 3000), `HOST` (default 127.0.0.1, local only), `VOICE_EN` (default `aura-2-helena-en`), `LLM_MODEL` (default `gpt-4.1-mini`).

### Languages

Mia answers in English, Spanish or Mandarin, following the caller. Try "Hola, quisiera un corte clásico mañana" or "你好，你们周六营业到几点？". The page shows "Voice switched to Spanish" when the voice changes. Settings:

- `STT_MODE`: `nova3-multi` (default, English, Spanish, Mandarin and more), `flux-multi` (English and Spanish, better turn taking, no Mandarin), `flux-en` (English only, the original setup).
- `VOICE_ES`: Spanish voice, default `aura-2-selena-es`.
- `MANDARIN_TTS`: `cartesia` (default, Deepgram managed, no extra key), `eleven_labs` (needs `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`), `open_ai` (needs `OPENAI_API_KEY`), or `off`. `CARTESIA_VOICE_ZH` picks the Cartesia voice.

See DESIGN.md section 3a for how switching works and the tradeoffs.

### Booking more than one service

Ask for two services with one stylist ("a skin fade for me and a kids cut for my son with Dani"). Mia books them back to back as one block and never offers the same start time for both.

## Tests

```bash
npm test                    # tools, booking and double booking, Settings schema, proxy with a fake Deepgram, server boot
npm run validate:settings   # Settings for each business against Deepgram's published AsyncAPI schema
npm run smoke:live          # one short real call using DEEPGRAM_API_KEY (uses a little credit)
```

`npm run smoke:live -- "line one|line two|line three" fade-district` injects typed caller lines one turn at a time.

### Live scenario harness (uses credit)

```bash
node scripts/live-scenarios.js                    # 25 scripted text calls, auto graded
node scripts/live-scenarios.js --audio            # plus 4 spoken calls (caller speech made with Aura / Cartesia TTS, streamed as audio)
node scripts/live-scenarios.js --only readback-basic,race-same-slot --runs 3 --parallel 3 --tag mytag
node scripts/live-scenarios.js --group 8,12       # one scenario group
node scripts/harness/show.js live-results/mytag/readback-basic-1.json   # readable timeline of one call
```

Each call runs against an in process server with a fixed simulated clock (Fri 2026-10-23 11:00 PT) and fresh mock data. The grader checks tool calls, read backs, spoken phrases, language and voice, usted, booking state, and global rules (no dashes, no errors, no internal ids, every caller turn answered). Results go to `live-results/<tag>/` (one JSON per call plus `summary.json`). Every connection minute is logged to `live-results/usage.jsonl`, and `--cap-min` (default 55) stops before the total would cross it. `--baseline` turns off the server side read back gate to measure the bare model. Scenarios live in `scripts/harness/scenarios.js` and `audio-scenarios.js`. The latest results are in `live-results/REPORT.md`.

## Cost

Deepgram bills the Voice Agent API by WebSocket connection time. Per deepgram.com/pricing (checked 2026-10-23): new accounts get a $200 free credit with no card; the Standard tier (which `gpt-4.1-mini` and Aura-2 fall under) is $0.075 per minute. The Voice Agent price has no STT line, so the multilingual STT models should not change it (confirm in the console). Hanging up closes the connection and stops billing.

## Files

- `server.js` web server and `/call` WebSocket
- `src/session.js` bridge between the browser and Deepgram, tool dispatch, silence handling
- `src/tools.js` tool schemas and handlers
- `src/store.js` in memory slots and bookings
- `src/prompt.js`, `src/settings.js` system prompt, greeting, Settings message
- `src/languages.js` STT mode, voices per language, Mandarin provider, language detection
- `public/digits.js` display only conversion of spoken numbers to digits in the transcript
- `public/` the demo page
- `data/` mock data and its generator
- `spec/` saved copies of the Deepgram docs this was built against
- `scripts/` schema validator and live smoke test
