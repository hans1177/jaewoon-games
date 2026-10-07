// 파일명: assets/asset-selector.js
// 역할: 자연어 요구에서 필요한 에셋 종류를 판별하고 실제 게임 객체에 적용할 매핑 계획을 생성
// 규칙: 기존 저장소 우선, 라이선스 불명/NC 차단, 캐릭터/적/보스는 검증 애니메이션 또는 Motion Engine 증거 필수

const TYPES = Object.freeze({
  character: ['주인공', '캐릭터', '영웅', '플레이어', '기사', '궁수', '사마귀'],
  npc: ['NPC', 'npc', '주민', '마을사람', '상인', '판매원', '퀘스트 NPC', '의뢰인', '훈련관', '교관'],
  companion: ['동료', '동료 캐릭터', '아군', '파티원', 'companion', 'ally'],
  creature: ['크리처', '생물', '동물', '야생동물', '펫', '애완동물', '탈것', '마운트', '소환수', 'pet', 'mount', 'summon'],
  enemy: ['적', '몬스터', '엘리트', '고블린', '오크', '좀비', '거미', '전갈', '벌'],
  boss: ['보스', '중간보스', '레이드 보스', '대형'],
  background: ['배경', '환경', '지형', '랜드마크', '숲', '사막', '황무지', '동굴', '광산', '성', '마을', '기지'],
  item: ['아이템', '검', '칼', '활', '방패', '갑옷', '물약', '장비', '도구'],
  prop: ['소품', '가구', '장식', '사물', '나무', '바위', '풀', '버섯', '상자', '건물', '집', '벽', '문', '자원'],
  effect: ['이펙트', '폭발', '불꽃', '마법', '피격', '스킬 효과', '파티클'],
  ui: ['UI', '버튼', '체력바', '조이스틱', '인벤토리', '상점'],
  audio: ['소리', '사운드', '효과음', 'BGM', '음악'],
  animation: ['애니', '애니메이션', '움직임', '걷기', '달리기', '공격 모션', '피격 모션', '사망 모션'],
});

const REQUIRED_VISUAL_TYPES = Object.freeze(['character', 'enemy', 'boss', 'background', 'item', 'prop', 'effect', 'ui', 'animation']);
const ACTOR_TYPES = Object.freeze(['character', 'npc', 'companion', 'creature', 'enemy', 'boss']);
const DEFAULT_MOTION_STATES = Object.freeze(['idle', 'move', 'attack', 'hit', 'skill', 'death']);
const LOCOMOTION_STATES = Object.freeze(['move', 'walk', 'run', 'jump', 'fly', 'swim', 'crawl']);
const BLOCKED_LICENSE_WORDS = Object.freeze(['NC', 'unknown', '출처 불명', '재배포 제한']);
function blockedLicense(license='') {
  const value = text(license);
  const lower = value.toLowerCase();
  return BLOCKED_LICENSE_WORDS.some((blocked) => {
    const token = String(blocked).toLowerCase();
    if (token === 'nc') return /(?:^|[^a-z0-9])nc(?:[^a-z0-9]|$)/i.test(value);
    return lower.includes(token);
  });
}
const BLOCKED_ACTOR_VISUAL_WORDS = Object.freeze(['circle', 'sphere', 'orb', 'ball', '원형', '구체', 'placeholder', 'dummy', 'primitive']);
const ACTIVE_NATIVE_TARGETS = Object.freeze(['roblox', 'unity']);
const PAUSED_NATIVE_TARGETS = Object.freeze(['fortnite-uefn']);

function text(value) { return String(value ?? '').trim(); }
function normalizeProductionTarget(value = '') {
  const source = text(value).toLowerCase();
  if (!source) return '';
  if (['roblox', '로블록스'].includes(source)) return 'roblox';
  if (['unity', 'unity-android', 'android', '유니티', '안드로이드', 'apk'].includes(source)) return 'unity';
  if (['web', 'mobile-web', 'browser', '웹', '브라우저', 'unity-web', 'unity-web-validation'].includes(source)) return 'web-validation';
  if (['uefn', 'fortnite', 'fortnite-uefn', '포트나이트'].includes(source)) return 'fortnite-uefn';
  return source;
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function hasAny(source, words) { const value = text(source).toLowerCase(); return words.some((word) => value.includes(String(word).toLowerCase())); }
function declaredTypes(asset) { return Array.isArray(asset?.types) ? asset.types.map((value) => text(value).toLowerCase()) : []; }
function frozenList(values) { return Object.freeze([...(Array.isArray(values) ? values : [])]); }

function animationResourceReady(asset) {
  const animations = Array.isArray(asset?.animations) ? asset.animations.map((value) => text(value).toLowerCase()) : [];
  const states = Array.isArray(asset?.states) ? asset.states.map((value) => text(value).toLowerCase()) : [];
  const evidence = Array.isArray(asset?.animationEvidence) ? asset.animationEvidence.filter(Boolean) : [];
  const motion = unique([...animations, ...states]);
  const verified = asset?.verifiedAnimation === true;
  const hasAnimationResource = motion.length > 0 || evidence.length > 0;
  const hasLocomotion = LOCOMOTION_STATES.some((state) => motion.includes(state));
  return verified && hasAnimationResource && hasLocomotion;
}

function linkedMotionSources(asset, allAssets = []) {
  const ids = Array.isArray(asset?.compatibleMotionSourceIds) ? asset.compatibleMotionSourceIds.map(text).filter(Boolean) : [];
  if (!ids.length) return [];
  const byId = new Map((allAssets || []).map((row) => [text(row?.id), row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function actorHasFrameAnimation(asset, allAssets = []) {
  if (animationResourceReady(asset)) return true;
  const retargetableRig = asset?.rigged === true || asset?.retargetable === true;
  return retargetableRig && linkedMotionSources(asset, allAssets).some((source) => animationResourceReady(source));
}

function actorHasMotionEngineEvidence(asset) {
  const evidence = Array.isArray(asset?.motionEvidence) ? asset.motionEvidence.map(text).filter(Boolean) : [];
  const required = ['motion-engine-profile', 'runtime-motion-evidence', 'mobile-performance-pass'];
  return asset?.motionEngineEligible === true
    && text(asset?.motionEnginePath || 'assets/jaewoon-motion-engine.js').includes('jaewoon-motion-engine')
    && required.every((item) => evidence.includes(item));
}

function actorMotionMode(asset, allAssets = []) {
  if (animationResourceReady(asset)) return 'frame-animation';
  if ((asset?.rigged === true || asset?.retargetable === true) && linkedMotionSources(asset, allAssets).some((source) => animationResourceReady(source))) return 'retargetable-rig+linked-motion';
  if (actorHasMotionEngineEvidence(asset)) return 'motion-engine';
  return null;
}

function findCandidates(type, candidates) {
  return candidates.filter((asset) => {
    const tags = Array.isArray(asset?.tags) ? asset.tags.join(' ') : text(asset?.tags);
    const descriptor = `${asset?.id || ''} ${asset?.name || ''} ${tags}`;
    const declared = declaredTypes(asset);
    if (!declared.includes(type) && !hasAny(descriptor, TYPES[type])) return false;

    if (ACTOR_TYPES.includes(type)) {
      if (asset?.blockedForActorUse === true) return false;
      if (hasAny(descriptor, BLOCKED_ACTOR_VISUAL_WORDS)) return false;
      if (!actorMotionMode(asset, candidates)) return false;
    }

    return true;
  }).map((asset) => ({
    type,
    id:text(asset.id),
    path:text(asset.path),
    license:text(asset.license),
    source:text(asset.source),
    downloaded:asset?.downloaded !== false,
    animated:ACTOR_TYPES.includes(type) ? Boolean(actorMotionMode(asset, candidates)) : Boolean(asset?.verifiedAnimation),
    motionMode:ACTOR_TYPES.includes(type) ? actorMotionMode(asset, candidates) : null,
    sourceUrl:text(asset.sourceUrl),
    platforms:frozenList(asset.platforms),
    platformResearchTargets:frozenList(asset.platformResearchTargets),
    rigged:asset?.rigged===true,
    retargetable:asset?.retargetable===true,
    compatibleMotionSourceIds:frozenList(asset.compatibleMotionSourceIds),
    studioMotionCandidate:asset?.studioMotionCandidate===true,
    creatureFamily:text(asset.creatureFamily),
  }));
}

function normalizePlatformProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  return Object.freeze({
    qualityTarget:text(profile.qualityTarget),
    input:frozenList(profile.input),
    modules:frozenList(profile.modules),
    performance:frozenList(profile.performance),
  });
}

function choosePrototypePreset(request, presetCatalog) {
  const presets = Array.isArray(presetCatalog?.presets) ? presetCatalog.presets : [];
  if (!presets.length) return null;
  const source = text(request).toLowerCase();
  let best = null;
  let bestScore = -1;
  for (const preset of presets) {
    const keywords = Array.isArray(preset?.keywords) ? preset.keywords : [];
    const score = keywords.reduce((sum, keyword) => sum + (source.includes(text(keyword).toLowerCase()) ? 1 : 0), 0);
    const adjusted = score + (preset?.default === true ? 0.01 : 0);
    if (adjusted > bestScore) { best = preset; bestScore = adjusted; }
  }
  return best ? Object.freeze({
    id:text(best.id),
    name:text(best.name),
    genre:text(best.genre),
    defaultTarget:text(best.defaultTarget || 'mobile-web'),
    defaultNativeTarget:normalizeProductionTarget(best.defaultNativeTarget || 'roblox'),
    actorAssets:frozenList(best.actorAssets),
    effectAssets:frozenList(best.effectAssets),
    supportingSourcePriority:frozenList(best.supportingSourcePriority),
    toolCandidates:frozenList(best.toolCandidates),
    platformProfiles:Object.freeze({
      roblox:normalizePlatformProfile(best?.platformProfiles?.roblox || best?.platformProfiles?.mobileWeb),
      unity:normalizePlatformProfile(best?.platformProfiles?.unity || best?.platformProfiles?.unityAndroid),
      webValidation:normalizePlatformProfile(best?.platformProfiles?.webValidation || best?.platformProfiles?.mobileWeb),
      mobileWeb:normalizePlatformProfile(best?.platformProfiles?.mobileWeb),
      unityAndroid:normalizePlatformProfile(best?.platformProfiles?.unityAndroid),
    }),
  }) : null;
}

function presetPreferredIds(preset) {
  if (!preset) return new Set();
  return new Set([...(preset.actorAssets || []), ...(preset.effectAssets || [])].map(text));
}

function chooseProductionTarget(request, preset) {
  const source = text(request).toLowerCase();
  if (/\broblox\b|로블록스/.test(source)) return 'roblox';
  if (/\buefn\b|\bfortnite\b|포트나이트/.test(source)) return 'fortnite-uefn';
  if (/\bunity\b|유니티|android|안드로이드|apk/.test(source)) return 'unity';
  if (/\bweb\b|웹|브라우저/.test(source)) return 'web-validation';
  return normalizeProductionTarget(preset?.defaultNativeTarget || preset?.defaultTarget || 'roblox') || 'roblox';
}

function buildProductionPlan(request, preset) {
  if (!preset) return null;
  const recommendedTarget = chooseProductionTarget(request, preset);
  const nativePrimaryTarget = ACTIVE_NATIVE_TARGETS.includes(recommendedTarget)
    ? recommendedTarget
    : normalizeProductionTarget(preset.defaultNativeTarget || 'roblox') || 'roblox';
  return Object.freeze({
    mobileFirst:true,
    genre:preset.genre,
    recommendedTarget,
    nativePrimaryTarget,
    activeNativeTargets:[...ACTIVE_NATIVE_TARGETS],
    pausedNativeTargets:[...PAUSED_NATIVE_TARGETS],
    webValidationSurfaceOnly:true,
    robloxFirstWhenPlatformUnspecified:nativePrimaryTarget === 'roblox',
    webQualityAllowed:true,
    roblox:preset.platformProfiles.roblox,
    unity:preset.platformProfiles.unity,
    webValidation:preset.platformProfiles.webValidation,
    mobileWeb:preset.platformProfiles.mobileWeb,
    unityAndroid:preset.platformProfiles.unityAndroid,
    toolCandidates:preset.toolCandidates,
    externalToolAutoInstall:false,
    externalToolApprovalRequired:true,
    publicUseRequiresLicenseLedger:true,
    nativeGeneratedAssetSourceRecipeRequired:true,
    nativeGeneratedAssetReviewEvidenceRequired:true,
    nativeRuntimeVerificationRequiredBeforePromotion:true,
    heavy3dUnityAndroidPreferred:['survival','rpg','action-rpg','fps-shooter','zombie-horror'].includes(preset.genre),
    legacyHeavy3dHintDoesNotOverrideExplicitOrCentralNativeTarget:true,
  });
}

export function planAssetApplication({ prompt = '', manifest = null, presetCatalog = null, rebuild = false } = {}) {
  const request = text(prompt);
  if (!request) throw new Error('asset request required');
  const explicitRequestedTypes = Object.entries(TYPES).filter(([, words]) => hasAny(request, words)).map(([type]) => type);
  const types = unique([...REQUIRED_VISUAL_TYPES, ...explicitRequestedTypes]);
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const candidates = assets.filter((asset) => {
    const license = text(asset?.license || asset?.policy || '');
    return !blockedLicense(license);
  });
  const prototypePreset = choosePrototypePreset(request, presetCatalog);
  const production = buildProductionPlan(request, prototypePreset);
  const preferredIds = presetPreferredIds(prototypePreset);
  const matched = types.flatMap((type) => findCandidates(type, candidates))
    .sort((a, b) => Number(preferredIds.has(b.id)) - Number(preferredIds.has(a.id))
      || Number(b.studioMotionCandidate === true) - Number(a.studioMotionCandidate === true));
  const missingTypes = types.filter((type) => !matched.some((item) => item.type === type));
  const binding = types.map((type) => Object.freeze({
    type,
    required:true,
    targetStates:ACTOR_TYPES.includes(type) || type === 'animation' ? [...DEFAULT_MOTION_STATES] : [],
    matchedAssetIds:matched.filter((item) => item.type === type).map((item) => item.id),
    fallback:'none',
    replaceable:true,
  }));
  return Object.freeze({
    version:10,
    request,
    rebuild:Boolean(rebuild),
    prototypePreset,
    production,
    requestedTypes:Object.freeze(types),
    explicitRequestedTypes:Object.freeze(explicitRequestedTypes),
    matched:Object.freeze(matched),
    missingTypes:Object.freeze(missingTypes),
    binding:Object.freeze(binding),
    ready:missingTypes.length===0,
    animation:Object.freeze({
      required:true,
      actorAnimationRequired:true,
      locomotionStates:[...LOCOMOTION_STATES],
      states:[...DEFAULT_MOTION_STATES],
      stateDriven:true,
      rawStaticActorAllowed:false,
      staticActorAllowedWithMotionEngine:true,
      motionEnginePath:'assets/jaewoon-motion-engine.js',
      replaceableWithoutGameplayRewrite:true,
    }),
    policy:Object.freeze({
      existingAssetsFirst:true,
      prototypePresetFirst:true,
      mobileFirst:true,
      activeNativeTargets:[...ACTIVE_NATIVE_TARGETS],
      pausedNativeTargets:[...PAUSED_NATIVE_TARGETS],
      defaultNativeTarget:'roblox',
      webValidationSurfaceOnly:true,
      generatedAssetSourceRecipeRequired:true,
      generatedAssetReviewEvidenceRequired:true,
      generatedAssetNativeRuntimeVerificationRequired:true,
      webHighQualityAllowed:true,
      unityAndroidPreferredForHeavy3D:true,
      blockedLicenses:[...BLOCKED_LICENSE_WORDS],
      blockedActorVisualWords:[...BLOCKED_ACTOR_VISUAL_WORDS],
      requireLicenseRecord:true,
      requireRealAssets:true,
      requireVerifiedAnimationOrMotionEngine:true,
      allowRetargetableRigWithLinkedVerifiedMotion:true,
      studioMotionCandidatePreferred:true,
      requireAnimatedCharacter:true,
      requireAnimatedNpc:true,
      requireAnimatedCompanion:true,
      requireAnimatedCreature:true,
      requireAnimatedEnemy:true,
      requireAnimatedBoss:true,
      allowRawStaticActor:false,
      allowStaticActorWithMotionEngine:true,
      motionEngineEvidenceRequired:['motion-engine-profile','runtime-motion-evidence','mobile-performance-pass'],
      allowProceduralPlaceholder:false,
      allowEmojiPlaceholder:false,
      allowGeometricPlaceholder:false,
      styleConsistencyRequired:true,
      downloadOnDemand:true,
      cacheAfterFirstUse:true,
      externalToolAutoInstall:false,
      externalToolApprovalRequired:true,
    }),
    steps:Object.freeze([
      '장르에 맞는 모바일 prototype-asset-presets 프리셋 자동 선택',
      '중앙정책의 활성 native 타깃을 우선하고 플랫폼 미지정 시 Roblox를 기본 native 제작 타깃으로 선택',
      'Web은 native 대체 타깃이 아니라 필요한 경우 검증/동반 표면으로만 분리',
      'Roblox/Unity용 생성 자산은 원본 제작 레시피·미리보기·evidence·런타임 검증을 분리해 기록',
      '외부 무료 제작툴은 후보만 제시하고 라이선스/버전 승인 전 자동 설치 금지',
      '기존 저장소 에셋 확인 후 KEEP/ENHANCE/COMBINE/REPLACE 분류',
      '캐릭터/적/보스는 실제 프레임 애니메이션, 검증 모션 소스가 연결된 리타겟 가능 리그, 또는 Motion Engine 실행 증거를 확인',
      '휴머노이드 리그와 외부/회사 모션을 조합할 때는 리타겟·발접지·루트/골반·손/무기 접촉·전환 클린업을 거쳐 플랫폼 네이티브 런타임으로 검증',
      '정지 원본은 Motion Engine 프로필·런타임 증거·모바일 성능 통과 없이는 배우 후보에서 제외',
      '프리셋의 검증 배우 에셋을 우선 적용하고 미다운로드 에셋은 최초 사용 시 확보·캐시',
      '플레이어/일반 NPC/동료/아군/상인·퀘스트 NPC/펫·탈것·소환수/적·엘리트/보스와 배경·지형·사물·자원·건물·UI·VFX 목록 작성',
      '누락 에셋은 승인 소스에서 상업/수정 라이선스 확인 후 확보',
      'LICENSES/에셋 장부에 출처·제작자·라이선스·수정 여부 기록',
      '모든 월드 객체를 실제 이미지/스프라이트/타일 에셋에 연결',
      '프레임 에셋은 animation-state, 정지/보조 모션은 Jaewoon Motion Engine에 연결',
      '도형/이모지/단색 임시 그래픽 잔존 여부 검사',
      '에셋/모션과 authoritative 게임 로직 분리 확인',
      '모바일 화면/성능/reduced-motion 확인',
    ]),
  });
}

if (typeof window !== 'undefined') window.planJaewoonAssetApplication = planAssetApplication;
