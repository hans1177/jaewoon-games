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
// [시네마틱 감독] 화면 프레임과 동일한 타임라인에서 시작·집중·종료 비트를 한 번만 방출한다.
test('optional staged cinematic beats sync to existing camera track events',()=>{
 const eventRows=[],cameraRows=[];
 const director=new VibeCinematicDirector({adapter:{
  onEvent:event=>eventRows.push(event.type),
  applyCamera:(name,pose)=>cameraRows.push({name,x:pose.position.x})
 }});
 director.addTrack('showcase',[
  {at:0,position:{x:0}},
  {at:.2,position:{x:2}},
  {at:.4,position:{x:4}}
 ],{stageBeats:true});
 for(let i=0;i<10;i++)director.update(.05);
 assert.deepEqual(eventRows,['establish','focus','resolve']);
 assert.ok(cameraRows.length>=8);
 assert.ok(cameraRows.at(-1).x>=3.99);
});

test('acting micro motion remains bounded',()=>{
 const a=createCharacterPerformance();let v;
 for(let i=0;i<120;i++)v=a.update(1/60,{targetLook:{x:1}});
 assert.ok(v.look.x>0&&v.look.x<=1);
 assert.ok(Math.abs(v.breath)<=.018);
});
