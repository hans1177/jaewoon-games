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
