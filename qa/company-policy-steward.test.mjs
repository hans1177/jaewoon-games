// 파일명: qa/company-policy-steward.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditFourPolicyDocuments,resolveActiveOwnerPolicy} from '../tools/company-policy-steward.mjs';
import {ownerDevelopmentHeld} from '../tools/vibe2-queue-control.mjs';
import {loadCentralPolicySnapshot} from '../tools/vibe2-central-work-contract.mjs';

// 메인
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths=[
  'company-learning/platform-release-roadmap.json',
  'company-learning/company-log-map.json',
  'company-learning/company-architecture-map.json',
  'company-learning/security-immune-system.json'
];
function fixture(fn){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'four-policy-steward-'));
  try{
    for(const file of paths){
      fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});
      fs.copyFileSync(path.join(root,file),path.join(tmp,file));
    }
    return fn(tmp);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
test('four existing documents stay bit-for-bit immutable',()=>fixture(tmp=>{
  const originals=paths.map(p=>fs.readFileSync(path.join(tmp,p),'utf8'));
  const audit=auditFourPolicyDocuments({root:tmp});
  assert.deepEqual(audit.managedDocuments,paths);
  assert.equal(audit.writesAllowed,false);
  assert.equal(audit.nonBlockingAudit,true);
  assert.equal(audit.securityAndReleaseChecksUnchanged,true);
  assert.deepEqual(paths.map(p=>fs.readFileSync(path.join(tmp,p),'utf8')),originals);
}));
test('latest approved owner scope wins over stale legacy access only in audit',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.developmentAccess.ROBLOX='OWNER_HOLD';
  fs.writeFileSync(p,JSON.stringify(doc));
  const before=fs.readFileSync(p,'utf8');
  const audit=auditFourPolicyDocuments({root:tmp});
  assert.equal(audit.effectiveDevelopmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.ok(audit.staleLegacyPolicyFields.includes('ROBLOX'));
  assert.equal(fs.readFileSync(p,'utf8'),before);
}));
test('a newer approved owner directive supersedes the old scope without changing game code',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerNextDevelopment={authority:'OWNER_DIRECTIVE_2026-10-18_WEB_ONLY',status:'ACTIVE',activeTargets:['WEB'],ownerHeldTargets:['ROBLOX','UNITY_WEB']};
  fs.writeFileSync(p,JSON.stringify(doc));
  const audit=auditFourPolicyDocuments({root:tmp});
  assert.equal(audit.latestOwnerSection,'ownerNextDevelopment');
  assert.equal(audit.effectiveDevelopmentAccess.ROBLOX,'OWNER_HOLD');
  assert.equal(audit.effectiveDevelopmentAccess.WEB,'ALWAYS_ALLOWED');
}));
test('invalid, missing or contradictory approved policy never authorizes work',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerActiveDevelopmentScope20261009.ownerHeldTargets.push('ROBLOX');
  fs.writeFileSync(p,JSON.stringify(doc));
  assert.throws(()=>auditFourPolicyDocuments({root:tmp}),/OWNER_SCOPE_INVALID/);
  fs.unlinkSync(p);
  assert.throws(()=>auditFourPolicyDocuments({root:tmp}));
}));
test('ambiguous equally recent owner instructions are not silently merged',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerConflictingScope={status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-10-17_SECOND_SAME_DAY',activeTargets:['UNITY'],ownerHeldTargets:['WEB']};
  fs.writeFileSync(p,JSON.stringify(doc));
  assert.throws(()=>auditFourPolicyDocuments({root:tmp}),/SAME_DATE_OWNER_CONFLICT/);
}));

test('legacy owner scope is automatically retired in the actual Vibe queue',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerDeprecatedOwnerScope={
    status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-09-23_OLD_HOLD',
    activeTargets:['WEB'],ownerHeldTargets:['ROBLOX','UNITY_WEB']
  };
  doc.developmentAccess.ROBLOX='OWNER_HOLD';
  fs.writeFileSync(p,JSON.stringify(doc));
  const effective=resolveActiveOwnerPolicy(doc);
  assert.ok(effective.retiredOwnerSections.includes('ownerDeprecatedOwnerScope'));
  assert.equal(effective.effectiveDevelopmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.equal(ownerDevelopmentHeld(doc,'unheld-policy-regression','roblox',{}),false);
  assert.equal(ownerDevelopmentHeld(doc,'unheld-policy-regression','unity_android',{}),true);
  assert.equal(doc.developmentAccess.ROBLOX,'OWNER_HOLD');
  assert.ok(auditFourPolicyDocuments({root:tmp}).retiredOwnerSections.includes('ownerDeprecatedOwnerScope'));
}));
test('new owner hold overrides earlier permissive values in actual Vibe queue',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerLaterScope={
    status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-10-18_WEB_ONLY',
    activeTargets:['WEB'],ownerHeldTargets:['ROBLOX','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN']
  };
  fs.writeFileSync(p,JSON.stringify(doc));
  assert.equal(ownerDevelopmentHeld(doc,'unheld-policy-regression','roblox',{}),true);
  assert.equal(ownerDevelopmentHeld(doc,'unheld-policy-regression','web',{}),false);
  assert.equal(doc.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
}));
test('all four documents retain security, log and architecture fail-closed contracts',()=>fixture(tmp=>{
  for(const [index,mutate,expected] of [
    [1,doc=>{doc.retained.unknownOrMissingPolicy='ALLOW';},/LOG_CONTRACT_INVALID/],
    [2,doc=>{doc.constitutionalEnforcement.mode='ALLOW';},/ARCHITECTURE_CONTRACT_INVALID/],
    [3,doc=>{doc.enforcement.unverified='ALLOW';},/SECURITY_CONTRACT_INVALID/]
  ]){
    const file=path.join(tmp,paths[index]);
    const original=fs.readFileSync(file,'utf8');
    const doc=JSON.parse(original);
    mutate(doc);
    fs.writeFileSync(file,JSON.stringify(doc));
    assert.throws(()=>auditFourPolicyDocuments({root:tmp}),expected);
    fs.writeFileSync(file,original);
  }
}));
test('conflicting date-less or malformed ACTIVE owner scope is rejected',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerBadScope={
    status:'ACTIVE',authority:'OWNER_DIRECTIVE_UNDATED',
    activeTargets:['WEB'],ownerHeldTargets:['ROBLOX']
  };
  assert.throws(()=>resolveActiveOwnerPolicy(doc),/OWNER_DIRECTIVE_INVALID/);
}));

test('work contract fingerprint follows latest directive, not stale legacy holds',()=>fixture(tmp=>{
  const file=path.join(tmp,paths[0]);
  const before=loadCentralPolicySnapshot({repoRoot:tmp,required:true});
  assert.match(before.executionFingerprint,/^[a-f0-9]{64}$/);
  const policy=JSON.parse(fs.readFileSync(file,'utf8'));
  policy.developmentAccess.ROBLOX='OWNER_HOLD';
  fs.writeFileSync(file,JSON.stringify(policy));
  const legacyChange=loadCentralPolicySnapshot({repoRoot:tmp,required:true});
  assert.equal(legacyChange.executionFingerprint,before.executionFingerprint);
  policy.ownerNextDevelopment={
    status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-10-18_WEB_ONLY',
    activeTargets:['WEB'],ownerHeldTargets:['ROBLOX','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN']
  };
  fs.writeFileSync(file,JSON.stringify(policy));
  const newest=loadCentralPolicySnapshot({repoRoot:tmp,required:true});
  assert.notEqual(newest.executionFingerprint,before.executionFingerprint);
}));
