// 파일명: assets/vibe-art-pipeline.js
// 역할: 자연어 요구를 게임 그래픽·애니메이션·VFX·사운드 제작 사양으로 변환
// 규칙: 게임 판정과 표현을 분리하고 기존 규칙/세이브를 보존하며, V3에서는 권리 확인된 기존 에셋을 비파괴 후보 변형 후 경쟁 선택한다.

import {planVibeStyleAwareGraphicsAutopilot,planVibeVisualAutopilot} from './vibe-visual-autopilot.js';
import {planVibePresentationAutopilot} from './vibe-presentation-director.js';
import {auditVibeRuntimeVisualEvidence} from './vibe-visual-quality-gate.js';
import {createMotionDirectorPlan,MOTION_COMPOSITION_CHANNELS,MOTION_DNA_FIELDS,MOTION_LIBRARY_GRAPH_NODES,MOTION_GRAMMARS} from './vibe-motion-director.js';
import {createStudioAssetUniversePlan,STUDIO_ASSET_UNIVERSE_TARGET,STUDIO_ASSET_FAMILIES,CREATURE_BODY_PLANS,CREATURE_SPECIES,CLOTHING_LAYER_SLOTS,BIOME_FAMILIES,BUILDING_THEMES} from './vibe-studio-asset-universe.js';
import {createVibeReferenceImageStudyRequest,bindVibeReferenceImageObservation} from './vibe-environment-director.js';

const QUALITY_WORDS = Object.freeze({
  art: ['그래픽', '그림', '비주얼', '캐릭터', '곤충', '배경', '에셋', '퀄리티', '고퀄'],
  animation: ['애니', '애니메이션', '모션', '움직임', '동작', '걷기', '공격모션', '피격', '사망'],
  vfx: ['이펙트', '효과', 'vfx', '파티클', '폭발', '빛', '피격효과', '스킬연출'],
  audio: ['소리', '사운드', '음악', 'bgm', '효과음', '공격음', '피격음'],
});
const ASSET_TRANSFORMS = Object.freeze(['crop','scale','rotate','recolor','contrast','lighting','material','silhouette','part-separation','part-recomposition','layering','tile-repeat','shadow','outline','animation-rig','vfx-derivative','mobile-simplification','kitbash','proportion-variation','region-variant','elite-boss-derivative','lod-optimization','set-dressing']);
const V3_VARIANT_PROFILES = Object.freeze([
  Object.freeze({id:'style-normalize',transforms:Object.freeze(['recolor','contrast','lighting','material','outline','shadow'])}),
  Object.freeze({id:'silhouette-remix',transforms:Object.freeze(['silhouette','part-separation','part-recomposition','layering','rotate','scale'])}),
  Object.freeze({id:'mobile-performance',transforms:Object.freeze(['crop','scale','outline','shadow','mobile-simplification'])}),
]);



export const GRAPHICS_PRODUCTION_INTERNAL_MODULES=Object.freeze({
  coordinator:'assets/vibe-art-pipeline.js',
  inputPlanner:'tools/vibe2-asset-production-plan.mjs',
  visualDirection:'assets/vibe-visual-autopilot.js',
  presentation:'assets/vibe-presentation-director.js',
  runtimeQuality:'assets/vibe-visual-quality-gate.js',
  motionDirector:'assets/vibe-motion-director.js',
  studioAssetUniverse:'assets/vibe-studio-asset-universe.js'
});
export const GRAPHICS_PRODUCTION_STAGES=Object.freeze([
  'ART_DIRECTION_AND_VISUAL_TARGET_LOCK',
  'ASSET_INVENTORY_ACQUISITION_AND_MUTATION',
  'HERO_CHARACTER_CREATURE_AND_SIGNATURE_ASSETS',
  'ENVIRONMENT_BACKGROUND_LANDMARK_AND_SET_DRESSING',
  'MATERIAL_LIGHTING_AND_PLATFORM_REAUTHORING',
  'ANIMATION_AND_MOTION_IDENTITY',
  'VFX_UI_AND_PRESENTATION_BINDING',
  'RUNTIME_VISUAL_QA_AND_BEFORE_AFTER_REGRESSION',
  'PLATFORM_PERFORMANCE_AND_COHESION_FAN_IN'
]);

export const VIBE_ASSET_ACQUISITION_ORDER = Object.freeze([
  'VERIFIED_COMPANY_ASSET_AND_RIG_LIBRARY',
  'LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET',
  'LICENSE_VERIFIED_EXTERNAL_ASSET',
  'RECONSTRUCT_OR_DERIVE_WHEN_RIGHTS_ALLOW',
  'CREATE_NEW_ASSET',
  'PROTOTYPE_PRIMITIVE_FALLBACK_ONLY',
]);
export const VIBE_GOLDEN_SCENE_ROLES = Object.freeze([
  'PLAYER_OR_PRIMARY_CHARACTER_CLOSEUP',
  'PRIMARY_ENEMY_OR_CREATURE_CLOSEUP',
  'CORE_GAMEPLAY_ACTION',
  'WORLD_OR_REGION_WIDE',
  'MOBILE_GAMEPLAY_HUD',
]);
export const VIBE_HIGH_END_TARGET_FRAME_ROLES = Object.freeze([
  ...VIBE_GOLDEN_SCENE_ROLES,
  'KEY_LANDMARK_OR_HUB',
  'BOSS_OR_SIGNATURE_ENCOUNTER',
]);

export const VIBE_CINEMATIC_DIRECTION_AXES=Object.freeze([
  'SCENE_INTENT',
  'CHARACTER_AND_CREATURE_ACTING',
  'SHOT_AND_COMPOSITION_LANGUAGE',
  'MATERIAL_STORYTELLING',
  'ENVIRONMENTAL_STORYTELLING',
  'AMBIENT_WORLD_MOTION',
  'VFX_INTENSITY_HIERARCHY',
  'CAMERA_LIGHTING_AUDIO_VISUAL_SYNCHRONIZATION'
]);
export const VIBE_MOTION_LAYERS=Object.freeze(['PRIMARY_MOTION','SECONDARY_MOTION','PROCEDURAL_RESPONSE']);
export const VIBE_STUDIO_HUMANOID_LOCOMOTION=Object.freeze(['IDLE','WALK','JOG','RUN','SPRINT','START','STOP','STRAFE_LEFT','STRAFE_RIGHT','BACKWARD','TURN_45','TURN_90','TURN_180','JUMP_START','JUMP_AIR','LAND','CROUCH']);
export const VIBE_STUDIO_HUMANOID_COMBAT=Object.freeze(['LIGHT_ATTACK','HEAVY_ATTACK','GUARD','DODGE','DIRECTIONAL_HIT','KNOCKBACK','STUN','KNOCKDOWN','GET_UP','DEATH']);
export const VIBE_UNARMED_STYLE_FAMILIES=Object.freeze(['BOXING','KICKBOXING','MUAY_THAI','KARATE','TAEKWONDO','SANDA','WUSHU_KUNG_FU','WING_CHUN_REFERENCE','CAPOEIRA_REFERENCE','WRESTLING','JUDO_THROWING','JIU_JITSU_GRAPPLING','MMA_HYBRID','STREET_BRAWLER','HEAVY_BRUISER','ACROBATIC_FANTASY','WUXIA_UNARMED_FANTASY']);
export const VIBE_UNARMED_STANCE_GUARD=Object.freeze(['RELAXED_IDLE','FIGHT_IDLE','ORTHODOX_GUARD','SOUTHPAW_GUARD','HIGH_GUARD','LOW_GUARD','SIDE_ON_GUARD','OPEN_HAND_GUARD','CROUCH_GUARD','STANCE_SWITCH','READY_TAUNT']);
export const VIBE_UNARMED_FOOTWORK=Object.freeze(['STEP_FORWARD','STEP_BACK','SHUFFLE_FORWARD','SHUFFLE_BACK','PIVOT_LEFT','PIVOT_RIGHT','CIRCLE_LEFT','CIRCLE_RIGHT','SIDESTEP_LEFT','SIDESTEP_RIGHT','DASH_FORWARD','DASH_BACK','BURST_STEP','CROSS_STEP','STANCE_SWITCH_STEP','WUXIA_GLIDE_STEP','WUXIA_LIGHTNESS_DASH']);
export const VIBE_UNARMED_STRIKES=Object.freeze(['JAB','CROSS','LEAD_HOOK','REAR_HOOK','LEAD_UPPERCUT','REAR_UPPERCUT','OVERHAND','BACKFIST','SPINNING_BACKFIST','HAMMERFIST','PALM_HEEL','DOUBLE_PALM','KNIFE_HAND','RIDGE_HAND','SPEAR_HAND','FINGER_STRIKE_FANTASY','CLAW_STRIKE_FANTASY','LEAD_ELBOW','REAR_ELBOW','HORIZONTAL_ELBOW','UPWARD_ELBOW','SPINNING_ELBOW','LEAD_KNEE','REAR_KNEE','CLINCH_KNEE','SHOULDER_CHECK','BODY_CHECK']);
export const VIBE_UNARMED_KICKS=Object.freeze(['FRONT_KICK','PUSH_KICK','SIDE_KICK','LOW_ROUND_KICK','MID_ROUND_KICK','HIGH_ROUND_KICK','HOOK_KICK','AXE_KICK','BACK_KICK','SPINNING_BACK_KICK','CRESCENT_KICK','SPINNING_HOOK_KICK','SWEEP_KICK','JUMP_FRONT_KICK','FLYING_KNEE','JUMP_ROUND_KICK','ACROBATIC_SPIN_KICK']);
export const VIBE_UNARMED_DEFENSE_COUNTER=Object.freeze(['HIGH_BLOCK','LOW_BLOCK','BODY_BLOCK','INSIDE_PARRY','OUTSIDE_PARRY','PALM_DEFLECT','SLIP_LEFT','SLIP_RIGHT','WEAVE_LEFT','WEAVE_RIGHT','SWAY_BACK','DUCK','LEG_CHECK','CATCH_KICK','COUNTER_JAB','COUNTER_CROSS','COUNTER_HOOK','PARRY_COUNTER','REVERSAL_STRIKE']);
export const VIBE_UNARMED_GRAPPLE_THROW=Object.freeze(['CLINCH_ENTRY','DOUBLE_COLLAR_TIE','UNDERHOOK','OVERHOOK','BODY_LOCK','GRAB_FRONT','GRAB_SIDE','SINGLE_LEG_ENTRY','DOUBLE_LEG_ENTRY','TRIP','FOOT_SWEEP','HIP_THROW','SHOULDER_THROW','REAP_THROW','LEG_HOOK_THROW','SUPLEX_STYLE_GAME_THROW','PUSH_THROW','THROW_BREAK','GRAB_ESCAPE']);
export const VIBE_UNARMED_RECOVERY=Object.freeze(['BREAKFALL_BACK','BREAKFALL_SIDE','FORWARD_ROLL','BACKWARD_ROLL','TECH_ROLL_LEFT','TECH_ROLL_RIGHT','GROUND_GET_UP','COMBAT_GET_UP','KIP_UP','WALL_RECOVERY','KNOCKDOWN_IDLE','DOWNED_HIT_REACTION']);
export const VIBE_UNARMED_WUXIA=Object.freeze(['WUXIA_PALM_CHAIN','WUXIA_FINGER_CHAIN','WUXIA_CLAW_CHAIN','WUXIA_SHOULDER_STRIKE','WUXIA_SWEEP_CHAIN','WUXIA_SPIN_EVADE','WUXIA_AERIAL_PALM','WUXIA_AERIAL_KICK','WUXIA_DASH_STRIKE','WUXIA_AFTERIMAGE_STEP','WUXIA_COUNTER_PALM','WUXIA_LAUNCH_STRIKE','WUXIA_AIR_CHASE','WUXIA_LANDING_POSE','WUXIA_CHARGE_OR_FOCUS_POSE']);
export const VIBE_UNARMED_VERSUS_ACTION=Object.freeze(['NEUTRAL','STARTUP','ACTIVE_CONTACT','RECOVERY','BLOCK_REACTION','HIT_REACTION','COUNTER_HIT_REACTION','GUARD_BREAK_REACTION','LAUNCH_REACTION','AIR_HIT_REACTION','WALL_HIT_REACTION','WALL_BOUNCE_MOTION','GROUND_BOUNCE_MOTION','KNOCKDOWN','WAKEUP','TECH_RECOVERY','GRAB','THROW','THROW_BREAK','PARRY','REVERSAL','COMBO_LINK','COMBO_ENDER','AERIAL_CHAIN','FINISHER','SUPER_OR_ULTIMATE_PRESENTATION']);
export const VIBE_UNARMED_COMBO_ROLES=Object.freeze(['OPENER','LINKER','PRESSURE','COUNTER','LAUNCHER','AIR_FOLLOWUP','ENDER','THROW','REVERSAL','FINISHER']);
export const VIBE_UNARMED_MOTION_METADATA=Object.freeze(['STANCE','LEAD_SIDE','STARTUP_CLASS','CONTACT_PHASE','RECOVERY_CLASS','TRAVEL_VECTOR','HEIGHT_CLASS','DIRECTION','COMBO_ROLE','COUNTER_ROLE','LAUNCH_ROLE','AIR_ROLE','KNOCKDOWN_ROLE','CONTACT_LIMB','ROOT_MOTION_MODE','MIRROR_SAFE','LOOPABLE']);

export const VIBE_BIPED_CREATURE_FAMILIES=Object.freeze(['SMALL_HUMANOID_BIPED','STANDARD_HUMANOID_MONSTER','HEAVY_BIPED','DIGITIGRADE_BIPED','HUNCHED_BIPED','APE_LIKE_BIPED','SKELETAL_BIPED','BOSS_BIPED']);
export const VIBE_STUDIO_CREATURE_FAMILIES=Object.freeze(['HUMANOID',...VIBE_BIPED_CREATURE_FAMILIES,'QUADRUPED','INSECT','ARACHNID','REPTILE_OR_SERPENT','FLYING','HEAVY_GOLEM_OR_BOSS','AMORPHOUS_OR_TENTACLE']);
export const VIBE_CREATURE_STYLE_VARIANTS=Object.freeze(['CARTOON','ANIME_OR_CEL_SHADED','STYLIZED_FANTASY','DARK_FANTASY','LOW_POLY','REALISTIC','CHIBI','HORROR','WUXIA_FANTASY']);
export const VIBE_CARTOON_MOTION_TRANSFORMS=Object.freeze(['BODY_PROPORTION','SILHOUETTE','HEAD_HAND_FOOT_SCALE','LIMB_LENGTH','POSE_EXAGGERATION','ANTICIPATION_EXAGGERATION','OVERSHOOT_AND_SETTLE','SQUASH_STRETCH_PRESENTATION','BOUNCE_AND_SECONDARY_MOTION','FACIAL_AND_HEAD_ACTING','MATERIAL_PALETTE_OUTLINE','VFX_SHAPE_LANGUAGE','CAMERA_DISTANCE_READABILITY','TIMING_CURVE_PRESENTATION']);
export const VIBE_CREATURE_LIBRARY_GRAPH=Object.freeze(['CHARACTER_ARCHETYPE_LIBRARY','CREATURE_RIG_LIBRARY','ACTION_MOTION_LIBRARY','WEAPON_MOTION_LIBRARY','VFX_LIBRARY','ENVIRONMENT_KIT_LIBRARY','UI_PRESENTATION_LIBRARY']);
export const VIBE_STUDIO_MOTION_SOURCE_ORDER=Object.freeze(['VERIFIED_COMPANY_MOTION','LICENSE_VERIFIED_REPOSITORY_MOTION','LICENSE_VERIFIED_EXTERNAL_MOCAP_OR_ANIMATION','RETARGET_AND_CLEANUP','AUTHOR_NEW_MOTION_WHEN_REQUIRED']);
export const VIBE_STUDIO_RETARGET_CLEANUP=Object.freeze(['FOOT_PLANT_AND_FOOT_SLIDE_CONTROL','ROOT_AND_PELVIS_TRAJECTORY_CLEANUP','WEIGHT_TRANSFER','ARM_LEG_COUNTERSWING_WHEN_HUMANOID','START_STOP_ACCELERATION_DECELERATION','TURN_FOOT_PLANT_AND_BODY_FOLLOW','HAND_WEAPON_CONTACT','GROUND_AND_SLOPE_CONTACT_WHEN_SUPPORTED','LOOP_CONTINUITY','JOINT_LIMIT_AND_MESH_INTERSECTION_SANITY','IMPACT_EVENT_SYNC','UPPER_LOWER_BODY_LAYERING_WHEN_SUPPORTED','SECONDARY_MOTION_AND_PROCEDURAL_RESPONSE']);
export const VIBE_OWNER_CHANGE_REQUEST_SEQUENCE=Object.freeze([
  'READ_CURRENT_IMPLEMENTATION_AND_CURRENT_CENTRAL_POLICY',
  'RESOLVE_LATEST_EXPLICIT_OWNER_INTENT',
  'CALCULATE_AFFECTED_SCOPE',
  'MODIFY_EXISTING_RESPONSIBLE_SYSTEM',
  'REMOVE_OR_REPLACE_CONFLICTING_OLD_BEHAVIOR_IN_SAME_SCOPE',
  'PRESERVE_UNAFFECTED_BEHAVIOR',
  'REVALIDATE_CHANGED_SCOPE',
  'RUN_RELATED_REGRESSION',
  'REBIND_CURRENT_CENTRAL_POLICY_AND_EVIDENCE'
]);

export function createVibeOwnerChangeRequestStability({request='',previousRequests=[],affectedScopes=[]}={}) {
  const currentIntent=clean(request);
  const prior=unique((previousRequests||[]).map(clean).filter(Boolean));
  const scopes=unique((affectedScopes||[]).map(clean).filter(Boolean));
  return Object.freeze({
    version:1,
    currentIntent:currentIntent||null,
    previousIntentCount:prior.length,
    affectedScopes:Object.freeze(scopes),
    latestExplicitOwnerIntentWinsWithinSameScope:true,
    conflictingPriorIntentMustBeReplacedNotStacked:true,
    directResponsibleSystemModificationPreferred:true,
    preserveUnaffectedBehavior:true,
    wrapperOverrideV2FinalTemporaryPatchAccumulationForbidden:true,
    duplicateImplementationForSameResponsibilityForbidden:true,
    gameplayBalanceSaveProgressionEconomyAndHitSemanticsProtected:true,
    sequence:VIBE_OWNER_CHANGE_REQUEST_SEQUENCE,
    authority:'owner-change-request-stability'
  });
}

export function createVibeAssetAcquisitionPlan({ companyAssets = [], repositoryAssets = [], externalAssets = [], stage = 'INTERNAL_PLAYTEST' } = {}) {
  const normalizedStage = String(stage || 'INTERNAL_PLAYTEST').trim().toUpperCase();
  const rows = [
    { source: VIBE_ASSET_ACQUISITION_ORDER[0], assets: companyAssets },
    { source: VIBE_ASSET_ACQUISITION_ORDER[1], assets: repositoryAssets },
    { source: VIBE_ASSET_ACQUISITION_ORDER[2], assets: externalAssets },
  ].map((row) => ({ ...row, assets: Array.isArray(row.assets) ? row.assets.filter(Boolean) : [] }));
  const selected = rows.find((row) => row.assets.length) || null;
  const primitiveFallbackAllowed = normalizedStage === 'PROTOTYPE';
  return Object.freeze({
    version: 1,
    stage: normalizedStage,
    order: VIBE_ASSET_ACQUISITION_ORDER,
    selectedSource: selected?.source || 'CREATE_NEW_ASSET',
    candidates: Object.freeze(selected ? selected.assets.slice() : []),
    rightsVerificationRequired: selected?.source === 'LICENSE_VERIFIED_EXTERNAL_ASSET' || selected?.source === 'LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET',
    createNewAssetWhenNoVerifiedCandidate: true,
    primitiveFallbackAllowed,
    primitiveFallbackCreatesVisualDebt: true,
    primaryActorPrimitiveFallbackAllowed: primitiveFallbackAllowed,
    authority: 'asset-acquisition-plan-only',
  });
}

export function createVibeVisualDebtEntry({ id = '', role = '', reason = '', source = '', stage = 'PROTOTYPE', severity = 'high' } = {}) {
  const debtId = String(id || `visual-debt-${stableHash([role, reason, source, stage].join('|'))}`);
  return Object.freeze({
    version: 1,
    id: debtId,
    role: String(role || '').trim(),
    reason: String(reason || '').trim() || 'temporary-visual-fallback',
    source: String(source || '').trim() || 'temporary-fallback',
    stage: String(stage || 'PROTOTYPE').trim().toUpperCase(),
    severity: String(severity || 'high').trim().toLowerCase(),
    status: 'OPEN',
    automaticCompletionForbidden: true,
    requiresRuntimeVisualReplacementOrExplicitApproval: true,
    authority: 'visual-debt-record',
  });
}

function clean(value) { return String(value ?? '').trim(); }
function has(value, words) { const text = clean(value).toLowerCase(); return words.some((word) => text.includes(String(word).toLowerCase())); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function stableHash(value='') { let h=2166136261; for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function classifyLicense(license = '') {
  const value = clean(license).toLowerCase().replace(/_/g, '-');
  const ownedOriginal = /^(project-original|company-owned|owned-original|created-in-project)$/.test(value);
  const noDerivatives = /cc[- ]?by(?:-[a-z]+)*-nd\b|no[- ]?derivatives/.test(value);
  const cc0 = /\bcc0\b|creative commons zero|public domain/.test(value);
  const ccBy = /\bcc[- ]?by\b/.test(value) && !noDerivatives;
  const shareAlike = ccBy && /\bsa\b|share[- ]?alike/.test(value);
  const nonCommercial = ccBy && /\bnc\b|non[- ]?commercial/.test(value);
  return Object.freeze({ ownedOriginal, recognizedContentLicense: ownedOriginal || cc0 || ccBy || noDerivatives, derivativesAllowedByLicense: ownedOriginal || ((cc0 || ccBy) && !noDerivatives), attributionRequired: ccBy, shareAlikeRequired: shareAlike, commercialUseAllowed: ownedOriginal || !nonCommercial, noDerivatives });
}

function level(request, words) {
  if (!has(request, words)) return 0;
  if (has(request, ['최고', '최상', '시네마틱', 'AAA', '고도', '고급', '전면', '완전히', '리메이크'])) return 3;
  if (has(request, ['고퀄', '퀄리티', '디테일', '자연스럽게', '강화'])) return 2;
  return 1;
}

export function createVibeAssetReconstructionContract({ asset = {}, requestedTransforms = ASSET_TRANSFORMS, derivativePurpose = 'game-art-reconstruction' } = {}) {
  const license = clean(asset.license);
  const source = clean(asset.source);
  const explicit = asset.derivativesAllowed;
  const rights = classifyLicense(license);
  const derivativesAllowed = explicit === true || (explicit !== false && rights.derivativesAllowedByLicense);
  const transforms = unique((requestedTransforms || []).filter((item) => ASSET_TRANSFORMS.includes(item)));
  const attributionRequired = asset.attributionRequired === true || rights.attributionRequired;
  const redistributionAllowed = asset.redistributionAllowed === true || rights.ownedOriginal || (asset.redistributionAllowed !== false && rights.recognizedContentLicense && !rights.noDerivatives);
  const commercialUseAllowed = asset.commercialUseAllowed === true || rights.ownedOriginal || (asset.commercialUseAllowed !== false && rights.commercialUseAllowed && rights.recognizedContentLicense);
  const blockedReason = derivativesAllowed ? null : (!license && explicit !== false ? 'license-missing' : explicit === false || rights.noDerivatives ? 'derivatives-explicitly-forbidden' : 'derivative-permission-unverified');
  return Object.freeze({
    version: 3,
    assetId: clean(asset.id || asset.name || asset.path),
    source,
    license,
    ownedOriginal: rights.ownedOriginal,
    derivativePurpose,
    derivativesAllowed,
    attributionRequired,
    redistributionAllowed,
    commercialUseAllowed,
    shareAlikeRequired: rights.shareAlikeRequired,
    requestedTransforms: Object.freeze(transforms),
    allowedTransforms: Object.freeze(derivativesAllowed ? transforms : []),
    blockedReason,
    reconstruction: Object.freeze({ decompose: derivativesAllowed, recombine: derivativesAllowed, silhouetteRedesign: derivativesAllowed, variantGeneration: derivativesAllowed, animationPreparation: derivativesAllowed, artBibleNormalization: derivativesAllowed, mobileOptimization: derivativesAllowed }),
    provenance: Object.freeze({ preserveOriginalSource: true, preserveOriginalLicense: true, recordTransformHistory: true, recordDerivedAssetParent: true, originalOverwriteForbidden: true }),
    policy: Object.freeze({ licenseBeforeTransform: true, explicitRightsOverride: true, preserveSourceMetadata: true, preserveAttribution: attributionRequired, preserveShareAlike: rights.shareAlikeRequired, noUnverifiedDerivativeUse: true, noGameplayMutation: true, noSaveMutation: true, originalAssetImmutable:true }),
    authority: 'asset-transformation-gate',
  });
}

function derivedPathFor(asset, profileId, index) {
  const sourcePath = clean(asset.path || asset.id || asset.name || 'asset');
  const slash = sourcePath.lastIndexOf('/');
  const dir = slash >= 0 ? sourcePath.slice(0, slash) : 'assets';
  const file = slash >= 0 ? sourcePath.slice(slash + 1) : sourcePath;
  const dot = file.lastIndexOf('.');
  const base = dot > 0 ? file.slice(0, dot) : file;
  const ext = dot > 0 ? file.slice(dot) : '';
  return `${dir}/derived/${base}--v3-${profileId}-${index + 1}${ext}`;
}

export function createVibeAssetVariantPlan({ asset = {}, requestedTransforms = ASSET_TRANSFORMS, variantCount = 3 } = {}) {
  const rights = createVibeAssetReconstructionContract({asset,requestedTransforms,derivativePurpose:'vibe3-non-destructive-variant-tournament'});
  const count = Math.max(2, Math.min(6, Math.floor(Number(variantCount) || 3)));
  if (!rights.derivativesAllowed) return Object.freeze({version:1,ready:false,rights,variants:Object.freeze([]),blockedReason:rights.blockedReason,authority:'vibe3-asset-variant-plan'});
  const allowed = new Set(rights.allowedTransforms);
  const variants = Array.from({length:count},(_,index)=>{
    const profile=V3_VARIANT_PROFILES[index%V3_VARIANT_PROFILES.length];
    let transforms=profile.transforms.filter(item=>allowed.has(item));
    if(!transforms.length)transforms=rights.allowedTransforms.slice(0,Math.max(1,Math.min(4,rights.allowedTransforms.length)));
    const id=`${profile.id}-${index+1}-${stableHash(`${rights.assetId}|${profile.id}|${index}`)}`;
    return Object.freeze({
      id,
      parentAssetId:rights.assetId,
      profile:profile.id,
      transforms:Object.freeze(transforms),
      outputPath:derivedPathFor(asset,profile.id,index),
      sourceOverwrite:false,
      provenanceRequired:true,
      attributionRequired:rights.attributionRequired,
      shareAlikeRequired:rights.shareAlikeRequired,
      authority:'asset-variant-candidate-only',
    });
  });
  return Object.freeze({version:1,ready:true,rights,variantCount:count,variants:Object.freeze(variants),originalImmutable:true,authority:'vibe3-asset-variant-plan'});
}

export function evaluateVibeAssetVariant(variant={},metrics={}) {
  const blocked=[];
  if(variant.sourceOverwrite!==false)blocked.push('original-overwrite-forbidden');
  if(variant.provenanceRequired!==true)blocked.push('provenance-required');
  if(metrics.provenanceRecorded!==true)blocked.push('provenance-not-recorded');
  if(metrics.referenceIntegrity!==true)blocked.push('reference-integrity-failed');
  if(metrics.mobilePerformancePass!==true)blocked.push('mobile-performance-failed');
  const style=clamp01(metrics.styleConsistency);
  const silhouette=clamp01(metrics.silhouetteReadability);
  const quality=clamp01(metrics.visualQuality);
  const animation=clamp01(metrics.animationReadiness??0.5);
  const performance=clamp01(metrics.performanceScore??(metrics.mobilePerformancePass?1:0));
  const score=style*0.28+silhouette*0.24+quality*0.24+animation*0.10+performance*0.14;
  return Object.freeze({id:clean(variant.id),eligible:blocked.length===0,score:Number(score.toFixed(6)),blockedReasons:Object.freeze(blocked),metrics:Object.freeze({styleConsistency:style,silhouetteReadability:silhouette,visualQuality:quality,animationReadiness:animation,performanceScore:performance}),outputPath:clean(variant.outputPath),authority:'deterministic-art-variant-evaluation'});
}

export function selectVibeAssetVariant({plan,results=[],minScore=0.72}={}) {
  if(!plan?.ready)return Object.freeze({version:1,ready:false,winner:null,evaluations:Object.freeze([]),blockedReasons:Object.freeze([plan?.blockedReason||'variant-plan-not-ready']),authority:'deterministic-art-variant-tournament'});
  const byId=new Map((results||[]).map(item=>[clean(item?.id||item?.variantId),item]));
  const evaluations=plan.variants.map(variant=>evaluateVibeAssetVariant(variant,byId.get(variant.id)||{})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const winner=evaluations.find(item=>item.eligible&&item.score>=clamp01(minScore))||null;
  const blocked=[];
  if(results.length<plan.variantCount)blocked.push('all-variants-must-be-observed');
  if(!winner)blocked.push('no-verified-art-winner');
  return Object.freeze({version:1,ready:blocked.length===0&&Boolean(winner),winner,evaluations:Object.freeze(evaluations),blockedReasons:Object.freeze(blocked),selectionRule:'rights-first-then-style-silhouette-quality-animation-performance',originalImmutable:true,authority:'deterministic-art-variant-tournament'});
}

export function createVibeArtPipeline({ request = '', target = 'auto', style = null, quality = 'auto' } = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('art pipeline request required');
  const artLevel = quality === 'auto' ? level(prompt, QUALITY_WORDS.art) : Number(quality) || 1;
  const animationLevel = quality === 'auto' ? level(prompt, QUALITY_WORDS.animation) : Number(quality) || 1;
  const vfxLevel = quality === 'auto' ? level(prompt, QUALITY_WORDS.vfx) : Number(quality) || 1;
  const audioLevel = quality === 'auto' ? level(prompt, QUALITY_WORDS.audio) : Number(quality) || 1;
  const needsArt = artLevel > 0 || animationLevel > 0 || vfxLevel > 0;
  const states = ['idle', 'move', 'attack', 'hit', 'skill', 'death'];
  const layers = ['캐릭터 실루엣','본체/장비 파츠','그림자','방향 전환','애니메이션 상태','피격/공격 판정 연결','VFX 레이어','UI 피드백'];
  const steps = [];
  if (needsArt) steps.push('개발 에이전트가 현재 화면·에셋·Game DNA를 분석하고 부족한 표현을 능동적으로 식별');
  if (needsArt) steps.push('현재 에셋과 스타일을 분석하고 Art Bible·Style Lock·Material/Environment/Animation/VFX/Lighting/UI 언어를 포함한 목표 비주얼 프로필 확정');
  if (needsArt) steps.push('장면별 감정·위험도·플레이어 시선 목표·세계 맥락·게임플레이 가독성을 먼저 정의하고 카메라·조명·재질·환경·사운드를 같은 의도로 정렬');
  if (needsArt) steps.push('7개 Visual Target Frame 역할을 잠그고 실제 런타임 비교 기준으로 사용');
  if (needsArt) steps.push('플레이어·주 보스/적·시그니처 무기·핵심 랜드마크·시작지역을 Hero Quality 기준점으로 우선 완성');
  if (needsArt) steps.push('원본 에셋 라이선스와 파생저작물 허용 여부를 변형 전에 검사');
  if (needsArt) steps.push('허용 에셋은 원본을 보존한 채 V3 변형 후보를 최소 3개 독립 생성하고 각각 별도 derived 경로에 저장');
  if (needsArt) steps.push('변형 후보를 스타일 일관성·실루엣 가독성·시각 품질·애니메이션 준비도·모바일 성능으로 실제 화면 비교 후 1개만 채택');
  if (needsArt) steps.push('모든 Unity/Roblox 네이티브 게임은 회사 라이브러리를 먼저 조회하고, 같은 게임/회사 검증 자산 → 라이선스 검증 기존 저장소 → 라이선스 검증 외부 에셋·모션 → 리타겟/클린업 → 신규 제작 순서로 부족한 부분을 채운다');
  if (needsArt) steps.push('외부 에셋·모션은 다운로드만으로 회사 자산이 되지 않는다. 출처·라이선스·변형 이력을 보존하고 플랫폼 네이티브 적용과 실제 런타임·모바일 QA를 통과한 뒤에만 승격한다');
  if (needsArt) steps.push('Studio Asset Universe에서 CHARACTER/CREATURE/BUILDING/ENVIRONMENT/WEAPON/SKILL/MATERIAL/AUDIO/VFX/UI/MOTION/PROP 전체 Coverage를 스캔하고 실제 게임 수요·Style Lock·플랫폼 기준의 최대 gap부터 채운다');
  if (needsArt) steps.push('모든 Vibe 네이티브 업그레이드는 12개 에셋 계열을 전부 평가하고, 기존 게임에 존재하는 계열은 실제 책임 소스에 APPLIED로 바인딩한다. 배경·지형·건물·마을·학교·상점·랜드마크·소품은 ENVIRONMENT/BUILDING/PROP 실제 에셋 사용을 요구하며 마커/색상/단일 primitive만으로 완료 처리하지 않는다');
  if (needsArt) steps.push('몬스터는 30+ Body Plan/50+ Species 체계에서 silhouette/locomotion/attack/signature/audio/hit-death identity를 검증하고 색상만 바꾼 변종은 별도 종으로 세지 않는다');
  if (needsArt) steps.push('의복/갑옷은 15개 layer slot과 테마 문법·체형/리그 호환·clipping을 검사하고 충돌 시 alternate variant를 선택하거나 조합을 차단한다');
  if (needsArt) steps.push('건물/실내는 Foundation→Wall→Door/Window→Upper Floor→Roof→Decoration→Interior→Navigation QA 문법과 player/NPC 동선·collision을 검증한다');
  if (needsArt) steps.push('환경은 Biome DNA와 Prop Density Director를 사용해 terrain/vegetation/water/fog/sky/lighting/landmark/ambience/creature/architecture preference를 같은 지역 언어로 연결한다');
  if (needsArt) steps.push('무기-모션, 스킬 Cast→VFX→Projectile/Impact→Audio→Camera→Reaction, 재질·오디오 variation·damage/destruction presentation을 Cross-Asset Compatibility Graph로 연결한다');
  if (needsArt) steps.push('Universal Gap Fill은 검증 회사 자산→저장소→안전 파생→라이선스 검증 외부→PREPARED_SEMANTIC→신규 네이티브 제작 순서를 따르며 semantic seed는 실게임 runtime PASS 전 VERIFIED로 취급하지 않는다');
  if (artLevel) steps.push(`${artLevel >= 3 ? '고품질' : artLevel === 2 ? '상세' : '기본'} 캐릭터·적·보스·배경 에셋 구성`);
  if (artLevel >= 2) steps.push('허용 에셋을 분해하고 크롭/스케일/회전/색/명암/재질/실루엣을 재가공');
  if (artLevel >= 2) steps.push('분리 파츠를 재조합하고 지역종·변이종·보스 파생 디자인을 구성');
  if (artLevel >= 2) steps.push('Art Bible 기준으로 서로 다른 원본의 색·형태·재질·조명을 통일하고 raw asset-pack/kitbash 느낌을 제거');
  if (artLevel >= 2) steps.push('배경을 전경/중경/후경으로 구성하고 지역 랜드마크·set dressing·환경 스토리텔링·이동/전투 가독성을 확보');
  if (needsArt) steps.push('최종 게임플레이 공간은 최소 2.5D로 구성한다. 평면 2D 단독 월드·이모지 그리드·카드형 화면은 prototype 외 최종 표현으로 사용하지 않고, 등각/원근 카메라·깊이 정렬·전경/중경/후경 parallax·높이/그림자·깊이 대응 VFX 중 실제 공간 단서를 결합한다. UI 오버레이만 2D를 허용한다.');
  if (animationLevel) steps.push(`분리 파츠 기반 ${states.join('/')} 애니메이션 구성`);
  if (animationLevel) steps.push('공격 시작/명중/종료 타이밍을 실제 판정과 동기화');
  if (animationLevel) steps.push('PRIMARY_MOTION + SECONDARY_MOTION + PROCEDURAL_RESPONSE를 겹쳐 가감속·회전보간·체중이동·상태 블렌딩·시선/피격 방향 반응을 캐릭터와 종별로 차별화');
  if (animationLevel || needsArt) steps.push('사람형은 Idle/Walk/Jog/Run/Sprint/Start/Stop/Strafe/Backward/45·90·180도 Turn/Jump/Land/Crouch를 스튜디오 기본 이동 세트로 구축하고 약·강공격/가드/회피/방향 피격/넉백/스턴/다운/기상/사망을 전투 기본 세트로 연결');
  if (animationLevel || needsArt) steps.push('맨손 전투는 복싱·킥복싱·무에타이·가라테·태권도·산타·우슈/쿵푸·그래플링·MMA·무협 판타지까지 스타일군을 계속 연구하고, 가드/보법/주먹/팔꿈치/무릎/킥/방어/카운터/잡기/던지기/낙법/다운/기상/공중연계/피니셔 모션을 대전 액션용으로 확장한다');
  if (animationLevel || needsArt) steps.push('맨손 대전 모션은 STARTUP/CONTACT/RECOVERY/COUNTER/LAUNCH/AIR/WALL/KNOCKDOWN/TECH/THROW/PARRY/REVERSAL/FINISHER 역할 메타데이터를 제공하되 데미지·히트박스·쿨다운·콤보 규칙 자체는 게임 로직이 소유한다');
  if (animationLevel || needsArt) steps.push('2인 잡기/던지기는 공격자와 피격자 리그 위치·접촉·낙법을 쌍으로 맞추고 Unity/Roblox 각각에서 재리타겟·런타임 검증한다');
  if (animationLevel || needsArt) steps.push('무협 맨손은 장법·지법·조법·보법·회전회피·공중장법·대시타격·런처·공중추격을 판타지 표현층으로 연구하되 실제 게임 판정 의미는 바꾸지 않는다');
  if (animationLevel || needsArt) steps.push('모션 원본이 외부 모캡/애니메이션이면 발접지·발미끄러짐·루트/골반 궤적·체중 이동·회전 발디딤·손/무기 접촉·루프·관절/메시·타격 이벤트를 클린업한 뒤 사용');
  if (animationLevel || needsArt) steps.push('네발·곤충·뱀/파충·비행·골렘/거대 보스는 실제 신체구조와 종별 움직임을 연구해 별도 이동/회전/공격/피격/사망 언어를 만들며 비휴머노이드에 사람 모션을 단순 재사용하지 않는다');
  if (animationLevel || needsArt) steps.push('고블린·오크·미노타우로스·오우거·트롤·늑대인간·구울·골격형 등 두발 몬스터는 리그 공유 가능 여부와 별개로 SMALL/STANDARD/HEAVY/DIGITIGRADE/HUNCHED/APE_LIKE/SKELETAL/BOSS 체형군을 분리하고 체중·보폭·회전·공격·피격·사망 모션 정체성을 따로 연구한다');
  if (animationLevel || needsArt) steps.push('카툰/셀셰이딩/다크판타지/로우폴리/리얼리스틱/치비 등 게임 Style Lock에 맞춰 같은 검증 리그·모션 의미를 비율·실루엣·키포즈·anticipation·overshoot·squash/stretch·반동·표정·VFX 언어로 파생 변형할 수 있다');
  if (animationLevel || needsArt) steps.push('스타일 변형은 이동속도·히트박스·데미지·쿨다운·멀티플레이 의미를 바꾸지 않고 authoritative root movement envelope와 contact marker 동기화를 보존한다');
  if (animationLevel || needsArt) steps.push('Creature Archetype→Rig→Locomotion→Combat→Hit/Death→VFX→Environment→Style Variant→Unity/Roblox 네이티브 변형을 라이브러리 ID 참조로 연동한다');
  if (vfxLevel) steps.push(`${vfxLevel >= 3 ? '고급' : vfxLevel === 2 ? '상세' : '기본'} 히트·폭발·스킬·사망 VFX 구성`);
  if (vfxLevel) steps.push('게임 고유 VFX 언어를 유지하고 ambient/normal/heavy/critical-signature/boss-ultimate 강도 계층을 분리');
  if (audioLevel) steps.push('BGM과 전투/UI 효과음의 이벤트 연결');
  if (audioLevel) steps.push('audio 부서가 제작·선정한 음악을 탐험/긴장/전투/위기/보스/승리/휴식/특수 이벤트 상태와 컨셉에 맞게 바인딩');
  steps.push('모바일 해상도에서 실루엣 가독성·디테일·성능을 확인하고 필요 시 표현만 단순화');
  steps.push('에셋 라이선스·출처·귀속·경로·참조 무결성 검사');
  steps.push('실제 게임 화면에서 시각 품질·모션 가독성·VFX 과밀도를 비교하고 부족하면 표현 계층만 재수정');
  steps.push('GRAPHICS_PASS는 현재 표현 범위의 검증 체크포인트로만 기록하고 내부/공개 출시 뒤에도 다음 증거와 사용자 수정요청에 따라 계속 발전');
  const godot = target === 'godot' || /godot|고도|\.gd|씬/i.test(prompt);
  const web = target === 'web' || /웹|브라우저|html|javascript/i.test(prompt);
  const implementation = godot ? ['Node3D/CharacterBody3D','MeshInstance3D 또는 적절한 2.5D Billboard/Quad','AnimationTree/AnimationPlayer','GPUParticles3D','AudioStreamPlayer3D'] : web ? ['WebGL/Three/Babylon 또는 Canvas 2.5D 등각·원근 렌더러','깊이 정렬 캐릭터/월드 레이어','전경·중경·후경 parallax','접지 그림자·높이·깊이 대응 VFX','Web Audio API','2D UI 오버레이'] : ['플랫폼 네이티브 3D/2.5D 월드 렌더러','리그/애니메이터','깊이 대응 VFX·조명·카메라','2D UI 오버레이','오디오 이벤트'];
  return Object.freeze({
    version: 12,
    generation:'V3',
    target: godot ? 'godot' : web ? 'web' : target,
    quality: Object.freeze({ art: artLevel, animation: animationLevel, vfx: vfxLevel, audio: audioLevel }),
    style: style || '프로젝트 기존 스타일 분석 후 일관된 스타일로 확정',
    assetAcquisition: Object.freeze({ order: VIBE_ASSET_ACQUISITION_ORDER, preferVerifiedCompanyAssets:true, companyLibraryLookupRequiredForNative:true, existingRepositoryBeforeExternal:true, externalGapFillBeforeNewAuthoring:true, rightsVerifiedRepositoryOrExternalBeforeUse:true, externalMotionIsInputMaterialUntilRuntimeVerified:true, reconstructWhenRightsAllow:true, createWhenNoVerifiedCandidate:true, primitiveFallbackPrototypeOnly:true, fallbackCreatesVisualDebt:true }),
    minimumSpatialPresentation: Object.freeze({ required:needsArt, minimumFinalGameplayDimension:'2.5D', preferred:'3D', flat2DFinalGameplayForbidden:true, ui2DOverlayAllowed:true, acceptedTechniques:Object.freeze(['ISOMETRIC_OR_OBLIQUE_PROJECTION','PERSPECTIVE_OR_ORTHOGRAPHIC_DEPTH_CAMERA','FOREGROUND_MIDGROUND_BACKGROUND_PARALLAX','DEPTH_SORTED_WORLD_ENTITIES','HEIGHT_OR_VERTICALITY','DIRECTIONAL_LIGHT_AND_CONTACT_SHADOWS','DEPTH_AWARE_VFX','CAMERA_PAN_ZOOM_ORBIT_WITH_WORLD_DEPTH']), actualRuntimeEvidenceRequired:true, markerOnlyPassForbidden:true, existing2DAction:'SPATIAL_PRESENTATION_REBUILD_REQUIRED' }),
    runtimeVisualAcceptance: Object.freeze({ required:needsArt, goldenSceneRoles:VIBE_GOLDEN_SCENE_ROLES, highEndTargetFrameRoles:VIBE_HIGH_END_TARGET_FRAME_ROLES, actualRuntimeCaptureRequired:needsArt, compareAgainstLastPassingPresentation:true, beforeAfterVisualRegressionRequired:true, markerOnlyPassForbidden:true, primaryActorPrimitivePlaceholderForbiddenAfterPrototype:true, environmentCoverageRequired:true, platformPerformanceEvidenceRequired:true, graphicsCheckpointOnly:true, graphicsPassIsTerminal:false, releaseAuthority:false }),
    highEndVisual: Object.freeze({
      required:needsArt,
      target:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',
      artBibleRequired:true,
      styleLockRequired:true,
      targetFrames:VIBE_HIGH_END_TARGET_FRAME_ROLES,
      heroQualityTargets:Object.freeze(['PLAYER_CHARACTER','PRIMARY_BOSS','PRIMARY_ENEMY','SIGNATURE_WEAPON_OR_TOOL','KEY_LANDMARK','STARTING_HUB_OR_FIRST_REGION']),
      purposefulAssetDefault:true,
      environmentAndBackgroundFirstClass:true,
      worldLayers:Object.freeze(['FOREGROUND','MIDGROUND','BACKGROUND']),
      landmarkPerMajorRegionRequired:true,
      setDressingRequired:true,
      antiKitbashGateRequired:true,
      platformSpecificReauthoringExpected:true,
      primitiveFallbackPrototypeOnly:true,
      cinematicDirectionAxes:VIBE_CINEMATIC_DIRECTION_AXES,
      continuousEvolution:true,
      continuesAfterInternalRelease:true,
      continuesAfterPublicRelease:true,
      presentationCompletionIsTerminal:false
    }),
    art: Object.freeze({ required: needsArt, layers: Object.freeze(layers), replaceableAssets: true, silhouetteRequired: true, reconstructionSupported: true, transforms: ASSET_TRANSFORMS, derivativeGateRequired: true, artBibleNormalization: true, variantGeneration: true, selfTransformExistingAssets:true, nonDestructiveVariants:true, variantTournament:true, defaultVariantCount:3, originalOverwriteForbidden:true }),
    studioAssetUniverse:createStudioAssetUniversePlan({
      assets:[],
      repositoryAssets:[],
      externalSources:[],
      platform:target==='roblox'?'ROBLOX':target==='unity'?'UNITY':'UNITY',
      styleFamily:style||'STYLIZED_FANTASY'
    }),
    studioAssetUniverseContract:Object.freeze({
      target:STUDIO_ASSET_UNIVERSE_TARGET,
      families:STUDIO_ASSET_FAMILIES,
      creatureBodyPlans:CREATURE_BODY_PLANS,
      creatureSpecies:CREATURE_SPECIES,
      clothingLayerSlots:CLOTHING_LAYER_SLOTS,
      biomes:BIOME_FAMILIES,
      buildingThemes:BUILDING_THEMES,
      phases:Object.freeze(['STUDIO_ASSET_UNIVERSE_FOUNDATION','AUTONOMOUS_LIBRARY_POPULATION_24H']),
      universalCoverageScanner:true,
      crossAssetCompatibilityGraph:true,
      assetIdentityQa:true,
      styleBibleGenerator:true,
      libraryHeatmap:true,
      autonomousGapFill24h:true,
      preparedSemanticMayNotClaimVerified:true,
      gameplayAuthority:false
    }),
    animation: Object.freeze({
      required: animationLevel > 0 || needsArt,
      target:'STUDIO_GRADE_GAME_MOTION',
      states:Object.freeze(states),
      partSeparated:animationLevel >= 2,
      motionSyncRequired:true,
      motionLayers:VIBE_MOTION_LAYERS,
      motionSourceOrder:VIBE_STUDIO_MOTION_SOURCE_ORDER,
      humanoidLocomotion:VIBE_STUDIO_HUMANOID_LOCOMOTION,
      humanoidCombat:VIBE_STUDIO_HUMANOID_COMBAT,
      unarmedCombat:Object.freeze({
        target:'VERSUS_ACTION_READY_STUDIO_GRADE_UNARMED_COMBAT',
        noArtificialStyleOrMotionCap:true,
        styleFamilies:VIBE_UNARMED_STYLE_FAMILIES,
        stanceAndGuard:VIBE_UNARMED_STANCE_GUARD,
        footwork:VIBE_UNARMED_FOOTWORK,
        strikes:VIBE_UNARMED_STRIKES,
        kicks:VIBE_UNARMED_KICKS,
        defenseAndCounter:VIBE_UNARMED_DEFENSE_COUNTER,
        grappleAndThrow:VIBE_UNARMED_GRAPPLE_THROW,
        recovery:VIBE_UNARMED_RECOVERY,
        wuxiaFantasy:VIBE_UNARMED_WUXIA,
        versusActionSlots:VIBE_UNARMED_VERSUS_ACTION,
        comboRoles:VIBE_UNARMED_COMBO_ROLES,
        motionMetadata:VIBE_UNARMED_MOTION_METADATA,
        pairedActorAlignmentRequiredForThrows:true,
        animationTimingMarkersMayNotOwnGameplayRules:true
      }),
      creatureFamilies:VIBE_STUDIO_CREATURE_FAMILIES,
      bipedCreature:Object.freeze({
        target:'BODY_PLAN_SPECIFIC_BIPED_CREATURE_MOTION',
        families:VIBE_BIPED_CREATURE_FAMILIES,
        sharedRigDoesNotImplySharedMotionIdentity:true,
        speedScaleOnlyVariationForbidden:true,
        humanWalkWithOnlyScaleChangeForbidden:true,
        goblin:Object.freeze({family:'SMALL_HUMANOID_BIPED',traits:Object.freeze(['LOW_CENTER_OF_MASS','SHORT_STRIDE','FAST_PIVOT','QUICK_RECOVERY']),signatureMotionCandidates:Object.freeze(['SCAMPER_RUN','QUICK_SLASH','CLUB_SWING','SIDESTEP_EVADE','PANIC_BACKSTEP','FAST_FALL_DEATH'])}),
        minotaur:Object.freeze({family:'HEAVY_BIPED',traits:Object.freeze(['HEAD_AND_HORN_MASS','CHARGE_LEAN','BRAKING_INERTIA','HORN_ATTACK_NECK_SPINE_PELVIS_CHAIN','HEAVY_COLLAPSE_DEATH']),signatureMotionCandidates:Object.freeze(['HORN_CHARGE','HORN_GORE','SHOULDER_RAM','HEAVY_STOMP','RAGE_SNORT','WALL_IMPACT_RECOVERY'])})
      }),
      styleVariants:Object.freeze({
        target:'STYLE_LOCK_AWARE_ASSET_AND_MOTION_DERIVATION',
        styles:VIBE_CREATURE_STYLE_VARIANTS,
        cartoonTransforms:VIBE_CARTOON_MOTION_TRANSFORMS,
        libraryGraph:VIBE_CREATURE_LIBRARY_GRAPH,
        styleLockAlwaysWins:true,
        sameSourceMayHaveMultipleStyleVariants:true,
        originalImmutableAndDerivedProvenanceRequired:true,
        gameplayAuthorityImmutable:true,
        rootMotionMustRespectAuthoritativeMovementEnvelope:true,
        contactMarkersMustRemainSynchronized:true,
        runtimeVerificationRequiredPerGameAndPlatform:true
      }),
      motionDirector:createMotionDirectorPlan({
        platform:target==='roblox'?'ROBLOX':target==='unity'?'UNITY':'UNITY',
        bodyPlan:'HUMANOID',
        rigProfile:'HUMANOID',
        styleFamily:style||'STYLIZED_FANTASY',
        motionCandidates:[],
        context:{styleFamily:style||'STYLIZED_FANTASY'},
        layers:{},
        skill:{}
      }),
      motionDirectorContract:Object.freeze({
        target:'HIGH_END_COMPOSABLE_MOTION_DIRECTOR',
        compositionChannels:MOTION_COMPOSITION_CHANNELS,
        motionDNAFields:MOTION_DNA_FIELDS,
        grammars:MOTION_GRAMMARS,
        libraryGraphNodes:MOTION_LIBRARY_GRAPH_NODES,
        continuousExpansion:true,
        noArtificialCombinationCap:true,
        gameplayAuthority:false
      }),
      retargetCleanup:VIBE_STUDIO_RETARGET_CLEANUP,
      characterAndCreatureActing:true,
      speciesReferenceStudyRequired:true,
      blindHumanoidMotionReuseForNonHumanoidForbidden:true,
      platformNativeRetargetAndRuntimeEvidenceRequired:true,
      accelerationDeceleration:true,
      turnInterpolation:true,
      stateBlend:true,
      weightTransfer:true,
      directionalHitResponse:true,
      nonMechanicalIdleVariation:true
    }),
    vfx: Object.freeze({ required: vfxLevel > 0 || animationLevel >= 2, hit: true, skill: true, death: true, screenFeedback: true, gameSpecificLanguage:true, intensityHierarchy:Object.freeze(['AMBIENT','NORMAL','HEAVY','CRITICAL_OR_SIGNATURE','BOSS_OR_ULTIMATE']), gameplayReadabilityFirst:true, mobileDensityScaling:true }),
    audio: Object.freeze({ required: audioLevel > 0, bgm: audioLevel >= 2, sfx: true, eventDriven: true, mobileSafe: true, authoringOwner:'audio', conceptFit:true, stateAdaptive:true, states:Object.freeze(['EXPLORATION','DISCOVERY_OR_TENSION','COMBAT','DANGER','BOSS','VICTORY','REST_OR_HUB','SPECIAL_EVENT']) }),
    agentRole: Object.freeze({ mode:'active-art-direction-v3', universalAssetFirstUpgrade:true, allTwelveAssetFamiliesEvaluated:true, applicableFamilyActualBindingRequired:true, mapEnvironmentBuildingPropAssetUseRequired:true, inspectWithoutPrompting:true, identifyMissingAssets:true, chooseReuseReconstructOrCreate:true, preferVerifiedCompanyAssetLibrary:true, requireCompanyLibraryLookupForNative:true, fillLibraryGapsFromLicenseVerifiedExternalSources:true, externalGapFillBeforeNewAuthoring:true, followAssetAcquisitionOrder:true, createVisualDebtForFallback:true, requireGoldenSceneRuntimeEvidence:true, selfTransformExistingAssets:true, generateIndependentVariants:true, compareVariantsInActualPresentation:true, keepOriginalImmutable:true, prepareAnimationParts:true, studioMotionRetargetCleanup:true, unarmedVersusActionResearch:true, unarmedMartialArtsStyleResearch:true, wuxiaUnarmedMotionResearch:true, pairedGrappleThrowResearch:true, speciesMotionResearch:true, bipedCreatureMotionResearch:true, styleVariantDerivation:true, creatureLibraryGraphInterlink:true, motionDirectorComposition:true, contextMotionSelection:true, reactionMotionMatching:true, pairMotionAlignment:true, motionMutationAndVariationMemory:true, studioAssetUniverse:true, universalAssetCoverageScanner:true, crossAssetCompatibilityGraph:true, assetIdentityQa:true, styleBibleGenerator:true, autonomousLibraryPopulation24h:true, connectAnimationAndVfx:true, compareActualPresentation:true, iteratePresentationDefects:true, resolveLatestOwnerIntentBeforeMutation:true, affectedScopeOnly:true, replaceConflictingSameScopeBehavior:true, preserveUnaffectedBehavior:true, gameplayAuthority:false, saveAuthority:false }),
    implementation: Object.freeze(implementation),
    steps: Object.freeze(unique(steps)),
    qa: Object.freeze(['최종 게임플레이 최소 2.5D 공간 표현/실제 깊이 단서','회사 라이브러리 우선 조회/기존 저장소→외부 검증→신규 제작 순서','사람형 Studio Locomotion 기본 세트','맨손 대전 액션: 가드/보법/타격/킥/카운터/잡기/던지기/낙법/기상/공중연계','무협 맨손 장법/지법/조법/보법/공중연계','2인 잡기/던지기 리그 정렬','종별 몹 모션 연구','두발 몹 체형별 모션: 고블린/미노타우로스 등 리그 공유와 모션 정체성 분리','카툰/셀셰이딩/다크판타지/로우폴리/리얼리스틱 Style Variant','Creature→Rig→Motion→VFX→Environment→Style→Platform 라이브러리 연동','Motion DNA/Compatibility Graph/Body Layer Composer','Context Selector/Reaction Matcher/Pair Motion/Variation Memory','Skill Grammar/모션 Mutation/Species Signature','Studio Asset Universe: 캐릭터/의복/갑옷/몬스터/건물/실내/바이옴/무기/스킬/재질/오디오/VFX/UI/모션/소품','Universal Coverage Scanner/Asset Identity QA/Cross-Asset Compatibility/Style Bible/Library Heatmap/24H Gap Fill','의복 레이어 클리핑/테마 문법·건물 모듈/실내/동선 문법·Biome DNA/Prop Density','몬스터 30+ Body Plan/50+ Species/Mutation/Signature Identity','발접지/발미끄러짐/루트·골반/체중이동','출발/정지/회전 발디딤','손/무기 접촉과 타격 이벤트 동기화','비휴머노이드 사람 모션 단순 재사용 금지','Art Bible/Style Lock/Visual Target Frame 바인딩','Hero Quality 대상 완성도','안티-kitbash 스타일 통일','전경/중경/배경 환경 구성','랜드마크/set dressing/환경 스토리텔링','에셋 경로/라이선스/파생 허용','원본 불변/derived 경로 분리','변형 이력/부모 에셋 provenance','출처/귀속 메타데이터 보존','스타일 일관성','실루엣 식별성','파츠 분해/재조합 무결성','스프라이트/프레임 정상 로드','애니메이션 상태 전환','모션-판정 동기화','VFX 생명주기/중복 생성','오디오 이벤트 중복/누락','모바일 터치와 UI 겹침','실제 화면 표현 비교','Golden Scene 5종 런타임 캡처','주요 캐릭터/몹 primitive placeholder 제거','Visual Debt 해소','성능/메모리']),
    policy: Object.freeze({ preserveGameplay: true, preserveSave: true, directEditPreferred: true, universalAssetFirstUpgradeRequired:true, allTwelveAssetFamiliesEvaluated:true, applicableFamilyActualBindingRequired:true, assetMarkerOnlyPassForbidden:true, primitiveOnlyVisualUpgradeForbidden:true, mapEnvironmentBuildingPropAssetUseRequired:true, companyLibraryRequiredForUnityRoblox:true, companyLibraryLookupBeforeAssetChoice:true, existingRepositoryBeforeExternalGapFill:true, externalGapFillBeforeNewAuthoring:true, externalMotionRequiresRetargetCleanup:true, studioGradeMotionRequired:true, unarmedVersusActionMotionRequired:true, unarmedStyleResearchNoArtificialCap:true, wuxiaUnarmedMotionResearch:true, animationTimingMarkersCannotOwnGameplayRules:true, speciesMotionStudyRequired:true, bipedCreatureBodyPlanMotionRequired:true, sharedRigDoesNotImplySharedMotionIdentity:true, cartoonStyleVariantAllowed:true, styleVariantPreservesGameplayAuthority:true, creatureLibraryGraphInterlinkRequired:true, composableMotionDirectorRequired:true, motionDirectorContinuousExpansion:true, motionDirectorNoArtificialCombinationCap:true, motionDirectorGameplayAuthority:false, studioAssetUniverseRequired:true, universalAssetCoverageScannerRequired:true, assetIdentityQaRequired:true, crossAssetCompatibilityRequired:true, styleBibleGeneratorRequired:true, autonomousLibraryPopulation24h:true, preparedSemanticAssetMayNotClaimVerified:true, noPlaceholderArtForFinal: true, licenseBeforeDerivative: true, noUnverifiedDerivativeUse: true, proactiveArtIntervention:true, actualPresentationVerification:true, originalAssetImmutable:true, transformedAssetsUseDerivedPaths:true, assetVariantTournamentRequired:true, assetAcquisitionOrderEnforced:true, primitiveFallbackPrototypeOnly:true, visualDebtForFallbackRequired:true, goldenSceneRuntimeEvidenceRequired:true, markerOnlyPresentationPassForbidden:true, minimumFinalGameplayDimension:'2.5D', flat2DFinalGameplayForbidden:true, ui2DOverlayAllowed:true, highEndVisualProduction:true, purposefulAssetDefault:true, environmentAndBackgroundFirstClass:true, antiKitbashGateRequired:true, beforeAfterVisualRegressionRequired:true, platformSpecificReauthoringExpected:true, continuousPresentationEvolution:true, graphicsPassIsCheckpointNotTerminal:true, highEndPresentationCompletionIsReleaseGate:false, ownerChangeRequestStabilityRequired:true, wrapperOrShadowPresentationAccumulationForbidden:true }),
  });
}


function graphicsProductionPlatforms(target='dual-native'){
  const value=clean(target).toLowerCase();
  if(['dual-native','native','roblox+unity','unity+roblox','roblox_unity'].includes(value))return Object.freeze(['ROBLOX','UNITY']);
  if(value==='roblox')return Object.freeze(['ROBLOX']);
  if(value==='unity')return Object.freeze(['UNITY']);
  if(value==='web')return Object.freeze(['WEB']);
  return Object.freeze(['ROBLOX','UNITY']);
}

export function createVibeGraphicsProductionEvidenceRoot({
  gameId='',
  candidateRevision='',
  sourceRevision='',
  platformEvidenceRefs={},
  assetProvenanceRefs=[],
  artBibleRef='',
  visualTargetFramesRef='',
  runtimeAudit=null
}={}){
  const id='graphics-production-'+stableHash([gameId,candidateRevision,sourceRevision].join('|'));
  const platformRefs=Object.freeze({
    ROBLOX:clean(platformEvidenceRefs?.ROBLOX||platformEvidenceRefs?.roblox)||null,
    UNITY:clean(platformEvidenceRefs?.UNITY||platformEvidenceRefs?.unity)||null
  });
  return Object.freeze({
    version:1,
    kind:'graphics-production-evidence',
    graphicsProductionId:id,
    gameId:clean(gameId)||null,
    candidateRevision:clean(candidateRevision)||null,
    sourceRevision:clean(sourceRevision)||null,
    artBibleRef:clean(artBibleRef)||null,
    visualTargetFramesRef:clean(visualTargetFramesRef)||null,
    assetProvenanceRefs:Object.freeze(unique(assetProvenanceRefs.map(clean))),
    platformEvidenceRefs:platformRefs,
    runtimeAudit:runtimeAudit||null,
    rawRuntimeCaptureDuplicationForbidden:true,
    independentCharacterEnvironmentAnimationVfxEvidenceAuthority:false,
    authority:'GRAPHICS_PRODUCTION_ROOT_EVIDENCE_ONLY'
  });
}

export function createVibeGraphicsProduction({
  gameId='',
  request='',
  target='dual-native',
  quality=3,
  style='',
  game={},
  world={},
  characters=[],
  files=[],
  graph=null,
  events=[],
  assetProductionPlan=null,
  runtimeEvidence=null,
  candidateRevision='',
  sourceRevision='',
  platformEvidenceRefs={},
  assetProvenanceRefs=[],
  artBibleRef='',
  visualTargetFramesRef='',
  previousOwnerRequests=[],
  affectedScopes=[],
  referenceImages=[]
}={}){
  const platforms=graphicsProductionPlatforms(target);
  const changeRequestStability=createVibeOwnerChangeRequestStability({request,previousRequests:previousOwnerRequests,affectedScopes});
  const artSpec=createVibeArtPipeline({request,target:platforms.length===2?'native':String(platforms[0]||target).toLowerCase(),quality,style});
  const visualDirection=planVibeStyleAwareGraphicsAutopilot({game,world,characters,platform:platforms.length===2?'mobile':String(platforms[0]||'mobile').toLowerCase()});
  const visualWork=planVibeVisualAutopilot({files,graph,request});
  const presentation=planVibePresentationAutopilot({files,events,request,changeRequest:changeRequestStability});
  const assetPlanBound=assetProductionPlan?.kind==='vibe2-asset-production-plan';
  const referenceImageStudies=Object.freeze((referenceImages||[]).map((row,index)=>{
    const request=createVibeReferenceImageStudyRequest({
      sourceId:row?.sourceId||row?.id||`reference-${index+1}`,
      sourceType:row?.sourceType||'ABSTRACTED_MULTI_REFERENCE_ANALYSIS',
      imageRef:row?.imageRef||row?.path||row?.url||'',
      rights:row?.rights||{},
      purpose:row?.purpose||'MAP_STRUCTURE'
    });
    const observation=row?.observation?bindVibeReferenceImageObservation({
      request,observation:row.observation,verifiedAgainstSource:row.verifiedAgainstSource===true
    }):null;
    return Object.freeze({request,observation});
  }));
  const runtimeAudit=runtimeEvidence&&Object.keys(runtimeEvidence).length?auditVibeRuntimeVisualEvidence(runtimeEvidence):null;
  const status=runtimeAudit?(runtimeAudit.pass?'GRAPHICS_PASS':'ASSET_REPAIR_REQUIRED'):'GRAPHICS_PRODUCTION_ACTIVE';
  const evidence=createVibeGraphicsProductionEvidenceRoot({
    gameId,candidateRevision,sourceRevision,platformEvidenceRefs,assetProvenanceRefs,artBibleRef,visualTargetFramesRef,runtimeAudit
  });
  return Object.freeze({
    version:3,
    kind:'GRAPHICS_PRODUCTION',
    status,
    graphicsProductionId:evidence.graphicsProductionId,
    gameId:clean(gameId)||null,
    platforms,
    externalTopLevelWorkUnit:true,
    topLevelWorkUnitCount:1,
    soleCoordinator:GRAPHICS_PRODUCTION_INTERNAL_MODULES.coordinator,
    inputPlanner:GRAPHICS_PRODUCTION_INTERNAL_MODULES.inputPlanner,
    internalModules:GRAPHICS_PRODUCTION_INTERNAL_MODULES,
    stages:GRAPHICS_PRODUCTION_STAGES,
    assetProductionPlanBound:assetPlanBound,
    assetProductionPlan:assetPlanBound?assetProductionPlan:null,
    artSpec,
    visualDirection,
    visualWork,
    presentation,
    referenceImageStudies,
    referenceImageObservationReadyCount:referenceImageStudies.filter(row=>row.request.ready&&row.observation?.valid).length,
    verifiedReferenceImageObservationCount:referenceImageStudies.filter(row=>row.observation?.verifiedAgainstSource===true).length,
    changeRequestStability,
    continuousEvolution:Object.freeze({enabled:true,graphicsPassIsCheckpointNotTerminal:true,continuesAfterInternalRelease:true,continuesAfterPublicRelease:true,highEndCompletionIsReleaseGate:false}),
    runtimeAudit,
    evidence,
    queue:Object.freeze({
      siblingTopLevelGraphicsTasksForbidden:true,
      internalStagesMayFanOutOnDisjointFiles:true,
      internalFanOutMustFanInToSameRoot:true,
      failedInternalScopeReturnsToSameRoot:true
    }),
    authority:Object.freeze({
      graphicsDepartmentOwnsVisualDirection:true,
      vibeOwnsGameSourceMutation:true,
      audioAuthoringOwner:'audio',
      graphicsConsumesAudioEvidenceOnly:true,
      gameplayMutationAllowed:false,
      independentInternalModuleAcceptanceForbidden:true
    }),
    policy:Object.freeze({
      highEndCommercialNativePresentation:true,
      purposefulAssetsDefault:true,
      backgroundAndEnvironmentFirstClass:true,
      assetMutationAndExpansion:true,
      antiKitbashCohesionGate:true,
      platformSpecificReauthoring:true,
      beforeAfterVisualRegression:true,
      platformPerformanceEvidence:true,
      oneRootEvidenceRecord:true,
      shadowGraphicsPipelineForbidden:true,
      continuousPresentationEvolution:true,
      graphicsPassIsCheckpointNotTerminal:true,
      highEndPresentationCompletionIsReleaseGate:false,
      ownerChangeRequestStabilityRequired:true,
      rightsVerifiedReferenceImageObservationSupported:true,
      rawProtectedReferenceImagePersistentLearningForbidden:true,
      directReferenceSceneOrMapCopyForbidden:true,
      referenceObservationIsProposalUntilVerifiedAgainstSource:true
    })
  });
}

export const planVibeArtPipeline = createVibeArtPipeline;
if (typeof window !== 'undefined') Object.assign(window,{createJaewoonVibeArtPipeline:createVibeArtPipeline,createJaewoonVibeGraphicsProduction:createVibeGraphicsProduction,createJaewoonVibeGraphicsProductionEvidenceRoot:createVibeGraphicsProductionEvidenceRoot,createJaewoonVibeOwnerChangeRequestStability:createVibeOwnerChangeRequestStability,createJaewoonVibeAssetReconstructionContract:createVibeAssetReconstructionContract,createJaewoonVibeAssetVariantPlan:createVibeAssetVariantPlan,selectJaewoonVibeAssetVariant:selectVibeAssetVariant});
