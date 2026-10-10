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
  assert.match(source,/MAIN × A × B × C/);
  assert.match(source,/themeFusion:C_FUSION_SCHEMA/);
  assert.match(source,/genreInterlock/);
  // C는 게임의 세 번째 시스템 축이 아니라 소재·장르 층이다. @의 인과 연결 대상으로는 허용한다.
  const axisSchema=source.slice(source.indexOf('const SYSTEM_AXIS_SCHEMA='),source.indexOf('const SUB_ELEMENT_SCHEMA='));
  assert.match(axisSchema,/key:\{type:'string',enum:\['A','B'\]\}/);
  assert.match(source,/majorAxes:\{type:'array',minItems:2,maxItems:2,items:SYSTEM_AXIS_SCHEMA\}/);
  assert.match(source,/connectsTo:.*enum:\['MAIN','A','B','C','c'\]/);
  assert.equal(source.includes("enum:['A','B','C']"),false);
  assert.match(source,/DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS/);
  assert.match(source,/SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE/);
  const legacyDepthLabels=['D1_'+'LIGHT_COMIC','D2_'+'STRANGE_FUSION','D3_'+'DEEP_CULTURAL','D4_'+'SYSTEMIC_MYTHIC'];
  for(const token of legacyDepthLabels)assert.equal(source.includes(token),false);
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


test('GAMEPLAY_SKETCH v4 creates emergent genre from material grammar × MAIN×A×B×c + @ delve layer',()=>{
  const seed=legacySeed();
  const grammar={
    toneBlend:['COMIC','PHILOSOPHICAL','ABSURD'],
    familiarAnchor:'체면 때문에 사소한 거짓말을 했다가 동네 전체가 그 말을 믿게 되는 익숙한 인간 갈등.',
    causalDNAs:[
      {id:'COMEDIC_MISUNDERSTANDING',source:'COMEDY_FARCE',principle:'오해가 연쇄적인 현실 결과를 만든다.',gameplayConversion:'NPC가 믿은 오해가 다음 목표와 동선을 실제로 바꾼다.',fusionRole:'사소한 거짓말을 반복 가능한 플레이 원인으로 만든다.'},
      {id:'TESTIMONY_CONSENSUS_REALITY',source:'HISTORY_LAW_EPISTEMOLOGY',principle:'합의된 증언이 사회적 사실로 인정된다.',gameplayConversion:'같은 믿음이 임계치를 넘으면 공간 규칙이 바뀐다.',fusionRole:'개인 오해를 월드 상태 변화로 확장한다.'}
    ],
    brokenGenreAssumption:'퍼즐의 정답을 찾는 대신 사람들이 어떤 오답을 믿게 만들지를 설계한다.',
    newPrimaryVerb:'오해를 설득해 현실로 만든다',
    worldRule:'충분한 사람이 같은 이야기를 믿으면 그 이야기가 일시적인 공간 규칙이 된다.',
    causalFusion:['오해가 증언 합의를 만들고 증언 합의가 맵 규칙을 바꾼다.','바뀐 맵 규칙이 다시 새로운 오해와 선택 조건을 만든다.'],
    irreducibilityTest:{removeFirstAxis:'오해를 빼면 단순한 투표 퍼즐이 된다.',removeSecondAxis:'합의 현실을 빼면 대화 개그로 끝난다.',verdict:'두 인과축과 시스템 융복합이 함께 있어야 대화가 월드 편집 행동이 된다.'},
    storyWorldBindings:{emotionalConflict:'인정받고 싶은 욕망과 들킬까 두려운 마음이 충돌한다.',characterRule:'NPC마다 믿고 싶은 이야기가 다르다.',monsterRule:'소문에서 태어난 괴물은 믿는 사람이 줄면 약해진다.',regionRule:'지역마다 권위 있는 증언자가 달라 현실 변경 조건이 다르다.',storyRule:'플레이어가 만든 현실의 후폭풍이 다음 사건 원인이 된다.',plausibility:'도시는 오래전부터 공동 증언을 계약과 법의 근거로 삼아 왔다.'},
    gameplaySystemFusion:{
      formula:'MAIN × A × B × c',
      main:{name:'설득',purpose:'주민의 믿음 상태를 바꾸는 중심 행동.',playerAction:'대상 주민에게 어떤 이야기를 믿게 할지 선택해 설득한다.',stateContribution:'믿음 수치와 이야기별 지지 상태를 만든다.'},
      majorAxes:[
        {key:'A',name:'증언 네트워크',purpose:'믿음이 주민 사이에서 전달되는 첫 번째 대축.',playerChoice:'누구를 먼저 설득해 전파 경로를 만들지 선택한다.',stateContribution:'증언 확산 속도와 신뢰 연결망을 바꾼다.'},
        {key:'B',name:'공간 퍼즐',purpose:'합의된 믿음을 실제 맵 상태로 변환하는 두 번째 대축.',playerChoice:'어떤 현실 변경을 이용해 이동 문제를 풀지 선택한다.',stateContribution:'문·벽·통로·위험 구역 상태를 바꾼다.'}
      ],
      subElements:[
        {name:'평판',role:'설득과 공간 변화의 사회적 반작용을 조절하는 c 서브요소.',supports:['MAIN','A'],variationEffect:'평판에 따라 같은 소문의 설득 비용과 전파 속도가 달라진다.'},
        {name:'시간대',role:'공간 퍼즐과 증언 네트워크의 조건을 바꾸는 c 서브요소.',supports:['A','B'],variationEffect:'시간대에 따라 증언자 위치와 현실 변경 지속시간이 달라진다.'}
      ],
      crossSystemRules:['설득 결과가 증언 네트워크의 전파 확률을 바꾼다.','증언 네트워크가 임계치를 넘으면 공간 퍼즐 상태가 실제로 변한다.','c 서브요소인 평판과 시간대가 설득·전파·공간 변화의 비용과 조건을 변주한다.','공간 변화의 후폭풍이 다음 설득 신뢰도와 사용할 수 있는 이야기를 다시 바꾼다.']
    },
    delveLayer:{formulaSuffix:'+ @',role:'DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS',elements:[
      {name:'거짓말 연쇄',discoveryCondition:'서로 모순되는 두 소문을 다른 집단에 동시에 퍼뜨린다.',masteryOrInsight:'집단마다 다른 현실을 잠시 유지할 수 있음을 발견한다.',gameplayEffect:'같은 지역 안에 서로 다른 통로 상태를 만든다.',connectsTo:['MAIN','A','B']},
      {name:'권위자 역이용',discoveryCondition:'평판이 낮은 상태에서 권위자의 약점을 먼저 공개한다.',masteryOrInsight:'권위가 신뢰의 절대값이 아니라 네트워크 관계임을 파악한다.',gameplayEffect:'낮은 평판에서도 특정 소문을 빠르게 확산시킨다.',connectsTo:['A','c']},
      {name:'재방문 재해석',discoveryCondition:'과거에 만든 거짓 현실이 굳어진 뒤 같은 동네로 돌아온다.',masteryOrInsight:'이전 퍼즐 해결이 다음 시대의 상식이 되었음을 발견한다.',gameplayEffect:'예전 벽과 문이 새로운 퀘스트와 지름길이 된다.',connectsTo:['B','c']},
      {name:'합의 붕괴 콤보',discoveryCondition:'두 집단의 지지율을 동시에 임계값 직전까지 올린 뒤 한 번에 진실을 공개한다.',masteryOrInsight:'현실 규칙의 생성뿐 아니라 붕괴 순서도 조작할 수 있음을 이해한다.',gameplayEffect:'기존에는 만들 수 없던 일시적 빈 공간과 특수 사건을 연다.',connectsTo:['MAIN','A','B','c']}
    ]},
    emergentGenre:{name:'합의현실 소문 퍼즐극',definition:'설득을 중심으로 증언 네트워크·공간 퍼즐·평판 후폭풍을 순환시키고 숨은 소문 조합을 파고드는 복합장르.',whyNotSingleConventionalGenre:'대화 퍼즐이나 사회 시뮬레이션 하나로 설명되지 않고 믿음이 실제 공간 규칙이 되는 인과와 시스템 순환이 장르를 만든다.',grammarFormula:'MATERIAL_CAUSAL_GRAMMAR × (MAIN × A × B × c) + @',categoryRole:'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE'},
    expansionVectors:['새 지역은 다른 증언 권위 구조를 가진다.','새 괴물은 증언 네트워크를 왜곡한다.','새 NPC는 평판과 공간 규칙 사이를 거래한다.','새 @ 요소는 기존 설득·네트워크·공간·평판을 새로운 순서로 엮는다.'],
    culturalAbstractionRule:'희극·철학·역사 재료는 높낮이 없이 동등하며 고유 표현이 아니라 인과구조만 재해석한다.'
  };
  const flowArchitecture=buildGameFlowArchitecture({gameId:'emergent-v4-test',genre:seed.GAME_CATEGORY,baseline:{content:{identity:'합의현실 소문 퍼즐극',playerFantasy:'오해를 현실로 만든다.',coreFun:'믿음 상태로 공간을 바꾼다.',coreLoop:seed.CORE_LOOP,progressionDirection:'더 복잡한 집단과 공간 규칙을 조합한다.',novelGameGrammar:grammar}},inventory:[]});
  seed.GAMEPLAY_SKETCH={
    version:4,source:'EMERGENT_V4_TEST',worldModel:'공동 증언이 공간 규칙으로 반영되는 동네.',actors:['플레이어','주민'],interactionChains:['설득 -> 증언 확산 -> 공간 변화 -> 후폭풍'],
    stateMachine:['ENTRY','READ','ACTION','STATE_CHANGE','CHOICE','RISK','GOAL'],firstPlayableCycle:['진입','관찰','설득','확산','현실 변화','후폭풍','다음 목표'],
    identityCore:{oneLineFantasy:'오해를 현실로 만들어 길을 푸는 소문 퍼즐.',playerRole:'소문을 다루는 동네 중재자.',representativeAction:'주민에게 이야기를 설득한다.',representativeChoice:'누구에게 어떤 말을 믿게 할지 고른다.',signatureWorldRule:'공동 믿음이 공간 규칙이 된다.',signatureSystemPromise:['증언 합의 현실화'],growthIdentity:'개인 오해에서 집단 현실 조작으로 성장한다.',identityCoherence:{worldCulture:'증언 중심 동네 문화.',visualLanguage:'믿음 상태가 표식으로 보인다.',audioLanguage:'소문 확산을 소리로 구분한다.',enemyItemNpcCoherence:'괴물과 아이템도 믿음 규칙을 따른다.'},threeSentenceTest:{whatGame:'소문으로 현실을 바꾸는 퍼즐극이다.',whatDifferent:'정답보다 믿게 만든 이야기가 공간 규칙이 된다.',whatGrowthUnlocks:'여러 집단과 공간 규칙의 조합을 다룬다.'},genreAdaptationRule:'운영 카테고리는 힌트일 뿐 최종 장르는 융복합 결과로 정한다.'},
    novelGameGrammar:grammar,playerPromise:'믿음과 현실의 인과를 이용해 새로운 해결법을 만든다.',funDrivers:['즉시 변화','오해 선택','숨은 조합'],balanceRules:['지배전략 방지','반작용 존재','복구 가능','정보 비용 존재'],
    pacingPlan:{first5Minutes:'첫 설득',minutes5To15:'첫 현실 변화',minutes15To25:'시스템 교차',minutes25To30:'첫 @ 발견',midLateGame:'여러 시스템 순환',replayMotivation:'다른 소문 조합'},
    progressionLayers:['MAIN 숙련','A/B/c 관계 숙련','@ 발견과 응용'],expansionPlan:['새 시스템 교차','새 지역 규칙','새 후폭풍','새 @ 조합'],longGoalScenario:['첫 설득','현실 변화','복합 규칙 해결'],
    completionCriteria:['첫 변화','A/B/c 연결','@ 발견','복구 가능'],codingGrowthHooks:['기존 함수 재사용','stable id 유지','권한 보존','저장 마이그레이션'],validationRisks:['병렬 기능 합산 금지','@를 네 번째 일반 시스템으로 오해 금지'],flowArchitecture
  };
  const pass=validateGameSeed(seed);
  assert.equal(pass.pass,true,pass.errors.join(','));
  const flow=evaluateGameFlowArchitecture(flowArchitecture);
  assert.equal(flow.pass,true,flow.blockers.join(','));
  assert.equal(flowArchitecture.systemBlueprint.novelGrammarContract.gameplaySystemFusion.formula,'MAIN × A × B × c');
  assert.deepEqual(flowArchitecture.systemBlueprint.novelGrammarContract.gameplaySystemFusion.majorAxes.map(row=>row.key),['A','B']);
  assert.ok(flowArchitecture.systemBlueprint.novelGrammarContract.gameplaySystemFusion.subElements.length>=2);
  assert.equal(flowArchitecture.systemBlueprint.novelGrammarContract.delveLayer.role,'DELVE_LAYER_NOT_GENERAL_SYSTEM_AXIS');
  assert.equal(flowArchitecture.systemBlueprint.novelGrammarContract.emergentGenre.categoryRole,'SEED_DISCOVERY_HINT_ONLY_NOT_FINAL_GENRE');
  const broken=structuredClone(seed);
  broken.GAMEPLAY_SKETCH.novelGameGrammar.delveLayer.role='SYSTEM_AXIS_D';
  const fail=validateGameSeed(broken);
  assert.equal(fail.pass,false);
  assert.ok(fail.errors.some(error=>error.includes('not a general system axis')));

  // 기존 V4 설계 호환성은 남기되 새로운 V5만 오너 창작 문법으로 인정한다.
  const v5=structuredClone(seed);
  v5.GAMEPLAY_SKETCH.version=5;
  const v5Grammar=v5.GAMEPLAY_SKETCH.novelGameGrammar;
  v5Grammar.gameplaySystemFusion.formula='MAIN × A × B × C';
  v5Grammar.gameplaySystemFusion.majorAxes[0].systemFamily='대화';
  v5Grammar.gameplaySystemFusion.majorAxes[0].sourceMaterial='희극적 오해';
  v5Grammar.gameplaySystemFusion.majorAxes[0].sourceDomain='연극';
  v5Grammar.gameplaySystemFusion.majorAxes[0].materialRule='오해가 쌓일수록 전파자에 따라 설득 비용과 성공 조건이 달라진다.';
  v5Grammar.gameplaySystemFusion.majorAxes[1].systemFamily='퍼즐';
  v5Grammar.gameplaySystemFusion.majorAxes[1].sourceMaterial='합의 현실';
  v5Grammar.gameplaySystemFusion.majorAxes[1].sourceDomain='인식론';
  v5Grammar.gameplaySystemFusion.majorAxes[1].materialRule='증언의 신뢰도가 높아질수록 문과 장애물의 공간 상태가 바뀐다.';
  v5Grammar.gameplaySystemFusion.themeFusion={
    themes:[
      {name:'철학',kind:'MATERIAL',causalEffect:'거짓말의 책임이 어떤 결과를 초래할지 선택에 영향을 준다.'},
      {name:'엽기',kind:'MATERIAL',causalEffect:'비정상적인 증언이 특수 동선과 추가 피해 위험을 만든다.'}
    ],
    genres:[
      {role:'PRIMARY',name:'미스터리',gameplayEffect:'단서의 신뢰도를 비교해 진실을 찾아야만 숨겨진 규칙에 접근한다.'},
      {role:'SECONDARY',name:'코믹',gameplayEffect:'잘못 전달된 농담이 목격자의 증언을 바꾸고 맵 규칙의 반전을 유도한다.'}
    ],
    genreInterlock:'미스터리 단서를 추적하는 중 코믹한 오해를 활용하면 접근 방법과 최종 진실이 달라진다.',
    jointWorldRule:'철학적 윤리와 엽기적 오해가 사람들의 믿음 상태와 공간의 실제 규칙을 뒤바꾼다.',
    abGameplayEffect:'대화에서 생긴 오해가 퍼즐 지형을 바꾸고 퍼즐의 변화가 대화 상대의 반응을 되돌려 바꾼다.'
  };
  v5Grammar.emergentGenre.grammarFormula='MAIN × A × B × C + @';
  const okV5=validateGameSeed(v5);
  assert.equal(okV5.pass,true,okV5.errors.join('; '));
  const v5Flow=buildGameFlowArchitecture({
    gameId:'emergent-v5-test',genre:v5.GAME_CATEGORY,
    baseline:{content:{identity:'합의현실 소문 퍼즐극',coreFun:'믿음을 바꾸는 추리 퍼즐',coreLoop:v5.CORE_LOOP,novelGameGrammar:v5Grammar}},
    inventory:[]
  });
  assert.equal(evaluateGameFlowArchitecture(v5Flow).pass,true);
  // 학교 만들기 타이쿤: C 장르는 필수, 예전 c 서브 시스템은 필수가 아니다.
  const school=structuredClone(v5);
  school.GAME_CATEGORY='SIMULATOR_TYCOON_INCREMENTAL';
  const schoolFusion=school.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion;
  delete schoolFusion.subElements;
  schoolFusion.main={name:'초등학교 만들기 타이쿤',purpose:'학생을 위한 학교를 직접 짓고 운영한다.',playerAction:'교실과 복도의 위치를 선택해 운영한다.',stateContribution:'학교 시설 배치와 학생 성장 목표가 운영 결과에 남는다.'};
  schoolFusion.majorAxes[0]={key:'A',name:'건축과 로마 신전',purpose:'교실 배치가 봉인과 학습의 조건을 바꾼다.',playerChoice:'교실과 복도·제례실의 위치를 결정한다.',stateContribution:'건물 동선이 시설 가동률과 봉인 범위를 바꾼다.',systemFamily:'HOUSING_BUILDING',sourceMaterial:'로마 신전 건축',sourceDomain:'서양 역사·신화',materialRule:'신전 구조를 따른 교실 배치가 학생 이동과 봉인 강도를 바꾼다.'};
  schoolFusion.majorAxes[1]={key:'B',name:'액션과 로마 신화 괴물',purpose:'학생 보호를 위한 대응 방식이 건축 요구를 바꾼다.',playerChoice:'시설과 괴물의 약점을 이용해 대응한다.',stateContribution:'괴물 사건 결과가 학교의 수업·동선 상태를 바꾼다.',systemFamily:'TARGETING_COMBAT',sourceMaterial:'로마 신화의 괴물',sourceDomain:'로마 신화',materialRule:'괴물의 출현과 대응이 학생 안전·학교 운영과 건물 수리 우선순위를 바꾼다.'};
  schoolFusion.themeFusion.genres=[{role:'PRIMARY',name:'미스터리',gameplayEffect:'단서를 조사해 사건 원인을 밝혀 봉인 설계를 해금한다.'},{role:'SECONDARY',name:'코믹',gameplayEffect:'학생들의 오해가 시설 접근·괴물 대응·정보 흐름을 바꾼다.'}];
  schoolFusion.crossSystemRules=['교실 건축 선택이 괴물 출현 경로를 바꾼다.','괴물 사건의 해결 결과가 다시 교실 배치와 운영 선택을 바꾼다.','철학과 엽기 소재의 단서가 사건의 진실에 접근하는 경로를 바꾼다.','코믹한 오해 때문에 같은 단서도 정보 비용과 봉인 선택이 달라진다.'];
  for(const element of school.GAMEPLAY_SKETCH.novelGameGrammar.delveLayer.elements)element.connectsTo=[...new Set(element.connectsTo.map(value=>value==='c'?'C':value))];
  const schoolResult=validateGameSeed(school);
  assert.equal(schoolResult.pass,true,schoolResult.errors.join('; '));
  const schoolFlow=buildGameFlowArchitecture({gameId:'school-tycoon-v5',genre:school.GAME_CATEGORY,baseline:{content:{identity:'초등학교 만들기 타이쿤',coreFun:'학교 건설과 운영 및 괴물 사건 대응',coreLoop:school.CORE_LOOP,novelGameGrammar:school.GAMEPLAY_SKETCH.novelGameGrammar}},inventory:[]});
  assert.equal(evaluateGameFlowArchitecture(schoolFlow).pass,true);
  const duplicatedFlow=structuredClone(schoolFlow);
  duplicatedFlow.systemBlueprint.novelGrammarContract.gameplaySystemFusion.themeFusion.themes[1].name='철학';
  assert.ok(evaluateGameFlowArchitecture(duplicatedFlow).blockers.includes('FLOW_C_TWO_THEMES_AND_CAUSAL_LINK_REQUIRED'));
  const duplicatedTheme=structuredClone(school);
  duplicatedTheme.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.themeFusion.themes[1].name='철학';
  assert.equal(validateGameSeed(duplicatedTheme).pass,false);
  const legacyWithoutSub=structuredClone(seed);
  delete legacyWithoutSub.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.subElements;
  assert.equal(validateGameSeed(legacyWithoutSub).pass,false);

  const oneGenre=structuredClone(v5);
  oneGenre.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.themeFusion.genres.pop();
  assert.equal(validateGameSeed(oneGenre).pass,false);
  const sameGenre=structuredClone(v5);
  sameGenre.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.themeFusion.genres[1].name='미스터리';
  assert.equal(validateGameSeed(sameGenre).pass,false);
  const noMaterial=structuredClone(v5);
  noMaterial.GAMEPLAY_SKETCH.novelGameGrammar.gameplaySystemFusion.majorAxes[0].sourceMaterial='';
  assert.equal(validateGameSeed(noMaterial).pass,false);
  const deep=structuredClone(v5);
  deep.GAMEPLAY_SKETCH.novelGameGrammar.delveLayer.elements.push(...Array.from({length:12},(_,i)=>({
    name:'파고들기'+i,discoveryCondition:'서로 다른 두 상태를 고의로 바꾸고 반응 순서를 관찰한다.',
    masteryOrInsight:'기존 시스템의 조건을 새 방향으로 재해석한다.',
    gameplayEffect:'새로운 선택·위험·보상 경로를 열고 재방문 의미를 바꾼다.',
    connectsTo:['MAIN','A','B']
  })));
  assert.equal(validateGameSeed(deep).pass,true);
});
