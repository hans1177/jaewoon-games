// Shared diplomacy and timed-combat integrations, independent of rendering.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createVibeDiplomacy(nations){
 const states=new Map(),relations=new Map(),treaties=new Map(),history=[];
 for(const n of nations){if(!n.id||states.has(n.id)||!Number.isFinite(n.gold)||n.gold<0)throw Error('Invalid nation');states.set(n.id,{id:n.id,gold:n.gold,personality:n.personality||'balanced'})}
 const pair=(a,b)=>[a,b].sort().join('|');
 const get=(id)=>{const n=states.get(id);if(!n)throw Error('Unknown nation');return n};
 const relation=(a,b)=>relations.get(pair(a,b))??0;
 return {
  snapshot:()=>({nations:[...states.values()].map(n=>({...n})),relations:Object.fromEntries(relations),treaties:Object.fromEntries(treaties),history:history.map(h=>({...h}))}),
  relation,
  negotiate({from,to,type,offer=0,request=0}){
   if(from===to)throw Error('Self diplomacy');const source=get(from),target=get(to);
   if(!['trade','gift','alliance','offerPeace','declareWar'].includes(type)||![offer,request].every(x=>Number.isSafeInteger(x)&&x>=0))throw Error('Invalid proposal');
   if(source.gold<offer||target.gold<request)throw Error('Insufficient treasury');
   const key=pair(from,to),standing=relation(from,to),existing=treaties.get(key)||'peace';
   const score=standing+(target.personality==='friendly'?20:target.personality==='hostile'?-25:0)+Math.min(35,offer/5)-Math.min(35,request/5);
   const accepted=type==='declareWar'||type==='gift'||(type==='offerPeace'?existing==='war'&&score>=-20:type==='alliance'?existing!=='war'&&score>=45:existing!=='war'&&score>=-15);
   if(accepted){
    source.gold-=offer;target.gold+=offer;target.gold-=request;source.gold+=request;
    if(type==='declareWar')treaties.set(key,'war');
    if(type==='offerPeace')treaties.set(key,'peace');
    if(type==='alliance')treaties.set(key,'alliance');
    relations.set(key,clamp(standing+(type==='gift'?12:type==='declareWar'?-60:type==='alliance'?20:type==='offerPeace'?15:4),-100,100));
   }else relations.set(key,clamp(standing-3,-100,100));
   const result={from,to,type,accepted,score:Math.round(score),standing:relation(from,to),treaty:treaties.get(key)||'peace'};history.push(result);return result
  }
 };
}
export function createVibeAttackTimeline({duration=.8,impactAt=.5,parryWindow=.18,perfectWindow=.085,unblockable=false}={}){
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(impactAt)||impactAt<0||impactAt>duration)throw Error('Invalid attack timeline');
 let elapsed=0,impactResolved=false;
 return {
  get progress(){return Math.min(1,elapsed/duration)},
  get phase(){return elapsed<impactAt?'windup':elapsed<duration?'recovery':'finished'},
  get impactTimeRemaining(){return impactAt-elapsed},
  advance(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid delta');const before=elapsed;elapsed=Math.min(duration,elapsed+dt);const impact=!impactResolved&&before<=impactAt&&elapsed>=impactAt;if(impact)impactResolved=true;return {impact,phase:this.phase,progress:this.progress}},
  parry(inputTime=elapsed){if(!Number.isFinite(inputTime))throw Error('Invalid input time');if(unblockable)return 'unblockable';const error=Math.abs(impactAt-inputTime);return error<=perfectWindow?'perfect':error<=parryWindow?'parry':'miss'},
  reset(){elapsed=0;impactResolved=false}
 };
}
export function resolveVibeClimbContact({character,ledge,obstacles=[],maxReach=1.5,minHeight=.8,maxHeight=2.4}){
 if(!character||!ledge||![character.x,character.y,character.z,ledge.x,ledge.y,ledge.z].every(Number.isFinite))return {canGrab:false,reason:'invalid'};
 const height=ledge.y-character.y,distance=Math.hypot(ledge.x-character.x,ledge.z-character.z);
 if(height<minHeight||height>maxHeight||distance>maxReach)return {canGrab:false,reason:'outOfReach'};
 const landing={x:ledge.x,y:ledge.y,z:ledge.z};
 for(const box of obstacles){if(!box?.min||!box?.max)continue;if(landing.x>=box.min.x&&landing.x<=box.max.x&&landing.y>=box.min.y&&landing.y<=box.max.y&&landing.z>=box.min.z&&landing.z<=box.max.z)return {canGrab:false,reason:'blocked'}}
 return {canGrab:true,landing,ledgeHeight:height,distance}
}
