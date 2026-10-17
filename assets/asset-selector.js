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
  if (!value) return true;
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
  const seenIds = new Set();
  return candidates.filter((asset) => {
    const id = text(asset?.id);
    if (!id || seenIds.has(id)) return false;
    const tags = Array.isArray(asset?.tags) ? asset.tags.join(' ') : text(asset?.tags);
    const descriptor = `${asset?.id || ''} ${asset?.name || ''} ${tags}`;
    const declared = declaredTypes(asset);
    if (!declared.includes(type) && !hasAny(descriptor, TYPES[type])) return false;

    if (ACTOR_TYPES.includes(type)) {
      if (asset?.blockedForActorUse === true) return false;
      if (hasAny(descriptor, BLOCKED_ACTOR_VISUAL_WORDS)) return false;
      if (!actorMotionMode(asset, candidates)) return false;
    }

    seenIds.add(id);
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


// 검증된 외부 알고리즘/제작 도구는 후보 레시피다. 실행·다운로드·배포 권한이 아니다.
// 기존 환경 감독, 공용 에셋 제작 및 QA 책임 경로만 사용한다.
export const VIBE_EXTERNAL_CUSTOMIZATION_REFERENCES=Object.freeze([
  Object.freeze({id:'FASTNOISELITE',kind:'ALGORITHM',roles:['TERRAIN','ENVIRONMENT'],sourceUrl:'https://github.com/Auburn/FastNoiseLite',owner:'assets/vibe-environment-director.js',integration:'EXISTING_PROCEDURAL_WORLD_NOISE',licenseReviewRequired:true}),
  Object.freeze({id:'WAVE_FUNCTION_COLLAPSE',kind:'ALGORITHM',roles:['DUNGEON','BUILDING','MAP'],sourceUrl:'https://github.com/mxgmn/WaveFunctionCollapse',owner:'tools/company-roblox-production-plan.mjs',integration:'RULE_CONSTRAINED_LAYOUT_REFERENCE',licenseReviewRequired:true}),
  Object.freeze({id:'ASTAR_PATHFINDING',kind:'ALGORITHM',roles:['ENEMY_AI','NPC','MAP'],sourceUrl:'https://github.com/libgdx/gdx-ai',owner:'assets/common-ai.js',integration:'EXISTING_NATIVE_NAVIGATION_REVIEW',licenseReviewRequired:true}),
  Object.freeze({id:'BLENDER',kind:'AUTHORING_TOOL',roles:['CHARACTER','CREATURE','BUILDING','TERRAIN','PROP','ITEM'],sourceUrl:'https://www.blender.org/',owner:'assets/native-authoring/build-game-visual.py',integration:'REVIEWED_NATIVE_3D_AUTHORING',licenseReviewRequired:true}),
  Object.freeze({id:'MATERIAL_MAKER',kind:'AUTHORING_TOOL',roles:['MATERIAL','TERRAIN','BUILDING','PROP'],sourceUrl:'https://github.com/RodZill4/material-maker',owner:'tools/vibe2-asset-production-plan.mjs',integration:'REVIEWED_MATERIAL_AUTHORING',licenseReviewRequired:true}),
  Object.freeze({id:'GLTF_TRANSFORM',kind:'AUTHORING_TOOL',roles:['CHARACTER','CREATURE','BUILDING','TERRAIN','PROP','ITEM'],sourceUrl:'https://gltf-transform.dev/',owner:'assets/native-authoring/build-game-visual.py',integration:'REVIEWED_3D_OPTIMIZATION',licenseReviewRequired:true}),
  Object.freeze({id:'KENNEY_ASSET_REFERENCE',kind:'SOURCE_REFERENCE',roles:['CHARACTER','CREATURE','BUILDING','TERRAIN','PROP','ITEM','UI'],sourceUrl:'https://kenney.nl/',owner:'tools/vibe2-asset-production-plan.mjs',integration:'LICENSE_VERIFIED_EXTERNAL_ASSET_CANDIDATE',licenseReviewRequired:true})
]);

// 장르 분류에 매이지 않는 구성 능력. 승인 설계에 명시된 항목만 실제 제작 입력으로 보낸다.
// 플로어/방은 선택적인 공간 단위이며 경기·퍼즐·사회적 상호작용 등에는 강제하지 않는다.
export const VIBE_UNIVERSAL_CONTENT_CAPABILITIES=Object.freeze([
  Object.freeze({id:'SPACE_OR_WORLD',designSignal:/\b(?:terrain|landscape|world map|open.world|biome|region|environment|zone)\b|지형|월드|지역|바이옴|대륙|맵|탐험구역/i,assetRoles:['TERRAIN','ENVIRONMENT','MAP','PROP'],checks:['EXISTING_WORLD_ANCHORS','NAVIGATION_AND_COLLISION','CAMERA_AND_MOBILE_BUDGET']}),
  Object.freeze({id:'FLOOR_OR_ROOM',designSignal:/\b(?:floor|dungeon|maze|room layout|stage layout|procedural level|level layout)\b|플로어|층별|던전|미궁|방 배치|스테이지 구조/i,assetRoles:['DUNGEON','BUILDING','MAP','PROP'],checks:['ROOM_CONNECTIVITY','START_TO_GOAL_REACHABILITY','ENTRANCE_EXIT_PORTALS']}),
  Object.freeze({id:'HOUSING',designSignal:/\b(?:housing|player housing|home ownership|base building|home decoration|buildable house|player home)\b|하우징|내집|개인 주택|건설 가능한 집|기지 건설|주거지|집 꾸미기/i,assetRoles:['BUILDING','PROP','MATERIAL','MAP'],checks:['PLACEMENT_AND_COLLISION','OWNER_PERMISSION_AND_SERVER_AUTHORITY','COST_AND_INVENTORY','SAVE_AND_REJOIN','CANCEL_AND_ROLLBACK']}),
  Object.freeze({id:'RAID_OR_SIEGE',designSignal:/\b(?:raid|siege|invasion|base attack|wave defense|enemy assault)\b|습격|침공|공성|방어전|몬스터 웨이브|기지 공격|레이드/i,assetRoles:['ENEMY_AI','CREATURE','MAP','BUILDING'],checks:['APPROVED_SPAWN_AND_WAVE_RULES','ACTUAL_NAVIGATION_AND_SAFE_SPAWN','DEFENSE_COMBAT_SERVER_AUTHORITY','REWARD_AND_RETRY_IDEMPOTENCY','DISCONNECT_AND_EVENT_CLEANUP']}),
  Object.freeze({id:'COMBAT_OR_CHASE',designSignal:/\b(?:combat|battle|fight|chase|shooter|arena combat)\b|전투|격투|추격|사격|보스전/i,assetRoles:['ENEMY_AI','CREATURE','CHARACTER','MAP'],checks:['AUTHORITATIVE_HIT_AND_COOLDOWN','INPUT_AND_MOTION','NAVIGATION_AND_REACTION']}),
  Object.freeze({id:'RACING_OR_MOVEMENT',designSignal:/\b(?:race|racing|vehicle|track|parkour|platformer)\b|경주|레이싱|차량|트랙|파쿠르|플랫포머/i,assetRoles:['MAP','TERRAIN','PROP'],checks:['TRACK_OR_ROUTE_REACHABILITY','SPAWN_AND_CHECKPOINT','INPUT_AND_COLLISION']}),
  Object.freeze({id:'PUZZLE_OR_ADVENTURE',designSignal:/\b(?:puzzle|quest|escape room|investigation|adventure)\b|퍼즐|퀘스트|방탈출|추리|탐정|모험/i,assetRoles:['MAP','DUNGEON','PROP','UI'],checks:['PUZZLE_STATE_AND_SOLUTION','SOFTLOCK_RECOVERY','RESET_AND_SAVE']}),
  Object.freeze({id:'SOCIAL_OR_CREATIVE',designSignal:/\b(?:social|roleplay|sandbox build|creative mode|avatar customization)\b|소셜|롤플레잉|역할극|샌드박스|꾸미기|커스터마이징/i,assetRoles:['NPC','BUILDING','CHARACTER','UI'],checks:['PLAYER_OWNERSHIP_AND_MODERATION','INTERACTION_AND_MOBILE_UI','SAVED_STATE_AND_REJOIN']}),
  Object.freeze({id:'ECONOMY_OR_SIMULATION',designSignal:/\b(?:tycoon|economy|economics|management|farming|factory|simulation)\b|타이쿤|경영|농사|농장|생산|공장|시뮬레이션/i,assetRoles:['BUILDING','PROP','ITEM','UI'],checks:['AUTHORITATIVE_ECONOMY_AND_INVENTORY','PRODUCTION_CYCLE','SAVE_AND_REJOIN']}),
  Object.freeze({id:'SURVIVAL_OR_CRAFTING',designSignal:/\b(?:survival|crafting|gathering|resource harvest)\b|생존|제작|채집|자원 수집|크래프팅/i,assetRoles:['TERRAIN','ENVIRONMENT','ITEM','PROP'],checks:['RESOURCE_GATHERING_AND_CRAFT','APPROVED_DANGER_AND_REWARD','WORLD_STATE_AND_SAVE']})
]);
function vibeDesignEvidenceText(value,depth=0){
  if(depth>5||value==null)return'';
  if(typeof value==='string')return value.slice(0,500);
  if(typeof value==='number'||typeof value==='boolean')return'';
  if(Array.isArray(value))return value.slice(0,48).map(row=>vibeDesignEvidenceText(row,depth+1)).join(' ');
  if(typeof value!=='object')return'';
  if(value.enabled===false||value.active===false
    ||/^(?:DISABLED|HELD|EXCLUDED|NOT_PLANNED|FORBIDDEN|REMOVED)$/i.test(text(value.status)))return'';
  return Object.entries(value).slice(0,55).flatMap(([key,item])=>
    // JSON 키가 존재한다는 이유만으로 사용하지 않는 기능을 활성화하지 않는다.
    /^(?:enabled|active|isEnabled|available|status)$/i.test(key)&&item===false?[]:
    [vibeDesignEvidenceText(item,depth+1)]
  ).join(' ');
}
/**
 * 승인 설계 → 최소 첫 플레이(F0) → 장르 공통 원본 작업 → F1-F9 검증으로 이어지는
 * 기존 BUILD_UP 작업 입력. 공간/던전/하우징/습격의 존재를 장르로부터 추측하지 않는다.
 */
export function planVibeUniversalComposition({
  approvedDesign=null,designFingerprint='',gameId='',target='',ownerScope=null,
  sourceRoot='',sourceRevision='',executionSurface='',unityWebDevelopment=false
}={}){
  const platform=vibeNormalizedTarget(target);
  const unityOwned=unityWebDevelopment===true||/^(?:\.?\/)?unity-games\//i.test(text(sourceRoot).replaceAll('\\','/'))
    ||/UNITY[_-]?WEB|UNITY[_-]?ANDROID/i.test(text(executionSurface));
  const active=Array.isArray(ownerScope?.activeTargets)?ownerScope.activeTargets.map(vibeNormalizedTarget):[];
  const held=Array.isArray(ownerScope?.ownerHeldTargets)?ownerScope.ownerHeldTargets.map(vibeNormalizedTarget):[];
  const authorized=ownerScope?.status==='ACTIVE'&&ownerScope?.existingPipelineOnly===true
    &&['ROBLOX','WEB'].includes(platform)&&active.includes(platform)&&!held.includes(platform)&&!unityOwned;
  const verified=approvedDesign&&typeof approvedDesign==='object'&&!Array.isArray(approvedDesign)
    &&/^(?:sha256:)?[a-f0-9]{64}$/i.test(text(designFingerprint));
  const body=verified?[
    approvedDesign.coreFun,approvedDesign.coreLoop,approvedDesign.signatureSystems,
    approvedDesign.systemInterconnections,approvedDesign.spatialLayout,approvedDesign.detailedDesign,
    approvedDesign.contentVarietyPlan,approvedDesign.contentExpansionPlan,
    approvedDesign.selectedDesignPlan,approvedDesign.implementationTraceability,
    approvedDesign.narrativeDialoguePlan,approvedDesign.interfacePlan
  ].map(x=>vibeDesignEvidenceText(x)).join(' ').slice(0,16000):'';
  const declared=VIBE_UNIVERSAL_CONTENT_CAPABILITIES.filter(row=>row.designSignal.test(body));
  const ready=Boolean(authorized&&verified&&text(gameId));
  const capabilities=declared.map(row=>Object.freeze({
    id:row.id,designEvidence:'APPROVED_GAME_DESIGN_ONLY',
    state:ready?'CANONICAL_SOURCE_OWNER_REVIEW_REQUIRED':'POLICY_OR_DESIGN_BLOCKED',
    contentUnit:row.id==='FLOOR_OR_ROOM'?'OPTIONAL_DESIGN_DEFINED_FLOOR_OR_ROOM'
      :row.id==='HOUSING'?'DESIGN_DEFINED_OWNED_BUILDING'
      :row.id==='RAID_OR_SIEGE'?'DESIGN_DEFINED_EVENT_OR_RAID':'DESIGN_DEFINED_CONTENT_UNIT',
    assetRoles:Object.freeze([...row.assetRoles]),validation:Object.freeze([...row.checks]),
    sourceOwnerMustAlreadyExistOrBeExplicitlyApproved:true,
    originalSourceAndApprovedMechanicsImmutable:true,
    firstPlayableProofRequired:true,created:false,runtimeVerified:false
  }));
  const baseChecks=Object.freeze([
    'APPROVED_MAIN_CORE_LOOP_WITH_REAL_GAME_STATE','REAL_PLAYER_INPUT_AND_OBSERVABLE_RESULT',
    'REAL_SOURCE_OWNER_AND_SOURCE_REVISION','PREEXISTING_RULES_BALANCE_AND_SAVE_UNCHANGED',
    'SAME_ARTIFACT_F0_PROOF_NOT_F9_OR_RUNTIME_PASS'
  ]);
  return Object.freeze({
    version:1,kind:'vibe2-existing-build-up-universal-content-composition',
    gameId:text(gameId),target:unityOwned?'UNITY_WEB':platform,
    authorized:ready,designFingerprint:verified?text(designFingerprint):null,
    sourceRevision:text(sourceRevision)||null,sourceRoot:text(sourceRoot)||null,
    status:!authorized?'OWNER_POLICY_HELD':!verified?'APPROVED_GAME_DESIGN_REQUIRED'
      :!text(gameId)?'GAME_ID_REQUIRED':'CANONICAL_BUILD_UP_SOURCE_WORK_REQUIRED',
    genreRestriction:'NONE',genreDoesNotAutoEnableMechanics:true,
    floorOrDungeonMandatory:false,housingMandatory:false,raidMandatory:false,
    designDeclaredCapabilities:Object.freeze(capabilities),
    f0:Object.freeze({objective:'ONE_AUTHENTIC_FIRST_PLAYABLE_SLICE',checks:baseChecks,
      nativeGameSourceEditRequired:true,proofState:'NOT_EXECUTED',runtimeVerified:false}),
    expansion:Object.freeze({
      stage:'EXISTING_BUILD_UP_F1_TO_F8',
      sequence:Object.freeze(['EXISTING_GAME_SYSTEMS','DESIGN_DEFINED_SPACES_OR_FLOORS',
        'DESIGN_DEFINED_HOUSING_IF_PRESENT','DESIGN_DEFINED_RAID_IF_PRESENT',
        'OTHER_DESIGN_DEFINED_CONTENT','CANONICAL_ASSET_BINDINGS']),
      requiresExactNativeSourceAndSavedState:true,executed:false
    }),
    f9:Object.freeze({checks:Object.freeze(['ACTUAL_GAME_RUNTIME_AND_MOBILE_INPUT',
      'SPAWN_NAV_COLLISION_OR_GENRE_RELEVANT_INPUT','PERSISTENCE_AND_REJOIN_IF_APPLICABLE',
      'NO_GAMEPLAY_BALANCE_OR_AUTHORITY_REGRESSION','EXACT_BUILD_SOURCE_AND_ARTIFACT_EVIDENCE']),
      pass:false,runtimeVerified:false}),
    existingPipelineOnly:true,automaticNewFeatureAuthorization:false,
    requiredExecutionOwner:'EXISTING_GAME_NATIVE_SOURCE',
    algorithmAndDccToolsProvideVisualAndLayoutInputsOnly:true,
    runtimeVerified:false,appliedToGame:false,newQueueCreated:false
  });
}
const VIBE_ROLE_PATTERNS=Object.freeze({
  TERRAIN:/terrain|world|biome|landscape|valley|canyon|cliff|지형|월드|협곡|산|강|숲|바위|지질/i,
  ENVIRONMENT:/environment|forest|weather|nature|환경|자연|숲|날씨|바람/i,
  DUNGEON:/dungeon|room|maze|level|던전|미궁|동굴|방|미로/i,
  BUILDING:/building|architecture|house|town|village|건물|집|마을|건축/i,
  MAP:/map|path|route|level|tile|맵|경로|지도|타일/i,
  ENEMY_AI:/enemy|monster|boss|combat|hostile|몬스터|적|보스|전투/i,
  NPC:/npc|villager|citizen|주민|상인|대화/i,
  CHARACTER:/character|avatar|player|hero|캐릭터|아바타|플레이어|주인공/i,
  CREATURE:/creature|animal|wildlife|pet|monster|크리처|동물|야생|몬스터/i,
  PROP:/prop|object|rock|tree|decoration|소품|오브젝트|돌|나무|장식/i,
  ITEM:/item|weapon|armor|equipment|검|무기|방어구|아이템|장비/i,
  MATERIAL:/material|texture|shader|surface|stone|metal|wood|재질|텍스처|표면|금속|나무/i,
  UI:/interface|hud|button|menu|inventory|ui|버튼|메뉴|인벤토리/i
});
const VIBE_ROLE_FAMILIES=Object.freeze({
  TERRAIN:['TERRAIN','ENVIRONMENT'],ENVIRONMENT:['ENVIRONMENT','TERRAIN'],
  DUNGEON:['BUILDING','ENVIRONMENT'],BUILDING:['BUILDING','PROP'],MAP:['ENVIRONMENT','TERRAIN'],
  ENEMY_AI:['CREATURE','CHARACTER'],NPC:['CHARACTER'],CHARACTER:['CHARACTER'],
  CREATURE:['CREATURE'],PROP:['PROP'],ITEM:['WEAPON','EQUIPMENT','ITEM'],MATERIAL:['MATERIAL','TEXTURE'],UI:['UI']
});
function vibeNormalizedTarget(value=''){
  const raw=text(value).toUpperCase().replace(/[\s-]+/g,'_');
  if(raw==='ROBLOX')return'ROBLOX';
  if(['WEB','GENERAL_WEB','MOBILE_WEB','BROWSER'].includes(raw))return'WEB';
  return raw;
}
function vibeSourceProvenance(asset={}){
  const id=text(asset.id),sourceHash=text(asset.sourceHash||asset.sha256||asset.contentHash);
  const license=text(asset.license||asset.licenseDeclared||asset.policy).toUpperCase();
  const source=Boolean(asset.path||asset.masterGlb||asset.sourceFiles?.length||asset.nativeArtifacts?.length);
  return Boolean(id&&source&&/^[0-9a-f]{64}$/i.test(sourceHash)&&license&&!blockedLicense(license)
    &&asset.securityBlocked!==true&&asset.internalUseForbidden!==true);
}
function vibeMatchingFamilies(asset={},families=[]){
  const family=text(asset.family||asset.category).toUpperCase();
  return families.includes(family);
}
/**
 * Read-only native authoring handoff used by the existing Vibe2 asset production stage.
 * Never executes external binaries, installs tools, mutates a game, or certifies runtime QA.
 */
export function planVibeExternalCustomization({
  request='',target='',gameId='',requirements=[],assets=[],styleBible={},approvedDesign=null,
  approvedDesignFingerprint='',ownerScope=null,sourceRevision='',sourceRoot='',executionSurface='',unityWebDevelopment=false
}={}){
  const unityOwned=unityWebDevelopment===true||/^(?:\.?\/)?unity-games\//i.test(text(sourceRoot).replaceAll('\\','/'))
    ||/UNITY[_-]?WEB|UNITY[_-]?ANDROID/i.test(text(executionSurface));
  const platform=unityOwned?'UNITY_WEB':vibeNormalizedTarget(target);
  const scope=ownerScope&&typeof ownerScope==='object'?ownerScope:null;
  const active=(Array.isArray(scope?.activeTargets)?scope.activeTargets:[]).map(vibeNormalizedTarget);
  const held=(Array.isArray(scope?.ownerHeldTargets)?scope.ownerHeldTargets:[]).map(vibeNormalizedTarget);
  const eligible=scope?.status==='ACTIVE'&&scope?.existingPipelineOnly===true
    &&active.includes(platform)&&!held.includes(platform)&&['ROBLOX','WEB'].includes(platform);
  const selectedRoles=new Set();
  const context=[request,...(Array.isArray(requirements)?requirements:[]).map(row=>
    [row?.family,row?.role,row?.assetRole,row?.subfamily,row?.description].filter(Boolean).join(' ')
  )].join(' ');
  for(const [role,pattern]of Object.entries(VIBE_ROLE_PATTERNS))if(pattern.test(context))selectedRoles.add(role);
  for(const requirement of Array.isArray(requirements)?requirements:[]){
    const family=text(requirement?.family).toUpperCase();
    for(const [role,families]of Object.entries(VIBE_ROLE_FAMILIES))if(families.includes(family))selectedRoles.add(role);
  }
  const style=styleBible&&typeof styleBible==='object'?styleBible:{};
  const declaredDesignFingerprint=text(approvedDesignFingerprint);
  const styleFingerprint=/^(?:sha256:)?[0-9a-f]{64}$/i.test(declaredDesignFingerprint)
    ?declaredDesignFingerprint:'';
  const sourceId=text(sourceRevision);
  const contentComposition=planVibeUniversalComposition({
    approvedDesign,designFingerprint:styleFingerprint,gameId,target:platform,ownerScope:scope,
    sourceRoot,sourceRevision:sourceId,executionSurface,unityWebDevelopment
  });
  if(contentComposition.authorized){
    for(const capability of contentComposition.designDeclaredCapabilities){
      for(const role of capability.assetRoles)selectedRoles.add(role);
    }
  }
  const validAssets=(Array.isArray(assets)?assets:[]).filter(vibeSourceProvenance)
    .sort((a,b)=>text(a.id).localeCompare(text(b.id)));
  const approvedVisualAxes=Object.freeze(['SILHOUETTE','PROPORTION','MATERIAL_RESPONSE','SURFACE_DETAIL','PALETTE','LIGHTING','MOTION_LANGUAGE','UI_LANGUAGE']);
  const actions=VIBE_EXTERNAL_CUSTOMIZATION_REFERENCES.map(reference=>{
    const suggestedRoles=reference.roles.filter(role=>selectedRoles.has(role));
    // 제약조합(WFC)과 전술 경로탐색(A*)은 모든 맵에 무조건 호출하지 않는다.
    const matchingRoles=reference.id==='WAVE_FUNCTION_COLLAPSE'
      &&!selectedRoles.has('DUNGEON')&&!selectedRoles.has('BUILDING')?[]
      :reference.id==='ASTAR_PATHFINDING'
      &&!selectedRoles.has('ENEMY_AI')&&!selectedRoles.has('NPC')?[]
      :suggestedRoles;
    const families=[...new Set(matchingRoles.flatMap(role=>VIBE_ROLE_FAMILIES[role]||[]))];
    const sourceCandidates=validAssets.filter(asset=>vibeMatchingFamilies(asset,families));
    const verifiedSources=sourceCandidates.filter(asset=>
      asset.verifiedCompanyReusable===true||asset.runtimeVerificationState==='VERIFIED_RUNTIME'
    );
    const requiresNativeBindings=matchingRoles.some(role=>!['UI','MATERIAL'].includes(role));
    const styleProfile=text(style.profileKey||style.styleFamily||'');
    const relevant=matchingRoles.length>0;
    const status=!eligible?'OWNER_POLICY_HELD'
      :!relevant?'NOT_REQUIRED_BY_CURRENT_GAME'
      :!styleFingerprint?'APPROVED_GAME_DESIGN_REQUIRED'
      :reference.kind==='ALGORITHM'?'EXISTING_OWNER_ALGORITHM_REVIEW_REQUIRED'
      :reference.kind==='AUTHORING_TOOL'?'EXTERNAL_TOOL_AUTHORIZATION_AND_LOCAL_AVAILABILITY_REQUIRED'
      :'EXTERNAL_LICENSE_AND_SOURCE_REVIEW_REQUIRED';
    return Object.freeze({
      id:reference.id,kind:reference.kind,sourceUrl:reference.sourceUrl,
      responsibleOwner:reference.owner,integration:reference.integration,
      roles:Object.freeze(matchingRoles),status,
      existingVerifiedSourceCount:verifiedSources.length,
      sourceCandidates:Object.freeze(verifiedSources.slice(0,8).map(asset=>Object.freeze({
        assetId:text(asset.id),sourceHash:text(asset.sourceHash||asset.sha256||asset.contentHash),
        license:text(asset.license||asset.licenseDeclared||asset.policy),
        derivative:Object.freeze({
          status:eligible&&styleFingerprint?'NATIVE_AUTHORING_SOURCE_REVIEW_REQUIRED':'POLICY_OR_DESIGN_BLOCKED',
          gameId:text(gameId),sourceAssetId:text(asset.id),designFingerprint:styleFingerprint,
          target:platform,approvedStyleProfile:styleProfile,
          visualAxes:Object.freeze((Array.isArray(asset.adaptationAxes)?asset.adaptationAxes:approvedVisualAxes)
            .map(axis=>text(axis).toUpperCase()).filter(axis=>approvedVisualAxes.includes(axis))),
          existingSourceMustRemainImmutable:true,outputArtifactHashRequired:true,
          actualNativeSourceBindingRequired:true,gameplayAuthority:false,
          runtimeVerified:false,createdArtifact:false
        })
      }))),
      nextAction:relevant&&eligible&&styleFingerprint
        ?reference.kind==='ALGORITHM'?'MAP_PARAMETERS_TO_EXISTING_NATIVE_ALGORITHM_OWNER'
          :'VERIFY_TOOL_LICENSE_BINARY_AND_SOURCE_IN_EXISTING_ASSET_DEVELOPMENT'
        :'NONE',
      parameters:Object.freeze({
        gameId:text(gameId),target:platform,styleProfile,
        approvedDesignFingerprint:styleFingerprint,sourceRevision:sourceId,
        preserveExistingGameplayAndSave:true,requiresNativeBindings
      }),
      externalExecutionPerformed:false,gameSourceModified:false,
      nativeRuntimeVerified:false,licenseReviewRequired:reference.licenseReviewRequired,
      availableForAutomaticInstallation:false
    });
  });
  return Object.freeze({
    version:1,kind:'vibe2-existing-asset-external-customization',
    gameId:text(gameId),target:platform,authorized:eligible,
    authority:'company-learning/platform-release-roadmap.json#ownerActiveDevelopmentScope20261009',
    status:eligible?(styleFingerprint?'EXISTING_ASSET_PRODUCTION_HANDOFF_REQUIRED':'APPROVED_GAME_DESIGN_REQUIRED'):'OWNER_POLICY_HELD',
    roles:Object.freeze([...selectedRoles].sort()),referenceCount:actions.length,
    contentComposition,
    references:Object.freeze(actions),existingVerifiedSourceCount:validAssets.filter(asset=>
      asset.verifiedCompanyReusable===true||asset.runtimeVerificationState==='VERIFIED_RUNTIME').length,
    sourceRevision:sourceId||null,designFingerprint:styleFingerprint||null,
    applicationOrder:Object.freeze(['REUSE_VERIFIED_LIBRARY','DERIVE_APPROVED_NATIVE_VARIANT',
      'RECOMBINE_SOURCE_COMPATIBLE_PARTS','REVIEW_LICENSED_EXTERNAL_ALGORITHM_OR_TOOL','NATIVE_BINDING','EXACT_RUNTIME_QA']),
    sourceHashesRequired:true,externalInstallRequiresExplicitAuthorization:true,
    requireExactRuntimeVisualAndInputEvidence:true,sourceMutationPerformed:false,
    nativeRuntimeVerified:false,appliedToGame:false,qaPassed:false,
    rollbackContract:'EXISTING_WORKSPACE_CHECKPOINT_RESTORE_ON_FAILURE',
    preserved:Object.freeze(['CORE_RULES','BALANCE','PROGRESSION','SAVE_KEYS','SERVER_AUTHORITY','SOURCE_ORIGINAL']),
    newQueueOrShadowPipelineCreated:false
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
    const sources = [asset?.path, asset?.masterGlb, asset?.meshArtifact, asset?.robloxAssetId,
      ...(Array.isArray(asset?.nativeArtifacts) ? asset.nativeArtifacts : [])];
    const hasSource = sources.some((value) => Boolean(text(value)))
      || Boolean(asset?.platformVariants && Object.keys(asset.platformVariants).length);
    return Boolean(text(asset?.id)) && asset?.downloaded !== false
      && hasSource && !blockedLicense(license);
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
    sourceBindingRequired:true,
    nativeRuntimeVerificationRequired:true,
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
    sourceBindingVerified:false,
    nativeRuntimeVerified:false,
    appliedToGame:false,
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
