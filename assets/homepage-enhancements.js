// Homepage enhancement layer: removes duplicate tagline, renders published artbook cuts,
// shows evidence-based AI discussion, health scores, and verified rollback display.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getJson=async url=>{try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch{return null;}};

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');style.id='jaewoonEnhancementStyles';style.textContent=`
  .artbookShelf{width:96%;margin:0 auto 12px;border:1px solid rgba(211,233,245,.98);border-radius:20px;background:rgba(255,255,255,.96);box-shadow:0 10px 26px rgba(28,93,138,.16);overflow:hidden;color:#173e59}
  .artbookShelfHead{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;padding:14px 14px 8px}.artbookShelfHead h2{font-family:'Jua',sans-serif;font-size:22px;margin:0;color:#155e9f}.artbookShelfHead span{font-size:8px;color:#718fa4;font-weight:900;text-align:right}
  .artbookEdition{padding:0 14px 15px}.artbookTitle{padding:11px 12px;border-radius:13px;background:#102d42;color:#eef9ff}.artbookTitle small{display:block;color:#83d8ff;font-size:8px;font-weight:1000}.artbookTitle h3{margin:4px 0 4px;font-size:17px}.artbookTitle p{margin:0;color:#d6e7f1;font-size:9px;line-height:1.5;font-weight:780}
  .artbookCuts{display:flex;gap:9px;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 1px 7px;scrollbar-width:thin}.artbookCut{flex:0 0 min(78vw,300px);scroll-snap-align:start;border:1px solid #d5e7f1;border-radius:14px;background:#f8fcff;overflow:hidden}.artbookCut img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#18394d}.artbookCutBody{padding:9px}.artbookCutBody small{font-size:7px;color:#2380b8;font-weight:1000}.artbookCutBody b{display:block;margin-top:3px;font-size:12px;color:#174f74}.artbookCutBody p{margin:4px 0 0;font-size:9px;line-height:1.45;color:#5c7789;font-weight:730}
  .artbookActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}.artbookActions a{display:inline-flex;align-items:center;justify-content:center;min-height:35px;padding:0 10px;border-radius:10px;background:#2387df;color:#fff;text-decoration:none;font-size:9px;font-weight:1000}.artbookActions a.secondary{background:#eaf6fd;color:#17679b;border:1px solid #b8daec}
  .aiDiscussion{margin-top:9px;padding:9px;border-radius:12px;background:#eef7fc}.aiDiscussionHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.aiDiscussionHead b{font-size:10px;color:#17679b}.aiDiscussionHead span{font-size:7px;color:#758e9e}.aiComments{display:grid;gap:5px;margin-top:6px}.aiComment{padding:7px 8px;border-radius:9px;background:#fff;border:1px solid #dcebf3}.aiComment b{display:block;font-size:8px;color:#17689d}.aiComment p{margin:2px 0 0;font-size:8px;line-height:1.4;color:#587487;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.healthBadge{margin-left:auto}.badge.healthHealthy{background:#d9f4e4;color:#197340}.badge.healthWarning{background:#fff0c9;color:#865d00}.badge.healthCritical{background:#ffe0df;color:#9b2d2d}.badge.healthPending{background:#e7edf1;color:#5e7380}.rollbackNotice{display:block;margin-top:5px;padding:5px 6px;border-radius:8px;background:#fff3cd;color:#735800;font-size:7px;font-weight:900}
  @media(max-width:520px){.artbookCut{flex-basis:82vw}.artbookShelfHead{align-items:flex-start}.artbookShelfHead span{max-width:45%}}
  `;document.head.appendChild(style);
}

function removeDuplicateTagline(){document.querySelectorAll('.tagline').forEach(el=>el.remove());}

async function issueComments(issueNumber){
  if(!issueNumber)return[];
  try{const r=await fetch(`https://api.github.com/repos/hans1177/jaewoon-games/issues/${Number(issueNumber)}/comments?per_page=12`,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)return[];const rows=await r.json();return Array.isArray(rows)?rows.slice(-6):[];}catch{return[];}
}

async function renderArtbooks(data){
  const host=document.getElementById('gameHub');if(!host||document.getElementById('gameArtbookShelf'))return;
  const books=(data?.artbooks||[]).filter(x=>x?.published===true).sort((a,b)=>(b.edition||0)-(a.edition||0));
  if(!books.length)return;
  const section=document.createElement('section');section.id='gameArtbookShelf';section.className='artbookShelf';
  section.innerHTML=`<div class="artbookShelfHead"><h2>게임 아트북 · 제작 초안</h2><span>컨셉 · 스토리 · 계획 의도 · 테스트 기록을 최대 10컷으로 축적</span></div>`;
  for(const book of books.slice(0,3)){
    const comments=await issueComments(book.feedback?.issueNumber);
    const article=document.createElement('article');article.className='artbookEdition';
    const cuts=(book.cuts||[]).slice(0,10);
    const discussion=comments.length?comments.map(c=>{
      const body=String(c.body||'');const first=body.split('\n').find(Boolean)||'AI/댓글 의견';
      return `<div class="aiComment"><b>${esc(first.slice(0,70))}</b><p>${esc(body.replace(first,'').trim()||body)}</p></div>`;
    }).join(''):'<div class="aiComment"><b>의견 수집 중</b><p>실제 근거가 생길 때만 부서 의견을 남기도록 설정돼 있어.</p></div>';
    const music=book.music?.youtubeId?`<a class="secondary" href="/artbook.html?id=${encodeURIComponent(book.id)}#music">음악 포함</a>`:'';
    article.innerHTML=`<div class="artbookTitle"><small>${esc(book.gameName)} · EDITION ${esc(book.edition)} · ${esc(book.status||'draft')}</small><h3>${esc(book.title)}</h3><p>${esc(book.intent||book.subtitle||'')}</p></div><div class="artbookCuts">${cuts.map(c=>`<div class="artbookCut"><img src="/${esc(c.image||'assets/mock.webp')}" alt="" loading="lazy"><div class="artbookCutBody"><small>CUT ${esc(c.no)} · ${esc(c.kind||'NOTE')}</small><b>${esc(c.title)}</b><p>${esc(c.body)}</p></div></div>`).join('')}</div><div class="artbookActions"><a href="/artbook.html?id=${encodeURIComponent(book.id)}">전체 아트북 보기</a>${book.feedback?.issueUrl?`<a class="secondary" href="${esc(book.feedback.issueUrl)}" target="_blank" rel="noopener">AI · 댓글 토론</a>`:''}${music}</div><div class="aiDiscussion"><div class="aiDiscussionHead"><b>부서 AI 실제 검토</b><span>근거 없는 역할극 댓글 금지 · 반박/수정 가능</span></div><div class="aiComments">${discussion}</div></div>`;
    section.appendChild(article);
  }
  host.insertAdjacentElement('afterend',section);
}

function decorateCards(catalog,health,baselines){
  const catalogByName=new Map((catalog?.games||[]).map(g=>[g.name,g]));
  const healthById=new Map((health?.games||[]).map(g=>[g.gameId,g]));
  const baselineById=new Map((baselines?.games||[]).map(g=>[g.gameId,g]));
  document.querySelectorAll('.gameCard').forEach(card=>{
    const name=card.querySelector('.artName b')?.textContent?.trim();const meta=catalogByName.get(name);if(!meta)return;
    const h=healthById.get(meta.id);const badges=card.querySelector('.badges');
    if(badges&&!badges.querySelector('.healthBadge')){
      const span=document.createElement('span');span.className='badge healthBadge '+(!h||h.score==null?'healthPending':h.status==='healthy'?'healthHealthy':h.status==='warning'?'healthWarning':'healthCritical');
      span.textContent=!h||h.score==null?'건강 점검 대기':`건강 ${h.score}`;badges.appendChild(span);
    }
    const baseline=baselineById.get(meta.id);if(baseline?.rollbackActive&&baseline?.fallbackDownload){
      const btn=card.querySelector('.cardBtn.primary');if(btn){btn.href=baseline.fallbackDownload;btn.textContent='안정판 APK';btn.removeAttribute('download');}
      const info=card.querySelector('.gameInfo');if(info&&!info.querySelector('.rollbackNotice')){const n=document.createElement('span');n.className='rollbackNotice';n.textContent='최신판 이상 감지 → 마지막 검증 안정판 표시 중';info.appendChild(n);}
    }
  });
}

async function main(){
  installStyles();removeDuplicateTagline();
  const [artbooks,catalog,health,baselines]=await Promise.all([getJson('/game-artbooks.json'),getJson('/game-catalog.json'),getJson('/public-game-health.json'),getJson('/public-release-baselines.json')]);
  await renderArtbooks(artbooks);
  let rounds=0;const timer=setInterval(()=>{decorateCards(catalog,health,baselines);if(++rounds>20)clearInterval(timer);},300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
