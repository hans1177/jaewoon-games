// 파일명: qa/company-design-gate-scoring-v2.test.mjs
// 설계 게이트 점수와 필수 문법·멀티·공간 그래픽 회귀 검증
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {computeVibeSeedProposal} from '../tools/company-game-seed-bootstrap.mjs';
import {repairDesignRequiredFields} from '../tools/company-design-prepromotion-repair.mjs';
import {CAUSAL_DNA_LIBRARY} from '../tools/game-seed-state.mjs';
import {classifyRobloxGenre} from '../tools/roblox-genre-profile.mjs';
import {buildConceptSystemBlueprint} from '../tools/company-vibe2-game-flow-architect.mjs';
import {designPlayabilityRequirements,DESIGN_GATE_WEIGHTS,DESIGN_DIRECT_SCORE_LEVELS,DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,scoreDesignGateV2,validateDesignAuthoringContent} from '../tools/company-design-gate-scoring-v2.mjs';

// 검증기는 명시적으로 선택된 현재 중앙정책만 읽는다. 테스트에서도 동일 원본을 지정한다.
process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH ||= fileURLToPath(new URL('../company-learning/platform-release-roadmap.json',import.meta.url));

assert.equal(Object.keys(DESIGN_GATE_WEIGHTS).length,11);
assert.equal(Object.values(DESIGN_GATE_WEIGHTS).reduce((a,b)=>a+b,0),100);
assert.deepEqual([...DESIGN_DIRECT_SCORE_LEVELS],[0,20,40,60,80,100]);
assert.equal(DESIGN_CRITICAL_AXIS_MINIMUM_PERCENT,75);

const seed={
  seedId:'SEED-ROBLOX-TEST-001',generation:'MATERIAL_COMPOSED',SEED_MATERIAL_IDS:['MAT-001','MAT-002'],
  GAME_CATEGORY:'ACTION_SURVIVAL_ROGUELITE',INITIAL_TARGET_PLATFORM:'ROBLOX',MULTIPLAYER_DESIGN_MODE:'COOP'
};
const content={
  identity:'A distinct survival action game where every expedition changes the safe route, threat map, and equipment decision before the player commits to the next risk.',
  playerFantasy:'Read a dangerous world, prepare a build, take a calculated risk, survive the consequence, and return stronger.',
  coreFun:'Moment-to-moment survival choices connect movement, combat pressure, resources, upgrades, and recovery into one loop.',
  coreLoop:['Enter a risky region and choose a route based on visible threats and resources.','Fight or evade threats while spending limited resources and changing world state.','Convert the result into upgrades and route options before committing to another run.','Reach a milestone encounter that changes available systems and future choices.'],
  signatureSystems:[
    {id:'ROUTE_MAIN',grammarRole:'MAIN',stateInputs:['RunState'],stateOutputs:['RunState'],name:'Threat Route',purpose:'Connect actual route selection to enemy pressure and resource access during the same expedition.',playerChoice:'Choose safety, speed, or reward before entering danger while sharing the server-owned encounter state.'},
    {id:'LOADOUT_A',grammarRole:'A',stateInputs:['RunState'],stateOutputs:['RunState'],name:'Recovery Loadout',purpose:'Connect earned resources to the next survival plan with server-authoritative equipment choices.',playerChoice:'Spend on immediate recovery or long-term build strength while preserving the player save.'},
    {id:'THREAT_B',grammarRole:'B',stateInputs:['RunState'],stateOutputs:['RunState'],name:'Escalation State',purpose:'Connect player success and party pressure to stronger world responses and retreat decisions.',playerChoice:'Push deeper or extract before risk overtakes reward and inform the cooperative party.'},
    {id:'WEATHER_c',grammarRole:'c',stateInputs:['RunState'],stateOutputs:['RunState'],name:'Weather Threat Variation',purpose:'Existing weather and light exposure vary the readable route risk without changing baseline combat damage.',playerChoice:'Decide whether reduced visibility makes a previously safe route too risky to explore.'},
    {id:'DISCOVERY_DELVE',grammarRole:'DELVE',stateInputs:['RunState'],stateOutputs:['RunState'],name:'Hidden Route Mastery',purpose:'Existing world landmarks and persistent exploration memories reveal alternative routes worth revisiting.',playerChoice:'Test a discovered route combination on the next run and compare the visible risk feedback.'}
  ],
  progressionDirection:'Runs produce resources, unlocks, and strategic options while keeping recovery costs and enemy escalation tied to player power.',
  visualDirection:'Readable silhouettes, danger zones, resource landmarks, and consistent combat feedback keep survival decisions legible on mobile.',
  mobileUx:'Touch input separates movement and actions, keeps critical threat information near the play field, and avoids overlapping controls.',
  marketTargetDirection:'Global action-survival players who prefer short readable decisions with persistent progression.',
  steamExpansionDecision:'Platform expansion is evaluated after the Roblox core loop is validated.',
  multiplayerMode:'COOP',
  multiplayerExpansionDecision:'Two real players cooperate against regional threats with server-authoritative encounter state, roster replication and reconnect while preserving approved solo progression.',
  technicalAssumptions:['Server-authoritative rewards are isolated from client presentation.','Core combat, progression, and retry state expose deterministic validation hooks.','Mobile input and viewport constraints are treated as first-class implementation requirements.'],
  validationQuestions:['Does a complete run connect route, threat, resource, reward, failure, and retry state?','Can the player recover from failure without invalidating progression?','Does mobile input preserve the same core decisions as desktop input?'],
  openQuestions:[],
  systemInterconnections:[
    {fromSystem:'Route selection',toSystem:'Threat director',trigger:'Player commits to a route',stateChange:'Threat density and enemy composition update for that route.'},
    {fromSystem:'Threat director',toSystem:'Resource economy',trigger:'Threat encounter resolves',stateChange:'Resource reward and recovery cost change from the result.'},
    {fromSystem:'Resource economy',toSystem:'Progression',trigger:'Player extracts or fails',stateChange:'Upgrade choices and next-run options are recalculated.'},
    {fromSystem:'Progression',toSystem:'Route selection',trigger:'New capability unlocks',stateChange:'Previously unsafe routes become viable choices.'}
  ],
  progressionEconomyBalance:{
    progressionLoop:'Run result becomes resources, resources become upgrades or recovery, and upgrades change the next route decision.',
    resourceFlow:'Rewards enter through encounters and milestones and leave through recovery, equipment, and progression choices.',
    balanceRules:'Enemy escalation, recovery cost, and upgrade strength are checked together so one system cannot erase risk.'
  },
  contentExpansionPlan:[
    {milestone:'Early route-risk foundation',newGameplay:'Introduce route risk and one recovery tradeoff.',systemImpact:'Connect movement, threats, resources, and retry.'},
    {milestone:'Mid build diversification',newGameplay:'Add enemy behavior and build choices that alter route viability.',systemImpact:'Expand progression and threat-system dependencies.'},
    {milestone:'Late extraction pressure',newGameplay:'Add milestone encounters with extraction pressure and new strategic dimensions.',systemImpact:'Change pacing, risk, rewards, and subsequent route options.'},
    {milestone:'Extended regional rule expansion',newGameplay:'Add new region rules rather than numeric-only variants.',systemImpact:'Require new cross-system choices while preserving the validated core.'}
  ],
  failureRetryRisk:{failureStates:['Player health reaches zero during an encounter.','Player exhausts recovery resources before extraction.'],retryFlow:'Failure records the result, returns the player to preparation, and preserves only approved persistent progression.',riskPressure:'Deeper routes raise threat and recovery cost while offering better strategic rewards.',recoveryRules:'Recovery spends bounded resources and cannot directly skip the next gameplay cycle.'},
  platformFitPlan:{targetPlatform:'ROBLOX',inputModel:'Touch and keyboard map to the same movement and core actions without changing rules.',performanceBudget:'Entity and effect counts have explicit caps suitable for mobile Roblox clients.',sessionConstraints:'A complete playable cycle is prioritized first; thirty-minute depth is validated only at the final content-depth gate.'},
  platformProfiles:{
    ROBLOX:{
      platform:'ROBLOX',
      inputModel:'Roblox touchscreen and physical inputs share server validated movement and cooperative actions.',
      sessionModel:'Roblox server-owned two-player join and reconnect with bounded mobile lobby waiting.',
      multiplayerRuntime:'Two actual Roblox clients in one server use authoritative shared encounter state.',
      performanceBudget:'Mobile Roblox budget caps enemies effects and replicated roster update frequency.',
      uiUx:'Roblox ScreenGui leaves visible safe touch areas for party and survival feedback.',
      saveAndNetwork:'RemoteEvent validates actions and DataStore preserves existing individual progress.',
      platformContentAdaptation:'Avatar-sized 3D route and readable hazard telegraphs use existing Roblox world.',
      internalReleaseTarget:'Private Roblox test place with restricted participant access for owner QA.',
      validationEvidence:'Exact Roblox version with two-client join action result reconnect and independent QA.'
    },
    UNITY:{
      platform:'UNITY',
      inputModel:'Unity Input System supports mobile gesture and gamepad input on the same source scenes.',
      sessionModel:'Unity WebGL browser and Android app resume with stable shared room participation.',
      multiplayerRuntime:'Unity client uses server-authoritative two-client room events and reconnect state.',
      performanceBudget:'Mobile WebGL GPU and memory budgets cap lights VFX and visible objects.',
      uiUx:'Unity canvas provides mobile safe areas while world input stays available.',
      saveAndNetwork:'Versioned persistent profile and verified server room actions are kept separate.',
      platformContentAdaptation:'Original Unity scene owns gameplay on Android and WebGL with spatial depth.',
      internalReleaseTarget:'Private Unity Android closed build and QA-only WebGL browser validation.',
      validationEvidence:'Exact WebGL and Android builds with real two-client play and visual regression.',
      unityWebSpatialPresentation:{
        dimension:'2.5D',
        worldDepth:'The actual Unity scene layers interactive foreground and background geometry in depth with height cues.',
        cameraAndOcclusion:'An orthographic depth camera sorts world geometry and characters with actual foreground occlusion.',
        lightingAndMaterials:'Grounded directional light and material roughness create shadows under world actors.',
        mobileWebglEvidence:'Mobile browser Unity WebGL playtest checks actual world depth shadow occlusion input and before after frames.'
      }
    }
  },
  uxAccessibilityPlan:{hudPriorities:'Objective, health, risk, and available action state remain visible without covering the play field.',touchAndInput:'Primary touch targets remain separated and simultaneous movement plus action input is supported.',readability:'Threat, reward, and interactable states use shape, motion, and text rather than color alone.',accessibility:'Critical feedback has redundant visual and textual signals and avoids time-only information where practical.'},
  artAudioDirection:{visualIdentity:'World landmarks and enemy silhouettes reinforce route and threat decisions.',audioIdentity:'Layered cues distinguish danger escalation, reward confirmation, failure, and recovery.',gameplayFeedbackSync:'Animation, VFX, UI, and sound fire from the same gameplay state transitions.'},
  implementationTraceability:[
    {designElement:'Threat route choice',responsibleSystem:'route-and-threat state',validationEvidence:'Record route commit and resulting threat-state transition.'},
    {designElement:'Reward and recovery tradeoff',responsibleSystem:'economy-and-progression state',validationEvidence:'Record earned resources, spend choice, and next-run capability change.'},
    {designElement:'Failure and retry',responsibleSystem:'run lifecycle state',validationEvidence:'Record fail condition, retained progression, reset state, and next valid entry.'},
    {designElement:'Mobile controls',responsibleSystem:'input adapter',validationEvidence:'Validate simultaneous movement and action with no viewport overlap.'}
  ]
};
const designRecord={version:5,sameModelAsDraft:true,unresolvedConflictCount:0,heldCount:0,content};
const cycleStatus={status:'COMPLETE'};
const profile={genre:'Survival',subgenre:'',playMode:'COOP'};
const strong=scoreDesignGateV2({seed,designRecord,cycleStatus,robloxGenreProfile:profile});
assert.equal(strong.scoreSystem,'STAGE_GATE_SCORING_V2');
assert.equal(Object.keys(strong.evidenceLevels).length,11);
assert.equal(strong.criticalAxisFailures.length,0);
assert.equal(strong.hardFailures.includes('CRITICAL_AXIS_MINIMUM_FAIL'),false);
assert.equal(strong.hardFailures.includes('30MIN_CONTENT_FAIL'),false);
assert.equal(strong.thirtyMinuteHardGateApplied,false);
assert.ok(strong.totalScore>=80);
for(const value of Object.values(strong.evidenceLevels))assert.ok(DESIGN_DIRECT_SCORE_LEVELS.includes(value));

// 웹 제작이 없어도 이전 Unity 시드는 앱 네이티브 플랫폼 프로필로 설계 검수를 받는다.
const heldUnitySeed={...seed,INITIAL_TARGET_PLATFORM:'UNITY'};
const heldUnityRecord=structuredClone(designRecord);
heldUnityRecord.content.platformFitPlan.targetPlatform='UNITY';
heldUnityRecord.content.platformProfiles.UNITY={
  ...heldUnityRecord.content.platformProfiles.UNITY,
  sessionModel:'Unity Android native session and resume remain on owner hold.',
  performanceBudget:'Unity Android GPU CPU thermals memory and mobile input budgets are deferred until owner release.',
  internalReleaseTarget:'Unity Android native build is owner held; no Unity WebGL production is requested.',
  validationEvidence:'No app or browser runtime PASS is claimed before explicit owner authorization.'
};
delete heldUnityRecord.content.platformProfiles.UNITY.unityWebSpatialPresentation;
const heldUnityScore=scoreDesignGateV2({seed:heldUnitySeed,designRecord:heldUnityRecord,cycleStatus,robloxGenreProfile:profile});
assert.ok(heldUnityScore.evidenceLevels.PLATFORM_FIT_DESIGN>=80,'native platform match must not create the old 60-point mismatch');
assert.equal(heldUnityScore.hardFailures.includes('CRITICAL_AXIS_MINIMUM_FAIL'),false,'held Unity WebGL cannot be a basic-design admission gate');

const grammarSeed=structuredClone(seed);
grammarSeed.GAMEPLAY_SKETCH={version:4,novelGameGrammar:{
  newPrimaryVerb:'오해를 설득해 현실로 만든다',
  worldRule:'공동 믿음이 공간 규칙이 된다.',
  causalDNAs:[{id:'COMEDIC_MISUNDERSTANDING'},{id:'TESTIMONY_CONSENSUS_REALITY'}],
  gameplaySystemFusion:{
    formula:'MAIN × A × B × c',
    main:{name:'설득'},
    majorAxes:[{key:'A',name:'증언 네트워크'},{key:'B',name:'공간 퍼즐'}],
    subElements:[{name:'평판'},{name:'시간대'}]
  },
  delveLayer:{elements:[{name:'거짓말 연쇄'},{name:'권위자 역이용'}]},
  emergentGenre:{name:'합의현실 소문 퍼즐극',categoryRole:'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE'}
}};
const grammarDesign=structuredClone(designRecord);
grammarDesign.content.identity+=' 합의현실 소문 퍼즐극 오해를 설득해 현실로 만든다 COMEDIC_MISUNDERSTANDING TESTIMONY_CONSENSUS_REALITY 설득 증언 네트워크 공간 퍼즐 평판 거짓말 연쇄';
const grammarPass=scoreDesignGateV2({seed:grammarSeed,designRecord:grammarDesign,cycleStatus,robloxGenreProfile:profile});
assert.equal(grammarPass.hardFailures.includes('NOVEL_GRAMMAR_DILUTED'),false);
assert.equal(grammarPass.grammarCarryEvidence.formula,'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @');
assert.deepEqual(grammarPass.grammarCarryEvidence.carriedMajorAxes,['증언 네트워크','공간 퍼즐']);
assert.ok(grammarPass.grammarCarryEvidence.carriedSubElements.includes('평판'));
assert.ok(grammarPass.grammarCarryEvidence.carriedDelveElements.includes('거짓말 연쇄'));
assert.equal(grammarPass.grammarCarryEvidence.emergentGenreCarried,true);
const v5Seed=structuredClone(grammarSeed);
v5Seed.GAMEPLAY_SKETCH.version=5;
const v5Fusion=v5Seed.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion;
v5Fusion.formula='MAIN × A × B × C';
v5Fusion.majorAxes[0].sourceMaterial='희극적 오해';
v5Fusion.majorAxes[1].sourceMaterial='인식론';
v5Fusion.themeFusion={
  themes:[{name:'철학',kind:'MATERIAL'},{name:'엽기',kind:'MATERIAL'}],
  genres:[{role:'PRIMARY',name:'미스터리'},{role:'SECONDARY',name:'코믹'}]
};
const authoredV5=structuredClone(grammarDesign);
authoredV5.content.creativeGrammar={
  mainIdentity:'소문을 현실로 바꾸며 그 결과를 추리하는 퍼즐극',
  a:{system:'증언 네트워크',material:'희극적 오해',materialDomain:'연극',stateChange:'소문의 전달 순서에 따라 사람의 믿음과 공간 상태가 달라진다.'},
  b:{system:'공간 퍼즐',material:'인식론',materialDomain:'철학',stateChange:'증언의 임계값에 따라 문이 열리고 다시 소문의 신뢰도가 변한다.'},
  abCausality:'증언이 공간 상태를 바꾸며 바뀐 공간에 따라 새로운 증언과 거짓말의 비용이 달라진다.',
  materialFusion:{
    contrast:'희극적 오해와 인식론의 낯선 결합이 단순한 설득 퍼즐을 사회적 현실 변화 게임으로 바꾼다.',
    causalBridge:'주민의 웃긴 오해가 진실의 신뢰도를 바꾸고 그 신뢰도가 지도 구조에 반영된다.',
    removalConsequence:'오해를 제거하면 장소가 바뀌지 않고 인식론을 제거하면 소문을 검증할 추리 규칙이 사라진다.'
  },
  storyCausalChain:{
    cause:'마을의 소문은 특정 사람이 거짓 증언을 반복하면서 시작되었다.',
    characterConflict:'마을의 여러 주민은 자신의 체면과 가족을 보호하려고 다른 증언을 믿는다.',
    playerChoice:'누구의 소문을 먼저 폭로하거나 역이용할지 주인공이 결정한다.',
    worldChange:'폭로의 순서에 따라 마을 지도에 새 통로가 열리거나 안전한 경로가 막힌다.',
    nextEvent:'그 지도 변경 때문에 다른 주민의 의심을 받아 다음 사건과 목표가 발생한다.'
  },
  abEvolution:{
    aChangesB:'누구에게 먼저 소문을 퍼뜨리는지에 따라 공간 퍼즐의 열리는 문과 보상이 변화한다.',
    bChangesA:'공간 퍼즐을 다른 순서로 풀면 주민들의 증언 신뢰도가 달라져 다음 대화 선택이 바뀐다.',
    lateGameChange:'후반에는 지역 두 곳의 증언과 공간 규칙을 동시에 설계해 병렬 해결법이 열린다.'
  },
  cThemes:[{name:'철학',kind:'MATERIAL',gameplayEffect:'진실과 책임의 윤리가 증언 평가 비용을 바꾼다.'},{name:'엽기',kind:'MATERIAL',gameplayEffect:'비정상적인 오해가 숨겨진 경로를 드러낸다.'}],
  cGenres:[{role:'PRIMARY',name:'미스터리',gameplayEffect:'다양한 단서의 진위를 검증하는 추리가 중심 목표를 이룬다.'},{role:'SECONDARY',name:'코믹',gameplayEffect:'우스운 오해가 현장 증언과 공간 퍼즐의 해법을 실제로 바꾼다.'}],
  cGenreInterlock:'진실을 찾는 미스터리 과정에 코믹한 오해를 섞으면 증언의 신뢰와 접근 경로가 바뀐다.',
  cWorldAndGameplayEffect:'철학과 엽기가 만든 사회적 금기가 탐색, 설득, 공간 전개를 변화시킨다.',
  delveDiscoveries:[
    {clue:'폐교 서고의 기록을 주민의 반대 증언과 비교한다.',discovery:'낡은 지도에 지워진 비밀 통로의 개방 조건을 알아낸다.',newChoice:'기록을 공개하는 대신 지도를 바꿔 안전한 잠입 경로로 이동한다.'},
    {clue:'시장 공연이 끝날 때마다 같은 가짜 소문이 퍼지는 원인을 관찰한다.',discovery:'웃음의 강도에 따라 증언 신뢰도가 뒤바뀌는 법칙을 파악한다.',newChoice:'공연 순서를 조정해 주민의 의심을 다른 증인에게 돌린다.'},
    {clue:'재판 기록에 숨겨진 모순과 증언 순서의 영향을 추적한다.',discovery:'진실을 먼저 밝힐수록 특정 문이 영구 봉쇄되는 규칙을 발견한다.',newChoice:'일부 진실을 보류하고 우회 증거를 모아 봉쇄를 해제한다.'},
    {clue:'옛 마을로 돌아왔을 때 소문이 달라진 장소를 조사한다.',discovery:'과거 선택을 증언으로 되살리면 지역 배치를 역전할 수 있음을 확인한다.',newChoice:'과거 관계를 수정해 새로운 협상 루트와 귀환 선택지를 연다.'}
  ],
  delveGrowthRule:'새 발견과 숙련 단계마다 두 시스템을 교차 응용해 끝없는 고급 운용을 추가한다.',
  finalGameIdentity:'철학과 엽기 소재, 미스터리와 코믹 장르를 합친 증언 현실변형 퍼즐극'
};
const v5Score=scoreDesignGateV2({seed:v5Seed,designRecord:authoredV5,cycleStatus,robloxGenreProfile:profile});
assert.equal(v5Score.hardFailures.includes('DESIGN_C_PRIMARY_SECONDARY_GENRES_REQUIRED'),false);
assert.equal(v5Score.grammarCarryEvidence.creativityCarried,true);
const repeatedCTheme=structuredClone(authoredV5);
repeatedCTheme.content.creativeGrammar.cThemes[1].name='철학';
assert.ok(scoreDesignGateV2({seed:v5Seed,designRecord:repeatedCTheme,cycleStatus,robloxGenreProfile:profile}).hardFailures.includes('DESIGN_C_TWO_TOPICS_REQUIRED'));
const genreInMaterialSlot=structuredClone(authoredV5);
genreInMaterialSlot.content.creativeGrammar.cThemes[0].kind='GENRE';
assert.ok(scoreDesignGateV2({seed:v5Seed,designRecord:genreInMaterialSlot,cycleStatus,robloxGenreProfile:profile}).hardFailures.includes('DESIGN_C_TWO_TOPICS_REQUIRED'));
const repeatedSystem=structuredClone(authoredV5);
repeatedSystem.content.creativeGrammar.b.system=repeatedSystem.content.creativeGrammar.a.system;
assert.ok(scoreDesignGateV2({seed:v5Seed,designRecord:repeatedSystem,cycleStatus,robloxGenreProfile:profile}).hardFailures.includes('DESIGN_A_B_SYSTEM_DISTINCTNESS_MISSING'));
const repeatedDelve=structuredClone(authoredV5);
const repeatedDiscovery=repeatedDelve.content.creativeGrammar.delveDiscoveries[0];
repeatedDelve.content.creativeGrammar.delveDiscoveries=Array.from({length:4},(_,i)=>({
  clue:repeatedDiscovery.clue+' '+i,
  discovery:repeatedDiscovery.discovery+' '+i,
  newChoice:repeatedDiscovery.newChoice+' '+i
}));
assert.ok(scoreDesignGateV2({seed:v5Seed,designRecord:repeatedDelve,cycleStatus,robloxGenreProfile:profile}).hardFailures.includes('DESIGN_UNBOUNDED_DELVE_DEPTH_MISSING'));
// V5에는 더 이상 소문자 c 보조 시스템을 강제하지 않는다. C 소재·장르 검증은 별도로 유지한다.
// 아직 시스템 간에 공통 입출력 키가 없는 V5는 연결 조각 작성 전에 되돌려 수리한다.
const v5HandoffSeed={GAMEPLAY_SKETCH:{version:5}};
const noSharedStateRules=['MAIN','A','B','DELVE'].map((grammarRole,index)=>({
  id:'RULE_'+index,grammarRole,name:'Rule '+index,
  purpose:'Player choices must affect a connected approved system.',
  playerChoice:'Choose an action based on current world state.',
  stateInputs:['ResourceBefore'],stateOutputs:['ResourceAfter']
}));
const noHandoffReview=validateDesignAuthoringContent({seed:v5HandoffSeed,design:{signatureSystems:noSharedStateRules},fields:['signatureSystems']});
assert.ok(noHandoffReview.some(row=>row.code==='DESIGN_RULE_STATE_HANDOFF_UNAVAILABLE'));
const sharedStateRules=noSharedStateRules.map(row=>({...row,stateInputs:['SharedWorldState'],stateOutputs:['SharedWorldState']}));
const proseKeyV5=sharedStateRules.map(row=>({...row}));
proseKeyV5[0]={...proseKeyV5[0],stateInputs:['incoming wave pattern analysis']};
assert.ok(validateDesignAuthoringContent({seed:v5HandoffSeed,design:{signatureSystems:proseKeyV5},fields:['signatureSystems']})
  .some(row=>row.code==='DESIGN_STATE_KEY_IS_INSTRUCTION'));

assert.equal(validateDesignAuthoringContent({seed:v5HandoffSeed,design:{signatureSystems:sharedStateRules},fields:['signatureSystems']})
  .some(row=>row.code==='DESIGN_RULE_STATE_HANDOFF_UNAVAILABLE'),false);
const oneWayRules=sharedStateRules.map(row=>({...row}));
oneWayRules[1]={...oneWayRules[1],stateInputs:['AInput'],stateOutputs:['AOutput']};
assert.ok(validateDesignAuthoringContent({seed:v5HandoffSeed,design:{signatureSystems:oneWayRules},fields:['signatureSystems']})
  .some(row=>row.code==='DESIGN_RULE_STATE_HANDOFF_UNAVAILABLE'));
assert.equal(validateDesignAuthoringContent({seed:{GAMEPLAY_SKETCH:{version:4}},design:{signatureSystems:noSharedStateRules},fields:['signatureSystems']})
  .some(row=>row.code==='DESIGN_RULE_STATE_HANDOFF_UNAVAILABLE'),false);

const withoutLegacyC=structuredClone(authoredV5);
withoutLegacyC.content.signatureSystems=withoutLegacyC.content.signatureSystems.filter(row=>row.grammarRole!=='c');
const withoutLegacyCScore=scoreDesignGateV2({seed:v5Seed,designRecord:withoutLegacyC,cycleStatus,robloxGenreProfile:profile});
assert.equal(withoutLegacyCScore.hardFailures.includes('DESIGN_MAIN_A_B_DELVE_REQUIRED'),false);
const legacyCRequired=scoreDesignGateV2({seed:grammarSeed,designRecord:{...grammarDesign,content:{...grammarDesign.content,signatureSystems:withoutLegacyC.content.signatureSystems}},cycleStatus,robloxGenreProfile:profile});
assert.ok(legacyCRequired.hardFailures.includes('DESIGN_MAIN_A_B_c_DELVE_REQUIRED'));


const placeholderV5=structuredClone(v5Seed);
placeholderV5.novelGrammarBackfill={version:5,source:'CANONICAL_OWNER_MAIN_A_B_C_UNBOUNDED_DELVE_20261009',authoringPending:true};
const placeholderGrammar=placeholderV5.GAMEPLAY_SKETCH.novelGameGrammar;
placeholderGrammar.newPrimaryVerb='AUTO_INTAKE_NOT_AUTHORED';
placeholderGrammar.worldRule='AUTO_INTAKE_NOT_AUTHORED_WORLD_RULE';
placeholderGrammar.causalDNAs[0].id='AUTO_INTAKE_NOT_AUTHORED_DNA';
placeholderGrammar.emergentGenre.name='AUTO_INTAKE_NOT_AUTHORED_GENRE';
placeholderGrammar.gameplaySystemFusion.main.name='AUTO_INTAKE_NOT_AUTHORED_MAIN';
placeholderGrammar.gameplaySystemFusion.majorAxes[0].name='AUTO_INTAKE_NOT_AUTHORED_A';
placeholderGrammar.gameplaySystemFusion.majorAxes[0].sourceMaterial='';
placeholderGrammar.gameplaySystemFusion.majorAxes[1].name='AUTO_INTAKE_NOT_AUTHORED_B';
placeholderGrammar.gameplaySystemFusion.majorAxes[1].sourceMaterial='';
placeholderGrammar.gameplaySystemFusion.themeFusion={themes:[],genres:[],genreInterlock:'',jointWorldRule:'',abGameplayEffect:''};
const pendingV5Review=scoreDesignGateV2({seed:placeholderV5,designRecord:authoredV5,cycleStatus,robloxGenreProfile:profile});
assert.equal(pendingV5Review.pendingSeedGrammarNotAuthored,true);
assert.equal(pendingV5Review.pendingSeedStillRequiresCreativeDesign,true);
assert.equal(pendingV5Review.grammarCarryEvidence,null);
assert.equal(pendingV5Review.hardFailures.includes('NOVEL_GRAMMAR_DILUTED'),false);
assert.equal(pendingV5Review.hardFailures.includes('DESIGN_C_PRIMARY_SECONDARY_GENRES_REQUIRED'),false);
const pendingMalformed=structuredClone(authoredV5);
pendingMalformed.content.creativeGrammar.cGenres.pop();
assert.ok(scoreDesignGateV2({seed:placeholderV5,designRecord:pendingMalformed,cycleStatus,robloxGenreProfile:profile})
  .hardFailures.includes('DESIGN_C_PRIMARY_SECONDARY_GENRES_REQUIRED'));
const flaggedButAuthored=structuredClone(v5Seed);
flaggedButAuthored.novelGrammarBackfill=structuredClone(placeholderV5.novelGrammarBackfill);
for(const [index,axis] of flaggedButAuthored.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.majorAxes.entries()){
  axis.systemFamily=index?'PUZZLE_STATE':'NPC_INTERACTION';
  axis.sourceDomain=index?'PHILOSOPHY':'THEATRE';
  axis.materialRule=index?'증언 신뢰도가 공간 퍼즐의 접근 조건을 바꾼다.':'희극적 오해가 증언 전달과 대화의 다음 선택 비용을 바꾼다.';
}
const flaggedStillPending=scoreDesignGateV2({seed:flaggedButAuthored,designRecord:authoredV5,cycleStatus,robloxGenreProfile:profile});
assert.equal(flaggedStillPending.pendingSeedGrammarNotAuthored,true,'filled fields cannot erase authoringPending');
assert.equal(flaggedStillPending.grammarCarryEvidence,null);
const confirmedAuthored=structuredClone(flaggedButAuthored);
confirmedAuthored.novelGrammarBackfill.authoringPending=false;
const authoredCarry=scoreDesignGateV2({seed:confirmedAuthored,designRecord:authoredV5,cycleStatus,robloxGenreProfile:profile});
assert.equal(authoredCarry.pendingSeedGrammarNotAuthored,false);
assert.ok(authoredCarry.grammarCarryEvidence,'a non-pending V5 source keeps the authored-seed carry contract');
const unflaggedIntake=structuredClone(confirmedAuthored);
unflaggedIntake.GAMEPLAY_SKETCH.source='DESIGNER_INTAKE_COMPATIBILITY_INPUT_NOT_AUTHORED_DESIGN';
assert.equal(scoreDesignGateV2({seed:unflaggedIntake,designRecord:authoredV5,cycleStatus,robloxGenreProfile:profile}).pendingSeedGrammarNotAuthored,true);
const unmarkedPlaceholder=structuredClone(placeholderV5);
unmarkedPlaceholder.novelGrammarBackfill.authoringPending=false;
assert.ok(scoreDesignGateV2({seed:unmarkedPlaceholder,designRecord:authoredV5,cycleStatus,robloxGenreProfile:profile})
  .hardFailures.includes('NOVEL_GRAMMAR_DILUTED'));

const genericMaterial=structuredClone(authoredV5);
genericMaterial.content.creativeGrammar.a.material='자원 수집';
assert.ok(scoreDesignGateV2({seed:v5Seed,designRecord:genericMaterial,cycleStatus,robloxGenreProfile:profile})
  .hardFailures.includes('DESIGN_CREATIVE_SOURCE_IS_GAME_MECHANIC'),
  'a plain resource gathering mechanic cannot masquerade as the A creative source');

const noSurprise=structuredClone(authoredV5);
delete noSurprise.content.creativeGrammar.materialFusion;
assert.ok(scoreDesignGateV2({seed:v5Seed,designRecord:noSurprise,cycleStatus,robloxGenreProfile:profile}).hardFailures.includes('DESIGN_MATERIAL_FUSION_SURPRISE_UNPROVEN'));
const noStory=structuredClone(authoredV5);
delete noStory.content.creativeGrammar.storyCausalChain;
assert.ok(scoreDesignGateV2({seed:v5Seed,designRecord:noStory,cycleStatus,robloxGenreProfile:profile}).hardFailures.includes('DESIGN_STORY_CAUSAL_CHAIN_MISSING'));
const noEvolution=structuredClone(authoredV5);
delete noEvolution.content.creativeGrammar.abEvolution;
assert.ok(scoreDesignGateV2({seed:v5Seed,designRecord:noEvolution,cycleStatus,robloxGenreProfile:profile}).hardFailures.includes('DESIGN_A_B_MUTUAL_EVOLUTION_MISSING'));

const invalidV5=structuredClone(authoredV5);
invalidV5.content.creativeGrammar.cGenres[1].name='미스터리';
const invalidResult=scoreDesignGateV2({seed:v5Seed,designRecord:invalidV5,cycleStatus,robloxGenreProfile:profile});
assert.ok(invalidResult.hardFailures.includes('DESIGN_C_PRIMARY_SECONDARY_GENRES_REQUIRED'));
const noSupportingGenre=structuredClone(authoredV5);
noSupportingGenre.content.creativeGrammar.cGenres.pop();
const noSupportingScore=scoreDesignGateV2({seed:v5Seed,designRecord:noSupportingGenre,cycleStatus,robloxGenreProfile:profile});
assert.ok(noSupportingScore.hardFailures.includes('DESIGN_C_PRIMARY_SECONDARY_GENRES_REQUIRED'));

const grammarDiluted=scoreDesignGateV2({seed:grammarSeed,designRecord,cycleStatus,robloxGenreProfile:profile});
assert.ok(grammarDiluted.hardFailures.includes('NOVEL_GRAMMAR_DILUTED'));
assert.ok(grammarDiluted.rejectionReasons.some(reason=>reason.code==='NOVEL_GRAMMAR_DILUTED'));

const weak=structuredClone(designRecord);
delete weak.content.uxAccessibilityPlan;
const weakResult=scoreDesignGateV2({seed,designRecord:weak,cycleStatus,robloxGenreProfile:profile});
assert.ok(weakResult.criticalAxisFailures.includes('UX_AND_ACCESSIBILITY_PLAN'));
assert.ok(weakResult.hardFailures.includes('CRITICAL_AXIS_MINIMUM_FAIL'));
assert.ok(weakResult.totalScore<=79||weakResult.hardFailures.length>0);

assert.ok(Array.isArray(weakResult.rejectionReasons));
assert.ok(weakResult.rejectionReasons.length>=1);
for(const reason of weakResult.rejectionReasons){
  assert.equal(reason.kind,'HARD_GATE');
  assert.equal(reason.bypassAllowed,false);
  assert.equal(reason.source,'STAGE_GATE_SCORING_V2');
  assert.equal(typeof reason.code,'string');
  assert.equal(typeof reason.requiredAction,'string');
}
const uxReject=weakResult.rejectionReasons.find(reason=>reason.code==='CRITICAL_AXIS_MINIMUM_FAIL'&&reason.axis==='UX_AND_ACCESSIBILITY_PLAN');
assert.ok(uxReject);
assert.equal(uxReject.evidenceLevel,0);
assert.equal(uxReject.minimumRequired,75);


const strictReviewSource=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');
assert.match(strictReviewSource,/scoreDesignGateV2/);
assert.match(strictReviewSource,/designContent\.identity\|\|seed\.DISTINCT_IDENTITY/);
assert.match(strictReviewSource,/designContent\.coreLoop/);
assert.match(strictReviewSource,/thirtyMinuteHardGateApplied/);
const designReviewBlock=strictReviewSource.slice(strictReviewSource.indexOf('function designReview(){'),strictReviewSource.indexOf('function implementationReview(){'));
assert.doesNotMatch(designReviewBlock,/hard\.push\('30MIN_CONTENT_FAIL'\)/);
assert.doesNotMatch(designReviewBlock,/identity\.length>=80/);

console.log('COMPANY_DESIGN_GATE_SCORING_V2_TEST=PASS');


// 현재 개발 우선 플랫폼은 Roblox와 Unity이며 Fortnite UEFN은 중앙 정책상 중단 상태다.
for(const platform of ['UNITY','ROBLOX']){
  const platformSeed={...seed,INITIAL_TARGET_PLATFORM:platform};
  const platformRecord=structuredClone(designRecord);
  platformRecord.content.platformFitPlan={...platformRecord.content.platformFitPlan,targetPlatform:platform};
  const platformResult=scoreDesignGateV2({seed:platformSeed,designRecord:platformRecord,cycleStatus,robloxGenreProfile:profile});
  assert.ok(platformResult.evidenceLevels.PLATFORM_FIT_DESIGN>=80,`${platform} platform fit should be connected`);
  assert.ok(!platformResult.criticalAxisFailures.includes('PLATFORM_FIT_DESIGN'),`${platform} must not fail solely because identifier is shorter than prose fields`);
}


const authoredSpatialDesign=()=>{
  const roles=['MAIN','A','B','c','DELVE'];
  return {
    multiplayerMode:'COOP',
    signatureSystems:roles.map((grammarRole,index)=>({
      id:'AUTHORED_ROLE_'+index,grammarRole,
      name:'기존 중심 규칙 '+grammarRole,
      purpose:'플레이어의 기존 행동과 선택이 실제 게임 상태를 바꾸고 다음 선택으로 이어지는 역할을 기술한다.',
      playerChoice:'플레이어가 기존 게임에서 원래 허용된 선택을 수행한 뒤 결과를 확인한다.',
      stateInputs:['WorldState'],stateOutputs:['WorldState']
    })),
    platformProfiles:{
      UNITY:{
        unityWebSpatialPresentation:{
          dimension:'2.5D',
          worldDepth:'실제 월드 오브젝트를 전경·중경·후경에 분리하고 깊이 정렬과 시차를 지역·이동 반응에 연동한다.',
          cameraAndOcclusion:'등각 투영 카메라가 깊이 좌표를 사용하고 앞쪽 물체가 뒤 캐릭터를 가리는 실제 가림 판정을 적용한다.',
          lightingAndMaterials:'기존 월드 오브젝트의 표면별 재질과 방향 광원, 지면 접지 그림자를 유지해 명암과 높이를 인식시킨다.',
          mobileWebglEvidence:'실제 모바일 브라우저에서 같은 유니티 웹 빌드를 실행하고 깊이·가림·조명·터치·프레임과 변경 전후를 비교한다.'
        }
      }
    }
  };
};
const requiredAuthoringFields=['multiplayerMode','signatureSystems','platformProfiles'];
const forcedDesignSeed={MULTIPLAYER_DESIGN_MODE:'SINGLE'};
const authoredRejections=(candidate)=>validateDesignAuthoringContent({
  seed:forcedDesignSeed,design:candidate,fields:requiredAuthoringFields,multiplayerRequired:true
});
const validSpatial=authoredSpatialDesign();
assert.deepEqual(
  authoredRejections(validSpatial).filter(row=>[
    'DESIGN_MULTIPLAYER_CONTRADICTION','DESIGN_MAIN_A_B_DELVE_REQUIRED','DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED'
  ].includes(row.code)),[],
  'structured design evidence does not imply actual multiplayer or browser runtime PASS'
);
const singleOnly=authoredSpatialDesign();
singleOnly.multiplayerMode='SINGLE';
assert.ok(authoredRejections(singleOnly).some(row=>row.code==='DESIGN_MULTIPLAYER_CONTRADICTION'));
const noDelve=authoredSpatialDesign();
noDelve.signatureSystems.pop();
assert.ok(authoredRejections(noDelve).some(row=>row.code==='DESIGN_MAIN_A_B_DELVE_REQUIRED'));
const duplicateAxis=authoredSpatialDesign();
duplicateAxis.signatureSystems[2].grammarRole='A';
assert.ok(authoredRejections(duplicateAxis).some(row=>row.code==='DESIGN_MAIN_A_B_DELVE_REQUIRED'));
// 유니티 웹은 제작 대상이 아니며 과거 공간 필드는 선택적 호환 입력이다.
const flatWorld=authoredSpatialDesign();
flatWorld.platformProfiles.UNITY.unityWebSpatialPresentation.dimension='2D';
assert.equal(authoredRejections(flatWorld).some(row=>row.code==='DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED'),false);
const legacyWithoutWeb=authoredSpatialDesign();
delete legacyWithoutWeb.platformProfiles.UNITY.unityWebSpatialPresentation;
assert.equal(authoredRejections(legacyWithoutWeb).some(row=>row.code==='DESIGN_UNITY_WEB_SPATIAL_DEPTH_REQUIRED'),false);
const foreignNative=authoredSpatialDesign();
foreignNative.platformProfiles.ROBLOX={inputModel:'Unity Input System only for this Roblox project.'};
assert.ok(authoredRejections(foreignNative).some(row=>row.code==='DESIGN_PLATFORM_NATIVE_CONTRADICTION'),
  '웹 제작 의무를 없애도 실제 네이티브 플랫폼 혼동은 계속 반려한다.');
// 기존 게임의 표현 보존 설계에서도 MAIN/A/B/c/@는 실제 상태 입력과 출력으로 이어야 한다.
const preserved=authoredSpatialDesign();
const preservedRoles=preserved.signatureSystems;
preserved.systemInterconnections=preservedRoles.map((row,index)=>{
  const next=preservedRoles[(index+1)%preservedRoles.length];
  return {fromId:row.id,toId:next.id,stateKeys:['WorldState'],
    fromSystem:row.name,toSystem:next.name,trigger:'기존 규칙에서 상태가 바뀌었을 때',
    stateChange:'원래 진행과 저장 의미를 바꾸지 않고 확인된 상태를 다음 기존 시스템에 전달한다.'};
});
const preservedSeed={MULTIPLAYER_DESIGN_MODE:'SINGLE',REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION:true,OWNER_REBUILD_MODE:'PRESERVATION_PRESENTATION_UPGRADE'};
const preservedValidate=design=>validateDesignAuthoringContent({
  design,seed:preservedSeed,fields:['signatureSystems','systemInterconnections'],multiplayerRequired:true
});
assert.equal(preservedValidate(preserved).some(row=>row.code==='DESIGN_PRESERVATION_GRAMMAR_GRAPH_DISCONNECTED'),false);
const disconnected=structuredClone(preserved);
disconnected.systemInterconnections[0].stateKeys=['UnboundState'];
assert.ok(preservedValidate(disconnected).some(row=>row.code==='DESIGN_PRESERVATION_GRAMMAR_GRAPH_DISCONNECTED'));
console.log('DESIGN_PRESERVED_MAIN_A_B_c_DELVE_CAUSAL_GRAPH=PASS');

console.log('DESIGN_REQUIRED_GRAMMAR_MULTIPLAYER_UNITY_WEB_DEPTH=PASS');

/* 메인: 바이브 자체 설계 계산의 독립 결정론적 문법 검증.
 * 외부 모델·로컬 모델 호출을 사용하지 않고 실제 프로덕션 설계 함수를 직접 평가한다.
 * 이 검사는 설계 후보의 문법 확인이며 런타임 게임 PASS 증거가 아니다.
 */
{
  const nativeSource=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
  const start=nativeSource.indexOf('function computeVibeNativeDesign(){');
  const end=nativeSource.indexOf('let cachedVibeNativeDesign=',start);
  assert.ok(start>0&&end>start,'the canonical native design authoring function must exist');
  assert.equal(nativeSource.includes('127.0.0.1:11434'),false);
  assert.equal(nativeSource.includes('requestLocalDesignerRaw'),false);
  assert.equal(nativeSource.includes('callLocalDesignerModel'),false);
  const basicDesignMethod=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8')).continuousGameplaySystemEvolutionContract.gameIdentityConceptContract.novelCausalGameGrammar.ownerBasicDesignMethod;
  for(const category of ['ACTION_SURVIVAL_ROGUELITE','SINGLE_DEFENSE_STRATEGY','PUZZLE','INFECTION','KINGDOM','CASUAL']){
    const sourceIds=CAUSAL_DNA_LIBRARY.slice(0,5).map(row=>row.id);
    const target={basicDesignMethod,requestId:'native-qa-'+category,category,platform:'ROBLOX',materials:[
      {materialId:'MAT-001',causalDNA:sourceIds.slice(0,3)},
      {materialId:'MAT-002',causalDNA:sourceIds.slice(2,5)}
    ]};
    // 자유주제는 기존 개발의 CASUAL 명칭과 독립적으로 MAIN/A/B/C/@를 새로 작성한다.
    if(category==='CASUAL'){target.requestId='native-qa';target.designTopicMode='VIBE_FREE_TOPIC';target.topicRevision='FREE-NATIVE-QUALITY-1';}
    const proposal=computeVibeSeedProposal(target);
    if(category==='KINGDOM')proposal.gameplaySketch.novelGameGrammar.delveLayer.elements.push(
      {name:'주민의 이중 약속',discoveryCondition:'수확을 기다리는 주민에게 경비와 생산을 번갈아 맡겨 관계 변화를 비교한다.',masteryOrInsight:'같은 주민의 과거 역할이 새 거점의 협상 조건을 바꾸는 원리를 배운다.',gameplayEffect:'정복 대신 생산 협약으로 거점 접근권을 얻는 선택이 열린다.',connectsTo:['MAIN','C']},
      {name:'비워 둔 귀환로',discoveryCondition:'병력을 거점에 남기지 않고 철수한 다음 주민이 만든 귀환 통로를 조사한다.',masteryOrInsight:'방어 자원을 비축하지 않은 결과가 이동 경로의 우회 조건으로 전환된다.',gameplayEffect:'병력 증원 대신 자원 수송 동선을 옮겨 안전한 귀환을 선택한다.',connectsTo:['A','B']}
    );
    const seed={
      designGrammarStandardVersion:1,seedId:'SEED-VIBE-NATIVE-TEST',gameId:'native-qa',gameName:proposal.gameName,
      status:'ACTIVE',generation:'MATERIAL_COMPOSED',GAME_CATEGORY:category,
      DISTINCT_IDENTITY:proposal.distinctIdentity,CORE_LOOP:proposal.coreLoop,
      CORE_FUN_TO_LEARN:proposal.coreFunToLearn,GAMEPLAY_SKETCH:proposal.gameplaySketch,
      SEED_MATERIAL_IDS:['MAT-001','MAT-002'],TARGET_AUDIENCE:proposal.targetAudience,
      TARGET_SESSION_MINUTES:30,TARGET_SESSION_DIRECTION:'30분 상태·위험·선택의 성장',
      INITIAL_TARGET_PLATFORM:'ROBLOX',MULTIPLAYER_DESIGN_MODE:proposal.multiplayerDesignMode
    };
    if(category==='KINGDOM')seed.designDiscoveryCount=6;
    if(category==='CASUAL'){seed.designTopicMode='VIBE_FREE_TOPIC';seed.ownerResetRevision=target.topicRevision;seed.designDiscoveryCount=10;}
    let sourceText='';
    if(category==='INFECTION'){
      const humans=['A','B','C'],monsters=['X','Y','Z'];
      seed.INITIAL_PLAY_MODE='INFECTION';
      seed.originalDesignContext={content:{
        humanRoster:humans.map(id=>({id,tool:'Tool '+id,infectedAbility:'Infected '+id})),
        monsterRoster:monsters.map(id=>({id})),
        technicalAssumptions:['TargetPopulation=4','SurvivorSlots=2','MonsterSlots=2','RoundSeconds=240','InfectRange=8','InfectAttackCost=30','InfectAttackCooldown=1.2','PurifyDistance=8','PurifyCooldown=5']
      }};
      sourceText='InfectRange=8,InfectAttackCost=30,InfectAttackCooldown=1.2,PurifyDistance=8,PurifyCost=35,PurifyCooldown=5\n'
        +'HumanForms={\n'+humans.map(id=>`{Id="${id}",ActiveAbility="H_${id}",InfectedAbility="I_${id}"},`).join('\n')+'\n},\n'
        +'MonsterForms={\n'+monsters.map(id=>`{Id="${id}",Ability="M_${id}"},`).join('\n')+'\n},\n'
        +'HumanAbilities={\n'+humans.map(id=>`H_${id}={Name="Human ${id}",Range=8,Cost=10,Cooldown=2},`).join('\n')+'\n},\n'
        +'InfectedAbilities={\n'+humans.map(id=>`I_${id}={Name="Infected ${id}",Range=8,Cost=10,Cooldown=2},`).join('\n')+'\n},\n'
        +'MonsterAbilities={\n'+monsters.map(id=>`M_${id}={Name="Monster ${id}",Range=8,Cost=10,Cooldown=2},`).join('\n')+'\n},\n';
    }
    const design=runInNewContext(
      nativeSource.slice(start,end)+String.fromCharCode(10)+'computeVibeNativeDesign()',
      {
        basicDesignMethod,nativeDesignVariation:0,validateDesignAuthoringContent,
        seed,gameId:'native-qa',game:{name:proposal.gameName},
        seedState:{seedMaterials:target.materials},
        seedGameplaySketch:proposal.gameplaySketch,
        pendingSeedGrammarNotAuthored:false,
        originalMultiplayerMode:proposal.multiplayerDesignMode,
        allGamesMultiplayerRequired:true,
        playableRequirements:designPlayabilityRequirements(seed,sourceText),
        designAssetFamilies:[],designAssetLibrary:null,
        seedFlowSystemBlueprint:{},factPack:{},fs,
        computeVibeSeedProposal,repairDesignRequiredFields,buildConceptSystemBlueprint,
        clean:value=>String(value??'').trim()
      }
    );
    const feedback=validateDesignAuthoringContent({
      design,seed,fields:Object.keys(design),
      multiplayerRequired:true,requirePlayableContract:true,sourceText
    });
    assert.deepEqual(feedback.map(item=>item.code),[],category+': native design field failure '+JSON.stringify(feedback.map(item=>({code:item.code,fields:item.fields,evidence:item.evidence}))));
    const details=design.creativeGrammar.fiveWOneH;
    assert.equal(details.length,4+design.creativeGrammar.dCreations.length+design.creativeGrammar.delveDiscoveries.length);
    assert.equal(design.creativeGrammar.standardVersion,basicDesignMethod.version);
    assert.equal(Object.hasOwn(design.creativeGrammar,'cThemes'),false);
    assert.ok(design.creativeGrammar.delveDiscoveries.every(row=>design.creativeGrammar.dCreations.some(d=>d.id===row.sourceDId)));
    if(category==='CASUAL'){
      assert.equal(design.creativeGrammar.delveDiscoveries.length,10,'@ expansion must not stop at the original four');
      assert.equal(details.filter(row=>row.element==='DELVE').length,10,'every new @ needs its own six-question and result record');
      assert.match(design.creativeGrammar.delveGrowthRule,/상한|제한|파고들기/);
    }
    assert.equal(details.filter(row=>row.element==='C').length,1);
    for(const row of design.creativeGrammar.cGenres)assert.ok(details.find(row=>row.element==='C').what.includes(row.name));
    if(category==='KINGDOM'){
      assert.equal(details.filter(row=>row.element==='DELVE').length,6,'@ remains open beyond four discoveries');
      const check=changed=>validateDesignAuthoringContent({design:changed,seed,fields:['creativeGrammar']});
      const expectRejected=(mutate,code)=>{
        const changed=structuredClone(design);mutate(changed);
        assert.ok(check(changed).some(row=>row.code===code),code);
        assert.ok(scoreDesignGateV2({seed,designRecord:{content:changed},cycleStatus:{status:'IN_PROGRESS'}}).hardFailures.includes(code),'strict gate carries '+code);
      };
      expectRejected(changed=>{delete changed.creativeGrammar.a.referenceGame;},'DESIGN_A_NAMED_REFERENCE_GAME_REQUIRED');
      expectRejected(changed=>{changed.creativeGrammar.b.system='임의로 바꾼 시스템';},'DESIGN_B_EXISTING_SYSTEM_BASELINE_REQUIRED');
      const brokenIdea=structuredClone(design);delete brokenIdea.designAlternatives[0].abIntegration.verificationScene;
      assert.ok(validateDesignAuthoringContent({design:brokenIdea,seed,fields:['designAlternatives']}).some(row=>row.code==='DESIGN_AB_IDEA_INTEGRATION_REQUIRED'));
      expectRejected(changed=>{changed.creativeGrammar.dCreations=[];},'DESIGN_D_CREATION_REQUIRED');
      expectRejected(changed=>{changed.creativeGrammar.dCreations[0].materialPath[2]='분류의 기록 장치';},'DESIGN_D_SOURCE_FEATURE_UNGROUNDED');
      expectRejected(changed=>{changed.creativeGrammar.dCreations[0].sourceFeature='아무 조건이나 바뀐다';},'DESIGN_D_SOURCE_FEATURE_UNGROUNDED');
      expectRejected(changed=>{changed.creativeGrammar.dCreations[0].gameplayEffect='소재의 이름만 확인하고 세계 상태를 바꾸어 다음 경로를 선택한다.';},'DESIGN_D_SOURCE_FEATURE_UNGROUNDED');
      expectRejected(changed=>{changed.creativeGrammar.cGenres[0].name='액션';},'DESIGN_C_GAME_GENRE_FORBIDDEN');
      expectRejected(changed=>{changed.creativeGrammar.b.materialPath=['신화','로봇공학'];},'DESIGN_STANDARD_CLASSIFICATION_INVALID');
      expectRejected(changed=>{changed.creativeGrammar.delveDiscoveries[0].sourceDId='missing';},'DESIGN_DELVE_D_BASIS_MISSING');
      for(const field of ['who','when','where','what','how','why','result','failure','cancel','recovery'])expectRejected(
        changed=>{delete changed.creativeGrammar.fiveWOneH[1][field];},'DESIGN_GRAMMAR_FIVE_W_ONE_H_INCOMPLETE');
      expectRejected(changed=>changed.creativeGrammar.fiveWOneH.pop(),'DESIGN_GRAMMAR_FIVE_W_ONE_H_INCOMPLETE');
      expectRejected(changed=>{changed.creativeGrammar.fiveWOneH[5].discoveryIndex=0;},'DESIGN_GRAMMAR_FIVE_W_ONE_H_INCOMPLETE');
      expectRejected(changed=>{changed.creativeGrammar.fiveWOneH[4].linkedElements=['A'];},'DESIGN_GRAMMAR_FIVE_W_ONE_H_INCOMPLETE');
      expectRejected(changed=>{changed.creativeGrammar.fiveWOneH[0].ruleIds=['MISSING_RULE'];},'DESIGN_GRAMMAR_FIVE_W_ONE_H_UNBOUND');
      expectRejected(changed=>{changed.creativeGrammar.fiveWOneH[0].regionIds=['MISSING_REGION'];},'DESIGN_GRAMMAR_FIVE_W_ONE_H_UNBOUND');
      expectRejected(changed=>{changed.creativeGrammar.fiveWOneH[3].ruleIds=[changed.signatureSystems.find(row=>row.grammarRole==='A').id];},'DESIGN_GRAMMAR_FIVE_W_ONE_H_UNBOUND');
      expectRejected(changed=>{changed.creativeGrammar.fiveWOneH[4].ruleIds=[changed.signatureSystems.find(row=>row.grammarRole==='DELVE').id];},'DESIGN_GRAMMAR_FIVE_W_ONE_H_UNBOUND');
      expectRejected(changed=>{
        const row=changed.creativeGrammar.fiveWOneH[1];row.why=row.what;
      },'DESIGN_GRAMMAR_FIVE_W_ONE_H_CLONED');
      expectRejected(changed=>{
        const rows=changed.creativeGrammar.fiveWOneH;
        for(const field of ['what','how','why','result']){rows[4][field]+=' 1';rows[5][field]=rows[4][field].replace(/ 1$/,' 2');}
      },'DESIGN_GRAMMAR_FIVE_W_ONE_H_CLONED');
      expectRejected(changed=>{changed.creativeGrammar.fiveWOneH[0].who='PLACEHOLDER 담당 주체';},'DESIGN_PLACEHOLDER_CONTENT');
      assert.deepEqual(validateDesignAuthoringContent({design:{creativeGrammar:design.creativeGrammar},seed,fields:['creativeGrammar']}),[],
        'partial authoring checks completeness before later rule/region slices exist');
      assert.deepEqual(validateDesignAuthoringContent({design,seed:{...seed,GAMEPLAY_SKETCH:{version:1}},fields:['creativeGrammar','signatureSystems']}),[],
        'new basic design from a legacy intake must not require a separate c system');
      console.log('DESIGN_GRAMMAR_FIVE_W_ONE_H_NATIVE_AND_MUTATION_TESTS=PASS');
    }
    if(category==='INFECTION'){
      assert.equal(design.contentVarietyPlan.roleTransitions.length,3,'every selectable class has a transition');
      assert.equal(design.selectedDesignPlan.participants.length,4,'class options do not inflate match slots');
      const corrupted=structuredClone(design);
      corrupted.selectedDesignPlan.playthrough[2].after.find(row=>row.key==='HumanCount').value+=1;
      const rejected=validateDesignAuthoringContent({design:corrupted,seed,sourceText,requirePlayableContract:true});
      assert.ok(rejected.some(row=>row.code==='DESIGN_INFECTION_STATE_INVALID'),'incorrect participant state must fail');
    }
    const scored=scoreDesignGateV2({
      seed,designRecord:{content:design,sameModelAsDraft:false},
      cycleStatus:{status:'IN_PROGRESS'},
      robloxGenreProfile:classifyRobloxGenre({
        category,identity:design.identity,coreLoop:design.coreLoop,
        designText:JSON.stringify(design),multiplayerMode:design.multiplayerMode
      }),
      multiplayerRequired:true,requirePlayableContract:true,sourceText
    });
    assert.equal(scored.hardFailures.length,0,category+': '+scored.hardFailures.join(', '));
    assert.ok(scored.totalScore>=80,category+': '+scored.totalScore);
    assert.equal(Object.hasOwn(design.platformProfiles.UNITY,'unityWebSpatialPresentation'),false,
      '새 기본설계에는 유니티 웹 공간 제작 명세가 없어야 한다.');
    assert.equal(design.multiplayerMode,'COOP');
  }
}


// 메인: 오비 장르는 정상 인정하고 플랫폼 설정 문자열은 장르 판정에서 제외한다.
for(const item of [
  {category:'OBBY',identity:'구름길 오비',loop:['장애물 타이밍 관찰','점프와 착지','체크포인트 진행'],genre:'Obby & platformer',subgenre:'Classic Obby'},
  {category:'OBBY',identity:'수직 타워 오비',loop:['타워 구간 점프','높이별 장애물 통과'],genre:'Obby & platformer',subgenre:'Tower Obby'},
  {category:'OBBY',identity:'달리기 오비 러너',loop:['자동 이동 중 점프','실패 지점 복구'],genre:'Obby & platformer',subgenre:'Runner'},
  {category:'PLATFORMER',identity:'횡스크롤 플랫포머',loop:['발판 점프','구간별 기술 숙련'],genre:'Obby & platformer',subgenre:'Classic Obby'},
  {category:'TYCOON',identity:'학교 타이쿤',loop:['시설 건설','학생과 교사 운영'],genre:'Simulation',subgenre:'Tycoon'},
  {category:'PUZZLE',identity:'단서 퍼즐',loop:['단서 해독','공간 변환'],genre:'Puzzle',subgenre:null},
  {category:'SURVIVAL',identity:'협곡 생존',loop:['탐험','재료 제작'],genre:'Survival',subgenre:null}
]){
  const actual=classifyRobloxGenre({
    category:item.category,identity:item.identity,coreLoop:item.loop,multiplayerMode:'COOP',
    designText:JSON.stringify({platformProfiles:{ROBLOX:{platform:'ROBLOX'},UNITY:{platform:'UNITY'}},platformFitPlan:{targetPlatform:'ROBLOX'}})
  });
  assert.equal(actual.genre,item.genre,item.identity+' 기본 장르 유지');
  assert.equal(actual.subgenre,item.subgenre,item.identity+' 세부 장르 유지');
  assert.equal(actual.playMode,'COOP',item.identity+' 기존 멀티 규칙 보존');
}

// 대·중·소 연결과 생성 편향 회귀: 중앙 분류 확장을 실제로 소비한다.
{
  const method=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8')).continuousGameplaySystemEvolutionContract.gameIdentityConceptContract.novelCausalGameGrammar.ownerBasicDesignMethod;
  const registered=new Map();
  for(const family of method.materialClassification){
    for(const middle of family.middle)assert.ok(family.specificMaterials.some(row=>row.middle===middle),`${family.broad}→${middle}: source missing`);
    for(const source of family.specificMaterials){
      assert.ok(family.middle.includes(source.middle));
      assert.ok(['name','feature','action','condition','consequence','risk'].every(key=>typeof source[key]==='string'&&source[key].length>=(key==='name'?1:4)));
      const key=[family.broad,source.middle,source.name].join('→');assert.ok(!registered.has(key));registered.set(key,source);
    }
  }
  const broadCoverage=new Set(),middleCoverage=new Set(),specificCoverage=new Set();
  for(let index=0;index<1000;index++){
    const proposal=computeVibeSeedProposal({requestId:`taxonomy-audit-${index}`,category:'ACTION_SURVIVAL_ROGUELITE',platform:'ROBLOX',materials:[],basicDesignMethod:method,designTopicMode:'VIBE_FREE_TOPIC',topicRevision:'AUDIT',variant:0});
    const selection=proposal.basicDesignSelection;broadCoverage.add(selection.a.material);middleCoverage.add(selection.b.materialPath.join('→'));
    for(const source of selection.dSources){const key=source.materialPath.join('→');assert.ok(registered.has(key));assert.equal(source.sourceFeature,registered.get(key).feature);assert.ok(!source.materialPath[2].endsWith('의 기록 장치'));specificCoverage.add(key);}
  }
  assert.equal(broadCoverage.size,method.materialClassification.length);
  assert.equal(middleCoverage.size,method.materialClassification.reduce((total,row)=>total+row.middle.length,0));
  assert.equal(specificCoverage.size,registered.size);
  const target={requestId:'title-independent',category:'ACTION_SURVIVAL_ROGUELITE',platform:'ROBLOX',materials:[],basicDesignMethod:method};
  assert.deepEqual(computeVibeSeedProposal({...target,gameName:'학교'}).basicDesignSelection,computeVibeSeedProposal({...target,gameName:'곤충'}).basicDesignSelection);
  const expanded=structuredClone(method),source=expanded.materialClassification[0].specificMaterials[0];
  expanded.materialClassification[0].specificMaterials.push({...source,name:'새 경계 대상',feature:'새 대상의 출입 조건'});
  let consumed=false;
  for(let index=0;index<300&&!consumed;index++){const p=computeVibeSeedProposal({...target,requestId:`extension-${index}`,basicDesignMethod:expanded,discoveryCount:12});consumed=p.basicDesignSelection.dSources.some(row=>row.materialPath[2]==='새 경계 대상');}
  assert.ok(consumed,'new canonical source must be consumed without a code-list change');
  console.log('DESIGN_MATERIAL_HIERARCHY_FEATURE_AND_COVERAGE_TEST=PASS');
}


// 메인: 기존 게임 원본 참조가 자유 주제 설계를 강제하지 않는지 회귀 검사한다.
// 생성된 행동 설명은 기존 엄격 스키마의 400자 상한 안에서 작성해야 한다.
{
  const generator=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
  assert.ok(generator.includes('const freeTopicMode=ownerFreeTopic&&(!nativeGameVerified||seed.REPLACE_EXISTING_GAME_IDENTITY===true);'));
  assert.ok(generator.includes('const nativeGameVerified=/\\bGameId\\s*=/.test(nativeConfig)'));
  assert.ok(generator.includes("sourceKingdomGenre?'KINGDOM'"));
  const seedComposer=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
  assert.ok(seedComposer.includes("const freeTopicMode=target.designTopicMode==='VIBE_FREE_TOPIC';"));
  assert.ok(!seedComposer.includes("||Boolean(bReference)"));
  assert.ok(generator.includes('const nativeConfigPath=`roblox-games/${gameId}/shared/GameConfig.luau`;'));
  assert.ok(generator.includes("typeof fs!=='undefined'&&fs.existsSync(nativeConfigPath)"));
  assert.ok(generator.includes('category:authoredCategory,platform:seed.INITIAL_TARGET_PLATFORM'));
  assert.ok(generator.includes("?'RPG':seed.GAME_CATEGORY;"));
  assert.ok(!generator.includes('const freeTopicMode=ownerFreeTopic||Boolean(bSystemReference);'));
  assert.ok(generator.includes('trigger:shorten(`\${a.playerChoice} 실행 전에 접근 가능성과 비용을 확인한다.`,400)'));
  assert.ok(generator.includes('trigger:shorten(`\${b.playerChoice} 실행 전에 A의 이전 결과를 읽는다.`,400)'));
  assert.ok(generator.includes("assertSchemaValue(value,schema,label='root')"));
  assert.ok(generator.includes("'parryEvent.OnServerEvent:Connect'"));
  assert.ok(generator.includes("'dodgeEvent.OnServerEvent:Connect'"));
  assert.ok(generator.includes("'syncInventoryEvent:FireClient'"));
  assert.ok(generator.includes('const existingSystem=seed.B_SYSTEM_REFERENCE||seed.A_SYSTEM_REFERENCE||sourceGroundedCombat;'));
  assert.ok(generator.includes('const sourceGroundedCombat=nativeCombatVerified?{'));
  assert.ok(generator.includes('}:null;'));
  console.log('DESIGN_EXISTING_GAME_IDENTITY_AND_TRIGGER_LIMIT=PASS');
}
