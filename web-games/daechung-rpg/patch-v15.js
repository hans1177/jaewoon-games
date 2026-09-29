(()=>{
if(window.__RPG_V15_PATCHED)return;window.__RPG_V15_PATCHED=true;

F.f8={n:'8번 폐허 마을',l:'Lv.13~15',bg:'#302b2a',m:[['폐허 기사',13,1250,28,60,22,180,45,2,'knight'],['잿빛 주술사',14,1500,34,52,23,220,60,2,'demon'],['거대오크',15,2000,40,46,34,400,100,1,'giantOrc']]};
F.f9={n:'9번 공동묘지',l:'Lv.16~20',bg:'#11141a',m:[]};
F.f10={n:'10번 빙결 설산',l:'Lv.21~23',bg:'#8ca8b8',m:[['빙설 늑대',21,2800,72,82,23,260,120,3,'wolf'],['얼음 해골',22,3200,78,62,22,300,140,3,'skeleton'],['빙결 오크',23,3800,84,55,27,360,170,2,'orc']]};
F.f11={n:'11번 저주받은 성',l:'Lv.24~27',bg:'#241a2d',m:[['저주받은 기사',24,4300,92,63,24,430,210,3,'knight'],['혈마법사',25,3900,88,58,23,470,230,2,'demon'],['심연의 거인',27,5600,108,50,31,620,320,1,'ogre']]};
F.cliff={n:'절벽 지대',l:'Lv.10~12',bg:'#726751',m:[['절벽 늑대',10,950,38,76,20,105,55,3,'wolf'],['바위 오크',11,1350,46,55,24,140,72,3,'orc'],['절벽 기사',12,1700,54,60,23,175,90,2,'knight']]};
F.amazon={n:'아마존',l:'Lv.9~10',bg:'#10251b',m:[['늪 악어',9,1000,40,62,25,120,0,0,'croc'],['썩은 골렘',10,1500,30,46,31,150,0,0,'golem']]};
if(!P.some(a=>a[0]==='f8'))P.push(['f8',1010,820,'8번 포탈','Lv.13~15']);
if(!P.some(a=>a[0]==='f9'))P.push(['f9',1450,820,'9번 포탈','Lv.16~20']);
WEAPONS['철 도끼'].damage=40;WEAPONS['철 도끼'].cd=.5;
WEAPONS['강철 대검']={price:700,damage:50,cd:1};WEAPONS['강철 쌍검']={price:1000,damage:35,cd:.35};
WEAPONS['빙결 대검']={price:2200,damage:75,cd:.8,hidden:true};WEAPONS['저주 쌍검']={price:2600,damage:65,cd:.32,hidden:true};WEAPONS['사신의 낫']={price:3000,damage:95,cd:1,hidden:true};
for(const k of ['강철 대검','강철 쌍검','빙결 대검','저주 쌍검','사신의 낫'])if(!(k in ownedWeapons))ownedWeapons[k]=false;
ARMORS['강철 갑옷']={price:500,hp:400};if(!('강철 갑옷' in ownedArmors))ownedArmors['강철 갑옷']=false;
SELL_PRICE['골렘 이끼']=100;SELL_PRICE['악어 비늘']=70;inv['골렘 이끼']=inv['골렘 이끼']||0;inv['악어 비늘']=inv['악어 비늘']||0;inv['회복 물약']=inv['회복 물약']||0;
let postReaper=false,graveOffered=false,reaperDefeated=false,reaperRef=null,summonCountdown=0,questKill10=0,jungleWalk=0,lastJungleX=p.x,lastJungleY=p.y;
const ALTAR={x:1425,y:950},RIVER={x:900,y:600},AMAZON_SIGN={x:1680,y:1040},CLIFF_EXIT={x:1720,y:600},hazards=[];
const hudRow=document.querySelector('#hud .row'),jobText=document.createElement('span');jobText.className='pill';jobText.textContent='미전직';hudRow.appendChild(jobText);
const skill=document.createElement('button');skill.className='btn';skill.style.cssText='right:22px;bottom:130px;width:88px;height:72px;border-radius:18px;background:#7048b7e8;font-size:12px;display:none;white-space:pre-line';document.body.appendChild(skill);
const heal=document.createElement('button');heal.className='btn';heal.textContent='물약';heal.style.cssText='right:122px;bottom:38px;width:78px;height:78px;border-radius:18px;background:#2d9b72e8;font-size:12px;display:none';document.body.appendChild(heal);
const route=document.createElement('div');route.className='overlay';route.innerHTML='<div class="panel"><h2>강길 선택</h2><p>강을 따라 어디로 갈까?</p><button id="toAmazon" class="main">아마존으로</button><button id="toCliff" class="main">절벽으로</button><button id="routeClose" class="main dark">취소</button></div>';document.body.appendChild(route);
route.querySelector('#routeClose').onclick=()=>route.style.display='none';route.querySelector('#toAmazon').onclick=()=>{route.style.display='none';enter('amazon')};route.querySelector('#toCliff').onclick=()=>{route.style.display='none';enter('cliff')};
if(!npcs.some(n=>n.k==='potion'))npcs.push({x:1180,y:1010,n:'물약상인',k:'potion'});

// ==============================
// 실시간 멀티플레이 · 방 코드 1~10
// ==============================
const MULTI_SUPABASE_URL='https://njpexgqvituaxrjpnqsi.supabase.co';
const MULTI_SUPABASE_KEY='sb_publishable_ybAF71npJQz6PJVpnwsQ4g_rsyzlkFQ';
const multiplayer={
 client:null,channel:null,room:'',connected:false,
 playerId:sessionStorage.getItem('daechung-rpg-multi-id')||('r'+Math.random().toString(36).slice(2,10)),
 joinedAt:Date.now(),remote:new Map(),presenceIds:new Set(),sendAt:0
};
sessionStorage.setItem('daechung-rpg-multi-id',multiplayer.playerId);

const multiBtn=document.createElement('button');
multiBtn.textContent='멀티';
multiBtn.style.cssText='position:fixed;right:84px;top:18px;z-index:16;height:46px;min-width:68px;padding:0 12px;border:2px solid #ffffff99;border-radius:14px;background:#345d8fe8;color:#fff;font-weight:900;box-shadow:0 5px 15px #0008';
document.body.appendChild(multiBtn);

const multiPanel=document.createElement('div');
multiPanel.style.cssText='position:fixed;right:12px;top:72px;z-index:30;width:min(92vw,320px);display:none;background:#171c26f5;border:2px solid #7fbef3;border-radius:14px;padding:12px;box-shadow:0 12px 30px #000a;color:#fff';
multiPanel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b>멀티플레이</b><button id="rpgMultiClose" style="width:34px;height:30px;border:0;border-radius:8px;background:#ffffff18;color:#fff">×</button></div><div id="rpgMultiStatus" style="font-size:12px;color:#b9d9ff;margin:8px 0">오프라인</div><input id="rpgMultiRoom" type="number" min="1" max="10" inputmode="numeric" placeholder="방 번호 1~10" style="width:100%;height:42px;border:1px solid #ffffff33;border-radius:10px;background:#0d1420;color:#fff;padding:0 10px;font-weight:900"><div style="display:flex;gap:8px;margin-top:8px"><button id="rpgMultiCreate" class="main" style="margin:0;font-size:14px">방 만들기</button><button id="rpgMultiJoin" class="main" style="margin:0;font-size:14px">방 참가</button></div><button id="rpgMultiLeave" class="main dark" style="font-size:14px">방 나가기</button><div style="font-size:11px;opacity:.75;margin-top:7px">방 코드는 1~10 중 숫자 하나</div>';
document.body.appendChild(multiPanel);
const multiStatus=multiPanel.querySelector('#rpgMultiStatus'),multiRoom=multiPanel.querySelector('#rpgMultiRoom');

let supabaseLoadPromise=null;
function ensureSupabase(){
 if(window.supabase?.createClient)return Promise.resolve(true);
 if(supabaseLoadPromise)return supabaseLoadPromise;
 supabaseLoadPromise=new Promise(resolve=>{
  const sc=document.createElement('script');
  sc.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.1';
  sc.onload=()=>resolve(!!window.supabase?.createClient);
  sc.onerror=()=>resolve(false);
  document.head.appendChild(sc);
 });
 return supabaseLoadPromise;
}
function validMultiRoom(v){
 const room=String(v||'').trim(),n=Number(room);
 return /^([1-9]|10)$/.test(room)&&Number.isInteger(n)&&n>=1&&n<=10?room:'';
}
function updateMultiStatus(extra=''){
 const count=Math.max(1,multiplayer.presenceIds.size||1);
 multiStatus.textContent=multiplayer.connected?'방 '+multiplayer.room+' · '+count+'명'+(extra?' · '+extra:''):'오프라인';
 multiBtn.textContent=multiplayer.connected?'멀티 '+multiplayer.room:'멀티';
}
function syncMultiPresence(){
 if(!multiplayer.channel)return;
 const rows=Object.values(multiplayer.channel.presenceState()||{}).flat().filter(Boolean);
 const ids=new Set(rows.map(x=>x.id).filter(Boolean));ids.add(multiplayer.playerId);
 multiplayer.presenceIds=ids;
 for(const id of [...multiplayer.remote.keys()])if(!ids.has(id))multiplayer.remote.delete(id);
 updateMultiStatus();
}
function multiSend(event,payload){
 if(!multiplayer.connected||!multiplayer.channel)return;
 multiplayer.channel.send({type:'broadcast',event,payload}).catch(()=>{});
}
function remotePlayerState(payload){
 if(!payload||payload.id===multiplayer.playerId)return;
 const old=multiplayer.remote.get(payload.id);
 const r=old||{x:Number(payload.x)||0,y:Number(payload.y)||0};
 r.tx=Number(payload.x)||0;r.ty=Number(payload.y)||0;
 r.zone=String(payload.zone||'town');r.dir=Number(payload.dir)||1;r.lv=Number(payload.lv)||1;
 r.job=String(payload.job||'미전직');r.weapon=String(payload.weapon||'맨손');
 r.hp=Math.max(0,Number(payload.hp)||0);r.maxHp=Math.max(1,Number(payload.maxHp)||100);
 r.animState=String(payload.animState||'idle');r.animFrame=Number(payload.animFrame)||0;
 r.seenAt=performance.now();multiplayer.remote.set(payload.id,r);
}
async function leaveMultiplayer(){
 if(multiplayer.channel){try{await multiplayer.channel.untrack()}catch{}try{await multiplayer.channel.unsubscribe()}catch{}}
 multiplayer.channel=null;multiplayer.client=null;multiplayer.connected=false;multiplayer.room='';
 multiplayer.remote.clear();multiplayer.presenceIds.clear();updateMultiStatus();
}
async function connectMultiplayer(rawRoom){
 const room=validMultiRoom(rawRoom);
 if(!room){toastMsg('방 번호는 1~10 중 하나만 입력해');return}
 const ready=await ensureSupabase();
 if(!ready){toastMsg('멀티 서버 모듈 로딩 실패');return}
 await leaveMultiplayer();
 multiplayer.room=room;multiplayer.joinedAt=Date.now();
 multiplayer.client=window.supabase.createClient(MULTI_SUPABASE_URL,MULTI_SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 multiplayer.channel=multiplayer.client.channel('daechung-rpg:'+room,{config:{broadcast:{self:false,ack:false},presence:{key:multiplayer.playerId}}});
 multiplayer.channel
  .on('presence',{event:'sync'},syncMultiPresence)
  .on('broadcast',{event:'player-state'},({payload})=>remotePlayerState(payload))
  .subscribe(async status=>{
    if(status==='SUBSCRIBED'){
      multiplayer.connected=true;multiRoom.value=room;
      await multiplayer.channel.track({id:multiplayer.playerId,joinedAt:multiplayer.joinedAt});
      syncMultiPresence();updateMultiStatus('연결됨');toastMsg('멀티 방 '+room+' 참가');
    }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
      updateMultiStatus('연결 오류');toastMsg('멀티 연결 오류');
    }
  });
}
function createMultiplayerRoom(){
 const room=String(1+Math.floor(Math.random()*10));multiRoom.value=room;connectMultiplayer(room);
}
function updateMultiplayer(dt){
 const now=performance.now();
 if(multiplayer.connected&&now>=multiplayer.sendAt){
  multiplayer.sendAt=now+120;
  multiSend('player-state',{
   id:multiplayer.playerId,x:p.x,y:p.y,zone,dir:p.dir,lv:p.lv,job:p.job||'미전직',
   weapon:p.weapon||'맨손',hp:p.hp,maxHp:maxHp(),animState:p.animState,animFrame:p.animFrame
  });
 }
 for(const [id,r] of multiplayer.remote){
  if(now-(r.seenAt||0)>5000){multiplayer.remote.delete(id);continue}
  const k=Math.min(1,dt*12);r.x+=(r.tx-r.x)*k;r.y+=(r.ty-r.y)*k;
 }
}
function drawRemotePlayers(){
 const now=performance.now();
 for(const r of multiplayer.remote.values()){
  if(r.zone!==zone||now-(r.seenAt||0)>2200)continue;
  drawHuman(r.x,r.y,'player',r.animFrame||0,r.animState||'idle',r.dir<0);
  ctx.fillStyle='#10202c';ctx.fillRect(r.x-25,r.y-76,50,5);
  ctx.fillStyle='#4fc3ff';ctx.fillRect(r.x-25,r.y-76,50*Math.max(0,Math.min(1,r.hp/r.maxHp)),5);
  ctx.textAlign='center';ctx.font='900 11px sans-serif';ctx.fillStyle='#8fe9ff';
  ctx.fillText('멀티 · Lv.'+r.lv+' '+r.job,r.x,r.y-83);
  ctx.font='10px sans-serif';ctx.fillStyle='#ffe49a';ctx.fillText(r.weapon,r.x,r.y-68);ctx.textAlign='left';
 }
}
multiBtn.onpointerdown=e=>{e.preventDefault();multiPanel.style.display=multiPanel.style.display==='block'?'none':'block'};
multiPanel.querySelector('#rpgMultiClose').onclick=()=>multiPanel.style.display='none';
multiPanel.querySelector('#rpgMultiCreate').onclick=()=>createMultiplayerRoom();
multiPanel.querySelector('#rpgMultiJoin').onclick=()=>connectMultiplayer(multiRoom.value);
multiPanel.querySelector('#rpgMultiLeave').onclick=()=>leaveMultiplayer();

const TRAINERS={warrior:{zone:'town',x:610,y:530,name:'전사 전직관',job:'전사'},archer:{zone:'f8',x:1360,y:600,name:'궁수 전직관',job:'궁수'},mage:{zone:'f5',x:1630,y:170,name:'마법사 전직관',job:'마법사'}};
const hp0=maxHp;maxHp=function(){const v=hp0();return p.job==='궁수'?Math.max(1,Math.floor(v*.7)):v};const atk0=currentAtk;currentAtk=function(){const v=atk0();return p.job==='궁수'?v*1.5:v};
function nearTrainer(){let b=null,bd=82;for(const t of Object.values(TRAINERS)){if(t.zone!==zone)continue;const d=Math.hypot(p.x-t.x,p.y-t.y);if(d<bd){bd=d;b=t}}return b}
function become(job){if(p.lv<5){say('전직관','Lv.5부터 전직할 수 있다.');return}if(p.job&&p.job!=='미전직'){say('전직관','이미 '+p.job+'로 전직했다.');return}p.job=job;p.skillCd=0;if(job==='궁수')p.hp=Math.min(p.hp,maxHp());sfx('levelUp');hud();say('전직관',job+' 전직 완료!')}
function slashHit(){const ax=p.x+p.dir*40;fx.push({x:ax,y:p.y,t:.25,d:p.dir});for(const m of mons){if(m.dead)continue;if(Math.hypot(m.x-ax,m.y-p.y)<88+m.r){m.hp-=currentAtk()*3;m.hit=.15;if(m.hp<=0)kill(m)}}}
function useJobSkill(){if(!run||p.skillCd>0)return;if(p.job==='전사'){p.skillCd=10;slashHit();setTimeout(()=>{if(run)slashHit()},180);toastMsg('슬래시! 3배 공격 ×2')}else if(p.job==='마법사'){p.skillCd=30;p.hp=Math.min(maxHp(),p.hp+100);hud();toastMsg('자가회복 +100')}}
skill.onpointerdown=e=>{e.preventDefault();useJobSkill()};function skillLabel(){if(p.job==='전사')return p.skillCd>0?'슬래시\n'+Math.ceil(p.skillCd)+'초':'슬래시\n3배×2';if(p.job==='마법사')return p.skillCd>0?'자가회복\n'+Math.ceil(p.skillCd)+'초':'자가회복\n+100';return ''}
function customSpawn(spec,x,y,z){spawn(spec,x,y,z);return mons[mons.length-1]}
const baseEnter=enter;
function enterAmazon(){WORLD.w=3200;WORLD.h=2200;baseEnter('amazon');mons=[];const c=F.amazon.m[0],g=F.amazon.m[1];[[1035,1110],[1510,760],[1900,1170],[2440,910]].forEach(v=>customSpawn(c,v[0],v[1],'amazon'));[[1060,420],[2260,1540]].forEach(v=>{const m=customSpawn(g,v[0],v[1],'amazon');m.dormant=true;m.spd=0});p.x=210;p.y=1100;hud();toastMsg('거대한 아마존 지역 진입')}
function enterCliff(){WORLD.w=2000;WORLD.h=1400;baseEnter('cliff');p.x=185;p.y=700;hud();toastMsg('절벽 지대 · Lv.10~12')}
enter=function(z){if(z==='amazon'){enterAmazon();partySyncZone();return}if(z==='cliff'){enterCliff();partySyncZone();return}const keep=q,block=q===5&&z==='f2';if(block)q=5005;WORLD.w=z==='f9'?2850:1800;WORLD.h=z==='f9'?1900:1200;baseEnter(z);if(block){q=keep;hud()}if(z==='f9'){graveOffered=false;reaperDefeated=false;reaperRef=null;summonCountdown=0;p.x=185;p.y=600}partySyncZone()};
const getAction0=getAction;getAction=function(){if(zone==='f4'&&Math.hypot(p.x-AMAZON_SIGN.x,p.y-AMAZON_SIGN.y)<100)return {label:'아마존 가기',kind:'amazon'};if(zone==='f7'&&Math.hypot(p.x-RIVER.x,p.y-RIVER.y)<110)return {label:'들어가기',kind:'river'};if(zone==='cliff'&&Math.hypot(p.x-CLIFF_EXIT.x,p.y-CLIFF_EXIT.y)<110)return {label:'아마존으로',kind:'cliffAmazon'};if(zone==='f9'&&!graveOffered&&!reaperDefeated&&Math.hypot(p.x-ALTAR.x,p.y-ALTAR.y)<110)return {label:'바치기',kind:'graveOffer'};return getAction0()};
const useAction0=useAction;useAction=function(){const a=getAction();if(!a)return;if(a.kind==='amazon'){enter('amazon');return}if(a.kind==='river'){route.style.display='flex';return}if(a.kind==='cliffAmazon'){enter('amazon');return}if(a.kind==='graveOffer'){graveOffered=true;summonCountdown=3;sfx('bossAggro');toastMsg('무언가가 제물을 받아들였다...');return}useAction0()};
function rewardNext(next,msg){p.g+=50;q=next;sfx('questReward');hud();toastMsg('퀘스트 완료! +50골드');if(msg)setTimeout(()=>toastMsg(msg),520)}
function allArmorsOwned(){return Object.keys(ARMORS).filter(n=>['나무 갑옷','철 갑옷','강철 갑옷'].includes(n)).every(n=>ownedArmors[n])}
function autoQuestCheck(){if(q===7&&p.lv>=5){rewardNext(8,'다음: 전직하기');return true}if(q===8&&p.job&&p.job!=='미전직'){rewardNext(9,'다음: 오우거 처치');return true}if(q===11&&allArmorsOwned()){jungleWalk=0;rewardNext(12,'다음: 정글 15초 탐험');return true}return false}
const hud0=hud;hud=function(){hud0();jobText.textContent=p.job||'미전직';if(q===5||q===5005)quest.textContent='퀘스트: 2번 사냥터에서 몬스터 1마리 처치';else if(q===6)quest.textContent='퀘스트: 아무 무기나 1개 구매';else if(q===7)quest.textContent='퀘스트: Lv.5까지 올리기';else if(q===8)quest.textContent='퀘스트: 전직하기';else if(q===9)quest.textContent='퀘스트: 오우거 처치하기';else if(q===10)quest.textContent='퀘스트: 몬스터 10마리 처치 ('+Math.min(10,questKill10)+'/10)';else if(q===11)quest.textContent='퀘스트: 갑옷 구매';else if(q===12)quest.textContent='퀘스트: 정글 15초 탐험 ('+Math.min(15,Math.floor(jungleWalk))+'/15초)';else if(q>=13)quest.textContent='메인 퀘스트 완료';updatePartyHud()};
const talk0=talkNow;talkNow=function(){const tr=nearTrainer();if(tr){become(tr.job);return}const n=nearest();if(n&&n.k==='potion'){if(p.g<70){say('물약상인','회복 물약은 70골드다.');return}p.g-=70;inv['회복 물약']++;sfx('buy');hud();say('물약상인','회복 물약 1개 구매. 체력 100을 회복한다.');return}if(n&&n.k==='chief'){if(q===4){p.g+=50;q=5;sfx('questReward');hud();say('촌장','보상 50골드. 다음은 2번 사냥터에서 몬스터 1마리 처치다.');return}if(q===5){say('촌장','2번 사냥터에서 아무 몬스터나 1마리 처치해라.');return}if(q===6){say('촌장','아무 무기나 하나 사라.');return}if(q===7){say('촌장','레벨 5까지 성장해라.');return}if(q===8){autoQuestCheck();say('촌장','전직관에게 가서 전직해라. 이미 했다면 바로 인정한다.');return}if(q===9){say('촌장','6번 사냥터의 오우거를 처치해라.');return}if(q===10){say('촌장','몬스터 10마리를 더 잡아라.');return}if(q===11){if(autoQuestCheck())return;say('촌장','갑옷을 구매해라.');return}if(q===12){say('촌장','7번 정글을 15초 동안 돌아다녀라.');return}}talk0()};
const buyW0=buyOrEquipWeapon;buyOrEquipWeapon=function(name){const before=!!ownedWeapons[name];buyW0(name);if(q===6&&!before&&ownedWeapons[name]){rewardNext(7,'다음: Lv.5 달성');autoQuestCheck()}};const buyA0=buyOrEquipArmor;buyOrEquipArmor=function(name){const before=!!ownedArmors[name];buyA0(name);if(q===11&&!before&&ownedArmors[name])rewardNext(12,'다음: 정글 15초 탐험')};heal.onpointerdown=e=>{e.preventDefault();if((inv['회복 물약']||0)<=0)return;if(p.hp>=maxHp()){toastMsg('이미 체력이 가득하다');return}inv['회복 물약']--;p.hp=Math.min(maxHp(),p.hp+100);hud();toastMsg('체력 +100')};
function unlockAfterReaper(){if(postReaper)return;postReaper=true;if(!P.some(a=>a[0]==='f10'))P.push(['f10',520,1040,'10번 포탈','Lv.21~23']);if(!P.some(a=>a[0]==='f11'))P.push(['f11',760,1040,'11번 포탈','Lv.24~27']);for(const n of ['빙결 대검','저주 쌍검','사신의 낫'])WEAPONS[n].hidden=false;ARMORS['빙결 갑옷']={price:1800,hp:700};ARMORS['사신 망토']={price:2600,hp:950};if(!('빙결 갑옷' in ownedArmors))ownedArmors['빙결 갑옷']=false;if(!('사신 망토' in ownedArmors))ownedArmors['사신 망토']=false;toastMsg('10·11번 포탈과 새로운 장비가 해금됐다!')}
function spawnReaper(){if(zone!=='f9'||reaperRef||reaperDefeated)return;const m={n:'사신',lv:20,x:ALTAR.x,y:ALTAR.y-130,hp:3000,mhp:3000,a:66,spd:72,r:48,xp:0,g:0,type:'reaper',baseType:'reaper',z:'f9',hit:0,dead:false,shootCd:0,animState:'idle',animFrame:0,animTick:0,deathAge:0,dir:-1,aggroed:true,specialCd:2.5};mons.push(m);reaperRef=m;sfx('bossAggro');toastMsg('사신 강림! Lv.20')}
function hazard(x,y,r,delay,damage,kind){hazards.push({x,y,r,t:delay,damage,kind,hit:false})}
function bossPattern(m,dt){m.specialCd=(m.specialCd==null?3:m.specialCd-dt);if(m.specialCd>0)return;if(m.type==='slimeKing'){hazard(p.x,p.y,135,.9,26,'slime');m.specialCd=6;toastMsg('슬라임 왕 점프 내려찍기!')}else if(m.type==='giantCaveSlime'){for(const [dx,dy] of [[0,0],[90,50],[-90,-45]])hazard(p.x+dx,p.y+dy,72,.8,22,'acid');m.specialCd=7;toastMsg('거대 슬라임 산성 분열!')}else if(m.type==='ogre'){hazard(m.x,m.y,185,.85,58,'smash');m.specialCd=7.5;toastMsg('오우거 대지 강타!')}else if(m.type==='giantOrc'){const a=Math.atan2(p.y-m.y,p.x-m.x);m.x=Math.max(80,Math.min(WORLD.w-80,m.x+Math.cos(a)*190));m.y=Math.max(80,Math.min(WORLD.h-80,m.y+Math.sin(a)*190));hazard(m.x,m.y,165,.55,72,'charge');m.specialCd=8;toastMsg('거대오크 돌진 강타!')}else if(m.type==='reaper'){m.x=Math.max(90,Math.min(WORLD.w-90,p.x-p.dir*135));m.y=Math.max(90,Math.min(WORLD.h-90,p.y));hazard(p.x,p.y,165,.6,66,'reaper');if(m.hp<m.mhp*.5){hazard(p.x+130,p.y,90,1,44,'soul');hazard(p.x-130,p.y,90,1,44,'soul')}m.specialCd=m.hp<m.mhp*.5?4.5:6;toastMsg('사신 · 영혼 참격!')}}
function updateHazards(dt){for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];h.t-=dt;if(h.t<=0&&!h.hit){h.hit=true;if(Math.hypot(p.x-h.x,p.y-h.y)<h.r+p.r)damage(h.damage)}if(h.t<-.3)hazards.splice(i,1)}}

// ==============================
// AI 유저 / 파티 사냥
// ==============================
const AI_USER_SPECS=[
 ['ai1','민준','무직업'],['ai2','서준','무직업'],
 ['ai3','하린','힐러'],['ai4','유나','힐러'],
 ['ai5','태오','전사'],['ai6','지후','전사'],['ai7','도윤','전사'],
 ['ai8','시아','궁수'],['ai9','준호','궁수'],['ai10','아린','궁수']
];
const aiUsers=AI_USER_SPECS.map((v,i)=>({
 id:v[0],name:v[1],job:v[2],lv:1+Math.floor(i/2),xp:0,nxp:(1+Math.floor(i/2))*100,g:90+i*35,
 weapon:'맨손',x:930+(i%5)*90,y:720+Math.floor(i/5)*95,zone:'town',inParty:false,
 atkCd:0,healCd:0,thinkCd:4+i*.8,trip:0,simCd:1.5,dir:1,animState:'idle',animFrame:0,animTick:i*3
}));
const partyState={active:false,kills:0,poolXp:0,poolGold:0,contrib:{player:0}};
const partyHud=document.createElement('div');partyHud.id='partyHud';partyHud.style.cssText='margin-top:5px;max-width:355px;background:#0a0e16dd;border:1px solid #7fd8ff;border-radius:9px;padding:6px 8px;font-size:12px;display:none';document.getElementById('hud').appendChild(partyHud);
const partyResult=document.createElement('div');partyResult.className='overlay';partyResult.innerHTML='<div class="panel"><h2>파티 사냥 완료</h2><div id="partyResultBody"></div><button id="partyResultClose" class="main">확인</button></div>';document.body.appendChild(partyResult);partyResult.querySelector('#partyResultClose').onclick=()=>partyResult.style.display='none';

function partyMembers(){return aiUsers.filter(b=>b.inParty)}
function updatePartyHud(){
 const members=partyMembers();
 if(!members.length){partyHud.style.display='none';return}
 partyHud.style.display='block';
 const mine=partyState.contrib.player||0;
 partyHud.textContent=partyState.active
  ?'파티 '+(members.length+1)+'명 · 사냥 '+partyState.kills+'/15 · 내 기여 '+mine+'킬'
  :'파티 '+(members.length+1)+'명 · 포탈 입장 시 파티 사냥 시작';
}
function aiGain(bot,xp,gold){
 bot.xp+=Math.max(0,xp||0);bot.g+=Math.max(0,gold||0);
 while(bot.xp>=bot.nxp){bot.xp-=bot.nxp;bot.lv++;bot.nxp=bot.lv*100}
 aiBuyWeapon(bot);
}
function aiBuyWeapon(bot){
 const choices=Object.entries(WEAPONS).filter(([n,w])=>!w.hidden&&w.price<=bot.g&&n!=='낡은 쌍절곤').sort((a,b)=>a[1].damage-b[1].damage);
 const best=choices[choices.length-1];if(!best)return;
 const cur=WEAPONS[bot.weapon]?.damage||3;if(best[1].damage<=cur)return;
 bot.g-=best[1].price;bot.weapon=best[0];
 if(bot.zone==='town'&&zone==='town')toastMsg(bot.name+'이(가) '+bot.weapon+' 구매');
}
function aiAttack(bot,m){
 if(bot.job==='힐러'||bot.atkCd>0||!m||m.dead)return;
 const w=WEAPONS[bot.weapon],base=(w?.damage||3)+Math.max(0,bot.lv-1)*2;
 const mult=bot.job==='전사'?1.2:bot.job==='궁수'?1.05:1;
 bot.atkCd=w?.cd||.65;bot.animState='attack';bot.animTick=0;bot.animFrame=0;
 m.hp-=Math.max(2,Math.floor(base*mult));m.hit=.12;m.aiKiller=bot.id;
 if(m.hp<=0)kill(m);else m.aiKiller=null;
}
function aiHeal(bot){
 if(bot.job!=='힐러'||!bot.inParty||bot.healCd>0||zone==='town')return;
 if(p.hp<maxHp()*.88){const healAmount=Math.max(18,Math.floor(maxHp()*.14));p.hp=Math.min(maxHp(),p.hp+healAmount);bot.healCd=4;toastMsg(bot.name+' 힐 +'+healAmount);hud()}
}
function chooseAiZone(bot){
 const max=Math.max(1,Math.min(7,Math.ceil(bot.lv/2)));
 return 'f'+(1+Math.floor(Math.random()*max));
}
function partyStartIfNeeded(){
 if(zone==='town'||partyState.active||!partyMembers().length)return;
 partyState.active=true;partyState.kills=0;partyState.poolXp=0;partyState.poolGold=0;partyState.contrib={player:0};
 for(const b of partyMembers())partyState.contrib[b.id]=0;
 toastMsg('파티 사냥 시작 · 몬스터 15마리');
 updatePartyHud();
}
function partySyncZone(){
 const members=partyMembers();
 for(let i=0;i<members.length;i++){const b=members[i];b.zone=zone;b.x=p.x+55+(i%3)*45;b.y=p.y+55+Math.floor(i/3)*45;b.trip=999}
 if(zone!=='town')partyStartIfNeeded();updatePartyHud();
}
function partyFinish(){
 if(!partyState.active)return;
 const members=partyMembers(),participants=[{id:'player',name:'나'},...members];
 const total=Math.max(1,participants.reduce((n,a)=>n+(partyState.contrib[a.id]||0),0));
 const rows=[];let playerXp=0,playerGold=0;
 for(const a of participants){
  const kills=partyState.contrib[a.id]||0,share=kills/total;
  const rx=Math.max(10,Math.round(partyState.poolXp*(.15+.85*share)));
  const rg=Math.max(5,Math.round(partyState.poolGold*(.15+.85*share)));
  rows.push('<div class="slot"><span><b>'+a.name+'</b><br><span class="small">기여 '+kills+'킬 · '+Math.round(share*100)+'%</span></span><b>EXP +'+rx+'<br>'+rg+'G</b></div>');
  if(a.id==='player'){playerXp=rx;playerGold=rg}else aiGain(aiUsers.find(b=>b.id===a.id),rx,rg);
 }
 p.xp+=playerXp;p.g+=playerGold;
 while(p.xp>=p.nxp){p.xp-=p.nxp;p.lv++;p.nxp=p.lv*100;p.baseHp+=15;p.hp=maxHp();p.bonusAtk+=2;sfx('levelUp')}
 partyResult.querySelector('#partyResultBody').innerHTML='<p>몬스터 15마리 사냥 완료. 많이 잡을수록 완료 보상이 커진다.</p>'+rows.join('');
 partyResult.style.display='flex';partyState.active=false;partyState.kills=0;partyState.poolXp=0;partyState.poolGold=0;partyState.contrib={player:0};hud();updatePartyHud();
}
function partyRegisterKill(m,killerId,xpValue,goldValue){
 if(!partyState.active)return;
 const allowed=killerId==='player'||partyMembers().some(b=>b.id===killerId);if(!allowed)return;
 partyState.kills++;partyState.poolXp+=Math.max(0,xpValue||0);partyState.poolGold+=Math.max(0,goldValue||0);
 partyState.contrib[killerId]=(partyState.contrib[killerId]||0)+1;updatePartyHud();
 if(partyState.kills>=15)partyFinish();
}
function toggleParty(bot){
 if(bot.inParty){
  bot.inParty=false;bot.zone='town';bot.x=930+Math.random()*360;bot.y=720+Math.random()*100;delete partyState.contrib[bot.id];
  toastMsg(bot.name+' 파티에서 제외');
  if(partyState.active&&!partyMembers().length){partyState.active=false;partyState.kills=0;partyState.poolXp=0;partyState.poolGold=0;partyState.contrib={player:0};toastMsg('파티 사냥 취소')}
 }else{
  bot.inParty=true;bot.zone=zone;bot.x=p.x+60;bot.y=p.y+55;partyState.contrib[bot.id]=0;toastMsg(bot.name+'이(가) 파티 초대 수락');
  if(zone!=='town')partyStartIfNeeded();
 }
 updatePartyHud();
}
let lastAiTap={id:'',t:0};
c.addEventListener('pointerdown',e=>{
 const wx=e.clientX+cam.x,wy=e.clientY+cam.y;let hit=null,bd=42;
 for(const b of aiUsers)if(b.zone===zone){const d=Math.hypot(wx-b.x,wy-b.y);if(d<bd){bd=d;hit=b}}
 if(!hit)return;
 const now=performance.now();
 if(lastAiTap.id===hit.id&&now-lastAiTap.t<430){e.preventDefault();toggleParty(hit);lastAiTap={id:'',t:0}}
 else{lastAiTap={id:hit.id,t:now};toastMsg(hit.name+' · '+hit.job+' · 한 번 더 누르면 '+(hit.inParty?'파티 제외':'파티 초대'))}
});
function updateAiUsers(dt){
 for(const b of aiUsers){
  b.atkCd=Math.max(0,b.atkCd-dt);b.healCd=Math.max(0,b.healCd-dt);b.thinkCd-=dt;b.simCd-=dt;
  if(b.inParty){b.zone=zone;if(zone==='town'){const dx=p.x+70-b.x,dy=p.y+55-b.y,d=Math.hypot(dx,dy)||1;b.x+=dx/d*120*dt;b.y+=dy/d*120*dt;stepAnim(b,dt,d>8);continue}aiHeal(b)}
  else if(b.zone==='town'){
   if(b.thinkCd<=0){aiBuyWeapon(b);b.thinkCd=7+Math.random()*5;b.zone=chooseAiZone(b);b.x=350+Math.random()*1100;b.y=180+Math.random()*800;b.trip=16+Math.random()*14}
   else{b.x+=Math.sin(performance.now()/900+b.animTick)*12*dt;stepAnim(b,dt,true);continue}
  }else{
   b.trip-=dt;if(b.trip<=0){b.zone='town';b.x=900+Math.random()*420;b.y=700+Math.random()*130;b.thinkCd=5+Math.random()*5;continue}
   if(b.zone!==zone){if(b.simCd<=0){b.simCd=2;const xp=4+botZoneLevel(b.zone)*2,g=2+botZoneLevel(b.zone);aiGain(b,b.job==='힐러'?Math.floor(xp*.5):xp,b.job==='힐러'?Math.floor(g*.5):g)}continue}
  }
  if(b.zone!==zone)continue;
  if(b.job==='힐러'){if(b.inParty)aiHeal(b);const dx=(b.inParty?p.x:900)-b.x,dy=(b.inParty?p.y:600)-b.y,d=Math.hypot(dx,dy)||1;if(d>75){b.x+=dx/d*110*dt;b.y+=dy/d*110*dt;stepAnim(b,dt,true)}else stepAnim(b,dt,false);continue}
  let target=null,td=9999;for(const m of mons){if(m.dead||m.type==='hiddenEnemy'||(!b.inParty&&m.type==='reaper'))continue;const d=Math.hypot(m.x-b.x,m.y-b.y);if(d<td){td=d;target=m}}
  if(!target){const dx=(b.inParty?p.x:900)-b.x,dy=(b.inParty?p.y:600)-b.y,d=Math.hypot(dx,dy)||1;if(d>80){b.x+=dx/d*105*dt;b.y+=dy/d*105*dt;stepAnim(b,dt,true)}else stepAnim(b,dt,false);continue}
  const range=b.job==='궁수'?185:54;if(td>range){const a=Math.atan2(target.y-b.y,target.x-b.x);b.dir=Math.cos(a)>=0?1:-1;b.x+=Math.cos(a)*(b.job==='궁수'?105:125)*dt;b.y+=Math.sin(a)*(b.job==='궁수'?105:125)*dt;stepAnim(b,dt,true)}else{b.dir=target.x>=b.x?1:-1;stepAnim(b,dt,false);aiAttack(b,target)}
 }
}
function botZoneLevel(z){if(z==='cave')return 4;const n=Number(String(z).replace('f',''));return Number.isFinite(n)?n:5}
function drawAiUser(b){
 drawHuman(b.x,b.y,'player',b.animFrame||0,b.animState||'idle',b.dir<0);
 ctx.textAlign='center';ctx.font='900 11px sans-serif';ctx.fillStyle=b.inParty?'#8fe9ff':'#fff';ctx.fillText(b.name+' · '+b.job+(b.inParty?' · 파티':''),b.x,b.y-66);
 ctx.font='10px sans-serif';ctx.fillStyle='#ffe49a';ctx.fillText('Lv.'+b.lv+' · '+b.weapon,b.x,b.y-52);ctx.textAlign='left';
}
const kill0=kill;kill=function(m){const alive=!m.dead,oldDrops=drops.length,kz=zone,kt=m.type,killer=m.aiKiller||'player',rx=m.xp||0,rg=m.g||0,oldQ=q;if(killer!=='player'){m.xp=0;m.g=0;q=9999}kill0(m);if(killer!=='player'){m.xp=rx;m.g=rg;q=oldQ;const bot=aiUsers.find(x=>x.id===killer);if(bot)aiGain(bot,rx,rg)}m.lastKillerId=killer;m.aiKiller=null;if(!alive||!m.dead)return;partyRegisterKill(m,killer,rx,rg);if(kt==='croc'){if(drops.length>oldDrops)drops.splice(oldDrops);drops.push({x:m.x,y:m.y,item:'악어 비늘',t:20})}if(kt==='golem'){if(drops.length>oldDrops)drops.splice(oldDrops);drops.push({x:m.x,y:m.y,item:'골렘 이끼',t:20})}if(kt==='reaper'){if(drops.length>oldDrops)drops.splice(oldDrops);reaperDefeated=true;reaperRef=null;unlockAfterReaper();setTimeout(()=>{if(zone==='f9')say('사신','꽤 실력이 좋군. 다음에는 봐주는 건 없다.')},320);setTimeout(()=>toastMsg('사신이 어둠 속으로 사라졌다'),1550)}if(killer==='player'){if(q===5&&kz==='f2'){rewardNext(6,'다음: 아무 무기나 구매');return}if(q===9&&kt==='ogre'){questKill10=0;rewardNext(10,'다음: 몬스터 10마리 처치');return}if(q===10){questKill10++;if(questKill10>=10){rewardNext(11,'다음: 갑옷 구매');autoQuestCheck()}else hud()}}else hud()};
const update0=update;update=function(dt){p.skillCd=Math.max(0,(p.skillCd||0)-dt);if(zone==='amazon')for(const m of mons)if(m.type==='golem'&&m.dormant&&!m.dead&&Math.hypot(p.x-m.x,p.y-m.y)<210){m.dormant=false;m.spd=46;toastMsg('썩은 골렘이 깨어났다!')}update0(dt);updateAiUsers(dt);updateMultiplayer(dt);if(summonCountdown>0){summonCountdown-=dt;if(summonCountdown<=0){summonCountdown=0;spawnReaper()}}for(const m of mons)if(!m.dead&&['slimeKing','giantCaveSlime','ogre','giantOrc','reaper'].includes(m.type))bossPattern(m,dt);updateHazards(dt);let changed=true,g=0;while(changed&&g++<3)changed=autoQuestCheck();if(q===12){if(zone==='f7'){const moved=Math.hypot(p.x-lastJungleX,p.y-lastJungleY)>1.2;if(moved)jungleWalk+=dt;lastJungleX=p.x;lastJungleY=p.y;if(jungleWalk>=15){jungleWalk=15;rewardNext(13,'메인 퀘스트 완료!')}else hud()}else{lastJungleX=p.x;lastJungleY=p.y}}skill.style.display=(p.job==='전사'||p.job==='마법사')?'block':'none';skill.textContent=skillLabel();heal.style.display=(inv['회복 물약']||0)>0?'block':'none';updatePartyHud()};
MPALETTE.giantOrc=['#52703b','#91a85a','#26351f'];MPALETTE.croc=['#315d3c','#597f45','#162e21'];MPALETTE.golem=['#55584f','#7c806e','#2d302b'];MPALETTE.reaper=['#09080d','#2b1638','#d8d3c9'];
function riverDraw(){ctx.fillStyle='#315f78';ctx.fillRect(70,520,1660,160);ctx.fillStyle='#5d899a';for(let x=100;x<1700;x+=110){ctx.beginPath();ctx.ellipse(x,550+(x%3)*30,45,8,0,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#765b3c';ctx.fillRect(840,505,120,190);ctx.fillStyle='#d2b37b';ctx.fillRect(850,515,100,170);ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('강길 입구',900,495);ctx.textAlign='left'}
function cliffDraw(){ctx.fillStyle='#5d5545';for(let i=0;i<28;i++){const x=260+((i*173)%1450),y=130+((i*229)%1050);rock(x,y,.8+(i%3)*.2)}ctx.fillStyle='#3a3228';ctx.fillRect(1760,90,170,1220);ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.fillText('아마존으로 이어지는 절벽길',1550,540)}
function amazonDraw(){ctx.fillStyle='#10251b';ctx.fillRect(0,0,WORLD.w,WORLD.h);const lakes=[[1480,1080,360,270],[2500,650,300,225],[860,1650,250,200]];for(const [x,y,rx,ry] of lakes){ctx.fillStyle='#16382d';ctx.strokeStyle='#53634a';ctx.lineWidth=18;ctx.beginPath();ctx.ellipse(x,y,rx,ry,.13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#2c5a49';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(x,y,rx-22,ry-20,.13,0,Math.PI*2);ctx.stroke()}for(let i=0;i<85;i++){const x=180+((i*397)%2850),y=130+((i*257)%1980);if(i%3===0)palm(x,y,1.1);else if(i%3===1)banana(x,y,1.15);else tropical(x,y,1.25)}}
function graveDraw(){ctx.fillStyle='#0d1015';ctx.fillRect(0,0,WORLD.w,WORLD.h);ctx.strokeStyle='#3b3d44';ctx.lineWidth=7;ctx.strokeRect(70,70,WORLD.w-140,WORLD.h-140);for(let i=0;i<78;i++){const x=230+((i*347)%2320),y=150+((i*521)%1550);if(Math.hypot(x-ALTAR.x,y-ALTAR.y)<240)continue;ctx.fillStyle='#484b50';ctx.fillRect(x-17,y-30,34,42);if(i%3===0){ctx.fillRect(x-4,y-54,8,25);ctx.fillRect(x-13,y-47,26,7)}}ctx.save();ctx.translate(ALTAR.x,ALTAR.y);ctx.fillStyle='#1b151e';ctx.beginPath();ctx.arc(0,0,105,0,Math.PI*2);ctx.fill();ctx.strokeStyle=graveOffered?'#9f3dff':'#58455e';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,80,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#4d4751';ctx.fillRect(-48,-25,96,50);ctx.fillStyle='#d6c4e2';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('제물 놓기',0,5);ctx.restore();ctx.textAlign='left'}
function ruinedDraw(){for(let i=0;i<10;i++){const x=260+((i*181)%1300),y=160+((i*257)%850);ctx.fillStyle='#1f1b1a';ctx.fillRect(x-35,y-23,70,46);ctx.fillStyle='#493b34';ctx.fillRect(x-45,y-31,90,12)}for(let i=0;i<20;i++)rock(180+((i*223)%1450),120+((i*179)%930),.6)}
function amazonSign(){ctx.fillStyle='#4c3424';ctx.fillRect(AMAZON_SIGN.x-7,AMAZON_SIGN.y-5,14,55);ctx.fillStyle='#735030';ctx.fillRect(AMAZON_SIGN.x-70,AMAZON_SIGN.y-50,140,48);ctx.fillStyle='#ffe49a';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('아마존으로 가는곳',AMAZON_SIGN.x,AMAZON_SIGN.y-22);ctx.textAlign='left'}
const decor0=drawDecor;drawDecor=function(z){if(z==='f9'){graveDraw();return}if(z==='amazon'){amazonDraw();return}if(z==='cliff'){cliffDraw();return}if(z==='f8'){ruinedDraw();return}decor0(z);if(z==='f7')riverDraw();if(z==='f4')amazonSign()};
function crocSprite(m){ctx.save();ctx.translate(m.x,m.y);ctx.scale(m.dir||1,1);shadow(0,5,34);ctx.fillStyle='#315d3c';ctx.beginPath();ctx.ellipse(0,0,42,15,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-35,0);ctx.lineTo(-70,-7);ctx.lineTo(-42,8);ctx.fill();ctx.fillStyle='#496f46';ctx.fillRect(24,-12,35,23);ctx.fillStyle='#e9e1c7';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(30+i*6,10);ctx.lineTo(33+i*6,17);ctx.lineTo(36+i*6,10);ctx.fill()}ctx.fillStyle='#ffd33d';ctx.beginPath();ctx.arc(48,-7,3,0,Math.PI*2);ctx.fill();ctx.restore()}
function golemSprite(m){ctx.save();ctx.translate(m.x,m.y);shadow(0,8,32);ctx.fillStyle=m.dormant?'#55584f':'#666b5e';ctx.beginPath();ctx.moveTo(-35,18);ctx.lineTo(-29,-28);ctx.lineTo(0,-43);ctx.lineTo(34,-23);ctx.lineTo(40,20);ctx.closePath();ctx.fill();if(!m.dormant){ctx.strokeStyle='#62665b';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-22,-10);ctx.lineTo(-48,18);ctx.moveTo(23,-10);ctx.lineTo(49,18);ctx.stroke();ctx.fillStyle='#ffda3b';ctx.shadowColor='#ff8a16';ctx.shadowBlur=12;ctx.fillRect(-15,-19,8,5);ctx.fillRect(7,-19,8,5)}ctx.restore()}
function reaperSprite(m){const att=m.animState==='attack'?Math.sin((m.animFrame||0)/33*Math.PI):0;ctx.save();ctx.translate(m.x,m.y);ctx.scale((m.dir||1)*1.5,1.5);shadow(0,10,50);ctx.shadowColor='#8f38ff';ctx.shadowBlur=26;ctx.fillStyle='#08070d';ctx.beginPath();ctx.moveTo(-48,43);ctx.lineTo(-40,-34);ctx.quadraticCurveTo(0,-92,42,-33);ctx.lineTo(52,45);ctx.lineTo(30,35);ctx.lineTo(15,60);ctx.lineTo(0,38);ctx.lineTo(-18,60);ctx.lineTo(-31,35);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#d7d1c7';ctx.beginPath();ctx.ellipse(0,-48,15,19,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff244f';ctx.shadowColor='#ff244f';ctx.shadowBlur=16;ctx.fillRect(-8,-52,5,3);ctx.fillRect(3,-52,5,3);ctx.shadowBlur=0;ctx.save();ctx.translate(48,-5);ctx.rotate(-.55+att*1.25);ctx.strokeStyle='#342b39';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,54);ctx.lineTo(72,-82);ctx.stroke();ctx.fillStyle='#d7dce4';ctx.shadowColor='#b65cff';ctx.shadowBlur=20;ctx.beginPath();ctx.moveTo(65,-82);ctx.quadraticCurveTo(123,-104,147,-61);ctx.quadraticCurveTo(109,-77,79,-44);ctx.closePath();ctx.fill();ctx.restore();ctx.restore()}
const sprite0=drawMonsterSprite;drawMonsterSprite=function(m){if(m.type==='croc'){crocSprite(m);return}if(m.type==='golem'){golemSprite(m);return}if(m.type==='reaper'){reaperSprite(m);return}sprite0(m)};
const portal0=portal;portal=function(px,py,a,b,back=false){if(a==='9번 포탈'){ctx.save();ctx.translate(px,py);ctx.fillStyle='#24252b';ctx.fillRect(-72,-80,25,125);ctx.fillRect(47,-80,25,125);ctx.beginPath();ctx.arc(0,-72,60,Math.PI,0);ctx.fill();ctx.fillStyle='#050308';ctx.beginPath();ctx.arc(0,-67,45,Math.PI,0);ctx.lineTo(45,35);ctx.lineTo(-45,35);ctx.closePath();ctx.fill();ctx.strokeStyle='#8b3dcc';ctx.lineWidth=5;ctx.shadowColor='#a244ff';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,-67,43,Math.PI,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#c8c2b5';ctx.beginPath();ctx.arc(0,-92,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('9번 공동묘지',0,58);ctx.fillStyle='#e7c1ff';ctx.font='bold 12px sans-serif';ctx.fillText('Lv.16~20',0,74);ctx.restore();ctx.textAlign='left';return}portal0(px,py,a,b,back)};
function drawTrainer(t){drawHuman(t.x,t.y,'smith',Math.floor(performance.now()/45)%34,'idle',false);ctx.fillStyle='#17120e';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(t.name,t.x,t.y-62);ctx.fillStyle='#ffe26e';ctx.font='bold 10px sans-serif';ctx.fillText('Lv.5 전직',t.x,t.y-48);ctx.textAlign='left'}
const draw0=draw;draw=function(){draw0();ctx.save();ctx.translate(-cam.x,-cam.y);for(const b of aiUsers)if(b.zone===zone)drawAiUser(b);drawRemotePlayers();for(const t of Object.values(TRAINERS))if(t.zone===zone)drawTrainer(t);for(const h of hazards){ctx.globalAlpha=.35+.2*Math.sin(performance.now()/80);ctx.strokeStyle=h.kind==='reaper'||h.kind==='soul'?'#c05cff':h.kind==='acid'?'#7cd85b':'#ff6b52';ctx.lineWidth=6;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.12;ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}ctx.restore();if(zone==='f9'&&summonCountdown>0){ctx.fillStyle='#0008';ctx.fillRect(0,0,W,H);ctx.fillStyle='#d9b3ff';ctx.font='900 42px sans-serif';ctx.textAlign='center';ctx.fillText(Math.ceil(summonCountdown),W/2,H/2);ctx.font='900 15px sans-serif';ctx.fillText('무언가가 다가온다...',W/2,H/2+32);ctx.textAlign='left'}};
const weapon0=weaponDraw;weaponDraw=function(){if(!['강철 대검','강철 쌍검','빙결 대검','저주 쌍검','사신의 낫'].includes(p.weapon)){weapon0();return}const swing=p.animState==='attack'?Math.sin(p.animFrame/33*Math.PI):0;ctx.save();ctx.translate(p.x,p.y-10);ctx.scale(p.dir,1);ctx.rotate(-.8+swing*1.55);if(p.weapon==='사신의 낫'){ctx.strokeStyle='#3b3140';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(5,10);ctx.lineTo(58,-42);ctx.stroke();ctx.fillStyle='#d5dbe5';ctx.beginPath();ctx.moveTo(54,-44);ctx.quadraticCurveTo(90,-58,105,-30);ctx.quadraticCurveTo(80,-40,61,-20);ctx.closePath();ctx.fill()}else{const icy=p.weapon==='빙결 대검',dual=p.weapon.includes('쌍검');ctx.fillStyle=icy?'#bceeff':p.weapon==='저주 쌍검'?'#c47cff':'#d9dde2';ctx.fillRect(8,-4,48,8);ctx.fillRect(48,-9,13,18);ctx.fillStyle='#6d4e2e';ctx.fillRect(2,-6,9,13);if(dual){ctx.rotate(-.42);ctx.fillStyle=p.weapon==='저주 쌍검'?'#c47cff':'#d9dde2';ctx.fillRect(5,8,44,7)}}ctx.restore()};
const reset0=reset;reset=function(){reset0();p.job='미전직';p.skillCd=0;postReaper=false;graveOffered=false;reaperDefeated=false;reaperRef=null;summonCountdown=0;questKill10=0;jungleWalk=0;lastJungleX=p.x;lastJungleY=p.y;P.splice(0,P.length,...P.filter(a=>a[0]!=='f10'&&a[0]!=='f11'));for(const n of ['빙결 대검','저주 쌍검','사신의 낫'])WEAPONS[n].hidden=true;delete ARMORS['빙결 갑옷'];delete ARMORS['사신 망토'];partyState.active=false;partyState.kills=0;partyState.poolXp=0;partyState.poolGold=0;partyState.contrib={player:0};aiUsers.forEach((b,i)=>{b.lv=1+Math.floor(i/2);b.x=930+(i%5)*90;b.y=720+Math.floor(i/5)*95;b.zone='town';b.inParty=false;b.weapon='맨손';b.g=90+i*35;b.xp=0;b.nxp=b.lv*100;b.atkCd=0;b.healCd=0;b.thinkCd=4+i*.8;b.trip=0});partyResult.style.display='none';hud();updatePartyHud()};
if(!p.job)p.job='미전직';p.skillCd=p.skillCd||0;hud();toastMsg('대충 RPG 대형 업데이트 적용');
})();