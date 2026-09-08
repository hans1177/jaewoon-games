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
@media(max-width:520px){.gameCard{grid-template-columns:58% 42%!important}.gameCard .artName{right:40px!important}}
@media(max-width:370px){.gameCard{grid-template-columns:60% 40%!important}.gameCard .artName{right:36px!important}}
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

async function main(){
  installStyles();removeLegacyRuntimeBadges();
  const [catalog,baselines]=await Promise.all([getJson('/game-catalog.json'),getJson('/public-release-baselines.json')]);
  let rounds=0;
  const refresh=()=>{removeLegacyRuntimeBadges();applyVerifiedRollback(catalog,baselines);if(++rounds>20)clearInterval(timer);};
  const timer=setInterval(refresh,300);refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();