// Runtime animation orchestration with stable transitions and authored timing markers.
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
export function makeFootPlant({stride=.9,contactFraction=.16}={}){
 let previousPhase=0,steps=0;
 return{
  update({phase,speed,grounded=true}){
   const contacts=[];
   if(!grounded||speed<.1){previousPhase=phase;return contacts;}
   for(const [name,marker] of [['left',0],['right',.5]]){
    const crossed=phase>=previousPhase?(previousPhase<marker&&phase>=marker):(marker>previousPhase||marker<=phase);
    if(crossed){contacts.push({foot:name,strength:clamp(speed/stride,0,1),duration:contactFraction});steps++;}
   }
   previousPhase=phase;return contacts;
  },
  get steps(){return steps;},
  reset(){previousPhase=0;steps=0;}
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
export function makeHitReaction({duration=.4,staggerThreshold=50}={}){
 let until=0,intensity=0,direction={x:0,z:0};
 return{
  hit({now,damage,impulse={x:0,z:0}}){
   if(!Number.isFinite(now)||damage<=0)return null;
   intensity=clamp(damage/staggerThreshold,0,1);
   direction={x:impulse.x||0,z:impulse.z||0};
   until=Math.max(until,now+duration);
   return{stagger:intensity>=1,until};
  },
  update(now){const remaining=Math.max(0,until-now);return{active:remaining>0,weight:duration>0?intensity*clamp(remaining/duration,0,1):0,direction};}
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
