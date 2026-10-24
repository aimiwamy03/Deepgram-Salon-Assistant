// Live scenario harness: scripted multi turn calls against the real Deepgram
// Voice Agent through our own server, auto graded.
//
//   node scripts/live-scenarios.js [--only a,b] [--group 1,8] [--runs 2] [--parallel 3]
//                                  [--tag name] [--cap-min 55] [--baseline] [--audio]
//
// Needs DEEPGRAM_API_KEY in env (never printed). Each call is a few cents.
// Results: live-results/<tag>/<scenario>-<run>.json and summary.json.
// Connection seconds go to live-results/usage.jsonl; the run stops before it
// would cross --cap-min total minutes.
const fs = require('fs');
const path = require('path');
const { createServer } = require('../server');
const { runCall, createBarrier, recordUsage, usedSeconds } = require('./harness/call');
const { grade } = require('./harness/checks');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes(`--${k}`);
const RUNS = Number(opt('runs', 1));
const PAR = Number(opt('parallel', 3));
const CAP_S = Number(opt('cap-min', 55)) * 60;
const TAG = opt('tag', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
const OUT = path.join(__dirname, '..', 'live-results', TAG);

function clockAt(local) {
  const base = Date.parse(`${local}:00-07:00`); // Pacific daylight time in Oct 2026
  const start = Date.now();
  return () => new Date(base + (Date.now() - start));
}

async function runScenario(sc, run) {
  const clock = clockAt(sc.at || '2026-10-23T11:00');
  const app = createServer({ clock, requireReadBack: !flag('baseline'), ...(sc.opts || {}) });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const port = app.server.address().port;
  const quietLog = console.log; // the server logs "session closed"; keep it
  try {
    if (sc.setup) sc.setup(app.store);
    const n = sc.parallel || 1;
    const barrier = createBarrier(n);
    const turns = typeof sc.turns === 'function' ? null : (sc.audio ? await sc.audio() : sc.turns);
    const recs = await Promise.all([...Array(n)].map((_, i) => runCall({
      port, business: sc.business || 'fade-district', label: `${sc.id}#${run}${n > 1 ? `.${i}` : ''}`,
      turns: turns || sc.turns(i, barrier), quiet: flag('quiet'), ...(sc.callOpts || {}),
    })));
    const results = [];
    for (const rec of recs) {
      rec.store = app.store;
      recordUsage({ kind: 'call', scenario: sc.id, run, seconds: rec.elapsed_s });
      const g = grade(rec, [...(sc.checks || []), ...(sc.checksAll || [])]);
      results.push({ label: rec.label, ...g });
    }
    if (sc.checksPair) {
      const extra = sc.checksPair(recs);
      results.push({ label: `${sc.id}#${run}.pair`, pass: extra.every((x) => x.pass), results: extra });
    }
    fs.mkdirSync(OUT, { recursive: true });
    recs.forEach((rec, i) => {
      const { store, audioT, ...keep } = rec;
      fs.writeFileSync(path.join(OUT, `${sc.id}-${run}${n > 1 ? `.${i}` : ''}.json`), JSON.stringify({ ...keep, grade: results[i] }, null, 2));
    });
    return { id: sc.id, group: sc.group, run, pass: results.every((r) => r.pass), results, seconds: recs.reduce((s, r) => s + r.elapsed_s, 0) };
  } finally {
    console.log = quietLog;
    await new Promise((r) => app.server.close(r));
  }
}

(async () => {
  if (!process.env.DEEPGRAM_API_KEY) { console.error('DEEPGRAM_API_KEY not set'); process.exit(2); }
  let list = require('./harness/scenarios').scenarios;
  if (flag('audio') || opt('only', '').includes('audio')) list = list.concat(require('./harness/audio-scenarios').scenarios);
  const only = opt('only'); const group = opt('group');
  if (only) list = list.filter((s) => only.split(',').includes(s.id));
  if (group) list = list.filter((s) => group.split(',').map(Number).includes(s.group));
  const jobs = [];
  for (let r = 1; r <= RUNS; r++) for (const s of list) jobs.push([s, r]);
  console.log(`${jobs.length} runs, ${PAR} at a time. Used so far: ${(usedSeconds() / 60).toFixed(1)} min, cap ${CAP_S / 60} min.`);
  const done = [];
  let next = 0; let stopped = false;
  async function worker() {
    while (next < jobs.length && !stopped) {
      const [s, r] = jobs[next++];
      const est = (s.parallel || 1) * 75;
      if (usedSeconds() + est > CAP_S) { stopped = true; console.log(`STOP: budget cap would be crossed before ${s.id}#${r}`); break; }
      try { done.push(await runScenario(s, r)); } catch (e) { done.push({ id: s.id, run: r, pass: false, results: [{ label: s.id, pass: false, results: [{ name: 'harness', pass: false, detail: e.message }] }] }); }
      const last = done[done.length - 1];
      console.log(`${last.pass ? 'PASS' : 'FAIL'} ${s.id}#${r} (${(last.seconds || 0).toFixed(0)} s)`);
      for (const res of last.results) for (const c of res.results) if (!c.pass) console.log(`     x ${res.label}: ${c.name} :: ${c.detail}`);
    }
  }
  await Promise.all([...Array(PAR)].map(worker));
  fs.mkdirSync(OUT, { recursive: true });
  const summaryFile = path.join(OUT, 'summary.json');
  const prev = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : [];
  fs.writeFileSync(summaryFile, JSON.stringify([...prev, ...done.map(({ id, group, run, pass, seconds, results }) => ({ id, group, run, pass, seconds, failed: results.flatMap((r) => r.results.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`)) }))], null, 2));
  const byId = {};
  for (const d of done) (byId[d.id] = byId[d.id] || []).push(d.pass ? 'P' : 'F');
  console.log('\nSUMMARY');
  for (const [id, v] of Object.entries(byId)) console.log(`${v.join('')}  ${id}`);
  console.log(`Total used: ${(usedSeconds() / 60).toFixed(1)} min`);
  setTimeout(() => process.exit(0), 200);
})();
