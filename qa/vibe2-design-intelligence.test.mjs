import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { DESIGN_INTELLIGENCE_STAGES, buildVibeDesignIntelligence, buildDesignEvolutionBrief, validateDesignAwareExperience } from '../tools/vibe2-design-intelligence.mjs';
import { validateVibeExperiencePromotion } from '../tools/vibe2-experience-control.mjs';

test('pipeline keeps stability defect ownership blueprint and validation in one design intelligence order',()=>{
  assert.deepEqual(DESIGN_INTELLIGENCE_STAGES,[
    'STABILITY_TRIAGE','DEFECT_OWNERSHIP','DESIGNER','DESIGN_BLUEPRINT','DESIGN_INTEGRITY','CONTENT_DIVERSITY',
    'REFERENCE_HOMAGE','NARRATIVE_DIALOGUE','CONSTRAINT_ENGINE','CRITIC','CAUSALITY_GRAPH','PLAYER_MODEL','COMBAT_ECONOMY_SIMULATOR','IMPLEMENTATION',
    'AUTO_PLAYER','TELEMETRY','DESIGN_REVIEW','EXPERIENCE_MEMORY'
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
      dialogueRules:['NPC는 플레이어가 전달한 정보만 안다','연구원은 긴장할수록 짧은 존댓말을 쓰고 확인되지 않은 사실을 단정하지 않는다'],
      characterVoiceProfiles:[{
        character:'연구원',grammarRegister:'기본 존댓말, 위기에서는 짧고 끊어진 문장',
        vocabularyRhythm:'기술 용어는 정확히 쓰되 플레이어에게는 짧게 풀어 말한다',
        relationshipShift:'신뢰 전에는 거리감 있는 존댓말, 신뢰 후에는 협력적인 어조',
        emotionalRange:'평시 침착, 통신 두절 시 조급함, 복구 후 안도',
        knowledgeBoundary:'직접 확인한 연구소 기록과 플레이어가 전달한 정보만 안다',
        subtextBehavior:'두려움을 숨기려 할수록 절차와 숫자를 강조한다'
      }],
      sceneBeats:[{
        scene:'부품 전달 뒤 연구소 입구',purpose:'암호 단서와 연구원의 불안을 동시에 드러낸다',
        characterGoals:'연구원은 통신 복구, 플레이어는 다음 지역 진입 정보 확보',
        conflict:'암호가 완전하지 않고 서쪽 단서가 필요하다',
        informationAsymmetry:'연구원은 기록 일부만 알고 플레이어는 현장 흔적을 봤다',
        reversal:'전달한 부품이 통신용이 아니라 암호 복호화에도 필요했음이 드러난다',
        stateChange:'sensor_search_unlocked'
      }]
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


test('runtime movement bug routes to development QA instead of duplicate redesign',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'캐릭터가 안 움직이는 문제 수정',
    defectDriven:true,
    defects:[{symptom:'캐릭터가 입력을 받아도 안 움직이고 movement code가 갱신되지 않음',severity:'CRITICAL',causeClass:'IMPLEMENTATION_RUNTIME_DEFECT',evidence:'runtime-run-1'}]
  }});
  assert.equal(result.stability.status,'REPAIR_FIRST');
  assert.equal(result.defectOwnership.owner,'DEVELOPMENT_QA');
  assert.equal(result.defectOwnership.route,'EXISTING_DEVELOPMENT_QA_REPAIR');
  assert.equal(result.defectOwnership.designRevisionAllowed,false);
  assert.equal(result.implementationGate.allowed,false);
  assert.ok(result.implementationGate.blockers.includes('DEFECT_OWNED_BY_DEVELOPMENT_QA'));
});

test('verified impossible quest prerequisite is owned by design and opens targeted revision',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'진행 막힘 원인 수정',
    defectDriven:true,
    defects:[{symptom:'퀘스트 선행 조건이 서로 순환해서 어떤 플레이 순서로도 만족할 수 없음',severity:'HIGH',causeClass:'DESIGN_DEFECT',evidence:'quest-graph-proof'}],
    designChange:true,
    designRationale:'불가능한 선행조건을 제거해야 진행 가능하다',
    designAlternatives:['PLAN_A: 선행조건 순서를 단방향으로 재구성','PLAN_B: 병렬 목표 뒤 합류 상태로 재구성'],
    selectedDesignPlan:'PLAN_A',
    selectedDesignRationale:'현재 퀘스트 의미를 가장 적게 바꾸면서 도달성을 회복한다'
  }});
  assert.equal(result.defectOwnership.owner,'DESIGN');
  assert.equal(result.defectOwnership.route,'TARGETED_DESIGN_REVISION');
  assert.equal(result.defectOwnership.designRevisionAllowed,true);
});

test('unresolved symptom traces cause before mutating design',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'가끔 진행이 멈춘다',defectDriven:true,
    defects:[{symptom:'가끔 다음 지역이 열리지 않는다',severity:'HIGH',causeClass:'UNRESOLVED_CAUSE',evidence:'playtest-17'}]
  }});
  assert.equal(result.defectOwnership.owner,'UNRESOLVED');
  assert.equal(result.defectOwnership.route,'TRACE_CAUSALITY_BEFORE_MUTATION');
  assert.equal(result.implementationGate.allowed,false);
});

test('material design change requires plan A and B plus selected rationale',()=>{
  const missing=buildVibeDesignIntelligence({task:{goal:'장르를 확장한다',type:'design',designChange:true,designRationale:'새 플레이 가능성 검토'}});
  assert.ok(missing.blueprint.issues.includes('PLAN_A_B_REQUIRED_FOR_MATERIAL_DESIGN_CHANGE'));
  assert.equal(missing.implementationGate.allowed,false);
  assert.ok(missing.implementationGate.blockers.includes('PLAN_A_B_REQUIRED_FOR_MATERIAL_DESIGN_CHANGE'));
  const ready=buildVibeDesignIntelligence({task:{
    goal:'장르를 확장한다',type:'design',designChange:true,designRationale:'새 플레이 가능성 검토',
    designAlternatives:[
      {label:'PLAN_A',concept:'기존 생존 탐험을 깊게 확장'},
      {label:'PLAN_B',concept:'생존 기반에 지역별 잠입 챌린지를 결합'}
    ],
    selectedDesignPlan:'PLAN_B',selectedDesignRationale:'정체성을 유지하면서 새로운 플레이 리듬을 만든다'
  }});
  assert.equal(ready.blueprint.alternatives.length,2);
  assert.equal(ready.blueprint.selectedPlan,'PLAN_B');
  assert.equal(ready.blueprint.genreChallengeAllowed,true);
  assert.equal(ready.blueprint.baseConceptIsReferenceNotPrison,true);
});

test('content diversity detects repeated map and enemy templates',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'맵과 몬스터 다양성 점검',
    contentDiversity:{
      regions:[
        {traversal:'직선',riskReward:'낮음',landmark:'돌',encounterPattern:'근접몹',resourcePressure:'나무',storyContext:'숲'},
        {traversal:'직선',riskReward:'낮음',landmark:'돌',encounterPattern:'근접몹',resourcePressure:'나무',storyContext:'숲'}
      ],
      enemies:[
        {behavior:'추적',counterplay:'뒤로 이동',positioning:'정면',timing:'2초',mobility:'보통',groupRole:'근접',identity:'같은 실루엣',rewardMeaning:'골드'},
        {behavior:'추적',counterplay:'뒤로 이동',positioning:'정면',timing:'2초',mobility:'보통',groupRole:'근접',identity:'같은 실루엣',rewardMeaning:'골드'}
      ],
      objectives:[{role:'collect'},{role:'collect'},{role:'collect'}]
    }
  }});
  assert.equal(result.diversity.status,'VARIETY_DEBT');
  assert.ok(result.diversity.issues.includes('MAP_REGION_TEMPLATE_MONOTONY'));
  assert.ok(result.diversity.issues.includes('ENEMY_ROLE_TEMPLATE_MONOTONY'));
  assert.ok(result.diversity.issues.includes('OBJECTIVE_TEMPLATE_MONOTONY'));
});

test('dialogue design requires character-specific grammar voice knowledge and scene beats',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'스토리 대화와 반전을 설계한다',dialogueRequired:true,
    narrative:{
      worldRules:['왕도 밖에서는 통신 마법이 끊긴다'],
      characterGoals:['기사단장은 실종 원인을 숨기려 한다'],
      plotBeats:['초반 보고서와 후반 증언이 충돌한다'],
      foreshadowing:['단장이 특정 지명을 피해서 말한다'],
      payoffs:['후반에 그 지명이 사건 현장임이 드러난다'],
      twists:['단장이 범인이 아니라 진짜 범인을 숨겨 보호하고 있었다'],
      dialogueRules:['관계와 감정에 따라 존대와 문장 길이가 달라진다'],
      characterVoiceProfiles:[{
        character:'기사단장',grammarRegister:'공식석상에서는 격식 높은 존댓말, 개인 장면에서는 짧은 평서문',
        vocabularyRhythm:'군사 용어와 완곡어법을 섞고 핵심 질문에는 한 박자 늦게 답한다',
        relationshipShift:'초반 명령형, 신뢰 상승 후 설명형',
        emotionalRange:'통제된 침착함에서 죄책감이 새어 나오는 흔들림',
        knowledgeBoundary:'사건 현장과 보호 대상의 정체를 알지만 플레이어 조사 결과는 듣기 전 모른다',
        subtextBehavior:'직접 거짓말보다 질문을 돌리고 주어를 생략한다'
      }],
      sceneBeats:[{
        scene:'보고실',purpose:'단장의 회피 습관을 보여준다',characterGoals:'플레이어는 사실 확인, 단장은 비밀 보호',
        conflict:'실종 장소를 묻자 답변을 피한다',informationAsymmetry:'단장만 보호 대상 정체를 안다',
        reversal:'단장이 범인을 모른다는 말은 사실이지만 사건 현장은 알고 있음이 드러난다',stateChange:'suspect_commander'
      }]
    }
  }});
  assert.equal(result.narrative.status,'READY');
  assert.equal(result.narrative.characterVoiceProfiles[0].character,'기사단장');
  assert.ok(result.narrative.principles.includes('ALL_CHARACTERS_SAME_VOICE_FORBIDDEN'));
  assert.ok(result.narrative.principles.includes('TWIST_REQUIRES_PRIOR_EVIDENCE_AND_CHARACTER_KNOWLEDGE_SUPPORT'));
});

test('design evolution brief keeps concept flexible and repeated owner text event-based',()=>{
  const a=buildDesignEvolutionBrief({
    game:{id:'g'},seed:{gameId:'g',DISTINCT_IDENTITY:'판타지 생존',CORE_LOOP:['탐색','전투','성장'],SAVE_POLICY:'PRESERVE'},
    ownerSignal:{literal:'전투가 재미없어',eventId:'owner-1'}
  });
  const b=buildDesignEvolutionBrief({
    game:{id:'g'},seed:{gameId:'g',DISTINCT_IDENTITY:'판타지 생존',CORE_LOOP:['탐색','전투','성장'],SAVE_POLICY:'PRESERVE'},
    ownerSignal:{literal:'전투가 재미없어',eventId:'owner-2'}
  });
  assert.equal(a.ownerIntent.literal,b.ownerIntent.literal);
  assert.notEqual(a.ownerIntent.eventId,b.ownerIntent.eventId);
  assert.equal(a.ownerIntent.semanticTextDeduplicationForbidden,true);
  assert.equal(a.ownerIntent.repeatedIdenticalRequestCreatesNewRevision,true);
  assert.equal(a.baseConceptIsReferenceNotPrison,true);
  assert.equal(a.genreTransitionChallengeAllowed,true);
});

test('company design cycle consumes the design evolution brief and structured blueprint contract',()=>{
  const source=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
  assert.match(source,/buildDesignEvolutionBrief/);
  assert.match(source,/buildVibeDesignIntelligence/);
  assert.match(source,/designAlternatives/);
  assert.match(source,/selectedDesignPlan/);
  assert.match(source,/contentVarietyPlan/);
  assert.match(source,/narrativeDialoguePlan/);
  assert.match(source,/referenceHomagePlan/);
  assert.match(source,/designIntegrityPlan/);
  assert.match(source,/stabilityPriorityPlan/);
  assert.match(source,/ownerDesignEventId/);
  assert.match(source,/DESIGN_CHECKPOINT_CONTRACT_VERSION=4/);
  assert.match(source,/공공영역 고전/);
  assert.match(source,/현대 보호 작품은 추상적 기법만 참고/);
  assert.match(source,/같은 증상을 설계와 구현이 독립적으로 중복 수정하지 않는다|중복 수정/);
});


test('homage contract allows public-domain motifs and abstract techniques but rejects unknown rights basis',()=>{
  const ok=buildVibeDesignIntelligence({task:{
    goal:'고전적 비극 구조를 게임 사건에 재해석',
    referenceHomage:{
      inspirations:[
        {titleOrTradition:'고전 비극 전통',rightsBasis:'PUBLIC_DOMAIN',borrowedTechnique:'예고된 파국과 선택의 역설',transformation:'게임의 고유 세력 갈등과 플레이 선택 결과로 재구성'},
        {titleOrTradition:'현대 액션게임 일반',rightsBasis:'ABSTRACT_TECHNIQUE',borrowedTechnique:'보스 페이즈 압박 리듬',transformation:'고유 몬스터 생태와 지역 기믹으로 변형'}
      ],
      originalityRule:'캐릭터·대사·장면 배열·고유 표현은 복제하지 않고 현재 게임 정체성으로 다시 설계한다'
    }
  }});
  assert.equal(ok.referenceHomage.status,'CHECKED');
  assert.equal(ok.referenceHomage.protectedModernExpressionCopyForbidden,true);
  const bad=buildVibeDesignIntelligence({task:{
    goal:'참고작 구조 검토',
    referenceHomage:{inspirations:[{titleOrTradition:'미확인 작품',rightsBasis:'COPY',borrowedTechnique:'장면',transformation:'그대로'}]}
  }});
  assert.equal(bad.referenceHomage.status,'ADVISORY');
  assert.ok(bad.referenceHomage.issues.some(x=>x.startsWith('REFERENCE_RIGHTS_BASIS_INVALID:')));
});

test('canonical central policy documents bind the intelligent design loop to existing code',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const logMap=JSON.parse(fs.readFileSync('company-learning/company-log-map.json','utf8'));
  const contract=roadmap.directNativeDualPlatformDevelopment.design.continuousIntelligentDesignEvolution;
  assert.equal(contract.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(contract.unlimitedRevisionGenerations,true);
  assert.equal(contract.ownerIntentUnderstanding.repeatedIdenticalOwnerTextCreatesNewRevision,true);
  assert.equal(contract.identityAndCreativeFreedom.baseConceptIsReferenceNotPrison,true);
  assert.equal(contract.identityAndCreativeFreedom.genreTransitionChallengeAllowed,true);
  assert.equal(contract.stabilityFirst.creativeExpansionMayNotStarveConcreteStabilityRepair,true);
  assert.equal(contract.detailedBlueprint.minimumPlans,2);
  assert.equal(contract.antiMonotony.enabled,true);
  assert.equal(contract.narrativeAndDialogue.characterVoiceProfileRequired,true);
  assert.equal(contract.causalDefectOwnership.sameSymptomDualIndependentMutationForbidden,true);
  assert.equal(contract.designIntegrityChecks.required,true);
  assert.equal(architecture.concurrentPlatformDevelopment.designEvolution.newDesignPipelineForbidden,true);
  assert.equal(logMap.designEvolutionEvidenceContract.sameSymptomDualMutationForbidden,true);
  const cycle=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
  assert.match(cycle,/CANONICAL_POLICY_PATH='company-learning\/platform-release-roadmap\.json'/);
  assert.doesNotMatch(cycle,/centralPolicy:'COMPANY_FLOW\.md'/);
  assert.match(cycle,/DESIGN_CHECKPOINT_CONTRACT_VERSION=4/);
});
