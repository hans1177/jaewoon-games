import{test}from'node:test';import{strict as a}from'node:assert';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const files=[["company-directive.json","637c640000bf82b5f64eeb8cfe6b063b1f329c54"],["company-learning/company-log-map.json","ce2fef934e6d8ae68ae52d1ab4a3ea5e1ea216e7"],["company-learning/company-architecture-map.json","3886c851a9f946c3d3d6544f993ea09e41a1a142"],["company-learning/security-immune-system.json","e5923872a432d544c433e17d9910b61b6138b153"]];
test('four documents retain their exact contents; only three compact summaries have a 1000-character cap',()=>{
for(const[p,id]of files){
const b=readFileSync(p),s=b.toString('utf8'),h=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
a.equal(h,id,p+' changed without approving new pinned blob');
const data=JSON.parse(s);
if(p==='company-directive.json'){
a.equal(data.authority,'MACHINE_EXECUTION_CONTRACT');
a.equal(data.policyDocument,'company-learning/platform-release-roadmap.json');
}else a.ok([...s].length<1000,p+' compact summary over 1000 characters');
}
});
