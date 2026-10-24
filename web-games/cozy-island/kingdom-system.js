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

const locations=[
 ['내 왕국 · 푸른 평야',1010,1090],['철혈 영주 · 붉은 협곡',4550,850],
 ['석벽 영주 · 설산',4520,-2750],['황금 영주 · 황금 초원',-2450,-2650]
];
function render(){
 tabs.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('selected',x.dataset.tab===(section==='save'?'game':section)));
 if(section==='save'){
  body.innerHTML='<p class="ks-note">게임은 자동 저장됩니다. 별도 수동 슬롯 3개를 지원합니다.</p>'+
   [1,2,3].map(n=>{
    const s=slot(n);
    return '<div class="ks-row"><div><b>저장 슬롯 '+n+'</b><small>'+
     (s?.at?new Date(s.at).toLocaleString('ko-KR'):'비어 있음')+'</small></div>'+
     button('save:'+n,'💾 저장')+button('load:'+n,'📂 불러오기',!s)+'</div>';
   }).join('')+button('now','✔ 자동 저장')+
   '<p class="ks-note">저장 데이터는 현재 브라우저에만 보관됩니다.</p>';
 }
 if(section==='map'){
  body.innerHTML='<p class="ks-note">네 왕국은 서로 수천 칸 떨어져 있으며 초원·협곡·설산·황금 고원으로 나뉩니다.</p>'+
   '<div class="ks-mini-map"><span>🟡 황금</span><span>⚪ 석벽</span><span>🟢 내 성</span><span>🔴 철혈</span></div>'+
   locations.map(([name],i)=>'<div class="ks-row"><b>'+name+'</b>'+button('goto:'+i,'🗺️ 보기')+'</div>').join('');
 }
 if(section==='diplomacy'){
  body.innerHTML='<p class="ks-note">AI 영주와 동맹을 맺으면 침공하지 않고 자원을 지원합니다. 체결 비용은 금화 80입니다.</p>'+
   api.getLords().map(p=>{
    const ally=api.state.strongholdDiplomacy?.[p.id]==='ally';
    return '<div class="ks-row"><div><b>'+p.name+'</b><small>'+p.region+' · '+(p.defeated?'점령':ally?'동맹':'적대')+'</small></div>'+
     button('ally:'+p.id+':'+(ally?'hostile':'ally'),ally?'⚔️ 파기':'🤝 동맹',p.defeated||(!ally&&api.state.coins<80))+'</div>';
   }).join('');
 }
 if(section==='sound'){
  body.innerHTML='<p class="ks-note">자체 합성한 잔잔한 BGM 4곡. 전투 시 북소리·고동음과 한국어 이벤트 음성을 재생합니다.</p>'+
   button(music?'stop':'play',music?'⏹ 음악 정지':'▶ 음악 재생')+
   '<label class="ks-field">재생곡<select id="ks-track">'+songNames.map((name,i)=>'<option value="'+i+'" '+(config.track===i?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+
   '<label class="ks-field">음량 <output>'+Math.round(config.volume*100)+'%</output><input id="ks-volume" type="range" min="0" max="100" value="'+Math.round(config.volume*100)+'"></label>'+
   button('voice',config.voice?'🔊 이벤트 음성 켜짐':'🔇 이벤트 음성 꺼짐')+button('drum','🥁 북소리 듣기');
 }
 if(section==='multiplayer')renderMultiplayer();
}
document.querySelector('#systemCommand')?.addEventListener('click',()=>{section='save';render();dialog.showModal()});
document.querySelector('#systemClose')?.addEventListener('click',()=>dialog.close());
tabs?.addEventListener('click',e=>{
 const t=e.target.closest('[data-tab]')?.dataset.tab;
 if(t){section=t==='game'?'save':t;render()}
});
body.addEventListener('input',e=>{
 if(e.target.id==='ks-track'){config.track=Number(e.target.value)||0;beatIndex=0;audioSettings()}
 if(e.target.id==='ks-volume'){
  config.volume=Math.max(0,Math.min(1,Number(e.target.value)/100));
  body.querySelector('output').textContent=Math.round(config.volume*100)+'%';audioSettings();
 }
});

body.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el)return;
 const [op,id,value]=el.dataset.action.split(':');
 try{
  if(op==='save'){
   api.save();
   localStorage.setItem(SAVE+id,JSON.stringify({at:Date.now(),progress:JSON.parse(JSON.stringify(api.state))}));
   render();return;
  }
  if(op==='load'&&slot(id)&&confirm('현재 자동저장을 덮어쓰고 해당 슬롯을 불러올까요?')){
   const current=JSON.parse(localStorage.getItem(STORE)||'{}');
   localStorage.setItem(STORE,JSON.stringify({...current,progress:slot(id).progress,updatedAt:Date.now()}));
   location.reload();return;
  }
  if(op==='now'){api.save();message('현재 영지를 저장했습니다.');return}
  if(op==='goto'){const point=locations[Number(id)];if(point){api.center(point[1],point[2]);dialog.close()}return}
  if(op==='ally'){if(api.diplomacy(id,value))render();else message('금화 또는 외교 조건이 부족합니다.');return}
  if(op==='play'){
   if(initAudio()){music=true;if(!beatTimer)beatTimer=setInterval(beat,750);beat();render()}
   return;
  }
  if(op==='stop'){music=false;render();return}
  if(op==='voice'){config.voice=!config.voice;audioSettings();render();return}
  if(op==='drum'&&initAudio()){drum(ctx.currentTime+.02);drum(ctx.currentTime+.42);return}
  await peerAction(op,id,value);
 }catch(error){message('오류: '+String(error.message||error).slice(0,180))}
});
