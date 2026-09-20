import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWebContractAdapterPlan,extractWebGameplayCandidates,webContractAdapterGuidance} from '../tools/company-web-contract-adapter.mjs';

const inventory=[
  {id:'scope-corefun-a',path:'coreFun',label:'탐험하고 적과 싸우며 자원을 모아 생존한다'},
  {id:'scope-coreloop-0-b',path:'coreLoop[0]',label:'지역을 이동하고 탐험한다'},
  {id:'scope-coreloop-1-c',path:'coreLoop[1]',label:'적을 공격하고 전투한다'},
  {id:'scope-coreloop-2-d',path:'coreLoop[2]',label:'자원을 채집한다'},
  {id:'scope-coreloop-3-e',path:'coreLoop[3]',label:'제작대로 장비를 제작한다'}
];

const html=[
  '<!doctype html><html><body>',
  '<canvas id="game" data-gameplay-action="world"></canvas>',
  '<button id="attackBtn" data-gameplay-action="attack">공격</button>',
  '<button id="gatherBtn" data-gameplay-action="gather">채집</button>',
  '<button id="craftBtn" data-gameplay-action="craft">제작</button>',
  '<button id="mapBtn" data-gameplay-action="map">지도 탐험</button>',
  '<script>',
  "const attackBtn=document.getElementById('attackBtn'); attackBtn.addEventListener('click',attackEnemy);",
  "const gatherBtn=document.getElementById('gatherBtn'); gatherBtn.addEventListener('click',gatherResource);",
  "const craftBtn=document.getElementById('craftBtn'); craftBtn.addEventListener('click',openCraft);",
  "const mapBtn=document.getElementById('mapBtn'); mapBtn.addEventListener('click',openMap);",
  'function attackEnemy(){ state.enemy.hp-=10; }',
  'function gatherResource(){ state.inventory.wood+=1; }',
  "function openCraft(){ state.ui='craft'; }",
  "function openMap(){ state.ui='map'; }",
  '</script></body></html>'
].join('\n');

test('adapter detects actual gameplay controls without writing source',()=>{
  const candidates=extractWebGameplayCandidates(html);
  assert.ok(candidates.some(row=>row.id==='attackBtn'));
  assert.ok(candidates.some(row=>row.id==='gatherBtn'));
  assert.ok(candidates.some(row=>row.id==='craftBtn'));
  const plan=buildWebContractAdapterPlan({html,inventory});
  assert.equal(plan.sourceWrite,false);
  assert.equal(plan.gateWeakening,false);
  assert.equal(plan.syntheticGameplayEvidence,false);
  assert.equal(plan.scopeCount,5);
  assert.ok(plan.mappedCount>=4);
  assert.ok(plan.bindings.some(row=>row.family==='COMBAT'&&row.controlId==='attackBtn'));
  assert.ok(plan.bindings.some(row=>row.family==='GATHER'&&row.controlId==='gatherBtn'));
  assert.ok(plan.bindings.some(row=>row.family==='CRAFT'&&row.controlId==='craftBtn'));
});

test('adapter preserves existing real scope binding with highest confidence',()=>{
  const bound=html.replace('id="attackBtn"','id="attackBtn" data-scope-id="scope-coreloop-1-c" data-mechanic-id="combat-primary"');
  const plan=buildWebContractAdapterPlan({html:bound,inventory});
  const combat=plan.bindings.find(row=>row.scopeId==='scope-coreloop-1-c');
  assert.ok(combat);
  assert.equal(combat.controlId,'attackBtn');
  assert.equal(combat.currentMechanicId,'combat-primary');
  assert.equal(combat.confidence,'HIGH');
  assert.ok(combat.evidence.includes('existing-scope-binding'));
});

test('guidance forbids fake controls and keeps external AI advisory-only',()=>{
  const plan=buildWebContractAdapterPlan({
    html:'<!doctype html><button id="x">확인</button>',
    inventory:[{id:'scope-a',path:'coreFun',label:'복합 전략 전투 생존'}]
  });
  const guidance=webContractAdapterGuidance(plan);
  assert.match(guidance,/가짜 기능이나 숨은 버튼을 만들지 않는다/);
  assert.match(guidance,/실제 입력 컨트롤 또는 실제 gameplay surface/);
  if(plan.externalAiReviewRequired)assert.match(guidance,/EXTERNAL_AI_ADVISORY=AMBIGUOUS_ONLY/);
});
