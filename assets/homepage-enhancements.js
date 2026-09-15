// 파일명: assets/homepage-enhancements.js
// 역할: 홈페이지 서버 기준 게임 목록 표시, 공식 카드 노출, Android 설치와 직접 게임 실행 보조
import './homepage-enhancements-core.js?v=20260915-current-development-score';

function bindNativeApkInstall(){
  const bind=()=>{
    const bar=document.getElementById('appInstallBar');
    const teamWrap=document.querySelector('.teamPanel .teamWrap');
    if(bar&&teamWrap){
      teamWrap.appendChild(bar);
      bar.dataset.placement='company-team-bottom';
      bar.style.width='100%';
      bar.style.margin='12px 0 0';
    }
    const oldButton=document.getElementById('appInstallBtn');
    const state=document.getElementById('appInstallState');
    if(!oldButton)return;
    const button=oldButton.cloneNode(true);
    oldButton.replaceWith(button);
    button.disabled=false;
    button.textContent='재운컴퍼니 APK 설치';
    if(state)state.textContent='개발팀 영역에서 Android APK를 직접 설치할 수 있어.';
    button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();window.location.href='/downloads/jaewoon-company.apk';},true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
}
const TEST_SHELF_LIMIT=30;
const TEST_SHELF_MIN_SCORE=80;
const SERVER_SYNC_MS=5000;
let serverCatalogRefreshInFlight=false;
let lastServerCatalogSignature='';
const directPlayTarget=card=>String(card?.dataset?.directPlay||'').trim()||String(card?.querySelector('a[href*="/web-games/"]')?.getAttribute('href')||'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizePlatform=value=>String(value??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const platformLabel=value=>{const platform=normalizePlatform(value);if(platform==='ROBLOX')return'Roblox';if(['UNITY','UNITY_ANDROID'].includes(platform))return'Unity Android';if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(platform))return'Fortnite UEFN';return'플랫폼 선택 전';};
const productionLabel=value=>{const key=String(value||'DESIGN_ONLY').trim().toUpperCase();if(key==='RELEASE_CONFIRMED')return'출시확정';if(key==='DEVELOPMENT_CONFIRMED')return'개발확정';return'기획/설계';};
const isVisibleServerGame=game=>Boolean(game?.id)&&String(game?.runtimeStatus||'').trim().toUpperCase()!=='HOLD'&&String(game?.homepageStage||'').trim()!=='보류';
function ensureServerCatalogStyles(){
  if(document.getElementById('serverCatalogStyles'))return;
  const style=document.createElement('style');
  style.id='serverCatalogStyles';
  style.textContent=`
#homeTop30GameCenter,#homeDevelopmentGameCenter,#gameGrid{display:none!important}
#homeServerGameCenter{margin:0 14px 14px}
.serverGameGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.serverGameCard{min-width:0;border:1px solid #d5e8f1;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 14px rgba(58,111,146,.10)}
.serverGameArt{height:155px;position:relative;background:#264a60;overflow:hidden}.serverGameArt img{width:100%;height:100%;display:block;object-fit:cover}.serverGameArt:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(2,18,29,.85))}.serverGameTitle{position:absolute;z-index:2;left:12px;right:12px;bottom:10px;color:#fff}.serverGameTitle b{display:block;font-size:20px;font-weight:900;text-shadow:0 2px 5px #000}.serverGameTitle small{display:block;margin-top:2px;font-size:9px;color:#d9edf7;font-weight:800}.serverGameBody{padding:12px}.serverGameBadges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.serverGameBadge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;background:#e6f2fb;color:#4d7087;font-size:9px;font-weight:900}.serverGameBadge.active{background:#d9f4e4;color:#197340}.serverGameBadge.stage{background:#eef8ff;color:#1767a9}.serverGameBody p{margin:7px 0;font-size:11px;line-height:1.5;color:#536f82;font-weight:700}.serverGameMeta{font-size:9px;line-height:1.6;color:#6d8799;font-weight:800}.serverGameActions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:9px}.serverGameBtn{display:flex;align-items:center;justify-content:center;min-height:34px;padding:0 6px;border-radius:9px;text-decoration:none;text-align:center;font-size:8px;font-weight:1000;background:#2488df;color:#fff;border:1px solid #2488df}.serverGameBtn.secondary{background:#eef8ff;color:#1767a9;border-color:#afd7ef}.serverGameBtn.off{background:#e8eef2;color:#7c8c96;border-color:#dce5eb;pointer-events:none}
@media(max-width:700px){.serverGameGrid{grid-template-columns:1fr}}@media(max-width:420px){#homeServerGameCenter{margin-left:10px;margin-right:10px}.serverGameArt{height:145px}}
`;
  document.head.appendChild(style);
}
function serverGameCard(game){
  const name=game.name||game.id;
  const genre=Array.isArray(game.genre)&&game.genre.length?game.genre.join(' · '):'게임';
  const image=game.image||'assets/pwa-icon-512.png';
  const stage=game.homepageStage||'서버 개발 상태 확인 중';
  const platform=platformLabel(game.selectedPlatform||game.productionTarget);
  const web=String(game.webPath||'').trim();
  const webAction=web&&game.homepageWebPlayable!==false?`<a class="serverGameBtn" href="${esc(web)}">게임 시작</a>`:'<span class="serverGameBtn off">Web 준비 중</span>';
  const artbook=String(game.homepageArtbookPath||'').trim();
  const artbookAction=artbook?`<a class="serverGameBtn secondary" href="${esc(artbook)}">아트북</a>`:'';
  return `<article class="serverGameCard" data-game-id="${esc(game.id)}" data-homepage-game-source="COMPANY_RUNTIME"><div class="serverGameArt"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy"><div class="serverGameTitle"><b>${esc(name)}</b><small>${esc(genre)}</small></div></div><div class="serverGameBody"><div class="serverGameBadges"><span class="serverGameBadge active">서버 ACTIVE</span><span class="serverGameBadge">${esc(productionLabel(game.productionClass))}</span><span class="serverGameBadge stage">${esc(platform)}</span></div><p>${esc(game.description||'서버에서 개발·관리 중인 게임')}</p><div class="serverGameMeta">${esc(stage)}<br>서버 상태 기준 자동 동기화</div><div class="serverGameActions">${webAction}${artbookAction}</div></div></article>`;
}
async function refreshServerCatalog(){
  if(serverCatalogRefreshInFlight)return;
  serverCatalogRefreshInFlight=true;
  try{
    const response=await fetch('/game-catalog.json?server='+Date.now(),{cache:'no-store'});
    if(!response.ok)return;
    const catalog=await response.json();
    const games=(Array.isArray(catalog?.games)?catalog.games:[]).filter(isVisibleServerGame);
    const signature=JSON.stringify(games.map(game=>[game.id,game.name,game.productionClass,game.selectedPlatform,game.homepageStage,game.webPath,game.image,game.runtimeStatus]));
    if(signature===lastServerCatalogSignature)return;
    const hub=document.getElementById('gameHub');if(!hub)return;
    ensureServerCatalogStyles();
    document.getElementById('homeServerGameCenter')?.remove();
    const section=document.createElement('section');
    section.id='homeServerGameCenter';
    section.dataset.homepageGameSource='COMPANY_RUNTIME';
    section.innerHTML=`<div class="top30Head"><div><h2>서버 게임</h2><p>company-runtime ACTIVE 기준 · HOLD 제외 · 5초 자동 동기화</p></div><span class="top30Count">${games.length}개</span></div><div class="serverGameGrid">${games.length?games.map(serverGameCard).join(''):'<div class="top30Empty">현재 서버 ACTIVE 게임이 없어.</div>'}</div>`;
    const firstExisting=document.getElementById('homeDevelopmentGameCenter')||document.getElementById('homeTop30GameCenter')||document.getElementById('gameGrid');
    hub.insertBefore(section,firstExisting||null);
    document.documentElement.dataset.homeServerGameCount=String(games.length);
    document.documentElement.dataset.homePrimaryGameSource='COMPANY_RUNTIME';
    document.documentElement.dataset.homeRuntimeAuthority=String(catalog.runtimeAuthority||'company-runtime');
    lastServerCatalogSignature=signature;
  }catch(error){console.warn('server catalog sync failed',error)}finally{serverCatalogRefreshInFlight=false;}
}
function installServerCatalogSync(){
  const run=()=>refreshServerCatalog();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.setInterval(()=>{if(!document.hidden)run();},SERVER_SYNC_MS);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)run();});
  window.addEventListener('focus',run);
  window.addEventListener('online',run);
}
function enforceOfficialCardVisibility(){
  document.getElementById('compactTestGameShelf')?.remove();
  document.querySelectorAll('#gameHub .gameCard,#gameHub .foldGameCard').forEach(card=>{
    const rank=Number(card.dataset?.top30Rank||0);
    const score=Number(card.dataset?.top30Score||0);
    const canonical=card.classList.contains('top30GameCard')&&card.dataset?.homepageGameSource==='CANONICAL_TOP30'&&rank>=1&&rank<=TEST_SHELF_LIMIT&&score>=TEST_SHELF_MIN_SCORE;
    const development=card.classList.contains('developmentGameCard')&&card.dataset?.homepageGameSource==='DEVELOPMENT_QUEUE';
    card.style.display=(canonical||development)?'':'none';
  });
}
function bindDirectGameLaunch(){
  if(document.documentElement.dataset.directGameLaunchBound==='1')return;
  document.documentElement.dataset.directGameLaunchBound='1';
  document.addEventListener('click',event=>{
    if(event.target.closest('a,button,input,select,textarea,label'))return;
    const card=event.target.closest('.top30GameCard');if(!card)return;
    const target=directPlayTarget(card);if(target)window.location.href=target;
  });
}
function markDirectPlayCards(){
  document.querySelectorAll('.top30GameCard').forEach(card=>{const target=directPlayTarget(card);if(!target)return;card.dataset.directPlay=target;card.dataset.touchLaunch='true';card.style.cursor='pointer';});
}
function installHomepagePublicationGuard(){
  const apply=()=>{enforceOfficialCardVisibility();markDirectPlayCards();};
  const observer=new MutationObserver(apply);observer.observe(document.documentElement,{subtree:true,childList:true});
  bindDirectGameLaunch();apply();
  window.setInterval(()=>{if(!document.hidden)apply();},5000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply();});
}
bindNativeApkInstall();
installServerCatalogSync();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHomepagePublicationGuard,{once:true});else installHomepagePublicationGuard();
