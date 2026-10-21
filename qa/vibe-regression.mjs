// 파일명: qa/vibe-regression.mjs
// 역할: 웹/Godot 바이브 개발 공통 기능 통합 회귀검사
// 규칙: Godot 기본 라우팅과 기존 V1 실행 경계를 함께 보호
// 기존 통합 회귀검사에 Vibe 의도→리플레이→환경·에셋·성능·진단 보호검사를 함께 실행한다.
import {planVibeCodingTask} from '../assets/vibe-helper.js';
import {buildVibeQaScenario} from '../assets/vibe-qa.js';
import {diagnoseVibeFailure} from '../assets/vibe-diagnostics.js';
import {createVibeSceneRecreationPlan} from '../assets/vibe-environment-director.js';
import {planVibePresentationAutopilot} from '../assets/vibe-presentation-director.js';
import assert from 'node:assert/strict';import fs from 'node:fs';import {JaewoonAISquad} from '../assets/common-ai.js';import {createAnimationState} from '../assets/animation-state.js';import {planAssetApplication} from '../assets/asset-selector.js';import {createAIPartyConfig,createDefaultAIEntries,validateAIPartyConfig} from '../assets/ai-party.js';import {buildGameContent,createEngineNeutralGameModel,createEngineOutputManifest,validateCrossEngineParity,createGameplayAuthorityContract,createGameplayStatLayers,resolveGameplayStat,createGameplayResourceDNA,createGameplaySkillDNA,validateGameplayMutation} from '../assets/game-content.js';import {createVibeDevelopmentAIContract,selectVibeDevelopmentAI,validateVibeDevelopmentAICandidate,createVibeDevelopmentPipeline} from '../assets/vibe-development-ai.js';import {createVibeProject,exportVibeProject,importVibeProject,cloneVibeProject} from '../assets/vibe-project.js';import {createVibeBuildPlan,createVibeCrossEngineContract} from '../assets/vibe-build-plan.js';import {createVibeExecutionContract,createVibeGoalContract,createVibeSemanticEvent,createVibeCausalityId,createVibeAgentState,rememberVibeAgentEvent,decideVibeAgentAction,updateVibeAgentRelationship,resolveVibeAgentGoalCompetition,learnVibeAgentOutcome} from '../assets/vibe-orchestrator.js';import {createVibeWorldState,createVibeSeededRandom,replayVibeWorld,validateVibeWorldInvariants,compareVibeWorldReplay,createVibeCausalityGraph,propagateVibeInfluence,calculateVibeAttention,allocateVibeSimulationBudget} from '../assets/vibe-quality-intelligence.js';import {executeVibeLocalChange,summarizeVibeExecution} from '../assets/vibe-local-executor.js';import {createVibeEditBrief,planVibeWorkbenchTask} from '../assets/vibe-workbench.js';import {buildGodotProject} from '../assets/godot-game-generator.js';import {auditGodotProjectFiles} from '../assets/godot-project-qa.js';import {diffVibeText,findProtectedVibeChanges,isProtectedVibeChangeAuthorized} from '../web-games/vibe-maker/workbench.js';const pass=n=>console.log(`PASS ${n}`);
assert.deepEqual(findProtectedVibeChanges('var hp = 100','var hp = 120'),['체력']);assert.equal(isProtectedVibeChangeAuthorized('체력','그래픽 개선'),false);assert.equal(isProtectedVibeChangeAuthorized('체력','체력을 120으로 변경'),true);assert.equal(diffVibeText('a','a').length,0);pass('protected rules');
// 기존 에셋 선택기는 실제 적용이 아닌 검증 대상 계획만 생성한다.
const candidatePlan=planAssetApplication({prompt:'검 장비 에셋 연결',manifest:{assets:[
  {id:'trusted-sword',types:['item'],path:'assets/weapon.glb',license:'CC0',downloaded:true},
  {id:'trusted-sword',types:['item'],path:'assets/duplicate.glb',license:'CC0',downloaded:true},
  {id:'missing-license',types:['item'],path:'assets/missing.glb',downloaded:true},
  {id:'noncommercial',types:['item'],path:'assets/noncommercial.glb',license:'CC-BY-NC'},
  {id:'not-materialized',types:['item'],license:'CC0'},
  {id:'not-downloaded',types:['item'],path:'assets/pending.glb',license:'CC0',downloaded:false}
]}});
assert.deepEqual(candidatePlan.matched.filter(row=>row.type==='item').map(row=>row.id),['trusted-sword']);
assert.equal(candidatePlan.sourceBindingVerified,false);
assert.equal(candidatePlan.nativeRuntimeVerified,false);
assert.equal(candidatePlan.appliedToGame,false);
assert.equal(candidatePlan.binding.find(row=>row.type==='item').nativeRuntimeVerificationRequired,true);
pass('asset reuse candidate license source duplicate and runtime evidence gate');
const workspaceSource=fs.readFileSync(new URL('../assets/vibe-workspace.js',import.meta.url),'utf8'),workbenchSource=fs.readFileSync(new URL('../web-games/vibe-maker/workbench.js',import.meta.url),'utf8'),workerSource=fs.readFileSync(new URL('../_worker.js',import.meta.url),'utf8'),orchestratorSource=fs.readFileSync(new URL('../assets/vibe-orchestrator.js',import.meta.url),'utf8'),executorSource=fs.readFileSync(new URL('../assets/vibe-local-executor.js',import.meta.url),'utf8'),developmentAISource=fs.readFileSync(new URL('../assets/vibe-development-ai.js',import.meta.url),'utf8');assert(workspaceSource.includes('async createCheckpoint(changes)'));assert(workspaceSource.includes('async writeManyAtomic(changes, { checkpoint = null } = {})'));assert(workspaceSource.includes('physical: true'));assert(workspaceSource.includes("name === '.vibe-backups'"));assert(workbenchSource.includes('executeVibeLocalChange'));assert(workbenchSource.includes('this.workspace.createCheckpoint(changed)'));assert(workbenchSource.includes('checkpointId:checkpoint.id'));assert(workbenchSource.includes('writeManyAtomic(changed,{checkpoint})'));assert(workbenchSource.includes("this.v2Bridge.checkpointId!==checkpoint.id"));assert(workbenchSource.includes("result.checkpoint?.id!==checkpoint.id"));assert(workbenchSource.includes('let writeSucceeded=false,result'));assert(workbenchSource.includes('this.workspace.rollbackCheckpoint(checkpoint)'));assert(workbenchSource.includes('physical rollback 실패'));assert(workbenchSource.includes('적용 후 검증 실패 · physical checkpoint rollback 완료'));assert(workbenchSource.includes("runVibeWorkspaceWebRuntime(this.workspace,{revision:this.v2Bridge.execution.revision})"));assert(workbenchSource.includes('validateVibeWebRuntimeObservation(observation,{revision:this.v2Bridge.execution.revision})'));assert(workbenchSource.includes('this.v2RuntimeObservation=Object.freeze({observation,validation})'));assert(workbenchSource.includes("if(!validation.valid)throw new Error(`Web runtime 관측 실패"));assert(workbenchSource.includes('createVibeRuntimeEvidence(this.v2Bridge.execution'));assert(workbenchSource.includes('sourceEvidence:this.v2AppliedEvidence'));assert(workbenchSource.includes('runner:observation.runner'));assert(workbenchSource.includes('revision:observation.revision'));assert(workbenchSource.includes('runtimeObserved:validation.runtimeObserved'));assert(workbenchSource.includes('qaPassed:false,regressionPassed:false'));assert(workbenchSource.includes("if(!this.v2RuntimeEvidence.sourceExact||!this.v2RuntimeEvidence.exactRevision||!this.v2RuntimeEvidence.runtimeObserved)"));assert(workbenchSource.includes('createVibeCandidateDeliveryContract(this.v2Bridge'));assert(workbenchSource.includes('createVibeCandidateGitDeliveryEvidence(this.v2CandidateDeliveryContract'));assert(workbenchSource.includes('createVibeGitCommitAttestation(this.v2Bridge.execution'));assert(workbenchSource.includes('createVibeGitHubWorkflowObservation'));assert(workbenchSource.includes('gitAttestation:this.v2GitAttestation'));assert(workbenchSource.includes('workflowObservation:this.v2WorkflowObservation'));assert(workbenchSource.includes('artifactSourceRevision:e.sourceRevision'));assert(workbenchSource.includes('workflowHeadSha:e.workflowHeadSha'));assert(workbenchSource.includes('mergeVibeRuntimeAndQAEvidence(this.v2Bridge.execution'));assert(workbenchSource.includes('verifyVibeV2Runtime(this.v2Bridge.execution'));assert(workbenchSource.includes("this.v2Verification?.mayCommit?'V2 verified · commit 허용'"));assert(workbenchSource.includes('v2QAEvidence:this.v2QAEvidence'));assert(workbenchSource.includes('v2Verification:this.v2Verification'));assert(workbenchSource.includes('v2RuntimeEvidence:this.v2RuntimeEvidence'));assert(workbenchSource.includes('V2 authoritative runtime evidence 확보 · Git delivery/QA/Regression 증거 필요'));assert(!workbenchSource.includes('/api/ai/vibe-code'));assert(executorSource.includes("mode:'deterministic-local-v2'"));assert(executorSource.includes('serverAI:false'));assert(executorSource.includes('validateOutput'));assert(executorSource.includes('trace:Object.freeze'));assert(orchestratorSource.includes("mode:'local-development-execution'"));assert(!workerSource.includes('/api/ai/vibe-code'));assert(/scope\s*:\s*['"]in-game-runtime-only['"]/.test(workerSource));assert(workerSource.includes('Never act as Vibe Maker or as a game-development agent.'));assert(developmentAISource.includes('AI_ASSISTED_DEVELOPMENT_ALLOWED_BUT_NON_AUTHORITATIVE'));assert(developmentAISource.includes('gpt-5.6-sol'));pass('runtime and development AI authority boundary');
// 메인: 요청이 실제 관찰 가능한 행동 계약과 향후 상태 재현 검사로 연결되는지 확인한다.
const intentPlan=planVibeCodingTask({
  prompt:'거대 거미가 추격하므로 카메라와 퇴로를 보존하고, 주인공은 회피 후 가만히 서 있어야 해',
  currentGame:'forest-survival'
});
assert.ok(intentPlan.behaviorContract.sequence.includes('NAVIGABLE_ESCAPE'));
assert.ok(intentPlan.behaviorContract.sequence.includes('GAMEPLAY_STATE_CHANGED'));
assert.ok(intentPlan.behaviorContract.sequence.includes('STOP_TO_IDLE'));
assert.equal(intentPlan.behaviorContract.automaticGameplayOrBalanceMutation,false);
assert.ok(intentPlan.candidateFiles.includes('assets/vibe-presentation-director.js'));
pass('causal intent planning');
const temporalQa=buildVibeQaScenario({
  request:'거대 거미 장면과 회피 및 멈춤 모션',target:'roblox',
  behaviorChain:intentPlan.behaviorContract.sequence
});
assert.equal(temporalQa.target,'roblox');
assert.equal(temporalQa.replayExecuted,false);
assert.equal(temporalQa.replayPass,false);
for(const scenario of ['entry-to-real-play','restart-save-restore','progress-to-next-objective','scene-threat-escape','combat-input-to-resolution','direction-and-contact']){
  assert.ok(temporalQa.replayCases.some(row=>row.id===scenario));
}
assert.ok(temporalQa.replayCases.every(row=>row.verified===false));
pass('multi-horizon replay planning');
const scene= createVibeSceneRecreationPlan({
  game:{gameplay:'survival'},region:{name:'forest'},
  situation:{playerGoal:'escape',threat:'giant-spider',focusTarget:'spider',escapeRoutes:['ravine']},
  props:[{id:'boulder',material:'stone'}]
});
assert.equal(scene.reverseStaging.intendedPlayerExperience.escapeRoutes[0],'ravine');
assert.equal(scene.reverseStaging.actualReachabilityVerified,false);
assert.equal(scene.policy.noSpawnOrRouteMutation,true);
assert.equal(scene.objects.length,1);
pass('player-experience-first scene reverse staging');
const adaptive=planVibePresentationAutopilot({
  performanceTelemetry:{actualRuntime:true,frameMs:58},
  viewport:{width:393,height:852}
});
assert.equal(adaptive.presentationBudget.tier,'CRITICAL');
assert.equal(adaptive.presentationBudget.gameplayStateAndSaveMutationAllowed,false);
assert.equal(adaptive.presentationBudget.actualRuntimeBudgetApplied,false);
assert.equal(planVibePresentationAutopilot({}).presentationBudget.tier,'UNMEASURED');
pass('runtime-observed mobile cosmetic budget');
const failures=diagnoseVibeFailure({request:'거미 추격 중 카메라가 옆으로 돌아가',target:'roblox'});
assert.ok(failures.areas.includes('장면'));
assert.equal(failures.target,'roblox');
assert.equal(failures.verifiedRepairCandidates.length,0);
assert.equal(failures.learningAuthority,'VERIFIED_ADVISORY_ONLY');
pass('evidence-bound causal diagnostics');
const sortedAssets=planAssetApplication({
  prompt:'검 장비 에셋',manifest:{styleFamily:'FANTASY',assets:[
    {id:'plain-weapon',types:['item'],path:'assets/plain.glb',license:'CC0',downloaded:true,styleFamily:'OTHER'},
    {id:'company-weapon',types:['item'],path:'assets/company.glb',license:'CC0',downloaded:true,styleFamily:'FANTASY',verifiedCompanyReusable:true,sourceHash:'a'.repeat(64)}
  ]}
});
assert.equal(sortedAssets.matched.filter(row=>row.type==='item')[0].id,'company-weapon');
assert.equal(sortedAssets.selectionQuality.assetCompatibilityEvidence,'CANDIDATE_ONLY_RUNTIME_BINDING_PENDING');
assert.equal(sortedAssets.appliedToGame,false);
pass('verified style and motion asset ranking');
console.log('PASS integrated vibe regression suite');