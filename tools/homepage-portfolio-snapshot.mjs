import fs from 'node:fs';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');
const LABELS={
  ACCELERATE:'우선개발',
  CONTINUE:'정상개발',
  FOCUSED_REPAIR:'집중수리',
  REDESIGN:'재설계',
  PAUSE:'일시중지',
  RETIRE_REVIEW:'종료검토',
  PENDING:'판정 대기'
};
const RANK={ACCELERATE:0,FOCUSED_REPAIR:1,CONTINUE:2,REDESIGN:3,PAUSE:4,RETIRE_REVIEW:5,PENDING:6};
function args(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}
export function buildHomepagePortfolioSnapshot({portfolio={},catalog={}}={}){
  const byId=new Map((portfolio.decisions||[]).map(x=>[clean(x.gameId),x]).filter(([id])=>id));
  const rows=[];
  for(const game of catalog.games||[]){
    const id=clean(game?.canonical?.identity?.gameId||game.id||game.gameId);
    const lifecycle=upper(game?.canonical?.lifecycle?.state||game.lifecycleState||'ACTIVE');
    const productionClass=upper(game?.canonical?.production?.class||game.productionClass||'DESIGN_ONLY');
    if(!id||!['ACTIVE','REBUILD','PAUSED'].includes(lifecycle))continue;
    if(!['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(productionClass))continue;
    const src=byId.get(id)||{};
    const decision=Object.hasOwn(LABELS,upper(src.decision))?upper(src.decision):'PENDING';
    rows.push({
      gameId:id,
      decision,
      label:LABELS[decision],
      priorityRank:RANK[decision],
      productionClass,
      lifecycleState:lifecycle,
      authority:decision==='PENDING'?'PENDING_AUTOMATION':'PRIMARY_AI_AND_VIBE_JOINT'
    });
  }
  rows.sort((a,b)=>a.priorityRank-b.priorityRank||a.gameId.localeCompare(b.gameId));
  const counts=Object.fromEntries(Object.keys(LABELS).map(k=>[k,rows.filter(x=>x.decision===k).length]));
  return{
    version:1,
    kind:'homepage-portfolio-status',
    publicSafe:true,
    authority:'SANITIZED_PORTFOLIO_CONTROL_SNAPSHOT',
    source:'vibe2-unreal-core:.vibe2/portfolio-decisions.json',
    generatedAt:new Date().toISOString(),
    counts,
    games:rows
  };
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const a=args();
  const portfolio=readJson(a.portfolio,{decisions:[]});
  const catalog=readJson(a.catalog||'game-catalog.json',{games:[]});
  const out=buildHomepagePortfolioSnapshot({portfolio,catalog});
  writeJson(a.output||'homepage-portfolio-status.json',out);
  console.log('HOMEPAGE_PORTFOLIO_SNAPSHOT=PASS');
  console.log('HOMEPAGE_PORTFOLIO_GAMES='+out.games.length);
}
