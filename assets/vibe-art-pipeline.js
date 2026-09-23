// 파일명: assets/vibe-art-pipeline.js
// 역할: 자연어 요구를 게임 그래픽·애니메이션·VFX·사운드 제작 사양으로 변환
// 규칙: 게임 판정과 표현을 분리하고 기존 규칙/세이브를 보존하며, V3에서는 권리 확인된 기존 에셋을 비파괴 후보 변형 후 경쟁 선택한다.

import {planVibeStyleAwareGraphicsAutopilot,planVibeVisualAutopilot} from './vibe-visual-autopilot.js';
import {planVibePresentationAutopilot} from './vibe-presentation-director.js';
import {auditVibeRuntimeVisualEvidence} from './vibe-visual-quality-gate.js';

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
  runtimeQuality:'assets/vibe-visual-quality-gate.js'
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
  if (needsArt) steps.push('허용 에셋 재사용·재가공·신규 제작 중 가장 일관된 방법을 개발 에이전트가 선택');
  if (artLevel) steps.push(`${artLevel >= 3 ? '고품질' : artLevel === 2 ? '상세' : '기본'} 캐릭터·적·보스·배경 에셋 구성`);
  if (artLevel >= 2) steps.push('허용 에셋을 분해하고 크롭/스케일/회전/색/명암/재질/실루엣을 재가공');
  if (artLevel >= 2) steps.push('분리 파츠를 재조합하고 지역종·변이종·보스 파생 디자인을 구성');
  if (artLevel >= 2) steps.push('Art Bible 기준으로 서로 다른 원본의 색·형태·재질·조명을 통일하고 raw asset-pack/kitbash 느낌을 제거');
  if (artLevel >= 2) steps.push('배경을 전경/중경/후경으로 구성하고 지역 랜드마크·set dressing·환경 스토리텔링·이동/전투 가독성을 확보');
  if (animationLevel) steps.push(`분리 파츠 기반 ${states.join('/')} 애니메이션 구성`);
  if (animationLevel) steps.push('공격 시작/명중/종료 타이밍을 실제 판정과 동기화');
  if (animationLevel) steps.push('PRIMARY_MOTION + SECONDARY_MOTION + PROCEDURAL_RESPONSE를 겹쳐 가감속·회전보간·체중이동·상태 블렌딩·시선/피격 방향 반응을 캐릭터와 종별로 차별화');
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
  const implementation = godot ? ['Sprite2D/AnimatedSprite2D','SpriteFrames','GPUParticles2D/CPUParticles2D','AnimationPlayer 또는 Tween','AudioStreamPlayer'] : web ? ['Canvas/Sprite 렌더러','스프라이트 시트/프레임 애니메이션','파티클 레이어','Web Audio API','CSS/Canvas UI 연출'] : ['플랫폼별 기본 2D 렌더러','프레임 애니메이션','파티클','오디오 이벤트'];
  return Object.freeze({
    version: 6,
    generation:'V3',
    target: godot ? 'godot' : web ? 'web' : target,
    quality: Object.freeze({ art: artLevel, animation: animationLevel, vfx: vfxLevel, audio: audioLevel }),
    style: style || '프로젝트 기존 스타일 분석 후 일관된 스타일로 확정',
    assetAcquisition: Object.freeze({ order: VIBE_ASSET_ACQUISITION_ORDER, preferVerifiedCompanyAssets:true, rightsVerifiedRepositoryOrExternalBeforeUse:true, reconstructWhenRightsAllow:true, createWhenNoVerifiedCandidate:true, primitiveFallbackPrototypeOnly:true, fallbackCreatesVisualDebt:true }),
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
    animation: Object.freeze({ required: animationLevel > 0 || needsArt, states: Object.freeze(states), partSeparated: animationLevel >= 2, motionSyncRequired: true, motionLayers:VIBE_MOTION_LAYERS, characterAndCreatureActing:true, accelerationDeceleration:true, turnInterpolation:true, stateBlend:true, weightTransfer:true, directionalHitResponse:true, nonMechanicalIdleVariation:true }),
    vfx: Object.freeze({ required: vfxLevel > 0 || animationLevel >= 2, hit: true, skill: true, death: true, screenFeedback: true, gameSpecificLanguage:true, intensityHierarchy:Object.freeze(['AMBIENT','NORMAL','HEAVY','CRITICAL_OR_SIGNATURE','BOSS_OR_ULTIMATE']), gameplayReadabilityFirst:true, mobileDensityScaling:true }),
    audio: Object.freeze({ required: audioLevel > 0, bgm: audioLevel >= 2, sfx: true, eventDriven: true, mobileSafe: true, authoringOwner:'audio', conceptFit:true, stateAdaptive:true, states:Object.freeze(['EXPLORATION','DISCOVERY_OR_TENSION','COMBAT','DANGER','BOSS','VICTORY','REST_OR_HUB','SPECIAL_EVENT']) }),
    agentRole: Object.freeze({ mode:'active-art-direction-v3', inspectWithoutPrompting:true, identifyMissingAssets:true, chooseReuseReconstructOrCreate:true, preferVerifiedCompanyAssetLibrary:true, followAssetAcquisitionOrder:true, createVisualDebtForFallback:true, requireGoldenSceneRuntimeEvidence:true, selfTransformExistingAssets:true, generateIndependentVariants:true, compareVariantsInActualPresentation:true, keepOriginalImmutable:true, prepareAnimationParts:true, connectAnimationAndVfx:true, compareActualPresentation:true, iteratePresentationDefects:true, resolveLatestOwnerIntentBeforeMutation:true, affectedScopeOnly:true, replaceConflictingSameScopeBehavior:true, preserveUnaffectedBehavior:true, gameplayAuthority:false, saveAuthority:false }),
    implementation: Object.freeze(implementation),
    steps: Object.freeze(unique(steps)),
    qa: Object.freeze(['Art Bible/Style Lock/Visual Target Frame 바인딩','Hero Quality 대상 완성도','안티-kitbash 스타일 통일','전경/중경/배경 환경 구성','랜드마크/set dressing/환경 스토리텔링','에셋 경로/라이선스/파생 허용','원본 불변/derived 경로 분리','변형 이력/부모 에셋 provenance','출처/귀속 메타데이터 보존','스타일 일관성','실루엣 식별성','파츠 분해/재조합 무결성','스프라이트/프레임 정상 로드','애니메이션 상태 전환','모션-판정 동기화','VFX 생명주기/중복 생성','오디오 이벤트 중복/누락','모바일 터치와 UI 겹침','실제 화면 표현 비교','Golden Scene 5종 런타임 캡처','주요 캐릭터/몹 primitive placeholder 제거','Visual Debt 해소','성능/메모리']),
    policy: Object.freeze({ preserveGameplay: true, preserveSave: true, directEditPreferred: true, noPlaceholderArtForFinal: true, licenseBeforeDerivative: true, noUnverifiedDerivativeUse: true, proactiveArtIntervention:true, actualPresentationVerification:true, originalAssetImmutable:true, transformedAssetsUseDerivedPaths:true, assetVariantTournamentRequired:true, assetAcquisitionOrderEnforced:true, primitiveFallbackPrototypeOnly:true, visualDebtForFallbackRequired:true, goldenSceneRuntimeEvidenceRequired:true, markerOnlyPresentationPassForbidden:true, highEndVisualProduction:true, purposefulAssetDefault:true, environmentAndBackgroundFirstClass:true, antiKitbashGateRequired:true, beforeAfterVisualRegressionRequired:true, platformSpecificReauthoringExpected:true, continuousPresentationEvolution:true, graphicsPassIsCheckpointNotTerminal:true, highEndPresentationCompletionIsReleaseGate:false, ownerChangeRequestStabilityRequired:true, wrapperOrShadowPresentationAccumulationForbidden:true }),
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
  affectedScopes=[]
}={}){
  const platforms=graphicsProductionPlatforms(target);
  const changeRequestStability=createVibeOwnerChangeRequestStability({request,previousRequests:previousOwnerRequests,affectedScopes});
  const artSpec=createVibeArtPipeline({request,target:platforms.length===2?'native':String(platforms[0]||target).toLowerCase(),quality,style});
  const visualDirection=planVibeStyleAwareGraphicsAutopilot({game,world,characters,platform:platforms.length===2?'mobile':String(platforms[0]||'mobile').toLowerCase()});
  const visualWork=planVibeVisualAutopilot({files,graph,request});
  const presentation=planVibePresentationAutopilot({files,events,request,changeRequest:changeRequestStability});
  const assetPlanBound=assetProductionPlan?.kind==='vibe2-asset-production-plan';
  const runtimeAudit=runtimeEvidence&&Object.keys(runtimeEvidence).length?auditVibeRuntimeVisualEvidence(runtimeEvidence):null;
  const status=runtimeAudit?(runtimeAudit.pass?'GRAPHICS_PASS':'ASSET_REPAIR_REQUIRED'):'GRAPHICS_PRODUCTION_ACTIVE';
  const evidence=createVibeGraphicsProductionEvidenceRoot({
    gameId,candidateRevision,sourceRevision,platformEvidenceRefs,assetProvenanceRefs,artBibleRef,visualTargetFramesRef,runtimeAudit
  });
  return Object.freeze({
    version:2,
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
      ownerChangeRequestStabilityRequired:true
    })
  });
}

export const planVibeArtPipeline = createVibeArtPipeline;
if (typeof window !== 'undefined') Object.assign(window,{createJaewoonVibeArtPipeline:createVibeArtPipeline,createJaewoonVibeGraphicsProduction:createVibeGraphicsProduction,createJaewoonVibeGraphicsProductionEvidenceRoot:createVibeGraphicsProductionEvidenceRoot,createJaewoonVibeOwnerChangeRequestStability:createVibeOwnerChangeRequestStability,createJaewoonVibeAssetReconstructionContract:createVibeAssetReconstructionContract,createJaewoonVibeAssetVariantPlan:createVibeAssetVariantPlan,selectJaewoonVibeAssetVariant:selectVibeAssetVariant});
