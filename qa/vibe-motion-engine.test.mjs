import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {VibeMotionEngine, createFixedStepMotionLoop} from '../assets/vibe-motion-engine.mjs';
const design=JSON.parse(readFileSync(new URL('../assets/vibe-visual-design-system.json',import.meta.url)));
test('genre presets and movement states',()=>{
 const played=[];const engine=new VibeMotionEngine(design,{play:(name)=>played.push(name)});
 engine.setGenre('fantasy');engine.setMovement({speed:.2});assert.equal(engine.state,'walk');
 engine.setMovement({speed:.95});assert.equal(engine.state,'sprint');
 engine.setMovement({grounded:false});assert.equal(engine.state,'fall');
 assert.deepEqual(played,['walk','sprint','fall']);
 assert.throws(()=>engine.enter('nonexistent'));
});
test('events are unique and consumed exactly once',()=>{
 const engine=new VibeMotionEngine(design);
 engine.enter('light-attack');engine.enter('dodge');const events=engine.consumeEvents();assert.equal(events.length,2);assert.ok(events[1].id>events[0].id);assert.equal(engine.consumeEvents().length,0)
});
test('fixed timestep clamps long frames',()=>{
 const engine=new VibeMotionEngine(design);
 const loop=createFixedStepMotionLoop(engine,{hz:60,maxSteps:5});
 assert.equal(loop(2),5);assert.ok(engine.time>0&&engine.time<.1);
 engine.setPaused(true);const t=engine.time;loop(.1);assert.equal(engine.time,t);
});

test('buffered actions honor priority and cooldown',()=>{
 const engine=new VibeMotionEngine(design);
 engine.queueAction('dodge',{priority:1,cooldown:1});
 engine.queueAction('light-attack',{priority:3});
 assert.equal(engine.flushActions(),'light-attack');
 assert.equal(engine.flushActions(),'dodge');
 engine.queueAction('dodge',{priority:2});
 assert.equal(engine.flushActions(),null);
 engine.update(.1);
 assert.equal(engine.flushActions(),null);
});
test('clip events fire once when crossing timeline markers',()=>{
 const engine=new VibeMotionEngine(design);
 engine.registerClipEvents('walk',[{at:.02,type:'footstep'},{at:.04,type:'footstep'}]);
 engine.enter('walk');engine.consumeEvents();
 engine.update(.03);engine.update(.03);
 assert.deepEqual(engine.consumeEvents().map(e=>e.type),['footstep','footstep']);
 engine.update(.02);assert.equal(engine.consumeEvents().length,0);
});

test('action cancellation window prevents early queued dodge and recovers to idle',()=>{
 const engine=new VibeMotionEngine(design);
 engine.registerActionRule('light-attack',{duration:.4,cancelFrom:.2,cancelTo:.35});
 engine.enter('light-attack');
 engine.queueAction('dodge',{priority:5});
 engine.update(.1);assert.equal(engine.state,'light-attack');
 engine.update(.1);engine.update(.01);assert.equal(engine.state,'dodge');
 const recovery=new VibeMotionEngine(design);
 recovery.registerActionRule('light-attack',{duration:.2});
 recovery.enter('light-attack');recovery.update(.1);recovery.update(.1);
 assert.equal(recovery.state,'idle');
 assert.throws(()=>engine.registerActionRule('dodge',{duration:-1}));
});
