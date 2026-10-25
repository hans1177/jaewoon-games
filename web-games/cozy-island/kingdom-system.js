// 왕국 시스템: 세이브·세력 지도·NPC 동맹·WebRTC 1:1·무료 WebAudio 중세 BGM
const game=window.cozyRTS,dialog=document.querySelector('#systemDialog');
const body=document.querySelector('#systemBody'),tabs=document.querySelector('#systemTabs');
if(!game||!dialog||!body||!tabs)throw new Error('포근섬 시스템이 초기화되지 않았습니다.');
const SAVE='jaewoon-cozy:manual:',STORE='jaewoon-games:cozy-island';
const AUDIO='jaewoon-cozy:audio-settings',get=(q)=>body.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(act,label,disabled=false)=>'<button type="button" class="ks-action" data-action="'+act+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
let section='save';
let settings={volume:.34,track:0,voice:true};
try{Object.assign(settings,JSON.parse(localStorage.getItem(AUDIO)||'{}'))}catch{}
settings.track=Math.max(0,Math.min(3,Math.floor(Number(settings.track)||0)));
settings.volume=Math.max(0,Math.min(1,Number(settings.volume)||0));
// 음향: 4개의 독립 화성 진행·하프 아르페지오·저음·대선율을 합성한다.
const tracks=['🏰 성채의 새벽','🌾 행군의 노래','🍇 황금빛 저녁','⚔️ 왕국의 서약'];
const songs=[
 {bpm:84,keys:[48,45,41,43],mel:[72,74,76,79,76,74,72,69,72,74,76,74,69,67,69,72]},
 {bpm:106,keys:[50,45,46,48],mel:[74,77,79,81,79,77,76,74,72,74,77,79,81,77,76,74]},
 {bpm:76,keys:[57,53,55,52],mel:[81,79,76,77,79,81,84,81,79,77,76,74,76,77,74,72]},
 {bpm:98,keys:[50,46,43,45],mel:[74,77,79,81,79,77,74,72,86,84,81,79,77,79,81,74]}
];
let audioCtx,master,music=false,index=0,musicLoop,warUntil=0,nextBeatAt=0;
function audioReady(){
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
 if(!audioCtx){
   audioCtx=new C();
   const compressor=audioCtx.createDynamicsCompressor();
   compressor.threshold.value=-19;compressor.ratio.value=3;
   master=audioCtx.createGain();master.gain.value=settings.volume*.52;
   master.connect(compressor);compressor.connect(audioCtx.destination);
 }
 audioCtx.resume().catch(()=>{});return true;
}
const hz=n=>440*2**((n-69)/12);
function tone(midi,now,dur=.7,type='sine',volume=.06){
 if(!Number.isFinite(midi)||!audioCtx||audioCtx.state!=='running')return;
 const osc=audioCtx.createOscillator(),env=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
 osc.type=type;osc.frequency.setValueAtTime(hz(midi),now);
 filter.type='lowpass';filter.frequency.value=type==='triangle'?1800:2600;
 env.gain.setValueAtTime(.0001,now);
 env.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.035);
 env.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.35),now+dur*.6);
 env.gain.exponentialRampToValueAtTime(.0001,now+dur);
 osc.connect(filter);filter.connect(env);env.connect(master);osc.start(now);osc.stop(now+dur+.04);
}
function drum(now){
 if(!audioCtx||audioCtx.state!=='running')return;
 const osc=audioCtx.createOscillator(),env=audioCtx.createGain();osc.type='sine';
 osc.frequency.setValueAtTime(105,now);osc.frequency.exponentialRampToValueAtTime(45,now+.24);
 env.gain.setValueAtTime(.16,now);env.gain.exponentialRampToValueAtTime(.0001,now+.32);
 osc.connect(env);env.connect(master);osc.start(now);osc.stop(now+.34);
}
function beat(){
 if(!music||!audioCtx||audioCtx.state!=='running')return;
 const song=songs[settings.track]||songs[0],stepDur=30/song.bpm;
 if(!nextBeatAt||nextBeatAt<audioCtx.currentTime-.35)nextBeatAt=audioCtx.currentTime+.05;
 let scheduled=0;
 while(nextBeatAt<audioCtx.currentTime+.48&&scheduled++<5){
   const step=index%64,bar=Math.floor(step/16),tick=step%16;
   const root=song.keys[bar],chord=[root,root+4+(bar===2?1:0),root+7,root+12];
   if(tick%8===0){
     for(const note of chord.slice(1))tone(note+12,nextBeatAt,stepDur*7,'sine',.012);
     tone(root-12,nextBeatAt,stepDur*6,'triangle',.06);
   }
   if(tick%4===0&&tick%8!==0)tone(root-12,nextBeatAt,stepDur*3,'triangle',.039);
   if(step%2===0){
     tone(song.mel[(step/2)%16],nextBeatAt,stepDur*1.85,'sine',.047);
     tone(chord[(tick/2)%4]+24,nextBeatAt,stepDur*.9,'triangle',.018);
   }
   if(Date.now()<warUntil&&tick%4===0)drum(nextBeatAt);
   nextBeatAt+=stepDur;index++;
 }
}
function saveAudio(){
 if(master)master.gain.setTargetAtTime(settings.volume*.4,audioCtx.currentTime,.08);
 localStorage.setItem(AUDIO,JSON.stringify(settings));
}
function voice(text){
 if(!settings.voice||!('speechSynthesis' in window))return;
 try{
  const u=new SpeechSynthesisUtterance(text.slice(0,80));
  u.lang='ko-KR';u.rate=1.05;u.pitch=.86;u.volume=Math.max(.01,Math.min(1,settings.volume*1.8));
  speechSynthesis.cancel();speechSynthesis.speak(u);
 }catch{}
}
window.addEventListener('cozy:war-event',event=>{
 warUntil=Date.now()+15000;
 if(music&&audioReady()){drum(audioCtx.currentTime+.01);drum(audioCtx.currentTime+.42)}
 voice(String(event.detail?.title||'전투가 시작됐습니다'));
});
function note(text){
 const p=document.createElement('p');p.className='ks-note';p.textContent=text;body.prepend(p);
}
function getSlot(n){
 try{return JSON.parse(localStorage.getItem(SAVE+n)||'null')}catch{return null}
}
function saveSlot(n){
 game.save();
 localStorage.setItem(SAVE+n,JSON.stringify({
  version:1,at:Date.now(),progress:JSON.parse(JSON.stringify(game.state))
 }));
}
function loadSlot(n){
 const record=getSlot(n);if(!record?.progress)return;
 const old=JSON.parse(localStorage.getItem(STORE)||'{}');
 localStorage.setItem(STORE,JSON.stringify({...old,progress:record.progress,updatedAt:Date.now()}));
 location.reload();
}
function savePanel(){
 return '<div class="ks-navigation">'+btn('resume','▶ 계속하기')+btn('home','🏠 게임 목록')+btn('restart','↻ 새 게임')+'</div><p class="ks-note">자동저장이 켜져 있습니다. 수동 저장 슬롯 3개는 별도 보관되며 불러올 때 해당 저장으로 복귀합니다.</p>'+
 [1,2,3].map(n=>{
  const slot=getSlot(n);
  return '<div class="ks-row"><div><b>왕국 저장 '+n+'</b><small>'+esc(slot?new Date(slot.at).toLocaleString('ko-KR'):'저장 없음')+'</small></div>'+
   btn('save:'+n,'💾 저장')+btn('load:'+n,'📂 불러오기',!slot)+'</div>';
 }).join('')+btn('quick','✔ 지금 자동 저장')+'<p class="ks-note">저장소는 현재 브라우저에만 보관돼요. 다른 기기와 자동 동기화되지는 않습니다.</p>';
}
const realms=[
 {name:'내 성 · 푸른 평야',x:1010,y:1090,where:'중앙'},
 {name:'철혈 영주 · 붉은 협곡',x:4550,y:850,where:'동쪽'},
 {name:'석벽 영주 · 설산',x:4520,y:-2750,where:'북동쪽'},
 {name:'황금 영주 · 황금 초원',x:-2450,y:-2650,where:'북서쪽'}
];
function mapPanel(){
 return '<p class="ks-note">내 왕국 포함 총 네 성이 각 지형별로 분리된 대륙 지도입니다. 선택하면 해당 영지로 카메라가 이동합니다.</p>'+
 '<div class="ks-mini-map"><span class="ks-map-nw">🟡 황금</span><span class="ks-map-ne">⚪ 석벽</span><span class="ks-map-sw">🟢 내 성</span><span class="ks-map-se">🔴 철혈</span></div>'+
 realms.map((r,i)=>'<div class="ks-row"><div><b>'+r.name+'</b><small>'+r.where+'</small></div>'+btn('focus:'+i,'🗺️ 보기')+'</div>').join('');
}
function diplomacyPanel(){
 const court=game.getCourt?.()||{prisoners:[],heldByRivals:[],reputation:0};
 return '<p class="ks-note">동맹 체결 금화 80 · AI 왕국과 포로 교환·몸값 요구·교섭 거부 가능. 적대 영주는 자금·군사력·신뢰에 따라 제안을 거절할 수 있습니다.</p>'+
 game.getLords().map(l=>{
  const allied=game.state.strongholdDiplomacy?.[l.id]==='ally';
  const mine=court.prisoners.filter(p=>p.lordId===l.id),
        theirs=court.heldByRivals.filter(p=>p.lordId===l.id);
  return '<div class="ks-row"><div><b>'+esc(l.name)+'</b><small>'+esc(l.region)+' · '+
  (l.defeated?'함락':allied?'동맹':'적대')+' · 억류 '+mine.length+' · 우리 포로 '+theirs.length+
  '</small></div>'+
  btn('diplomacy:'+l.id+':'+(allied?'hostile':'ally'),allied?'⚔️ 해제':'🤝 체결',
    l.defeated||(!allied&&game.state.coins<80))+'</div>'+
  mine.map(p=>'<div class="ks-prison-row"><b>🔒 '+esc(p.heroName)+' · '+esc(l.name)+'</b>'+
    btn('prison:demand:'+p.id,'💰 몸값 요구')+
    btn('prison:exchange:'+p.id,'🤝 교환')+
    btn('prison:release:'+p.id,'🕊️ 석방')+
    btn('prison:execute:'+p.id,'⚔️ 처형')+'</div>').join('')+
  theirs.map(p=>'<div class="ks-prison-row"><b>⚠️ '+esc(p.heroName)+
    ' · 몸값 '+p.price+'금화'+(p.refused?' · 이전 요구 거부':'')+'</b>'+
    btn('prison:pay:'+p.id,'💰 지불',game.state.coins<p.price)+
    btn('prison:refuse:'+p.id,'⛔ 거부')+
    btn('prison:exchange:'+p.id,'🤝 교환 요청')+'</div>').join('');
 }).join('')+
 '<p class="ks-note">⚖️ 왕국 신뢰 '+court.reputation+' · 포로 '+court.prisoners.length+'/'+
 (game.courtCapacity?.()||0)+'명 · 최근 교섭 기록은 감옥에서 확인.</p>'+
 '<div class="ks-navigation">'+btn('open-knights','⚜️ 기사단 회관')+
 btn('open-prison','🔒 감옥 관리')+'</div>';
}
function soundPanel(){
 return '<p class="ks-note">중세 화음·하프·저음·선율이 겹치는 자체 합성 BGM 4곡. 전투 시 북소리와 이벤트 음성이 재생됩니다. 최초 재생은 버튼으로 시작합니다.</p>'+
 '<div class="ks-row"><b>🎵 배경음악</b>'+btn(music?'music-off':'music-on',music?'⏹ 끄기':'▶ 재생')+'</div>'+
 '<label class="ks-field">음악 곡 선택<select id="ks-track">'+tracks.map((x,i)=>'<option value="'+i+'" '+(settings.track===i?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
 '<label class="ks-field">음량 '+Math.round(settings.volume*100)+'%<input type="range" id="ks-volume" min="0" max="100" value="'+Math.round(settings.volume*100)+'"></label>'+
 '<div class="ks-row"><b>📣 이벤트 음성</b>'+btn('voice',settings.voice?'음성 켜짐':'음성 꺼짐')+'</div>'+
 btn('drum','🥁 전투 북소리 확인');
}
// 파일명: web-games/cozy-island/kingdom-system.js / 멀티
// 메인: 기존 1대1 성채 공방 규칙 그대로, 긴 WebRTC 응답 코드 대신 서버 숫자방을 사용한다.
let network=null,role='',peerMode='duel',invite='',connection='연결 전',roomCount=0;
const duel={mine:600,other:600,guards:0,archers:0,defending:false};
const clean=n=>Math.max(0,Math.min(600,Math.floor(Number(n)||0)));
const connected=()=>Boolean(network?.isRoomConnected());
function send(data){if(connected())network.sendEvent({action:'cozy-'+data.type,keep:data.keep,guards:data.guards,archers:data.archers})}
function liveUpdate(){if(dialog.open&&section==='multiplayer')render()}
async function multiplayer(){
 if(network)return network;
 const {JaewoonMultiplayerClient}=await import('../../multiplayer/multiplayer-client.js');
 network=new JaewoonMultiplayerClient();
 network.on('message_received',e=>{
  const message=e.detail||{};
  if(message.type==='connected'||message.type==='presence'){
   roomCount=(message.players||[]).length;
   connection='방 '+invite+' · '+roomCount+'/4명 접속';
   if(message.type==='connected')send({type:'sync',keep:duel.mine});
   liveUpdate();
  }else if(message.type==='event'&&String(message.action||'').startsWith('cozy-')&&message.userId!==network.currentUser?.id){
   receive({v:1,type:message.action.slice(5),keep:message.keep,guards:message.guards,archers:message.archers});
  }
 });
 network.on('websocket_disconnected',()=>{connection='연결 끊김 · 자동 재연결 중';liveUpdate()});
 return network;
}
async function closePeer(){
 const previous=network;
 network=null;role='';invite='';roomCount=0;connection='연결 전';
 await previous?.leaveGemRoom();
 duel.mine=600;duel.other=600;duel.guards=0;duel.archers=0;duel.defending=false;
 liveUpdate();
}
function receive(data){
 if(!data||data.v!==1||typeof data.type!=='string')return;
 if(data.type==='sync'){duel.other=clean(data.keep);liveUpdate();return}
 if(data.type==='attack'&&peerMode==='duel'){
  const count=Math.min(12,Math.max(0,Math.floor(Number(data.guards)||0)));
  const arch=Math.min(10,Math.max(0,Math.floor(Number(data.archers)||0)));
  const loss=Math.round((count*12+arch*19)*(duel.defending?.58:1));
  duel.defending=false;duel.mine=Math.max(0,duel.mine-loss);
  send({type:'sync',keep:duel.mine});liveUpdate();
  window.dispatchEvent(new CustomEvent('cozy:war-event',{detail:{
   type:duel.mine<=0?'defeat':'attack',title:duel.mine<=0?'대전 성채 함락':'상대가 성을 공격했습니다'}}));
 }
}
async function makeInvite(){
 const client=await multiplayer();
 connection='숫자방 만드는 중…';liveUpdate();
 const result=await client.createNumberRoomForGame('cozy-island');
 if(!result.ok){connection='방 생성 실패 · '+(result.data?.error||'서버 연결 확인');liveUpdate();return}
 role='host';invite=String(result.data.inviteCode);roomCount=1;
 connection='방 번호 '+invite+' · 친구 접속 대기';liveUpdate();
}
async function answerInvite(raw){
 const code=String(raw||'').trim();
 if(!/^[0-9]$/.test(code))throw Error('방 번호는 0~9 한 자리 숫자야');
 const client=await multiplayer();
 connection='방 '+code+' 참가 중…';liveUpdate();
 const result=await client.joinNumberRoomForGame('cozy-island',code);
 if(!result.ok){connection='참가 실패 · '+(result.data?.error||'방 번호 확인');liveUpdate();return}
 role='guest';invite=code;roomCount=result.data.players;
 connection='방 번호 '+code+' · 접속 중';liveUpdate();
}
function multiPanel(){
 return '<p class="ks-note">이메일·긴 초대코드 없이 방 만들기 또는 숫자 0~9로 참가해. 기존 성채 공방은 연결된 상대와 진행해. 왕국 전체 동기화는 아직 지원하지 않아.</p>'+
 '<p class="ks-note">연결 상태: '+esc(connection)+'</p>'+
 '<div class="ks-buttons">'+btn('host','방 만들기')+btn('join','방 참가')+btn('disconnect','나가기')+'</div>'+
 '<label class="ks-field">방 번호 <input id="ks-room-number" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" placeholder="0~9" value="'+esc(invite)+'"></label>'+
 (connected()?'<div class="ks-row"><b>🏰 내 성채 '+duel.mine+'/600</b><b>상대 '+duel.other+'/600</b></div>'+
 '<div class="ks-row"><b>⚔️ 보병 '+duel.guards+' · 궁수 '+duel.archers+'</b></div>'+
 '<div class="ks-buttons">'+btn('recruit:guard','⚔️ 보병 징집 (식량 6)')+
 btn('recruit:archer','🏹 궁수 징집 (식량 9)')+btn('strike','⚔️ 출병')+
 btn('defend','🛡️ 성 방어')+'</div>':'');
}
function render(){
 tabs.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===section));
 body.innerHTML=section==='game'?savePanel():section==='map'?mapPanel():
 section==='diplomacy'?diplomacyPanel():section==='sound'?soundPanel():multiPanel();
}
document.querySelector('#systemCommand')?.addEventListener('click',()=>{section='game';render();dialog.showModal()});
document.querySelector('#systemClose')?.addEventListener('click',()=>dialog.close());
tabs.addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t){section=t.dataset.tab;render()}});
body.addEventListener('change',e=>{
 if(e.target.id==='ks-track'){settings.track=Number(e.target.value)||0;index=0;nextBeatAt=0;saveAudio();beat()}
});
body.addEventListener('input',e=>{
 if(e.target.id==='ks-volume'){
  settings.volume=Math.max(0,Math.min(1,Number(e.target.value)/100));saveAudio();
  e.target.closest('label').childNodes[0].textContent='음량 '+Math.round(settings.volume*100)+'%';
 }
});
body.addEventListener('click',async e=>{
 const target=e.target.closest('[data-action]');if(!target)return;
 const [action,id,opt]=target.dataset.action.split(':');
 try{
  if(action==='resume'){dialog.close()}
  else if(action==='home'){game.save();location.assign(new URL('../../',location.href).href)}
  else if(action==='restart'){
    if(confirm('자동저장을 초기화하고 새 왕국을 시작할까요? 수동 저장 3칸은 남습니다.')){
      sessionStorage.setItem('cozy-island:new-game','1');location.reload();
    }
  }
  else if(action==='save'){saveSlot(id);render()}
  else if(action==='load'){
   if(!getSlot(id))return;
   if(confirm('이 슬롯을 불러오면 현재 자동저장을 덮어씁니다. 계속할까요?'))loadSlot(id);
  }
  else if(action==='quick'){game.save();note('자동 저장 완료')}
  else if(action==='focus'){const r=realms[Number(id)];if(r){game.center(r.x,r.y);dialog.close()}}
  else if(action==='diplomacy'){if(game.diplomacy(id,opt))render();else note('외교 조건이 부족합니다')}
  else if(action==='prison'){
    const result=game.prisonAction?.(id,opt)||{ok:false,message:'감옥 기능 없음'};
    render();note(result.message);
  }
  else if(action==='open-knights'){dialog.close();game.openKnightHall?.()}
  else if(action==='open-prison'){dialog.close();game.openPrison?.()}
  else if(action==='music-on'){
   if(audioReady()){music=true;nextBeatAt=0;if(!musicLoop)musicLoop=setInterval(beat,180);beat();render()}
  }
  else if(action==='music-off'){music=false;nextBeatAt=0;render()}
  else if(action==='voice'){settings.voice=!settings.voice;saveAudio();render()}
  else if(action==='drum'){if(audioReady()){drum(audioCtx.currentTime+.02);drum(audioCtx.currentTime+.4)}}
  else if(action==='host'){await makeInvite()}
  else if(action==='join'){await answerInvite(get('#ks-room-number')?.value||'')}
  else if(action==='disconnect'){await closePeer();render()}
  else if(action==='recruit'){
   if(!connected())return;
   const cost=id==='guard'?6:9,key=id==='guard'?'guards':'archers';
   if(duel.guards+duel.archers>=22||Number(game.state.inventory.food||0)<cost)return note('모집 한도 또는 식량 부족');
   game.state.inventory.food-=cost;duel[key]++;game.save();render();
  }
  else if(action==='strike'){
   if(!connected()||duel.mine<=0||duel.other<=0)return;
   send({type:'attack',guards:duel.guards,archers:duel.archers});
   duel.guards=0;duel.archers=0;
   window.dispatchEvent(new CustomEvent('cozy:war-event',{detail:{type:'battle',title:'1대1 성채 공격 개시'}}));
   render();
  }
  else if(action==='defend'){duel.defending=true;note('다음 공격의 피해를 줄입니다.')}
 }catch(error){note('실행 실패: '+String(error.message||error).slice(0,150))}
});
render();
