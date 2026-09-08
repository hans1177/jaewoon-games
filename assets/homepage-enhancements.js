// 파일명: assets/homepage-enhancements.js
// 역할: 게임센터 기본 레이아웃은 중복 태그라인 제거 직전 버전의 index.html 스타일을 그대로 사용한다.
// 평가·재평가 정보는 홈에서 숨기고 운영 대시보드에서 확인한다.
const getJson=async url=>{try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch{return null;}};

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='jaewoonEnhancementStyles';
  style.textContent=`
.reviews{display:none!important}
.brandRow{justify-content:center!important}
.brand{width:100%;justify-content:center}
.brand img{object-position:center center!important}
.opsBar{grid-template-columns:1fr!important}
.opsBar>.opsLead{min-height:56px}
.rollbackNotice{display:block;margin-top:6px;padding:7px 8px;border-radius:8px;background:#fff3cd;color:#735800;font-size:10px;font-weight:900;line-height:1.4}
.cardActions.hasArtbook .artbookCardBtn{grid-column:1/-1;background:#102d42!important;border-color:#102d42!important;color:#fff!important}
.developmentFlow .sectionHead{align-items:center;padding-top:18px;padding-bottom:12px}
.developmentFlow .sectionHead h2{font-size:29px!important;line-height:1}
.developmentFlow .sectionHead span{max-width:68%;font-size:11px!important;line-height:1.45;color:#4f7188}
.developmentFlow .staff{grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;padding:0 13px 13px}
.developmentFlow .staff div{min-height:128px;padding:14px 12px;display:flex;flex-direction:column;justify-content:flex-start;line-height:1.55;font-size:12px!important;text-align:left}
.developmentFlow .staff b{font-size:16px!important;line-height:1.25;margin-bottom:9px}
@media(max-width:760px){.developmentFlow .sectionHead{align-items:flex-start;flex-direction:column}.developmentFlow .sectionHead span{max-width:none;font-size:11px!important}.developmentFlow .staff{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.gameCard{grid-template-columns:50% 50%!important}.developmentFlow .sectionHead h2{font-size:27px!important}.developmentFlow .staff{grid-template-columns:1fr}.developmentFlow .staff div{min-height:0;padding:14px 13px;font-size:13px!important}.developmentFlow .staff b{font-size:17px!important}}
@media(max-width:370px){.gameCard{grid-template-columns:50% 50%!important}}
`;
  document.head.appendChild(style);
}

function simplifyTop(){
  document.querySelectorAll('.opsBar .opsMetric').forEach(el=>el.remove());
  document.querySelector('.catalogIntro')?.remove();
  const opsStatus=document.getElementById('opsStatus');
  if(opsStatus){
    const syncOpsLabel=()=>{
      if(opsStatus.textContent==='● 게임 운영 상태 연결됨')opsStatus.textContent='● 운영 데이터 정상';
      if(opsStatus.textContent==='● 회사 상태 연결 확인 필요')opsStatus.textContent='● 운영 데이터 확인 필요';
    };
    new MutationObserver(syncOpsLabel).observe(opsStatus,{childList:true,characterData:true,subtree:true});
    syncOpsLabel();
  }
}

function configureDevelopmentFlow(){
  const section=document.querySelector('.panel.company');
  if(!section)return;
  section.classList.add('developmentFlow');
  const head=section.querySelector('.sectionHead');
  if(head){
    const title=head.querySelector('h2');
    const note=head.querySelector('span');
    if(title)title.textContent='개발순서';
    if(note)note.textContent='무엇을 만들지 정하고 → 미리 검토하고 → 개발하고 → 직접 테스트한 뒤 → 통과한 것만 반영';
  }
  section.querySelector('.companySummary')?.remove();
  section.querySelector('.companyStats')?.remove();
  const staff=section.querySelector('.staff');
  if(staff){
    staff.innerHTML=`
      <div><b>1. 작업 정하기</b>어떤 기능과 화면을 만들지 정해. 기존 게임의 규칙·저장·밸런스는 먼저 보호해.</div>
      <div><b>2. 아트북으로 미리 확인</b>캐릭터·화면·기능 방향을 1·2·3차로 검토해서 만들기 전에 문제를 잡아.</div>
      <div><b>3. Vibe2로 개발</b>검토가 끝난 내용만 별도 개발판에 실제로 구현하고 여러 방법을 비교해.</div>
      <div><b>4. 직접 플레이 테스트</b>게임 진행, 모바일 조작, 저장·불러오기, 오류와 진행 막힘을 실제로 확인해.</div>
      <div><b>5. 통과한 버전만 반영</b>테스트에 합격한 개발판만 Unity 정식 개발 단계로 올리고 기존 안정판은 계속 보존해.</div>`;
  }
  const actions=section.querySelector('.companyActions');
  const companyLink=document.querySelector('.companyLink');
  if(actions&&companyLink){
    companyLink.textContent='개발연구소';
    companyLink.setAttribute('aria-label','개발연구소');
    companyLink.className='companyBtn';
    actions.replaceChildren(companyLink);
    const gameLink=document.createElement('a');
    gameLink.className='companyBtn secondary';
    gameLink.href='#gameHub';
    gameLink.textContent='게임 목록으로';
    actions.appendChild(gameLink);
  }
}

function removeLegacyRuntimeBadges(){
  document.querySelectorAll('.healthBadge,.healthHealthy,.healthWarning,.healthCritical,.healthPending').forEach(el=>el.remove());
}

function applyVerifiedRollback(catalog,baselines){
  const byName=new Map((catalog?.games||[]).map(g=>[g.name,g]));
  const baselineById=new Map((baselines?.games||[]).map(g=>[g.gameId,g]));
  document.querySelectorAll('.gameCard').forEach(card=>{
    const name=card.querySelector('.artName b')?.textContent?.trim();
    const meta=byName.get(name);if(!meta)return;
    const baseline=baselineById.get(meta.id);if(!baseline?.rollbackActive||!baseline?.fallbackDownload)return;
    const btn=card.querySelector('.cardBtn.primary');
    if(btn){btn.href=baseline.fallbackDownload;btn.textContent='안정판 APK';btn.removeAttribute('download');}
    const info=card.querySelector('.gameInfo');
    if(info&&!info.querySelector('.rollbackNotice')){
      const note=document.createElement('span');note.className='rollbackNotice';note.textContent='최신판 이상 감지 → 마지막 검증 안정판 표시 중';info.appendChild(note);
    }
  });
}

function addDaechungArtbookButton(catalog){
  const byName=new Map((catalog?.games||[]).map(g=>[g.name,g]));
  document.querySelectorAll('#gameGrid .gameCard').forEach(card=>{
    const name=card.querySelector('.artName b')?.textContent?.trim();
    const meta=byName.get(name);
    if(meta?.id!=='daechung-rpg'&&name!=='대충 RPG')return;
    const actions=card.querySelector('.cardActions');
    if(!actions||actions.querySelector('.artbookCardBtn'))return;
    const link=document.createElement('a');
    link.className='cardBtn artbookCardBtn';
    link.href='/artbook-viewer.html?game=daechung-rpg';
    link.textContent='아트북 보기';
    actions.classList.add('hasArtbook');
    actions.appendChild(link);
  });
}

async function main(){
  installStyles();
  simplifyTop();
  configureDevelopmentFlow();
  removeLegacyRuntimeBadges();
  const [catalog,baselines]=await Promise.all([getJson('/game-catalog.json'),getJson('/public-release-baselines.json')]);
  const refresh=()=>{removeLegacyRuntimeBadges();applyVerifiedRollback(catalog,baselines);addDaechungArtbookButton(catalog);};
  refresh();
  const grid=document.getElementById('gameGrid');
  if(grid){
    const observer=new MutationObserver(()=>refresh());
    observer.observe(grid,{childList:true});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
