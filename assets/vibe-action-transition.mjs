// Shared Web 3D presentation-only motion controller.
// Never owns movement, hitboxes, damage, cooldowns, combo legality or saved state.
// Uses real AnimationClip names; an absent clip is not replaced with a fake motion.
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function motionFrameDelta(nowMs,lastMs,{maxSeconds=0.05}={}){
  if(!Number.isFinite(Number(nowMs))||!Number.isFinite(Number(lastMs))||Number(lastMs)<=0)return 0;
  return clamp((Number(nowMs)-Number(lastMs))/1000,0,clamp(finite(maxSeconds,0.05),0.001,0.1));
}
export function shortestYawDelta(from,to){
  const a=finite(from),b=finite(to),tau=Math.PI*2;
  return ((b-a+Math.PI)%tau+tau)%tau-Math.PI;
}
export function smoothPresentationYaw(from,to,dt,{halfLife=0.095}={}){
  const current=finite(from),target=finite(to,current);
  if(!Number.isFinite(Number(dt))||Number(dt)<=0)return current;
  const life=clamp(finite(halfLife,0.095),0.02,0.5);
  const alpha=1-Math.pow(0.5,clamp(Number(dt),0,0.1)/life);
  return current+shortestYawDelta(current,target)*alpha;
}

export function createVibeActionTransition({mixer,clips=[],LoopOnce='once',LoopRepeat='repeat'}={}){
  const byName=new Map((Array.isArray(clips)?clips:[])
    .filter(clip=>clip&&typeof clip.name==='string'&&clip.name)
    .map(clip=>[clip.name,clip]));
  let current=null,currentName='',currentOneShot=false,lastToken=null,lastFrame=0;
  const counters={transitions:0,attackReplays:0,missingClips:0};
  function play(name,{oneShot=false,token=null,fadeSeconds,playbackRate=1}={}){
    const clip=byName.get(name);
    if(!mixer||!clip){
      if(name)counters.missingClips++;
      return false;
    }
    const replay=Boolean(oneShot)&&token!==null&&token!==lastToken;
    if(currentName===name&&!replay&&currentOneShot===Boolean(oneShot))return true;
    const next=mixer.clipAction(clip);
    if(!next)return false;
    const fade=clamp(finite(fadeSeconds,oneShot?0.09:0.16),0.025,0.28);
    if(current&&current!==next)current.fadeOut(fade);
    if(current===next&&replay){
      // Three's mixer caches an AnimationAction per clip: avoid fading out
      // and fading in the same action on consecutive attacks.
      current.stop();
      counters.attackReplays++;
    }
    next.reset();
    next.enabled=true;
    next.setLoop(oneShot?LoopOnce:LoopRepeat,oneShot?1:Infinity);
    next.clampWhenFinished=Boolean(oneShot);
    next.setEffectiveTimeScale(clamp(finite(playbackRate,1),0.7,1.3));
    next.fadeIn(fade).play();
    current=next;currentName=name;currentOneShot=Boolean(oneShot);
    lastToken=oneShot?token:null;
    counters.transitions++;
    return true;
  }
  function update(nowMs){
    const dt=motionFrameDelta(nowMs,lastFrame);
    if(mixer&&dt>0)mixer.update(dt);
    if(Number.isFinite(Number(nowMs))&&Number(nowMs)>0)lastFrame=Number(nowMs);
    return dt;
  }
  function dispose(){
    mixer?.stopAllAction();
    current=null;currentName='';lastToken=null;lastFrame=0;
  }
  return Object.freeze({
    play,update,dispose,
    get clipCount(){return byName.size;},
    get currentClip(){return currentName;},
    get diagnostics(){return {...counters,clipCount:byName.size,currentClip:currentName};}
  });
}
