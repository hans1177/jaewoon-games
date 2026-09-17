(()=>{
'use strict';
if(window.__JAEWOON_TOUCH_CONTROLS__)return;
window.__JAEWOON_TOUCH_CONTROLS__=true;
const touch=()=>navigator.maxTouchPoints>0||matchMedia?.('(pointer:coarse)').matches===true;
const nativeSel='#joy,#joystick,.joystick,.virtual-joystick,.touch-stick,[data-joystick],[data-touch-stick]';
const native=()=>!!document.querySelector(nativeSel);
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
function boot(){
  if(!touch())return;
  if(native()){document.documentElement.dataset.jaewoonTouchMode='native';return;}
  if(document.getElementById('jgUniversalTouchControls'))return;
  document.documentElement.dataset.jaewoonTouchMode='universal';
  const style=document.createElement('style');
  style.textContent=`#jgUniversalTouchControls{position:fixed;inset:0;z-index:2147483000;pointer-events:none;user-select:none;-webkit-user-select:none;touch-action:none}#jgUniversalTouchControls .jg-stick{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(18px,calc(env(safe-area-inset-bottom) + 12px));width:126px;height:126px;border-radius:50%;border:2px solid #ffffff99;background:#07101c70;box-shadow:0 7px 22px #0006;pointer-events:auto;touch-action:none}#jgUniversalTouchControls .jg-knob{position:absolute;left:35px;top:35px;width:56px;height:56px;border-radius:50%;background:#ffffffb8;border:2px solid #fff;box-shadow:0 4px 12px #0006}#jgUniversalTouchControls .jg-selected{outline:4px solid #ffdf5ff2!important;outline-offset:2px!important}@media(max-width:380px){#jgUniversalTouchControls .jg-stick{width:112px;height:112px}#jgUniversalTouchControls .jg-knob{left:31px;top:31px;width:50px;height:50px}}`;
  document.head.appendChild(style);
  const root=document.createElement('div');root.id='jgUniversalTouchControls';root.setAttribute('aria-hidden','true');root.innerHTML='<div class="jg-stick"><div class="jg-knob"></div></div>';document.body.appendChild(root);
  const stick=root.querySelector('.jg-stick'),knob=root.querySelector('.jg-knob');
  const map={left:['a','KeyA'],right:['d','KeyD'],up:['w','KeyW'],down:['s','KeyS']};let pointer=null,held=new Set(),selected=null,lastAxis='',lastAt=0;
  const key=(type,k,c)=>{try{window.dispatchEvent(new KeyboardEvent(type,{key:k,code:c,bubbles:true,cancelable:true}));}catch{}};
  const movement=(x,y)=>{const want=new Set();if(x<-.28)want.add('left');else if(x>.28)want.add('right');if(y<-.28)want.add('up');else if(y>.28)want.add('down');for(const d of [...held])if(!want.has(d)){key('keyup',...map[d]);held.delete(d)}for(const d of want)if(!held.has(d)){key('keydown',...map[d]);held.add(d)}};
  const release=()=>{for(const d of held)key('keyup',...map[d]);held.clear()};
  const visible=el=>{if(!el||el.disabled)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>8&&r.height>8&&s.display!=='none'&&s.visibility!=='hidden'};
  const items=()=>[...document.querySelectorAll('.gem:not(:disabled),.scope-action:not(:disabled),.action:not(:disabled),[data-action]:not(:disabled)')].filter(visible);
  const center=el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}};
  const select=el=>{selected?.classList.remove('jg-selected');selected=el&&visible(el)?el:null;selected?.classList.add('jg-selected')};
  const nav=(dx,dy)=>{const list=items();if(!list.length)return false;if(!selected||!list.includes(selected)){select(list[0]);return true}const f=center(selected);let best=null,score=Infinity;for(const el of list){if(el===selected)continue;const p=center(el),vx=p.x-f.x,vy=p.y-f.y,forward=vx*dx+vy*dy;if(forward<=4)continue;const s=forward+Math.abs(vx*dy-vy*dx)*2.4;if(s<score){score=s;best=el}}if(best){select(best);return true}return false};
  const maybeNav=(x,y)=>{const now=performance.now(),ax=Math.abs(x),ay=Math.abs(y);if(Math.max(ax,ay)<.62){lastAxis='';return}const axis=ax>ay?(x>0?'right':'left'):(y>0?'down':'up');if(axis===lastAxis&&now-lastAt<260)return;lastAxis=axis;lastAt=now;if(axis==='left')nav(-1,0);else if(axis==='right')nav(1,0);else if(axis==='up')nav(0,-1);else nav(0,1)};
  const vector=e=>{const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rad=Math.max(34,r.width*.34);let dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy);if(len>rad){dx=dx/len*rad;dy=dy/len*rad}const x=dx/rad,y=dy/rad;knob.style.transform=`translate(${dx}px,${dy}px)`;movement(x,y);maybeNav(x,y);emit('jaewoon:joystick',{x,y,active:true,source:'touch'})};
  const end=()=>{pointer=null;knob.style.transform='translate(0,0)';release();lastAxis='';emit('jaewoon:joystick',{x:0,y:0,active:false,source:'touch'})};
  stick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;stick.setPointerCapture?.(pointer);vector(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();vector(e)}});stick.addEventListener('pointerup',e=>{if(e.pointerId===pointer){e.preventDefault();end()}});stick.addEventListener('pointercancel',end);
  const observer=new MutationObserver(()=>{if(native()&&!root.contains(document.querySelector(nativeSel))){release();root.remove();document.documentElement.dataset.jaewoonTouchMode='native';observer.disconnect()}else if(selected&&!visible(selected))select(null)});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','disabled']});
  addEventListener('pagehide',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
