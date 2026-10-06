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
    narrativeDepth:{
      applicable:true,storyWeight:'MEDIUM',
      worldConflict:'옛 방어도시와 신흥 상단이 유적 자원과 안전한 교역로를 두고 경쟁하며 지역 주민과 방어선 상태가 함께 변한다.',
      mainStoryArc:'초반 방어 사건에서 시작해 상단·수비대·탐험가의 서로 다른 기록을 모으고 중반 동료와 서브퀘 선택을 거쳐 후반 도시의 과거와 비밀 웨이브의 원인을 밝힌다.',
      narrativeDnaSources:['CHINESE_CLASSICAL_HISTORY','GREEK_EPIC_MYTH','DETECTIVE_MYSTERY'],
      rightsModes:['PUBLIC_DOMAIN_OR_HISTORICAL_STRUCTURE','ORIGINAL_SYNTHESIS'],
      npcRelationshipWeb:['수비대장과 상단주는 교역로 통제권을 두고 경쟁하며 플레이어 평판에 따라 지원과 가격이 달라진다','탐험가 동료는 기록원과 사제 사이의 오래된 갈등을 알고 있어 저널 단서와 대화 분기를 연다'],
      companionArcs:['탐험가 동료는 유적 조사→가문 기록 발견→세력 선택 갈등→비밀 경로 안내 순으로 성장하고 파티 구성에 따라 대사가 바뀐다'],
      mainSubquestLinks:['상단의 잃어버린 장부 서브퀘 결과가 메인 방어 보급과 지원군 상태를 바꾼다','수비대 묘지 기록 조사 결과가 후반 비밀 웨이브 원인과 보스 대응법을 연다'],
      foreshadowPayoffs:['초반 성벽 낙서의 옛 지명이 중반 저널에서 옛 광산 입구임이 밝혀지고 후반 비밀 지역으로 회수된다','NPC가 반복해서 언급하는 검은 비늘이 후반 몬스터 이동 경로와 유적 붕괴 원인을 설명한다'],
      factionCultureHooks:['수비대는 명예와 배급 규율을 중시하고 상단은 계약과 신용을 중시해 퀘스트·가격·대화 규칙이 다르다','외곽 주민은 괴물 출현과 옛 지명에 대한 민간 전승을 보존해 탐험 단서를 제공한다'],
      historicalMythReinterpretations:['고전 군웅 경쟁의 권력 구조를 도시 방어와 상단 경쟁으로 재구성한다','영웅 서사와 미스터리 기법을 유적 기록과 동료 선택으로 변형한다'],
      worldbuildingFusion:['권력 경쟁 × 교역로 × 유적 신화를 도시 방어 사건으로 연결한다','지역 경제 × 주민 관계 × 몬스터 이동을 하나의 월드 상태로 연결한다','저널 미스터리 × 탐험 × 방어 보스 대응을 후반 진실로 연결한다'],
      storySystemLinks:['평판 변화가 상점 가격과 동료 지원을 바꾼다','저널 단서가 지도 표식과 비밀 퀘스트를 연다','세력 선택이 방어 지원군과 보스 진입 경로를 바꾼다'],
      contentCausalityLinks:['새 지역은 옛 전쟁과 자원 갈등 때문에 열린다','몬스터는 유적 붕괴와 먹이 이동 때문에 방어선에 등장한다','유물은 기록 해석과 장비 조합에 사용된다','미니게임 결과가 상단 평판과 보급품을 바꾼다'],
      worldEvolutionHooks:['메인 방어 결과가 성벽·상점·NPC 배치와 위험도를 바꾼다','후반 기록 해석이 초기 지역의 옛 지명과 숨은 길을 새 의미로 연다'],
      placeNameLedger:['회색문 성벽: 옛 광산 관문에서 유래하며 지도·표지판·대화·저널이 같은 이름을 쓴다','세 갈래 시장: 세 교역로가 만나는 곳이라 상단 사건과 가격 변동의 중심이다','검은비늘 골짜기: 괴물 이동 흔적에서 유래하며 도감과 주민 소문이 같은 지명을 공유한다'],
      journalRecordChains:['수비대 일지와 상단 장부와 묘지 비문을 조합하면 옛 방어 실패의 원인을 재구성할 수 있다','탐험가 메모의 지명이 지도 표식과 NPC 질문, 비밀 지역 해금으로 이어진다'],
      dialogueJournalLinks:['저널을 읽은 뒤 수비대장에게 새 질문이 열리고 메인 방어 준비 상태가 갱신된다','상단 장부를 발견하면 상인 NPC의 기존 주장과 충돌하는 대화가 열려 서브퀘가 분기된다'],
      monsterOpponentLoreEcologyLinks:['검은비늘 포식자는 골짜기 먹이 이동과 유적 열기 때문에 성벽으로 이동하며 도감·저널·전투 패턴이 이를 공유한다','약탈대는 상단 교역로와 세력 갈등 때문에 나타나며 처치/협상 결과가 시장 상태를 바꾼다'],
      namingRules:['같은 도시권 지명은 문·길·시장·골짜기처럼 기능/지형 어휘를 공유하고 실제 고유명 복제를 피한다','몬스터·조직 이름은 지역 사건과 역할이 드러나되 UI에서 구분 가능한 길이로 유지한다'],
      culturalRespectRules:['역사 소재를 민족 우열로 단순화하지 않는다','실제 비극을 보상 장치로 희화화하지 않는다','보호 작품의 고유 명칭과 인물은 복제하지 않는다']
    },
    styleWorldDepth:{
      styleFusion:'동아시아 성곽도시 × 교역항 × 유적 미스터리의 시각 언어를 방어 가독성과 결합한다.',
      styleDnaSources:['EAST_ASIAN_CLASSICAL','MARITIME_TRADE_PORT','MYSTERY_NOIR'],
      architectureSettlement:'성벽·시장·부두·기록원 건축이 세력의 권한과 물류 동선을 보여주고 방어 배치 위치를 읽기 쉽게 만든다.',
      environmentBiomes:'성벽 외곽 골짜기와 강변 교역로, 유적지의 지형과 기후가 몬스터 이동과 자원 경로를 구분한다.',
      materialPropLanguage:'석재 성벽·목재 상점·금속 방어시설·낡은 기록 소품이 시대와 기능 차이를 표면 흔적으로 보여준다.',
      characterCostumeSilhouette:'수비대·상인·탐험가·적 역할이 의상 실루엣과 장비 형태로 구분된다.',
      paletteLightingWeather:'시장과 안전구역은 따뜻한 조명, 외곽 위험지역은 차가운 안개와 경고 조명으로 구분한다.',
      backgroundStorytelling:'부서진 성문·옛 표지석·폐쇄 광산·장부가 세계의 전쟁과 교역 역사를 배경만으로 추론하게 한다.',
      regionalStyleVariation:['성벽 중심지는 군사 규율과 석재 구조','시장은 상업 소품과 간판 밀도','골짜기는 유적 파편과 몬스터 흔적'],
      gameplayReadabilityLinks:['랜드마크 실루엣이 길찾기를 돕는다','적 실루엣이 역할을 전달한다','조명과 안개가 위험 상태를 전달한다'],
      styleExpansionHooks:['세력 선택에 따라 시장 깃발과 방어시설이 변한다','후반 재방문 시 폐쇄 광산이 복원되어 새 시각 상태를 가진다'],
      artRightsRules:['공공영역 구조만 재해석한다','보호 작품 고유 디자인을 복제하지 않는다','실제 문화권을 단일 고정관념으로 표현하지 않는다'],
      assetLibraryExpansionRequired:false,assetLibraryReferenceHints:['기존 호환 환경·재질·소품을 우선 검색한다']
    },
    worldbuildingDepth:{
      allGenreApplicable:true,
      worldPremise:'성벽 도시의 방어, 교역, 유적 조사, 주민 관계가 옛 전쟁과 현재 몬스터 이동이라는 같은 원인망에서 움직이는 세계다.',
      worldDnaSources:['CIVILIZATION_AND_POWER','GEOGRAPHY_AND_ECOLOGY','ECONOMY_AND_DAILY_LIFE','ARCHIVE_JOURNAL_AND_RUMOR','MONSTER_OPPOSITION_ECOLOGY'],
      civilizationPowerOrder:'수비대·상단·기록원이 서로 다른 권한과 의무를 갖고 지역 통제와 퀘스트 발생 조건에 영향을 준다.',
      geographyEcology:'강·골짜기·폐광·성벽 통로가 자원과 교역로, 몬스터 서식과 방어 경로를 결정한다.',
      economyDailyLife:'시장 보급과 주민 생업, 교역 가격과 축제가 상점·서브퀘·방어 준비 상태에 연결된다.',
      beliefMythTaboo:'옛 전쟁 영웅과 유적 금기에 대한 전승이 의식, 유물, 비밀지역과 몬스터 소문의 기원이 된다.',
      technologyInstitutions:'기록원·대장간·방어공방이 정보 해석, 장비 제작, 성벽 강화와 탐험 도구를 제공한다.',
      placeNameLogic:'지명은 지형·역사·산업·괴물 사건에서 유래하고 지도·표지판·대화·저널에서 같은 표기를 사용한다.',
      journalArchiveLogic:'저널·장부·비문은 서로 다른 관점으로 같은 사건을 기록하고 현장 흔적과 NPC 증언으로 교차검증된다.',
      monsterOpponentEcology:'몬스터와 약탈대는 지역 생태와 교역 갈등, 옛 유적 사건 때문에 출현하며 행동과 보상이 그 원인을 반영한다.',
      dialogueMemoryLogic:'NPC는 플레이어가 읽은 기록과 세력 선택, 최근 방어 결과를 기억해 질문과 태도, 후속 퀘스트를 바꾼다.',
      causalChains:['옛 전쟁→옛 지명→저널→NPC 질문→비밀 퀘스트','골짜기 생태→몬스터 이동→방어 웨이브→도감/보상','교역로→시장 가격→상단 관계→보급 선택','유적 금기→기록 해석→탐험 경로→후반 보스 대응'],
      worldStateEvolution:['방어와 세력 선택에 따라 시장·성벽·NPC·몬스터 출현이 변한다','후반 정보가 초기 지명과 기록의 의미를 재해석해 새 상호작용을 연다'],
      crossMediaClueLinks:['지도 지명과 표지판과 저널이 같은 장소를 가리킨다','도감과 NPC 소문과 전투 패턴이 같은 몬스터 생태를 설명한다','저널 단서 확인 후 대화와 퀘스트 상태가 바뀐다'],
      genreExpression:'디펜스 장르에서는 긴 컷신보다 웨이브 전후 대화, 지도 지명, 짧은 저널, 몬스터 도감과 지역 변화로 세계관을 표현한다.'
    },
    libraryLinkage:{
      allCanonicalLibrariesSearchable:true,
      libraryFamilies:['INTERNAL_ASSET_LIBRARY','VERIFIED_LEARNING_LIBRARY','CODE_PATTERN_LIBRARY','GAME_SEED_MATERIAL_LIBRARY','DESIGN_BASELINE_LIBRARY','GAME_CATALOG_LIBRARY','LICENSED_REFERENCE_LIBRARY','OPEN_SOURCE_REFERENCE_CATALOG'],
      selectionRule:'모든 canonical 라이브러리를 현재 장르·플랫폼·세계관·책임 소스와 대조하고 호환성·권리·게임 정체성을 통과한 후보만 기존 책임 시스템에서 실제 소비한다.',
      fallbackRule:'호환 후보가 없으면 강제 대입하지 않고 기존 소스와 설계를 유지하며 검증된 필요가 있을 때만 기존 canonical 생성 경로를 사용한다.',
      compatibilityRightsAndGameIdentityFirst:true,actualConsumerEvidenceRequired:true,noForcedUse:true,noShadowPipeline:true
    },
    flowArchitecture:buildGameFlowArchitecture({gameId:'seed-v3-depth',genre:seed.GAME_CATEGORY,baseline:{content:{identity:seed.DISTINCT_IDENTITY,coreFun:seed.CORE_FUN_TO_LEARN.join(' '),coreLoop:seed.CORE_LOOP,progressionDirection:'탐험과 수집, 무역이 방어 성장에 연결된다.'}},inventory:[]})
  };
  const pass=validateGameSeed(seed);
  assert.equal(pass.pass,true,pass.errors.join(','));

  const broken=structuredClone(seed);
  broken.GAMEPLAY_SKETCH.compositionDepth.majorSubSystems=['탐험','수집'];
  broken.GAMEPLAY_SKETCH.compositionDepth.crossSystemCombinations=['A×B'];
  broken.GAMEPLAY_SKETCH.compositionDepth.endgameFusion='';
  broken.GAMEPLAY_SKETCH.narrativeDepth.placeNameLedger=['하나'];
  broken.GAMEPLAY_SKETCH.worldbuildingDepth.allGenreApplicable=false;
  broken.GAMEPLAY_SKETCH.libraryLinkage.actualConsumerEvidenceRequired=false;
  const fail=validateGameSeed(broken);
  assert.equal(fail.pass,false);
  assert.ok(fail.errors.some(error=>error.includes('majorSubSystems')));
  assert.ok(fail.errors.some(error=>error.includes('crossSystemCombinations')));
  assert.ok(fail.errors.some(error=>error.includes('endgameFusion')));
  assert.ok(fail.errors.some(error=>error.includes('placeNameLedger')));
  assert.ok(fail.errors.some(error=>error.includes('allGenreApplicable')));
  assert.ok(fail.errors.some(error=>error.includes('actualConsumerEvidenceRequired')));
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
  assert.match(source,/WORLDBUILDING_DEPTH_SCHEMA/);
  assert.match(source,/LIBRARY_LINKAGE_SCHEMA/);
  assert.match(source,/placeNameLedger/);
  assert.match(source,/journalRecordChains/);
  assert.match(source,/monsterOpponentLoreEcologyLinks/);
  assert.match(source,/모든 canonical 라이브러리/);
});
