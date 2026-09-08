// 파일명: assets/homepage-layout-v2.js
// 역할: 완료된 10장 아트북을 홈에 명확히 노출하고, 게임 카드 아트북 바로가기·부가영역 접기를 담당한다.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getJson=async url=>{try{const r=await fetch(`${url}?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch{return null;}};

function installStyles(){
  if(document.getElementById('homepageArtbookStyles'))return;
  const style=document.createElement('style');style.id='homepageArtbookStyles';style.textContent=`
.artbookDirect{grid-column:1/-1;display:flex;min-height:36px;align-items:center;justify-content:center;padding:0 8px;border:1px solid #1f79bd;border-radius:9px;background:#123e5f;color:#fff;text-decoration:none;font-size:8px;font-weight:1000;text-align:center}
.homeArtbooks{padding-bottom:13px}.homeArtbookGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:0 14px 14px}.homeArtbookCard{display:grid;grid-template-columns:120px minmax(0,1fr);min-height:118px;overflow:hidden;border:1px solid #d3e7f2;border-radius:14px;background:#f8fcff;box-shadow:0 5px 14px #3a6f921a}.homeArtbookCard img{width:100%;height:100%;min-height:118px;object-fit:cover;background:#173d55}.homeArtbookBody{min-width:0;padding:10px}.homeArtbookBody small{display:block;color:#177143;font-size:8px;font-weight:1000}.homeArtbookBody b{display:block;margin-top:4px;color:#155e9f;font-size:15px}.homeArtbookBody p{margin:5px 0 8px;color:#59778a;font-size:8px;font-weight:800;line-height:1.45}.homeArtbookBody a{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 10px;border-radius:9px;background:#2488df;color:#fff;text-decoration:none;font-size:8px;font-weight:1000}.homeArtbookEmpty{grid-column:1/-1;padding:16px;border:1px dashed #bdd4e2;border-radius:12px;background:#f8fcff;color:#67869b;text-align:center;font-size:9px;font-weight:850}
@media(max-width:720px){.homeArtbookGrid{grid-template-columns:1fr}.homeArtbookCard{grid-template-columns:105px minmax(0,1fr)}}
`;
  document.head.appendChild(style);
}

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

function latestCompletedArtbooks(registry){
  const map=new Map();
  for(const book of registry?.artbooks||[]){
    if(!book?.gameId||book.published!==true||book.homepageVisible!==true||book.status!=='completed-artbook'||!Array.isArray(book.cuts)||book.cuts.length!==10||book.postprocess?.complete!==true)continue;
    const prev=map.get(book.gameId);
    if(!prev||Number(book.edition||0)>Number(prev.edition||0)||String(book.createdAt||'')>String(prev.createdAt||''))map.set(book.gameId,book);
  }
  return map;
}

function installCompletedArtbooks(catalog,registry){
  const completed=latestCompletedArtbooks(registry);
  let section=document.getElementById('completedArtbooks');
  if(!section){
    section=document.createElement('section');section.className='panel homeArtbooks';section.id='completedArtbooks';
    section.innerHTML='<div class="sectionHead"><h2>완료된 아트북</h2><span>후처리 통과 · 정확히 10/10장</span></div><div class="homeArtbookGrid" id="completedArtbookGrid"></div>';
    const company=document.querySelector('.company');const anchor=company||document.querySelector('.reviews');
    if(anchor)anchor.parentNode.insertBefore(section,anchor);else document.querySelector('main')?.appendChild(section);
  }
  const list=section.querySelector('#completedArtbookGrid');if(!list)return;
  const catalogById=new Map((catalog?.games||[]).map(g=>[g.id,g]));
  const books=[...completed.values()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))||Number(b.edition||0)-Number(a.edition||0));
  if(!books.length){list.innerHTML='<div class="homeArtbookEmpty">완료된 10장 아트북이 아직 없어.</div>';return;}
  list.innerHTML=books.map(book=>{const meta=catalogById.get(book.gameId)||{};const cover=String(book.cuts?.[0]?.image||meta.image||'assets/mock.webp');const src=cover.startsWith('/')?cover:`/${cover}`;return `<article class="homeArtbookCard"><img src="${esc(src)}" alt="" loading="lazy"><div class="homeArtbookBody"><small>완료 · 10/10장 · EDITION ${esc(book.edition||1)}</small><b>${esc(book.title||book.gameName||meta.name||book.gameId)}</b><p>${esc(book.subtitle||book.intent||'5개 부서 통합 아트북')}</p><a href="/artbook.html?id=${encodeURIComponent(book.id)}">아트북 보기</a></div></article>`;}).join('');
}

function addArtbookButtons(catalog,registry){
  const byName=new Map((catalog?.games||[]).map(g=>[g.name,g]));
  const completed=latestCompletedArtbooks(registry);
  document.querySelectorAll('.gameCard').forEach(card=>{
    removeRuntimeBadges(card);
    const name=card.querySelector('.artName b')?.textContent?.trim();const game=byName.get(name);if(!game)return;
    const actions=card.querySelector('.cardActions');if(!actions)return;
    const old=actions.querySelector('.artbookDirect');const book=completed.get(game.id);
    if(!book){old?.remove();return;}
    if(old){old.href=`/artbook.html?id=${encodeURIComponent(book.id)}`;old.textContent='완료 아트북 · 10/10장';return;}
    const link=document.createElement('a');link.className='artbookDirect';link.href=`/artbook.html?id=${encodeURIComponent(book.id)}`;link.textContent='완료 아트북 · 10/10장';actions.appendChild(link);
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
  installStyles();installExtrasDetails();removeRuntimeBadges();
  const [catalog,queue,registry]=await Promise.all([getJson('/game-catalog.json'),getJson('/artbook-submission-queue.json'),getJson('/game-artbooks.json')]);
  installCompletedArtbooks(catalog,registry);
  const refresh=()=>{removeRuntimeBadges();addArtbookButtons(catalog,registry);rebuildArtbookList(catalog,queue);};
  refresh();
  const observer=new MutationObserver(refresh);observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
