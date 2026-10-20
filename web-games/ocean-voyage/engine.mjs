// 파일명: web-games/ocean-voyage/engine.mjs
// 메인: 항해·교역·해전·발견·저장. 렌더러와 DOM에 의존하지 않는다.
export const SAVE_KEY='jg-ocean-voyage-v1';
export const PORTS=Object.freeze([
  {id:'dawn',name:'새벽항',x:0,z:0,region:'푸른해',faction:'자유항로',rates:{grain:.78,wood:.9,spice:1.55,silk:1.35,ore:1.12,tea:1.3}},
  {id:'coral',name:'산호만',x:74,z:-45,region:'산호해',faction:'자유항로',rates:{grain:1.3,wood:1.15,spice:.75,silk:1.42,ore:1.2,tea:1.15}},
  {id:'north',name:'북풍성',x:-80,z:-76,region:'북풍해',faction:'북방연합',rates:{grain:1.5,wood:.7,spice:1.7,silk:1.8,ore:.85,tea:1.5}},
  {id:'gold',name:'황금곶',x:138,z:50,region:'남해',faction:'황금상단',rates:{grain:.95,wood:1.5,spice:1.1,silk:1.12,ore:.78,tea:1.2}},
  {id:'jade',name:'비취항',x:-136,z:52,region:'서해',faction:'황금상단',rates:{grain:1.2,wood:1.24,spice:1.35,silk:.69,ore:1.3,tea:.75}},
  {id:'storm',name:'폭풍피항지',x:32,z:142,region:'폭풍해',faction:'북방연합',rates:{grain:1.65,wood:1.2,spice:.82,silk:1.35,ore:1.65,tea:.8}},
  {id:'amber',name:'호박도',x:-118,z:147,region:'서해',faction:'자유항로',rates:{grain:.92,wood:1.32,spice:1.72,silk:1.08,ore:1.2,tea:.76}},
  {id:'sun',name:'태양항',x:162,z:-137,region:'남해',faction:'황금상단',rates:{grain:1.35,wood:1.3,spice:.65,silk:.9,ore:1.45,tea:1.5}}
]);
export const GOODS=Object.freeze([
  {id:'grain',name:'곡물',base:75,weight:1},
  {id:'wood',name:'목재',base:95,weight:1},
  {id:'spice',name:'향신료',base:235,weight:1},
  {id:'silk',name:'비단',base:310,weight:1},
  {id:'ore',name:'철광석',base:160,weight:2},
  {id:'tea',name:'차',base:180,weight:1}
]);
export const PORT_RADIUS=11;
export const WORLD_LIMIT=210;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const rand=(seed)=>{let n=(seed>>>0)||1;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;}};
const copy=s=>structuredClone(s);
export function newGame(){
 return {
  version:1,day:1,elapsed:0,coins:3400,discovered:['dawn'],visits:{dawn:1},
  ship:{x:0,z:10,heading:0,hull:100,maxHull:100,sail:1,cannons:4,crew:34,maxCrew:55,provisions:80,cargoLimit:42,cooldown:0,repairLevel:0},
  fleet:1,cargo:{},reputation:{'자유항로':0,'북방연합':0,'황금상단':0},
  route:[],destination:null,pirates:[
   {id:1,x:63,z:4,heading:1.7,hull:62,maxHull:62,cooldown:4},
   {id:2,x:-78,z:75,heading:1.4,hull:76,maxHull:76,cooldown:7},
   {id:3,x:110,z:-115,heading:1.3,hull:94,maxHull:94,cooldown:10}],
  quests:[],victories:0,treasures:[],log:['새벽항에서 첫 항해를 시작했어.'],weather:0,score:0
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
  s.coins=clamp(s.coins,0,1e12);s.day=clamp(s.day,1,1e7);
  s.ship.x=clamp(s.ship.x,-WORLD_LIMIT,WORLD_LIMIT);s.ship.z=clamp(s.ship.z,-WORLD_LIMIT,WORLD_LIMIT);
  s.ship.hull=clamp(s.ship.hull,0,s.ship.maxHull||100);
  s.discovered=[...new Set(s.discovered.filter(id=>PORTS.some(p=>p.id===id)))];
  s.route=Array.isArray(s.route)?s.route.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)).slice(0,200):[];
  s.pirates=Array.isArray(s.pirates)?s.pirates.filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.z)&&e.hull>0).slice(0,24):[];
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
export function priceAt(portId,goodId,day=1,mode='buy'){
 const port=portById(portId),good=GOODS.find(g=>g.id===goodId);
 if(!port||!good)return 0;
 const wave=Math.sin(day*.31+PORTS.indexOf(port)*1.7+GOODS.indexOf(good)*2.1)*.075;
 const tax=port.faction==='황금상단'?.025:0;
 const val=good.base*port.rates[good.id]*(1+wave+tax);
 return Math.max(1,Math.round(val*(mode==='buy'?1.08:.90)));
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
 s.reputation[port.faction]=(s.reputation[port.faction]||0)+qty;
 s.score+=qty;
 note(s,port.name+'에서 '+good.name+' '+qty+'개 '+(mode==='buy'?'구매':'판매')+' 완료');
 return {state:s,ok:true,message:good.name+' '+qty+'개 '+(mode==='buy'?'구매':'판매')+' 완료'};
}
export function buyUpgrade(state,kind){
 const p=canDock(state);if(!p)return {state,ok:false,message:'항구에서만 보급과 개조가 가능해.'};
 const s=copy(state),costs={repair:Math.ceil((s.ship.maxHull-s.ship.hull)*8),provisions:190,crew:420,sail:950+s.ship.sail*700,cannon:780+s.ship.cannons*85,ship:3300+(s.fleet-1)*2600};
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
 note(s,'항구 조선소: '+({repair:'수리',provisions:'식량',crew:'선원',sail:'돛 개선',cannon:'함포 추가',ship:'함선 구매'}[kind])+' (-'+cost+'G)');
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
const SEA_ISLANDS=PORTS.map(p=>({x:p.x,z:p.z,r:7}));
export function navigationRoute(from,to){
 if(!to||!Number.isFinite(to.x)||!Number.isFinite(to.z))return [];
 const cell=10,size=43,zero=21;
 const coord=v=>clamp(Math.round(v/cell)+zero,0,size-1);
 const sx=coord(from.x),sz=coord(from.z),tx=coord(to.x),tz=coord(to.z);
 const key=(x,z)=>x+z*size,goal=key(tx,tz),start=key(sx,sz);
 const blocked=(x,z)=>SEA_ISLANDS.some(p=>{
  if(Math.hypot(x*cell-zero*cell-p.x,z*cell-zero*cell-p.z)<p.r+3){
   return Math.hypot(p.x-to.x,p.z-to.z)>PORT_RADIUS&&Math.hypot(p.x-from.x,p.z-from.z)>PORT_RADIUS;
  }return false;
 });
 const open=[{x:sx,z:sz,g:0,f:Math.hypot(tx-sx,tz-sz)}],fromKey=new Map(),cost=new Map([[start,0]]),closed=new Set();
 let steps=0;
 while(open.length&&steps++<size*size*4){
  open.sort((a,b)=>a.f-b.f);const cur=open.shift(),k=key(cur.x,cur.z);
  if(closed.has(k))continue;
  if(k===goal){
   const route=[];let at=k;
   while(at!==start&&route.length<120){
    route.push({x:(at%size-zero)*cell,z:(Math.floor(at/size)-zero)*cell});
    at=fromKey.get(at);if(at===undefined)break;
   }
   route.reverse();route.push({x:to.x,z:to.z});return route;
  }
  closed.add(k);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[-1,1],[1,-1]]){
   const x=cur.x+dx,z=cur.z+dz,nk=key(x,z);
   if(x<0||z<0||x>=size||z>=size||blocked(x,z)||closed.has(nk))continue;
   const g=cur.g+Math.hypot(dx,dz);
   if(g>=(cost.get(nk)??Infinity))continue;
   cost.set(nk,g);fromKey.set(nk,k);
   open.push({x,z,g,f:g+Math.hypot(tx-x,tz-z)});
  }
 }
 return [{x:to.x,z:to.z}];
}
export function setDestination(state,id){
 const p=portById(id);if(!p)return state;
 const s=copy(state);s.destination=id;s.route=navigationRoute(s.ship,p);
 note(s,'자동항해 시작: '+p.name);return s;
}
export function cancelDestination(state){const s=copy(state);s.destination=null;s.route=[];return s;}
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function stepSea(state,input={},seconds=.05){
 const s=copy(state);let dt=clamp(Number(seconds)||.05,0,2);
 const ship=s.ship;
 if(ship.hull<=0)return s;
 const wind=Math.sin(s.day*.7+s.elapsed*.03)*.4;
 let turn=clamp(Number(input.turn)||0,-1,1),throttle=clamp(Number(input.throttle)||0,-1,1);
 if(s.route.length&&input.manual!==true){
  const target=s.route[0],d=dist(ship,target);
  if(d<7){s.route.shift();if(!s.route.length){s.destination=null;note(s,'항로 목적지 근처에 도착했어.');}}
  if(s.route.length){
   const r=s.route[0],desired=Math.atan2(r.x-ship.x,r.z-ship.z);
   turn=clamp(wrap(desired-ship.heading)*1.8,-1,1);
   throttle=1;
  }
 }
 ship.heading=wrap(ship.heading+turn*dt*(.8+ship.sail*.06));
 const laden=1-cargoWeight(s)/Math.max(1,ship.cargoLimit*s.fleet)*.18;
 const speed=(2.1+ship.sail*1.15)*(1+wind*.24)*laden*(ship.hull/ship.maxHull*.6+.4);
 const dx=Math.sin(ship.heading)*speed*throttle*dt,dz=Math.cos(ship.heading)*speed*throttle*dt;
 ship.x=clamp(ship.x+dx,-WORLD_LIMIT,WORLD_LIMIT);
 ship.z=clamp(ship.z+dz,-WORLD_LIMIT,WORLD_LIMIT);
 ship.cooldown=Math.max(0,ship.cooldown-dt);
 s.elapsed+=dt;s.weather=wind;
 if(s.elapsed>=16){
  s.elapsed-=16;s.day++;ship.provisions=Math.max(0,ship.provisions-2);
  if(ship.provisions===0){ship.hull=Math.max(1,ship.hull-4);ship.crew=Math.max(1,ship.crew-1);note(s,'식량 부족으로 선원과 선체가 약해졌어.');}
 }
 for(const p of PORTS){
  if(dist(ship,p)<17&&!s.discovered.includes(p.id)){
   s.discovered.push(p.id);s.score+=100;note(s,'신항구 발견: '+p.name+' (+탐험점수)');
  }
  if(dist(ship,p)<PORT_RADIUS&&!s.visits[p.id]){
   s.visits[p.id]=1;note(s,p.name+' 첫 입항');
  }
 }
 for(const enemy of s.pirates){
  if(enemy.hull<=0)continue;
  const d=dist(ship,enemy);
  const angle=Math.atan2(ship.x-enemy.x,ship.z-enemy.z);
  enemy.heading=wrap(enemy.heading+clamp(wrap(angle-enemy.heading),-dt*.4,dt*.4));
  if(d<40&&d>15){
   enemy.x+=Math.sin(enemy.heading)*dt*1.2;enemy.z+=Math.cos(enemy.heading)*dt*1.2;
  }
  enemy.cooldown=Math.max(0,enemy.cooldown-dt);
  if(d<21&&enemy.cooldown===0&&ship.hull>0){
   ship.hull=Math.max(0,ship.hull-(4+Math.floor(enemy.id*1.6)));
   enemy.cooldown=9;note(s,'해적 함포에 피격! 선체 내구도 '+Math.round(ship.hull));
  }
 }
 return s;
}
export function fireCannons(state){
 const s=copy(state),ship=s.ship;
 if(ship.cooldown>0||ship.hull<=0)return {state,ok:false,message:'장전 중이거나 전투 불가능해.'};
 const target=s.pirates.filter(p=>p.hull>0).map(p=>({p,d:dist(p,ship)})).filter(v=>v.d<34).sort((a,b)=>a.d-b.d)[0];
 if(!target)return {state,ok:false,message:'사거리 내 해적선이 없어.'};
 const enemy=target.p;
 const angle=Math.atan2(enemy.x-ship.x,enemy.z-ship.z);
 if(Math.abs(wrap(angle-ship.heading))<.45){
  return {state,ok:false,message:'측면 포격이야. 배를 회전시켜 해적을 좌우 측면에 둬.'};
 }
 enemy.hull=Math.max(0,enemy.hull-Math.round(ship.cannons*(3+ship.crew/30)*Math.max(.6,1-target.d/80)));
 ship.cooldown=3.5;s.score+=10;
 note(s,'함포 명중! 적 내구도 '+Math.round(enemy.hull));
 if(enemy.hull===0){s.coins+=400+enemy.id*120;s.victories++;s.score+=250;note(s,'해적 함선 격침! 전리품 획득');}
 return {state:s,ok:true,message:'포격 성공'};
}
