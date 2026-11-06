import {test} from 'node:test';import assert from 'node:assert/strict';
import {planVibeGame,vibeCasualFive} from '../assets/vibe-genre-system-planner.mjs';
import {calculateVibeCombatStats,createVibeSaveSlots,createVibeWorldVfx,createVibeCanvasVfx} from '../assets/vibe-game-world-runtime.mjs';
import {createGenreGameplay} from '../assets/vibe-genre-gameplay.mjs';
test('RPG and survival systems combine without duplicates',()=>{const plan=planVibeGame({primary:'rpg',secondary:['survival']});assert.ok(plan.systems.includes('hunger'));assert.ok(plan.systems.includes('quests'));assert.equal(plan.systems.length,new Set(plan.systems).size)});
test('auto picks strategy when requested and casual set has five genres',()=>{assert.equal(planVibeGame({primary:'auto',preferences:{strategy:true}}).primary,'strategy4x');assert.equal(vibeCasualFive.length,5)});
test('upgrades increase combat damage',()=>{const game=createGenreGameplay(),before=calculateVibeCombatStats(game.snapshot());game.upgrade();const after=calculateVibeCombatStats(game.snapshot());assert.ok(after.attack>before.attack)});
test('per-game saves are isolated and restorable',()=>{const storage=new Map(),backend={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};const first=createVibeSaveSlots({storage:backend,gameId:'gameA'}),other=createVibeSaveSlots({storage:backend,gameId:'gameB'}),game=createGenreGameplay();game.train('swordArt');first.save(1,game);assert.equal(other.load(1,createGenreGameplay()),null);const copy=createGenreGameplay();assert.ok(first.load(1,copy));assert.equal(copy.snapshot().arts.swordArt,1)});

// [VFX 회귀] 실제 게임과 미리보기가 공유하는 GPU 점 파티클은 상한과 정리 계약을 지킨다.
test('existing game VFX shares a bounded disposable particle pool',()=>{
 let added=0,removed=0,geometryDisposed=0,materialDisposed=0;
 const THREE={
  AdditiveBlending:2,
  BufferGeometry:class{
   setAttribute(){}
   setDrawRange(start,count){this.count=count}
   dispose(){geometryDisposed++}
  },
  BufferAttribute:class{constructor(values,size){this.values=values;this.size=size;this.needsUpdate=false}},
  PointsMaterial:class{constructor(options){this.options=options}dispose(){materialDisposed++}},
  Points:class{constructor(geometry,material){this.geometry=geometry;this.material=material}},
  Color:class{constructor(){this.r=1;this.g=.7;this.b=.4}}
 };
 const scene={add(){added++},remove(){removed++}};
 const vfx=createVibeWorldVfx(THREE,scene,{maxParticles:4});
 assert.equal(vfx.burst({x:2,y:1,z:3,count:9}),4);
 assert.equal(vfx.burst({count:3}),0);
 assert.equal(vfx.count,4);
 vfx.update(.05);
 assert.equal(vfx.count,4);
 for(let i=0;i<9;i++)vfx.update(.1);
 assert.equal(vfx.count,0);
 vfx.dispose();vfx.dispose();
 assert.equal(added,1);assert.equal(removed,1);
 assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);
 assert.equal(vfx.burst({count:2}),0);
});

test('canvas VFX enforces budget and clears after rendering',()=>{
 const calls=[];
 const ctx={save(){},restore(){},fillRect(){calls.push('pixel')},set globalAlpha(v){},set fillStyle(v){},set shadowColor(v){},set shadowBlur(v){calls.push(v?'glow':'normal')}};
 const effect=createVibeCanvasVfx({maxParticles:10});
 assert.equal(effect.burst('magic',{x:0,y:0,count:8}),8);
 assert.equal(effect.burst('explosion',{x:0,y:0,count:8}),2);
 effect.update(.016);effect.draw(ctx);
 assert.ok(calls.includes('glow'));assert.ok(calls.includes('pixel'));
 for(let i=0;i<15;i++)effect.update(.1);
 assert.equal(effect.count,0);effect.dispose();
 assert.equal(effect.burst('dust',{count:3}),0);
});
