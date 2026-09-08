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
.rollbackNotice{display:block;margin-top:6px;padding:7px 8px;border-radius:8px;background:#fff3cd;color:#735800;font-size:10px;font-weight:900;line-height:1.4}
.cardActions.hasArtbook .artbookCardBtn{grid-column:1/-1;background:#102d42!important;border-color:#102d42!important;color:#fff!important}
.developmentFlow .staff{grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;padding:0 13px 10px}
.developmentFlow .staff div{min-height:88px;padding:10px 8px;display:flex;flex-direction:column;justify-content:center;line-height:1.45}
.developmentFlow .staff b{font-size:10px;margin-bottom:4px}
.developmentFlow .sectionHead span{max-width:60%;line-height:1.4}
@media(max-width:760px){.developmentFlow .staff{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.gameCard{grid-template-columns:50% 50%!important}.developmentFlow .staff{grid-template-columns:1fr}.developmentFlow .staff div{min-height:64px}}
@media(max-width:370px){.gameCard{grid-template-columns:50% 50%!important}}
`;
  document.head.appendChild(style);
}

function simplifyTop(){
  document.querySelector('.opsBar')?.remove();
  document.querySelector('.catalogIntro')?.remove();
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
    if(note)note.textContent='안정판 보호 → 아트북 검토 → Vibe2 개발 → 회귀검증 → Unity 승격';
  }
  section.querySelector('.companySummary')?.remove();
  section.querySelector('.companyStats')?.remove();
  const staff=section.querySelector('.staff');
  if(staff){
    staff.innerHTML=`
      <div><b>1. 안정판 보호</b>기존 플레이·저장·밸런스를 먼저 보존</div>
      <div><b>2. 아트북 검토</b>1·2·3차 기획·그래픽·반대 검토로 방향 확정</div>
      <div><b>3. Vibe2 개발판</b>원본과 분리해 실험하고 A/B 비교</div>
      <div><b>4. 실제 회귀검증</b>플레이·모바일·저장·진행막힘·오류를 확인</div>
      <div><b>5. Unity 승격</b>검증을 통과한 개발판만 다음 단계로 승격</div>`;
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
