// 파일명: assets/homepage-enhancements.js
// 역할: 홈페이지 게임센터의 집중도를 높이고 검증된 안정판 롤백 링크를 표시한다.
// 원칙: 아트북 내부 평가는 게임 카드에 반복 노출하지 않고 아트북 상세 팝업에서 확인한다.
const getJson=async url=>{try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch{return null;}};

let focusMode='active';
const FOCUS_LABELS={active:'지금 하는 게임',all:'전체 게임',archive:'Web 보관'};

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='jaewoonEnhancementStyles';
  style.textContent=`
.rollbackNotice{display:block;margin-top:7px;padding:7px 8px;border-radius:8px;background:#fff3cd;color:#735800;font-size:9px;font-weight:900;line-height:1.4}
.gameFocusBar{display:flex;gap:6px;padding:0 14px 9px;overflow-x:auto;scrollbar-width:none}.gameFocusBar::-webkit-scrollbar{display:none}.gameFocusBtn{flex:0 0 auto;min-height:38px;padding:0 13px;border:1px solid #b7d6e8;border-radius:11px;background:#f7fbfe;color:#54758a;font-size:9px;font-weight:1000;cursor:pointer}.gameFocusBtn.on{border-color:#176ea8;background:#155f91;color:#fff;box-shadow:0 5px 13px #175d8b28}.gameFocusBtn[data-focus="active"].on{background:#126f69;border-color:#126f69}.gameCard.focusActive{border-color:#9dccdf;box-shadow:0 7px 18px #2b719126}.gameCard[hidden]{display:none!important}.badges .statePrimary{order:-2;min-height:23px;padding:0 8px;font-size:8px}.badges .platformSecondary{opacity:.72}.gameCard.cardCompact .stageLine,.gameCard.cardCompact .progressTrack,.gameCard.cardCompact .progressText{display:none}.gameCard.cardCompact .gameInfo p{min-height:0}.gameCard.cardCompact .cardActions{grid-template-columns:1fr}.gameCard.cardCompact .cardBtn.off{display:none}.gameCenterFocusNote{margin:0 14px 9px;padding:8px 10px;border-radius:10px;background:#e7f5fb;color:#2b6885;font-size:8px;font-weight:850;line-height:1.45}
@media(max-width:720px){.gameFocusBar{padding-left:10px;padding-right:10px}.gameFocusBtn{min-height:40px;font-size:9px}.gameCenterFocusNote{margin-left:10px;margin-right:10px}}
`;
  document.head.appendChild(style);
}

function removeLegacyRuntimeBadges(){
  document.querySelectorAll('.healthBadge,.healthHealthy,.healthWarning,.healthCritical,.healthPending').forEach(el=>el.remove());
}

function applyVerifiedRollback(catalog,baselines){
  const byName=new Map((catalog?.games||[]).map(g=>[g.name,g]));
  const baselineById=new Map((baselines?.games||[]).map(g=>[g.gameId,g]));
  document.querySelectorAll('.gameCard').forEach(card=>{
    const name=card.querySelector('.artName b')?.textContent?.trim();
    const meta=byName.get(name);
    if(!meta)return;
    const baseline=baselineById.get(meta.id);
    if(!baseline?.rollbackActive||!baseline?.fallbackDownload)return;
    const btn=card.querySelector('.cardBtn.primary');
    if(btn){btn.href=baseline.fallbackDownload;btn.textContent='안정판 APK';btn.removeAttribute('download');}
    const info=card.querySelector('.gameInfo');
    if(info&&!info.querySelector('.rollbackNotice')){
      const note=document.createElement('span');
      note.className='rollbackNotice';
      note.textContent='최신판 이상 감지 → 마지막 검증 안정판 표시 중';
      info.appendChild(note);
    }
  });
}

function normalizeGameCard(card){
  const badges=card.querySelector('.badges');
  if(!badges)return;
  const state=badges.querySelector('.stateDev,.stateTest,.stateRelease,.stateArchive,.stateReview');
  const unity=badges.querySelector('.platformUnity');
  const web=badges.querySelector('.platformWeb');
  if(state){state.classList.add('statePrimary');if(badges.firstElementChild!==state)badges.prepend(state);}
  if(unity)unity.classList.add('platformSecondary');
  if(web){
    web.classList.add('platformSecondary');
    if(unity)web.hidden=true;
  }
  const isActive=Boolean(card.querySelector('.stateDev,.stateTest'));
  const isArchive=Boolean(card.querySelector('.stateArchive'));
  card.classList.toggle('focusActive',isActive);
  card.classList.toggle('cardCompact',!unity||isArchive);
  if(isArchive){
    const webBtn=[...card.querySelectorAll('.cardBtn')].find(x=>/Web 플레이/.test(x.textContent||''));
    if(webBtn){webBtn.textContent='Web 보관판 플레이';webBtn.classList.add('primary');}
  }
}

function cardMatchesFocus(card){
  if(focusMode==='all')return true;
  if(focusMode==='archive')return Boolean(card.querySelector('.stateArchive'));
  return Boolean(card.querySelector('.stateDev,.stateTest'));
}

function updateFocusButtons(){
  document.querySelectorAll('.gameFocusBtn').forEach(btn=>{
    const on=btn.dataset.focus===focusMode;
    btn.classList.toggle('on',on);
    btn.setAttribute('aria-pressed',on?'true':'false');
  });
}

function applyGameCenterFocus(){
  const grid=document.getElementById('gameGrid');
  if(!grid)return;
  const cards=[...grid.querySelectorAll('.gameCard')];
  let visible=0;
  for(const card of cards){
    normalizeGameCard(card);
    const show=cardMatchesFocus(card);
    card.hidden=!show;
    if(show)visible++;
  }
  const count=document.getElementById('resultCount');
  if(count&&cards.length)count.textContent=`${visible}개 표시 · ${FOCUS_LABELS[focusMode]||'게임'}`;
}

function setFocus(mode){
  focusMode=FOCUS_LABELS[mode]?mode:'active';
  updateFocusButtons();
  applyGameCenterFocus();
}

function installGameCenterFocus(){
  const hub=document.getElementById('gameHub');
  const tools=hub?.querySelector('.tools');
  if(!hub||!tools||hub.querySelector('.gameFocusBar'))return;
  const intro=hub.querySelector('.catalogIntro');
  if(intro)intro.innerHTML='<b>현재 개발·테스트 게임을 먼저 보여줘.</b> 전체 목록이나 기존 Web 보관판은 아래 보기 버튼으로 전환하면 돼.';
  const headNote=hub.querySelector('.sectionHead span');
  if(headNote)headNote.textContent='현재 작업 우선 · 필요할 때 전체 보기';
  const bar=document.createElement('div');
  bar.className='gameFocusBar';
  bar.setAttribute('aria-label','게임센터 보기 방식');
  bar.innerHTML='<button class="gameFocusBtn on" type="button" data-focus="active" aria-pressed="true">지금 하는 게임</button><button class="gameFocusBtn" type="button" data-focus="all" aria-pressed="false">전체 게임</button><button class="gameFocusBtn" type="button" data-focus="archive" aria-pressed="false">Web 보관</button>';
  tools.before(bar);
  bar.querySelectorAll('[data-focus]').forEach(btn=>btn.addEventListener('click',()=>setFocus(btn.dataset.focus)));

  const stateFilters=document.getElementById('stateFilters');
  stateFilters?.querySelectorAll('.chip').forEach(btn=>btn.addEventListener('click',()=>{
    setFocus(btn.dataset.state==='archive'?'archive':'all');
  }));
  document.getElementById('platformFilters')?.querySelectorAll('.chip').forEach(btn=>btn.addEventListener('click',()=>setFocus('all')));
  document.getElementById('gameSearch')?.addEventListener('input',()=>{if(document.getElementById('gameSearch').value.trim())setFocus('all');});
  document.getElementById('gameSort')?.addEventListener('change',()=>setTimeout(applyGameCenterFocus,0));

  const grid=document.getElementById('gameGrid');
  if(grid){
    const observer=new MutationObserver(()=>applyGameCenterFocus());
    observer.observe(grid,{childList:true});
  }
  applyGameCenterFocus();
}

async function main(){
  installStyles();
  removeLegacyRuntimeBadges();
  installGameCenterFocus();
  const[catalog,baselines]=await Promise.all([getJson('/game-catalog.json'),getJson('/public-release-baselines.json')]);
  let rounds=0;
  const refresh=()=>{
    removeLegacyRuntimeBadges();
    installGameCenterFocus();
    applyVerifiedRollback(catalog,baselines);
    applyGameCenterFocus();
    if(++rounds>24)clearInterval(timer);
  };
  const timer=setInterval(refresh,300);
  refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();