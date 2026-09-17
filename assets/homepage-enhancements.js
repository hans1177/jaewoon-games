// 파일명: assets/homepage-enhancements.js
// 역할: 서버 점수 TOP30 홈페이지 표시와 Android 설치/게임 직접 실행을 보조한다.
import './homepage-enhancements-core.js?v=20260917-score-top30';

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

const directPlayTarget=card=>String(card?.dataset?.directPlay||'').trim()||String(card?.querySelector('a[href*="/web-games/"]')?.getAttribute('href')||'').trim();

function updateTop30Count(){
  const top30=document.getElementById('homeTop30GameCenter');
  if(!top30)return;
  const cards=[...top30.querySelectorAll('.top30GameCard')];
  const label=top30.querySelector('.top30Count');
  if(label)label.textContent=`${cards.length} / 30`;
  document.documentElement.dataset.homeTop30Count=String(cards.length);
  document.documentElement.dataset.homePrimaryGameSource='SCORE_TOP30';
}

function bindDirectGameLaunch(){
  if(document.documentElement.dataset.directGameLaunchBound==='1')return;
  document.documentElement.dataset.directGameLaunchBound='1';
  document.addEventListener('click',event=>{
    if(event.target.closest('a,button,input,select,textarea,label'))return;
    const card=event.target.closest('.top30GameCard');
    if(!card)return;
    const target=directPlayTarget(card);
    if(target)window.location.href=target;
  });
}

function markDirectPlayCards(){
  document.querySelectorAll('.top30GameCard').forEach(card=>{
    const target=directPlayTarget(card);
    if(!target)return;
    card.dataset.directPlay=target;
    card.dataset.touchLaunch='true';
    card.style.cursor='pointer';
  });
}

function installHomepagePublicationGuard(){
  const apply=()=>{
    document.getElementById('homeDevelopmentGameCenter')?.remove();
    document.getElementById('homeServerGameCenter')?.remove();
    document.getElementById('compactTestGameShelf')?.remove();
    markDirectPlayCards();
    updateTop30Count();
  };
  const observer=new MutationObserver(apply);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  bindDirectGameLaunch();
  apply();
}

bindNativeApkInstall();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHomepagePublicationGuard,{once:true});
else installHomepagePublicationGuard();