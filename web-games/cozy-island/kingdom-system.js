// 포근섬 왕국 시스템
const api=window.cozyRTS;
const dialog=document.querySelector('#systemDialog');
const body=document.querySelector('#systemBody');

const tabs=document.querySelector('#systemTabs');
const SAVE='jaewoon-cozy:manual:',STORE='jaewoon-games:cozy-island',AUDIO='jaewoon-cozy:audio-settings';
const $=s=>body.querySelector(s);
let section='save',music=false,ctx,gain,beatIndex=0,beatTimer,warUntil=0;
let config={volume:0.25,track:0,voice:true};
try{Object.assign(config,JSON.parse(localStorage.getItem(AUDIO)||'{}'))}catch{}
const songNames=['왕국의 아침','황금 들판','숲의 노래','고요한 성채'];
const notes=[[60,64,67,64,62,65,69,65],[57,60,64,67,64,60,59,62],[62,65,69,72,69,65,64,67],[55,59,62,64,62,59,57,60]];
function initAudio(){
 if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;
  ctx=new A();gain=ctx.createGain();gain.gain.value=config.volume*.45;gain.connect(ctx.destination)}
 ctx.resume().catch(()=>{});return true;
}
function sound(n,time,duration=.65,type='sine'){
 if(!ctx||ctx.state!=='running')return;
 const o=ctx.createOscillator(),g=ctx.createGain();
 o.type=type;o.frequency.setValueAtTime(440*Math.pow(2,(n-69)/12),time);
 g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(.066,time+.04);
 g.gain.exponentialRampToValueAtTime(.0001,time+duration);
 o.connect(g).connect(gain);o.start(time);o.stop(time+duration+.03);
}
function drum(t){
 if(!ctx||ctx.state!=='running')return;
 const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
 o.frequency.setValueAtTime(115,t);o.frequency.exponentialRampToValueAtTime(43,t+.25);
 g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.0001,t+.33);
 o.connect(g).connect(gain);o.start(t);o.stop(t+.34);
}
function beat(){
 if(!music||ctx?.state!=='running')return;
 const t=ctx.currentTime+.02,a=notes[config.track]||notes[0];
 sound(a[beatIndex%a.length],t,.71);
 if(beatIndex%4===0){sound(a[0]-12,t,2.1,'triangle');sound(a[2]-12,t,2.1)}
 if(Date.now()<warUntil){drum(t);if(beatIndex%2===0)drum(t+.36)}
 beatIndex++;
}
window.addEventListener('cozy:war-event',e=>{
 warUntil=Date.now()+13000;
 if(music&&initAudio()){drum(ctx.currentTime+.02);drum(ctx.currentTime+.45)}
 if(config.voice&&'speechSynthesis'in window){
  try{const v=new SpeechSynthesisUtterance(String(e.detail?.title||'전투 개시').slice(0,70));
   v.lang='ko-KR';v.rate=1.05;v.volume=Math.min(1,config.volume*1.7);
   speechSynthesis.cancel();speechSynthesis.speak(v)}catch{}
 }
});
const button=(act,label,disabled=false)=>'<button class="ks-action" type="button" data-action="'+act+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
function audioSettings(){
 localStorage.setItem(AUDIO,JSON.stringify(config));
 if(gain)gain.gain.setTargetAtTime(config.volume*.45,ctx.currentTime,.06);
}
function message(s){const p=document.createElement('p');p.className='ks-note';p.textContent=s;body.prepend(p)}
function slot(n){try{return JSON.parse(localStorage.getItem(SAVE+n)||'null')}catch{return null}}
