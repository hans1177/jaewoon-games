// 파일명: assets/homepage-layout-v2.js
// 역할: 게임 카드 아트북 바로가기, 실행상태 배지 제거, 홈 하단 부가영역 접기를 담당한다.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getJson=async url=>{try{const r=await fetch(`${url}?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch{return null;}};

function removeRuntimeBadges(root=document){root.querySelectorAll?.('.healthBadge').forEach(el=>el.remove());}

function installExtrasDetails(){
  if(document.querySelector('.homeExtras'))return;
  const first=document.querySelector('.reviews');
  if(!first)return;
  const nodes=[document.querySelector('.reviews'),document.querySelector('.profile'),document.querySelector('.music')].filter(Boolean);
  const details=document.createElement('details');details.className='homeExtras';
  details.innerHTML='<summary><b>프로필 · 게임평 · 음악</b><small>필요할 때 펼치기</small></summary><div class="homeExtrasBody"></div>';
  first.parentNode.insertBefore(details,first);const body=details.querySelector('.homeExtrasBody');nodes.forEach(n=>body.appendChild(n));
}

function addArtbookButtons(catalog){
  const byName=new Map((catalog?.games||[]).map(g=>[g.name,g]));
  document.querySelectorAll('.gameCard').forEach(card=>{
    removeRuntimeBadges(card);
    const name=card.querySelector('.artName b')?.textContent?.trim();const game=byName.get(name);if(!game)return;
    const actions=card.querySelector('.cardActions');if(!actions||actions.querySelector('.artbookDirect'))return;
    const link=document.createElement('a');link.className='artbookDirect';link.href=`/artbook.html?game=${encodeURIComponent(game.id)}`;link.textContent='아트북 보기';actions.appendChild(link);
  });
}

function rebuildArtbookList(catalog,queue){
  const details=document.getElementById('preproductionArtbooks');if(!details)return;
  const list=details.querySelector('.preArtbookList');if(!list)return;
  const byId=new Map((catalog?.games||[]).map(g=>[g.id,g]));
  const games=queue?.games||[];
  list.innerHTML=games.map(g=>{const meta=byId.get(g.gameId)||{};const ready=Array.isArray(g.sectionsReady)?g.sectionsReady.length:0;const reviews=Array.isArray(g.reviewsReady)?g.reviewsReady.length:0;const label=g.status?.includes('ASSEMBLED')?'통합 초안':'아트북 제작중';return `<div class="preArtbookRow"><div><b>${esc(meta.name||g.name||g.gameId)}</b><small>${esc(g.styleProfile||'게임별 고유 아트북')} · 부서 ${ready}/5 · 협업 ${reviews}/5</small></div><a class="preArtbookLink" href="/artbook.html?game=${encodeURIComponent(g.gameId)}">${label} 보기</a></div>`;}).join('');
  const summary=details.querySelector('summary small');if(summary)summary.textContent=`전체 ${games.length}개 게임 · 진행 중 아트북 포함`;
}

async function main(){
  installExtrasDetails();removeRuntimeBadges();
  const [catalog,queue]=await Promise.all([getJson('/game-catalog.json'),getJson('/artbook-submission-queue.json')]);
  const refresh=()=>{removeRuntimeBadges();addArtbookButtons(catalog);rebuildArtbookList(catalog,queue);};
  refresh();
  const observer=new MutationObserver(refresh);observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
