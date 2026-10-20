// 파일명: web-games/ocean-voyage/main.mjs
// 임포트: 기존 게임과 분리된 항해 규칙 및 Three.js 장면
import {PORTS,GOODS,SAVE_KEY,newGame,loadGame,serializeGame,cargoWeight,canDock,nearestPort,priceAt,trade,buyUpgrade,contractOffer,takeContract,fulfillContracts,setDestination,cancelDestination,stepSea,fireCannons,CREW,EQUIPMENT,recruitCompanion} from './engine.mjs';
import {createOcean3D} from './ocean3d.mjs';
// 메인: 조작, 교역, 함대, 항구, 해도, 게임 저장
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ko-KR');
const view={head:$('panelTitle'),body:$('content'),details:$('details'),message:$('message'),loading:$('loading')};
let state=loadGame(localStorage),active='',last=performance.now(),tick=0,panelTick=0,ready=false;
let buttons={left:false,right:false,ahead:false,astern:false},keys=new Set(),stick={x:0,y:0};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const port=id=>PORTS.find(p=>p.id===id);
const good=id=>GOODS.find(g=>g.id===id);
function note(message){
 view.message.textContent=message;
 view.message.hidden=false;
 clearTimeout(note.timer);note.timer=setTimeout(()=>{view.message.hidden=true;},4600);
}
function save(){
 try{localStorage.setItem(SAVE_KEY,serializeGame(state));return true;}
 catch{note('저장 공간을 사용할 수 없어. 브라우저 설정을 확인해.');return false;}
}
const scene=createOcean3D($('sea'),{
 onReady(){ready=true;view.loading.classList.add('hide');scene.setState(state);note('범선 준비 완료. 런던 항구에서 동료를 만나고 플리머스로 항해하자.');},
 onError(msg){view.loading.querySelector('p').textContent=msg;note(msg);}
});
$('start').addEventListener('click',()=>{if(ready)view.loading.classList.add('hide');else note('실제 범선 모델 로딩 중이야.');});
function summary(){
 $('day').textContent=fmt(state.day)+'일';
 $('gold').textContent=fmt(state.coins)+' G';
 $('hull').textContent=fmt(state.ship.hull)+'%';
 $('supplies').textContent=state.ship.provisions+' / '+state.ship.crew;
 const closest=nearestPort(state),location=canDock(state);
 $('compass').textContent='◈ '+(location?location.name+' · 정박 가능':closest.port.region+' · '+Math.round(closest.d)+'해리')+(state.destination?' → '+port(state.destination).name:'');
 $('dock').disabled=!location;
 $('fire').disabled=state.ship.hull<=0||state.ship.cooldown>0;
}
function gotoPanel(name){
 active=active===name?'':name;
 if(typeof switchMusicScene==='function')switchMusicScene(['port','market','crew','fleet','quests'].includes(active)?'harbor':'sea');
 view.details.classList.toggle('open',!!active);
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.panel===active));
 if(active)renderPanel();
}
function travelCard(p){
 const reached=state.discovered.includes(p.id);
 const d=Math.round(Math.hypot(state.ship.x-p.x,state.ship.z-p.z));
 return '<div class="row"><div class="desc"><strong>'+(reached?'⚓ ':'◈ ')+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.region)+' · '+(reached?'발견':'미발견')+' · '+d+'해리</small></div><button class="action sub" data-route="'+p.id+'">항로 설정</button></div>';
}
function chart(){
 const x=v=>((v+210)/420*330+10).toFixed(1);
 const svg='<svg id="mapCanvas" viewBox="0 0 350 350" role="img" aria-label="항구와 현재 함선 위치가 표시된 세계 해도">'+
 '<defs><pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M 35 0 L 0 0 0 35" fill="none" stroke="#9ed1d0" stroke-opacity=".12"/></pattern></defs>'+
 '<rect width="350" height="350" fill="url(#grid)"/>'+
 PORTS.map(p=>'<g class="mapDot" data-route="'+p.id+'" tabindex="0" role="button" aria-label="'+escapeHtml(p.name)+' 항로 설정"><circle cx="'+x(p.x)+'" cy="'+x(p.z)+'" r="5" fill="'+(state.discovered.includes(p.id)?'#edc481':'#748b95')+'"/><text x="'+x(p.x)+'" y="'+(Number(x(p.z))-10)+'" text-anchor="middle">'+escapeHtml(p.name)+'</text></g>').join('')+
 '<circle cx="'+x(state.ship.x)+'" cy="'+x(state.ship.z)+'" r="4.7" fill="#85f2e7" stroke="#fff" stroke-width="1.5"/>'+
 '</svg>';
 return '<p class="info">항구를 누르면 자동항로가 설정돼. 바람과 장애물을 고려한 항로 탐색을 사용해. 좌우 조작을 하면 자동항로가 취소돼.</p>'+svg+
 '<div class="row"><strong>발견 항구 '+state.discovered.length+' / '+PORTS.length+'</strong><button data-action="cancel" class="action sub">항로 취소</button></div>'+
 PORTS.map(travelCard).join('');
}
function market(){
 const p=canDock(state);
 if(!p)return '<p class="info">항구 근처에서 ⚓ 입항을 눌러 교역소를 열어. 물품은 항구별로 가격이 다르고 시간이 흐르면 변해.</p>'+travelCard(nearestPort(state).port);
 return '<p class="info">'+escapeHtml(p.name)+' 시장 · 구매가는 판매가보다 높아. 항구를 오가며 시세 차익을 노려봐.</p>'+
 '<div class="kpi"><div>보유 금화<b>'+fmt(state.coins)+' G</b></div><div>화물 적재<b>'+cargoWeight(state)+' / '+(state.ship.cargoLimit*state.fleet)+'</b></div></div>'+
 GOODS.map(g=>'<div class="row"><div class="desc"><strong>'+escapeHtml(g.name)+' <span style="color:var(--sub);font-size:11px">×'+(state.cargo[g.id]||0)+'</span></strong><small>매입 '+priceAt(p.id,g.id,state.day,'buy')+' G / 매각 '+priceAt(p.id,g.id,state.day,'sell')+' G</small></div><div class="stack"><button class="action sub" data-trade="buy" data-good="'+g.id+'" data-count="1">+1</button><button class="action sub" data-trade="buy" data-good="'+g.id+'" data-count="5">+5</button><button class="action" data-trade="sell" data-good="'+g.id+'" data-count="1">-1</button><button class="action" data-trade="sell" data-good="'+g.id+'" data-count="5">-5</button></div></div>').join('');
}
function fleet(){
 const p=canDock(state),s=state.ship;
 const upgrades=[
  ['repair','선체 수리','선체 내구도 100까지 회복',Math.ceil((s.maxHull-s.hull)*8)],
  ['provisions','식량 보급','원거리 항해용 식량 +50',190],
  ['crew','선원 모집','포격 효율과 전투 유지력 증가',420],
  ['sail','돛 개선','이동 속도 향상',950+s.sail*700],
  ['cannon','함포 증설','한 번의 포격 위력 향상',780+s.cannons*85],
  ['ship','호위함 구매','최대 3척의 함대 편성',3300+(state.fleet-1)*2600]
 ];
 return '<div class="kpi"><div>함대 규모<b>'+state.fleet+'척</b></div><div>선체 상태<b>'+Math.round(s.hull)+'%</b></div><div>함포<b>'+s.cannons+'문</b></div><div>항해 속도<b>돛 '+s.sail+'단계</b></div></div>'+
 '<h3>조선소 / 보급소</h3><p class="info">'+(p?p.name+' 조선소':'항구에 정박하면 개조가 가능해.')+'</p>'+
 upgrades.map(([id,title,desc,cost])=>'<div class="row"><div class="desc"><strong>'+title+'</strong><small>'+desc+'</small></div><button class="action" data-upgrade="'+id+'" '+(!p?'disabled':'')+'>'+fmt(cost)+' G</button></div>').join('');
}
function quests(){
 const p=canDock(state),offer=p?contractOffer(state,p.id):null;
 return '<div class="kpi"><div>탐험 점수<b>'+fmt(state.score)+'</b></div><div>해적 격침<b>'+state.victories+'척</b></div></div>'+
 '<h3>항구 운송 계약</h3>'+
 (offer?'<p class="info">'+escapeHtml(good(offer.good).name)+' '+offer.count+'개를 '+escapeHtml(port(offer.target).name)+'에 납품하면 '+fmt(offer.reward)+' G를 받아.</p><button class="action" data-action="take">계약 수주</button> <button class="action sub" data-action="fulfill">계약 납품</button>':'<p class="info">항구에서 계약을 받아 교역품을 운송해.</p>')+
 '<h3>진행 중인 계약</h3>'+
 (state.quests.length?state.quests.map(q=>'<div class="row"><div class="desc"><strong>'+escapeHtml(port(q.target).name)+'</strong><small>'+escapeHtml(good(q.good).name)+' × '+q.count+' · 보상 '+fmt(q.reward)+' G</small></div><button class="action sub" data-route="'+q.target+'">항해</button></div>').join(''):'<p class="info">아직 수주한 계약이 없어.</p>')+
 '<h3>세력 신뢰</h3>'+Object.entries(state.reputation).map(([name,value])=>'<div class="row"><strong>'+escapeHtml(name)+'</strong><span>'+fmt(value)+'</span></div>').join('');
}
function journal(){
 return '<div class="kpi"><div>항해 날짜<b>'+fmt(state.day)+'일</b></div><div>발견 도시<b>'+state.discovered.length+'</b></div></div><h3>항해 기록</h3>'+
 [...state.log].reverse().map(t=>'<div class="row"><small>'+escapeHtml(t)+'</small></div>').join('')+
 '<h3>저장 관리</h3><p class="info">기존 다른 게임 데이터와 분리된 전용 저장 키를 사용해. 진행 기록은 자동 저장돼.</p>'+
 '<button class="action sub" data-action="save">지금 저장</button> <button class="action" data-action="reset">새 항해 시작</button>'+
 '<h3>외부 에셋 출처</h3><p class="info">Kenney Pirate Kit (CC0) · Three.js (MIT). 게임 캐릭터·스토리·지명은 독자 콘텐츠야.</p>';
}

const kennyMap='https://raw.githubusercontent.com/shorepine/kenney/3694c6879e487c108f55677be7dd2ca75b07cc3b/2d/Cartography%20Pack/';
const portrait=c=>{
 const index=Math.max(0,Math.min(26,Number(c.portrait)||0));
 const x=(index%9)*64,y=Math.floor(index/9)*64;
 return '<span class="cc0-portrait" aria-label="'+escapeHtml(c.name)+'의 CC0 초상화" role="img" style="background-size:576px 192px;background-position:-'+x+'px -'+y+'px"></span>';
};
function portScene(){
 const p=canDock(state),near=nearestPort(state);
 if(!p)return '<div class="scene-card"><h3>해안까지 항해하기</h3><p>가장 가까운 항구는 '+escapeHtml(near.port.name)+'이야. 해도에서 항로를 설정하고 조이스틱으로 접근해.</p><button class="action sub" data-route="'+near.port.id+'">항구로 자동항해</button></div>';
 const src=kennyMap+(p.id==='dawn'||p.id==='north'?'castle.png':p.id==='storm'?'lighthouse.png':'dock.png');
 return '<div class="scene-card port-scene"><img alt="Kenney CC0 항구 아이콘" src="'+src+'"><div><h3>'+escapeHtml(p.name)+'</h3><small>'+escapeHtml(p.region)+' · '+escapeHtml(p.faction)+'</small><p>1590년 · 이 항구의 사람들과 이야기하고 교역을 시작해.</p></div></div>'+
 '<div class="row"><div class="desc"><strong>교역소</strong><small>향신료와 곡물, 철광석 시세</small></div><button class="action" data-panel-open="market">교역</button></div>'+
 '<div class="row"><div class="desc"><strong>선술집 · 여관</strong><small>항구별 고유한 항해사 영입</small></div><button class="action" data-panel-open="crew">대화</button></div>'+
 '<div class="row"><div class="desc"><strong>조선소</strong><small>범선 수리 · 개조 · 호위함</small></div><button class="action" data-panel-open="fleet">이용</button></div>'+
 '<div class="row"><div class="desc"><strong>왕립 항해 의뢰</strong><small>운송 계약과 항해 보상</small></div><button class="action" data-panel-open="quests">계약</button></div>'+
 (p.id==='dawn'?'<div class="scene-card"><h3>제1장 · 여왕의 해도</h3><p>엘리너 그레이 선장은 런던 왕립항에서 출항 허가를 받았다. 첫 번째 목표는 플리머스의 교역망을 확보하는 것이다.</p><button class="action sub" data-route="coral">플리머스 항로 설정</button></div>':'');
}
function companions(){
 const home=canDock(state);
 return '<p class="info">각 지역의 항해사는 동일한 CC0 초상화 세트에서 지역별 색채와 얼굴이 다르게 표현돼.</p>'+
 CREW.filter(c=>state.crewRoster.includes(c.id)).map(c=>'<div class="crew-card">'+portrait(c)+'<div><div class="crew-name">'+escapeHtml(c.name)+' <span class="cargo-badge">'+escapeHtml(c.role)+'</span></div><div class="crew-detail">'+escapeHtml(c.nation)+' · 승선 중</div><p class="crew-lore">'+escapeHtml(c.story)+'</p></div></div>').join('')+
 '<h3>이 항구에서 만날 수 있는 인물</h3>'+
 (home?CREW.filter(c=>c.port===home.id&&!state.crewRoster.includes(c.id)).map(c=>'<div class="crew-card">'+portrait(c)+'<div><div class="crew-name">'+escapeHtml(c.name)+'</div><div class="crew-detail">'+escapeHtml(c.nation)+' · '+escapeHtml(c.role)+'</div><p class="crew-lore">'+escapeHtml(c.story)+'</p><button class="action" data-recruit="'+c.id+'">함대 영입</button></div></div>').join('')||'<p class="info">이곳에서 새로 영입할 동료는 없어.</p>':'<p class="info">항구에 정박하면 여관에서 항해사를 만날 수 있어.</p>');
}
function inventory(){
 return '<div class="kpi"><div>화물 적재<b>'+cargoWeight(state)+' / '+(state.ship.cargoLimit*state.fleet)+'</b></div><div>보유 금화<b>'+fmt(state.coins)+' G</b></div></div>'+
 '<h3>개인 장비 · 발견물</h3>'+
 EQUIPMENT.map(item=>'<div class="row"><div class="desc"><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.group)+' · '+escapeHtml(item.description)+'</small></div><strong class="cargo-badge">×'+Math.max(0,Number(state.equipment?.[item.id])||0)+'</strong></div>').join('')+
 '<h3>선박 화물창</h3>'+
 GOODS.map(item=>'<div class="row"><div class="desc"><strong>'+escapeHtml(item.name)+'</strong><small>단위 중량 '+item.weight+' · 항구에서 사고팔 수 있음</small></div><strong class="cargo-badge">×'+(state.cargo[item.id]||0)+'</strong></div>').join('')+
 '<h3>항해 보급품</h3><div class="row"><strong>식량</strong><b>'+state.ship.provisions+'</b></div><div class="row"><strong>선원</strong><b>'+state.ship.crew+'</b></div>';
}

function renderPanel(){
 if(!active)return;
 const titles={port:'항구 · 선술집 · 조선소',crew:'선장과 항해사',inventory:'항해 가방과 화물',chart:'세계 해도',market:'항구 교역소',fleet:'함대와 조선소',quests:'계약과 탐험',journal:'항해 기록'};
 view.head.textContent=titles[active];
 view.body.innerHTML=({port:portScene,crew:companions,inventory,chart,market,fleet,quests,journal}[active]||chart)();
}
function apply(result){
 if(result.ok){state=result.state;save();scene.setState(state);renderPanel();summary();}
 note(result.message);
}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>gotoPanel(b.dataset.panel)));
$('close').addEventListener('click',()=>gotoPanel(active));
$('dock').addEventListener('click',()=>{if(canDock(state)){active='port';view.details.classList.add('open');renderPanel();switchMusicScene('harbor');note(canDock(state).name+'에 입항했어.');}});
$('fire').addEventListener('click',()=>apply(fireCannons(state)));
view.body.addEventListener('click',e=>{
 const b=e.target.closest('[data-route],[data-trade],[data-upgrade],[data-action],[data-recruit],[data-panel-open]');
 if(!b)return;
 if(b.dataset.panelOpen){active=b.dataset.panelOpen;view.details.classList.add('open');renderPanel();return;}
 if(b.dataset.recruit){apply(recruitCompanion(state,b.dataset.recruit));return;}
 if(b.dataset.route){state=setDestination(state,b.dataset.route);save();scene.setState(state);summary();gotoPanel(active);note(port(b.dataset.route).name+'까지 자동항해 시작');return;}
 if(b.dataset.trade){apply(trade(state,canDock(state)?.id,b.dataset.good,Number(b.dataset.count),b.dataset.trade));return;}
 if(b.dataset.upgrade){apply(buyUpgrade(state,b.dataset.upgrade));return;}
 switch(b.dataset.action){
  case 'cancel':state=cancelDestination(state);save();scene.setState(state);renderPanel();note('자동항로 해제');break;
  case 'take':apply(takeContract(state,canDock(state)?.id));break;
  case 'fulfill':apply(fulfillContracts(state));break;
  case 'save':note(save()?'진행 상황을 저장했어.':'저장 실패');break;
  case 'reset':if(confirm('이 게임의 항해 기록만 지우고 처음부터 시작할까?')){state=newGame();save();scene.setState(state);renderPanel();summary();note('새 항해를 시작했어.');}break;
 }
});
view.body.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest('[data-route]'))e.target.closest('[data-route]').click();});
for(const b of document.querySelectorAll('[data-hold]')){
 const k=b.dataset.hold;
 const up=e=>{buttons[k]=false;b.classList.remove('pressed');if(e?.pointerId!==undefined&&b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);};
 b.addEventListener('pointerdown',e=>{e.preventDefault();buttons[k]=true;b.classList.add('pressed');b.setPointerCapture(e.pointerId);});
 b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',()=>{buttons[k]=false;b.classList.remove('pressed');});
}
document.addEventListener('keydown',e=>{
 if(e.repeat)return;
 const k=e.key.toLowerCase();
 if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown',' '].includes(k)){keys.add(k);e.preventDefault();}
 if(k===' '){apply(fireCannons(state));}
 if(k==='m'){gotoPanel('chart');}
 if(k==='e'&&canDock(state)){active='port';view.details.classList.add('open');renderPanel();}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();buttons={left:false,right:false,ahead:false,astern:false};stick={x:0,y:0};});
document.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});

const joystick=$('joystickRim'),knob=$('joystickHandle');
let pointer=null;
const resetStick=()=>{stick={x:0,y:0};knob.style.transform='translate(-50%,-50%)';};
function updateStick(e){
 const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 const radius=Math.max(1,(Math.min(r.width,r.height)-51)/2),dx=e.clientX-cx,dy=e.clientY-cy,length=Math.hypot(dx,dy);
 const scale=Math.min(1,length/radius)/(length||1),x=dx*scale,y=dy*scale;
 stick.x=Math.max(-1,Math.min(1,x/radius));stick.y=Math.max(-1,Math.min(1,-y/radius));
 knob.style.transform='translate(calc(-50% + '+(stick.x*radius)+'px),calc(-50% - '+(stick.y*radius)+'px))';
}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);updateStick(e);});
joystick.addEventListener('pointermove',e=>{if(pointer===e.pointerId){e.preventDefault();updateStick(e);}});
for(const k of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(k,()=>{pointer=null;resetStick();});
const music=$('sea-music'),musicToggle=$('music-toggle');
music.volume=.27;
const cc0Tracks={sea:'https://opengameart.org/sites/default/files/pirate_ship_in_game.ogg',harbor:'https://opengameart.org/sites/default/files/crowded_pub_2025.ogg'};
let currentMusicScene='sea';
function switchMusicScene(scene){
 if(!cc0Tracks[scene]||currentMusicScene===scene)return;
 const wasPlaying=!music.paused;
 currentMusicScene=scene;music.src=cc0Tracks[scene];music.load();
 if(wasPlaying)music.play().catch(()=>note('CC0 배경음악 로딩 실패'));
}
musicToggle.addEventListener('click',async()=>{
 if(music.paused){try{await music.play();musicToggle.innerHTML='<b>♫</b>켜짐';}catch{note('CC0 항해 음악을 불러올 수 없어. 네트워크를 확인해.');}}
 else{music.pause();musicToggle.innerHTML='<b>♫</b>음악';}
});

function run(now){
 requestAnimationFrame(run);
 const dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;
 if(!ready)return;
 if(view.details.classList.contains('open'))return;
 const left=buttons.left||keys.has('a')||keys.has('arrowleft');
 const right=buttons.right||keys.has('d')||keys.has('arrowright');
 const ahead=buttons.ahead||keys.has('w')||keys.has('arrowup');
 const astern=buttons.astern||keys.has('s')||keys.has('arrowdown');
 const turn=Math.max(-1,Math.min(1,Number(right)-Number(left)+stick.x));
 const throttle=Math.max(-1,Math.min(1,Number(ahead)-Number(astern)+stick.y));
 const manual=left||right||ahead||astern||Math.abs(stick.x)>.08||Math.abs(stick.y)>.08;
 if(manual&&state.destination){state=cancelDestination(state);}
 state=stepSea(state,{turn,throttle,manual},dt);
 scene.setState(state);
 tick+=dt;panelTick+=dt;
 if(tick>1){tick=0;summary();}
 if(panelTick>13){panelTick=0;save();}
 if(state.ship.hull<=0){
  note('선체가 파괴됐어. 항구에서 수리를 받거나 새 항해를 시작할 수 있어.');
  state.ship.hull=1;state.ship.x=0;state.ship.z=7;state.destination=null;state.route=[];state.coins=Math.max(200,state.coins-500);save();
 }
}
summary();requestAnimationFrame(run);
