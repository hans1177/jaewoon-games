import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  motionFrameDelta,shortestYawDelta,smoothPresentationYaw,createVibeActionTransition,
  createObservedTravelSampler,selectExistingTravelClip,selectExistingWeaponAttack
} from '../assets/vibe-action-transition.mjs';

function makeMixer(){
  const actions=new Map(),updates=[],mixer={
    clipAction(clip){
      if(!actions.has(clip.name)){
        const calls=[];
        const action={calls,enabled:false,clampWhenFinished:false,
          fadeOut(t){calls.push(['fadeOut',t]);return this;},
          fadeIn(t){calls.push(['fadeIn',t]);return this;},
          stop(){calls.push(['stop']);return this;},
          reset(){calls.push(['reset']);return this;},
          setLoop(mode,repeats){calls.push(['loop',mode,repeats]);return this;},
          setEffectiveTimeScale(rate){calls.push(['speed',rate]);return this;},
          play(){calls.push(['play']);return this;}
        };
        actions.set(clip.name,action);
      }
      return actions.get(clip.name);
    },
    update(dt){updates.push(dt);},
    stopAllAction(){updates.push('disposed');}
  };
  return {mixer,actions,updates};
}

test('shortest-path yaw crosses +-PI boundary without spinning 360 degrees',()=>{
  const start=Math.PI-.07,target=-Math.PI+.07;
  const delta=shortestYawDelta(start,target);
  assert.ok(Math.abs(delta-.14)<.001);
  const next=smoothPresentationYaw(start,target,.016);
  assert.ok(Math.abs(shortestYawDelta(next,target))<Math.abs(delta));
  assert.ok(Math.abs(next-start)<.14);
});

test('motion delta prevents animation spikes after hidden-tab stalls',()=>{
  assert.equal(motionFrameDelta(5500,0),0);
  assert.equal(motionFrameDelta(1050,1000),.05);
  assert.equal(motionFrameDelta(9000,1000),.05);
  assert.equal(motionFrameDelta(900,1000),0);
});

test('looping walk is cached and does not reset on every frame',()=>{
  const {mixer,actions,updates}=makeMixer();
  const director=createVibeActionTransition({
    mixer,clips:[{name:'Idle'},{name:'Running_A'},{name:'1H_Melee_Attack_Chop'}],
    LoopOnce:'once',LoopRepeat:'repeat'
  });
  assert.equal(director.play('Idle'),true);
  assert.equal(director.play('Idle'),true);
  assert.equal(actions.get('Idle').calls.filter(x=>x[0]==='play').length,1);
  assert.equal(director.play('Running_A'),true);
  assert.equal(actions.get('Idle').calls.filter(x=>x[0]==='fadeOut').length,1);
  director.update(1000);
  director.update(1016);
  assert.ok(updates[0]>0&&updates[0]<=.05 || updates[0]===.016);
  assert.equal(director.diagnostics.transitions,2);
});

test('attack token replays same real clip exactly once per confirmed event',()=>{
  const {mixer,actions}=makeMixer();
  const director=createVibeActionTransition({
    mixer,clips:[{name:'Idle'},{name:'1H_Melee_Attack_Chop'}],
    LoopOnce:'once',LoopRepeat:'repeat'
  });
  director.play('Idle');
  for(let i=0;i<6;i++)director.play('1H_Melee_Attack_Chop',{oneShot:true,token:100});
  const action=actions.get('1H_Melee_Attack_Chop');
  assert.equal(action.calls.filter(x=>x[0]==='play').length,1);
  director.play('1H_Melee_Attack_Chop',{oneShot:true,token:200});
  assert.equal(action.calls.filter(x=>x[0]==='play').length,2);
  assert.equal(action.calls.filter(x=>x[0]==='stop').length,1);
  assert.equal(action.calls.filter(x=>x[0]==='loop'&&x[1]==='once').length,2);
  assert.equal(director.diagnostics.attackReplays,1);
});

test('missing animation does not invent a source clip or disrupt current action',()=>{
  const {mixer}=makeMixer();
  const director=createVibeActionTransition({mixer,clips:[{name:'Idle'}]});
  director.play('Idle');
  assert.equal(director.play('Nonexistent_Attack',{oneShot:true,token:1}),false);
  assert.equal(director.currentClip,'Idle');
  assert.equal(director.diagnostics.missingClips,1);
  director.dispose();
  assert.equal(director.currentClip,'');
});

test('game renderer uses real confirmed clips and leaves gameplay ownership untouched',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const renderer=fs.readFileSync(path.join(root,'web-games/fantasy-survival/world3d.mjs'),'utf8');
  assert.match(renderer,/createVibeActionTransition/);
  assert.match(renderer,/smoothPresentationYaw/);
  assert.match(renderer,/playerMotionProfile\.cc0Clips/);
  assert.match(renderer,/token:oneShot\?attackAt:null/);
  assert.match(renderer,/heroTravel\.sample\(px,py,now/);
  assert.match(renderer,/selectExistingWeaponAttack/);
  assert.doesNotMatch(renderer,/heroAction\.setDuration\(/);
});

test('observable displacement prevents endless running at a wall',()=>{
  const sampler=createObservedTravelSampler();
  let t=sampler.sample(0,0,1000,{faceX:0,faceY:1});
  assert.equal(t.moving,false);
  t=sampler.sample(0,0,1090,{faceX:0,faceY:1});
  assert.equal(t.moving,false);
  t=sampler.sample(0,18,1180,{faceX:0,faceY:1});
  assert.equal(t.moving,true);
  assert.ok(t.forward>.99);
  t=sampler.sample(0,18,1270,{faceX:0,faceY:1});
  assert.equal(t.moving,false);
});

test('8-way source selection uses real strafe and backwalk clips, no substitutes',()=>{
  const names=['Idle','Walking_A','Walking_Backwards','Running_A','Running_Strafe_Right','Running_Strafe_Left'];
  const profile={cc0Clips:{idle:'Idle',walk:'Walking_A',run:'Running_A'}};
  const forward=selectExistingTravelClip({clips:names,profile,
    travel:{moving:true,speed:150,forward:1,side:0}});
  assert.equal(forward.name,'Running_A');
  const backward=selectExistingTravelClip({clips:names,profile,
    travel:{moving:true,speed:100,forward:-1,side:0}});
  assert.equal(backward.name,'Walking_Backwards');
  const left=selectExistingTravelClip({clips:names,profile,
    travel:{moving:true,speed:100,forward:0,side:-1}});
  assert.equal(left.name,'Running_Strafe_Left');
  const right=selectExistingTravelClip({clips:names,profile,
    travel:{moving:true,speed:100,forward:0,side:1}});
  assert.equal(right.name,'Running_Strafe_Right');
  assert.equal(selectExistingTravelClip({clips:names,profile,travel:{moving:false}}).name,'Idle');
});

test('weapon-specific source attack variants never select unrelated animations',()=>{
  const clips=['Idle','1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Diagonal',
    'Unarmed_Melee_Attack_Punch_A','Unarmed_Melee_Attack_Punch_B',
    '1H_Melee_Attack_Stab'];
  assert.equal(selectExistingWeaponAttack({clips,weapon:'AXE',strikeIndex:0}),'1H_Melee_Attack_Chop');
  assert.equal(selectExistingWeaponAttack({clips,weapon:'AXE',strikeIndex:1}),'1H_Melee_Attack_Slice_Diagonal');
  assert.equal(selectExistingWeaponAttack({clips,weapon:'SPEAR',strikeIndex:0}),'1H_Melee_Attack_Stab');
  assert.equal(selectExistingWeaponAttack({clips,weapon:'NONE',strikeIndex:1}),'Unarmed_Melee_Attack_Punch_B');
  assert.equal(selectExistingWeaponAttack({clips:['Idle'],weapon:'AXE'}),'');
});

test('animation phase carries normalized timing between compatible walking clips',()=>{
  const clips=[{name:'Walking_A',duration:1.0},{name:'Running_A',duration:2.0}];
  const actions=new Map();
  const mixer={clipAction(clip){
    if(!actions.has(clip.name)){
      const action={time:0,getClip:()=>clip,fadeOut(){return this;},
        fadeIn(){return this;},stop(){return this;},reset(){this.time=0;return this;},
        setLoop(){return this;},setEffectiveTimeScale(){return this;},play(){return this;}};
      actions.set(clip.name,action);
    }
    return actions.get(clip.name);
  },update(){},stopAllAction(){}};
  const controller=createVibeActionTransition({mixer,clips});
  controller.play('Walking_A');
  actions.get('Walking_A').time=.65;
  controller.play('Running_A');
  assert.ok(Math.abs(actions.get('Running_A').time-1.3)<1e-8);
  assert.equal(controller.diagnostics.locomotionPhaseTransfers,1);
});

test('teleports are not misclassified as a sprint clip',()=>{
  const sampler=createObservedTravelSampler();
  sampler.sample(0,0,1000);
  const t=sampler.sample(10000,0,1090);
  assert.equal(t.teleported,true);
  assert.equal(t.moving,false);
});
