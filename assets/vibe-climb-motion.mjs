export function createClimbMotion(avatar){
 let phase='idle',time=0,start=null,goal=null;
 const mix=(a,b,t)=>a+(b-a)*t;
 return {
  get phase(){return phase},
  begin(ledge){if(phase!=='idle'||!ledge?.canGrab||!ledge.landing)return false;start={x:avatar.position.x,y:avatar.position.y,z:avatar.position.z};goal=ledge.landing;phase='reach';time=0;return true},
  update(dt){if(phase==='idle'||phase==='done')return phase;time+=Math.max(0,Math.min(.1,dt));
   const duration=phase==='reach'?.25:phase==='hang'?.35:.65,t=Math.min(1,time/duration),e=t*t*(3-2*t);
   if(phase==='reach'){avatar.position.x=mix(start.x,goal.x,e);avatar.position.z=mix(start.z,goal.z,e);avatar.position.y=mix(start.y,goal.y-1.1,e)}
   if(phase==='mantle')avatar.position.y=mix(goal.y-1.1,goal.y,e);
   if(t>=1){time=0;phase=phase==='reach'?'hang':phase==='hang'?'mantle':'done';if(phase==='done')avatar.position.set(goal.x,goal.y,goal.z)}
   return phase},
  reset(){phase='idle';time=0},
  busy(){return phase!=='idle'&&phase!=='done'}
 };
}
