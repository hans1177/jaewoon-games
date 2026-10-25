// Executed game-state and Native WebGL3D regression for Gem Survivor.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('web-games/gem-survivor/index.html','utf8');
const native=fs.readFileSync('web-games/gem-survivor/gem3d.mjs','utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('gem survivor uses actual 3D renderer, authored model, bounded native geometry',()=>{
 assert.ok(script,'gameplay module must exist');
 assert.match(html,/data-render-target="webgl-3d"/);
 assert.match(script,/import \{createGem3d\} from '\.\/gem3d\.mjs\?v=20261025-coop-5'/);
 assert.doesNotMatch(script,/\bgetContext\s*\(\s*['"]2d['"]/);
 assert.doesNotMatch(script,/\bctx\./);
 assert.match(native,/new THREE\.WebGLRenderer\(/);
 assert.match(native,/new THREE\.OrthographicCamera\(/);
 assert.match(native,/renderer\.render\(scene,camera\)/);
 assert.match(native,/canvas\.dataset\.renderedFrame='true'/);
 assert.match(native,/document\.body\.dataset\.renderer='three-webgl'/);
 assert.match(native,/new THREE\.AnimationMixer\(model\)/);
 assert.match(native,/new THREE\.InstancedMesh\(/);
 assert.match(native,/function growPool\(mesh,required\)/);
 assert.match(native,/const grown=growPool\(parts\[part\],list\.length\)/);
 assert.match(native,/projectiles=growPool\(projectiles,shots\.length\)/);
 assert.match(native,/gems=growPool\(gems,drops\.length\)/);
 assert.match(native,/scene\.remove\(mesh\);scene\.add\(bigger\)/);
 assert.ok(html.includes('"three":"../../assets/roblox/world-ghosts/native/mesh/three/three.module.js"'));

 assert.match(native,/MAX_EACH=110, MAX_PROJECTILES=280, MAX_GEMS=380, MAX_PARTICLES=360/);
 assert.match(native,/nativeArtCoverage='authored-static-monsters'/);
 assert.match(native,/webglcontextlost/);
 assert.doesNotMatch(native,/localStorage|\.hp\s*[-+]?=/);
 assert.ok(fs.existsSync('assets/roblox/actors/native/knight.glb'));
});
test('gem survivor preserves 5-minute boss and 6 core gameplay abilities',()=>{
 for(const expected of [
  'const SURVIVE_SECONDS=300','const PHASE_TWO_SECONDS=120','const PHASE_THREE_SECONDS=210',
  'const INITIAL_GEM_NEED=3','const GEM_NEED_MULTIPLIER=1.65',
  'basicDamage:16,basicRate:.55','basicSpeed:550,magnet:92',
  'function spawnEnemy(typeId)','function spawnBoss()','hp:2600,maxHp:2600',
  'function fireBasic(unit=player)','function fireArrow(unit=player)','function throwPoison(unit=player)',
  'function castLightning(unit=player)','function orbitBlades()','function showAbilityChoice()',
  'function damageEnemy(e,amount)','function killEnemy(e,index)',
  'function update(dt)','function updateUi()', 'function collectGem(g,index)',
  'function endGame(clear)','function reset()'
 ])assert.ok(script.includes(expected),expected);
 for(const type of ['slime','bat','beetle','brute','hound','shaman','knight'])
  assert.match(script,new RegExp(' '+type+':\\{name:'));
 for(const ability of ['arrow','poison','orbit','lightning','heal','speed'])
  assert.ok(script.includes('id:\''+ability+'\''),ability);
 assert.match(script,/gem3d\.render\(\{player,allies:\[\.\.\.net\.peers\.values\(\)\],enemies,projectiles,gems,particles,poisonPools,orbitBlades:orbitBlades\(\),effects,world:WORLD/);
});

function harness(){
 const nodes=new Map(),events=new Map(),documentEvents=new Map();let serial=0,callback=null,renders=0,snapshot=null;
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const listeners=new Map(),classes=new Set();
  const obj={id,dataset:{},setAttribute(k,v){this[k]=v},style:{},disabled:false,textContent:'',innerHTML:'',className:'',children:[],
   classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),
    toggle:(v,on)=>on?classes.add(v):classes.delete(v)},
   addEventListener:(type,fn)=>listeners.set(type,fn),
   dispatch:(type,event)=>listeners.get(type)?.(event),
   setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:116,height:116}),
   appendChild(child){this.children.push(child)},getContext(){throw Error('Canvas2D is forbidden')}
  };
  nodes.set(id,obj);return obj;
 }
 const document={hidden:false,getElementById:node,createElement:tag=>node('new-'+tag+'-'+(++serial)),
  addEventListener:(type,fn)=>documentEvents.set(type,fn),
  querySelectorAll:()=>node('heroes').children};
 const sandbox={document,window:{},innerWidth:390,innerHeight:760,devicePixelRatio:1,
  performance:{now:()=>0},requestAnimationFrame(fn){callback=fn},
  addEventListener:(type,fn)=>events.set(type,fn),
  createGem3d:()=>Promise.resolve({resize(){},view(p){return {left:p.x-195,right:p.x+195,top:p.y-456,bottom:p.y+456}},render(state){renders++;snapshot={x:state.player.x,y:state.player.y,world:state.world,stage:state.stage.id,hp:state.player.hp,enemies:state.enemies,projectiles:state.projectiles,particles:state.particles.length}}})};
 const code=script.replace(/^\s*import\s+[^;]+;\s*/gm,'');
 assert.doesNotMatch(code,/^\s*import\s/m);
 const context=vm.createContext(sandbox);
 vm.runInContext(code,context,{timeout:1000});
 return {node,events,documentEvents,document,context,get callback(){return callback},get renders(){return renders},get snapshot(){return snapshot},state:()=>sandbox.window.gemSurvivorState()};
}
test('real controls preserve single pointer ownership and break ghost movement on interruptions',async()=>{
 const game=harness();
 await new Promise(setImmediate);
 assert.equal(game.node('startBtn').disabled,false);
 assert.equal(game.node('renderStatus').style.display,'none');
 game.node('startBtn').onclick();
 assert.equal(typeof game.callback,'function');
 game.callback(33);assert.ok(game.renders>0,'native 3D renderer consumes real update state');
 const joy=game.node('joystick'),stick=game.node('stick');
 const ptr=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
 joy.dispatch('pointerdown',ptr(1,95,58));
 const first=stick.style.transform;assert.notEqual(first,'translate(0,0)');
 joy.dispatch('pointerdown',ptr(2,14,58));
 joy.dispatch('pointermove',ptr(2,10,12));
 joy.dispatch('pointerup',ptr(2,10,12));
 assert.equal(stick.style.transform,first,'second finger cannot hijack move input');
 joy.dispatch('pointercancel',ptr(1,95,58));
 assert.equal(stick.style.transform,'translate(0,0)');
 joy.dispatch('pointerdown',ptr(3,95,58));
 joy.dispatch('lostpointercapture',ptr(3,95,58));
 assert.equal(stick.style.transform,'translate(0,0)');
 joy.dispatch('pointerdown',ptr(4,95,58));
 game.events.get('blur')();
 assert.equal(stick.style.transform,'translate(0,0)');
 joy.dispatch('pointerdown',ptr(5,95,58));
 game.document.hidden=true;game.documentEvents.get('visibilitychange')();
 assert.equal(stick.style.transform,'translate(0,0)');
 game.node('pauseBtn').onclick();
 assert.ok(game.node('pauseOverlay').classList.contains('show'));
});

// 새 월드와 무대가 실제 기존 게임 상태에 연결되는지 검사한다.
test('sequential campaign starts at stage one and movement survives resize and pause',async()=>{
 const game=harness();await new Promise(setImmediate);
 assert.doesNotMatch(html,/data-stage=|스테이지 선택/);
 game.node('startBtn').onclick();game.callback(33);
 assert.equal(game.snapshot.stage,'cavern');
 assert.equal(game.snapshot.world.width,4200);assert.equal(game.snapshot.world.height,3200);
 assert.equal(game.snapshot.x,2100);assert.equal(game.snapshot.y,1600);assert.equal(game.snapshot.hp,200);
 game.events.get('keydown')({key:'D',preventDefault(){}});game.callback(66);
 assert.ok(game.snapshot.x>2100,'uppercase keyboard movement uses existing player authority');
 game.events.get('keyup')({key:'D'});
 const moved=game.snapshot.x;game.context.innerWidth=1100;game.events.get('resize')();game.callback(99);
 assert.equal(game.snapshot.x,moved,'resize must not reset or clamp world position to viewport');
 game.node('pauseBtn').onclick();game.events.get('keydown')({key:'d',preventDefault(){}});game.callback(132);
 assert.equal(game.snapshot.x,moved,'paused input cannot move player');
});

test('every authored monster and environment dependency exists with retained CC0 evidence',()=>{
 for(const id of [7,15,17,18,21,26,31,35,41,47,49,53,56]){
  for(const ext of ['obj','png'])assert.ok(fs.existsSync('assets/shared/forest/monster-'+id+'.'+ext));
  const obj=fs.readFileSync('assets/shared/forest/monster-'+id+'.obj','utf8');
  assert.match(obj,/^v /m);assert.match(obj,/^f /m);
 }
 assert.match(fs.readFileSync('assets/shared/forest/monsters.txt','utf8'),/Creative Commons 0/);
 assert.ok(fs.existsSync('assets/shared/homely-house/cobblestones.obj'));
 assert.match(native,/new OBJLoader/);
 assert.match(native,/const visible=view\(state,world\)/);
});

test('owner survivability change doubles starting health while keeping damage and spawn rules',()=>{
 assert.match(script,/const START_HP=200;/);assert.match(script,/const HURT_INV_SECONDS=\.85;/);
 assert.match(script,/unit\.hp-=amount;unit\.inv=HURT_INV_SECONDS/);
 assert.ok((script.match(/hp:START_HP,maxHp:START_HP/g)||[]).length>=2);
 assert.match(script,/Math\.max\(0,480-particles\.length\)/);
 assert.match(native,/new THREE\.ShaderMaterial/);assert.match(native,/glows=pool\([\s\S]*?,256\)/);
 assert.match(native,/healthFill\.scale\.x/);
});

test('contact damage respects longer protection and particle bursts remain bounded under many impacts',async()=>{
 const game=harness();await new Promise(setImmediate);game.node('startBtn').onclick();game.callback(33);
 const enemies=game.snapshot.enemies;enemies.length=0;
 enemies.push({type:'slime',x:2100,y:1600,r:12,hp:1e9,maxHp:1e9,speed:0,damage:8,gems:1,hit:0,dot:0,dotTick:0,orbitHit:0});
 game.callback(66);assert.equal(game.snapshot.hp,192);
 for(let i=1;i<=20;i++)game.callback(66+i*33);
 assert.equal(game.snapshot.hp,192,'repeat contact stays protected for 0.66 seconds');
 for(let i=21;i<=27;i++)game.callback(66+i*33);
 assert.equal(game.snapshot.hp,184,'contact resumes after the configured protection');
 for(let i=0;i<500;i++)game.snapshot.projectiles.push({kind:'basic',x:2100,y:1600,vx:0,vy:0,r:4,damage:0,life:1,color:'#ffffff'});
 game.callback(990);assert.ok(game.snapshot.particles<=480,'impact spam cannot grow particle storage without bound');
});

// 오너 요청: 5스테이지·고유 기술·동기화는 실제 게임 책임 함수를 실행해서 검사한다.
test('five bosses advance exactly five stages while preserving earned upgrades',async()=>{
 const game=harness();await new Promise(setImmediate);game.node('startBtn').onclick();
 let state=game.state();state.selectAbility({apply(){state.abilityLv.orbit=2;}});const max=state.player.maxHp;
 for(let index=0;index<5;index++){
  state=game.state();assert.equal(state.stageIndex,index);state.spawnBoss();const boss=state.enemies.find(e=>e.boss);assert(boss);state.killEnemy(boss,state.enemies.indexOf(boss));
  assert.equal(game.state().stageCleared,index<4);state.nextStage();assert.equal(game.state().stageIndex,Math.min(4,index+1));assert.equal(state.abilityLv.orbit,2);assert.equal(state.player.maxHp,max);
 }
 assert.equal(game.state().running,false);assert.match(game.node('endTitle').textContent,/5스테이지 전부/);
});
test('all five selectable heroes have distinct functional skills and cooldowns',async()=>{
 const game=harness();await new Promise(setImmediate);game.node('startBtn').onclick();const state=game.state();
 for(const hero of ['guardian','ranger','wizard','rogue','cleric']){
  state.player.hero=hero;state.player.skillCd=0;state.player.hp=100;state.enemies.length=0;state.spawnEnemy('slime');Object.assign(state.enemies[0],{x:state.player.x+60,y:state.player.y,hp:500,maxHp:500});
  const x=state.player.x,shots=state.projectiles.length;state.useHeroSkill();assert(state.player.skillCd>0,hero);
  if(hero==='guardian')assert.equal(state.player.shield,3);
  if(hero==='ranger'||hero==='rogue')assert(state.projectiles.length>shots);
  if(hero==='rogue')assert.notEqual(state.player.x,x);
  if(hero==='cleric')assert.equal(state.player.hp,155);
  if(hero==='wizard')assert(state.enemies[0].hp<500);
  const count=state.projectiles.length;state.useHeroSkill();assert.equal(state.projectiles.length,count,'cooldown prevents duplicate casts');
 }
});
test('two simulated clients share stage, boss health, inputs and revival; guest cannot publish world state',async()=>{
 const h=harness(),g=harness();await new Promise(setImmediate);const roster=[{userId:'host',nickname:'방장'},{userId:'guest',nickname:'동료'}];
 h.state().receiveNetwork({type:'connected',userId:'host',players:roster});g.state().receiveNetwork({type:'connected',userId:'guest',players:roster});
 h.state().net.client={sendEvent:event=>g.state().receiveNetwork({...event,type:'event',userId:'host'})};
 g.state().net.client={sendEvent:event=>h.state().receiveNetwork({...event,type:'event',userId:'guest'})};
 h.node('startBtn').onclick();h.state().spawnBoss();h.state().networkTick(300);assert.equal(g.state().running,true);assert.equal(g.state().enemies.find(e=>e.boss).hp,h.state().enemies.find(e=>e.boss).hp);
 g.events.get('keydown')({key:'d',preventDefault(){}});g.state().networkTick(400);const before=h.state().net.peers.get('guest').x;h.state().update(.033);assert(h.state().net.peers.get('guest').x>before);h.state().networkTick(600);assert.equal(g.state().player.x,Math.round(h.state().net.peers.get('guest').x*100)/100);
 const boss=h.state().enemies.find(e=>e.boss);h.state().damageEnemy(boss,100);h.state().networkTick(900);assert.equal(g.state().enemies.find(e=>e.boss).hp,Math.ceil(boss.hp));
 const prior=g.state().player.hp;g.state().receiveNetwork({type:'event',userId:'guest',action:'gem-frame',seq:999,part:0,total:1,data:'{}'});assert.equal(g.state().player.hp,prior);
 const ally=h.state().net.peers.get('guest');ally.hp=0;ally.x=h.state().player.x;ally.y=h.state().player.y;h.state().enemies.length=0;
 for(let i=0;i<95;i++)h.state().update(.033);assert(ally.hp>0,'nearby living teammate revives a downed ally');
});
