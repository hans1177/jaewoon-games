import './homepage-enhancements-core.js?v=20260914-top30-primary';

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
const TEST_SHELF_LIMIT=30;
const TEST_SHELF_MIN_SCORE=80;
const directPlayTarget=card=>String(card?.dataset?.directPlay||'').trim()||String(card?.querySelector('a[href*="/web-games/"]')?.getAttribute('href')||'').trim();
function enforceOfficialCardVisibility(){
  document.getElementById('compactTestGameShelf')?.remove();
  document.querySelectorAll('#gameHub .gameCard,#gameHub .foldGameCard').forEach(card=>{
    const rank=Number(card.dataset?.top30Rank||0);
    const score=Number(card.dataset?.top30Score||0);
    const canonical=card.classList.contains('top30GameCard')&&card.dataset?.homepageGameSource==='CANONICAL_TOP30'&&rank>=1&&rank<=TEST_SHELF_LIMIT&&score>=TEST_SHELF_MIN_SCORE;
    card.style.display=canonical?'':'none';
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
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHomepagePublicationGuard,{once:true});else installHomepagePublicationGuard();
