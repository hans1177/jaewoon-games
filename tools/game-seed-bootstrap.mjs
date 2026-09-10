import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SEED_CATEGORIES=[
  'ACTION_SURVIVAL_ROGUELITE',
  'SINGLE_DEFENSE_STRATEGY',
  'PUZZLE',
  'CASUAL',
  'IDLE_GROWTH_RPG',
  'STORY_COMPLETE_RPG',
];
export const REPLENISH_TRIGGERS=new Set(['DISCARDED','OWNER_REMOVED','OWNER_REQUESTED_ADDITIONAL_SEED','OWNER_ADDED_CATEGORY']);
const clean=v=>String(v??'').trim();
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return structuredClone(fallback);}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const slugify=v=>clean(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48);
export function kstDate(value=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function normalizeSeedRegistry(raw={}){
  const state=raw&&typeof raw==='object'&&!Array.isArray(raw)?structuredClone(raw):{};
  state.version=Math.max(1,Number(state.version)||0);
  state.status=clean(state.status)||'ACTIVE';
  state.bootstrapComplete=state.bootstrapComplete===true;
  state.initialBatchCreatedAt=clean(state.initialBatchCreatedAt)||null;
  if(!Array.isArray(state.seeds))state.seeds=[];
  if(!Array.isArray(state.vacancies))state.vacancies=[];
  return state;
}
function evidenceItemValid(item){
  if(!item||typeof item!=='object'||Array.isArray(item))return false;
  const value=item.value;
  const numeric=typeof value==='number'&&Number.isFinite(value);
  if(numeric&&(!clean(item.source)||!clean(item.observedAt)))return false;
  if(value===undefined||value===null||value==='')return clean(item.status).toUpperCase()==='UNKNOWN';
  return Boolean(clean(item.metric));
}
export function validateMarketEvidence(items=[]){
  const list=Array.isArray(items)?items:[];
  const invalid=list.map((item,index)=>({item,index})).filter(({item})=>!evidenceItemValid(item)).map(({index})=>index);
  return {pass:invalid.length===0,invalidIndexes:invalid};
}
export function validateSeed(seed={}){
  const missing=[];
  const category=clean(seed.gameCategory);
  if(!SEED_CATEGORIES.includes(category)&&seed.ownerAddedCategory!==true)missing.push('gameCategory');
  if(!clean(seed.gameId))missing.push('gameId');
  if(!clean(seed.name))missing.push('name');
  if(!Array.isArray(seed.referenceGames)||seed.referenceGames.length===0)missing.push('referenceGames');
  if(!clean(seed.coreFunToLearn))missing.push('coreFunToLearn');
  if(!Array.isArray(seed.coreLoop)||seed.coreLoop.length<3)missing.push('coreLoop>=3');
  if(!clean(seed.distinctIdentity))missing.push('distinctIdentity');
  if(!clean(seed.targetAudience))missing.push('targetAudience');
  if(!clean(seed.targetSessionDirection))missing.push('targetSessionDirection');
  if(clean(seed.initialTargetPlatform)!=='ANDROID_MOBILE')missing.push('initialTargetPlatform=ANDROID_MOBILE');
  if(clean(seed.initialPlayMode)!=='SINGLE_PLAYER')missing.push('initialPlayMode=SINGLE_PLAYER');
  if(!['POSSIBLE','NOT_RECOMMENDED'].includes(clean(seed.steamExpansionPossible)))missing.push('steamExpansionPossible');
  if(!['POSSIBLE','NOT_RECOMMENDED'].includes(clean(seed.multiplayerExpansionPossible)))missing.push('multiplayerExpansionPossible');
  if(!['LOW','MEDIUM','HIGH'].includes(clean(seed.multiplayerExpansionValue)))missing.push('multiplayerExpansionValue');
  const market=validateMarketEvidence(seed.marketEvidence||[]);
  if(!market.pass)missing.push(`marketEvidenceInvalid:${market.invalidIndexes.join(',')}`);
  return {pass:missing.length===0,missing};
}
function normalizedSeed(seed,timestamp){
  const check=validateSeed(seed);if(!check.pass)throw new Error(`GAME_SEED_INVALID ${clean(seed.gameId)||clean(seed.name)||'UNKNOWN'}: ${check.missing.join(', ')}`);
  return {
    version:1,
    status:'ACTIVE',
    gameId:clean(seed.gameId),
    name:clean(seed.name),
    gameCategory:clean(seed.gameCategory),
    transformationMode:['HOMAGE','REINTERPRETATION'].includes(clean(seed.transformationMode))?clean(seed.transformationMode):'REINTERPRETATION',
    referenceGames:(seed.referenceGames||[]).map(x=>typeof x==='string'?{name:clean(x)}:{...x,name:clean(x?.name)}).filter(x=>x.name),
    coreFunToLearn:clean(seed.coreFunToLearn),
    coreLoop:(seed.coreLoop||[]).map(clean).filter(Boolean),
    distinctIdentity:clean(seed.distinctIdentity),
    marketEvidence:Array.isArray(seed.marketEvidence)?seed.marketEvidence:[],
    marketEvidenceRole:'TARGET_DESIGN_REFERENCE',
    marketEvidenceHardGate:false,
    targetAudience:clean(seed.targetAudience),
    targetSessionDirection:clean(seed.targetSessionDirection),
    initialTargetPlatform:'ANDROID_MOBILE',
    initialPlayMode:'SINGLE_PLAYER',
    steamExpansionPossible:clean(seed.steamExpansionPossible),
    multiplayerExpansionPossible:clean(seed.multiplayerExpansionPossible),
    multiplayerExpansionValue:clean(seed.multiplayerExpansionValue),
    futureMultiplayerMode:clean(seed.futureMultiplayerMode)||'NONE',
    commercialWithoutMultiplayer:true,
    sourceCodeRule:'OWN_IMPLEMENTATION_ONLY',
    directExpressionCopyForbidden:true,
    createdAt:timestamp,
    updatedAt:timestamp,
  };
}
export function createInitialSeedBatch(registry,inputSeeds,timestamp=new Date().toISOString()){
  const state=normalizeSeedRegistry(registry);
  if(state.bootstrapComplete)throw new Error('GAME_SEED_BOOTSTRAP_ALREADY_COMPLETE');
  if(!Array.isArray(inputSeeds)||inputSeeds.length!==SEED_CATEGORIES.length)throw new Error(`GAME_SEED_INITIAL_BATCH_REQUIRES_${SEED_CATEGORIES.length}`);
  const categories=inputSeeds.map(x=>clean(x.gameCategory));
  for(const category of SEED_CATEGORIES)if(categories.filter(x=>x===category).length!==1)throw new Error(`GAME_SEED_CATEGORY_REQUIRED_ONCE:${category}`);
  const ids=new Set();
  const seeds=inputSeeds.map(seed=>{const normalized=normalizedSeed(seed,timestamp);if(ids.has(normalized.gameId))throw new Error(`GAME_SEED_DUPLICATE_ID:${normalized.gameId}`);ids.add(normalized.gameId);return normalized;});
  state.seeds.push(...seeds);
  state.bootstrapComplete=true;
  state.initialBatchCreatedAt=timestamp;
  state.updatedAt=timestamp;
  return {state,seeds};
}
export function recordVacancy(registry,{gameId,category,reason,evidence=null},timestamp=new Date().toISOString()){
  const state=normalizeSeedRegistry(registry);
  const normalizedReason=clean(reason).toUpperCase();
  if(!['DISCARDED','OWNER_REMOVED'].includes(normalizedReason))throw new Error(`VACANCY_REASON_NOT_ALLOWED:${normalizedReason}`);
  const seed=state.seeds.find(x=>x.gameId===clean(gameId));
  const targetCategory=clean(category)||seed?.gameCategory;
  if(!targetCategory)throw new Error('VACANCY_CATEGORY_REQUIRED');
  if(seed){seed.status=normalizedReason;seed.updatedAt=timestamp;}
  const existing=state.vacancies.find(x=>x.gameId===clean(gameId)&&x.status==='OPEN');
  if(existing)return {state,vacancy:existing};
  const vacancy={id:`VAC-${state.vacancies.length+1}`,gameId:clean(gameId)||null,category:targetCategory,reason:normalizedReason,status:'OPEN',evidence,createdAt:timestamp};
  state.vacancies.push(vacancy);state.updatedAt=timestamp;return {state,vacancy};
}
export function replenishSeed(registry,seed,{vacancyId=null,trigger='DISCARDED'}={},timestamp=new Date().toISOString()){
  const state=normalizeSeedRegistry(registry);const normalizedTrigger=clean(trigger).toUpperCase();
  if(!REPLENISH_TRIGGERS.has(normalizedTrigger))throw new Error(`REPLENISH_TRIGGER_NOT_ALLOWED:${normalizedTrigger}`);
  let vacancy=null;
  if(['DISCARDED','OWNER_REMOVED'].includes(normalizedTrigger)){
    vacancy=state.vacancies.find(x=>x.id===clean(vacancyId)&&x.status==='OPEN');
    if(!vacancy)throw new Error('OPEN_VACANCY_REQUIRED');
    if(clean(seed.gameCategory)!==clean(vacancy.category))throw new Error(`REPLACEMENT_CATEGORY_MUST_MATCH:${vacancy.category}`);
  }
  const normalized=normalizedSeed(seed,timestamp);
  if(state.seeds.some(x=>x.gameId===normalized.gameId))throw new Error(`GAME_SEED_DUPLICATE_ID:${normalized.gameId}`);
  state.seeds.push(normalized);
  if(vacancy){vacancy.status='FILLED';vacancy.replacementGameId=normalized.gameId;vacancy.filledAt=timestamp;}
  state.updatedAt=timestamp;return {state,seed:normalized,vacancy};
}
export function materializeSeed(seed,{root='.',date=kstDate(),catalog=null}={}){
  const normalized=normalizedSeed(seed,seed.createdAt||new Date().toISOString());
  const seedPath=path.join(root,'design',normalized.gameId,date,'game-seed.json');
  writeJson(seedPath,normalized);
  const factPath=path.join(root,'artbook-submissions',normalized.gameId,date,'fact-pack.json');
  writeJson(factPath,{version:4,gameId:normalized.gameId,date,generatedBy:'game-seed-bootstrap',sourceMode:'GAME_SEED_METADATA',gameSeed:normalized,topics:{},missingEvidence:[],contracts:{gameSeedComplete:true,marketEvidenceIsTargetReferenceOnly:true,numericMarketClaimsRequireSourceAndObservedAt:true,sourceCodeMustBeOwnImplementation:true,directExpressionCopyForbidden:true}});
  const c=catalog||readJson(path.join(root,'game-catalog.json'),{games:[]});c.games??=[];
  let game=c.games.find(x=>x.id===normalized.gameId);
  const gameRecord={id:normalized.gameId,name:normalized.name,description:`${normalized.distinctIdentity} | 핵심 재미: ${normalized.coreFunToLearn}`,genre:normalized.gameCategory,productionClass:'DESIGN_ONLY',productionTier:3,productionTarget:'DESIGN_BASELINE',homepageVisible:false,playable:false,gameSeedPath:seedPath.replaceAll('\\','/'),initialTargetPlatform:'ANDROID_MOBILE',initialPlayMode:'SINGLE_PLAYER'};
  if(game)Object.assign(game,gameRecord);else c.games.push(gameRecord);
  writeJson(path.join(root,'game-catalog.json'),c);
  return {seedPath:seedPath.replaceAll('\\','/'),factPath:factPath.replaceAll('\\','/'),catalog:c,game:gameRecord};
}
export function materializeBatch(seeds,options={}){return seeds.map(seed=>materializeSeed(seed,options));}

async function main(){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')||'true'];}));
  const stateFile=args.state||'game-seed-registry.json';
  const inputFile=args.input;
  if(!inputFile)throw new Error('--input=<seed-json> required');
  const input=readJson(inputFile,null);if(!input)throw new Error(`seed input not found: ${inputFile}`);
  const current=normalizeSeedRegistry(readJson(stateFile,{}));
  const timestamp=new Date().toISOString();
  if(args.mode==='replenish'){
    const seed=input.seed||input;
    const result=replenishSeed(current,seed,{vacancyId:args.vacancy||input.vacancyId,trigger:args.trigger||input.trigger||'DISCARDED'},timestamp);
    materializeSeed(result.seed,{date:kstDate(timestamp)});writeJson(stateFile,result.state);
    console.log(`GAME_SEED_REPLENISHED=${result.seed.gameId}`);return;
  }
  const seeds=Array.isArray(input)?input:(input.seeds||[]);
  const result=createInitialSeedBatch(current,seeds,timestamp);
  materializeBatch(result.seeds,{date:kstDate(timestamp)});writeJson(stateFile,result.state);
  console.log(`GAME_SEED_BOOTSTRAP_COUNT=${result.seeds.length}`);
  console.log('GAME_SEED_BOOTSTRAP_COMPLETE=YES');
}

const invoked=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(invoked)await main();
