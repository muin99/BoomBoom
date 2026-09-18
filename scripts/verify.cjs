const assert=require('node:assert/strict');
const {replay}=require('../dist/replay');
function equivalent(a,b,path='directive') {
  if(typeof b==='number'){assert.equal(typeof a,'number',path);assert.ok(Math.abs(a-b)<=0.01,path);return;}
  if(b===null||typeof b!=='object'){assert.equal(a,b,path);return;}
  if(Array.isArray(b)){assert.ok(Array.isArray(a),path);assert.equal(a.length,b.length,path);b.forEach((v,i)=>equivalent(a[i],v,`${path}[${i}]`));return;}
  assert.deepEqual(Object.keys(a).filter(k=>k!=='explanation').sort(),Object.keys(b).filter(k=>k!=='explanation').sort(),path);
  for(const [k,v]of Object.entries(b)){if(k!=='explanation')equivalent(a[k],v,`${path}.${k}`);}
}
async function verifyCase(base,c){
  const started=performance.now();
  const response=await fetch(base+'/optimize-energy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(c.input),signal:AbortSignal.timeout(30000)});
  const p=await response.json();
  // Only controlled error codes are printed, never arbitrary provider/request data.
  if(response.status!==200){const code=/^[A-Z_]+$/.test(p.error)?p.error:'REQUEST_FAILED';throw new Error(`${c.id}: HTTP ${response.status} ${code}`);}
  equivalent(p.directive_interpretation,c.expected_output.directive_interpretation);
  replay(c.input,p,c.expected_output.directive_interpretation,0.01);
  assert.ok(Math.abs(p.total_cost_bdt-c.expected_output.total_cost_bdt)<=0.01,`${c.id}: optimal cost mismatch`);
  return {id:c.id,status:'passed',latency_ms:Math.round(performance.now()-started),cost_bdt:p.total_cost_bdt};
}
module.exports={verifyCase,equivalent};
