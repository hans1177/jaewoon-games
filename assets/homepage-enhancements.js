// 파일명: assets/homepage-enhancements.js
// 역할: 재운게임즈 공개 홈페이지를 게임 쇼케이스 중심으로 구성한다.
// 원칙: 게임/아트북 원본과 내부 운영 정책은 수정하지 않고 공개 표시만 단순화한다.
const SYNC_INTERVAL_MS=5000;
const RAW_MAIN_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/main';
const uiState={tab:'playable',platform:'all'};
let refreshInFlight=false;
let lastCatalogSignature='';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=value=>String(value??'').trim().toLowerCase();
const fetchJson=async path=>{
  const stamp=Date.now();
  for(const url of [`${RAW_MAIN_BASE}${path}`,path]){
    try{
      const response=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${stamp}`,{cache:'no-store'});
      if(response.ok)return await response.json();
    }catch{}
  }
  return null;
};

function isPlayable(game){
  return game?.homepageWebPlayable===true||Boolean(game?.robloxExperienceUrl)||Boolean(game?.releaseUrl);
}

function tabOf(game){
  if(isPlayable(game))return'playable';
  if(String(game?.productionClass||'')==='DESIGN_ONLY')return'planning';
  return'development';
}

function platformKeys(game){
  const keys=new Set();
  const preferred=normalize(game?.preferredPlatform);
  const target=normalize(game?.productionTarget);
  if(preferred.includes('roblox')||target.includes('roblox')||game?.robloxExperienceUrl)keys.add('roblox');
  if(preferred.includes('unity')||target.includes('unity')||game?.unityProjectPath)keys.add('unity');
  if(game?.homepageWebPlayable===true||normalize(target).includes('web'))keys.add('web');
  if(!keys.size)keys.add('planning');
  return [...keys];
}

function platformLabel(game){
  const keys=platformKeys(game);
  const labels=[];
  if(keys.includes('roblox'))labels.push('Roblox');
  if(keys.includes('unity'))labels.push('Unity');
  if(keys.includes('web'))labels.push('Web');
  if(!labels.length)labels.push('기획');
  return labels.join(' · ');
}

function publicStateLabel(game){
  const tab=tabOf(game);
  if(tab==='playable')return'플레이 가능';
  if(tab==='development')return'개발 중';
  return'기획 · 아트북';
}

function primaryHref(game){
  if(game?.robloxExperienceUrl)return game.robloxExperienceUrl;
  if(game?.releaseUrl)return game.releaseUrl;
  if(game?.homepageWebPlayable===true&&game?.webPath)return game.webPath;
  return null;
}

function artbookHref(game){
  return game?.homepageArtbookPath||(game?.homepageWebPlayable===false&&game?.webPath?game.webPath:null);
}

function installStyles(){
  if(document.getElementById('jaewoonPublicHomepageV3'))return;
  const style=document.createElement('style');
  style.id='jaewoonPublicHomepageV3';
  style.textContent=`
.reviews,.music,.opsBar,.catalogIntro,.tools,.filters,.sortRow,#heroDots{display:none!important}
.brandRow{justify-content:center!important;margin-bottom:10px!important}.brand{width:100%;justify-content:center}.brand img{object-position:center center!important}.companyLink{display:none!important}
#gameGrid,#gameHub>.sectionHead{display:none!important}
#hero.publicHero{width:96%;margin:0 auto 14px;min-height:360px;border:0;border-radius:24px;overflow:hidden;position:relative;color:#fff;background:#0b2131;box-shadow:0 16px 38px rgba(9,52,82,.24);isolation:isolate}
#hero.publicHero:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,14,24,.95) 0%,rgba(2,14,24,.72) 48%,rgba(2,14,24,.18) 100%),var(--public-hero-bg) center/cover no-repeat;z-index:-1}
#hero.publicHero:after{content:'';position:absolute;inset:auto 0 0;height:38%;background:linear-gradient(0deg,rgba(2,14,24,.58),transparent);z-index:-1}
.publicHeroInner{min-height:360px;padding:34px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start}.publicHeroEyebrow{display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border:1px solid rgba(255,255,255,.32);border-radius:999px;background:rgba(255,255,255,.12);font-size:10px;font-weight:900}
.publicHero h1{margin:9px 0 7px;font-family:'Jua',system-ui,sans-serif;font-size:44px;line-height:1.02;text-shadow:0 3px 13px #0009}.publicHero p{max-width:630px;margin:0;color:#e8f5fb;font-size:14px;font-weight:760;line-height:1.55;text-shadow:0 2px 8px #000a}
.publicHeroMeta,.publicHeroActions{display:flex;gap:6px;flex-wrap:wrap}.publicHeroMeta{margin-top:12px}.publicHeroMeta span{display:inline-flex;align-items:center;min-height:26px;padding:0 9px;border-radius:999px;background:rgba(255,255,255,.14);font-size:9px;font-weight:900}.publicHeroActions{gap:8px;margin-top:15px}
.publicHeroBtn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:12px;background:#2488df;color:#fff;text-decoration:none;font-size:12px;font-weight:1000;box-shadow:0 7px 18px rgba(0,0,0,.16)}.publicHeroBtn.secondary{background:rgba(255,255,255,.92);color:#155e9f}
#publicGameExperience{padding:17px 14px 18px}.publicGameHeader{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px}.publicGameHeader h2{margin:0;font-family:'Jua',system-ui,sans-serif;font-size:27px;color:#155e9f}.publicGameHeader p{margin:0;max-width:400px;text-align:right;color:#718fa4;font-size:9px;font-weight:850;line-height:1.45}
.publicTabs,.publicPlatforms{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.publicTabs::-webkit-scrollbar,.publicPlatforms::-webkit-scrollbar{display:none}.publicTabs{margin-bottom:9px}.publicPlatforms{margin-bottom:14px}.publicTab,.publicPlatform{flex:0 0 auto;min-height:36px;padding:0 12px;border:1px solid #b7d7e9;border-radius:999px;background:#f7fcff;color:#4d7087;font-size:10px;font-weight:1000}.publicTab.on,.publicPlatform.on{background:#176fae;border-color:#176fae;color:#fff}.publicTab b{margin-left:5px}.publicPlatform{min-height:30px;font-size:9px;background:#eef8fd}
.publicGameGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.publicGameCard{min-width:0;border:1px solid #d4e7f1;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 7px 18px rgba(37,96,132,.10)}.publicGameArt{aspect-ratio:16/9;position:relative;background:#17394f;overflow:hidden}.publicGameArt img{width:100%;height:100%;display:block;object-fit:cover;transition:transform .22s ease}.publicGameCard:hover .publicGameArt img{transform:scale(1.025)}.publicGameArt:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 46%,rgba(3,19,30,.86))}
.publicGameTitle{position:absolute;left:13px;right:13px;bottom:11px;z-index:1;color:#fff}.publicGameTitle strong{display:block;font-size:21px;font-weight:1000;text-shadow:0 2px 6px #000}.publicGameTitle small{display:block;margin-top:2px;color:#d8edf7;font-size:9px;font-weight:850}.publicGameBody{padding:13px}.publicBadges{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}.publicBadge{display:inline-flex;align-items:center;min-height:22px;padding:0 7px;border-radius:999px;background:#eaf5fc;color:#356987;font-size:8px;font-weight:1000}.publicBadge.playable{background:#d9f4e4;color:#197340}.publicBadge.development{background:#dcecff;color:#185f93}.publicBadge.planning{background:#f0e9ff;color:#6743a8}
.publicGameBody p{margin:0;min-height:42px;color:#536f82;font-size:10px;font-weight:730;line-height:1.5}.publicRecentLine{margin-top:8px;padding-top:8px;border-top:1px dashed #d3e4ed;color:#718a9b;font-size:8px;font-weight:820;line-height:1.45}.publicGameActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px}.publicGameAction{display:flex;align-items:center;justify-content:center;min-height:39px;padding:0 8px;border-radius:10px;background:#2488df;color:#fff;text-decoration:none;text-align:center;font-size:9px;font-weight:1000}.publicGameAction.secondary{background:#eef8ff;color:#1767a9;border:1px solid #afd7ef}.publicGameAction.off{background:#edf1f4;color:#81909a;pointer-events:none}.publicEmpty{grid-column:1/-1;padding:28px 14px;border:1px dashed #bcd6e5;border-radius:15px;background:#f8fcff;color:#67869b;text-align:center;font-size:11px;font-weight:800}
#latestUpdatesPanel{width:96%;margin:0 auto 12px;padding:16px;border:1px solid rgba(211,233,245,.98);border-radius:20px;background:rgba(255,255,255,.95);box-shadow:0 10px 26px rgba(28,93,138,.16)}.latestUpdatesHead{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:10px}.latestUpdatesHead h2{margin:0;font-family:'Jua',system-ui,sans-serif;font-size:24px;color:#155e9f}.latestUpdatesHead span{font-size:8px;color:#718fa4;font-weight:900}.latestUpdateList{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.latestUpdateItem{padding:11px;border-radius:13px;background:#eef8fd}.latestUpdateItem b{display:block;color:#1767a9;font-size:11px}.latestUpdateItem span{display:block;margin-top:4px;color:#5d788a;font-size:9px;font-weight:750;line-height:1.45}
.panel.company.publicCompany{margin-top:0!important;padding-bottom:12px!important}.publicCompany>.sectionHead h2{font-size:20px!important}.publicCompany .companyStats,.publicCompany .staff{display:none!important}.publicCompany .companySummary{grid-template-columns:1fr!important}.publicCompany .homepageManager{display:none!important}.publicCompany .companyNow{background:#12354d!important}.publicCompany .companyActions{margin-top:4px}
@media(max-width:700px){#hero.publicHero{min-height:315px;border-radius:20px}.publicHeroInner{min-height:315px;padding:25px 22px}.publicHero h1{font-size:34px}.publicGameGrid,.latestUpdateList{grid-template-columns:1fr}.publicGameHeader{align-items:flex-start;flex-direction:column}.publicGameHeader p{text-align:left}}
@media(max-width:430px){.publicHeroInner{padding:22px 18px}.publicHero h1{font-size:30px}#publicGameExperience{padding-left:10px;padding-right:10px}.publicGameTitle strong{font-size:19px}.publicGameActions{grid-template-columns:1fr}}
`;
  document.head.appendChild(style);
}

function heroScore(game){let score=0;if(isPlayable(game))score+=100;if(game?.featured===true)score+=35;if(String(game?.productionClass||'')==='RELEASE_CONFIRMED')score+=25;if(game?.homepageArtbookPath)score+=5;return score;}

function renderHero(catalog){
  const hero=document.getElementById('hero');
  if(!hero)return;
  const game=[...(catalog?.games||[])].sort((a,b)=>heroScore(b)-heroScore(a))[0];
  if(!game)return;
  const playHref=primaryHref(game),artHref=artbookHref(game);
  hero.className='panel hero publicHero';
  hero.style.setProperty('--public-hero-bg',`url('${String(game.image||'assets/insect-main-v3.webp').replaceAll("'",'%27')}')`);
  hero.innerHTML=`<div class="publicHeroInner"><span class="publicHeroEyebrow">재운게임즈 대표 게임</span><h1>${esc(game.name)}</h1><p>${esc(game.description||game.homepageRecentWork||'현재 개발 중인 게임입니다.')}</p><div class="publicHeroMeta"><span>${esc(publicStateLabel(game))}</span><span>${esc(platformLabel(game))}</span>${(game.genre||[]).slice(0,2).map(item=>`<span>${esc(item)}</span>`).join('')}</div><div class="publicHeroActions">${playHref?`<a class="publicHeroBtn" href="${esc(playHref)}">지금 플레이</a>`:'<a class="publicHeroBtn" href="#gameHub">게임 보기</a>'}${artHref?`<a class="publicHeroBtn secondary" href="${esc(artHref)}">아트북</a>`:''}</div></div>`;
}

function cardHtml(game){
  const state=tabOf(game),playHref=primaryHref(game),artHref=artbookHref(game);
  const primary=playHref?`<a class="publicGameAction" href="${esc(playHref)}">지금 플레이</a>`:`<span class="publicGameAction off">${state==='planning'?'기획 중':'개발 중'}</span>`;
  const secondary=artHref&&artHref!==playHref?`<a class="publicGameAction secondary" href="${esc(artHref)}">아트북</a>`:'';
  return `<article class="publicGameCard"><div class="publicGameArt"><img src="${esc(game.image||'assets/brand-header.webp')}" alt="${esc(game.name)} 커버" loading="lazy"><div class="publicGameTitle"><strong>${esc(game.name)}</strong><small>${esc((game.genre||[]).slice(0,3).join(' · '))}</small></div></div><div class="publicGameBody"><div class="publicBadges"><span class="publicBadge ${state}">${esc(publicStateLabel(game))}</span><span class="publicBadge">${esc(platformLabel(game))}</span></div><p>${esc(game.description||'게임 정보를 준비하고 있습니다.')}</p><div class="publicRecentLine">최근: ${esc(game.homepageRecentWork||game.homepageStage||'업데이트 준비 중')}</div><div class="publicGameActions">${primary}${secondary}</div></div></article>`;
}

function platformOptions(games){const present=new Set(games.flatMap(platformKeys));return [['all','전체'],...[['web','Web'],['roblox','Roblox'],['unity','Unity']].filter(([key])=>present.has(key))];}

function renderGameHub(catalog){
  const hub=document.getElementById('gameHub');if(!hub)return;
  const games=catalog?.games||[];let root=document.getElementById('publicGameExperience');
  if(!root){root=document.createElement('div');root.id='publicGameExperience';hub.appendChild(root);}
  const counts={playable:0,development:0,planning:0};games.forEach(game=>counts[tabOf(game)]++);
  const tabs=[['playable','플레이 가능'],['development','개발 중'],['planning','기획 · 아트북']],platforms=platformOptions(games);
  if(!platforms.some(([key])=>key===uiState.platform))uiState.platform='all';
  const visible=games.filter(game=>tabOf(game)===uiState.tab&&(uiState.platform==='all'||platformKeys(game).includes(uiState.platform)));
  root.innerHTML=`<div class="publicGameHeader"><h2>게임</h2><p>바로 플레이할 게임부터 개발 중인 프로젝트와 아트북까지 한곳에서 볼 수 있습니다.</p></div><div class="publicTabs">${tabs.map(([key,label])=>`<button type="button" class="publicTab${uiState.tab===key?' on':''}" data-home-tab="${key}">${label}<b>${counts[key]}</b></button>`).join('')}</div><div class="publicPlatforms">${platforms.map(([key,label])=>`<button type="button" class="publicPlatform${uiState.platform===key?' on':''}" data-home-platform="${key}">${label}</button>`).join('')}</div><div class="publicGameGrid">${visible.length?visible.map(cardHtml).join(''):'<div class="publicEmpty">이 조건에 맞는 게임은 아직 없습니다.</div>'}</div>`;
  root.querySelectorAll('[data-home-tab]').forEach(button=>button.addEventListener('click',()=>{uiState.tab=button.dataset.homeTab;renderGameHub(catalog);}));
  root.querySelectorAll('[data-home-platform]').forEach(button=>button.addEventListener('click',()=>{uiState.platform=button.dataset.homePlatform;renderGameHub(catalog);}));
}

function renderLatestUpdates(catalog){
  const hub=document.getElementById('gameHub');if(!hub?.parentElement)return;
  const games=[...(catalog?.games||[])].sort((a,b)=>heroScore(b)-heroScore(a)).slice(0,3);
  let panel=document.getElementById('latestUpdatesPanel');
  if(!panel){panel=document.createElement('section');panel.id='latestUpdatesPanel';hub.insertAdjacentElement('afterend',panel);}
  panel.innerHTML=`<div class="latestUpdatesHead"><h2>최근 업데이트</h2><span>게임 관련 핵심 변경만 표시</span></div><div class="latestUpdateList">${games.map(game=>`<div class="latestUpdateItem"><b>${esc(game.name)}</b><span>${esc(game.homepageRecentWork||game.homepageStage||'업데이트 준비 중')}</span></div>`).join('')}</div>`;
  const company=document.querySelector('.panel.company');if(company){company.classList.add('publicCompany');panel.insertAdjacentElement('afterend',company);}
}

function simplifyCompany(){
  const company=document.querySelector('.panel.company');if(!company)return;company.classList.add('publicCompany');
  const heading=company.querySelector('.sectionHead h2');if(heading)heading.textContent='재운게임즈';
  const sub=company.querySelector('.sectionHead span');if(sub)sub.textContent='게임을 만들고 출시 경험을 축적하는 개발 스튜디오';
}

async function refreshHomepage(){
  if(refreshInFlight)return;refreshInFlight=true;
  try{
    const catalog=await fetchJson('/game-catalog.json');if(!catalog?.games?.length)return;
    const signature=JSON.stringify({version:catalog.version,updatedAt:catalog.updatedAt,games:catalog.games.map(game=>[game.id,game.image,game.homepageStage,game.homepageRecentWork,game.homepageWebPlayable,game.preferredPlatform,game.productionTarget])});
    if(signature===lastCatalogSignature)return;lastCatalogSignature=signature;installStyles();renderHero(catalog);renderGameHub(catalog);renderLatestUpdates(catalog);simplifyCompany();
  }finally{refreshInFlight=false;}
}

function start(){installStyles();refreshHomepage();window.setInterval(refreshHomepage,SYNC_INTERVAL_MS);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
