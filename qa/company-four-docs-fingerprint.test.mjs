import{test}from'node:test';import{strict as a}from'node:assert';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const files=[["company-directive.json","98a184d8d9dee60014c7ea89431b94e6c2ee9081"],["company-learning/company-log-map.json","ce2fef934e6d8ae68ae52d1ab4a3ea5e1ea216e7"],["company-learning/company-architecture-map.json","3886c851a9f946c3d3d6544f993ea09e41a1a142"],["company-learning/security-immune-system.json","e5923872a432d544c433e17d9910b61b6138b153"]];
test('four company machine documents stay under 1000 chars and content-locked',()=>{
for(const[p,id]of files){const b=readFileSync(p),s=b.toString('utf8'),h=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');a.ok([...s].length<1000,p+' too long');a.equal(h,id,p+' changed without approving new pinned blob');a.doesNotThrow(()=>JSON.parse(s),p);}
});
