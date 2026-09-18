const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requestSchema, validateDirectives } = require('../dist/contracts');
const { optimize, InfeasibleScenario } = require('../dist/optimizer');
const { replay } = require('../dist/replay');
const pack = require('../BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json');
const noop = [{ note_index:0, applies:false, directive_type:'no_op', structured_adjustment:null, explanation:'Unrelated.' }];
const scenario = () => ({ scenario_id:'generated', operator_notes:['Administrative notice.'],
  hours:Array.from({length:24},(_,hour)=>({hour,demand_kwh:2,solar_kwh:0,tariff_bdt_per_kwh:1})),
  battery:{capacity_kwh:4,initial_energy_kwh:2,minimum_energy_kwh:0,max_charge_kwh_per_hour:2,max_discharge_kwh_per_hour:2} });

for (const c of pack.cases) test(`${c.id}: reference replay and optimal cost`, () => {
  const s=requestSchema.parse(c.input), d=validateDirectives({directive_interpretation:c.expected_output.directive_interpretation},s);
  replay(s,c.expected_output,d);
  const p=replay(s,optimize(s,d),d);
  assert.ok(Math.abs(p.total_cost_bdt-c.expected_output.total_cost_bdt)<0.001);
});

test('guardrails reject incorrect mappings, shapes, values, and ordering', () => {
  const s=scenario();
  const base={note_index:0,applies:true,directive_type:'solar_reduction',structured_adjustment:{hours:[12,13],factor:0.2},explanation:'Maintenance.'};
  const bad = [[],[base,base],[{...base,note_index:1}],[{...base,applies:false}],
    [{...base,directive_type:'invented'}],[{...base,structured_adjustment:null}],
    ...[[13,12],[12,12],[24],[-1],[1.5],[]].map(hours=>[{...base,structured_adjustment:{hours,factor:0.2}}]),
    ...[-1,1.1,Infinity,NaN,'0.2'].map(factor=>[{...base,structured_adjustment:{hours:[12],factor}}]),
    [{...base,structured_adjustment:{hours:[12],factor:0.2,demand_kwh:0}}],
    [{...base,directive_type:'minimum_battery_reserve',structured_adjustment:{hours:[12],minimum_energy_kwh:5}}],
    [{...noop[0],applies:true}], [{...noop[0],structured_adjustment:{hours:[1]}}],
  ];
  for(const entries of bad) assert.throws(()=>validateDirectives({directive_interpretation:entries},s));
});

test('strict request rejects malformed hours, empty notes, strings, extras and nonfinite numbers', () => {
  for(const mutate of [s=>s.hours.pop(),s=>s.hours[1].hour=0,s=>s.operator_notes=[' '],
    s=>s.operator_notes=[],s=>s.operator_notes=['a','b','c','d'],s=>s.hours[0].demand_kwh='2',
    s=>s.hours[0].solar_kwh=Infinity,s=>s.battery.capacity_kwh=-1,s=>s.extra=true]) {
    const s=scenario();mutate(s);assert.equal(requestSchema.safeParse(s).success,false);
  }
});

test('unsorted request hours are normalized without mutating input',()=>{
  const s=scenario();s.hours.reverse();const copy=structuredClone(s);
  replay(s,optimize(s,noop));assert.deepEqual(s,copy);
});

test('zero battery, zero tariffs, excess solar and fractional inputs remain valid',()=>{
  for(const mode of ['zero','free','surplus','fractional']) {
    const s=scenario();
    if(mode==='zero') Object.keys(s.battery).forEach(k=>s.battery[k]=0);
    if(mode==='free') s.hours.forEach(h=>h.tariff_bdt_per_kwh=0);
    if(mode==='surplus') s.hours.forEach(h=>h.solar_kwh=100);
    if(mode==='fractional') { s.hours.forEach(h=>{h.demand_kwh=2.123456;h.solar_kwh=0.56789;h.tariff_bdt_per_kwh=7.89123});s.battery.initial_energy_kwh=1.12345; }
    const p=replay(s,optimize(s,noop));
    if(['free','surplus'].includes(mode)) assert.equal(p.total_cost_bdt,0);
  }
});

test('combined hard constraints and full outages are enforced',()=>{
  const s=scenario();s.operator_notes=['a','b','c'];
  const ds=[
    {note_index:0,applies:true,directive_type:'no_charge_window',structured_adjustment:{hours:[0,1,2,23]},explanation:'a'},
    {note_index:1,applies:true,directive_type:'no_discharge_window',structured_adjustment:{hours:[0,1,2,23]},explanation:'b'},
    {note_index:2,applies:true,directive_type:'minimum_battery_reserve',structured_adjustment:{hours:[18,19],minimum_energy_kwh:3},explanation:'c'},
  ];
  replay(s,optimize(s,ds),ds);
});

test('infeasibility is detected instead of silently relaxing a grid cap',()=>{
  const s=scenario();s.battery.max_discharge_kwh_per_hour=0;
  const d=[{note_index:0,applies:true,directive_type:'max_grid_window',structured_adjustment:{hours:[18],max_grid_kwh:0},explanation:'Outage.'}];
  assert.throws(()=>optimize(s,d),InfeasibleScenario);
});

test('replay rejects tampered totals, state, solar and missed ground-truth directives',()=>{
  const s=scenario(), good=optimize(s,noop);
  for(const mutate of [p=>p.total_cost_bdt++,p=>p.hourly_plan[0].solar_used_kwh=999,
    p=>p.hourly_plan[0].battery_energy_after_kwh++,p=>p.hourly_plan[0].grid_kwh++,
    p=>p.hourly_plan[1].hour=0,p=>p.hourly_plan[0].battery_kwh=999]){
    const p=structuredClone(good);mutate(p);assert.throws(()=>replay(s,p));
  }
  assert.throws(()=>replay(s,good,[{note_index:0,applies:true,directive_type:'max_grid_window',structured_adjustment:{hours:Array.from({length:24},(_,h)=>h),max_grid_kwh:0},explanation:'Outage.'}]));
});

// An independent integer-state dynamic program is an exact oracle for these integral
// network-flow scenarios. It does not call the LP or share its constraint construction.
test('100 unseen scenarios match an independent dynamic-programming cost oracle',()=>{
  let seed=20260918;
  const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
  for(let trial=0;trial<100;trial++){
    const s=scenario();s.battery.capacity_kwh=2+rand(7);s.battery.initial_energy_kwh=rand(s.battery.capacity_kwh+1);
    s.battery.max_charge_kwh_per_hour=rand(4);s.battery.max_discharge_kwh_per_hour=rand(4);
    s.hours.forEach(h=>{h.demand_kwh=rand(8);h.solar_kwh=rand(10);h.tariff_bdt_per_kwh=rand(12)});
    let costs=new Map([[s.battery.initial_energy_kwh,0]]);
    for(const h of s.hours){const next=new Map();for(const [before,cost] of costs){
      for(let after=0;after<=s.battery.capacity_kwh;after++){
        const delta=after-before;
        if(delta>s.battery.max_charge_kwh_per_hour||-delta>s.battery.max_discharge_kwh_per_hour||h.demand_kwh+delta<0)continue;
        const candidate=cost+Math.max(0,h.demand_kwh+delta-h.solar_kwh)*h.tariff_bdt_per_kwh;
        next.set(after,Math.min(next.get(after)??Infinity,candidate));
      }
    }costs=next;}
    const p=replay(s,optimize(s,noop));assert.ok(Math.abs(p.total_cost_bdt-costs.get(s.battery.initial_energy_kwh))<1e-5,`trial ${trial}`);
  }
});
