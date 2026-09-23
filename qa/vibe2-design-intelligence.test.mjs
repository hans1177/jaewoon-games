import test from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN_INTELLIGENCE_STAGES, DESIGN_EVOLUTION_LOOP, buildVibeDesignIntelligence, validateDesignAwareExperience } from '../tools/vibe2-design-intelligence.mjs';
import { validateVibeExperiencePromotion } from '../tools/vibe2-experience-control.mjs';

test('pipeline keeps the requested eleven-stage order',()=>{
  assert.deepEqual(DESIGN_INTELLIGENCE_STAGES,[
    'DESIGNER','CONSTRAINT_ENGINE','CRITIC','CAUSALITY_GRAPH','PLAYER_MODEL','COMBAT_ECONOMY_SIMULATOR','IMPLEMENTATION','AUTO_PLAYER','TELEMETRY','DESIGN_REVIEW','EXPERIENCE_MEMORY'
  ]);
});

test('protected change blocks implementation and never expands authority',()=>{
  const result=buildVibeDesignIntelligence({task:{goal:'보호된 전투 핵심 변경',type:'implementation',protectedChange:true}});
  assert.equal(result.implementationGate.allowed,false);
  assert(result.implementationGate.blockers.includes('PROTECTED_GAMEPLAY_CHANGE_REQUIRES_OWNER_APPROVAL'));
  assert.equal(result.authorityExpanded,false);
});

test('locked artbook design change requires change request',()=>{
  const result=buildVibeDesignIntelligence({task:{goal:'핵심 루프 재설계',designChange:true,artbook:{locked:true}}});
  assert.equal(result.implementationGate.allowed,false);
  assert(result.implementationGate.blockers.includes('ARTBOOK_CHANGE_REQUEST_REQUIRED'));
});

test('locked explicit constraint conflict is detected',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'거미 스폰 수정',
    designConstraints:[{id:'spider-cap',rule:'거미 최대 3마리',locked:true,proposedChange:'6마리',preserves:false}]
  }});
  assert.equal(result.implementationGate.allowed,false);
  assert(result.implementationGate.blockers.includes('LOCKED_CONSTRAINT_CONFLICT:spider-cap'));
});

test('causality graph is not invented when input is absent',()=>{
  const result=buildVibeDesignIntelligence({task:{goal:'버그 수정'}});
  const causal=result.stages.find((row)=>row.name==='CAUSALITY_GRAPH');
  assert.equal(causal.status,'UNVERIFIED');
  assert.equal(causal.invented,false);
  assert.deepEqual(causal.nodes,[]);
});

test('deterministic combat and economy inputs are calculated without invented values',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'밸런스 검토',
    simulation:{combat:{playerHp:100,enemyHp:80,playerDps:20,enemyDps:10},economy:{incomePerMinute:50,upgradeCost:200}}
  }});
  const sim=result.stages.find((row)=>row.name==='COMBAT_ECONOMY_SIMULATOR');
  assert.equal(sim.combat.verified,true);
  assert.equal(sim.combat.metrics.ttkEnemySeconds,4);
  assert.equal(sim.combat.metrics.ttkPlayerSeconds,10);
  assert.equal(sim.economy.metrics.minutesToUpgrade,4);
  assert.equal(sim.inventedInputs,false);
});

test('post implementation stages wait for real evidence',()=>{
  const result=buildVibeDesignIntelligence({task:{goal:'전투 수정'}});
  assert.equal(result.stages.find((row)=>row.name==='AUTO_PLAYER').status,'WAITING_EVIDENCE');
  assert.equal(result.stages.find((row)=>row.name==='TELEMETRY').status,'WAITING_EVIDENCE');
  assert.equal(result.stages.find((row)=>row.name==='DESIGN_REVIEW').status,'WAITING_EVIDENCE');
  assert.equal(result.stages.find((row)=>row.name==='EXPERIENCE_MEMORY').ready,false);
});

test('verified auto-player telemetry review and QA make memory candidate ready',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'전투 수정',
    designEvidence:{
      autoPlayer:{verified:true,evidence:'play-run-17'},
      telemetry:{verified:true,runId:'telemetry-17'},
      designReview:{verified:true,evidence:'review-17',decision:'PASS'},
      qa:{verified:true,evidence:'qa-17'}
    }
  }});
  assert.equal(result.stages.find((row)=>row.name==='DESIGN_REVIEW').verified,true);
  assert.equal(result.stages.find((row)=>row.name==='EXPERIENCE_MEMORY').ready,true);
});

test('design-aware experience promotion requires auto-player telemetry and design review',()=>{
  const invalid=validateDesignAwareExperience({designIntelligenceRequired:true,authorityExpanded:false});
  assert.equal(invalid.valid,false);
  assert(invalid.issues.includes('design-auto-player-evidence-required'));
  const valid=validateDesignAwareExperience({
    designIntelligenceRequired:true,
    autoPlayerVerified:true,
    telemetryVerified:true,
    designReviewVerified:true,
    designReviewDecision:'PASS',
    authorityExpanded:false
  });
  assert.equal(valid.valid,true);
});

test('existing experience promotion gate enforces design evidence only for design-aware reviews',()=>{
  const base={
    gameId:'demo',engine:'unity',taskType:'post-modification',problem:'balance drift',goal:'repair',change:'commit abc',
    outcome:'PASS',reviewVerified:true,reviewDecision:'PASS',engineQaVerified:true,authorityExpanded:false,
    evidence:['commit:abc','qa:run-1']
  };
  const blocked=validateVibeExperiencePromotion({...base,designIntelligenceRequired:true});
  assert.equal(blocked.valid,false);
  assert(blocked.issues.includes('design-auto-player-evidence-required'));
  const allowed=validateVibeExperiencePromotion({
    ...base,designIntelligenceRequired:true,autoPlayerVerified:true,telemetryVerified:true,designReviewVerified:true,designReviewDecision:'PASS'
  });
  assert.equal(allowed.valid,true);
  const legacy=validateVibeExperiencePromotion(base);
  assert.equal(legacy.valid,true);
});


test('narrative contract tracks world character quest and payoff without changing authority',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'스토리 퀘스트와 대화를 설계한다',
    narrative:{
      worldRules:['마력숲의 연구소는 암호 없이는 열리지 않는다'],
      characterGoals:['연구원은 부품센서를 찾아 통신을 복구하려 한다'],
      plotBeats:['무전기 부품 전달 뒤 연구소 진입 정보 공개'],
      questStates:['parts_delivered -> sensor_search_unlocked'],
      foreshadowing:['거대한 나무 서쪽 끝 단서'],
      payoffs:['서쪽 끝에서 비밀번호 단서 회수'],
      dialogueRules:['NPC는 플레이어가 전달한 정보만 안다'],
      characterSpeechProfiles:[
        {character:'연구원',vocabularyRange:'기술용어를 쓰되 다급할수록 문장이 짧아진다',formality:'초면에는 존댓말, 신뢰가 쌓이면 덜 격식적',sentenceRhythm:'평소 짧은 설명 뒤 확인 질문',emotionalLeakage:'통신 실패 이야기에 불안이 새어 나온다',relationshipAddress:'플레이어의 신뢰 단계에 따라 호칭 변화',knowledgeBoundary:'센서 위치는 모르고 마지막 통신 좌표만 안다',worldContext:'연구소 규정과 마력숲 생태 지식을 가진다'}
      ],
      scenePlans:[
        {scene:'무전기 부품 전달',sceneObjective:'연구소 진입의 다음 목표를 자연스럽게 연다',characterObjectives:['연구원은 통신을 복구하려 한다','플레이어는 다음 단서를 얻으려 한다'],conflict:'센서 위치 정보가 불완전하다',informationState:'플레이어는 서쪽 거대나무 단서를 아직 모른다',emotionalBeat:'안도 뒤 불안',turnOrReversal:'복구된 무전에서 서쪽 끝 잡음이 반복된다',consequence:'sensor_search_unlocked',foreshadowing:'거대한 나무 서쪽 끝',payoffReference:'서쪽 끝 비밀번호 단서'}
      ],
      grammarAndVoiceReviewed:true
    }
  }});
  assert.equal(result.narrative.required,true);
  assert.equal(result.narrative.status,'READY');
  assert.deepEqual(result.narrative.issues,[]);
  assert.equal(result.narrative.authorityExpanded,false);
});

test('narrative contract warns when foreshadowing has no tracked payoff',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'복선이 있는 스토리 추가',
    narrative:{
      worldRules:['숲의 규칙'],
      characterGoals:['주인공은 실종자를 찾는다'],
      plotBeats:['이상한 표식을 발견한다'],
      foreshadowing:['표식의 의미를 암시한다']
    }
  }});
  assert.equal(result.narrative.required,true);
  assert.ok(result.narrative.issues.includes('FORESHADOWING_WITHOUT_TRACKED_PAYOFF'));
});


test('design evolution loop is stability-first and unlimited',()=>{
  assert.deepEqual(DESIGN_EVOLUTION_LOOP,[
    'STABILIZE','UNDERSTAND','OBSERVE','DIAGNOSE','SCORE','PROPOSE','COMPARE','REVISE','VALIDATE','LEARN','REPLAN','EXPAND'
  ]);
  const result=buildVibeDesignIntelligence({task:{
    goal:'새 지역을 확장한다',
    designChange:true,
    knownIssues:[{id:'save-1',text:'세이브 로드 후 퀘스트 진행이 막힘',verified:true,severity:'HIGH'}],
    conceptBlueprint:{
      premise:'위험한 숲 탐험과 귀환을 확장한다',
      designPillars:['탐험','생존','선택'],
      sessionArc:['준비','탐험','위기','귀환'],
      emotionalCurve:['호기심','긴장','안도'],
      worldRules:['마력 오염은 지역마다 다르게 반응한다'],
      signatureMoments:['처음 거대 생물 흔적 발견','귀환 직전 추격']
    },
    designAlternatives:[
      {id:'PLAN_A',concept:'기존 생존 탐험을 깊게 확장',genreDirection:'survival rpg',coreLoopDifference:'지역 규칙을 추가',risks:'복잡도',reversibility:'지역 단위 롤백 가능'},
      {id:'PLAN_B',concept:'추격 중심 액션을 섞은 하이브리드',genreDirection:'survival action',coreLoopDifference:'탐험 중 추격 구간 추가',risks:'조작 부담',reversibility:'이벤트 비활성화 가능'}
    ]
  }});
  assert.equal(result.version,2);
  assert.equal(result.evolution.unlimitedRevisions,true);
  assert.equal(result.evolution.stability.status,'STABILIZE_FIRST');
  assert.equal(result.evolution.stability.topPriority,'SAVE_LOAD_OR_MIGRATION_FAILURE');
  assert.equal(result.evolution.stability.expansionMayProceed,false);
});

test('same owner wording with a new event remains a new design revision signal',()=>{
  const task={
    id:'design-owner-2',goal:'초반 전투가 재미없어',type:'design',designChange:true,ownerDirective:true,
    ownerLiteralRequest:'초반 전투가 재미없어',ownerRequestInstanceId:'OWNER-EVENT-2',ownerRepeatCount:2,
    conceptBlueprint:{premise:'초반 전투의 선택과 피드백을 재구성',designPillars:['읽기','선택','타격감'],sessionArc:['진입','교전','결정','회복'],emotionalCurve:['경계','압박','성취'],worldRules:['초반 적은 한 번에 한 역할만 가르친다'],signatureMoments:['첫 완벽 회피','첫 위험 보상 선택']},
    designAlternatives:[
      {id:'PLAN_A',concept:'적 역할과 counterplay를 재구성',genreDirection:'action survival',coreLoopDifference:'읽고 대응하는 전투 강화',risks:'학습량',reversibility:'적 테이블 복구 가능'},
      {id:'PLAN_B',concept:'환경 상호작용 중심 전투로 전환',genreDirection:'action adventure hybrid',coreLoopDifference:'지형 선택이 전투 결과를 바꿈',risks:'맵 의존',reversibility:'지역 규칙 비활성화 가능'}
    ]
  };
  const result=buildVibeDesignIntelligence({task});
  assert.equal(result.evolution.ownerIntent.eventId,'OWNER-EVENT-2');
  assert.equal(result.evolution.ownerIntent.repeatedCount,2);
  assert.equal(result.evolution.ownerIntent.repeatedRequestMeansPriorAttemptInsufficient,true);
  assert.equal(result.evolution.ownerIntent.semanticTextDeduplicationAllowed,false);
  assert.ok(result.evolution.opportunity.score>=220);
});

test('genre shift is allowed only as an explicit challenger before replacing baseline',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'장르를 더 과감하게 바꿔본다',type:'design',designChange:true,
    currentGenre:'survival rpg',proposedGenre:'survival stealth horror',
    conceptBlueprint:{premise:'생존 탐험에 잠입 공포를 결합',designPillars:['생존','잠입','긴장'],sessionArc:['탐색','노출위험','추격','탈출'],emotionalCurve:['불안','공포','안도'],worldRules:['소음이 포식자를 유인'],signatureMoments:['빛이 꺼진 추격','안전지대 도착']},
    designAlternatives:[
      {id:'PLAN_A',concept:'기존 RPG 비중 유지',genreDirection:'survival rpg',coreLoopDifference:'잠입은 선택적',risks:'새로움 약함',reversibility:'높음'},
      {id:'PLAN_B',concept:'잠입 공포 challenger',genreDirection:'survival stealth horror',coreLoopDifference:'소음과 시야가 핵심 자원',risks:'정체성 이동',reversibility:'별도 지역에서 검증'}
    ]
  }});
  assert.equal(result.evolution.creativeChallenge.genreShift,true);
  assert.ok(result.evolution.creativeChallenge.issues.includes('GENRE_SHIFT_MUST_RUN_AS_CHALLENGER'));
});

test('content diversity rejects numeric-only map or enemy variation',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'맵 지역과 몬스터를 확장한다',
    contentDiversityPlan:{
      regions:[{name:'숲'},{name:'동굴'}],
      enemiesOrActors:[{name:'늑대'},{name:'곰'}],
      variationRules:['HP']
    }
  }});
  assert.equal(result.evolution.contentDiversity.required,true);
  assert.ok(result.evolution.contentDiversity.issues.includes('NUMERIC_OR_COLOR_ONLY_VARIATION_INSUFFICIENT'));
});

test('dialogue realism requires character voice and scene objective when dialogue is material',()=>{
  const weak=buildVibeDesignIntelligence({task:{
    goal:'중요 NPC 대화를 추가한다',
    narrative:{
      worldRules:['문은 암호가 있어야 열린다'],
      characterGoals:['경비병은 규칙을 지키려 한다'],
      plotBeats:['문 앞에서 대치한다'],
      dialogueRules:['경비병은 암호를 모르면 통과시키지 않는다']
    }
  }});
  assert.ok(weak.narrative.issues.includes('DIALOGUE_CHARACTER_SPEECH_PROFILE_NOT_BOUND'));
  assert.ok(weak.narrative.issues.includes('DIALOGUE_SCENE_OBJECTIVE_OR_SUBTEXT_NOT_BOUND'));

  const ready=buildVibeDesignIntelligence({task:{
    goal:'중요 NPC 대화를 추가한다',
    narrative:{
      worldRules:['문은 암호가 있어야 열린다'],
      characterGoals:['경비병은 규칙을 지키려 한다'],
      plotBeats:['문 앞에서 대치한다'],
      dialogueRules:['경비병은 암호를 모르면 통과시키지 않는다'],
      characterSpeechProfiles:[
        {character:'경비병',vocabularyRange:'짧고 규정 중심',formality:'딱딱한 존댓말',sentenceRhythm:'짧게 끊음',emotionalLeakage:'위험 소식에 목소리가 급해짐',relationshipAddress:'낯선 이는 직책 없이 부름',knowledgeBoundary:'암호 변경 이유는 모름',worldContext:'성문 규정만 숙지'}
      ],
      scenePlans:[
        {scene:'성문 대치',sceneObjective:'암호 필요성을 행동으로 전달',characterObjectives:['경비병은 통과를 막는다'],conflict:'플레이어는 급히 들어가야 한다',informationState:'경비병은 플레이어 목적을 모른다',emotionalBeat:'경계',turnOrReversal:'멀리서 경보가 울려 판단 압박이 생긴다',consequence:'암호 퀘스트가 열린다',foreshadowing:'경보 방향',payoffReference:'성 내부 침입 사건'}
      ],
      grammarAndVoiceReviewed:true
    }
  }});
  assert.equal(ready.narrative.status,'READY');
  assert.deepEqual(ready.narrative.issues,[]);
});
