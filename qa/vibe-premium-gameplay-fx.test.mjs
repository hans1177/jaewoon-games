import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VibeActionDirector,VibeLocomotionPolish,VibeCameraPolish,VibeScreenFxDirector,createVibeAudioCuePlanner} from '../assets/vibe-premium-gameplay-fx.mjs';
test('actions progress through anticipation, impact and recovery',()=>{
 const cues=[],director=new VibeActionDirector({onCue:e=>cues.push(e)});
 director.request('lightAttack');
 for(let i=0;i<8;i++)director.update(.1);
 assert.ok(cues.some(e=>e.type==='impact-window'));
 assert.equal(director.snapshot().action,null);
});
test('movement accelerates and slows without abrupt jumps',()=>{
 const mover=new VibeLocomotionPolish();const a=mover.update(.016,{input:{x:1},speed:5});const b=mover.update(.016,{input:{x:1},speed:5});
 assert.ok(b.speed>a.speed);assert.ok(b.speed<5);
 const c=mover.update(.016,{input:{},speed:5});assert.ok(c.speed<b.speed);
});
test('camera eases toward target',()=>{
 const camera=new VibeCameraPolish();const pose=camera.update(.016,{target:{x:10}});
 assert.ok(pose.position.x>0&&pose.position.x<10);
});
test('audio attenuation and screen effect expiration',()=>{
 const audio=createVibeAudioCuePlanner();const near=audio.plan('step',{distance:0,now:1});const far=audio.plan('step',{distance:25,now:2});
 assert.ok(near.volume>far.volume);
 const screen=new VibeScreenFxDirector();screen.add('flash',{duration:.1});screen.update(.1);assert.equal(screen.snapshot().length,0);
});
