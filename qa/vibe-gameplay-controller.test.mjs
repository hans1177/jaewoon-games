import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {VibeMotionEngine} from '../assets/vibe-motion-engine.mjs';
import {VibeGameplayController} from '../assets/vibe-gameplay-controller.mjs';
const design=JSON.parse(readFileSync(new URL('../assets/vibe-visual-design-system.json',import.meta.url)));
const setup=()=>{const motion=new VibeMotionEngine(design);return {motion,controller:new VibeGameplayController({motion})}};
test('movement accelerates and respects max speed',()=>{
 const {controller}=setup();controller.setInput({x:1,z:1,sprint:true});
 for(let i=0;i<90;i++)controller.update(1/60);
 assert.ok(Math.hypot(controller.velocity.x,controller.velocity.z)<=6.001);
 assert.ok(controller.stamina<100);
});
test('jump buffer and coyote time initiate jump',()=>{
 const {controller,motion}=setup();
 controller.setInput({jump:true});controller.update(1/60);
 assert.equal(motion.state,'jump-start');assert.ok(controller.velocity.y>0);
});
test('jump take-off has one observable start state and does not instantly emit fall',()=>{
 const {controller,motion}=setup();
 controller.setInput({jump:true});
 controller.update(1/60);
 const eventStates=motion.consumeEvents().filter(e=>e.type==='state-change').map(e=>e.to);
 assert.deepEqual(eventStates,['jump-start'],'fall must not erase jump-start in the same tick');
 assert.equal(motion.state,'jump-start');
 assert.ok(controller.velocity.y>0);
 controller.update(1/60);
 assert.equal(motion.state,'fall','airborne locomotion must resume on the next tick');
});

test('stamina gates dodge and physics adapter receives movement',()=>{
 const {motion}=setup();let called=0;
 const controller=new VibeGameplayController({motion,physics:{resolve:(old,next)=>({position:next,grounded:true}),onMove:()=>called++}});
 assert.equal(controller.dodge(),true);assert.equal(controller.stamina,78);
 controller.stamina=0;assert.equal(controller.dodge(),false);
 controller.update(1/60);assert.equal(called,1);
});
