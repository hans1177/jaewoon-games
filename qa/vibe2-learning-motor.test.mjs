import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildIdlePracticeQueue, buildWebRobloxHandoffs, dedupeIdlePracticeTasks, injectIdlePracticeTask, retrieveUnifiedLearning } from '../tools/vibe2-learning-motor.mjs';

function practice(id,status='failed',retries=1,evidence=[]){
  return {
    id,status,retries,maxRetries:1,target:'web',type:'research',sourceRoot:'learning-practice:test',
    evidence:['learning-practice-only','production-pass:NO',...evidence]
  };
}

test('duplicate terminal practice tasks collapse and the next unrepresented drill is queued',()=>{
  const queue={version:5,tasks:[
    practice('LEARNING-PRACTICE-gap-asset_production-l1','failed',3,['failure-cause:learning-practice-worker-failed']),
    practice('LEARNING-PRACTICE-gap-asset_production-l1','failed',2,['learning-practice-complete'])
  ]};
  const idle={drills:[
    {id:'gap-asset_production-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['ASSET_PRODUCTION']},
    {id:'gap-economy-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['ECONOMY']}
  ]};
  const result=injectIdlePracticeTask(queue,idle);
  assert.equal(result.added,true);
  assert.equal(result.changed,true);
  assert.equal(result.deduped,1);
  assert.equal(result.queue.tasks.filter(t=>t.id==='LEARNING-PRACTICE-gap-asset_production-l1').length,1);
  assert.equal(result.queue.tasks.some(t=>t.id==='LEARNING-PRACTICE-gap-economy-l1'&&t.status==='queued'),true);
});

test('active practice wins dedupe and prevents another practice from starting',()=>{
  const rows=[
    practice('LEARNING-PRACTICE-gap-save-l1','failed',1),
    practice('LEARNING-PRACTICE-gap-save-l1','running',0,['reservation-id:run:1'])
  ];
  const result=injectIdlePracticeTask({tasks:rows},{drills:[
    {id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE']},
    {id:'gap-ui_state-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['UI_STATE']}
  ]});
  assert.equal(result.added,false);
  assert.equal(result.changed,true);
  assert.equal(result.reason,'PRACTICE_ALREADY_ACTIVE');
  const kept=result.queue.tasks.find(t=>t.id==='LEARNING-PRACTICE-gap-save-l1');
  assert.equal(kept.status,'running');
  assert.equal(result.queue.tasks.length,1);
});

test('terminal represented drill is not recreated when no new drill remains',()=>{
  const result=injectIdlePracticeTask(
    {tasks:[practice('LEARNING-PRACTICE-gap-save-l1','failed',2)]},
    {drills:[{id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE']}]}
  );
  assert.equal(result.added,false);
  assert.equal(result.reason,'NO_NEW_PRACTICE_DRILL');
  assert.equal(result.queue.tasks.length,1);
});

test('dedupe never merges unrelated production tasks',()=>{
  const rows=[
    {id:'prod-a',status:'queued',evidence:[]},
    {id:'prod-a',status:'queued',evidence:[]},
    practice('LEARNING-PRACTICE-gap-save-l1','failed',1),
    practice('LEARNING-PRACTICE-gap-save-l1','failed',2)
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
  const represented=idle.drills.slice(0,5).map(drill=>practice(`LEARNING-PRACTICE-${drill.id}`,'done',0,['learning-practice-complete']));
  const result=injectIdlePracticeTask({tasks:represented},idle);
  assert.equal(result.added,true);
  assert.equal(result.reason,'IDLE_PRACTICE_ENQUEUED');
  assert.equal(result.task.id,`LEARNING-PRACTICE-${idle.drills[5].id}`);
  assert.equal(result.task.type,'research');
  assert.ok(result.task.evidence.includes('production-pass:NO'));
});


test('control project machine state projects Web base through Roblox and focused release',()=>{
  const sha='a'.repeat(40);
  const artifact='sha256:'+'b'.repeat(64);
  const pack=buildWebRobloxHandoffs({items:[
    {gameId:'g-web',selectedPlatform:'ROBLOX',genre:'Survival'},
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
  assert.equal(pack.projectStateVersion,1);
  assert.equal(pack.projects.length,3);
  const web=pack.projects.find(project=>project.gameId==='g-web');
  assert.equal(web.PROJECT_PHASE,'WEB_BASE_IMPLEMENTATION');
  assert.equal(web.NEXT_MACHINE_ACTION,'IMPLEMENT_WEB_CORE_LOOP_AND_BASE_SYSTEMS');
  const handoff=pack.projects.find(project=>project.gameId==='g-handoff');
  assert.equal(handoff.PROJECT_PHASE,'TARGET_PLATFORM_SOURCE_BIND');
  assert.equal(handoff.ROBLOX_HANDOFF.complete,true);
  assert.equal(handoff.LEARNING_CONTEXT.continuousLearning,true);
  const released=pack.projects.find(project=>project.gameId==='g-release');
  assert.equal(released.PROJECT_PHASE,'POST_RELEASE_FOCUSED_DEVELOPMENT');
  assert.equal(released.POST_RELEASE_FOCUS_RUNNER.assigned,true);
  assert.equal(released.POST_RELEASE_FOCUS_RUNNER.logicalRunnerPerProject,1);
  assert.equal(released.POST_RELEASE_FOCUS_RUNNER.activeTaskMaxPerProject,1);
  assert.equal(released.NEXT_MACHINE_ACTION,'CONTINUE_ONE_FOCUSED_VERIFIED_DEVELOPMENT_CYCLE');
  assert.equal(pack.gateBypass,false);
});


test('project machine state includes post-release Roblox control queue work without inventing Web or release evidence',()=>{
  const pack=buildWebRobloxHandoffs(
    {items:[]},
    {records:[{
      id:'exp-historical',gameId:'historical-game',engine:'web',verified:true,reusable:true,outcome:'PASS',
      reusablePatterns:['WEB_SEMANTIC:CORE_LOOP:legacy-loop']
    }]},
    {tasks:[{
      id:'historical-focus',gameId:'historical-game',target:'roblox',department:'development',type:'implementation',
      releaseState:'development-confirmed',status:'cancelled',blocker:'lifecycle-inactive:MISSING_FROM_CATALOG',
      postReleaseFocused:true,packageLongWorkProtected:true,packageRole:'implementation-owner',
      evidence:[
        'post-release-focused:yes',
        'historical-deployment-recovery:yes',
        'maintenance-registry:company-learning/roblox-sustained-maintenance.json',
        'recombination-recipe:recombine_demo'
      ]
    }]}
  );
  assert.equal(pack.projects.length,1);
  assert.equal(pack.handoffs.length,0);
  const project=pack.projects[0];
  const required=['PROJECT_PHASE','PLATFORM','GENRE','WEB_BASELINE','ROBLOX_HANDOFF','POST_RELEASE_FOCUS_RUNNER','LEARNING_CONTEXT','NEXT_MACHINE_ACTION'];
  for(const field of required)assert.ok(Object.hasOwn(project,field),field);
  assert.equal(project.gameId,'historical-game');
  assert.equal(project.PROJECT_PHASE,'POST_RELEASE_FOCUSED_DEVELOPMENT');
  assert.equal(project.PLATFORM,'ROBLOX');
  assert.equal(project.GENRE,null);
  assert.equal(project.WEB_BASELINE.verified,false);
  assert.equal(project.WEB_BASELINE.currentCompanyWebBaselineBound,false);
  assert.equal(project.WEB_BASELINE.historicalDeploymentRecovery,true);
  assert.equal(project.ROBLOX_HANDOFF.ready,false);
  assert.equal(project.ROBLOX_HANDOFF.currentWebHandoffClaim,false);
  assert.equal(project.ROBLOX_HANDOFF.nativeReverificationRequired,true);
  assert.equal(project.POST_RELEASE_FOCUS_RUNNER.assigned,false);
  assert.equal(project.POST_RELEASE_FOCUS_RUNNER.state,'WAITING_FOR_LIFECYCLE_SYNC');
  assert.equal(project.POST_RELEASE_FOCUS_RUNNER.historicalDeploymentRecovery,true);
  assert.equal(project.POST_RELEASE_FOCUS_RUNNER.logicalRunnerPerProject,1);
  assert.equal(project.LEARNING_CONTEXT.verifiedSemanticExperienceIds[0],'exp-historical');
  assert.equal(project.LEARNING_CONTEXT.recombinationRecipeId,'recombine_demo');
  assert.equal(project.LEARNING_CONTEXT.gateBypass,false);
  assert.equal(project.LEARNING_CONTEXT.continuousLearning,true);
  assert.equal(project.NEXT_MACHINE_ACTION,'SYNC_HISTORICAL_MAINTENANCE_LIFECYCLE');
  assert.equal(pack.gateBypass,false);
});

test('project machine state marks queued post-release focus as assigned without fabricating a Web handoff',()=>{
  const pack=buildWebRobloxHandoffs({items:[]},{records:[]},{tasks:[{
    id:'focus-1',gameId:'released-game',target:'roblox',department:'development',type:'implementation',
    releaseState:'release-confirmed',status:'queued',postReleaseFocused:true,
    packageLongWorkProtected:true,packageRole:'implementation-owner',evidence:['post-release-focused:yes']
  }]});
  const project=pack.projects[0];
  assert.equal(project.PROJECT_PHASE,'POST_RELEASE_FOCUSED_DEVELOPMENT');
  assert.equal(project.POST_RELEASE_FOCUS_RUNNER.assigned,true);
  assert.equal(project.POST_RELEASE_FOCUS_RUNNER.state,'ASSIGNED');
  assert.equal(project.WEB_BASELINE.verified,false);
  assert.equal(project.ROBLOX_HANDOFF.ready,false);
  assert.equal(project.NEXT_MACHINE_ACTION,'EXECUTE_POST_RELEASE_FOCUSED_GAP');
});
