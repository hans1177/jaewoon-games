import test from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN_INTELLIGENCE_STAGES, buildVibeDesignIntelligence, validateDesignAwareExperience } from '../tools/vibe2-design-intelligence.mjs';
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
      dialogueRules:['NPC는 플레이어가 전달한 정보만 안다']
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
