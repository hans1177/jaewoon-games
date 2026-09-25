(()=>{
if(window.__RPG_V16_PATCHED)return;window.__RPG_V16_PATCHED=true;

// ===== 산악 무기상 히든 퀘스트 =====
F.mountain={n:'산 등반길',l:'탐험 지역',bg:'#59634f',m:[]};
F.midmount={n:'산 중턱',l:'Lv.14~16',bg:'#555a4c',m:[
 ['산양',14,1600,48,70,20,150,75,2,'boar'],
 ['암벽 늑대',15,1850,54,72,21,180,90,2,'wolf'],
 ['바위곰',16,2300,62,54,29,230,115,2,'ogre']
]};
F.summit={n:'산 꼭대기',l:'비밀 지역',bg:'#73796e',m:[]};

const SHOP_WEAPONS=['낡은 돌검','철 도끼','철 쌍검','철 망치','강철 대검','강철 쌍검'];
const CLIFF_CLIMB={x:1000,y:1190},MID_SIGN={x:1360,y:145},TOP_SIGN={x:750,y:500},SMUGGLER={x:990,y:390};
let mountainHidden=0; // 0 미발견, 1 단서 획득, 2 완료
const hiddenBox=document.getElementById('hiddenQuest');
const passiveBadge=document.createElement('span');passiveBadge.className='pill';passiveBadge.style.display='none';passiveBadge.textContent='산의 가호';document.querySelector('#hud .row').appendChild(passiveBadge);

function allMerchantWeapons(){return SHOP_WEAPONS.every(n=>ownedWeapons[n])}
function updateMountainHiddenHud(){
 if(!hiddenBox)return;
 if(mountainHidden===1){hiddenBox.style.display='block';hiddenBox.textContent='히든 퀘스트: 절벽 아래 등반길을 찾아 산 꼭대기의 무기상인을 찾아라.'}
 else if(mountainHidden===2){hiddenBox.style.display='block';hiddenBox.innerHTML='히든 스킬 · <b>산의 가호</b> [패시브] · 체력 +30% · 공격력 +50% · 이동속도 +50%';passiveBadge.style.display='inline-flex'}
}

// 히든 패시브 능력치
const maxHp16=maxHp;maxHp=function(){const v=maxHp16();return p.mountainPassive?Math.floor(v*1.3):v};
const atk16=currentAtk;currentAtk=function(){const v=atk16();return p.mountainPassive?v*1.5:v};
function giveMountainReward(){
 if(mountainHidden===2)return;
 const oldMax=maxHp();mountainHidden=2;p.mountainPassive=true;p.spd*=1.5;p.g+=300;p.hp=Math.min(maxHp(),p.hp+(maxHp()-oldMax));
 sfx('questReward');sfx('levelUp');updateMountainHiddenHud();hud();
 say('무기 밀수상인','어떻게 찾아왔지?<br><br>무튼 여기까지 올라왔으니까 보상을 주겠다.<br><br><b>300골드</b>와 히든 패시브 <b>산의 가호</b>를 획득했다.<br>체력 +30% · 공격력 +50% · 이동속도 +50%');
}

// 무기 전부 구매 시 히든 퀘스트 단서 발생
const buyWeapon16=buyOrEquipWeapon;buyOrEquipWeapon=function(name){
 const wasAll=allMerchantWeapons();buyWeapon16(name);
 if(!wasAll&&allMerchantWeapons()&&mountainHidden===0){toastMsg('무기상인이 뭔가 할 말이 있는 것 같다...');sfx('questAccept')}
};
const talk16=talkNow;talkNow=function(){
 if(zone==='summit'&&Math.hypot(p.x-SMUGGLER.x,p.y-SMUGGLER.y)<95){
  if(mountainHidden<1){say('무기 밀수상인','넌 누구지? 어떻게 여기까지 올라온 거냐. 볼 일 없으면 돌아가.');return}
  if(mountainHidden===1){giveMountainReward();return}
  say('무기 밀수상인','보상은 이미 줬다. 다음에는 더 조용히 올라와.');return
 }
 const n=nearest();
 if(n&&n.k==='weapon'&&allMerchantWeapons()){
  if(mountainHidden===0){mountainHidden=1;updateMountainHiddenHud();sfx('questAccept');say('무기상인','내가 파는 무기들을 어디서 구해왔냐고?<br><br>사실 <b>산에 있는 무기상</b>에게 받은 거다.<br>절벽 정중앙에서 아래쪽으로 내려가면 <b>등반길</b>이 있다. 거길 따라 올라가 봐.');return}
  if(mountainHidden===1){say('무기상인','절벽 정중앙에서 아래쪽으로 내려가. 등반길을 따라 산 꼭대기까지 가면 그 무기상을 만날 수 있을 거다.');return}
 }
 talk16();
};

// ===== 산 지역 이동 =====
const enter16=enter;
function setupNeutral(m){
 if(m.neutral)return;m.neutral=true;m.hostile=false;m.neutralAtk=m.a;m.neutralSpd=m.spd;m.a=0;m.spd=0;m._neutralHp=m.hp;m.wanderT=Math.random()*2;m.wanderA=Math.random()*Math.PI*2;
}
function enterMountain(){
 enter16('mountain');WORLD.w=1500;WORLD.h=1000;mons=[];p.x=750;p.y=900;cam.x=Math.max(0,p.x-W/2);cam.y=Math.max(0,p.y-H/2);hud();toastMsg('산 등반길')
}
function enterMidmount(){
 enter16('midmount');WORLD.w=1500;WORLD.h=1000;mons=[];
 const spots=[[300,750],[520,300],[820,760],[1040,330],[1220,700],[610,570]];
 let si=0;for(const spec of F.midmount.m){for(let i=0;i<spec[8];i++){const v=spots[si++%spots.length];spawn(spec,v[0],v[1],'midmount');setupNeutral(mons[mons.length-1])}}
 p.x=160;p.y=820;cam.x=0;cam.y=Math.max(0,p.y-H/2);hud();toastMsg('산 중턱 · Lv.14~16 · 중립 몬스터 지역')
}
function enterSummit(){
 enter16('summit');WORLD.w=1500;WORLD.h=1000;mons=[];p.x=170;p.y=780;cam.x=0;cam.y=Math.max(0,p.y-H/2);hud();toastMsg('산 꼭대기 · 비밀 지역')
}
enter=function(z){if(z==='mountain'){enterMountain();return}if(z==='midmount'){enterMidmount();return}if(z==='summit'){enterSummit();return}enter16(z)};

const getAction16=getAction;getAction=function(){
 if(zone==='cliff'&&Math.hypot(p.x-CLIFF_CLIMB.x,p.y-CLIFF_CLIMB.y)<115)return {label:'올라가기',kind:'mountainClimb'};
 if(zone==='mountain'&&Math.hypot(p.x-MID_SIGN.x,p.y-MID_SIGN.y)<120)return {label:'중턱 등반',kind:'midClimb'};
 if(zone==='midmount'&&Math.hypot(p.x-TOP_SIGN.x,p.y-TOP_SIGN.y)<120)return {label:'꼭대기 올라가기',kind:'topClimb'};
 return getAction16();
};
const useAction16=useAction;useAction=function(){
 const a=getAction();if(!a)return;
 if(a.kind==='mountainClimb'){enter('mountain');return}
 if(a.kind==='midClimb'){enter('midmount');return}
 if(a.kind==='topClimb'){enter('summit');return}
 useAction16();
};

// ===== 중립 몬스터: 먼저 때리기 전에는 공격하지 않음 =====
const update16=update;update=function(dt){
 if(zone==='midmount'){
  for(const m of mons){
   if(m.dead)continue;if(!m.neutral)setupNeutral(m);
   if(!m.hostile&&m.hp<m._neutralHp){m.hostile=true;m.a=m.neutralAtk;m.spd=m.neutralSpd;sfx('beastAggro');toastMsg(m.n+'이(가) 적대적으로 변했다!')}
   if(m.hostile){m.a=m.neutralAtk;m.spd=m.neutralSpd}else{m.a=0;m.spd=0}
   m._neutralHp=m.hp;
  }
 }
 update16(dt);
 if(zone==='midmount'){
  let hostile=false;
  for(const m of mons){
   if(m.dead)continue;
   if(m.hostile){hostile=true;continue}
   // 플레이어를 추적하지 않고 천천히 배회
   m.wanderT-=dt;if(m.wanderT<=0){m.wanderT=1.5+Math.random()*2.5;m.wanderA=Math.random()*Math.PI*2}
   m.x=Math.max(80,Math.min(WORLD.w-80,m.x+Math.cos(m.wanderA)*18*dt));
   m.y=Math.max(80,Math.min(WORLD.h-80,m.y+Math.sin(m.wanderA)*18*dt));
   m.a=0;m.spd=0;m._neutralHp=m.hp;
  }
  if(!hostile){combatTimer=0;setAggro(false,false)}
 }
 if(p.skillCd>0)p.skillCd=Math.max(0,p.skillCd-dt);
};

// ===== 산/절벽 그래픽 =====
function sign16(x,y,title,sub){
 ctx.save();ctx.translate(x,y);shadow(0,12,28);pixelRect(-5,-8,10,55,'#5c4328');pixelRect(-72,-45,144,42,'#8b6b3d');pixelRect(-68,-41,136,34,'#b78b4c');ctx.fillStyle='#20180e';ctx.font='900 14px sans-serif';ctx.textAlign='center';ctx.fillText(title,0,-20);ctx.font='900 10px sans-serif';ctx.fillText(sub,0,-7);ctx.restore();ctx.textAlign='left'
}
function drawCliffClimb(){
 ctx.save();ctx.strokeStyle='#9a815c';ctx.lineWidth=22;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(1000,720);ctx.bezierCurveTo(930,840,1070,940,1000,1190);ctx.stroke();ctx.strokeStyle='#c3ad82';ctx.lineWidth=4;ctx.setLineDash([12,15]);ctx.beginPath();ctx.moveTo(1000,730);ctx.bezierCurveTo(930,840,1070,940,1000,1180);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<8;i++)rock(930+(i%2)*125,790+i*52,.55);sign16(1000,1205,'등반길','산으로 올라가는 길');ctx.restore()
}
function drawMountainBase(){
 for(let i=0;i<38;i++){const x=100+((i*257)%1300),y=90+((i*173)%820);if(Math.hypot(x-MID_SIGN.x,y-MID_SIGN.y)<150)continue;if(i%3===0)tree(x,y,.75);else rock(x,y,.65+(i%3)*.08)}
 ctx.strokeStyle='#c1aa7c';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(750,900);ctx.bezierCurveTo(500,720,960,560,1040,410);ctx.bezierCurveTo(1120,270,1280,260,1360,155);ctx.stroke();sign16(MID_SIGN.x,MID_SIGN.y,'중턱 가는 길','등반 준비');
}
function drawMidmount(){
 for(let i=0;i<45;i++){const x=90+((i*239)%1320),y=80+((i*311)%850);if(Math.hypot(x-TOP_SIGN.x,y-TOP_SIGN.y)<170)continue;rock(x,y,.55+(i%4)*.1)}
 ctx.strokeStyle='#8a7656';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(140,820);ctx.bezierCurveTo(360,690,520,610,TOP_SIGN.x,TOP_SIGN.y);ctx.stroke();sign16(TOP_SIGN.x,TOP_SIGN.y,'꼭대기 가는 곳','정상 등반');
}
function drawSummit(){
 ctx.fillStyle='#8a8f82';ctx.beginPath();ctx.ellipse(760,500,560,340,0,0,Math.PI*2);ctx.fill();for(let i=0;i<28;i++)rock(190+((i*313)%1110),170+((i*191)%650),.6);ctx.fillStyle='#e6edf3';ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(1030,350,150,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
}
const decor16=drawDecor;drawDecor=function(z){
 if(z==='mountain'){drawMountainBase();return}
 if(z==='midmount'){drawMidmount();return}
 if(z==='summit'){drawSummit();return}
 decor16(z);if(z==='cliff')drawCliffClimb();
};
const drawMonster16=drawMonster;drawMonster=function(m){drawMonster16(m);if(m.neutral&&!m.hostile&&!m.dead){ctx.fillStyle='#bfffc5';ctx.font='900 10px sans-serif';ctx.textAlign='center';ctx.fillText('중립',m.x,m.y-m.r-43);ctx.textAlign='left'}};
const draw16=draw;draw=function(){
 draw16();
 if(zone==='summit'){
  ctx.save();ctx.translate(-cam.x,-cam.y);drawHuman(SMUGGLER.x,SMUGGLER.y,'weapon',Math.floor(performance.now()/45)%34,'idle',false);ctx.fillStyle='#ffe5a8';ctx.font='900 13px sans-serif';ctx.textAlign='center';ctx.fillText('무기 밀수상인',SMUGGLER.x,SMUGGLER.y-65);ctx.textAlign='left';ctx.restore();
 }
};

// 가방에 획득한 히든 패시브 표시
const bag16=renderBag;renderBag=function(){bag16();if(p.mountainPassive)bagList.insertAdjacentHTML('afterbegin','<div class="slot"><span><b>히든 패시브 · 산의 가호</b><br><span class="small">체력 +30% · 공격력 +50% · 이동속도 +50%</span></span><b>활성</b></div>')};

updateMountainHiddenHud();
toastMsg('산악 히든 퀘스트 업데이트 적용');
})();