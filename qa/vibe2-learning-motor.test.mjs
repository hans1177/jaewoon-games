import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  MASTERY_DOMAINS,
  classifyLearningDomains,
  createMasteryState,
  applyVerifiedExperienceToMastery,
  applyVerifiedCodePatternsToMastery,
  applyVerifiedCodingStrategyOutcomes,
  applyVerifiedCodingCalibration,
  applyVerifiedArchitectureDriftOutcomes,
  applyVerifiedKnowledgeOutcomes,
  collectVerifiedSpecializedQueueExperience,
  applyVerifiedSpecializedQueueOutcomes,
  mergeVerifiedSpecializedQueueExperienceMemory,
  collectVerifiedRobloxStudioPlayExperience,
  mergeVerifiedRobloxStudioPlayExperienceMemory,
  applyVerifiedGraphicsEvolutionOutcomes,
  architectureDriftRiskForTask,
  architectureDriftGuidance,
  buildCodingConstitution,
  codingConstitutionRuleForTask,
  codingConstitutionGuidance,
  responsibilityCalibrationForTask,
  regressionHotspotRiskForTask,
  codingRiskGuidance,
  preferredCodingStrategyForTask,
  codingStrategyGuidance,
  failureFingerprintForTask,
  retrieveUnifiedLearning,
  candidateTournamentPolicy,
  buildBenchmarkLadder,
  buildIdlePracticeQueue,
  injectIdlePracticeTask,
  dedupeIdlePracticeTasks,
  buildWebRobloxHandoffs
} from '../tools/vibe2-learning-motor.mjs';

test('verified local Roblox Studio play becomes reusable and online/stale evidence is rejected',()=>{
  const source='a'.repeat(40);
  const artifact='sha256:'+'b'.repeat(64);
  const base={
    gameId:'studio-game',
    robloxSourceCommit:source,
    robloxBuildArtifactIdentity:artifact,
    robloxFoundationF0Evidence:{artifactRunId:777},
    robloxRuntimeCandidateEvidence:{
      sourceRevision:source,artifactIdentity:artifact,artifactRunId:777,
      universeId:'123',placeId:'456',versionNumber:7,published:true
    },
    robloxInternalVibePlayEvidence:{
      authority:'vibe2-roblox-studio-runtime',
      pass:true,actualPlay:true,runtimeVerified:true,learningReusable:true,
      localPlaceFile:true,onlinePlaceDirectOpen:false,robloxPlayerAutomation:false,
      rawSourceIncluded:false,rawGameplayValuesIncluded:false,
      sourceRevision:source,artifactIdentity:artifact,artifactRunId:777,
      publishedCandidateCrossCheckPassed:true,publishedCandidateCrossCheckAuthority:'OPEN_CLOUD',
      universeId:'123',placeId:'456',versionNumber:7,
      capabilities:{studioTestService:true,virtualInput:true},
      actions:[{id:'move',type:'key',dispatched:true,ok:true}],
      checkpoints:[{id:'player',name:'player-present',required:true,pass:true}],
      errors:[],learningSignals:['input','runtime','ui'],
      workflowRunId:12345,testedAt:'2026-09-25T08:00:00.000Z'
    }
  };
  const extracted=collectVerifiedRobloxStudioPlayExperience({items:[base]});
  assert.equal(extracted.records.length,1);
  assert.equal(extracted.records[0].engine,'roblox');
  assert.ok(extracted.records[0].reusablePatterns.includes('verified-studio-local-play:roblox-studio'));
  const merged=mergeVerifiedRobloxStudioPlayExperienceMemory({records:[]},{items:[base]});
  assert.equal(merged.changed,true);
  assert.equal(merged.added,1);
  assert.equal(merged.memory.records.length,1);

  const online=structuredClone(base);
  online.robloxInternalVibePlayEvidence.localPlaceFile=false;
  online.robloxInternalVibePlayEvidence.onlinePlaceDirectOpen=true;
  assert.equal(collectVerifiedRobloxStudioPlayExperience({items:[online]}).records.length,0);

  const stale=structuredClone(base);
  stale.robloxInternalVibePlayEvidence.artifactRunId=776;
  assert.equal(collectVerifiedRobloxStudioPlayExperience({items:[stale]}).records.length,0);

  const noInput=structuredClone(base);
  noInput.robloxInternalVibePlayEvidence.actions=[{id:'wait',type:'wait',dispatched:false,ok:true}];
  assert.equal(collectVerifiedRobloxStudioPlayExperience({items:[noInput]}).records.length,0);
});

test('verified local Studio runtime failure becomes reusable failure lesson but infrastructure does not',()=>{
  const source='c'.repeat(40);
  const artifact='sha256:'+'d'.repeat(64);
  const base={
    gameId:'studio-fail',
    robloxSourceCommit:source,
    robloxBuildArtifactIdentity:artifact,
    robloxFoundationF0Evidence:{artifactRunId:888},
    robloxRuntimeCandidateEvidence:{
      sourceRevision:source,artifactIdentity:artifact,artifactRunId:888,
      universeId:'777',placeId:'999',versionNumber:3,published:true
    },
    robloxInternalVibePlayEvidence:{
      authority:'vibe2-roblox-studio-runtime',
      pass:false,actualPlay:true,runtimeVerified:false,learningReusable:true,
      localPlaceFile:true,onlinePlaceDirectOpen:false,robloxPlayerAutomation:false,
      rawSourceIncluded:false,rawGameplayValuesIncluded:false,
      sourceRevision:source,artifactIdentity:artifact,artifactRunId:888,
      publishedCandidateCrossCheckPassed:true,publishedCandidateCrossCheckAuthority:'OPEN_CLOUD',
      universeId:'777',placeId:'999',versionNumber:3,
      capabilities:{studioTestService:true,virtualInput:true},
      actions:[{id:'move',type:'key',dispatched:true,ok:true}],
      checkpoints:[{id:'gui',name:'ui-visible-elements',required:true,pass:false}],
      errors:[{type:'studio-console-error',actionId:null}],
      learningSignals:['ui','debugging'],
      workflowRunId:333,testedAt:'2026-09-25T08:10:00.000Z'
    }
  };
  const extracted=collectVerifiedRobloxStudioPlayExperience({items:[base]});
  assert.equal(extracted.records.length,1);
  assert.equal(extracted.records[0].outcome,'FAIL');
  assert.match(extracted.records[0].failureCause,/studio-console-error/);
  assert.ok(extracted.records[0].avoidPatterns.length>0);

  const infra=structuredClone(base);
  infra.robloxInternalVibePlayEvidence.actualPlay=false;
  infra.robloxInternalVibePlayEvidence.capabilities.studioTestService=false;
  infra.robloxInternalVibePlayEvidence.infrastructureFailure=true;
  assert.equal(collectVerifiedRobloxStudioPlayExperience({items:[infra]}).records.length,0);
});

test('same-game verified experience outranks same-engine cross-game experience',()=>{
  const experience={records:[
    {id:'same',gameId:'g1',engine:'web',verified:true,reusable:true,outcome:'PASS',goal:'combat save mobile',reusablePatterns:['combat-state']},
    {id:'other',gameId:'g2',engine:'web',verified:true,reusable:true,outcome:'PASS',goal:'combat save mobile',reusablePatterns:['combat-state']}
  ]};
  const ctx=retrieveUnifiedLearning({task:{gameId:'g1',target:'web',goal:'combat save mobile'},experienceInput:experience});
  assert.equal(ctx.experience[0].id,'same');
  assert.ok(ctx.experience[0].reasons.includes('same-game'));
});

test('unverified result never increases mastery',()=>{
  const result=applyVerifiedExperienceToMastery({}, {records:[
    {id:'bad',gameId:'g',engine:'web',verified:false,reusable:true,outcome:'PASS',goal:'combat'}
  ]});
  assert.equal(result.added,0);
  assert.equal(result.state.domains.COMBAT.xp,0);
});

test('verified success and verified failure lesson raise only inferred mastery domains',()=>{
  const result=applyVerifiedExperienceToMastery({}, {records:[
    {id:'ok',gameId:'g',engine:'web',verified:true,reusable:true,outcome:'PASS',goal:'combat save mobile input',reusablePatterns:['combat','save']},
    {id:'fail',gameId:'g',engine:'web',verified:true,reusable:true,outcome:'FAIL',failureCause:'save restore regression',avoidPatterns:['save restore regression']}
  ]});
  assert.ok(result.state.domains.COMBAT.xp>0);
  assert.ok(result.state.domains.SAVE.xp>0);
  assert.ok(result.state.domains.WEB_RUNTIME.xp>0);
  assert.equal(Object.keys(result.state.failureSignatures).length,1);
});

test('verified domain mastery continues above legacy level 10 and benchmark difficulty follows it',()=>{
  const state=createMasteryState({domains:{SAVE:{xp:1730},WEB_RUNTIME:{xp:1330}}});
  assert.equal(state.domains.SAVE.level,15);
  assert.equal(state.domains.WEB_RUNTIME.level,13);
  const ladder=buildBenchmarkLadder(state);
  const save=ladder.cases.find(row=>row.track==='SAVE');
  assert.equal(save.level,15);
  assert.equal(save.difficultyGeneration,6);
  assert.match(save.id,/mastery-save-l15-g6/);
});

test('verified coding strategy outcomes accumulate, dedupe, and become preferred only after repeated independent evidence',()=>{
  const mk=(id,gameId,first='YES')=>({
    id,gameId,target:'web',evidence:[
      'role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS',
      'coding-strategy:RESPONSIBILITY_FIRST','coding-generation-attempts:1','coding-context-mode:PRIMARY_SYMBOL_WINDOWS','coding-context-bytes:12000',`coding-candidate-first-attempt:${first}`,
      `vibe2/candidate/${id}-primary-run`
    ]
  });
  const queue={tasks:[mk('s1','g1'),mk('s2','g1'),mk('s3','g2'),mk('s4','g2'),mk('s5','g2','NO'),
    {id:'unverified',gameId:'g1',target:'web',evidence:['coding-strategy:CAUSAL_TRACE_FIRST','coding-candidate-first-attempt:YES']}]};
  const learned=applyVerifiedCodingStrategyOutcomes({},queue);
  assert.equal(learned.added,5);
  const row=learned.state.codingStrategyMemory.strategies.RESPONSIBILITY_FIRST;
  assert.equal(row.verifiedApplications,5);
  assert.equal(row.firstCandidatePasses,4);
  assert.equal(row.state,'PREFERRED');
  assert.equal(row.contextModes.PRIMARY_SYMBOL_WINDOWS.verifiedApplications,5);
  assert.equal(row.contextModes.PRIMARY_SYMBOL_WINDOWS.firstCandidatePasses,4);
  assert.equal(row.contextModes.PRIMARY_SYMBOL_WINDOWS.totalContextBytes,60000);
  assert.equal(learned.state.codingStrategyMemory.strategies.CAUSAL_TRACE_FIRST,undefined);
  const deduped=applyVerifiedCodingStrategyOutcomes(learned.state,queue);
  assert.equal(deduped.added,0);
  const preferred=preferredCodingStrategyForTask({task:{gameId:'g1',target:'web'},stateInput:learned.state});
  assert.equal(preferred.strategy,'RESPONSIBILITY_FIRST');
  assert.equal(preferred.authorityExpanded,false);
  assert.match(codingStrategyGuidance(preferred),/MUST NOT expand writable scope/);
});

test('verified context mode efficiency selects lower-cost mode and verified failures can change the preference',()=>{
  const mk=(id,gameId,mode,attempts,bytes)=>({
    id,gameId,target:'web',evidence:[
      'role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS',
      'coding-strategy:RESPONSIBILITY_FIRST',`coding-generation-attempts:${attempts}`,`coding-context-mode:${mode}`,`coding-context-bytes:${bytes}`,'coding-candidate-first-attempt:YES',
      `vibe2/candidate/${id}-primary-run`
    ]
  });
  const positives={tasks:[
    mk('p1','g1','PRIMARY_SYMBOL_WINDOWS',2,24000),mk('p2','g1','PRIMARY_SYMBOL_WINDOWS',2,24000),mk('p3','g2','PRIMARY_SYMBOL_WINDOWS',2,24000),
    mk('b1','g1','BOUNDED_FILE_EXCERPT_FALLBACK',1,8000),mk('b2','g2','BOUNDED_FILE_EXCERPT_FALLBACK',1,8000),mk('b3','g2','BOUNDED_FILE_EXCERPT_FALLBACK',1,8000)
  ]};
  const learned=applyVerifiedCodingStrategyOutcomes({},positives);
  let preferred=preferredCodingStrategyForTask({task:{gameId:'g1',target:'web'},stateInput:learned.state});
  assert.equal(preferred.strategy,'RESPONSIBILITY_FIRST');
  assert.equal(preferred.preferredContextMode,'BOUNDED_FILE_EXCERPT_FALLBACK');
  assert.equal(preferred.preferredContextModeSamples,3);
  assert.equal(preferred.preferredContextModeAverageGenerationAttempts,1);
  assert.equal(preferred.preferredContextModeAverageContextBytes,8000);
  const negativePayload=encodeURIComponent(JSON.stringify({version:1,verifiedBy:'IMMUTABLE_WORKER_RESULT',infrastructureFailure:false,variant:'primary',strategy:'RESPONSIBILITY_FIRST',failureFingerprint:'web|TIMEOUT',failureClass:'TIMEOUT',runEvidence:'run-negative'}));
  const failed={tasks:[{id:'neg-1',gameId:'g1',target:'web',evidence:[
    'coding-context-mode:BOUNDED_FILE_EXCERPT_FALLBACK',`coding-strategy-negative:${negativePayload}`
  ]}]};
  const afterFailure=applyVerifiedCodingStrategyOutcomes(learned.state,failed);
  const row=afterFailure.state.codingStrategyMemory.strategies.RESPONSIBILITY_FIRST;
  assert.equal(row.contextModes.BOUNDED_FILE_EXCERPT_FALLBACK.verifiedFailures,1);
  preferred=preferredCodingStrategyForTask({task:{gameId:'g1',target:'web'},stateInput:afterFailure.state});
  assert.equal(preferred.preferredContextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.equal(preferred.preferredContextModeVerifiedFailures,0);
  assert.match(codingStrategyGuidance(preferred),/preferredContextMode=PRIMARY_SYMBOL_WINDOWS/);
});

test('same verified failure fingerprint outranks same-game history when selecting among globally preferred strategies',()=>{
  const mk=(id,gameId,strategy,fingerprint)=>({
    id,gameId,target:'web',evidence:[
      'role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS',
      `coding-strategy:${strategy}`,'coding-generation-attempts:1','coding-candidate-first-attempt:YES',
      `coding-failure-fingerprint:${fingerprint}`,`vibe2/candidate/${id}-primary-run`
    ]
  });
  const saveFp='web|SAVE_RESTORE_BROKEN';
  const mobileFp='web|MOBILE_PLACEMENT_INPUT_MISSING';
  const queue={tasks:[
    mk('a1','g3','RESPONSIBILITY_FIRST',saveFp),mk('a2','g3','RESPONSIBILITY_FIRST',saveFp),mk('a3','g3','RESPONSIBILITY_FIRST',saveFp),
    mk('a4','g4','RESPONSIBILITY_FIRST',saveFp),mk('a5','g4','RESPONSIBILITY_FIRST',saveFp),
    mk('b1','b1','CAUSAL_TRACE_FIRST',mobileFp),mk('b2','b1','CAUSAL_TRACE_FIRST',mobileFp),mk('b3','b1','CAUSAL_TRACE_FIRST',mobileFp),
    mk('b4','b2','CAUSAL_TRACE_FIRST',mobileFp),mk('b5','b2','CAUSAL_TRACE_FIRST',mobileFp)
  ]};
  const learned=applyVerifiedCodingStrategyOutcomes({},queue);
  assert.equal(learned.state.codingStrategyMemory.strategies.RESPONSIBILITY_FIRST.state,'PREFERRED');
  assert.equal(learned.state.codingStrategyMemory.strategies.CAUSAL_TRACE_FIRST.state,'PREFERRED');
  assert.equal(learned.state.codingStrategyMemory.strategies.CAUSAL_TRACE_FIRST.failureFingerprints[mobileFp].verifiedApplications,5);
  const task={gameId:'g3',target:'web',goal:'모바일 배치 입력 오류 수정',evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  const preferred=preferredCodingStrategyForTask({task,stateInput:learned.state});
  assert.equal(preferred.failureFingerprint,mobileFp);
  assert.equal(preferred.strategy,'CAUSAL_TRACE_FIRST');
  assert.equal(preferred.sameFailureApplications,5);
  assert.equal(preferred.sameGameSameFailureApplications,0);
  assert.equal(preferred.selectionReason,'SAME_FAILURE_VERIFIED');
  assert.equal(preferred.advisoryOnly,true);
  assert.equal(preferred.authorityExpanded,false);
  const guidance=codingStrategyGuidance(preferred);
  assert.match(guidance,/selectionReason=SAME_FAILURE_VERIFIED/);
  assert.match(guidance,/MUST NOT expand writable scope/);
});

test('contextual negative evidence lowers selection score without globally deprecating strategy',()=>{
  const fp='web|MOBILE_PLACEMENT_INPUT_MISSING';
  const positive=(strategy,prefix,games)=>Array.from({length:5},(_,i)=>({
    id:`${prefix}-${i}`,gameId:games[i%games.length],target:'web',evidence:[
      'role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS',
      `coding-strategy:${strategy}`,'coding-generation-attempts:1','coding-candidate-first-attempt:YES',
      `coding-failure-fingerprint:${fp}`,`vibe2/candidate/${prefix}-${i}-primary-run`
    ]
  }));
  const seeded=applyVerifiedCodingStrategyOutcomes({}, {tasks:[
    ...positive('RESPONSIBILITY_FIRST','r',['r1','r2']),
    ...positive('CAUSAL_TRACE_FIRST','c',['c1','c2'])
  ]});
  assert.equal(seeded.state.codingStrategyMemory.strategies.RESPONSIBILITY_FIRST.state,'PREFERRED');
  assert.equal(seeded.state.codingStrategyMemory.strategies.CAUSAL_TRACE_FIRST.state,'PREFERRED');
  const encodeFailure=(variant,run)=>'coding-strategy-negative:'+encodeURIComponent(JSON.stringify({
    version:1,variant,strategy:'CAUSAL_TRACE_FIRST',failureFingerprint:fp,failureClass:'EDIT_MATCH',runEvidence:`actions-run:${run}`,verifiedBy:'IMMUTABLE_WORKER_RESULT',infrastructureFailure:false
  }));
  const negativeTask={id:'negative-mobile',gameId:'new-game',target:'web',evidence:[encodeFailure('primary','n1'),encodeFailure('speculative-1','n2')]};
  const learned=applyVerifiedCodingStrategyOutcomes(seeded.state,{tasks:[negativeTask]});
  assert.equal(learned.negativeAdded,2);
  const causal=learned.state.codingStrategyMemory.strategies.CAUSAL_TRACE_FIRST;
  assert.equal(causal.state,'PREFERRED');
  assert.equal(causal.verifiedFailures,2);
  assert.equal(causal.failureFingerprints[fp].verifiedFailures,2);
  const preferred=preferredCodingStrategyForTask({task:{gameId:'new-game',target:'web',goal:'모바일 pointer placement 오류',evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'},stateInput:learned.state});
  assert.equal(preferred.strategy,'RESPONSIBILITY_FIRST');
  assert.equal(preferred.sameFailureVerifiedFailures,0);
  assert.equal(preferred.authorityExpanded,false);
  const deduped=applyVerifiedCodingStrategyOutcomes(learned.state,{tasks:[negativeTask]});
  assert.equal(deduped.negativeAdded,0);
});

test('verified regression outcomes calibrate overconfident responsibility and build same-game hotspot memory',()=>{
  const enc=value=>encodeURIComponent(JSON.stringify(value));
  const mk=(id,outcome)=>({
    id,gameId:'hot-game',target:'web',evidence:[
      'coding-responsibility-confidence:HIGH',
      'coding-primary-targets:'+enc(['handlePointer']),
      'coding-primary-systems:'+enc(['INPUT','PLACEMENT']),
      'coding-candidate-first-attempt:YES',
      'actions-run:'+id,
      ...(outcome==='PASS'?['role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS','coding-semantic-diff-mode:HARD_ENFORCE','coding-semantic-diff-pass:YES']:['failure-cause:fan-in-regression-failed'])
    ]
  });
  const learned=applyVerifiedCodingCalibration({}, {tasks:[mk('r1','FAIL'),mk('r2','FAIL'),mk('r3','PASS')]});
  assert.equal(learned.added,3);
  assert.equal(learned.hotspotEventsAdded,3);
  const calibration=responsibilityCalibrationForTask({task:{gameId:'hot-game',target:'web'},stateInput:learned.state});
  assert.equal(calibration.recommendation,'DOWNGRADE_HIGH_TO_MEDIUM');
  assert.equal(calibration.extraReadOnlyExploration,true);
  const hotspot=regressionHotspotRiskForTask({task:{gameId:'hot-game',target:'web'},stateInput:learned.state});
  assert.equal(hotspot.riskLevel,'MEDIUM');
  assert.ok(hotspot.entries.some(row=>row.kind==='SYMBOL'&&row.name==='handlePointer'&&row.verifiedRegressionFailures===2));
  assert.match(codingRiskGuidance({calibration,hotspot}),/raw HIGH must be treated as MEDIUM/);
  const deduped=applyVerifiedCodingCalibration(learned.state,{tasks:[mk('r1','FAIL'),mk('r2','FAIL'),mk('r3','PASS')]});
  assert.equal(deduped.added,0);
  assert.equal(deduped.hotspotEventsAdded,0);
});
test('verified architecture drift outcomes become reusable risk only after cross-game regression evidence',()=>{
  const fail=(id,gameId)=>({id,gameId,target:'web',evidence:[
    'architecture-drift-status:ANALYZED','architecture-drift-risk:HIGH','architecture-drift-score:6','architecture-drift-signals:GOD_FUNCTION_GROWTH,STATE_WRITER_FANOUT_GROWTH',
    'failure-cause:fan-in-regression-failed',`actions-run:${id}`
  ]});
  const pass={id:'p1',gameId:'g1',target:'web',evidence:[
    'architecture-drift-status:ANALYZED','architecture-drift-risk:LOW','architecture-drift-score:0','architecture-drift-signals:GOD_FUNCTION_GROWTH',
    'role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS','actions-run:p1'
  ]};
  const learned=applyVerifiedArchitectureDriftOutcomes({}, {tasks:[fail('f1','g1'),fail('f2','g2'),pass]});
  assert.equal(learned.added,3);
  const row=learned.state.architectureDriftMemory.signals.GOD_FUNCTION_GROWTH;
  assert.equal(row.verifiedRegressionFailures,2);
  assert.equal(row.verifiedPasses,1);
  assert.equal(row.state,'VERIFIED_RISK');
  const sameGame=architectureDriftRiskForTask({task:{gameId:'g1',target:'web'},stateInput:learned.state});
  assert.equal(sameGame.riskLevel,'HIGH');
  assert.equal(sameGame.hardReject,false);
  assert.match(architectureDriftGuidance(sameGame),/observe-first/);
  const deduped=applyVerifiedArchitectureDriftOutcomes(learned.state,{tasks:[fail('f1','g1'),fail('f2','g2'),pass]});
  assert.equal(deduped.added,0);
});

test('coding constitution promotes only repeated contextual preferred strategy evidence and remains advisory',()=>{
  const fingerprint='web|MOBILE_PLACEMENT_INPUT_MISSING';
  const state=createMasteryState({codingStrategyMemory:{strategies:{RESPONSIBILITY_FIRST:{
    verifiedApplications:7,firstCandidatePasses:6,verifiedFailures:0,games:{g1:4,g2:3},targets:{web:7},state:'PREFERRED',
    failureFingerprints:{[fingerprint]:{verifiedApplications:4,verifiedFailures:0,games:{g1:2,g2:2},failureGames:{},targets:{web:4}}}
  }}}});
  const constitution=buildCodingConstitution(state);
  assert.equal(constitution.rules.length,1);
  assert.equal(constitution.rules[0].strategy,'RESPONSIBILITY_FIRST');
  assert.equal(constitution.rules[0].advisoryOnly,true);
  const rule=codingConstitutionRuleForTask({task:{gameId:'g1',target:'web',goal:'pointer placement failure',evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']},stateInput:{...state,codingConstitution:constitution}});
  assert.equal(rule.matched,true);
  assert.equal(rule.authorityExpanded,false);
  assert.equal(rule.qaBypassAllowed,false);
  assert.match(codingConstitutionGuidance(rule),/MUST NOT expand writable scope/);
});

test('failure-local retrieval prioritizes verified same-game same-failure memory and ignores unverified records',()=>{
  const task={gameId:'tower-demo',target:'web',goal:'모바일 pointer placement failure를 수정',evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  const fp=failureFingerprintForTask(task);
  assert.ok(fp.includes('MOBILE_PLACEMENT_INPUT_MISSING'));
  const experienceInput={records:[
    {id:'same',gameId:'tower-demo',engine:'web',verified:true,reusable:true,outcome:'PASS',problem:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING pointer placement',change:'bind pointer state to placeTower',failureCause:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING',reusablePatterns:['trace input to placement state'],avoidPatterns:['do not patch unrelated economy'],confirmations:3},
    {id:'other-game',gameId:'other',engine:'web',verified:true,reusable:true,outcome:'PASS',problem:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING pointer placement',change:'fix input',failureCause:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING',reusablePatterns:['trace input'],avoidPatterns:[],confirmations:3},
    {id:'unverified',gameId:'tower-demo',engine:'web',verified:false,reusable:true,outcome:'PASS',problem:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING',change:'guess',failureCause:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING',reusablePatterns:['unsafe guess'],avoidPatterns:[]}
  ]};
  const result=retrieveUnifiedLearning({task,experienceInput,codePatternsInput:{patterns:[]},playbooksInput:{taskTypes:{}},practiceDistilledInput:{entries:[]},masteryInput:{}});
  assert.equal(result.failureFingerprint,fp);
  assert.equal(result.failureLocalMemory[0].id,'same');
  assert.ok(result.failureLocalMemory[0].reasons.includes('same-game-same-failure'));
  assert.equal(result.failureLocalMemory.some(row=>row.id==='unverified'),false);
  assert.ok(result.experience.find(row=>row.id==='same').relevance>result.experience.find(row=>row.id==='other-game').relevance);
});

test('repeated verified failure escalates tournament and idle drill without bypassing gates',()=>{
  const state=createMasteryState({failureSignatures:{fail_x:{count:3,domains:['SAVE'],example:'save regression'}}});
  const policy=candidateTournamentPolicy({task:{goal:'repair save regression',target:'web'},masteryInput:state});
  assert.equal(policy.candidateCount,3);
  assert.equal(policy.gateBypass,false);
  const idle=buildIdlePracticeQueue(state);
  assert.equal(idle.drills[0].kind,'REPRO_DRILL');
  assert.equal(idle.drills[0].countsAsProductionPass,false);
});

test('learning motor classifies concept world streaming persona relationship and narrative binding domains',()=>{
  for(const domain of [
    'CONCEPT_DIRECTION','VISUAL_IDENTITY','ENVIRONMENT_COMPOSITION','WORLD_GENERATION','LEVEL_DESIGN','NAVIGATION','ROUTE_DESIGN','STREAMING','STREAMING_OPTIMIZATION',
    'MAIN_STORY_GENERATION','QUEST_GRAPH','FORESHADOWING_PAYOFF','TWIST_EVIDENCE_CHAIN','CHARACTER_VOICE','CHARACTER_RELATIONSHIP_MEMORY',
    'CHARACTER_BEHAVIOR','COMPANION_BEHAVIOR','NPC_BEHAVIOR','MONSTER_BEHAVIOR_PERSONALITY','WORLD_NARRATIVE_BINDING'
  ])assert.ok(MASTERY_DOMAINS.includes(domain),domain);
  const world=classifyLearningDomains({target:'unity',goal:'Map DNA route graph shortcut navigation streaming chunk LOD concept blend style bible'});
  const worldDomains=world.ranked.map(row=>row.domain);
  assert.ok(worldDomains.includes('WORLD_GENERATION'));
  assert.ok(worldDomains.includes('ROUTE_DESIGN'));
  assert.ok(worldDomains.includes('STREAMING'));
  assert.ok(worldDomains.includes('CONCEPT_DIRECTION'));

  const narrative=classifyLearningDomains({target:'roblox',goal:'main story quest graph foreshadow payoff character voice companion behavior relationship memory world narrative binding'});
  const narrativeDomains=narrative.ranked.map(row=>row.domain);
  assert.ok(narrativeDomains.includes('MAIN_STORY_GENERATION'));
  assert.ok(narrativeDomains.includes('QUEST_GRAPH'));
  assert.ok(narrativeDomains.includes('FORESHADOWING_PAYOFF'));
  assert.ok(narrativeDomains.includes('CHARACTER_VOICE'));
  assert.ok(narrativeDomains.includes('COMPANION_BEHAVIOR'));
  assert.ok(narrativeDomains.includes('CHARACTER_RELATIONSHIP_MEMORY'));
  assert.ok(narrativeDomains.includes('WORLD_NARRATIVE_BINDING'));
});

test('learning motor exposes Roblox touch character and UI native domains',()=>{
  for(const domain of ['ROBLOX_TOUCH_INPUT','ROBLOX_CHARACTER_STATE','ROBLOX_UI_STATE'])assert.ok(MASTERY_DOMAINS.includes(domain));
  const classified=classifyLearningDomains({
    target:'roblox',
    goal:'ContextActionService touch input CharacterAdded respawn ScreenGui button RemoteEvent authoritative sync'
  });
  const all=classified.all;
  assert.ok(all.includes('ROBLOX_TOUCH_INPUT'));
  assert.ok(all.includes('ROBLOX_CHARACTER_STATE'));
  assert.ok(all.includes('ROBLOX_UI_STATE'));
});

test('Roblox target retrieval prefers verified Roblox-native Studio outcomes over generic cross-platform history',()=>{
  const task={gameId:'g-new',target:'roblox',goal:'repair RemoteEvent touch input and character respawn'};
  const experienceInput={records:[
    {id:'generic',gameId:'other',engine:'unity',verified:true,reusable:true,problem:'touch input character state',goal:'repair touch input',change:'fixed',outcome:'PASS',reusablePatterns:['generic touch input pattern'],avoidPatterns:[],confirmations:5},
    {id:'roblox-native',gameId:'other2',engine:'roblox',taskType:'roblox-studio-local-internal-play',verified:true,reusable:true,problem:'RemoteEvent touch input character respawn',goal:'repair Roblox native input',change:'fixed',outcome:'PASS',evidence:['roblox-native-actual-play-feedback:PASS','roblox-studio-local-runtime:PASS'],reusablePatterns:['verified-studio-local-play:roblox-touch-input'],avoidPatterns:[],confirmations:1}
  ]};
  const result=retrieveUnifiedLearning({task,experienceInput,codePatternsInput:{patterns:[]},playbooksInput:{taskTypes:{}},practiceDistilledInput:{entries:[]},masteryInput:{}});
  assert.equal(result.experience[0].id,'roblox-native');
  assert.ok(result.experience[0].reasons.includes('roblox-native-verified'));
  assert.equal(result.priority[1],'ROBLOX_NATIVE_VERIFIED_WHEN_TARGET_ROBLOX');
});

test('benchmark ladder includes narrative tracks and never counts directly as training sample',()=>{
  const ladder=buildBenchmarkLadder({});
  assert.equal(ladder.cases.length,26);
  assert.ok(ladder.cases.some(x=>x.track==='STORYTELLING'));
  assert.ok(ladder.cases.some(x=>x.track==='QUEST_DESIGN'));
  assert.ok(ladder.cases.some(x=>x.track==='CHARACTER_ARC'));
  assert.ok(ladder.cases.some(x=>x.track==='DIALOGUE'));
  assert.ok(ladder.cases.some(x=>x.track==='CONCEPT_DIRECTION'));
  assert.ok(ladder.cases.some(x=>x.track==='WORLD_GENERATION'));
  assert.ok(ladder.cases.some(x=>x.track==='STREAMING_OPTIMIZATION'));
  assert.ok(ladder.cases.some(x=>x.track==='FORESHADOWING_PAYOFF'));
  assert.ok(ladder.cases.some(x=>x.track==='CHARACTER_BEHAVIOR'));
  assert.ok(ladder.cases.some(x=>x.track==='RELATIONSHIP_MEMORY'));
  assert.ok(ladder.cases.some(x=>x.track==='UNITY_NATIVE'));
  assert.ok(ladder.cases.some(x=>x.track==='FORTNITE_UEFN_NATIVE'));
  assert.ok(ladder.cases.every(x=>x.countsAsTrainingSample===false));
});

test('Roblox handoff reuses only verified same-game Web semantic experience',()=>{
  const pack=buildWebRobloxHandoffs({items:[{
    gameId:'g-sem',selectedPlatform:'ROBLOX',formalImplementationPassed:true
  }]},{records:[{
    id:'web-sem-1',gameId:'g-sem',engine:'web',outcome:'PASS',verified:true,reusable:true,lastVerifiedAt:'2026-09-18T00:00:00Z',
    evidence:['web-runtime-evidence:design/g-sem/web-gameplay-validation.json'],
    reusablePatterns:[
      'WEB_SEMANTIC:CORE_LOOP:place → defend → reward',
      'WEB_SEMANTIC:STATE_MODEL:meaningful-state-transitions=20',
      'WEB_SEMANTIC:PROGRESSION_MODEL:wave-by-wave',
      'WEB_SEMANTIC:UI_FLOW:배치 → 강화 → 웨이브 시작',
      'WEB_SEMANTIC:INPUT_INTENT:touch-first / action-primary',
      'WEB_SEMANTIC:SAVE_MEANING:verified runtime save/restore of current gameplay state',
      'WEB_SEMANTIC:CONTENT_STRUCTURE:lane-defense / wave-events',
      'WEB_SEMANTIC:BALANCE_INTENT:wave pressure and counter balance'
    ]
  },{
    id:'unverified',gameId:'g-sem',engine:'web',outcome:'PASS',verified:false,reusable:true,
    reusablePatterns:['WEB_SEMANTIC:CORE_LOOP:must-not-win']
  }]});
  assert.equal(pack.handoffs.length,1);
  const handoff=pack.handoffs[0];
  assert.equal(handoff.CORE_LOOP,'place → defend → reward');
  assert.equal(handoff.WEB_RUNTIME_EVIDENCE,'design/g-sem/web-gameplay-validation.json');
  assert.deepEqual(handoff.verifiedSemanticExperienceIds,['web-sem-1']);
  assert.equal(handoff.complete,true);
  assert.equal(handoff.webEvidenceSubstitutesRobloxQa,false);
});

test('Web to Roblox handoff cannot replace Roblox QA',()=>{
  const pack=buildWebRobloxHandoffs({items:[{
    gameId:'g1',selectedPlatform:'ROBLOX',webValidationPassedAt:'2026-09-18T00:00:00Z',
    coreLoop:'loop',stateModel:'state',progressionModel:'progress',uiFlow:'ui',inputIntent:'touch',
    saveMeaning:'save',contentStructure:'content',balanceIntent:'balance'
  }]});
  assert.equal(pack.handoffs.length,1);
  assert.equal(pack.handoffs[0].robloxNativeReimplementationRequired,true);
  assert.equal(pack.handoffs[0].webEvidenceSubstitutesRobloxQa,false);
  assert.equal(pack.gateBypass,false);
});

test('project machine state carries canonical web to Roblox lifecycle context',()=>{
  const sha='a'.repeat(40);
  const artifact='sha256:'+'b'.repeat(64);
  const pack=buildWebRobloxHandoffs({items:[
    {
      gameId:'g-web',selectedPlatform:'ROBLOX',genre:'Survival'
    },
    {
      gameId:'g-handoff',selectedPlatform:'ROBLOX',genre:'RPG',webPromotionRevalidationPassed:true,
      coreLoop:'explore-fight-reward',stateModel:'state',progressionModel:'progress',uiFlow:'ui',
      inputIntent:'touch',saveMeaning:'save',contentStructure:'content',balanceIntent:'balance',
      webValidationPassedAt:'2026-09-19T00:00:00Z'
    },
    {
      gameId:'g-release',selectedPlatform:'ROBLOX',genre:'Simulation',webPromotionRevalidationPassed:true,
      coreLoop:'build-earn-upgrade',stateModel:'state',progressionModel:'progress',uiFlow:'ui',
      inputIntent:'touch',saveMeaning:'save',contentStructure:'content',balanceIntent:'balance',
      webValidationPassedAt:'2026-09-19T00:00:00Z',
      robloxSourceCommit:sha,robloxBuildArtifactIdentity:artifact,robloxReleaseClaim:true,
      robloxFinalReviewPassed:true,robloxRegressionPassed:true,robloxExactRevisionPassed:true,
      robloxReleaseEvidence:{published:true,sourceRevision:sha,artifactIdentity:artifact,versionNumber:1}
    }
  ]});
  const required=['PROJECT_PHASE','PLATFORM','GENRE','WEB_BASELINE','ROBLOX_HANDOFF','POST_RELEASE_FOCUS_RUNNER','LEARNING_CONTEXT','NEXT_MACHINE_ACTION'];
  assert.deepEqual(pack.requiredProjectFields,required);
  assert.equal(pack.projects.length,3);
  for(const project of pack.projects)for(const field of required)assert.equal(Object.hasOwn(project,field),true,`${project.gameId} missing ${field}`);
  const web=pack.projects.find(project=>project.gameId==='g-web');
  assert.equal(web.PROJECT_PHASE,'WEB_BASE_IMPLEMENTATION');
  assert.equal(web.WEB_BASELINE.state,'PENDING');
  assert.equal(web.NEXT_MACHINE_ACTION,'IMPLEMENT_WEB_CORE_LOOP_AND_BASE_SYSTEMS');
  const handoff=pack.projects.find(project=>project.gameId==='g-handoff');
  assert.equal(handoff.PROJECT_PHASE,'TARGET_PLATFORM_SOURCE_BIND');
  assert.equal(handoff.ROBLOX_HANDOFF.complete,true);
  assert.equal(handoff.LEARNING_CONTEXT.continuousLearning,true);
  assert.equal(handoff.POST_RELEASE_FOCUS_RUNNER.assigned,false);
  const released=pack.projects.find(project=>project.gameId==='g-release');
  assert.equal(released.PROJECT_PHASE,'POST_RELEASE_FOCUSED_DEVELOPMENT');
  assert.equal(released.POST_RELEASE_FOCUS_RUNNER.assigned,true);
  assert.equal(released.POST_RELEASE_FOCUS_RUNNER.logicalRunnerPerProject,1);
  assert.equal(released.NEXT_MACHINE_ACTION,'CONTINUE_ONE_FOCUSED_VERIFIED_DEVELOPMENT_CYCLE');
});





test('project lifecycle never regresses downstream Roblox machine evidence because genre metadata is missing',()=>{
  const sha='c'.repeat(40);
  const pack=buildWebRobloxHandoffs({items:[
    {
      gameId:'g-source-no-genre',
      selectedPlatform:'ROBLOX',
      currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',
      robloxSourceCommit:sha,
      robloxRuntimePassed:false,
      robloxIndependentQaPassed:false,
      robloxRegressionPassed:false
    },
    {
      gameId:'g-runtime-no-genre',
      selectedPlatform:'ROBLOX',
      currentStep:'TARGET_PLATFORM_SOURCE_BIND',
      robloxSourceCommit:sha,
      robloxRuntimePassed:false,
      robloxIndependentQaPassed:false,
      robloxRegressionPassed:false,
      executionEvidence:{
        sourceRevision:sha,
        runtimePassed:true,
        independentQaPassed:false,
        regressionPassed:false,
        failureStage:'INDEPENDENT_QA'
      }
    },
    {
      gameId:'g-qa-no-genre',
      selectedPlatform:'ROBLOX',
      robloxSourceCommit:sha,
      executionEvidence:{
        sourceRevision:sha,
        runtimePassed:true,
        independentQaPassed:true,
        regressionPassed:false,
        failureStage:'REGRESSION'
      }
    }
  ]});
  const source=pack.projects.find(project=>project.gameId==='g-source-no-genre');
  assert.equal(source.GENRE,null);
  assert.equal(source.PROJECT_PHASE,'TARGET_PLATFORM_RUNTIME');
  assert.equal(source.NEXT_MACHINE_ACTION,'RUN_TARGET_PLATFORM_RUNTIME');

  const runtime=pack.projects.find(project=>project.gameId==='g-runtime-no-genre');
  assert.equal(runtime.GENRE,null);
  assert.equal(runtime.PROJECT_PHASE,'TARGET_PLATFORM_INDEPENDENT_QA');
  assert.equal(runtime.NEXT_MACHINE_ACTION,'RUN_TARGET_PLATFORM_INDEPENDENT_QA');

  const qa=pack.projects.find(project=>project.gameId==='g-qa-no-genre');
  assert.equal(qa.PROJECT_PHASE,'TARGET_PLATFORM_REGRESSION');
  assert.equal(qa.NEXT_MACHINE_ACTION,'RUN_TARGET_PLATFORM_REGRESSION');
});

test('24h company graphics library keeps Unity and Roblox preparation drills rotating in idle capacity',()=>{
  const idle=buildIdlePracticeQueue({});
  assert.equal(idle.version,4);
  assert.equal(idle.productionWorkAlwaysPreemptsPractice,false);
  assert.equal(idle.companyGraphicsLibrary24h.enabled,true);
  assert.equal(idle.companyGraphicsLibrary24h.drillCount,62);
  const library=idle.drills.filter(row=>row.companyGraphicsLibrary===true);
  assert.equal(library.length,62);
  assert.deepEqual([...new Set(library.map(row=>row.platformProfile))].sort(),['ROBLOX','UNITY']);
  assert.ok(library.some(row=>row.kind==='CHARACTER_ARCHETYPE_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='CREATURE_RIG_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='ACTION_MOTION_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='WEAPON_MOTION_LIBRARY_DRILL'));
  assert.equal(idle.companyGraphicsLibrary24h.studioAssetUniverse,true);
  assert.equal(idle.companyGraphicsLibrary24h.universalCoverageScanner,true);
  assert.equal(idle.companyGraphicsLibrary24h.autonomousGapFill24h,true);
  assert.equal(idle.companyGraphicsLibrary24h.learningLaneConcurrentWithProduction,true);
  assert.ok(library.some(row=>row.kind==='CREATURE_UNIVERSE_DRILL'));
  assert.ok(library.some(row=>row.kind==='CLOTHING_ARMOR_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='BUILDING_MODULAR_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='BIOME_DNA_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='GAME_VISUAL_DNA_DRILL'));
  assert.ok(library.some(row=>row.kind==='ASSET_LOADOUT_SELECTION_DRILL'));
  assert.ok(library.some(row=>row.kind==='FUTURE_ASSET_DEMAND_FORECAST_DRILL'));
  assert.ok(library.some(row=>row.kind==='PLATFORM_VARIANT_OPTIMIZATION_DRILL'));
  assert.ok(library.some(row=>row.kind==='STUDIO_TESTBED_DRILL'));
  assert.ok(library.some(row=>row.kind==='VERIFIED_ASSET_USAGE_FEEDBACK_DRILL'));
  assert.ok(library.some(row=>row.kind==='GENRE_WORLD_GRAMMAR_DRILL'));
  assert.ok(library.some(row=>row.kind==='MATERIAL_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='AUDIO_VARIATION_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='SKILL_PRESENTATION_LIBRARY_DRILL'));
  assert.ok(library.some(row=>row.kind==='UNIVERSAL_ASSET_COVERAGE_DRILL'));
  const action=library.find(row=>row.kind==='ACTION_MOTION_LIBRARY_DRILL'&&row.platformProfile==='UNITY');
  const queued=injectIdlePracticeTask({tasks:[]},{drills:[action]});
  assert.equal(queued.added,true);
  assert.ok(queued.task.evidence.includes('company-graphics-library-24h'));
  assert.ok(queued.task.evidence.includes('company-graphics-platform:UNITY'));
  assert.match(queued.task.goal,/platformProfile=UNITY/);
  assert.match(queued.task.goal,/idle 4종 이상/);
  assert.ok(queued.task.evidence.includes('production-pass:NO'));
});

test('practice signals are generated even while production work exists and only priority changes',()=>{
  const idle={drills:[{id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE'],productionPreemptible:true,countsAsProductionPass:false}]};
  const busy=injectIdlePracticeTask({tasks:[{id:'prod',status:'queued',department:'development',type:'implementation',evidence:[]}]},idle);
  assert.equal(busy.added,true);
  assert.equal(busy.task.department,'learning');
  assert.equal(busy.task.type,'research');
  assert.match(busy.task.id,/-g1$/);
  assert.ok(busy.task.evidence.includes('learning-practice-only'));
  assert.ok(busy.task.evidence.includes('learning-web-artifact-practice'));
  assert.ok(busy.task.evidence.includes('production-pass:NO'));
  assert.equal(busy.artifactPractice,true);
  assert.equal(busy.practiceGeneration,1);
});

test('verified Web practice result creates the next generation and carries the previous score',()=>{
  const idle={drills:[{id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE'],productionPreemptible:true,countsAsProductionPass:false}]};
  const first=injectIdlePracticeTask({tasks:[]},idle);
  const verified={...first.task,status:'verified',evidence:[...first.task.evidence,'practice-artifact-score:82','practice-artifact-improved:YES']};
  const second=injectIdlePracticeTask({tasks:[verified]},idle);
  assert.equal(second.added,true);
  assert.match(second.task.id,/-g2$/);
  assert.equal(second.practiceGeneration,2);
  assert.equal(second.previousArtifactScore,82);
  assert.match(second.task.goal,/previousArtifactScore=82/);
  assert.match(second.task.goal,/practiceGeneration=2/);
});

test('failed non-improving practice never lowers the next generation baseline',()=>{
  const idle={drills:[{id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE'],productionPreemptible:true,countsAsProductionPass:false}]};
  const first=injectIdlePracticeTask({tasks:[]},idle);
  const verified={...first.task,status:'verified',evidence:[...first.task.evidence,'practice-artifact-score:82','practice-artifact-improved:YES']};
  const second=injectIdlePracticeTask({tasks:[verified]},idle);
  const failed={...second.task,status:'failed',evidence:[...second.task.evidence,'practice-artifact-score:79','practice-artifact-improved:NO']};
  const third=injectIdlePracticeTask({tasks:[verified,failed]},idle);
  assert.equal(third.added,true);
  assert.match(third.task.id,/-g3$/);
  assert.equal(third.practiceGeneration,3);
  assert.equal(third.previousArtifactScore,82);
  assert.match(third.task.goal,/previousArtifactScore=82/);
});


test('verified internal code patterns raise mastery without raw code',()=>{
  const result=applyVerifiedCodePatternsToMastery({}, {patterns:[
    {id:'save1',verified:true,rawCodeStored:false,independentQa:'PASS',system:'SAVE_PERSISTENCE',engine:'web',pattern:'VERIFIED_SAVE_PERSISTENCE_SMALLEST_RESPONSIBLE_CHANGE_WITH_REGRESSION'}
  ]});
  assert.equal(result.added,1);
  assert.ok(result.state.domains.SAVE.xp>0);
  const rejected=applyVerifiedCodePatternsToMastery({}, {patterns:[
    {id:'bad',verified:true,rawCodeStored:true,independentQa:'PASS',system:'SAVE_PERSISTENCE'}
  ]});
  assert.equal(rejected.added,0);
});


test('duplicate completed practice collapses without starving untouched lower generations',()=>{
  const practice=(id,status='failed',retries=1,evidence=[])=>({
    id,status,retries,maxRetries:1,target:'web',department:'learning',type:'research',sourceRoot:'learning-practice:test',
    evidence:['learning-practice-only','production-pass:NO',...evidence]
  });
  const queue={tasks:[
    practice('LEARNING-PRACTICE-gap-asset_production-l1-g1','failed',3,['failure-cause:learning-practice-worker-failed']),
    practice('LEARNING-PRACTICE-gap-asset_production-l1-g1','failed',2,['learning-practice-complete'])
  ]};
  const idle={drills:[
    {id:'gap-asset_production-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['ASSET_PRODUCTION']},
    {id:'gap-economy-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['ECONOMY']}
  ]};
  const result=injectIdlePracticeTask(queue,idle);
  assert.equal(result.added,true);
  assert.equal(result.deduped,1);
  assert.equal(result.queue.tasks.filter(t=>t.id==='LEARNING-PRACTICE-gap-asset_production-l1-g1').length,1);
  assert.equal(result.task.id,'LEARNING-PRACTICE-gap-economy-l1-g1');
  assert.equal(result.practiceGeneration,1);
  const assetOnly=injectIdlePracticeTask({tasks:result.queue.tasks.filter(t=>!t.id.includes('gap-economy-l1'))},{drills:[idle.drills[0]]});
  assert.equal(assetOnly.task.id,'LEARNING-PRACTICE-gap-asset_production-l1-g2');
  assert.equal(assetOnly.practiceGeneration,2);
});

test('idle-practice dedupe never merges unrelated production tasks',()=>{
  const rows=[
    {id:'prod-a',status:'queued',evidence:[]},
    {id:'prod-a',status:'queued',evidence:[]},
    {id:'LEARNING-PRACTICE-gap-save-l1',status:'failed',retries:1,evidence:['learning-practice-only']},
    {id:'LEARNING-PRACTICE-gap-save-l1',status:'failed',retries:2,evidence:['learning-practice-only']}
  ];
  const result=dedupeIdlePracticeTasks(rows);
  assert.equal(result.changed,true);
  assert.equal(result.removed,1);
  assert.equal(result.tasks.filter(t=>t.id==='prod-a').length,2);
  assert.equal(result.tasks.filter(t=>t.id==='LEARNING-PRACTICE-gap-save-l1').length,1);
});


test('idle practice model answers require verification and distillation before reuse',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/vibe2-learning-motor.json',import.meta.url),'utf8'));
  const boundary=policy.idleTraining?.knowledgeBoundary||{};
  assert.equal(boundary.rawPracticeModelAnswerAuthority,'UNTRUSTED_PRACTICE_OUTPUT');
  assert.equal(boundary.rawPracticeModelAnswerMayEnterRetrieval,false);
  assert.equal(boundary.rawPracticeModelAnswerMayBecomeExperience,false);
  assert.equal(boundary.rawPracticeModelAnswerMayIncreaseMastery,false);
  assert.equal(boundary.rawPracticeModelAnswerMayEnterCanonicalTraining,false);
  assert.equal(boundary.independentVerificationRequiredBeforeReuse,true);
  assert.equal(boundary.distillationRequiredBeforeReuse,true);
  assert.equal(boundary.distiller,'tools/vibe2-practice-distillation.mjs');
  assert.equal(boundary.distilledKnowledgeStore,'.vibe2/practice-distilled-knowledge.json');
  assert.equal(boundary.minimumTraceableVerificationEvidenceItems,2);
  assert.equal(boundary.candidateTextPersistentStorage,false);
  assert.equal(boundary.verifiedDistilledLessonAuthority,'VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE');
  assert.equal(boundary.verifiedDistilledLessonMayEnterRetrieval,true);
  assert.equal(boundary.verifiedProjectOutcomeStillRequiredForPositiveMasteryOrTraining,true);
  assert.equal(boundary.authorityExpanded,false);
  assert.equal(policy.modelTraining?.practiceRawModelOutputDirectTraining,false);
  assert.equal(policy.modelTraining?.practiceDistilledKnowledgeDirectTraining,false);
});

test('external AI learning policy is distillation-only and cannot directly train or develop',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/vibe2-learning-motor.json',import.meta.url),'utf8'));
  assert.equal(policy.externalAiKnowledgePolicy?.mode,'DISTILLATION_ONLY');
  assert.equal(policy.externalAiKnowledgePolicy?.rawExternalAiOutputMayEnterDevelopment,false);
  assert.equal(policy.externalAiKnowledgePolicy?.rawExternalAiOutputMayEnterRetrieval,false);
  assert.equal(policy.externalAiKnowledgePolicy?.externalAiMayWriteGameSource,false);
  assert.equal(policy.externalAiKnowledgePolicy?.externalAiMayDirectlyIncreaseMastery,false);
  assert.equal(policy.externalAiKnowledgePolicy?.externalAiMayDirectlyCreateCanonicalTrainingSample,false);
  assert.equal(policy.externalAiKnowledgePolicy?.minimumTraceableVerificationEvidenceItems,2);
  assert.equal(policy.modelTraining?.externalAiRawOutputDirectTraining,false);
  assert.equal(policy.modelTraining?.externalAiDistilledKnowledgeDirectTraining,false);
  assert.equal(policy.modelTraining?.verifiedProjectOutcomeStillRequired,true);
  assert.equal(policy.externalAiDistillation?.advisoryOnly,true);
  assert.equal(policy.externalAiDistillation?.directSourceWrite,false);
  assert.equal(policy.externalAiDistillation?.directProductionPass,false);
  assert.equal(policy.externalAiDistillation?.directMasteryCredit,false);
  assert.equal(policy.externalAiDistillation?.directCanonicalTrainingSample,false);
});


test('verified distilled practice knowledge is advisory retrieval only',()=>{
  const ctx=retrieveUnifiedLearning({
    task:{gameId:'g1',target:'web',goal:'repair save restore persistence'},
    practiceDistilledInput:{entries:[
      {id:'pd-save',domain:'SAVE',verified:true,independentlyVerified:true,retrievalEligible:true,authority:'VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE',confirmations:3,verificationEvidence:['code-pattern:p1:r1','code-pattern:p2:r2']},
      {id:'pd-bad',domain:'SAVE',verified:false,independentlyVerified:false,retrievalEligible:true,authority:'VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE',confirmations:99,verificationEvidence:['x','y']}
    ]}
  });
  assert.equal(ctx.practiceDistilled.length,1);
  assert.equal(ctx.practiceDistilled[0].id,'pd-save');
  assert.equal(ctx.practiceDistilled[0].domain,'SAVE');
  assert.ok(ctx.priority.includes('VERIFIED_PRACTICE_DISTILLED_ADVISORY'));
});


test('idle practice advances beyond the first five represented mastery gaps',()=>{
  const idle=buildIdlePracticeQueue({});
  assert.ok(idle.drills.length>5);
  const represented=idle.drills.slice(0,5).map(drill=>({
    id:`LEARNING-PRACTICE-${drill.id}`,
    status:'done',
    retries:0,
    maxRetries:1,
    target:'web',
    type:'research',
    sourceRoot:`learning-practice:${drill.id}`,
    evidence:['learning-practice-only','production-pass:NO','learning-practice-complete']
  }));
  const result=injectIdlePracticeTask({tasks:represented},idle);
  assert.equal(result.added,true);
  assert.equal(result.reason,'PRACTICE_SIGNAL_ENQUEUED');
  assert.equal(result.task.id,`LEARNING-PRACTICE-${idle.drills[5].id}-g1`);
  assert.equal(result.task.type,'research');
  assert.ok(result.task.evidence.includes('production-pass:NO'));
});


test('24H project state includes post-release control queue work without inventing Web evidence',()=>{
  const pack=buildWebRobloxHandoffs(
    {items:[]},
    {records:[{
      id:'exp-focus',gameId:'focus-game',engine:'web',verified:true,reusable:true,outcome:'PASS',
      reusablePatterns:['WEB_SEMANTIC:CORE_LOOP:verified-loop']
    }]},
    {tasks:[{
      id:'focus-task',gameId:'focus-game',target:'roblox',department:'development',type:'implementation',
      releaseState:'release-confirmed',status:'queued',postReleaseFocused:true,
      packageLongWorkProtected:true,packageRole:'implementation-owner',
      evidence:['post-release-focused:yes','recombination-recipe:recipe-focus']
    }]},
    {permanentProjectRemoval:{ids:[]}}
  );
  assert.equal(pack.projects.length,1);
  assert.equal(pack.handoffs.length,0);
  const project=pack.projects[0];
  assert.equal(project.gameId,'focus-game');
  assert.equal(project.PROJECT_PHASE,'POST_RELEASE_FOCUSED_DEVELOPMENT');
  assert.equal(project.PLATFORM,'ROBLOX');
  assert.equal(project.WEB_BASELINE.verified,false);
  assert.equal(project.WEB_BASELINE.currentCompanyWebBaselineBound,false);
  assert.equal(project.ROBLOX_HANDOFF.ready,false);
  assert.equal(project.ROBLOX_HANDOFF.currentWebHandoffClaim,false);
  assert.equal(project.POST_RELEASE_FOCUS_RUNNER.assigned,true);
  assert.equal(project.POST_RELEASE_FOCUS_RUNNER.state,'ASSIGNED');
  assert.equal(project.LEARNING_CONTEXT.verifiedSemanticExperienceIds[0],'exp-focus');
  assert.equal(project.LEARNING_CONTEXT.recombinationRecipeId,'recipe-focus');
  assert.equal(project.LEARNING_CONTEXT.gateBypass,false);
  assert.equal(project.NEXT_MACHINE_ACTION,'EXECUTE_POST_RELEASE_FOCUSED_GAP');
});

test('permanent project removal excludes stale company and control queue lifecycle projection',()=>{
  const removed='seed-roblox-battleground-fight-welcome-to-bloxburg';
  const roadmap={permanentProjectRemoval:{
    ids:[removed],
    reentryAllowed:false,
    automaticRecoveryAllowed:false,
    automaticMaintenanceAllowed:false
  }};
  const pack=buildWebRobloxHandoffs(
    {items:[{
      gameId:removed,selectedPlatform:'ROBLOX',genre:'Fighting',webPromotionRevalidationPassed:true,
      coreLoop:'stale',stateModel:'stale',progressionModel:'stale',uiFlow:'stale',
      inputIntent:'stale',saveMeaning:'stale',contentStructure:'stale',balanceIntent:'stale'
    }]},
    {records:[]},
    {tasks:[{
      id:'stale-historical',gameId:removed,target:'roblox',department:'development',type:'implementation',
      releaseState:'development-confirmed',status:'cancelled',blocker:'lifecycle-inactive:MISSING_FROM_CATALOG',
      postReleaseFocused:true,historicalDeploymentRecovery:true,packageLongWorkProtected:true,packageRole:'implementation-owner',
      evidence:['post-release-focused:yes','historical-deployment-recovery:yes','historical-current-release-claim:NO']
    }]},
    roadmap
  );
  assert.equal(pack.projects.length,0);
  assert.equal(pack.handoffs.length,0);
  assert.equal(pack.gateBypass,false);
});


test('verified recovery code pattern raises recovery mastery while advisory external pattern does not',()=>{
  const result=applyVerifiedCodePatternsToMastery({}, {patterns:[
    {id:'recovery1',verified:true,rawCodeStored:false,independentQa:'PASS',masteryEligible:true,system:'QUEUE_RECOVERY',engine:'system',pattern:'VERIFIED_RECOVERY_QUEUE_RECOVERY'},
    {id:'external1',verified:true,rawCodeStored:false,independentQa:'STATIC_ONLY',masteryEligible:false,system:'SAVE_PERSISTENCE',engine:'external-authorized',pattern:'AUTHORIZED_EXTERNAL_GENERALIZED_SAVE_PERSISTENCE_ADVISORY_ONLY'}
  ]});
  assert.equal(result.added,1);
  assert.ok(result.state.domains.RECOVERY.xp>0);
  assert.ok(result.state.domains.DEBUGGING.xp>0);
});

test('authorized external generalized patterns remain retrieval advisory without mastery credit',()=>{
  const ctx=retrieveUnifiedLearning({
    task:{gameId:'g1',target:'web',goal:'repair save retry recovery'},
    codePatternsInput:{patterns:[{
      id:'external-save',verified:true,rawCodeStored:false,independentQa:'STATIC_ONLY',masteryEligible:false,
      system:'SAVE_PERSISTENCE',engine:'external-authorized',pattern:'AUTHORIZED_EXTERNAL_GENERALIZED_SAVE_PERSISTENCE_ADVISORY_ONLY',
      tags:['authorized-external','retrieval-only']
    }]}
  });
  assert.equal(ctx.codePatterns.length,1);
  assert.equal(ctx.codePatterns[0].id,'external-save');
});


test('verified narrative experience raises narrative mastery domains',()=>{
  const learned=applyVerifiedExperienceToMastery({}, {records:[{
    id:'story-exp-1',gameId:'magic-forest',engine:'web',verified:true,reusable:true,outcome:'PASS',
    goal:'스토리 퀘스트와 캐릭터 아크 대화를 개선한다',
    change:'narrative structure foreshadow payoff quest prerequisite character motivation dialogue subtext',
    reusablePatterns:['storytelling narrative structure quest design character arc dialogue']
  }]});
  assert.equal(learned.added,1);
  for(const domain of ['STORYTELLING','NARRATIVE_STRUCTURE','QUEST_DESIGN','CHARACTER_ARC','DIALOGUE']){
    assert.ok(learned.state.domains[domain].xp>0,domain);
  }
});

test('narrative mastery gaps create dedicated idle drills',()=>{
  const idle=buildIdlePracticeQueue({});
  const byDomain=new Map(idle.drills.filter(row=>Array.isArray(row.domains)&&row.domains.length===1).map(row=>[row.domains[0],row]));
  assert.equal(byDomain.get('STORYTELLING')?.kind,'NARRATIVE_STRUCTURE_DRILL');
  assert.equal(byDomain.get('NARRATIVE_STRUCTURE')?.kind,'NARRATIVE_STRUCTURE_DRILL');
  assert.equal(byDomain.get('QUEST_DESIGN')?.kind,'QUEST_CAUSALITY_DRILL');
  assert.equal(byDomain.get('CHARACTER_ARC')?.kind,'CHARACTER_ARC_DRILL');
  assert.equal(byDomain.get('DIALOGUE')?.kind,'DIALOGUE_SCENE_DRILL');
  const queued=injectIdlePracticeTask({tasks:[]},{drills:[byDomain.get('QUEST_DESIGN')]});
  assert.equal(queued.added,true);
  assert.match(queued.task.goal,/선행 조건/);
  assert.ok(queued.task.evidence.includes('practice-domain:QUEST_DESIGN'));
});

test('narrative policy forbids raw unlicensed novel ingestion and direct training credit',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/vibe2-learning-motor.json',import.meta.url),'utf8'));
  assert.equal(policy.narrativeLearning?.enabled,true);
  assert.equal(policy.narrativeLearning?.existingLearningMotorOnly,true);
  assert.equal(policy.narrativeLearning?.separateTrainerForbidden,true);
  assert.equal(policy.narrativeLearning?.practiceDistillation?.rawCandidateTextStored,false);
  assert.equal(policy.narrativeLearning?.practiceDistillation?.directMasteryCredit,false);
  assert.equal(policy.narrativeLearning?.practiceDistillation?.directCanonicalTrainingSample,false);
  assert.equal(policy.narrativeLearning?.sourcePolicy?.unlicensedCopyrightedFullTextPersistentIngestionForbidden,true);
  assert.equal(policy.narrativeLearning?.sourcePolicy?.rawPassageReuseForbidden,true);
});


test('verified presentation experience raises presentation mastery domains',()=>{
  const learned=applyVerifiedExperienceToMastery({}, {records:[{
    id:'presentation-exp-1',gameId:'motion-game',engine:'web',verified:true,reusable:true,outcome:'PASS',
    goal:'asset adaptation living motion animation feel VFX audio feel camera language polish',
    change:'style lock idle breath locomotion blend anticipation hit stop recoil particle trail adaptive music crossfade camera shake',
    reusablePatterns:['asset adaptation living motion animation feel vfx audio feel camera language']
  }]});
  assert.equal(learned.added,1);
  for(const domain of ['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE']){
    assert.ok(learned.state.domains[domain].xp>0,domain);
  }
});

test('presentation mastery gaps create dedicated practice drills',()=>{
  const idle=buildIdlePracticeQueue({});
  const byDomain=new Map(idle.drills.filter(row=>Array.isArray(row.domains)&&row.domains.length===1).map(row=>[row.domains[0],row]));
  assert.equal(byDomain.get('ASSET_ADAPTATION')?.kind,'ASSET_ADAPTATION_DRILL');
  assert.equal(byDomain.get('LIVING_MOTION')?.kind,'MOTION_CONTINUITY_DRILL');
  assert.equal(byDomain.get('ANIMATION_FEEL')?.kind,'ANIMATION_FEEL_DRILL');
  assert.equal(byDomain.get('VFX')?.kind,'VFX_READABILITY_DRILL');
  assert.equal(byDomain.get('AUDIO_FEEL')?.kind,'AUDIO_FEEL_DRILL');
  assert.equal(byDomain.get('CAMERA_LANGUAGE')?.kind,'CAMERA_LANGUAGE_DRILL');
});

test('presentation learning policy requires verified runtime outcome and preserves gameplay semantics',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/vibe2-learning-motor.json',import.meta.url),'utf8'));
  assert.equal(policy.presentationLearning?.enabled,true);
  assert.equal(policy.presentationLearning?.existingLearningMotorOnly,true);
  assert.equal(policy.presentationLearning?.shadowTrainerForbidden,true);
  assert.equal(policy.presentationLearning?.positiveMasteryRequiresVerifiedProjectOutcome,true);
  assert.equal(policy.presentationLearning?.runtimeQaRequiredForProductionCompletion,true);
  assert.equal(policy.presentationLearning?.staticQaDoesNotReplaceRuntime,true);
  assert.ok(policy.presentationLearning?.invariants?.includes('SAVE_MEANING_UNCHANGED'));
  assert.ok(policy.presentationLearning?.invariants?.includes('HIT_SEMANTICS_UNCHANGED'));
});


test('phase 4 generalization candidate enters existing idle practice as paired control then challenger screen',()=>{
  const capability={
    id:'cap-phase4-practice',
    gameId:'source-game',
    engine:'web',
    departments:['development','qa'],
    taskType:'coding-capability-distillation',
    problem:'save restore ordering',
    goal:'repair save restore flow',
    change:'verified save restore strategy',
    outcome:'PASS',
    evidence:['actions-run:500','fan-in-review:PASS'],
    reusablePatterns:['CAPABILITY:CROSS_GAME_SAVE_RESTORE'],
    verified:true,
    capabilityApplications:[
      {applicationId:'p4-app-1',taskId:'a1',workKey:'game-a:web:save',gameId:'game-a',engine:'web',outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true},
      {applicationId:'p4-app-2',taskId:'a2',workKey:'game-b:web:save',gameId:'game-b',engine:'web',outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true}
    ]
  };
  const experience={records:[capability]};
  const companyQueue={items:[
    {gameId:'source-game'},
    {gameId:'game-a'},
    {gameId:'game-b'},
    {gameId:'holdout-game'}
  ]};
  const benchmark=buildBenchmarkLadder({},experience,companyQueue);
  assert.equal(benchmark.phase4GeneralizationCases,1);
  const phase4Case=benchmark.cases.find(row=>row.track==='CAPABILITY_GENERALIZATION');
  assert.equal(phase4Case.capabilityId,'cap-phase4-practice');
  assert.equal(phase4Case.holdoutGameId,'holdout-game');
  assert.equal(phase4Case.state,'READY_FOR_UNSEEN_SCREEN');
  assert.equal(phase4Case.screenOnly,true);
  assert.equal(phase4Case.mayPromoteGeneralization,false);

  const practice=buildIdlePracticeQueue({},benchmark);
  const pair=practice.drills.filter(row=>row.phase4Benchmark===true);
  assert.equal(practice.phase4GeneralizationDrills,2);
  assert.deepEqual(pair.map(row=>row.phase4Role),['CONTROL','CHALLENGER']);
  assert.equal(pair[0].phase4PairId,pair[1].phase4PairId);
  assert.equal(pair[0].unseenProblemFingerprint,pair[1].unseenProblemFingerprint);

  const control=injectIdlePracticeTask({tasks:[]},practice);
  assert.equal(control.added,true);
  assert.ok(control.task.evidence.includes('phase4-benchmark-role:CONTROL'));
  assert.ok(control.task.evidence.includes('phase4-strong-generalization-evidence:NO'));
  assert.equal(control.task.gameId,'holdout-game');
  assert.equal(control.task.target,'web');
  assert.ok(control.task.completionCriteria.includes('PHASE4_SCREEN_ONLY_NO_GENERALIZATION_PROMOTION'));

  const completedControl={...control.task,status:'done'};
  const challenger=injectIdlePracticeTask({tasks:[completedControl]},practice);
  assert.equal(challenger.added,true);
  assert.ok(challenger.task.evidence.includes('phase4-benchmark-role:CHALLENGER'));
  const controlPair=control.task.evidence.find(x=>x.startsWith('phase4-benchmark-pair:'));
  const challengerPair=challenger.task.evidence.find(x=>x.startsWith('phase4-benchmark-pair:'));
  assert.equal(controlPair,challengerPair);
});

test('phase 4 practice waits when no unseen catalog game exists',()=>{
  const experience={records:[{
    id:'cap-no-holdout',gameId:'g1',engine:'web',taskType:'coding-capability-distillation',
    problem:'save',goal:'save',change:'save',outcome:'PASS',evidence:['a','b'],reusablePatterns:['save'],verified:true,
    capabilityApplications:[
      {applicationId:'nh-1',taskId:'1',workKey:'g1:w',gameId:'g1',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true},
      {applicationId:'nh-2',taskId:'2',workKey:'g2:w',gameId:'g2',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true}
    ]
  }]};
  const benchmark=buildBenchmarkLadder({},experience,{items:[{gameId:'g1'},{gameId:'g2'}]});
  const phase4Case=benchmark.cases.find(row=>row.track==='CAPABILITY_GENERALIZATION');
  assert.equal(phase4Case.state,'WAITING_FOR_UNSEEN_GAME');
  const practice=buildIdlePracticeQueue({},benchmark);
  assert.equal(practice.phase4GeneralizationDrills,0);
});

test('verified external AI distilled knowledge enters retrieval after internal verified memory and raw output is not required',()=>{
  const experienceInput={records:[{id:'internal-1',gameId:'g1',engine:'web',verified:true,reusable:true,outcome:'PASS',goal:'combat mobile save',reusablePatterns:['internal-safe-pattern']}]};
  const externalAiDistilledInput={entries:[{
    id:'external-ai-distilled:gem-1',sourceKind:'external-ai-distilled',provider:'GEMINI',model:'gemini-test',
    engine:'web',gameId:'cross-game',domains:['COMBAT','MOBILE_INPUT'],patterns:['trace combat input to state before patch'],cautions:['do not widen writable scope'],
    verified:true,independentlyVerified:true,distilled:true,advisoryOnly:true,reusable:true,rawOutputStored:false,directSourceWrite:false,directProductionPass:false
  }]};
  const ctx=retrieveUnifiedLearning({
    task:{gameId:'g1',target:'web',goal:'combat mobile input repair'},
    experienceInput,codePatternsInput:{patterns:[]},playbooksInput:{taskTypes:{}},practiceDistilledInput:{entries:[]},externalAiDistilledInput,masteryInput:{}
  });
  assert.equal(ctx.experience[0].id,'internal-1');
  assert.equal(ctx.externalAiDistilled.length,1);
  assert.equal(ctx.externalAiDistilled[0].id,'external-ai-distilled:gem-1');
  assert.ok(ctx.exactKnowledgeIds.includes('EXPERIENCE:internal-1'));
  assert.ok(ctx.exactKnowledgeIds.includes('EXTERNAL_AI_DISTILLED:external-ai-distilled:gem-1'));
  assert.ok(ctx.priority.indexOf('EXTERNAL_AI_DISTILLED_VERIFIED_ADVISORY')>ctx.priority.indexOf('SAME_GAME_VERIFIED'));
});

test('retired distilled knowledge is excluded from retrieval',()=>{
  const externalAiDistilledInput={entries:[{
    id:'external-ai-distilled:retired',sourceKind:'external-ai-distilled',provider:'GEMINI',model:'m',
    engine:'web',domains:['COMBAT'],patterns:['old pattern'],verified:true,independentlyVerified:true,distilled:true,advisoryOnly:true,reusable:true,rawOutputStored:false
  }]};
  const masteryInput={knowledgeAttribution:{entries:{
    'EXTERNAL_AI_DISTILLED:external-ai-distilled:retired':{source:'EXTERNAL_AI_DISTILLED',verifiedApplications:1,verifiedFailures:5,games:{g1:6},state:'RETIRED'}
  }}};
  const ctx=retrieveUnifiedLearning({task:{gameId:'g1',target:'web',goal:'combat repair'},externalAiDistilledInput,masteryInput});
  assert.equal(ctx.externalAiDistilled.length,0);
});

test('exact knowledge attribution raises production confidence only from verified project outcomes',()=>{
  const ids=encodeURIComponent(JSON.stringify(['CODE_PATTERN:pat-1','EXTERNAL_AI_DISTILLED:ext-1']));
  const pass=(id,gameId)=>({id,gameId,target:'web',goal:'combat mobile input repair',evidence:[
    'role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS',
    'learning-knowledge-ids:'+ids,'actions-run:'+id
  ]});
  const infraFail={id:'infra',gameId:'g1',target:'web',goal:'combat mobile input repair',evidence:[
    'learning-knowledge-ids:'+ids,'failure-cause:source-candidate-generation-failed','actions-run:infra'
  ]};
  const learned=applyVerifiedKnowledgeOutcomes({}, {tasks:[pass('p1','g1'),pass('p2','g2'),infraFail]});
  assert.equal(learned.added,2);
  assert.equal(learned.positive,4);
  assert.equal(learned.negative,0);
  const pattern=learned.state.knowledgeAttribution.entries['CODE_PATTERN:pat-1'];
  assert.equal(pattern.verifiedApplications,2);
  assert.equal(pattern.verifiedFailures,0);
  assert.equal(pattern.state,'VERIFIED');
  assert.equal(learned.state.productionConfidence.domains.COMBAT.verifiedApplications,2);
  assert.equal(learned.state.productionConfidence.domains.COMBAT.level,2);
  assert.equal(learned.state.productionConfidence.domains.MOBILE_INPUT.level,2);
  const deduped=applyVerifiedKnowledgeOutcomes(learned.state,{tasks:[pass('p1','g1'),pass('p2','g2')]});
  assert.equal(deduped.added,0);
});

test('verified regression failure can demote knowledge without treating infrastructure failure as evidence',()=>{
  const ids=encodeURIComponent(JSON.stringify(['CODE_PATTERN:risky']));
  const fail=(id,gameId)=>({id,gameId,target:'web',goal:'save restore repair',evidence:[
    'learning-knowledge-ids:'+ids,'failure-cause:fan-in-regression-failed','actions-run:'+id
  ]});
  let state={knowledgeAttribution:{entries:{
    'CODE_PATTERN:risky':{source:'CODE_PATTERN',verifiedApplications:2,verifiedFailures:0,games:{g0:2},state:'VERIFIED'}
  }}};
  const learned=applyVerifiedKnowledgeOutcomes(state,{tasks:[fail('f1','g1'),fail('f2','g2'),fail('f3','g3')]});
  const row=learned.state.knowledgeAttribution.entries['CODE_PATTERN:risky'];
  assert.equal(row.verifiedFailures,3);
  assert.equal(row.state,'DEMOTED');
});

test('verified-only strategy memory opens candidate tournament to gather preferred evidence without lowering thresholds',()=>{
  const state=createMasteryState({codingStrategyMemory:{strategies:{
    RESPONSIBILITY_FIRST:{verifiedApplications:3,firstCandidatePasses:3,verifiedFailures:0,games:{g1:3},targets:{web:3},state:'VERIFIED'}
  }}});
  const policy=candidateTournamentPolicy({task:{type:'implementation',goal:'ordinary web repair',target:'web'},masteryInput:state});
  assert.equal(policy.candidateCount,3);
  assert.equal(policy.reason,'strategy-promotion-evidence-gap');
  assert.equal(state.codingStrategyMemory.strategies.RESPONSIBILITY_FIRST.state,'VERIFIED');
  assert.equal(policy.gateBypass,false);
});



test('verified Unity and Fortnite UEFN outcomes enter the same canonical mastery network',()=>{
  const input={records:[
    {
      id:'unity-verified-1',gameId:'unity-game',engine:'unity',verified:true,reusable:true,outcome:'PASS',
      engineQaVerified:true,reviewVerified:true,evidence:['unity-runtime-qa:PASS'],
      goal:'Unity runtime Rigidbody Collider Netcode authoritative multiplayer',reusablePatterns:['unity-safe-runtime']
    },
    {
      id:'uefn-verified-1',gameId:'uefn-game',engine:'fortnite_uefn',verified:true,reusable:true,outcome:'PASS',
      engineQaVerified:true,reviewVerified:true,evidence:['uefn-runtime-qa:PASS'],
      goal:'UEFN Verse device authoritative multiplayer replication',reusablePatterns:['uefn-safe-runtime']
    }
  ]};
  const result=applyVerifiedExperienceToMastery({},input);
  assert.ok(result.state.domains.UNITY_RUNTIME.xp>0);
  assert.ok(result.state.domains.UNITY_PHYSICS.xp>0);
  assert.ok(result.state.domains.UNITY_NETCODE.xp>0);
  assert.ok(result.state.domains.UEFN_RUNTIME.xp>0);
  assert.ok(result.state.domains.UEFN_VERSE.xp>0);
  assert.ok(result.state.domains.UEFN_REPLICATION.xp>0);
});

test('Unity and Fortnite UEFN native gaps generate practice signals without claiming native production pass',()=>{
  const mastery=createMasteryState({
    domains:{
      UNITY_RUNTIME:{xp:0},UNITY_PHYSICS:{xp:0},UNITY_NETCODE:{xp:0},
      UEFN_RUNTIME:{xp:0},UEFN_VERSE:{xp:0},UEFN_REPLICATION:{xp:0},
      CORE_LOOP:{xp:200},STATE_MACHINE:{xp:200},COMBAT:{xp:200},AI:{xp:200},
      PROGRESSION:{xp:200},ECONOMY:{xp:200},SAVE:{xp:200},MOBILE_INPUT:{xp:200},
      UI_STATE:{xp:200},DEBUGGING:{xp:200},RECOVERY:{xp:200},SECURITY:{xp:200},
      PERFORMANCE:{xp:200},WEB_RUNTIME:{xp:200},ROBLOX_STUDIO:{xp:200}
    }
  });
  const benchmark=buildBenchmarkLadder(mastery);
  assert.ok(benchmark.cases.some(row=>row.track==='UNITY_NATIVE'));
  assert.ok(benchmark.cases.some(row=>row.track==='FORTNITE_UEFN_NATIVE'));
  const practice=buildIdlePracticeQueue(mastery,benchmark);
  assert.ok(practice.drills.some(row=>row.kind==='UNITY_NATIVE_DRILL'));
  assert.ok(practice.drills.some(row=>row.kind==='FORTNITE_UEFN_NATIVE_DRILL'));
  assert.ok(practice.drills.every(row=>row.countsAsProductionPass===false));
});


test('native positive mastery does not rise from verified metadata without matching native runtime proof',()=>{
  const input={records:[
    {
      id:'unity-no-runtime',gameId:'unity-game',engine:'unity',verified:true,reusable:true,outcome:'PASS',
      goal:'Unity Rigidbody combat core loop',reusablePatterns:['generic-combat-pattern']
    },
    {
      id:'uefn-no-runtime',gameId:'uefn-game',engine:'fortnite_uefn',verified:true,reusable:true,outcome:'PASS',
      goal:'UEFN Verse multiplayer core loop',reusablePatterns:['generic-state-pattern']
    }
  ]};
  const result=applyVerifiedExperienceToMastery({},input);
  assert.equal(result.state.domains.UNITY_RUNTIME.xp,0);
  assert.equal(result.state.domains.UNITY_PHYSICS.xp,0);
  assert.equal(result.state.domains.UEFN_RUNTIME.xp,0);
  assert.equal(result.state.domains.UEFN_VERSE.xp,0);
  assert.ok(result.state.domains.CORE_LOOP.xp>0);
});

test('verified knowledge outcomes reward first-pass and failure-clear evidence',()=>{
  const task={
    id:'knowledge-good',gameId:'g1',target:'web',goal:'repair save restore',
    evidence:[
      'role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS',
      'coding-candidate-first-attempt:YES','coding-failure-fingerprint:web|SAVE_RESTORE',
      'learning-knowledge-ids:'+encodeURIComponent(JSON.stringify(['CODE_PATTERN:save-good'])),
      'learning-primary-domains:'+encodeURIComponent(JSON.stringify(['SAVE'])),
      'coding-primary-systems:'+encodeURIComponent(JSON.stringify(['SAVE_PERSISTENCE'])),
      'actions-run:100'
    ]
  };
  const learned=applyVerifiedKnowledgeOutcomes({}, {tasks:[task]});
  const row=learned.state.knowledgeAttribution.entries['CODE_PATTERN:save-good'];
  assert.equal(row.verifiedApplications,1);
  assert.equal(row.firstPasses,1);
  assert.equal(row.failureSignatureClears,1);
  assert.equal(row.primaryDomainMatches,1);
});

test('repeated regression failures retire harmful knowledge and remove it from retrieval',()=>{
  let state={};
  const tasks=[];
  for(let i=0;i<4;i++)tasks.push({
    id:'bad-'+i,gameId:'g'+(i%2+1),target:'web',goal:'repair save restore',
    evidence:[
      'failure-cause:fan-in-regression-failed',
      'learning-knowledge-ids:'+encodeURIComponent(JSON.stringify(['CODE_PATTERN:save-bad'])),
      'learning-primary-domains:'+encodeURIComponent(JSON.stringify(['SAVE'])),
      'coding-primary-systems:'+encodeURIComponent(JSON.stringify(['SAVE_PERSISTENCE'])),
      'actions-run:'+(200+i)
    ]
  });
  state=applyVerifiedKnowledgeOutcomes(state,{tasks}).state;
  assert.equal(state.knowledgeAttribution.entries['CODE_PATTERN:save-bad'].state,'RETIRED');
  const ctx=retrieveUnifiedLearning({
    task:{gameId:'gx',target:'web',goal:'repair save restore'},
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[
      {id:'save-bad',verified:true,retrievalEligible:true,engine:'web',system:'SAVE_PERSISTENCE',problem:'save restore',pattern:'persist state',tags:['save','restore']}
    ]},
    masteryInput:state
  });
  assert.ok(!ctx.exactKnowledgeIds.includes('CODE_PATTERN:save-bad'));
});

test('preferred knowledge outranks otherwise similar candidate knowledge after verified effectiveness',()=>{
  let state={};
  const goodTasks=[];
  for(let i=0;i<5;i++)goodTasks.push({
    id:'good-'+i,gameId:i<2?'g1':'g2',target:'web',goal:'repair save restore',
    evidence:[
      'role-result:regression:PASS','role-result:review:PASS','candidate-identity:PASS',
      'coding-candidate-first-attempt:YES',
      'learning-knowledge-ids:'+encodeURIComponent(JSON.stringify(['CODE_PATTERN:preferred-save'])),
      'learning-primary-domains:'+encodeURIComponent(JSON.stringify(['SAVE'])),
      'coding-primary-systems:'+encodeURIComponent(JSON.stringify(['SAVE_PERSISTENCE'])),
      'actions-run:'+(300+i)
    ]
  });
  state=applyVerifiedKnowledgeOutcomes(state,{tasks:goodTasks}).state;
  assert.equal(state.knowledgeAttribution.entries['CODE_PATTERN:preferred-save'].state,'PREFERRED');
  const ctx=retrieveUnifiedLearning({
    task:{gameId:'other',target:'web',goal:'repair save restore'},
    experienceInput:{records:[]},
    codePatternsInput:{patterns:[
      {id:'candidate-save',verified:true,retrievalEligible:true,engine:'web',system:'SAVE_PERSISTENCE',problem:'save restore',pattern:'persist state',tags:['save','restore']},
      {id:'preferred-save',verified:true,retrievalEligible:true,engine:'web',system:'SAVE_PERSISTENCE',problem:'save restore',pattern:'persist state',tags:['save','restore']}
    ]},
    masteryInput:state
  });
  assert.equal(ctx.codePatterns[0].id,'preferred-save');
});



test('verified graphics evolution outcomes learn positive negative and repeated owner insufficiency',()=>{
  const pass={
    id:'gfx-pass',gameId:'g1',target:'web',status:'verified',
    evidence:[
      'graphics-evolution:evidence-driven','presentation-pass:ANIMATION_FEEL',
      'graphics-evolution-trigger-source:OWNER_CHANGE_REQUEST','graphics-evolution-priority-score:168',
      'graphics-evolution-owner-repeat-count:2','graphics-evolution-alternatives-required:YES',
      'graphics-evolution-signal-event:req-2','graphics-evolution-selected-approach:PROCEDURAL_WEIGHT_PLUS_AUTHORED_ATTACK',
      'graphics-evolution-verified-result-return-to-learning-required'
    ]
  };
  const fail={
    id:'gfx-fail',gameId:'g1',target:'web',status:'failed',
    evidence:[
      'graphics-evolution:evidence-driven','presentation-pass:VFX',
      'graphics-evolution-trigger-source:RUNTIME_CAPTURE_COMPARISON','graphics-evolution-priority-score:110',
      'graphics-evolution-owner-repeat-count:0','graphics-evolution-alternatives-required:YES',
      'graphics-evolution-signal-event:auto-vfx','failure-cause:fan-in-regression-failed'
    ]
  };
  const learned=applyVerifiedGraphicsEvolutionOutcomes({}, {tasks:[pass,fail]});
  assert.equal(learned.added,2);
  assert.equal(learned.positive,1);
  assert.equal(learned.negative,1);
  assert.equal(learned.repeatedOwnerInsufficient,1);
  const ownerRow=learned.state.graphicsEvolutionMemory.entries['g1|ANIMATION_FEEL|OWNER_CHANGE_REQUEST'];
  assert.equal(ownerRow.verifiedPasses,1);
  assert.equal(ownerRow.ownerRepeatInsufficientSignals,1);
  assert.equal(ownerRow.highestPriorityScore,168);
  assert.equal(ownerRow.alternativesRequiredCount,1);
  assert.equal(ownerRow.lastSelectedApproach,'PROCEDURAL_WEIGHT_PLUS_AUTHORED_ATTACK');
  const failRow=learned.state.graphicsEvolutionMemory.entries['g1|VFX|RUNTIME_CAPTURE_COMPARISON'];
  assert.equal(failRow.verifiedRegressions,1);
  const deduped=applyVerifiedGraphicsEvolutionOutcomes(learned.state,{tasks:[pass,fail]});
  assert.equal(deduped.added,0);
});


test('verified world concept and narrative experience reaches specialized mastery domains',()=>{
  const learned=applyVerifiedExperienceToMastery({}, {records:[{
    id:'specialized-exp-1',gameId:'world-story-game',engine:'web',verified:true,reusable:true,outcome:'PASS',
    goal:'concept direction world generation map DNA level design route graph main story quest graph companion behavior',
    change:'concept blend style bible adaptive world map DNA encounter space route graph shortcut main story story spine foreshadow payoff twist evidence character voice relationship memory behavior intent companion behavior npc behavior monster personality world narrative',
    reusablePatterns:[
      'CONCEPT_DIRECTION WORLD_GENERATION LEVEL_DESIGN ROUTE_DESIGN MAIN_STORY_GENERATION QUEST_GRAPH',
      'FORESHADOWING_PAYOFF TWIST_EVIDENCE_CHAIN CHARACTER_VOICE CHARACTER_RELATIONSHIP_MEMORY CHARACTER_BEHAVIOR',
      'COMPANION_BEHAVIOR NPC_BEHAVIOR MONSTER_BEHAVIOR_PERSONALITY WORLD_NARRATIVE_BINDING'
    ]
  }]});
  assert.equal(learned.added,1);
  for(const domain of ['CONCEPT_DIRECTION','WORLD_GENERATION','LEVEL_DESIGN','ROUTE_DESIGN','MAIN_STORY_GENERATION','QUEST_GRAPH','FORESHADOWING_PAYOFF','TWIST_EVIDENCE_CHAIN','CHARACTER_VOICE','CHARACTER_RELATIONSHIP_MEMORY','CHARACTER_BEHAVIOR','COMPANION_BEHAVIOR','NPC_BEHAVIOR','MONSTER_BEHAVIOR_PERSONALITY','WORLD_NARRATIVE_BINDING']){
    assert.ok(learned.state.domains[domain].xp>0,domain);
  }
});

test('specialized mastery gaps map to dedicated 24h practice drills',()=>{
  const idle=buildIdlePracticeQueue({});
  const byDomain=new Map(idle.drills.filter(row=>Array.isArray(row.domains)&&row.domains.length===1).map(row=>[row.domains[0],row]));
  assert.equal(byDomain.get('CONCEPT_DIRECTION')?.kind,'CONCEPT_DIRECTION_DRILL');
  assert.equal(byDomain.get('WORLD_GENERATION')?.kind,'WORLD_GENERATION_DRILL');
  assert.equal(byDomain.get('LEVEL_DESIGN')?.kind,'LEVEL_DESIGN_DRILL');
  assert.equal(byDomain.get('ROUTE_DESIGN')?.kind,'ROUTE_DESIGN_DRILL');
  assert.equal(byDomain.get('STREAMING_OPTIMIZATION')?.kind,'STREAMING_OPTIMIZATION_DRILL');
  assert.equal(byDomain.get('MAIN_STORY_GENERATION')?.kind,'MAIN_STORY_GENERATION_DRILL');
  assert.equal(byDomain.get('FORESHADOWING_PAYOFF')?.kind,'FORESHADOWING_PAYOFF_DRILL');
  assert.equal(byDomain.get('TWIST_EVIDENCE_CHAIN')?.kind,'TWIST_EVIDENCE_CHAIN_DRILL');
  assert.equal(byDomain.get('CHARACTER_VOICE')?.kind,'CHARACTER_VOICE_DRILL');
  assert.equal(byDomain.get('CHARACTER_RELATIONSHIP_MEMORY')?.kind,'RELATIONSHIP_MEMORY_DRILL');
  assert.equal(byDomain.get('CHARACTER_BEHAVIOR')?.kind,'CHARACTER_BEHAVIOR_DRILL');
  assert.equal(byDomain.get('WORLD_NARRATIVE_BINDING')?.kind,'WORLD_NARRATIVE_BINDING_DRILL');
});

test('specialized benchmark ladder includes world concept narrative tracks',()=>{
  const ladder=buildBenchmarkLadder({});
  for(const track of ['CONCEPT_DIRECTION','WORLD_GENERATION','STREAMING_OPTIMIZATION','FORESHADOWING_PAYOFF','CHARACTER_BEHAVIOR','RELATIONSHIP_MEMORY']){
    assert.ok(ladder.cases.some(row=>row.track===track),track);
  }
});


test('verified faction relationship and story transition experience routes into existing narrative mastery domains',()=>{
  const learned=applyVerifiedExperienceToMastery({}, {records:[{
    id:'faction-story-exp-1',
    gameId:'sect-war',
    engine:'web',
    verified:true,
    reusable:true,
    outcome:'PASS',
    goal:'story transition and faction relationship state',
    change:'causal story transition source event faction relationship trust debt faction state world state',
    reusablePatterns:['story transition causality','faction relationship source event idempotency','faction state world narrative binding']
  }]});
  assert.equal(learned.added,1);
  for(const domain of ['NARRATIVE_STRUCTURE','MAIN_STORY_GENERATION','CHARACTER_RELATIONSHIP_MEMORY','RELATIONSHIP_MEMORY','WORLD_NARRATIVE_BINDING']){
    assert.ok(learned.state.domains[domain].xp>0,domain);
  }
});

test('narrative learning policy knows faction relationship and story transition failure signals',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/vibe2-learning-motor.json',import.meta.url),'utf8'));
  assert.ok(policy.narrativeLearning.verifiedFailurePatterns.includes('FACTION_RELATIONSHIP_INCONSISTENCY'));
  assert.ok(policy.narrativeLearning.verifiedFailurePatterns.includes('STORY_TRANSITION_CAUSALITY_FAILURE'));
  assert.ok(policy.narrativeLearning.verifiedSignals.includes('FACTION_RELATIONSHIP_CAUSALITY'));
  assert.deepEqual(policy.narrativeLearning.domainRouting.storyTransitionCausality,['NARRATIVE_STRUCTURE','MAIN_STORY_GENERATION']);
  assert.ok(policy.narrativeLearning.domainRouting.factionRelationshipCausality.includes('WORLD_NARRATIVE_BINDING'));
});


test('verified specialized queue evidence enters canonical mastery once and ignores infrastructure failures',()=>{
  const queue={tasks:[
    {
      id:'world-pass',gameId:'world-g1',target:'web',status:'verified',
      goal:'월드 길과 스트리밍 검증',
      evidence:['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS','VERIFIED_STREAMING_MOBILE_BUDGET_PASS','specialized-final-verification:PASS','specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION','actions-run:7001','raw-telemetry:player-path=12,44,98','blocker-stack:very-long-runtime-log']
    },
    {
      id:'narrative-pass',gameId:'story-g1',target:'web',status:'done',
      goal:'스토리와 퀘스트 검증',
      evidence:['VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS','VERIFIED_QUEST_GRAPH_PASS','VERIFIED_WORLD_NARRATIVE_STATE_PASS','specialized-final-verification:PASS','specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION','actions-run:7002']
    },
    {
      id:'world-fail',gameId:'world-g2',target:'web',status:'failed',
      goal:'월드 도달성과 스트리밍 실패',
      evidence:['VERIFIED_NAVIGATION_REACHABILITY_FAILURE','VERIFIED_STREAMING_HITCH','specialized-negative-verification:FAIL','specialized-negative-authority:RUNTIME_QA','actions-run:7003']
    },
    {
      id:'infra-fail',gameId:'world-g3',target:'web',status:'failed',
      goal:'러너 장애',
      evidence:['VERIFIED_STREAMING_HITCH','specialized-negative-verification:FAIL','specialized-negative-authority:RUNTIME_QA','infrastructure-failure:YES','actions-run:7004']
    },
    {
      id:'not-terminal',gameId:'story-g2',target:'web',status:'queued',
      goal:'아직 실행 전',
      evidence:['VERIFIED_QUEST_GRAPH_PASS','actions-run:7005']
    }
  ]};
  const extracted=collectVerifiedSpecializedQueueExperience(queue);
  assert.equal(extracted.records.length,3);
  assert.equal(extracted.positive,2);
  assert.equal(extracted.negative,1);
  const worldRecord=extracted.records.find(row=>row.sourceTaskId==='world-pass');
  assert.equal(worldRecord.outcome,'PASS');
  assert.equal(worldRecord.verifiedEvidenceMarkers.length,2);
  assert.ok(worldRecord.evidence.includes('source-run:actions-run:7001'));
  assert.ok(worldRecord.evidence.includes('verified-marker:VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'));
  assert.equal(worldRecord.evidence.some(value=>value.startsWith('raw-telemetry:')),false);
  assert.equal(worldRecord.evidence.some(value=>value.startsWith('blocker-stack:')),false);
  assert.equal(extracted.records.some(row=>row.sourceTaskId==='infra-fail'),false);
  assert.equal(extracted.records.some(row=>row.sourceTaskId==='not-terminal'),false);

  const learned=applyVerifiedSpecializedQueueOutcomes({},queue);
  assert.equal(learned.added,3);
  assert.equal(learned.positive,2);
  assert.equal(learned.negative,1);
  assert.ok(learned.state.domains.WORLD_GENERATION.xp>0);
  assert.ok(learned.state.domains.ROUTE_DESIGN.xp>0);
  assert.ok(learned.state.domains.STREAMING_OPTIMIZATION.xp>0);
  assert.ok(learned.state.domains.NARRATIVE_STRUCTURE.xp>0);
  assert.ok(learned.state.domains.QUEST_GRAPH.xp>0);
  assert.ok(learned.state.domains.WORLD_NARRATIVE_BINDING.xp>0);
  assert.ok(Object.keys(learned.state.failureSignatures).length>=1);

  const deduped=applyVerifiedSpecializedQueueOutcomes(learned.state,queue);
  assert.equal(deduped.added,0);
  assert.equal(deduped.positive,0);
  assert.equal(deduped.negative,0);
});

test('specialized queue ingress policy accepts only verified markers and reuses existing learning motor',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/vibe2-learning-motor.json',import.meta.url),'utf8'));
  const ingress=policy.verifiedSpecializedQueueEvidenceIngress;
  assert.equal(ingress.enabled,true);
  assert.deepEqual(ingress.positiveStatuses,['VERIFIED','DONE']);
  assert.ok(ingress.positiveMarkers.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'));
  assert.ok(ingress.positiveMarkers.includes('VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS'));
  assert.ok(ingress.negativeMarkers.includes('VERIFIED_FACTION_RELATIONSHIP_INCONSISTENCY'));
  assert.equal(ingress.onePositiveAndOneNegativeMaxPerTask,true);
  assert.equal(ingress.infrastructureFailureNegativeLearningForbidden,true);
  assert.equal(ingress.existingSeenExperienceDedupeRequired,true);
  assert.equal(ingress.rawTelemetryDirectTraining,false);
  assert.equal(ingress.finalMarkerMustBeExactEvidenceToken,true);
  assert.equal(ingress.prefixedFocusedQaTokenCannotMatchFinalMarker,true);
  assert.equal(ingress.positiveFanInProvenanceRequired,true);
});


test('specialized verified outcomes persist once and become same-game retrieval memory',()=>{
  const queue={tasks:[{
    id:'persistent-world-pass',
    gameId:'persistent-g1',
    target:'web',
    status:'verified',
    goal:'world generation route navigation',
    evidence:['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS','specialized-final-verification:PASS','specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION','actions-run:8101']
  }]};
  const first=mergeVerifiedSpecializedQueueExperienceMemory({records:[]},queue);
  assert.equal(first.changed,true);
  assert.equal(first.added,1);
  assert.equal(first.positive,1);
  assert.equal(first.memory.records.length,1);
  const record=first.memory.records[0];
  assert.equal(record.gameId,'persistent-g1');
  assert.equal(record.verified,true);
  assert.equal(record.reusable,true);
  assert.ok(record.evidence.some(value=>value.startsWith('specialized-outcome-id:')));
  assert.ok(record.evidence.includes('verified-marker:VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'));

  const retrieval=retrieveUnifiedLearning({
    task:{gameId:'persistent-g1',target:'web',goal:'world generation route navigation'},
    experienceInput:first.memory
  });
  assert.equal(retrieval.experience[0].id,record.id);
  assert.ok(retrieval.experience[0].reasons.includes('same-game'));

  const second=mergeVerifiedSpecializedQueueExperienceMemory(first.memory,queue);
  assert.equal(second.changed,false);
  assert.equal(second.added,0);
  assert.equal(second.memory.records.length,1);
  assert.equal(second.memory.records[0].confirmations,1);
});

test('distinct verified runs may reinforce one reusable specialized experience exactly once per outcome id',()=>{
  const baseTask={
    id:'repeat-world-pass',
    gameId:'repeat-g1',
    target:'web',
    status:'verified',
    goal:'world generation route navigation'
  };
  const first=mergeVerifiedSpecializedQueueExperienceMemory({records:[]},{tasks:[{...baseTask,evidence:['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS','specialized-final-verification:PASS','specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION','actions-run:8201']}]});
  const second=mergeVerifiedSpecializedQueueExperienceMemory(first.memory,{tasks:[{...baseTask,evidence:['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS','specialized-final-verification:PASS','specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION','actions-run:8202']}]});
  assert.equal(second.changed,true);
  assert.equal(second.added,1);
  assert.equal(second.memory.records.length,1);
  assert.equal(second.memory.records[0].confirmations,2);
  assert.ok(second.memory.records[0].evidence.includes('source-run:actions-run:8201'));
  assert.ok(second.memory.records[0].evidence.includes('source-run:actions-run:8202'));

  const duplicate=mergeVerifiedSpecializedQueueExperienceMemory(second.memory,{tasks:[{...baseTask,evidence:['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS','specialized-final-verification:PASS','specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION','actions-run:8202']}]});
  assert.equal(duplicate.changed,false);
  assert.equal(duplicate.added,0);
  assert.equal(duplicate.memory.records[0].confirmations,2);
});


test('focused-QA trace tokens and unproven exact markers cannot self-promote into positive mastery',()=>{
  const focusedOnly={tasks:[{
    id:'focused-only',
    gameId:'g-focused',
    target:'web',
    status:'verified',
    goal:'world route',
    evidence:[
      'specialized-focused-qa-pass:VERIFIED_WORLD_ROUTE_NAVIGATION_PASS',
      'actions-run:8301'
    ]
  }]};
  const focusedExtracted=collectVerifiedSpecializedQueueExperience(focusedOnly);
  assert.equal(focusedExtracted.positive,0);
  assert.equal(focusedExtracted.records.length,0);

  const exactWithoutProvenance={tasks:[{
    id:'exact-without-provenance',
    gameId:'g-exact',
    target:'web',
    status:'verified',
    goal:'world route',
    evidence:['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS','actions-run:8302']
  }]};
  const unproven=collectVerifiedSpecializedQueueExperience(exactWithoutProvenance);
  assert.equal(unproven.positive,0);
  assert.equal(unproven.records.length,0);

  const proven={tasks:[{
    id:'exact-proven',
    gameId:'g-proven',
    target:'web',
    status:'verified',
    goal:'world route',
    evidence:[
      'VERIFIED_WORLD_ROUTE_NAVIGATION_PASS',
      'specialized-final-verification:PASS',
      'specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION',
      'actions-run:8303'
    ]
  }]};
  const accepted=collectVerifiedSpecializedQueueExperience(proven);
  assert.equal(accepted.positive,1);
  assert.equal(accepted.records.length,1);
});


test('Roblox asset mastery requires asset-binding runtime PASS in addition to generic runtime QA',()=>{
  const missing=applyVerifiedExperienceToMastery({}, {records:[{
    id:'rbx-asset-generic-runtime-only',gameId:'g-rbx',engine:'roblox',verified:true,reusable:true,outcome:'PASS',
    goal:'asset adaptation material style',reusablePatterns:['asset adaptation material'],
    evidence:['roblox runtime qa pass']
  }]});
  assert.equal(missing.state.domains.ASSET_ADAPTATION.xp,0);

  const passed=applyVerifiedExperienceToMastery({}, {records:[{
    id:'rbx-asset-runtime-bound',gameId:'g-rbx',engine:'roblox',verified:true,reusable:true,outcome:'PASS',
    goal:'asset adaptation material style',reusablePatterns:['asset adaptation material'],
    evidence:['roblox runtime qa pass','ROBLOX_STUDIO_ASSET_RUNTIME_BINDING_PASS']
  }]});
  assert.ok(passed.state.domains.ASSET_ADAPTATION.xp>0);

  const web=applyVerifiedExperienceToMastery({}, {records:[{
    id:'web-asset-pass',gameId:'g-web',engine:'web',verified:true,reusable:true,outcome:'PASS',
    goal:'asset adaptation material style',reusablePatterns:['asset adaptation material']
  }]});
  assert.ok(web.state.domains.ASSET_ADAPTATION.xp>0);
});

test('native specialized positive ingress requires matching authoritative target-engine QA proof',()=>{
  const baseEvidence=[
    'VERIFIED_WORLD_ROUTE_NAVIGATION_PASS',
    'specialized-final-verification:PASS',
    'specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION',
    'actions-run:9101'
  ];
  const robloxMissing=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'native-roblox-missing',gameId:'native-rbx',target:'roblox',status:'verified',goal:'world generation route',
    evidence:[...baseEvidence,'roblox qa pass']
  }]});
  assert.equal(robloxMissing.positive,0);

  const robloxPass=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'native-roblox-pass',gameId:'native-rbx',target:'roblox',status:'verified',goal:'world generation route',
    evidence:[...baseEvidence,'roblox-verification-run:99101']
  }]});
  assert.equal(robloxPass.positive,1);
  assert.ok(robloxPass.records[0].evidence.includes('roblox-verification-run:99101'));
  assert.ok(robloxPass.records[0].evidence.includes('target-engine-qa-ref:roblox-verification-run:99101'));

  const unityMissing=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'native-unity-missing',gameId:'native-unity',target:'unity',status:'done',goal:'world generation route',
    evidence:[...baseEvidence,'unity runtime qa pass']
  }]});
  assert.equal(unityMissing.positive,0);

  const unityPass=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'native-unity-pass',gameId:'native-unity',target:'unity',status:'done',goal:'world generation route',
    evidence:[...baseEvidence,'unity-verification-run:99201']
  }]});
  assert.equal(unityPass.positive,1);
  assert.ok(unityPass.records[0].evidence.includes('target-engine-qa-ref:unity-verification-run:99201'));
});

test('UEFN specialized positive ingress stays blocked until authoritative executor evidence contract exists',()=>{
  const extracted=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'native-uefn-blocked',gameId:'native-uefn',target:'fortnite_uefn',status:'verified',goal:'world generation route',
    evidence:[
      'VERIFIED_WORLD_ROUTE_NAVIGATION_PASS',
      'specialized-final-verification:PASS',
      'specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION',
      'uefn-verification-run:99301',
      'actions-run:9102'
    ]
  }]});
  assert.equal(extracted.positive,0);
  assert.equal(extracted.records.length,0);
});

test('web specialized positive ingress remains independent from native engine QA',()=>{
  const extracted=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'web-specialized-pass',gameId:'web-game',target:'web',status:'verified',goal:'quest graph narrative',
    evidence:[
      'VERIFIED_QUEST_GRAPH_PASS',
      'specialized-final-verification:PASS',
      'specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION',
      'actions-run:9103'
    ]
  }]});
  assert.equal(extracted.positive,1);
});


test('non-game system target cannot enter specialized game mastery even with final-marker-shaped evidence',()=>{
  const extracted=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'system-forged-specialized',
    gameId:'company-system',
    target:'system',
    status:'verified',
    goal:'narrative world generation architecture',
    evidence:[
      'VERIFIED_WORLD_ROUTE_NAVIGATION_PASS',
      'VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS',
      'specialized-final-verification:PASS',
      'specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION',
      'actions-run:9104'
    ]
  }]});
  assert.equal(extracted.positive,0);
  assert.equal(extracted.records.length,0);
});


test('specialized negative markers require explicit verified failure provenance and game target',()=>{
  const markerOnly=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'negative-marker-only',gameId:'g-neg',target:'web',status:'failed',goal:'navigation failure',
    evidence:['VERIFIED_NAVIGATION_REACHABILITY_FAILURE','actions-run:9201']
  }]});
  assert.equal(markerOnly.negative,0);
  assert.equal(markerOnly.records.length,0);

  const wrongAuthority=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'negative-wrong-authority',gameId:'g-neg',target:'web',status:'failed',goal:'navigation failure',
    evidence:['VERIFIED_NAVIGATION_REACHABILITY_FAILURE','specialized-negative-verification:FAIL','specialized-negative-authority:UNKNOWN','actions-run:9202']
  }]});
  assert.equal(wrongAuthority.negative,0);

  const valid=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'negative-valid',gameId:'g-neg',target:'web',status:'failed',goal:'navigation failure',
    evidence:['VERIFIED_NAVIGATION_REACHABILITY_FAILURE','specialized-negative-verification:FAIL','specialized-negative-authority:FOCUSED_QA','actions-run:9203']
  }]});
  assert.equal(valid.negative,1);
  assert.equal(valid.records.length,1);
  assert.ok(valid.records[0].evidence.includes('specialized-negative-verification:FAIL'));
  assert.ok(valid.records[0].evidence.includes('specialized-negative-authority:FOCUSED_QA'));

  const nonGame=collectVerifiedSpecializedQueueExperience({tasks:[{
    id:'negative-system',gameId:'system',target:'system',status:'failed',goal:'world route system test',
    evidence:['VERIFIED_NAVIGATION_REACHABILITY_FAILURE','specialized-negative-verification:FAIL','specialized-negative-authority:RUNTIME_QA','actions-run:9204']
  }]});
  assert.equal(nonGame.negative,0);
  assert.equal(nonGame.records.length,0);
});
