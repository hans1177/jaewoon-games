import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VibeCinematicDirector,createCharacterPerformance} from '../assets/vibe-cinematic-director.mjs';
test('camera keyframes interpolate and finish at target',()=>{
 const d=new VibeCinematicDirector();d.addTrack('shot',[{at:0,position:{x:0}},{at:1,position:{x:10}}]);
 let result;for(let i=0;i<60;i++)result=d.update(1/60);
 assert.ok(Math.abs(result[0].position.x-10)<1e-6);
});
test('events fire once',()=>{
 const d=new VibeCinematicDirector();d.addTrack('shot',[{at:0,event:'start'},{at:.1,event:'impact'},{at:.2,event:'end'}]);
 for(let i=0;i<20;i++)d.update(.02);
 assert.deepEqual(d.consumeEvents().map(e=>e.type),['start','impact','end']);
});
test('reduced motion freezes translation',()=>{
 const d=new VibeCinematicDirector({reducedMotion:true});
 d.addTrack('shot',[{at:0,position:{x:1}},{at:1,position:{x:9}}]);
 assert.equal(d.update(.5)[0].position.x,1);
});
test('acting micro motion remains bounded',()=>{
 const a=createCharacterPerformance();let v;
 for(let i=0;i<120;i++)v=a.update(1/60,{targetLook:{x:1}});
 assert.ok(v.look.x>0&&v.look.x<=1);
 assert.ok(Math.abs(v.breath)<=.018);
});
