import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInputBuffer,makeCoyoteJump,makeCameraSpring,makeInteractionSelector,makeFeedbackScheduler,makeObjectiveTracker,makeCoreLoopTelemetry,makeCheckpointRecovery,makeDifficultyDirector,makeDamageFeedback,makeTraversalStamina,makeAccessibilitySettings} from '../assets/vibe-studio-gameplay.js';
test('input buffering consumes one eligible command',()=>{
 const b=makeInputBuffer({bufferSeconds:.2});
 b.push({action:'jump',time:1});
 assert.equal(b.consume('jump',1.1).action,'jump');
 assert.equal(b.consume('jump',1.1),null);
});
test('input buffer expires old actions',()=>{
 const b=makeInputBuffer({bufferSeconds:.1});
 b.push({action:'attack',time:1});
 assert.equal(b.consume('attack',2),null);
});
test('coyote time permits jump immediately after leaving ground',()=>{
 const j=makeCoyoteJump({graceSeconds:.1,bufferSeconds:.1});
 j.ground(1);j.press(1.05);
 assert.equal(j.consume(1.08),true);
 assert.equal(j.consume(1.09),false);
});
test('coyote jump refuses expired presses',()=>{
 const j=makeCoyoteJump({graceSeconds:.1,bufferSeconds:.1});
 j.ground(0);j.press(0);
 assert.equal(j.consume(.2),false);
});
test('camera spring approaches target smoothly',()=>{
 const c=makeCameraSpring();
 c.snap({x:0,y:0,z:0});
 const next=c.update({x:10,y:0,z:0},.01);
 assert.ok(next.x>0&&next.x<10);
});
test('interaction selector rejects distant objects',()=>{
 const s=makeInteractionSelector({radius:2});
 assert.equal(s.choose({player:{x:0,y:0},candidates:[{id:'far',x:4,y:0}]}),null);
});
test('interaction selector prefers close forward objects',()=>{
 const s=makeInteractionSelector({radius:3});
 const selected=s.choose({player:{x:0,y:0},forward:{x:1,y:0},candidates:[{id:'front',x:1,y:0},{id:'back',x:-1,y:0}]});
 assert.equal(selected.id,'front');
});
test('feedback scheduler suppresses excessive duplicate effects',()=>{
 const s=makeFeedbackScheduler({maxPerSecond:2});
 assert.equal(s.allow({type:'hit',now:0}),true);
 assert.equal(s.allow({type:'hit',now:.01}),false);
 assert.equal(s.allow({type:'step',now:.2}),true);
 assert.equal(s.allow({type:'wind',now:.3}),false);
});
test('objective tracker requires all mandatory objectives',()=>{
 const t=makeObjectiveTracker({objectives:[{id:'a',target:2},{id:'b',target:1,required:false}]});
 t.advance('a');assert.equal(t.status().ready,false);
 t.advance('a');assert.equal(t.status().ready,true);
});
test('core-loop telemetry refuses invented samples',()=>{
 const t=makeCoreLoopTelemetry();
 assert.equal(t.report().hasEvidence,false);
 t.record({time:0,type:'KILL',durationMs:100});
 assert.equal(t.report().counts.KILL,1);
 assert.equal(t.report().averageDurationMs.KILL,100);
});
test('checkpoint recovery returns last captured state',async()=>{
 let state={hp:100};
 const c=makeCheckpointRecovery({capture:()=>({...state}),restore:s=>{state={...s};}});
 await c.save({id:'camp',time:1});
 state.hp=1;
 assert.equal((await c.recover('camp')).ok,true);
 assert.equal(state.hp,100);
});
test('difficulty director is bounded',()=>{
 const d=makeDifficultyDirector({adaptation:1,minScale:.8,maxScale:1.2});
 for(let i=0;i<100;i++)d.observe({success:true});
 assert.equal(d.scale,1.2);
 for(let i=0;i<100;i++)d.observe({success:false});
 assert.equal(d.scale,.8);
});
test('damage feedback merges hits within window',()=>{
 const d=makeDamageFeedback({combineWindowMs:100});
 d.hit({targetId:'boss',amount:10,time:0});
 d.hit({targetId:'boss',amount:20,time:50,critical:true});
 assert.equal(d.flush(100).length,0);
 const events=d.flush(150);
 assert.equal(events.length,1);assert.equal(events[0].amount,30);assert.equal(events[0].critical,true);
});
test('traversal stamina drains and restores after delay',()=>{
 const s=makeTraversalStamina({maximum:100,drainPerSecond:20,restorePerSecond:10,restoreDelay:1});
 assert.equal(s.update({dt:1,now:1,draining:true}).value,80);
 assert.equal(s.update({dt:1,now:1.5}).value,80);
 assert.equal(s.update({dt:1,now:2.1}).value,90);
});
test('accessibility options clamp dangerous extremes',()=>{
 const s=makeAccessibilitySettings({cameraShake:2,subtitleScale:9});
 assert.equal(s.get().cameraShake,1);
 assert.equal(s.get().subtitleScale,2);
 assert.equal(s.update({cameraShake:-1}).cameraShake,0);
});
