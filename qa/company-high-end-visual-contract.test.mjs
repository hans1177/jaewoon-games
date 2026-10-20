import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVibeAssetProductionPlan} from '../tools/vibe2-asset-production-plan.mjs';
import {createVibeArtPipeline,createVibeGraphicsProduction,createVibeOwnerChangeRequestStability,VIBE_HIGH_END_TARGET_FRAME_ROLES,GRAPHICS_PRODUCTION_INTERNAL_MODULES,GRAPHICS_PRODUCTION_STAGES,VIBE_STUDIO_HUMANOID_LOCOMOTION,VIBE_STUDIO_HUMANOID_COMBAT,VIBE_STUDIO_CREATURE_FAMILIES,VIBE_STUDIO_RETARGET_CLEANUP,VIBE_BIPED_CREATURE_FAMILIES,VIBE_CREATURE_STYLE_VARIANTS,VIBE_CARTOON_MOTION_TRANSFORMS,VIBE_CREATURE_LIBRARY_GRAPH} from '../assets/vibe-art-pipeline.js';
import {createVibeHighEndVisualDirection,HIGH_END_VISUAL_TARGET_FRAMES} from '../assets/vibe-visual-autopilot.js';
import {MOTION_DIRECTOR_TARGET,MOTION_COMPOSITION_CHANNELS,MOTION_DNA_FIELDS,MOTION_LIBRARY_GRAPH_NODES} from '../assets/vibe-motion-director.js';
import {STUDIO_ASSET_UNIVERSE_TARGET,STUDIO_ASSET_FAMILIES,CREATURE_BODY_PLANS,CREATURE_SPECIES,CLOTHING_LAYER_SLOTS,BIOME_FAMILIES,BUILDING_THEMES,CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT} from '../assets/vibe-studio-asset-universe.js';
import {createVibeHighEndPresentationStack} from '../assets/vibe-presentation-director.js';
import {auditVibeRuntimeVisualEvidence,HIGH_END_GOLDEN_SCENE_ROLES} from '../assets/vibe-visual-quality-gate.js';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
const logMap=JSON.parse(fs.readFileSync('company-learning/company-log-map.json','utf8'));
const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));
const plannerSource=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
const learningMotorSource=fs.readFileSync('tools/vibe2-learning-motor.mjs','utf8');


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
  assert.equal(art.minimumSpatialPresentation.minimumFinalGameplayDimension,'3D');
  assert.equal(art.minimumSpatialPresentation.twoPointFiveDFinalPassForbidden,true);
  assert.equal(art.minimumSpatialPresentation.allSpatialGameplayLibraryAssets3dOnly,true);
  assert.equal(art.minimumSpatialPresentation.flat2DFinalGameplayForbidden,true);
  assert.equal(art.minimumSpatialPresentation.ui2DOverlayAllowed,true);
  assert.equal(art.policy.minimumFinalGameplayDimension,'3D');
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




test('current central graphics contract follows owner Web 3D scope without historical mirror fields',()=>{
  assert.equal(roadmap.developmentAccess.WEB,'ALWAYS_ALLOWED');
  assert.equal(roadmap.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.equal(roadmap.developmentAccess.UNITY_WEB,'OWNER_HOLD');
  assert.equal(roadmap.ownerActiveDevelopmentScope20261009.generalWeb3dOnlyRequired,true);
  assert.equal(roadmap.ownerActiveDevelopmentScope20261009.existingPipelineOnly,true);
  assert.equal(roadmap.ownerActiveDevelopmentScope20261009.saveAndBalancePreserved,true);
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.format,'GLB_2_0');
});
