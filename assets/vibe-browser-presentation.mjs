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

// [공식 게임 공용 화면] 기존 웹게임의 입력 피드백, UI 트윈, 실제 이벤트 파티클을
// 같은 Vibe 2D 에미터로 연결한다. 게임 판정, canvas 컨텍스트, 저장/입력 핸들러를 교체하지 않는다.
import {createVibeCanvasVfx} from './vibe-game-world-runtime.mjs';
export function mountVibeGameScreenEffects({documentRef=document,maxParticles=36}={}){
 const win=documentRef.defaultView;
 if(!win||!documentRef.body)return {dispose(){}};
 const root=documentRef.documentElement;
 const key='vibeCommonScreenEffects';
 if(root.dataset[key]==='1')return {dispose(){}};
 root.dataset[key]='1';
 const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const vfx=createVibeCanvasVfx({maxParticles,reducedMotion:reduced});
 const layer=documentRef.createElement('canvas');
 layer.setAttribute('aria-hidden','true');
 layer.dataset.vibeFxLayer='true';
 layer.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147482000;visibility:hidden';
 documentRef.body.append(layer);
 const ctx=layer.getContext('2d',{alpha:true});
 const style=documentRef.createElement('style');
 style.dataset.vibeFxStyle='true';
 style.textContent=`@keyframes vibeSharedPanelEnter{from{opacity:0;scale:.95}to{opacity:1;scale:1}}
 :where(dialog[open],[role="dialog"][aria-modal="true"]){animation:vibeSharedPanelEnter .22s cubic-bezier(.2,.8,.2,1) both}
 :where(button,[role="button"]){transition:filter .14s ease,scale .14s ease}
 :where(button,[role="button"]):active{filter:drop-shadow(0 0 5px rgba(255,211,120,.72));scale:.97}
 @media(prefers-reduced-motion:reduce){:where(dialog[open],[role="dialog"][aria-modal="true"]){animation:none}
 :where(button,[role="button"]){transition:none}}`;
 documentRef.head.append(style);
 let last=0,raf=0,disposed=false,lastTap=0;
 const size=()=>{const dpr=Math.min(2,win.devicePixelRatio||1);
  const width=win.innerWidth,height=win.innerHeight;
  const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));
  if(layer.width!==w||layer.height!==h){layer.width=w;layer.height=h}
  ctx?.setTransform(dpr,0,0,dpr,0,0);
 };
 const step=time=>{
  raf=0;if(disposed||!ctx)return;
  const dt=Math.min(.05,Math.max(0,(time-(last||time))/1000));last=time;
  size();ctx.clearRect(0,0,win.innerWidth,win.innerHeight);
  vfx.update(dt);vfx.draw(ctx);
  if(vfx.count>0)raf=win.requestAnimationFrame(step);
  else{layer.style.visibility='hidden';last=0}
 };
 const emit=(type,x,y,color,count)=>{
  if(disposed||!ctx||!Number.isFinite(x)||!Number.isFinite(y))return;
  if(vfx.burst(type,{x,y,color,count})===0)return;
  layer.style.visibility='visible';
  if(!raf)raf=win.requestAnimationFrame(step);
 };
 // 입력 피드백은 실제 적중 판정이 아니므로 전투/처치/보상처럼 표시하지 않는다.
 const pointer=e=>{
  if(e.defaultPrevented||!e.isTrusted||e.button>0||e.target===layer)return;
  const t=e.target;
  if(!t?.closest?.('canvas,button,[role="button"],[data-action]'))return;
  if(win.performance.now()-lastTap<65)return;
  lastTap=win.performance.now();
  emit('dust',e.clientX,e.clientY,'#e6d8b6',reduced?2:5);
 };
 // 실제 게임 자체의 전투·마법·폭발 이벤트가 제공되면 해당 위치를 정확히 사용한다.
 const gameEvent=e=>{
  const d=e.detail||{};
  let x=Number(d.clientX),y=Number(d.clientY);
  if(!Number.isFinite(x)||!Number.isFinite(y)){
   const anchor=typeof d.target?.getBoundingClientRect==='function'?d.target:null;
   if(!anchor)return;
   const b=anchor.getBoundingClientRect();x=b.left+b.width/2;y=b.top+b.height/2;
  }
  const kind=['impact','explosion','fire','magic','dust'].includes(d.type)?d.type:'impact';
  emit(kind,x,y,typeof d.color==='string'?d.color:'#ffd47a',Math.max(0,Math.min(28,Number(d.count)||10)));
 };
 documentRef.addEventListener('pointerdown',pointer,{passive:true});
 win.addEventListener('vibe:effect',gameEvent);
 return{emit,dispose(){
  if(disposed)return;
  disposed=true;documentRef.removeEventListener('pointerdown',pointer);
  win.removeEventListener('vibe:effect',gameEvent);
  if(raf)win.cancelAnimationFrame(raf);
  vfx.dispose();layer.remove();style.remove();delete root.dataset[key];
 }};
}
