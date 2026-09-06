// 파일명: patch-core18.js
(()=>{
if(window.__RPG_CORE18)return;window.__RPG_CORE18=true;
try{
  if(!F.f8)F.f8={n:'8번 폐허 마을',l:'Lv.13~15',bg:'#302b2a',m:[['폐허 기사',13,1250,28,60,22,180,45,2,'knight'],['잿빛 주술사',14,1500,34,52,23,220,60,2,'demon'],['거대오크',15,2000,40,46,34,400,100,1,'giantOrc']]};
  if(!F.f9)F.f9={n:'9번 공동묘지',l:'Lv.16~20',bg:'#11141a',m:[]};
  if(!P.some(a=>a[0]==='f8'))P.push(['f8',1010,820,'8번 포탈','Lv.13~15']);
  P.splice(0,P.length,...P.filter(a=>a[0]!=='f9'));
  P.push(['f9',1450,820,'9번 사신 포탈','Lv.16~20']);

  WEAPONS['철 도끼'].damage=40;WEAPONS['철 도끼'].cd=.5;
  WEAPONS['강철 대검']={price:700,damage:50,cd:1};
  WEAPONS['강철 쌍검']={price:1000,damage:35,cd:.35};
  if(!('강철 대검' in ownedWeapons))ownedWeapons['강철 대검']=false;
  if(!('강철 쌍검' in ownedWeapons))ownedWeapons['강철 쌍검']=false;
  ARMORS['강철 갑옷']={price:500,hp:400};if(!('강철 갑옷' in ownedArmors))ownedArmors['강철 갑옷']=false;
  inv['회복 물약']=inv['회복 물약']||0;

  if(!npcs.some(n=>n.k==='potion'))npcs.push({x:1180,y:1010,n:'물약상인',k:'potion'});
  if(!npcs.some(n=>n.k==='jobWarrior'))npcs.push({x:610,y:530,n:'전사 전직관',k:'jobWarrior'});
  p.job=p.job||'미전직';p.skillCd=p.skillCd||0;

  const row=document.querySelector('#hud .row');if(row&&!document.getElementById('coreJob')){const e=document.createElement('span');e.id='coreJob';e.className='pill';e.textContent=p.job;row.appendChild(e)}
  const skill=document.createElement('button');skill.id='coreJobSkill';skill.className='btn';skill.style.cssText='right:22px;bottom:130px;width:88px;height:72px;border-radius:18px;background:#7048b7e8;font-size:12px;display:none;white-space:pre-line';document.body.appendChild(skill);
  const TRAINERS={warrior:{zone:'town',x:610,y:530,name:'전사 전직관',job:'전사'},archer:{zone:'f8',x:1360,y:600,name:'궁수 전직관',job:'궁수'},mage:{zone:'f5',x:1630,y:170,name:'마법사 전직관',job:'마법사'}};
  function nearTrainer(){let b=null,bd=82;for(const t of Object.values(TRAINERS)){if(t.zone!==zone)continue;const d=Math.hypot(p.x-t.x,p.y-t.y);if(d<bd){bd=d;b=t}}return b}
  function coreBecome(job){if(p.lv<5){say('전직관','Lv.5부터 전직할 수 있다.');return}if(p.job&&p.job!=='미전직'){say('전직관','이미 '+p.job+'로 전직했다.');return}p.job=job;p.skillCd=0;if(job==='궁수')p.hp=Math.min(p.hp,maxHp());sfx('levelUp');hud();if(job==='전사')say('전사 전직관','전사 전직 완료. 슬래시: 공격력 3배로 2번 공격, 쿨타임 10초.');else if(job==='궁수')say('궁수 전직관','궁수 전직 완료. 극과극: 최대체력 -30%, 공격력 +50%.');else say('마법사 전직관','마법사 전직 완료. 자가회복: 체력 100 회복, 쿨타임 30초.')}
  const hpCore=maxHp;maxHp=function(){const v=hpCore();return p.job==='궁수'?Math.max(1,Math.floor(v*.7)):v};
  const atkCore=currentAtk;currentAtk=function(){const v=atkCore();return p.job==='궁수'?v*1.5:v};
  function slashHit(){const ax=p.x+p.dir*40;fx.push({x:ax,y:p.y,t:.25,d:p.dir});for(const m of mons){if(m.dead)continue;if(Math.hypot(m.x-ax,m.y-p.y)<88+m.r){m.hp-=currentAtk()*3;m.hit=.15;if(m.hp<=0)kill(m)}}}
  function useJobSkill(){if(!run||p.skillCd>0)return;if(p.job==='전사'){p.skillCd=10;slashHit();setTimeout(()=>{if(run)slashHit()},180);toastMsg('슬래시! 3배 공격 ×2')}else if(p.job==='마법사'){p.skillCd=30;p.hp=Math.min(maxHp(),p.hp+100);sfx('respawn');hud();toastMsg('자가회복 +100')}}
  skill.onpointerdown=e=>{e.preventDefault();useJobSkill()};
  function skillLabel(){if(p.job==='전사')return p.skillCd>0?'슬래시\n'+Math.ceil(p.skillCd)+'초':'슬래시\n3배×2';if(p.job==='마법사')return p.skillCd>0?'자가회복\n'+Math.ceil(p.skillCd)+'초':'자가회복\n+100';return ''}

  const hudCore=hud;hud=function(){hudCore();const e=document.getElementById('coreJob');if(e)e.textContent=p.job||'미전직'};
  const talkCore=talkNow;talkNow=function(){const tr=nearTrainer();if(tr){coreBecome(tr.job);return}const n=nearest();if(n&&n.k==='potion'){if(p.g<70){say('물약상인','회복 물약은 70골드다.');return}p.g-=70;inv['회복 물약']++;sfx('buy');hud();say('물약상인','회복 물약 1개 구매. 체력 100 회복.');return}talkCore()};
  if(!document.getElementById('coreHeal')){const h=document.createElement('button');h.id='coreHeal';h.className='btn';h.textContent='물약';h.style.cssText='right:122px;bottom:38px;width:78px;height:78px;border-radius:18px;background:#2d9b72e8;font-size:12px;display:none';h.onpointerdown=e=>{e.preventDefault();if((inv['회복 물약']||0)<=0)return;if(p.hp>=maxHp()){toastMsg('체력이 가득 찼다');return}inv['회복 물약']--;p.hp=Math.min(maxHp(),p.hp+100);sfx('respawn');hud();toastMsg('체력 +100')};document.body.appendChild(h)}
  const updateCore=update;update=function(dt){p.skillCd=Math.max(0,(p.skillCd||0)-dt);updateCore(dt);const h=document.getElementById('coreHeal');if(h){h.style.display=(inv['회복 물약']||0)>0?'block':'none';h.textContent='물약\n×'+(inv['회복 물약']||0)}skill.style.display=(p.job==='전사'||p.job==='마법사')?'block':'none';skill.disabled=p.skillCd>0;skill.style.opacity=skill.disabled?'.65':'1';skill.textContent=skillLabel()};

  const drawCore=draw;draw=function(){drawCore();ctx.save();ctx.translate(-cam.x,-cam.y);const tr=Object.values(TRAINERS).find(t=>t.zone===zone);if(tr){ctx.fillStyle='#342d28';ctx.beginPath();ctx.arc(tr.x,tr.y-12,23,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2d1ae';ctx.beginPath();ctx.arc(tr.x,tr.y-31,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe26e';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(tr.name,tr.x,tr.y-57);ctx.font='bold 10px sans-serif';ctx.fillText('Lv.5 전직',tr.x,tr.y-44);ctx.textAlign='left'}ctx.restore()};

  const portalCore=portal;portal=function(px,py,a,b,back=false){if(a==='9번 사신 포탈'){ctx.save();ctx.translate(px,py);ctx.fillStyle='#211f29';ctx.fillRect(-65,-76,24,116);ctx.fillRect(41,-76,24,116);ctx.beginPath();ctx.arc(0,-66,54,Math.PI,0);ctx.fill();ctx.fillStyle='#030205';ctx.beginPath();ctx.arc(0,-62,40,Math.PI,0);ctx.lineTo(40,34);ctx.lineTo(-40,34);ctx.closePath();ctx.fill();ctx.strokeStyle='#a14cff';ctx.lineWidth=5;ctx.shadowColor='#b64cff';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,-62,40,Math.PI,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#d7d0c2';ctx.beginPath();ctx.arc(0,-88,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 14px sans-serif';ctx.textAlign='center';ctx.fillText('9번 사신 포탈',0,58);ctx.fillStyle='#efc8ff';ctx.font='900 12px sans-serif';ctx.fillText('Lv.16~20',0,75);ctx.restore();ctx.textAlign='left';return}portalCore(px,py,a,b,back)};
  toastMsg('전직 · 사신 · 물약상인 핵심 복구 완료');
}catch(e){console.error('CORE18',e);const t=document.getElementById('toast');if(t){t.textContent='핵심 패치 오류: '+e.message;t.style.opacity=1}}
})();