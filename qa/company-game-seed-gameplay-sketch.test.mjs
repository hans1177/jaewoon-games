import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAME_SEED_REQUIRED_FIELDS,GAME_SEED_POLICY,validateGameSeed} from '../tools/company-game-seed-contract.mjs';
import {buildGameFlowArchitecture,evaluateGameFlowArchitecture} from '../tools/company-vibe2-game-flow-architect.mjs';

const legacySeed=()=>({
  GAME_CATEGORY:'SINGLE_DEFENSE_STRATEGY',
  REFERENCE_INPUTS:[{type:'ORIGINAL_MATERIAL',value:'sky fortress'}],
  CORE_FUN_TO_LEARN:['position defense against changing threats'],
  CORE_LOOP:['read the route and deploy a defense','survive the wave and earn resources','upgrade or reposition for the next threat'],
  DISTINCT_IDENTITY:'A distinct defense game.',
  MARKET_EVIDENCE_SUMMARY:{available:false},
  TARGET_AUDIENCE:'global strategy players',
  TARGET_SESSION_DIRECTION:'meaningful progression without padding',
  TARGET_SESSION_MINUTES:30,
  INITIAL_TARGET_PLATFORM:'ROBLOX',
  INITIAL_PLAY_MODE:'PROJECT_DEFINED',
  MULTIPLAYER_DESIGN_MODE:'SINGLE',
  CROSS_PLATFORM_EXPANSION_VALUE:'portable tactical loop',
});

test('GAME_SEED contract requires gameplay sketch while preserving legacy compatibility',()=>{
  assert.ok(GAME_SEED_REQUIRED_FIELDS.includes('GAMEPLAY_SKETCH'));
  assert.equal(GAME_SEED_POLICY.gameplaySketchRequired,true);
  const seed=legacySeed();
  const result=validateGameSeed(seed);
  assert.equal(result.pass,true,result.errors.join(','));
  assert.equal(seed.GAMEPLAY_SKETCH.source,'LEGACY_SEED_COMPATIBILITY_SKETCH');
  assert.ok(seed.GAMEPLAY_SKETCH.actors.length>=2);
  assert.ok(seed.GAMEPLAY_SKETCH.interactionChains.length>=1);
  assert.ok(seed.GAMEPLAY_SKETCH.stateMachine.length>=5);
  assert.ok(seed.GAMEPLAY_SKETCH.firstPlayableCycle.length>=6);
  assert.ok(seed.GAMEPLAY_SKETCH.expansionPlan.length>=3);
  assert.ok(seed.GAMEPLAY_SKETCH.longGoalScenario.length>=3);
});

test('an explicitly malformed gameplay sketch fails instead of being silently accepted',()=>{
  const seed=legacySeed();
  seed.GAMEPLAY_SKETCH={version:1,worldModel:'label only',actors:['player'],interactionChains:[],stateMachine:['START'],firstPlayableCycle:['click'],expansionPlan:['repeat'],longGoalScenario:['wait'],validationRisks:[]};
  const result=validateGameSeed(seed);
  assert.equal(result.pass,false);
  assert.ok(result.errors.some(error=>error.startsWith('GAMEPLAY_SKETCH.actors')));
  assert.ok(result.errors.some(error=>error.startsWith('GAMEPLAY_SKETCH.firstPlayableCycle')));
  assert.ok(result.errors.some(error=>error.startsWith('GAMEPLAY_SKETCH.expansionPlan')));
});

test('seed bootstrap asks the model to sketch the world before code and persists it',()=>{
  const source=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
  assert.match(source,/gameplaySketch:GAMEPLAY_SKETCH_SCHEMA/);
  assert.match(source,/GAMEPLAY_SKETCH:p\.gameplaySketch/);
  assert.match(source,/코드 생성 전에 실제 월드와 플레이 흐름을 GAMEPLAY_SKETCH로 먼저 구성한다/);
  assert.match(source,/interactionChains/);
  assert.match(source,/longGoalScenario/);
  assert.match(source,/validationRisks/);
  assert.match(source,/GAMEPLAY_SKETCH_REQUIRED_FOR_NEW_SEEDS=YES/);
});

test('GAMEPLAY_SKETCH v2 keeps quality depth and flow asset authority separated',()=>{
  const seed=legacySeed();
  const flowArchitecture=buildGameFlowArchitecture({
    gameId:'seed-quality-v2-test',
    genre:seed.GAME_CATEGORY,
    baseline:{content:{
      identity:seed.DISTINCT_IDENTITY,
      playerFantasy:'위험과 보상 사이에서 방어 위치와 성장 경로를 바꾸며 전장을 지배한다.',
      coreFun:seed.CORE_FUN_TO_LEARN.join(' '),
      coreLoop:seed.CORE_LOOP,
      progressionDirection:'세션 성장에서 빌드 분화와 장기 전략 해금으로 이어진다.'
    }},
    inventory:[]
  });
  seed.GAMEPLAY_SKETCH={
    version:2,
    source:'TEST_GAMEPLAY_SKETCH_V2',
    worldModel:'경로와 배치가 적의 이동, 방어 자원, 다음 웨이브 선택을 실제로 바꾸는 전장.',
    actors:['플레이어: 배치와 전투 우선순위를 결정한다','적 웨이브: 경로와 조합으로 방어 선택에 반응한다'],
    interactionChains:['경로 관찰 -> 방어 위치 선택 -> 실제 배치 입력 -> 적 이동/피해 상태 변화 -> 보상과 다음 선택 변화'],
    stateMachine:['ENTRY','READ_ROUTE','PLACE_DEFENSE','OBSERVE_RESPONSE','CHOOSE_GROWTH','HANDLE_FAILURE','NEXT_OBJECTIVE'],
    firstPlayableCycle:['전장 진입','경로 확인','방어 배치','첫 공격 결과 확인','첫 성장 선택','위험 대응','다음 웨이브 결정'],
    playerPromise:'즉각 읽히는 방어 반응과 위험 보상 선택을 숙련해 새 배치 조합과 전략 경로를 연다.',
    funDrivers:[
      '입력 직후 공격 범위와 적 상태 변화가 즉시 읽히는 피드백을 준다.',
      '안전한 배치와 높은 보상 경로 사이에 실제 위험 보상 트레이드오프가 있다.',
      '숙련할수록 새 행동 조합과 전략 선택이 열리고 같은 배치 반복만으로는 해결되지 않는다.',
      '적 웨이브와 전장 경로가 플레이어 선택에 반응해 다음 대응을 바꾸게 한다.'
    ],
    balanceRules:[
      '하나의 지배 전략은 적 역할과 경로 카운터 및 기회비용 때문에 모든 상황을 해결하지 못한다.',
      '플레이어 성장과 함께 위협의 조합과 목표 복잡도가 올라가되 기존 성장 체감은 유지한다.',
      '실패 뒤에는 일부 자원과 정보를 보존해 복구와 재시도 선택이 가능하다.',
      '경제는 명확한 획득원과 소비처를 연결하고 무료 무한 자원 루프를 금지한다.',
      '후반 난이도는 체력과 공격력만 올리지 않고 압박 조합과 판단 우선순위를 바꾼다.'
    ],
    pacingPlan:{
      first5Minutes:'0~5분에 조작과 목표를 이해하고 첫 방어 성공, 첫 위험 선택을 경험한다.',
      minutes5To15:'5~15분에 핵심 루프를 반복하면서 첫 성장과 장비/전략 경로를 고른다.',
      minutes15To25:'15~25분에 새 적 압박과 지역 규칙, 시스템 연결이 열려 대응을 바꾼다.',
      minutes25To30:'25~30분에 누적 선택과 시스템을 조합해 중간 목표를 해결하고 보상을 얻는다.',
      midLateGame:'중후반에는 시스템 조합, 빌드와 경로별 판단 구조가 달라진다.',
      replayMotivation:'재플레이에서는 다른 전략, 빌드와 경로 선택이 다른 전장 결과를 만든다.'
    },
    progressionLayers:[
      '세션 성장: 현재 플레이에서 새 배치 옵션과 즉시 대응 행동을 연다.',
      '중기 성장: 빌드와 전략 분기를 열어 선택 비용과 장점을 다르게 만든다.',
      '장기 성장: 후반 월드 목표와 새 플레이스타일을 해금해 장기 경로를 바꾼다.'
    ],
    expansionPlan:[
      '새 적 행동 패턴과 그룹 역할을 추가해 대응 공간을 넓힌다.',
      '새 지역과 경로 규칙으로 배치와 이동 결정을 바꾼다.',
      '새 목표와 상호작용 정보를 추가해 우선순위를 바꾼다.',
      '새 빌드와 플레이스타일 결과를 기존 경제와 진행에 연결한다.'
    ],
    longGoalScenario:['첫 방어와 성장 선택 완료','새 경로와 적 조합에 맞춰 빌드 분화','누적 시스템 조합으로 중간 목표 해결'],
    completionCriteria:[
      '첫 5분 안에 조작, 목표, 첫 성공과 위험 선택이 연결된다.',
      '15~25분에 새 결정 공간과 압박 유형이 열린다.',
      '30분 이상은 반복 대기 없이 시스템 조합과 장기 목표로 이어진다.',
      '실패 뒤 복구와 재시도 및 소프트락 회피 경로가 정의된다.',
      '모바일 터치 입력과 가독성 및 성능이 핵심 판단을 보존한다.',
      '초반, 중반, 후반의 역할과 압박 구조가 서로 다르다.'
    ],
    codingGrowthHooks:[
      '기존 책임 함수와 상태 소유권을 우선 재사용한다.',
      '설정과 데이터 테이블 및 stable ID 중심으로 확장한다.',
      '중복 authoritative 시스템과 wrapper 또는 shadow 구조를 만들지 않는다.',
      '세이브 스키마 변경 시 버전과 migration으로 기존 의미를 보존한다.',
      '프레젠테이션 자산 바인딩은 게임 로직과 분리한다.'
    ],
    validationRisks:['반복이나 수치 배수만으로 콘텐츠 깊이를 가장하지 않는다','세이브, 경제, 모바일, 소프트락 회귀를 검증한다'],
    flowArchitecture
  };
  const result=validateGameSeed(seed);
  assert.equal(result.pass,true,result.errors.join(','));
  const flowResult=evaluateGameFlowArchitecture(flowArchitecture);
  assert.equal(flowResult.pass,true,flowResult.blockers.join(','));
  const requirements=flowArchitecture.assetFlow.requirements;
  assert.ok(requirements.length>=3);
  assert.ok(requirements.every(row=>row.resolution==='LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME'));
  assert.ok(requirements.every(row=>row.assetIdPinned!==true&&!row.assetId));
  assert.ok(requirements.every(row=>row.gameplayAuthority!==true&&row.balanceAuthority!==true&&row.saveAuthority!==true&&row.networkingAuthority!==true));
});

test('design cycle preserves v2 sketch and BUILD_UP reuses the full verified design record',()=>{
  const designCycle=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
  const autoPlanner=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  assert.match(designCycle,/const seedDesignDepthContext=/);
  assert.match(designCycle,/GAME_SEED_DESIGN_DEPTH=/);
  assert.match(designCycle,/gameplaySketchVersion:seedGameplaySketchVersion,gameplaySketch:seedGameplaySketch/);
  assert.match(designCycle,/advancedDesignDepth:advancedSeedDesignDepth/);
  assert.match(autoPlanner,/flowBaseline=designContext\?\{\.\.\.designContext\.record,content:designContent\}/);
  assert.match(autoPlanner,/out\.assetRequirements=flowAssetRequirements/);
  assert.match(autoPlanner,/out\.flowArchitecture=flowArchitecture/);
});



test('GAMEPLAY_SKETCH v3 requires diverse cross-system composition depth without breaking v2',()=>{
  assert.equal(GAME_SEED_POLICY.advancedGameplaySketchVersion,3);
  const seed=legacySeed();
  seed.GAMEPLAY_SKETCH={
    version:3,
    source:'TEST_GAMEPLAY_SKETCH_V3',
    worldModel:'탐험 경로와 방어 배치, 거래 거점과 수집 목표가 하나의 월드 상태에서 서로 영향을 주는 전장.',
    actors:['플레이어: 방어와 탐험 경로를 선택한다','적과 상인 및 수집 대상: 플레이어 선택에 실제 상태로 반응한다'],
    interactionChains:['경로 선택 -> 실제 배치 입력 -> 위협 상태 변화 -> 보상 획득 -> 거래/수집/성장 선택 변화'],
    stateMachine:['ENTRY','READ_ROUTE','PLACE_DEFENSE','EXPLORE','RESOLVE','GROW','RETRY'],
    firstPlayableCycle:['전장 진입','경로 확인','방어 배치','탐험 결과 확인','첫 보상 획득','성장 선택','다음 목표 결정'],
    playerPromise:'방어 판단을 중심으로 탐험, 수집, 거래의 결과를 조합해 다음 전장의 선택지를 넓힌다.',
    funDrivers:['즉시 보이는 배치 반응과 상태 변화','위험과 보상 사이의 실제 비용 선택','숙련으로 새 조합과 전략 선택 해금','적과 월드가 배치에 반응'],
    balanceRules:['지배 전략에는 카운터와 기회비용이 있다','성장과 위협 복잡도가 함께 변한다','실패 후 복구와 재시도가 가능하다','경제 획득원과 소비처를 함께 둔다','후반에는 압박 조합과 판단 구조가 바뀐다'],
    pacingPlan:{first5Minutes:'조작과 목표, 첫 성공과 위험 선택',minutes5To15:'핵심 루프와 첫 성장 및 전략 선택',minutes15To25:'새 압박과 지역 및 시스템 연결',minutes25To30:'누적 선택과 시스템 조합으로 중간 목표 해결',midLateGame:'시스템 조합과 빌드 및 경로 판단이 달라진다',replayMotivation:'다른 빌드와 경로가 다른 월드 결과를 만든다'},
    progressionLayers:['세션 성장으로 즉시 선택 변화','중기 성장으로 새 빌드와 전략 해금','장기 성장으로 월드와 플레이스타일 변화'],
    expansionPlan:['새 적 행동과 대응 추가','새 지역과 경로 추가','새 목표와 상호작용 추가','새 빌드와 전략 결과 추가'],
    longGoalScenario:['첫 방어 완료','탐험과 거래로 새 선택 해금','다중 시스템 조합으로 장기 목표 해결'],
    completionCriteria:['첫 5분 실제 플레이','15~25분 새 결정 공간','30분 이상 시스템 조합','실패 복구와 재시도','모바일 터치와 성능','초중후반 역할 차이'],
    codingGrowthHooks:['기존 책임 함수 직접 수정','데이터 테이블과 stable ID 확장','wrapper shadow와 중복 authority 금지','save migration으로 기존 의미 보존','프레젠테이션과 게임 로직 분리'],
    validationRisks:['수치 배수만으로 깊이를 가장하지 않는다','저장 경제 모바일 소프트락 회귀를 검증한다'],
    compositionDepth:{
      mainContent:'라인 방어의 배치와 경로 판단을 메인으로 유지한다.',
      majorSubSystems:['지역 탐험과 비밀 경로','수집 도감과 세트 조합','상인 무역과 지역 경제'],
      extensionSystems:['동료 파티 조합','서브퀘스트 사건','카드 드래프트 미니게임','유물 강화와 합성','펫 소환 수집','경매와 희귀 거래'],
      crossSystemCombinations:[
        '메인 방어 × 탐험: 방어 성과가 새 경로를 연다',
        '메인 방어 × 수집: 세트 조합이 다음 배치 선택을 바꾼다',
        '탐험 × 무역: 지역 발견이 새로운 교환 조건을 연다',
        '메인 × 탐험 × 수집 + @ 무역: 후반 조합으로 비밀 웨이브를 연다'
      ],
      hiddenCombinations:['특정 카드 세트 + 야간 지역에서 숨은 상인이 등장','희귀 유물 + 동료 조합으로 비밀 보스가 열린다'],
      growthMutations:['초반 탐험이 중반 무역과 결합되고 후반 방어 빌드에 영향을 준다','성장한 이동 능력이 이전 지역의 새 경로를 연다'],
      legacyContentRevisitHooks:['초기 숲에 비행 이동 해금 후 숨은 유적 접근','초기 상점이 후반 세트 아이템 교환처로 변화'],
      endgameFusion:'엔드게임은 방어 × 탐험 × 수집 + 무역 × 파티 조합으로 비밀 웨이브와 희귀 빌드를 여는 융합 구조다.',
      mechanicDiversitySources:['CLASSIC_CARD','MODERN_BOARD','EXPLORATION','COLLECTION_META']
    },
    flowArchitecture:buildGameFlowArchitecture({gameId:'seed-v3-depth',genre:seed.GAME_CATEGORY,baseline:{content:{identity:seed.DISTINCT_IDENTITY,coreFun:seed.CORE_FUN_TO_LEARN.join(' '),coreLoop:seed.CORE_LOOP,progressionDirection:'탐험과 수집, 무역이 방어 성장에 연결된다.'}},inventory:[]})
  };
  const pass=validateGameSeed(seed);
  assert.equal(pass.pass,true,pass.errors.join(','));

  const broken=structuredClone(seed);
  broken.GAMEPLAY_SKETCH.compositionDepth.majorSubSystems=['탐험','수집'];
  broken.GAMEPLAY_SKETCH.compositionDepth.crossSystemCombinations=['A×B'];
  broken.GAMEPLAY_SKETCH.compositionDepth.endgameFusion='';
  const fail=validateGameSeed(broken);
  assert.equal(fail.pass,false);
  assert.ok(fail.errors.some(error=>error.includes('majorSubSystems')));
  assert.ok(fail.errors.some(error=>error.includes('crossSystemCombinations')));
  assert.ok(fail.errors.some(error=>error.includes('endgameFusion')));
});

test('seed bootstrap emits v3 fusion schema and explicit diverse mechanic instructions',()=>{
  const source=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
  assert.match(source,/COMPOSITION_DEPTH_SCHEMA/);
  assert.match(source,/version:3/);
  assert.match(source,/majorSubSystems/);
  assert.match(source,/crossSystemCombinations/);
  assert.match(source,/legacyContentRevisitHooks/);
  assert.match(source,/A×B×C\+@/);
  assert.match(source,/고전 카드\/주사위\/타일\/경매/);
});
