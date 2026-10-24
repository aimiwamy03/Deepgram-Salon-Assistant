// Print one recorded call as a readable timeline: node scripts/harness/show.js live-results/<tag>/<id>-1.json
const r = require(require('path').resolve(process.argv[2]));
const ev = [...r.transcript.map((x) => ({ t: x.t, s: `${x.role === 'user' ? 'CALLER' : 'MIA   '}: ${x.content}` })),
  ...r.tools.map((x) => ({ t: x.t, s: `TOOL  ${x.name} ${JSON.stringify(x.args)} -> ${JSON.stringify(x.result).slice(0, 220)}` }))].sort((a, b) => a.t - b.t);
for (const e of ev) console.log((e.t / 1000).toFixed(1).padStart(6), e.s);
if (r.notes.length) console.log('notes:', r.notes.join('; '));
console.log('ended by agent:', r.endedByAgent);
