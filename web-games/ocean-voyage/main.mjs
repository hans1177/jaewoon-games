// 파일명: web-games/ocean-voyage/main.mjs
// 임포트: 기존 게임과 분리된 항해 규칙 및 Three.js 장면
import {itemLibrary,PORTS,PORT_SCENES,portHasFacility,PORT_MARKETS,marketQuote,marketEvent,MERCHANT_CAPTAINS,merchantPosition,hailMerchant,resolveMerchantEncounter,dismissStoryScene,GOODS,SAVE_KEY,newGame,loadGame,serializeGame,cargoWeight,canDock,nearestPort,priceAt,trade,buyUpgrade,contractOffer,takeContract,fulfillContracts,setDestination,cancelDestination,stepSea,fireCannons,CREW,EQUIPMENT,recruitCompanion,CAPTAINS,JOBS,SHIP_TYPES,SITES,OFFICE_QUESTS,SEA_EVENTS,companionObjective,changeJob,refitShip,startExpedition,exploreChoice,reportDiscoveries,officeProgress,officeContract,storyStatus,advanceStory,royalAudience,resolveSeaEvent,exportSave,importSave,TREASURES,takeTreasureClue,searchTreasure,rumorsAt,CONSUMABLES,buyConsumable,useConsumable,declareHostility,negotiatePeace,WEATHER,portStatus,investPort,collectDividend,supportPort,formAlliance,callAlliance,CREW_ROLES,crewStats,assignCrew,RECRUIT_STORIES,talkCompanion,landSkill,landAction,landEnemyTurn,finishLandBattle,CANNON_TYPES,buyCannon,LAND_EVENTS,resolveLandEvent,SAIL_EQUIPMENT,FIGUREHEADS,SPECIAL_DOCKS,buyShipEquipment,refineShip,TAVERN_HOSTS,GIFTS,relationStatus,talkContact,giveGift,premiumInformation,expressBond,benchCompanion,windAt,departureHeading} from './engine.mjs';
import {createOceanView,drawGeography,drawFog} from './ocean3d.mjs';
// 메인: 조작, 교역, 함대, 항구, 해도, 게임 저장
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ko-KR');
const view={head:$('panelTitle'),body:$('content'),details:$('details'),message:$('message'),loading:$('loading')};
let state=loadGame(localStorage),active='',town=false,choosing=false,homeFromTown=false,battleTarget=0,enemyTimer=null,last=performance.now(),tick=0,panelTick=0,ready=false;
let buttons={left:false,right:false,ahead:false,astern:false},keys=new Set(),stick={x:0,y:0},sailCruise=false,stuckFor=0,travelDistance=0,travelSample={x:state.ship.x,z:state.ship.z};
const mobileSailing=()=>window.matchMedia?.('(pointer:coarse)')?.matches&&window.innerWidth<900;
function clearMotionSample(){stuckFor=0;travelSample={x:state.ship.x,z:state.ship.z};}
function showMotion(){
 const el=$('movementReadout');if(!el)return;
 el.dataset.stuck=String(stuckFor>1);
 if(town||choosing||!view.loading.classList.contains('hide')){el.hidden=true;return;}
 el.hidden=false;
 if(state.event||state.scene){el.textContent='항해 일시정지 · 사건 진행';return;}
 el.textContent=stuckFor>1.1?'⚠ 얕은 물 · 재출항 방향 탐색 중':
  (sailCruise||Math.abs(state.ship.velocity)>.12?'⛵ 항속 '+Math.abs(state.ship.velocity).toFixed(1):'⏸ 정박 · ▶ 항해')+' · 이동 '+Math.round(travelDistance);
}
function syncSails(){const control=$('sailToggle');if(!control)return;control.textContent=sailCruise?'■ 멈춤':'▶ 항해';control.setAttribute('aria-pressed',String(sailCruise));}
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
 onReady(){ready=true;scene.setState(state);$('start').disabled=false;openHome();},
 onBuilding(id){openFacility(id);},onMerchant(id){apply(hailMerchant(state,id));},onMap(){gotoPanel('chart');},onPort(id){if(!active&&!town){state=setDestination(state,id);save();scene.setState(state);note(port(id).name+' 항로를 설정했어.');}},
 onError(msg){view.loading.querySelector('p').textContent=msg;note(msg);}
});
$('start').addEventListener('click',continueGame);
$('newGame').addEventListener('click',restartGame);
$('captainBack').addEventListener('click',openHome);
// 교전 화면은 실제 항해 좌표·내구도·포탄을 그대로 사용한다.
let navalTarget=null;
function syncNavalBattle(){
 if(town||choosing||state.landBattle)return;
 const distanceTo=e=>Math.hypot(e.x-state.ship.x,e.z-state.ship.z);
 const enemies=state.pirates.filter(e=>e.hull>0&&(!e.neutral||state.diplomacy[e.faction]<0));
 const current=enemies.find(e=>e.id===navalTarget),nearest=enemies.filter(e=>distanceTo(e)<42).sort((a,b)=>distanceTo(a)-distanceTo(b))[0];
 const target=current&&distanceTo(current)<60?current:nearest,oldTarget=navalTarget;
 if(target){
  navalTarget=target.id;
  if(oldTarget!==target.id){
   scene.setMode('naval');document.body.classList.add('naval-battle');
   $('navalTitle').textContent='해상 교전 · '+(target.name||'해적 함대');
   note(oldTarget===null?'해적선 발견! 해상 전투 시작 · 함포는 좌우 측면에서 발사할 수 있어.':'해상 교전 대상 변경 · '+(target.name||'해적 함대'));
  }
 }else if(oldTarget!==null){
  const sunk=state.pirates.find(e=>e.id===oldTarget)?.hull<=0;
  navalTarget=null;scene.setMode('sea');document.body.classList.remove('naval-battle');
  note(sunk?'적함 격침 · 항해 화면으로 복귀했어.':'교전 해역 이탈 · 항해를 재개해.');save();
 }
 $('navalEncounter').hidden=navalTarget===null;
 if(target){
  const gun=CANNON_TYPES.find(g=>g.id===state.ship.cannonType)||CANNON_TYPES[0],distance=distanceTo(target);
  const angle=Math.atan2(target.x-state.ship.x,target.z-state.ship.z)-state.ship.heading;
  const portSide=Math.sin(angle)>0?'우현':'좌현';
  $('navalTargetHull').value=Math.max(0,target.hull)/Math.max(1,target.maxHull);
  $('navalReadout').textContent='적 내구 '+Math.ceil(target.hull)+' / '+target.maxHull+' · 거리 '+Math.round(distance)+' · '+portSide+' '+(distance>=gun.range?'사거리 밖':Math.abs(Math.cos(angle))<.55?'함포 사격 가능':'측면으로 조타')+' · '+(state.ship.cooldown>0?'장전 '+state.ship.cooldown.toFixed(1)+'초':'장전 완료');
 }
}
$('navalRetreat').addEventListener('click',()=>{state.autoCombat=false;summary();note('자동 교전을 해제했어. 조타 스틱으로 적과 60 이상 거리를 벌려 이탈해.');});
function summary(){
 $('day').textContent=fmt(state.day)+'일';
 $('gold').textContent=fmt(state.coins)+' G';
 $('hull').textContent=fmt(state.ship.hull/state.ship.maxHull*100)+'%';
 $('supplies').textContent=state.ship.provisions+' / '+state.ship.crew;
 const closest=nearestPort(state),location=canDock(state);
 const nearby=(state.merchants||[]).filter(m=>!state.crewRoster.includes(m.id)).map(m=>({...m,p:merchantPosition(m)})).sort((a,b)=>Math.hypot(state.ship.x-a.p.x,state.ship.z-a.p.z)-Math.hypot(state.ship.x-b.p.x,state.ship.z-b.p.z))[0];
 const canHail=nearby&&Math.hypot(state.ship.x-nearby.p.x,state.ship.z-nearby.p.z)<=20;$('hail').hidden=!canHail;if(canHail){$('hail').dataset.merchant=nearby.id;$('hail').title=MERCHANT_CAPTAINS.find(c=>c.id===nearby.id).name+' 상선 교신';}
 $('autoBattle').textContent=state.autoCombat?'자동해전 켬':'자동해전 끔';$('autoBattle').setAttribute('aria-pressed',String(state.autoCombat));
 $('compass').textContent=(WEATHER.find(w=>w.id===state.climate.kind)?.name||'맑음')+' · ◈ '+(location?location.name+' · 정박 가능':closest.port.region+' · '+Math.round(closest.d)+'해도 거리')+(state.destination?' → '+port(state.destination).name:state.exploreTarget?' · 직접 탐색 → '+port(state.exploreTarget).name:'');
 $('dock').disabled=!location;const enemy=state.pirates.filter(e=>e.hull>0&&(!e.neutral||state.diplomacy[e.faction]<0)).map(e=>({...e,d:Math.hypot(e.x-state.ship.x,e.z-state.ship.z)})).filter(e=>e.d<45).sort((a,b)=>a.d-b.d)[0];$('battleStatus').hidden=!enemy;document.body.classList.toggle('naval-engaged',!!enemy&&!town);if(enemy)$('battleStatus').textContent='⚔ '+(enemy.name||'해적선')+' · 내구 '+Math.round(enemy.hull)+'/'+enemy.maxHull+' · 거리 '+Math.round(enemy.d)+' · '+(state.autoCombat?'자동 측면전':'수동 포격')+' · 장전 '+Math.max(0,state.ship.cooldown).toFixed(1)+'초';$('foodStatus').textContent='식량 '+state.ship.provisions+' (최소 '+Math.floor(state.ship.provisions/2)+'일) · 선원 '+state.ship.crew+' · 포탄 '+state.supplies.ammo;
 const wind=windAt(state),bearing=(wind.heading*180/Math.PI+360)%360,apparent=Math.cos(wind.heading-state.ship.heading),kind=apparent>.35?'순풍':apparent<-.35?'역풍':'횡풍';$('windStatus').textContent='바람 '+Math.round(bearing)+'° · '+kind+' · 항속 '+Math.abs(state.ship.velocity).toFixed(1)+(sailCruise?' · 순항':'');
 $('fire').disabled=state.ship.hull<=0||state.ship.cooldown>0;
}
function gotoPanel(name){if(state.landBattle&&name!=='system'){enterBattle();return;}
 if(name==='port'){if(canDock(state)){enterTown();return;}name='chart';}
 if(town&&['market','fleet','crew','quests','palace','jobs'].includes(name)){openFacility(name);return;}
 active=active===name?'':name;
 view.details.classList.toggle('open',!!active);
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.panel===active));
 if(active==='chart')centerChartOnShip();
 if(active)renderPanel();
}
function enterTown(){document.body.classList.remove('in-facility');if(state.landBattle){enterBattle();return;}town=true;active='';view.details.classList.remove('open');document.body.classList.add('in-town');scene.setMode('town');switchMusicScene('harbor');$('townbar').hidden=false;$('townTitle').textContent=canDock(state)?canDock(state).name+' · '+PORT_SCENES[canDock(state).id].district:'항구';save();note('건물을 눌러 시설에 들어가. 아래 출항으로 바다에 돌아갈 수 있어.');}
function openFacility(id){const home=canDock(state);if(!home){note('먼저 항구에 입항해.');return;}if(!portHasFacility(home.id,id)&&id!=='port'&&id!=='journal'){note(home.name+'에는 해당 시설이 없어. 다른 항구로 항해해.');return;}town=true;active=id;document.body.classList.add('in-town','in-facility');$('townbar').hidden=false;scene.setMode('town',id);view.details.classList.add('open');switchMusicScene(id==='palace'?'palace':id==='quests'?'explore':'harbor');renderPanel();}
function leaveFacility(){if(state.landBattle){note('전투 행동이나 퇴각을 선택해.');return;}active='';document.body.classList.remove('in-facility');view.details.classList.remove('open');scene.setMode(town?'town':navalTarget!==null?'naval':'sea');if(town)switchMusicScene('harbor');}
function depart(){if(state.landBattle){enterBattle();return;}if(!state.route.length)state.ship.heading=departureHeading(state);sailCruise=true;clearMotionSample();syncSails();town=false;active='';view.details.classList.remove('open');document.body.classList.remove('in-town','in-facility');$('townbar').hidden=true;navalTarget=null;document.body.classList.remove('naval-battle');$('navalEncounter').hidden=true;scene.setMode('sea');switchMusicScene('sea');save();note('출항했어. 자동으로 전진해. 왼쪽 바다를 밀어서 조타하고 ■ 멈춤으로 정지할 수 있어.');}
// 홈: 화면만 전환해 기존 진행 데이터는 선장 확정 전까지 보존한다.
function openHome(){
 if(!ready)return;
 if(state.heroChosen)save();
 homeFromTown=town;
 active='';view.details.classList.remove('open');
 $('captains').hidden=true;choosing=false;
 $('start').textContent=state.heroChosen?'이어하기':'항해 시작';
 $('newGame').hidden=!state.heroChosen;
 view.loading.querySelector('p').textContent=state.heroChosen?'기존 항해를 이어하거나 새로운 선장을 골라 출발할 수 있어.':'선장을 선택하고 항해를 시작해.';
 view.loading.classList.remove('hide');
}
function continueGame(){
 if(!ready)return;
 if(!state.heroChosen){showCaptains();return;}
 $('captains').hidden=true;choosing=false;view.loading.classList.add('hide');
 scene.setState(state);
 if(state.landBattle)enterBattle();
 else if(homeFromTown&&canDock(state))enterTown();
 else{town=false;active='';sailCruise=true;clearMotionSample();syncSails();document.body.classList.remove('in-town','in-battle');$('townbar').hidden=true;scene.setMode('sea');switchMusicScene('sea');}
 summary();renderEvent();
}
function restartGame(){
 if(state.heroChosen&&!confirm('처음부터 새 항해를 시작할까? 새 선장을 선택하면 기존 저장 기록이 교체돼.'))return;
 clearTimeout(enemyTimer);
 town=false;homeFromTown=false;active='';navalTarget=null;
 document.body.classList.remove('in-town','in-battle','naval-battle');
 $('townbar').hidden=true;$('navalEncounter').hidden=true;
 view.details.classList.remove('open');
 showCaptains();
}
function showCaptains(){choosing=true;view.loading.classList.add('hide');$('captains').hidden=false;$('captainCards').innerHTML=CAPTAINS.map(c=>'<article class="hero-card"><div class="hero-face '+(c.maleFace!==undefined?'male':'')+'" style="background-position:'+(c.maleFace!==undefined?c.maleFace:c.face)*25+'% center"></div><div><small>'+c.region+' · '+c.nation+' · '+(c.origin?c.origin+' 출신 → ':'')+port(c.port).name+' 본편 시작</small><h2>'+c.name+'</h2><p>'+c.goal+'</p><p class="info">'+c.intro+'</p><button class="action" data-captain="'+c.id+'">이 인물로 항해</button></div></article>').join('');}
$('captainCards').addEventListener('click',e=>{const b=e.target.closest('[data-captain]');if(!b)return;state=newGame(b.dataset.captain);state.heroChosen=true;state.scene={kind:'prologue',captainId:b.dataset.captain,step:0};choosing=false;$('captains').hidden=true;save();scene.setState(state);summary();enterTown();renderEvent();});
$('depart').addEventListener('click',depart);$('townJournal').addEventListener('click',()=>openFacility('port'));$('townBack').addEventListener('click',leaveFacility);

function travelCard(p){
 const reached=state.discovered.includes(p.id);
 const d=Math.round(Math.hypot(state.ship.x-p.x,state.ship.z-p.z));
 return '<div class="row"><div class="desc"><strong>'+(reached?'⚓ ':'◈ ')+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.region)+' · '+(reached?'발견':'미발견')+' · '+d+'해리</small></div><button class="action sub" data-route="'+p.id+'">'+(reached?'개척 항로 자동항해':'미개척 경계까지')+'</button></div>';
}
function chart(){
 return '<p class="info">해도에서 발견한 항구를 누르면 자동항로가 설정돼. 개척 해역은 자동항해하고, 미개척 구간은 직접 조타해. 미개척 목적지는 밝혀진 바다의 끝에서 자동으로 멈춰. 실제 지형 해도야. 1차 유럽 항구 13곳이 연결돼. 어두운 미개척 해역은 직접 지나가면 영구적으로 밝혀져. 다른 대륙은 주인공 출신 배경이며 상세 플레이는 추후 확장돼. 자동항해는 육지를 피해 가며, 먼 항로는 1~16배속을 설정할 수 있어. 긴 항로에는 보급이 필요해.</p><canvas id="chartMap" width="960" height="540" aria-label="드래그로 이동하고 확대할 수 있는 해도"></canvas><div class="chart-toolbar"><button class="action sub" data-map="europe">유럽 해도</button><button class="action sub" data-map="world">세계 해도</button><button class="action" data-map-view="zoom-in">확대 ＋</button><button class="action" data-map-view="zoom-out">축소 －</button><button class="action sub" data-map-view="center">위치 복귀</button><small>항구 선택 · 드래그로 해도 이동</small></div><h3>보물 수색</h3>'+TREASURES.map(t=>'<div class="scene-card"><strong>'+t.name+'</strong><p>'+(!state.treasureClues.includes(t.id)?'선술집에서 해도 단서를 구해.':t.clue)+'</p><button class="action" data-search="'+t.id+'" '+(!state.treasureClues.includes(t.id)||state.treasures.includes(t.id)?'disabled':'')+'>'+ (state.treasures.includes(t.id)?'발견 완료':'이 위치에서 수색')+'</button></div>').join('')+roamingMerchants()+'<button class="action sub" data-action="cancel">항로 취소</button>'+PORTS.map(travelCard).join('');
}
// 해도: 발견한 항구·개척 항로·현재 선박 위치를 같이 보여준다.
let mapWorld=false,mapZoom=1,mapPanX=0,mapPanZ=0,mapPointer=null,mapDragged=false,mapIgnoreClick=false;
const chartViewport=()=>({cx:(mapWorld?300:75)+mapPanX,cz:(mapWorld?-210:-550)+mapPanZ,scale:(mapWorld?.29:1.38)*mapZoom});
// The chart should open and re-center on the actual vessel, not an old map origin.
function centerChartOnShip(){mapPanX=state.ship.x-(mapWorld?300:75);mapPanZ=state.ship.z-(mapWorld?-210:-550);}
function drawChart(world=mapWorld){
 mapWorld=world;const c=$('chartMap');if(!c)return;
 const ctx=c.getContext('2d'),{cx,cz,scale}=chartViewport(),cw=c.width,ch=c.height;
 drawGeography(ctx,cw,ch,cx,cz,scale,'chart');
 const patina=ctx.createRadialGradient(480,230,90,480,270,570);
 patina.addColorStop(0,'#f6e9cb00');patina.addColorStop(.78,'#8e6d3b18');patina.addColorStop(1,'#60452b80');ctx.fillStyle=patina;ctx.fillRect(0,0,cw,ch);
 const x=v=>cw/2+(v-cx)*scale,y=v=>ch/2+(v-cz)*scale;
 ctx.save();ctx.strokeStyle='#786a4a31';ctx.lineWidth=1;ctx.setLineDash([2,7]);
 for(let xx=0;xx<=cw;xx+=80){ctx.beginPath();ctx.moveTo(xx,0);ctx.lineTo(xx,ch);ctx.stroke();}
 for(let yy=0;yy<=ch;yy+=80){ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(cw,yy);ctx.stroke();}
 ctx.setLineDash([]);ctx.restore();
 if(state.route.length){ctx.save();ctx.strokeStyle='#ffe09f';ctx.lineWidth=2;ctx.setLineDash([7,4]);ctx.beginPath();ctx.moveTo(x(state.ship.x),y(state.ship.z));for(const p of state.route)ctx.lineTo(x(p.x),y(p.z));ctx.stroke();ctx.restore();}
 drawFog(ctx,cw,ch,cx,cz,scale,state.charted,'chart');
 for(const p of PORTS){
  const px=x(p.x),py=y(p.z);if(px<7||px>cw-8||py<10||py>ch-8)continue;
  const known=state.discovered.includes(p.id);
  const buildings=PORT_SCENES[p.id]?.facilities||[],royal=buildings.includes('palace'),shipyard=buildings.includes('fleet');
  ctx.save();ctx.translate(px,py);ctx.fillStyle=known?'#8f5634':'#736a58';ctx.strokeStyle='#eed7a2';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(0,0,known?7:4,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(known){ctx.fillStyle='#f9e4a9';ctx.strokeStyle='#412f29';ctx.lineWidth=1.2;
   if(royal){ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(-4,-8);ctx.lineTo(-1,-5);ctx.lineTo(1,-10);ctx.lineTo(3,-5);ctx.lineTo(6,-8);ctx.lineTo(5,0);ctx.closePath();ctx.fill();ctx.stroke();}
   else if(shipyard){ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(4,-5);ctx.lineTo(1,3);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillRect(-1,-8,1.5,13);}
   else{ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
  if(known){ctx.font='bold 12px system-ui';ctx.textAlign='left';ctx.lineWidth=3;ctx.strokeStyle='#1a2934';ctx.strokeText(p.name,px+7,py-6);ctx.fillStyle='#f8e4b7';ctx.fillText(p.name,px+7,py-6);const eventGoods=GOODS.find(g=>marketQuote(state,p.id,g.id).event);if(eventGoods){ctx.font='bold 10px system-ui';ctx.fillStyle='#f3ad86';ctx.fillText('⚑ '+marketQuote(state,p.id,eventGoods.id).event,px+7,py+8);}}
 }
 for(const m of state.merchants||[]){
  if(state.crewRoster.includes(m.id))continue;
  const at=merchantPosition(m),px=x(at.x),py=y(at.z);
  if(px<6||py<6||px>cw-6||py>ch-7)continue;
  ctx.fillStyle='#f0ad74';ctx.strokeStyle='#382b28';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(px,py-6);ctx.lineTo(px-5,py+4);ctx.lineTo(px+5,py+4);ctx.closePath();ctx.fill();ctx.stroke();
 }
 const px=x(state.ship.x),py=y(state.ship.z),offscreen=px<24||px>cw-24||py<24||py>ch-24;
 // A labelled, outlined vessel remains visible even on a zoomed-out chart.
 // When the user pans away, keep its bearing/location discoverable at the edge.
 const markerX=Math.max(24,Math.min(cw-24,px)),markerY=Math.max(24,Math.min(ch-24,py));
 ctx.save();ctx.translate(markerX,markerY);
 ctx.fillStyle='#203f4a';ctx.strokeStyle='#f7e6b2';ctx.lineWidth=2.5;
 ctx.beginPath();ctx.arc(0,0,offscreen?15:18,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.rotate(Math.PI-state.ship.heading); // +Z navigation points down on the 2D chart.
 ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(-8,9);ctx.lineTo(0,5);ctx.lineTo(8,9);ctx.closePath();
 ctx.fillStyle='#ffe49b';ctx.strokeStyle='#252e2c';ctx.lineWidth=1.6;ctx.fill();ctx.stroke();ctx.restore();
 ctx.save();ctx.textAlign='center';ctx.font='bold 13px system-ui';ctx.lineWidth=3;
 const tag=offscreen?'내 선박 · 화면 밖':'내 선박';
 const tagY=markerY>36?markerY-23:markerY+30;
 ctx.strokeStyle='#193542';ctx.fillStyle='#fff0c6';ctx.strokeText(tag,markerX,tagY);ctx.fillText(tag,markerX,tagY);ctx.restore();
 ctx.save();ctx.lineWidth=3;ctx.strokeStyle='#6b4e2d9c';ctx.strokeRect(6,6,cw-12,ch-12);
 ctx.lineWidth=1;ctx.strokeStyle='#d7bc83bb';ctx.strokeRect(10,10,cw-20,ch-20);
 for(const [xx,yy,dx,dy] of [[12,12,1,1],[cw-12,12,-1,1],[12,ch-12,1,-1],[cw-12,ch-12,-1,-1]]){
  ctx.beginPath();ctx.moveTo(xx+dx*22,yy);ctx.lineTo(xx,yy);ctx.lineTo(xx,yy+dy*22);ctx.stroke();}
 const roseX=cw-66,roseY=86;ctx.translate(roseX,roseY);
 ctx.strokeStyle='#5e492f';ctx.fillStyle='#a77c42';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<16;i++){const a=i*Math.PI/8;ctx.beginPath();ctx.moveTo(Math.sin(a)*19,Math.cos(a)*19);ctx.lineTo(Math.sin(a)*26,Math.cos(a)*26);ctx.stroke();}
 for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?16:24;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.sin(a-.13)*r,Math.cos(a-.13)*r);ctx.lineTo(Math.sin(a+.13)*r,Math.cos(a+.13)*r);ctx.closePath();ctx.fillStyle=i%2?'#5f775f':'#6b4930';ctx.fill();}
 ctx.font='bold 12px Georgia,serif';ctx.fillStyle='#503723';ctx.textAlign='center';ctx.fillText('N',0,-32);ctx.restore();
 const wind=windAt(state),windDeg=Math.round(wind.heading*180/Math.PI+360)%360;
 ctx.fillStyle='#593f29';ctx.font='bold 13px Georgia,"Malgun Gothic",serif';ctx.textAlign='left';
 ctx.fillText('✦ 항해 해도 · '+(world?'세계 위치':'유럽 연안')+' / 1590',17,26);
 ctx.font='bold 10px Georgia,"Malgun Gothic",serif';ctx.fillText('풍향 '+windDeg+'°   풍력 '+Math.round(wind.strength*100)+'%',17,43);
 ctx.fillText('왕관 왕궁 · 돛 조선소 · 원형 일반 항구',17,ch-14);
 ctx.fillStyle='#6b4a2a';ctx.fillRect(26,ch-44,75,2);
 for(let tick=0;tick<=5;tick++)ctx.fillRect(26+tick*15,ch-47,tick%5===0?2:1,7);
 ctx.font='10px Georgia,serif';ctx.fillText('해도 상대 거리',27,ch-30);
 for(const t of TREASURES.filter(t=>state.treasureClues.includes(t.id)&&!state.treasures.includes(t.id)))ctx.fillText('×',x(t.x),y(t.z));
}

// 항구 인물: 기존 CC0 초상 시트를 재사용하는 시설별 안내인.
// 시설 안내인: 각 항구 × 조선소/교역소/왕궁/선술집/탐험/길드의 반실사 반신 초상화.
function portNpc(kind){
 const p=canDock(state);if(!p)return '';
 const profile=PORT_SCENES[p.id],host=TAVERN_HOSTS.find(h=>h.port===p.id);
 const info={market:[profile.marketNpc||'교역소 상인','물품을 사고팔기 전에 현지 시세부터 살펴봐.'],
 fleet:[profile.fleetNpc||'항구 조선 장인','선체, 돛, 함포와 선수상을 먼저 확인해.'],
 palace:[profile.palaceNpc||'항만 행정관','이 항구의 동맹과 투자 현황을 확인해.'],
 crew:[host?.name||'선술집 주인','여행객들의 이야기에 새로운 항로가 숨어 있어.'],
 quests:['유적 기록관','기록된 항로와 발견물을 함께 검토하자.'],
 jobs:['길드 직업 교관','항해 경험에 맞는 직책을 알려줄게.']}[kind];
 if(!info)return '';
 const occupations=['market','fleet','palace','crew','quests','jobs'],position=occupations.indexOf(kind);
 const portIndex=PORTS.indexOf(p);
 const sets={market:'captains',fleet:'crew',palace:'captains',crew:'innkeepers',quests:'crew',jobs:'captains'};
 const atlas=sets[kind],slot=kind==='crew'&&host?Number(host.face)||0:(portIndex*3+position*2)%5;
 const tint=kind==='fleet'?'#685037':kind==='market'?'#96744d':kind==='palace'?'#594251':kind==='crew'?'#a07849':kind==='quests'?'#516c69':'#61523d';
 const role={market:'무역과 물류',fleet:'조선·선박 수리',palace:'왕실·행정',crew:'여관·정보',quests:'탐험·고고학',jobs:'직업·기술'}[kind];
 return '<div class="npc-dialog npc-half '+kind+'" style="--npc-tint:'+tint+'"><div class="npc-frame"><span class="npc-half-face" role="img" aria-label="'+escapeHtml(info[0])+'의 반실사 반신 초상화" style="background-image:url(./assets/'+atlas+'.webp);background-position:'+(slot*25)+'% center"></span><span class="npc-medallion" aria-hidden="true">'+['⚖','⚒','♛','✦','✧','✥'][position]+'</span></div><div class="npc-copy"><small>⚜ '+escapeHtml(p.name)+' · '+escapeHtml(profile.district)+'</small><strong>'+escapeHtml(info[0])+'</strong><em>'+role+'</em><p>“'+escapeHtml(info[1])+'”</p></div></div>';
}

// 교역소: 상품별 재고·현재 시세·7일 추세·수요/공급·지역 사건을 모바일에서 한눈에 확인한다.
function market(){
 const p=canDock(state);
 if(!p)return '<p class="info">항구에서 입항하면 지역 특산품을 사고팔 수 있어.</p>'+travelCard(nearestPort(state).port);
 const group=PORT_MARKETS[p.id],goods=[...GOODS.filter(g=>group.produces.includes(g.id)),...GOODS.filter(g=>group.imports.includes(g.id)),...GOODS.filter(g=>!group.produces.includes(g.id)&&!group.imports.includes(g.id)&&(state.cargo[g.id]||0)>0)];
 // 교역: 발견한 항구의 현재 시세로만 후보를 비교한다. 구매·항로·저장을 자동 변경하지 않는다.
 const freeHold=Math.max(0,state.ship.cargoLimit*state.fleet-cargoWeight(state)),opportunities=[];
 for(const g of goods){
  const buy=marketQuote(state,p.id,g.id);if(buy.kind==='미취급'||buy.stock<1)continue;
  const quantity=Math.max(0,Math.min(5,buy.stock,Math.floor(state.coins/buy.buy),Math.floor(freeHold/g.weight)));
  if(!quantity)continue;
  for(const target of PORTS.filter(target=>target.id!==p.id&&state.discovered.includes(target.id))){
   const sell=marketQuote(state,target.id,g.id).sell,profit=(sell-buy.buy)*quantity;
   if(profit>0)opportunities.push({g,target,quantity,buy:buy.buy,sell,profit,distance:Math.round(Math.hypot(target.x-p.x,target.z-p.z))});
  }
 }
 opportunities.sort((a,b)=>b.profit-a.profit||a.distance-b.distance);
 const recommendations=opportunities.slice(0,3).map((r,i)=>'<article class="trade-route"><span class="route-rank">'+(i+1)+'</span><div><strong>'+escapeHtml(r.g.name)+' ×'+r.quantity+' → '+escapeHtml(r.target.name)+'</strong><small>단가 '+fmt(r.buy)+' → '+fmt(r.sell)+' G · 직선 '+r.distance+' 해도 거리</small><b>현재 시세 차익 +'+fmt(r.profit)+' G</b></div><button class="action sub" data-route="'+r.target.id+'">항로 설정</button></article>').join('');
 const show=(g)=>{
  const q=marketQuote(state,p.id,g.id),inventory=state.cargo[g.id]||0,canBuy=q.kind!=='미취급';
  const trend=q.history.length>1?q.percent-q.history.at(-2):0,change=trend>1?'▲ '+trend+'%':trend< -1?'▼ '+Math.abs(trend)+'%':'― 안정';
  const rates=q.history.slice(-7).concat(q.percent).slice(-7),lo=Math.min(40,...rates)-4,hi=Math.max(140,...rates)+4;
  const points=rates.map((v,i)=>(i*94/Math.max(1,rates.length-1)).toFixed(1)+','+(25-(v-lo)/Math.max(1,hi-lo)*19).toFixed(1)).join(' ');
  const priceStatus=q.percent<=90?'매입 유리':q.percent>=110?'매각 유리':'보통';
  return '<div class="trade-item"><div class="trade-title"><strong>'+escapeHtml(g.name)+'</strong><span class="cargo-badge">'+q.kind+(q.demand?' · 수요 높음':'')+'</span></div>'+
   '<div class="trade-rate"><b>'+q.percent+'%</b><span>'+priceStatus+' · '+change+(q.event?' · '+q.event:'')+'</span><svg viewBox="0 0 96 29" aria-label="최근 최대 7일 시세 추이" role="img"><polyline points="'+points+'" fill="none" stroke="#5f9f8c" stroke-width="2.5"/></svg></div>'+
   '<small>매입 '+fmt(q.buy)+' G · 매각 '+fmt(q.sell)+' G · 재고 '+q.stock+' · 내 화물 '+inventory+'</small>'+
   '<div class="trade-actions"><button class="action sub" data-trade="buy" data-good="'+g.id+'" data-count="1" '+(!canBuy||q.stock<1?'disabled':'')+'>매입 1</button><button class="action sub" data-trade="buy" data-good="'+g.id+'" data-count="5" '+(!canBuy||q.stock<5?'disabled':'')+'>매입 5</button><button class="action" data-trade="sell" data-good="'+g.id+'" data-count="1" '+(!inventory?'disabled':'')+'>매각 1</button><button class="action" data-trade="sell" data-good="'+g.id+'" data-count="5" '+(inventory<5?'disabled':'')+'>매각 5</button></div></div>';
 };
 return portNpc('market')+'<h3>'+escapeHtml(p.name)+' 교역소 · '+escapeHtml(PORT_SCENES[p.id].district)+'</h3>'+
 '<p class="info">시세 기준 '+state.day+'일 · <b>게임 내 하루(16초)</b>마다 생산·수요에 따라 변동해. 주기적 폭등·유행·과잉은 2일 지속되고, 대량 거래하면 현지 가격이 변해.</p>'+
 '<div class="kpi"><div>금화<b>'+fmt(state.coins)+' G</b></div><div>화물<b>'+cargoWeight(state)+' / '+state.ship.cargoLimit*state.fleet+'</b></div><div>시장 취급<b>'+goods.length+'종</b></div></div>'+
 '<div class="trade-legend"><strong>지역 명산품</strong> '+group.produces.map(id=>escapeHtml(GOODS.find(g=>g.id===id).name)).join(' · ')+'</div>'+
 '<p class="info">수입품 '+group.imports.map(id=>GOODS.find(g=>g.id===id).name).join(' · ')+' · 수요 높은 품목 '+group.demand.map(id=>GOODS.find(g=>g.id===id).name).join(' · ')+'</p>'+
 '<section class="trade-planner"><h3>교역 항로 수첩</h3><p class="info">발견한 도시·현 재고·금화·남은 적재량으로 최대 5개 화물의 가격 차이를 비교해. 매입은 직접 해야 하며, 시세 변동·대량거래·항해 비용에 따라 실제 이익은 달라져.</p>'+(recommendations||'<p>화물을 비우거나 다른 항구를 발견하면 교역 후보를 비교할 수 있어.</p>')+'</section>'+goods.map(show).join('')+
 '<h3>교역 항로 정보</h3><p class="info">실제 배에 실은 상품은 다른 항구에서 팔 수 있어. 예상 최고 매각가는 현재 공개된 해도 기준이야.</p>'+
 GOODS.filter(g=>state.cargo[g.id]>0).map(g=>'<div class="row"><div class="desc"><strong>'+escapeHtml(g.name)+'</strong><small>'+bestSale(g.id)+'</small></div></div>').join('');
}
function consumables(buy){return CONSUMABLES.map(c=>'<div class="row item-row">'+itemImage({...c,category:'supplies'})+'<div class="desc"><strong>'+c.name+' ×'+state.supplies[c.id]+'</strong><small>'+c.description+'</small></div><div class="stack">'+(buy?'<button class="action sub" data-buy-supply="'+c.id+'">'+(state.job==='merchant'?Math.ceil(c.cost*.9):c.cost)+' G 구매</button>':'')+(c.id!=='ammo'?'<button class="action" data-use-supply="'+c.id+'" '+(!state.supplies[c.id]?'disabled':'')+'>사용</button>':'')+'</div></div>').join('');}
function bestSale(id){const places=PORTS.filter(p=>state.discovered.includes(p.id));if(!places.length)return '아직 알려진 항구 없음';const best=places.reduce((a,b)=>marketQuote(state,a.id,id).sell>marketQuote(state,b.id,id).sell?a:b);return escapeHtml(best.name)+' 예상 '+fmt(marketQuote(state,best.id,id).sell)+' G';}
let fleetTab='ships';
function fleet(){
 const p=canDock(state),s=state.ship,type=SHIP_TYPES.find(t=>t.id===state.shipType),gun=CANNON_TYPES.find(g=>g.id===s.cannonType)||CANNON_TYPES[0];
 const upgrades=[['repair','선체 수리','내구 '+s.maxHull+'까지 회복',Math.ceil((s.maxHull-s.hull)*8)],['provisions','식량 보급','항해 식량 +50',190],['crew','선원 모집','선원 +12 · 최대 '+s.maxCrew,420],['sail','돛 개선','기초 항속 향상 · 최대 4단계',950+s.sail*700],['cannon','포문 증설','포문 +2 · 기본 개조 최대 16문',780+s.cannons*85],['ship','호위함 구매','최대 3척의 함대 편성',3300+(state.fleet-1)*2600],['plating','장갑 보강','기초 3단계 · 단계당 피격 피해 8% 감소',1500+s.armor*1200],['hold','화물실 확장','3단계 · 단계당 적재 +18',1300+s.holdLevel*900],['rudder','타륜 개조','3단계 · 단계당 직접 선회 +15%',1200+s.rudderLevel*700],['hull','선체 보강','3단계 · 단계당 최대 내구 +30',1800+s.hullLevel*1400]];
 // 조선소: 보유 선박의 선체·돛대·장착 포문을 실제 보유 값으로 보여준다.
 // 선박창: 선종별 선체·범장·선루·노·포문을 후보 목록까지 동일한 도면으로 그린다.
 function shipPortrait(t,mini=false){
  const galley=t.rig==='oars',lateen=t.rig==='lateen'||t.id.includes('caravel'),large=/galleon|carrack|fluyt|frigate|racer/.test(t.id);
  const width=t.width||1,length=t.length||1,masts=t.masts===1?[320]:t.masts===3?[214,320,426]:[268,385];
  const l=320-165*length,r=320+165*length,deck=201,guns=t.id===state.shipType?s.cannons:(t.cannons||4),hull=t.hullColor||t.color||'#95623b';
  const cloth=masts.map((x,i)=>{const y=large&&i===1?36:53,w=(large?44:60)*width;
   return '<path d="M'+x+' 33 V205" stroke="#63452e" stroke-width="7"/>'+
   (lateen||galley?'<path d="M'+(x+12)+' '+y+' L'+(x-w)+' 180 L'+(x+w*.55)+' 171 Z" fill="#e9dec0" stroke="#ae936b" stroke-width="3"/>':
   '<path d="M'+(x-w)+' '+(y+20)+' Q'+x+' '+(y+35)+' '+(x+w)+' '+(y+20)+' L'+(x+w-5)+' 182 Q'+x+' 195 '+(x-w+5)+' 182 Z" fill="#eee2c6" stroke="#ac9670" stroke-width="3"/>')+
   '<path d="M'+(x-w-4)+' '+(y+18)+' H'+(x+w+4)+'" stroke="#704830" stroke-width="4"/>'+
   '<path d="M'+l+' 201 L'+x+' 35 L'+r+' 201" fill="none" stroke="#d3bc90" stroke-width="1.5"/>';}).join('');
  const gunSlots=Math.max(2,Math.min(10,Math.ceil(guns/2)));
  const ports=Array.from({length:gunSlots},(_,i)=>'<rect x="'+(l+32+i*(r-l-64)/Math.max(1,gunSlots-1))+'" y="219" width="13" height="9" rx="2" fill="#172c34" stroke="#c49d69" stroke-width="2"/>').join('');
  const oars=galley?Array.from({length:8},(_,i)=>'<path d="M'+(l+26+i*(r-l-52)/8)+' 205 l-22 44" stroke="#d9b780" stroke-width="4"/>').join(''):'';
  const rigging=masts.map((x,i)=>'<path d="M'+l+' 204 L'+x+' 35 L'+r+' 204 M'+x+' 35 L'+(x+28)+' 110 L'+(x-25)+' 151" fill="none" stroke="#564432" stroke-width="1.3" opacity=".8"/>'+
   '<path d="M'+(x-49)+' 180 V'+(75+i*5)+' M'+(x+47)+' 177 V'+(78+i*5)+'" fill="none" stroke="#e2c89a" stroke-width="1.5"/>').join('');
  const banners=masts.map((x,i)=>'<path d="M'+x+' 32 L'+(x+27)+' '+(34+i*2)+' L'+x+' 42Z" fill="'+(t.color||'#ae674a')+'" stroke="#a18a69" stroke-width="1.5"/>').join('');
  const foam=Array.from({length:19},(_,i)=>'<path d="M'+(i*38-30)+' '+(236+i%3*7)+' l'+(10+i%4*5)+' 0" stroke="'+(i%3?'#acd2d1':'#e9f0dc')+'" stroke-width="'+(1+i%3)+'" opacity=".68"/>').join('');
  const gallery=large?'<path d="M'+(r-75)+' 198 L'+(r-65)+' 151 L'+(r-10)+' 151 L'+r+' 198 Z" fill="#65402d" stroke="#bd9769" stroke-width="3"/><rect x="'+(r-50)+'" y="163" width="14" height="15" fill="#e9d3a1"/>':'';
  return '<div class="ship-preview'+(mini?' ship-mini':'')+'"><svg viewBox="0 0 640 275" role="img" aria-label="'+escapeHtml(t.name)+' 선체와 돛·포문 미리보기">'+
   '<defs><linearGradient id="shipSky-'+t.id+'" x2="0" y2="1"><stop stop-color="#8aafb4"/><stop offset=".61" stop-color="#d7bfa0"/><stop offset="1" stop-color="#436f80"/></linearGradient>'+
   '<linearGradient id="shipHull-'+t.id+'" x2="0" y2="1"><stop stop-color="#d6b586"/><stop offset=".26" stop-color="'+hull+'"/><stop offset="1" stop-color="#372c2b"/></linearGradient>'+
   '<linearGradient id="shipSea-'+t.id+'" x2="0" y2="1"><stop stop-color="#447d88"/><stop offset="1" stop-color="#123b50"/></linearGradient></defs>'+
   '<rect width="640" height="275" fill="url(#shipSky-'+t.id+')"/><circle cx="488" cy="78" r="48" fill="#fae9c2" opacity=".43"/>'+
   '<path d="M0 178 Q130 166 280 176 T640 174 V217 H0Z" fill="#33566b" opacity=".35"/>'+
   '<path d="M0 222 Q120 211 240 222 T480 222 T640 224 V275 H0Z" fill="url(#shipSea-'+t.id+')"/>'+
   '<path d="M0 221 Q110 213 240 224 T480 223 T640 221" stroke="#9cc5bb" fill="none" stroke-width="2" opacity=".78"/>'+foam+
   rigging+cloth+banners+'<path d="M'+l+' 195 L'+r+' 195 L'+(r-24)+' 247 Q320 271 '+(l+24)+' 247 Z" fill="url(#shipHull-'+t.id+')" stroke="#dfb57d" stroke-width="5"/>'+
   Array.from({length:7},(_,i)=>'<path d="M'+(l+16)+' '+(207+i*5)+' Q320 '+(219+i*5)+' '+(r-16)+' '+(207+i*5)+'" fill="none" stroke="#edc68d" opacity=".35"/>').join('')+
   '<path d="M'+l+' 202 Q320 212 '+r+' 202" stroke="#d4ad75" stroke-width="8" fill="none"/>'+gallery+ports+oars+
   Array.from({length:10},(_,i)=>'<circle cx="'+(l+27+i*(r-l-50)/10)+'" cy="'+(214+i%2*5)+'" r="1.4" fill="#f2ce87" opacity=".75"/>').join('')+
   '<path d="M'+l+' 197 L'+(l-58)+' 171" stroke="#d5af79" stroke-width="5"/>'+
   '<text x="20" y="27" fill="#fff2d0" font-size="19" font-family="serif">'+escapeHtml(t.name)+'</text>'+
   (!mini?'<text x="20" y="48" fill="#d9e7e2" font-size="13">돛 '+s.sail+' · 포문 '+s.cannons+' · 장갑 '+(s.armor||0)+' · 적재 '+s.cargoLimit+'</text>':'')+'</svg></div>';
 }
 const seaProfile=shipPortrait(type);
 let body='';
 if(fleetTab==='ships')body='<h3>기함 교체 · 국가별 설계</h3><p class="info">전용 선박은 해당 국가의 항구 조선소에서 구입해. 개조와 장착 장비는 보존돼.</p>'+SHIP_TYPES.map(t=>'<div class="scene-card"><strong>'+t.name+(t.id===state.shipType?' · 운용 중':'')+'</strong>'+shipPortrait(t,true)+'<p>'+t.description+'</p><small>'+(t.nation||'범용 설계')+' · 적재 '+t.cargo+' · 내구 '+t.hull+' · 항속 ×'+(t.speed||1)+' · 선회 ×'+(t.turn||1)+'</small><br><button class="action" data-refit="'+t.id+'" '+(!p||t.id===state.shipType||t.nation&&p.faction!==t.nation?'disabled':'')+'>'+fmt(t.cost)+' G · 기함 교체</button></div>').join('');
 if(fleetTab==='upgrades')body='<h3>선체·돛·포문 개조</h3>'+upgrades.slice(3).map(([id,title,desc,cost])=>'<div class="row"><div class="desc"><strong>'+title+'</strong><small>'+desc+'</small></div><button class="action" data-upgrade="'+id+'" '+(!p?'disabled':'')+'>'+fmt(cost)+' G</button></div>').join('')+'<h3>이 도시의 특수 조선 기술</h3>'+(SPECIAL_DOCKS.filter(d=>d.port===p?.id).map(d=>'<div class="scene-card"><strong>'+d.name+'</strong><p>'+d.description+'</p><button class="action" data-refine="'+d.id+'" '+(s.regionalMods.includes(d.id)?'disabled':'')+'>'+(s.regionalMods.includes(d.id)?'적용 완료':fmt(d.cost)+' G 개조')+'</button></div>').join('')||'<p class="info">이곳에는 표준 개조 시설이 있어. 다른 도시의 특수 기술은 선술집에서 정보를 얻어.</p>')+'<p class="info">보유 특수 개조: '+(s.regionalMods.map(id=>SPECIAL_DOCKS.find(d=>d.id===id)?.name).join(' · ')||'없음')+'</p>';
 if(fleetTab==='gear')body='<h3>이 도시의 돛·선수상</h3>'+[['sail',SAIL_EQUIPMENT],['figurehead',FIGUREHEADS]].map(([slot,list])=>list.filter(g=>!g.port||g.port===p?.id||g.id===s.gear[slot]).map(g=>'<div class="scene-card"><strong>'+g.name+(s.gear[slot]===g.id?' · 장착 중':'')+'</strong><p>'+g.description+(g.port?' · '+port(g.port).name+' 전용':'')+'</p><button class="action" data-ship-gear="'+g.id+'" data-gear-slot="'+slot+'" '+(!p||g.port&&p.id!==g.port||s.gear[slot]===g.id?'disabled':'')+'>'+fmt(g.cost)+' G 장착</button></div>').join('')).join('')+'<h3>함포 형식 교체</h3>'+CANNON_TYPES.map(g=>'<div class="scene-card"><strong>'+g.name+(s.cannonType===g.id?' · 장착 중':'')+'</strong><p>'+g.description+'</p><small>위력 ×'+g.power+' · 사거리 '+g.range+' · 장전 '+g.reload+'초 · 탄속 '+g.speed+'</small><br><button class="action" data-cannon="'+g.id+'" '+(!p||s.cannonType===g.id?'disabled':'')+'>'+fmt(g.cost)+' G 교체</button></div>').join('');
 if(fleetTab==='supplies')body='<h3>수리와 항해 보급</h3>'+upgrades.slice(0,3).map(([id,title,desc,cost])=>'<div class="row"><div class="desc"><strong>'+title+'</strong><small>'+desc+'</small></div><button class="action" data-upgrade="'+id+'" '+(!p?'disabled':'')+'>'+fmt(cost)+' G</button></div>').join('')+'<h3>소모품 구매·사용</h3>'+consumables(true);
 return portNpc('fleet')+'<h3>'+type.name+' · '+(p?p.name+' 조선소':'바다 위 선박 정보')+'</h3>'+seaProfile+'<div class="kpi"><div>선체<b>'+Math.round(s.hull)+' / '+s.maxHull+'</b></div><div>함대·적재<b>'+state.fleet+'척 · '+cargoWeight(state)+' / '+s.cargoLimit*state.fleet+'</b></div><div>포문·함포<b>'+s.cannons+'문 · '+gun.name+'</b></div><div>장착 장비<b style="font-size:12px">'+SAIL_EQUIPMENT.find(g=>g.id===s.gear.sail).name+'<br>'+FIGUREHEADS.find(g=>g.id===s.gear.figurehead).name+'</b></div></div><div class="ship-tabs">'+[['ships','선박'],['upgrades','개조'],['gear','장비'],['supplies','보급']].map(([id,title])=>'<button class="action '+(id===fleetTab?'':'sub')+'" data-fleet-tab="'+id+'" aria-pressed="'+(id===fleetTab)+'">'+title+'</button>').join('')+'</div>'+body;
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
 return portNpc('quests')+'<h3>탐험가 사무실</h3><p class="info">유적을 직접 조사하고 발견물을 보고해. 보고한 유물은 도감에 남고 왕궁 명성과 주인공 이야기에도 연결돼.</p><button class="action" data-action="report">미보고 발견물 '+state.discoveries.filter(x=>!state.reported.includes(x)).length+'건 보고</button>'+
 (encounter?'<div class="scene-card"><h3>'+encounter.title+'</h3><p>'+encounter.text+'</p>'+encounter.options.map((t,i)=>'<button class="action" data-site-event="'+i+'">'+t+'</button>').join('')+'</div>':'')+
 (site&&!encounter?'<div class="scene-card"><h3>'+site.name+' · 조사 '+(ex.step+1)+'/3</h3><p>'+site.lore+'</p><p>행동력 '+ex.energy+' · '+escapeHtml(ex.notes.at(-1)||'단서를 관찰하고 다음 행동을 골라.')+'</p><button class="action" data-explore="0">'+site.choices[ex.step]+'</button><button class="action sub" data-explore="1">'+['다른 조사 방법을 택한다','동료와 현장을 재검토한다','반대 방향에서 기록을 맞춘다'][ex.step]+'</button></div>':'')+
 '<h3>육지 탐험지</h3>'+SITES.map(t=>'<div class="scene-card"><strong>'+t.name+'</strong><p>'+port(t.port).name+' · '+t.kind+'</p><p class="info">'+t.lore+'</p><button class="action" data-site="'+t.id+'" '+(home?.id!==t.port||state.discoveries.includes(t.id)||ex?'disabled':'')+'>'+(state.discoveries.includes(t.id)?t.relic+' 발견':'식량 6 · 상륙 조사')+'</button> <button class="action sub" data-route="'+t.port+'">항구로 항해</button></div>').join('')+
 '<h3>사무실 의뢰</h3>'+OFFICE_QUESTS.map(q=>'<div class="scene-card"><strong>'+q.name+'</strong><p>'+q.text+' · '+officeProgress(state,q)+' / '+q.need+' · '+q.reward+' G</p><button class="action" data-office="'+q.id+'" '+(!home||state.completedOffice.includes(q.id)?'disabled':'')+'>'+(state.completedOffice.includes(q.id)?'완료':state.officeQuests.includes(q.id)?'보상 수령':'수주')+'</button></div>').join('')+transportQuests();
}
function palace(){
 const p=canDock(state);if(!p)return '<p>왕궁은 항구에 입항한 뒤 이용할 수 있어.</p>';
 const v=portStatus(state,p.id),need=[20,60,120,220][state.rank],info=storyStatus(state);
 return portNpc('palace')+'<h3>'+escapeHtml(p.name)+' 왕궁 · 총독부</h3><div class="kpi"><div>명성<b>'+state.fame+'</b></div><div>작위<b>'+['자유 항해자','공인 항해자','왕실 특사','해양 기사','왕실 제독'][state.rank]+'</b></div></div><p>교역 신뢰·발견 보고·사건 해결로 왕실에 이름을 알려.</p><button class="action" data-action="audience">'+(need?'명성 '+need+' · 알현':'최고 작위')+'</button>'+
 '<h3>항만 통제·투자</h3><p>통제 국가: '+escapeHtml(v.owner)+' · 동맹: '+escapeHtml(state.alliance||'없음')+'</p><div class="kpi"><div>상업 번영<b>'+v.prosperity+'</b></div><div>항구 방어<b>'+v.security+'</b></div><div>상단 영향력<b>'+v.influence+'%</b></div><div>누적 투자<b>'+fmt(v.invested)+' G</b></div></div><p class="info">7일마다 현지에서 투자 배당을 받아. 약탈은 경제·방어에 피해를 주고, 방어가 낮으면 통제국이 바뀔 수 있어. 시설과 저장은 보존돼.</p><div class="stack">'+[100,500,1000].map(n=>'<button class="action" data-invest="'+n+'">'+n+' G 투자</button>').join('')+'<button class="action sub" data-action="dividend">배당 수령</button><button class="action sub" data-action="support">항구 방어 지원</button><button class="action" data-action="alliance">현 통제국과 동맹</button></div>'+
 '<h3>국가 외교</h3>'+['이베리아 왕실','프랑스 항구동맹'].map(f=>'<div class="scene-card"><strong>'+f+' · '+(state.diplomacy[f]<0?'적대':'중립')+'</strong><p>적대 선언 시 순찰함이 공격해. 휴전에는 500 G가 필요해.</p><button class="action" data-diplomacy="'+f+'">'+(state.diplomacy[f]<0?'휴전 교섭':'적대 선언')+'</button></div>').join('')+
 '<h3>왕실 임무</h3><button class="action sub" data-panel-open="quests">해적 소탕 임무 보기</button><h3>'+info.hero.name+'의 이야기</h3>'+storyCard();
}
function jobs(){return '<h3>직업 길드 · 경험 '+state.xp+'</h3><p class="info">직업을 바꿔도 선박·동료·진행 기록은 유지돼. 전직 시 경험을 소모하지 않아.</p>'+JOBS.map(j=>'<div class="scene-card"><strong>'+j.name+'</strong><p>'+j.description+' · 필요 경험 '+j.need+'</p><button class="action" data-job="'+j.id+'" '+(state.job===j.id?'disabled':'')+'>'+(state.job===j.id?'현재 직업':'전직')+'</button></div>').join('');}
function storyCard(){const {hero,chapter,ready}=storyStatus(state);return '<div class="scene-card"><strong>'+hero.goal+'</strong><p>'+hero.intro+'</p>'+(chapter?'<h3>제'+(state.storyChapter+1)+'장 · '+chapter[1]+'</h3><p>'+chapter[2]+'</p><p class="info">'+(state.storyChapter===2?'발견 보고 1건을 마치고 ':'')+port(chapter[0]).name+'에서 단서를 확인해.</p><button class="action sub" data-route="'+chapter[0]+'">목표 항구로</button> <button class="action" data-action="story" '+(!ready?'disabled':'')+'>이야기 진행</button>':'<h3>유럽 1부 완료</h3><p>고향으로 보낼 기록을 정리했어. 다음 바다로 향할 단서가 남아 있어.</p>')+'</div>';}
// 메인: 자주 쓰는 세 가지만 노출하고 나머지는 기존 화면으로 연결한다.
function menu(){
 const p=canDock(state);
 const entries=[['crew','동료·선원','선원 배치와 소문'],['inventory','가방·발견','화물과 소모품'],['market','교역','시세와 거래'],['fleet','조선소','선박 장비와 수리'],['quests','탐험·의뢰','유적과 보상'],['chart','세계 해도','항로와 보물'],['jobs','직업','직업 변경'],['palace','왕궁·외교','동맹과 투자'],['journal','이야기·기록','저장과 지난 기록']];
 return '<p class="info">필요한 메뉴만 선택해. 항구 시설은 가까운 항구에 입항해야 이용할 수 있어.</p><div class="quick-menu">'+entries.map(([id,label,desc])=>{
  const facility=['market','fleet','quests','jobs','palace'].includes(id);
  const disabled=facility&&(!p||!portHasFacility(p.id,id));
  return '<button class="action '+(disabled?'sub':'')+'" data-menu-to="'+id+'" '+(disabled?'disabled':'')+'>'+label+'<small>'+(disabled?'입항 후 이용':desc)+'</small></button>';
 }).join('')+'</div>';
}
function system(){
 return '<p class="info">항해 기록은 자동 저장돼. 홈으로 이동해도 진행 상황은 유지돼.</p>'+
 '<div class="system-actions"><button class="action sub wide" data-action="home">⌂ 홈으로 · 이어하기 화면</button>'+
 '<button class="action sub" data-action="save">지금 저장</button><button class="action sub" data-menu-to="journal">저장·불러오기</button>'+
 '<button class="action" data-action="music">음악 켜기·끄기</button><button class="action" data-action="sound">효과음 '+(soundEnabled?'끄기':'켜기')+'</button>'+
 '<label class="speed-control">항해 배속 '+state.speed+'배 <input id="speedSlider" type="range" min="1" max="16" step="1" value="'+state.speed+'" aria-label="항해 배속 조절"></label><button class="action sub" data-action="auto">자동 해전 '+(state.autoCombat?'켬':'끔')+'</button>'+
 '<button class="action sub" data-action="camera">카메라 시점 변경</button><button class="action sub" data-action="zoom-in">지도 확대 ＋</button><button class="action sub" data-action="zoom-out">지도 축소 －</button>'+
 '<button class="action sub" data-action="repair">긴급 수리</button><button class="action sub" data-menu-to="inventory">소모품 가방</button>'+
 '<button class="action wide" data-action="reset">처음부터 · 새 선장 선택</button></div>'+
 '<p class="info">처음부터는 확인 후 선장을 다시 선택해. 선택 전에는 기존 저장을 지우지 않아.</p>';
}
function journal(){return '<h3>기상·세계 정세</h3><p>'+WEATHER.find(w=>w.id===state.climate.kind).name+' · '+WEATHER.find(w=>w.id===state.climate.kind).description+'</p><p>동맹: '+(state.alliance||'없음')+' · 개척 해역 '+state.charted.length+'구역</p>'+state.worldLog.slice().reverse().map(t=>'<div class="scene-card">'+escapeHtml(t)+'</div>').join('')+storyCard()+'<h3>항해 기록</h3>'+[...state.log].reverse().map(t=>'<div class="row"><small>'+escapeHtml(t)+'</small></div>').join('')+'<h3>휴대폰 저장 관리</h3><p class="info">자동 저장돼. 저장 문자열을 복사해 다른 기기로 옮길 수 있고, 검증값으로 손상 여부를 확인해. 원문을 수정하면 복구되지 않아.</p><div class="stack"><button class="action sub" data-action="save">지금 저장</button><button class="action" data-action="export">저장 복사</button><button class="action sub" data-action="import">저장 가져오기</button><button class="action" data-action="reset">새 항해</button></div><textarea id="saveText" aria-label="저장 내보내기 및 가져오기 문자열" placeholder="저장 복사에 실패하면 여기서 길게 눌러 복사해. 가져올 때는 여기에 붙여넣어."></textarea><h3>자료와 제작</h3><p class="info">Natural Earth 공개 지형 · 기존 Kenney/Buch CC0 자산 · 독자 인물·스토리·절차 작곡 음악. 원작의 음악·인물·대사를 사용하지 않아.</p>';}

const kennyMap='./assets/cc0/map/';
// 승선 동료·선술집 인물·이벤트 초상화: 기존의 상세 수채·반실사 원본 시트를 재사용해 픽셀 얼굴 도감을 대체한다.
const portrait=c=>{
 const hero=CAPTAINS.find(h=>h.id===c.id),host=TAVERN_HOSTS.find(h=>h.id===c.id);
 const crewFaces={thomas:0,isabel:1,willem:2,freya:3,diego:4,
  matteo:5,lucas:6,nikos:7,lorenzo:8,marten:9,etienne:10,
  samira:11,amani:12,arjun:13,rin:14,florence:15,greta:16,eleanor:17};
 // 5장씩 구성된 게임 자체 반실사 원본 아틀라스. 재사용은 새 에셋 다운로드·라이선스 위험이 없다.
 const source=host?'innkeepers':hero?'captains':Number.isInteger(crewFaces[c.id])?['crew','captains','innkeepers'][Math.floor(crewFaces[c.id]/5)%3]:'crew';
 let frame=host?host.face:hero?(hero.maleFace!==undefined?hero.maleFace:hero.face):Number.isInteger(crewFaces[c.id])?crewFaces[c.id]%5:Number(c.portrait||0)%5;
 frame=Math.max(0,Math.min(4,Number(frame)||0));
 const tint=host?0:hero?0:(Number.isInteger(crewFaces[c.id])?crewFaces[c.id]%3-1:0)*5;
 return '<span class="portrait-real" role="img" aria-label="'+escapeHtml(c.name)+' 반실사 인물 초상화" style="background-image:url(./assets/'+source+'.webp);background-position:'+(frame*25)+'% center;--portrait-hue:'+tint+'deg"><span class="portrait-vignette"></span></span>';
};

function portScene(){
 const p=canDock(state),near=nearestPort(state);
 if(!p)return '<div class="scene-card"><h3>해안까지 항해하기</h3><p>가장 가까운 항구는 '+escapeHtml(near.port.name)+'이야. 해도에서 항로를 설정하고 조이스틱으로 접근해.</p><button class="action sub" data-route="'+near.port.id+'">항구로 자동항해</button></div>';
 const readiness=[['식량',Math.floor(state.ship.provisions/2)+'일 이상',state.ship.provisions<20],['선체',Math.round(state.ship.hull/state.ship.maxHull*100)+'%',state.ship.hull/state.ship.maxHull<.65],['선원',state.ship.crew+'/'+state.ship.maxCrew,state.ship.crew<state.ship.maxCrew*.6],['포탄',state.supplies.ammo+'발',state.supplies.ammo<10]],condition=portStatus(state,p.id);
 const scene=PORT_SCENES[p.id],src=kennyMap+(p.id==='dawn'||p.id==='north'?'castle.png':p.id==='storm'?'lighthouse.png':'dock.png');
 const priceAlert=GOODS.filter(g=>PORT_MARKETS[p.id].produces.includes(g.id)||PORT_MARKETS[p.id].imports.includes(g.id)).map(g=>({g,q:marketQuote(state,p.id,g.id)})).filter(v=>v.q.event||v.q.percent>=120||v.q.percent<=75).slice(0,2);
 const buildings={market:['교역소','특산품·현지 시세·대금 결제'],fleet:['조선소','선박 시각화·장비·돛·수리'],crew:['선술집','항해사 영입·소문·친밀도'],palace:['왕궁 · 총독부','작위·외교·지역 정세'],quests:['탐험가 사무실','유적·발견 보고·의뢰'],jobs:['직업 길드','항해 직업 변경']};
 return '<section class="departure-check"><h3>출항 준비 · '+escapeHtml(p.name)+'</h3><div class="readiness-grid">'+readiness.map(([label,value,warn])=>'<div class="'+(warn?'needs-care':'prepared')+'"><small>'+label+'</small><strong>'+value+'</strong><span>'+(warn?'점검 권장':'준비됨')+'</span></div>').join('')+'</div><p class="info">식량은 하루 2개 소비 기준의 최소 유지일이야. 부족한 항목이 있어도 출항은 직접 결정할 수 있어.</p><div class="stack"><button class="action sub" data-upgrade="provisions">식량 보급 · 190 G</button><button class="action sub" data-upgrade="repair">선체 수리</button><button class="action sub" data-upgrade="crew">선원 모집 · 420 G</button></div><p>항만 정세 · 번영 '+condition.prosperity+' · 치안 '+condition.security+' · 상단 영향력 '+condition.influence+'%</p></section><div class="scene-card port-scene"><img alt="Kenney CC0 항구 아이콘" src="'+src+'"><div><h3>'+escapeHtml(p.name)+'</h3><small>'+escapeHtml(p.region)+' · '+escapeHtml(p.faction)+'</small><p>'+escapeHtml(scene.district)+' · 1590년</p><small>이 도시에 있는 시설 '+scene.facilities.length+'곳</small></div></div>'+
 '<div class="scene-card"><strong>지역 명산품 · '+PORT_MARKETS[p.id].produces.map(id=>escapeHtml(GOODS.find(g=>g.id===id).name)).join(' · ')+'</strong><p class="info">교역소 시세 '+state.day+'일 기준 · 매일 재고·가격 갱신</p>'+(priceAlert.length?priceAlert.map(v=>'<small>'+escapeHtml(v.g.name)+' '+v.q.percent+'%'+(v.q.event?' · '+v.q.event:'')+'</small>').join(' · '):'<small>시세 안정</small>')+'</div>'+
 scene.facilities.map(id=>'<div class="row"><div class="desc"><strong>'+buildings[id][0]+'</strong><small>'+buildings[id][1]+'</small></div><button class="action" data-panel-open="'+id+'">방문</button></div>').join('')+
 (!scene.facilities.includes('fleet')?'<div class="scene-card"><strong>일반 부두 · 긴급 보급</strong><p>정식 조선소는 없어. 보급과 응급 수리만 이용할 수 있어.</p><button class="action sub" data-upgrade="provisions">식량 보급</button><button class="action sub" data-upgrade="repair">선체 수리</button><button class="action sub" data-upgrade="crew">선원 모집</button></div>':'')+
 storyCard();
}
function relationshipPanel(id){const rel=relationStatus(state,id);return '<div class="social-box"><strong>친밀도 '+rel.trust+'/100 · '+(rel.bond?'마음을 나눈 인연':rel.trust>=35?'믿을 만한 사이':'서로 알아가는 중')+'</strong><p class="info">하루 대화 1회·선물 1회. 친밀도 35부터 고급 정보, 80과 이야기 1장부터 마음을 전할 수 있어.</p><div class="stack"><button class="action sub" data-contact="'+id+'" '+(rel.lastTalk===state.day?'disabled':'')+'>이야기 나누기</button>'+GIFTS.map(g=>'<button class="action" data-gift="'+g.id+'" data-person="'+id+'" '+(rel.lastGift===state.day||!canDock(state)?'disabled':'')+'>'+g.name+(g.cost?' '+g.cost+' G':'')+'</button>').join('')+'<button class="action sub" data-info="'+id+'" '+(rel.trust<35||rel.lastInfo===state.day?'disabled':'')+'>고급 정보</button><button class="action sub" data-bond="'+id+'" '+(rel.bond||rel.trust<80||!state.completedStories.length?'disabled':'')+'>마음 전하기</button></div></div>';}
function statsLine(c){const s=crewStats(state,c.id);return '<p class="crew-stats">레벨 '+s.level+' · 항해 '+s.navigation+' · 교역 '+s.trade+' · 포술 '+s.gunnery+' · 학술 '+s.scholarship+' · 의술 '+s.medicine+'</p>';}
// 선술집: 상선이 실제로 왕래하며 기록한 방문항·판매 금액·화물 상태를 보여준다.
function roamingMerchants(){
 return '<h3>바다를 오가는 상선들</h3>'+
 MERCHANT_CAPTAINS.map(c=>{
  const m=state.merchants?.find(x=>x.id===c.id);if(!m)return '';
  const here=Math.hypot(state.ship.x-merchantPosition(m).x,state.ship.z-merchantPosition(m).z)<=20;
  const aboard=state.crewRoster.includes(c.id);
  return '<div class="scene-card"><strong>'+escapeHtml(c.name)+(aboard?' · 승선 중':' · 독립 선장')+'</strong><p class="info">'+escapeHtml(port(m.from).name)+' → '+escapeHtml(port(m.to).name)+' · 항해 '+m.voyages+'회 · 화물 '+escapeHtml(GOODS.find(g=>g.id===m.cargo)?.name||'없음')+' '+m.count+'개</p><small>최근 상선 판매 '+fmt(m.lastProfit)+' G · 만남 '+m.met+'회</small><br><button class="action sub" data-hail="'+c.id+'" '+(!here||aboard?'disabled':'')+'>'+(aboard?'함대 동료':'상선 교신 · 이야기·영입')+'</button></div>';
 }).join('');
}
function companions(){
 const home=canDock(state),host=TAVERN_HOSTS.find(h=>h.port===home?.id),news=state.worldLog.at(-1)||'지금 알려진 항구 습격 소식은 없어.',dock=SPECIAL_DOCKS[(Math.floor(state.day/2)+(home?PORTS.indexOf(home):0))%SPECIAL_DOCKS.length];
 return portNpc('crew')+'<h3>선장 · '+state.captain+' · '+JOBS.find(j=>j.id===state.job).name+'</h3>'+storyCard()+roamingMerchants()+(host?'<h3>선술집 주인 · '+host.name+'</h3><div class="crew-card">'+portrait(host)+'<div><p>'+host.story+'</p><p class="info">좋아하는 선물: '+GIFTS.find(g=>g.id===host.likes).name+'</p></div></div>'+relationshipPanel(host.id):'')+'<h3>선술집 소문 · 교역·탐험·정세·조선·인맥</h3>'+[...rumorsAt(state),'기상: '+WEATHER.find(w=>w.id===state.climate.kind).name+' · 다음 관측 '+state.climate.until+'일. 악천후용 범포는 에든버러에서 구할 수 있어.','해상 정세: '+news,'조선 기술: '+port(dock.port).name+'의 '+dock.name+' · '+dock.description,'특수 인맥: 베네치아의 복원가와 암스테르담의 정보상은 신뢰와 항해 실적을 보고 승선을 결정한대.'].map(r=>'<div class="scene-card">'+escapeHtml(r)+'</div>').join('')+TREASURES.filter(t=>!state.treasureClues.includes(t.id)).map(t=>'<div class="row"><strong>'+t.name+' 소문</strong><button class="action" data-clue="'+t.id+'">120 G · 단서 구입</button></div>').join('')+'<h3>선박 담당 배치</h3><p class="info">동료는 영입 후 얻은 경험으로 성장해. 같은 인물은 한 직책만 맡고 주인공은 선장직을 유지해.</p>'+CREW_ROLES.map(r=>'<div class="scene-card"><strong>'+r.name+'</strong><p class="info">'+r.effect+'</p><select data-role="'+r.id+'" aria-label="'+r.name+' 배치"><option value="">미배치</option>'+CREW.filter(c=>state.crewRoster.includes(c.id)&&c.id!==state.captainId).map(c=>'<option value="'+c.id+'" '+(state.assignments[r.id]===c.id?'selected':'')+'>'+escapeHtml(c.name)+'</option>').join('')+'</select></div>').join('')+'<h3>함대 동료</h3>'+
 CREW.filter(c=>state.crewRoster.includes(c.id)).map(c=>'<div class="crew-card">'+portrait(c)+'<div><div class="crew-name">'+escapeHtml(c.name)+' <span class="cargo-badge">'+escapeHtml(c.role)+'</span></div><div class="crew-detail">'+escapeHtml(c.nation)+' · 승선 중</div><p class="crew-lore">'+escapeHtml(c.story)+'</p>'+statsLine(c)+(c.id!==state.captainId?'<button class="action sub" data-bench="'+c.id+'">여관 대기</button>':'')+(['isabel','freya','florence','greta'].includes(c.id)?relationshipPanel(c.id):'')+'</div></div>').join('')+
 '<h3>여관에서 대기 중인 동료</h3>'+state.reserveCrew.map(id=>'<div class="row"><strong>'+escapeHtml(CREW.find(c=>c.id===id).name)+'</strong><button class="action" data-recruit="'+id+'">다시 승선</button></div>').join('')+
 '<h3>이 항구에서 만날 수 있는 인물</h3>'+
 (home?CREW.filter(c=>c.port===home.id&&!state.crewRoster.includes(c.id)&&!state.reserveCrew.includes(c.id)).map(c=>'<div class="crew-card">'+portrait(c)+'<div><div class="crew-name">'+escapeHtml(c.name)+'</div><div class="crew-detail">'+escapeHtml(c.nation)+' · '+escapeHtml(c.role)+'</div><p class="crew-lore">'+escapeHtml(c.story)+'</p>'+statsLine(c)+'<p class="info">'+companionObjective(state,c).text+'</p><p>'+escapeHtml((RECRUIT_STORIES[c.id]||[c.story,'함께 항해할 준비가 됐어.'])[Math.min(1,state.recruitScenes[c.id]||0)])+'</p>'+((state.recruitScenes[c.id]||0)<2?'<button class="action" data-talk="'+c.id+'">이야기 듣기 '+((state.recruitScenes[c.id]||0)+1)+'/2</button>':'<button class="action" data-recruit="'+c.id+'" '+(!companionObjective(state,c).ready?'disabled':'')+'>약속을 지키고 영입</button>')+'</div></div>').join('')||'<p class="info">이곳에서 새로 영입할 동료는 없어.</p>':'<p class="info">항구에 정박하면 여관에서 항해사를 만날 수 있어.</p>');
}
const ITEM_ICONS={"repair":"generic-0018","medicine":"pirate-0107","ammo":"pirate-0105","smoke":"pirate-0107","rations":"pirate-0110","water":"pirate-0102","repairkit":"pirate-0103","tonic":"pirate-0107","survey":"generic-0038","camp":"pirate-0090","tools":"pirate-0118","telescope":"pirate-0118","rapier":"pirate-0123","chart":"generic-0032","compass":"pirate-0118","cargo":"pirate-0119","grain":"pirate-0110","wood":"pirate-0065","spice":"pirate-0090","silk":"pirate-0108","ore":"pirate-0109","tea":"pirate-0090","wine":"pirate-0107","wool":"pirate-0108","glass":"pirate-0107","amber":"pirate-0119","cotton":"pirate-0108","ivorycraft":"pirate-0119","porcelain":"pirate-0121","sails":"pirate-0108","figureheads":"pirate-0122","cannons":"pirate-0104","refits":"pirate-0103","relics":"generic-0038","treasures":"pirate-0119","stone":"generic-0038","roman":"pirate-0119","cave":"pirate-0118","mosaic":"pirate-0122","lagoon":"generic-0032","amberroad":"pirate-0119","bell":"pirate-0122","atlas":"generic-0032","medal":"pirate-0119","london-ports":"pirate-0104","dutch-hold":"pirate-0103","brest-rudder":"pirate-0118","venice-carving":"pirate-0122","north-keel":"pirate-0109"};
let itemCategory='all';
const itemCategories={all:'전체',supplies:'항해 보급',tools:'항해 도구',cargo:'교역품',sails:'범포',figureheads:'선수상',cannons:'함포',refits:'특수 개조',relics:'유적 유물',treasures:'해저 보물'};
function itemImage(item){
 const file=ITEM_ICONS[item.id]||ITEM_ICONS[item.category]||ITEM_ICONS.tools;
 return '<img class="item-icon" src="./assets/cc0/items/'+file+'.png" alt="" width="40" height="40" loading="lazy">';
}
function itemOwned(item){
 if(item.category==='supplies')return Number(state.supplies[item.id])||0;
 if(item.category==='cargo')return state.cargo[item.id]||0;
 if(item.category==='sails')return Number(state.ship.gear.sail===item.id);
 if(item.category==='figureheads')return Number(state.ship.gear.figurehead===item.id);
 if(item.category==='cannons')return Number(state.ship.cannonType===item.id);
 if(item.category==='refits')return Number(state.ship.regionalMods.includes(item.id));
 if(item.category==='relics')return Number(state.discoveries.includes(item.id));
 if(item.category==='treasures')return Number(state.treasures.includes(item.id));
 return Number(state.equipment?.[item.id])||0;
}
function inventory(){
 const library=itemLibrary(),dock=canDock(state);
 const rows=library.filter(i=>itemCategory==='all'||i.category===itemCategory).map(item=>{
  const count=itemOwned(item),cost=state.job==='merchant'&&item.category==='supplies'?Math.ceil(item.cost*.9):item.cost;
  const status=item.category==='refits'?(count?'개조 완료':'미개조'):item.category==='relics'?(count?(state.reported.includes(item.id)?'보고 완료':'발견 · 미보고'):'미발견'):item.category==='treasures'?(count?'인양 완료':'미발견'):['sails','figureheads','cannons'].includes(item.category)?(count?'장착 중':'미장착'):(count?'보유 '+count:'미보유');
  let actions='';
  if(item.category==='supplies')actions=(dock?'<button class="action sub" data-buy-supply="'+item.id+'" '+(state.coins<cost?'disabled':'')+'>'+cost+' G 구매</button>':'')+(item.id!=='ammo'?'<button class="action" data-use-supply="'+item.id+'" '+(!count?'disabled':'')+'>사용</button>':'');
  else if(['sails','figureheads','cannons'].includes(item.category))actions='<button class="action sub" data-panel-open="fleet">조선소에서 장착</button>';
  else if(item.category==='cargo')actions='<button class="action sub" data-panel-open="market">교역소 시세</button>';
  else if(item.category==='refits')actions='<button class="action sub" data-panel-open="fleet">도시별 조선소</button>';
  else if(item.category==='relics')actions='<button class="action sub" data-panel-open="quests">유적 조사</button>';
  else if(item.category==='treasures')actions='<button class="action sub" data-panel-open="chart">해도·보물 수색</button>';
  return '<div class="row item-row">'+itemImage(item)+'<div class="desc"><small>'+itemCategories[item.category]+' · '+status+'</small><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.description)+'</small><small>입수: '+escapeHtml(item.source)+(item.category==='refits'?' · '+fmt(item.cost)+' G':'')+'</small></div><div class="stack">'+actions+'</div></div>';
 }).join('');
 return '<h3>기함 상세 · '+SHIP_TYPES.find(t=>t.id===state.shipType).name+'</h3><p>선체 '+Math.round(state.ship.hull)+' / '+state.ship.maxHull+' · 선원 '+state.ship.crew+' / '+state.ship.maxCrew+' · 돛 '+state.ship.sail+' · 함포 '+state.ship.cannons+'문</p><h3>항해 아이템 도감 · '+library.length+'종</h3><p>보유 수량과 장착 상태는 현재 저장 기록 기준이야. 교역품은 화물창, 보급품은 별도 가방에 보관해.</p><div class="ship-tabs item-tabs" role="group" aria-label="아이템 종류">'+Object.entries(itemCategories).map(([id,label])=>'<button class="action '+(id===itemCategory?'':'sub')+'" data-item-category="'+id+'" aria-pressed="'+(id===itemCategory)+'">'+label+'</button>').join('')+'</div><div class="kpi"><div>화물 적재<b>'+cargoWeight(state)+' / '+state.ship.cargoLimit*state.fleet+'</b></div><div>보유 금화<b>'+fmt(state.coins)+' G</b></div><div>항해 보급<b>'+state.ship.provisions+' / 140</b></div></div>'+rows+
 '<h3>발견 기록</h3>'+SITES.filter(t=>state.discoveries.includes(t.id)).map(t=>'<div class="scene-card"><strong>'+t.relic+'</strong><p>'+t.name+' · '+(state.reported.includes(t.id)?'보고 완료':'미보고')+'</p><small>'+t.lore+'</small></div>').join('')+TREASURES.filter(t=>state.treasures.includes(t.id)).map(t=>'<div class="scene-card"><strong>'+t.relic+'</strong><p>'+t.name+'</p></div>').join('');
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
 const titles={battle:'육지 전투',jobs:'직업 길드',palace:'왕궁 · 총독부',port:'항구 · 선술집 · 조선소',crew:'선장과 항해사',inventory:'항해 가방과 화물',chart:'세계 해도',market:'항구 교역소',fleet:'함대와 조선소',quests:'계약과 탐험',journal:'항해 기록',menu:'전체 메뉴',system:'시스템'};
 view.head.textContent=titles[active];
 view.body.innerHTML=({battle:battlePanel,palace,jobs,port:portScene,crew:companions,inventory,chart,market,fleet,quests,journal,menu,system}[active]||chart)();if(town&&PORT_SCENES[canDock(state)?.id]?.facilities.includes(active)){const p=canDock(state),focus={market:'20% 17%',crew:'20% 36%',jobs:'20% 58%',palace:'80% 17%',quests:'80% 36%',fleet:'80% 58%'}[active];view.body.insertAdjacentHTML('afterbegin','<figure class="facility-panorama"><img src="./assets/harbor.webp" alt="'+escapeHtml(p.name+' '+titles[active])+'" style="object-position:'+focus+'"><figcaption>'+escapeHtml(p.name+' · '+PORT_SCENES[p.id].district+' · '+titles[active])+'</figcaption></figure>');}if(active==='chart')drawChart(mapWorld);view.body.scrollTop=savedScroll;
}
function apply(result){
 if(result.ok){const priorFx=state.combatFx?.serial;state=result.state;save();scene.setState(state);if(state.landBattle){if(active!=='battle')enterBattle();else renderPanel();}else renderPanel();summary();renderEvent();if(state.combatFx?.serial!==priorFx)impactSound();}
 note(result.message);
}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>gotoPanel(b.dataset.panel)));
$('systemOpen').addEventListener('click',()=>gotoPanel('system'));
$('close').addEventListener('click',leaveFacility);
$('dock').addEventListener('click',()=>{if(canDock(state))enterTown();});
$('hail').addEventListener('click',()=>{const id=$('hail').dataset.merchant;if(id)apply(hailMerchant(state,id));});
$('fire').addEventListener('click',()=>apply(fireCannons(state,navalTarget)));
view.body.addEventListener('click',e=>{
 if(e.target.id==='chartMap'){
  if(mapIgnoreClick){mapIgnoreClick=false;return;}
  const c=e.target,r=c.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*c.width,my=(e.clientY-r.top)/r.height*c.height;
  const {cx,cz,scale}=chartViewport(),best=PORTS.map(p=>({p,d:Math.hypot(c.width/2+(p.x-cx)*scale-mx,c.height/2+(p.z-cz)*scale-my)})).sort((a,b)=>a.d-b.d)[0];
  const tapRadius=Math.max(24,28*c.width/Math.max(1,r.width));
  if(best&&best.d<tapRadius&&state.discovered.includes(best.p.id)){
   state=setDestination(state,best.p.id);save();scene.setState(state);renderPanel();note(best.p.name+' 항로 설정');
  }
  return;
 }
 const b=e.target.closest('[data-hail],[data-route],[data-trade],[data-upgrade],[data-action],[data-recruit],[data-panel-open],[data-job],[data-refit],[data-site],[data-explore],[data-office],[data-map],[data-clue],[data-search],[data-buy-supply],[data-use-supply],[data-diplomacy],[data-invest],[data-talk],[data-target],[data-land],[data-cannon],[data-site-event],[data-ship-gear],[data-refine],[data-contact],[data-gift],[data-info],[data-bond],[data-bench],[data-fleet-tab],[data-menu-to],[data-map-view]');
 if(!b)return;
 if(b.dataset.menuTo){gotoPanel(b.dataset.menuTo);return;}
  if(b.dataset.hail){apply(hailMerchant(state,b.dataset.hail));return;}
 if(b.dataset.panelOpen){openFacility(b.dataset.panelOpen);return;}
 if(b.dataset.itemCategory){if(itemCategories[b.dataset.itemCategory])itemCategory=b.dataset.itemCategory;renderPanel();return;}
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
 if(b.dataset.map){mapWorld=b.dataset.map==='world';mapZoom=1;centerChartOnShip();drawChart(mapWorld);return;}
  if(b.dataset.mapView){if(b.dataset.mapView==='center'){mapZoom=1;centerChartOnShip();}
   else mapZoom=Math.max(.65,Math.min(3.2,mapZoom*(b.dataset.mapView==='zoom-in'?1.33:1/1.33)));
   drawChart(mapWorld);return;}
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
  case 'reset':restartGame();break;
   case 'home':openHome();break;
   case 'music':$('music-toggle').click();renderPanel();break;
   case 'sound':$('sfx-toggle').click();renderPanel();break;
   case 'speed':$('speed').click();renderPanel();break;
   case 'camera':$('viewMode').click();renderPanel();break;
   case 'auto':$('autoBattle').click();renderPanel();break;
   case 'zoom-in':$('zoomIn').click();break;
   case 'zoom-out':$('zoomOut').click();break;
   case 'repair':$('quickRepair').click();break;
 }
});
// 해도 한 손 드래그: 지도는 고정 화폭 대신 확대/팬으로 넓은 항로를 탐색한다.
view.body.addEventListener('pointerdown',e=>{if(e.target.id!=='chartMap')return;
 mapPointer={id:e.pointerId,x:e.clientX,y:e.clientY};mapDragged=false;mapIgnoreClick=false;e.target.setPointerCapture?.(e.pointerId);});
view.body.addEventListener('pointermove',e=>{if(!mapPointer||mapPointer.id!==e.pointerId)return;
 const dx=e.clientX-mapPointer.x,dy=e.clientY-mapPointer.y;if(Math.abs(dx)+Math.abs(dy)<1)return;
 const c=$('chartMap');if(!c)return;const r=c.getBoundingClientRect(),{scale}=chartViewport();
 mapPanX-=dx*c.width/Math.max(1,r.width)/scale;mapPanZ-=dy*c.height/Math.max(1,r.height)/scale;
 mapPointer.x=e.clientX;mapPointer.y=e.clientY;mapDragged=true;mapIgnoreClick=true;drawChart(mapWorld);e.preventDefault();
});
for(const kind of ['pointerup','pointercancel','lostpointercapture'])view.body.addEventListener(kind,e=>{if(mapPointer?.id===e.pointerId){mapPointer=null;if(kind==='pointercancel')mapIgnoreClick=false;}});
view.body.addEventListener('change',e=>{if(e.target.matches('select[data-role]'))apply(assignCrew(state,e.target.dataset.role,e.target.value));if(e.target.id==='speedSlider'){state.speed=Math.max(1,Math.min(16,Number(e.target.value)||1));$('speed').textContent=state.speed+'배';save();renderPanel();}});
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
 if(k===' '){apply(fireCannons(state,navalTarget));}
 if(k==='m'){gotoPanel('chart');}
 if(k==='e'&&canDock(state))enterTown();
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();buttons={left:false,right:false,ahead:false,astern:false};stick={x:0,y:0};clearMotionSample();});
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});

const joystick=$('joystickRim'),knob=$('joystickHandle'),stickDock=$('joystick');
let pointer=null,floatingStick=false;
const resetStick=()=>{stick={x:0,y:0};knob.style.transform='translate(-50%,-50%)';};
function updateStick(e){
 const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 const radius=Math.max(22,(Math.min(r.width,r.height)-46)/2),dx=e.clientX-cx,dy=e.clientY-cy,length=Math.hypot(dx,dy);
 const scale=length>radius?radius/length:1,x=dx*scale,y=dy*scale;
 stick.x=Math.max(-1,Math.min(1,x/radius));stick.y=Math.max(-1,Math.min(1,-y/radius));
 knob.style.transform='translate(calc(-50% + '+(stick.x*radius)+'px),calc(-50% - '+(stick.y*radius)+'px))';
}
// 화면 왼쪽 바다 어디서든 스틱 생성. UI/지도/메뉴 터치는 가로채지 않는다.
function startStick(e){
 if(pointer!==null||e.isPrimary===false||e.clientX>window.innerWidth*.54||town||choosing||!ready||
    !view.loading.classList.contains('hide')||view.details.classList.contains('open')||state.landBattle||state.scene||state.event)return;
 if(e.target.closest?.('button,a,input,select,textarea,#nav,#top,#tools,#townbar,#details,#navalEncounter,#seaEvent'))return;
 const anchored=stickDock.contains(e.target);
 if(!anchored&&scene.getCameraMode()==='chart')return;
 if(!anchored&&e.target!==$('sea')&&!e.target.closest?.('#veil,#compass,#windStatus,#foodStatus'))return;
 pointer=e.pointerId;floatingStick=!anchored;
 if(floatingStick){
  const w=joystick.offsetWidth||102,h=joystick.offsetHeight||102;
  stickDock.style.position='fixed';stickDock.style.left=Math.max(5,Math.min(window.innerWidth-w-5,e.clientX-w/2))+'px';
  stickDock.style.top=Math.max(7,Math.min(window.innerHeight-h-16,e.clientY-h/2))+'px';
  stickDock.style.bottom='auto';stickDock.style.right='auto';stickDock.style.zIndex='15';
 }
 resetStick();updateStick(e);
 e.preventDefault();
}
function endStick(e){
 if(pointer===null||e&&e.pointerId!==undefined&&e.pointerId!==pointer)return;
 pointer=null;resetStick();
 if(floatingStick){
  for(const key of ['position','left','top','bottom','right','zIndex'])stickDock.style[key]='';
 }
 floatingStick=false;
}
document.addEventListener('pointerdown',startStick,{capture:true});
document.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();updateStick(e);}},{passive:false});
document.addEventListener('pointerup',endStick);
document.addEventListener('pointercancel',endStick);
window.addEventListener('blur',()=>endStick());
$('sailToggle').addEventListener('click',()=>{sailCruise=!sailCruise;syncSails();note(sailCruise?'돛을 올렸어. 조타 스틱을 밀어 방향을 바꿔.':'돛을 내리고 감속하고 있어.');});
syncSails();
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
$('speed').addEventListener('click',()=>{state.speed=state.speed===1?2:state.speed===2?4:state.speed===4?8:state.speed===8?12:state.speed===12?16:1;$('speed').textContent=state.speed+'배';save();if(active==='system')renderPanel();});
// 메인: 회전식 카메라 대신 선박 중심 45도 위 시점을 제공한다.
$('viewMode').addEventListener('click',()=>{const options=['chase','angle','chart'],next=options[(options.indexOf(scene.getCameraMode())+1)%options.length];scene.setCameraMode(next);$('viewMode').textContent=next==='chase'?'시점: 추적':next==='angle'?'시점: 45도':'시점: 해도';note(next==='chart'?'해도 시점으로 전환했어. 지도 위 항구를 눌러 항로를 설정해.':next==='angle'?'45도 위에서 선박을 내려다보는 고정 시점이야.':'선박을 중앙에 두고 45도 위에서 따라가.');});
$('autoBattle').addEventListener('click',()=>{state.autoCombat=!state.autoCombat;save();summary();note(state.autoCombat?'자동 해전 켬 · 적을 만나면 측면을 잡고 자동 사격해.':'자동 해전 끔 · 수동 조타와 포격을 사용해.');});
$('zoomIn').addEventListener('click',()=>{scene.setZoom(scene.getZoom()*1.35);if(scene.getCameraMode()!=='chart')scene.setCameraDistance(.85);});$('zoomOut').addEventListener('click',()=>{scene.setZoom(scene.getZoom()/1.35);if(scene.getCameraMode()!=='chart')scene.setCameraDistance(1.15);});
$('eventChoices').addEventListener('click',e=>{
 const button=e.target.closest('[data-event]');if(!button)return;
 const choice=Number(button.dataset.event);
 apply(state.scene?dismissStoryScene(state):state.event?.id==='merchant_meeting'?resolveMerchantEncounter(state,choice):resolveSeaEvent(state,choice));
 renderEvent();
});
let renderedEvent='';
function renderEvent(){
 const story=state.scene,meeting=state.event?.id==='merchant_meeting'?state.event:null;
 const e=story||meeting||SEA_EVENTS.find(v=>v.id===state.event?.id);
 const art=$('eventArt');$('seaEvent').hidden=!e;
 if(!e){renderedEvent='';art.classList.remove('show');art.innerHTML='';return;}
 const key=JSON.stringify(e)+':'+(meeting?state.merchants.find(m=>m.id===meeting.merchantId)?.met||0:0);
 if(renderedEvent===key)return;renderedEvent=key;
 let title='',body='',options=[],face=null,caption='';
 if(story?.kind==='prologue'){
  const captain=CAPTAINS.find(c=>c.id===story.captainId)||CAPTAINS[0],step=Math.max(0,Math.min(2,Number(story.step)||0)),first=captain.chapters[0];
  title=['서막 · 떠나야 하는 이유','서막 · 선장의 맹세','제1장 · 첫 번째 단서'][step];
  body=[captain.intro,captain.goal+' 항구를 잇는 교역으로 자금을 모으고, 동료들과 기록의 진실을 찾아가자.',port(first[0]).name+'에 첫 단서가 있어. '+first[2]+' 출항 전 식량과 선체를 점검하자.'][step];
  caption=captain.name+' · '+(step+1)+'/3';face=captain;options=[[step<2?'다음 장면':'항구에서 첫 항해 준비',0,false]];
 }else if(story?.kind==='port-discovery'){
  title=story.title;body=story.text;caption=port(story.portId).name+' · '+PORT_SCENES[story.portId].district;
  options=[['해도에 기록하고 항해 계속',0,false]];
 }else if(story){
  const captain=story.kind==='story'?CAPTAINS.find(c=>c.id===story.captainId):MERCHANT_CAPTAINS.find(c=>c.id===story.merchantId);
  title=story.title;body=story.text;caption=story.kind==='story'?'항해사의 이야기 · 장면 기록':'바다 위에서 이어지는 인연';
  face=story.kind==='story'?CREW.find(c=>c.id===captain?.id):CREW.find(c=>c.id===story.merchantId);
  options=[['이야기를 마치고 항해 계속',0,false]];
 }else if(meeting){
  const captain=MERCHANT_CAPTAINS.find(c=>c.id===meeting.merchantId),m=state.merchants.find(m=>m.id===meeting.merchantId);
  title='상선 교신 · '+captain.name;caption='교역·영입 · 독립 상선';
  body=captain.story+' 현재 '+port(m.from).name+' → '+port(m.to).name+' 항해 중. 화물 '+(GOODS.find(g=>g.id===m.cargo)?.name||'없음')+' ×'+m.count+' · 항해 '+m.voyages+'회 · 대화 '+m.met+'/2회.';
  face=CREW.find(c=>c.id===captain.id);
  options=[['화물 1개 직접 구매',0,!m.count],['선장의 개인 이야기 듣기',1,false],['항해사로 영입',2,m.met<2],['교신 종료',3,false]];
 }else{
  title=e.title;body=e.text;caption='1590년 · 항해 중 사건';
  options=e.options.map((t,i)=>[t,i,false]);
 }
 $('eventTitle').textContent=title;$('eventText').textContent=body;
 $('eventChoices').innerHTML=options.map(([label,id,disabled])=>'<button class="action" data-event="'+id+'" '+(disabled?'disabled':'')+'>'+escapeHtml(label)+'</button>').join('');
 if(face){
  art.classList.add('show');
  art.innerHTML='<span class="scene-caption">'+escapeHtml(caption)+'</span><div class="event-person">'+portrait(face)+'</div>';
 }else{
  art.classList.add('show');
  const discovery=story?.kind==='port-discovery',image=discovery?'./assets/harbor.webp':$('sea').toDataURL('image/jpeg',.75);
  art.innerHTML='<img class="event-view" src="'+image+'" alt="'+escapeHtml(discovery?caption:'현재 항해 해역')+'"><span class="scene-caption">'+escapeHtml(caption)+'</span>';
 }
}

function run(now){
 requestAnimationFrame(run);
 if(now-last<(mobileSailing()?33:24))return;
 const dt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;
 if(!ready||choosing||!view.loading.classList.contains('hide')||document.hidden)return;
 if(view.details.classList.contains('open')||town)return;
 if(state.event||state.scene){renderEvent();return;}
 const left=buttons.left||keys.has('a')||keys.has('arrowleft');
 const right=buttons.right||keys.has('d')||keys.has('arrowright');
 const ahead=buttons.ahead||keys.has('w')||keys.has('arrowup');
 const astern=buttons.astern||keys.has('s')||keys.has('arrowdown');
 // Chase camera's right vector is opposite the world yaw sign.
 // Reverse human steering only; autopilot and saved route physics stay intact.
 const turn=Math.max(-1,Math.min(1,Number(left)-Number(right)-stick.x));
 const userThrottle=Number(ahead)-Number(astern)+stick.y;
 const throttle=Math.max(-1,Math.min(1,Math.abs(userThrottle)>.08?userThrottle:sailCruise?.94:0));
 const manual=left||right||ahead||astern||Math.abs(stick.x)>.08||Math.abs(stick.y)>.08;
 if(manual&&state.destination){state=cancelDestination(state);}
 const oldFx=state.combatFx?.serial;
 syncNavalBattle();
 // 높은 배속도 작은 물리 간격으로 나누어 해안 충돌과 항로·사건을 보존한다.
 let remaining=dt*(navalTarget!==null?1:state.speed);
 const beforeX=state.ship.x,beforeZ=state.ship.z;
 while(remaining>0){const step=Math.min(.08,remaining);state=stepSea(state,{turn,throttle,manual,navalBattle:navalTarget!==null},step);remaining-=step;if(state.event||state.scene||state.landBattle)break;}
 const moved=Math.hypot(state.ship.x-beforeX,state.ship.z-beforeZ);
 travelDistance+=moved;
 // 자동 순항만 해안 좌초를 복구한다. 수동 조타·자동항로·해전에서는 선장의 입력을 우선한다.
 if(sailCruise&&throttle>.25&&!manual&&!state.route.length&&navalTarget===null&&moved<.006&&Math.abs(state.ship.velocity)<.18){
  stuckFor+=dt;
  if(stuckFor>1.55){
   const safer=departureHeading(state),delta=Math.abs(Math.atan2(Math.sin(safer-state.ship.heading),Math.cos(safer-state.ship.heading)));
   if(delta>.04){state.ship.heading=safer;state.ship.rudder=0;note('얕은 물길을 피해 항로를 다시 잡았어.');}
   else if(stuckFor>3){note('해안이 막혔어. 조타 스틱을 왼쪽이나 오른쪽으로 밀어.');}
   stuckFor=0; // 좌초 복구 방향을 시도한 후 재평가한다.
  }
 }else stuckFor=0;
 syncNavalBattle();
 if(state.combatFx&&state.combatFx.serial!==oldFx)impactSound();
 if(state.event){save();renderEvent();}
 scene.setState(state);
 tick+=dt;panelTick+=dt;
 if(tick>1){tick=0;summary();showMotion();}
 if(panelTick>13){panelTick=0;save();}
 if(state.ship.hull<=0){
  note('선체가 파괴됐어. 항구에서 수리를 받거나 새 항해를 시작할 수 있어.');
  state.ship.hull=1;const safe=port(state.homePort)||PORTS[0];state.ship.x=safe.x;state.ship.z=safe.z+2;state.destination=null;state.route=[];state.coins=Math.max(200,state.coins-500);save();
 }
}
$('speed').textContent=state.speed+'배';summary();showMotion();renderEvent();requestAnimationFrame(run);