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
    // 과거 혼합 정책 fixture에서 최신 단일 플랫폼 지시로 전환하는 동작을 검증한다.
    const file=path.join(tmp,paths[0]);
    const baseline=JSON.parse(fs.readFileSync(file,'utf8'));
    baseline.ownerActiveDevelopmentScope20261009={status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-10-17_ROBLOX_AND_GENERAL_WEB',activeTargets:['ROBLOX','WEB'],ownerHeldTargets:['UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN']};
    baseline.developmentAccess.ROBLOX='ALWAYS_ALLOWED';
    baseline.developmentAccess.WEB='ALWAYS_ALLOWED';
    fs.writeFileSync(file,JSON.stringify(baseline));
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

test('F0 live planner uses verified main policy only at production call site, not in fixture QA',()=>{
  const policy=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const scope=resolveActiveOwnerPolicy(policy);
  const platform=policy.ownerActiveDevelopmentScope20261009.repository.platform;
  assert.deepEqual(scope.activeTargets,[platform]);
  assert.equal(ownerDevelopmentHeld(policy,'policy-f0-eligible','roblox',{}),platform!=='ROBLOX');
  assert.equal(ownerDevelopmentHeld(policy,'policy-f0-eligible','web',{}),platform!=='WEB');
  for(const workflow of [
    '.github/workflows/vibe2-24h-runner.yml',
    '.github/workflows/vibe2-continuous-core.yml'
  ]){
    const content=fs.readFileSync(path.join(root,workflow),'utf8');
    assert.ok(!content.includes('export COMPANY_VERIFIED_POLICY_PATH=') &&
      !content.includes('export COMPANY_VERIFIED_DESIGN_POLICY_PATH='),
      'Production policies must not contaminate isolated QA fixtures');
    assert.ok(content.includes('COMPANY_VERIFIED_POLICY_PATH=/tmp/vibe2-main/company-learning/platform-release-roadmap.json COMPANY_VERIFIED_DESIGN_POLICY_PATH=/tmp/vibe2-main/company-learning/platform-release-roadmap.json node /tmp/vibe2-main/tools/vibe2-auto-planner.mjs'));
    assert.ok(content.includes('node /tmp/vibe2-main/tools/vibe2-auto-planner.mjs'));
  }
  const clock=fs.readFileSync(path.join(root,'.github/workflows/vibe2-24h-runner.yml'),'utf8');
  assert.ok(clock.includes("cron: '*/5 * * * *'"));
  assert.equal(policy.finalDevelopmentLock.sequenceLock.status,'LOCKED');
});


test('issue 8239 reserve and DESIGN_ONLY use the verified canonical policy without changing the F0–F9 chain',()=>{
  const canonical='company-learning/platform-release-roadmap.json';
  const reserve=fs.readFileSync(path.join(root,'.github/workflows/vibe2-continuous-core.yml'),'utf8');
  const design=fs.readFileSync(path.join(root,'.github/workflows/company-seed-design-runtime.yml'),'utf8');
  assert.ok(reserve.includes('COMPANY_VERIFIED_POLICY_PATH=/tmp/vibe2-main/'+canonical+' node /tmp/vibe2-main/tools/vibe2-queue-control.mjs reserve-batch'));
  assert.ok(reserve.includes('COMPANY_VERIFIED_POLICY_PATH="$contract_root/'+canonical+'" COMPANY_VERIFIED_DESIGN_POLICY_PATH="$contract_root/'+canonical+'" node "$contract_root/tools/vibe2-continuous-runner.mjs"'));
  assert.ok(reserve.includes('COMPANY_VERIFIED_POLICY_PATH="$GITHUB_WORKSPACE/vibe2-contract/'+canonical+'" node "$GITHUB_WORKSPACE/vibe2-contract/tools/vibe2-source-worker.mjs" --apply-source=true'));
  const resolve=design.split('  resolve-seed-targets:')[1]?.split('  design-cycle:')[0];
  const cycle=design.split('  design-cycle:')[1]?.split('  promote')[0];
  for(const job of [resolve,cycle]){
    assert.ok(job,'both existing DESIGN_ONLY jobs must remain present');
    assert.ok(job.includes('COMPANY_VERIFIED_POLICY_PATH: '+canonical));
    assert.ok(job.includes('COMPANY_VERIFIED_DESIGN_POLICY_PATH: '+canonical));
  }
  assert.ok(cycle.includes('node tools/company-design-cycle.mjs &'));
  assert.ok(cycle.includes('evaluateMinimumDesignContract'));
  assert.equal((reserve.match(/COMPANY_VERIFIED_POLICY_PATH=\/tmp\/vibe2-main\/company-learning\/platform-release-roadmap.json node \/tmp\/vibe2-main\/tools\/vibe2-queue-control.mjs reserve-batch/g)||[]).length,1);
  const policy=JSON.parse(fs.readFileSync(path.join(root,canonical),'utf8'));
  assert.equal(policy.finalDevelopmentLock.sequenceLock.status,'LOCKED');
  assert.deepEqual(policy.finalDevelopmentLock.sequenceLock.candidateOrderMustRemain.slice(0,2),['F0_SOURCE_PREFLIGHT_PASS','PRIVATE_RUNTIME_CANDIDATE_DEPLOY']);
  assert.equal(policy.fixedAutonomousDevelopmentOperatingContract.sourceGrowthIntegrity.existingWorkingGameplayAndSaveSemanticsPreserved,true);
  assert.equal(policy.fixedAutonomousDevelopmentOperatingContract.autonomousBottleneckManagement.mayNotBypassSecurityQaRuntimeOrReleaseGates,true);
});

// 조직 독립 운영: 작업 이름을 위장해도 다른 플랫폼 원본을 예약·수정하지 않는다.
for(const platform of ['WEB','ROBLOX'])test(platform+' repository confines Vibe tasks and source writes to its own platform',()=>{
  const policy=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const scope=policy.ownerActiveDevelopmentScope20261009;
  const other=platform==='WEB'?'ROBLOX':'WEB';
  scope.activeTargets=[platform];scope.ownerHeldTargets=[other,'UNITY','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN'];
  scope.repository={fullName:process.env.GITHUB_REPOSITORY||'test/independent',platform,sourceRoot:platform==='WEB'?'web-games/':'roblox-games/',independentVibe:true,sharedQueue:false,sharedRuntime:false,sharedLearning:false,sharedCredentials:false,homepageOnly:true};
  policy.assetProductionParallelContract.activeProductionTargets=[platform];
  const ownRoot=scope.repository.sourceRoot;
  const foreignRoot=other==='WEB'?'web-games/':'roblox-games/';
  assert.deepEqual(resolveActiveOwnerPolicy(policy).activeTargets,[platform]);
  assert.equal(ownerDevelopmentHeld(policy,'independent-test',platform.toLowerCase(),{source:{root:ownRoot+'independent-test'}}),false);
  assert.equal(ownerDevelopmentHeld(policy,'independent-test',other.toLowerCase(),{}),true);
  for(const task of [{source:{root:foreignRoot+'independent-test'}},{responsibleFiles:[foreignRoot+'independent-test/index.html']},{selectedTask:{source:{root:foreignRoot+'independent-test'}}},{sourceRoot:'../'+ownRoot+'independent-test'}])
    assert.equal(ownerDevelopmentHeld(policy,'independent-test',platform.toLowerCase(),task),true);
  assert.equal(ownerDevelopmentHeld(policy,'library',platform.toLowerCase(),{assetProductionLane:true,sourceRoot:'assets/'+platform.toLowerCase()+'/library'}),false);
  assert.throws(()=>resolveActiveOwnerPolicy(policy,{repository:'other/repository'}),/REPOSITORY_MISMATCH/);
  scope.repository.sharedQueue=true;
  assert.throws(()=>resolveActiveOwnerPolicy(policy,{allowMissing:true}),/REPOSITORY_SCOPE_INVALID/);
});
