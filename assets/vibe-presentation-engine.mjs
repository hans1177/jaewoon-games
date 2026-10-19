// Renderer-independent cinematic feedback engine; host provides camera/audio/UI adapters.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export class VibePresentationEngine {
 constructor({adapter={},settings={},seed=1}={}){
  this.adapter=adapter;
  this.settings={reducedMotion:false,shakeStrength:1,flashStrength:1,audioEnabled:true,subtitles:true,maxShake:0.5,maxHitStop:0.09,maxEvents:64,...settings};
  this.seed=(seed>>>0)||1;this.time=0;this.hitStop=0;this.shakes=[];this.events=[];this.nextId=0;this.cooldowns=new Map();
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 emit(type,data={}){
  const event={id:++this.nextId,time:this.time,type,...data};
  this.events.push(event);if(this.events.length>this.settings.maxEvents)this.events.shift();
  this.adapter.onEvent?.(event);return event;
 }
 cue(type,{intensity=1,position=null,label='',sound='',cooldown=0,shake=0,hitStop=0,flash=0}={}){
  if(typeof type!=='string'||!type||!Number.isFinite(intensity))throw Error('Invalid cue');
  if((this.cooldowns.get(type)??0)>this.time)return false;
  intensity=clamp(intensity,0,1);
  if(cooldown>0)this.cooldowns.set(type,this.time+cooldown);
  const event=this.emit(type,{intensity,position});
  if(sound&&this.settings.audioEnabled)this.adapter.playSound?.(sound,{intensity,position});
  if(label&&this.settings.subtitles)this.adapter.subtitle?.(label,{eventId:event.id});
  if(shake>0&&!this.settings.reducedMotion)this.shakes.push({amplitude:clamp(shake*intensity*this.settings.shakeStrength,0,this.settings.maxShake),remaining:.28,total:.28,phase:this.random()*Math.PI*2});
  if(hitStop>0&&!this.settings.reducedMotion)this.hitStop=Math.max(this.hitStop,clamp(hitStop,0,this.settings.maxHitStop));
  if(flash>0&&!this.settings.reducedMotion)this.adapter.flash?.(clamp(flash*intensity*this.settings.flashStrength,0,.35));
  return true;
 }
 update(dt){
  if(!Number.isFinite(dt)||dt<=0)return {timeScale:1,shake:{x:0,y:0}};
  dt=clamp(dt,0,.1);this.time+=dt;
  const frozen=Math.min(this.hitStop,dt);this.hitStop=Math.max(0,this.hitStop-dt);
  let x=0,y=0;
  for(const s of this.shakes){s.remaining-=dt;if(s.remaining<=0)continue;const fade=s.remaining/s.total;const phase=(1-fade)*55+s.phase;x+=Math.sin(phase)*s.amplitude*fade;y+=Math.cos(phase*1.37)*s.amplitude*fade;}
  this.shakes=this.shakes.filter(s=>s.remaining>0);
  const shake={x:clamp(x,-this.settings.maxShake,this.settings.maxShake),y:clamp(y,-this.settings.maxShake,this.settings.maxShake)};
  this.adapter.cameraShake?.(shake);
  return {timeScale:clamp(1-frozen/dt,0,1),shake};
 }
 setAccessibility(settings={}){Object.assign(this.settings,settings);if(this.settings.reducedMotion){this.shakes=[];this.hitStop=0;this.adapter.cameraShake?.({x:0,y:0});}}
 consumeEvents(){return this.events.splice(0);}
 dispose(){this.shakes=[];this.events=[];this.cooldowns.clear();this.hitStop=0;this.adapter.cameraShake?.({x:0,y:0});}
}
export function connectMotionPresentation(motion,presentation,{map={}}={}){
 if(!motion?.adapter||!presentation)throw Error('motion and presentation required');
 const previous=motion.adapter.onEvent;
 const listener=event=>{
  previous?.(event);
  const cue=map[event.type]??(event.type==='footstep'?{sound:'footstep',cooldown:.08}:null);
  if(cue)presentation.cue(event.type,cue);
 };
 motion.adapter.onEvent=listener;
 return ()=>{if(motion.adapter.onEvent===listener)motion.adapter.onEvent=previous;};
}
