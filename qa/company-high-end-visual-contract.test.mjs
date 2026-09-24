import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVibeAssetProductionPlan} from '../tools/vibe2-asset-production-plan.mjs';
import {createVibeArtPipeline,createVibeGraphicsProduction,createVibeOwnerChangeRequestStability,VIBE_HIGH_END_TARGET_FRAME_ROLES,GRAPHICS_PRODUCTION_INTERNAL_MODULES,GRAPHICS_PRODUCTION_STAGES,VIBE_STUDIO_HUMANOID_LOCOMOTION,VIBE_STUDIO_HUMANOID_COMBAT,VIBE_STUDIO_CREATURE_FAMILIES,VIBE_STUDIO_RETARGET_CLEANUP,VIBE_BIPED_CREATURE_FAMILIES,VIBE_CREATURE_STYLE_VARIANTS,VIBE_CARTOON_MOTION_TRANSFORMS,VIBE_CREATURE_LIBRARY_GRAPH} from '../assets/vibe-art-pipeline.js';
import {createVibeHighEndVisualDirection,HIGH_END_VISUAL_TARGET_FRAMES} from '../assets/vibe-visual-autopilot.js';
import {MOTION_DIRECTOR_TARGET,MOTION_COMPOSITION_CHANNELS,MOTION_DNA_FIELDS,MOTION_LIBRARY_GRAPH_NODES} from '../assets/vibe-motion-director.js';
import {STUDIO_ASSET_UNIVERSE_TARGET,STUDIO_ASSET_FAMILIES,CREATURE_BODY_PLANS,CREATURE_SPECIES,CLOTHING_LAYER_SLOTS,BIOME_FAMILIES,BUILDING_THEMES} from '../assets/vibe-studio-asset-universe.js';
import {createVibeHighEndPresentationStack} from '../assets/vibe-presentation-director.js';
import {auditVibeRuntimeVisualEvidence,HIGH_END_GOLDEN_SCENE_ROLES} from '../assets/vibe-visual-quality-gate.js';
import {comparePresentationRuntimeObservations} from '../tools/company-development-web-gameplay-validation.mjs';

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
  assert.equal(c.runtimeQa.runtimeComparisonFanInApprovalRequired,true);
  assert.equal(c.runtimeQa.staticOrMarkerOnlyCannotSatisfyBeforeAfterComparison,true);
  assert.equal(c.runtimeQa.exactCandidateRevisionBindingRequired,true);
  assert.equal(c.runtimeQa.webPresentationComparisonAtCandidateFanIn,true);
  assert.equal(c.runtimeQa.nativePresentationComparisonAtPostNativeFanIn,true);
  assert.equal(c.runtimeQa.nativeFirstPresentationCycleMayEstablishRuntimeBaseline,true);
  assert.equal(c.runtimeQa.subsequentNativePresentationCyclesRequireBeforeAfterComparison,true);
  const spatial=roadmap.livingMotionVisualQualityContract.minimumSpatialPresentation;
  assert.equal(spatial.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(spatial.minimumFinalGameplayDimension,'2.5D');
  assert.equal(spatial.flat2DFinalGameplayForbidden,true);
  assert.equal(spatial.uiOverlayMayRemain2D,true);
  assert.equal(spatial.runtimeEvidenceRequired,true);
  assert.equal(c.minimumFinalGameplayDimension,'2.5D');
  assert.equal(c.flat2DFinalPresentationForbidden,true);
  assert.equal(architecture.departmentTopology.graphics.minimumFinalGameplayDimension,'2.5D');
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
  const library=roadmap.assetProductionParallelContract.companyGraphicsLibrary24h;
  assert.equal(library.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(library.graphicsProductionRoot,'GRAPHICS_PRODUCTION');
  assert.equal(library.idleGeneration.continuous24h,true);
  assert.equal(library.idleGeneration.usesExistingLearningIdleLane,true);
  assert.equal(library.idleGeneration.productionWorkAlwaysPreemptsLibraryPractice,true);
  assert.deepEqual(library.characterPreparation.unity.separateNativeVariantRequired,true);
  assert.deepEqual(library.characterPreparation.roblox.separateNativeVariantRequired,true);
  assert.equal(library.actionMotionLibrary.minimumCoverage.idleVariants>=4,true);
  assert.equal(library.actionMotionLibrary.minimumCoverage.lightComboAttacks>=3,true);
  assert.equal(library.actionMotionLibrary.minimumCoverage.deathVariants>=3,true);
  assert.ok(library.actionMotionLibrary.weaponPacks.includes('ONE_HAND_SWORD'));
  assert.ok(library.actionMotionLibrary.weaponPacks.includes('FIREARM'));
  assert.equal(library.promotionRules.preparedArtifactMayNotClaimProductionPass,true);
  assert.equal(library.promotionRules.runtimeVerifiedConsumerRequiredBeforeCompanyAssetPromotion,true);
  assert.equal(library.consumption.requiredForEveryNativeGameDevelopment,true);
  assert.deepEqual(library.consumption.appliesTo,['UNITY','ROBLOX']);
  assert.equal(library.consumption.lookupBeforeAssetChoice,true);
  assert.equal(library.gapFill.enabled,true);
  assert.deepEqual(library.gapFill.order.slice(0,3),[
    'INVENTORY_EXISTING_REPOSITORY_ASSETS',
    'REUSE_OR_DERIVE_RIGHTS_VERIFIED_REPOSITORY_ASSET',
    'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET_OR_MOTION'
  ]);
  assert.equal(library.studioMotionProgram.target,'STUDIO_GRADE_GAME_MOTION');
  assert.ok(library.studioMotionProgram.humanoidFoundation.locomotion.includes('SPRINT'));
  assert.ok(library.studioMotionProgram.humanoidFoundation.locomotion.includes('TURN_180'));
  assert.ok(library.studioMotionProgram.creatureFamilies.includes('QUADRUPED'));
  assert.ok(library.studioMotionProgram.retargetCleanupRequirements.includes('FOOT_PLANT_AND_FOOT_SLIDE_CONTROL'));
  assert.equal(library.studioMotionProgram.creatureRules.blindHumanoidMotionReuseForNonHumanoidForbidden,true);
  assert.equal(library.unarmedCombatStudio.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(library.unarmedCombatStudio.target,'VERSUS_ACTION_READY_STUDIO_GRADE_UNARMED_COMBAT');
  assert.equal(library.unarmedCombatStudio.noArtificialStyleOrMotionCap,true);
  assert.ok(library.unarmedCombatStudio.supportedStyleFamilies.includes('BOXING'));
  assert.ok(library.unarmedCombatStudio.supportedStyleFamilies.includes('WUXIA_UNARMED_FANTASY'));
  assert.ok(library.unarmedCombatStudio.motionFamilies.kicks.includes('SPINNING_HOOK_KICK'));
  assert.ok(library.unarmedCombatStudio.motionFamilies.clinchGrappleAndThrow.includes('HIP_THROW'));
  assert.ok(library.unarmedCombatStudio.motionFamilies.versusActionSlots.includes('LAUNCH_REACTION'));
  assert.ok(library.unarmedCombatStudio.comboMotionGrammar.roles.includes('AIR_FOLLOWUP'));
  assert.equal(library.unarmedCombatStudio.comboMotionGrammar.animationMayExposeTimingMarkersButAuthoritativeHitboxDamageCooldownAndComboRulesRemainGameplayOwned,true);
  assert.equal(library.unarmedCombatStudio.platformAdaptation.pairedTwoActorThrowAlignmentMustBeReauthoredAndRuntimeVerifiedPerPlatform,true);
  assert.equal(library.bipedCreatureMotionStudio.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.ok(Object.keys(library.bipedCreatureMotionStudio.taxonomy).includes('SMALL_HUMANOID_BIPED'));
  assert.ok(Object.keys(library.bipedCreatureMotionStudio.taxonomy).includes('HEAVY_BIPED'));
  assert.equal(library.bipedCreatureMotionStudio.goblinProfile.family,'SMALL_HUMANOID_BIPED');
  assert.equal(library.bipedCreatureMotionStudio.minotaurProfile.family,'HEAVY_BIPED');
  assert.equal(library.bipedCreatureMotionStudio.sharedRigDoesNotImplySharedMotionIdentity,true);
  assert.equal(library.bipedCreatureMotionStudio.speedScaleOnlyVariationForbidden,true);
  assert.equal(library.styleVariantTransformation.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.ok(library.styleVariantTransformation.supportedStyleFamilies.includes('CARTOON'));
  assert.ok(library.styleVariantTransformation.cartoonProfile.allowed.includes('CONTROLLED_SQUASH_STRETCH'));
  assert.equal(library.styleVariantTransformation.preservationRules.gameplayBalanceSaveProgressionEconomyHitCooldownMultiplayerIntentImmutable,true);
  assert.equal(library.styleVariantTransformation.preservationRules.rootMotionMustRespectAuthoritativeMovementEnvelope,true);
  assert.equal(library.styleVariantTransformation.interLibraryBindings.includes('CREATURE_RIG_LIBRARY'),true);
  assert.equal(library.styleVariantTransformation.interLibraryBindings.includes('ACTION_MOTION_LIBRARY'),true);
  assert.equal(library.motionDirectorSystem.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(library.motionDirectorSystem.target,'HIGH_END_COMPOSABLE_MOTION_DIRECTOR');
  assert.equal(library.motionDirectorSystem.internalModuleOnly,true);
  assert.equal(library.motionDirectorSystem.createsNewTopLevelPipeline,false);
  assert.equal(library.motionDirectorSystem.continuousExpansion.enabled,true);
  assert.equal(library.motionDirectorSystem.continuousExpansion.noArtificialCombinationCap,true);
  assert.ok(library.motionDirectorSystem.motionDNAFields.includes('BODY_PLAN'));
  assert.ok(library.motionDirectorSystem.motionFamilies.skill.includes('ULTIMATE'));
  assert.equal(library.motionDirectorSystem.compatibilityGraph.required,true);
  assert.equal(library.motionDirectorSystem.contextSelector.enabled,true);
  assert.equal(library.motionDirectorSystem.reactionMatcher.enabled,true);
  assert.equal(library.motionDirectorSystem.pairMotion.enabled,true);
  assert.equal(library.motionDirectorSystem.variationMemory.enabled,true);
  assert.ok(library.motionDirectorSystem.libraryInterlink.nodes.includes('SKILL_MOTION_LIBRARY'));
  assert.ok(library.motionDirectorSystem.libraryInterlink.nodes.includes('REACTION_MOTION_LIBRARY'));
  assert.ok(library.motionDirectorSystem.libraryInterlink.nodes.includes('PAIR_MOTION_LIBRARY'));
  assert.equal(library.motionDirectorSystem.authorityGuard.motionDirectorOwnsPresentationSelectionAndCompositionOnly,true);
  assert.equal(library.studioAssetUniverse.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(library.studioAssetUniverse.target,STUDIO_ASSET_UNIVERSE_TARGET);
  assert.equal(library.studioAssetUniverse.internalModuleOnly,true);
  assert.equal(library.studioAssetUniverse.createsNewTopLevelPipeline,false);
  assert.ok(library.studioAssetUniverse.creatureUniverse.bodyPlans.length>=30);
  assert.ok(library.studioAssetUniverse.creatureUniverse.species.length>=50);
  assert.equal(library.studioAssetUniverse.creatureUniverse.colorOnlyVariantDoesNotCountAsDistinctSpecies,true);
  assert.equal(library.studioAssetUniverse.clothingAndArmor.layerCompatibilityRequired,true);
  assert.equal(library.studioAssetUniverse.clothingAndArmor.clippingQaRequired,true);
  assert.ok(library.studioAssetUniverse.buildingGrammar.hardRules.includes('PLAYER_NAV_CLEAR'));
  assert.ok(library.studioAssetUniverse.biomeDna.biomes.includes('MAGICAL_FOREST'));
  assert.equal(library.studioAssetUniverse.universalCoverageScanner.enabled,true);
  assert.equal(library.studioAssetUniverse.assetIdentityQa.enabled,true);
  assert.equal(library.studioAssetUniverse.crossAssetCompatibilityGraph.enabled,true);
  assert.equal(library.studioAssetUniverse.libraryHeatmap.enabled,true);
  assert.equal(library.studioAssetUniverse.autonomousGapFill24h.enabled,true);
  assert.equal(library.studioAssetUniverse.autonomousGapFill24h.preparedSemanticMayNotClaimVerified,true);
  assert.equal(library.studioAssetUniverse.runtimeLearning.existingCanonicalLearningChainOnly,true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.platformSeparation.includes('UNITY'),true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.platformSeparation.includes('ROBLOX'),true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.companyLibraryLookupRequiredBeforeAssetChoice,true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.externalGapFillBeforeNewAuthoring,true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.studioMotionTarget,'STUDIO_GRADE_GAME_MOTION');
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.speciesMotionResearchRequired,true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.unarmedCombatStudio.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.unarmedCombatStudio.noArtificialStyleOrMotionCap,true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.bipedCreatureMotionStudio.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.styleVariantTransformation.styleLockAlwaysWins,true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.motionDirectorSystem.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.motionDirectorSystem.internalModuleOnly,true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.motionDirectorSystem.gameplayAuthorityExpansionForbidden,true);
  assert.ok(architecture.assetProductionParallelism.companyGraphicsLibrary24h.motionDirectorSystem.subsystems.includes('REACTION_MATCHER'));
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.studioAssetUniverse.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.studioAssetUniverse.internalModuleOnly,true);
  assert.equal(architecture.assetProductionParallelism.companyGraphicsLibrary24h.studioAssetUniverse.learningUsesExistingCanonicalChainOnly,true);
  assert.ok(architecture.departmentTopology.graphics.internalModules.includes('assets/vibe-studio-asset-universe.js'));
});

test('asset and direction planners consume one high-end profile without Web-first admission',()=>{
  const plan=buildVibeAssetProductionPlan({
    task:{
      gameId:'demo',
      goal:'캐릭터 배경 보스 UI VFX 그래픽 개선',
      referenceImages:[{
        sourceId:'owned-world-ref',
        sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
        imageRef:'references/world.png',
        rights:{owned:true},
        verifiedAgainstSource:true,
        observation:{
          RIDGE_AND_VALLEY_FLOW:'ridge-valley',
          ROAD_AND_PATH_GRAPH:'branch-return',
          OPEN_SPACE_DENSITY:'mixed',
          LANDMARK_HIERARCHY:'temple-over-village'
        }
      }]
    },target:'unity',
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
  assert.equal(plan.companyGraphicsLibrary.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.platformProfile,'UNITY');
  assert.equal(plan.companyGraphicsLibrary.platformSpecificReauthoringRequired,true);
  assert.equal(plan.companyGraphicsLibrary.mandatoryConsumer,true);
  assert.equal(plan.companyGraphicsLibrary.lookupBeforeAssetChoice,true);
  assert.equal(plan.companyGraphicsLibrary.externalGapFillBeforeNewAuthoring,true);
  assert.equal(plan.companyGraphicsLibrary.studioMotionTarget,'STUDIO_GRADE_GAME_MOTION');
  assert.ok(plan.companyGraphicsLibrary.studioMotionPriority.includes('HUMANOID_STUDIO_LOCOMOTION'));
  assert.ok(plan.companyGraphicsLibrary.humanoidFoundation.locomotion.includes('RUN'));
  assert.ok(plan.companyGraphicsLibrary.creatureFamilies.includes('INSECT'));
  assert.ok(plan.companyGraphicsLibrary.retargetCleanupRequirements.includes('HAND_WEAPON_CONTACT'));
  assert.equal(plan.companyGraphicsLibrary.motionMinimums.idleVariants>=4,true);
  assert.ok(plan.companyGraphicsLibrary.weaponPacks.includes('HAMMER'));
  assert.equal(plan.policy.companyGraphicsLibrary24h,true);
  assert.equal(plan.policy.unityRobloxLibraryVariantsSeparated,true);
  assert.equal(plan.policy.actionReadyMotionVarietyRequired,true);
  assert.equal(plan.policy.companyLibraryLookupRequiredBeforeNativeAssetChoice,true);
  assert.equal(plan.policy.externalGapFillBeforeNewAuthoring,true);
  assert.equal(plan.policy.studioGradeMotionRequired,true);
  assert.equal(plan.policy.retargetAndCleanupRequiredForExternalMotion,true);
  assert.equal(plan.policy.speciesMotionStudyRequired,true);
  assert.equal(plan.companyGraphicsLibrary.unarmedCombat.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.unarmedCombat.target,'VERSUS_ACTION_READY_STUDIO_GRADE_UNARMED_COMBAT');
  assert.equal(plan.companyGraphicsLibrary.unarmedCombat.noArtificialStyleOrMotionCap,true);
  assert.ok(plan.companyGraphicsLibrary.unarmedCombat.styleFamilies.includes('MUAY_THAI'));
  assert.ok(plan.companyGraphicsLibrary.unarmedCombat.motionFamilies.handStrikes.includes('JAB'));
  assert.ok(plan.companyGraphicsLibrary.unarmedCombat.motionFamilies.wuxiaFantasy.includes('WUXIA_AIR_CHASE'));
  assert.ok(plan.companyGraphicsLibrary.unarmedCombat.comboRoles.includes('LAUNCHER'));
  assert.equal(plan.companyGraphicsLibrary.unarmedCombat.timingMarkersCannotOwnGameplayRules,true);
  assert.equal(plan.policy.unarmedVersusActionMotionRequired,true);
  assert.equal(plan.policy.unarmedStyleResearchNoArtificialCap,true);
  assert.equal(plan.policy.wuxiaUnarmedMotionResearch,true);
  assert.equal(plan.policy.pairedThrowPlatformRuntimeVerificationRequired,true);
  assert.equal(plan.companyGraphicsLibrary.bipedCreature.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.bipedCreature.goblinProfile.family,'SMALL_HUMANOID_BIPED');
  assert.equal(plan.companyGraphicsLibrary.bipedCreature.minotaurProfile.family,'HEAVY_BIPED');
  assert.equal(plan.companyGraphicsLibrary.bipedCreature.sharedRigDoesNotImplySharedMotionIdentity,true);
  assert.equal(plan.companyGraphicsLibrary.styleVariants.enabled,true);
  assert.ok(plan.companyGraphicsLibrary.styleVariants.supportedStyles.includes('CARTOON'));
  assert.ok(plan.companyGraphicsLibrary.styleVariants.cartoonProfile.allowed.includes('LARGER_HEAD_OR_HANDS'));
  assert.equal(plan.companyGraphicsLibrary.styleVariants.gameplayAuthorityImmutable,true);
  assert.equal(plan.companyGraphicsLibrary.styleVariants.rootMotionEnvelopeRequired,true);
  assert.equal(plan.companyGraphicsLibrary.styleVariants.contactMarkersSynchronized,true);
  assert.equal(plan.policy.bipedCreatureBodyPlanMotionRequired,true);
  assert.equal(plan.policy.sharedRigDoesNotImplySharedMotionIdentity,true);
  assert.equal(plan.policy.bipedSpeedScaleOnlyVariationForbidden,true);
  assert.equal(plan.policy.styleVariantDerivationAllowed,true);
  assert.equal(plan.policy.cartoonStyleVariantAllowed,true);
  assert.equal(plan.policy.styleVariantPreservesGameplayAuthority,true);
  assert.equal(plan.policy.creatureLibraryGraphInterlinkRequired,true);
  assert.equal(plan.companyGraphicsLibrary.motionDirector.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.motionDirector.target,'HIGH_END_COMPOSABLE_MOTION_DIRECTOR');
  assert.equal(plan.companyGraphicsLibrary.motionDirector.internalModuleOnly,true);
  assert.equal(plan.companyGraphicsLibrary.motionDirector.continuousExpansion,true);
  assert.equal(plan.companyGraphicsLibrary.motionDirector.noArtificialCombinationCap,true);
  assert.ok(plan.companyGraphicsLibrary.motionDirector.compositionChannels.includes('UPPER_BODY'));
  assert.ok(plan.companyGraphicsLibrary.motionDirector.motionDNAFields.includes('CONTACT_LIMB'));
  assert.ok(plan.companyGraphicsLibrary.motionDirector.motionFamilies.reaction.includes('WALL_HIT'));
  assert.ok(plan.companyGraphicsLibrary.motionDirector.libraryGraphNodes.includes('PAIR_MOTION_LIBRARY'));
  assert.equal(plan.companyGraphicsLibrary.motionDirector.gameplayAuthority,false);
  assert.equal(plan.policy.composableMotionDirectorRequired,true);
  assert.equal(plan.policy.motionDirectorContinuousExpansion,true);
  assert.equal(plan.policy.motionDirectorNoArtificialCombinationCap,true);
  assert.equal(plan.policy.motionDNARequired,true);
  assert.equal(plan.policy.motionCompatibilityGraphRequired,true);
  assert.equal(plan.policy.contextMotionSelectorRequired,true);
  assert.equal(plan.policy.reactionMatcherRequired,true);
  assert.equal(plan.policy.pairMotionRequired,true);
  assert.equal(plan.policy.variationMemoryRequired,true);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.target,STUDIO_ASSET_UNIVERSE_TARGET);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.creatureBodyPlans.length>=30);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.creatureSpecies.length>=50);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.clothingLayerSlots.length,15);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.biomes.length>=18);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.buildingThemes.length>=12);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.coverage.missingSlotCount>0);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.plannedSemanticSeedCount>0);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.autonomous24h,true);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.preparedSemanticMayNotClaimVerified,true);
  assert.equal(plan.policy.studioAssetUniverseRequired,true);
  assert.equal(plan.policy.universalAssetCoverageScannerRequired,true);
  assert.equal(plan.policy.crossAssetCompatibilityRequired,true);
  assert.equal(plan.policy.assetIdentityQaRequired,true);
  assert.equal(plan.policy.styleBibleGeneratorRequired,true);
  assert.equal(plan.policy.clothingLayerCompatibilityRequired,true);
  assert.equal(plan.policy.buildingGrammarRequired,true);
  assert.equal(plan.policy.biomeDnaRequired,true);
  assert.equal(plan.policy.libraryHeatmapRequired,true);
  assert.equal(plan.policy.autonomousLibraryPopulation24h,true);
  assert.equal(plan.policy.semanticAssetSeedCannotSelfPromote,true);

  const art=createVibeArtPipeline({request:'하이엔드 캐릭터 배경 보스 애니메이션 VFX',target:'roblox',quality:3});
  assert.equal(art.version,12);
  assert.deepEqual([...art.highEndVisual.targetFrames],[...VIBE_HIGH_END_TARGET_FRAME_ROLES]);
  assert.ok(art.art.transforms.includes('kitbash'));
  assert.equal(art.policy.highEndVisualProduction,true);
  assert.equal(art.minimumSpatialPresentation.minimumFinalGameplayDimension,'2.5D');
  assert.equal(art.minimumSpatialPresentation.flat2DFinalGameplayForbidden,true);
  assert.equal(art.minimumSpatialPresentation.ui2DOverlayAllowed,true);
  assert.equal(art.policy.minimumFinalGameplayDimension,'2.5D');
  assert.ok(art.implementation.some(value=>/3D|2\.5D/.test(value)));
  assert.deepEqual([...art.animation.motionLayers],['PRIMARY_MOTION','SECONDARY_MOTION','PROCEDURAL_RESPONSE']);
  assert.equal(art.animation.target,'STUDIO_GRADE_GAME_MOTION');
  assert.deepEqual([...art.animation.humanoidLocomotion],[...VIBE_STUDIO_HUMANOID_LOCOMOTION]);
  assert.deepEqual([...art.animation.humanoidCombat],[...VIBE_STUDIO_HUMANOID_COMBAT]);
  assert.deepEqual([...art.animation.creatureFamilies],[...VIBE_STUDIO_CREATURE_FAMILIES]);
  assert.deepEqual([...art.animation.bipedCreature.families],[...VIBE_BIPED_CREATURE_FAMILIES]);
  assert.equal(art.animation.bipedCreature.goblin.family,'SMALL_HUMANOID_BIPED');
  assert.equal(art.animation.bipedCreature.minotaur.family,'HEAVY_BIPED');
  assert.equal(art.animation.bipedCreature.sharedRigDoesNotImplySharedMotionIdentity,true);
  assert.deepEqual([...art.animation.styleVariants.styles],[...VIBE_CREATURE_STYLE_VARIANTS]);
  assert.deepEqual([...art.animation.styleVariants.cartoonTransforms],[...VIBE_CARTOON_MOTION_TRANSFORMS]);
  assert.deepEqual([...art.animation.styleVariants.libraryGraph],[...VIBE_CREATURE_LIBRARY_GRAPH]);
  assert.equal(art.animation.styleVariants.gameplayAuthorityImmutable,true);
  assert.equal(art.animation.styleVariants.rootMotionMustRespectAuthoritativeMovementEnvelope,true);
  assert.deepEqual([...art.animation.retargetCleanup],[...VIBE_STUDIO_RETARGET_CLEANUP]);
  assert.equal(art.animation.motionDirector.target,MOTION_DIRECTOR_TARGET);
  assert.equal(art.animation.motionDirector.gameplayAuthority,false);
  assert.equal(art.animation.motionDirector.continuousExpansion,true);
  assert.deepEqual([...art.animation.motionDirectorContract.compositionChannels],[...MOTION_COMPOSITION_CHANNELS]);
  assert.deepEqual([...art.animation.motionDirectorContract.motionDNAFields],[...MOTION_DNA_FIELDS]);
  assert.deepEqual([...art.animation.motionDirectorContract.libraryGraphNodes],[...MOTION_LIBRARY_GRAPH_NODES]);
  assert.equal(art.animation.motionDirectorContract.noArtificialCombinationCap,true);
  assert.equal(art.animation.motionDirectorContract.gameplayAuthority,false);
  assert.equal(art.studioAssetUniverse.target,STUDIO_ASSET_UNIVERSE_TARGET);
  assert.deepEqual([...art.studioAssetUniverseContract.families],[...STUDIO_ASSET_FAMILIES]);
  assert.deepEqual([...art.studioAssetUniverseContract.creatureBodyPlans],[...CREATURE_BODY_PLANS]);
  assert.deepEqual([...art.studioAssetUniverseContract.creatureSpecies],[...CREATURE_SPECIES]);
  assert.deepEqual([...art.studioAssetUniverseContract.clothingLayerSlots],[...CLOTHING_LAYER_SLOTS]);
  assert.deepEqual([...art.studioAssetUniverseContract.biomes],[...BIOME_FAMILIES]);
  assert.deepEqual([...art.studioAssetUniverseContract.buildingThemes],[...BUILDING_THEMES]);
  assert.equal(art.studioAssetUniverseContract.universalCoverageScanner,true);
  assert.equal(art.studioAssetUniverseContract.autonomousGapFill24h,true);
  assert.equal(art.studioAssetUniverseContract.preparedSemanticMayNotClaimVerified,true);
  assert.equal(art.animation.unarmedCombat.target,'VERSUS_ACTION_READY_STUDIO_GRADE_UNARMED_COMBAT');
  assert.equal(art.animation.unarmedCombat.noArtificialStyleOrMotionCap,true);
  assert.ok(art.animation.unarmedCombat.styleFamilies.includes('TAEKWONDO'));
  assert.ok(art.animation.unarmedCombat.stanceAndGuard.includes('FIGHT_IDLE'));
  assert.ok(art.animation.unarmedCombat.footwork.includes('WUXIA_GLIDE_STEP'));
  assert.ok(art.animation.unarmedCombat.strikes.includes('PALM_HEEL'));
  assert.ok(art.animation.unarmedCombat.kicks.includes('FLYING_KNEE'));
  assert.ok(art.animation.unarmedCombat.defenseAndCounter.includes('PARRY_COUNTER'));
  assert.ok(art.animation.unarmedCombat.grappleAndThrow.includes('SHOULDER_THROW'));
  assert.ok(art.animation.unarmedCombat.recovery.includes('KIP_UP'));
  assert.ok(art.animation.unarmedCombat.wuxiaFantasy.includes('WUXIA_LAUNCH_STRIKE'));
  assert.ok(art.animation.unarmedCombat.versusActionSlots.includes('THROW_BREAK'));
  assert.ok(art.animation.unarmedCombat.comboRoles.includes('FINISHER'));
  assert.equal(art.animation.unarmedCombat.animationTimingMarkersMayNotOwnGameplayRules,true);
  assert.equal(art.animation.speciesReferenceStudyRequired,true);
  assert.equal(art.animation.blindHumanoidMotionReuseForNonHumanoidForbidden,true);
  assert.equal(art.animation.platformNativeRetargetAndRuntimeEvidenceRequired,true);
  assert.equal(art.assetAcquisition.companyLibraryLookupRequiredForNative,true);
  assert.equal(art.assetAcquisition.externalGapFillBeforeNewAuthoring,true);
  assert.equal(art.policy.studioGradeMotionRequired,true);
  assert.equal(art.policy.unarmedVersusActionMotionRequired,true);
  assert.equal(art.policy.unarmedStyleResearchNoArtificialCap,true);
  assert.equal(art.policy.wuxiaUnarmedMotionResearch,true);
  assert.equal(art.policy.animationTimingMarkersCannotOwnGameplayRules,true);
  assert.equal(art.policy.composableMotionDirectorRequired,true);
  assert.equal(art.policy.motionDirectorContinuousExpansion,true);
  assert.equal(art.policy.motionDirectorNoArtificialCombinationCap,true);
  assert.equal(art.policy.motionDirectorGameplayAuthority,false);
  assert.equal(art.policy.studioAssetUniverseRequired,true);
  assert.equal(art.policy.universalAssetCoverageScannerRequired,true);
  assert.equal(art.policy.assetIdentityQaRequired,true);
  assert.equal(art.policy.crossAssetCompatibilityRequired,true);
  assert.equal(art.policy.styleBibleGeneratorRequired,true);
  assert.equal(art.policy.autonomousLibraryPopulation24h,true);
  assert.equal(art.policy.preparedSemanticAssetMayNotClaimVerified,true);
  assert.equal(GRAPHICS_PRODUCTION_INTERNAL_MODULES.motionDirector,'assets/vibe-motion-director.js');
  assert.equal(GRAPHICS_PRODUCTION_INTERNAL_MODULES.studioAssetUniverse,'assets/vibe-studio-asset-universe.js');
  assert.equal(art.policy.bipedCreatureBodyPlanMotionRequired,true);
  assert.equal(art.policy.sharedRigDoesNotImplySharedMotionIdentity,true);
  assert.equal(art.policy.cartoonStyleVariantAllowed,true);
  assert.equal(art.policy.styleVariantPreservesGameplayAuthority,true);
  assert.equal(art.policy.creatureLibraryGraphInterlinkRequired,true);
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
  assert.equal(logMap.referenceImageWorldObservationEvidenceContract.rawReferenceImageBytesInLearningLogsForbidden,true);
  assert.equal(logMap.referenceImageWorldObservationEvidenceContract.directMapLayoutOrDistinctiveLandmarkCopyForbidden,true);
  assert.equal(logMap.narrativeRuntimeEvidenceContract.existingCanonicalLearningMotorOnly,true);
  assert.equal(security.graphicsProductionUnificationSecurity.protections.internalModuleCannotSelfPromoteToTopLevelAuthority,true);

  const assetPlan=buildVibeAssetProductionPlan({
    task:{
      gameId:'demo',
      goal:'캐릭터 배경 보스 UI VFX 그래픽 개선',
      referenceImages:[{
        sourceId:'owned-world-ref',
        sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
        imageRef:'references/world.png',
        rights:{owned:true},
        verifiedAgainstSource:true,
        observation:{
          RIDGE_AND_VALLEY_FLOW:'ridge-valley',
          ROAD_AND_PATH_GRAPH:'branch-return',
          OPEN_SPACE_DENSITY:'mixed',
          LANDMARK_HIERARCHY:'temple-over-village'
        }
      }]
    },target:'unity',
    repoRoot:process.cwd(),manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
  });
  assert.equal(assetPlan.graphicsProductionRoot,'GRAPHICS_PRODUCTION');
  assert.equal(assetPlan.externalTopLevelGraphicsWorkUnit,false);
  assert.equal(assetPlan.plannerRole,'GRAPHICS_PRODUCTION_INPUT_ONLY');
  assert.equal(assetPlan.policy.referenceImageObservationSupported,true);
  assert.equal(assetPlan.policy.rawProtectedReferenceImagePersistentLearningForbidden,true);
  assert.equal(assetPlan.companyGraphicsLibrary.studioAssetUniverse.worldGenerationStudio.referenceImageStudies.length,1);
  assert.equal(assetPlan.companyGraphicsLibrary.studioAssetUniverse.worldGenerationStudio.verifiedObservationCount,1);

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
    platformEvidenceRefs:{ROBLOX:'roblox-evidence-ref',UNITY:'unity-evidence-ref'},
    referenceImages:[{
      sourceId:'owned-world-ref',
      sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
      imageRef:'references/world.png',
      rights:{owned:true},
      verifiedAgainstSource:true,
      observation:{
        RIDGE_AND_VALLEY_FLOW:'ridge-valley',
        ROAD_AND_PATH_GRAPH:'branch-return',
        OPEN_SPACE_DENSITY:'mixed',
        LANDMARK_HIERARCHY:'temple-over-village'
      }
    }]
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
  assert.equal(production.referenceImageStudies.length,1);
  assert.equal(production.referenceImageObservationReadyCount,1);
  assert.equal(production.verifiedReferenceImageObservationCount,1);
  assert.equal(production.policy.rawProtectedReferenceImagePersistentLearningForbidden,true);
  assert.equal(production.policy.directReferenceSceneOrMapCopyForbidden,true);
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


test('Web presentation fan-in comparison requires actual runtime delta and preserves protected presentation contracts',()=>{
  const runtime={pass:true,livingMotionObserved:true,frameTiming:{pass:true,p95Ms:20}};
  const view={styleLockId:'forest-v1',styleLockRevision:'1',horizontalOverflow:false,genreUiProfile:'survival',uiMotionLanguage:'soft',enemyTypes:['wolf'],enemyPresentationSignatures:['wolf-mesh'],environmentVisualDetailCount:2,enemyVisualDetailCount:1,canvasRenderSurfaceCount:1,characterEntityCount:2,gameplayScreenRatio:.7};
  const before={observed:true,presentationSourceSha256:'a'.repeat(64),screenshotSha256:'b'.repeat(64),runtime,view,runtimeErrorCount:0};
  const after={observed:true,presentationSourceSha256:'c'.repeat(64),screenshotSha256:'d'.repeat(64),runtime:{...runtime,frameTiming:{pass:true,p95Ms:24}},view:{...view,environmentVisualDetailCount:3},runtimeErrorCount:0};
  const pass=comparePresentationRuntimeObservations({before,after,baseRevision:'1'.repeat(40),candidateRevision:'2'.repeat(40)});
  assert.equal(pass.pass,true);
  assert.equal(pass.actualRuntimeObserved,true);
  assert.equal(pass.visibleRenderDelta,true);
  assert.equal(pass.protectedRegression.pass,true);
  assert.equal(pass.fanInDecision,'PASS');

  const noVisibleDelta=comparePresentationRuntimeObservations({
    before,
    after:{...before,presentationSourceSha256:'c'.repeat(64)},
    baseRevision:'1'.repeat(40),
    candidateRevision:'2'.repeat(40)
  });
  assert.equal(noVisibleDelta.pass,false);
  assert.equal(noVisibleDelta.visibleRenderDelta,false);

  const styleRegression=comparePresentationRuntimeObservations({
    before,
    after:{...after,view:{...after.view,styleLockId:'different-style'}},
    baseRevision:'1'.repeat(40),
    candidateRevision:'2'.repeat(40)
  });
  assert.equal(styleRegression.pass,false);
  assert.equal(styleRegression.protectedRegression.checks.styleLockIdPreserved,false);
});

test('central graphics contract binds studio packages and native baseline lifecycle to final fan-in',()=>{
  const studio=roadmap.changeRecord.studioQualityEvolution20260924.runtimeVisualFanIn;
  assert.equal(studio.actualBeforeAfterRuntimeComparisonRequiredForPresentationPackages,true);
  assert.equal(studio.staticOnlyOrMarkerOnlyComparisonForbidden,true);
  assert.equal(studio.studioPackageClass,'STUDIO_QUALITY_PACKAGE');
  assert.equal(studio.studioPackageMustMeetLongWorkThreshold,true);
  assert.equal(studio.verifiedCheckpointMustLeaveNextStudioCyclePlannable,true);
  assert.equal(studio.nativeFirstPresentationCycle.whenNoPriorVerifiedActualRuntimeBaseline,true);
  assert.equal(studio.nativeFirstPresentationCycle.mayClaimBeforeAfterPass,false);
  assert.equal(studio.nativeFirstPresentationCycle.nextPresentationCycleRequiresPriorBaselineAndCurrentRuntime,true);
  assert.equal(architecture.studioQualityEvolutionTopology.packageContract.class,'STUDIO_QUALITY_PACKAGE');
  assert.equal(architecture.studioQualityEvolutionTopology.runtimeVisualFanIn.actualRuntimeObservationRequired,true);
  assert.equal(logMap.graphicsProductionEvidenceContract.runtimeBeforeAfterFanIn.failClosedAtFinalPlatformFanIn,true);
  assert.equal(logMap.graphicsProductionEvidenceContract.runtimeBeforeAfterFanIn.nativeBaselineLifecycle.priorBaselineMustReferenceVerifiedQueueTask,true);
});
