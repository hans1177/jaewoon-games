import{test}from'node:test';import{strict as a}from'node:assert';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const files=[["company-directive.json","0d17f6f1879348ce4d229c926ef64fa9b1374e54"],["company-learning/company-log-map.json","c3798271b48f53394f4783271b9b943d63bf5721"],["company-learning/company-architecture-map.json","4940b0e3781d549c332013169822e363910f3d96"],["company-learning/security-immune-system.json","a489d501083f8b4c1ec9e333f99844563c14e542"]];
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
a.equal(data.vibeEngineImprovementEvidenceContract?.noWebGameProduction,true);
}else if(p.includes('company-architecture-map')){
a.equal(data.authority,'MACHINE_EXECUTION_ARCHITECTURE_MAP');
a.equal(data.centralPolicy,'company-learning/platform-release-roadmap.json');
a.equal(data.branches.main.directGameWorkerWrite,false);
a.equal(data.constitutionalEnforcement.subordinateOverrideForbidden,true);
a.equal(data.vibeEngineImprovementTopology?.newQueue,false);
}else{
a.equal(data.defaultTrust,'DENY_OR_QUARANTINE_UNTIL_VERIFIED');
a.equal(data.centralRoadmapBinding.centralPolicy,'company-learning/platform-release-roadmap.json');
a.equal(data.containment.unverifiedExternalPayloadMayNotEnterCanonicalLearning,true);
a.equal(data.vibeEngineImprovementSecurity?.webGameAuthoringForbidden,true);
}
}
});
