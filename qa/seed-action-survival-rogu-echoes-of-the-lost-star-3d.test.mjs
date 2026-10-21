// Native 3D contract for the existing Star Echoes authoritative shooter.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('web-games/seed-action-survival-rogu-echoes-of-the-lost-star/index.html','utf8');
const graphics=fs.readFileSync('web-games/seed-action-survival-rogu-echoes-of-the-lost-star/star3d.mjs','utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
test('Star Echoes native WebGL3D instead of a Canvas2D gameplay facade',()=>{
 assert.ok(script);
 for(const marker of ['data-render-target="webgl-3d"',"import {createStar3d} from './star3d.mjs'","3D 실행 실패"])assert.ok(html.includes(marker),marker);
 assert.doesNotMatch(script,/\bgetContext\s*\(\s*['"]2d['"]/);
 assert.doesNotMatch(script,/\bctx\s*\./);
 assert.match(graphics,/new THREE\.WebGLRenderer\(/);
 assert.match(graphics,/new THREE\.PerspectiveCamera\(/);
 assert.match(graphics,/renderer\.render\(scene,camera\)/);
 assert.match(graphics,/canvas\.dataset\.renderedFrame='true'/);
 assert.match(graphics,/document\.body\.dataset\.spatialDimension='3d'/);
 assert.match(graphics,/document\.body\.dataset\.renderer='three-webgl'/);
 assert.match(graphics,/webglcontextlost/);
 assert.match(graphics,/ENEMY_CAP=220,BULLET_CAP=420,GEM_CAP=420,PARTICLE_CAP=240/);
 assert.match(graphics,/new THREE\.InstancedMesh/);
 assert.match(graphics,/nativeArtCoverage='incomplete'/);
 assert.doesNotMatch(graphics,/localStorage|\.hp\s*[-+]?=/);
});
test('Star Echoes shooting, upgrades and original world simulation stay authoritative',()=>{
 for(const marker of [
  "damage:16,fireRate:.48","bulletSpeed:520,multi:1","waveTimer>=28",
  "hp:30*scale,maxHp:30*scale","hp:19*scale,maxHp:19*scale",
  "hp:82*scale,maxHp:82*scale","const hp=750*(1+(wave-1)*.12)",
  "function fire()","function hurt(amount)","function dash()","function levelUp()",
  "function gainXp(v)","function spawnBoss()","function update(dt)",
  "for(const e of enemies)","function updateUi()", "function releaseJoystick()"
 ])assert.ok(script.includes(marker),marker);
 assert.match(script,/star3d\.render\(\{player,enemies,bullets,gems,particles\}/);
 assert.match(script,/star3d=createStar3d\(\{canvas\}\)/);
});
test('Star Echoes original mobile handler remains executable in the new module',()=>{
 const code=script.replace(/^\s*import\s*\{createStar3d\}\s*from\s*'\.\/star3d\.mjs';\s*/,'');
 const events=new Map(),nodes=new Map();
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const listeners=new Map(),set=new Set();
  const result={style:{},classList:{add:x=>set.add(x),remove:x=>set.delete(x),
    toggle:(x,v)=>v?set.add(x):set.delete(x),contains:x=>set.has(x)},
    addEventListener:(type,fn)=>listeners.set(type,fn),dispatch:(type,event)=>listeners.get(type)?.(event),
    setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:116,height:116}},
    appendChild(){},textContent:'',innerHTML:'',disabled:false};
  nodes.set(id,result);return result;
 };
 const dom={hidden:false,getElementById:node,createElement:()=>node('child'),
  addEventListener:(type,fn)=>events.set(type,fn)};
 let frameCalls=0,rendererCalls=0;
 const context=vm.createContext({document:dom,window:{},innerWidth:390,innerHeight:760,devicePixelRatio:1,
  performance:{now:()=>0},requestAnimationFrame(){frameCalls++},addEventListener(){},
  createStar3d:()=>({resize(){},render(){rendererCalls++}})});
 vm.runInContext(code,context,{timeout:1000});
 assert.equal(node('startBtn').disabled,false);
 node('startBtn').onclick();
 assert.ok(frameCalls>0);
 vm.runInContext("spawnEnemy('normal');update(.033);draw()",context);
 assert.ok(rendererCalls>0,'actual existing update must render via native 3D consumer');
 const joy=node('joystick'),stick=node('stick'),ptr=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
 joy.dispatch('pointerdown',ptr(1,94,58));const first=stick.style.transform;
 joy.dispatch('pointerdown',ptr(2,12,58));joy.dispatch('pointermove',ptr(2,10,20));
 assert.equal(stick.style.transform,first);
 joy.dispatch('pointercancel',ptr(2,10,20));assert.equal(stick.style.transform,first);
 joy.dispatch('pointercancel',ptr(1,94,58));assert.equal(stick.style.transform,'translate(0,0)');
});
