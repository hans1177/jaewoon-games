import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateSharedWorkerContext,compileOwnerCanonicalConstitution,RETAINED_DOCUMENTS} from '../tools/company-shared-context.mjs';
import {enforceConstitution} from '../tools/company-constitution-enforcer.mjs';

const repoRoot=path.resolve(import.meta.dirname,'..');
function temporary(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'retained-four-docs-'));
  for(const [,rel] of RETAINED_DOCUMENTS){
    const target=path.join(root,rel);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(path.join(repoRoot,rel),target);
  }
  return root;
}
function check(root,fn){
  try {return fn();}finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('the four shrunk documents are syntactically valid, under 1000 chars and integrity only',()=>{
  const r=validateSharedWorkerContext({root:repoRoot});
  assert.equal(r.pass,true);
  assert.equal(r.scope,'RETAINED_FOUR_DOCUMENT_INTEGRITY_ONLY');
  assert.equal(r.policyAuthorityVerified,false);
  assert.equal(r.sourceWriteAuthorized,false);
  assert.equal(r.releaseAuthorized,false);
  assert.equal(Object.keys(r.hashes).length,4);
});
test('missing or malformed retained document is rejected',()=>{
  check(temporary(),root=>{
    fs.rmSync(path.join(root,'company-learning/company-log-map.json'));
    assert.throws(()=>validateSharedWorkerContext({root}),/LOG_DOCUMENT_MISSING_OR_INVALID/);
  });
  check(temporary(),root=>{
    fs.writeFileSync(path.join(root,'company-directive.json'),'{broken');
    assert.throws(()=>validateSharedWorkerContext({root}),/DIRECTIVE_DOCUMENT_MISSING_OR_INVALID/);
  });
});
test('oversize and unexpected legacy schemas are rejected, never silently accepted',()=>{
  check(temporary(),root=>{
    const p=path.join(root,'company-learning/company-architecture-map.json');
    fs.appendFileSync(p,' '.repeat(1100));
    assert.throws(()=>validateSharedWorkerContext({root}),/ARCHITECTURE_DOCUMENT_TOO_LARGE/);
  });
  check(temporary(),root=>{
    const p=path.join(root,'company-learning/company-log-map.json');
    const doc=JSON.parse(fs.readFileSync(p,'utf8'));
    doc.status='LEGACY_EXECUTABLE_CONTRACT';
    fs.writeFileSync(p,JSON.stringify(doc));
    assert.throws(()=>validateSharedWorkerContext({root}),/LOG_DOCUMENT_CONTRACT_INVALID/);
  });
});
test('hash pins work and a separate canonical roadmap does not invalidate four-document integrity',()=>{
  check(temporary(),root=>{
    assert.throws(()=>validateSharedWorkerContext({root,expectedSecuritySha256:'0'.repeat(64)}),/SECURITY_SHA_MISMATCH/);
  });
  check(temporary(),root=>{
    assert.equal(validateSharedWorkerContext({root}).canonicalRoadmapPresent,false);
    const p=path.join(root,'company-learning/platform-release-roadmap.json');
    fs.writeFileSync(p,JSON.stringify({ownerCanonicalRules:{}}));
    const result=validateSharedWorkerContext({root});
    assert.equal(result.pass,true);
    assert.equal(result.canonicalRoadmapPresent,true);
    assert.equal(result.policyAuthorityVerified,false);
  });
});
test('four-document integrity alone does not certify gameplay release or owner policy',()=>{
  const ctx=validateSharedWorkerContext({root:repoRoot});
  assert.equal(ctx.pass,true);
  assert.equal(ctx.policyAuthorityVerified,false);
  assert.equal(ctx.sourceWriteAuthorized,false);
  assert.equal(ctx.releaseAuthorized,false);
  const unrelated=enforceConstitution({root:repoRoot,policy:{},phase:'policy-qa'});
  assert.equal(unrelated.pass,false);
  assert.ok(unrelated.errors.some(e=>e.includes('CANONICAL_CONSTITUTION_INVALID')));
});
test('canonical compiler derives enabled rules in implementation order and auto-binds future rule IDs',()=>{
  const ownerCanonicalRules={
    version:2,authority:'OWNER_DIRECTIVE_TEST',constitutionalAuthority:'VERIFIED_TEST',
    implementationOrder:['RULE_1','RULE_2'],
    constitutionalBinding:{ruleEnforcementSchemaVersion:1},
    rule2:{id:'RULE_2_OTHER',enabled:true,machineEnforcement:{schemaVersion:1,assertions:[{code:'OK',operator:'EQ',path:'enabled',expected:true}]}},
    rule1:{id:'RULE_1_PRIMARY',enabled:true,machineEnforcement:{schemaVersion:1,assertions:[{code:'OK',operator:'EQ',path:'enabled',expected:true}]}},
    rule3:{id:'RULE_3_NEW',enabled:true,machineEnforcement:{schemaVersion:1,assertions:[{code:'OK',operator:'EQ',path:'enabled',expected:true}]}}
  };
  const result=compileOwnerCanonicalConstitution({ownerCanonicalRules});
  assert.equal(result.valid,true,result.errors.join(','));
  assert.deepEqual(result.orderedRuleIds,['RULE_1_PRIMARY','RULE_2_OTHER','RULE_3_NEW']);
  assert.equal(result.rules.length,3);
  assert.equal(result.rules.every(r=>r.fingerprint?.length===64),true);
  const changed=structuredClone(ownerCanonicalRules);
  changed.rule3.machineEnforcement.assertions[0].expected=false;
  assert.notEqual(compileOwnerCanonicalConstitution({ownerCanonicalRules:changed}).fingerprint,result.fingerprint);
});
test('missing policy or missing machine assertions never generates a fake compiler PASS',()=>{
  assert.equal(compileOwnerCanonicalConstitution({}).valid,false);
  const missing=compileOwnerCanonicalConstitution({ownerCanonicalRules:{
    version:1,implementationOrder:['RULE_1'],constitutionalBinding:{},
    rule1:{id:'RULE_1_EMPTY',enabled:true}
  }});
  assert.equal(missing.valid,false);
  assert.ok(missing.errors.some(x=>x.includes('MACHINE_ENFORCEMENT_MISSING')));
});
