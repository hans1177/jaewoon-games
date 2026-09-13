import './homepage-enhancements-core.js?v=20260913-artbook-live-sync-1';

function bindNativeApkInstall(){
  const bind=()=>{
    const button=document.getElementById('appInstallBtn');
    const state=document.getElementById('appInstallState');
    if(!button)return;
    button.disabled=false;
    button.textContent='재운컴퍼니 APK 설치';
    if(state)state.textContent='안드로이드 앱 설치 파일을 직접 내려받아.';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href='/downloads/jaewoon-company.apk';
    },true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function isOwnerTestCandidate(game){
  return game?.homepageTestCandidate===true||game?.homepageReviewState==='TEST'||game?.homepageReviewState==='REVISE';
}

async function renderOwnerTestShelf(){
  const hub=document.getElementById('gameHub');
  if(!hub||document.getElementById('ownerGameTestShelf'))return;
  let payload;
  try{
    const response=await fetch(`/game-catalog.json?ownerTest=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)return;
    payload=await response.json();
  }catch{return;}
  const candidates=(payload?.games||[]).filter(isOwnerTestCandidate).filter(game=>game.webPath);
  if(!candidates.length)return;
  const section=document.createElement('section');
  section.id='ownerGameTestShelf';
  section.setAttribute('aria-label','테스트 게임');
  section.style.cssText='margin:0 14px 10px;padding:9px 10px;border:1px solid #e6c66f;border-radius:11px;background:#fff9e8';
  section.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
      <b style="font-size:10px;color:#805b00">테스트 게임</b>
      <span style="font-size:8px;font-weight:850;color:#8b7540">승격 전 · 정식 카드 아님</span>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${candidates.map(game=>`<a href="${escapeHtml(game.webPath)}" style="display:inline-flex;align-items:center;min-height:31px;padding:0 9px;border:1px solid #dfbd62;border-radius:9px;background:#fff;color:#765600;text-decoration:none;font-size:8px;font-weight:1000">${escapeHtml(game.name||game.id)} · 테스트</a>`).join('')}
    </div>`;
  const intro=hub.querySelector('.catalogIntro');
  if(intro)intro.insertAdjacentElement('afterend',section);
  else hub.prepend(section);
}

bindNativeApkInstall();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderOwnerTestShelf,{once:true});
else renderOwnerTestShelf();
