import assert from 'node:assert/strict';
import {test} from 'node:test';
import {VibePresentationEngine,connectMotionPresentation} from '../assets/vibe-presentation-engine.mjs';
test('impact cue triggers bounded feedback and clears camera offset',()=>{
 const sound=[],shake=[],subtitles=[];
 const engine=new VibePresentationEngine({adapter:{playSound:s=>sound.push(s),cameraShake:s=>shake.push(s),subtitle:s=>subtitles.push(s)}});
 assert.equal(engine.cue('impact',{sound:'hit',label:'Impact',shake:10,hitStop:1}),true);
 assert.deepEqual(sound,['hit']);assert.deepEqual(subtitles,['Impact']);
 const frame=engine.update(.016);assert.equal(frame.timeScale,0);
 assert.ok(Math.abs(frame.shake.x)<=.5&&Math.abs(frame.shake.y)<=.5);
 for(let i=0;i<30;i++)engine.update(.016);
 assert.deepEqual(engine.update(.016).shake,{x:0,y:0});
 engine.dispose();assert.deepEqual(shake.at(-1),{x:0,y:0});
});
test('reduced motion suppresses shake, hit stop and flashes',()=>{
 let flashes=0;
 const engine=new VibePresentationEngine({settings:{reducedMotion:true},adapter:{flash:()=>flashes++}});
 engine.cue('attack',{shake:1,hitStop:.09,flash:.3});
 assert.equal(engine.update(.016).timeScale,1);assert.equal(flashes,0);
});
test('motion event bridge maps footsteps and restores original callback',()=>{
 let original=0,sounds=0;
 const motion={adapter:{onEvent:()=>original++}};
 const presentation=new VibePresentationEngine({adapter:{playSound:()=>sounds++}});
 const disconnect=connectMotionPresentation(motion,presentation);
 motion.adapter.onEvent({type:'footstep'});
 assert.equal(original,1);assert.equal(sounds,1);
 disconnect();motion.adapter.onEvent({type:'footstep'});assert.equal(original,2);assert.equal(sounds,1);
});
