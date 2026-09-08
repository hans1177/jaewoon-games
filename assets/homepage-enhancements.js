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
.rollbackNotice{display:block;margin-top:6px;padding:7px 8px;border-radius:8px;background:#fff3cd;color:#735800;font-size:10px;font-weight:900;line-height:1.4}
.cardActions.hasArtbook .artbookCardBtn{grid-column:1/-1;background:#102d42!important;border-color:#102d42!important;color:#fff!important}
.opsBar{grid-template-columns:minmax(0,1.5fr) auto repeat(4,minmax(58px,.55fr))!important}
.opsBar>.companyLink{min-height:56px;padding:0 14px;align-self:stretch;border-color:rgba(255,255,255,.8)}
@media(max-width:760px){.opsBar{grid-template-columns:minmax(0,1fr) auto repeat(4,58px)!important}}
@media(max-width:520px){.gameCard{grid-template-columns:50% 50%!important}.opsBar{grid-template-columns:repeat(4,minmax(0,1fr))!important}.opsBar>.opsLead{grid-column:1/4!important;min-height:50px}.opsBar>.companyLink{grid-column:4!important;min-height:50px;padding:0 6px;font-size:9px}}
@media(max-width:370px){.gameCard{grid-template-columns:50% 50%!important}}
`;
  document.head.appendChild(style);
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
  installStyles();removeLegacyRuntimeBadges();
  const companyLink=document.querySelector('.companyLink');
  const opsBar=document.querySelector('.opsBar');
  const opsLead=opsBar?.querySelector('.opsLead');
  if(companyLink&&opsBar&&opsLead){
    companyLink.textContent='개발연구소';
    companyLink.setAttribute('aria-label','개발연구소');
    opsLead.insertAdjacentElement('afterend',companyLink);
  }
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
