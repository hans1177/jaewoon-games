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
   'unlockBestiary','tapArrowAimTarget','currentWeapon','currentRange','showNotice','attack',source.slice(start,end));
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
      ()=>false,()=>{},()=>{aim++},()=>c.range===null?null:{range:c.range},()=>c.range||0,
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
 assert.match(source,/if\(isCombatTapGesture\(press,e,performance\.now\(\)\)\)\{const point=worldPointerCoords\(e\);if\(!maybeCrystalDashTripleTap\(point,performance\.now\(\)\)\)handleWorldTap\(e\)\}/);
 assert.match(source,/canvas\.setPointerCapture\(e\.pointerId\)/);
});



test('crystal dash uses three valid background taps and preserves single-tap fallback',()=>{
 const begin=source.indexOf('let crystalTripleTapAt=');
 const end=source.indexOf('\nfunction isCombatTapGesture(',begin);
 assert.ok(begin>=0&&end>begin);
 const state={player:{accessory:'crystal-dash-accessory'},blueprint:null,creativePlacing:false,
   keys:new Set(['KeyD']),stick:{x:0,y:0}};
 const notices=[];
 const dash=new Function('state','combatTapTarget','showNotice',source.slice(begin,end)+';return maybeCrystalDashTripleTap;')(
   state,()=>null,message=>notices.push(message));
 const p={x:20,y:20};
 assert.equal(dash(p,1000),false);
 assert.equal(dash(p,1150),false);
 assert.equal(dash(p,1300),true);
 assert.deepEqual(state.player.dashState,{dx:1,dy:0,until:3300});
 state.keys.clear();state.player.dashState=null;
 assert.equal(dash(p,2200),false);
 assert.equal(dash(p,2350),false);
 assert.equal(dash(p,2500),true);
 assert.equal(state.player.dashState,null,'standing still cannot dash');
 state.keys.add('KeyD');state.player.stunnedUntil=4000;
 assert.equal(dash(p,3100),false);
 assert.equal(dash(p,3250),false);
 assert.equal(dash(p,3400),true);
 assert.equal(state.player.dashState,null,'stunned player cannot dash');
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
 assert.match(source,/reason==='unmapped-threat'\?'주변 생물의 3D 모델 확인 중:/);
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

// 지역 연결 회귀: 원본 입장 함수를 실행해 왕복·해금·산소·보상을 함께 확인한다.
function regionRuntime(){
 const body=name=>{const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+10);assert.ok(start>=0,name);return source.slice(start,end)};
 const state={area:'surface',player:{x:7200,y:1620,hp:100,oxygen:40000,root:0},pet:{mounted:false},story:{stage:'go-cave',labUnlocked:true,labBossDefeated:true},enemies:[],goblinOutpost:{floor:0,cleared:[true,true,true,true],spawned:{}},underwaterDungeonChests:[false,false,false],templeOfferingUsed:true};
 const context=vm.createContext({state,performance:{now:()=>1000},Date,Math,Number,
  clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),dist:(x,y,a,b)=>Math.hypot(x-a,y-b),
  regionAt:()=> 'giantlake',multiplayer:{connected:false},petAlive:()=>false,multiIsHost:()=>true,
  showNotice:()=>{},updateHud:()=>{},saveGame:()=>{},dismountPet:()=>{},
  underwaterOxygenCapacity:()=>40000,spawnUnderwaterDungeonEnemies:()=>{},spawnQuestCaveEnemies:()=>{},spawnStoryLabBoss:()=>{},spawnTempleUpperEnemies:()=>{},spawnTempleGuardian:()=>{},goblinOutpostAlive:()=>[],spawnGoblinOutpostWave:()=>{}});
 const a=source.indexOf('const WORLD='),b=source.indexOf('// 3D 시각 지형 표식:',a);
 vm.runInContext(source.slice(a,b),context);
 for(const name of ['enterWorldTreeInterior','leaveWorldTreeInterior','enterCave','leaveCave','enterUnderwater','leaveUnderwater','enterUnderwaterDungeon','leaveUnderwaterDungeon','enterQuestCave','leaveQuestCave','enterStoryLab','leaveStoryLab','enterStoryLabFloor2','returnStoryLabFloor1','goblinOutpostArea','goblinOutpostFloor','enterGoblinOutpost','leaveGoblinOutpost','goGoblinOutpostFloor','enterJungleTemple','enterTempleUpper','enterTempleLower','enterTempleSecret','returnTempleLobby','leaveJungleTemple','regionPassages'])vm.runInContext(body(name),context);
 return {state,context,passages:()=>vm.runInContext('regionPassages()',context),go(id){const row=this.passages().find(r=>r.id===id);assert.ok(row,'missing '+state.area+':'+id);state.player.x=row.x;state.player.y=row.y;row.action();return state.area}};
}

test('all authored interior passages round-trip through their original game functions',()=>{
 const r=regionRuntime();
 for(const [id,area] of [
  ['giant-lake-water','underwater'],['dungeon-gate','underwater-dungeon'],['dungeon-exit','underwater'],['lake-surface','surface'],
  ['worldtree-inner-door','worldtreeinside'],['worldtree-basement-entrance','underground'],['caveexit','worldtreeinside'],['worldtree-inner-exit','surface'],
  ['wasteland-cave','questcave'],['quest-cave-exit','surface']
 ])assert.equal(r.go(id),area,id);
 r.state.story.stage='find-lab';
 for(const [id,area] of [['story-lab-entry','storylab1'],['story-lab-ladder-up','storylab2'],['story-lab-ladder-down','storylab1'],['story-lab-exit','surface'],['goblin-outpost-entry','goblinoutpost-1']])assert.equal(r.go(id),area,id);
 for(let floor=1;floor<4;floor++)assert.equal(r.go('goblin-up-'+floor),'goblinoutpost-'+(floor+1));
 for(let floor=4;floor>1;floor--)assert.equal(r.go('goblin-down-'+floor),'goblinoutpost-'+(floor-1));
 assert.equal(r.go('goblin-down-1'),'surface');
 for(const [id,area] of [['jungle-temple-entry','jungletemple'],['temple-upper','jungletemple-upper'],['temple-secret','jungletemple-secret'],['temple-secret-return','jungletemple-upper'],['temple-upper-return','jungletemple'],['temple-lower','jungletemple-lower'],['temple-lower-return','jungletemple'],['temple-exit','surface']])assert.equal(r.go(id),area,id);
 assert.deepEqual(r.state.underwaterDungeonChests,[false,false,false],'travel cannot award dungeon loot');
 assert.equal(r.state.player.root,0,'travel cannot grant boss offerings');
});

test('travel UI keeps quest, floor-clear, offering and boss-exit gates and shared underwater oxygen',()=>{
 const r=regionRuntime();
 r.state.story.stage='find-survivor';assert.equal(r.go('wasteland-cave'),'surface');
 r.state.story.labUnlocked=false;assert.equal(r.go('story-lab-entry'),'surface');
 r.go('goblin-outpost-entry');r.state.goblinOutpost.cleared[0]=false;assert.equal(r.go('goblin-up-1'),'goblinoutpost-1');
 r.state.area='jungletemple-upper';r.state.templeOfferingUsed=false;assert.equal(r.go('temple-secret'),'jungletemple-upper');
 r.state.area='underground';r.state.bossSummoned=true;r.state.bossDefeated=false;assert.equal(r.go('caveexit'),'underground');
 r.state.area='surface';r.go('giant-lake-water');assert.equal(r.state.player.oxygen,40000);const deadline=r.state.player.oxygenEndsAt;
 r.go('dungeon-gate');assert.equal(r.state.player.oxygenEndsAt,deadline,'dungeon transition must not refresh oxygen');
 r.go('dungeon-exit');assert.equal(r.state.player.oxygenEndsAt,deadline);
});

test('passage input is prioritized before pets and combat, uses proximity, and never teleports by map click',()=>{
 const start=source.indexOf('function handleWorldTap('),end=source.indexOf('\nfunction ',start+20),tap=source.slice(start,end);
 assert.ok(tap.indexOf('const passage=regionPassages()')<tap.indexOf('petAlive()'));
 assert.ok(tap.indexOf('const passage=regionPassages()')<tap.indexOf('const visible=state.enemies'));
 assert.match(tap,/passage\.range/);assert.match(tap,/doubleTapTarget\(passage\.id,now,passage\.action\)/);
 assert.match(source,/id="regionTravel"[^>]*hidden/);assert.match(source,/e\.code==='KeyF'&&!e\.repeat/);
 assert.match(source,/if\(!passage\|\|dist\(state\.player\.x,state\.player\.y,passage\.x,passage\.y\)>passage\.range\)/);
});

test('diagonal movement slides along shoreline without walking into lake water or buildings',()=>{
 const start=source.indexOf('const nx=clamp(p.x+mx*moveSpeed*dt,24,WORLD.w-24),ny=clamp(p.y+my*moveSpeed*dt,24,WORLD.h-24);',source.indexOf('// 해안·건물에 대각선'));
 const end=source.indexOf('\n    }',start);assert.ok(start>=0&&end>start);
 const move=new Function('p','mx','my','moveSpeed','dt','WORLD','clamp','pointInGiantLakeWater','blockedByPlayerBuilding',source.slice(start,end));
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const p={x:1000,y:1600};move(p,1,-1,185,.033,{w:72000,h:28800},clamp,(_x,y)=>y<1600,()=>false);
 assert.ok(p.x>1000,'free horizontal axis remains movable');assert.equal(p.y,1600,'blocked water axis is preserved');
 const wall={x:1000,y:1600};move(wall,1,1,185,.033,{w:72000,h:28800},clamp,()=>false,x=>x>1000);
 assert.equal(wall.x,1000);assert.ok(wall.y>1600,'building collision only blocks the obstructed axis');
});

// 자동 조작은 선택만 수행한다. 실제 채집 보상과 공격 피해는 원본 책임 함수만 호출한다.
test('always-on auto gathering skips unmineable nearby ore and keeps authoritative cadence',()=>{
 const start=source.indexOf('function updateAutoGather('),end=source.indexOf('\nfunction ',start+20);
 const state={area:'surface',player:{x:0,y:0},gathering:{auto:false,target:null,nextAt:0,blockedUntil:0}};
 const ore={id:'ore',kind:'iron',x:5,y:0,hp:4},tree={id:'tree',kind:'tree',x:10,y:0,hp:4};let calls=[];
 const context=vm.createContext({state,AUTO_GATHER_RANGE:110,AUTO_GATHER_INTERVAL_MS:500,resourceNodes:()=>[tree,ore],playerCombatActive:()=>false,dist:(x,y,a,b)=>Math.hypot(x-a,y-b),gather:(target,silent)=>{assert.equal(silent,true);calls.push(target.id);if(target===ore)return false;target.hp--;return true}});
 vm.runInContext(source.slice(start,end),context);vm.runInContext('updateAutoGather(1000)',context);
 assert.equal(state.gathering.auto,true);assert.deepEqual(calls,['ore','tree']);assert.equal(state.gathering.target,tree);assert.equal(state.gathering.nextAt,1500);
 vm.runInContext('updateAutoGather(1200)',context);assert.equal(calls.length,2,'no faster gathering through frame rate');
 state.player.downedUntil=5000;vm.runInContext('updateAutoGather(1600)',context);assert.equal(calls.length,2,'downed players cannot gather');
});

test('automatic combat selects only reachable hostile targets and delegates attack, ammo and cooldown',()=>{
 const start=source.indexOf('function updateAutoCombat('),end=source.indexOf('\nfunction ',start+20);
 const enemy=(id,x,extra={})=>({netId:id,x,y:0,hp:100,area:'surface',type:{mood:'aggressive',r:20},...extra});
 const state={area:'surface',player:{x:0,y:0,attackAt:0},pet:{mounted:false,attackAt:0},combat:{targetId:null},settings:{autoCombat:true},enemies:[]};let hits=[];
 const nodes={hudGuide:{hidden:true},avatarPanel:{hidden:true},optionsPanel:{classList:{contains:()=>false}}};
 const context=vm.createContext({state,document:{hidden:false,getElementById:id=>nodes[id]},ui:{sheet:{classList:{contains:()=>false}},multiPanel:{classList:{contains:()=>false}},smeltPanel:{classList:{contains:()=>false}}},isCreative:()=>false,petAlive:()=>false,currentWeapon:()=>({range:80}),currentCooldown:()=>380,selectedArrow:()=>null,dist:(x,y,a,b)=>Math.hypot(x-a,y-b),attack:target=>{hits.push(target.netId);state.player.attackAt=1000}});
 vm.runInContext(source.slice(start,end),context);
 state.enemies=[enemy('neutral',1,{type:{mood:'neutral',r:20},hostile:false}),enemy('other-area',5,{area:'underwater'}),enemy('burrowed',6,{type:{mood:'aggressive',r:20,burrower:true},emerged:false}),enemy('far',500),enemy('near',50)];
 vm.runInContext('updateAutoCombat(1000)',context);assert.deepEqual(hits,['near']);assert.equal(state.combat.targetId,'near');
 vm.runInContext('updateAutoCombat(1100)',context);assert.equal(hits.length,1);assert.equal(state.combat.targetId,'near','target status stays stable during cooldown');
 state.settings.autoCombat=false;vm.runInContext('updateAutoCombat(1500)',context);assert.equal(hits.length,1);assert.equal(state.combat.targetId,null);
 state.settings.autoCombat=true;state.player.downedUntil=5000;vm.runInContext('updateAutoCombat(1600)',context);assert.equal(hits.length,1);
 state.player.downedUntil=0;context.isCreative=()=>true;state.enemies=[enemy('arena',50,{creativeOwned:true,creativeAttackPlayer:false})];vm.runInContext('updateAutoCombat(2000)',context);assert.equal(hits.length,1);
 state.enemies[0].creativeAttackPlayer=true;vm.runInContext('updateAutoCombat(2100)',context);assert.deepEqual(hits,['near','arena']);
});

test('half-circle shortcuts are real existing actions and old saves cannot disable mandatory gathering',()=>{
 for(const id of ['autoCombat','attack','petSpecial','quickHeal','quickFood','dismount'])assert.equal((source.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.doesNotMatch(source,/<button[^>]+id="gather"/);assert.doesNotMatch(source,/toggleAutoGather/);
 assert.match(source,/state\.gathering\.auto=true;state\.settings\.autoCombat=savedSettings\.autoCombat!==false/);
 assert.match(source,/autoGather:true,autoCombat:state\.settings\.autoCombat!==false/);
 assert.match(source,/if\(selected\)useItem\(selected\)/);
 assert.match(source,/--arc-x:44px;--arc-y:135px/);
 assert.match(source,/body\[data-hud-hand="left"\] \.actions>button\{left:calc\(100% - var\(--arc-x\)/);
});


test('worldtree ground cave and reachable shoreline enter through the existing authoritative passage rules',()=>{
 const r=regionRuntime();
 assert.ok(r.passages().some(row=>row.id==='worldtree-hole'));
 assert.ok(r.passages().some(row=>row.id==='giant-lake-shore'));
 assert.equal(r.go('worldtree-hole'),'underground');
 assert.equal(r.go('caveexit'),'surface');
 assert.equal(r.go('giant-lake-shore'),'underwater');
 assert.equal(r.go('dungeon-gate'),'underwater-dungeon');
 assert.equal(r.go('dungeon-exit'),'underwater');
 assert.equal(r.go('lake-surface'),'surface');
 assert.deepEqual(r.state.underwaterDungeonChests,[false,false,false]);
 assert.match(source,/id:'world-tree-hole',model:'gate_single'/);
 assert.match(source,/regionTravelGuideId=regionTravelGuideId===button\.dataset\.regionGuide/);
 assert.match(source,/if\(state\.area!=='surface'\)\{/);
 assert.match(source,/const selectedPassage=regionPassages\(\)\.find/);
});

test('all 174 unchanged recipe identities and resource rows resolve verified installed CC0 icon files',()=>{
 const a=source.indexOf('const recipes=['),b=source.indexOf('];',a);
 assert.ok(a>=0&&b>a);
 const recipes=vm.runInNewContext(source.slice(a,b+2)+';recipes');
 assert.equal(recipes.length,174);
 assert.equal(new Set(recipes.map(r=>r.id)).size,recipes.length);
 const c=source.indexOf("const iconFor=(id,kind,name='')=>"),d=source.indexOf('const iconTag=',c);
 assert.ok(c>=0&&d>c);
 const iconFor=vm.runInNewContext(source.slice(c,d)+';iconFor');
 const installed=new Set(fs.readdirSync('web-games/fantasy-survival/icons'));
 for(const r of recipes)assert.ok(installed.has(iconFor(r.id,r.kind,r.name)+'.png'),r.id);
 for(const kind of ['material','ingredient','structure','torch','map']){
  assert.ok(installed.has(iconFor(kind,kind,kind)+'.png'),kind);
 }
 assert.match(source,/iconTag\(k,'material',n\)/);
 assert.match(source,/iconTag\(k,'material',name\)/);
 assert.match(source,/iconTag\(id,'structure',r\?\.name\|\|id\)/);
 assert.match(source,/else if\(r\?\.kind==='map'\)openMap\(\)/);
 assert.match(source,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});

test('low-quality mobile mode reduces GPU cost without deleting the original native creature and dungeon source',()=>{
 const native=fs.readFileSync('web-games/fantasy-survival/world3d.mjs','utf8');
 assert.match(native,/mobileBudget\?\.9:1\.5/);
 assert.match(native,/let qualityFactor=mobileBudget\?\.82:1/);
 assert.match(native,/if\(mobileBudget\?hash%5===0:hash%3!==0\)/);
 assert.match(native,/mobileBudget\?650:1000/);
 assert.match(native,/const unsafeUnmappedEncounter=synchronizeNativeCreatures/);
 assert.match(native,/if\(unsafeUnmappedEncounter\|\|!hero\)/);
 assert.match(native,/for\(const mark of regionScene\?\.landmarks\|\|\[\]\)/);
 assert.match(native,/updateInteriorWalls\(isInterior\?regionScene:null/);
 assert.match(source,/underwater:'underwater','underwater-dungeon':'underwater-dungeon'/);
});


test('mage has 405 range but knights keep their equipped weapon reach and cooldown',()=>{
 const a=source.indexOf('function currentRange(){'),b=source.indexOf('function currentCooldown(){',a);
 assert.ok(a>0&&b>a);
 const ctx={avatarAppearance:{model:'mage'},currentWeapon:()=>({id:'stone-sword',range:75,cooldown:380})};
 const range=new Function('avatarAppearance','currentWeapon',source.slice(a,b)+';return currentRange;')(ctx.avatarAppearance,ctx.currentWeapon);
 assert.equal(range(),405);
 ctx.avatarAppearance.model='knight';assert.equal(range(),75);
 ctx.avatarAppearance.model='rogue';assert.equal(range(),75);
 assert.match(source,/function currentCooldown\(\)\{return currentWeapon\(\)\?\.cooldown\|\|380\}/);
 assert.match(source,/kind:'mageBolt'/);
 assert.match(source,/damage:currentDamage\(\),weaponId:w.id/);
 assert.match(source,/projectile.visualOnly=true/);
 assert.match(source,/multiSend\('attack'/);
 assert.match(source,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});

test('mage default attack launches a real moving magic bolt and uses existing weapon damage',()=>{
 const a=source.indexOf('function attack(selectedTapTarget=null){'),b=source.indexOf('\nfunction ',a+20);
 assert.ok(a>0&&b>a);
 const weapon={id:'stone-sword',range:75,cooldown:380,power:18};
 const enemy={netId:'e1',x:280,y:0,hp:100,area:'surface',type:{r:20,mood:'aggressive',name:'시험 몬스터'}};
 const state={area:'surface',player:{x:0,y:0,hp:100,maxHp:100,weapon:'stone-sword',armor:null,attackAt:0,faceX:1,faceY:0},enemies:[enemy],projectiles:[]};
 const music={enabled:false,combatUntil:0},multiplayer={connected:false,playerId:'solo'};
 const args={state,music,multiplayer,avatarAppearance:{model:'mage'},performance:{now:()=>1000},
  currentWeapon:()=>weapon,currentCooldown:()=>380,currentRange:()=>405,currentDamage:()=>18,
  petMountedAttack:()=>false,interruptAutoGather:()=>{},showNotice:()=>{},dist:(a,b,c,d)=>Math.hypot(a-c,b-d),
  playGameSfx:()=>{},playCombatAudio:()=>{},item:()=>null,ensureMusicStarted:()=>{},syncCombatMusic:()=>{},desiredMusicTheme:()=>{},updateHud:()=>{},
  saveGame:()=>{},Math};
 const fire=new Function(...Object.keys(args),source.slice(a,b)+';return attack;')(...Object.values(args));
 fire(enemy);
 assert.equal(state.player.attackAt,1000);
 assert.equal(enemy.hp,100,'no instant hit at casting time');
 assert.equal(state.projectiles.length,1);
 assert.equal(state.projectiles[0].kind,'mageBolt');
 assert.equal(state.projectiles[0].damage,18);
 assert.ok(state.projectiles[0].vx>0);
 assert.equal(state.projectiles[0].targetId,'e1');
 const next=source.indexOf('function updateProjectiles(dt,now){'),end=source.indexOf('\nfunction ',next+20);
 const hits=new Function('state','performance','multiplayer','multiIsHost','WORLD','dist','item','enemyIncomingDamage','engagePet','Math',
  source.slice(next,end)+';return updateProjectiles;')(state,{now:()=>1500},multiplayer,()=>true,{w:35000,h:11000},
  (a,b,c,d)=>Math.hypot(a-c,b-d),id=>id===weapon.id?weapon:null,(e,d)=>d,()=>{},Math);
 hits(.5,1500);
 assert.equal(enemy.hp,82,'damage belongs to existing weapon power');
 assert.equal(state.projectiles.length,0,'projectile consumed exactly once');
 assert.equal(state.player.weapon,'stone-sword','equipment unchanged');
});
