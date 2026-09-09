import test from 'node:test';
import assert from 'node:assert/strict';
import { gameplayEvidenceSnippets, buildFallbackSeed, expandCompactSeed, validExpandedDraft } from '../tools/vibe2-artbook-story-core.mjs';

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
