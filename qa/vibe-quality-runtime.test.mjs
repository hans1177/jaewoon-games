import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCombatBrain,makeSpatialStreamer,makeAnimationMixer,makeInteractionBus,makePerformanceSampler} from '../assets/vibe-quality-runtime.js';
test('combat perception, chase, telegraph, hit, recovery and leash',()=>{
 const ai=makeCombatBrain({attackRange:2,windup:.2,cooldown:1});
 const self={x:0,y:0},enemy={id:'hero',x:4,y:0};
 assert.equal(ai.update({now:0,dt:.1,self,players:[enemy]}).state,'CHASE');
 enemy.x=1;
 assert.equal(ai.update({now:1,dt:.1,self,players:[enemy]}).state,'WINDUP');
 assert.equal(ai.update({now:1.1,dt:.1,self,players:[enemy]}).state,'RECOVER');
 assert.equal(ai.update({now:1.3,dt:.1,self,players:[enemy]}).state,'RECOVER');
 assert.equal(ai.update({now:2.1,dt:.1,self,players:[enemy]}).state,'WINDUP');
 assert.equal(ai.update({now:2.4,dt:.1,self,players:[enemy]}).state,'RECOVER');
 assert.equal(ai.update({now:3,dt:.1,self:{x:100,y:0},players:[enemy]}).state,'RETURN');
});
test('streaming caps loaded chunks and unloads previous cells',async()=>{
 let loads=0,unloads=0;
 const s=makeSpatialStreamer({cellSize:10,radius:1,maxLoaded:4,load:async()=>++loads,unload:async()=>{unloads++;}});
 assert.equal((await s.update([{x:0,y:0}])).loaded,4);
 assert.equal((await s.update([{x:100,y:0}])).loaded,4);
 assert.equal(unloads,4);assert.equal(loads,8);
 await s.clear();assert.equal(unloads,8);
});
test('animation smooths movement and shortest turn',()=>{
 const a=makeAnimationMixer({acceleration:2,turnSpeed:1});
 const first=a.step({dt:.1,now:0,targetSpeed:5,targetFacing:Math.PI});
 assert.equal(first.speed,.2);assert.ok(Math.abs(first.facing)<=.101);
 a.impact(1);assert.equal(a.step({dt:.1,now:1.01}).hitStop,true);
 assert.equal(a.step({dt:.1,now:1.2}).hitStop,false);
});
test('interaction validates authority and deduplicates command IDs',async()=>{
 let n=0;const bus=makeInteractionBus({validate:c=>c.actorId==='server-authorized',apply:async()=>({ok:true,value:++n})});
 assert.equal((await bus.dispatch({id:'a',type:'pickup',actorId:'client'})).ok,false);
 const c={id:'a',type:'pickup',actorId:'server-authorized'};
 assert.equal((await bus.dispatch(c)).result,1);
 assert.equal((await bus.dispatch(c)).result,1);
 assert.equal(n,1);
});
test('performance samples bounded percentiles without inventing results',()=>{
 const p=makePerformanceSampler({capacity:2});
 assert.equal(p.summary().status,'UNKNOWN');
 p.sample({frameMs:10,memoryMb:100});p.sample({frameMs:20,memoryMb:120});p.sample({frameMs:30,memoryMb:110});
 assert.equal(p.summary().samples,2);assert.equal(p.summary().frameP99Ms,30);
 assert.equal(p.summary().peakMemoryMb,120);
});
