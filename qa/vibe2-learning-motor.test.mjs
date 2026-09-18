import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  createMasteryState,
  applyVerifiedExperienceToMastery,
  applyVerifiedCodePatternsToMastery,
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

test('repeated verified failure escalates tournament and idle drill without bypassing gates',()=>{
  const state=createMasteryState({failureSignatures:{fail_x:{count:3,domains:['SAVE'],example:'save regression'}}});
  const policy=candidateTournamentPolicy({task:{goal:'repair save regression',target:'web'},masteryInput:state});
  assert.equal(policy.candidateCount,3);
  assert.equal(policy.gateBypass,false);
  const idle=buildIdlePracticeQueue(state);
  assert.equal(idle.drills[0].kind,'REPRO_DRILL');
  assert.equal(idle.drills[0].countsAsProductionPass,false);
});

test('benchmark ladder measures eight tracks and never counts directly as training sample',()=>{
  const ladder=buildBenchmarkLadder({});
  assert.equal(ladder.cases.length,8);
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
