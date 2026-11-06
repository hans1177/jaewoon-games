// 파일명: assets/homepage-layout-v2.js
// 역할: 홈 화면의 게임평·프로필·음악 부가영역 접기와 상태 뱃지 정리를 담당한다.
function removeRuntimeBadges(root=document){
  root.querySelectorAll?.('.healthBadge').forEach(el=>el.remove());
}
function installExtrasDetails(){
  if(document.querySelector('.homeExtras'))return;
  const first=document.querySelector('.reviews');
  if(!first)return;
  const nodes=[document.querySelector('.reviews'),document.querySelector('.profile'),document.querySelector('.music')].filter(Boolean);
  const details=document.createElement('details');details.className='homeExtras';
  details.innerHTML='<summary><b>프로필 · 게임평 · 음악</b><small>필요할 때 펼치기</small></summary><div class="homeExtrasBody"></div>';
  first.parentNode.insertBefore(details,first);
  const body=details.querySelector('.homeExtrasBody');
  nodes.forEach(n=>body.appendChild(n));
}
function main(){
  installExtrasDetails();
  removeRuntimeBadges();
  const observer=new MutationObserver(()=>removeRuntimeBadges());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});
else main();
