// 파일명: qa/fantasy-survival-mobile-tap-combat.test.mjs
// Regression: the real Magic Forest source receives one-tap combat without changing combat authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('web-games/fantasy-survival/index.html','utf8');

test('mobile tap combat preserves parseable game script and native button input',()=>{
  const mark="<script>\n(()=>{'use strict';";
  const start=source.indexOf(mark),end=source.indexOf('</script>',start);
  assert.ok(start>=0&&end>start);
  assert.doesNotThrow(()=>new vm.Script(source.slice(start+8,end)));
  assert.match(source,/getElementById\('attack'\)\.addEventListener\('pointerdown'/);
  assert.match(source,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
  assert.match(source,/function tapArrowAimTarget\(target,now\)/);
  assert.match(source,/const target=tappedInRange\?tapped:nearestSporeTarget\(p,w\)/);
  assert.match(source,/body:has\(#sheet\.open\) \.actions/);
});

test('tapping a visible enemy fires only when target is attackable and within weapon range',()=>{
  const start=source.indexOf('let closest=null,cd=70;');
  const end=source.indexOf("\n if(state.area==='surface'){",start);
  assert.ok(start>=0&&end>start,'live handleWorldTap enemy branch must exist');
  const tap=new Function('visible','dist','wx','wy','now','state','doubleTapTarget',
   'unlockBestiary','tapArrowAimTarget','currentWeapon','showNotice','attack',source.slice(start,end));
  const cases=[
    {name:'in range',x:40,range:120,attacks:1,aim:1},
    {name:'out of range',x:200,range:80,attacks:0,aim:0},
    {name:'unarmed',x:40,range:null,attacks:0,aim:0},
    {name:'harmless',x:40,range:120,mood:'harmless',attacks:0,aim:0},
    {name:'burrowed',x:40,range:120,burrowed:true,attacks:0,aim:0},
  ];
  for(const c of cases){
    const enemy={x:c.x,y:0,type:{id:'test',name:'시험 몬스터',r:20,
      mood:c.mood||'hostile',burrower:!!c.burrowed},netId:'enemy-test',hp:100,area:'surface',emerged:!c.burrowed};
    const state={player:{x:0,y:0,faceX:0,faceY:0}};
    let attacks=0,aim=0;
    tap([enemy],(x,y,xx,yy)=>Math.hypot(x-xx,y-yy),c.x,0,1000,state,
      ()=>false,()=>{},()=>{aim++},()=>c.range===null?null:{range:c.range},
      ()=>{},target=>{assert.equal(target,enemy);attacks++});
    assert.equal(attacks,c.attacks,c.name);
    assert.equal(aim,c.aim,c.name+' should preserve ranged tap-aim bounds');
  }
});

test('tap combat waits for touch release and rejects swipes or holds',()=>{
 const a=source.indexOf('function isCombatTapGesture(');
 const b=source.indexOf('\nfunction combatTapTarget(',a);
 assert.ok(a>=0&&b>a);
 const gesture=source.slice(a,b);
 const fn=new Function('return ('+gesture.replace(/^function isCombatTapGesture/, 'function')+')')();
 const p={x:100,y:200,at:1000,cancelled:false};
 assert.equal(fn(p,{clientX:100,clientY:200},1100),true);
 assert.equal(fn(p,{clientX:124,clientY:200},1100),true);
 assert.equal(fn(p,{clientX:128,clientY:200},1100),false);
 assert.equal(fn(p,{clientX:100,clientY:200},1701),false);
 assert.equal(fn({...p,cancelled:true},{clientX:100,clientY:200},1100),false);
 assert.match(source,/pendingCombatTap=\{pointerId:e\.pointerId,x:e\.clientX,y:e\.clientY/);
 assert.match(source,/if\(isCombatTapGesture\(press,e,performance\.now\(\)\)\)handleWorldTap\(e\)/);
 assert.match(source,/canvas\.setPointerCapture\(e\.pointerId\)/);
});


test('Diablo-style character panel preserves original game data and inventory actions',()=>{
 const inventory=source.split('function renderInventory(){')[1]?.split('\nfunction mapTerrainColorAt(')[0]||'';
 assert.ok(inventory,'live inventory implementation is required');
 assert.match(source,/class="arpgInventory"/);
 assert.match(source,/class="arpgPaperdoll"/);
 assert.match(source,/class="arpgBag"/);
 assert.match(source,/class="arpgItemGrid"/);
 assert.match(source,/\.sheet:has\(\.arpgInventory\)/);
 assert.match(source,/@media\(max-width:720px\)\{/);
 assert.match(source,/getElementById\('heroPortrait'\)\.addEventListener\('click',openInventory\)/);
 assert.match(source,/getElementById\('avatarOpen'\)\.addEventListener\('click',openAvatarCustomizer\)/);
 assert.match(inventory,/getElementById\('arpgAppearance'\)\.addEventListener\('click',openAvatarCustomizer\)/);
 assert.match(inventory,/effectiveStat\(p\.weapon,'power'\)/);
 assert.match(inventory,/effectiveStat\(p\.armor,'reduce'\)/);
 assert.match(inventory,/data-inventory-kind/);
 assert.match(inventory,/data-arpg-filter="equipment"/);
 assert.match(inventory,/data-arpg-filter="usable"/);
 assert.match(inventory,/data-arpg-filter="material"/);
 assert.match(inventory,/id="arpgBagSearch"/);
 assert.match(inventory,/const filterBag=\(\)=>\{/);
 assert.match(inventory,/button\.hidden=!visible/);
 assert.match(inventory,/button\.addEventListener\('focus',showInfo\)/);
 assert.match(inventory,/if\(r\?\.kind==='consumable'\)useItem\(r\.id\)/);
 assert.match(inventory,/else if\(r\?\.kind==='seed'\)plantSeed\(r\.id\)/);
 assert.match(inventory,/else if\(r\?\.kind==='ammo'\)selectArrow\(r\.id\)/);
 assert.match(inventory,/else if\(r\)equipItem\(r\.id\)/);
 assert.match(source,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
 assert.match(source,/reason==='unmapped-threat'\?'주변 생물의 3D 모델을 자동으로/);
 assert.doesNotMatch(inventory,/localStorage\.setItem|sessionStorage\.setItem|p\.inventory\[/);
});

test('quest stage navigation uses original waypoints without modifying progression or save',()=>{
 const raw=source.split('function questGuideData(){')[1]?.split('\nlet questGuideUpdateAt=')[0];
 assert.ok(raw,'native quest guide must resolve original story stages');
 const fixed={SURVIVOR:{x:16200,y:520},WASTELAND_CAVE:{x:2730,y:3600},
  QUEST_CAVE:{radio:{x:4700,y:1500},exit:{x:420,y:1500}},
  LAB_STORY_ENTRANCE:{x:6320,y:9650},
  STORY_LAB_1:{ladder:{x:2320,y:128},exit:{x:88,y:1168}},
  STORY_LAB_2:{ladder:{x:168,y:680},boss:{x:1260,y:680},sensor:{x:2264,y:488},report:{x:2264,y:880}},
  CRYSTAL_HEART:{x:16200,y:6000},FINAL_RADIO_PART:{x:32400,y:10080},
  COMM_DEVICE:{x:18560,y:1900}};
 const state={area:'surface',player:{x:9000,y:6000},enemies:[],
  story:{stage:'find-survivor',completed:false,treated:false}};
 const guide=new Function('state',...Object.keys(fixed),'invCount','questObjective',
  'return function questGuideData(){'+raw)(state,...Object.values(fixed),()=>1,()=> '기존 임무');
 const check=(stage,area,name,x,y)=>{
  state.story.stage=stage;state.area=area;
  const before=JSON.stringify(state),result=guide();
  assert.equal(result?.name,name,stage+' / '+area);
  if(x!==null){assert.equal(result?.x,x);assert.equal(result?.y,y);}
  assert.equal(JSON.stringify(state),before,'navigation must not mutate existing game state');
 };
 check('find-survivor','surface','부상당한 생존자',16200,520);
 check('find-radio','surface','황무지 동굴 입구',2730,3600);
 check('find-radio','questcave','동굴 끝 무전기 부품',4700,1500);
 check('return-survivor','questcave','동굴 출구',420,1500);
 check('return-survivor','surface','생존자에게 부품 전달',16200,520);
 check('lab-floor2','surface','연구소 입구',6320,9650);
 check('lab-floor2','storylab1','연구소 2층 계단',2320,128);
 check('lab-floor2','storylab2','수정 화염골렘',1260,680);
 check('lab-loot','storylab2','부품센서',2264,488);
 state.story.sensorTaken=true;
 check('lab-loot','storylab2','연구 보고서',2264,880);
 check('return-survivor-lab','storylab2','연구소 1층 계단',168,680);
 check('return-survivor-lab','storylab1','연구소 출구',88,1168);
 check('touch-crystal','surface','수정 지대 큰 수정',16200,6000);
 check('find-final-radio-part','surface','거대화원 중앙',32400,10080);
 check('repair-comm-device','surface','밀림 통신장치',18560,1900);
 check('wait-radio-repair','surface','무전기 수리 대기',null,null);
 state.story.stage='done';assert.equal(guide(),null,'completed story must hide the navigation');
 assert.doesNotMatch(raw,/state\.player\.(?:x|y)\s*=|state\.story\.stage\s*=|saveGame\(/);
});
test('quest compass and map stay integrated with existing mobile controls',()=>{
 for(const id of ['questNav','questNavOpen','questNavArrow','questNavDistance','questNavDetails','questNavTitle','questNavHint','questNavMap']){
  assert.equal((source.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'duplicate or missing guide control: '+id);
 }
 assert.match(source,/\.questNav\[hidden\]/);
 assert.match(source,/function updateQuestGuide\(now=performance\.now\(\)\)/);
 assert.match(source,/updateQuestGuide\(now\);draw\(\)/);
 assert.match(source,/getElementById\('questNavMap'\)\.addEventListener\('click',\(\)=>ui\.mapBtn\.click\(\)\)/);
 assert.match(source,/const guidance=questGuideData\(\)/);
 assert.match(source,/m\.setLineDash\(\[4,5\]\)/);
 assert.match(source,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});


// 마력숲 아이콘: 실제 CC0 PNG 리소스, 경로, 모바일 지연 로딩과 기존 판정 계약 검증.
test('all inventory item types render committed CC0 image icons without changing actions or saves',()=>{
 const icons=["armor","armorgold","aurared","axe","bag","book","bookholy","chest","crossbow","fireball","frostball","hammerheavy","helmet","legarmor","potionblue","potionred","shield","sword","swordblood"];
 for(const name of icons){
  const png=fs.readFileSync('web-games/fantasy-survival/icons/'+name+'.png');
  assert.ok(png.length>20000,name+' must be a real detailed icon, not a placeholder');
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' must be PNG');
 }
 assert.match(source,/const iconFor=\(id,kind,name=''/);
 assert.match(source,/iconTag\(r\.id,r\.kind,r\.name\)/);
 assert.match(source,/iconTag\('torch','weapon','마력 횃불'\)/);
 assert.match(source,/slot\('무기',p\.weapon,'weapon'\)/);
 assert.match(source,/slot\('방어구',p\.armor,'armor'\)/);
 assert.match(source,/loading="lazy" decoding="async"/);
 assert.match(source,/button\.addEventListener\('pointerdown',showInfo\)/);
 assert.match(source,/if\(r\?\.kind==='consumable'\)useItem\(r\.id\)/);
 assert.match(source,/else if\(r\?\.kind==='seed'\)plantSeed\(r\.id\)/);
 assert.match(source,/else if\(r\?\.kind==='ammo'\)selectArrow\(r\.id\)/);
 assert.match(source,/else if\(r\)equipItem\(r\.id\)/);
 assert.match(source,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});
