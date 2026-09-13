import './homepage-enhancements-core.js?v=20260913-web80-top30-test-shelf';

function bindNativeApkInstall(){
  const bind=()=>{
    const button=document.getElementById('appInstallBtn');
    const state=document.getElementById('appInstallState');
    if(!button)return;
    button.disabled=false;
    button.textContent='재운컴퍼니 APK 설치';
    if(state)state.textContent='안드로이드 앱 설치 파일을 직접 내려받아.';
    button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();window.location.href='/downloads/jaewoon-company.apk';},true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TEST_SHELF_LIMIT=30;
const TEST_SHELF_MIN_SCORE=80;
const RAW_RUNTIME_CATALOG='https://raw.githubusercontent.com/hans1177/jaewoon-games/company-runtime/game-catalog.json';
const candidateScore=g=>{for(const key of ['strictScore','reviewScore','totalScore','score']){const n=Number(g?.[key]);if(Number.isFinite(n))return n;}return null;};
const webLink=g=>String(g?.testUrl||g?.webPath||'').trim();
const artbookLink=g=>String(g?.artbookUrl||g?.artbookPath||g?.homepageArtbookPath||'').trim();
const noHardFailures=g=>Array.isArray(g?.strictReviewHardFailures)&&g.strictReviewHardFailures.length===0;
const homepageEligible=g=>g?.homepageOfficialCard===false&&g?.homepageTestCandidate===true&&String(g?.homepageTestVerdict||'PASS').toUpperCase()==='PASS'&&candidateScore(g)!==null&&candidateScore(g)>=TEST_SHELF_MIN_SCORE&&noHardFailures(g)&&Boolean(webLink(g))&&Boolean(artbookLink(g));
let officialIds=new Set();
let testRefreshInFlight=false;
async function loadJson(url){try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});if(r.ok)return await r.json();}catch{}return null;}
async function refreshOfficialIds(){const catalog=await loadJson(RAW_RUNTIME_CATALOG);if(!catalog)return;officialIds=new Set((catalog.games||[]).filter(g=>g?.homepageOfficialCard===true||String(g?.productionClass||'').toUpperCase()==='RELEASE_CONFIRMED').map(g=>String(g.id||'').trim()).filter(Boolean));enforceOfficialCardVisibility();}
function enforceOfficialCardVisibility(){document.querySelectorAll('.foldGameCard[data-game-id],.gameCard[data-game-id]').forEach(card=>{const id=String(card.dataset.gameId||'').trim();card.style.display=officialIds.has(id)?'':'none';});document.querySelectorAll('.gameFold').forEach(fold=>{const visible=[...fold.querySelectorAll('.foldGameCard[data-game-id]')].some(card=>card.style.display!=='none');fold.style.display=visible?'':'none';});}
function rankHomepageTestCandidates(candidates){return candidates.filter(homepageEligible).sort((a,b)=>candidateScore(b)-candidateScore(a)||String(b.validatedAt||'').localeCompare(String(a.validatedAt||''))||String(a.name||a.gameName||a.id||'').localeCompare(String(b.name||b.gameName||b.id||''),'ko')).slice(0,TEST_SHELF_LIMIT);}
function directPlayTarget(card){if(!card)return'';const explicit=String(card.dataset?.directPlay||card.dataset?.webPath||'').trim();if(explicit)return explicit;const webAnchor=[...card.querySelectorAll('a[href]')].find(a=>String(a.getAttribute('href')||'').includes('/web-games/')||/web\s*플레이|테스트\s*플레이/i.test(String(a.textContent||'')));return String(webAnchor?.getAttribute('href')||'').trim();}
function bindDirectGameLaunch(){if(document.documentElement.dataset.directGameLaunchBound==='1')return;document.documentElement.dataset.directGameLaunchBound='1';document.addEventListener('click',event=>{const interactive=event.target.closest('a,button,input,select,textarea,label');if(interactive)return;const card=event.target.closest('.gameCard,.foldGameCard,.compactTestGameItem');if(!card)return;const target=directPlayTarget(card);if(!target)return;window.location.href=target;});}
function markDirectPlayCards(){document.querySelectorAll('.gameCard,.foldGameCard').forEach(card=>{const target=directPlayTarget(card);if(!target)return;card.dataset.directPlay=target;card.dataset.touchLaunch='true';card.style.cursor='pointer';});}
async function renderCompactTestShelf(){if(testRefreshInFlight)return;testRefreshInFlight=true;try{const hub=document.getElementById('gameHub');if(!hub)return;const payload=await loadJson('/test-game-candidates.json');const candidates=rankHomepageTestCandidates(payload?.candidates||[]);document.getElementById('compactTestGameShelf')?.remove();if(!candidates.length)return;const shelf=document.createElement('div');shelf.id='compactTestGameShelf';shelf.setAttribute('aria-label','평점 상위 테스트 게임');shelf.style.cssText='margin:0 14px 9px;padding:8px 9px;border:1px solid #e4c36d;border-radius:10px;background:#fff9e8;display:flex;align-items:center;gap:7px;overflow-x:auto';shelf.innerHTML=`<b style="flex:0 0 auto;font-size:9px;color:#795600">테스트 TOP ${candidates.length}<br><small>80점+ · 정식 PASS 전</small></b>${candidates.map(g=>{const name=esc(g.name||g.gameName||g.id);const score=candidateScore(g);const play=esc(webLink(g));return `<span class="compactTestGameItem" data-direct-play="${play}" data-touch-launch="true" style="cursor:pointer;flex:0 0 auto;display:flex;align-items:center;gap:4px;padding:4px 5px;border-radius:8px;background:white;border:1px solid #ead99e"><b style="font-size:8px">${name} · ${score}점</b><a href="${play}" style="padding:5px 7px;border-radius:7px;background:#2488df;color:white;text-decoration:none;font-size:8px;font-weight:900">게임 시작</a><a href="${esc(artbookLink(g))}" style="padding:5px 7px;border-radius:7px;background:#7557c8;color:white;text-decoration:none;font-size:8px;font-weight:900">아트북</a></span>`;}).join('')}`;hub.prepend(shelf);}finally{testRefreshInFlight=false;}}
function installHomepagePublicationGuard(){const observer=new MutationObserver(()=>{enforceOfficialCardVisibility();markDirectPlayCards();});observer.observe(document.documentElement,{subtree:true,childList:true});const refresh=async()=>{await Promise.all([refreshOfficialIds(),renderCompactTestShelf()]);enforceOfficialCardVisibility();markDirectPlayCards();};bindDirectGameLaunch();refresh();window.setInterval(()=>{if(!document.hidden)refresh();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});}
bindNativeApkInstall();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHomepagePublicationGuard,{once:true});else installHomepagePublicationGuard();
