import{test}from'node:test';import{strict as a}from'node:assert';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
// Owner-reviewed exact restored companion blobs; all byte and authority assertions remain active.
const files=[["company-directive.json","0d17f6f1879348ce4d229c926ef64fa9b1374e54"],["company-learning/company-log-map.json","e16dc62d01410f411cdb7100135c93fa160bcd12"],["company-learning/company-architecture-map.json","723d46c702a83edc8bc21cb55eff97d537fc14bd"],["company-learning/security-immune-system.json","72e8117cd649f2c8c5c6a06c33881f68454f5e08"]];
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
