import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  motionFrameDelta,shortestYawDelta,smoothPresentationYaw,createVibeActionTransition
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
  assert.match(renderer,/token:pose==='attack'\?Number\(p\.attackAt\)/);
  assert.doesNotMatch(renderer,/heroAction\.setDuration\(/);
});
