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
  assert.match(source,/identityCore:IDENTITY_CORE_SCHEMA/);
  assert.match(source,/threeSentenceTest/);
  assert.match(source,/representativeAction/);
  assert.match(source,/representativeChoice/);
  assert.match(source,/signatureWorldRule/);
  assert.match(source,/genreAdaptationRule/);
  assert.match(source,/모든 장르/);
  assert.match(source,/novelGameGrammar:NOVEL_GAME_GRAMMAR_SCHEMA/);
  assert.match(source,/causalDNA/);
  assert.match(source,/brokenGenreAssumption/);
  assert.match(source,/newPrimaryVerb/);
  assert.match(source,/irreducibilityTest/);
  assert.match(source,/D1_LIGHT_COMIC/);
  assert.match(source,/가볍고 단순한 엽기\/코믹/);
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



test('GAMEPLAY_SKETCH v3 identity core is enforced while legacy sketches stay compatible',()=>{
  const seed=legacySeed();
  const flowArchitecture=buildGameFlowArchitecture({
    gameId:'identity-v3-test',genre:seed.GAME_CATEGORY,
    baseline:{content:{identity:seed.DISTINCT_IDENTITY,playerFantasy:'대표 역할',coreFun:seed.CORE_FUN_TO_LEARN.join(' '),coreLoop:seed.CORE_LOOP,progressionDirection:'새 전략과 경로를 연다.'}},
    inventory:[]
  });
  seed.GAMEPLAY_SKETCH={
    version:3,source:'IDENTITY_V3_TEST',worldModel:'대표 행동과 선택이 월드 상태를 바꾸는 실제 플레이 공간.',
    actors:['플레이어','월드/상대'],interactionChains:['선택 -> 입력 -> 상태 변화 -> 다음 선택'],
    stateMachine:['ENTRY','READ','ACTION','STATE_CHANGE','CHOICE','RISK','GOAL'],firstPlayableCycle:['진입','관찰','행동','상태 변화','선택','위험','목표'],
    identityCore:{
      oneLineFantasy:'움직이는 도시의 운명을 거래와 탐험 선택으로 바꾸는 플레이어가 된다.',
      playerRole:'도시의 경로와 자원을 책임지는 운영자이자 탐험가다.',
      representativeAction:'지역을 탐험하고 자원·경로·대상을 실제 입력으로 선택한다.',
      representativeChoice:'지금 안전을 택할지 더 큰 보상을 위해 위험한 경로를 택할지 결정한다.',
      signatureWorldRule:'플레이어의 거래와 탐험 결과가 도시 이동 경로와 다음 지역의 접근 상태를 바꾼다.',
      signatureSystemPromise:['이동 도시의 경로와 경제가 같은 상태로 연결된다.'],
      growthIdentity:'성장하면 새 경로·거래 방식·탐험 조합과 이전 지역의 새 접근법이 열린다.',
      identityCoherence:{worldCulture:'도시 문화와 경제가 이동 생활에서 나온다.',visualLanguage:'UI와 지역 실루엣이 역할을 공유한다.',audioLanguage:'이동·시장·위험 상태의 소리가 구별된다.',enemyItemNpcCoherence:'적·아이템·NPC가 이동 도시의 자원과 갈등에 연결된다.'},
      threeSentenceTest:{whatGame:'이동 도시의 경로와 자원을 선택하는 탐험 운영 게임이다.',whatDifferent:'도시의 이동 자체가 경제와 탐험 경로를 바꾸는 세계 규칙이 핵심 차이다.',whatGrowthUnlocks:'성장하면 새 이동 경로·거래 방식·탐험 조합과 재방문 사건이 열린다.'},
      genreAdaptationRule:'해당 장르의 대표 행동을 우선하며 RPG식 시스템을 강제하지 않는다.'
    },
    playerPromise:'대표 행동과 선택을 숙련해 새로운 전략 경로를 연다.',
    funDrivers:['즉시 피드백','위험 보상 선택','숙련 후 새 선택'],balanceRules:['지배전략 방지','위협 동반 성장','복구 가능한 실패','경제 source/sink'],
    pacingPlan:{first5Minutes:'핵심 행동',minutes5To15:'첫 성장',minutes15To25:'새 연결',minutes25To30:'중간 목표',midLateGame:'시스템 조합',replayMotivation:'다른 선택'},
    progressionLayers:['세션 선택 확장','중기 경로 확장','장기 조합 확장'],expansionPlan:['새 행동','새 선택','새 공간','새 연결'],
    longGoalScenario:['초기 성공','중간 확장','장기 조합'],completionCriteria:['첫 성공','중반 변화','장기 조합','복구 가능'],
    codingGrowthHooks:['기존 함수 재사용','stable ID','중복 권한 금지','저장 마이그레이션'],validationRisks:['겉구현 금지','수치 복제 금지'],flowArchitecture
  };
  const pass=validateGameSeed(seed);
  assert.equal(pass.pass,true,pass.errors.join(','));
  delete seed.GAMEPLAY_SKETCH.identityCore;
  const fail=validateGameSeed(seed);
  assert.equal(fail.pass,false);
  assert.ok(fail.errors.some(error=>error.includes('identityCore')));
});
