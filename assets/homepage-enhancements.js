// 파일명: assets/homepage-enhancements.js
// 역할: canonical Web TOP30/개발중 홈페이지 표시를 보존하고 Android 설치와 직접 게임 실행을 보조한다.
import './homepage-enhancements-core.js?v=20260917-lifecycle-sync';

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
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href='/downloads/jaewoon-company.apk';
    },true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
}

const TEST_SHELF_LIMIT=30;
const TEST_SHELF_MIN_SCORE=80;
const HOMEPAGE_ACTIVE_LIFECYCLE_STATES=new Set(['ACTIVE','REBUILD']);
const RUNTIME_CATALOG_URL='https://raw.githubusercontent.com/hans1177/jaewoon-games/company-runtime/game-catalog.json';
const MAIN_CATALOG_URL='https://raw.githubusercontent.com/hans1177/jaewoon-games/main/game-catalog.json';
let canonicalLifecycleByGameId=new Map();
let canonicalLifecycleReady=false;
let lifecycleRefreshInFlight=false;
const directPlayTarget=card=>String(card?.dataset?.directPlay||'').trim()||String(card?.querySelector('a[href*="/web-games/"]')?.getAttribute('href')||'').trim();
const lifecycleStateOf=game=>String(game?.lifecycleState||'ACTIVE').trim().toUpperCase();

async function refreshCanonicalLifecycle(){
  if(lifecycleRefreshInFlight)return;
  lifecycleRefreshInFlight=true;
  try{
    const stamp=Date.now();
    let catalog=null;
    for(const url of [RUNTIME_CATALOG_URL,MAIN_CATALOG_URL,'/game-catalog.json']){
      try{
        const response=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${stamp}`,{cache:'no-store'});
        if(response.ok){catalog=await response.json();break;}
      }catch{}
    }
    if(!catalog||!Array.isArray(catalog.games))return;
    canonicalLifecycleByGameId=new Map(catalog.games.map(game=>[String(game?.id||'').trim(),lifecycleStateOf(game)]).filter(([id])=>id));
    canonicalLifecycleReady=true;
    enforceOfficialCardVisibility();
  }finally{
    lifecycleRefreshInFlight=false;
  }
}

function lifecycleAllowsCard(card){
  if(!canonicalLifecycleReady)return true;
  const gameId=String(card?.dataset?.gameId||'').trim();
  if(!gameId)return false;
  const lifecycle=canonicalLifecycleByGameId.get(gameId);
  return Boolean(lifecycle)&&HOMEPAGE_ACTIVE_LIFECYCLE_STATES.has(lifecycle);
}

function updateVisibleShelfCounts(){
  const top30=document.getElementById('homeTop30GameCenter');
  if(top30){
    const count=[...top30.querySelectorAll('.top30GameCard')].filter(card=>card.style.display!=='none').length;
    const label=top30.querySelector('.top30Count');
    if(label)label.textContent=`${count} / ${TEST_SHELF_LIMIT}`;
    document.documentElement.dataset.homeTop30Count=String(count);
  }
  const development=document.getElementById('homeDevelopmentGameCenter');
  if(development){
    const count=[...development.querySelectorAll('.developmentGameCard')].filter(card=>card.style.display!=='none').length;
    const label=development.querySelector('.top30Count');
    if(label)label.textContent=`${count}개`;
    document.documentElement.dataset.homeDevelopmentCount=String(count);
  }
}

function enforceOfficialCardVisibility(){
  // canonical 권한은 core의 TOP30/개발중 두 선반이며, 게임 lifecycle은 game-catalog가 단일 권위다.
  document.getElementById('homeServerGameCenter')?.remove();
  document.getElementById('compactTestGameShelf')?.remove();
  document.querySelectorAll('#gameHub .gameCard,#gameHub .foldGameCard').forEach(card=>{
    const rank=Number(card.dataset?.top30Rank||0);
    const score=Number(card.dataset?.top30Score||0);
    const lifecycleAllowed=lifecycleAllowsCard(card);
    const canonical=card.classList.contains('top30GameCard')&&card.dataset?.homepageGameSource==='CANONICAL_TOP30'&&rank>=1&&rank<=TEST_SHELF_LIMIT&&score>=TEST_SHELF_MIN_SCORE&&lifecycleAllowed;
    const development=card.classList.contains('developmentGameCard')&&card.dataset?.homepageGameSource==='DEVELOPMENT_QUEUE'&&lifecycleAllowed;
    card.style.display=(canonical||development)?'':'none';
  });
  updateVisibleShelfCounts();
  document.documentElement.dataset.homePrimaryGameSource='CANONICAL_TOP30';
  document.documentElement.dataset.homeLifecycleAuthority=canonicalLifecycleReady?'GAME_CATALOG':'LOADING';
}

function bindDirectGameLaunch(){
  if(document.documentElement.dataset.directGameLaunchBound==='1')return;
  document.documentElement.dataset.directGameLaunchBound='1';
  document.addEventListener('click',event=>{
    if(event.target.closest('a,button,input,select,textarea,label'))return;
    const card=event.target.closest('.top30GameCard');
    if(!card||card.style.display==='none')return;
    const target=directPlayTarget(card);
    if(target)window.location.href=target;
  });
}

function markDirectPlayCards(){
  document.querySelectorAll('.top30GameCard').forEach(card=>{
    if(card.style.display==='none')return;
    const target=directPlayTarget(card);
    if(!target)return;
    card.dataset.directPlay=target;
    card.dataset.touchLaunch='true';
    card.style.cursor='pointer';
  });
}

function installHomepagePublicationGuard(){
  const apply=()=>{
    enforceOfficialCardVisibility();
    markDirectPlayCards();
  };
  const observer=new MutationObserver(apply);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  bindDirectGameLaunch();
  apply();
  refreshCanonicalLifecycle();
  window.setInterval(()=>{
    if(document.hidden)return;
    refreshCanonicalLifecycle();
    apply();
  },5000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshCanonicalLifecycle();apply();}});
}

bindNativeApkInstall();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHomepagePublicationGuard,{once:true});
else installHomepagePublicationGuard();