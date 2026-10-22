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

// Use only the player's observed authoritative displacement. Input held against
// a wall must not produce endless walking-in-place foot movement.
export function createObservedTravelSampler({sampleWindowMs=75,minStartSpeed=14,minContinueSpeed=7,maxTeleportSpeed=1100}={}){
  let lastX=null,lastY=null,lastAt=0,moving=false,last=null;
  const idle=()=>Object.freeze({moving:false,speed:0,forward:0,side:0,sampled:false});
  function reset(){lastX=null;lastY=null;lastAt=0;moving=false;last=idle();}
  reset();
  function sample(x,y,nowMs,{faceX=0,faceY=1}={}){
    const nx=Number(x),ny=Number(y),now=Number(nowMs);
    if(![nx,ny,now].every(Number.isFinite))return last;
    if(lastX===null||now<=lastAt){lastX=nx;lastY=ny;lastAt=now;return last;}
    const interval=now-lastAt;
    if(interval<Math.max(30,finite(sampleWindowMs,75)))return last;
    const dx=nx-lastX,dy=ny-lastY;
    lastX=nx;lastY=ny;lastAt=now;
    const speed=Math.hypot(dx,dy)*1000/interval;
    const teleported=interval>350||speed>maxTeleportSpeed;
    moving=!teleported&&(moving?speed>=minContinueSpeed:speed>=minStartSpeed);
    const length=Math.hypot(dx,dy),facingLength=Math.hypot(faceX,faceY)||1;
    last=Object.freeze({
      moving,speed:teleported?0:speed,
      forward:moving&&length?clamp((dx*faceX+dy*faceY)/(length*facingLength),-1,1):0,
      side:moving&&length?clamp((dx*faceY-dy*faceX)/(length*facingLength),-1,1):0,
      sampled:true,teleported
    });
    return last;
  }
  return Object.freeze({sample,reset,get state(){return last;}});
}
export function selectExistingTravelClip({clips=[],profile={},travel={}}={}){
  const names=clips instanceof Set?clips:new Set((Array.isArray(clips)?clips:[]).map(row=>
    typeof row==='string'?row:row?.name).filter(Boolean));
  const preferred=profile.cc0Clips||{};
  const first=(...options)=>options.find(name=>name&&names.has(name))||'';
  if(!travel?.moving)return Object.freeze({name:first(preferred.idle,'Idle'),playbackRate:1});
  const forward=finite(travel.forward),side=finite(travel.side);
  const speed=finite(travel.speed);
  let name='';
  if(forward<-.42)name=first('Walking_Backwards',preferred.walk,preferred.run);
  else if(Math.abs(side)>.62){
    name=side>0?first('Running_Strafe_Right',preferred.run,preferred.walk)
      :first('Running_Strafe_Left',preferred.run,preferred.walk);
  }
  if(!name)name=speed<85
    ?first(preferred.walk,'Walking_A',preferred.run,'Running_A')
    :first(preferred.run,'Running_A',preferred.walk,'Walking_A');
  const base=/Walking|Backwards/i.test(name)?85:150;
  return Object.freeze({name,playbackRate:clamp(speed/base,.82,1.22)});
}
export function selectExistingWeaponAttack({clips=[],profile={},weapon='NONE',strikeIndex=0}={}){
  const available=clips instanceof Set?clips:new Set((Array.isArray(clips)?clips:[]).map(c=>
    typeof c==='string'?c:c?.name).filter(Boolean));
  const key=String(weapon||'NONE').toUpperCase();
  const candidates={
    AXE:['1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Diagonal','2H_Melee_Attack_Chop'],
    PICKAXE:['2H_Melee_Attack_Chop','1H_Melee_Attack_Chop'],
    HAMMER:['2H_Melee_Attack_Chop','1H_Melee_Attack_Chop'],
    SPEAR:['1H_Melee_Attack_Stab','2H_Melee_Attack_Stab'],
    SWORD:['1H_Melee_Attack_Slice_Horizontal','1H_Melee_Attack_Slice_Diagonal','1H_Melee_Attack_Stab'],
    DAGGER:['Dualwield_Melee_Attack_Stab','1H_Melee_Attack_Stab'],
    NONE:['Unarmed_Melee_Attack_Punch_A','Unarmed_Melee_Attack_Punch_B']
  }[key]||[profile.cc0Clips?.attack];
  const real=candidates.filter(n=>available.has(n));
  if(real.length)return real[Math.abs(Math.trunc(finite(strikeIndex)))%real.length];
  // No clip for this weapon: do not substitute another weapon's attack.
  // Gameplay may still attack; this controller only renders existing poses.
  return '';
}

export function createVibeActionTransition({mixer,clips=[],LoopOnce='once',LoopRepeat='repeat'}={}){
  const byName=new Map((Array.isArray(clips)?clips:[])
    .filter(clip=>clip&&typeof clip.name==='string'&&clip.name)
    .map(clip=>[clip.name,clip]));
  let current=null,currentName='',currentOneShot=false,lastToken=null,lastFrame=0;
  const missingNames=new Set();
  const counters={transitions:0,attackReplays:0,missingClips:0,locomotionPhaseTransfers:0};
  function play(name,{oneShot=false,token=null,fadeSeconds,playbackRate=1}={}){
    const clip=byName.get(name);
    if(!mixer||!clip){
      if(name&&!missingNames.has(name)){
        missingNames.add(name);
        counters.missingClips++;
      }
      return false;
    }
    const replay=Boolean(oneShot)&&token!==null&&token!==lastToken;
    if(currentName===name&&!replay&&currentOneShot===Boolean(oneShot)){
      if(current&&!oneShot)current.setEffectiveTimeScale(clamp(finite(playbackRate,1),0.7,1.3));
      return true;
    }
    const next=mixer.clipAction(clip);
    if(!next)return false;
    const fade=clamp(finite(fadeSeconds,oneShot?0.09:0.16),0.025,0.28);
    let preservedPhase=null;
    if(current&&current!==next&&!oneShot&&!currentOneShot
      &&/^(Walking|Running)/i.test(currentName)&&/^(Walking|Running)/i.test(name)
      &&typeof current.getClip==='function'){
      const oldClip=current.getClip();
      if(oldClip?.duration>0&&Number.isFinite(current.time))
        preservedPhase=((current.time%oldClip.duration)+oldClip.duration)%oldClip.duration/oldClip.duration;
    }
    if(current&&current!==next)current.fadeOut(fade);
    if(current===next&&(replay||currentOneShot!==Boolean(oneShot))){
      // Three's mixer caches an AnimationAction per clip: avoid fading out
      // and fading in the same action on consecutive attacks.
      current.stop();
      if(replay)counters.attackReplays++;
    }
    next.reset();
    if(preservedPhase!==null&&clip.duration>0){
      next.time=preservedPhase*clip.duration;
      counters.locomotionPhaseTransfers++;
    }
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
