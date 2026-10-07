import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateCompanyRecord,scanCompanyRecords,extractChangeRecordReferences,extractCentralPolicyReferences,extractCentralDocumentReferences,classifyCentralChangeRecordRetention,planCentralDocumentArchive,planCentralCurrentUsePrune,planCompanionCurrentUsePrune,evaluateCentralDocumentBudget,inspectCentralDocument,inspectCentralDocumentBudgets,inspectCompanyAssetLibraryBudget,discoverCentralArchiveCandidates} from '../tools/company-records-governance.mjs';

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
  const changeToken='change'+'Record';
  const refs=extractCentralPolicyReferences([
    'roadmap.roblox.studioExecution.enabled',
    'roadmap?.developmentLifecycleMachine?.validationEfficiencyOptimization?.roblox',
    'company-learning/platform-release-roadmap.json#minimumNecessaryProcedurePolicy',
    'roadmap.'+changeToken+'.alphaRule.enabled'
  ].join('\n'));
  assert.ok(refs.includes('roblox.studioExecution.enabled'));
  assert.ok(refs.includes('developmentLifecycleMachine.validationEfficiencyOptimization.roblox'));
  assert.ok(refs.includes('minimumNecessaryProcedurePolicy'));
  assert.ok(refs.includes(changeToken+'.alphaRule'));
});

test('companion document reference scanner protects direct optional bracket and destructured paths',()=>{
  const refs=extractCentralDocumentReferences([
    'architecture.workerSynchronization.documentIsCode',
    'architecture?.centralArchitectureProjection?.required',
    'architecture["externalAiRules"].finalSystemAcceptanceForbidden',
    'const { primaryAiPresenceRequired, autonomous24hWorkersContinueWithoutPrimaryAi: autonomous } = architecture',
    'company-architecture-map.json#departmentTopology.graphics'
  ].join('\n'),{aliases:['architecture','architectureMap'],filename:'company-architecture-map.json'});
  assert.ok(refs.includes('workerSynchronization.documentIsCode'));
  assert.ok(refs.includes('centralArchitectureProjection.required'));
  assert.ok(refs.includes('externalAiRules'));
  assert.ok(refs.includes('primaryAiPresenceRequired'));
  assert.ok(refs.includes('autonomous24hWorkersContinueWithoutPrimaryAi'));
  assert.ok(refs.includes('departmentTopology.graphics'));

  const logRefs=extractCentralDocumentReferences([
    'logMap.workerContextLogContract.roadmapPolicyHashRequired',
    'logMap?.orchestrationLogContract?.workerMustNotInventPolicy'
  ].join('\n'),{aliases:['logMap'],filename:'company-log-map.json'});
  assert.ok(logRefs.includes('workerContextLogContract.roadmapPolicyHashRequired'));
  assert.ok(logRefs.includes('orchestrationLogContract.workerMustNotInventPolicy'));
});

test('companion current-use prune archives only unreferenced top-level blocks and keeps core pins',()=>{
  const document={
    version:1,
    authority:'TEST',
    requiredForAllWorkers:true,
    workerSynchronization:{documentIsCode:true},
    liveTopology:{enabled:true,nested:{value:1}},
    staleTopology:{old:true},
    staleEvidence:{runId:123}
  };
  const plan=planCompanionCurrentUsePrune({
    document,
    currentReferences:{
      'workerSynchronization.documentIsCode':['tools/shared.mjs'],
      'liveTopology.enabled':['qa/current.test.mjs']
    },
    pinnedCorePaths:['version','authority','requiredForAllWorkers']
  });
  assert.equal(plan.document.version,1);
  assert.equal(plan.document.authority,'TEST');
  assert.equal(plan.document.requiredForAllWorkers,true);
  assert.equal(plan.document.workerSynchronization.documentIsCode,true);
  assert.equal(plan.document.liveTopology.enabled,true);
  assert.equal(Object.hasOwn(plan.document,'staleTopology'),false);
  assert.equal(Object.hasOwn(plan.document,'staleEvidence'),false);
  assert.deepEqual(plan.archivedPaths,['staleEvidence','staleTopology']);
  assert.ok(plan.reducedBytes>0);
});

test('dynamic companion document property access fails safe by protecting the whole document',()=>{
  const refs=extractCentralDocumentReferences(
    'const key = getKey(); architecture[key];',
    {aliases:['architecture'],filename:'company-architecture-map.json'}
  );
  assert.ok(refs.includes('*'));
  const plan=planCompanionCurrentUsePrune({
    document:{version:1,unused:{value:true}},
    currentReferences:Object.fromEntries(refs.map(ref=>[ref,['tools/dynamic.mjs']])),
    pinnedCorePaths:['version']
  });
  assert.equal(plan.archivedPaths.length,0);
  assert.equal(plan.document.unused.value,true);
});

test('central current-use prune keeps live references and pins while archiving unused history',()=>{
  const changeToken='change'+'Record',liveKey='live'+'Rule',pinnedKey='pinned'+'Rule',unusedKey='unused'+'Rule';
  const roadmap={
    centralDocumentRetention:{
      autoArchiveUnreferencedChangeRecords:true,
      autoArchiveHistoricalShapedNestedState:true,
      pinnedChangeRecordKeys:[pinnedKey],
      pinnedCorePaths:['roblox.developmentVerification']
    },
    roblox:{
      developmentVerification:{enabled:true},
      currentRuntime:{enabled:true},
      oldDiagnostic:{runs:[1,2,3]}
    },
    [changeToken]:{
      [liveKey]:{status:'ACTIVE',value:1},
      [pinnedKey]:{status:'ACTIVE',value:2},
      [unusedKey]:{status:'ACTIVE',value:3}
    }
  };
  const refs={
    'roblox.currentRuntime.enabled':['tools/current.mjs'],
    [changeToken+'.'+liveKey]:['qa/current.test.mjs']
  };
  const plan=planCentralCurrentUsePrune({roadmap,currentReferences:refs});
  assert.equal(plan.roadmap[changeToken][liveKey].value,1);
  assert.equal(plan.roadmap[changeToken][pinnedKey].value,2);
  assert.equal(Object.hasOwn(plan.roadmap[changeToken],unusedKey),false);
  assert.equal(plan.roadmap.roblox.currentRuntime.enabled,true);
  assert.equal(plan.roadmap.roblox.developmentVerification.enabled,true);
  assert.equal(Object.hasOwn(plan.roadmap.roblox,'oldDiagnostic'),false);
  assert.ok(plan.archivedPaths.includes(changeToken+'.'+unusedKey));
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

test('central document budget blocks hard overflow and oversized single-change growth',()=>{
  const hard=evaluateCentralDocumentBudget({
    documentKey:'architecture',
    sourcePath:'company-learning/company-architecture-map.json',
    currentBytes:321000,
    baseBytes:300000,
    hardMaxUtf8Bytes:320000,
    maxGrowthUtf8Bytes:8000
  });
  assert.ok(hard.errors.includes('CENTRAL_DOCUMENT_ARCHITECTURE_HARD_LIMIT_EXCEEDED:321000>320000'));
  assert.ok(hard.errors.includes('CENTRAL_DOCUMENT_ARCHITECTURE_GROWTH_LIMIT_EXCEEDED:21000>8000'));

  const normal=evaluateCentralDocumentBudget({
    documentKey:'logMap',
    sourcePath:'company-learning/company-log-map.json',
    currentBytes:112000,
    baseBytes:114000,
    hardMaxUtf8Bytes:140000,
    maxGrowthUtf8Bytes:4000
  });
  assert.deepEqual(normal.errors,[]);
  assert.equal(normal.growthUtf8Bytes,-2000);
  assert.equal(normal.headroomUtf8Bytes,28000);
});

test('current central four documents stay inside absolute anti-bloat budgets',()=>{
  const report=inspectCentralDocumentBudgets();
  assert.deepEqual(report.errors,[]);
  assert.equal(Object.keys(report.documents).length,4);
  assert.ok(report.documents.policy.utf8Bytes<=report.documents.policy.hardMaxUtf8Bytes);
  assert.ok(report.documents.architecture.utf8Bytes<=320000);
  assert.ok(report.documents.logMap.utf8Bytes<=140000);
  assert.ok(report.documents.security.utf8Bytes<=70000);
  assert.equal(report.documents.policy.maxGrowthUtf8Bytes,12000);
  assert.equal(report.documents.architecture.maxGrowthUtf8Bytes,8000);
  assert.equal(report.documents.logMap.maxGrowthUtf8Bytes,4000);
  assert.equal(report.documents.security.maxGrowthUtf8Bytes,4000);
});

test('company asset library has generous independent growth headroom',()=>{
  const report=inspectCompanyAssetLibraryBudget();
  assert.deepEqual(report.errors,[]);
  assert.equal(report.sourcePath,'company-asset-library.json');
  assert.equal(report.hardMaxUtf8Bytes,32*1024*1024);
  assert.equal(report.maxGrowthUtf8Bytes,8*1024*1024);
  assert.ok(report.utf8Bytes<report.hardMaxUtf8Bytes);
  assert.ok(report.headroomUtf8Bytes>16*1024*1024);
});

test('company asset library exact-head baseline reports zero growth',()=>{
  const report=inspectCompanyAssetLibraryBudget({baseRevision:'HEAD'});
  assert.deepEqual(report.errors,[]);
  assert.equal(report.growthUtf8Bytes,0);
  assert.equal(report.baseUtf8Bytes,report.utf8Bytes);
});

test('central document growth report reads an exact git baseline',()=>{
  const report=inspectCentralDocumentBudgets({baseRevision:'HEAD'});
  assert.deepEqual(report.errors,[]);
  for(const row of Object.values(report.documents)){
    assert.equal(row.growthUtf8Bytes,0);
    assert.equal(row.baseUtf8Bytes,row.utf8Bytes);
  }
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
