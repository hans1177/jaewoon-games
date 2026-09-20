import test from 'node:test';
import assert from 'node:assert/strict';
import {applyWebContractAdapterBindings,buildWebContractAdapterPlan,extractWebGameplayCandidates,webContractAdapterGuidance} from '../tools/company-web-contract-adapter.mjs';

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
  '<div id="stick" class="stick" data-joystick="true" data-touch-control="move"></div>',
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
  assert.ok(candidates.some(row=>row.id==='stick'&&row.spatialControl===true));
  const plan=buildWebContractAdapterPlan({html,inventory});
  assert.equal(plan.sourceWrite,false);
  assert.equal(plan.gateWeakening,false);
  assert.equal(plan.syntheticGameplayEvidence,false);
  assert.equal(plan.scopeCount,5);
  assert.ok(plan.mappedCount>=4);
  assert.ok(plan.bindings.some(row=>row.family==='COMBAT'&&row.controlId==='attackBtn'));
  assert.ok(plan.bindings.some(row=>row.family==='GATHER'&&row.controlId==='gatherBtn'));
  assert.ok(plan.bindings.some(row=>row.family==='CRAFT'&&row.controlId==='craftBtn'));
  const movement=plan.bindings.find(row=>row.scopeId==='scope-coreloop-0-b');
  assert.equal(movement?.controlId,'stick');
  assert.ok(movement?.evidence.includes('direct-spatial-control'));
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


test('preservation adapter binds fantasy survival approved scope only to existing gameplay controls',()=>{
  const preservedInventory=[
    {id:'scope-corefun-ea77622450',path:'coreFun',label:'기존 탐험·채집·제작·전투·퀘스트 선택과 결과는 바꾸지 않고 체감 품질을 높인다.'},
    {id:'scope-coreloop-0-9b2d4dfbc6',path:'coreLoop[0]',label:'Fight through an escalating horde in a short real-time survival run while positioning around enemy pressure.'},
    {id:'scope-coreloop-1-6ebe58f496',path:'coreLoop[1]',label:'Collect run rewards or experience and choose upgrades, perks, weapons, or skills that change the current build.'},
    {id:'scope-coreloop-2-6c927cfa40',path:'coreLoop[2]',label:'Combine upgrades into a stronger build, survive harder waves or a boss, then convert the run result into the next progression choice.'},
    {id:'scope-mobileux-5acfb2eaa6',path:'mobileUx',label:'가상 조이스틱과 직관적인 터치 인터페이스로 이동, 채집, 전투를 조작한다.'}
  ];
  const preservedHtml=[
    '<!doctype html><html><body>',
    '<canvas id="game" data-gameplay-surface="true"></canvas>',
    '<div id="stick" class="stick" data-joystick="true" data-touch-control="move" data-gameplay-action="move" data-mechanic-id="movement-joystick"></div>',
    '<button id="attack" data-gameplay-action="attack" data-mechanic-id="combat-primary">공격</button>',
    '<button id="gather" data-gameplay-action="gather" data-mechanic-id="gather-resource">채집</button>',
    '<button id="craft" data-gameplay-action="craft" data-mechanic-id="craft-open">제작</button>',
    '<button id="inventory" data-gameplay-action="inventory" data-mechanic-id="inventory-open">가방</button>',
    '<button id="map" data-gameplay-action="map" data-mechanic-id="map-open">지도</button>',
    '<button id="bgmToggle" data-audio-control="mute" data-mechanic-id="audio-bgm-toggle">BGM ON</button>',
    '<button id="multi" data-mechanic-id="multiplayer-room">멀티</button>',
    '</body></html>'
  ].join('\n');
  const plan=buildWebContractAdapterPlan({html:preservedHtml,inventory:preservedInventory});
  const byScope=new Map(plan.bindings.map(row=>[row.scopeId,row]));
  assert.equal(byScope.get('scope-corefun-ea77622450')?.controlId,'game');
  assert.equal(byScope.get('scope-coreloop-0-9b2d4dfbc6')?.controlId,'attack');
  assert.equal(byScope.get('scope-coreloop-1-6ebe58f496')?.controlId,'inventory');
  assert.equal(byScope.get('scope-coreloop-2-6c927cfa40')?.controlId,'craft');
  assert.equal(byScope.get('scope-mobileux-5acfb2eaa6')?.controlId,'stick');
  assert.equal(plan.bindings.some(row=>['bgmToggle','multi','map'].includes(row.controlId)),false);
  const adapted=applyWebContractAdapterBindings({html:preservedHtml,inventory:preservedInventory});
  assert.equal(adapted.appliedCount,5);
  for(const item of preservedInventory)assert.match(adapted.html,new RegExp('data-scope-id="'+item.id+'"'));
});
