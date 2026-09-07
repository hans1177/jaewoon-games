// Homepage enhancement layer: duplicate tagline cleanup, concise development-artbook popup,
// public-game runtime check badges, compact artbook listing, and verified rollback display.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getJson=async url=>{try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch{return null;}};

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');style.id='jaewoonEnhancementStyles';style.textContent=`
  .healthBadge{margin-left:auto}.badge.healthHealthy{background:#d9f4e4;color:#197340}.badge.healthWarning{background:#fff0c9;color:#865d00}.badge.healthCritical{background:#ffe0df;color:#9b2d2d}.badge.healthPending{background:#e7edf1;color:#5e7380}.rollbackNotice{display:block;margin-top:5px;padding:5px 6px;border-radius:8px;background:#fff3cd;color:#735800;font-size:7px;font-weight:900}
  .artbookBtn{display:flex;min-height:34px;align-items:center;justify-content:center;padding:0 7px;border:1px solid #a7cce3;border-radius:9px;background:#102d42;color:#fff;font-size:8px;font-weight:1000;cursor:pointer}
  .artbookModal{position:fixed;inset:0;z-index:9999;background:#07131dd9;display:flex;align-items:center;justify-content:center;padding:14px}.artbookModal[hidden]{display:none}.artbookModalCard{width:min(94vw,760px);max-height:88dvh;overflow:auto;border-radius:18px;background:#f8fcff;box-shadow:0 20px 70px #0008;color:#173e59}.artbookModalHead{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 14px;background:#102d42;color:#fff}.artbookModalHead small{display:block;color:#90dbff;font-size:8px;font-weight:1000}.artbookModalHead h2{margin:3px 0 0;font-size:19px}.artbookClose{width:38px;height:38px;border:0;border-radius:50%;background:#ffffff18;color:#fff;font-size:24px}.artbookModalBody{padding:12px}.artbookLead{margin:0 0 10px;padding:10px 11px;border-radius:12px;background:#eaf6fd;font-size:10px;line-height:1.55;font-weight:800}.artbookStory{margin-bottom:10px;padding:11px;border-radius:12px;background:#fff;border:1px solid #d5e7f1}.artbookStory b{display:block;color:#155e9f;font-size:11px}.artbookStory p{margin:4px 0 0;font-size:10px;line-height:1.55;color:#506f82}.artbookCuts{display:flex;gap:9px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:7px}.artbookCut{flex:0 0 min(78vw,290px);scroll-snap-align:start;border:1px solid #d5e7f1;border-radius:13px;background:#fff;overflow:hidden}.artbookCut img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#18394d}.artbookCut div{padding:8px}.artbookCut small{font-size:7px;color:#2380b8;font-weight:1000}.artbookCut b{display:block;margin-top:2px;font-size:11px}.artbookCut p{margin:4px 0 0;font-size:8px;line-height:1.45;color:#5c7789}.deptSummary{margin-top:10px;padding:10px;border-radius:12px;background:#eef7fc}.deptSummary h3{margin:0 0 6px;font-size:11px;color:#17679b}.deptRow{display:grid;grid-template-columns:64px 1fr;gap:7px;padding:5px 0;border-top:1px solid #d7e8f1;font-size:8px;line-height:1.4}.deptRow:first-of-type{border-top:0}.deptRow b{color:#17679b}.artbookWaiting{padding:18px 10px;text-align:center;color:#607c8e;font-size:10px;line-height:1.6}.artbookLinks{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.artbookLinks a{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 10px;border-radius:9px;background:#2387df;color:#fff;text-decoration:none;font-size:8px;font-weight:1000}
  .preArtbookDetails{width:96%;margin:0 auto 12px;border:1px solid rgba(211,233,245,.98);border-radius:16px;background:rgba(255,255,255,.95);box-shadow:0 8px 20px rgba(28,93,138,.12);overflow:hidden}.preArtbookDetails summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:50px;padding:10px 13px;color:#155e9f}.preArtbookDetails summary::-webkit-details-marker{display:none}.preArtbookDetails summary b{font-size:13px}.preArtbookDetails summary small{font-size:7px;color:#708c9f;font-weight:900;text-align:right}.preArtbookDetails[open] summary{border-bottom:1px solid #d9e9f2}.preArtbookList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:9px}.preArtbookRow{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 10px;border:1px solid #deebf2;border-radius:11px;background:#f8fcff}.preArtbookRow b{display:block;font-size:9px;color:#245f83}.preArtbookRow small{display:block;margin-top:2px;font-size:7px;line-height:1.35;color:#7892a3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preArtbookState{font-size:7px;font-weight:1000;color:#708797;white-space:nowrap}.preArtbookLink{display:flex;align-items:center;justify-content:center;min-height:28px;padding:0 8px;border-radius:8px;background:#217fc1;color:#fff;text-decoration:none;font-size:7px;font-weight:1000;white-space:nowrap}
  @media(max-width:520px){.artbookModal{padding:8px}.artbookModalCard{width:98vw;max-height:92dvh}.artbookCut{flex-basis:82vw}.preArtbookList{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
}

function removeDuplicateTagline(){document.querySelectorAll('.tagline').forEach(el=>el.remove());}

function createArtbookModal(){
  if(document.getElementById('developmentArtbookModal'))return document.getElementById('developmentArtbookModal');
  const modal=document.createElement('div');modal.id='developmentArtbookModal';modal.className='artbookModal';modal.hidden=true;
  modal.innerHTML='<div class="artbookModalCard" role="dialog" aria-modal="true" aria-labelledby="developmentArtbookTitle"><div class="artbookModalHead"><div><small>하루 1권 · 5개 부서 협업</small><h2 id="developmentArtbookTitle">게임 아트북</h2></div><button class="artbookClose" type="button" aria-label="닫기">×</button></div><div class="artbookModalBody" id="developmentArtbookBody"></div></div>';
  document.body.appendChild(modal);
  const close=()=>{modal.hidden=true;document.body.style.overflow='';};
  modal.querySelector('.artbookClose').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
  return modal;
}

const roleNames={planning:'기획',development:'개발',qa:'QA',graphics:'그래픽',balance:'밸런스'};
function latestBookFor(artbooks,gameId){return (artbooks?.artbooks||[]).filter(b=>b.gameId===gameId&&b.published===true).sort((a,b)=>(b.edition||0)-(a.edition||0))[0]||null;}
function submissionsFor(artbooks,gameId){const rows=[...(artbooks?.dailySubmissions||[]),...(artbooks?.weeklySubmissions||[])];return rows.filter(s=>s.gameId===gameId);}

function openArtbook(meta,book,submissions){
  const modal=createArtbookModal();const title=modal.querySelector('#developmentArtbookTitle');const body=modal.querySelector('#developmentArtbookBody');title.textContent=`${meta.name} · 게임 아트북`;
  const latestByRole=new Map();for(const s of submissions){const prev=latestByRole.get(s.role||s.department);const role=s.role||s.department;if(role&&(!prev||String(s.date||s.week||'')>String(prev.date||prev.week||'')))latestByRole.set(role,s);}
  const deptRows=['planning','development','qa','graphics','balance'].map(role=>{const s=latestByRole.get(role);return `<div class="deptRow"><b>${roleNames[role]}</b><span>${s?esc(s.headline||s.status||'제출됨'):'부서 제출 대기'}</span></div>`;}).join('');
  if(!book){body.innerHTML=`<p class="artbookLead">이 게임은 아트북 단계야. 기획·개발·QA·그래픽·밸런스 부서가 자기 파트만 직접 제출하고, 총괄은 다섯 파트가 모두 모인 뒤 새 내용을 만들지 않고 한 권으로 묶어.</p><div class="artbookStory"><b>스토리 우선 규칙</b><p>캐릭터·몬스터·보스·배경·전투·성장이 세계관과 인과관계로 연결되지 않으면 READY 처리하지 않아.</p></div><div class="deptSummary"><h3>부서 제출 상태</h3>${deptRows}</div><div class="artbookWaiting">아직 새 정책 기준으로 편집 완료된 통합 아트북이 없어.<br>실제 5개 부서 제출이 모이면 최대 10컷으로 표시돼.</div>`;}
  else{
    const cuts=(book.cuts||[]).slice(0,10);const story=book.storySummary||book.story||book.intent||'';
    const links=`${book.feedback?.issueUrl?`<a href="${esc(book.feedback.issueUrl)}" target="_blank" rel="noopener">댓글·근거 보기</a>`:''}${book.music?.url?`<a href="${esc(book.music.url)}" target="_blank" rel="noopener">음악</a>`:''}`;
    body.innerHTML=`<p class="artbookLead">${esc(book.subtitle||book.intent||'5개 부서 제출을 총괄이 조립한 게임 아트북')}</p>${story?`<div class="artbookStory"><b>스토리 / 세계관</b><p>${esc(story)}</p></div>`:''}<div class="artbookCuts">${cuts.map(c=>`<div class="artbookCut"><img src="/${esc(c.image||'assets/mock.webp')}" alt="" loading="lazy"><div><small>CUT ${esc(c.no)} · ${esc(c.kind||'CONCEPT')}</small><b>${esc(c.title||'')}</b><p>${esc(c.body||'')}</p></div></div>`).join('')}</div><div class="deptSummary"><h3>부서별 핵심 제출</h3>${deptRows}</div>${links?`<div class="artbookLinks">${links}</div>`:''}`;
  }
  modal.hidden=false;document.body.style.overflow='hidden';
}

function installPreproductionArtbooks(catalog,artbooks,queue){
  if(document.getElementById('preproductionArtbooks'))return;
  const target=document.getElementById('gameHub')?.closest('.panel')||document.querySelector('.panel');if(!target)return;
  const catalogById=new Map((catalog?.games||[]).map(g=>[g.id,g]));
  const books=(artbooks?.artbooks||[]).filter(b=>b?.published===true);
  const latestByGame=new Map();for(const book of books){const prev=latestByGame.get(book.gameId);if(!prev||(book.edition||0)>(prev.edition||0))latestByGame.set(book.gameId,book);}
  const rows=(queue?.games||[]).filter(g=>g.gameId!=='daechung-rpg');
  const details=document.createElement('details');details.id='preproductionArtbooks';details.className='preArtbookDetails';
  const publishedCount=rows.filter(g=>latestByGame.has(g.gameId)).length;
  const body=rows.length?rows.map(g=>{const meta=catalogById.get(g.gameId)||{};const book=latestByGame.get(g.gameId);const state=book?'아트북 공개':g.status==='DAILY_TARGET_NOW'?'오늘 작업중':'아트북 준비중';const action=book?`<a class="preArtbookLink" href="/artbook.html?id=${encodeURIComponent(book.id)}">아트북 보기</a>`:`<span class="preArtbookState">${esc(state)}</span>`;return `<div class="preArtbookRow"><div><b>${esc(meta.name||g.name||g.gameId)}</b><small>${esc(g.styleProfile||'게임별 고유 아트북 형식')}</small></div>${action}</div>`;}).join(''):'<div class="artbookWaiting">등록된 제작 전 아트북 대상이 없어.</div>';
  details.innerHTML=`<summary><b>다른 게임 아트북</b><small>접어서 홈페이지 길이 최소화 · 공개 ${publishedCount}권 / 대상 ${rows.length}개</small></summary><div class="preArtbookList">${body}</div>`;
  target.insertAdjacentElement('afterend',details);
}

function decorateCards(catalog,status,artbooks,health,baselines){
  const catalogByName=new Map((catalog?.games||[]).map(g=>[g.name,g]));
  const projectById=new Map((status?.projects||[]).map(p=>[p.gameId||p.id,p]));
  const healthById=new Map((health?.games||[]).map(g=>[g.gameId,g]));
  const baselineById=new Map((baselines?.games||[]).map(g=>[g.gameId,g]));
  document.querySelectorAll('.gameCard').forEach(card=>{
    const name=card.querySelector('.artName b')?.textContent?.trim();const meta=catalogByName.get(name);if(!meta)return;
    const h=healthById.get(meta.id);const badges=card.querySelector('.badges');
    if(badges&&!badges.querySelector('.healthBadge')){const span=document.createElement('span');const runtimeLabel=!h||h.score==null?'웹 실행 점검대기':h.status==='healthy'?'웹 실행 양호':h.status==='warning'?'웹 실행 주의':'웹 실행 오류';span.className='badge healthBadge '+(!h||h.score==null?'healthPending':h.status==='healthy'?'healthHealthy':h.status==='warning'?'healthWarning':'healthCritical');span.textContent=runtimeLabel;span.title='게임 완성도 평가가 아닌 페이지 실행·오류·모바일·리소스 점검 상태';badges.appendChild(span);}
    const baseline=baselineById.get(meta.id);if(baseline?.rollbackActive&&baseline?.fallbackDownload){const btn=card.querySelector('.cardBtn.primary');if(btn){btn.href=baseline.fallbackDownload;btn.textContent='안정판 APK';btn.removeAttribute('download');}const info=card.querySelector('.gameInfo');if(info&&!info.querySelector('.rollbackNotice')){const n=document.createElement('span');n.className='rollbackNotice';n.textContent='최신판 이상 감지 → 마지막 검증 안정판 표시 중';info.appendChild(n);}}
    const project=projectById.get(meta.id);const stage=String(project?.stage||'').toLowerCase();const approvedDev=meta.id==='daechung-rpg'&&project&&!['release','done'].includes(stage);
    const actions=card.querySelector('.cardActions');if(approvedDev&&actions&&!actions.querySelector('.artbookBtn')){const b=document.createElement('button');b.type='button';b.className='artbookBtn';b.textContent='개발 아트북';b.onclick=()=>openArtbook(meta,latestBookFor(artbooks,meta.id),submissionsFor(artbooks,meta.id));actions.appendChild(b);}
  });
}

async function main(){
  installStyles();removeDuplicateTagline();createArtbookModal();
  const [catalog,status,artbooks,health,baselines,queue]=await Promise.all([getJson('/game-catalog.json'),getJson('/company-status.json'),getJson('/game-artbooks.json'),getJson('/public-game-health.json'),getJson('/public-release-baselines.json'),getJson('/artbook-submission-queue.json')]);
  installPreproductionArtbooks(catalog,artbooks,queue);
  let rounds=0;const timer=setInterval(()=>{decorateCards(catalog,status,artbooks,health,baselines);if(++rounds>20)clearInterval(timer);},300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
