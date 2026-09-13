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
      event.preventDefault();event.stopImmediatePropagation();window.location.href='/downloads/jaewoon-company.apk';
    },true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const testCandidate=g=>g?.homepageOfficialCard===false&&(g?.homepageTestCandidate===true||['TEST','REVISE','REBUILD'].includes(String(g?.homepageReviewState||'').toUpperCase()));
async function loadTestCandidates(){
  const rows=[];
  try{const r=await fetch(`/test-game-candidates.json?ts=${Date.now()}`,{cache:'no-store'});if(r.ok){const p=await r.json();for(const x of p.candidates||[])rows.push(x);}}catch{}
  try{const r=await fetch(`/game-catalog.json?ts=${Date.now()}`,{cache:'no-store'});if(r.ok){const p=await r.json();for(const x of p.games||[])if(testCandidate(x))rows.push(x);}}catch{}
  const byId=new Map();for(const row of rows){const id=String(row.id||row.gameId||'').trim();if(id&&!byId.has(id))byId.set(id,row);}return [...byId.values()];
}
function removeOfficialCardsForCandidates(candidates){
  const names=new Set(candidates.map(x=>String(x.name||x.gameName||'').trim()).filter(Boolean));
  if(!names.size)return;
  document.querySelectorAll('.gameCard').forEach(card=>{const name=card.querySelector('.artName b')?.textContent?.trim();if(name&&names.has(name))card.remove();});
}
async function renderCompactTestShelf(){
  const hub=document.getElementById('gameHub');if(!hub||document.getElementById('compactTestGameShelf'))return;
  const candidates=(await loadTestCandidates()).filter(x=>x.webPath||x.testUrl);if(!candidates.length)return;
  removeOfficialCardsForCandidates(candidates);
  const shelf=document.createElement('div');shelf.id='compactTestGameShelf';shelf.setAttribute('aria-label','테스트 게임');
  shelf.style.cssText='margin:0 14px 9px;padding:8px 9px;border:1px solid #e4c36d;border-radius:10px;background:#fff9e8;display:flex;align-items:center;gap:7px;overflow-x:auto';
  shelf.innerHTML=`<b style="flex:0 0 auto;font-size:9px;color:#795600">테스트 게임</b>${candidates.map(g=>`<a href="${esc(g.testUrl||g.webPath)}" style="flex:0 0 auto;padding:6px 8px;border-radius:8px;background:#2488df;color:white;text-decoration:none;font-size:8px;font-weight:900">${esc(g.name||g.gameName||g.id)} · 테스트</a>`).join('')}`;
  const intro=hub.querySelector('.catalogIntro');if(intro)intro.insertAdjacentElement('afterend',shelf);else hub.prepend(shelf);
}
bindNativeApkInstall();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderCompactTestShelf,0),{once:true});else setTimeout(renderCompactTestShelf,0);
