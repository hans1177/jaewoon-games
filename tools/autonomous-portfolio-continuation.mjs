import fs from 'node:fs';
import {loadSeedState,platformRepresentativeGaps,unfilledVacancies} from './game-seed-state.mjs';
import {normalizeSeedPlatform,representativeCategoriesForPlatform} from './game-seed-platform-profile.mjs';

const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const DEPARTMENTS=['planning','graphics','development','qa','balance'];

function kstDate(value=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function departmentScores(portfolio){
  const candidates=[portfolio?.portfolioGovernance?.departmentScores,portfolio?.departmentScores,portfolio?.latestDepartmentScores,portfolio?.portfolioDecision?.departmentScores];
  const source=candidates.find(v=>v&&typeof v==='object'&&!Array.isArray(v));if(!source)return null;
  const scores={};for(const d of DEPARTMENTS){const n=Number(source[d]?.score??source[d]);if(!Number.isFinite(n)||n<0||n>100)return null;scores[d]=n;}
  return scores;
}
function aggregateScore(scores){return DEPARTMENTS.reduce((sum,d)=>sum+scores[d],0)/DEPARTMENTS.length;}
function expansionCandidate(portfolio,primaryPlatform,representativeCategories){
  const raw=portfolio?.portfolioExpansionCandidate||portfolio?.expansionCandidate||portfolio?.portfolioDecision?.expansionCandidate;if(!raw||typeof raw!=='object')return null;
  const platform=normalizeSeedPlatform(raw.platform||primaryPlatform),category=clean(raw.category);if(!platform||!category)return null;
  return{platform,category,reason:clean(raw.reason)||'FIVE_DEPARTMENT_EXPANSION_EVIDENCE',withinRepresentativeSet:representativeCategories.includes(category)};
}

export function decidePortfolioContinuation({portfolio={},queueState={},seedState=null,directive=null,date=kstDate(),filesystem=fs}={}){
  if(portfolio.status!=='ACTIVE'||portfolio.paidApi!==false)return{action:'HOLD',reason:'PORTFOLIO_POLICY_BLOCK'};
  const maxDaily=Math.max(1,Math.min(24,Number(portfolio.maxAutonomousWorkItemsPerDay??8)||8));
  const attempts=(queueState.attempts||[]).filter(x=>x.date===date),attempted=new Set(attempts.map(x=>x.gameId));
  const eligible=(portfolio.projects||[]).filter(p=>p.mode!=='HOLD'&&p.sourcePath&&filesystem.existsSync(p.sourcePath)),remaining=eligible.filter(p=>!attempted.has(p.id));
  if(remaining.length)return{action:'WAIT_GAME_QUEUE',reason:'GAME_WORK_REMAINS',date,remaining:remaining.map(x=>x.id),attempts:attempts.length,maxDaily};

  const seeds=seedState||loadSeedState(),policy=directive||readJson('company-directive.json',{});
  if(!seeds.bootstrapCompletedAt)return{action:'DISPATCH_GAME_SEED',reason:'HISTORICAL_INITIAL_SEED_BOOTSTRAP_REQUIRED',date,attempts:attempts.length,maxDaily,seedMode:'INITIAL_BOOTSTRAP'};

  const primaryPlatform=normalizeSeedPlatform(policy?.gameSeed?.initialTargetPlatform||policy?.platformStrategy?.primaryPlatform||'ROBLOX')||'ROBLOX';
  const representativeCategories=representativeCategoriesForPlatform(policy,primaryPlatform),gaps=platformRepresentativeGaps(seeds,primaryPlatform,representativeCategories);
  if(gaps.length)return{action:'DISPATCH_GAME_SEED',reason:'PRIMARY_PLATFORM_REPRESENTATIVE_SET_GAP',date,attempts:attempts.length,maxDaily,seedMode:'PLATFORM_SET_FILL',platform:primaryPlatform,categories:gaps};

  const vacancies=unfilledVacancies(seeds);
  if(vacancies.length)return{action:'DISPATCH_GAME_SEED',reason:'GAME_SEED_VACANCY_REPLENISHMENT_REQUIRED',date,attempts:attempts.length,maxDaily,seedMode:'DYNAMIC_REPLENISHMENT',vacancies:vacancies.map(v=>({id:v.id,platform:normalizeSeedPlatform(v.platform)||null,category:v.category,reason:v.reason}))};
  if(attempts.length>=maxDaily)return{action:'STOP',reason:'DAILY_AUTONOMOUS_CAP_REACHED',date,attempts:attempts.length,maxDaily};

  const scores=departmentScores(portfolio);
  if(!scores)return{action:'STOP',reason:'PORTFOLIO_SCORE_EVIDENCE_REQUIRED',date,attempts:attempts.length,maxDaily,platform:primaryPlatform,representativeSetComplete:true};
  const score=aggregateScore(scores),scoreRounded=Math.round(score*100)/100;
  if(score>=80){
    const candidate=expansionCandidate(portfolio,primaryPlatform,representativeCategories);
    if(!candidate)return{action:'HOLD',reason:'EXPANSION_TARGET_EVIDENCE_REQUIRED',date,attempts:attempts.length,maxDaily,portfolioScore:scoreRounded,departmentScores:scores,platform:primaryPlatform};
    return{action:'DISPATCH_GAME_SEED',reason:'FIVE_DEPARTMENT_SCORE_GUIDED_EXPANSION',date,attempts:attempts.length,maxDaily,seedMode:'PORTFOLIO_EXPANSION',portfolioScore:scoreRounded,departmentScores:scores,expansionCandidate:candidate};
  }
  if(score>=60)return{action:'STOP',reason:'PORTFOLIO_MAINTAIN',date,attempts:attempts.length,maxDaily,portfolioScore:scoreRounded,departmentScores:scores};
  if(score>=40)return{action:'HOLD',reason:'PORTFOLIO_REVISE_OR_HOLD',date,attempts:attempts.length,maxDaily,portfolioScore:scoreRounded,departmentScores:scores};
  return{action:'HOLD',reason:'PORTFOLIO_REDUCE_REVIEW',date,attempts:attempts.length,maxDaily,portfolioScore:scoreRounded,departmentScores:scores};
}

if(import.meta.url===`file://${process.argv[1]}`){
  console.log(JSON.stringify(decidePortfolioContinuation({portfolio:readJson('autonomous-portfolio.json',{}),queueState:readJson('.autonomous/queue-state.json',{attempts:[]}),seedState:loadSeedState(),directive:readJson('company-directive.json',{})}),null,2));
}
