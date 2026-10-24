// Validates our Settings message (and our FunctionCallResponse shape) against
// Deepgram's published AsyncAPI spec for /v1/agent/converse, saved from
// https://developers.deepgram.com/reference/voice-agent/voice-agent.md
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');

function loadSpecSchemas() {
  const md = fs.readFileSync(path.join(__dirname, '..', 'spec', 'voice-agent-asyncapi.md'), 'utf8');
  const m = md.match(/```yaml\n([\s\S]*?)```/);
  if (!m) throw new Error('AsyncAPI yaml block not found in spec file');
  const doc = yaml.load(m[1]);
  return doc;
}

function makeValidators() {
  const doc = loadSpecSchemas();
  const ajv = new Ajv({ strict: false, allErrors: true });
  ajv.addFormat('double', true);
  ajv.addFormat('binary', true);
  ajv.addFormat('uuid', /^[0-9a-f-]{36}$/i);
  ajv.addSchema({ $id: 'dg', components: doc.components }, 'dg');
  const get = (name) => ajv.getSchema(`dg#/components/schemas/${name}`);
  return {
    doc,
    settings: get('AgentV1_AgentV1Settings'),
    functionCallResponse: get('AgentV1_AgentV1SendFunctionCallResponse'),
    functionCallRequest: get('AgentV1_AgentV1FunctionCallRequest'),
    keepAlive: get('AgentV1_AgentV1KeepAlive'),
    injectAgentMessage: get('AgentV1_AgentV1InjectAgentMessage'),
    updateSpeak: get('AgentV1_AgentV1UpdateSpeak'),
  };
}

if (require.main === module) {
  const { buildSettings } = require('../src/settings');
  const { createStore, loadMockData } = require('../src/store');
  const store = createStore(loadMockData());
  const v = makeValidators();
  let failed = 0;
  for (const b of store.businesses) {
    const s = buildSettings({ business: b, now: store.now(), openNow: store.isOpenNow(b) });
    const ok = v.settings(s);
    console.log(`${ok ? 'PASS' : 'FAIL'} Settings for ${b.id} (prompt ${s.agent.think.prompt.length} chars, ${s.agent.think.functions.length} functions)`);
    if (!ok) { failed++; console.log(JSON.stringify(v.settings.errors, null, 2)); }
  }
  process.exit(failed ? 1 : 0);
}

module.exports = { makeValidators };
