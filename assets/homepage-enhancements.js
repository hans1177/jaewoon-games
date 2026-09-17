// 파일명: assets/homepage-enhancements.js
// 역할: 기존 대문 껍데기는 그대로 두고, 서버 개발 큐가 읽히면 점수순 TOP30만 안전하게 덮어쓴다.
const RUNTIME_QUEUE='https://raw.githubusercontent.com/hans1177/jaewoon-games/company-runtime/development-queue.json';
const MAIN_CATALOG='https://raw.githubusercontent.com/hans1177/jaewoon-games/main/game-catalog.json';
const TOP_LIMIT=30;
const SYNC_MS=5000;
let refreshing=false;

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const gameId=row=>String(row?.gameId||row?.id||'').trim();
const scoreOf=row=>{
  for(const key of ['strictScore','reviewScore','webStrictScore','strictImplementationScore','homepageTestScore','webInitialCycleStrictScore','totalScore','score']){
    const value=row?.[key];
    if(value===null||value===undefined||value==='')continue;
    const score=Number(value);
    if(Number.isFinite(score))return score;
  }
  return null;
};

async function tryJson(url){
  try{
    const response=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)return null;
    return await response.json();
  }catch{return null;}
}

function top30(queue){
  const best=new Map();
  for(const row of Array.isArray(queue?.items)?queue.items:[]){
    const id=gameId(row),score=scoreOf(row);
    if(!id||score===null)continue;
    const old=best.get(id);
    if(!old||score>scoreOf(old))best.set(id,row);
  }
  return [...best.values()].sort((a,b)=>scoreOf(b)-scoreOf(a)||gameId(a).localeCompare(gameId(b))).slice(0,TOP_LIMIT);
}

function catalogMap(catalog){
  return new Map((Array.isArray(catalog?.games)?catalog.games:[]).map(game=>[String(game.id||'').trim(),game]));
}

function normalizePath(row,game){
  const raw=String(row?.webPath||row?.webSourcePath||row?.sourcePath||game?.webPath||'').trim().replace(/^\/+|\/+$/g,'').replace(/\/index\.html$/i,'');
  return raw?`/${raw}/`:'';
}

function renderTop30(queue,catalog){
  const grid=document.getElementById('gameGrid');
  if(!grid)return false;
  const rows=top30(queue);
  if(!rows.length)return false;
  const games=catalogMap(catalog||{});

  const heading=document.querySelector('#gameHub .sectionHead h2');
  const count=document.querySelector('#gameHub .sectionHead span');
  if(heading)heading.textContent='게임 TOP30';
  if(count)count.textContent=`개발중 · 서버 점수순 ${rows.length} / ${TOP_LIMIT}`;

  grid.style.display='grid';
  grid.innerHTML=rows.map((row,index)=>{
    const base=games.get(gameId(row))||{};
    const name=row.gameName||row.name||base.name||gameId(row);
    const image=row.image||base.image||'assets/pwa-icon-512.png';
    const description=row.description||base.description||'개발 중인 게임';
    const score=scoreOf(row);
    const path=normalizePath(row,base);
    const action=path?`<a class="cardBtn primary" href="${esc(path)}">게임 시작</a>`:'<span class="cardBtn off">개발중</span>';
    return `<article class="gameCard" data-game-id="${esc(gameId(row))}" data-rank="${index+1}" data-score="${esc(score)}"><div class="gameArt"><img src="${esc(image)}" alt="${esc(name)}" loading="lazy"><div class="artName"><b>#${index+1} ${esc(name)}</b><small>${esc(score)}점</small></div></div><div class="gameInfo"><div class="badges"><span class="badge stateDev">개발중</span><span class="badge platformWeb">${esc(score)}점</span></div><p>${esc(description)}</p><div class="stageLine">서버 점수순 · 5초 자동 동기화</div><div class="cardActions">${action}</div></div></article>`;
  }).join('');

  document.documentElement.dataset.homeTop30Count=String(rows.length);
  document.documentElement.dataset.homePrimaryGameSource='DEVELOPMENT_QUEUE';
  document.documentElement.dataset.homeSyncAt=new Date().toISOString();
  return true;
}

function bindApkInstall(){
  const button=document.getElementById('appInstallBtn');
  if(!button||button.dataset.apkBound==='1')return;
  button.dataset.apkBound='1';
  button.disabled=false;
  button.textContent='재운컴퍼니 APK 설치';
  button.addEventListener('click',event=>{event.preventDefault();window.location.href='/downloads/jaewoon-company.apk';});
}

async function refresh(){
  if(refreshing)return;
  refreshing=true;
  try{
    const queue=await tryJson(RUNTIME_QUEUE);
    if(!queue){
      document.documentElement.dataset.homePrimaryGameSource='LEGACY_FALLBACK';
      return;
    }
    const catalog=await tryJson(MAIN_CATALOG);
    renderTop30(queue,catalog||{});
  }finally{refreshing=false;}
}

async function main(){
  bindApkInstall();
  await refresh();
  setInterval(()=>{if(!document.hidden)refresh();},SYNC_MS);
  window.addEventListener('focus',refresh);
  window.addEventListener('online',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
