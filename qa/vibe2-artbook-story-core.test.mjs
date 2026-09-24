import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameplayEvidenceSnippets, buildFallbackSeed, expandCompactSeed, validExpandedDraft } from '../tools/vibe2-artbook-story-core.mjs';
import { JaewoonQuestDialogue } from '../assets/quest-dialogue.js';

test('minified gameplay source becomes bounded gameplay snippets instead of whole technical line',()=>{
  const source=`<canvas id="game"></canvas><script>ctx.imageSmoothingEnabled=true;function resize(){canvas.width=devicePixelRatio*innerWidth} let day=1; function bossSpawn(){ if(day===6) spawnBoss('거미 여왕') } function eat(){food+=5} function survive(){health=Math.max(0,health-1)}</script>`;
  const rows=gameplayEvidenceSnippets(source,{max:10,radius:55});
  assert.ok(rows.length>=2);
  assert.ok(rows.every(x=>x.length<=260));
  assert.ok(rows.some(x=>/boss|거미|food|surviv|health/i.test(x)));
});

test('compact seed expands into six causal phases and six main quests',()=>{
  const seed=buildFallbackSeed({gameName:'곤충 생존기',genreText:'생존 제작 탐험',minimumPages:18});
  const draft=expandCompactSeed(seed,{gameName:'곤충 생존기',genreText:'생존 제작 탐험',minimumPages:18,evidenceSnippets:['day 6 boss 거미 여왕','food 자원과 생존']});
  assert.equal(draft.phasePlans.length,6);
  assert.equal(draft.mainQuestChain.length,6);
  assert.equal(draft.regionTransitions.length,5);
  assert.equal(draft.questGraph.nodes.length>=6,true);
  assert.equal(draft.foreshadowingGraph.length>=2,true);
  assert.equal(draft.relationshipMemoryContract.knowledgeBoundaryRequired,true);
  assert.equal(draft.recommendedPages,18);
  assert.equal(validExpandedDraft(draft),true);
});

test('technical implementation language is removed from narrative fields',()=>{
  const seed=buildFallbackSeed({gameName:'곤충 생존기',genreText:'생존',minimumPages:18});
  seed.phases[2]={stage:'MID',region:'canvas resize region',quest:'devicePixelRatio 조정',cause:'imageSmoothing 때문에 위기',playerAction:'DOM 이벤트리스너 수정',result:'renderer 안정화'};
  seed.centralConflict='canvas resize와 DPR의 충돌';
  const draft=expandCompactSeed(seed,{gameName:'곤충 생존기',genreText:'생존',minimumPages:18,evidenceSnippets:['boss day 6']});
  const narrative=JSON.stringify({centralConflict:draft.centralConflict,phase:draft.phasePlans[2]});
  assert.doesNotMatch(narrative,/devicePixelRatio|imageSmoothing|canvas resize|DOM|renderer/i);
  assert.ok(draft.technicalContaminationRemoved.length>=5);
  assert.equal(validExpandedDraft(draft),true);
});

test('model seed can remain concise while deterministic expansion supplies transition hooks',()=>{
  const seed={
    recommendedPages:20,playerMotivation:'작은 곤충이 무너진 둥지에서 살아남아 새 보금자리를 찾는다.',centralConflict:'가뭄으로 먹이가 줄며 포식자 세력이 영역을 넓힌다.',twist:'중반에 포식자 이동의 원인이 더 큰 생태 붕괴임을 발견한다.',
    phases:[
      ['OPENING','부서진 둥지','첫날 먹이 확보','둥지가 파괴됐다','먹이와 은신처를 찾는다','첫날을 버틴다'],
      ['EARLY','풀숲 가장자리','안전한 이동로 확보','포식자가 길을 막는다','위험 구간을 우회하고 자원을 모은다','새 지역 단서를 얻는다'],
      ['MID','마른 연못','생태 붕괴 원인 조사','물과 먹이가 동시에 줄어든다','흔적과 자원을 추적한다','포식자 이동 원인을 안다'],
      ['LATE','거미 영역','최종 둥지 진입 준비','거미 세력이 길목을 장악한다','장비와 동료 도움을 모은다','여왕 둥지 길을 연다'],
      ['FINAL_BOSS','여왕 둥지','거미 여왕 격파','여왕이 남은 생존권을 차지하려 한다','축적한 생존 수단으로 결전한다','생존권을 되찾는다'],
      ['ENDING','새 보금자리','생태 회복 선택','승리 후 새로운 균형이 필요하다','새 둥지와 자원 질서를 정한다','확장 탐험이 열린다']
    ].map(([stage,region,quest,cause,playerAction,result])=>({stage,region,quest,cause,playerAction,result})),
    finalBoss:{boss:'거미 여왕',trigger:'거미 영역 통로 개방',whyNow:'남은 먹이터가 여왕에게 점령되기 직전',winConsequence:'먹이터와 이동로가 다시 열린다'},ending:'새 둥지를 세우고 생태 균형을 회복한다.',postgame:'계절 변화와 고난도 포식자 지역을 탐험한다.',npcSeeds:[]
  };
  const draft=expandCompactSeed(seed,{gameName:'곤충 생존기',genreText:'생존 제작 탐험',minimumPages:18,evidenceSnippets:['day 6 boss']});
  assert.match(draft.phasePlans[0].nextHook,/풀숲 가장자리/);
  assert.match(draft.bossCausality[0].boss,/거미 여왕/);
  assert.equal(validExpandedDraft(draft),true);
});


test('narrative expansion builds distinct character voice persona and tracked payoff threads',()=>{
  const seed=buildFallbackSeed({gameName:'무협 어둠숲',genreText:'무협 다크 판타지 RPG',minimumPages:18});
  seed.twist='초반에 사라진 문파의 표식이 사실 동료의 과거와 최종 적을 동시에 가리켰음이 드러난다.';
  seed.npcSeeds=[
    {name:'연화',goal:'사라진 문파의 기록을 찾는다',conflict:'적 세력과 혈연으로 얽혀 있다',relationshipToPlayer:'조심스럽게 협력한다',voice:'짧고 절제된 존댓말',fear:'정체가 밝혀지는 것',secret:'적 수장의 혈족이다'},
    {name:'무진',goal:'마을을 지킨다',conflict:'복수를 위해 무리한 선택을 한다',relationshipToPlayer:'거칠지만 신뢰한다',voice:'짧고 직설적인 반말',fear:'또 가족을 잃는 것',secret:'과거 적의 협박에 굴복한 적이 있다'}
  ];
  const draft=expandCompactSeed(seed,{gameName:'무협 어둠숲',genreText:'무협 다크 판타지 RPG',minimumPages:18,evidenceSnippets:['문파 npc quest boss']});
  assert.equal(draft.characterProfiles.length,2);
  assert.notEqual(draft.characterProfiles[0].voice.rhythm,draft.characterProfiles[1].voice.rhythm);
  assert.ok(draft.foreshadowingGraph.every(row=>row.clue&&row.reveal&&row.payoff));
  assert.equal(draft.questGraph.edges.length,5);
  assert.equal(validExpandedDraft(draft),true);
});

test('quest dialogue extended state preserves causal memories relationships facts and clue prerequisites',()=>{
  const q=new JaewoonQuestDialogue();
  const state=q.createState();
  q.registerStory(state,{id:'main',stage:'OPENING'});
  q.setFact(state,'saw-mark',true,'evt-1');
  assert.equal(q.addMemory(state,'yeonhwa',{eventId:'evt-1',type:'WITNESSED_EVENT',factId:'saw-mark'}),true);
  assert.equal(q.addMemory(state,'yeonhwa',{eventId:'evt-1',type:'WITNESSED_EVENT'}),false);
  const relation=q.adjustRelationship(state,'yeonhwa','player',{trust:15,respect:10});
  assert.equal(relation.trust,15);
  q.revealClue(state,{id:'clue-1',threadId:'THREAD-01',sourceEvent:'evt-1',payoffId:'reveal-1'});
  const def=q.createQuestDefinition({id:'q2',requirements:{facts:{'saw-mark':true},clues:['clue-1']},objectives:[{id:'talk',target:1}]});
  assert.equal(q.canStartQuest(state,def),true);
  const context=q.buildCharacterContext(state,'yeonhwa',{voice:{rhythm:'short'}});
  assert.equal(context.memories.length,1);
  assert.equal(context.gameplayAuthority,false);
  const restored=q.createState(q.snapshot(state));
  assert.equal(restored.relationships['yeonhwa->player'].respect,10);
  assert.equal(restored.clues['clue-1'].revealed,true);
});


test('story transitions require causal evidence, preserve order, and dedupe source events',()=>{
  const q=new JaewoonQuestDialogue();
  const state=q.createState();
  q.registerStory(state,{id:'main',stage:'OPENING'});
  const missing=q.advanceStory(state,'main',{nextStage:'EARLY'});
  assert.equal(missing.ok,false);
  assert.equal(missing.reason,'SOURCE_EVENT_REQUIRED');

  const blocked=q.advanceStory(state,'main',{
    eventId:'evt-open',
    nextStage:'EARLY',
    requirements:{flags:{gateOpen:true}}
  });
  assert.equal(blocked.ok,false);
  assert.equal(blocked.reason,'FLAG_PREREQUISITE_FAILED');

  q.setFlag(state,'gateOpen',true);
  const advanced=q.advanceStory(state,'main',{
    eventId:'evt-open',
    nextStage:'EARLY',
    requirements:{flags:{gateOpen:true}},
    reason:'문이 열려 다음 지역으로 이동'
  });
  assert.equal(advanced.ok,true);
  assert.equal(advanced.duplicate,false);
  assert.equal(state.story.main.stage,'EARLY');
  assert.equal(state.story.main.history.length,1);

  const duplicate=q.advanceStory(state,'main',{eventId:'evt-open',nextStage:'MID'});
  assert.equal(duplicate.ok,true);
  assert.equal(duplicate.duplicate,true);
  assert.equal(state.story.main.stage,'EARLY');
  assert.equal(state.story.main.history.length,1);

  const backward=q.advanceStory(state,'main',{eventId:'evt-back',nextStage:'OPENING'});
  assert.equal(backward.ok,false);
  assert.equal(backward.reason,'BACKWARD_TRANSITION_BLOCKED');
});

test('faction relationships are source-event bounded, idempotent, clamped, contextual, and save-safe',()=>{
  const q=new JaewoonQuestDialogue();
  const state=q.createState();
  q.registerFaction(state,{id:'sect-a',name:'청운문',memberIds:['yeonhwa'],controlledRegionIds:['north']});
  q.registerFaction(state,{id:'sect-b',name:'흑월회',memberIds:['mujin']});

  const first=q.adjustFactionRelationship(state,'sect-a','sect-b',{trust:-30,hostile:40},'evt-faction-1');
  assert.equal(first.trust,-30);
  assert.equal(first.hostile,40);
  assert.deepEqual(first.events,['evt-faction-1']);

  const duplicate=q.adjustFactionRelationship(state,'sect-a','sect-b',{trust:-90,hostile:90},'evt-faction-1');
  assert.equal(duplicate.trust,-30);
  assert.equal(duplicate.hostile,40);
  assert.deepEqual(duplicate.events,['evt-faction-1']);

  const clamped=q.adjustFactionRelationship(state,'sect-a','sect-b',{trust:-100,hostile:100},'evt-faction-2');
  assert.equal(clamped.trust,-100);
  assert.equal(clamped.hostile,100);
  assert.deepEqual(clamped.events,['evt-faction-1','evt-faction-2']);

  assert.throws(()=>q.adjustFactionRelationship(state,'sect-a','sect-b',{trust:1}),/source event is required/);

  const context=q.buildCharacterContext(state,'yeonhwa',{role:'companion'});
  assert.equal(context.factions[0].id,'sect-a');
  assert.equal(context.factionRelationships['sect-a->sect-b'].hostile,100);
  assert.equal(context.gameplayAuthority,false);

  const restored=q.createState(q.snapshot(state));
  assert.equal(restored.factions['sect-a'].controlledRegionIds[0],'north');
  assert.equal(restored.factionRelationships['sect-a->sect-b'].trust,-100);
  assert.deepEqual(restored.factionRelationships['sect-a->sect-b'].events,['evt-faction-1','evt-faction-2']);
});


test('canonical narrative contract requires causal faction relationship state and evidence tracing',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const logMap=JSON.parse(fs.readFileSync('company-learning/company-log-map.json','utf8'));
  const contract=roadmap.narrativeStorytellingContract;
  assert.equal(contract.factionRelationshipState.enabled,true);
  assert.equal(contract.factionRelationshipState.sourceEventRequiredForEveryMutation,true);
  assert.equal(contract.factionRelationshipState.duplicateSourceEventMustBeIdempotent,true);
  assert.deepEqual(contract.factionRelationshipState.boundedRange,{min:-100,max:100});
  assert.equal(contract.factionRelationshipState.gameplayAuthority,false);
  assert.equal(contract.stateAndSave.factionAndFactionRelationshipStateMustRoundTripWhenPersisted,true);
  assert.ok(contract.runtimeLearning.failureCanTeach.includes('FACTION_RELATIONSHIP_INCONSISTENCY'));
  assert.ok(contract.runtimeLearning.learnableVerifiedSignals.includes('FACTION_RELATIONSHIP_CAUSALITY'));

  assert.equal(architecture.narrativeStoryTopology.factionRelationshipState.duplicateSourceEventIdempotent,true);
  assert.equal(architecture.narrativeStoryTopology.persistence.factionRelationshipRoundTripRequired,true);

  const evidence=logMap.narrativeRuntimeEvidenceContract;
  assert.ok(evidence.correlationKeys.includes('SOURCE_EVENT_ID'));
  assert.ok(evidence.requiredEvidence.includes('FACTION_RELATIONSHIP_IDEMPOTENCY_RESULT'));
  assert.equal(evidence.duplicateFactionRelationshipSourceEventMustNotApplyDeltaTwice,true);
});
