// 파일명: web-games/ocean-voyage/main.mjs
// 임포트: 기존 게임과 분리된 항해 규칙 및 Three.js 장면
import {PORTS,GOODS,SAVE_KEY,newGame,loadGame,serializeGame,cargoWeight,canDock,nearestPort,priceAt,trade,buyUpgrade,contractOffer,takeContract,fulfillContracts,setDestination,cancelDestination,stepSea,fireCannons,CREW,EQUIPMENT,recruitCompanion,CAPTAINS,JOBS,SHIP_TYPES,SITES,OFFICE_QUESTS,SEA_EVENTS,companionObjective,changeJob,refitShip,startExpedition,exploreChoice,reportDiscoveries,officeProgress,officeContract,storyStatus,advanceStory,royalAudience,resolveSeaEvent,exportSave,importSave,TREASURES,takeTreasureClue,searchTreasure,rumorsAt,CONSUMABLES,buyConsumable,useConsumable,declareHostility,negotiatePeace,WEATHER,portStatus,investPort,collectDividend,supportPort,formAlliance,callAlliance,CREW_ROLES,crewStats,assignCrew,RECRUIT_STORIES,talkCompanion,landSkill,landAction,landEnemyTurn,finishLandBattle,CANNON_TYPES,buyCannon,LAND_EVENTS,resolveLandEvent,SAIL_EQUIPMENT,FIGUREHEADS,SPECIAL_DOCKS,buyShipEquipment,refineShip,TAVERN_HOSTS,GIFTS,relationStatus,talkContact,giveGift,premiumInformation,expressBond,benchCompanion} from './engine.mjs';
import {createOceanView,drawGeography,drawFog} from './ocean3d.mjs';
// 메인: 조작, 교역, 함대, 항구, 해도, 게임 저장
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ko-KR');
const view={head:$('panelTitle'),body:$('content'),details:$('details'),message:$('message'),loading:$('loading')};
let state=loadGame(localStorage),active='',town=false,choosing=false,battleTarget=0,enemyTimer=null,last=performance.now(),tick=0,panelTick=0,ready=false;
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
const scene=createOceanView($('sea'),{
 onReady(){ready=true;scene.setState(state);if(state.heroChosen){if(state.landBattle)enterBattle();view.loading.classList.add('hide');note('항구 아이콘을 누르면 항로를 정할 수 있어. 입항 후에는 마을을 걸으며 시설을 골라.');}else showCaptains();},
 onBuilding(id){openFacility(id);},onPort(id){if(!active&&!town){state=setDestination(state,id);save();scene.setState(state);note(port(id).name+' 항로를 설정했어.');}},
 onError(msg){view.loading.querySelector('p').textContent=msg;note(msg);}
});
$('start').addEventListener('click',()=>{if(ready)showCaptains();});
function summary(){
 $('day').textContent=fmt(state.day)+'일';
 $('gold').textContent=fmt(state.coins)+' G';
 $('hull').textContent=fmt(state.ship.hull/state.ship.maxHull*100)+'%';
 $('supplies').textContent=state.ship.provisions+' / '+state.ship.crew;
 const closest=nearestPort(state),location=canDock(state);
 $('compass').textContent=(WEATHER.find(w=>w.id===state.climate.kind)?.name||'맑음')+' · ◈ '+(location?location.name+' · 정박 가능':closest.port.region+' · '+Math.round(closest.d)+'해도 거리')+(state.destination?' → '+port(state.destination).name:state.exploreTarget?' · 직접 탐색 → '+port(state.exploreTarget).name:'');
 $('dock').disabled=!location;const enemy=state.pirates.filter(e=>e.hull>0&&(!e.neutral||state.diplomacy[e.faction]<0)).map(e=>({...e,d:Math.hypot(e.x-state.ship.x,e.z-state.ship.z)})).filter(e=>e.d<45).sort((a,b)=>a.d-b.d)[0];$('battleStatus').hidden=!enemy;if(enemy)$('battleStatus').textContent=(enemy.name||'해적선')+' · 적 선체 '+Math.round(enemy.hull)+'/'+enemy.maxHull+' · 거리 '+Math.round(enemy.d)+' · 포탄 '+state.supplies.ammo;$('foodStatus').textContent='식량 '+state.ship.provisions+' · 선원 '+state.ship.crew+' · 포탄 '+state.supplies.ammo;
 $('fire').disabled=state.ship.hull<=0||state.ship.cooldown>0;
}
function gotoPanel(name){if(state.landBattle){enterBattle();return;}
 if(name==='port'){if(canDock(state)){enterTown();return;}name='chart';}
 if(town&&['market','fleet','crew','quests','palace','jobs'].includes(name)){openFacility(name);return;}
 active=active===name?'':name;
 view.details.classList.toggle('open',!!active);
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.panel===active));
 if(active)renderPanel();
}
function enterTown(){if(state.landBattle){enterBattle();return;}town=true;active='';view.details.classList.remove('open');document.body.classList.add('in-town');scene.setMode('town');switchMusicScene('harbor');$('townbar').hidden=false;$('townTitle').textContent=canDock(state)?.name||'항구';save();note('건물을 눌러 시설에 들어가. 아래 출항으로 바다에 돌아갈 수 있어.');}
function openFacility(id){if(!canDock(state)){note('먼저 항구에 입항해.');return;}town=true;active=id;document.body.classList.add('in-town');$('townbar').hidden=false;scene.setMode('town',id);view.details.classList.add('open');switchMusicScene(id==='palace'?'palace':id==='quests'?'explore':'harbor');renderPanel();}
function leaveFacility(){if(state.landBattle){note('전투 행동이나 퇴각을 선택해.');return;}active='';view.details.classList.remove('open');scene.setMode(town?'town':'sea');if(town)switchMusicScene('harbor');}
function depart(){if(state.landBattle){enterBattle();return;}town=false;active='';view.details.classList.remove('open');document.body.classList.remove('in-town');$('townbar').hidden=true;scene.setMode('sea');switchMusicScene('sea');save();}
function showCaptains(){choosing=true;view.loading.classList.add('hide');$('captains').hidden=false;$('captainCards').innerHTML=CAPTAINS.map(c=>'<article class="hero-card"><div class="hero-face" style="background-position:'+c.face*25+'% center"></div><div><small>'+c.region+' · '+c.nation+' · '+(c.origin?c.origin+' 출신 → ':'')+port(c.port).name+' 본편 시작</small><h2>'+c.name+'</h2><p>'+c.goal+'</p><p class="info">'+c.intro+'</p><button class="action" data-captain="'+c.id+'">이 인물로 항해</button></div></article>').join('');}
$('captainCards').addEventListener('click',e=>{const b=e.target.closest('[data-captain]');if(!b)return;state=newGame(b.dataset.captain);state.heroChosen=true;choosing=false;$('captains').hidden=true;save();scene.setState(state);summary();enterTown();});
$('depart').addEventListener('click',depart);$('townJournal').addEventListener('click',()=>{active='journal';view.details.classList.add('open');renderPanel();});$('townBack').addEventListener('click',leaveFacility);

function travelCard(p){
 const reached=state.discovered.includes(p.id);
 const d=Math.round(Math.hypot(state.ship.x-p.x,state.ship.z-p.z));
 return '<div class="row"><div class="desc"><strong>'+(reached?'⚓ ':'◈ ')+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.region)+' · '+(reached?'발견':'미발견')+' · '+d+'해리</small></div><button class="action sub" data-route="'+p.id+'">'+(reached?'개척 항로 자동항해':'미개척 경계까지')+'</button></div>';
}
function chart(){
 return '<p class="info">개척 해역은 자동항해하고, 미개척 구간은 직접 조타해. 미개척 목적지는 밝혀진 바다의 끝에서 자동으로 멈춰. 실제 지형 해도야. 1차 유럽 항구 13곳이 연결돼. 어두운 미개척 해역은 직접 지나가면 영구적으로 밝혀져. 다른 대륙은 주인공 출신 배경이며 상세 플레이는 추후 확장돼. 자동항해는 육지를 피해 가며, 먼 항로는 2·4배속을 사용할 수 있어. 긴 항로에는 보급이 필요해.</p><canvas id="chartMap" width="640" height="400" aria-label="실제 유럽 및 세계 해안선"></canvas><div class="stack"><button class="action sub" data-map="europe">유럽·국가 지도</button><button class="action sub" data-map="world">세계 위치 보기</button></div><h3>보물 수색</h3>'+TREASURES.map(t=>'<div class="scene-card"><strong>'+t.name+'</strong><p>'+(!state.treasureClues.includes(t.id)?'선술집에서 해도 단서를 구해.':t.clue)+'</p><button class="action" data-search="'+t.id+'" '+(!state.treasureClues.includes(t.id)||state.treasures.includes(t.id)?'disabled':'')+'>'+ (state.treasures.includes(t.id)?'발견 완료':'이 위치에서 수색')+'</button></div>').join('')+'<button class="action sub" data-action="cancel">항로 취소</button>'+PORTS.map(travelCard).join('');
}
function drawChart(world=false){const c=$('chartMap');if(!c)return;const ctx=c.getContext('2d'),cx=world?300:75,cz=world?-210:-550,scale=world?.22:1.1;drawGeography(ctx,640,400,cx,cz,scale);drawFog(ctx,640,400,cx,cz,scale,state.charted);const x=v=>320+(v-cx)*scale,y=v=>200+(v-cz)*scale;ctx.font='bold 13px sans-serif';for(const p of PORTS){ctx.fillStyle=state.discovered.includes(p.id)?'#ffd994':'#a5b8ac';ctx.fillRect(x(p.x)-3,y(p.z)-3,6,6);ctx.fillStyle=state.discovered.includes(p.id)?'#fff3c9':'#7e8c98';ctx.fillText(p.name,x(p.x)+5,y(p.z)-5);}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x(state.ship.x),y(state.ship.z),4,0,Math.PI*2);ctx.fill();for(const t of TREASURES.filter(t=>state.treasureClues.includes(t.id)&&!state.treasures.includes(t.id))){ctx.fillStyle='#f0a276';ctx.fillText('×',x(t.x),y(t.z));}}

function market(){
 const p=canDock(state);
 if(!p)return '<p class="info">항구 근처에서 ⚓ 입항을 눌러 교역소를 열어. 물품은 항구별로 가격이 다르고 시간이 흐르면 변해.</p>'+travelCard(nearestPort(state).port);
 return '<h3>'+escapeHtml(p.name)+' 특산품: '+GOODS.filter(g=>g.ports?.includes(p.id)).map(g=>g.name).join(' · ')+'</h3><p class="info">'+escapeHtml(p.name)+' 시장 · 구매가는 판매가보다 높아. 항구를 오가며 시세 차익을 노려봐.</p>'+
 '<div class="kpi"><div>보유 금화<b>'+fmt(state.coins)+' G</b></div><div>화물 적재<b>'+cargoWeight(state)+' / '+(state.ship.cargoLimit*state.fleet)+'</b></div></div>'+
 GOODS.map(g=>'<div class="row"><div class="desc"><strong>'+(g.ports?.includes(p.id)?'특산 · ':'')+escapeHtml(g.name)+' <span style="color:var(--sub);font-size:11px">×'+(state.cargo[g.id]||0)+'</span></strong><small>매입 '+priceAt(p.id,g.id,state.day,'buy')+' G / 매각 '+priceAt(p.id,g.id,state.day,'sell')+' G · 최고 매각 '+bestSale(g.id)+'</small></div><div class="stack"><button class="action sub" data-trade="buy" data-good="'+g.id+'" data-count="1">+1</button><button class="action sub" data-trade="buy" data-good="'+g.id+'" data-count="5">+5</button><button class="action" data-trade="sell" data-good="'+g.id+'" data-count="1">-1</button><button class="action" data-trade="sell" data-good="'+g.id+'" data-count="5">-5</button></div></div>').join('');
}
function consumables(buy){return CONSUMABLES.map(c=>'<div class="row"><div class="desc"><strong>'+c.name+' ×'+state.supplies[c.id]+'</strong><small>'+c.description+'</small></div><div class="stack">'+(buy?'<button class="action sub" data-buy-supply="'+c.id+'">'+(state.job==='merchant'?Math.ceil(c.cost*.9):c.cost)+' G 구매</button>':'')+(c.id!=='ammo'?'<button class="action" data-use-supply="'+c.id+'" '+(!state.supplies[c.id]?'disabled':'')+'>사용</button>':'')+'</div></div>').join('');}
function bestSale(id){const best=PORTS.reduce((a,b)=>priceAt(a.id,id,state.day,'sell')>priceAt(b.id,id,state.day,'sell')?a:b);return escapeHtml(best.name)+' '+priceAt(best.id,id,state.day,'sell')+' G';}
let fleetTab='ships';
function fleet(){
 const p=canDock(state),s=state.ship,type=SHIP_TYPES.find(t=>t.id===state.shipType),gun=CANNON_TYPES.find(g=>g.id===s.cannonType)||CANNON_TYPES[0];
 const upgrades=[['repair','선체 수리','내구 '+s.maxHull+'까지 회복',Math.ceil((s.maxHull-s.hull)*8)],['provisions','식량 보급','항해 식량 +50',190],['crew','선원 모집','선원 +12 · 최대 '+s.maxCrew,420],['sail','돛 개선','기초 항속 향상 · 최대 4단계',950+s.sail*700],['cannon','포문 증설','포문 +2 · 기본 개조 최대 16문',780+s.cannons*85],['ship','호위함 구매','최대 3척의 함대 편성',3300+(state.fleet-1)*2600],['plating','장갑 보강','기초 3단계 · 단계당 피격 피해 8% 감소',1500+s.armor*1200],['hold','화물실 확장','3단계 · 단계당 적재 +18',1300+s.holdLevel*900],['rudder','타륜 개조','3단계 · 단계당 직접 선회 +15%',1200+s.rudderLevel*700],['hull','선체 보강','3단계 · 단계당 최대 내구 +30',1800+s.hullLevel*1400]];
 let body='';
 if(fleetTab==='ships')body='<h3>기함 교체 · 국가별 설계</h3><p class="info">전용 선박은 해당 국가의 항구 조선소에서 구입해. 개조와 장착 장비는 보존돼.</p>'+SHIP_TYPES.map(t=>'<div class="scene-card"><strong>'+t.name+(t.id===state.shipType?' · 운용 중':'')+'</strong><p>'+t.description+'</p><small>'+(t.nation||'범용 설계')+' · 적재 '+t.cargo+' · 내구 '+t.hull+' · 항속 ×'+(t.speed||1)+' · 선회 ×'+(t.turn||1)+'</small><br><button class="action" data-refit="'+t.id+'" '+(!p||t.id===state.shipType||t.nation&&p.faction!==t.nation?'disabled':'')+'>'+fmt(t.cost)+' G · 기함 교체</button></div>').join('');
 if(fleetTab==='upgrades')body='<h3>선체·돛·포문 개조</h3>'+upgrades.slice(3).map(([id,title,desc,cost])=>'<div class="row"><div class="desc"><strong>'+title+'</strong><small>'+desc+'</small></div><button class="action" data-upgrade="'+id+'" '+(!p?'disabled':'')+'>'+fmt(cost)+' G</button></div>').join('')+'<h3>이 도시의 특수 조선 기술</h3>'+(SPECIAL_DOCKS.filter(d=>d.port===p?.id).map(d=>'<div class="scene-card"><strong>'+d.name+'</strong><p>'+d.description+'</p><button class="action" data-refine="'+d.id+'" '+(s.regionalMods.includes(d.id)?'disabled':'')+'>'+(s.regionalMods.includes(d.id)?'적용 완료':fmt(d.cost)+' G 개조')+'</button></div>').join('')||'<p class="info">이곳에는 표준 개조 시설이 있어. 다른 도시의 특수 기술은 선술집에서 정보를 얻어.</p>')+'<p class="info">보유 특수 개조: '+(s.regionalMods.map(id=>SPECIAL_DOCKS.find(d=>d.id===id)?.name).join(' · ')||'없음')+'</p>';
 if(fleetTab==='gear')body='<h3>이 도시의 돛·선수상</h3>'+[['sail',SAIL_EQUIPMENT],['figurehead',FIGUREHEADS]].map(([slot,list])=>list.filter(g=>!g.port||g.port===p?.id||g.id===s.gear[slot]).map(g=>'<div class="scene-card"><strong>'+g.name+(s.gear[slot]===g.id?' · 장착 중':'')+'</strong><p>'+g.description+(g.port?' · '+port(g.port).name+' 전용':'')+'</p><button class="action" data-ship-gear="'+g.id+'" data-gear-slot="'+slot+'" '+(!p||g.port&&p.id!==g.port||s.gear[slot]===g.id?'disabled':'')+'>'+fmt(g.cost)+' G 장착</button></div>').join('')).join('')+'<h3>함포 형식 교체</h3>'+CANNON_TYPES.map(g=>'<div class="scene-card"><strong>'+g.name+(s.cannonType===g.id?' · 장착 중':'')+'</strong><p>'+g.description+'</p><small>위력 ×'+g.power+' · 사거리 '+g.range+' · 장전 '+g.reload+'초 · 탄속 '+g.speed+'</small><br><button class="action" data-cannon="'+g.id+'" '+(!p||s.cannonType===g.id?'disabled':'')+'>'+fmt(g.cost)+' G 교체</button></div>').join('');
 if(fleetTab==='supplies')body='<h3>수리와 항해 보급</h3>'+upgrades.slice(0,3).map(([id,title,desc,cost])=>'<div class="row"><div class="desc"><strong>'+title+'</strong><small>'+desc+'</small></div><button class="action" data-upgrade="'+id+'" '+(!p?'disabled':'')+'>'+fmt(cost)+' G</button></div>').join('')+'<h3>소모품 구매·사용</h3>'+consumables(true);
 return '<h3>'+type.name+' · '+(p?p.name+' 조선소':'바다 위 선박 정보')+'</h3><div class="kpi"><div>선체<b>'+Math.round(s.hull)+' / '+s.maxHull+'</b></div><div>함대·적재<b>'+state.fleet+'척 · '+cargoWeight(state)+' / '+s.cargoLimit*state.fleet+'</b></div><div>포문·함포<b>'+s.cannons+'문 · '+gun.name+'</b></div><div>장착 장비<b style="font-size:12px">'+SAIL_EQUIPMENT.find(g=>g.id===s.gear.sail).name+'<br>'+FIGUREHEADS.find(g=>g.id===s.gear.figurehead).name+'</b></div></div><div class="ship-tabs">'+[['ships','선박'],['upgrades','개조'],['gear','장비'],['supplies','보급']].map(([id,title])=>'<button class="action '+(id===fleetTab?'':'sub')+'" data-fleet-tab="'+id+'" aria-pressed="'+(id===fleetTab)+'">'+title+'</button>').join('')+'</div>'+body;
}
function transportQuests(){
 const p=canDock(state),offer=p?contractOffer(state,p.id):null;
 return '<div class="kpi"><div>탐험 점수<b>'+fmt(state.score)+'</b></div><div>해적 격침<b>'+state.victories+'척</b></div></div>'+
 '<h3>항구 운송 계약</h3>'+
 (offer?'<p class="info">'+escapeHtml(good(offer.good).name)+' '+offer.count+'개를 '+escapeHtml(port(offer.target).name)+'에 납품하면 '+fmt(offer.reward)+' G를 받아.</p><button class="action" data-action="take">계약 수주</button> <button class="action sub" data-action="fulfill">계약 납품</button>':'<p class="info">항구에서 계약을 받아 교역품을 운송해.</p>')+
 '<h3>진행 중인 계약</h3>'+
 (state.quests.length?state.quests.map(q=>'<div class="row"><div class="desc"><strong>'+escapeHtml(port(q.target).name)+'</strong><small>'+escapeHtml(good(q.good).name)+' × '+q.count+' · 보상 '+fmt(q.reward)+' G</small></div><button class="action sub" data-route="'+q.target+'">항해</button></div>').join(''):'<p class="info">아직 수주한 계약이 없어.</p>')+
 '<h3>세력 신뢰</h3>'+Object.entries(state.reputation).map(([name,value])=>'<div class="row"><strong>'+escapeHtml(name)+'</strong><span>'+fmt(value)+'</span></div>').join('');
}
function quests(){
 const ex=state.expedition,site=SITES.find(t=>t.id===ex?.id),home=canDock(state),encounter=LAND_EVENTS.find(e=>e.id===ex?.event);
 return '<h3>탐험가 사무실</h3><p class="info">유적을 직접 조사하고 발견물을 보고해. 보고한 유물은 도감에 남고 왕궁 명성과 주인공 이야기에도 연결돼.</p><button class="action" data-action="report">미보고 발견물 '+state.discoveries.filter(x=>!state.reported.includes(x)).length+'건 보고</button>'+
 (encounter?'<div class="scene-card"><h3>'+encounter.title+'</h3><p>'+encounter.text+'</p>'+encounter.options.map((t,i)=>'<button class="action" data-site-event="'+i+'">'+t+'</button>').join('')+'</div>':'')+
 (site&&!encounter?'<div class="scene-card"><h3>'+site.name+' · 조사 '+(ex.step+1)+'/3</h3><p>'+site.lore+'</p><p>행동력 '+ex.energy+' · '+escapeHtml(ex.notes.at(-1)||'단서를 관찰하고 다음 행동을 골라.')+'</p><button class="action" data-explore="0">'+site.choices[ex.step]+'</button><button class="action sub" data-explore="1">'+['다른 조사 방법을 택한다','동료와 현장을 재검토한다','반대 방향에서 기록을 맞춘다'][ex.step]+'</button></div>':'')+
 '<h3>육지 탐험지</h3>'+SITES.map(t=>'<div class="scene-card"><strong>'+t.name+'</strong><p>'+port(t.port).name+' · '+t.kind+'</p><p class="info">'+t.lore+'</p><button class="action" data-site="'+t.id+'" '+(home?.id!==t.port||state.discoveries.includes(t.id)||ex?'disabled':'')+'>'+(state.discoveries.includes(t.id)?t.relic+' 발견':'식량 6 · 상륙 조사')+'</button> <button class="action sub" data-route="'+t.port+'">항구로 항해</button></div>').join('')+
 '<h3>사무실 의뢰</h3>'+OFFICE_QUESTS.map(q=>'<div class="scene-card"><strong>'+q.name+'</strong><p>'+q.text+' · '+officeProgress(state,q)+' / '+q.need+' · '+q.reward+' G</p><button class="action" data-office="'+q.id+'" '+(!home||state.completedOffice.includes(q.id)?'disabled':'')+'>'+(state.completedOffice.includes(q.id)?'완료':state.officeQuests.includes(q.id)?'보상 수령':'수주')+'</button></div>').join('')+transportQuests();
}
function palace(){
 const p=canDock(state);if(!p)return '<p>왕궁은 항구에 입항한 뒤 이용할 수 있어.</p>';
 const v=portStatus(state,p.id),need=[20,60,120,220][state.rank],info=storyStatus(state);
 return '<h3>'+escapeHtml(p.name)+' 왕궁 · 총독부</h3><div class="kpi"><div>명성<b>'+state.fame+'</b></div><div>작위<b>'+['자유 항해자','공인 항해자','왕실 특사','해양 기사','왕실 제독'][state.rank]+'</b></div></div><p>교역 신뢰·발견 보고·사건 해결로 왕실에 이름을 알려.</p><button class="action" data-action="audience">'+(need?'명성 '+need+' · 알현':'최고 작위')+'</button>'+
 '<h3>항만 통제·투자</h3><p>통제 국가: '+escapeHtml(v.owner)+' · 동맹: '+escapeHtml(state.alliance||'없음')+'</p><div class="kpi"><div>상업 번영<b>'+v.prosperity+'</b></div><div>항구 방어<b>'+v.security+'</b></div><div>상단 영향력<b>'+v.influence+'%</b></div><div>누적 투자<b>'+fmt(v.invested)+' G</b></div></div><p class="info">7일마다 현지에서 투자 배당을 받아. 약탈은 경제·방어에 피해를 주고, 방어가 낮으면 통제국이 바뀔 수 있어. 시설과 저장은 보존돼.</p><div class="stack">'+[100,500,1000].map(n=>'<button class="action" data-invest="'+n+'">'+n+' G 투자</button>').join('')+'<button class="action sub" data-action="dividend">배당 수령</button><button class="action sub" data-action="support">항구 방어 지원</button><button class="action" data-action="alliance">현 통제국과 동맹</button></div>'+
 '<h3>국가 외교</h3>'+['이베리아 왕실','프랑스 항구동맹'].map(f=>'<div class="scene-card"><strong>'+f+' · '+(state.diplomacy[f]<0?'적대':'중립')+'</strong><p>적대 선언 시 순찰함이 공격해. 휴전에는 500 G가 필요해.</p><button class="action" data-diplomacy="'+f+'">'+(state.diplomacy[f]<0?'휴전 교섭':'적대 선언')+'</button></div>').join('')+
 '<h3>왕실 임무</h3><button class="action sub" data-panel-open="quests">해적 소탕 임무 보기</button><h3>'+info.hero.name+'의 이야기</h3>'+storyCard();
}
function jobs(){return '<h3>직업 길드 · 경험 '+state.xp+'</h3><p class="info">직업을 바꿔도 선박·동료·진행 기록은 유지돼. 전직 시 경험을 소모하지 않아.</p>'+JOBS.map(j=>'<div class="scene-card"><strong>'+j.name+'</strong><p>'+j.description+' · 필요 경험 '+j.need+'</p><button class="action" data-job="'+j.id+'" '+(state.job===j.id?'disabled':'')+'>'+(state.job===j.id?'현재 직업':'전직')+'</button></div>').join('');}
function storyCard(){const {hero,chapter,ready}=storyStatus(state);return '<div class="scene-card"><strong>'+hero.goal+'</strong><p>'+hero.intro+'</p>'+(chapter?'<h3>제'+(state.storyChapter+1)+'장 · '+chapter[1]+'</h3><p>'+chapter[2]+'</p><p class="info">'+(state.storyChapter===2?'발견 보고 1건을 마치고 ':'')+port(chapter[0]).name+'에서 단서를 확인해.</p><button class="action sub" data-route="'+chapter[0]+'">목표 항구로</button> <button class="action" data-action="story" '+(!ready?'disabled':'')+'>이야기 진행</button>':'<h3>유럽 1부 완료</h3><p>고향으로 보낼 기록을 정리했어. 다음 바다로 향할 단서가 남아 있어.</p>')+'</div>';}
function journal(){return '<h3>기상·세계 정세</h3><p>'+WEATHER.find(w=>w.id===state.climate.kind).name+' · '+WEATHER.find(w=>w.id===state.climate.kind).description+'</p><p>동맹: '+(state.alliance||'없음')+' · 개척 해역 '+state.charted.length+'구역</p>'+state.worldLog.slice().reverse().map(t=>'<div class="scene-card">'+escapeHtml(t)+'</div>').join('')+storyCard()+'<h3>항해 기록</h3>'+[...state.log].reverse().map(t=>'<div class="row"><small>'+escapeHtml(t)+'</small></div>').join('')+'<h3>휴대폰 저장 관리</h3><p class="info">자동 저장돼. 저장 문자열을 복사해 다른 기기로 옮길 수 있고, 검증값으로 손상 여부를 확인해. 원문을 수정하면 복구되지 않아.</p><div class="stack"><button class="action sub" data-action="save">지금 저장</button><button class="action" data-action="export">저장 복사</button><button class="action sub" data-action="import">저장 가져오기</button><button class="action" data-action="reset">새 항해</button></div><textarea id="saveText" aria-label="저장 내보내기 및 가져오기 문자열" placeholder="저장 복사에 실패하면 여기서 길게 눌러 복사해. 가져올 때는 여기에 붙여넣어."></textarea><h3>자료와 제작</h3><p class="info">Natural Earth 공개 지형 · 기존 Kenney/Buch CC0 자산 · 독자 인물·스토리·절차 작곡 음악. 원작의 음악·인물·대사를 사용하지 않아.</p>';}

const kennyMap='./assets/cc0/map/';
const portrait=c=>{const host=TAVERN_HOSTS.find(h=>h.id===c.id);if(host)return '<span class="inn-face" role="img" aria-label="'+escapeHtml(host.name)+' 초상화" style="background-position:'+host.face*25+'% center"></span>';
const companionIndex=['thomas','isabel','willem','freya','diego'].indexOf(c.id);if(companionIndex>=0)return '<span class="crew-face" role="img" aria-label="'+escapeHtml(c.name)+' 실사풍 초상화" style="background-position:'+companionIndex*25+'% center"></span>';
 const index=Math.max(0,Math.min(26,Number(c.portrait)||0));
 // Buch source atlas: 328x112, nine 32px faces per row with 4px gutters, enlarged 2×.
 const x=(index%9)*72+8,y=Math.floor(index/9)*72+8;
 const hero=CAPTAINS.find(h=>h.id===c.id);if(hero)return '<span class="hero-face small" role="img" aria-label="'+escapeHtml(c.name)+' 초상화" style="background-position:'+hero.face*25+'% center"></span>';
 return '<span class="cc0-portrait" aria-label="'+escapeHtml(c.name)+'의 CC0 초상화" role="img" style="background-size:656px 224px;background-position:-'+x+'px -'+y+'px"></span>';
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
function relationshipPanel(id){const rel=relationStatus(state,id);return '<div class="social-box"><strong>친밀도 '+rel.trust+'/100 · '+(rel.bond?'마음을 나눈 인연':rel.trust>=35?'믿을 만한 사이':'서로 알아가는 중')+'</strong><p class="info">하루 대화 1회·선물 1회. 친밀도 35부터 고급 정보, 80과 이야기 1장부터 마음을 전할 수 있어.</p><div class="stack"><button class="action sub" data-contact="'+id+'" '+(rel.lastTalk===state.day?'disabled':'')+'>이야기 나누기</button>'+GIFTS.map(g=>'<button class="action" data-gift="'+g.id+'" data-person="'+id+'" '+(rel.lastGift===state.day||!canDock(state)?'disabled':'')+'>'+g.name+(g.cost?' '+g.cost+' G':'')+'</button>').join('')+'<button class="action sub" data-info="'+id+'" '+(rel.trust<35||rel.lastInfo===state.day?'disabled':'')+'>고급 정보</button><button class="action sub" data-bond="'+id+'" '+(rel.bond||rel.trust<80||!state.completedStories.length?'disabled':'')+'>마음 전하기</button></div></div>';}
function statsLine(c){const s=crewStats(state,c.id);return '<p class="crew-stats">레벨 '+s.level+' · 항해 '+s.navigation+' · 교역 '+s.trade+' · 포술 '+s.gunnery+' · 학술 '+s.scholarship+' · 의술 '+s.medicine+'</p>';}
function companions(){
 const home=canDock(state),host=TAVERN_HOSTS.find(h=>h.port===home?.id),news=state.worldLog.at(-1)||'지금 알려진 항구 습격 소식은 없어.',dock=SPECIAL_DOCKS[(Math.floor(state.day/2)+(home?PORTS.indexOf(home):0))%SPECIAL_DOCKS.length];
 return '<h3>선장 · '+state.captain+' · '+JOBS.find(j=>j.id===state.job).name+'</h3>'+storyCard()+(host?'<h3>선술집 주인 · '+host.name+'</h3><div class="crew-card">'+portrait(host)+'<div><p>'+host.story+'</p><p class="info">좋아하는 선물: '+GIFTS.find(g=>g.id===host.likes).name+'</p></div></div>'+relationshipPanel(host.id):'')+'<h3>선술집 소문 · 교역·탐험·정세·조선·인맥</h3>'+[...rumorsAt(state),'기상: '+WEATHER.find(w=>w.id===state.climate.kind).name+' · 다음 관측 '+state.climate.until+'일. 악천후용 범포는 에든버러에서 구할 수 있어.','해상 정세: '+news,'조선 기술: '+port(dock.port).name+'의 '+dock.name+' · '+dock.description,'특수 인맥: 베네치아의 복원가와 암스테르담의 정보상은 신뢰와 항해 실적을 보고 승선을 결정한대.'].map(r=>'<div class="scene-card">'+escapeHtml(r)+'</div>').join('')+TREASURES.filter(t=>!state.treasureClues.includes(t.id)).map(t=>'<div class="row"><strong>'+t.name+' 소문</strong><button class="action" data-clue="'+t.id+'">120 G · 단서 구입</button></div>').join('')+'<h3>선박 담당 배치</h3><p class="info">동료는 영입 후 얻은 경험으로 성장해. 같은 인물은 한 직책만 맡고 주인공은 선장직을 유지해.</p>'+CREW_ROLES.map(r=>'<div class="scene-card"><strong>'+r.name+'</strong><p class="info">'+r.effect+'</p><select data-role="'+r.id+'" aria-label="'+r.name+' 배치"><option value="">미배치</option>'+CREW.filter(c=>state.crewRoster.includes(c.id)&&c.id!==state.captainId).map(c=>'<option value="'+c.id+'" '+(state.assignments[r.id]===c.id?'selected':'')+'>'+escapeHtml(c.name)+'</option>').join('')+'</select></div>').join('')+'<h3>함대 동료</h3>'+
 CREW.filter(c=>state.crewRoster.includes(c.id)).map(c=>'<div class="crew-card">'+portrait(c)+'<div><div class="crew-name">'+escapeHtml(c.name)+' <span class="cargo-badge">'+escapeHtml(c.role)+'</span></div><div class="crew-detail">'+escapeHtml(c.nation)+' · 승선 중</div><p class="crew-lore">'+escapeHtml(c.story)+'</p>'+statsLine(c)+(c.id!==state.captainId?'<button class="action sub" data-bench="'+c.id+'">여관 대기</button>':'')+(['isabel','freya','florence','greta'].includes(c.id)?relationshipPanel(c.id):'')+'</div></div>').join('')+
 '<h3>여관에서 대기 중인 동료</h3>'+state.reserveCrew.map(id=>'<div class="row"><strong>'+escapeHtml(CREW.find(c=>c.id===id).name)+'</strong><button class="action" data-recruit="'+id+'">다시 승선</button></div>').join('')+
 '<h3>이 항구에서 만날 수 있는 인물</h3>'+
 (home?CREW.filter(c=>c.port===home.id&&!state.crewRoster.includes(c.id)&&!state.reserveCrew.includes(c.id)).map(c=>'<div class="crew-card">'+portrait(c)+'<div><div class="crew-name">'+escapeHtml(c.name)+'</div><div class="crew-detail">'+escapeHtml(c.nation)+' · '+escapeHtml(c.role)+'</div><p class="crew-lore">'+escapeHtml(c.story)+'</p>'+statsLine(c)+'<p class="info">'+companionObjective(state,c).text+'</p><p>'+escapeHtml((RECRUIT_STORIES[c.id]||[c.story,'함께 항해할 준비가 됐어.'])[Math.min(1,state.recruitScenes[c.id]||0)])+'</p>'+((state.recruitScenes[c.id]||0)<2?'<button class="action" data-talk="'+c.id+'">이야기 듣기 '+((state.recruitScenes[c.id]||0)+1)+'/2</button>':'<button class="action" data-recruit="'+c.id+'" '+(!companionObjective(state,c).ready?'disabled':'')+'>약속을 지키고 영입</button>')+'</div></div>').join('')||'<p class="info">이곳에서 새로 영입할 동료는 없어.</p>':'<p class="info">항구에 정박하면 여관에서 항해사를 만날 수 있어.</p>');
}
function inventory(){
 return '<h3>기함 상세</h3><p>'+SHIP_TYPES.find(t=>t.id===state.shipType).name+' · 선체 '+Math.round(state.ship.hull)+' / '+state.ship.maxHull+' · 돛 '+state.ship.sail+' · 함포 '+state.ship.cannons+' · 선원 '+state.ship.crew+' / '+state.ship.maxCrew+'</p><p>장갑 '+state.ship.armor+'단계 · 화물실 '+state.ship.holdLevel+'단계 · 타륜 '+state.ship.rudderLevel+'단계 · 선체 보강 '+state.ship.hullLevel+'단계</p><h3>소모품 가방</h3>'+consumables(false)+ '<div class="kpi"><div>화물 적재<b>'+cargoWeight(state)+' / '+(state.ship.cargoLimit*state.fleet)+'</b></div><div>보유 금화<b>'+fmt(state.coins)+' G</b></div></div>'+
 '<h3>발견 도감</h3>'+SITES.filter(t=>state.discoveries.includes(t.id)).map(t=>'<div class="scene-card"><strong>'+t.relic+'</strong><p>'+t.name+' · '+(state.reported.includes(t.id)?'보고 완료':'미보고')+'</p><small>'+t.lore+'</small></div>').join('')+TREASURES.filter(t=>state.treasures.includes(t.id)).map(t=>'<div class="scene-card"><strong>'+t.relic+'</strong><p>'+t.name+'</p></div>').join('')+'<h3>개인 장비 · 발견물</h3>'+
 EQUIPMENT.map(item=>'<div class="row"><div class="desc"><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.group)+' · '+escapeHtml(item.description)+'</small></div><strong class="cargo-badge">×'+(item.id==='medicine'?state.supplies.medicine:Math.max(0,Number(state.equipment?.[item.id])||0))+'</strong></div>').join('')+
 '<h3>선박 화물창</h3>'+
 GOODS.map(item=>'<div class="row"><div class="desc"><strong>'+escapeHtml(item.name)+'</strong><small>단위 중량 '+item.weight+' · 항구에서 사고팔 수 있음</small></div><strong class="cargo-badge">×'+(state.cargo[item.id]||0)+'</strong></div>').join('')+
 '<h3>항해 보급품</h3><div class="row"><strong>식량</strong><b>'+state.ship.provisions+'</b></div><div class="row"><strong>선원</strong><b>'+state.ship.crew+'</b></div>';
}

let renderedPanel='';
function enterBattle(){town=true;active='battle';document.body.classList.add('in-town','in-battle');$('townbar').hidden=true;view.details.classList.add('open');scene.setMode('battle');switchMusicScene('explore');renderPanel();}
function battlePanel(){
 const b=state.landBattle;if(!b)return '<button class="action" data-action="battle-finish">탐험으로 돌아가기</button>';
 if(['won','lost','retreated'].includes(b.phase))return '<h3>'+({won:'전투 승리',lost:'안전한 항구로 후퇴',retreated:'퇴각 완료'}[b.phase])+'</h3><p>'+escapeHtml(b.log.at(-1))+'</p><button class="action" data-action="battle-finish">'+(b.phase==='won'?'유적 조사 계속':'항구로 돌아가기')+'</button>';
 const actor=b.party[b.actor],skill=landSkill(state,actor.id);if(!b.enemies[battleTarget]||b.enemies[battleTarget].hp<=0)battleTarget=b.enemies.findIndex(e=>e.hp>0);
 if(b.phase==='enemy'){clearTimeout(enemyTimer);enemyTimer=setTimeout(()=>{if(state.landBattle?.phase==='enemy')apply(landEnemyTurn(state));},650);}
 return '<strong>'+b.turn+'턴 · '+(b.phase==='player'?escapeHtml(CREW.find(c=>c.id===actor.id).name)+' 행동':'적의 행동')+'</strong><small> · 체력 '+actor.hp+'/'+actor.maxHp+' · 집중 '+actor.focus+'/'+actor.maxFocus+'</small><div class="battle-targets">'+b.enemies.map((e,i)=>'<button class="action sub" data-target="'+i+'" '+(e.hp<=0?'disabled':'')+' aria-pressed="'+(i===battleTarget)+'">'+escapeHtml(e.name)+' '+e.hp+'/'+e.maxHp+'</button>').join('')+'</div><div class="battle-actions">'+[['attack','공격'],['skill',skill.name+' · 집중 8'],['guard','방어 · 집중 회복'],['medicine','의약품 ×'+state.supplies.medicine],['rations','비상 식량 ×'+state.supplies.rations],['tool','망원경 약점 관측'],['retreat','퇴각']].map(([id,name])=>'<button class="action" data-land="'+id+'" '+(b.phase!=='player'?'disabled':'')+'>'+name+'</button>').join('')+'</div><p class="info">'+escapeHtml(skill.description)+'<br>'+b.log.slice(-2).map(escapeHtml).join('<br>')+'</p>';
}
function renderPanel(){
 if(!active)return;const savedScroll=renderedPanel===active?view.body.scrollTop:0;renderedPanel=active;
 const titles={battle:'육지 전투',jobs:'직업 길드',palace:'왕궁 · 총독부',port:'항구 · 선술집 · 조선소',crew:'선장과 항해사',inventory:'항해 가방과 화물',chart:'세계 해도',market:'항구 교역소',fleet:'함대와 조선소',quests:'계약과 탐험',journal:'항해 기록'};
 view.head.textContent=titles[active];
 view.body.innerHTML=({battle:battlePanel,palace,jobs,port:portScene,crew:companions,inventory,chart,market,fleet,quests,journal}[active]||chart)();if(active==='chart')drawChart(false);view.body.scrollTop=savedScroll;
}
function apply(result){
 if(result.ok){const priorFx=state.combatFx?.serial;state=result.state;save();scene.setState(state);if(state.landBattle){if(active!=='battle')enterBattle();else renderPanel();}else renderPanel();summary();if(state.combatFx?.serial!==priorFx)impactSound();}
 note(result.message);
}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>gotoPanel(b.dataset.panel)));
$('close').addEventListener('click',leaveFacility);
$('dock').addEventListener('click',()=>{if(canDock(state))enterTown();});
$('fire').addEventListener('click',()=>apply(fireCannons(state)));
view.body.addEventListener('click',e=>{
 const b=e.target.closest('[data-route],[data-trade],[data-upgrade],[data-action],[data-recruit],[data-panel-open],[data-job],[data-refit],[data-site],[data-explore],[data-office],[data-map],[data-clue],[data-search],[data-buy-supply],[data-use-supply],[data-diplomacy],[data-invest],[data-talk],[data-target],[data-land],[data-cannon],[data-site-event],[data-ship-gear],[data-refine],[data-contact],[data-gift],[data-info],[data-bond],[data-bench],[data-fleet-tab]');
 if(!b)return;
 if(b.dataset.panelOpen){openFacility(b.dataset.panelOpen);return;}
 if(b.dataset.fleetTab){fleetTab=b.dataset.fleetTab;view.body.scrollTop=0;renderPanel();return;}
 if(b.dataset.shipGear){apply(buyShipEquipment(state,b.dataset.gearSlot,b.dataset.shipGear));return;}
 if(b.dataset.refine){apply(refineShip(state,b.dataset.refine));return;}
 if(b.dataset.contact){apply(talkContact(state,b.dataset.contact));return;}
 if(b.dataset.gift){apply(giveGift(state,b.dataset.person,b.dataset.gift));return;}
 if(b.dataset.info){apply(premiumInformation(state,b.dataset.info));return;}
 if(b.dataset.bond){apply(expressBond(state,b.dataset.bond));return;}
 if(b.dataset.bench){apply(benchCompanion(state,b.dataset.bench));return;}
 if(b.dataset.siteEvent!==undefined){apply(resolveLandEvent(state,Number(b.dataset.siteEvent)));return;}
 if(b.dataset.cannon){apply(buyCannon(state,b.dataset.cannon));return;}
 if(b.dataset.target!==undefined){battleTarget=Number(b.dataset.target);renderPanel();return;}
 if(b.dataset.land){apply(landAction(state,b.dataset.land,battleTarget));return;}
 if(b.dataset.talk){apply(talkCompanion(state,b.dataset.talk));return;}
 if(b.dataset.invest){apply(investPort(state,Number(b.dataset.invest)));return;}
 if(b.dataset.buySupply){apply(buyConsumable(state,b.dataset.buySupply));return;}
 if(b.dataset.useSupply){apply(useConsumable(state,b.dataset.useSupply));return;}
 if(b.dataset.diplomacy){const f=b.dataset.diplomacy;if(state.diplomacy[f]<0)apply(negotiatePeace(state,f));else if(confirm(f+'에 적대 선언하면 해당 순찰함이 공격해. 선언할까?'))apply(declareHostility(state,f));return;}
 if(b.dataset.job){apply(changeJob(state,b.dataset.job));return;}
 if(b.dataset.refit){apply(refitShip(state,b.dataset.refit));return;}
 if(b.dataset.site){apply(startExpedition(state,b.dataset.site));return;}
 if(b.dataset.explore!==undefined){apply(exploreChoice(state,Number(b.dataset.explore)));return;}
 if(b.dataset.office){apply(officeContract(state,b.dataset.office));return;}
 if(b.dataset.map){drawChart(b.dataset.map==='world');return;}
 if(b.dataset.clue){apply(takeTreasureClue(state,b.dataset.clue));return;}
 if(b.dataset.search){apply(searchTreasure(state,b.dataset.search));return;}
 if(b.dataset.recruit){apply(recruitCompanion(state,b.dataset.recruit));return;}
 if(b.dataset.route){state=setDestination(state,b.dataset.route);save();scene.setState(state);summary();depart();note(state.log.at(-1));return;}
 if(b.dataset.trade){apply(trade(state,canDock(state)?.id,b.dataset.good,Number(b.dataset.count),b.dataset.trade));return;}
 if(b.dataset.upgrade){apply(buyUpgrade(state,b.dataset.upgrade));return;}
 switch(b.dataset.action){
  case 'cancel':state=cancelDestination(state);save();scene.setState(state);renderPanel();note('자동항로 해제');break;
  case 'take':apply(takeContract(state,canDock(state)?.id));break;
  case 'fulfill':apply(fulfillContracts(state));break;
  case 'battle-finish':{const r=finishLandBattle(state);if(r.ok){state=r.state;document.body.classList.remove('in-battle');$('townbar').hidden=false;active='quests';scene.setMode('town','quests');save();scene.setState(state);renderPanel();note(r.message);}break;}
  case 'dividend':apply(collectDividend(state));break;
  case 'support':apply(supportPort(state));break;
  case 'alliance':apply(formAlliance(state));break;
  case 'report':apply(reportDiscoveries(state));break;
  case 'story':apply(advanceStory(state));break;
  case 'audience':apply(royalAudience(state));break;
  case 'export':{const data=exportSave(state);$('saveText').value=data;(navigator.clipboard?navigator.clipboard.writeText(data):Promise.reject()).then(()=>note('저장 문자열을 복사했어.')).catch(()=>note('아래 저장 문자열을 길게 눌러 복사해.'));break;}
  case 'import':{const next=importSave($('saveText').value.trim());if(!next){note('저장 문자열이나 검증값이 올바르지 않아.');break;}if(confirm('현재 항해를 가져온 기록으로 바꿀까?')){state=next;state.heroChosen=true;save();scene.setState(state);depart();summary();note('저장 기록을 불러왔어.');}break;}
  case 'save':note(save()?'진행 상황을 저장했어.':'저장 실패');break;
  case 'reset':if(confirm('이 게임의 항해 기록만 지우고 처음부터 시작할까?')){depart();showCaptains();}break;
 }
});
view.body.addEventListener('change',e=>{if(e.target.matches('select[data-role]'))apply(assignCrew(state,e.target.dataset.role,e.target.value));});
view.body.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest('[data-route]'))e.target.closest('[data-route]').click();});
for(const b of document.querySelectorAll('[data-hold]')){
 const k=b.dataset.hold;
 const up=e=>{buttons[k]=false;b.classList.remove('pressed');if(e?.pointerId!==undefined&&b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);};
 b.addEventListener('pointerdown',e=>{e.preventDefault();buttons[k]=true;b.classList.add('pressed');b.setPointerCapture(e.pointerId);});
 b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',()=>{buttons[k]=false;b.classList.remove('pressed');});
}
document.addEventListener('keydown',e=>{
 if(e.repeat||e.target.matches('textarea,input,select'))return;
 const k=e.key.toLowerCase();
 if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown',' '].includes(k)){keys.add(k);e.preventDefault();}
 if(k===' '){apply(fireCannons(state));}
 if(k==='m'){gotoPanel('chart');}
 if(k==='e'&&canDock(state))enterTown();
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();buttons={left:false,right:false,ahead:false,astern:false};stick={x:0,y:0};});
window.addEventListener('pagehide',save);
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
// 음악: 원작 음원을 쓰지 않는 짧은 르네상스 선법의 독자 절차 작곡. 기기 오디오로 재생한다.
let audio=null,musicEnabled=false,soundEnabled=true,musicTimer=null,musicScene='sea',musicBeat=0;
const motifs={sea:[0,4,7,9,7,4,2,4,7,11,9,7,4,2,0,-1],harbor:[0,2,4,7,4,2,0,-3,0,4,5,7,5,4,2,0],palace:[0,7,4,2,0,4,7,11,9,7,5,4,2,4,2,0],explore:[0,2,3,7,5,3,2,-2,0,3,5,7,8,7,3,2]};
function tone(freq,start,duration,gain,type='triangle'){const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(gain,start+.025);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g).connect(audio.destination);o.start(start);o.stop(start+duration+.02);}
function playBar(){if(!musicEnabled||!audio)return;if(document.hidden){musicTimer=setTimeout(playBar,1000);return;}const notes=motifs[musicScene]||motifs.sea,now=audio.currentTime+.04,beat=musicScene==='sea'?.31:.38;for(let i=0;i<8;i++){const n=notes[(musicBeat+i)%notes.length];tone(220*2**(n/12),now+i*beat,beat*1.8,.045);if(i%2===0)tone(110*2**((i%4===0?0:7)/12),now+i*beat,beat*2.8,.025,'sine');}musicBeat=(musicBeat+8)%16;clearTimeout(musicTimer);musicTimer=setTimeout(playBar,beat*8*1000);}
function switchMusicScene(value){musicScene=value;musicBeat=0;}
$('music-toggle').addEventListener('click',async()=>{try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();musicEnabled=!musicEnabled;clearTimeout(musicTimer);if(musicEnabled)playBar();$('music-toggle').innerHTML='<b>♫</b>'+(musicEnabled?'켜짐':'음악');}catch{note('기기의 소리 설정을 확인해.');}});
$('allySupport').addEventListener('click',()=>apply(callAlliance(state)));
$('quickRepair').addEventListener('click',()=>apply(useConsumable(state,'repair')));$('quickBag').addEventListener('click',()=>gotoPanel('inventory'));
function impactSound(){if(!soundEnabled)return;try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});if(['heal','guard'].includes(state.combatFx?.type)){tone(523,audio.currentTime,.20,.05,'sine');tone(784,audio.currentTime+.09,.24,.04,'sine');return;}const heavy=state.combatFx?.gun==='bombard',length=heavy?.38:.18,n=audio.createBuffer(1,Math.round(audio.sampleRate*length),audio.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=n;gain.gain.value=state.combatFx?.type==='cannon'?.15:.07;source.connect(gain).connect(audio.destination);source.start();tone(heavy?45:state.combatFx?.type==='cannon'?85:180,audio.currentTime,heavy?.4:.18,.08,'sine');}catch{}}
$('sfx-toggle').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('sfx-toggle').textContent=soundEnabled?'효과음 켬':'효과음 끔';});
$('speed').addEventListener('click',()=>{state.speed=state.speed===1?2:state.speed===2?4:1;$('speed').textContent=state.speed+'배속';save();});
$('zoomIn').addEventListener('click',()=>scene.setZoom(scene.getZoom()*1.35));$('zoomOut').addEventListener('click',()=>scene.setZoom(scene.getZoom()/1.35));
$('eventChoices').addEventListener('click',e=>{const b=e.target.closest('[data-event]');if(!b)return;apply(resolveSeaEvent(state,Number(b.dataset.event)));renderEvent();});
let renderedEvent='';
function renderEvent(){const e=SEA_EVENTS.find(e=>e.id===state.event?.id);$('seaEvent').hidden=!e;if(!e){renderedEvent='';return;}if(renderedEvent===e.id)return;renderedEvent=e.id;if(e){$('eventTitle').textContent=e.title;$('eventText').textContent=e.text;$('eventChoices').innerHTML=e.options.map((t,i)=>'<button class="action" data-event="'+i+'">'+t+'</button>').join('');}}

function run(now){
 requestAnimationFrame(run);
 if(now-last<32)return;
 const dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;
 if(!ready||choosing||document.hidden)return;
 if(view.details.classList.contains('open')||town)return;
 if(state.event){renderEvent();return;}
 const left=buttons.left||keys.has('a')||keys.has('arrowleft');
 const right=buttons.right||keys.has('d')||keys.has('arrowright');
 const ahead=buttons.ahead||keys.has('w')||keys.has('arrowup');
 const astern=buttons.astern||keys.has('s')||keys.has('arrowdown');
 const turn=Math.max(-1,Math.min(1,Number(right)-Number(left)+stick.x));
 const throttle=Math.max(-1,Math.min(1,Number(ahead)-Number(astern)+stick.y));
 const manual=left||right||ahead||astern||Math.abs(stick.x)>.08||Math.abs(stick.y)>.08;
 if(manual&&state.destination){state=cancelDestination(state);}
 state=stepSea(state,{turn,throttle,manual},dt*state.speed);if(state.event){save();renderEvent();}
 scene.setState(state);
 tick+=dt;panelTick+=dt;
 if(tick>1){tick=0;summary();}
 if(panelTick>13){panelTick=0;save();}
 if(state.ship.hull<=0){
  note('선체가 파괴됐어. 항구에서 수리를 받거나 새 항해를 시작할 수 있어.');
  state.ship.hull=1;const safe=port(state.homePort)||PORTS[0];state.ship.x=safe.x;state.ship.z=safe.z+2;state.destination=null;state.route=[];state.coins=Math.max(200,state.coins-500);save();
 }
}
$('speed').textContent=state.speed+'배속';summary();renderEvent();requestAnimationFrame(run);
