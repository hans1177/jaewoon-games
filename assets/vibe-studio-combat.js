// Deterministic combat decisions for existing Vibe game runtimes.
// Authority remains with the calling server; this module never writes game saves.
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,finite(n,lo)));
const distance=(a,b)=>Math.hypot(finite(a.x)-finite(b.x),finite(a.y)-finite(b.y));
const normalize=(x,y)=>{const m=Math.hypot(x,y);return m>0?{x:x/m,y:y/m}:{x:0,y:0};};
export function lineOfSight(origin,target,segments=[]){
  const a={x:finite(origin.x),y:finite(origin.y)},b={x:finite(target.x),y:finite(target.y)};
  const cross=(u,v)=>u.x*v.y-u.y*v.x;
  const r={x:b.x-a.x,y:b.y-a.y};
  for(const segment of segments){
    const c=segment.a,d=segment.b;
    if(!c||!d)continue;
    const s={x:d.x-c.x,y:d.y-c.y},den=cross(r,s);
    if(Math.abs(den)<1e-9)continue;
    const q={x:c.x-a.x,y:c.y-a.y},t=cross(q,s)/den,u=cross(q,r)/den;
    if(t>1e-7&&t<1-1e-7&&u>=0&&u<=1)return false;
  }
  return true;
}
export function makeThreatTable({decayPerSecond=.2,maxThreat=1000}={}){
  const threats=new Map();
  return{
    add(id,amount,now){if(!id||!Number.isFinite(amount)||amount<=0)return;const row=threats.get(id)||{score:0,time:now};row.score=clamp(row.score+amount,0,maxThreat);row.time=now;threats.set(id,row);},
    decay(dt){for(const [id,row] of threats){row.score=Math.max(0,row.score-decayPerSecond*dt);if(row.score===0)threats.delete(id);}},
    rank(eligible=()=>true){return[...threats.entries()].filter(([id])=>eligible(id)).sort((a,b)=>b[1].score-a[1].score||a[0].localeCompare(b[0])).map(([id,row])=>({id,score:row.score}));},
    forget(id){threats.delete(id);},
    snapshot(){return[...threats].map(([id,row])=>({id,...row}));}
  };
}
export function makeCombatDirector({maxSimultaneousAttackers=2,attackReservationMs=1500}={}){
  const reservations=new Map();
  return{
    request({attackerId,targetId,now,priority=0}){
      if(!attackerId||!targetId||!Number.isFinite(now))return false;
      for(const [id,row] of reservations)if(row.until<=now)reservations.delete(id);
      const existing=reservations.get(attackerId);
      if(existing){existing.until=now+attackReservationMs;return true;}
      const active=[...reservations.values()].filter(row=>row.targetId===targetId);
      if(active.length>=maxSimultaneousAttackers)return false;
      reservations.set(attackerId,{targetId,until:now+attackReservationMs,priority});
      return true;
    },
    release(attackerId){reservations.delete(attackerId);},
    snapshot(){return[...reservations].map(([attackerId,row])=>({attackerId,...row}));}
  };
}
export function makeBossPhases(phases){
  if(!Array.isArray(phases)||!phases.length)throw Error('boss phases required');
  const ordered=phases.map((p,i)=>({id:p.id||'phase-'+i,threshold:p.threshold,attacks:p.attacks||[],speed:p.speed??1}))
    .sort((a,b)=>b.threshold-a.threshold);
  if(ordered.some(p=>!Number.isFinite(p.threshold)||p.threshold<0||p.threshold>1))throw Error('invalid phase threshold');
  let phase=ordered[0],transitionCount=0;
  return{
    get current(){return phase;},
    get transitionCount(){return transitionCount;},
    update({health,maxHealth}){
      if(!(maxHealth>0))throw Error('invalid boss maximum health');
      const ratio=clamp(health/maxHealth,0,1);
      const next=ordered.find(p=>ratio>=p.threshold)||ordered.at(-1);
      if(next!==phase){const from=phase.id;phase=next;transitionCount++;return{changed:true,from,to:phase.id,phase};}
      return{changed:false,phase};
    },
    reset(){phase=ordered[0];transitionCount=0;}
  };
}
export function makeCombatMemory({forgetAfterSeconds=12,maxEvents=64}={}){
  const events=[];
  return{
    record({time,type,source,target,position}){
      if(!Number.isFinite(time)||!type)return false;
      events.push({time,type,source:source||null,target:target||null,position:position?{x:position.x,y:position.y}:null});
      while(events.length>maxEvents)events.shift();
      return true;
    },
    query({now,type,target}){
      return events.filter(e=>now-e.time<=forgetAfterSeconds&&now>=e.time&&(!type||e.type===type)&&(!target||e.target===target));
    },
    prune(now){for(let i=events.length-1;i>=0;i--)if(now-events[i].time>forgetAfterSeconds)events.splice(i,1);},
    snapshot(){return events.map(e=>({...e,position:e.position?{...e.position}:null}));}
  };
}
export function chooseTacticalAction({self,target,allies=[],obstacles=[],stamina=1,healthRatio=1,range=2,coverPoints=[],retreatPoints=[]}){
  if(!target||target.alive===false)return{action:'PATROL',reason:'NO_TARGET'};
  const d=distance(self,target),visible=lineOfSight(self,target,obstacles);
  if(healthRatio<.2&&retreatPoints.length){
    const point=[...retreatPoints].sort((a,b)=>distance(b,target)-distance(a,target))[0];
    return{action:'RETREAT',destination:point,reason:'LOW_HEALTH'};
  }
  if(!visible){
    const points=coverPoints.filter(p=>lineOfSight(p,target,obstacles));
    if(points.length)return{action:'REPOSITION',destination:points.sort((a,b)=>distance(a,self)-distance(b,self))[0],reason:'OBSTRUCTED'};
    return{action:'SEARCH',destination:{x:target.x,y:target.y},reason:'LOST_SIGHT'};
  }
  if(d<=range&&stamina>=.25)return{action:'ATTACK',targetId:target.id,reason:'IN_RANGE'};
  if(d<=range&&stamina<.25)return{action:'GUARD',reason:'LOW_STAMINA'};
  const allyNear=allies.filter(a=>a.alive!==false&&distance(a,target)<range*2).length;
  if(allyNear>=2&&stamina>.5)return{action:'FLANK',destination:{x:target.x+(target.y-self.y)*.5,y:target.y-(target.x-self.x)*.5},reason:'ALLY_PRESSURE'};
  return{action:'APPROACH',destination:{x:target.x,y:target.y},reason:'OUT_OF_RANGE'};
}
export function predictProjectile({origin,target,targetVelocity={x:0,y:0},speed,gravity=0,maxTime=5}){
  if(!(speed>0)||!origin||!target)return null;
  let time=distance(origin,target)/speed;
  for(let i=0;i<12;i++){
    const point={x:target.x+finite(targetVelocity.x)*time,y:target.y+finite(targetVelocity.y)*time+.5*gravity*time*time};
    const next=distance(origin,point)/speed;
    if(!Number.isFinite(next)||next>maxTime)return null;
    if(Math.abs(next-time)<.0001){time=next;break;}
    time=next;
  }
  return{time,aim:{x:target.x+finite(targetVelocity.x)*time,y:target.y+finite(targetVelocity.y)*time+.5*gravity*time*time}};
}
export function makeStaggerMeter({threshold=100,recoveryPerSecond=5,immunitySeconds=.5}={}){
  let value=0,immuneUntil=-Infinity;
  return{
    hit({amount,now}){if(now<immuneUntil)return{staggered:false,value};value=clamp(value+Math.max(0,amount),0,threshold);if(value>=threshold){value=0;immuneUntil=now+immunitySeconds;return{staggered:true,value};}return{staggered:false,value};},
    tick(dt){value=Math.max(0,value-recoveryPerSecond*Math.max(0,dt));return value;},
    reset(){value=0;immuneUntil=-Infinity;}
  };
}
export function makeCooldownBook(){
  const times=new Map();
  return{
    ready(id,now){return now>=(times.get(id)||-Infinity);},
    use(id,now,duration){if(!this.ready(id,now)||duration<0)return false;times.set(id,now+duration);return true;},
    remaining(id,now){return Math.max(0,(times.get(id)||0)-now);},
    clear(id){times.delete(id);}
  };
}
export function chooseCover({self,enemy,points,obstacles=[],maxDistance=20}){
  return points.filter(p=>distance(self,p)<=maxDistance&&!lineOfSight(enemy,p,obstacles))
    .sort((a,b)=>distance(self,a)-distance(self,b))[0]||null;
}
export function makeCombatEncounter({maxActive=12,reinforcementCooldown=8}={}){
  const active=new Set();let lastReinforcement=-Infinity;
  return{
    enter(id){if(!id||active.size>=maxActive)return false;active.add(id);return true;},
    leave(id){active.delete(id);},
    canReinforce(now){return active.size<maxActive&&now-lastReinforcement>=reinforcementCooldown;},
    reinforce(id,now){if(!this.canReinforce(now)||!this.enter(id))return false;lastReinforcement=now;return true;},
    snapshot(){return{active:[...active],capacity:maxActive,remaining:maxActive-active.size};}
  };
}
export const combatGeometry={distance,normalize,clamp};
