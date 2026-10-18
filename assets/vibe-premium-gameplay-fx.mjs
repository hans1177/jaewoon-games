// Shared animation polish layer: spring movement, action anticipation, camera follow, spatial sound and screen FX.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const v3=(v={})=>({x:Number(v.x)||0,y:Number(v.y)||0,z:Number(v.z)||0});
const length=v=>Math.hypot(v.x,v.y,v.z);
const damp=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-Math.max(0,rate)*dt));
const blend=(a,b,rate,dt)=>({x:damp(a.x,b.x,rate,dt),y:damp(a.y,b.y,rate,dt),z:damp(a.z,b.z,rate,dt)});
export const vibeActionProfiles=Object.freeze({
 idle:{anticipation:0,active:.1,recovery:.2,lockMovement:0,impulse:0},
 walk:{anticipation:0,active:.1,recovery:.12,lockMovement:0,impulse:0},
 sprint:{anticipation:.08,active:.12,recovery:.16,lockMovement:0,impulse:0},
 jump:{anticipation:.1,active:.14,recovery:.2,lockMovement:.1,impulse:0},
 dodge:{anticipation:.07,active:.24,recovery:.18,lockMovement:.22,impulse:5},
 lightAttack:{anticipation:.12,active:.18,recovery:.24,lockMovement:.25,impulse:1.8},
 heavyAttack:{anticipation:.26,active:.23,recovery:.38,lockMovement:.48,impulse:3},
 interact:{anticipation:.12,active:.2,recovery:.18,lockMovement:.2,impulse:0},
 hitReact:{anticipation:0,active:.15,recovery:.3,lockMovement:.24,impulse:0}
});
export class VibeActionDirector {
 constructor({profiles=vibeActionProfiles,onCue=()=>{}}={}){this.profiles=profiles;this.onCue=onCue;this.active=null;this.elapsed=0;this.queue=[];this.lastPhase='none'}
 request(name,{buffer=.2,priority=0}={}){
  if(!this.profiles[name])throw Error('Unknown action: '+name);
  if(!this.active){this.start(name);return true}
  this.queue.push({name,ttl:Math.max(0,buffer),priority});this.queue.sort((a,b)=>b.priority-a.priority);
  this.queue.length=Math.min(this.queue.length,4);return false
 }
 start(name){this.active=name;this.elapsed=0;this.lastPhase='none';this.onCue({type:'action-start',action:name})}
 update(dt){
  if(!Number.isFinite(dt)||dt<=0)return this.snapshot();
  dt=Math.min(dt,.1);for(const item of this.queue)item.ttl-=dt;this.queue=this.queue.filter(item=>item.ttl>0);
  if(!this.active&&this.queue.length)this.start(this.queue.shift().name);
  if(!this.active)return this.snapshot();
  this.elapsed+=dt;const p=this.profiles[this.active];
  const phase=this.elapsed<p.anticipation?'anticipation':this.elapsed<p.anticipation+p.active?'active':this.elapsed<p.anticipation+p.active+p.recovery?'recovery':'complete';
  if(phase!==this.lastPhase){this.lastPhase=phase;this.onCue({type:'action-phase',action:this.active,phase});if(phase==='active')this.onCue({type:'impact-window',action:this.active})}
  if(phase==='complete'){this.onCue({type:'action-end',action:this.active});this.active=null;if(this.queue.length)this.start(this.queue.shift().name)}
  return this.snapshot()
 }
 snapshot(){return {action:this.active,phase:this.lastPhase,elapsed:this.elapsed,movementLocked:!!this.active&&this.elapsed<this.profiles[this.active].lockMovement}}
 cancel(){this.active=null;this.queue=[];this.lastPhase='none'}
}
export class VibeLocomotionPolish {
 constructor({acceleration=12,deceleration=16,turnRate=10,footstepDistance=1.6,onStep=()=>{}}={}){this.acceleration=acceleration;this.deceleration=deceleration;this.turnRate=turnRate;this.footstepDistance=footstepDistance;this.onStep=onStep;this.velocity=v3();this.facing=0;this.distance=0;this.stepSide=0}
 update(dt,{input={},speed=3,grounded=true,locked=false}={}){
  if(!Number.isFinite(dt)||dt<=0)return this.snapshot();
  dt=Math.min(dt,.1);const axis=v3(input);axis.y=0;const m=Math.hypot(axis.x,axis.z);
  const direction=m>1?{x:axis.x/m,y:0,z:axis.z/m}:axis;
  const target=locked?v3():{x:direction.x*speed,y:0,z:direction.z*speed};
  const rate=Math.hypot(target.x,target.z)>Math.hypot(this.velocity.x,this.velocity.z)?this.acceleration:this.deceleration;
  this.velocity=blend(this.velocity,target,rate,dt);
  const horizontal=Math.hypot(this.velocity.x,this.velocity.z);
  if(horizontal>.08){const desired=Math.atan2(this.velocity.x,this.velocity.z);const diff=Math.atan2(Math.sin(desired-this.facing),Math.cos(desired-this.facing));this.facing+=diff*(1-Math.exp(-this.turnRate*dt))}
  if(grounded&&horizontal>.2){this.distance+=horizontal*dt;while(this.distance>=this.footstepDistance){this.distance-=this.footstepDistance;this.stepSide^=1;this.onStep({side:this.stepSide,speed:horizontal})}}
  return this.snapshot()
 }
 snapshot(){return {velocity:{...this.velocity},facing:this.facing,speed:Math.hypot(this.velocity.x,this.velocity.z),stepSide:this.stepSide}}
 reset(){this.velocity=v3();this.distance=0}
}
export class VibeCameraPolish {
 constructor({position={x:0,y:2,z:5},focus={x:0,y:1,z:0},positionDamping=5,focusDamping=9}={}){this.position=v3(position);this.focus=v3(focus);this.positionDamping=positionDamping;this.focusDamping=focusDamping}
 update(dt,{target={},offset={x:0,y:2,z:5},lookOffset={x:0,y:1,z:0},shake={x:0,y:0,z:0},reducedMotion=false}={}){
  if(!Number.isFinite(dt)||dt<=0)return this.snapshot();
  dt=Math.min(dt,.1);const center=v3(target),desired={x:center.x+offset.x,y:center.y+offset.y,z:center.z+offset.z};
  this.position=blend(this.position,desired,reducedMotion?30:this.positionDamping,dt);
  this.focus=blend(this.focus,{x:center.x+lookOffset.x,y:center.y+lookOffset.y,z:center.z+lookOffset.z},this.focusDamping,dt);
  const effect=reducedMotion?v3():v3(shake);
  return {position:{x:this.position.x+effect.x,y:this.position.y+effect.y,z:this.position.z+effect.z},focus:{...this.focus}}
 }
 snapshot(){return {position:{...this.position},focus:{...this.focus}}}
}
export function createVibeAudioCuePlanner({maxDistance=30,minInterval=.045}={}){
 const recent=new Map();
 return {
  plan(name,{distance=0,occlusion=0,volume=1,pitch=1,now=0,pan=0}={}){
   if(now-(recent.get(name)??-Infinity)<minInterval)return null;
   recent.set(name,now);
   const attenuation=1/(1+Math.pow(Math.max(0,distance)/Math.max(1,maxDistance),2)*5);
   return {name,volume:clamp(volume*attenuation*(1-.7*clamp(occlusion))),pitch:clamp(pitch,.5,2),pan:Math.max(-1,Math.min(1,pan))};
  },
  reset(){recent.clear()}
 };
}
export class VibeScreenFxDirector {
 constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.effects=[]}
 add(type,{duration=.2,strength=.5,color='#ffffff'}={}){if(!['flash','vignette','letterbox','fade'].includes(type))throw Error('Unknown screen effect');this.effects.push({type,duration:Math.max(.001,duration),remaining:Math.max(.001,duration),strength:clamp(strength),color})}
 update(dt){if(!Number.isFinite(dt)||dt<=0)return this.snapshot();dt=Math.min(dt,.1);for(const fx of this.effects)fx.remaining-=dt;this.effects=this.effects.filter(fx=>fx.remaining>0);return this.snapshot()}
 snapshot(){return this.effects.map(fx=>({type:fx.type,color:fx.color,opacity:fx.strength*(fx.type==='flash'?(fx.remaining/fx.duration):1),remaining:fx.remaining,reducedMotion:this.reducedMotion}))}
 clear(){this.effects=[]}
}
