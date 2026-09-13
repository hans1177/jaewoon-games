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
const TEST_SHELF_LIMIT=20;
const testCandidate=g=>g?.homepageOfficialCard===false&&(g?.homepageTestCandidate===true||['TEST','REVISE','REBUILD'].includes(String(g?.homepageReviewState||'').toUpperCase()));
const candidateScore=g=>{
  for(const key of ['strictScore','reviewScore','totalScore','score']){
    const n=Number(g?.[key]);if(Number.isFinite(n))return n;
  }
  return null;
};
const webLink=g=>String(g?.testUrl||g?.webPath||'').trim();
const artbookLink=g=>String(g?.artbookUrl||g?.artbookPath||'').trim();
const homepageEligible=g=>testCandidate(g)&&candidateScore(g)!==null&&Boolean(webLink(g))&&Boolean(artbookLink(g));
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
function rankHomepageTestCandidates(candidates){
  return candidates.filter(homepageEligible).sort((a,b)=>{
    const scoreDelta=candidateScore(b)-candidateScore(a);if(scoreDelta)return scoreDelta;
    return String(a.name||a.gameName||a.id||'').localeCompare(String(b.name||b.gameName||b.id||''),'ko');
  }).slice(0,TEST_SHELF_LIMIT);
}
async function renderCompactTestShelf(){
  const hub=document.getElementById('gameHub');if(!hub||document.getElementById('compactTestGameShelf'))return;
  const allCandidates=await loadTestCandidates();
  removeOfficialCardsForCandidates(allCandidates);
  const candidates=rankHomepageTestCandidates(allCandidates);if(!candidates.length)return;
  const shelf=document.createElement('div');shelf.id='compactTestGameShelf';shelf.setAttribute('aria-label','평점 상위 테스트 게임');
  shelf.style.cssText='margin:0 14px 9px;padding:8px 9px;border:1px solid #e4c36d;border-radius:10px;background:#fff9e8;display:flex;align-items:center;gap:7px;overflow-x:auto';
  shelf.innerHTML=`<b style="flex:0 0 auto;font-size:9px;color:#795600">테스트 TOP ${candidates.length}</b>${candidates.map(g=>{const name=esc(g.name||g.gameName||g.id);const score=candidateScore(g);return `<span style="flex:0 0 auto;display:flex;align-items:center;gap:4px;padding:4px 5px;border-radius:8px;background:white;border:1px solid #ead99e"><b style="font-size:8px">${name} ${score}</b><a href="${esc(webLink(g))}" style="padding:5px 7px;border-radius:7px;background:#2488df;color:white;text-decoration:none;font-size:8px;font-weight:900">웹게임</a><a href="${esc(artbookLink(g))}" style="padding:5px 7px;border-radius:7px;background:#7557c8;color:white;text-decoration:none;font-size:8px;font-weight:900">아트북</a></span>`;}).join('')}`;
  const intro=hub.querySelector('.catalogIntro');if(intro)intro.insertAdjacentElement('afterend',shelf);else hub.prepend(shelf);
}
bindNativeApkInstall();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderCompactTestShelf,0),{once:true});else setTimeout(renderCompactTestShelf,0);
