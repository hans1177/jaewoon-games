// 왕국 시스템: 세이브·세력 지도·NPC 동맹·WebRTC 1:1·무료 WebAudio 중세 BGM
const game=window.cozyRTS,dialog=document.querySelector('#systemDialog');
const body=document.querySelector('#systemBody'),tabs=document.querySelector('#systemTabs');
if(!game||!dialog||!body||!tabs)throw new Error('포근섬 시스템이 초기화되지 않았습니다.');
const SAVE='jaewoon-cozy:manual:',STORE='jaewoon-games:cozy-island';
const AUDIO='jaewoon-cozy:audio-settings',get=(q)=>body.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(act,label,disabled=false)=>'<button type="button" class="ks-action" data-action="'+act+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
let section='save';
let settings={volume:.26,track:0,voice:true};
try{Object.assign(settings,JSON.parse(localStorage.getItem(AUDIO)||'{}'))}catch{}
const tracks=['🏞️ 왕국의 아침','🌾 황금 들판','🌲 숲의 노래','🌙 고요한 성채'];
const melodies=[
 [60,64,67,64,62,65,69,65,60,64,67,72,69,65,62,60],
 [57,60,64,67,64,60,59,62,57,64,69,67,65,62,60,57],
 [62,65,69,72,69,65,64,67,62,65,67,69,67,65,62,60],
 [55,59,62,64,62,59,57,60,55,59,62,67,62,60,59,55]
];
let audioCtx,master,music=false,index=0,musicLoop,warUntil=0;
function audioReady(){
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
 if(!audioCtx){
   audioCtx=new C();master=audioCtx.createGain();
   master.gain.value=settings.volume*.4;master.connect(audioCtx.destination);
 }
 audioCtx.resume().catch(()=>{});return true;
}
const hz=n=>440*2**((n-69)/12);
function tone(midi,now,dur=.74,type='sine',volume=.065){
 if(!audioCtx||audioCtx.state!=='running')return;
 const osc=audioCtx.createOscillator(),env=audioCtx.createGain();osc.type=type;
 osc.frequency.value=hz(midi);env.gain.setValueAtTime(.0001,now);
 env.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.05);
 env.gain.exponentialRampToValueAtTime(.0001,now+dur);
 osc.connect(env);env.connect(master);osc.start(now);osc.stop(now+dur+.03);
}
function drum(now){
 if(!audioCtx||audioCtx.state!=='running')return;
 const osc=audioCtx.createOscillator(),env=audioCtx.createGain();
 osc.type='sine';osc.frequency.setValueAtTime(115,now);
 osc.frequency.exponentialRampToValueAtTime(44,now+.28);
 env.gain.setValueAtTime(.22,now);env.gain.exponentialRampToValueAtTime(.0001,now+.37);
 osc.connect(env);env.connect(master);osc.start(now);osc.stop(now+.39);
}
function beat(){
 if(!music||!audioCtx||audioCtx.state!=='running')return;
 const now=audioCtx.currentTime+.05,melody=melodies[settings.track]||melodies[0];
 tone(melody[index%16],now,.8);
 if(index%4===0){tone(melody[0]-12,now,2.7,'triangle',.025);tone(melody[2]-12,now,2.7,'triangle',.02)}
 if(Date.now()<warUntil){drum(now);if(index%2===0)drum(now+.34)}
 index++;
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
 return '<p class="ks-note">자동저장이 켜져 있습니다. 수동 저장 슬롯 3개는 별도 보관되며 불러올 때 해당 저장으로 복귀합니다.</p>'+
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
 return '<p class="ks-note">동맹 체결에는 금화 80. AI 동맹은 우리 성을 공격하지 않고 8초마다 자원·세금을 지원합니다. 동맹은 언제든 해제할 수 있습니다.</p>'+
 game.getLords().map(l=>{
  const allied=game.state.strongholdDiplomacy?.[l.id]==='ally';
  return '<div class="ks-row"><div><b>'+esc(l.name)+'</b><small>'+esc(l.region)+' · '+(l.defeated?'함락':allied?'동맹':'적대')+'</small></div>'+
  btn('diplomacy:'+l.id+':'+(allied?'hostile':'ally'),allied?'⚔️ 해제':'🤝 체결',l.defeated||(!allied&&game.state.coins<80))+'</div>';
 }).join('');
}
function soundPanel(){
 return '<p class="ks-note">라이선스 문제 없는 자체 합성 BGM 4곡. 전투 시 북소리·고동음이 커지고 이벤트 음성 안내가 재생됩니다. 최초 재생은 버튼으로 시작합니다.</p>'+
 '<div class="ks-row"><b>🎵 배경음악</b>'+btn(music?'music-off':'music-on',music?'⏹ 끄기':'▶ 재생')+'</div>'+
 '<label class="ks-field">음악 곡 선택<select id="ks-track">'+tracks.map((x,i)=>'<option value="'+i+'" '+(settings.track===i?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
 '<label class="ks-field">음량 '+Math.round(settings.volume*100)+'%<input type="range" id="ks-volume" min="0" max="100" value="'+Math.round(settings.volume*100)+'"></label>'+
 '<div class="ks-row"><b>📣 이벤트 음성</b>'+btn('voice',settings.voice?'음성 켜짐':'음성 꺼짐')+'</div>'+
 btn('drum','🥁 전투 북소리 확인');
}
// 무료 GitHub Pages에서 사용 가능한 WebRTC, 수동 초대 코드. TURN/중앙 로비는 없음.
let peer,channel,role='',peerMode='duel',invite='',reply='',connection='연결 전';
const duel={mine:600,other:600,guards:0,archers:0,defending:false};
const clean=n=>Math.max(0,Math.min(600,Math.floor(Number(n)||0)));
function send(data){if(channel?.readyState==='open')channel.send(JSON.stringify({v:1,...data}))}
function liveUpdate(){if(dialog.open&&section==='multiplayer')render()}
function closePeer(){
 try{channel?.close()}catch{}
 try{peer?.close()}catch{}
 channel=null;peer=null;role='';invite='';reply='';connection='연결 전';
 duel.mine=600;duel.other=600;duel.guards=0;duel.archers=0;duel.defending=false;
}
function receive(raw){
 let data;try{data=JSON.parse(raw)}catch{return}
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
function link(channelObject){
 channel=channelObject;
 channel.onopen=()=>{connection='실시간 연결 완료';send({type:'sync',keep:duel.mine});liveUpdate()};
 channel.onclose=()=>{connection='연결 종료';liveUpdate()};
 channel.onerror=()=>{connection='전송 오류';liveUpdate()};
 channel.onmessage=e=>receive(e.data);
}
function rtc(){
 if(!window.RTCPeerConnection)throw Error('브라우저가 WebRTC를 지원하지 않습니다');
 peer=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
 peer.ondatachannel=e=>link(e.channel);
 peer.onconnectionstatechange=()=>{connection=peer.connectionState;liveUpdate()};
 return peer;
}
async function iceDone(){
 if(peer.iceGatheringState==='complete')return;
 await new Promise(resolve=>{
  const timeout=setTimeout(done,7500);
  function done(){clearTimeout(timeout);peer?.removeEventListener('icegatheringstatechange',check);resolve()}
  function check(){if(peer?.iceGatheringState==='complete')done()}
  peer.addEventListener('icegatheringstatechange',check);
 });
}
async function makeInvite(){
 closePeer();role='host';connection='방 코드 생성 중';
 const p=rtc();link(p.createDataChannel('cozy-1v1'));
 await p.setLocalDescription(await p.createOffer());await iceDone();
 invite=JSON.stringify({v:1,mode:'duel',desc:p.localDescription});
 connection='초대 코드를 복사해 상대에게 전달하세요';liveUpdate();
}
async function answerInvite(raw){
 const code=JSON.parse(raw);
 if(code.v!==1||code.desc?.type!=='offer')throw Error('초대 코드가 올바르지 않아요');
 closePeer();role='guest';connection='응답 코드 생성 중';
 const p=rtc();await p.setRemoteDescription(code.desc);
 await p.setLocalDescription(await p.createAnswer());await iceDone();
 reply=JSON.stringify({v:1,mode:'duel',desc:p.localDescription});
 connection='응답 코드를 방장에게 전달하세요';liveUpdate();
}
async function takeAnswer(raw){
 const code=JSON.parse(raw);
 if(!peer||role!=='host'||code.v!==1||code.desc?.type!=='answer')throw Error('먼저 방을 만든 후 올바른 응답 코드를 입력해');
 await peer.setRemoteDescription(code.desc);
 connection='연결 확인 중';liveUpdate();
}
function multiPanel(){
 const connected=channel?.readyState==='open',code=role==='host'?invite:reply;
 return '<p class="ks-note">🌐 <b>무료 WebRTC 1:1 시험 모드</b> · 별도 서버/회원가입 없이 초대 코드와 응답 코드로 연결합니다. NAT 환경에 따라 연결 불가할 수 있습니다. 현 단계는 병력 모집·성채 HP 공방을 동기화하며 전체 RTS 월드 동기화는 미구현입니다.</p>'+
 '<p class="ks-note">연결 상태: '+esc(connection)+'</p>'+
 '<div class="ks-buttons">'+btn('host','① 방 만들기')+btn('join','② 초대 수락')+
 btn('accept','③ 답변 등록')+btn('disconnect','✕ 종료')+'</div>'+
 '<label class="ks-field">내 코드<textarea id="ks-own-code" readonly>'+esc(code)+'</textarea></label>'+
 btn('copy','내 코드 복사',!code)+
 '<label class="ks-field">상대 코드<textarea id="ks-peer-code" placeholder="상대가 보내 준 코드를 붙여넣으세요"></textarea></label>'+
 (connected?'<div class="ks-row"><b>🏰 내 성채 '+duel.mine+'/600</b><b>상대 '+duel.other+'/600</b></div>'+
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
 if(e.target.id==='ks-track'){settings.track=Number(e.target.value)||0;index=0;saveAudio()}
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
  if(action==='save'){saveSlot(id);render()}
  else if(action==='load'){
   if(!getSlot(id))return;
   if(confirm('이 슬롯을 불러오면 현재 자동저장을 덮어씁니다. 계속할까요?'))loadSlot(id);
  }
  else if(action==='quick'){game.save();note('자동 저장 완료')}
  else if(action==='focus'){const r=realms[Number(id)];if(r){game.center(r.x,r.y);dialog.close()}}
  else if(action==='diplomacy'){if(game.diplomacy(id,opt))render();else note('외교 조건이 부족합니다')}
  else if(action==='music-on'){
   if(audioReady()){music=true;if(!musicLoop)musicLoop=setInterval(beat,750);beat();render()}
  }
  else if(action==='music-off'){music=false;render()}
  else if(action==='voice'){settings.voice=!settings.voice;saveAudio();render()}
  else if(action==='drum'){if(audioReady()){drum(audioCtx.currentTime+.02);drum(audioCtx.currentTime+.4)}}
  else if(action==='host'){await makeInvite()}
  else if(action==='join'){await answerInvite(get('#ks-peer-code')?.value||'')}
  else if(action==='accept'){await takeAnswer(get('#ks-peer-code')?.value||'')}
  else if(action==='disconnect'){closePeer();render()}
  else if(action==='copy'){await navigator.clipboard.writeText(get('#ks-own-code')?.value||'');note('초대 코드 복사 완료')}
  else if(action==='recruit'){
   if(channel?.readyState!=='open')return;
   const cost=id==='guard'?6:9,key=id==='guard'?'guards':'archers';
   if(duel.guards+duel.archers>=22||Number(game.state.inventory.food||0)<cost)return note('모집 한도 또는 식량 부족');
   game.state.inventory.food-=cost;duel[key]++;game.save();render();
  }
  else if(action==='strike'){
   if(channel?.readyState!=='open'||duel.mine<=0||duel.other<=0)return;
   send({type:'attack',guards:duel.guards,archers:duel.archers});
   duel.guards=0;duel.archers=0;
   window.dispatchEvent(new CustomEvent('cozy:war-event',{detail:{type:'battle',title:'1대1 성채 공격 개시'}}));
   render();
  }
  else if(action==='defend'){duel.defending=true;note('다음 공격의 피해를 줄입니다.')}
 }catch(error){note('실행 실패: '+String(error.message||error).slice(0,150))}
});
render();
