import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {VibeMotionEngine, createFixedStepMotionLoop} from '../assets/vibe-motion-engine.mjs';
import {connectVibeCharacter} from '../assets/vibe-character-adapter.mjs';
import {makeFootPlant,makeMotionMatcher,makeLayeredPoseBlender} from '../assets/vibe-studio-animation.js';
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

test('Vibe 5.9 real GLB clips map sprint to authored Run without fabricating a clip',async()=>{
 const previousFetch=globalThis.fetch,played=[],actions=new Map();
 globalThis.fetch=async()=>({ok:true,json:async()=>design});
 const THREE={AnimationMixer:class{
  clipAction(clip){
   if(!actions.has(clip.name))actions.set(clip.name,{
    name:clip.name,reset(){return this},fadeIn(){return this},
    play(){played.push(this.name);return this},fadeOut(){return this}
   });
   return actions.get(clip.name);
  }
  update(){}stopAllAction(){}uncacheRoot(){}
 }};
 try{
  const adapter=await connectVibeCharacter({character:{},clips:[{name:'Idle'},{name:'Walk'},{name:'Run'}],THREE});
  assert.equal(adapter.play('walk'),true);
  assert.equal(adapter.play('sprint'),true);
  assert.equal(adapter.play('jog'),true);
  assert.equal(adapter.play('fly'),false);
  assert.deepEqual(played,['Walk','Run','Walk']);
  adapter.move({speed:.95});
  assert.equal(adapter.engine.state,'sprint');
  adapter.dispose();
 }finally{globalThis.fetch=previousFetch}
});
test('Vibe 5.9 desktop 3D preview targets smooth frames while mobile retains its budget',()=>{
 const html=readFileSync(new URL('../assets/vibe-model-preview.html',import.meta.url),'utf8');
 assert.ok(html.includes('if(now-last<(mobileView?33:16))return'));
 assert.ok(html.includes('targetFps:55'));
 assert.ok(html.includes("if(mobileView){"));
});

test('Vibe 5.9 world-space foot locks do not mutate source positions and release on swing',()=>{
 const feet={left:{x:1,y:2,z:3},right:{x:4,y:2,z:3}};
 const plant=makeFootPlant({stride:1});
 plant.update({phase:.9,speed:1,feet});
 plant.update({phase:0,speed:1,feet});
 const left=plant.getTargets().left;assert.deepEqual(left,{x:1,y:2,z:3});
 feet.left.x=99;assert.deepEqual(plant.getTargets().left,{x:1,y:2,z:3});
 plant.update({phase:.55,speed:1,feet});assert.equal(plant.getTargets().left,undefined);
 plant.update({phase:.75,speed:1,grounded:false,feet});assert.deepEqual(plant.getTargets(),{});
});

test('Vibe 5.9 selects real authored clips with hysteresis, rejects empty candidates',()=>{
 const matcher=makeMotionMatcher({hysteresis:.1});
 assert.equal(matcher.select({candidates:[{features:{speed:0}}]}).selected,null);
 const choices=[{sourceClipId:'walk',features:{speed:1,heading:0,leftFootPlanted:true}},
  {sourceClipId:'run',features:{speed:3,heading:0,leftFootPlanted:true}}];
 assert.equal(matcher.select({features:{speed:1.1,leftFootPlanted:true},candidates:choices}).selected,'walk');
 assert.equal(matcher.select({features:{speed:2.9,leftFootPlanted:true},candidates:choices}).selected,'run');
 matcher.reset();assert.equal(matcher.current,null);
});

test('Vibe 5.9 masked pose layers preserve original and exclude non-target bones',()=>{
 const blender=makeLayeredPoseBlender();
 const base={Hip:{ry:0,x:1},Arm:{rx:0,ry:0}};
 const result=blender.blend({base,layers:[{weight:1,mask:['Arm'],pose:{Hip:{ry:2},Arm:{rx:1.2}}},
  {weight:.5,additive:true,mask:['Arm'],pose:{Arm:{ry:.6}}}]});
 assert.deepEqual(result.Hip,{ry:0,x:1});
 assert.ok(Math.abs(result.Arm.rx-1.2)<1e-8);
 assert.ok(Math.abs(result.Arm.ry-.3)<1e-8);
 assert.equal(base.Arm.rx,0);
});
