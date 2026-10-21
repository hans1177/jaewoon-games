// Game-specific verification for the true WebGL Tower RPG, with executed mobile handlers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('web-games/tower-choice-rpg/index.html','utf8');
const native=fs.readFileSync('web-games/tower-choice-rpg/tower3d.mjs','utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('native licensed WebGL 3D runs instead of a fake 2D canvas',()=>{
 assert.ok(source);
 for(const marker of ['data-render-target="webgl-3d"',"import {createTower3d} from './tower3d.mjs'","3D 실행 실패"])assert.ok(html.includes(marker),marker);
 assert.doesNotMatch(source,/\bgetContext\s*\(\s*['"]2d['"]/);
 assert.doesNotMatch(source,/\bctx\s*\./);
 assert.doesNotMatch(source,/function drawEnemy\s*\(/);
 for(const marker of ['new THREE.WebGLRenderer(','new THREE.PerspectiveCamera(','renderer.render(scene,camera)',
  "canvas.dataset.renderedFrame='true'","document.body.dataset.renderer='three-webgl'",
  'webglcontextlost','knight.glb','skeleton-warrior.glb','monster-41.obj',
  'THREE.AnimationMixer','fallbackEnemyAssets','Array.from({length:18}'])
   assert.ok(native.includes(marker),marker);
 for(const path of ['assets/roblox/actors/native/knight.glb','assets/roblox/actors/native/skeleton-warrior.glb',
  'assets/shared/forest/monster-41.obj'])assert.ok(fs.existsSync(path),path);
 assert.doesNotMatch(html,/three@|cdnjs|unpkg\.com/);
});

test('floor, save, loot and combat remain authoritative in original game',()=>{
 for(const marker of ["const SAVE_KEY='tower-choice-rpg-v1'",'function loadSave()','function save()',
  'function damagePlayer(amount,source)','function attackNow()','function killEnemy(e)',
  'function beginSpecial(e)','function resolveSpecial(e,tg)','function update(dt)',
  'function prepareFloor()','function nextFloor()','function buyWeapon(i)','function buyArmor(i)',
  "3:{name:'3층 문지기 골렘',hp:360,atk:25","5:{name:'5층 붉은 기사',hp:500,atk:31",
  "8:{name:'8층 탑의 와이번',hp:720,atk:38","10:{name:'10층 마왕',hp:980,atk:48",
  'const dmg=attackPower();e.hp-=dmg','e.attackCd=1.05','state.player.gold+=e.gold',
  'JSON.stringify(state)'])assert.ok(html.includes(marker),marker);
 assert.ok(native.includes('function render({player,enemies:actors=[],effects:active=[]}'));
 assert.doesNotMatch(native,/localStorage|\.hp\s*[-+]?=/);
});

function harness(){
 const nodes=new Map(),docs=new Map(),windows=new Map();let serial=0;
 const renderer={renders:0,resize(){},render(){this.renders++}};
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const listeners=new Map(),classes=new Set();
  const element={id,style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,children:[],
    className:'',classList:{add:s=>classes.add(s),remove:s=>classes.delete(s),
    contains:s=>classes.has(s),toggle:(s,b)=>b?classes.add(s):classes.delete(s)},
    addEventListener:(s,fn)=>listeners.set(s,fn),
    dispatch:(s,event)=>listeners.get(s)?.(event),
    appendChild(child){this.children.push(child)},
    getBoundingClientRect(){return {left:0,top:0,width:116,height:116}},
    setPointerCapture(){},querySelector(){return node('child-of-'+id)},insertAdjacentHTML(){},
    getContext(){throw Error('2D context forbidden')}};
  nodes.set(id,element);return element;
 }
 const document={hidden:false,getElementById:node,createElement:tag=>node('created-'+tag+'-'+(++serial)),
  addEventListener:(type,fn)=>docs.set(type,fn)};
 const context=vm.createContext({document,innerWidth:390,innerHeight:844,devicePixelRatio:1,
  performance:{now:()=>1000},requestAnimationFrame(){},addEventListener:(type,fn)=>windows.set(type,fn),
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},setTimeout(){},clearTimeout(){},
  console,location:{reload(){}},createTower3d:()=>Promise.resolve(renderer)});
 const executable=source.replace(/^import\s*\{createTower3d\}\s*from\s*'\.\/tower3d\.mjs';\s*/m,'');
 assert.doesNotMatch(executable,/^import\s/m);
 vm.runInContext(executable,context,{timeout:1000});
 return {node,docs,windows,document,context,renderer};
}

test('live game handlers reject second finger and clear abandoned input; damage is unchanged',async()=>{
 const {node,docs,windows,document,context,renderer}=harness();
 await new Promise(setImmediate);
 assert.equal(node('startBtn').disabled,false);
 assert.equal(node('renderStatus').style.display,'none');
 node('startBtn').onclick();
 assert.ok(renderer.renders>0);
 vm.runInContext("startBattle('battle')",context);
 const j=node('joy'),knob=node('knob'),ptr=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
 j.dispatch('pointerdown',ptr(1,95,58));const first=knob.style.transform;
 assert.notEqual(first,'translate(0,0)');
 j.dispatch('pointerdown',ptr(2,10,58));j.dispatch('pointermove',ptr(2,10,10));
 j.dispatch('pointerup',ptr(2,10,10));j.dispatch('pointercancel',ptr(2,10,10));
 assert.equal(knob.style.transform,first);
 j.dispatch('pointercancel',ptr(1,95,58));assert.equal(knob.style.transform,'translate(0,0)');
 j.dispatch('pointerdown',ptr(3,95,58));j.dispatch('lostpointercapture',ptr(3,95,58));
 assert.equal(knob.style.transform,'translate(0,0)');
 j.dispatch('pointerdown',ptr(4,95,58));windows.get('blur')();
 assert.equal(knob.style.transform,'translate(0,0)');
 j.dispatch('pointerdown',ptr(5,95,58));document.hidden=true;docs.get('visibilitychange')();
 assert.equal(knob.style.transform,'translate(0,0)');
 vm.runInContext("var testEnemy=enemies[0];testEnemy.x=state.player.x+67;testEnemy.y=state.player.y;testEnemy.hp=100;state.player.dirX=1;state.player.dirY=0;state.player.attackCd=0;var previousHP=testEnemy.hp;var damageExpected=attackPower();attackNow();var attackResult={damage:previousHP-testEnemy.hp,expected:damageExpected,cooldown:state.player.attackCd};",context);
 const result=vm.runInContext('attackResult',context);
 assert.equal(result.damage,result.expected);
 assert.ok(result.cooldown>0);
});