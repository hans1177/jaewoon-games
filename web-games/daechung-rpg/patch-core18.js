// 파일명: patch-core18.js
(()=>{
if(window.__RPG_CORE18)return;window.__RPG_CORE18=true;
try{
  // v15/v16/v17가 실제 게임 기능을 소유한다. 이 파일은 누락된 핵심 데이터와 과거 UI 회귀만 보강한다.
  if(!F.f8)F.f8={n:'8번 폐허 마을',l:'Lv.13~15',bg:'#302b2a',m:[['폐허 기사',13,1250,28,60,22,180,45,2,'knight'],['잿빛 주술사',14,1500,34,52,23,220,60,2,'demon'],['거대오크',15,2000,40,46,34,400,100,1,'giantOrc']]};
  if(!F.f9)F.f9={n:'9번 공동묘지',l:'Lv.16~20',bg:'#11141a',m:[]};
  if(!P.some(a=>a[0]==='f8'))P.push(['f8',1010,820,'8번 포탈','Lv.13~15']);
  if(!P.some(a=>a[0]==='f9'))P.push(['f9',1450,820,'9번 포탈','Lv.16~20']);

  if(WEAPONS['철 도끼']){WEAPONS['철 도끼'].damage=40;WEAPONS['철 도끼'].cd=.5}
  if(!WEAPONS['강철 대검'])WEAPONS['강철 대검']={price:700,damage:50,cd:1};
  if(!WEAPONS['강철 쌍검'])WEAPONS['강철 쌍검']={price:1000,damage:35,cd:.35};
  if(!('강철 대검' in ownedWeapons))ownedWeapons['강철 대검']=false;
  if(!('강철 쌍검' in ownedWeapons))ownedWeapons['강철 쌍검']=false;
  if(!ARMORS['강철 갑옷'])ARMORS['강철 갑옷']={price:500,hp:400};
  if(!('강철 갑옷' in ownedArmors))ownedArmors['강철 갑옷']=false;
  if(!('회복 물약' in inv))inv['회복 물약']=0;

  let potionNpc=npcs.find(n=>n.k==='potion');
  if(!potionNpc){potionNpc={x:1160,y:1010,n:'물약상인',k:'potion'};npcs.push(potionNpc)}
  else {potionNpc.x=1160;potionNpc.y=1010}

  if(!p.job)p.job='미전직';
  if(p.skillCd==null)p.skillCd=0;

  // 과거 정상판의 물약상인 상점 UI 복구: 대화 즉시 강제구매가 아니라 상점에서 선택 구매한다.
  let potionShop=document.getElementById('corePotionShop');
  if(!potionShop){
    potionShop=document.createElement('div');potionShop.id='corePotionShop';potionShop.className='overlay';
    potionShop.innerHTML='<div class="panel"><h2>물약상인</h2><div class="slot"><span><b>회복 물약</b><br><span class="small">체력 100 회복 · 70G</span></span><button id="coreBuyPotion">70G 구매</button></div><button id="coreClosePotion" class="main dark">닫기</button></div>';
    document.body.appendChild(potionShop);
    potionShop.querySelector('#coreBuyPotion').onclick=()=>{if(p.g<70){sfx('noGold');toastMsg('골드가 부족하다');return}p.g-=70;inv['회복 물약']=(inv['회복 물약']||0)+1;sfx('buy');hud();toastMsg('회복 물약 구매')};
    potionShop.querySelector('#coreClosePotion').onclick=()=>{potionShop.style.display='none';sfx('shopClose')};
  }
  const talkBeforePotionRestore=talkNow;
  talkNow=function(){const n=nearest();if(n&&n.k==='potion'){sfx('shopOpen');potionShop.style.display='flex';return}talkBeforePotionRestore()};

  hud();
  toastMsg('물약상인 원본 상점 복구 완료');
}catch(e){console.error('CORE18',e);const t=document.getElementById('toast');if(t){t.textContent='핵심 패치 오류: '+e.message;t.style.opacity=1}}
})();