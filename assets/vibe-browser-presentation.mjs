// Browser presentation adapter: non-destructive camera offsets, WebAudio and screen flash.
import {VibePresentationEngine} from './vibe-presentation-engine.mjs';
export function createVibeBrowserPresentation({camera,element=document.body,settings={}}={}){
 if(!camera?.position||!element)throw Error('camera and element required');
 const documentRef=element.ownerDocument??document;
 const flash=documentRef.createElement('div');
 flash.setAttribute('aria-hidden','true');
 flash.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147482000;background:white;opacity:0;transition:opacity .12s linear';
 element.append(flash);
 let audioContext=null,offset={x:0,y:0},flashTimer=null;
 const adapter={
  cameraShake(next){
   camera.position.x-=offset.x;camera.position.y-=offset.y;
   offset={x:next.x,y:next.y};
   camera.position.x+=offset.x;camera.position.y+=offset.y;
  },
  flash(value){flash.style.opacity=String(Math.min(.35,Math.max(0,value)));if(flashTimer!==null)clearTimeout(flashTimer);flashTimer=setTimeout(()=>{flash.style.opacity='0'},90)},
  playSound(sound,{intensity=1}={}){
   if(typeof window==='undefined')return;
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   try{
    audioContext??=new Context();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
    oscillator.type=sound==='footstep'?'triangle':'sine';
    oscillator.frequency.setValueAtTime(sound==='footstep'?95:220,now);
    oscillator.frequency.exponentialRampToValueAtTime(sound==='footstep'?65:85,now+.09);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,.05*intensity),now+.01);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.12);
    oscillator.connect(gain);gain.connect(audioContext.destination);
    oscillator.start(now);oscillator.stop(now+.13);
   }catch{}
  },
  subtitle(text){if(statusElement)statusElement.textContent=String(text)}
 };
 const statusElement=documentRef.createElement('div');
 statusElement.setAttribute('role','status');statusElement.setAttribute('aria-live','polite');
 statusElement.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:white;background:#000b;padding:5px 12px;border-radius:8px;z-index:2147482001;pointer-events:none';
 element.append(statusElement);
 const engine=new VibePresentationEngine({adapter,settings});
 return {engine,update:dt=>engine.update(dt),cue:(type,options)=>engine.cue(type,options),dispose(){
  engine.dispose();if(flashTimer!==null)clearTimeout(flashTimer);flash.remove();statusElement.remove();audioContext?.close().catch(()=>{});
 }};
}
