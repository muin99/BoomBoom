const { test }=require('node:test');
const assert=require('node:assert/strict');
const { Test }=require('@nestjs/testing');
const { AppModule }=require('../dist/app.module');
const { configureApp }=require('../dist/bootstrap');
const { NOTE_INTERPRETER }=require('../dist/interpretation/interfaces/note-interpreter.interface');
const { APP_CONFIG }=require('../dist/config/configuration.module');
const { readConfig }=require('../dist/config/environment');
const { OpenAiInterpreterService }=require('../dist/interpretation/services/openai-interpreter.service');
const { DirectiveValidatorService }=require('../dist/interpretation/services/directive-validator.service');
const { InterpretationCacheService }=require('../dist/interpretation/services/interpretation-cache.service');
const { PlanReplayService }=require('../dist/energy/services/plan-replay.service');
const pack=require('../BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json');

// Builds the real Nest application graph (real controllers/services/filters/Swagger), only
// swapping the NOTE_INTERPRETER or APP_CONFIG tokens when a test needs to control them.
async function createApp({ interpreter, config, quiet } = {}) {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (interpreter) builder.overrideProvider(NOTE_INTERPRETER).useValue(interpreter);
  if (config) builder.overrideProvider(APP_CONFIG).useValue(config);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ logger: quiet ? false : ['log', 'warn'] });
  configureApp(app);
  await app.init();
  return { app };
}

const planReplay = new PlanReplayService(new DirectiveValidatorService());
const replay = (scenario, raw, groundTruth) => planReplay.verify(scenario, raw, groundTruth);
const makeInterpreter = (config, client) =>
  new OpenAiInterpreterService(config, client, new DirectiveValidatorService(), new InterpretationCacheService(config));

test('HTTP contract: ten reference cases, Swagger, validation and sanitized failures',async t=>{
  let selected=pack.cases[0];
  const interpreter={ready:()=>true,interpret:async()=>structuredClone(selected.expected_output.directive_interpretation)};
  const {app}=await createApp({interpreter,quiet:true});await app.listen(0,'127.0.0.1');
  t.after(()=>app.close());const base=await app.getUrl();
  assert.deepEqual(await (await fetch(base+'/health')).json(),{status:'ok'});
  assert.equal((await fetch(base+'/docs')).status,200);
  const doc=await (await fetch(base+'/docs-json')).json();assert.ok(doc.paths['/optimize-energy'].post.responses['200']);
  assert.ok(doc.paths['/optimize-energy'].post.requestBody.content['application/json'].schema.properties.operator_notes);
  const post=body=>fetch(base+'/optimize-energy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  for(const c of pack.cases){selected=c;const r=await post(c.input);assert.equal(r.status,200);const p=replay(c.input,await r.json(),c.expected_output.directive_interpretation);assert.ok(Math.abs(p.total_cost_bdt-c.expected_output.total_cost_bdt)<0.01);}
  assert.equal((await post({})).status,400);
  const invalid=structuredClone(pack.cases[0].input);invalid.battery.initial_energy_kwh=999;assert.equal((await post(invalid)).status,422);
  const malformed=await fetch(base+'/optimize-energy',{method:'POST',headers:{'content-type':'application/json'},body:'{"bad":'});assert.equal(malformed.status,400);
  interpreter.interpret=async()=>{throw new Error('SECRET-sentinel-stack')};
  const failure=await post(pack.cases[0].input);assert.equal(failure.status,500);assert.ok(!(await failure.text()).includes('SECRET'));
  assert.equal((await fetch(base+'/health')).status,200);
});

test('missing key produces controlled readiness and optimization failures',async t=>{
  const {app}=await createApp({config:{...readConfig(),apiKey:''},quiet:true});await app.listen(0,'127.0.0.1');t.after(()=>app.close());
  const base=await app.getUrl();assert.equal((await fetch(base+'/health')).status,500);
  const r=await fetch(base+'/optimize-energy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(pack.cases[0].input)});
  assert.equal(r.status,500);assert.equal((await r.json()).error,'OPENAI_KEY_MISSING');
});

test('LLM path retries bad structured output, caches valid output, and coalesces requests',async()=>{
  const c=pack.cases[0];let calls=0;
  const fake={responses:{parse:async()=>{calls++;await new Promise(r=>setTimeout(r,10));return {status:'completed',output_parsed:{directive_interpretation:calls===1?[]:structuredClone(c.expected_output.directive_interpretation)}};}}};
  const interpreter=makeInterpreter({...readConfig(),apiKey:'test-only',attempts:2},fake);
  const results=await Promise.all(Array.from({length:8},()=>interpreter.interpret(c.input)));
  assert.equal(calls,2);assert.deepEqual(results[0],c.expected_output.directive_interpretation);
  results[0][0].explanation='changed';assert.notEqual((await interpreter.interpret(c.input))[0].explanation,'changed');assert.equal(calls,2);
  const changed=structuredClone(c.input);changed.battery.capacity_kwh++;await interpreter.interpret(changed);assert.equal(calls,3);
});

test('invalid output and provider authentication errors fail safely without fake interpretations',async()=>{
  const OpenAI=require('openai').default;
  for(const fake of [
    {responses:{parse:async()=>({status:'completed',output_parsed:{directive_interpretation:[]}})}},
    {responses:{parse:async()=>{throw new OpenAI.AuthenticationError(401,{message:'SECRET-key'},'SECRET-key',new Headers())}}},
  ]){
    const interpreter=makeInterpreter({...readConfig(),apiKey:'test-only'},fake);
    await assert.rejects(()=>interpreter.interpret(pack.cases[0].input),e=>!e.message.includes('SECRET'));
  }
});
