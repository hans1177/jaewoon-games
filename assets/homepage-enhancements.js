// 파일명: assets/homepage-enhancements.js
// 역할: 홈페이지의 검증된 안정판 롤백 표시와 게임별 아트북 부서 핵심 의견 표시를 보조한다.
// 게임 카드에는 실행 양호/주의/오류 같은 런타임 상태 배지나 숫자 점수를 표시하지 않는다.
const getJson=async url=>{try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch{return null;}};

const ARTBOOK_ROLE_LABELS={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const ARTBOOK_ROLE_ORDER=['planning','graphics','development','qa','balance'];

function installStyles(){
  if(document.getElementById('jaewoonEnhancementStyles'))return;
  const style=document.createElement('style');
  style.id='jaewoonEnhancementStyles';
  style.textContent=`
.rollbackNotice{display:block;margin-top:6px;padding:7px 8px;border-radius:8px;background:#fff3cd;color:#735800;font-size:10px;font-weight:900;line-height:1.4}
.artbookOpinionSummary{margin-top:9px;padding-top:8px;border-top:1px dashed #c7dce8}
.artbookOpinionTitle{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:5px;color:#1b659b;font-size:8px;font-weight:1000}
.artbookOpinionTitle small{color:#8199aa;font-size:7px;font-weight:900}
.artbookOpinionRows{display:grid;gap:4px}
.artbookOpinionRow{display:grid;grid-template-columns:34px minmax(0,1fr);gap:5px;align-items:center;min-height:20px;padding:3px 5px;border-radius:7px;background:#eef7fc}
.artbookOpinionRole{font-size:7px;font-weight:1000;color:#1768a7}
.artbookOpinionText{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:7px;font-weight:800;color:#4d6c80}
@media(max-width:720px){.artbookOpinionRow{grid-template-columns:31px minmax(0,1fr);padding:3px 4px}.artbookOpinionText{font-size:6.8px}}
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
    const meta=byName.get(name);if(!meta)return;
    const baseline=baselineById.get(meta.id);if(!baseline?.rollbackActive||!baseline?.fallbackDownload)return;
    const btn=card.querySelector('.cardBtn.primary');
    if(btn){btn.href=baseline.fallbackDownload;btn.textContent='안정판 APK';btn.removeAttribute('download');}
    const info=card.querySelector('.gameInfo');
    if(info&&!info.querySelector('.rollbackNotice')){
      const note=document.createElement('span');note.className='rollbackNotice';note.textContent='최신판 이상 감지 → 마지막 검증 안정판 표시 중';info.appendChild(note);
    }
  });
}

function latestVisibleArtbooks(artbooks){
  const map=new Map();
  for(const book of artbooks?.artbooks||[]){
    if(!book?.gameId||book.homepageVisible!==true||!book.departmentOpinions)continue;
    const prev=map.get(book.gameId);
    if(!prev||Number(book.edition||0)>Number(prev.edition||0)||String(book.createdAt||'')>String(prev.createdAt||''))map.set(book.gameId,book);
  }
  return map;
}

function coreOpinion(opinion){
  if(!opinion||typeof opinion!=='object')return'';
  const candidates=[opinion.decision,Array.isArray(opinion.counter)?opinion.counter[0]:'',Array.isArray(opinion.agree)?opinion.agree[0]:'',opinion.headline];
  return String(candidates.find(v=>String(v||'').trim())||'').replace(/\s+/g,' ').trim();
}

function applyArtbookOpinions(catalog,artbooks){
  const byName=new Map((catalog?.games||[]).map(g=>[g.name,g]));
  const byGame=latestVisibleArtbooks(artbooks);
  document.querySelectorAll('.gameCard').forEach(card=>{
    const name=card.querySelector('.artName b')?.textContent?.trim();
    const meta=byName.get(name);if(!meta)return;
    const info=card.querySelector('.gameInfo');if(!info)return;
    const previous=info.querySelector('.artbookOpinionSummary');
    const book=byGame.get(meta.id);
    if(!book){previous?.remove();return;}
    if(previous?.dataset.artbookId===String(book.id||''))return;
    previous?.remove();

    const rows=ARTBOOK_ROLE_ORDER.map(role=>({role,text:coreOpinion(book.departmentOpinions?.[role])})).filter(x=>x.text);
    if(!rows.length)return;

    const box=document.createElement('section');
    box.className='artbookOpinionSummary';
    box.dataset.artbookId=String(book.id||'');
    box.setAttribute('aria-label',`${name} 아트북 부서별 핵심 의견`);

    const title=document.createElement('div');title.className='artbookOpinionTitle';
    const titleText=document.createElement('span');titleText.textContent='아트북 의견';
    const edition=document.createElement('small');edition.textContent=`부서별 핵심 · ${rows.length}/5`;
    title.append(titleText,edition);

    const list=document.createElement('div');list.className='artbookOpinionRows';
    for(const row of rows){
      const item=document.createElement('div');item.className='artbookOpinionRow';
      const roleEl=document.createElement('b');roleEl.className='artbookOpinionRole';roleEl.textContent=ARTBOOK_ROLE_LABELS[row.role]||row.role;
      const text=document.createElement('span');text.className='artbookOpinionText';text.textContent=row.text;text.title=row.text;
      item.append(roleEl,text);list.appendChild(item);
    }
    box.append(title,list);
    info.appendChild(box);
  });
}

async function main(){
  installStyles();removeLegacyRuntimeBadges();
  const [catalog,baselines,artbooks]=await Promise.all([getJson('/game-catalog.json'),getJson('/public-release-baselines.json'),getJson('/game-artbooks.json')]);
  let rounds=0;
  const refresh=()=>{
    removeLegacyRuntimeBadges();
    applyVerifiedRollback(catalog,baselines);
    applyArtbookOpinions(catalog,artbooks);
    if(++rounds>20)clearInterval(timer);
  };
  const timer=setInterval(refresh,300);refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main,{once:true});else main();
