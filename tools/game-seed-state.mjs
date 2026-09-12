import fs from 'node:fs';

export const GAME_SEED_STATE_FILE='game-seed-state.json';
export const DEFAULT_SEED_CATEGORIES=[
  'ACTION_SURVIVAL_ROGUELITE',
  'SINGLE_DEFENSE_STRATEGY',
  'PUZZLE',
  'CASUAL',
  'IDLE_GROWTH_RPG',
  'STORY_COMPLETE_RPG'
];
export const PORTFOLIO_DEPARTMENTS=Object.freeze(['planning','graphics','development','qa','balance']);

const clean=v=>String(v??'').trim();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
export function readJson(file,fallback=null){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
export function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
export function normalizeSeedState(raw={}){
  const state=raw&&typeof raw==='object'&&!Array.isArray(raw)?structuredClone(raw):{};
  state.version=Math.max(1,Number(state.version)||0);
  state.policyDocument='COMPANY_FLOW.md';
  if(!Array.isArray(state.categories)||!state.categories.length)state.categories=[...DEFAULT_SEED_CATEGORIES];
  if(!Array.isArray(state.seeds))state.seeds=[];
  else state.seeds=state.seeds.map(seed=>{
    const normalized=seed&&typeof seed==='object'&&!Array.isArray(seed)?{...seed}:seed;
    if(normalized&&typeof normalized==='object'){
      delete normalized.replacementOfSeedId;
      delete normalized.replacementVacancyId;
    }
    return normalized;
  });
  if(!Array.isArray(state.portfolioSeedRequests))state.portfolioSeedRequests=[];
  else state.portfolioSeedRequests=state.portfolioSeedRequests.map(request=>{
    const normalized=request&&typeof request==='object'&&!Array.isArray(request)?{...request}:request;
    if(normalized&&typeof normalized==='object')delete normalized.linkedVacancyId;
    return normalized;
  });
  delete state.vacancies;
  return state;
}
export function loadSeedState(file=GAME_SEED_STATE_FILE){return normalizeSeedState(readJson(file,{}));}
export function saveSeedState(state,file=GAME_SEED_STATE_FILE){writeJson(file,normalizeSeedState(state));}
export function activeSeedForGame(state,gameId){return(state.seeds||[]).find(seed=>seed.gameId===gameId&&!['DISCARDED','REMOVED'].includes(clean(seed.status).toUpperCase()))||null;}
export function seedForGame(state,gameId){return(state.seeds||[]).find(seed=>seed.gameId===gameId)||null;}
export function activeSeedsForCategory(state,category){return(state.seeds||[]).filter(seed=>seed.GAME_CATEGORY===category&&!['DISCARDED','REMOVED'].includes(clean(seed.status).toUpperCase()));}
export function markSeedDiscarded(state,gameId,{reason='DISCARDED',timestamp=new Date().toISOString()}={}){
  const seed=seedForGame(state,gameId);if(!seed)return null;
  if(clean(seed.status).toUpperCase()==='DISCARDED')return {seed};
  seed.status='DISCARDED';seed.discardedAt=timestamp;seed.discardReason=reason;seed.updatedAt=timestamp;
  return {seed};
}
export function markSeedOwnerRemoved(state,gameId,{timestamp=new Date().toISOString()}={}){
  const seed=seedForGame(state,gameId);if(!seed)return null;
  seed.status='REMOVED';seed.removedAt=timestamp;seed.updatedAt=timestamp;
  return {seed};
}

export function portfolioDecisionBand(score){
  const n=Number(score);
  if(!Number.isFinite(n)||n<0||n>100)return 'INVALID';
  if(n>=80)return 'EXPAND';
  if(n>=60)return 'MAINTAIN';
  if(n>=40)return 'REVISE_OR_HOLD';
  return 'REDUCE_REVIEW';
}
export function evaluatePortfolioDepartmentScores(departmentScores={}){
  const normalized={};const errors=[];
  for(const department of PORTFOLIO_DEPARTMENTS){
    const score=Number(departmentScores?.[department]);
    if(!Number.isFinite(score)||score<0||score>100){errors.push(`INVALID_${department.toUpperCase()}_SCORE`);continue;}
    normalized[department]=score;
  }
  const aggregateScore=errors.length?null:PORTFOLIO_DEPARTMENTS.reduce((sum,department)=>sum+normalized[department],0)/PORTFOLIO_DEPARTMENTS.length;
  return {pass:errors.length===0,errors,departmentScores:normalized,aggregateScore,decisionBand:aggregateScore==null?'INVALID':portfolioDecisionBand(aggregateScore)};
}
export function validatePortfolioSeedRequest(request={}){
  const errors=[];
  const category=clean(request.category);
  const action=clean(request.action||'EXPAND').toUpperCase();
  const scoreResult=evaluatePortfolioDepartmentScores(request.departmentScores);
  if(!clean(request.id))errors.push('MISSING_REQUEST_ID');
  if(!category)errors.push('MISSING_CATEGORY');
  if(action!=='EXPAND')errors.push('ONLY_EXPAND_CREATES_GAME_SEED');
  errors.push(...scoreResult.errors);
  const evidenceRefs=uniq(request.evidenceRefs);
  if(!evidenceRefs.length)errors.push('MISSING_PORTFOLIO_EVIDENCE');
  const ownerOverride=request.ownerOverride===true;
  if(scoreResult.aggregateScore!=null&&scoreResult.aggregateScore<80&&!ownerOverride)errors.push('EXPAND_REQUIRES_SCORE_80_OR_OWNER_OVERRIDE');
  return {...scoreResult,pass:errors.length===0,errors,category,action,evidenceRefs,ownerOverride};
}
export function pendingPortfolioSeedRequests(state){
  const requests=(state?.portfolioSeedRequests||[]).filter(request=>!request.fulfilledAt&&!request.cancelledAt&&clean(request.status||'PENDING').toUpperCase()==='PENDING');
  return requests.map(request=>{
    const result=validatePortfolioSeedRequest(request);
    if(!result.pass)throw new Error(`INVALID_PORTFOLIO_SEED_REQUEST ${clean(request.id)||'UNKNOWN'}: ${result.errors.join(',')}`);
    return request;
  });
}
export function createPortfolioSeedRequest(state,{category,departmentScores,evidenceRefs,ownerOverride=false,timestamp=new Date().toISOString(),requestId=null}={}){
  state.portfolioSeedRequests??=[];
  const id=clean(requestId)||`PSR-${String(state.portfolioSeedRequests.length+1).padStart(5,'0')}`;
  const request={id,action:'EXPAND',category:clean(category),departmentScores:{...(departmentScores||{})},evidenceRefs:uniq(evidenceRefs),ownerOverride:ownerOverride===true,status:'PENDING',createdAt:timestamp,fulfilledAt:null,seedId:null,gameId:null};
  const result=validatePortfolioSeedRequest(request);
  if(!result.pass)throw new Error(`INVALID_PORTFOLIO_SEED_REQUEST ${id}: ${result.errors.join(',')}`);
  if(state.portfolioSeedRequests.some(row=>clean(row.id)===id))throw new Error(`DUPLICATE_PORTFOLIO_SEED_REQUEST ${id}`);
  request.aggregateScore=result.aggregateScore;
  request.decisionBand=ownerOverride&&result.aggregateScore<80?'OWNER_OVERRIDE_EXPAND':result.decisionBand;
  state.portfolioSeedRequests.push(request);
  return request;
}
export function fulfillPortfolioSeedRequest(request,seed,timestamp=new Date().toISOString()){
  if(!request||!seed)throw new Error('PORTFOLIO_SEED_REQUEST_AND_SEED_REQUIRED');
  request.status='FULFILLED';request.fulfilledAt=timestamp;request.seedId=seed.seedId;request.gameId=seed.gameId;return request;
}
