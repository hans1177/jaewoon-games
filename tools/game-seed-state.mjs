import fs from 'node:fs';
import {normalizeSeedPlatform} from './game-seed-platform-profile.mjs';

export const GAME_SEED_STATE_FILE='game-seed-state.json';
export const DEFAULT_SEED_CATEGORIES=[
  'ACTION_SURVIVAL_ROGUELITE',
  'SINGLE_DEFENSE_STRATEGY',
  'PUZZLE',
  'CASUAL',
  'IDLE_GROWTH_RPG',
  'STORY_COMPLETE_RPG'
];

const clean=v=>String(v??'').trim();
export function readJson(file,fallback=null){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
export function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
export function normalizeSeedState(raw={}){
  const state=raw&&typeof raw==='object'&&!Array.isArray(raw)?structuredClone(raw):{};
  state.version=Math.max(1,Number(state.version)||0);
  state.policyDocument='COMPANY_FLOW.md';
  if(!Array.isArray(state.categories)||!state.categories.length)state.categories=[...DEFAULT_SEED_CATEGORIES];
  if(!Array.isArray(state.seeds))state.seeds=[];
  if(!Array.isArray(state.vacancies))state.vacancies=[];
  if(!state.platformSets||typeof state.platformSets!=='object'||Array.isArray(state.platformSets))state.platformSets={};
  return state;
}
export function loadSeedState(file=GAME_SEED_STATE_FILE){return normalizeSeedState(readJson(file,{}));}
export function saveSeedState(state,file=GAME_SEED_STATE_FILE){writeJson(file,normalizeSeedState(state));}
export function seedPlatform(seed){return normalizeSeedPlatform(seed?.selectedPlatform||seed?.INITIAL_TARGET_PLATFORM||seed?.targetPlatform);}
export function activeSeedForGame(state,gameId){return(state.seeds||[]).find(seed=>seed.gameId===gameId&&!['DISCARDED','REMOVED'].includes(clean(seed.status).toUpperCase()))||null;}
export function seedForGame(state,gameId){return(state.seeds||[]).find(seed=>seed.gameId===gameId)||null;}
export function activeSeedsForCategory(state,category){return(state.seeds||[]).filter(seed=>seed.GAME_CATEGORY===category&&!['DISCARDED','REMOVED'].includes(clean(seed.status).toUpperCase()));}
export function activeSeedsForPlatform(state,platform){
  const p=normalizeSeedPlatform(platform);
  return(state.seeds||[]).filter(seed=>seedPlatform(seed)===p&&!['DISCARDED','REMOVED'].includes(clean(seed.status).toUpperCase()));
}
export function activeSeedsForPlatformCategory(state,platform,category){
  const c=clean(category);
  return activeSeedsForPlatform(state,platform).filter(seed=>clean(seed.GAME_CATEGORY)===c);
}
export function platformRepresentativeGaps(state,platform,categories=[]){
  const p=normalizeSeedPlatform(platform);
  return[...new Set((categories||[]).map(clean).filter(Boolean))].filter(category=>activeSeedsForPlatformCategory(state,p,category).length===0);
}
export function recordPlatformSetState(state,{platform,categories=[],timestamp=new Date().toISOString()}={}){
  const p=normalizeSeedPlatform(platform);if(!p)return null;
  state.platformSets??={};
  const gaps=platformRepresentativeGaps(state,p,categories);
  const row={platform:p,categories:[...new Set((categories||[]).map(clean).filter(Boolean))],gaps,complete:gaps.length===0,updatedAt:timestamp};
  state.platformSets[p]=row;return row;
}
export function unfilledVacancies(state){return(state.vacancies||[]).filter(v=>!v.filledAt&&!v.replacementSeedId);}
export function createSeedVacancy(state,{category,platform=null,reason,sourceSeedId=null,sourceGameId=null,timestamp=new Date().toISOString()}={}){
  const normalizedCategory=clean(category);
  const normalizedPlatform=normalizeSeedPlatform(platform);
  const normalizedReason=clean(reason);
  if(!normalizedCategory||!normalizedReason)throw new Error('SEED_VACANCY_CATEGORY_AND_REASON_REQUIRED');
  const existing=(state.vacancies||[]).find(v=>!v.filledAt&&v.category===normalizedCategory&&normalizeSeedPlatform(v.platform)===normalizedPlatform&&clean(v.sourceSeedId)===clean(sourceSeedId)&&clean(v.sourceGameId)===clean(sourceGameId)&&v.reason===normalizedReason);
  if(existing)return existing;
  const vacancy={id:`VAC-${String((state.vacancies||[]).length+1).padStart(5,'0')}`,category:normalizedCategory,platform:normalizedPlatform||null,reason:normalizedReason,sourceSeedId:sourceSeedId||null,sourceGameId:sourceGameId||null,createdAt:timestamp,filledAt:null,replacementSeedId:null};
  state.vacancies??=[];state.vacancies.push(vacancy);return vacancy;
}
export function markSeedDiscarded(state,gameId,{reason='DISCARDED',timestamp=new Date().toISOString()}={}){
  const seed=seedForGame(state,gameId);if(!seed)return null;
  if(clean(seed.status).toUpperCase()==='DISCARDED')return {seed,vacancy:(state.vacancies||[]).find(v=>v.sourceSeedId===seed.seedId&&!v.filledAt)||null};
  seed.status='DISCARDED';seed.discardedAt=timestamp;seed.discardReason=reason;seed.updatedAt=timestamp;
  const vacancy=createSeedVacancy(state,{category:seed.GAME_CATEGORY,platform:seedPlatform(seed),reason:'DISCARDED',sourceSeedId:seed.seedId,sourceGameId:seed.gameId,timestamp});
  return {seed,vacancy};
}
export function markSeedOwnerRemoved(state,gameId,{timestamp=new Date().toISOString()}={}){
  const seed=seedForGame(state,gameId);if(!seed)return null;
  seed.status='REMOVED';seed.removedAt=timestamp;seed.updatedAt=timestamp;
  const vacancy=createSeedVacancy(state,{category:seed.GAME_CATEGORY,platform:seedPlatform(seed),reason:'OWNER_REMOVED',sourceSeedId:seed.seedId,sourceGameId:seed.gameId,timestamp});
  return {seed,vacancy};
}
export function fillVacancy(vacancy,seed,timestamp=new Date().toISOString()){
  vacancy.filledAt=timestamp;vacancy.replacementSeedId=seed.seedId;vacancy.replacementGameId=seed.gameId;vacancy.replacementPlatform=seedPlatform(seed)||null;return vacancy;
}
