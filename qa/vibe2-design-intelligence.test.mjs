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
      grammarReviewed:true,
      characterVoices:[
        {id:'researcher',roleBackground:'고립된 연구원',relationship:'플레이어에게 도움을 빚짐',register:'차분한 존댓말',vocabulary:'짧고 정확한 과학 용어와 망설임',emotionalBaseline:'경계',currentEmotion:'안도',knowledgeBoundary:'연구소 내부와 자신이 직접 본 현상만 안다',wantNeed:'통신 복구',hiddenIntent:'실험 실패 책임을 숨김',speechTraits:'중요한 사실 앞에서 문장이 짧아짐'}
      ],
      dialogueScenes:[
        {id:'radio-handoff',objective:'연구소 진입 단서를 자연스럽게 전달',wants:'연구원은 센서 수색을 부탁한다',relationshipState:'신뢰가 막 생긴 상태',knownUnknown:'플레이어는 암호 위치를 모르고 연구원은 서쪽 단서를 안다',subtext:'연구원이 사고 책임을 피하려 한다',conflict:'도움 요청과 비밀 유지가 충돌한다',beatChange:'부품 확인 뒤 태도가 누그러진다',playerInformation:'서쪽 거대한 나무 단서',foreshadowing:'실험 기록을 숨기는 말버릇',payoffLink:'후반 연구소 기록에서 책임이 드러남'}
      ]
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


test('intelligent design evolution keeps stability first while allowing unlimited creative revisions',()=>{
  assert.deepEqual(DESIGN_EVOLUTION_LOOP,['STABILIZE','UNDERSTAND','OBSERVE','DIAGNOSE','SCORE','PROPOSE','COMPARE','REVISE','VALIDATE','LEARN','REPLAN']);
  const result=buildVibeDesignIntelligence({task:{
    goal:'생존 게임 설계를 확장한다',type:'design',designChange:true,speculativeDesignChange:true,
    designRationale:'플레이테스트에서 초반 진행 막힘과 중반 콘텐츠 단조로움이 함께 확인됐다',
    stabilityIssues:[{id:'softlock',severity:'HIGH',kind:'PROGRESSION_SOFTLOCK',summary:'문이 닫히면 진행 불가',playerExposure:5}],
    designAlternatives:[
      {id:'PLAN_A',summary:'현재 생존 장르를 유지하며 지역 생태와 제작 선택을 확장',identityPreserving:true},
      {id:'PLAN_B',summary:'생존+탐험 미스터리 하이브리드로 전환',genre:'SURVIVAL_MYSTERY'}
    ],
    designBlueprint:{
      conceptPremise:'작아진 생존자가 곤충 생태 속에서 살아남는다',designPillars:['생태','탐험','제작'],emotionalGameplayArc:'안전→호기심→위기→성취',
      first1_5_20Minutes:['기본 생존','첫 제작','첫 지역 돌파'],coreAndMetaLoop:['탐색','수집','제작','귀환'],signatureSystems:['먹이사슬'],
      mapRegionsLandmarks:['둥지','뿌리','습지'],contentRhythm:['안전','탐색','위험','보상'],enemyBossRoles:['추적자','매복자','방어자'],
      questEventStructure:['발견','선택','결과'],progressionEconomyReward:'재료→도구→새 지역',failureRetryRecovery:'리스폰과 회수',
      platformProfiles:['ROBLOX','UNITY'],implementationImpact:'기존 생존 책임 시스템 우선',validationPlan:'실플레이 전후 비교'
    }
  }});
  assert.equal(result.version,2);
  assert.equal(result.evolution.totalRevisionLimit,null);
  assert.equal(result.evolution.stability.status,'REPAIR_FIRST');
  assert.equal(result.evolution.stability.speculativeExpansionAllowed,false);
  assert.equal(result.implementationGate.allowed,false);
  assert.ok(result.implementationGate.blockers.includes('STABILITY_REPAIR_REQUIRED_BEFORE_SPECULATIVE_EXPANSION'));
  assert.equal(result.evolution.blueprint.planA.id,'PLAN_A');
  assert.equal(result.evolution.blueprint.planB.id,'PLAN_B');
});

test('same owner design instruction repeated is a new event and forces another alternative review',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'초반 전투 재미없어',type:'design',designChange:true,ownerDirective:true,
    ownerRequestInstanceId:'owner-event-2',ownerRepeatCount:2,
    designRationale:'같은 요청이 다시 들어와 이전 해결이 부족했음',
    designAlternatives:[
      {id:'PLAN_A',summary:'현재 전투 규칙을 유지하고 적 조합과 위험 보상을 재설계'},
      {id:'PLAN_B',summary:'전투 중심을 회피·환경 상호작용 혼합 구조로 재설계'}
    ],
    designBlueprint:{
      conceptPremise:'초반 전투 개선',designPillars:['선택','대응'],emotionalGameplayArc:'학습→압박→숙련',first1_5_20Minutes:['기본','변주','확장'],
      coreAndMetaLoop:['교전','판단','보상'],signatureSystems:['적 역할'],mapRegionsLandmarks:['초원','폐허'],contentRhythm:['완급'],enemyBossRoles:['근접','원거리','지원'],
      questEventStructure:['전투 목표'],progressionEconomyReward:'전투 보상',failureRetryRecovery:'즉시 재도전',platformProfiles:['ROBLOX','UNITY'],implementationImpact:'전투 시스템',validationPlan:'전후 플레이 비교'
    }
  }});
  assert.equal(result.evolution.ownerRequest.eventId,'owner-event-2');
  assert.equal(result.evolution.ownerRequest.repeatCount,2);
  assert.equal(result.evolution.ownerRequest.semanticTextDeduplicationAllowed,false);
  assert.equal(result.evolution.ownerRequest.repeatedIntentInsufficient,true);
  assert.ok(result.advisory.includes('REPEATED_OWNER_INTENT_MEANS_PRIOR_APPROACH_WAS_INSUFFICIENT'));
});

test('genre pivot is allowed as a creative challenge only with comparison and evidence',()=>{
  const allowed=buildVibeDesignIntelligence({task:{
    goal:'장르를 더 과감하게 바꿔본다',type:'design',designChange:true,ownerDirective:true,ownerRequestInstanceId:'genre-1',
    designRationale:'새로운 플레이 가치를 검증하기 위해 비교',currentGenre:'SURVIVAL',proposedGenre:'SURVIVAL_ROGUELITE',creativeChallengeLevel:'GENRE_PIVOT',
    designAlternatives:[{id:'PLAN_A',summary:'기존 생존 유지'},{id:'PLAN_B',summary:'로그라이트 결합',genre:'SURVIVAL_ROGUELITE'}],
    designBlueprint:{conceptPremise:'x',designPillars:['x'],emotionalGameplayArc:'x',first1_5_20Minutes:['x'],coreAndMetaLoop:['x'],signatureSystems:['x'],mapRegionsLandmarks:['x'],contentRhythm:['x'],enemyBossRoles:['x'],questEventStructure:['x'],progressionEconomyReward:'x',failureRetryRecovery:'x',platformProfiles:['x'],implementationImpact:'x',validationPlan:'x'}
  }});
  assert.equal(allowed.evolution.creativeChallenge.genrePivot,true);
  assert.equal(allowed.evolution.creativeChallenge.genrePivotAllowed,true);
  assert.equal(allowed.evolution.creativeChallenge.identityIsAnchorNotPrison,true);
});

test('content diversity catches palette-only maps and stat-only enemy repetition',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'맵과 몹 구성 확장',type:'design',designChange:true,designRationale:'단조로움 개선',
    designAlternatives:['현재 구조 확장','생태 구조 재배치'],
    designBlueprint:{conceptPremise:'x',designPillars:['x'],emotionalGameplayArc:'x',first1_5_20Minutes:['x'],coreAndMetaLoop:['x'],signatureSystems:['x'],mapRegionsLandmarks:['x'],contentRhythm:['x'],enemyBossRoles:['x'],questEventStructure:['x'],progressionEconomyReward:'x',failureRetryRecovery:'x',platformProfiles:['x'],implementationImpact:'x',validationPlan:'x'},
    mapRegions:[{name:'숲',gameplayFunction:'탐색'},{name:'붉은 숲',gameplayFunction:'탐색'}],
    enemyRoster:[{name:'A',role:'근접'},{name:'B',role:'근접'},{name:'C',role:'근접'}]
  }});
  assert.ok(result.evolution.diversity.issues.includes('MAP_REGIONS_DIFFER_ONLY_BY_THEME_OR_PALETTE'));
  assert.ok(result.evolution.diversity.issues.includes('ENEMY_ROSTER_ROLE_VARIETY_TOO_LOW'));
});

test('literary homage permits abstract or public-domain inspiration but rejects copied expression and living-author style',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'고전 오마주를 넣는다',
    inspirations:[
      {id:'classic',title:'공공영역 고전',mode:'DIRECT_MOTIF_HOMAGE',publicDomain:true},
      {id:'bad-copy',title:'현대 작품',mode:'DIRECT_MOTIF_HOMAGE',publicDomain:false,expressionCopy:true},
      {id:'style',title:'현대 작가',livingAuthorStyle:true}
    ]
  }});
  assert.ok(result.evolution.inspiration.issues.includes('PROTECTED_EXPRESSION_COPY_FORBIDDEN:bad-copy'));
  assert.ok(result.evolution.inspiration.issues.includes('DIRECT_HOMAGE_REQUIRES_CONFIRMED_PUBLIC_DOMAIN_OR_CLEAR_RIGHTS:bad-copy'));
  assert.ok(result.evolution.inspiration.issues.includes('LIVING_AUTHOR_STYLE_IMITATION_FORBIDDEN:style'));
});

test('dialogue review catches same voice exposition and character knowledge leaks',()=>{
  const result=buildVibeDesignIntelligence({task:{
    goal:'스토리 대화 장면 설계',dialogueRequired:true,
    narrative:{
      worldRules:['규칙'],characterGoals:['A는 비밀을 숨긴다'],plotBeats:['진실 반전'],foreshadowing:['초반 상처'],payoffs:['후반 정체 공개'],grammarReviewed:true,
      characterVoices:[
        {id:'a',roleBackground:'경비',register:'반말',vocabulary:'짧음',emotionalBaseline:'경계',knowledgeBoundary:'문 앞 정보만',wantNeed:'통과 저지',speechTraits:'짧음'},
        {id:'b',roleBackground:'학자',register:'반말',vocabulary:'짧음',emotionalBaseline:'경계',knowledgeBoundary:'문 앞 정보만',wantNeed:'통과 저지',speechTraits:'짧음'}
      ],
      dialogueScenes:[{id:'s',objective:'단서 전달',relationshipState:'초면',knownUnknown:'A만 암호를 안다',subtext:'숨김',expositionDump:true,knowledgeLeak:true}]
    }
  }});
  assert.ok(result.narrative.issues.includes('ALL_MAJOR_CHARACTERS_SHARE_SAME_VOICE'));
  assert.ok(result.narrative.issues.includes('EXPOSITION_DUMP_DIALOGUE:s'));
  assert.ok(result.narrative.issues.includes('CHARACTER_KNOWLEDGE_LEAK:s'));
});
