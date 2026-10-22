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
 assert.match(script,/import \{createGem3d\} from '\.\/gem3d\.mjs'/);
 assert.doesNotMatch(script,/\bgetContext\s*\(\s*['"]2d['"]/);
 assert.doesNotMatch(script,/\bctx\./);
 assert.match(native,/new THREE\.WebGLRenderer\(/);
 assert.match(native,/new THREE\.PerspectiveCamera\(/);
 assert.match(native,/renderer\.render\(scene,camera\)/);
 assert.match(native,/canvas\.dataset\.renderedFrame='true'/);
 assert.match(native,/document\.body\.dataset\.renderer='three-webgl'/);
 assert.match(native,/new THREE\.AnimationMixer\(model\)/);
 assert.match(native,/new THREE\.InstancedMesh\(/);
 assert.match(native,/MAX_EACH=110, MAX_PROJECTILES=280, MAX_GEMS=380, MAX_PARTICLES=260/);
 assert.match(native,/nativeArtCoverage='incomplete'/);
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
  'function fireBasic()','function fireArrow()','function throwPoison()',
  'function castLightning()','function orbitBlades()','function showAbilityChoice()',
  'function damageEnemy(e,amount)','function killEnemy(e,index)',
  'function update(dt)','function updateUi()', 'function collectGem(g,index)',
  'function endGame(clear)','function reset()'
 ])assert.ok(script.includes(expected),expected);
 for(const type of ['slime','bat','beetle','brute','hound','shaman','knight'])
  assert.match(script,new RegExp(' '+type+':\\{name:'));
 for(const ability of ['arrow','poison','orbit','lightning','heal','speed'])
  assert.ok(script.includes('id:\''+ability+'\''),ability);
 assert.match(script,/gem3d\.render\(\{player,enemies,projectiles,gems,particles,poisonPools,orbitBlades:orbitBlades\(\),effects\}/);
});

function harness(){
 const nodes=new Map(),events=new Map(),documentEvents=new Map();let serial=0,callback=null,renders=0;
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const listeners=new Map(),classes=new Set();
  const obj={id,style:{},disabled:false,textContent:'',innerHTML:'',className:'',children:[],
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
  addEventListener:(type,fn)=>documentEvents.set(type,fn)};
 const sandbox={document,window:{},innerWidth:390,innerHeight:760,devicePixelRatio:1,
  performance:{now:()=>0},requestAnimationFrame(fn){callback=fn},
  addEventListener:(type,fn)=>events.set(type,fn),
  createGem3d:()=>Promise.resolve({resize(){},render(){renders++}})};
 const code=script.replace(/^\s*import\s*\{createGem3d\}\s*from\s*'\.\/gem3d\.mjs';\s*/,'');
 assert.doesNotMatch(code,/^\s*import\s/m);
 const context=vm.createContext(sandbox);
 vm.runInContext(code,context,{timeout:1000});
 return {node,events,documentEvents,document,context,get callback(){return callback},get renders(){return renders}};
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
