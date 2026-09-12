// 파일명: assets/homepage-enhancements.js
// 역할: 승인된 재운게임즈 홈페이지 레이아웃을 구성하고 검증된 company-runtime 상태를 우선해 5초 주기로 자동 동기화한다.
// 공개 Web 안정판과 기존 게임 데이터는 보존하고 홈 표시 구조만 재배치한다.
const SYNC_INTERVAL_MS=5000;
const RAW_RUNTIME_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/company-runtime';
const RAW_MAIN_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/main';
const focusMode='active';
let refreshInFlight=false;
let lastDataSignature='';
const getJson=async(path,{runtimePreferred=false}={})=>{
  const stamp=Date.now();
  const urls=runtimePreferred
    ? [`${RAW_RUNTIME_BASE}${path}`,`${RAW_MAIN_BASE}${path}`,path]
    : [`${RAW_MAIN_BASE}${path}`,path];
  for(const url of urls){
    try{
      const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${stamp}`,{cache:'no-store'});
      if(r.ok)return {
        data:await r.json(),
        source:url.startsWith(RAW_RUNTIME_BASE)?'company-runtime':url.startsWith(RAW_MAIN_BASE)?'github-main':'local'
      };
    }catch{}
  }
  return {data:null,source:'offline'};
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=value=>{if(!value)return'정보 없음';const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value).replaceAll('-','.');return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/\. /g,'.').replace(/\.$/,'');};

const CATEGORY_META={
  'release-confirmed':{order:1,title:'출시확정',note:'Unity Android 본개발',className:'release'},
  'development-confirmed':{order:2,title:'개발확정',note:'Web 1차 플레이어블 구현',className:'development'},
  'design-only':{order:3,title:'3분류',note:'아트북 · 컨셉 · 설계 최적화',className:'design'}
};

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='jaewoonEnhancementStyles';
  style.textContent=`
.reviews,.music,.opsBar,.catalogIntro,.tools,.filters,.sortRow,#heroDots{display:none!important}
.brandRow{justify-content:center!important}
.brand{width:100%;justify-content:center}
.brand img{object-position:center center!important}
.companyLink{display:none!important}
.homeFocus,#gameHub,.teamPanel{font-family:system-ui,-apple-system,'Noto Sans KR',sans-serif!important}

#hero.homeFocus{width:96%;margin:0 auto 14px;min-height:210px;border-radius:20px;overflow:hidden;color:#fff;background:#102d42;box-shadow:0 10px 26px rgba(28,93,138,.16);position:relative;isolation:isolate}
#hero.homeFocus:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,20,31,.94),rgba(3,20,31,.62) 55%,rgba(3,20,31,.2)),var(--focus-bg) center/cover no-repeat;z-index:-1}
#hero.homeFocus:after{display:none}
.homeFocusInner{min-height:210px;padding:24px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start}
.homeFocusInner small{font-size:11px;font-weight:900;color:#9fe7ff}
.homeFocusInner h1{margin:4px 0 7px;font-family:inherit!important;font-weight:900;font-size:32px;line-height:1.08;text-shadow:0 3px 11px #0008}
.homeFocusInner p{max-width:620px;margin:0 0 12px;font-size:13px;font-weight:800;line-height:1.5;color:#e7f4fb;text-shadow:0 2px 8px #0009}
.homeFocusMeta{display:flex;gap:6px;flex-wrap:wrap}
.homeFocusMeta span{padding:5px 8px;border:1px solid #ffffff55;border-radius:999px;background:#ffffff20;font-size:10px;font-weight:900}
.homeFocusBtn{margin-top:12px;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border-radius:10px;background:#2b91e6;color:#fff;text-decoration:none;font-size:12px;font-weight:900}

#gameHub{padding:14px 0 3px}
#gameHub>.sectionHead{display:none!important}
#gameGrid{display:none!important}
.homeCategoryChips{display:flex;gap:7px;flex-wrap:wrap;padding:0 16px 12px}
.homeCategoryChip{display:inline-flex;align-items:center;min-height:34px;padding:0 12px;border:1px solid #b9d8ed;border-radius:999px;background:#eef8ff;color:#1767a9;font-size:10px;font-weight:900}
.homeCategoryChip b{margin-left:5px;font-size:11px}
.gameFold{margin:0 16px 12px;border:1px solid #d5e8f1;border-radius:16px;background:#f9fdff;overflow:hidden}
.gameFold summary{list-style:none;cursor:pointer;padding:14px 16px;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:9px;background:#eef8ff;user-select:none}
.gameFold summary::-webkit-details-marker{display:none}
.gameFold summary strong{font-family:inherit!important;font-weight:900;font-size:18px;color:#155e9f}
.gameFold summary span{font-size:10px;color:#5f7a8d;font-weight:800}
.gameFold summary i{font-style:normal;font-size:15px;color:#1767a9;transition:transform .2s ease}
.gameFold[open] summary i{transform:rotate(180deg)}
.foldGameGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px}
.foldGameCard{min-width:0;border:1px solid #d5e8f1;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 14px rgba(58,111,146,.10)}
.foldGameArt{height:155px;position:relative;background:#264a60;overflow:hidden}
.foldGameArt img{width:100%;height:100%;display:block;object-fit:cover}
.foldGameArt:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(2,18,29,.85))}
.foldGameTitle{position:absolute;z-index:2;left:12px;right:44px;bottom:10px;color:#fff}
.foldGameTitle b{display:block;font-size:20px;font-weight:900;text-shadow:0 2px 5px #000}
.foldGameTitle small{display:block;margin-top:2px;font-size:9px;color:#d9edf7;font-weight:800}
.foldGameBody{padding:12px}
.foldBadges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.foldBadge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;background:#e6f2fb;color:#4d7087;font-size:9px;font-weight:900}
.foldBadge.release{background:#d9f4e4;color:#197340}
.foldBadge.development{background:#dcecff;color:#185f93}
.foldBadge.design{background:#f0e9ff;color:#6743a8}
.foldGameBody p{margin:7px 0;font-size:11px;line-height:1.5;color:#536f82;font-weight:700}
.foldGameMeta{font-size:9px;line-height:1.6;color:#6d8799;font-weight:800}
.foldGameActions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}
.foldGameBtn{display:flex;align-items:center;justify-content:center;min-height:38px;padding:0 6px;border-radius:10px;text-decoration:none;text-align:center;font-size:9px;font-weight:900;background:#2488df;color:#fff;border:1px solid #2488df}
.foldGameBtn.secondary{background:#eef8ff;color:#1767a9;border-color:#afd7ef}
.foldGameBtn.off{background:#e8eef2;color:#7c8c96;border-color:#dce5eb;pointer-events:none}
.foldGameBtn.alert{background:#fff3cd;color:#735800;border-color:#f2d98a}

.teamPanel{padding-bottom:14px}
.teamPanel .sectionHead{align-items:flex-end;padding:16px 16px 10px}
.teamPanel .sectionHead h2{font-family:inherit!important;font-weight:900;font-size:26px}
.teamWrap{padding:0 16px}
.teamOwner{display:grid;grid-template-columns:110px 1fr;gap:14px;background:#102d42;color:#fff;border-radius:15px;padding:12px;margin-bottom:12px}
.teamOwner img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:12px;background:#dceefa}
.teamOwner h3{margin:0 0 4px;font-family:inherit!important;font-weight:900;font-size:20px}
.teamOwner p{margin:0;font-size:11px;line-height:1.5;color:#d5e7f1;font-weight:700}
.teamSocials{margin-top:8px;padding-top:8px;border-top:1px solid #ffffff30;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%}
.teamSocial{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:30px;padding:0 10px;border-radius:999px;font-size:9px;font-weight:900;white-space:nowrap}
.teamSocialIcon{width:14px;height:14px;display:block;flex:0 0 auto}
.teamSocial.instagram{background:linear-gradient(120deg,#7b3ff2,#df3d8d,#f59a3d);color:#fff}
.teamSocial.kakao{background:#fee500;color:#261f00}
.aiTeamGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.aiTeamCard{background:#eef8fd;border-radius:12px;padding:9px;text-align:center}
.aiTeamPhoto{width:66px;height:66px;display:block;margin:0 auto 7px;border:3px solid #fff;border-radius:50%;background:#d8edf8;box-shadow:0 3px 8px #174d6b22}
.aiTeamCard b{display:block;color:#1767a9;font-size:12px;font-weight:900}
.aiTeamCard span{display:block;margin-top:3px;font-size:9px;line-height:1.4;color:#5f7a8d;font-weight:700}
.teamActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.teamActions a{display:flex;align-items:center;justify-content:center;min-height:40px;border-radius:10px;background:#195b8c;color:#fff;text-decoration:none;font-size:11px;font-weight:900}
.teamActions a:last-child{background:#eef9ff;color:#1769a9;border:1px solid #afd7ef}

@media(max-width:700px){
  .foldGameGrid{grid-template-columns:1fr}
  .aiTeamGrid{grid-template-columns:repeat(2,1fr)}
  .foldGameActions{grid-template-columns:1fr 1fr}
  .foldGameActions>*:last-child{grid-column:1/-1}
  .homeFocusInner h1{font-size:27px}
  .teamOwner{grid-template-columns:92px 1fr}
}
@media(max-width:420px){
  .gameFold{margin-left:10px;margin-right:10px}
  .homeCategoryChips{padding-left:10px;padding-right:10px}
  .gameFold summary{grid-template-columns:1fr auto;padding:13px 12px}
  .gameFold summary span{grid-column:1/-1;grid-row:2;text-align:left}
  .gameFold summary i{grid-column:2;grid-row:1}
  .foldGameGrid{padding:10px}
  .teamOwner{grid-template-columns:80px 1fr;gap:10px}
}
`;
  document.head.appendChild(style);
}

function getGameBuild(status,gameId){
  return status?.testBuilds?.find(b=>b.gameId===gameId&&b.status==='ready')||null;
}

function getGameBaseline(baselines,gameId){
  return baselines?.games?.find(g=>g.gameId===gameId)||null;
}

function getLatestArtbook(artbooks,gameId){
  const rows=(artbooks?.artbooks||[]).filter(a=>a.gameId===gameId&&(a.published||a.homepageVisible));
  return rows.sort((a,b)=>String(b.createdAt||b.updatedAt||'').localeCompare(String(a.createdAt||a.updatedAt||''))||Number(b.edition||0)-Number(a.edition||0))[0]||null;
}

function getReleaseDate(game,baseline,build){
  return game?.releaseDate||game?.releasedAt||game?.publishedAt||baseline?.releaseDate||baseline?.releasedAt||baseline?.publishedAt||build?.releasedAt||null;
}

function buildFocus(catalog,status,artbooks){
  const hero=document.getElementById('hero');
  if(!hero)return;
  const games=catalog?.games||[];
  const focus=status?.operations?.autonomousFocus;
  const focusRow=Array.isArray(focus?.games)?focus.games[0]:null;
  const project=status?.projects?.find(p=>p.gameId===focusRow?.slug||p.gameId===focusRow?.gameId)
    ||status?.projects?.find(p=>p.stage==='full-development')
    ||status?.projects?.[0]
    ||null;
  const game=games.find(g=>g.id===focusRow?.slug)
    ||games.find(g=>g.id===project?.gameId)
    ||games.find(g=>g.homepageCategory==='release-confirmed')
    ||games[0];
  if(!game)return;
  const build=getGameBuild(status,game.id);
  const artbook=getLatestArtbook(artbooks,game.id);
  const progress=Number.isFinite(project?.progress)?`${project.progress}%`:'진행 중';
  const unityFocus=focusRow?.lane==='unity-primary'||project?.target==='unity-android';
  const focusLabel=unityFocus?'집중개발 · Unity 본개발':'집중개발';
  hero.className='panel hero homeFocus';
  hero.style.setProperty('--focus-bg',`url('${String(game.image||'assets/fantasy-rpg-v2.webp').replaceAll("'",'%27')}')`);
  hero.innerHTML=`<div class="homeFocusInner">
    <small class="gameFocusBar" data-focus-mode="${focusMode}">${esc(focusLabel)} · 최신자료 자동동기화</small>
    <h1>${esc(game.name)} · ${esc(game.homepageStage||project?.stageLabel||'개발 중')}</h1>
    <p>${esc(game.homepageRecentWork||project?.stageLabel||game.description)}</p>
    <div class="homeFocusMeta">
      <span>${esc(unityFocus?'Unity Android':'개발판')}</span>
      <span>진행 ${esc(progress)}</span>
      <span>${build?'테스트 APK 있음':'테스트 빌드 준비중'}</span>
      <span>${artbook?`아트북 ${esc(formatDate(artbook.createdAt||artbooks?.updatedAt))}`:'아트북 준비중'}</span>
    </div>
    <a class="homeFocusBtn" href="#gameHub">게임 보러가기</a>
  </div>`;
}

function buildGameCard(game,catalog,status,baselines,artbooks){
  const category=CATEGORY_META[game.homepageCategory]||CATEGORY_META['design-only'];
  const build=getGameBuild(status,game.id);
  const baseline=getGameBaseline(baselines,game.id);
  const artbook=getLatestArtbook(artbooks,game.id);
  const webDate=formatDate(game.webUpdatedAt||catalog?.updatedAt);
  const buildDate=build?.builtAt?formatDate(build.builtAt):'없음';
  const artbookDate=artbook?formatDate(artbook.createdAt||artbooks?.updatedAt):'없음';
  const releaseDate=getReleaseDate(game,baseline,build);
  const releaseText=releaseDate?`출시 ${formatDate(releaseDate)}`:(game.homepageCategory==='release-confirmed'?'출시일 정보 없음':'출시 전');
  const webPlayable=game.homepageWebPlayable!==false&&Boolean(game.webPath);
  const unityUrl=baseline?.rollbackActive&&baseline?.fallbackDownload?baseline.fallbackDownload:build?.download;
  const unityLabel=baseline?.rollbackActive&&baseline?.fallbackDownload?'안정판 APK':build?'Unity 테스트':'Unity 준비중';
  const unityClass=unityUrl?'foldGameBtn secondary':'foldGameBtn off';
  const artbookUrl=game.homepageArtbookPath||(artbook?`/artbook-viewer.html?game=${encodeURIComponent(game.id)}`:'');
  const artbookClass=artbookUrl?'foldGameBtn secondary':'foldGameBtn off';
  const artbookLabel=artbook?`아트북 ${formatDate(artbook.createdAt||artbooks?.updatedAt)}`:'아트북 준비중';
  const webButton=webPlayable
    ?`<a class="foldGameBtn" href="${esc(game.webPath)}">웹게임 플레이</a>`
    :`<span class="foldGameBtn alert">Web 확인중</span>`;
  return `<article class="foldGameCard" data-game-id="${esc(game.id)}">
    <div class="foldGameArt">
      <img src="${esc(game.image)}" alt="${esc(game.name)}" loading="lazy">
      <div class="foldGameTitle"><b>${esc(game.name)}</b><small>${esc((game.genre||[]).join(' · '))}</small></div>
    </div>
    <div class="foldGameBody">
      <div class="foldBadges">
        <span class="foldBadge ${category.className}">${category.title}</span>
        <span class="foldBadge">${esc(game.homepageStage||game.description)}</span>
      </div>
      <p><b>최근 작업</b> ${esc(game.homepageRecentWork||'현재 공개판 유지.')}</p>
      <div class="foldGameMeta">Web 수정 ${esc(webDate)} · Unity 테스트 ${esc(buildDate)} · 아트북 ${esc(artbookDate)}<br>${esc(releaseText)}</div>
      <div class="foldGameActions">
        ${webButton}
        ${unityUrl?`<a class="${unityClass}" href="${esc(unityUrl)}">${unityLabel}</a>`:`<span class="${unityClass}">${unityLabel}</span>`}
        ${artbookUrl?`<a class="${artbookClass}" href="${esc(artbookUrl)}">${esc(artbookLabel)}</a>`:`<span class="${artbookClass}">${esc(artbookLabel)}</span>`}
      </div>
    </div>
  </article>`;
}

function buildGameCenter(catalog,status,baselines,artbooks){
  const hub=document.getElementById('gameHub');
  if(!hub)return;
  hub.querySelector('.sectionHead')?.remove();
  hub.querySelector('.catalogIntro')?.remove();
  hub.querySelector('.tools')?.remove();
  hub.querySelector('.filters')?.remove();
  hub.querySelector('.sortRow')?.remove();
  const old=document.getElementById('homeFoldedGameCenter');
  const openState=new Map();
  old?.querySelectorAll('.gameFold').forEach(node=>openState.set(node.dataset.category,node.open));
  old?.remove();
  const games=catalog?.games||[];
  const grouped=new Map(Object.keys(CATEGORY_META).map(key=>[key,[]]));
  for(const game of games){
    const key=grouped.has(game.homepageCategory)?game.homepageCategory:'design-only';
    grouped.get(key).push(game);
  }
  const wrapper=document.createElement('div');
  wrapper.id='homeFoldedGameCenter';
  const ordered=Object.entries(CATEGORY_META).sort((a,b)=>a[1].order-b[1].order);
  wrapper.innerHTML=`<div class="homeCategoryChips">${ordered.map(([key,meta])=>`<span class="homeCategoryChip">${meta.order}. ${meta.title}<b>${grouped.get(key)?.length||0}</b></span>`).join('')}</div>`+
    ordered.map(([key,meta])=>{
      const items=grouped.get(key)||[];
      const isOpen=openState.has(key)?openState.get(key):true;
      return `<details class="gameFold"${isOpen?' open':''} data-category="${key}">
        <summary><strong>${meta.order}. ${meta.title}</strong><span>${meta.note}</span><i>⌃</i></summary>
        <div class="foldGameGrid">${items.map(game=>buildGameCard(game,catalog,status,baselines,artbooks)).join('')}</div>
      </details>`;
    }).join('');
  const grid=document.getElementById('gameGrid');
  hub.insertBefore(wrapper,grid||null);
}

function avatar(role,label,description){
  return `<div class="aiTeamCard"><svg class="aiTeamPhoto" viewBox="0 0 96 96" aria-label="${esc(label)}"><use href="/assets/ai-team-avatars.svg#${role}"></use></svg><b>${esc(label)}</b><span>${esc(description)}</span></div>`;
}

function buildTeam(){
  const company=document.querySelector('.panel.company');
  if(!company)return;
  company.className='panel teamPanel';
  company.innerHTML=`
    <div class="sectionHead"><h2 aria-hidden="true"></h2><span>Developer 한재운 + AI 개발진</span></div>
    <div class="teamWrap">
      <div class="teamOwner">
        <img src="assets/developer-original.jpg" alt="개발자 한재운" loading="lazy">
        <div>
          <h3>Developer 한재운</h3>
          <p>재운게임즈의 게임 방향과 핵심 결정을 담당하고 AI 개발진과 함께 제작.</p>
          <div class="teamSocials" aria-label="소셜 채널">
            <span class="teamSocial instagram" data-social="instagram"><svg class="teamSocialIcon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg><span>인스타그램</span></span>
            <span class="teamSocial kakao" data-social="kakao"><svg class="teamSocialIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4C6.48 4 2 7.36 2 11.5c0 2.67 1.86 5.02 4.66 6.35L5.5 21l4.09-2.19c.78.13 1.58.19 2.41.19 5.52 0 10-3.36 10-7.5S17.52 4 12 4Z" fill="currentColor"/></svg><span>카카오톡</span></span>
          </div>
        </div>
      </div>
      <div class="aiTeamGrid">
        ${avatar('loop','LOOP','기획 · 스토리 · 핵심 재미')}
        ${avatar('core','CORE','Web/Unity · 저장 · 성능')}
        ${avatar('check','CHECK','QA · 모바일 · 회귀검증')}
        ${avatar('pixel','PIXEL','그래픽 · UI · VFX')}
        ${avatar('scale','SCALE','난이도 · 성장 · 밸런스')}
        ${avatar('holmes','HOLMES','홈페이지 · APK · 배포')}
        ${avatar('jay','JAY','우선순위 · 승격 · 조정')}
        ${avatar('team','공동 개발','중요 기능 공동 검토')}
      </div>
      <div class="teamActions"><a href="/company.html">개발연구소</a><a href="#gameHub">게임 목록으로</a></div>
    </div>`;
  document.querySelector('.profile')?.remove();
  document.querySelector('.music')?.remove();
}

function simplifyPage(){
  document.querySelector('.opsBar')?.remove();
  document.querySelector('.catalogIntro')?.remove();
  document.querySelector('.reviews')?.remove();
  document.getElementById('autonomousFocusStrip')?.remove();
}

async function refreshHomepageData(){
  if(refreshInFlight)return;
  refreshInFlight=true;
  try{
    const [catalogResult,statusResult,baselinesResult,artbooksResult]=await Promise.all([
      getJson('/game-catalog.json',{runtimePreferred:true}),
      getJson('/company-status.json',{runtimePreferred:true}),
      getJson('/public-release-baselines.json'),
      getJson('/game-artbooks.json')
    ]);
    const catalog=catalogResult.data;
    const status=statusResult.data;
    const baselines=baselinesResult.data;
    const artbooks=artbooksResult.data;
    if(catalog){
      const signature=JSON.stringify([catalog,status||{},baselines||{},artbooks||{}]);
      if(signature!==lastDataSignature){
        buildFocus(catalog,status||{},artbooks||{});
        buildGameCenter(catalog,status||{},baselines||{},artbooks||{});
        lastDataSignature=signature;
      }
      const sources=[catalogResult.source,statusResult.source];
      document.documentElement.dataset.homeSyncSource=sources.includes('company-runtime')?'company-runtime':sources.includes('github-main')?'github-main':'local';
    }else{
      document.documentElement.dataset.homeSyncSource='offline';
    }
    document.documentElement.dataset.homeSyncAt=new Date().toISOString();
  }finally{
    refreshInFlight=false;
  }
}

function installRealtimeSync(){
  window.setInterval(()=>{if(!document.hidden)refreshHomepageData();},SYNC_INTERVAL_MS);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHomepageData();});
  window.addEventListener('focus',()=>refreshHomepageData());
  window.addEventListener('online',()=>refreshHomepageData());
}

async function main(){
  installStyles();
  simplifyPage();
  buildTeam();
  await refreshHomepageData();
  installRealtimeSync();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();