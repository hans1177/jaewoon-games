// 파일명: assets/homepage-enhancements-core.js
// 역할: 홈페이지의 게임 구현을 canonical Web Top30과 5초 주기로 실시간 미러하고, 기존 PWA/팀 표시 계약을 보존한다.
const SYNC_INTERVAL_MS=5000;
const RAW_MAIN_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/main';
const RAW_RUNTIME_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/company-runtime';
const TOP30_LIMIT=30;
const TOP30_MIN_SCORE=80;
const focusMode='top30';
let refreshInFlight=false;
let lastDataSignature='';
const getJson=async(path,{runtime=false}={})=>{
  const stamp=Date.now();
  const bases=runtime?[RAW_RUNTIME_BASE,RAW_MAIN_BASE]:[RAW_MAIN_BASE];
  const urls=[...bases.map(base=>`${base}${path}`),path];
  for(const url of urls){
    try{
      const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${stamp}`,{cache:'no-store'});
      if(r.ok)return await r.json();
    }catch{}
  }
  return null;
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=value=>{if(!value)return'정보 없음';const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value).replaceAll('-','.');return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/\. /g,'.').replace(/\.$/,'');};
const normalizePlatform=value=>String(value??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const platformLabel=value=>{
  const platform=normalizePlatform(value);
  if(platform==='ROBLOX')return'Roblox';
  if(['UNITY','UNITY_ANDROID'].includes(platform))return'Unity Android';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(platform))return'Fortnite UEFN';
  return'선택 플랫폼';
};
const scoreOf=row=>{for(const key of ['strictScore','reviewScore','webStrictScore','totalScore','score']){const n=Number(row?.[key]);if(Number.isFinite(n))return n;}return null;};
const noHardFailures=row=>Array.isArray(row?.strictReviewHardFailures)&&row.strictReviewHardFailures.length===0;
const top30Eligible=row=>row?.homepageTestCandidate===true&&row?.homepageOfficialCard===false&&String(row?.homepageTestVerdict||'').toUpperCase()==='PASS'&&scoreOf(row)!==null&&scoreOf(row)>=TOP30_MIN_SCORE&&noHardFailures(row)&&Boolean(String(row?.webPath||row?.testUrl||'').trim())&&Boolean(String(row?.artbookPath||row?.artbookUrl||'').trim());
function top30Candidates(manifest){return (Array.isArray(manifest?.candidates)?manifest.candidates:[]).filter(top30Eligible).slice(0,TOP30_LIMIT);}

const developmentScoreOf=row=>{for(const key of ['webStrictScore','strictImplementationScore','homepageTestScore','strictScore','reviewScore','totalScore','score']){const n=Number(row?.[key]);if(Number.isFinite(n))return n;}return null;};
const developmentItems=queue=>(Array.isArray(queue?.items)?queue.items:[]).filter(row=>String(row?.productionClass||'').trim().toUpperCase()==='DEVELOPMENT_CONFIRMED'&&String(row?.status||'').trim().toUpperCase()!=='DISCARDED').sort((a,b)=>{const sa=developmentScoreOf(a),sb=developmentScoreOf(b);if(sa!==null||sb!==null){if(sa===null)return 1;if(sb===null)return-1;if(sb!==sa)return sb-sa;}const aa=String(a?.status||'').toUpperCase()==='ACTIVE'?0:1,bb=String(b?.status||'').toUpperCase()==='ACTIVE'?0:1;return aa-bb||String(b?.updatedAt||'').localeCompare(String(a?.updatedAt||''))||String(a?.gameId||'').localeCompare(String(b?.gameId||''));});
const developmentStateLabel=value=>{const key=String(value||'ACTIVE').trim().toUpperCase();return ({ACTIVE:'개발 진행중',HOLD:'개발 보류',BLOCKED:'개발 막힘',WAITING:'개발 대기'}[key]||key.replaceAll('_',' '));};
const developmentStepLabel=value=>{const key=String(value||'').trim().toUpperCase();const labels={WEB_GAMEPLAY_AND_MUSIC_VALIDATION:'Web 개발/검증',TARGET_PLATFORM_RUNTIME:'플랫폼 실행 검증',TARGET_PLATFORM_QA:'플랫폼 QA',ROBLOX_POST_RUNTIME_QA:'Roblox 사후 QA',FINAL_CONTENT_DEPTH:'최종 콘텐츠 검증'};return labels[key]||key.replaceAll('_',' ')||'개발 단계 확인 중';};
const developmentWebTestTarget=item=>{const raw=String(item?.webSourcePath||item?.sourcePath||'').trim().replace(/^\/+|\/+$/g,'').replace(/\/index\.html$/i,'');if(!raw||raw.includes('..')||!/^web-games\/[A-Za-z0-9._\/-]+$/.test(raw))return'';return`/${raw}/`;};
const developmentPlatformTestTarget=(item,status)=>{const platform=String(item?.selectedPlatform||item?.targetPlatform||'').trim().toUpperCase();const explicit=String(item?.platformTestUrl||item?.testUrl||(platform==='ROBLOX'?item?.robloxTestUrl:'')||(platform==='UNITY'?item?.unityTestUrl:'')||(platform==='FORTNITE_UEFN'?item?.fortniteTestUrl:'')||'').trim();if(/^https?:\/\//i.test(explicit)||/^roblox:/i.test(explicit))return explicit;if(platform==='UNITY'){const builds=Array.isArray(status?.testBuilds)?status.testBuilds:[];const build=builds.find(entry=>String(entry?.gameId||'')===String(item?.gameId||'')&&String(entry?.status||'').toLowerCase()==='ready'&&typeof entry?.download==='string');if(build?.download)return build.download;}return'';};

let homepageInstallPrompt=null;
function installHomepageAppFlow(){
  const button=document.getElementById('appInstallBtn');
  const state=document.getElementById('appInstallState');
  if(!button)return;
  const ua=navigator.userAgent||'';
  const android=/Android/i.test(ua);
  const samsung=/SamsungBrowser/i.test(ua);
  const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const setState=text=>{if(state)state.textContent=text;};
  const markInstalled=()=>{button.disabled=true;button.textContent='설치됨';setState('재운컴퍼니 앱이 설치돼 있어.');};
  if(standalone){markInstalled();return;}
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    homepageInstallPrompt=event;
    button.disabled=false;
    button.textContent='재운컴퍼니 앱 설치';
    setState('설치 준비 완료. 버튼을 누르면 설치창이 떠.');
  });
  window.addEventListener('appinstalled',()=>{homepageInstallPrompt=null;markInstalled();});
  button.addEventListener('click',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!samsung&&android){
      const target='https://jaewoon-games.pages.dev/?install=1';
      const intent='intent://jaewoon-games.pages.dev/?install=1#Intent;scheme=https;package=com.sec.android.app.sbrowser;S.browser_fallback_url='+encodeURIComponent(target)+';end';
      setState('삼성 인터넷으로 여는 중이야.');
      window.location.href=intent;
      return;
    }
    if(homepageInstallPrompt){
      const prompt=homepageInstallPrompt;
      homepageInstallPrompt=null;
      await prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice.outcome==='accepted')setState('설치를 진행 중이야.');
      else setState('설치를 취소했어. 다시 누르면 돼.');
      return;
    }
    if(samsung){
      setState('삼성 인터넷 메뉴에서 앱 설치 또는 홈 화면에 추가를 눌러. 설치 가능해지면 이 버튼이 바로 설치창을 띄워.');
      return;
    }
    setState('안드로이드에서는 삼성 인터넷으로 열어서 설치해.');
  },true);
  if(android&&!samsung){button.textContent='삼성 인터넷에서 설치';setState('누르면 삼성 인터넷으로 바로 열어.');}
  else if(samsung){button.textContent='재운컴퍼니 앱 설치';setState('삼성 인터넷에서 설치 준비 중이야.');}
}

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='jaewoonEnhancementStyles';
  style.textContent=`
.reviews,.music,.opsBar,.catalogIntro,.tools,.filters,.sortRow,#heroDots{display:none!important}
.brandRow{justify-content:center!important}.brand{width:100%;justify-content:center}.brand img{object-position:center center!important}.companyLink{display:none!important}
.homeFocus,#gameHub,.teamPanel{font-family:system-ui,-apple-system,'Noto Sans KR',sans-serif!important}
#hero.homeFocus{width:96%;margin:0 auto 14px;min-height:220px;border-radius:20px;overflow:hidden;color:#fff;background:#102d42;box-shadow:0 10px 26px rgba(28,93,138,.16);position:relative;isolation:isolate}
#hero.homeFocus:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,20,31,.95),rgba(3,20,31,.68) 58%,rgba(3,20,31,.25)),var(--focus-bg) center/cover no-repeat;z-index:-1}
#hero.homeFocus:after{display:none}.homeFocusInner{min-height:220px;padding:24px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start}
.homeFocusInner small{font-size:11px;font-weight:900;color:#9fe7ff}.homeFocusInner h1{margin:4px 0 7px;font-family:inherit!important;font-weight:900;font-size:32px;line-height:1.08;text-shadow:0 3px 11px #0008}.homeFocusInner p{max-width:650px;margin:0 0 12px;font-size:13px;font-weight:800;line-height:1.5;color:#e7f4fb;text-shadow:0 2px 8px #0009}.homeFocusMeta{display:flex;gap:6px;flex-wrap:wrap}.homeFocusMeta span{padding:5px 8px;border:1px solid #ffffff55;border-radius:999px;background:#ffffff20;font-size:10px;font-weight:900}.homeFocusBtn{margin-top:12px;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border-radius:10px;background:#2b91e6;color:#fff;text-decoration:none;font-size:12px;font-weight:900}
#gameHub{padding:14px 0 3px}#gameHub>.sectionHead{display:none!important}#gameGrid{display:none!important}
#homeTop30GameCenter{margin:0 14px 14px}.top30Head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:4px 2px 12px}.top30Head h2{margin:0;font-size:25px;color:#155e9f;font-weight:1000}.top30Head p{margin:3px 0 0;color:#5f7a8d;font-size:10px;font-weight:800}.top30Count{flex:0 0 auto;padding:7px 10px;border-radius:999px;background:#102d42;color:#fff;font-size:10px;font-weight:1000}.top30Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.top30Empty{grid-column:1/-1;padding:24px 12px;text-align:center;border:1px dashed #bdd4e2;border-radius:13px;background:#f8fcff;color:#67869b;font-size:11px;font-weight:800}
#homeDevelopmentGameCenter{margin:0 14px 14px}.developmentGameCard .foldGameArt{height:118px}.developmentGameCard .foldGameBody p{min-height:0}.foldBadge.development{background:#dcecff;color:#185f93}.foldBadge.progress{background:#eef8ff;color:#1767a9}
.foldGameCard{min-width:0;border:1px solid #d5e8f1;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 14px rgba(58,111,146,.10)}.top30GameCard{position:relative}.top30Rank{position:absolute;z-index:4;left:9px;top:9px;min-width:34px;height:34px;padding:0 7px;border-radius:999px;background:#102d42;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:1000;box-shadow:0 3px 10px #0004}.foldGameArt{height:155px;position:relative;background:#264a60;overflow:hidden}.foldGameArt img{width:100%;height:100%;display:block;object-fit:cover}.foldGameArt:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(2,18,29,.85))}.foldGameTitle{position:absolute;z-index:2;left:12px;right:12px;bottom:10px;color:#fff}.foldGameTitle b{display:block;font-size:20px;font-weight:900;text-shadow:0 2px 5px #000}.foldGameTitle small{display:block;margin-top:2px;font-size:9px;color:#d9edf7;font-weight:800}.foldGameBody{padding:12px}.foldBadges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.foldBadge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;background:#e6f2fb;color:#4d7087;font-size:9px;font-weight:900}.foldBadge.score{background:#d9f4e4;color:#197340}.foldBadge.test{background:#fff0c9;color:#865d00}.foldBadge.promote{background:#ece5ff;color:#6743a8}.foldGameBody p{margin:7px 0;font-size:11px;line-height:1.5;color:#536f82;font-weight:700}.foldGameMeta{font-size:9px;line-height:1.6;color:#6d8799;font-weight:800}.foldGameActions{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:6px;margin-top:10px}.foldGameBtn{display:flex;align-items:center;justify-content:center;min-height:38px;padding:0 6px;border-radius:10px;text-decoration:none;text-align:center;font-size:9px;font-weight:900;background:#2488df;color:#fff;border:1px solid #2488df}.foldGameBtn.secondary{background:#eef8ff;color:#1767a9;border-color:#afd7ef}.foldGameBtn.off{background:#e8eef2;color:#7c8c96;border-color:#dce5eb;pointer-events:none}
.teamPanel{padding-bottom:14px}.teamPanel .sectionHead{align-items:flex-end;padding:16px 16px 10px}.teamPanel .sectionHead h2{font-family:inherit!important;font-weight:900;font-size:26px}.teamWrap{padding:0 16px}.teamOwner{display:grid;grid-template-columns:110px 1fr;gap:14px;background:#102d42;color:#fff;border-radius:15px;padding:12px;margin-bottom:12px}.teamOwner img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:12px;background:#dceefa}.teamOwner h3{margin:0 0 4px;font-family:inherit!important;font-weight:900;font-size:20px}.teamOwner p{margin:0;font-size:11px;line-height:1.5;color:#d5e7f1;font-weight:700}.teamSocials{margin-top:8px;padding-top:8px;border-top:1px solid #ffffff30;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%}.teamSocial{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:30px;padding:0 10px;border-radius:999px;font-size:9px;font-weight:900;white-space:nowrap}.teamSocialIcon{width:14px;height:14px;display:block;flex:0 0 auto}.teamSocial.instagram{background:linear-gradient(120deg,#7b3ff2,#df3d8d,#f59a3d);color:#fff}.teamSocial.kakao{background:#fee500;color:#261f00}.aiTeamGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.aiTeamCard{background:#eef8fd;border-radius:12px;padding:9px;text-align:center}.aiTeamPhoto{width:66px;height:66px;display:block;margin:0 auto 7px;border:3px solid #fff;border-radius:50%;background:#d8edf8;box-shadow:0 3px 8px #174d6b22}.aiTeamCard b{display:block;color:#1767a9;font-size:12px;font-weight:900}.aiTeamCard span{display:block;margin-top:3px;font-size:9px;line-height:1.4;color:#5f7a8d;font-weight:700}.teamActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.teamActions a{display:flex;align-items:center;justify-content:center;min-height:40px;border-radius:10px;background:#195b8c;color:#fff;text-decoration:none;font-size:11px;font-weight:900}.teamActions a:last-child{background:#eef9ff;color:#1769a9;border:1px solid #afd7ef}
@media(max-width:700px){.top30Grid{grid-template-columns:1fr}.aiTeamGrid{grid-template-columns:repeat(2,1fr)}.foldGameActions{grid-template-columns:repeat(2,minmax(0,1fr))}.homeFocusInner h1{font-size:27px}.teamOwner{grid-template-columns:92px 1fr}}
@media(max-width:420px){#homeTop30GameCenter{margin-left:10px;margin-right:10px}.top30Head{align-items:flex-start}.top30Head h2{font-size:22px}.foldGameArt{height:145px}.teamOwner{grid-template-columns:80px 1fr;gap:10px}}
`;
  document.head.appendChild(style);
}

function getGameBuild(status,gameId){return status?.testBuilds?.find(b=>b.gameId===gameId&&b.status==='ready')||null;}
function getGameBaseline(baselines,gameId){return baselines?.games?.find(g=>g.gameId===gameId)||null;}
function getLatestArtbook(artbooks,gameId){const rows=(artbooks?.artbooks||[]).filter(a=>a.gameId===gameId&&(a.published||a.homepageVisible));return rows.sort((a,b)=>String(b.createdAt||b.updatedAt||'').localeCompare(String(a.createdAt||a.updatedAt||''))||Number(b.edition||0)-Number(a.edition||0))[0]||null;}
function getHomepagePlatform(game,status){const focus=status?.operations?.autonomousFocus?.games?.find(row=>row.slug===game.id||row.gameId===game.id);const project=status?.projects?.find(row=>row.gameId===game.id||row.name===game.name);const ranking=status?.operations?.productionClasses?.ranking?.find(row=>row.slug===game.id||row.gameId===game.id);const candidates=[game.selectedPlatform,focus?.selectedPlatform,project?.selectedPlatform,project?.target,ranking?.targetPlatform,game.productionTarget,status?.policy?.primaryPlatform,'ROBLOX'];for(const value of candidates){const platform=normalizePlatform(value);if(platform==='ROBLOX')return'ROBLOX';if(['UNITY','UNITY_ANDROID'].includes(platform))return'UNITY';if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(platform))return'FORTNITE_UEFN';}return'ROBLOX';}
function catalogMap(catalog){return new Map((catalog?.games||[]).map(game=>[String(game.id||'').trim(),game]));}
function mergedTop30Game(candidate,catalog){const source=catalogMap(catalog).get(String(candidate?.gameId||candidate?.id||'').trim())||{};return {...source,...candidate,id:String(candidate?.gameId||candidate?.id||source.id||'').trim(),name:candidate?.name||candidate?.gameName||source.name||candidate?.gameId||candidate?.id,webPath:candidate?.webPath||candidate?.testUrl||source.webPath,homepageArtbookPath:candidate?.artbookPath||candidate?.artbookUrl||source.homepageArtbookPath,description:source.description||'Web 강심사를 통과해 홈페이지 Top30에서 경쟁 중인 게임.',genre:Array.isArray(source.genre)?source.genre:[],image:source.image||'assets/pwa-icon-512.png'};}

function buildFocus(catalog,status,artbooks,top30Manifest){
  const hero=document.getElementById('hero');if(!hero)return;
  const rows=top30Candidates(top30Manifest);
  if(!rows.length){hero.className='panel hero homeFocus';hero.style.setProperty('--focus-bg',"url('assets/page-bg-v4.webp')");hero.innerHTML='<div class="homeFocusInner"><small>홈페이지 = Web TOP30 실시간 미러</small><h1>TOP30 후보 준비 중</h1><p>Web 강심사 80점 이상과 하드게이트 통과 후보가 생기면 이 영역과 게임 목록에 자동 반영돼.</p><div class="homeFocusMeta"><span>최대 30개</span><span>STRICT 점수순</span></div><a class="homeFocusBtn" href="#gameHub">TOP30 보기</a></div>';return;}
  const candidate=rows[0];const game=mergedTop30Game(candidate,catalog);const score=scoreOf(candidate);const selectedPlatform=getHomepagePlatform(game,status);const artbook=getLatestArtbook(artbooks,game.id);const web=String(candidate.webPath||candidate.testUrl||game.webPath||'').trim();
  hero.className='panel hero homeFocus';hero.style.setProperty('--focus-bg',`url('${String(game.image||'assets/pwa-icon-512.png').replaceAll("'",'%27')}')`);
  hero.innerHTML=`<div class="homeFocusInner"><small class="gameFocusBar" data-focus-mode="${focusMode}">TOP 1 · 홈페이지 = Web TOP30 실시간 미러</small><h1>${esc(game.name)} · ${esc(score)}점</h1><p>${esc(game.description)}</p><div class="homeFocusMeta"><span>Web 강심사 ${esc(score)}점</span><span>${esc(platformLabel(selectedPlatform))}</span><span>${score>=90?'플랫폼 개발·테스트 진입 대상':'Top30 경쟁 유지'}</span><span>${artbook?`아트북 ${esc(formatDate(artbook.createdAt||artbooks?.updatedAt))}`:'아트북 연결됨'}</span></div>${web?`<a class="homeFocusBtn" href="${esc(web)}">1위 게임 시작</a>`:'<a class="homeFocusBtn" href="#gameHub">TOP30 보기</a>'}</div>`;
}

function buildGameCard(candidate,rank,catalog,status,baselines,artbooks){
  const game=mergedTop30Game(candidate,catalog);const score=scoreOf(candidate);const selectedPlatform=getHomepagePlatform(game,status);const build=getGameBuild(status,game.id);const baseline=getGameBaseline(baselines,game.id);const artbook=getLatestArtbook(artbooks,game.id);const web=String(candidate.webPath||candidate.testUrl||game.webPath||'').trim();const artbookUrl=String(candidate.artbookPath||candidate.artbookUrl||game.homepageArtbookPath||(artbook?`/artbook-viewer.html?game=${encodeURIComponent(game.id)}`:'')).trim();const buildUrl=baseline?.rollbackActive&&baseline?.fallbackDownload?baseline.fallbackDownload:build?.download;const genre=(game.genre||[]).join(' · ');const validatedAt=formatDate(candidate.validatedAt);const platformState=score>=90?'90+ · 플랫폼 개발·테스트 진입':'80~89 · Web Top30 경쟁';
  return `<article class="foldGameCard top30GameCard" data-game-id="${esc(game.id)}" data-top30-rank="${rank}" data-top30-score="${esc(score)}" data-direct-play="${esc(web)}" data-homepage-game-source="CANONICAL_TOP30"><span class="top30Rank">#${rank}</span><div class="foldGameArt"><img src="${esc(game.image)}" alt="${esc(game.name)}" loading="lazy"><div class="foldGameTitle"><b>${esc(game.name)}</b><small>${esc(genre||'Web 게임')}</small></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge score">${esc(score)}점</span><span class="foldBadge test">TOP30 테스트</span><span class="foldBadge promote">${esc(platformState)}</span></div><p>${esc(game.description)}</p><div class="foldGameMeta">검증 ${esc(validatedAt)} · 선택 플랫폼 ${esc(platformLabel(selectedPlatform))}<br>홈페이지 표시는 Top30 순위와 실시간 미러 · 정식 공식카드 승격과는 별도</div><div class="foldGameActions"><a class="foldGameBtn" href="${esc(web)}">게임 시작</a>${artbookUrl?`<a class="foldGameBtn secondary" href="${esc(artbookUrl)}">아트북</a>`:'<span class="foldGameBtn off">아트북 없음</span>'}${buildUrl?`<a class="foldGameBtn secondary" href="${esc(buildUrl)}">플랫폼 빌드</a>`:''}</div></div></article>`;
}

function buildDevelopmentCard(item,catalog,status){
  const gameId=String(item?.gameId||'').trim();const source=catalogMap(catalog).get(gameId)||{};const name=source.name||item?.gameName||gameId;const selectedPlatform=getHomepagePlatform({...source,id:gameId,selectedPlatform:item?.selectedPlatform||item?.targetPlatform},status);const state=developmentStateLabel(item?.status);const step=developmentStepLabel(item?.currentStep||item?.canonicalState);const image=source.image||'assets/pwa-icon-512.png';const genre=Array.isArray(source.genre)&&source.genre.length?source.genre.join(' · '):'개발 게임';const devScore=developmentScoreOf(item);const scoreLabel=devScore===null?'점수 미평가':`점수 ${Math.round(devScore)}`;const webTarget=developmentWebTestTarget(item);const platformTarget=developmentPlatformTestTarget(item,status);const webAction=webTarget?`<a class="foldGameBtn" href="${esc(webTarget)}" data-development-web-test="true">웹 테스트</a>`:'<span class="foldGameBtn off" aria-disabled="true">웹 테스트 준비 중</span>';const platform=String(item?.selectedPlatform||item?.targetPlatform||'').trim().toUpperCase();const platformName=platformLabel(platform);const platformAction=platform?(platformTarget?`<a class="foldGameBtn" href="${esc(platformTarget)}" data-development-platform-test="${esc(platform)}">${esc(platformName)} 테스트</a>`:`<span class="foldGameBtn off" aria-disabled="true">${esc(platformName)} 테스트 준비 중</span>`):'';
  return `<article class="foldGameCard developmentGameCard" data-game-id="${esc(gameId)}" data-homepage-game-source="DEVELOPMENT_QUEUE" data-development-status="${esc(String(item?.status||''))}"><div class="foldGameArt"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy"><div class="foldGameTitle"><b>${esc(name)}</b><small>${esc(genre)}</small></div></div><div class="foldGameBody"><div class="foldBadges"><span class="foldBadge development">${esc(state)}</span><span class="foldBadge progress">${esc(platformLabel(selectedPlatform))}</span><span class="foldBadge score" data-development-score="${devScore===null?'UNRATED':esc(devScore)}">${esc(scoreLabel)}</span></div><p>현재 단계 · ${esc(step)}</p><div class="foldGameMeta">개발 진행 상태 자동 표시 · Top30 검증/출시 승인과 별도</div><div class="foldGameActions">${webAction}${platformAction}</div></div></article>`;
}
function buildDevelopmentCenter(catalog,status,queue){
  const hub=document.getElementById('gameHub');if(!hub)return;document.getElementById('homeDevelopmentGameCenter')?.remove();const rows=developmentItems(queue);const wrapper=document.createElement('section');wrapper.id='homeDevelopmentGameCenter';wrapper.dataset.homepageGameSource='DEVELOPMENT_QUEUE';wrapper.innerHTML=`<div class="top30Head"><div><h2>개발 중 게임</h2><p>개발 시작 즉시 자동 등록 · 검증 통과 여부와 별도</p></div><span class="top30Count">${rows.length}개</span></div><div class="top30Grid">${rows.length?rows.map(row=>buildDevelopmentCard(row,catalog,status)).join(''):'<div class="top30Empty">현재 개발 진행 중인 게임이 없어.</div>'}</div>`;const top30=document.getElementById('homeTop30GameCenter');const grid=document.getElementById('gameGrid');hub.insertBefore(wrapper,top30||grid||null);document.documentElement.dataset.homeDevelopmentCount=String(rows.length);
}

function buildGameCenter(catalog,status,baselines,artbooks,top30Manifest){
  const hub=document.getElementById('gameHub');if(!hub)return;hub.querySelector('.sectionHead')?.remove();hub.querySelector('.catalogIntro')?.remove();hub.querySelector('.tools')?.remove();hub.querySelector('.filters')?.remove();hub.querySelector('.sortRow')?.remove();document.getElementById('homeFoldedGameCenter')?.remove();document.getElementById('compactTestGameShelf')?.remove();document.getElementById('homeTop30GameCenter')?.remove();
  const rows=top30Candidates(top30Manifest);const wrapper=document.createElement('section');wrapper.id='homeTop30GameCenter';wrapper.dataset.homepageGameSource='CANONICAL_TOP30';wrapper.innerHTML=`<div class="top30Head"><div><h2>웹게임 TOP30</h2><p>강심사 80점+ · 하드게이트 통과 · 점수순 실시간 미러</p></div><span class="top30Count">${rows.length} / ${TOP30_LIMIT}</span></div><div class="top30Grid">${rows.length?rows.map((row,index)=>buildGameCard(row,index+1,catalog,status,baselines,artbooks)).join(''):'<div class="top30Empty">현재 Top30 조건을 통과한 Web 게임이 없어.</div>'}</div>`;
  const grid=document.getElementById('gameGrid');hub.insertBefore(wrapper,grid||null);document.documentElement.dataset.homeTop30Count=String(rows.length);document.documentElement.dataset.homePrimaryGameSource='CANONICAL_TOP30';
}

function avatar(role,label,description){return `<div class="aiTeamCard"><svg class="aiTeamPhoto" viewBox="0 0 96 96" aria-label="${esc(label)}"><use href="/assets/ai-team-avatars.svg#${role}"></use></svg><b>${esc(label)}</b><span>${esc(description)}</span></div>`;}
function buildTeam(){
  const company=document.querySelector('.panel.company');if(!company)return;company.className='panel teamPanel';company.innerHTML=`<div class="sectionHead"><h2 aria-hidden="true"></h2><span>Developer 한재운 + AI 개발진</span></div><div class="teamWrap"><div class="teamOwner"><img src="assets/developer-original.jpg" alt="개발자 한재운" loading="lazy"><div><h3>Developer 한재운</h3><p>재운게임즈의 게임 방향과 핵심 결정을 담당하고 AI 개발진과 함께 제작.</p><div class="teamSocials" aria-label="소셜 채널"><span class="teamSocial instagram" data-social="instagram"><svg class="teamSocialIcon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg><span>인스타그램</span></span><span class="teamSocial kakao" data-social="kakao"><svg class="teamSocialIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4C6.48 4 2 7.36 2 11.5c0 2.67 1.86 5.02 4.66 6.35L5.5 21l4.09-2.19c.78.13 1.58.19 2.41.19 5.52 0 10-3.36 10-7.5S17.52 4 12 4Z" fill="currentColor"/></svg><span>카카오톡</span></span></div></div></div><div class="aiTeamGrid">${avatar('loop','LOOP','기획 · 스토리 · 핵심 재미')}${avatar('core','CORE','Web/Unity · 저장 · 성능')}${avatar('check','CHECK','QA · 모바일 · 회귀검증')}${avatar('pixel','PIXEL','그래픽 · UI · VFX')}${avatar('scale','SCALE','난이도 · 성장 · 밸런스')}${avatar('holmes','HOLMES','홈페이지 · APK · 배포')}${avatar('jay','JAY','우선순위 · 승격 · 조정')}${avatar('team','공동 개발','중요 기능 공동 검토')}</div><div class="teamActions"><a href="/company.html">개발연구소</a><a href="#gameHub">TOP30 게임으로</a></div></div>`;document.querySelector('.profile')?.remove();document.querySelector('.music')?.remove();
}
function simplifyPage(){document.querySelector('.opsBar')?.remove();document.querySelector('.catalogIntro')?.remove();document.querySelector('.reviews')?.remove();document.getElementById('autonomousFocusStrip')?.remove();}
async function refreshHomepageData(){
  if(refreshInFlight)return;refreshInFlight=true;
  try{
    const [catalog,status,baselines,artbooks,top30Manifest,developmentQueue]=await Promise.all([getJson('/game-catalog.json',{runtime:true}),getJson('/company-status.json',{runtime:true}),getJson('/public-release-baselines.json'),getJson('/game-artbooks.json'),getJson('/test-game-candidates.json'),getJson('/development-queue.json',{runtime:true})]);
    const catalogSafe=catalog||{games:[]};const statusSafe=status||{};const queueSafe=developmentQueue||{items:[]};const signature=JSON.stringify([top30Manifest||{},queueSafe,catalogSafe,statusSafe,baselines||{},artbooks||{}]);
    if(signature!==lastDataSignature){if(top30Manifest){buildFocus(catalogSafe,statusSafe,artbooks||{},top30Manifest);buildGameCenter(catalogSafe,statusSafe,baselines||{},artbooks||{},top30Manifest);}buildDevelopmentCenter(catalogSafe,statusSafe,queueSafe);lastDataSignature=signature;}
    document.documentElement.dataset.homeSyncSource=top30Manifest?'development-queue+canonical-top30+company-runtime-metadata':'development-queue+company-runtime-metadata';
    document.documentElement.dataset.homeSyncAt=new Date().toISOString();
  }finally{refreshInFlight=false;}
}
function installRealtimeSync(){window.setInterval(()=>{if(!document.hidden)refreshHomepageData();},SYNC_INTERVAL_MS);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHomepageData();});window.addEventListener('focus',()=>refreshHomepageData());window.addEventListener('online',()=>refreshHomepageData());}
async function main(){installStyles();installHomepageAppFlow();simplifyPage();buildTeam();await refreshHomepageData();installRealtimeSync();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
