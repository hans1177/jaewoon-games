import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  createMasteryState,
  applyVerifiedExperienceToMastery,
  applyVerifiedCodePatternsToMastery,
  applyVerifiedCodingStrategyOutcomes,
  applyVerifiedCodingCalibration,
  applyVerifiedArchitectureDriftOutcomes,
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

test('benchmark ladder includes narrative tracks and never counts directly as training sample',()=>{
  const ladder=buildBenchmarkLadder({});
  assert.equal(ladder.cases.length,18);
  assert.ok(ladder.cases.some(x=>x.track==='STORYTELLING'));
  assert.ok(ladder.cases.some(x=>x.track==='QUEST_DESIGN'));
  assert.ok(ladder.cases.some(x=>x.track==='CHARACTER_ARC'));
  assert.ok(ladder.cases.some(x=>x.track==='DIALOGUE'));
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



test('idle practice is enqueued only when production work is absent',()=>{
  const idle={drills:[{id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE'],productionPreemptible:true,countsAsProductionPass:false}]};
  const empty=injectIdlePracticeTask({tasks:[]},idle);
  assert.equal(empty.added,true);
  assert.equal(empty.task.type,'research');
  assert.ok(empty.task.evidence.includes('learning-practice-only'));
  assert.ok(empty.task.evidence.includes('production-pass:NO'));
  const busy=injectIdlePracticeTask({tasks:[{id:'prod',status:'queued',type:'implementation',evidence:[]}]},idle);
  assert.equal(busy.added,false);
  assert.equal(busy.reason,'PRODUCTION_WORK_PRESENT');
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


test('duplicate terminal idle practice collapses and advances to the next unrepresented drill',()=>{
  const practice=(id,status='failed',retries=1,evidence=[])=>({
    id,status,retries,maxRetries:1,target:'web',type:'research',sourceRoot:'learning-practice:test',
    evidence:['learning-practice-only','production-pass:NO',...evidence]
  });
  const queue={tasks:[
    practice('LEARNING-PRACTICE-gap-asset_production-l1','failed',3,['failure-cause:learning-practice-worker-failed']),
    practice('LEARNING-PRACTICE-gap-asset_production-l1','failed',2,['learning-practice-complete'])
  ]};
  const idle={drills:[
    {id:'gap-asset_production-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['ASSET_PRODUCTION']},
    {id:'gap-economy-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['ECONOMY']}
  ]};
  const result=injectIdlePracticeTask(queue,idle);
  assert.equal(result.added,true);
  assert.equal(result.deduped,1);
  assert.equal(result.queue.tasks.filter(t=>t.id==='LEARNING-PRACTICE-gap-asset_production-l1').length,1);
  assert.equal(result.queue.tasks.some(t=>t.id==='LEARNING-PRACTICE-gap-economy-l1'&&t.status==='queued'),true);
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
  assert.equal(result.reason,'IDLE_PRACTICE_ENQUEUED');
  assert.equal(result.task.id,`LEARNING-PRACTICE-${idle.drills[5].id}`);
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
