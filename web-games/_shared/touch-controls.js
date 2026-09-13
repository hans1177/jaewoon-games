(()=>{
'use strict';
if(window.__JAEWOON_TOUCH_CONTROLS__)return;
window.__JAEWOON_TOUCH_CONTROLS__=true;

const isTouchDevice=()=>navigator.maxTouchPoints>0||window.matchMedia?.('(pointer: coarse)').matches===true;
const nativeStickSelectors=['#joy','#joystick','.joystick','.virtual-joystick','.touch-stick','[data-joystick]','[data-touch-stick]'];
const hasNativeTouchStick=()=>nativeStickSelectors.some(selector=>document.querySelector(selector));
const dispatchGameEvent=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));

function boot(){
  if(!isTouchDevice())return;
  if(hasNativeTouchStick()){
    document.documentElement.dataset.jaewoonTouchMode='native';
    return;
  }
  if(document.getElementById('jgUniversalTouchControls'))return;
  document.documentElement.dataset.jaewoonTouchMode='universal';

  const style=document.createElement('style');
  style.id='jgUniversalTouchStyle';
  style.textContent=`
#jgUniversalTouchControls{position:fixed;inset:0;z-index:2147483000;pointer-events:none;user-select:none;-webkit-user-select:none;touch-action:none;font-family:system-ui,-apple-system,sans-serif}
#jgUniversalTouchControls .jg-stick{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(18px,calc(env(safe-area-inset-bottom) + 12px));width:126px;height:126px;border-radius:50%;border:2px solid rgba(255,255,255,.58);background:rgba(4,12,22,.42);box-shadow:0 7px 22px rgba(0,0,0,.35);pointer-events:auto;touch-action:none;backdrop-filter:blur(2px)}
#jgUniversalTouchControls .jg-knob{position:absolute;left:35px;top:35px;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.68);border:2px solid rgba(255,255,255,.86);box-shadow:0 4px 12px rgba(0,0,0,.32);transform:translate(0,0)}
#jgUniversalTouchControls .jg-actions{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(22px,calc(env(safe-area-inset-bottom) + 16px));display:flex;align-items:flex-end;gap:14px;pointer-events:none}
#jgUniversalTouchControls .jg-action{pointer-events:auto;touch-action:none;border:2px solid rgba(255,255,255,.72);border-radius:50%;color:#fff;font-weight:1000;text-shadow:0 2px 4px rgba(0,0,0,.65);box-shadow:0 7px 20px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:0}
#jgUniversalTouchControls .jg-action-b{width:66px;height:66px;background:rgba(57,103,180,.82);font-size:18px;margin-bottom:52px}
#jgUniversalTouchControls .jg-action-a{width:88px;height:88px;background:rgba(205,57,57,.86);font-size:22px}
#jgUniversalTouchControls .jg-selected{outline:4px solid rgba(255,223,95,.95)!important;outline-offset:2px!important}
@media(max-width:380px){#jgUniversalTouchControls .jg-stick{width:112px;height:112px}.jg-stick .jg-knob{left:31px!important;top:31px!important;width:50px!important;height:50px!important}#jgUniversalTouchControls .jg-action-a{width:78px;height:78px}#jgUniversalTouchControls .jg-action-b{width:60px;height:60px;margin-bottom:44px}}
`;
  document.head.appendChild(style);

  const root=document.createElement('div');
  root.id='jgUniversalTouchControls';
  root.setAttribute('aria-hidden','true');
  root.innerHTML='<div class="jg-stick"><div class="jg-knob"></div></div><div class="jg-actions"><button class="jg-action jg-action-b" type="button">B</button><button class="jg-action jg-action-a" type="button">A</button></div>';
  document.body.appendChild(root);

  const stick=root.querySelector('.jg-stick');
  const knob=root.querySelector('.jg-knob');
  const actionA=root.querySelector('.jg-action-a');
  const actionB=root.querySelector('.jg-action-b');
  let pointerId=null;
  let activeKeys=new Set();
  let selected=null;
  let lastNavAt=0;
  let lastNavAxis='';

  const keyboardTarget=()=>window;
  const sendKey=(type,key,code)=>{
    try{keyboardTarget().dispatchEvent(new KeyboardEvent(type,{key,code,bubbles:true,cancelable:true}));}catch{}
  };
  const keyMap={left:['a','KeyA'],right:['d','KeyD'],up:['w','KeyW'],down:['s','KeyS']};
  const setMovementKeys=(x,y)=>{
    const wanted=new Set();
    if(x<-.28)wanted.add('left');else if(x>.28)wanted.add('right');
    if(y<-.28)wanted.add('up');else if(y>.28)wanted.add('down');
    for(const dir of activeKeys)if(!wanted.has(dir)){const [key,code]=keyMap[dir];sendKey('keyup',key,code);activeKeys.delete(dir);}
    for(const dir of wanted)if(!activeKeys.has(dir)){const [key,code]=keyMap[dir];sendKey('keydown',key,code);activeKeys.add(dir);}
  };
  const releaseMovementKeys=()=>{for(const dir of [...activeKeys]){const [key,code]=keyMap[dir];sendKey('keyup',key,code);}activeKeys.clear();};

  const visible=el=>{
    if(!el||el.disabled)return false;
    const rect=el.getBoundingClientRect();
    const style=getComputedStyle(el);
    return rect.width>8&&rect.height>8&&style.display!=='none'&&style.visibility!=='hidden'&&style.pointerEvents!=='none';
  };
  const selectable=()=>[...document.querySelectorAll('.gem:not(:disabled),.scope-action:not(:disabled),.action:not(:disabled),[data-action]:not(:disabled)')].filter(visible);
  const center=el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};};
  const chooseFirst=()=>{const items=selectable();if(!items.length)return null;return items[0];};
  const setSelected=next=>{
    if(selected===next)return;
    selected?.classList.remove('jg-selected');
    selected=next&&visible(next)?next:null;
    selected?.classList.add('jg-selected');
  };
  const moveSelection=(dx,dy)=>{
    const items=selectable();
    if(!items.length)return false;
    if(!selected||!items.includes(selected)){setSelected(items[0]);return true;}
    const from=center(selected);
    let best=null,bestScore=Infinity;
    for(const item of items){
      if(item===selected)continue;
      const p=center(item),vx=p.x-from.x,vy=p.y-from.y;
      const forward=vx*dx+vy*dy;
      if(forward<=4)continue;
      const perpendicular=Math.abs(vx*dy-vy*dx);
      const score=forward+perpendicular*2.4;
      if(score<bestScore){best=item;bestScore=score;}
    }
    if(best){setSelected(best);return true;}
    return false;
  };
  const maybeNavigate=(x,y)=>{
    const now=performance.now();
    const ax=Math.abs(x),ay=Math.abs(y);
    if(Math.max(ax,ay)<.62){lastNavAxis='';return;}
    const axis=ax>ay?(x>0?'right':'left'):(y>0?'down':'up');
    if(axis===lastNavAxis&&now-lastNavAt<260)return;
    lastNavAxis=axis;lastNavAt=now;
    if(axis==='left')moveSelection(-1,0);
    else if(axis==='right')moveSelection(1,0);
    else if(axis==='up')moveSelection(0,-1);
    else moveSelection(0,1);
  };

  const vectorFromPointer=e=>{
    const r=stick.getBoundingClientRect();
    const cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;
    const radius=Math.max(34,r.width*.34),len=Math.hypot(dx,dy);
    if(len>radius){dx=dx/len*radius;dy=dy/len*radius;}
    const x=Math.max(-1,Math.min(1,dx/radius)),y=Math.max(-1,Math.min(1,dy/radius));
    knob.style.transform=`translate(${dx}px,${dy}px)`;
    setMovementKeys(x,y);
    maybeNavigate(x,y);
    dispatchGameEvent('jaewoon:joystick',{x,y,active:true,source:'touch'});
  };
  const endStick=()=>{
    pointerId=null;
    knob.style.transform='translate(0,0)';
    releaseMovementKeys();
    lastNavAxis='';
    dispatchGameEvent('jaewoon:joystick',{x:0,y:0,active:false,source:'touch'});
  };
  stick.addEventListener('pointerdown',e=>{e.preventDefault();pointerId=e.pointerId;stick.setPointerCapture?.(pointerId);vectorFromPointer(e);});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===pointerId){e.preventDefault();vectorFromPointer(e);}});
  stick.addEventListener('pointerup',e=>{if(e.pointerId===pointerId){e.preventDefault();endStick();}});
  stick.addEventListener('pointercancel',endStick);

  const clickFirstVisible=selectors=>{
    for(const selector of selectors){const el=document.querySelector(selector);if(visible(el)){el.click();return true;}}
    return false;
  };
  const pressA=e=>{
    e?.preventDefault();
    if(selected&&visible(selected)){selected.click();return;}
    const first=chooseFirst();
    if(first){setSelected(first);first.click();return;}
    if(clickFirstVisible(['#attack','[data-action="attack"]','.attack','.primary-action']))return;
    dispatchGameEvent('jaewoon:action',{button:'A',source:'touch'});
    sendKey('keydown',' ','Space');sendKey('keyup',' ','Space');
  };
  const pressB=e=>{
    e?.preventDefault();
    if(clickFirstVisible(['#talk','#actionBtn','#interact','[data-action="interact"]','.secondary-action']))return;
    dispatchGameEvent('jaewoon:action',{button:'B',source:'touch'});
    sendKey('keydown','e','KeyE');sendKey('keyup','e','KeyE');
  };
  actionA.addEventListener('pointerdown',pressA);
  actionB.addEventListener('pointerdown',pressB);

  const observer=new MutationObserver(()=>{
    if(hasNativeTouchStick()&&!root.contains(document.querySelector('#joy,#joystick,.joystick,.virtual-joystick,.touch-stick,[data-joystick],[data-touch-stick]'))){
      releaseMovementKeys();
      root.remove();
      document.documentElement.dataset.jaewoonTouchMode='native';
      observer.disconnect();
      return;
    }
    if(selected&&!visible(selected))setSelected(null);
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','disabled']});
  window.addEventListener('pagehide',releaseMovementKeys);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseMovementKeys();});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
