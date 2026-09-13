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
  if(game?.homepageTestCandidate===true)return true;
  if(game?.homepageReviewState==='TEST'||game?.homepageReviewState==='REVISE')return true;
  return game?.productionClass==='DEVELOPMENT_CONFIRMED'&&game?.homepageWebPlayable===true&&game?.webPurpose==='PUBLIC_PLAYABLE_COMPANION';
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
  const candidates=(payload?.games||[]).filter(isOwnerTestCandidate).filter(game=>game.webPath&&game.homepageWebPlayable===true);
  if(!candidates.length)return;
  const section=document.createElement('section');
  section.id='ownerGameTestShelf';
  section.setAttribute('aria-label','Owner 게임 테스트');
  section.style.cssText='margin:0 14px 12px;padding:11px;border:2px solid #e6b84f;border-radius:14px;background:#fff9e8;box-shadow:0 5px 14px #7b5b1518';
  section.innerHTML=`
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-bottom:8px">
      <div><b style="display:block;font-family:Jua,system-ui;font-size:18px;color:#805b00">Owner 테스트 게임</b><span style="display:block;margin-top:2px;font-size:8px;font-weight:850;color:#8b7540">정식 공개 승인 전 직접 플레이·반려 판단용 · PASS로 간주하지 않음</span></div>
      <span style="font-size:8px;font-weight:1000;color:#9a6900">${candidates.length}개 테스트</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px">
      ${candidates.map(game=>`<article style="padding:9px;border:1px solid #ecd28e;border-radius:11px;background:#fff">
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:5px"><span class="badge stateTest">OWNER TEST</span><span class="badge platformWeb">WEB QA</span></div>
        <b style="display:block;font-size:11px;color:#28516c">${escapeHtml(game.name||game.id)}</b>
        <small style="display:block;min-height:30px;margin:4px 0 7px;color:#72808b;font-size:8px;line-height:1.4">30분 플레이 · 설계 일치 · 개연성 · 카테고리 · 구현 완성도 직접 확인</small>
        <a class="cardBtn primary" href="${escapeHtml(game.webPath)}" style="width:100%">테스트 플레이</a>
      </article>`).join('')}
    </div>`;
  const intro=hub.querySelector('.catalogIntro');
  if(intro)intro.insertAdjacentElement('afterend',section);
  else hub.prepend(section);
}

bindNativeApkInstall();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderOwnerTestShelf,{once:true});
else renderOwnerTestShelf();
