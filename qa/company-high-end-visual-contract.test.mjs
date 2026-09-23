import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVibeAssetProductionPlan} from '../tools/vibe2-asset-production-plan.mjs';
import {createVibeArtPipeline,createVibeGraphicsProduction,createVibeOwnerChangeRequestStability,VIBE_HIGH_END_TARGET_FRAME_ROLES,GRAPHICS_PRODUCTION_INTERNAL_MODULES,GRAPHICS_PRODUCTION_STAGES} from '../assets/vibe-art-pipeline.js';
import {createVibeHighEndVisualDirection,HIGH_END_VISUAL_TARGET_FRAMES} from '../assets/vibe-visual-autopilot.js';
import {createVibeHighEndPresentationStack} from '../assets/vibe-presentation-director.js';
import {auditVibeRuntimeVisualEvidence,HIGH_END_GOLDEN_SCENE_ROLES} from '../assets/vibe-visual-quality-gate.js';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const logMap=JSON.parse(fs.readFileSync('company-learning/company-log-map.json','utf8'));
const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));
const plannerSource=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
const learningMotorSource=fs.readFileSync('tools/vibe2-learning-motor.mjs','utf8');

test('canonical high-end visual contract reuses existing graphics and asset pipeline',()=>{
  const c=roadmap.assetProductionParallelContract.highEndVisualProductionContract;
  assert.equal(c.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(c.target,'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION');
  assert.equal(c.developmentAdmissionGate,false);
  assert.equal(c.runsInParallelWithNativeDevelopment,true);
  assert.equal(c.internalPlatformReleasePresentationGateRequired,false);
  assert.equal(c.publicReleasePresentationGateRequired,false);
  assert.equal(c.presentationCompletionIsTerminal,false);
  assert.equal(c.continuesAfterInternalRelease,true);
  assert.equal(c.continuesAfterPublicRelease,true);
  assert.equal(c.continuousEvolution.enabled,true);
  assert.equal(c.continuousEvolution.cycleGeneration.enabled,true);
  assert.equal(c.continuousEvolution.cycleGeneration.evidenceTriggeredOnly,true);
  assert.equal(c.continuousEvolution.cycleGeneration.passAloneMustNotCreateNextCycle,true);
  assert.equal(c.continuousEvolution.cycleGeneration.sameSignalDuplicateCycleForbidden,true);
  assert.equal(c.continuousEvolution.cycleGeneration.unlimitedTotalCycles,true);
  assert.equal(c.continuousEvolution.cycleGeneration.totalCycleLimit,null);
  assert.equal(c.continuousEvolution.cycleGeneration.maximumGeneration,null);
  assert.equal(c.continuousEvolution.cycleGeneration.artificialCycleCapForbidden,true);
  assert.equal(c.continuousEvolution.cycleGeneration.centralDocumentAndImplementationMustStaySynchronized,true);
  assert.equal(c.continuousEvolution.cycleGeneration.implementationBinding,'tools/vibe2-auto-planner.mjs::findPresentationQualityTask');
  assert.equal(c.continuousEvolution.intelligentEvolutionLoop.enabled,true);
  assert.deepEqual(c.continuousEvolution.intelligentEvolutionLoop.loop,['OBSERVE','SCORE','CHOOSE','IMPROVE','COMPARE','LEARN','REPLAN']);
  assert.equal(c.continuousEvolution.intelligentEvolutionLoop.observe.problemOnlyNotRequired,true);
  assert.equal(c.continuousEvolution.intelligentEvolutionLoop.choose.minimumAlternativesForHighImpact,2);
  assert.equal(c.continuousEvolution.intelligentEvolutionLoop.learn.producer,'tools/vibe2-learning-motor.mjs');
  assert.equal(c.continuousEvolution.cycleGeneration.ownerExplicitRequestDedupePolicy.semanticTextDeduplicationForbidden,true);
  assert.equal(c.continuousEvolution.cycleGeneration.ownerExplicitRequestDedupePolicy.repeatedIdenticalOwnerTextCreatesNewGeneration,true);
  assert.equal(c.continuousEvolution.cycleGeneration.ownerRepeatedRequestBehavior.unlimitedRepeatsAllowed,true);
  assert.equal(c.cinematicDirection.enabled,true);
  assert.equal(c.ownerChangeRequestStability.enabled,true);
  assert.equal(c.noNewDepartment,true);
  assert.equal(c.defaultAssetApplication.enabled,true);
  assert.equal(c.defaultAssetApplication.backgroundAndEnvironmentFirstClass,true);
  assert.equal(c.assetMutationAndExpansion.enabled,true);
  assert.equal(c.assetMutationAndExpansion.originalAssetImmutable,true);
  assert.equal(c.cohesion.antiKitbashGateRequired,true);
  assert.equal(c.visualTargetFrames.roles.length,7);
  assert.equal(c.runtimeQa.beforeAfterVisualRegressionRequired,true);
  assert.ok(architecture.executionTopology.assetProduction.includes('RUNTIME_VISUAL_QA_AND_BEFORE_AFTER_REGRESSION'));
  assert.equal(architecture.departmentTopology.graphics.usesExistingDepartment,true);
  assert.equal(architecture.departmentTopology.graphics.unlimitedEvidenceDrivenEvolutionGenerations,true);
  assert.equal(architecture.departmentTopology.graphics.centralDocumentAndImplementationSynchronizationRequired,true);
  assert.equal(logMap.graphicsProductionEvidenceContract.unlimitedEvolutionGenerationsAllowed,true);
  assert.equal(logMap.graphicsProductionEvidenceContract.implementationBindingEvidenceRequired,true);
  assert.match(plannerSource,/function nextGraphicsEvolutionTask\(/);
  assert.match(plannerSource,/graphics-evolution-trigger:/);
  assert.match(plannerSource,/graphics-evolution-unlimited-generations:yes/);
  assert.match(plannerSource,/function graphicsEvolutionOpportunityScore\(/);
  assert.match(plannerSource,/OWNER_REQUEST_EVENT_INSTANCE/);
  assert.match(plannerSource,/OBSERVE→SCORE→CHOOSE→IMPROVE→COMPARE→LEARN→REPLAN/);
  assert.match(learningMotorSource,/applyVerifiedGraphicsEvolutionOutcomes/);
  assert.equal(logMap.highEndVisualEvidenceContract.markerOnlyEvidenceForbidden,true);
  assert.equal(logMap.highEndVisualEvidenceContract.checkpointEvidenceNotTerminalCompletion,true);
  assert.equal(logMap.highEndVisualEvidenceContract.standaloneReleaseAuthority,false);
  assert.equal(security.highEndAssetTransformationSecurity.protections.unverifiedExternalAssetUseForbidden,true);
});

test('asset and direction planners consume one high-end profile without Web-first admission',()=>{
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'demo',goal:'캐릭터 배경 보스 UI VFX 그래픽 개선'},target:'unity',
    repoRoot:process.cwd(),manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
  });
  assert.equal(plan.qualityProfile,'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION');
  assert.equal(plan.highEndVisual.visualTargetFrames.length,7);
  assert.equal(plan.policy.webPresentationMustPassBeforeNativeHandoff,false);
  assert.equal(plan.policy.defaultPurposefulAssetsRequired,true);
  assert.equal(plan.policy.antiKitbashGateRequired,true);
  assert.equal(plan.highEndVisual.internalPlatformReleasePresentationGateRequired,false);
  assert.equal(plan.highEndVisual.publicReleasePresentationGateRequired,false);
  assert.equal(plan.highEndVisual.continuousEvolution,true);
  assert.equal(plan.highEndVisual.cinematicDirectionRequired,true);
  assert.equal(plan.policy.continuousPresentationEvolution,true);
  assert.equal(plan.policy.graphicsPassIsCheckpointNotTerminal,true);
  assert.equal(plan.policy.highEndPresentationCompletionIsReleaseGate,false);

  const art=createVibeArtPipeline({request:'하이엔드 캐릭터 배경 보스 애니메이션 VFX',target:'roblox',quality:3});
  assert.equal(art.version,6);
  assert.deepEqual([...art.highEndVisual.targetFrames],[...VIBE_HIGH_END_TARGET_FRAME_ROLES]);
  assert.ok(art.art.transforms.includes('kitbash'));
  assert.equal(art.policy.highEndVisualProduction,true);
  assert.deepEqual([...art.animation.motionLayers],['PRIMARY_MOTION','SECONDARY_MOTION','PROCEDURAL_RESPONSE']);
  assert.equal(art.animation.characterAndCreatureActing,true);
  assert.equal(art.vfx.gameSpecificLanguage,true);
  assert.equal(art.audio.authoringOwner,'audio');
  assert.equal(art.policy.graphicsPassIsCheckpointNotTerminal,true);
  assert.equal(art.policy.highEndPresentationCompletionIsReleaseGate,false);

  const direction=createVibeHighEndVisualDirection({game:{genre:'action rpg'},world:{materials:['stone']},platform:'mobile'});
  assert.deepEqual([...direction.targetFrames],[...HIGH_END_VISUAL_TARGET_FRAMES]);
  assert.equal(direction.assetPolicy.antiKitbashCohesionGate,true);
  const presentation=createVibeHighEndPresentationStack({request:'어두운 숲 보스 연출'});
  assert.equal(presentation.version,2);
  assert.equal(presentation.channels.includes('LIGHTING'),true);
  assert.equal(presentation.continuousEvolution.graphicsPassIsCheckpointNotTerminal,true);
  assert.equal(presentation.continuousEvolution.highEndCompletionIsReleaseGate,false);
  assert.deepEqual([...presentation.cinematicDirection.motionLayers],['PRIMARY_MOTION','SECONDARY_MOTION','PROCEDURAL_RESPONSE']);
});

function evidence(){
  const revision='e'.repeat(40);
  const captures=HIGH_END_GOLDEN_SCENE_ROLES.map((role,index)=>({
    role,source:'roblox-runtime-capture',artifactId:'capture-'+index,candidateRevision:revision,
    observed:true,reviewed:true,comparison:{pass:true}
  }));
  return {
    stage:'INTERNAL_PLAYTEST',candidateRevision:revision,
    qualityProfile:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',highEndVisualRequired:true,
    artBibleBound:true,visualTargetFramesBound:true,captures,
    primaryActors:[{id:'player',presentation:'rigged-mesh'}],
    heroAssets:[{id:'player',presentation:'rigged-mesh'},{id:'landmark',presentation:'mesh'}],
    environment:{backgroundAssetBound:true,foregroundMidgroundBackground:true,landmark:true,setDressing:true,environmentalStorytelling:true,regionDifferentiation:true,navigationReadability:true},
    cohesion:{artBible:true,materialLanguage:true,silhouetteLanguage:true,lightingLanguage:true,uiVfxLanguage:true,antiKitbash:true},
    presentation:{animation:true,vfx:true,audio:true,camera:true,lighting:true},
    visualRegression:{pass:true},performance:{pass:true},visualDebt:[]
  };
}

test('high-end runtime QA requires real world cohesion regression and performance evidence',()=>{
  const pass=auditVibeRuntimeVisualEvidence(evidence());
  assert.equal(pass.pass,true,pass.reasons.join(','));
  assert.equal(pass.releaseAuthority,false);
  assert.equal(pass.graphicsPassMeaning,'VERIFIED_CHECKPOINT_NOT_TERMINAL_COMPLETION');
  assert.equal(pass.presentationCompletionIsTerminal,false);
  const sparse=evidence(); sparse.environment={...sparse.environment,setDressing:false};
  assert.equal(auditVibeRuntimeVisualEvidence(sparse).pass,false);
  const sample=evidence(); sample.heroAssets=[{id:'player',presentation:'mesh',sampleAssetUnmodified:true}];
  assert.ok(auditVibeRuntimeVisualEvidence(sample).reasons.includes('hero-asset-placeholder-or-unmodified-sample'));
});


test('graphics production is one top-level work unit with existing visual modules internalized',()=>{
  const u=roadmap.assetProductionParallelContract.graphicsProductionUnification;
  assert.equal(u.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(u.externalWorkUnit,'GRAPHICS_PRODUCTION');
  assert.equal(u.soleProductionCoordinator,'assets/vibe-art-pipeline.js');
  assert.equal(u.queueContract.topLevelGraphicsWorkUnitsPerGameCandidate,1);
  assert.equal(u.queueContract.siblingTopLevelCharacterEnvironmentAnimationVfxLightingUiTasksForbidden,true);
  assert.equal(u.queueContract.evidenceDrivenEvolutionCycle,true);
  assert.equal(u.queueContract.graphicsPassDoesNotSelfRequeue,true);
  assert.equal(u.queueContract.sameSignalDuplicateCycleForbidden,true);
  assert.equal(u.queueContract.unlimitedEvidenceDrivenEvolutionGenerations,true);
  assert.equal(u.queueContract.artificialEvolutionGenerationCapForbidden,true);
  assert.equal(u.outputContract.oneRootEvidenceRecord,true);
  assert.equal(u.outputContract.passIsVerifiedCheckpointNotTerminal,true);
  assert.equal(u.outputContract.continuousEvolutionAfterPass,true);
  assert.equal(u.outputContract.releaseAuthority,false);
  assert.equal(architecture.departmentTopology.graphics.oneTopLevelGraphicsWorkUnitPerGameCandidate,true);
  assert.equal(architecture.executionTopology.assetProduction[0],'GRAPHICS_PRODUCTION');
  assert.equal(logMap.graphicsProductionEvidenceContract.recordKind,'graphics-production-evidence');
  assert.equal(logMap.graphicsProductionEvidenceContract.separateCharacterEnvironmentAnimationVfxTopLevelEvidenceRecordsForbidden,true);
  assert.equal(security.graphicsProductionUnificationSecurity.protections.internalModuleCannotSelfPromoteToTopLevelAuthority,true);

  const assetPlan=buildVibeAssetProductionPlan({
    task:{gameId:'demo',goal:'캐릭터 배경 보스 UI VFX 그래픽 개선'},target:'unity',
    repoRoot:process.cwd(),manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
  });
  assert.equal(assetPlan.graphicsProductionRoot,'GRAPHICS_PRODUCTION');
  assert.equal(assetPlan.externalTopLevelGraphicsWorkUnit,false);
  assert.equal(assetPlan.plannerRole,'GRAPHICS_PRODUCTION_INPUT_ONLY');

  const production=createVibeGraphicsProduction({
    gameId:'demo',
    request:'하이엔드 캐릭터 배경 보스 애니메이션 VFX',
    target:'dual-native',
    game:{genre:'action rpg'},
    world:{materials:['stone','iron']},
    characters:[{name:'hero'},{name:'boss'}],
    assetProductionPlan:assetPlan,
    candidateRevision:'a'.repeat(40),
    sourceRevision:'b'.repeat(40),
    artBibleRef:'design/demo/art-bible.json',
    visualTargetFramesRef:'design/demo/visual-target-frames.json',
    platformEvidenceRefs:{ROBLOX:'roblox-evidence-ref',UNITY:'unity-evidence-ref'}
  });
  assert.equal(production.kind,'GRAPHICS_PRODUCTION');
  assert.equal(production.topLevelWorkUnitCount,1);
  assert.deepEqual([...production.platforms],['ROBLOX','UNITY']);
  assert.equal(production.soleCoordinator,GRAPHICS_PRODUCTION_INTERNAL_MODULES.coordinator);
  assert.deepEqual([...production.stages],[...GRAPHICS_PRODUCTION_STAGES]);
  assert.equal(production.queue.siblingTopLevelGraphicsTasksForbidden,true);
  assert.equal(production.authority.audioAuthoringOwner,'audio');
  assert.equal(production.evidence.kind,'graphics-production-evidence');
  assert.equal(production.status,'GRAPHICS_PRODUCTION_ACTIVE');
  assert.equal(production.continuousEvolution.graphicsPassIsCheckpointNotTerminal,true);
  assert.equal(production.continuousEvolution.highEndCompletionIsReleaseGate,false);
  assert.equal(production.changeRequestStability.latestExplicitOwnerIntentWinsWithinSameScope,true);
  assert.equal(production.policy.ownerChangeRequestStabilityRequired,true);
});

test('owner presentation changes replace conflicting same-scope intent instead of stacking patches',()=>{
  const stability=createVibeOwnerChangeRequestStability({
    request:'곰 공격 모션만 더 무겁게',
    previousRequests:['곰 공격 빠르게','곰 공격 흔들림 추가'],
    affectedScopes:['bear.attack.motion']
  });
  assert.equal(stability.currentIntent,'곰 공격 모션만 더 무겁게');
  assert.equal(stability.latestExplicitOwnerIntentWinsWithinSameScope,true);
  assert.equal(stability.conflictingPriorIntentMustBeReplacedNotStacked,true);
  assert.equal(stability.directResponsibleSystemModificationPreferred,true);
  assert.equal(stability.wrapperOverrideV2FinalTemporaryPatchAccumulationForbidden,true);
  assert.deepEqual([...stability.affectedScopes],['bear.attack.motion']);
});
