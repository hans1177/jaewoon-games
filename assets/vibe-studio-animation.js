// 파일명: assets/vibe-studio-animation.js
// [메인] 런타임 모션 선택·접지·레이어 블렌딩. 원본 클립과 게임 판정은 수정하지 않는다.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const mix=(a,b,t)=>a+(b-a)*t;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function makeLocomotionGraph({acceleration=8,deceleration=12,turnRate=7,walkSpeed=2.5,runSpeed=6}={}){
 let speed=0,heading=0,phase=0,grounded=true;
 return{
  update({dt,desiredSpeed=0,desiredHeading=heading,isGrounded=true}){
   dt=clamp(dt,0,.1);
   const rate=desiredSpeed>speed?acceleration:deceleration;
   speed=mix(speed,desiredSpeed,clamp(rate*dt,0,1));
   heading+=clamp(angleDelta(heading,desiredHeading),-turnRate*dt,turnRate*dt);
   const walk=clamp(speed/walkSpeed,0,1);
   const run=clamp((speed-walkSpeed)/(runSpeed-walkSpeed),0,1);
   phase=(phase+speed*dt/Math.max(.1,walkSpeed))%1;
   const landing=grounded===false&&isGrounded===true;
   grounded=isGrounded;
   return{speed,heading,phase,landing,weights:{idle:1-walk,walk:walk*(1-run),run,airborne:isGrounded?0:1}};
  },
  reset(){speed=0;heading=0;phase=0;grounded=true;}
 };
}
export function makeAttackTimeline({windup=.25,active=.12,recovery=.35,hitMarkers=[.04]}={}){
 if([windup,active,recovery].some(x=>x<0)||!hitMarkers.every(x=>x>=0&&x<=active))throw Error('invalid attack timeline');
 let started=null,emitted=new Set();
 return{
  start(now){if(started!==null)return false;started=now;emitted=new Set();return true;},
  update(now){
   if(started===null)return{phase:'IDLE',events:[]};
   const elapsed=Math.max(0,now-started),events=[];
   let phase='WINDUP';
   if(elapsed>=windup&&elapsed<windup+active){
    phase='ACTIVE';
    for(let i=0;i<hitMarkers.length;i++)if(elapsed>=windup+hitMarkers[i]&&!emitted.has(i)){emitted.add(i);events.push({type:'HIT',marker:i,time:started+windup+hitMarkers[i]});}
   }else if(elapsed>=windup+active)phase='RECOVERY';
   if(elapsed>=windup+active+recovery){started=null;phase='IDLE';events.push({type:'COMPLETE',time:now});}
   return{phase,events,elapsed};
  },
  cancel(){started=null;emitted.clear();},
  get active(){return started!==null;}
 };
}
export function makeAnimationEventQueue({maxEvents=128}={}){
 const pending=[],delivered=new Set();
 return{
  schedule({id,at,type,payload=null}){
   if(!id||!Number.isFinite(at)||!type||delivered.has(id)||pending.some(e=>e.id===id))return false;
   pending.push({id,at,type,payload});pending.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
   if(pending.length>maxEvents)pending.pop();
   return true;
  },
  drain(now){const out=[];while(pending.length&&pending[0].at<=now){const row=pending.shift();if(delivered.has(row.id))continue;delivered.add(row.id);out.push(row);}return out;},
  clear(){pending.length=0;delivered.clear();},
  pending(){return pending.length;}
 };
}
// [메인: 접지] 기존 접지 이벤트를 유지하고, 월드 좌표 고정 목표를 선택적으로 제공한다.
export function makeFootPlant({stride=.9,contactFraction=.16}={}){
 let previousPhase=0,steps=0;
 const locked=new Map();
 const validFoot=point=>point&&['x','y','z'].every(k=>Number.isFinite(point[k]));
 return{
  update({phase,speed,grounded=true,feet={}}){
   const contacts=[],p=((Number(phase)||0)%1+1)%1;
   if(!grounded||speed<.1){previousPhase=p;locked.clear();return contacts;}
   for(const [name,marker] of [['left',0],['right',.5]]){
    const crossed=p>=previousPhase?(previousPhase<marker&&p>=marker):(marker>previousPhase||marker<=p);
    const stance=((p-marker+1)%1)<.5;
    if(!stance)locked.delete(name);
    if(stance&&!locked.has(name)&&validFoot(feet?.[name])){
     const foot=feet[name];locked.set(name,{x:foot.x,y:foot.y,z:foot.z});
    }
    if(crossed){contacts.push({foot:name,strength:clamp(speed/stride,0,1),duration:contactFraction,
     worldTarget:locked.has(name)?{...locked.get(name)}:null});steps++;}
   }
   previousPhase=p;return contacts;
  },
  getTargets(){return Object.fromEntries([...locked].map(([name,pos])=>[name,{...pos}]));},
  get steps(){return steps;},
  reset(){previousPhase=0;steps=0;locked.clear();}
 };
}
export function makeLookAtRig({maxYaw=Math.PI/2,maxPitch=Math.PI/4,followRate=8}={}){
 let yaw=0,pitch=0;
 return{
  update({dt,origin,target,bodyHeading=0}){
   const dx=target.x-origin.x,dy=(target.y||0)-(origin.y||0),dz=target.z-origin.z;
   const desiredYaw=clamp(angleDelta(bodyHeading,Math.atan2(dx,dz)),-maxYaw,maxYaw);
   const desiredPitch=clamp(Math.atan2(dy,Math.hypot(dx,dz)),-maxPitch,maxPitch);
   const t=clamp(dt*followRate,0,1);
   yaw=mix(yaw,desiredYaw,t);pitch=mix(pitch,desiredPitch,t);
   return{yaw,pitch};
  },
  reset(){yaw=0;pitch=0;}
 };
}
// [메인: 물리 피격 표현] 실제 체력·피격 판정을 변경하지 않는 관성 반동/기울기만 반환한다.
export function makeHitReaction({duration=.4,staggerThreshold=50,maxOffset=.25,maxTilt=.12}={}){
 let started=0,until=0,intensity=0,direction={x:0,z:0};
 const durationSafe=Math.max(.01,Number.isFinite(duration)?duration:.4);
 return{
  hit({now,damage,impulse={x:0,z:0}}){
   if(!Number.isFinite(now)||!Number.isFinite(damage)||damage<=0)return null;
   intensity=clamp(damage/Math.max(1,staggerThreshold),0,1);
   const x=Number.isFinite(impulse?.x)?impulse.x:0,z=Number.isFinite(impulse?.z)?impulse.z:0;
   const length=Math.hypot(x,z);
   direction=length>1e-6?{x:x/length,z:z/length}:{x:0,z:0};
   started=now;until=Math.max(until,now+durationSafe);
   return{stagger:intensity>=1,until,visualOnly:true};
  },
  update(now){
   const remaining=Math.max(0,until-(Number.isFinite(now)?now:until));
   const progress=clamp((Math.max(0,(Number.isFinite(now)?now:until)-started))/durationSafe,0,1);
   const envelope=remaining>0?Math.sin(Math.PI*progress)*intensity:0;
   const weight=remaining>0?intensity*clamp(remaining/durationSafe,0,1):0;
   return{active:remaining>0,weight,direction:{...direction},visualOnly:true,
    displacement:{x:direction.x*envelope*Math.max(0,maxOffset),z:direction.z*envelope*Math.max(0,maxOffset)},
    tilt:direction.x*envelope*Math.max(0,maxTilt)};
  },
  reset(){started=0;until=0;intensity=0;direction={x:0,z:0};}
 };
}
export function makeCameraResponse({maxShake=.6,decay=6,deadZone=.04}={}){
 let trauma=0;
 return{
  impulse(strength){trauma=clamp(trauma+Math.max(0,strength),0,1);},
  update(dt,time){
   trauma=Math.max(0,trauma-decay*Math.max(0,dt));
   if(trauma<deadZone)return{x:0,y:0,roll:0,trauma};
   const scale=maxShake*trauma*trauma;
   return{x:Math.sin(time*47)*scale,y:Math.cos(time*53)*scale,roll:Math.sin(time*31)*scale*.2,trauma};
  },
  reset(){trauma=0;}
 };
}
export function makeAnimationBudget({maxFullRate=24,maxHalfRate=48,near=20,far=60}={}){
 return{
  classify(actors,camera){
   const ordered=actors.map(actor=>({...actor,distance:Math.hypot(actor.x-camera.x,actor.z-camera.z)}))
    .sort((a,b)=>a.distance-b.distance||String(a.id).localeCompare(String(b.id)));
   return ordered.map((actor,i)=>({id:actor.id,rate:i<maxFullRate&&actor.distance<=near?'FULL':i<maxHalfRate&&actor.distance<=far?'HALF':'CULL'}));
  }
 };
}
export function makePoseInterpolator({maxGap=.2}={}){
 let last=null;
 return{
  push(pose){if(!Number.isFinite(pose.time))return false;if(last&&pose.time<=last.time)return false;last=pose;return true;},
  sample(time,next){
   if(!last)return null;
   if(!next||next.time<=last.time||next.time-last.time>maxGap)return last;
   const t=clamp((time-last.time)/(next.time-last.time),0,1);
   const out={time};
   for(const k of ['x','y','z','yaw'])out[k]=k==='yaw'?last[k]+angleDelta(last[k],next[k])*t:mix(last[k]||0,next[k]||0,t);
   return out;
  },
  reset(){last=null;}
 };
}

// [메인: 모션 매칭] 승인된 실제 애니메이션 후보 사이에서 속도·방향·발 접지·포즈를 비교한다.
// 클립을 생성하지 않으며 sourceClipId가 없는 후보는 선택하지 않는다.
export function makeMotionMatcher({hysteresis=.08,weights={speed:2,turn:1,heading:1,contact:1.5,pose:1}}={}){
 let previous=null;
 const finite=(n,f=0)=>Number.isFinite(n)?n:f;
 const featureDistance=(target={},candidate={})=>{
  const speed=Math.abs(finite(target.speed)-finite(candidate.speed));
  const turn=Math.abs(finite(target.turn)-finite(candidate.turn));
  const heading=Math.abs(angleDelta(finite(target.heading),finite(candidate.heading)))/Math.PI;
  const left=Number(Boolean(target.leftFootPlanted)!==Boolean(candidate.leftFootPlanted));
  const right=Number(Boolean(target.rightFootPlanted)!==Boolean(candidate.rightFootPlanted));
  const a=Array.isArray(target.pose)?target.pose:[],b=Array.isArray(candidate.pose)?candidate.pose:[];
  const n=Math.min(a.length,b.length,64);let pose=0;
  for(let i=0;i<n;i++)pose+=Math.abs(angleDelta(finite(a[i]),finite(b[i])))/Math.PI;
  return speed*Math.max(0,finite(weights.speed,2))+turn*Math.max(0,finite(weights.turn,1))+
   heading*Math.max(0,finite(weights.heading,1))+(left+right)*.5*Math.max(0,finite(weights.contact,1.5))+
   (n?pose/n:0)*Math.max(0,finite(weights.pose,1));
 };
 return{
  select({features={},candidates=[]}={}){
   const valid=candidates.filter(c=>c&&typeof c.sourceClipId==='string'&&c.sourceClipId.trim()&&c.features&&typeof c.features==='object');
   if(!valid.length)return{selected:null,score:null,candidatesScored:0,reason:'NO_REAL_SOURCE_CLIPS'};
   const ranked=valid.map(c=>({candidate:c,score:featureDistance(features,c.features)}))
    .sort((a,b)=>a.score-b.score||String(a.candidate.sourceClipId).localeCompare(String(b.candidate.sourceClipId)));
   const same=ranked.find(row=>row.candidate.sourceClipId===previous);
   const selected=same&&same.score<=ranked[0].score+Math.max(0,finite(hysteresis,.08))?same:ranked[0];
   previous=selected.candidate.sourceClipId;
   return{selected:previous,score:selected.score,candidatesScored:ranked.length,
    reason:selected===same?'CONTINUITY':'BEST_FEATURE_MATCH'};
  },
  reset(){previous=null;},
  get current(){return previous;}
 };
}

// [메인: 포즈 레이어] 하체 이동 포즈를 유지한 채 승인된 상체·표정 트랙을 혼합한다.
// 본 이름/채널을 새로 만들거나 원본 클립을 수정하지 않는다.
export function makeLayeredPoseBlender(){
 const channels=['x','y','z','rx','ry','rz'];
 return{
  blend({base={},layers=[]}={}){
   const result=Object.fromEntries(Object.entries(base).map(([bone,pose])=>[bone,{...pose}]));
   for(const layer of layers){
    if(!layer||!layer.pose)continue;
    const weight=clamp(Number(layer.weight)||0,0,1);
    if(weight<=0)continue;
    const mask=Array.isArray(layer.mask)?new Set(layer.mask):null;
    for(const [bone,pose] of Object.entries(layer.pose)){
     if((mask&&!mask.has(bone))||!result[bone])continue;
     for(const channel of channels){
      const value=pose?.[channel],prior=result[bone][channel];
      if(!Number.isFinite(value)||!Number.isFinite(prior))continue;
      result[bone][channel]=layer.additive?prior+value*weight:
       channel.startsWith('r')?prior+angleDelta(prior,value)*weight:mix(prior,value,weight);
     }
    }
   }
   return result;
  }
 };
}
