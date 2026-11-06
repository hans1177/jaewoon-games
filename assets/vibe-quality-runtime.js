// Shared deterministic runtime primitives. No global singleton, no direct source mutation.
// Games opt in through their existing responsible gameplay modules.
const finite=(v,d=0)=>Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,finite(v,a)));
const dist=(a,b)=>Math.hypot(finite(a.x)-finite(b.x),finite(a.y)-finite(b.y));
export function makeCombatBrain({vision=16,hearing=10,attackRange=2,leash=35,cooldown=1.2,windup=.3}={}){
  let state='IDLE',target=null,home=null,attackAt=-Infinity,lastSeen=null;
  return {
    get state(){return state;},
    reset(){state='IDLE';target=null;home=null;lastSeen=null;attackAt=-Infinity;},
    update({now,dt,self,players=[],sounds=[],canSee=()=>true,canReach=()=>true,health=1}){
      if(!Number.isFinite(now)||!Number.isFinite(dt)||dt<0)throw Error('invalid combat clock');
      home??={x:self.x,y:self.y};
      if(health<=0){state='DEAD';return{state,move:null,attack:null};}
      if(state==='DEAD')return{state,move:null,attack:null};
      if(dist(self,home)>leash){state='RETURN';target=null;}
      if(state==='RETURN'){
        if(dist(self,home)<.5)state='IDLE';
        else return{state,move:home,attack:null};
      }
      const visible=players.filter(p=>p&&p.alive!==false&&dist(self,p)<=vision&&canSee(self,p))
        .sort((a,b)=>dist(self,a)-dist(self,b)||String(a.id).localeCompare(String(b.id)));
      if(visible.length){target=visible[0];lastSeen={x:target.x,y:target.y,time:now};}
      else if(target&&lastSeen&&now-lastSeen.time>4)target=null;
      if(!target){
        const heard=sounds.find(s=>s&&now-s.time<=1&&dist(self,s)<=hearing);
        state=heard?'INVESTIGATE':'PATROL';
        return{state,move:heard?{x:heard.x,y:heard.y}:null,attack:null};
      }
      const range=dist(self,target);
      if(range>attackRange){state='CHASE';return{state,move:canReach(self,target)?{x:target.x,y:target.y}:lastSeen,attack:null};}
      if(state==='WINDUP'){
        if(now-attackAt<windup)return{state,move:null,attack:null};
        state='ATTACK';attackAt=now;return{state,move:null,attack:{targetId:target.id,at:now}};
      }
      if(now-attackAt<cooldown){state='RECOVER';return{state,move:null,attack:null};}
      state='WINDUP';attackAt=now;return{state,move:null,attack:null,telegraph:{targetId:target.id,until:now+windup}};
    }
  };
}
export function makeSpatialStreamer({cellSize=64,radius=2,maxLoaded=80,load,unload}={}){
  if(!(cellSize>0&&radius>=0&&maxLoaded>0))throw Error('invalid streamer limits');
  const cells=new Map();let tick=0;
  const key=(x,y)=>x+':'+y;
  return{
    get loaded(){return [...cells.keys()];},
    async update(points){
      const desired=new Map();
      for(const p of points){
        const cx=Math.floor(p.x/cellSize),cy=Math.floor(p.y/cellSize);
        for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++){
          const d=(x-cx)**2+(y-cy)**2,k=key(x,y);
          if(!desired.has(k)||desired.get(k).distance>d)desired.set(k,{x,y,distance:d});
        }
      }
      const selected=[...desired.entries()].sort((a,b)=>a[1].distance-b[1].distance||a[0].localeCompare(b[0])).slice(0,maxLoaded);
      const keep=new Set(selected.map(x=>x[0]));
      for(const [k,v] of cells)if(!keep.has(k)){await unload?.(v.payload,v.x,v.y);cells.delete(k);}
      for(const [k,v] of selected){
        if(cells.has(k)){cells.get(k).seen=++tick;continue;}
        const payload=await load?.(v.x,v.y);
        cells.set(k,{...v,payload,seen:++tick});
      }
      return{loaded:cells.size,desired:desired.size,limited:desired.size>maxLoaded};
    },
    async clear(){for(const v of cells.values())await unload?.(v.payload,v.x,v.y);cells.clear();}
  };
}
export function makeAnimationMixer({turnSpeed=8,acceleration=12,impactDuration=.06}={}){
  let speed=0,facing=0,impactUntil=0;
  return{
    reset(){speed=0;facing=0;impactUntil=0;},
    impact(now){impactUntil=Math.max(impactUntil,now+impactDuration);},
    step({dt,now,targetSpeed=0,targetFacing=0,grounded=true,attack=false}){
      dt=clamp(dt,0,.1);
      speed+=clamp(targetSpeed-speed,-acceleration*dt,acceleration*dt);
      const delta=Math.atan2(Math.sin(targetFacing-facing),Math.cos(targetFacing-facing));
      facing+=clamp(delta,-turnSpeed*dt,turnSpeed*dt);
      const blend=clamp(Math.abs(speed),0,1);
      return{speed,facing,idle:1-blend,walk:blend*(1-clamp((Math.abs(speed)-1)/2,0,1)),
        run:blend*clamp((Math.abs(speed)-1)/2,0,1),grounded,attack,hitStop:now<impactUntil};
    }
  };
}
export function makeInteractionBus({validate=()=>true,apply}={}){
  const seen=new Map(),listeners=new Map();
  return{
    on(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list);return()=>listeners.set(type,list.filter(x=>x!==fn));},
    async dispatch(command){
      if(!command||!command.id||!command.type||!command.actorId)throw Error('invalid interaction command');
      if(seen.has(command.id))return seen.get(command.id);
      if(!await validate(command))return{ok:false,reason:'REJECTED'};
      const result=await apply(command);
      if(!result||result.ok!==true)return{ok:false,reason:result?.reason||'NOT_APPLIED'};
      const accepted={ok:true,id:command.id,result:result.value};
      seen.set(command.id,accepted);
      for(const fn of listeners.get(command.type)||[])await fn(accepted,command);
      return accepted;
    },
    forget(id){seen.delete(id);}
  };
}
export function makePerformanceSampler({capacity=600}={}){
  if(!Number.isInteger(capacity)||capacity<1)throw Error('invalid capacity');
  const rows=[];
  return{
    sample({frameMs,memoryMb,streamingMs=0}){
      if(![frameMs,memoryMb,streamingMs].every(v=>Number.isFinite(v)&&v>=0))return false;
      rows.push({frameMs,memoryMb,streamingMs});if(rows.length>capacity)rows.shift();return true;
    },
    summary(){
      if(!rows.length)return{status:'UNKNOWN',samples:0};
      const percentile=(field,p)=>{const values=rows.map(x=>x[field]).sort((a,b)=>a-b);return values[Math.ceil((values.length-1)*p)];};
      return{status:'OBSERVED',samples:rows.length,frameP95Ms:percentile('frameMs',.95),
        frameP99Ms:percentile('frameMs',.99),peakMemoryMb:Math.max(...rows.map(x=>x.memoryMb)),
        streamingP95Ms:percentile('streamingMs',.95)};
    }
  };
}
