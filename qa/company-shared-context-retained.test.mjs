// 파일명: qa/company-shared-context-retained.test.mjs
// 실제 중앙문서와 작업기 연결, 해시 및 잠금 실패를 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSharedWorkerContext,verifyPinnedSharedWorkerContext,compileOwnerCanonicalConstitution} from '../tools/company-shared-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const policyPath='company-learning/platform-release-roadmap.json';
const docs=[policyPath,'company-learning/company-log-map.json','company-learning/company-architecture-map.json','company-learning/security-immune-system.json'];
const policy=JSON.parse(fs.readFileSync(path.join(root,policyPath),'utf8'));
const launchers=policy.developmentLifecycleMachine.sharedWorkerContext.workerLauncherWorkflows;
function snapshot(fn){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'canonical-context-'));
  const previous=process.cwd();
  try{
    for(const file of [...docs,...launchers]){
      const dest=path.join(tmp,file);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.copyFileSync(path.join(root,file),dest);
    }
    process.chdir(tmp);
    return fn();
  }finally{process.chdir(previous);fs.rmSync(tmp,{recursive:true,force:true});}
}
function change(file,mutate){const data=JSON.parse(fs.readFileSync(file,'utf8'));mutate(data);fs.writeFileSync(file,JSON.stringify(data));}
test('canonical preflight validates actual four documents and every active launcher',()=>{
  const ctx=validateSharedWorkerContext();
  assert.equal(ctx.pass,true);
  assert.equal(ctx.policyVersion,policy.version);
  assert.equal(ctx.workerLaunchersValidated,launchers.length);
  assert.equal(ctx.architectureProjection.valid,true);
  assert.equal(ctx.constitution.automaticContractBinding,true);
  assert.equal(Object.keys(ctx.hashes).length,4);
  assert.ok(Object.values(ctx.hashes).every(h=>/^[a-f0-9]{64}$/.test(h)));
  assert.equal(ctx.releaseAuthorized,undefined);
});
test('pinned context rejects any mismatched document hash',()=>{
  const ctx=validateSharedWorkerContext();
  const pins={expectedPolicySha256:ctx.hashes.policySha256,expectedLogMapSha256:ctx.hashes.logMapSha256,expectedArchitectureSha256:ctx.hashes.architectureSha256,expectedSecurityPolicySha256:ctx.hashes.securityPolicySha256};
  assert.equal(verifyPinnedSharedWorkerContext(pins).pass,true);
  for(const key of Object.keys(pins))assert.throws(()=>verifyPinnedSharedWorkerContext({...pins,[key]:'0'.repeat(64)}),/PINNED_HASH_MISMATCH/);
});
test('unlocked sequence is rejected',()=>snapshot(()=>{change(policyPath,d=>{d.finalDevelopmentLock.status='UNLOCKED';});assert.throws(()=>validateSharedWorkerContext(),/FINAL_DEVELOPMENT_LOCK_INVALID/);}));
test('weakened security default is rejected',()=>snapshot(()=>{change(docs[3],d=>{d.defaultTrust='ALLOW';});assert.throws(()=>validateSharedWorkerContext(),/SECURITY_SOURCE_OF_TRUTH/);}));
test('invalid architecture load order is rejected',()=>snapshot(()=>{change(docs[2],d=>{d.sharedContextLoadOrder=docs.slice(1);});assert.throws(()=>validateSharedWorkerContext(),/ARCHITECTURE_LOAD_ORDER/);}));
test('unbound active launcher is rejected',()=>snapshot(()=>{fs.writeFileSync(launchers[0],'name: missing preflight');assert.throws(()=>validateSharedWorkerContext(),/WORKER_LAUNCHER_NOT_SYNCHRONIZED/);}));
test('missing canonical rule assertions fail closed',()=>{const bad=structuredClone(policy);const rule=Object.values(bad.ownerCanonicalRules).find(r=>r?.enabled===true&&r.machineEnforcement);delete rule.machineEnforcement;assert.equal(compileOwnerCanonicalConstitution(bad).valid,false);});
