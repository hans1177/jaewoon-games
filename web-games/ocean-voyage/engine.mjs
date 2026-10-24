import {LAND} from './assets/world.mjs';
// 파일명: web-games/ocean-voyage/engine.mjs
// 메인: 항해·교역·해전·발견·저장. 렌더러와 DOM에 의존하지 않는다.
export const SAVE_KEY='jg-ocean-voyage-v1';
const LEGACY_PORTS=[{id:'dawn',x:0,z:0},{id:'coral',x:74,z:-45},{id:'north',x:-80,z:-76},{id:'gold',x:138,z:50},{id:'jade',x:-136,z:52},{id:'storm',x:32,z:142},{id:'amber',x:-118,z:147},{id:'sun',x:162,z:-137}];
export const PORTS=Object.freeze([
  {id:'dawn',name:'런던',x:12.0,z:-615.6,region:'잉글랜드',faction:'영국 왕실',rates:{grain:.78,wood:.9,spice:1.55,silk:1.35,ore:1.12,tea:1.3}},
  {id:'coral',name:'플리머스',x:-50.4,z:-601.2,region:'잉글랜드 남서부',faction:'영국 왕실',rates:{grain:1.3,wood:1.15,spice:.75,silk:1.42,ore:1.2,tea:1.15}},
  {id:'north',name:'에든버러',x:-33.6,z:-673.2,region:'북해',faction:'영국 왕실',rates:{grain:1.5,wood:.7,spice:1.7,silk:1.8,ore:.85,tea:1.5}},
  {id:'gold',name:'리스본',x:-114.0,z:-462.0,region:'이베리아',faction:'포르투갈 상단',rates:{grain:.95,wood:1.5,spice:1.1,silk:1.12,ore:.78,tea:1.2}},
  {id:'jade',name:'암스테르담',x:51.6,z:-630.0,region:'저지대',faction:'북해 상인연맹',rates:{grain:1.2,wood:1.24,spice:1.35,silk:.69,ore:1.3,tea:.75}},
  {id:'storm',name:'브레스트',x:-56.4,z:-579.6,region:'브르타뉴',faction:'프랑스 항구동맹',rates:{grain:1.65,wood:1.2,spice:.82,silk:1.35,ore:1.65,tea:.8}},
  {id:'amber',name:'함부르크',x:99.6,z:-648.0,region:'북독일',faction:'북해 상인연맹',rates:{grain:.92,wood:1.32,spice:1.72,silk:1.08,ore:1.2,tea:.76}},
  {id:'sun',name:'세비야',x:-79.2,z:-438.0,region:'안달루시아',faction:'이베리아 왕실',rates:{grain:1.35,wood:1.3,spice:.65,silk:.9,ore:1.45,tea:1.5}},
  {id:'marseille',name:'마르세유',x:61.2,z:-516.0,region:'프랑스 남부',faction:'프랑스 항구동맹',rates:{grain:.9,wood:1.1,spice:1.3,silk:1.2,ore:1.4,tea:1.3}},
  {id:'genoa',name:'제노바',x:105.6,z:-529.2,region:'리구리아',faction:'지중해 공화국',rates:{grain:1.4,wood:1.2,spice:1.15,silk:.8,ore:1.1,tea:1.4}},
  {id:'venice',name:'베네치아',x:151.2,z:-542.4,region:'아드리아해',faction:'지중해 공화국',rates:{grain:1.5,wood:1.4,spice:.8,silk:.75,ore:1.3,tea:1.6}},
  {id:'athens',name:'아테네',x:288.0,z:-451.2,region:'에게해',faction:'지중해 공화국',rates:{grain:.85,wood:1.5,spice:1.2,silk:1.4,ore:.9,tea:1.7}},
  {id:'copenhagen',name:'코펜하겐',x:153.6,z:-667.2,region:'발트해',faction:'북해 상인연맹',rates:{grain:1.3,wood:.7,spice:1.7,silk:1.6,ore:.9,tea:1.5}}
]);
// 항구: 유럽 도시의 행정·상업·조선·탐험 시설 배치(저장과 선박 능력치는 독립).
// 항구에 없는 시설은 건물 버튼에도, 도시 내 메뉴에도 표시하지 않는다.
export const PORT_SCENES=Object.freeze({
 dawn:{district:'템스 왕립 항만',layout:0,facilities:['market','fleet','crew','palace','quests','jobs'],marketNpc:'토머스 상회 장부지기',fleetNpc:'왕립 조선 감독관',palaceNpc:'왕실 항만 서기관'},
 coral:{district:'데번 어시장',layout:2,facilities:['market','crew'],marketNpc:'어업 조합 상인'},
 north:{district:'북해 성벽 항구',layout:1,facilities:['market','fleet','crew','quests'],marketNpc:'북해 모직상',fleetNpc:'강화 용골 장인'},
 gold:{district:'테주 강변 교역 지구',layout:3,facilities:['market','fleet','crew','palace','quests'],marketNpc:'향신료 경매인',fleetNpc:'라틴 범선 장인',palaceNpc:'포르투갈 항만 총독'},
 jade:{district:'운하와 동인도 창고',layout:4,facilities:['market','fleet','crew','palace','jobs'],marketNpc:'운하 화물 중개인',fleetNpc:'네덜란드 선창 목수',palaceNpc:'상업 평의회 의원'},
 storm:{district:'브르타뉴 해군 정박지',layout:5,facilities:['market','fleet','quests'],marketNpc:'해안 보급상',fleetNpc:'해군 조타 장인'},
 amber:{district:'한자 동맹 창고 거리',layout:2,facilities:['market','jobs'],marketNpc:'호박 보석 거래상'},
 sun:{district:'과달키비르 조선 지구',layout:4,facilities:['market','fleet','crew','palace','jobs'],marketNpc:'대서양 향신료상',fleetNpc:'안달루시아 조선 기술자',palaceNpc:'왕실 세관 관리'},
 marseille:{district:'지중해 선창과 시장',layout:1,facilities:['market','fleet','crew','palace'],marketNpc:'프로방스 와인상',fleetNpc:'갤리선 건조 장인',palaceNpc:'항만 수비대 장교'},
 genoa:{district:'리구리아 금융 항만',layout:3,facilities:['market','fleet','jobs'],marketNpc:'제노바 상업 은행가',fleetNpc:'리구리아 범선 도제'},
 venice:{district:'대운하와 총독궁',layout:5,facilities:['market','fleet','crew','palace','quests','jobs'],marketNpc:'유리 공예품 경매인',fleetNpc:'아드리아해 돛 제작자',palaceNpc:'베네치아 총독 서기관'},
 athens:{district:'에게해 고대 항구',layout:2,facilities:['market','quests'],marketNpc:'에게해 도자기 상인'},
 copenhagen:{district:'외레순 해협 항구',layout:4,facilities:['market','quests'],marketNpc:'북방 곡물 상인'}
});
export const portHasFacility=(portId,facility)=>Boolean(PORT_SCENES[portId]?.facilities.includes(facility));
export const GOODS=Object.freeze([
  {id:'grain',name:'곡물',base:75,weight:1},
  {id:'wood',name:'목재',base:95,weight:1},
  {id:'spice',name:'향신료',base:235,weight:1},
  {id:'silk',name:'비단',base:310,weight:1},
  {id:'ore',name:'철광석',base:160,weight:2},
  {id:'tea',name:'차',base:180,weight:1},
  {id:'wine',name:'포도주',base:145,weight:1,ports:['gold','sun','marseille']},
  {id:'wool',name:'모직물',base:190,weight:1,ports:['dawn','coral','north']},
  {id:'glass',name:'유리 공예',base:285,weight:1,ports:['venice','genoa']},
  {id:'amber',name:'호박 보석',base:360,weight:1,ports:['copenhagen','amber']},
  {id:'cotton',name:'면직물',base:170,weight:1,ports:['goa','alexandria']},
  {id:'ivorycraft',name:'코코넛 공예',base:210,weight:1,ports:['zanzibar']},
  {id:'porcelain',name:'도자기',base:340,weight:1,ports:['nagasaki']}
]);

// 항구별 공급·수요 정책: 대항해식 지역 명산과 수입품 배치. 기존 교역품 ID를 그대로 사용한다.
export const PORT_MARKETS=Object.freeze({
 dawn:{produces:['grain','wood','wool'],imports:['spice','tea','silk'],demand:['spice','tea','glass']},
 coral:{produces:['grain','wood','wool'],imports:['wine','ore'],demand:['wine','spice','glass']},
 north:{produces:['wood','wool','ore'],imports:['grain','wine'],demand:['spice','silk','grain']},
 gold:{produces:['wine','spice'],imports:['ore','wood','silk'],demand:['wool','tea','glass']},
 jade:{produces:['grain','wool','tea'],imports:['glass','spice','silk'],demand:['wine','ore','amber']},
 storm:{produces:['wood','grain'],imports:['wine','ore'],demand:['spice','wool','silk']},
 amber:{produces:['amber','grain','wood'],imports:['wool','wine'],demand:['glass','spice','tea']},
 sun:{produces:['wine','ore','grain'],imports:['spice','silk'],demand:['wood','wool','tea']},
 marseille:{produces:['wine','grain','silk'],imports:['ore','glass'],demand:['wool','tea','spice']},
 genoa:{produces:['glass','silk'],imports:['wine','ore','wood'],demand:['grain','wool','amber']},
 venice:{produces:['glass','silk','spice'],imports:['grain','wood'],demand:['wool','amber','tea']},
 athens:{produces:['grain','ore'],imports:['wine','silk'],demand:['wood','glass','tea']},
 copenhagen:{produces:['amber','wood','wool'],imports:['grain','ore'],demand:['wine','spice','silk']}
});
export const TRADE_GROUPS=Object.freeze({grain:'식료',wood:'원자재',spice:'향신료',silk:'직물',ore:'광석',tea:'차',wine:'주류',wool:'직물',glass:'공예품',amber:'보석',cotton:'직물',ivorycraft:'공예품',porcelain:'공예품'});
// 항구 사이를 실제로 이동하는 독립 교역 선장
export const MERCHANT_CAPTAINS=Object.freeze([
 {id:'lorenzo',name:'로렌초 발디',port:'genoa',ports:['genoa','marseille'],goods:['glass','wine'],portrait:7,story:'숨겨진 조선소 계약서를 추적하는 제노바 교역상.'},
 {id:'marten',name:'마르턴 펠트',port:'jade',ports:['jade','dawn'],goods:['tea','wool'],portrait:13,story:'위조된 환어음을 조사하는 네덜란드 회계사.'},
 {id:'etienne',name:'에티엔 르루',port:'storm',ports:['storm','coral'],goods:['wine','wool'],portrait:21,story:'폭풍에 실종된 친구의 우편선을 추적하는 해협 선장.'}
]);
export function merchantPosition(m){
 const a=portById(m.from),b=portById(m.to);
 if(!a||!b)return {x:0,z:0,heading:0,length:0};
 // 제노바~마르세유의 해안 우회 항로. 육지를 관통하지 않도록 남쪽 해역을 경유한다.
 const via=m.id==='lorenzo'?(m.from==='genoa'?[{x:103,z:-517},{x:60,z:-508}]:[{x:60,z:-508},{x:103,z:-517}]):[];
 const points=[a,...via,b];
 const lengths=points.slice(1).map((p,i)=>dist(points[i],p));
 const length=lengths.reduce((n,v)=>n+v,0);
 let along=clamp(Number(m.progress)||0,0,1)*length;
 for(let i=0;i<lengths.length;i++){
  if(along<=lengths[i]||i===lengths.length-1){
   const t=clamp(along/Math.max(.001,lengths[i]),0,1),p=points[i],q=points[i+1];
   return {x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t,heading:Math.atan2(q.x-p.x,q.z-p.z),length};
  }
  along-=lengths[i];
 }
 return {x:b.x,z:b.z,heading:0,length};
}
export const merchantRoster=()=>MERCHANT_CAPTAINS.map((c,i)=>({id:c.id,from:c.ports[0],to:c.ports[1],progress:.08+i*.12,coins:1700,cargo:c.goods[0],count:4,voyages:0,met:0,lastMeetingDay:-10,lastProfit:0}));
export const CREW=Object.freeze([
 {id:'eleanor',name:'엘리너 그레이',nation:'영국',role:'선장',port:'dawn',portrait:1,story:'런던 해군사관학교 출신. 잃어버린 항로를 되찾으려 한다.'},
 {id:'samira',name:'사미라 알자흐라',nation:'알렉산드리아',role:'학자',port:'alexandria',portrait:11,story:'스승의 별 관측록을 추적하는 학자.'},
 {id:'amani',name:'아마니 음완가',nation:'스와힐리',role:'교역상',port:'zanzibar',portrait:14,story:'고향의 독립 교역망을 세우려는 선장.'},
 {id:'arjun',name:'아르준 라오',nation:'인도',role:'항해사',port:'goa',portrait:22,story:'누나의 계절풍 해도를 완성하려는 항해사.'},
 {id:'rin',name:'하야세 린',nation:'동아시아',role:'선장',port:'nagasaki',portrait:19,story:'가문의 항해 인장을 추적한다.'},
 {id:'florence',name:'플로렌체 벨리니',nation:'베네치아',role:'유물복원가',port:'venice',portrait:1,story:'여관을 동생에게 맡기고 잊힌 항해 기록을 복원하려 한다.'},
 {id:'greta',name:'그레타 호프',nation:'네덜란드',role:'협상가',port:'jade',portrait:1,story:'선술집의 인맥으로 독립 상단의 교섭을 돕는 정보상.'},
 {id:'thomas',name:'토머스 리드',nation:'영국',role:'항해사',port:'dawn',portrait:5,story:'북해를 항해한 풍향 전문가.'},
 {id:'isabel',name:'이사벨 두아르테',nation:'포르투갈',role:'교역사',port:'gold',portrait:11,story:'리스본의 향신료 교역과 계약에 정통한 상인.'},
 {id:'willem',name:'빌럼 판다이크',nation:'네덜란드',role:'포술장',port:'jade',portrait:14,story:'북해의 함포를 다뤄온 항해자.'},
 {id:'freya',name:'프레야 린드',nation:'북유럽',role:'측량사',port:'north',portrait:19,story:'해도와 별자리를 읽는 탐험가.'},
 {id:'diego',name:'디에고 알바레스',nation:'스페인',role:'조선사',port:'sun',portrait:22,story:'세비야에서 대형 범선을 수리하던 선박 기술자.'},
 {id:'matteo',name:'마테오 페라로',nation:'제노바',role:'조선사',port:'genoa',portrait:4,story:'사라진 설계도와 아버지의 명예를 되찾으려 한다.'},
 {id:'lucas',name:'루카스 판데르',nation:'네덜란드',role:'교역상',port:'jade',portrait:14,story:'위조된 환어음을 추적하는 젊은 상인.'},
 {id:'nikos',name:'니코스 알렉시우',nation:'그리스',role:'탐험가',port:'athens',portrait:22,story:'별자리와 해안 바람으로 옛 항로를 복원한다.'},
 {id:'lorenzo',name:'로렌초 발디',nation:'제노바',role:'교역상',port:'genoa',portrait:7,story:'잃어버린 조선소 계약서를 추적하는 청년.'},
 {id:'marten',name:'마르턴 펠트',nation:'네덜란드',role:'회계사',port:'jade',portrait:13,story:'위조된 교역 환어음을 바로잡으려 한다.'},
 {id:'etienne',name:'에티엔 르루',nation:'프랑스',role:'연안 항해사',port:'storm',portrait:21,story:'사라진 우편선을 찾아 해협을 횡단한다.'}
]);
export const EQUIPMENT=Object.freeze([
 {id:'telescope',name:'황동 망원경',group:'항해 장비',description:'먼 항해의 길잡이'},
 {id:'rapier',name:'세이버',group:'호신 장비',description:'선장의 휴대 검'},
 {id:'medicine',name:'약품',group:'소모품',description:'장거리 항해 응급 물자'},
 {id:'chart',name:'영국 해도',group:'발견물',description:'왕립 해군이 보관하던 항로도'},
 {id:'compass',name:'나침반',group:'항해 장비',description:'항해 중 방향을 측정하는 도구'}
]);
export function recruitCompanion(state,id){
 const c=CREW.find(c=>c.id===id),port=canDock(state);
 if(c&&port&&state.reserveCrew.includes(id)){if(state.crewRoster.length>=6)return fail(state,'승선 동료는 선장 포함 6명까지야.');const s=copy(state);s.reserveCrew=s.reserveCrew.filter(x=>x!==id);s.crewRoster.push(id);return success(s,c.name+' 다시 승선');}
 if(!c||!port||port.id!==c.port)return {state,ok:false,message:'동료는 지정된 항구의 여관에서 만나야 해.'};
 if(state.crewRoster.includes(id))return {state,ok:false,message:'이미 함대에 있는 동료야.'};
 if(state.crewRoster.length>=6)return {state,ok:false,message:'동료는 최대 6명이야.'};
 if((state.recruitScenes[id]||0)<2)return fail(state,'먼저 이 동료의 이야기를 두 번 나누고 약속을 확인해.');
 const bond=companionObjective(state,c);if(!bond.ready)return {state,ok:false,message:bond.text};
 const s=copy(state);s.crewRoster.push(id);s.companionBonds[id]=1;s.crewJoinedAt[id]=s.xp;note(s,c.name+' 동료 합류');return {state:s,ok:true,message:c.name+'이(가) 함대에 합류했어.'};
}

export const PORT_RADIUS=3.8;
export const WORLD_LIMIT=2160;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const rand=(seed)=>{let n=(seed>>>0)||1;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;}};
const copy=s=>structuredClone(s);
export function newGame(captainId="eleanor"){
 const hero=CAPTAINS.find(c=>c.id===captainId)||CAPTAINS[0],home=PORTS.find(p=>p.id===hero.port);
 return {
  voyageVersion:2,captainId:hero.id,heroChosen:false,job:hero.job,xp:0,fame:0,rank:0,storyChapter:0,completedStories:[],discoveries:[],reported:[],expedition:null,officeQuests:[],completedOffice:[],companionBonds:{},event:null,scene:null,eventClock:0,eventSerial:0,merchants:merchantRoster(),speed:1,autoCombat:true,shipType:"caravel",tradeLedger:{},portState:{},tavernRelations:{},reserveCrew:[],landBattle:null,clearedCamps:[],combatFx:null,fxSerial:0,assignments:{captain:hero.id,navigator:'',sailing:'',gunnery:'',quartermaster:'',doctor:''},crewJoinedAt:{[hero.id]:0},recruitScenes:{},alliance:null,allianceSupportDay:-10,worldLog:[],climate:{kind:'clear',until:4},treasureClues:[],charted:revealCells([],home.x,home.z),supplies:{repair:3,medicine:2,ammo:40,smoke:2,rations:3},diplomacy:{},supplyCooldown:0,
  version:1,day:1,elapsed:0,coins:3400,discovered:[hero.port],visits:{[hero.port]:1},homePort:hero.port,captain:hero.name,crewRoster:[hero.id],equipment:{telescope:1,rapier:1,medicine:2,chart:1},storyStage:0,
  ship:{x:home.x,z:home.z+2,heading:0,velocity:0,rudder:0,hull:100,maxHull:100,sail:1,cannons:4,crew:34,maxCrew:55,provisions:80,cargoLimit:42,cooldown:0,repairLevel:0,gear:{sail:'standard',figurehead:'none'},regionalMods:[],cannonType:'bronze',armor:0,holdLevel:0,rudderLevel:0,hullLevel:0},
  fleet:1,cargo:{},reputation:{'영국 왕실':0,'포르투갈 상단':0,'북해 상인연맹':0,'프랑스 항구동맹':0,'이베리아 왕실':0},
  route:[],destination:null,exploreTarget:null,autoMode:null,pirates:[
   {id:1,x:-75.0,z:-576.0,heading:1.7,hull:62,maxHull:62,cooldown:4},
   {id:2,x:-129.0,z:-450.0,heading:1.4,hull:76,maxHull:76,cooldown:7},
   {id:3,x:144.0,z:-474.0,heading:1.3,hull:94,maxHull:94,cooldown:10},
   {id:11,x:-96.0,z:-426.0,heading:1,hull:130,maxHull:130,cooldown:6,faction:'이베리아 왕실',name:'이베리아 순찰함',neutral:true},
   {id:12,x:60.0,z:-510.0,heading:2,hull:115,maxHull:115,cooldown:6,faction:'프랑스 항구동맹',name:'프랑스 순찰함',neutral:true}],
  quests:[],victories:0,treasures:[],log:[home.name+'에서 '+hero.name+'의 항해가 시작됐다. '+hero.goal],weather:0,score:0
 };
}
export const loadGame=(storage)=>{try{return restoreGame(storage.getItem(SAVE_KEY));}catch{return newGame();}};
export function restoreGame(raw){
 if(!raw)return newGame();
 try{
  const obj=JSON.parse(raw);
  if(obj?.version!==1||!obj.ship||!Number.isFinite(obj.coins)||!Number.isFinite(obj.ship.x))return newGame();
  const base=newGame();
  const s={...base,...obj,ship:{...base.ship,...obj.ship},cargo:{...base.cargo,...obj.cargo},visits:{...base.visits,...obj.visits},reputation:{...base.reputation,...obj.reputation}};
  if(obj.voyageVersion!==2){
   const old=LEGACY_PORTS.map(p=>({p,d:dist(s.ship,p)})).sort((a,b)=>a.d-b.d)[0].p,newPort=portById(old.id);
   s.ship.x=newPort.x+(s.ship.x-old.x);s.ship.z=newPort.z+(s.ship.z-old.z);s.route=[];s.destination=null;s.voyageVersion=2;s.heroChosen=true;s.pirates=(Array.isArray(s.pirates)?s.pirates:base.pirates).map(e=>{const pos=base.pirates.find(p=>p.id===e.id);return pos?{...e,x:pos.x,z:pos.z}:e;});if(dist(obj.ship,old)<=11||isLand(s.ship.x,s.ship.z)){s.ship.x=newPort.x;s.ship.z=newPort.z+2;}
  }
  s.ship.gear={sail:'standard',figurehead:'none',...(s.ship.gear||{})};s.ship.regionalMods=Array.isArray(s.ship.regionalMods)?[...new Set(s.ship.regionalMods.filter(id=>SPECIAL_DOCKS.some(d=>d.id===id)))]:[];s.tavernRelations=s.tavernRelations&&typeof s.tavernRelations==='object'?s.tavernRelations:{};s.reserveCrew=Array.isArray(s.reserveCrew)?s.reserveCrew.filter(id=>CREW.some(c=>c.id===id)&&!s.crewRoster.includes(id)).slice(0,12):[];
  s.supplies={...base.supplies,...(s.supplies&&typeof s.supplies==='object'?s.supplies:{})};for(const k of Object.keys(base.supplies))s.supplies[k]=clamp(Math.floor(Number(s.supplies[k])||0),0,999);s.diplomacy=s.diplomacy&&typeof s.diplomacy==='object'?s.diplomacy:{};
  s.charted=Array.isArray(obj.charted)?[...new Set(obj.charted.filter(v=>typeof v==='string'&&/^-?\d+:-?\d+$/.test(v)))].slice(-4096):revealCells([],s.ship.x,s.ship.z);
  s.recruitScenes=s.recruitScenes&&typeof s.recruitScenes==='object'?s.recruitScenes:{};s.crewJoinedAt=s.crewJoinedAt&&typeof s.crewJoinedAt==='object'?s.crewJoinedAt:{};s.assignments={captain:s.captainId,navigator:'',sailing:'',gunnery:'',quartermaster:'',doctor:'',...(s.assignments||{})};for(const [role,id] of Object.entries(s.assignments))if(id&&!s.crewRoster.includes(id))s.assignments[role]='';s.assignments.captain=s.captainId;
  s.landBattle=s.landBattle&&SITES.some(t=>t.id===s.landBattle.siteId)&&Array.isArray(s.landBattle.party)&&Array.isArray(s.landBattle.enemies)?s.landBattle:null;
  s.portState=s.portState&&typeof s.portState==='object'?s.portState:{};s.worldLog=Array.isArray(s.worldLog)?s.worldLog.slice(-20):[];s.climate=s.climate&&WEATHER.some(w=>w.id===s.climate.kind)?s.climate:{kind:'clear',until:s.day+3};
  s.heroChosen=Boolean(s.heroChosen);s.captainId=CAPTAINS.some(c=>c.id===s.captainId)?s.captainId:'eleanor';
  for(const field of ['discoveries','reported','completedStories','completedOffice','treasureClues','clearedCamps'])s[field]=Array.isArray(s[field])?[...new Set(s[field].filter(v=>typeof v==='string'))].slice(0,100):[];
  s.officeQuests=Array.isArray(s.officeQuests)?s.officeQuests.filter(q=>OFFICE_QUESTS.some(o=>o.id===q)).slice(0,4):[];
  s.exploreTarget=PORTS.some(p=>p.id===s.exploreTarget)?s.exploreTarget:null;s.destination=PORTS.some(p=>p.id===s.destination)?s.destination:null;
  s.storyChapter=clamp(Number(s.storyChapter)||0,0,3);s.speed=[1,2,4].includes(s.speed)?s.speed:1;s.autoCombat=obj.autoCombat!==false;
  s.event=s.event&&(SEA_EVENTS.some(e=>e.id===s.event.id)||(s.event.id==='merchant_meeting'&&MERCHANT_CAPTAINS.some(c=>c.id===s.event.merchantId)))?s.event:null;
   s.scene=s.scene&&(s.scene.kind==='story'&&CAPTAINS.some(c=>c.id===s.scene.captainId)||s.scene.kind==='merchant'&&MERCHANT_CAPTAINS.some(c=>c.id===s.scene.merchantId))?s.scene:null;
   const ships=Array.isArray(obj.merchants)?obj.merchants:[];
   s.merchants=merchantRoster().map(base=>{const old=ships.find(x=>x?.id===base.id);return old?{...base,from:PORTS.some(p=>p.id===old.from)?old.from:base.from,to:PORTS.some(p=>p.id===old.to)?old.to:base.to,progress:clamp(Number(old.progress)||0,0,1),coins:clamp(Number(old.coins)||0,0,1e8),cargo:GOODS.some(g=>g.id===old.cargo)?old.cargo:base.cargo,count:clamp(Math.floor(Number(old.count)||0),0,12),voyages:clamp(Math.floor(Number(old.voyages)||0),0,1e7),met:clamp(Math.floor(Number(old.met)||0),0,100),lastMeetingDay:Number.isFinite(old.lastMeetingDay)?old.lastMeetingDay:-10,lastProfit:clamp(Math.floor(Number(old.lastProfit)||0),-1e6,1e6)}:base;});
  s.expedition=s.expedition&&SITES.some(e=>e.id===s.expedition.id)?s.expedition:null;
  s.job=JOBS.some(j=>j.id===s.job)?s.job:'adventurer';s.shipType=SHIP_TYPES.some(t=>t.id===s.shipType)?s.shipType:'caravel';
  s.coins=clamp(s.coins,0,1e12);s.day=clamp(Number(s.day)||1,1,1e7);s.captain=CAPTAINS.find(c=>c.id===s.captainId).name;for(const key of ['fame','xp','score','victories','fxSerial','eventSerial'])s[key]=clamp(Math.floor(Number(s[key])||0),0,1e9);s.rank=clamp(Math.floor(Number(s.rank)||0),0,4);s.fleet=clamp(Math.floor(Number(s.fleet)||1),1,3);s.combatFx=null;
  s.ship.gear.sail=SAIL_EQUIPMENT.some(g=>g.id===s.ship.gear.sail)?s.ship.gear.sail:'standard';s.ship.gear.figurehead=FIGUREHEADS.some(g=>g.id===s.ship.gear.figurehead)?s.ship.gear.figurehead:'none';
  s.tavernRelations=Object.fromEntries(Object.entries(s.tavernRelations).filter(([id])=>TAVERN_HOSTS.some(h=>h.id===id)||CREW.some(c=>c.id===id)).map(([id,r])=>[id,{trust:clamp(Math.floor(Number(r?.trust)||0),0,100),lastTalk:Number.isFinite(r?.lastTalk)?r.lastTalk:-1,lastGift:Number.isFinite(r?.lastGift)?r.lastGift:-1,lastInfo:Number.isFinite(r?.lastInfo)?r.lastInfo:-1,bond:r?.bond===true}]));
  s.portState=Object.fromEntries(Object.entries(s.portState).filter(([id])=>PORTS.some(p=>p.id===id)).map(([id,v])=>[id,{owner:PORTS.some(p=>p.faction===v?.owner)?v.owner:portById(id).faction,prosperity:clamp(Number(v?.prosperity)||50,0,100),security:clamp(Number(v?.security)||60,0,100),invested:clamp(Number(v?.invested)||0,0,1e12),influence:clamp(Number(v?.influence)||0,0,100),lastDividend:clamp(Number(v?.lastDividend)||1,0,1e7),raidedUntil:clamp(Number(v?.raidedUntil)||0,0,1e7)}]));
  if(s.expedition){s.expedition.step=clamp(Math.floor(Number(s.expedition.step)||0),0,2);s.expedition.energy=clamp(Number(s.expedition.energy)||0,0,20);s.expedition.notes=Array.isArray(s.expedition.notes)?s.expedition.notes.filter(x=>typeof x==='string').slice(-4):[];s.expedition.event=LAND_EVENTS.some(e=>e.id===s.expedition.event)?s.expedition.event:null;}
  if(s.landBattle){const b=s.landBattle;b.turn=clamp(Math.floor(Number(b.turn)||1),1,1e6);b.actor=clamp(Math.floor(Number(b.actor)||0),0,3);b.enemyActor=clamp(Math.floor(Number(b.enemyActor)||0),0,2);b.phase=['player','enemy','won','lost','retreated'].includes(b.phase)?b.phase:'player';b.party=b.party.filter(p=>CREW.some(c=>c.id===p.id)).slice(0,4).map(p=>({...p,hp:clamp(Number(p.hp)||0,0,10000),maxHp:clamp(Number(p.maxHp)||84,1,10000),focus:clamp(Number(p.focus)||0,0,24),maxFocus:24,guard:p.guard===true}));b.enemies=b.enemies.slice(0,2).map((e,i)=>({...e,id:i,name:LAND_ENEMIES[SITES.findIndex(t=>t.id===b.siteId)].name,hp:clamp(Number(e.hp)||0,0,10000),maxHp:clamp(Number(e.maxHp)||60,1,10000),attack:clamp(Number(e.attack)||10,1,100),weak:clamp(Number(e.weak)||0,0,3)}));b.reward=260+SITES.findIndex(t=>t.id===b.siteId)*70;b.log=Array.isArray(b.log)?b.log.filter(x=>typeof x==='string').slice(-8):[];if(!b.party.length||!b.enemies.length)s.landBattle=null;else b.actor=Math.min(b.actor,b.party.length-1);}
  s.ship.x=clamp(s.ship.x,-WORLD_LIMIT,WORLD_LIMIT);s.ship.z=clamp(s.ship.z,-WORLD_LIMIT,WORLD_LIMIT);
  s.ship.hull=clamp(s.ship.hull,0,s.ship.maxHull||100);s.ship.velocity=clamp(Number(s.ship.velocity)||0,-4,13);s.ship.rudder=clamp(Number(s.ship.rudder)||0,-1,1);s.crewRoster=Array.isArray(s.crewRoster)?[...new Set(s.crewRoster.filter(v=>CREW.some(c=>c.id===v)))].slice(0,6):['eleanor','thomas'];s.equipment=s.equipment&&typeof s.equipment==='object'?{...base.equipment,...s.equipment}:{...base.equipment};
  s.discovered=[...new Set(s.discovered.filter(id=>PORTS.some(p=>p.id===id)))];
  s.route=Array.isArray(s.route)?s.route.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)).slice(0,2500):[];
  s.pirates=Array.isArray(s.pirates)?s.pirates.filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.z)&&e.hull>0).slice(0,24):[];
  for(const enemy of s.pirates){if(enemy.neutral&&isLand(enemy.x,enemy.z)){const home=base.pirates.find(p=>p.id===enemy.id);if(home){enemy.x=home.x;enemy.z=home.z;}}}
  s.log=Array.isArray(s.log)?s.log.slice(-25):[];
  return s;
 }catch{return newGame();}
}
export const serializeGame=s=>JSON.stringify({...s,version:1,log:s.log.slice(-25)});
export const cargoWeight=s=>GOODS.reduce((n,g)=>n+(s.cargo[g.id]||0)*g.weight,0);
export const portById=id=>PORTS.find(p=>p.id===id);
export function nearestPort(s){
 return PORTS.map(p=>({port:p,d:dist(s.ship,p)})).sort((a,b)=>a.d-b.d)[0];
}
export function canDock(s){const p=nearestPort(s);return p.d<=PORT_RADIUS?p.port:null;}
// 경제: 게임시간 하루(기존 16초 항해)를 시세 1틱으로 사용한다. 벽시계·외부 서버에는 의존하지 않는다.
export const marketBaseStock=(portId,goodId)=>{
 const profile=PORT_MARKETS[portId];
 return profile?.produces.includes(goodId)?30:profile?.imports.includes(goodId)?10:0;
};
export function newPortEconomy(){
 return Object.fromEntries(PORTS.map(p=>[p.id,{
  stock:Object.fromEntries(GOODS.map(g=>[g.id,marketBaseStock(p.id,g.id)])),
  pressure:Object.fromEntries(GOODS.map(g=>[g.id,0])),
  history:{}
 }]));
}
export function marketEvent(s,portId,goodId,day=s?.day||1){
 const tick=Math.floor(Number(day)/4);if(tick<1||day%4>1)return null;
 const p=PORTS[(tick*5+2)%PORTS.length],profile=PORT_MARKETS[p.id];
 if(p.id!==portId)return null;
 const kind=tick%3===0?'과잉':tick%3===1?'폭등':'유행';
 const product=tick%2===0?profile.produces[0]:profile.demand[0];
 if(kind==='유행'?TRADE_GROUPS[goodId]!==TRADE_GROUPS[product]:goodId!==product)return null;
 return {kind,good:product,until:tick*4+1,factor:kind==='과잉'?.68:kind==='폭등'?1.6:1.32};
}
export function marketShock(s,portId,goodId){
 const v=s?.marketShocks?.[portId];
 return v?.good===goodId&&Number(v.until)>=s.day?v:null;
}
export function priceAt(portId,goodId,day=1,mode='buy',state=null){
 const p=portById(portId),g=GOODS.find(item=>item.id===goodId);
 if(!p||!g)return 0;
 const wave=Math.sin(Math.floor(day)*.31+PORTS.indexOf(p)*1.7+GOODS.indexOf(g)*2.1)*.075;
 const value=g.base*(p.rates[g.id]??(g.ports?.includes(p.id)?.65:1.35));
 let multiplier=1+wave;
 if(state){
  const current=state.economy?.[portId],base=marketBaseStock(portId,goodId);
  const stock=current?.stock?.[goodId]??base,pressure=current?.pressure?.[goodId]||0;
  const demand=PORT_MARKETS[portId]?.demand.includes(goodId)? .12:0;
  const scarcity=base?Math.max(-.24,Math.min(.3,(base-stock)/Math.max(10,base)*.27)):.09;
  const prosperity=(portStatus(state,portId).prosperity-50)*.001;
  multiplier+=demand+scarcity+Math.max(-.3,Math.min(.3,pressure*.013))+prosperity;
  const event=marketEvent(state,portId,goodId,day),shock=marketShock(state,portId,goodId);
  if(event)multiplier*=event.factor;
  if(shock)multiplier*=shock.kind==='품귀'?1.3:.7;
 }
 multiplier=Math.max(.4,Math.min(2.35,multiplier));
 return Math.max(1,Math.round(value*multiplier*(mode==='buy'?1.08:.90)));
}
export function marketQuote(s,portId,goodId){
 const profile=PORT_MARKETS[portId],base=marketBaseStock(portId,goodId),item=s.economy?.[portId];
 const stock=item?.stock?.[goodId]??base,history=(item?.history?.[goodId]||[]).slice(-7);
 const price=priceAt(portId,goodId,s.day,'buy',s),sell=priceAt(portId,goodId,s.day,'sell',s);
 const reference=priceAt(portId,goodId,s.day,'buy'),percent=Math.round(price/reference*100);
 const kind=profile?.produces.includes(goodId)?'명산품':profile?.imports.includes(goodId)?'수입품':'미취급';
 const event=marketShock(s,portId,goodId)||marketEvent(s,portId,goodId);
 return {buy:price,sell,stock,base,kind,percent,history,event:event?.kind||null,demand:profile?.demand.includes(goodId)||false,group:TRADE_GROUPS[goodId]};
}

export function trade(state,portId,goodId,amount,mode){
 const s=copy(state),port=canDock(s),good=GOODS.find(g=>g.id===goodId);
 const qty=Number(amount);
 if(!port||port.id!==portId||!good||!Number.isSafeInteger(qty)||qty<=0||qty>999||!['buy','sell'].includes(mode))return {state,ok:false,message:'항구에 정박하고 수량을 확인해.'};
 const price=priceAt(portId,goodId,s.day,mode),count=s.cargo[goodId]||0;
 if(mode==='buy'){
  if(price*qty>s.coins)return {state,ok:false,message:'금화가 부족해.'};
  if(cargoWeight(s)+good.weight*qty>s.ship.cargoLimit*s.fleet)return {state,ok:false,message:'화물칸이 부족해.'};
  s.coins-=price*qty;s.cargo[goodId]=count+qty;
 }else{
  if(count<qty)return {state,ok:false,message:'판매할 물품이 부족해.'};
  s.coins+=price*qty;s.cargo[goodId]=count-qty;
 }
 if(mode==='sell'){s.tradeLedger[port.id]=(s.tradeLedger[port.id]||0)+price*qty;s.xp+=qty*2;}
 s.reputation[port.faction]=(s.reputation[port.faction]||0)+qty;
 s.score+=qty;
 note(s,port.name+'에서 '+good.name+' '+qty+'개 '+(mode==='buy'?'구매':'판매')+' 완료');
 return {state:s,ok:true,message:good.name+' '+qty+'개 '+(mode==='buy'?'구매':'판매')+' 완료'};
}
export function buyUpgrade(state,kind){
 const p=canDock(state);if(!p)return {state,ok:false,message:'항구에서만 보급과 개조가 가능해.'};
 if(!portHasFacility(p.id,'fleet')&&!['repair','provisions','crew'].includes(kind))return fail(state,'이 항구에는 조선소가 없어. 전문 조선 항구를 방문해.');
 const s=copy(state),costs={repair:Math.ceil((s.ship.maxHull-s.ship.hull)*8),provisions:190,crew:420,sail:950+s.ship.sail*700,cannon:780+s.ship.cannons*85,ship:3300+(s.fleet-1)*2600,plating:1500+s.ship.armor*1200,hold:1300+s.ship.holdLevel*900,rudder:1200+s.ship.rudderLevel*700,hull:1800+s.ship.hullLevel*1400};
 if(({plating:s.ship.armor,hold:s.ship.holdLevel,rudder:s.ship.rudderLevel,hull:s.ship.hullLevel}[kind]||0)>=3)return fail(state,'해당 설비는 최고 단계야.');
 const cost=costs[kind];if(!Number.isFinite(cost))return {state,ok:false,message:'없는 개조야.'};
 if(cost>s.coins)return {state,ok:false,message:'금화가 부족해. 필요: '+cost};
 if(kind==='ship'&&s.fleet>=3)return {state,ok:false,message:'함대는 최대 3척까지 운용할 수 있어.'};
 if(kind==='crew'&&s.ship.crew>=s.ship.maxCrew)return {state,ok:false,message:'선원이 이미 가득해.'};
 if(kind==='sail'&&s.ship.sail>=4)return {state,ok:false,message:'최고급 돛이야.'};
 if(kind==='cannon'&&s.ship.cannons>=16)return {state,ok:false,message:'함포가 가득해.'};
 s.coins-=cost;
 if(kind==='repair')s.ship.hull=s.ship.maxHull;
 if(kind==='provisions')s.ship.provisions=Math.min(140,s.ship.provisions+50);
 if(kind==='crew')s.ship.crew=Math.min(s.ship.maxCrew,s.ship.crew+12);
 if(kind==='sail')s.ship.sail++;
 if(kind==='cannon')s.ship.cannons+=2;
 if(kind==='ship')s.fleet++;
 if(kind==='plating')s.ship.armor++;
 if(kind==='hold'){s.ship.holdLevel++;s.ship.cargoLimit+=18;}
 if(kind==='rudder')s.ship.rudderLevel++;
 if(kind==='hull'){s.ship.hullLevel++;s.ship.maxHull+=30;s.ship.hull+=30;}
 note(s,'항구 조선소: '+({repair:'수리',provisions:'식량',crew:'선원',sail:'돛 개선',cannon:'함포 추가',ship:'함선 구매',plating:'장갑 보강',hold:'화물실 확장',rudder:'타륜 개조',hull:'선체 보강'}[kind])+' (-'+cost+'G)');
 return {state:s,ok:true,message:'개조 완료'};
}
function note(s,text){s.log.push('['+s.day+'일] '+text);if(s.log.length>25)s.log.shift();}
export function contractOffer(s,pid){
 const p=portById(pid);
 if(!p)return null;
 const dayBand=Math.floor(s.day/4);
 const target=PORTS[(PORTS.indexOf(p)+3+dayBand)%PORTS.length];
 return {id:pid+'-'+dayBand,target:target.id,good:GOODS[(dayBand+PORTS.indexOf(p))%GOODS.length].id,count:4+(dayBand%3),reward:700+dayBand*85};
}
export function takeContract(state,pid){
 const port=canDock(state);if(!port||port.id!==pid)return {state,ok:false,message:'항구에 정박해야 해.'};
 const s=copy(state),q=contractOffer(s,pid);
 if(s.quests.some(x=>x.id===q.id))return {state,ok:false,message:'이미 수주한 계약이야.'};
 if(s.quests.length>=4)return {state,ok:false,message:'계약은 최대 4개까지.'};
 s.quests.push(q);note(s,'계약 수주: '+portById(q.target).name+' 납품');
 return {state:s,ok:true,message:'운송 계약을 수주했어.'};
}
export function fulfillContracts(state){
 const port=canDock(state);if(!port)return {state,ok:false,message:'항구에 정박해.'};
 const s=copy(state);let count=0;
 s.quests=s.quests.filter(q=>{
  if(q.target!==port.id||(s.cargo[q.good]||0)<q.count)return true;
  s.cargo[q.good]-=q.count;s.coins+=q.reward;s.score+=q.reward;count++;
  note(s,'운송 계약 완료 +'+q.reward+'G');return false;
 });
 return {state:s,ok:count>0,message:count?count+'건의 계약 보상 지급':'완료 가능한 계약이 없어.'};
}
// 항로 계산: 격자 A*; 육지 반경을 피해 항해한다. 사용자 조종도 유지.

export function navigationRoute(from,to,segment=false){
 if(!to||!Number.isFinite(to.x)||!Number.isFinite(to.z))return [];
 const med=p=>p.x>-60&&p.z>-564&&p.z<-336;
 if(!segment&&med(from)!==med(to)){let gates=[{x:-144,z:-540},{x:-132,z:-432},{x:-72,z:-429.6},{x:-48,z:-429.6},{x:24,z:-456}];if(med(from))gates.reverse();let at=from,out=[];for(const target of [...gates,to]){const part=navigationRoute(at,target,true);if(!part.length)return [];out.push(...part);at=target;}return out;}
 const cell=1,size=4321,zero=2160;
 const coord=v=>clamp(Math.round(v/cell)+zero,0,size-1);
 const sx=coord(from.x),sz=coord(from.z),tx=coord(to.x),tz=coord(to.z);
 const key=(x,z)=>x+z*size,goal=key(tx,tz),start=key(sx,sz);
 const blocked=(x,z)=>{const point={x:(x-zero)*cell,z:(z-zero)*cell};if(PORTS.some(p=>dist(point,p)<5))return false;return isLand(point.x,point.z);};
 const edgeBlocked=(x,z,dx,dz)=>{for(let i=1;i<=10;i++)if(blocked(x+dx*i/10,z+dz*i/10))return true;return false;};
 const open=[],fromKey=new Map(),cost=new Map([[start,0]]),closed=new Set();
 const push=node=>{let i=open.length;open.push(node);while(i>0){const parent=(i-1)>>1;if(open[parent].f<=node.f)break;open[i]=open[parent];i=parent;}open[i]=node;};
 const pop=()=>{const first=open[0],tail=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let c=i*2+1;if(c+1<open.length&&open[c+1].f<open[c].f)c++;if(open[c].f>=tail.f)break;open[i]=open[c];i=c;}open[i]=tail;}return first;};
 push({x:sx,z:sz,g:0,f:Math.hypot(tx-sx,tz-sz)});
 let steps=0;
 while(open.length&&steps++<100000){
  const cur=pop(),k=key(cur.x,cur.z);
  if(closed.has(k))continue;
  if(k===goal){
   const route=[];let at=k;
   while(at!==start&&route.length<2500){
    route.push({x:(at%size-zero)*cell,z:(Math.floor(at/size)-zero)*cell});
    at=fromKey.get(at);if(at===undefined)break;
   }
   route.reverse();route.push({x:to.x,z:to.z});return route;
  }
  closed.add(k);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[-1,1],[1,-1]]){
   const x=cur.x+dx,z=cur.z+dz,nk=key(x,z);
   if(x<0||z<0||x>=size||z>=size||blocked(x,z)||closed.has(nk)||edgeBlocked(cur.x,cur.z,dx,dz)||(dx&&dz&&(blocked(cur.x+dx,cur.z)||blocked(cur.x,cur.z+dz))))continue;
   const g=cur.g+Math.hypot(dx,dz);
   if(g>=(cost.get(nk)??Infinity))continue;
   cost.set(nk,g);fromKey.set(nk,k);
   push({x,z,g,f:g+Math.hypot(tx-x,tz-z)*1.12});
  }
 }
 return [];
}
export function setDestination(state,id){
 const p=portById(id);if(!p)return state;
 const s=copy(state);s.destination=id;s.route=navigationRoute(s.ship,p);s.exploreTarget=null;s.autoMode='known';const known=new Set(s.charted),unknown=s.route.findIndex(v=>!known.has(Math.floor(v.x/24)+':'+Math.floor(v.z/24)));if(unknown>=0){s.route=s.route.slice(0,unknown);s.exploreTarget=id;s.autoMode='frontier';}if(!s.route.length){note(s,s.autoMode==='frontier'?'여기부터 미개척 해역이야. 조타 스틱으로 먼저 탐색해.':'항로를 찾지 못했어. 해안에서 조금 떨어져 다시 설정해.');s.destination=null;return s;}
 note(s,(s.autoMode==='frontier'?'밝혀진 해역 끝까지 이동: ':'개척 항로 자동항해: ')+p.name);return s;
}
export function cancelDestination(state){const s=copy(state);s.destination=null;s.route=[];s.exploreTarget=null;s.autoMode=null;return s;}
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
// 독립 상단 항해 시뮬레이션
function advanceMerchantFleet(s,dt){for(const m of s.merchants){if(s.crewRoster.includes(m.id))continue;const a=portById(m.from),b=portById(m.to);if(!a||!b)continue;m.progress+=dt*2.65/Math.max(5,merchantPosition(m).length);if(m.progress<1)continue;const income=m.count*priceAt(m.to,m.cargo,s.day,'sell');m.coins+=income;m.lastProfit=income;m.voyages++;const old=m.from;m.from=m.to;m.to=old;m.progress=0;const spec=MERCHANT_CAPTAINS.find(c=>c.id===m.id);if(spec){m.cargo=spec.goods[m.voyages%spec.goods.length];const cost=priceAt(m.from,m.cargo,s.day,'buy');m.count=Math.min(8,Math.floor(m.coins/Math.max(1,cost)));m.coins-=m.count*cost;s.worldLog.push('['+s.day+'일] '+spec.name+' 상선 · '+b.name+' 교역 '+income+' G');s.worldLog=s.worldLog.slice(-20);}}}
export function dismissStoryScene(state){
 if(!state.scene)return fail(state,'현재 진행 중인 대화 장면이 없어.');
 const s=copy(state);s.scene=null;return success(s,'이야기를 항해일지에 기록했어.');
}
export function hailMerchant(state,id){
 const captain=MERCHANT_CAPTAINS.find(c=>c.id===id),vessel=state.merchants?.find(m=>m.id===id);
 if(!captain||!vessel||state.crewRoster.includes(id))return fail(state,'해당 선장은 현재 승선 중이거나 바다에 없어.');
 if(dist(state.ship,merchantPosition(vessel))>20)return fail(state,'상선이 너무 멀리 있어.');
 if(state.event||state.landBattle)return fail(state,'진행 중인 사건을 먼저 해결해.');
 const s=copy(state);s.event={id:'merchant_meeting',merchantId:id};return success(s,captain.name+' 선장의 상선에 다가갔어.');
}
// 선장과의 교신: 화물은 실제 선장의 화물창에서 이동하고, 인연은 항해일 기준으로 진행한다.
export function resolveMerchantEncounter(state,choice){
 const event=state.event,leader=MERCHANT_CAPTAINS.find(c=>c.id===event?.merchantId);
 const m=state.merchants?.find(x=>x.id===leader?.id);
 if(event?.id!=='merchant_meeting'||!leader||!m||![0,1,2,3].includes(choice))return fail(state,'현재 교신할 상선이 없어.');
 if(choice===2&&(m.met<2||state.crewRoster.includes(leader.id)))return fail(state,'서로 다른 날에 두 번 이야기를 나누고 신뢰를 쌓아야 해.');
 if(choice===2&&state.crewRoster.length>=6)return fail(state,'승선 인원은 선장 포함 6명까지야.');
 const s=copy(state),ship=s.merchants.find(v=>v.id===leader.id),captain=CREW.find(c=>c.id===leader.id);
 let msg='';
 if(choice===0){
  const item=GOODS.find(g=>g.id===ship.cargo),price=priceAt(ship.from,ship.cargo,s.day,'buy');
  if(ship.count<1)return fail(state,'상선 화물창이 비어 있어. 다른 항구에서 교역 후 다시 만나.');
  if(s.coins<price)return fail(state,'구매할 금화가 부족해.');
  if(cargoWeight(s)+item.weight>s.ship.cargoLimit*s.fleet)return fail(state,'구매할 화물칸이 부족해.');
  ship.count--;ship.coins+=price;s.coins-=price;s.cargo[item.id]=(s.cargo[item.id]||0)+1;msg=captain.name+'에게 '+item.name+' 1개 구매 · '+price+' G';
 }else if(choice===1){
  const talks=[
   leader.name+' : '+leader.story,
   leader.name+' : '+({lorenzo:'선박 설계도에 같은 인장이 두 번 찍혀 있었어. 똑같은 배가 다른 이름으로 팔린 거야.',marten:'암스테르담과 런던의 환어음에 같은 서명이 남아 있어. 누군가 두 시장의 시세를 조작하고 있어.',etienne:'브레스트의 등대는 분명 꺼져 있었는데, 우편선은 밤새 그 불빛을 따라갔다고 해.'}[leader.id]),
   leader.name+' : 이제 장부와 항로를 함께 대조하자. 내 실력도 네 항해에 보탤 수 있어.'
  ];
  if(ship.lastMeetingDay!==s.day){ship.met=Math.min(3,ship.met+1);ship.lastMeetingDay=s.day;}
  msg=talks[Math.min(ship.met-1,2)]||talks[0];
  s.scene={kind:'merchant',merchantId:ship.id,title:'바다 위의 약속 · '+leader.name,text:msg};
 }else if(choice===2){
  s.crewRoster.push(leader.id);s.crewJoinedAt[leader.id]=s.xp;s.companionBonds[leader.id]=1;
  msg=leader.name+'이(가) 독립 상선 항해를 마치고 동료로 합류했어. 담당 직책에 배치할 수 있어.';
  s.scene={kind:'merchant',merchantId:leader.id,title:'새로운 항해사 · '+leader.name,text:msg};
 }else{msg=leader.name+'과(와) 인사를 나누고 항로로 돌아왔어.';}
 s.event=null;return success(s,msg);
}
export function stepSea(state,input={},seconds=.05){
 if(state.event||state.scene||state.landBattle)return state;
 let s=copy(state);let dt=clamp(Number(seconds)||.05,0,2);
 const ship=s.ship;
 if(ship.hull<=0)return s;
 const sailGear=SAIL_EQUIPMENT.find(g=>g.id===ship.gear.sail)||SAIL_EQUIPMENT[0],figure=FIGUREHEADS.find(g=>g.id===ship.gear.figurehead)||FIGUREHEADS[0],shipDesign=SHIP_TYPES.find(t=>t.id===s.shipType)||SHIP_TYPES[0],climate=WEATHER.find(w=>w.id===s.climate.kind)||WEATHER[0],wind=Math.sin(s.day*.7+s.elapsed*.03)*.4;
 // 메인: 적을 발견하면 항로를 유지한 채 측면 포격 위치를 잡는다. 직접 조타는 우선한다.
 let turn=clamp(Number(input.turn)||0,-1,1),throttle=clamp(Number(input.throttle)||0,-1,1);
 const gun=CANNON_TYPES.find(g=>g.id===ship.cannonType)||CANNON_TYPES[0];
 const hostile=s.pirates.filter(p=>p.hull>0&&(!p.neutral||s.diplomacy[p.faction]<0)&&dist(ship,p)<Math.max(42,gun.range*1.25)).sort((a,b)=>dist(ship,a)-dist(ship,b));
 const combatTarget=s.autoCombat?hostile[0]:null;
 if(combatTarget&&input.manual!==true){
  const bearing=Math.atan2(combatTarget.x-ship.x,combatTarget.z-ship.z),distance=dist(ship,combatTarget);
  const starboard=Math.abs(wrap(bearing+Math.PI/2-ship.heading))<=Math.abs(wrap(bearing-Math.PI/2-ship.heading))?1:-1;
  const preferred=Math.min(24,Math.max(11,gun.range*.65));
  const desired=bearing+starboard*(distance>preferred*1.15?.58:distance<preferred*.72?2.12:Math.PI/2);
  turn=clamp(wrap(desired-ship.heading)*2.1,-1,1);
  throttle=distance<preferred*.72?.74:distance>preferred*1.2?1:.83;
 }else if(s.route.length&&input.manual!==true){
  if(dist(ship,s.route[0])<Math.max(1.4,Math.abs(ship.velocity)*dt*1.15)){
   s.route.shift();
   if(!s.route.length){s.destination=null;ship.velocity=0;note(s,s.autoMode==='frontier'?'미개척 해역의 경계야. 조타 스틱으로 새로운 항로를 열어.':'개척 항로 목적지에 도착했어.');s.autoMode=null;}
  }
  if(s.route.length){
   const r=s.route[0],desired=Math.atan2(r.x-ship.x,r.z-ship.z);
   turn=clamp(wrap(desired-ship.heading)*2,-1,1);throttle=1;
  }
 }
 ship.rudder=clamp((Number(ship.rudder)||0)+(turn-(Number(ship.rudder)||0))*Math.min(1,dt*4),-1,1);ship.heading=wrap(ship.heading+ship.rudder*dt*(.8+ship.sail*.06)*(1+(ship.rudderLevel||0)*.15)*(shipDesign.turn||1)*(sailGear.turn||1)*(figure.turn||1)*(ship.regionalMods.includes('brest-rudder')?1.1:1));
 const laden=1-cargoWeight(s)/Math.max(1,ship.cargoLimit*s.fleet)*.18;
 const speed=(2.1+ship.sail*1.15)*(shipDesign.speed||1)*(sailGear.speed||1)*(figure.speed||1)*(ship.gear.figurehead!=='none'&&ship.regionalMods.includes('venice-carving')?1.02:1)*(1+assignedPower(s,'sailing','navigation')/600)*(1+wind*.24)*(ship.gear.sail==='stormcloth'?Math.max(.93,climate.speed):climate.speed)*laden*(ship.hull/ship.maxHull*.6+.4);
 const targetSpeed=speed*throttle;ship.velocity=(Number(ship.velocity)||0)+(targetSpeed-(Number(ship.velocity)||0))*Math.min(1,dt*(throttle?1.5:.45));if(s.route.length&&input.manual!==true&&!combatTarget)ship.velocity=Math.min(speed,dist(ship,s.route[0])/Math.max(.001,dt));const dx=Math.sin(ship.heading)*ship.velocity*dt,dz=Math.cos(ship.heading)*ship.velocity*dt;
 const nx=clamp(ship.x+dx,-WORLD_LIMIT,WORLD_LIMIT),nz=clamp(ship.z+dz,-1020,900);
 if(!isLand(nx,nz)||PORTS.some(p=>Math.hypot(p.x-nx,p.z-nz)<5)){ship.x=nx;ship.z=nz;}else{ship.velocity=0;if(s.destination){s.route=[];s.destination=null;note(s,'얕은 해안이야. 해도에서 해상 항로를 다시 설정해.');}}
 advanceMerchantFleet(s,dt);
 ship.cooldown=Math.max(0,ship.cooldown-dt);s.supplyCooldown=Math.max(0,(s.supplyCooldown||0)-dt);
 s.elapsed+=dt;s.weather=wind;const sector=Math.floor(ship.x/24)+':'+Math.floor(ship.z/24);if(!s.charted.includes(sector))s.charted=revealCells(s.charted,ship.x,ship.z);
 if(Math.abs(ship.velocity)>.5){s.eventClock+=dt;if(s.eventClock>=40){s.eventClock=0;s.eventSerial++;const events=SEA_EVENTS.filter(e=>e.id!=='privateer'&&e.id!=='merchant_meeting'),e=events[(s.eventSerial+CAPTAINS.findIndex(c=>c.id===s.captainId))%events.length];s.event={id:e.id};ship.velocity=0;note(s,e.title);}}
 if(s.elapsed>=16){
  s.elapsed-=16;s.day++;advanceWorld(s);ship.provisions=Math.max(0,ship.provisions-(assignedPower(s,'quartermaster','trade')>=75?1:2));
  if(ship.provisions===0){ship.hull=Math.max(1,ship.hull-4);ship.crew=Math.max(1,ship.crew-1);note(s,'식량 부족으로 선원과 선체가 약해졌어.');}
 }
 for(const p of PORTS){
  if(dist(ship,p)<17&&!s.discovered.includes(p.id)){
   s.discovered.push(p.id);s.score+=100;note(s,'신항구 발견: '+p.name+' (+탐험점수)');
  }
  if(dist(ship,p)<PORT_RADIUS&&!s.visits[p.id]){
   s.visits[p.id]=1;if(s.exploreTarget===p.id)s.exploreTarget=null;note(s,p.name+' 첫 입항');
  }
 }
 for(const enemy of s.pirates){
  if(enemy.hull<=0||enemy.neutral&&!(s.diplomacy[enemy.faction]<0))continue;
  const d=dist(ship,enemy);
  const angle=Math.atan2(ship.x-enemy.x,ship.z-enemy.z);
  const flank=Math.abs(wrap(angle+Math.PI/2-enemy.heading))<Math.abs(wrap(angle-Math.PI/2-enemy.heading))?1:-1;
  const enemyCourse=d<26?angle+flank*Math.PI/2:angle;
  enemy.heading=wrap(enemy.heading+clamp(wrap(enemyCourse-enemy.heading),-dt*.55,dt*.55));
  if(d<40&&d>15){
   const nx=enemy.x+Math.sin(enemy.heading)*dt*1.2,nz=enemy.z+Math.cos(enemy.heading)*dt*1.2;if(!isLand(nx,nz)){enemy.x=nx;enemy.z=nz;}
  }
  enemy.cooldown=Math.max(0,enemy.cooldown-dt);
  if(d<21&&enemy.cooldown===0&&ship.hull>0){
   const previousHull=ship.hull;ship.hull=Math.max(0,ship.hull-Math.max(1,Math.round((4+Math.floor(enemy.id*1.6))*(1-(ship.armor||0)*.08)*(ship.regionalMods.includes('north-keel')?.94:1))));
   enemy.cooldown=9;s.combatFx={serial:++s.fxSerial,type:'cannon',gun:'bronze',speed:180,from:{x:enemy.x,z:enemy.z},to:{x:ship.x,z:ship.z},damage:previousHull-ship.hull,enemy:true};note(s,'해적 함포에 피격! 선체 내구도 '+Math.round(ship.hull));
  }
 }
 // 자동·수동 모두 동일한 포문·피해·장전·포탄 규칙을 사용한다.
 if(combatTarget&&ship.cooldown<=0&&s.supplies.ammo>0){
  const bearing=Math.atan2(combatTarget.x-ship.x,combatTarget.z-ship.z);
  if(dist(ship,combatTarget)<gun.range&&Math.abs(Math.cos(wrap(bearing-ship.heading)))<.55){
   const volley=fireCannons(s,combatTarget.id);
   if(volley.ok)s=volley.state;
  }
 }
 return s;
}
export function fireCannons(state,targetId=null){
 if(state.landBattle)return fail(state,'먼저 육지 전투를 마치고 출항해.');
 const s=copy(state),ship=s.ship;
 if(ship.cooldown>0||ship.hull<=0)return {state,ok:false,message:'장전 중이거나 전투 불가능해.'};
 if(s.supplies.ammo<=0)return fail(state,'포탄이 없어. 조선소에서 보급해.');
 const gun=CANNON_TYPES.find(g=>g.id===ship.cannonType)||CANNON_TYPES[0];
 const target=s.pirates.filter(p=>p.hull>0&&(!p.neutral||s.diplomacy[p.faction]<0)&&(targetId===null||p.id===targetId)).map(p=>({p,d:dist(p,ship)})).filter(v=>v.d<gun.range).sort((a,b)=>a.d-b.d)[0];
 if(!target)return {state,ok:false,message:'사거리 내 해적선이 없어.'};
 const enemy=target.p,oldHull=target.p.hull;
 const angle=Math.atan2(enemy.x-ship.x,enemy.z-ship.z);
 if(Math.abs(Math.cos(wrap(angle-ship.heading)))>=.55){
  return {state,ok:false,message:'측면 포격이야. 배를 회전시켜 해적을 좌우 측면에 둬.'};
 }
 enemy.hull=Math.max(0,enemy.hull-Math.round(ship.cannons*(3+ship.crew/30)*gun.power*(ship.gear.figurehead==='lion'?1.08:1)*(1+assignedPower(s,'gunnery','gunnery')/500)*Math.max(.6,1-target.d/80)));
 ship.cooldown=gun.reload;s.supplies.ammo--;s.score+=10;s.combatFx={serial:++s.fxSerial,type:'cannon',gun:gun.id,speed:gun.speed,count:ship.cannons,from:{x:ship.x,z:ship.z},to:{x:enemy.x,z:enemy.z},damage:oldHull-enemy.hull,enemy:false};
 note(s,'함포 명중! 적 내구도 '+Math.round(enemy.hull));
 if(enemy.hull===0){s.coins+=400+enemy.id*120;s.victories++;s.score+=250;note(s,'해적 함선 격침! 전리품 획득');}
 if(enemy.hull===0){s.fame+=8;s.xp+=60;}
 return {state:s,ok:true,message:'포격 성공'};
}


// 데이터: 지역별 주인공 · 오리지널 항해 서사
export const CAPTAINS=Object.freeze([
 {id:'eleanor',name:'엘리너 그레이',region:'유럽',nation:'잉글랜드',port:'dawn',job:'adventurer',face:0,goal:'실종된 측량사 아버지의 해도를 복원한다.',intro:'왕립 측량소는 아버지의 항해를 사고로 처리했다. 그러나 회수된 해도에는 지워진 항구가 있다.',chapters:[['coral','봉인된 항해일지','플리머스의 항만 기록에서 실종 선박의 이름을 찾는다.'],['storm','조작된 등대 신호','브레스트에서 해도를 훔친 밀수 조직의 단서를 추적한다.'],['gold','지워진 항로의 증인','리스본에서 유물을 보고하고 아버지가 숨긴 항로를 공개한다.']]},
 {id:'samira',name:'사미라 알자흐라',region:'중동',nation:'알렉산드리아',origin:'알렉산드리아',port:'venice',job:'scholar',face:1,goal:'흩어진 별의 관측록을 모아 사라진 도서관을 찾는다.',intro:'스승이 남긴 관측록에는 별자리 대신 서양 항구의 좌표가 적혀 있다. 지식을 독점하려는 후원자를 피해 출항한다.',chapters:[['venice','유리 속의 별자리','베네치아의 유리공이 보관한 관측 렌즈를 조사한다.'],['genoa','스승의 가명','제노바에서 스승이 다른 이름으로 남긴 서신을 찾는다.'],['athens','불타지 않은 기록','아테네의 고대 유적을 조사하고 관측록을 복원한다.']]},
 {id:'amani',name:'아마니 음완가',region:'아프리카',nation:'스와힐리 해안',origin:'잔지바르',port:'gold',job:'merchant',face:2,goal:'빼앗긴 상선을 되찾고 고향의 독립 교역망을 세운다.',intro:'상단의 부채 장부가 조작되어 가족의 배가 압류됐다. 북쪽 시장의 증인을 찾아 불공정한 계약을 뒤집으려 한다.',chapters:[['gold','봉인 없는 계약서','리스본에서 상단의 위조 계약서를 대조한다.'],['jade','세 개의 거래 장부','암스테르담 교역소에서 거래 기록을 남긴다.'],['dawn','함대의 이름','런던 왕궁에 증거를 제출하고 독립 상단의 권리를 얻는다.']]},
 {id:'arjun',name:'아르준 라오',region:'인도',nation:'인도 서해안',origin:'고아',port:'marseille',job:'navigator',face:3,goal:'계절풍 해도를 완성하고 실종된 누나를 찾는다.',intro:'누나가 마지막으로 남긴 것은 절반짜리 계절풍 해도였다. 서쪽 항구의 선박 등록부가 유일한 단서다.',chapters:[['marseille','푸른 실의 매듭','마르세유 선술집에서 누나의 교역 표식을 추적한다.'],['coral','돌아오지 않은 우편선','플리머스에서 우편선의 항해 기록을 회수한다.'],['north','북해의 편지','에든버러에서 누나의 편지를 열고 다음 항해를 준비한다.']]},
 {id:'rin',name:'하야세 린',region:'동아시아',nation:'일본 규슈',origin:'나가사키',port:'sun',job:'naval',face:4,goal:'도난당한 가문의 항해 인장을 되찾는다.',intro:'가문의 인장이 찍힌 가짜 통행증이 서쪽 바다에서 발견됐다. 범인을 쫓는 항해가 여러 왕실의 밀약과 얽힌다.',chapters:[['sun','붉은 밀랍의 통행증','세비야에서 위조 통행증의 주인을 찾는다.'],['genoa','가면 경매의 초대장','제노바에서 인장을 거래한 중개인을 추적한다.'],['venice','파도 위의 증언','베네치아에서 해적의 증언과 발견 기록을 제출한다.']]},
 {id:'matteo',name:'마테오 페라로',region:'유럽',nation:'제노바 공화국',port:'genoa',job:'navigator',maleFace:0,goal:'사라진 범선 설계도와 아버지의 누명을 되찾는다.',intro:'제노바의 조선소에서 사라진 대양선 도면. 아버지는 실종되고 누군가 똑같은 설계의 배를 팔고 있다.',chapters:[['genoa','봉인된 설계도','조선소의 불탄 장부에서 도면에 찍힌 인장을 찾는다.'],['marseille','바뀐 선박 이름','마르세유에서 가명으로 등록한 시험선의 항적을 추적한다.'],['venice','베네치아의 마지막 증인','베네치아에서 설계도를 빼돌린 상단의 증언을 확보한다.']]},
 {id:'lucas',name:'루카스 판데르',region:'유럽',nation:'네덜란드',port:'jade',job:'merchant',maleFace:2,goal:'조작된 교역 장부를 찾아 무너진 상단을 재건한다.',intro:'운하 창고에서 발견한 두 장의 서로 다른 장부. 가족의 무역회사는 누군가가 만든 가짜 부채로 사라졌다.',chapters:[['jade','암스테르담의 두 장부','운하 거래소에서 누락된 인수증을 찾는다.'],['amber','호박 상인의 증언','함부르크에서 위조 환어음을 발행한 상인을 추적한다.'],['dawn','왕실에 도착한 계산서','런던에서 부채 조작의 증거를 공증한다.']]},
 {id:'nikos',name:'니코스 알렉시우',region:'유럽',nation:'그리스',port:'athens',job:'adventurer',maleFace:4,goal:'별과 바람에 기록된 고대 항로를 다시 찾아낸다.',intro:'어릴 적 들은 바다의 노래에는 별자리보다 정확한 항해 방위가 담겨 있었다. 스승은 그 노래가 금지된 해도라고 말했다.',chapters:[['athens','바람의 돌기둥','아테네 유적에 적힌 바람의 방향을 읽는다.'],['venice','도망친 필사자','베네치아 서고에서 사라진 천문 표를 추적한다.'],['genoa','북쪽을 가리키는 노래','제노바에서 항해 서약을 마치고 해도를 완성한다.']]}
]);
export const JOBS=Object.freeze([
 {id:'adventurer',name:'탐험가',need:0,description:'유적 조사에 필요한 행동력 +2'},
 {id:'merchant',name:'교역상',need:60,description:'탐험 보급 구입 비용 감소'},
 {id:'navigator',name:'항해사',need:90,description:'선원 구조 이벤트의 추가 보상'},
 {id:'scholar',name:'박물학자',need:120,description:'발견 보고 학술 명성 +10'},
 {id:'naval',name:'해군 장교',need:160,description:'왕실 임무 수주 자격'}
]);
export const SHIP_TYPES=Object.freeze([
 {id:'caravel',name:'캐러벨',cost:0,cargo:42,hull:100,sail:1,description:'삼각돛 탐험선 · 기존 시작 선박'},
 {id:'cog',name:'한자 코그',cost:4800,cargo:85,hull:115,sail:1,description:'사각돛 상선 · 넓은 화물창'},
 {id:'carrack',name:'카락',cost:9200,cargo:125,hull:160,sail:2,description:'대양 항해선 · 대형 선루와 복합 돛'},
 {id:'galleon',name:'갤리온',cost:16500,cargo:100,hull:220,sail:2,description:'왕실 군함 · 높은 내구도, 함포 12문'},
 {id:'portugal-caravel',name:'포르투갈 라틴 캐러벨',nation:'포르투갈 상단',rig:'lateen',color:'#b55e44',width:.85,length:1.05,speed:1.12,turn:1.15,cost:6200,cargo:55,hull:115,sail:2,cannons:4,maxCrew:55,description:'삼각 라틴돛 · 빠른 탐험·높은 선회, 적재와 장갑은 작음'},
 {id:'dutch-fluyt',name:'네덜란드 플루트',nation:'북해 상인연맹',rig:'square',color:'#d7a35e',width:1.35,length:1.1,speed:.92,turn:.88,cost:11800,cargo:165,hull:150,sail:2,cannons:6,maxCrew:75,description:'둥근 대형 선미·3개 사각돛 · 최고 화물 용량, 느린 선회'},
 {id:'english-racer',name:'잉글랜드 레이스 갤리온',nation:'영국 왕실',rig:'square',color:'#a55345',width:.9,length:1.3,speed:1.1,turn:1.08,cost:17800,cargo:90,hull:205,sail:3,cannons:14,maxCrew:100,description:'낮고 긴 선체·사각돛 · 빠른 측면 포격, 중장갑선보다 가벼움'},
 {id:'iberian-galleon',name:'이베리아 중갤리온',nation:'이베리아 왕실',rig:'square',color:'#c5ab57',width:1.25,length:1.25,speed:.88,turn:.82,cost:19800,cargo:100,hull:245,sail:2,cannons:16,maxCrew:110,description:'높은 선루·중후한 선체 · 최대 내구·강력한 함포, 기동은 둔함'},
 {id:'french-frigate',name:'프랑스 초기 프리깃',nation:'프랑스 항구동맹',rig:'square',color:'#6289ab',width:.78,length:1.3,speed:1.13,turn:1.18,cost:15600,cargo:78,hull:170,sail:3,cannons:12,maxCrew:90,description:'가늘고 긴 선체·파란 깃발 · 추격과 이탈에 강한 기동선'},
 {id:'med-galley',name:'지중해 무장 갤리',nation:'지중해 공화국',rig:'oars',color:'#7c9271',width:.72,length:1.45,speed:1.03,turn:1.25,cost:8200,cargo:60,hull:130,sail:2,cannons:8,maxCrew:100,description:'양현 노·삼각돛·낮은 선체 · 근해 선회에 강하고 적재는 적음'}
]);
export const SITES=Object.freeze([
 {id:'stone',name:'오크니의 거석 환상열석',port:'north',kind:'거석 유적',relic:'별자리 석판',reward:900,lore:'태양이 통과하는 문과 땅에 새긴 원이 같은 방향을 가리킨다.',choices:['그림자 길이를 기록한다','새겨진 선을 탁본한다','관측 방향을 대조한다'],answers:[0,1,0]},
 {id:'roman',name:'루시타니아 수몰 회랑',port:'gold',kind:'로마 유적',relic:'상선의 청동 인장',reward:1100,lore:'썰물 때만 드러나는 아치 아래, 소금에 굳은 상단 표식이 남아 있다.',choices:['썰물을 기다린다','갈라진 벽을 조사한다','문양과 장부를 맞춘다'],answers:[0,0,1]},
 {id:'cave',name:'브르타뉴 조수 동굴',port:'storm',kind:'해안 동굴',relic:'밀수선 항로판',reward:800,lore:'등대가 꺼지는 밤이면 동굴 입구에 작은 불빛이 나타난다.',choices:['밧줄로 퇴로를 묶는다','물길을 표시한다','등대 신호를 해독한다'],answers:[1,0,1]},
 {id:'mosaic',name:'에게해의 묻힌 관측소',port:'athens',kind:'고대 관측소',relic:'천구의 조각',reward:1400,lore:'무너진 돔 아래 모자이크의 별이 실제 하늘과 반대로 놓여 있다.',choices:['모자이크를 뒤집어 읽는다','북극성 방향을 찾는다','천구 조각을 맞춘다'],answers:[1,1,0]},
 {id:'lagoon',name:'석호의 침몰 수도원',port:'venice',kind:'수몰 건축',relic:'항해 수도사의 필사본',reward:1250,lore:'종탑의 그림자가 가라앉은 서고의 위치를 가리킨다.',choices:['현지 어부에게 묻는다','안전한 잠수줄을 설치한다','필사본을 밀봉한다'],answers:[0,1,1]},
 {id:'amberroad',name:'발트의 호박 무덤길',port:'copenhagen',kind:'고대 교역로',relic:'호박 목걸이',reward:1000,lore:'무덤에서 발견된 구슬은 먼 남쪽 바다와 이어진 교역의 흔적이다.',choices:['지층 순서를 기록한다','구슬의 산지를 대조한다','매장 방향을 보존한다'],answers:[0,0,1]}
]);
export const OFFICE_QUESTS=Object.freeze([
 {id:'europe',name:'유럽 항로 실측',text:'유럽의 서로 다른 항구 5곳 발견',type:'ports',need:5,reward:1000},
 {id:'first-relic',name:'첫 유적 발견 보고',text:'유적 1곳 조사 완료 후 사무실에 보고',type:'report',need:1,reward:700},
 {id:'collector',name:'해양 학술회의',text:'발견물 3개 보고',type:'report',need:3,reward:2200},
 {id:'escort',name:'왕실 해적 소탕',text:'해적선 2척 격침',type:'battle',need:2,reward:1400},
 {id:'network',name:'오대양 항구 인맥',text:'동료 3명 승선',type:'crew',need:3,reward:1200}
]);
export const SEA_EVENTS=Object.freeze([
 {id:'drift',title:'표류한 우편선',text:'부러진 돛대 너머로 구조 신호가 보여. 선장은 봉인된 편지 가방을 놓지 않고 있어.',options:['식량 4로 구조한다 · 명성·경험','항로를 유지한다']},
 {id:'squall',title:'먹구름 아래의 갈림길',text:'비구름 사이로 좁은 순풍 길이 열렸어. 선원은 돛을 줄여 안전하게 통과하자고 해.',options:['돛을 줄인다 · 식량 2 소모','돌파한다 · 선체 6 손상, 경험']},
 {id:'market',title:'돌아오는 상선의 소식',text:'맞은편 상선이 항구 시세를 알려주겠대. 선원이 얕은 물길의 소문도 덧붙여.',options:['정보를 교환한다 · 교역 안내','연락을 마치고 항해한다']},
 {id:'dolphin',title:'돌고래가 이끄는 물길',text:'뱃머리에 돌고래 무리가 붙었어. 지친 선원들이 잠시 웃음을 되찾아.',options:['풍경을 기록한다 · 탐험 경험','선원과 식사를 나눈다 · 식량 2, 명성']},
 {id:'wreck',title:'암초 곁의 떠다니는 상자',text:'물에 젖은 상자에서 황동 장식이 반짝여. 끌어올리려면 작은 배를 내려야 해.',options:['선체 3을 감수하고 인양 · 금화','위치를 기록하고 지나간다 · 경험']},
 {id:'letter',title:'밀봉된 표류 편지',text:'젖지 않은 밀랍 봉투에 침몰선의 방위가 적혀 있어. 무시할까, 해도에 옮길까?',options:['편지의 해도 단서를 기록한다','편지를 다음 항구로 운반한다']},
 {id:'inspection',title:'국가 순찰대의 검문',text:'순찰함이 통행 기록을 확인하려고 다가와. 정직하게 항해 기록을 보여주면 신뢰를 얻을 수 있어.',options:['기록을 제시한다 · 신뢰','안전한 물길로 우회한다 · 식량 1']},
 {id:'privateer',title:'밀약 상단의 추격선',text:'이야기의 증거를 쫓는 사략선이 항구 밖에서 기다려. 왕실 정규 함대가 아닌 무장 상단이야.',options:['출항해 전투를 준비한다','왕궁에 증거를 남기고 출항한다']},
 {id:'fog',title:'안개 속 종소리',text:'해도에는 없는 종소리가 들려. 낡은 부표에는 최근 배가 지나간 흔적이 있어.',options:['관측 기록을 남긴다 · 경험','등화를 밝히고 안전 통과 · 식량 1']}
]);
function success(s,message){note(s,message);return {state:s,ok:true,message};}
function fail(state,message){return {state,ok:false,message};}
export function companionObjective(s,c){
 if(c.id==='florence')return {ready:(s.tavernRelations.florence?.trust||0)>=35&&s.reported.length>=1,text:'플로렌체 친밀도 35와 발견 보고 1건이 필요해.'};
 if(c.id==='greta')return {ready:(s.tavernRelations.greta?.trust||0)>=45&&s.discovered.length>=5,text:'그레타 친밀도 45와 항구 5곳 발견이 필요해.'};
 if(c.id==='eleanor')return {ready:true,text:'항해 기록을 공유하고 합류'};
 if(c.id==='thomas')return {ready:s.discovered.length>=2,text:'서로 다른 항구 2곳을 발견하면 항해 실력을 인정받아.'};
 if(c.id==='isabel')return {ready:(s.cargo.spice||0)>=2,text:'향신료 2개를 화물창에 싣고 교역 계획을 보여줘.'};
 if(c.id==='willem')return {ready:s.victories>=1||s.score>=250,text:'해적 1척 격침 또는 탐험 점수 250을 증명해.'};
 if(c.id==='freya')return {ready:s.discoveries.length>=1,text:'유적 발견물 1개를 가져오면 조사에 합류해.'};
 return {ready:s.discovered.length>=4,text:'항구 4곳을 발견한 항해자에게 배를 맡기겠대.'};
}
export function changeJob(state,id){
 const j=JOBS.find(j=>j.id===id);if(!j||!canDock(state)||!portHasFacility(canDock(state).id,'jobs'))return fail(state,'길드가 있는 항구에서 전직할 수 있어.');
 if(state.job===id)return fail(state,'현재 직업이야.');
 if(state.xp<j.need)return fail(state,'항해 경험 '+j.need+'가 필요해.');
 const s=copy(state);s.job=id;return success(s,j.name+'으로 전직했어. 경험과 진행도는 유지돼.');
}
export function refitShip(state,id){
 const type=SHIP_TYPES.find(t=>t.id===id);if(!type||!canDock(state)||!portHasFacility(canDock(state).id,'fleet'))return fail(state,'조선소가 있는 항구에서 선박을 선택해.');
 if(type.nation&&canDock(state).faction!==type.nation)return fail(state,type.nation+' 지역 조선소에서만 건조할 수 있어.');
 if(state.shipType===id)return fail(state,'현재 기함이야.');if(state.coins<type.cost)return fail(state,'선박 구입 금화가 부족해.');
 if(cargoWeight(state)>(type.cargo+18*state.ship.holdLevel+(state.ship.regionalMods.includes('dutch-hold')?12:0))*state.fleet)return fail(state,'화물을 줄인 뒤 작은 선박으로 변경해.');
 const s=copy(state);s.coins-=type.cost;s.shipType=id;s.ship.cargoLimit=type.cargo+18*s.ship.holdLevel+(s.ship.regionalMods.includes('dutch-hold')?12:0);s.ship.maxHull=type.hull+30*s.ship.hullLevel;s.ship.hull=s.ship.maxHull;s.ship.maxCrew=type.maxCrew||(id==='galleon'?110:id==='carrack'?85:id==='cog'?65:55);s.ship.crew=Math.min(s.ship.crew,s.ship.maxCrew);if(type.cannons)s.ship.cannons=Math.max(s.ship.cannons,type.cannons);s.ship.sail=Math.max(s.ship.sail,type.sail);if(id==='galleon')s.ship.cannons=Math.max(12,s.ship.cannons);return success(s,type.name+'을 새 기함으로 지정했어.');
}
export function startExpedition(state,id){
 const site=SITES.find(x=>x.id===id);if(!site||canDock(state)?.id!==site.port)return fail(state,'발견지 인근 항구에 정박해야 해.');
 if(state.discoveries.includes(id))return fail(state,'이미 조사한 유적이야.');
 if(state.ship.provisions<6)return fail(state,'탐험 식량 6이 필요해.');
 const s=copy(state);s.ship.provisions-=6;s.expedition={id,step:0,energy:(s.job==='adventurer'?8:6)+(assignedPower(s,'navigator','scholarship')>=70?1:0)+(s.ship.gear.figurehead==='owl'?1:0),notes:[]};if(!s.clearedCamps.includes(id))s.landBattle=createLandBattle(s,site);return success(s,site.name+' 육지 탐험 시작');
}
export function exploreChoice(state,choice){
 if(state.landBattle)return fail(state,'먼저 입구 전투를 마치고 조사해.');
 const ex=state.expedition,site=SITES.find(x=>x.id===ex?.id);if(!site||![0,1].includes(choice))return fail(state,'진행 중인 탐험을 확인해.');
 if(ex.event)return fail(state,'먼저 현장의 사건을 해결해.');
 const s=copy(state),e=s.expedition,correct=site.answers[e.step]===choice;e.energy-=correct?1:2;e.notes.push(correct?'단서를 정확히 해석했어.':'우회로를 조사하느라 행동력이 더 들었어.');e.step++;if(e.step===2&&!e.eventResolved)e.event=LAND_EVENTS[(SITES.indexOf(site)+Math.floor(s.day/3))%LAND_EVENTS.length].id;
 if(e.energy<0){s.expedition=null;return success(s,'보급 부족으로 안전 귀환했어. 식량을 챙겨 다시 조사하자.');}
 if(e.step>=3){s.discoveries.push(site.id);s.equipment[site.id]=1;s.xp+=70;s.score+=180;s.expedition=null;return success(s,site.relic+' 발견! 탐험가 사무실에서 보고 보상을 받아.');}
 return success(s,e.notes.at(-1));
}
export function reportDiscoveries(state){
 if(!canDock(state)||!portHasFacility(canDock(state).id,'quests'))return fail(state,'탐험가 사무실이 있는 항구에서 보고해.');const ids=state.discoveries.filter(id=>!state.reported.includes(id));if(!ids.length)return fail(state,'새로 보고할 발견물이 없어.');
 const s=copy(state);let reward=0;for(const id of ids){const site=SITES.find(x=>x.id===id);if(!site)continue;reward+=site.reward;s.reported.push(id);s.fame+=20+(s.job==='scholar'?10:0);}s.coins+=reward;return success(s,ids.length+'건 보고 완료 · '+reward+' G');
}
export function officeProgress(s,q){return q.type==='ports'?s.discovered.filter(id=>!['alexandria','zanzibar','goa','nagasaki'].includes(id)).length:q.type==='report'?s.reported.length:q.type==='battle'?s.victories:s.crewRoster.length;}
export function officeContract(state,id){
 const q=OFFICE_QUESTS.find(x=>x.id===id);if(!q||!canDock(state)||!portHasFacility(canDock(state).id,'quests'))return fail(state,'탐험가 사무실이 있는 항구에서 의뢰를 받아.');if(state.completedOffice.includes(id))return fail(state,'이미 끝낸 의뢰야.');
 if(id==='escort'&&state.job!=='naval'&&state.rank<1)return fail(state,'해군 장교 또는 왕실 작위 1단계가 필요해.');
 const s=copy(state);if(!s.officeQuests.includes(id)){if(s.officeQuests.length>=4)return fail(state,'사무실 의뢰는 4개까지야.');s.officeQuests.push(id);return success(s,q.name+' 수주');}
 if(officeProgress(s,q)<q.need)return fail(state,'아직 목표를 달성하지 못했어.');s.officeQuests=s.officeQuests.filter(x=>x!==id);s.completedOffice.push(id);s.coins+=q.reward;s.fame+=15;s.xp+=50;return success(s,q.name+' 완료 · '+q.reward+' G');
}
export function storyStatus(s){const hero=CAPTAINS.find(c=>c.id===s.captainId)||CAPTAINS[0],chapter=hero.chapters[s.storyChapter];return {hero,chapter,ready:!!chapter&&canDock(s)?.id===chapter[0]&&(s.storyChapter===0||s.storyChapter===1?s.discovered.length>=s.storyChapter+1:s.reported.length>=1)};}
export function advanceStory(state){
 const info=storyStatus(state);if(!info.chapter)return fail(state,'유럽 1부 이야기를 마쳤어. 다음 바다의 단서를 기다려.');if(!info.ready)return fail(state,'목표 항구에 도착해. 마지막 장은 발견 보고 1건도 필요해.');
 const s=copy(state);s.completedStories.push(s.captainId+'-'+s.storyChapter);s.storyChapter++;s.xp+=90;s.fame+=15;s.coins+=600;s.scene={kind:'story',captainId:s.captainId,title:info.chapter[1],text:info.chapter[2]};if(s.storyChapter===2){s.event={id:'privateer'};const enemy=s.pirates.find(e=>e.id===21);if(!enemy)s.pirates.push({id:21,x:s.ship.x+22,z:s.ship.z+20,heading:0,hull:105,maxHull:105,cooldown:6,name:'밀약 상단의 사략선'});}return success(s,info.chapter[1]+' 해결 · '+(s.storyChapter===3?'유럽 1부 종료. 고향으로 보낼 편지를 기록했어.':'새 단서를 항해일지에 적었어.'));
}
export function royalAudience(state){
 const p=canDock(state);if(!p||!portHasFacility(p.id,'palace'))return fail(state,'왕궁·총독부가 있는 항구에서 알현해.');const need=[20,60,120,220][state.rank];if(!need)return fail(state,'왕실의 최고 신뢰를 얻었어.');if(state.fame<need)return fail(state,'다음 작위에는 명성 '+need+'이 필요해.');
 const s=copy(state);s.rank++;s.coins+=s.rank*500;s.reputation[p.faction]=(s.reputation[p.faction]||0)+20;return success(s,['','공인 항해자','왕실 특사','해양 기사','왕실 제독'][s.rank]+' 임명 · 왕실 보상 지급');
}
export function resolveSeaEvent(state,choice){
 const e=SEA_EVENTS.find(x=>x.id===state.event?.id);if(!e||![0,1].includes(choice))return fail(state,'항해 사건의 선택지를 확인해.');const s=copy(state);let message='항로를 유지했어.';
 const food=n=>{if(s.ship.provisions<n)return false;s.ship.provisions-=n;return true;};
 if(e.id==='drift'&&choice===0){if(!food(4))return fail(state,'구조하려면 식량 4가 필요해.');s.fame+=8;s.xp+=25;s.coins+=s.job==='navigator'?120:60;message='선원을 구조하고 편지를 다음 항구에 인계했어.';}
 if(e.id==='squall'){if(choice===0){if(!food(2))return fail(state,'안전 우회에 식량 2가 필요해.');message='돛을 줄여 폭풍을 안전하게 통과했어.';}else{s.ship.hull=Math.max(1,s.ship.hull-6);s.xp+=18;message='돌풍을 견뎠지만 선체가 6 손상됐어.';}}
 if(e.id==='market'&&choice===0){s.xp+=12;const g=GOODS[(s.eventSerial)%GOODS.length],best=PORTS.reduce((a,b)=>priceAt(a.id,g.id,s.day,'sell')>priceAt(b.id,g.id,s.day,'sell')?a:b);message=g.name+' 매각 시세: '+best.name+' '+priceAt(best.id,g.id,s.day,'sell')+' G. 교역소 비교표에 현재 시세가 있어.';}
 if(e.id==='dolphin'){if(choice===0)s.xp+=20;else{if(!food(2))return fail(state,'식량 2가 필요해.');s.fame+=5;}message='잔잔한 물길에서 항해를 기록했어.';}
 if(e.id==='wreck'){if(choice===0){s.ship.hull=Math.max(1,s.ship.hull-3);s.coins+=90+s.eventSerial%5*20;message='표류 화물을 인양했어. 선체 3 손상, 금화 획득.';}else{s.xp+=15;message='위험 지점을 해도에 표시했어.';}}
 if(e.id==='fog'){if(choice===0)s.xp+=22;else{if(!food(1))return fail(state,'등화 유지에 식량 1이 필요해.');s.xp+=8;}message='안개를 벗어났어. 관측 기록을 남겼어.';}
 if(e.id==='letter'){const clue=TREASURES.find(t=>!s.treasureClues.includes(t.id));if(choice===0&&clue){s.treasureClues.push(clue.id);message='표류 편지에서 '+clue.name+' 위치를 해도에 기록했어.';}else{s.xp+=15;message='편지를 안전하게 보관하고 항해 기록을 남겼어.';}}
 if(e.id==='inspection'){if(choice===0){const owner=nearestPort(s).port.faction;s.reputation[owner]=(s.reputation[owner]||0)+4;message=owner+' 검문 통과 · 국가 신뢰 +4';}else{if(!food(1))return fail(state,'우회에 식량 1이 필요해.');message='검문 항로를 피해 안전하게 우회했어.';}}
 if(e.id==='privateer'){s.fame+=choice===1?4:0;message='사략선이 해도에 표시됐어. 측면 포격, 수리재와 연막으로 대응해.';}
 s.event=null;return success(s,message);
}
export function exportSave(state){const payload=encodeURIComponent(serializeGame(state));let h=2166136261;for(const c of payload)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return 'VOY2.'+h.toString(16)+'.'+payload;}
export function importSave(text){
 try{if(typeof text!=='string'||text.length>150000)return null;const [,hash,...parts]=text.split('.'),payload=parts.join('.');if(!text.startsWith('VOY2.'))return null;let h=2166136261;for(const c of payload)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;if(h.toString(16)!==hash)return null;const raw=decodeURIComponent(payload),v=JSON.parse(raw);if(v.version!==1||!v.ship||!Number.isFinite(v.coins)||!Number.isFinite(v.ship.x))return null;return restoreGame(raw);}catch{return null;}
}

// 지형: Natural Earth 공개 지리 데이터. 동일 다각형을 해도와 항로 탐색에 사용한다.
const LAND_ROWS=new Map();
for(const ring of LAND){const p=ring.points;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];for(let row=Math.floor(Math.min(a[1],b[1]));row<=Math.floor(Math.max(a[1],b[1]));row++){if(!LAND_ROWS.has(row))LAND_ROWS.set(row,[]);LAND_ROWS.get(row).push([a[0],a[1],b[0],b[1]]);}}}
export function isLand(x,z){let inside=false;for(const [ax,az,bx,bz] of LAND_ROWS.get(Math.floor(z))||[])if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;return inside;}

// 소문 · 보물: 재구매·재수색 보상 중복 방지. 수색에는 직접 해상 위치 확인이 필요하다.
export const TREASURES=Object.freeze([
 {id:'bell',name:'비스케이의 침몰 종',x:-72.0,z:-549.0,clue:'브레스트 남서쪽 비스케이만. 해도 × 지점에 배를 대고 수색해.',relic:'은빛 선박 종',reward:1350},
 {id:'atlas',name:'사라진 측량사의 궤짝',x:-129.0,z:-441.0,clue:'리스본 남서쪽 외해. 해도 × 지점 근처에서 수색해.',relic:'방수 황동 해도통',reward:1600},
 {id:'medal',name:'리구리아의 사절선',x:114.0,z:-504.0,clue:'제노바 남쪽 리구리아해. 해도 × 위치에서 수색해.',relic:'사절의 금제 메달',reward:1900}
]);
export function takeTreasureClue(state,id){const t=TREASURES.find(t=>t.id===id);if(!t||!canDock(state))return fail(state,'선술집에서 소문을 들어.');if(state.treasureClues.includes(id))return fail(state,'이미 해도에 표시했어.');if(state.coins<120)return fail(state,'정보료 120 G가 필요해.');const s=copy(state);s.coins-=120;s.treasureClues.push(id);return success(s,t.clue);}
export function searchTreasure(state,id){const t=TREASURES.find(t=>t.id===id);if(!t||!state.treasureClues.includes(id))return fail(state,'먼저 보물의 해도 단서가 필요해.');if(state.treasures.includes(id))return fail(state,'이미 인양한 보물이야.');if(dist(state.ship,t)>4)return fail(state,'해도 × 지점에서 더 가까이 수색해.');if(state.ship.provisions<3)return fail(state,'인양 작업에 식량 3이 필요해.');const s=copy(state);s.ship.provisions-=3;s.treasures.push(id);s.equipment[id]=1;s.coins+=t.reward;s.fame+=12;s.xp+=60;return success(s,t.relic+' 인양 · '+t.reward+' G');}
export function rumorsAt(s){const p=canDock(s);if(!p)return ['소문은 항구 선술집에서 들을 수 있어.'];const g=GOODS[(PORTS.indexOf(p)+Math.floor(s.day/3))%GOODS.length],best=PORTS.reduce((a,b)=>priceAt(a.id,g.id,s.day,'sell')>priceAt(b.id,g.id,s.day,'sell')?a:b);const site=SITES[(PORTS.indexOf(p)+Math.floor(s.day/4))%SITES.length];return [s.day+'일 시세: '+g.name+'은 '+best.name+'에서 '+priceAt(best.id,g.id,s.day,'sell')+' G에 팔려. 항해 중 가격이 바뀔 수 있어.',portById(site.port).name+' 근처 '+site.name+'에 '+site.kind+' 흔적이 있대. '+site.lore,'먼 바다는 식량이 중요해. 조선소 보급, 해도 자동항해, 4배속을 함께 쓰되 사건은 직접 선택해야 해.'];}

// 소모품: 구매·사용의 단일 책임. 포탄은 실제 포격 명중 시 1발 사용한다.
export const CONSUMABLES=Object.freeze([
 {id:'repair',name:'수리 목재',cost:160,description:'선체 내구 25 회복 · 바다에서도 사용'},
 {id:'medicine',name:'의약품',cost:140,description:'선원 8명 회복 · 최대 선원수 제한'},
 {id:'ammo',name:'포탄 10발',cost:120,description:'측면 포격용 포탄 10발 보급'},
 {id:'smoke',name:'연막탄',cost:110,description:'주변 적 함포 재장전 18초 지연'},
 {id:'rations',name:'비상 식량',cost:90,description:'식량 20 회복 · 최대 140'}
]);
export function buyConsumable(state,id){const c=CONSUMABLES.find(c=>c.id===id);if(!c||!canDock(state))return fail(state,'항구 보급소에서 구입해.');const cost=state.job==='merchant'?Math.ceil(c.cost*.9):c.cost;if(state.coins<cost)return fail(state,'보급품 구입 금화가 부족해.');const qty=id==='ammo'?10:1;if(state.supplies[id]+qty>999)return fail(state,'보급품 보유 한도야.');const s=copy(state);s.coins-=cost;s.supplies[id]+=qty;return success(s,c.name+' 보급 완료');}
export function useConsumable(state,id){if(id==='ammo')return fail(state,'포탄은 포격할 때 사용돼.');if(!CONSUMABLES.some(c=>c.id===id)||state.supplies[id]<1)return fail(state,'사용할 소모품이 없어.');if(state.supplyCooldown>0&&!canDock(state))return fail(state,'소모품 사용 준비 중이야.');if(id==='repair'&&state.ship.hull>=state.ship.maxHull)return fail(state,'선체가 온전해.');if(id==='medicine'&&state.ship.crew>=state.ship.maxCrew)return fail(state,'선원이 최대 인원이야.');if(id==='rations'&&state.ship.provisions>=140)return fail(state,'식량이 가득해.');const s=copy(state);s.supplies[id]--;s.supplyCooldown=4;if(id==='repair')s.ship.hull=Math.min(s.ship.maxHull,s.ship.hull+25);if(id==='medicine')s.ship.crew=Math.min(s.ship.maxCrew,s.ship.crew+8+Math.floor(assignedPower(s,'doctor','medicine')/25)+(s.ship.gear.figurehead==='mermaid'?4:0));if(id==='rations')s.ship.provisions=Math.min(140,s.ship.provisions+20);if(id==='smoke')for(const e of s.pirates)if(dist(e,s.ship)<45)e.cooldown=Math.max(18,e.cooldown);return success(s,CONSUMABLES.find(c=>c.id===id).name+' 사용 완료');}
export function declareHostility(state,faction){const p=canDock(state);if(!p||!portHasFacility(p.id,'palace'))return fail(state,'왕궁·총독부가 있는 항구에서 외교 방침을 정해.');if(!['이베리아 왕실','프랑스 항구동맹'].includes(faction))return fail(state,'현재 유럽의 두 순찰 세력만 외교 대상이야.');const s=copy(state);s.diplomacy[faction]=-30;if(s.alliance===faction)s.alliance=null;return success(s,faction+'에 적대 선언. 해당 국가 순찰함이 공격해.');}
export function negotiatePeace(state,faction){if(!canDock(state)||!portHasFacility(canDock(state).id,'palace')||!(state.diplomacy[faction]<0))return fail(state,'왕궁·총독부에서 현재 적대 중인 국가를 확인해.');if(state.coins<500)return fail(state,'휴전 교섭금 500 G가 필요해.');const s=copy(state);s.coins-=500;s.diplomacy[faction]=0;return success(s,faction+'과 휴전했어.');}

// 탐험 해역: 지나는 격자와 인접 해역을 영구 해도에 기록한다.
export function revealCells(cells,x,z){const known=new Set(cells),cx=Math.floor(x/24),cz=Math.floor(z/24);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)known.add((cx+dx)+':'+(cz+dz));return [...known].slice(-4096);}

// 세계: 유럽 항구의 투자·세력·약탈·기후를 일 단위로만 갱신해 저장 폭증을 막는다.
export const WEATHER=Object.freeze([
 {id:'clear',name:'맑음',speed:1,description:'시야가 좋고 항해가 안정적이야.'},
 {id:'wind',name:'무역풍',speed:1.18,description:'순풍으로 항해 속도가 조금 빨라져.'},
 {id:'rain',name:'비',speed:.92,description:'빗줄기로 주변 항구가 흐리게 보여.'},
 {id:'fog',name:'해무',speed:.85,description:'가까운 배를 살피며 항해해. 해도 탐험 기록은 유지돼.'},
 {id:'storm',name:'거친 바다',speed:.78,description:'파도가 높아져. 직접 피해는 폭풍 사건의 선택 결과로만 발생해.'}
]);
export function portStatus(s,id){const p=portById(id);return {owner:p?.faction||'',prosperity:50,security:60,invested:0,influence:0,lastDividend:s.day,raidedUntil:0,...s.portState[id]};}
function advanceWorld(s){
 if(s.day>=s.climate.until){const w=WEATHER[(Math.floor(s.day/3)+CAPTAINS.findIndex(c=>c.id===s.captainId))%WEATHER.length];s.climate={kind:w.id,until:s.day+3};note(s,'기상 관측: '+w.name);}
 for(const p of PORTS){if(!s.portState[p.id])continue;const v=portStatus(s,p.id);v.security=Math.min(80,v.security+2);v.prosperity=Math.min(90,v.prosperity+1);s.portState[p.id]=v;}
 if(s.day%5!==0)return;
 const attacker=PORTS[(Math.floor(s.day/5)*3+2)%PORTS.length].faction,rotation=Math.floor(s.day/5)%PORTS.length,candidates=[...PORTS.slice(rotation),...PORTS.slice(0,rotation)].filter(p=>portStatus(s,p.id).owner!==attacker);
 const target=candidates.sort((a,b)=>portStatus(s,a.id).security-portStatus(s,b.id).security)[0];if(!target)return;const v=portStatus(s,target.id);
 if(v.owner===attacker)return;
 const defense=v.security+(s.alliance===v.owner?10:0),damage=defense>=65?6:18;
 v.security=Math.max(10,v.security-damage);v.prosperity=Math.max(20,v.prosperity-8);v.raidedUntil=s.day+2;
 let event=attacker+'의 사략선이 '+target.name+'을 습격. 교역 시설은 보존되고 경제 피해가 남았어.';
 if(v.security<=20){v.owner=attacker;event=target.name+'의 항만 통제권이 '+attacker+'으로 넘어갔어.';}
 s.portState[target.id]=v;s.worldLog.push('['+s.day+'일] '+event);s.worldLog=s.worldLog.slice(-20);note(s,event);
}
export function investPort(state,amount){const p=canDock(state);if(!p||![100,500,1000].includes(amount))return fail(state,'정박한 항구에서 투자 금액을 선택해.');if(state.coins<amount)return fail(state,'투자금이 부족해.');const s=copy(state),v=portStatus(s,p.id);s.coins-=amount;v.invested+=amount;v.influence=Math.min(100,v.influence+Math.floor(amount/100));v.prosperity=Math.min(100,v.prosperity+Math.ceil(amount/200));s.portState[p.id]=v;s.reputation[v.owner]=(s.reputation[v.owner]||0)+Math.floor(amount/100);return success(s,p.name+'에 '+amount+' G 투자 · 영향력 '+v.influence+'%');}
export function collectDividend(state){const p=canDock(state);if(!p)return fail(state,'투자한 항구에서 배당을 받아.');const v=portStatus(state,p.id);if(!v.invested)return fail(state,'먼저 항구에 투자해.');if(state.day-v.lastDividend<7)return fail(state,'다음 배당까지 '+(7-state.day+v.lastDividend)+'일 남았어.');const s=copy(state),profit=Math.floor(v.invested*.08*(v.prosperity/50));v.lastDividend=s.day;s.coins+=profit;s.portState[p.id]=v;return success(s,'항구 투자 배당 '+profit+' G. 자동 누적 이자는 없어.');}
export function supportPort(state){const p=canDock(state);if(!p||!portHasFacility(p.id,'palace'))return fail(state,'총독부가 있는 항구에서 방어를 지원해.');if(state.coins<200||state.supplies.ammo<5)return fail(state,'방어 지원에 200 G와 포탄 5발이 필요해.');const s=copy(state),v=portStatus(s,p.id);if(v.security>=95)return fail(state,'항구 방어가 충분해.');s.coins-=200;s.supplies.ammo-=5;v.security=Math.min(100,v.security+25);v.influence=Math.min(100,v.influence+5);v.raidedUntil=0;s.portState[p.id]=v;s.fame+=4;return success(s,p.name+' 방어 지원 · 보안 '+v.security+' / 영향력 '+v.influence+'%');}
export function formAlliance(state){const p=canDock(state);if(!p||!portHasFacility(p.id,'palace'))return fail(state,'왕궁·총독부가 있는 항구에서 동맹을 협의해.');const owner=portStatus(state,p.id).owner;if(state.diplomacy[owner]<0)return fail(state,'휴전을 먼저 체결해.');if(state.alliance===owner)return fail(state,'이미 동맹인 국가야.');if((state.reputation[owner]||0)<30)return fail(state,'교역·투자로 국가 신뢰 30이 필요해.');const s=copy(state);s.alliance=owner;return success(s,owner+'과 해상 동맹을 맺었어. 적대 선언을 하면 동맹이 해제돼.');}
export function callAlliance(state){if(!state.alliance)return fail(state,'왕궁에서 먼저 동맹을 맺어.');if(state.day-state.allianceSupportDay<5)return fail(state,'동맹 지원은 5일마다 요청할 수 있어.');const targets=state.pirates.filter(e=>e.hull>0&&(!e.neutral||state.diplomacy[e.faction]<0)&&dist(e,state.ship)<40);if(!targets.length)return fail(state,'주변에 동맹 지원 대상이 없어.');const s=copy(state);for(const t of targets){const enemy=s.pirates.find(e=>e.id===t.id);enemy.hull=Math.max(1,enemy.hull-24);enemy.cooldown=Math.max(12,enemy.cooldown);}s.allianceSupportDay=s.day;return success(s,'동맹 호위대가 지원 포격했어. 적 함포 장전도 지연돼.');}

// 동료 배치: 승선 후 얻은 경험으로 성장하며 동일 동료 중복 배치를 막는다.
export const CREW_STATS=Object.freeze({
 eleanor:{navigation:76,trade:42,gunnery:55,scholarship:67,medicine:35},samira:{navigation:60,trade:45,gunnery:32,scholarship:91,medicine:62},amani:{navigation:68,trade:90,gunnery:43,scholarship:50,medicine:45},arjun:{navigation:91,trade:61,gunnery:39,scholarship:75,medicine:42},rin:{navigation:72,trade:45,gunnery:86,scholarship:55,medicine:38},
 matteo:{navigation:78,trade:52,gunnery:55,scholarship:79,medicine:36},lucas:{navigation:69,trade:94,gunnery:39,scholarship:65,medicine:43},nikos:{navigation:88,trade:39,gunnery:45,scholarship:91,medicine:51},
 lorenzo:{navigation:74,trade:84,gunnery:39,scholarship:66,medicine:31},marten:{navigation:62,trade:97,gunnery:36,scholarship:82,medicine:37},etienne:{navigation:91,trade:55,gunnery:73,scholarship:69,medicine:44},
 florence:{navigation:64,trade:70,gunnery:32,scholarship:98,medicine:88},greta:{navigation:72,trade:98,gunnery:39,scholarship:75,medicine:50},
 thomas:{navigation:88,trade:38,gunnery:45,scholarship:72,medicine:31},isabel:{navigation:52,trade:94,gunnery:28,scholarship:56,medicine:44},willem:{navigation:58,trade:41,gunnery:95,scholarship:39,medicine:30},freya:{navigation:82,trade:40,gunnery:35,scholarship:93,medicine:77},diego:{navigation:73,trade:62,gunnery:65,scholarship:44,medicine:58}
});
export const CREW_ROLES=Object.freeze([{id:'navigator',name:'항해사',effect:'학술 70 이상이면 육지 탐험 행동력 +1'},{id:'sailing',name:'돛 담당',effect:'항해 능력에 따라 속도 향상'},{id:'gunnery',name:'포술장',effect:'포술 능력에 따라 함포 피해 증가'},{id:'quartermaster',name:'보급장',effect:'교역 75 이상이면 하루 식량 소비 1 감소'},{id:'doctor',name:'의무관',effect:'의약품의 선원 회복량 증가'}]);
export function crewStats(s,id){const base=CREW_STATS[id]||CREW_STATS.thomas,level=Math.min(10,1+Math.floor(Math.max(0,s.xp-(s.crewJoinedAt[id]||0))/180));return {level,...Object.fromEntries(Object.entries(base).map(([k,v])=>[k,Math.min(110,v+(level-1)*2)]))};}
export function assignedPower(s,role,stat){const id=s.assignments?.[role];return id&&s.crewRoster.includes(id)?crewStats(s,id)[stat]||0:0;}
export function assignCrew(state,role,id){if(!CREW_ROLES.some(r=>r.id===role)||(id&&!state.crewRoster.includes(id)))return fail(state,'승선 중인 동료와 담당 직책을 선택해.');if(id===state.captainId)return fail(state,'주인공은 선장직을 유지해. 동료를 배치해.');const s=copy(state);if(!id){s.assignments[role]='';return success(s,'담당 직책을 해제했어.');}for(const r of CREW_ROLES)if(s.assignments[r.id]===id)s.assignments[r.id]='';s.assignments[role]=id;return success(s,CREW.find(c=>c.id===id).name+' · '+CREW_ROLES.find(r=>r.id===role).name+' 배치');}

export const RECRUIT_STORIES=Object.freeze({
 florence:['플로렌체: 아버지의 복원 공방을 잃고 이 여관을 열었어. 유물이 팔리기 전에 그 이야기를 기록하고 싶어.','플로렌체: 네 보고서를 읽었어. 서로를 믿게 된다면 여관은 동생에게 맡기고 함께 기록을 복원하겠어.'],
 greta:['그레타: 누구나 술잔 앞에서는 항해의 진짜 목적을 말하지. 하지만 그 이야기를 아무에게나 넘기지는 않아.','그레타: 다섯 항구를 잇는 상단이라면 내 인맥이 도움이 될 거야. 먼저 네가 믿을 만한 사람인지 보여줘.'],
 thomas:['토머스: 해도는 책상 위에서 완성되지 않아. 두 항구의 조류를 네 눈으로 보고 돌아와.','토머스: 북해에서 놓친 동생의 배를 아직 찾고 있어. 네 항해 기록이 진짜라면 이번에는 함께 가겠어.'],
 isabel:['이사벨: 내가 팔았다는 가짜 향신료 때문에 상단이 무너졌어. 진품 두 상자면 장부의 거짓을 증명할 수 있어.','이사벨: 네 화물과 거래 계획을 보여줘. 증거를 바로잡으면 다음 교역의 수익보다 네 판단을 믿고 승선할게.'],
 willem:['빌럼: 포술장을 내쫓은 상단이 이제 내게 해적 누명을 씌웠어. 종이 허가서보다 네 항해 실적을 보겠어.','빌럼: 승전이나 충분한 탐험 기록을 보여줘. 무의미한 약탈을 하지 않는 선장이라면 포를 맡기겠어.'],
 freya:['프레야: 사람들이 무덤을 보물 창고로만 보더군. 나는 발견한 장소가 무엇을 말하는지 기록하고 싶어.','프레야: 유적 하나를 조사해 가져와. 이름 없는 사람들의 흔적도 남기는 선장이라면 네 항해를 그릴게.'],
 diego:['디에고: 내가 고친 배가 사고를 내자 도면을 바꿔 놓고 내 잘못이라고 했어. 바다를 아는 선장이 필요해.','디에고: 네 곳의 항구를 직접 찾아가 봐. 배마다 다른 파도를 배운 뒤 돌아오면 네 함선을 책임지겠어.']
});
export function talkCompanion(state,id){const c=CREW.find(c=>c.id===id);if(!c||canDock(state)?.id!==c.port)return fail(state,'이 동료가 머무는 항구 선술집에서 대화해.');if(state.crewRoster.includes(id))return fail(state,'이미 승선 중인 동료야.');const s=copy(state),step=Math.min(1,s.recruitScenes[id]||0);s.recruitScenes[id]=Math.min(2,step+1);return success(s,(RECRUIT_STORIES[id]||[c.story,'네 항해 목적을 믿고 함께할 준비가 됐어.'])[step]);}

// 육지 전투: 동료 최대 4명, 개별 행동과 적 행동을 분리한 저장 가능한 턴 상태.
export const LAND_ENEMIES=Object.freeze([
 {kind:'wolf',name:'거석길 늑대',hp:48,attack:10},
 {kind:'raider',name:'유적 약탈자',hp:64,attack:12},
 {kind:'smuggler',name:'동굴 밀수꾼',hp:58,attack:11},
 {kind:'raider',name:'가면 도굴꾼',hp:75,attack:13},
 {kind:'smuggler',name:'석호의 추격자',hp:69,attack:12},
 {kind:'boar',name:'호박길 멧돼지',hp:80,attack:14}
]);
function createLandBattle(s,site){const index=SITES.indexOf(site),enemy=LAND_ENEMIES[index],ids=[s.captainId,...s.crewRoster.filter(id=>id!==s.captainId)].slice(0,4);return {siteId:site.id,phase:'player',turn:1,actor:0,enemyActor:0,party:ids.map(id=>{const v=crewStats(s,id),hp=76+v.level*8;return {id,hp,maxHp:hp,focus:24,maxFocus:24,guard:false};}),enemies:(ids.length===1?[0]:[0,1]).map(i=>({...enemy,id:i,hp:enemy.hp+(i?8:0),maxHp:enemy.hp+(i?8:0),weak:0})),log:['유적 입구에서 '+enemy.name+' 무리를 만났어.'],reward:260+index*70};}
export function landSkill(s,id){return PERSONAL_SKILLS[id]||PERSONAL_SKILLS.eleanor;}
function landLog(b,text){b.log.push(text);b.log=b.log.slice(-8);}
function landOutcome(s){const b=s.landBattle;if(b.enemies.every(e=>e.hp<=0)){b.phase='won';if(!s.clearedCamps.includes(b.siteId)){s.clearedCamps.push(b.siteId);s.coins+=b.reward;s.xp+=70;s.fame+=5;landLog(b,'승리! '+b.reward+' G · 항해 경험 70. 유적 조사를 계속할 수 있어.');}return true;}if(b.party.every(p=>p.hp<=0)){b.phase='lost';s.expedition=null;landLog(b,'일행이 쓰러졌어. 항구로 후퇴했지만 동료와 발견 기록은 유지돼.');return true;}return false;}
export function landAction(state,action,target=0){
 const battle=state.landBattle;if(!battle||battle.phase!=='player')return fail(state,'일행의 행동 차례를 기다려.');const s=copy(state),b=s.landBattle,actor=b.party[b.actor],stats=crewStats(s,actor.id),enemy=b.enemies[target];if(!actor||actor.hp<=0)return fail(state,'행동 가능한 인물을 확인해.');
 if(action==='retreat'){b.phase='retreated';s.expedition=null;landLog(b,'대열을 유지하며 항구로 퇴각했어.');return success(s,'유적 입구에서 퇴각했어.');}
 if(action==='guard'){actor.guard=true;actor.focus=Math.min(actor.maxFocus,actor.focus+7);landLog(b,CREW.find(c=>c.id===actor.id).name+' 방어 · 집중 회복');s.combatFx={serial:++s.fxSerial,type:'guard',side:'party',target:b.actor,damage:0};}
 else if(action==='medicine'){if(s.supplies.medicine<1)return fail(state,'의약품이 없어.');const wounded=b.party.filter(p=>p.hp>0).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];if(!wounded||wounded.hp===wounded.maxHp)return fail(state,'회복할 부상이 없어.');s.supplies.medicine--;const heal=35+Math.floor(stats.medicine/4);wounded.hp=Math.min(wounded.maxHp,wounded.hp+heal);s.combatFx={serial:++s.fxSerial,type:'heal',side:'party',target:b.party.indexOf(wounded),damage:heal};landLog(b,'의약품으로 부상 동료를 회복했어.');}
 else if(action==='rations'){if(s.supplies.rations<1)return fail(state,'비상 식량이 없어.');if(actor.focus>=actor.maxFocus)return fail(state,'집중이 이미 가득해.');s.supplies.rations--;actor.focus=Math.min(actor.maxFocus,actor.focus+12);s.combatFx={serial:++s.fxSerial,type:'heal',side:'party',target:b.actor,damage:12};landLog(b,'비상 식량으로 집중 12 회복');}
 else if(action==='tool'){if(!s.equipment.telescope||!enemy||enemy.hp<=0)return fail(state,'망원경과 관찰할 적을 확인해.');enemy.weak=3;actor.focus=Math.min(actor.maxFocus,actor.focus+3);s.combatFx={serial:++s.fxSerial,type:'guard',side:'enemy',target,damage:0};landLog(b,'황동 망원경으로 약점 관측 · 다음 타격 강화');}
 else if(action==='attack'||action==='skill'){
  const skill=landSkill(s,actor.id);if(action==='skill'&&actor.focus<8)return fail(state,'집중이 부족해. 방어하면 회복돼.');
  if(action==='skill'&&skill.kind==='barrier'){actor.focus-=8;for(const p of b.party)if(p.hp>0)p.guard=true;s.combatFx={serial:++s.fxSerial,type:'guard',side:'party',target:b.actor,damage:0};landLog(b,skill.name+' · 일행 방어');}
  else if(action==='skill'&&skill.kind==='heal'){actor.focus-=8;const heal=(skill.heal||12)+Math.floor(stats.trade/8);for(const p of b.party)if(p.hp>0)p.hp=Math.min(p.maxHp,p.hp+heal);s.combatFx={serial:++s.fxSerial,type:'heal',side:'party',target:b.actor,damage:heal};landLog(b,skill.name+' · 일행 체력 회복');}
  else {if(!enemy||enemy.hp<=0)return fail(state,'살아 있는 적을 선택해.');let damage=9+Math.floor((stats.gunnery+stats.navigation)/15)+stats.level*2;if(action==='skill'){actor.focus-=8;damage=Math.round(damage*(skill.multiplier||1.8));if(skill.kind==='weak')enemy.weak=3;}if(enemy.weak>0){damage=Math.round(damage*1.25);enemy.weak--;}enemy.hp=Math.max(0,enemy.hp-damage);s.combatFx={serial:++s.fxSerial,type:action==='skill'?'skill':'slash',side:'enemy',target,source:b.actor,damage};landLog(b,CREW.find(c=>c.id===actor.id).name+'의 '+(action==='skill'?skill.name:'공격')+' · '+damage+' 피해');}
 }else return fail(state,'전투 행동을 선택해.');
 if(!landOutcome(s)){let next=b.actor+1;while(next<b.party.length&&b.party[next].hp<=0)next++;if(next>=b.party.length){b.phase='enemy';b.enemyActor=0;}else b.actor=next;}
 return {state:s,ok:true,message:b.log.at(-1)};
}
export function landEnemyTurn(state){const battle=state.landBattle;if(!battle||battle.phase!=='enemy')return fail(state,'적의 행동 차례가 아니야.');const s=copy(state),b=s.landBattle;while(b.enemyActor<b.enemies.length&&b.enemies[b.enemyActor].hp<=0)b.enemyActor++;const enemy=b.enemies[b.enemyActor];if(enemy){const living=b.party.filter(p=>p.hp>0),target=living[(b.turn+b.enemyActor)%living.length],damage=Math.max(2,enemy.attack+(b.turn%3)-(target.guard?8:0));target.hp=Math.max(0,target.hp-damage);s.combatFx={serial:++s.fxSerial,type:'slash',side:'party',target:b.party.indexOf(target),source:b.enemyActor,damage};landLog(b,enemy.name+'의 공격 · '+damage+' 피해');b.enemyActor++;}if(!landOutcome(s)&&b.enemyActor>=b.enemies.length){b.turn++;b.phase='player';b.actor=b.party.findIndex(p=>p.hp>0);for(const p of b.party)p.guard=false;}return {state:s,ok:true,message:b.log.at(-1)};}
export function finishLandBattle(state){if(!state.landBattle||!['won','lost','retreated'].includes(state.landBattle.phase))return fail(state,'전투를 마치거나 퇴각해.');const s=copy(state);s.landBattle=null;return success(s,'탐험가 사무실로 돌아왔어.');}

// 함포: 포문 수 증설과 포 종류 교체를 별도로 계산한다.
export const CANNON_TYPES=Object.freeze([
 {id:'bronze',name:'표준 청동포',cost:0,power:1,range:34,reload:3.5,speed:180,description:'균형형 · 기본 포대'},
 {id:'falconet',name:'팔코넷 경량포',cost:1700,power:.8,range:28,reload:2.4,speed:240,description:'빠른 탄속·장전 · 추격용 연사'},
 {id:'culverin',name:'컬버린 장포',cost:2800,power:1.1,range:43,reload:4.3,speed:200,description:'긴 사거리·높은 탄속 · 원거리 측면전'},
 {id:'bombard',name:'중형 봄바드',cost:3600,power:1.5,range:25,reload:5.8,speed:110,description:'느린 탄속·장전 · 근거리 중량탄'}
]);
export function buyCannon(state,id){const gun=CANNON_TYPES.find(g=>g.id===id);if(!gun||!canDock(state)||!portHasFacility(canDock(state).id,'fleet'))return fail(state,'조선소가 있는 항구에서 함포를 선택해.');if(state.ship.cannonType===id)return fail(state,'이미 장착한 함포야.');if(state.coins<gun.cost)return fail(state,'함포 교체 금화가 부족해.');const s=copy(state);s.coins-=gun.cost;s.ship.cannonType=id;return success(s,gun.name+' 장착 · 포문 수 '+s.ship.cannons+'문 유지');}
export const PERSONAL_SKILLS=Object.freeze({
 florence:{name:'복원가의 응급처치',kind:'heal',heal:23,description:'복원 지식과 의술로 일행 회복 · 집중 8'},greta:{name:'흔들리는 협상',kind:'weak',multiplier:1.4,description:'적의 심리를 읽어 약점 노출 · 집중 8'},
 eleanor:{name:'해도의 맹세',kind:'strike',multiplier:1.8,description:'항해와 포술로 강한 연격 · 집중 8'},
 samira:{name:'별자리의 허점',kind:'weak',multiplier:1.2,description:'별 관측 지식으로 적의 방어 약화 · 집중 8'},
 amani:{name:'상단의 결의',kind:'heal',heal:16,description:'일행을 격려해 체력 회복 · 집중 8'},
 arjun:{name:'계절풍 연격',kind:'strike',multiplier:1.95,description:'빠른 동작으로 연속 타격 · 집중 8'},
 rin:{name:'봉인 베기',kind:'strike',multiplier:2.05,description:'정확한 검격으로 큰 피해 · 집중 8'},
 thomas:{name:'조류 간파',kind:'weak',multiplier:1.1,description:'적의 움직임을 읽어 방어 약화 · 집중 8'},
 isabel:{name:'금화보다 신뢰',kind:'heal',heal:20,description:'동료의 사기를 높여 체력 회복 · 집중 8'},
 willem:{name:'심장부 저격',kind:'strike',multiplier:2.15,description:'포술 능력을 살린 집중 사격 · 집중 8'},
 freya:{name:'별의 좌표',kind:'weak',multiplier:1.3,description:'측량으로 정확한 약점 표시 · 집중 8'},
 diego:{name:'임시 방벽',kind:'barrier',description:'목재 방벽으로 이번 적 차례의 일행 피해 감소 · 집중 8'}
});

export const LAND_EVENTS=Object.freeze([
 {id:'injured',title:'부상당한 조사대',text:'갈라진 회랑에서 부상당한 조사대가 구조를 기다리고 있어.',options:['의약품 1로 치료한다 · 명성·경험','안전한 퇴로를 알려주고 이동한다']},
 {id:'tide',title:'밀려드는 조수',text:'돌계단 아래에서 물이 차오르고 있어. 조사 시간을 조정해야 해.',options:['식량 2로 썰물을 기다린다 · 경험','높은 길로 우회한다 · 행동력 1 소모']},
 {id:'mural',title:'지워지는 벽화',text:'습기를 머금은 벽화에 고대 선박의 도면이 드러났어.',options:['행동력 1로 세밀하게 기록한다 · 경험·명성','현장을 보존하고 다음 방으로 간다']}
]);
export function resolveLandEvent(state,choice){const ex=state.expedition,event=LAND_EVENTS.find(e=>e.id===ex?.event);if(!event||![0,1].includes(choice))return fail(state,'진행 중인 현장 사건을 확인해.');const s=copy(state),e=s.expedition;if(event.id==='injured'&&choice===0){if(s.supplies.medicine<1)return fail(state,'치료에 의약품 1이 필요해. 다른 선택도 가능해.');s.supplies.medicine--;s.fame+=6;s.xp+=20;e.energy++;}if(event.id==='tide'){if(choice===0){if(s.ship.provisions<2)return fail(state,'기다리려면 식량 2가 필요해.');s.ship.provisions-=2;s.xp+=12;}else e.energy=Math.max(0,e.energy-1);}if(event.id==='mural'&&choice===0){if(e.energy<1)return fail(state,'기록할 행동력이 부족해. 현장을 보존하고 이동해.');e.energy--;s.xp+=18;s.fame+=3;}e.event=null;e.eventResolved=true;return success(s,event.title+' 사건을 마무리했어.');}

// 선박 장비: 원래 돛·포문·화물실 개조와 독립된 장착 부품.
export const SAIL_EQUIPMENT=Object.freeze([
 {id:'standard',name:'표준 범포',cost:0,speed:1,turn:1,description:'기본 돛 세트'},
 {id:'lateen',name:'포르투갈 보조 라틴돛',port:'gold',cost:950,speed:1.08,turn:1.08,description:'항속 +8% · 선회 +8%'},
 {id:'broadcloth',name:'네덜란드 광폭 범포',port:'jade',cost:1200,speed:1.13,turn:.94,description:'항속 +13% · 선회 −6%'},
 {id:'stormcloth',name:'북해 폭풍 범포',port:'north',cost:1350,speed:.98,turn:1.05,description:'항속 −2% · 악천후 감속 완화'}
]);
export const FIGUREHEADS=Object.freeze([
 {id:'none',name:'장식 없음',cost:0,speed:1,turn:1,description:'기본 선수'},
 {id:'dolphin',name:'돌고래 선수상',port:'gold',cost:1100,speed:1.04,turn:1.04,description:'항속·선회 +4%'},
 {id:'lion',name:'사자 선수상',port:'dawn',cost:1600,speed:1,turn:1,description:'함포 위력 +8%'},
 {id:'mermaid',name:'바다 요정 선수상',port:'venice',cost:1800,speed:1,turn:1.04,description:'선회 +4% · 의약품 선원 회복 +4'},
 {id:'owl',name:'올빼미 선수상',port:'north',cost:1450,speed:1,turn:1,description:'육지 탐험 행동력 +1'}
]);
export const SPECIAL_DOCKS=Object.freeze([
 {id:'london-ports',port:'dawn',name:'런던 왕립 포대',cost:1800,description:'포문 +2 · 최대 20문'},
 {id:'dutch-hold',port:'jade',name:'암스테르담 창고식 선창',cost:1550,description:'기함 적재량 +12'},
 {id:'brest-rudder',port:'storm',name:'브레스트 조타 장치',cost:1250,description:'직접 조타 선회 +10%'},
 {id:'venice-carving',port:'venice',name:'베네치아 선수 조각',cost:1650,description:'선수상 장착 중 항속 +2%'},
 {id:'north-keel',port:'north',name:'에든버러 강화 용골',cost:1450,description:'함포 피격 피해 추가 6% 감소'}
]);
export function buyShipEquipment(state,slot,id){const item=(slot==='sail'?SAIL_EQUIPMENT:slot==='figurehead'?FIGUREHEADS:[]).find(g=>g.id===id),p=canDock(state);if(!item||!p||!portHasFacility(p.id,'fleet'))return fail(state,'조선소가 있는 항구에서 선박 부품을 골라.');if(item.port&&item.port!==p.id)return fail(state,portById(item.port).name+' 조선소의 특산 부품이야.');if(state.ship.gear[slot]===id)return fail(state,'이미 장착한 부품이야.');if(state.coins<item.cost)return fail(state,'장착 금화가 부족해.');const s=copy(state);s.coins-=item.cost;s.ship.gear[slot]=id;return success(s,item.name+' 장착');}
export function refineShip(state,id){const item=SPECIAL_DOCKS.find(g=>g.id===id),p=canDock(state);if(!item||p?.id!==item.port||!portHasFacility(p.id,'fleet'))return fail(state,'해당 도시의 특수 조선소를 찾아가.');if(state.ship.regionalMods.includes(id))return fail(state,'이미 적용한 특수 개조야.');if(state.coins<item.cost)return fail(state,'특수 개조 금화가 부족해.');const s=copy(state);s.coins-=item.cost;s.ship.regionalMods.push(id);if(id==='london-ports')s.ship.cannons=Math.min(20,s.ship.cannons+2);if(id==='dutch-hold')s.ship.cargoLimit+=12;return success(s,item.name+' 적용 · 다른 선박으로 바꿔도 장비와 도면은 보존돼.');}
export const TAVERN_HOSTS=Object.freeze([
 {id:'beatrice',name:'베아트리스',port:'dawn',face:0,likes:'book',story:'왕실 우편선의 소식을 기억하는 런던 여관 주인.'},
 {id:'helena',name:'엘레나',port:'gold',face:1,likes:'wine',story:'리스본 상인들의 거래 습관을 꿰뚫는 여관 주인.'},
 {id:'greta',name:'그레타 호프',port:'jade',face:2,likes:'flower',story:'선술집의 이야기를 함부로 팔지 않는 암스테르담 정보상.'},
 {id:'colette',name:'콜레트',port:'marseille',face:3,likes:'flower',story:'해군과 밀수꾼의 사정을 모두 듣는 마르세유 여관 주인.'},
 {id:'florence',name:'플로렌체 벨리니',port:'venice',face:4,likes:'book',story:'유물 복원가 출신. 손님의 항해 기록을 모아 작은 서고를 운영해.'}
]);
export const GIFTS=Object.freeze([{id:'flower',name:'계절 꽃',cost:60,trust:5},{id:'book',name:'여행 서적',cost:140,trust:8},{id:'brooch',name:'장식 브로치',cost:280,trust:12},{id:'wine',name:'화물의 포도주 1개',cost:0,trust:8}]);
export function relationStatus(s,id){return {trust:0,lastTalk:-1,lastGift:-1,lastInfo:-1,bond:false,...s.tavernRelations[id]};}
function contactAvailable(s,id){return s.crewRoster.includes(id)||TAVERN_HOSTS.some(h=>h.id===id&&canDock(s)?.id===h.port);}
export function talkContact(state,id){if(!contactAvailable(state,id))return fail(state,'이 인물이 있는 선술집이나 승선 동료 창에서 대화해.');const rel=relationStatus(state,id);if(rel.lastTalk===state.day)return fail(state,'오늘 이야기는 충분히 나눴어. 다른 항해를 마치고 다시 만나.');const s=copy(state);rel.trust=Math.min(100,rel.trust+3);rel.lastTalk=s.day;s.tavernRelations[id]=rel;return success(s,'항해 이야기와 고민을 나눴어. 친밀도 '+rel.trust);}
export function giveGift(state,id,giftId){const gift=GIFTS.find(g=>g.id===giftId);if(!gift||!contactAvailable(state,id)||!canDock(state))return fail(state,'항구에서 선물을 구해 전달해.');const rel=relationStatus(state,id);if(rel.lastGift===state.day)return fail(state,'선물은 하루 한 번이면 충분해.');if(gift.id==='wine'&&(state.cargo.wine||0)<1)return fail(state,'교역소에서 포도주 1개를 구해.');if(state.coins<gift.cost)return fail(state,'선물 구입 금화가 부족해.');const s=copy(state);s.coins-=gift.cost;if(gift.id==='wine')s.cargo.wine--;const preference=TAVERN_HOSTS.find(h=>h.id===id)?.likes||'book';rel.trust=Math.min(100,rel.trust+gift.trust+(preference===gift.id?5:0));rel.lastGift=s.day;s.tavernRelations[id]=rel;return success(s,gift.name+'을 건넸어. '+(preference===gift.id?'마음에 드는 선물이래. ':'')+'친밀도 '+rel.trust);}
export function premiumInformation(state,id){if(!contactAvailable(state,id))return fail(state,'인물을 직접 만나 정보를 들어.');const rel=relationStatus(state,id);if(rel.trust<35)return fail(state,'고급 정보는 친밀도 35부터 알려줘.');if(rel.lastInfo===state.day)return fail(state,'오늘 새 정보는 이미 들었어.');const s=copy(state);rel.lastInfo=s.day;s.tavernRelations[id]=rel;const treasure=TREASURES.find(t=>!s.treasureClues.includes(t.id));if(treasure){s.treasureClues.push(treasure.id);return success(s,'믿을 만한 정보: '+treasure.clue);}s.xp+=12;const dock=SPECIAL_DOCKS[(s.day+TAVERN_HOSTS.findIndex(h=>h.id===id)+5)%SPECIAL_DOCKS.length];return success(s,'조선 비화: '+portById(dock.port).name+'의 '+dock.name+' · '+dock.description+' / 베네치아와 암스테르담에는 인연으로 영입할 수 있는 인물도 있어.');}
export function expressBond(state,id){if(!contactAvailable(state,id))return fail(state,'직접 만나 마음을 전해.');const rel=relationStatus(state,id);if(rel.bond)return fail(state,'이미 서로 마음을 확인한 사이야.');if(rel.trust<80||!state.completedStories.length)return fail(state,'친밀도 80과 주인공 이야기 1장 해결이 필요해.');const s=copy(state);rel.bond=true;s.tavernRelations[id]=rel;return success(s,'서로의 마음을 확인했어. 떨어져 있어도 편지로 항해를 응원하기로 했어.');}
export function benchCompanion(state,id){if(!canDock(state)||id===state.captainId||!state.crewRoster.includes(id)||state.landBattle)return fail(state,'항구에서 선장 외 동료를 여관 대기로 바꿀 수 있어.');const s=copy(state);s.crewRoster=s.crewRoster.filter(x=>x!==id);if(!s.reserveCrew.includes(id))s.reserveCrew.push(id);for(const r of CREW_ROLES)if(s.assignments[r.id]===id)s.assignments[r.id]='';return success(s,CREW.find(c=>c.id===id).name+' 여관 대기 · 성장과 인연 기록은 유지돼.');}
