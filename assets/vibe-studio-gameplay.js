// Player-facing game feel: input buffering, camera damping, interaction affordances,
// traversal assistance, checkpoint recovery and measurable core-loop outcomes.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const lerp=(a,b,t)=>a+(b-a)*t;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function makeInputBuffer({bufferSeconds=.18,maxCommands=24}={}){
 const queue=[];
 return{
  push({action,time,payload=null}){
   if(!action||!Number.isFinite(time))return false;
   queue.push({action,time,payload});
   queue.sort((a,b)=>a.time-b.time);
   while(queue.length>maxCommands)queue.shift();
   return true;
  },
  consume(action,now){
   for(let i=queue.length-1;i>=0;i--)if(now-queue[i].time>bufferSeconds)queue.splice(i,1);
   const index=queue.findIndex(row=>row.action===action&&row.time<=now);
   return index>=0?queue.splice(index,1)[0]:null;
  },
  clear(){queue.length=0;},
  pending(){return queue.length;}
 };
}
export function makeCoyoteJump({graceSeconds=.12,bufferSeconds=.12}={}){
 let lastGrounded=-Infinity,lastPressed=-Infinity;
 return{
  ground(now){lastGrounded=now;},
  press(now){lastPressed=now;},
  canJump(now){return now-lastGrounded<=graceSeconds&&now-lastPressed<=bufferSeconds;},
  consume(now){if(!this.canJump(now))return false;lastGrounded=-Infinity;lastPressed=-Infinity;return true;},
  reset(){lastGrounded=-Infinity;lastPressed=-Infinity;}
 };
}
export function makeCameraSpring({frequency=5,damping=1}={}){
 let position={x:0,y:0,z:0},velocity={x:0,y:0,z:0};
 return{
  snap(point){position={...point};velocity={x:0,y:0,z:0};},
  update(target,dt){
   dt=clamp(dt,0,.05);
   const omega=2*Math.PI*frequency;
   for(const axis of ['x','y','z']){
    const delta=position[axis]-(target[axis]||0);
    const accel=-omega*omega*delta-2*damping*omega*velocity[axis];
    velocity[axis]+=accel*dt;
    position[axis]+=velocity[axis]*dt;
   }
   return{...position};
  }
 };
}
export function makeInteractionSelector({radius=3,forwardWeight=.6}={}){
 let selected=null;
 return{
  choose({player,forward={x:1,y:0},candidates=[]}){
   const eligible=candidates.filter(c=>c.enabled!==false&&distance(player,c)<=radius)
    .map(c=>{const dx=c.x-player.x,dy=c.y-player.y,d=Math.hypot(dx,dy)||1;return{candidate:c,score:d-forwardWeight*(dx*forward.x+dy*forward.y)/d};})
    .sort((a,b)=>a.score-b.score||String(a.candidate.id).localeCompare(String(b.candidate.id)));
   selected=eligible[0]?.candidate||null;
   return selected;
  },
  get selected(){return selected;},
  clear(){selected=null;}
 };
}
export function makeFeedbackScheduler({maxPerSecond=8}={}){
 const last=new Map(),history=[];
 return{
  allow({type,now,priority=0}){
   if(!type||!Number.isFinite(now))return false;
   while(history.length&&now-history[0]>=1)history.shift();
   if(history.length>=maxPerSecond&&priority<2)return false;
   if(now-(last.get(type)??-Infinity)<.05&&priority<2)return false;
   history.push(now);last.set(type,now);return true;
  },
  reset(){last.clear();history.length=0;}
 };
}
export function makeObjectiveTracker({objectives=[]}={}){
 const state=new Map(objectives.map(o=>[o.id,{id:o.id,target:o.target,progress:0,completed:false,required:o.required!==false}]));
 return{
  advance(id,amount=1){
   const row=state.get(id);if(!row||row.completed||!Number.isFinite(amount)||amount<=0)return false;
   row.progress=Math.min(row.target,row.progress+amount);
   row.completed=row.progress>=row.target;return true;
  },
  status(){
   const rows=[...state.values()];
   return{completed:rows.filter(r=>r.completed).length,total:rows.length,ready:rows.filter(r=>r.required).every(r=>r.completed),objectives:rows.map(r=>({...r}))};
  },
  reset(){for(const row of state.values()){row.progress=0;row.completed=false;}}
 };
}
export function makeCoreLoopTelemetry({maxEvents=1000}={}){
 const events=[];
 return{
  record({time,type,source='',durationMs=0}){
   if(!Number.isFinite(time)||!type)return false;
   events.push({time,type,source,durationMs});while(events.length>maxEvents)events.shift();return true;
  },
  report(){
   const counts={},latencies={};
   for(const e of events){
    counts[e.type]=(counts[e.type]||0)+1;
    if(e.durationMs>0)(latencies[e.type]??=[]).push(e.durationMs);
   }
   const averages=Object.fromEntries(Object.entries(latencies).map(([type,values])=>[type,values.reduce((a,b)=>a+b,0)/values.length]));
   return{observedEvents:events.length,counts,averageDurationMs:averages,hasEvidence:events.length>0};
  }
 };
}
export function makeCheckpointRecovery({capture,restore,maxCheckpoints=3}={}){
 const checkpoints=[];
 return{
  async save({id,time}){
   if(!id||!Number.isFinite(time))return false;
   const state=await capture();
   checkpoints.push({id,time,state});
   while(checkpoints.length>maxCheckpoints)checkpoints.shift();
   return true;
  },
  async recover(id){
   const checkpoint=id?checkpoints.find(c=>c.id===id):checkpoints.at(-1);
   if(!checkpoint)return{ok:false,reason:'NO_CHECKPOINT'};
   await restore(checkpoint.state);
   return{ok:true,id:checkpoint.id,time:checkpoint.time};
  },
  list(){return checkpoints.map(({id,time})=>({id,time}));}
 };
}
export function makeDifficultyDirector({targetSuccess=.65,adaptation=.08,minScale=.7,maxScale=1.4}={}){
 let scale=1,attempts=0;
 return{
  observe({success}){
   attempts++;
   const actual=success?1:0;
   scale=clamp(scale+adaptation*(actual-targetSuccess),minScale,maxScale);
   return{scale,attempts};
  },
  get scale(){return scale;},
  reset(){scale=1;attempts=0;}
 };
}
export function makeDamageFeedback({combineWindowMs=150}={}){
 const pending=new Map();
 return{
  hit({targetId,amount,time,critical=false}){
   if(!targetId||!(amount>0)||!Number.isFinite(time))return false;
   const old=pending.get(targetId);
   if(old&&time-old.time<=combineWindowMs){old.amount+=amount;old.critical||=critical;old.time=time;}
   else pending.set(targetId,{targetId,amount,time,critical});
   return true;
  },
  flush(now){
   const result=[];
   for(const [id,row] of pending)if(now-row.time>=combineWindowMs){result.push({...row});pending.delete(id);}
   return result;
  }
 };
}
export function makeTraversalStamina({maximum=100,drainPerSecond=12,restorePerSecond=18,restoreDelay=1}={}){
 let value=maximum,lastDrain=-Infinity;
 return{
  update({dt,now,draining=false}){
   if(draining){value=clamp(value-drainPerSecond*dt,0,maximum);lastDrain=now;}
   else if(now-lastDrain>=restoreDelay)value=clamp(value+restorePerSecond*dt,0,maximum);
   return{value,ratio:value/maximum,exhausted:value<=0};
  },
  get value(){return value;},
  reset(){value=maximum;lastDrain=-Infinity;}
 };
}
export function makeAccessibilitySettings({cameraShake=1,motionReduction=false,holdToInteract=false,subtitleScale=1}={}){
 let settings={cameraShake:clamp(cameraShake,0,1),motionReduction:!!motionReduction,holdToInteract:!!holdToInteract,subtitleScale:clamp(subtitleScale,.5,2)};
 return{
  get(){return{...settings};},
  update(patch){settings={...settings,...patch,cameraShake:clamp(patch.cameraShake??settings.cameraShake,0,1),subtitleScale:clamp(patch.subtitleScale??settings.subtitleScale,.5,2)};return this.get();}
 };
}
