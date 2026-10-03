import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateCompanyRecord,scanCompanyRecords,extractChangeRecordReferences,extractCentralPolicyReferences,classifyCentralChangeRecordRetention,planCentralDocumentArchive,planCentralCurrentUsePrune,inspectCentralDocument,discoverCentralArchiveCandidates} from '../tools/company-records-governance.mjs';

const root=process.cwd();
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const rm=file=>fs.rmSync(file,{recursive:true,force:true});
const baseRecord=()=>({
  schemaVersion:1,
  recordId:'qa-test-001',
  recordType:'runtime-check',
  domain:'qa',
  scope:{type:'GAME',id:'test-game',gameId:'test-game',platform:'WEB'},
  timestamps:{createdAt:'2026-09-21T01:02:03.000Z',observedAt:'2026-09-21T01:01:00.000Z'},
  provenance:{producer:'DETERMINISTIC_QA',authority:'TEST',sourceRevision:null,artifactIdentity:null,sourceRefs:[]},
  status:'VERIFIED',
  retentionClass:'TRANSIENT_QA',
  data:{pass:true},
  evidenceRefs:[],
  relatedFiles:[],
  supersedes:[],
  tags:['test']
});

test('canonical record contract accepts a consistent governed record',()=>{
  const rel='company-records/qa/2026/2026-09-21/test-game/runtime-check--qa-test-001.json';
  const abs=path.join(root,rel);
  try{
    writeJson(abs,baseRecord());
    const result=validateCompanyRecord(rel);
    assert.deepEqual(result.errors,[]);
  }finally{rm(path.join(root,'company-records/qa/2026'));}
});

test('record governance rejects path, metadata and raw secret drift',()=>{
  const rel='company-records/qa/2026/2026-09-21/test-game/runtime-check--qa-test-002.json';
  const abs=path.join(root,rel),row=baseRecord();
  row.recordId='qa-test-002';
  row.domain='release';
  row.provenance.secret='should-not-exist';
  try{
    writeJson(abs,row);
    const result=validateCompanyRecord(rel);
    assert.ok(result.errors.includes('record.domain:PATH_MISMATCH'));
    assert.ok(result.errors.some(x=>x.endsWith('RAW_SECRET_FORBIDDEN')));
  }finally{rm(path.join(root,'company-records/qa/2026'));}
});

test('runtime gameplay media must be actual hash-bound runtime evidence',()=>{
  const mediaRel='assets/runtime-evidence/unity/test-game/2026-09-21/build-test/capture-main.png';
  const mediaAbs=path.join(root,mediaRel);
  const recordRel='company-records/runtime-media/2026/2026-09-21/test-game/unity-runtime-media--capture-test-001.json';
  const recordAbs=path.join(root,recordRel);
  try{
    fs.mkdirSync(path.dirname(mediaAbs),{recursive:true});
    fs.writeFileSync(mediaAbs,Buffer.from('runtime-capture-test-binary'));
    const hash=crypto.createHash('sha256').update(fs.readFileSync(mediaAbs)).digest('hex');
    const row={
      schemaVersion:1,
      recordId:'capture-test-001',
      recordType:'unity-runtime-media',
      domain:'runtime-media',
      scope:{type:'GAME',id:'test-game',gameId:'test-game',platform:'UNITY'},
      timestamps:{createdAt:'2026-09-21T02:00:00.000Z',observedAt:'2026-09-21T01:59:00.000Z'},
      provenance:{producer:'UNITY_RUNTIME_QA',authority:'ACTUAL_RUNTIME',sourceRevision:'0123456789012345678901234567890123456789',artifactIdentity:'apk-sha256-test',sourceRefs:[]},
      status:'VERIFIED',
      retentionClass:'RUNTIME_MEDIA',
      data:{
        gameId:'test-game',
        platform:'UNITY',
        captureAt:'2026-09-21T01:59:00.000Z',
        sourceRevision:'0123456789012345678901234567890123456789',
        artifactIdentity:'apk-sha256-test',
        sha256:hash,
        runtimeVerification:'PASS',
        mediaPath:mediaRel
      },
      evidenceRefs:[],
      relatedFiles:[mediaRel],
      supersedes:[],
      tags:['gameplay','runtime']
    };
    writeJson(recordAbs,row);
    assert.deepEqual(validateCompanyRecord(recordRel).errors,[]);
    row.data.sha256='0'.repeat(64);
    writeJson(recordAbs,row);
    assert.ok(validateCompanyRecord(recordRel).errors.includes('data.sha256:MEDIA_HASH_MISMATCH'));
  }finally{
    rm(path.join(root,'company-records/runtime-media/2026'));
    rm(path.join(root,'assets/runtime-evidence/unity/test-game'));
  }
});

test('repository company-record scan keeps record ids unique',()=>{
  const a='company-records/qa/2026/2026-09-21/test-a/runtime-check--duplicate-test-001.json';
  const b='company-records/qa/2026/2026-09-21/test-b/runtime-check--duplicate-test-001.json';
  const ra=baseRecord(),rb=baseRecord();
  ra.recordId=rb.recordId='duplicate-test-001';
  ra.scope={type:'GAME',id:'test-a',gameId:'test-a',platform:'WEB'};
  rb.scope={type:'GAME',id:'test-b',gameId:'test-b',platform:'WEB'};
  try{
    writeJson(path.join(root,a),ra);writeJson(path.join(root,b),rb);
    const report=scanCompanyRecords();
    assert.ok(report.errors.some(x=>x.startsWith('DUPLICATE_RECORD_ID:duplicate-test-001:')));
  }finally{rm(path.join(root,'company-records/qa/2026'));}
});


test('central policy reference scanner protects direct and optional changeRecord dependencies',()=>{
  const token='change'+'Record';
  const refs=extractChangeRecordReferences([
    'roadmap.'+token+'.alphaRule.enabled',
    'roadmap.'+token+'?.betaRule?.runner',
    'roadmap.'+token+'["gammaRule"].status',
    "roadmap."+token+"['deltaRule'].status"
  ].join('\n'));
  assert.deepEqual(refs,['alphaRule','betaRule','deltaRule','gammaRule']);
});

test('central current-use reference scanner extracts executable roadmap paths',()=>{
  const refs=extractCentralPolicyReferences([
    'roadmap.roblox.studioExecution.enabled',
    'roadmap?.developmentLifecycleMachine?.validationEfficiencyOptimization?.roblox',
    'company-learning/platform-release-roadmap.json#minimumNecessaryProcedurePolicy',
    'roadmap.changeRecord.alphaRule.enabled'
  ].join('\n'));
  assert.ok(refs.includes('roblox.studioExecution.enabled'));
  assert.ok(refs.includes('developmentLifecycleMachine.validationEfficiencyOptimization.roblox'));
  assert.ok(refs.includes('minimumNecessaryProcedurePolicy'));
  assert.ok(refs.includes('changeRecord.alphaRule'));
});

test('central current-use prune keeps live references and pins while archiving unused history',()=>{
  const roadmap={
    centralDocumentRetention:{
      autoArchiveUnreferencedChangeRecords:true,
      autoArchiveHistoricalShapedNestedState:true,
      pinnedChangeRecordKeys:['pinnedRule'],
      pinnedCorePaths:['roblox.developmentVerification']
    },
    roblox:{
      developmentVerification:{enabled:true},
      currentRuntime:{enabled:true},
      oldDiagnostic:{runs:[1,2,3]}
    },
    changeRecord:{
      liveRule:{status:'ACTIVE',value:1},
      pinnedRule:{status:'ACTIVE',value:2},
      unusedRule:{status:'ACTIVE',value:3}
    }
  };
  const refs={
    'roblox.currentRuntime.enabled':['tools/current.mjs'],
    'changeRecord.liveRule':['qa/current.test.mjs']
  };
  const plan=planCentralCurrentUsePrune({roadmap,currentReferences:refs});
  assert.equal(plan.roadmap.changeRecord.liveRule.value,1);
  assert.equal(plan.roadmap.changeRecord.pinnedRule.value,2);
  assert.equal(Object.hasOwn(plan.roadmap.changeRecord,'unusedRule'),false);
  assert.equal(plan.roadmap.roblox.currentRuntime.enabled,true);
  assert.equal(plan.roadmap.roblox.developmentVerification.enabled,true);
  assert.equal(Object.hasOwn(plan.roadmap.roblox,'oldDiagnostic'),false);
  assert.ok(plan.archivedPaths.includes('changeRecord.unusedRule'));
  assert.ok(plan.archivedPaths.includes('roblox.oldDiagnostic'));
  assert.ok(plan.reducedBytes>0);
});

test('central current-use reference scanner extracts executable roadmap paths',()=>{
  const refs=extractCentralPolicyReferences([
    'roadmap.roblox.studioExecution.enabled',
    'roadmap?.developmentLifecycleMachine?.validationEfficiencyOptimization?.roblox',
    'company-learning/platform-release-roadmap.json#minimumNecessaryProcedurePolicy',
    'roadmap.changeRecord.alphaRule.enabled'
  ].join('\n'));
  assert.ok(refs.includes('roblox.studioExecution.enabled'));
  assert.ok(refs.includes('developmentLifecycleMachine.validationEfficiencyOptimization.roblox'));
  assert.ok(refs.includes('minimumNecessaryProcedurePolicy'));
  assert.ok(refs.includes('changeRecord.alphaRule'));
});

test('central current-use prune keeps live references and pins while archiving unused history',()=>{
  const roadmap={
    centralDocumentRetention:{
      autoArchiveUnreferencedChangeRecords:true,
      autoArchiveHistoricalShapedNestedState:true,
      pinnedChangeRecordKeys:['pinnedRule'],
      pinnedCorePaths:['roblox.developmentVerification']
    },
    roblox:{
      developmentVerification:{enabled:true},
      currentRuntime:{enabled:true},
      oldDiagnostic:{runs:[1,2,3]}
    },
    changeRecord:{
      liveRule:{status:'ACTIVE',value:1},
      pinnedRule:{status:'ACTIVE',value:2},
      unusedRule:{status:'ACTIVE',value:3}
    }
  };
  const refs={
    'roblox.currentRuntime.enabled':['tools/current.mjs'],
    'changeRecord.liveRule':['qa/current.test.mjs']
  };
  const plan=planCentralCurrentUsePrune({roadmap,currentReferences:refs});
  assert.equal(plan.roadmap.changeRecord.liveRule.value,1);
  assert.equal(plan.roadmap.changeRecord.pinnedRule.value,2);
  assert.equal(Object.hasOwn(plan.roadmap.changeRecord,'unusedRule'),false);
  assert.equal(plan.roadmap.roblox.currentRuntime.enabled,true);
  assert.equal(plan.roadmap.roblox.developmentVerification.enabled,true);
  assert.equal(Object.hasOwn(plan.roadmap.roblox,'oldDiagnostic'),false);
  assert.ok(plan.archivedPaths.includes('changeRecord.unusedRule'));
  assert.ok(plan.archivedPaths.includes('roblox.oldDiagnostic'));
  assert.ok(plan.reducedBytes>0);
});

test('central change record archival requires semantic retirement and never relies on an unreferenced name alone',()=>{
  const active=classifyCentralChangeRecordRetention('oldLookingName',{status:'ACTIVE_COMPATIBILITY_RECORD',authority:'company-learning/platform-release-roadmap.json#developmentSpeedExecution'});
  const pending=classifyCentralChangeRecordRetention('historicalLookingName',{status:'CODE_UPDATED_PENDING_QA_AND_LIVE'});
  const retired=classifyCentralChangeRecordRetention('plainName',{status:'SUPERSEDED',historical:true});
  const retiredOwner=classifyCentralChangeRecordRetention('ownerRule',{status:'SUPERSEDED',historical:true,authority:'OWNER_DIRECTIVE_2026-09-01'});
  assert.equal(active.archiveEligible,false);
  assert.equal(active.policyMeaning,true);
  assert.equal(pending.archiveEligible,false);
  assert.equal(retired.archiveEligible,true);
  assert.equal(retired.reason,'EXPLICIT_HISTORICAL_OR_RETIRED_RECORD');
  assert.equal(retiredOwner.archiveEligible,true);
  assert.equal(retiredOwner.policyMeaning,false);
});

test('central archive plan removes explicit history before unreferenced compatibility records',()=>{
  const roadmap={
    centralDocumentRetention:{
      maxUtf8Bytes:1600,
      softTargetUtf8Bytes:900,
      archiveUnreferencedChangeRecords:true,
      pinnedChangeRecordKeys:['pinnedRule'],
      historicalArchiveSelectors:['history.largeRun']
    },
    changeRecord:{
      protectedRule:{enabled:true,note:'x'.repeat(220)},
      pinnedRule:{enabled:true,note:'p'.repeat(220)},
      activeCompatibility:{status:'ACTIVE_COMPATIBILITY_RECORD',authority:'company-learning/platform-release-roadmap.json#developmentSpeedExecution',note:'a'.repeat(180)},
      oldRule:{status:'SUPERSEDED',historical:true,note:'o'.repeat(420)}
    },
    history:{largeRun:{events:Array.from({length:20},(_,i)=>({i,text:'h'.repeat(40)}))}}
  };
  const changeToken='change'+'Record';
  const protectedKey='protected'+'Rule',pinnedKey='pinned'+'Rule',activeKey='active'+'Compatibility',oldKey='old'+'Rule';
  const plan=planCentralDocumentArchive({roadmap,protectedChangeRecordKeys:[protectedKey]});
  assert.ok(plan.archivedPaths.includes('history.largeRun'));
  assert.equal(plan.roadmap[changeToken][protectedKey].enabled,true);
  assert.equal(plan.roadmap[changeToken][pinnedKey].enabled,true);
  assert.equal(plan.roadmap[changeToken][activeKey].status,'ACTIVE_COMPATIBILITY_RECORD');
  assert.ok(!plan.archivedPaths.includes(changeToken+'.'+protectedKey));
  assert.ok(!plan.archivedPaths.includes(changeToken+'.'+pinnedKey));
  assert.ok(!plan.archivedPaths.includes(changeToken+'.'+activeKey));
  assert.ok(plan.archivedPaths.includes(changeToken+'.'+oldKey));
  assert.equal(plan.hardLimitSatisfied,true);
});

test('current central policy stays within hard retention limit and keeps every referenced compatibility record',()=>{
  const report=inspectCentralDocument();
  assert.deepEqual(report.errors,[]);
  assert.ok(report.utf8Bytes<=report.maxUtf8Bytes);
  assert.deepEqual(report.missingProtectedChangeRecords,[]);
  assert.ok(report.headroomBytes>=0);
});


test('central candidate discovery reports historical-shaped nested state but never mutates it',()=>{
  const roadmap={
    centralDocumentRetention:{historicalArchiveSelectors:[]},
    currentPolicy:{enabled:true},
    workerState:{
      latestRun:{id:123,details:'x'.repeat(700)},
      currentContract:{enabled:true,details:'y'.repeat(700)}
    }
  };
  const rows=discoverCentralArchiveCandidates({roadmap,minBytes:100,limit:10});
  assert.ok(rows.some(row=>row.path==='workerState.latestRun'));
  assert.ok(!rows.some(row=>row.path==='workerState.currentContract'));
  assert.equal(roadmap.workerState.latestRun.id,123);
});
