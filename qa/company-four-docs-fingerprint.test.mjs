import{test}from'node:test';import{strict as a}from'node:assert';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const files=[["company-directive.json","d651048edf567681cfd1e6160fd015abb91f83b9"],["company-learning/company-log-map.json","e16dc62d01410f411cdb7100135c93fa160bcd12"],["company-learning/company-architecture-map.json","57cfaeeb2821077456973c874245db4987005b71"],["company-learning/security-immune-system.json","4711d4456c77268d1bdf21af38f5ae06b71109f5"]];
test('four company machine documents match approved Git blob IDs',()=>{
for(const[p,id]of files){const b=readFileSync(p),h=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');a.equal(h,id,p+' changed without reapproval');a.doesNotThrow(()=>JSON.parse(b.toString('utf8')),p);}
});
