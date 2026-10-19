// High-quality, deterministic, renderer-agnostic animation direction.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const quint=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10)};
const vec=(a={})=>({x:Number(a.x)||0,y:Number(a.y)||0,z:Number(a.z)||0});
const blend=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t)});
export const vibeEasing=Object.freeze({smooth,quint,anticipate:t=>t<.2?-.08*smooth(t/.2):quint((t-.2)/.8),overshoot:t=>{t=clamp(t);return 1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2)},inOutCubic:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2});
export class VibeCinematicDirector {
 constructor({adapter={},quality='high',reducedMotion=false}={}){
  this.adapter=adapter;this.quality=quality;this.reducedMotion=!!reducedMotion;this.time=0;this.tracks=new Map();this.events=[];this.nextId=0;
 }
 addTrack(name,keyframes,{loop=false,easing='quint',onComplete=null}={}){
  if(!name||!Array.isArray(keyframes)||keyframes.length<2)throw Error('Invalid cinematic track');
  const frames=keyframes.map(k=>({at:k.at,position:vec(k.position),lookAt:vec(k.lookAt),fov:Number.isFinite(k.fov)?k.fov:45,weight:Number.isFinite(k.weight)?k.weight:1,event:k.event||null}));
  if(frames.some((f,i)=>!Number.isFinite(f.at)||f.at<0||(i>0&&f.at<=frames[i-1].at)))throw Error('Keyframe times must increase');
  if(!vibeEasing[easing])throw Error('Unknown easing');
  this.tracks.set(name,{frames,loop,easing,onComplete,elapsed:0,eventsFired:new Set(),finished:false});
  return name;
 }
 removeTrack(name){return this.tracks.delete(name)}
 setReducedMotion(value){this.reducedMotion=!!value}
 sample(track,elapsed){
  const frames=track.frames;
  if(elapsed<=frames[0].at)return {...frames[0]};
  if(elapsed>=frames.at(-1).at)return {...frames.at(-1)};
  let i=0;while(i<frames.length-2&&frames[i+1].at<elapsed)i++;
  const a=frames[i],b=frames[i+1],t=vibeEasing[track.easing]((elapsed-a.at)/(b.at-a.at));
  return {position:blend(a.position,b.position,t),lookAt:blend(a.lookAt,b.lookAt,t),fov:lerp(a.fov,b.fov,t),weight:lerp(a.weight,b.weight,t)};
 }
 update(dt){
  if(!Number.isFinite(dt)||dt<=0)return [];
  dt=clamp(dt,0,.1);this.time+=dt;const output=[];
  for(const [name,track] of this.tracks){
   if(track.finished)continue;
   const before=track.elapsed,finish=track.frames.at(-1).at;
   track.elapsed+=dt;
   if(track.loop&&track.elapsed>=finish){track.elapsed%=finish;track.eventsFired.clear();}
   for(let i=0;i<track.frames.length;i++){
    const frame=track.frames[i];
    if(frame.event&&!track.eventsFired.has(i)&&frame.at<=track.elapsed&&(frame.at>before||before===0&&frame.at===0)){
     track.eventsFired.add(i);const event={id:++this.nextId,track:name,type:frame.event,time:this.time};
     this.events.push(event);this.adapter.onEvent?.(event);
    }
   }
   const pose=this.sample(track,track.elapsed);
   if(this.reducedMotion)pose.position=track.frames[0].position;
   this.adapter.applyCamera?.(name,pose);
   output.push({name,...pose});
   if(!track.loop&&track.elapsed>=finish){track.finished=true;track.onComplete?.(name)}
  }
  return output;
 }
 consumeEvents(){return this.events.splice(0)}
 dispose(){this.tracks.clear();this.events=[]}
}
export function createCharacterPerformance({idleAmplitude=.018,breathingHz=.24,blinkInterval=3.6,lookSmoothing=.14}={}){
 let time=0,look=vec(),blink=0;
 return {
  update(dt,{targetLook={x:0,y:0,z:1},speed=0,emotion='neutral'}={}){
   if(!Number.isFinite(dt)||dt<=0)return {breath:0,blink:0,look};
   dt=clamp(dt,0,.1);time+=dt;
   const factor=1-Math.exp(-dt/Math.max(.001,lookSmoothing));
   look=blend(look,vec(targetLook),factor);
   const phase=time*2*Math.PI*breathingHz;
   const breath=Math.sin(phase)*idleAmplitude*(speed>.2?.35:1);
   const cycle=time%Math.max(1,blinkInterval);
   blink=cycle<.12?Math.sin(Math.PI*cycle/.12):0;
   const expression=emotion==='fear'?.8:emotion==='joy'?.5:emotion==='pain'?1:0;
   return {breath,blink,look,expression,secondarySway:Math.sin(phase*.65)*idleAmplitude*.4};
  },
  reset(){time=0;look=vec();blink=0}
 };
}
