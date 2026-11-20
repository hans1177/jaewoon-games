import{test}from'node:test';import{strict as a}from'node:assert';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const files=[["company-directive.json","0d17f6f1879348ce4d229c926ef64fa9b1374e54"],["company-learning/company-log-map.json","e16dc62d01410f411cdb7100135c93fa160bcd12"],["company-learning/company-architecture-map.json","3e2dcd528dea7a21d5c709e250d7f8ba2b48df2f"],["company-learning/security-immune-system.json","63e6c91b5f93b98f492a7a75a395753b2f3db742"]];
test('four canonical companion documents retain exact restored blob fingerprints',()=>{
for(const[p,id]of files){
const b=readFileSync(p),s=b.toString('utf8'),h=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
a.equal(h,id,p+' changed without approving new pinned blob');
const data=JSON.parse(s);
if(p==='company-directive.json'){
a.equal(data.authority,'MACHINE_EXECUTION_CONTRACT');
a.equal(data.policyDocument,'company-learning/platform-release-roadmap.json');
a.ok(s.includes('"robloxStudioRequired": true'),'owner-approved Studio release evidence must remain mandatory');
 }else if(p.includes('company-log-map')){
a.equal(data.authority,'MACHINE_EXECUTION_LOG_MAP');
a.equal(data.centralPolicy,'company-learning/platform-release-roadmap.json');
a.equal(data.requiredForAllWorkers,true);
}else if(p.includes('company-architecture-map')){
a.equal(data.authority,'MACHINE_EXECUTION_ARCHITECTURE_MAP');
a.equal(data.centralPolicy,'company-learning/platform-release-roadmap.json');
a.equal(data.branches.main.directGameWorkerWrite,false);
a.equal(data.constitutionalEnforcement.subordinateOverrideForbidden,true);
}else{
a.equal(data.defaultTrust,'DENY_OR_QUARANTINE_UNTIL_VERIFIED');
a.equal(data.centralRoadmapBinding.centralPolicy,'company-learning/platform-release-roadmap.json');
a.equal(data.containment.unverifiedExternalPayloadMayNotEnterCanonicalLearning,true);
}
}
});
