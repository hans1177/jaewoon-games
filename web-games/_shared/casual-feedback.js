// Shared optional causal feedback for Web games (presentation only).
// Use on verified gameplay events; never mutate score, timers, inventory, saves or game rules.
(function(){
'use strict';
if(window.JaewoonCasualFX)return;
const STYLE_ID='jg-casual-feedback-style';
const ICONS={
 step:'<path d="M12 2 15.1 8.7 22 9.7 17 14.7 18.2 22 12 18.3 5.8 22 7 14.7 2 9.7 8.9 8.7Z"/>',
 milestone:'<path d="M8 3h8v4h4v3c0 3-2 5-5 5h-1v3h3v3H7v-3h3v-3H9c-3 0-5-2-5-5V7h4zM4 9v1c0 1 .5 2 2 2V9zm14 0v3c1.5 0 2-1 2-2V9z"/>',
 fail:'<path d="M12 3 21 19H3L12 3zm-1 5v6h2V8zm0 8v2h2v-2z"/>',
 start:'<path d="M8 4 21 12 8 20Z"/>',
 reward:'<path d="M12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8Z"/>'
};
const COLORS={step:'#ffe17b',milestone:'#ffe5a2',reward:'#9deed0',start:'#adf4fc',fail:'#ff9ab7'};
function style(){
 if(document.getElementById(STYLE_ID))return;
 const el=document.createElement('style');el.id=STYLE_ID;
 el.textContent=[
 '.jg-casual-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:9;isolation:isolate}',
 '.jg-casual-pop{position:absolute;display:flex;align-items:center;gap:8px;max-width:85%;padding:9px 13px;border-radius:18px;background:#173047e8;color:white;border:1px solid #fff7;font:900 15px/1.2 system-ui,sans-serif;box-shadow:0 9px 22px #10354a52;transform:translate(-50%,-50%);animation:jgCasualPop .76s cubic-bezier(.17,.89,.32,1.1) forwards;white-space:nowrap;z-index:2}',
 '.jg-casual-icon{display:block;width:23px;height:23px;fill:currentColor;filter:drop-shadow(0 2px 2px #0004);flex:none}',
 '.jg-casual-spark{position:absolute;width:11px;height:11px;transform:translate(-50%,-50%);border-radius:3px;background:var(--jg-color,#ffe17b);box-shadow:0 0 6px var(--jg-color,#ffe17b);animation:jgCasualSpark .68s cubic-bezier(.1,.7,.3,1) forwards;pointer-events:none}',
 '.jg-casual-bump{animation:jgCasualBump .26s ease-out}',
 '.jg-casual-idle{display:inline-flex;align-items:center;justify-content:center;animation:jgCasualFloat 2.9s ease-in-out infinite;transform-origin:center}',
 '.jg-casual-idle:nth-child(2n){animation-delay:-1.1s}',
 '@keyframes jgCasualPop{0%{opacity:0;transform:translate(-50%,-20%) scale(.72)}23%{opacity:1;transform:translate(-50%,-57%) scale(1.13)}68%{opacity:1}100%{opacity:0;transform:translate(-50%,-145%) scale(.95)}}',
 '@keyframes jgCasualSpark{0%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0)}100%{opacity:0;transform:translate(calc(-50% + var(--jg-x)),calc(-50% + var(--jg-y))) scale(.25) rotate(var(--jg-spin))}}',
 '@keyframes jgCasualBump{0%,100%{transform:scale(1)}45%{transform:scale(1.18)}}',
 '@keyframes jgCasualFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-4px) rotate(6deg)}}',
 '@media(prefers-reduced-motion:reduce){.jg-casual-pop,.jg-casual-spark,.jg-casual-bump,.jg-casual-idle{animation:none!important;transition:none!important}}'
 ].join('');
 document.head.append(el);
}
function create({root=document.body,maxParticles=16}={}){
 style();
 if(!(root instanceof Element))root=document.body;
 const layer=document.createElement('div');
 layer.className='jg-casual-layer';layer.setAttribute('aria-hidden','true');root.append(layer);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const active=new Set();let emitted=0;
 function add(node,ms){
   // Never grow unbounded across repeated attempts or rapid combat hits.
   if(active.size>=30){const first=active.values().next().value;first?.remove();active.delete(first)}
   active.add(node);layer.append(node);
   setTimeout(()=>{node.remove();active.delete(node)},ms);
 }
 function emit(kind,{x=0,y=0,text='',count=8}={}){
   if(document.hidden||!layer.isConnected)return false;
   const color=COLORS[kind]||COLORS.step;
   const bounds=root.getBoundingClientRect(),cx=Number.isFinite(x)?x:bounds.left+bounds.width/2,
     cy=Number.isFinite(y)?y:bounds.top+bounds.height/2;
   const px=Math.max(18,Math.min(bounds.width-18,cx-bounds.left));
   const py=Math.max(18,Math.min(bounds.height-18,cy-bounds.top));
   const pop=document.createElement('div');pop.className='jg-casual-pop';
   pop.style.left=px+'px';pop.style.top=py+'px';pop.style.color=color;
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','jg-casual-icon');
   svg.innerHTML=ICONS[kind]||ICONS.step;
   const label=document.createElement('span');label.textContent=String(text||'').slice(0,36);
   label.style.color='#fff';pop.append(svg,label);add(pop,reduced.matches?380:850);
   // Lightweight DOM confetti: no textures, network, continuous particle loop or extra canvas.
   if(!reduced.matches){
     const n=Math.min(maxParticles,Math.max(0,Math.trunc(count)));
     for(let i=0;i<n;i++){
       const angle=(Math.PI*2*i/n)+(emitted%3)*.17,distance=22+(i%4)*13;
       const spark=document.createElement('i');spark.className='jg-casual-spark';
       spark.style.left=px+'px';spark.style.top=py+'px';
       spark.style.setProperty('--jg-color',color);
       spark.style.setProperty('--jg-x',Math.cos(angle)*distance+'px');
       spark.style.setProperty('--jg-y',Math.sin(angle)*distance-20+'px');
       spark.style.setProperty('--jg-spin',((i%2?1:-1)*240)+'deg');
       add(spark,710);
     }
   }
   emitted++;return true;
 }
 function bump(element){
   if(!element||reduced.matches)return false;
   element.classList.remove('jg-casual-bump');void element.offsetWidth;
   element.classList.add('jg-casual-bump');
   setTimeout(()=>element.classList.remove('jg-casual-bump'),280);
   return true;
 }
 return Object.freeze({emit,bump,destroy:()=>{for(const node of active)node.remove();active.clear();layer.remove()},stats:()=>({active:active.size,events:emitted})});
}
window.JaewoonCasualFX=Object.freeze({create,version:1});
})();
