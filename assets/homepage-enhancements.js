// 파일명: assets/homepage-enhancements.js
// 역할: 홈페이지는 예전의 거의 정사각형 게임 카드 비율을 유지하고 최신 게임 데이터/링크만 사용한다.
// 평가·재평가 정보는 홈에서 숨기고 운영 대시보드에서 확인한다.
const getJson=async url=>{try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch{return null;}};

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='jaewoonEnhancementStyles';
  style.textContent=`
.reviews{display:none!important}
#gameGrid.gameGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;padding:0 10px 11px!important}
.gameCard.compactLegacyCard{aspect-ratio:1.06/1!important;min-height:0!important;height:auto!important;border:0!important;border-radius:15px!important;overflow:hidden!important;background:#1c4255!important;box-shadow:0 5px 12px rgba(34,76,105,.18)!important;position:relative!important}
.gameCard.compactLegacyCard .gameArt{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;aspect-ratio:auto!important;background:#1c4255!important}
.gameCard.compactLegacyCard .gameArt img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;transform:none!important}
.gameCard.compactLegacyCard .gameArt:after{content:''!important;position:absolute!important;inset:0!important;background:linear-gradient(180deg,rgba(5,22,32,.04) 20%,rgba(6,21,34,.38) 52%,rgba(4,15,24,.94) 100%)!important;z-index:1!important}
.gameCard.compactLegacyCard .artName{left:9px!important;right:9px!important;bottom:42px!important;z-index:3!important;color:#fff!important}
.gameCard.compactLegacyCard .artName b{font-size:14px!important;line-height:1.12!important;text-shadow:0 2px 5px #000!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.gameCard.compactLegacyCard .artName small{display:none!important}
.gameCard.compactLegacyCard .favorite{display:none!important}
.gameCard.compactLegacyCard .gameInfo{display:none!important}
.compactPlay{position:absolute!important;left:9px!important;right:9px!important;bottom:8px!important;z-index:4!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:29px!important;border:0!important;border-radius:8px!important;background:linear-gradient(100deg,#5b39c9,#2876d6)!important;color:#fff!important;text-decoration:none!important;font-size:8px!important;font-weight:1000!important;text-align:center!important}
.rollbackNotice{display:none!important}
@media(min-width:700px){#gameGrid.gameGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.gameCard.compactLegacyCard{aspect-ratio:1.28/1!important}.gameCard.compactLegacyCard .artName{bottom:45px!important}.gameCard.compactLegacyCard .artName b{font-size:15px!important}.compactPlay{min-height:32px!important;font-size:9px!important}}
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
    const btn=card.querySelector('.cardBtn.primary,.compactPlay');
    if(btn){btn.href=baseline.fallbackDownload;btn.textContent='안정판 APK';btn.removeAttribute('download');}
  });
}

function compactGameCards(){
  document.querySelectorAll('#gameGrid .gameCard').forEach(card=>{
    card.classList.add('compactLegacyCard');
    const art=card.querySelector('.gameArt');
    if(!art||art.querySelector('.compactPlay'))return;
    const actions=[...card.querySelectorAll('.cardActions a.cardBtn[href]')];
    const preferred=actions.find(a=>a.classList.contains('primary'))||actions.find(a=>/Web 플레이|플레이/.test(a.textContent||''))||actions[0];
    if(!preferred)return;
    const play=preferred.cloneNode(true);
    play.className='compactPlay';
    const label=(preferred.textContent||'').trim();
    play.textContent=/APK/.test(label)?label:'게임 시작';
    art.appendChild(play);
  });
}

async function main(){
  installStyles();removeLegacyRuntimeBadges();
  const [catalog,baselines]=await Promise.all([getJson('/game-catalog.json'),getJson('/public-release-baselines.json')]);
  let rounds=0;
  const refresh=()=>{
    removeLegacyRuntimeBadges();
    applyVerifiedRollback(catalog,baselines);
    compactGameCards();
    if(++rounds>24)clearInterval(timer);
  };
  const timer=setInterval(refresh,300);refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();