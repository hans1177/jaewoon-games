// 파일명: patch-core18.js
(()=>{
if(window.__RPG_CORE18)return;window.__RPG_CORE18=true;
try{
  // v15/v16/v17가 실제 게임 기능을 소유한다. 이 파일은 누락된 핵심 데이터만 보강한다.
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

  // 물약상인은 과거 공동묘지 포탈과 겹치지 않던 위치를 유지한다.
  let potionNpc=npcs.find(n=>n.k==='potion');
  if(!potionNpc){potionNpc={x:1160,y:1010,n:'물약상인',k:'potion'};npcs.push(potionNpc)}
  else {potionNpc.x=1160;potionNpc.y=1010}

  // 전직/스킬/궁수 능력치/물약 사용/사신 전투는 v15의 단일 구현만 사용한다.
  // 여기서 maxHp/currentAtk/update/talkNow/draw를 다시 감싸면 효과가 중복 적용되므로 금지한다.
  if(!p.job)p.job='미전직';
  if(p.skillCd==null)p.skillCd=0;
  hud();
  toastMsg('대충 RPG 핵심 데이터 점검 완료');
}catch(e){console.error('CORE18',e);const t=document.getElementById('toast');if(t){t.textContent='핵심 패치 오류: '+e.message;t.style.opacity=1}}
})();