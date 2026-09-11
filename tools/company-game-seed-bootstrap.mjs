import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {DEFAULT_SEED_CATEGORIES,loadSeedState,saveSeedState,unfilledVacancies,fillVacancy} from './game-seed-state.mjs';
import {assertGameSeed} from './company-game-seed-contract.mjs';

const clean=v=>String(v??'').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const slugify=v=>clean(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42);
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const directive=readJson('company-directive.json',{});
const config=directive.gameSeed||{};
const categories=uniq(config.bootstrap?.categories||DEFAULT_SEED_CATEGORIES);
const state=loadSeedState();
state.categories=categories;
const evidenceFile=clean(process.env.GAME_SEED_MARKET_EVIDENCE_FILE)||'game-seed-market-evidence.json';
const marketInput=readJson(evidenceFile,{categories:{}})||{categories:{}};
const model=clean(process.env.GAME_SEED_LOCAL_MODEL)||clean(directive.ai?.modelPool?.[0])||'qwen3:0.6b';
const MODEL_TIMEOUT_MS=Math.max(30000,Number(process.env.GAME_SEED_MODEL_TIMEOUT_MS||240000));

const TEXT={type:'string',maxLength:1200};
const PROPOSAL_PROPERTIES={
  requestId:{type:'string',maxLength:120},
  category:{type:'string',maxLength:80},
  gameName:{type:'string',maxLength:120},
  referenceGames:{type:'array',minItems:1,maxItems:4,uniqueItems:true,items:{type:'string',maxLength:120}},
  coreFunToLearn:{type:'array',minItems:1,maxItems:6,uniqueItems:true,items:{type:'string',maxLength:300}},
  coreLoop:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:{type:'string',maxLength:300}},
  distinctIdentity:TEXT,
  targetAudience:{type:'string',maxLength:600},
  targetSessionDirection:{type:'string',maxLength:500},
  steamExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},
  multiplayerExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},
  multiplayerExpansionValue:{type:'string',enum:['LOW','MEDIUM','HIGH']},
  transformationMode:{type:'string',enum:['HOMAGE','REINTERPRETATION']},
};
const REQUIRED_PROPOSAL=['requestId','category','gameName','referenceGames','coreFunToLearn','coreLoop','distinctIdentity','targetAudience','targetSessionDirection','steamExpansionPossible','multiplayerExpansionPossible','multiplayerExpansionValue','transformationMode'];
const batchSchema=count=>({type:'object',required:['proposals'],properties:{proposals:{type:'array',minItems:count,maxItems:count,items:{type:'object',required:REQUIRED_PROPOSAL,properties:PROPOSAL_PROPERTIES,additionalProperties:false}}},additionalProperties:false});

function rawCategoryEvidence(category){
  const byObject=marketInput.categories&&typeof marketInput.categories==='object'&&!Array.isArray(marketInput.categories)?marketInput.categories[category]:null;
  if(byObject)return byObject;
  if(Array.isArray(marketInput.categories))return marketInput.categories.find(x=>clean(x.category)===category)||null;
  return null;
}
function sanitizeMetric(metric){
  if(!metric||typeof metric!=='object'||Array.isArray(metric))return null;
  const name=clean(metric.metric||metric.name||metric.type);if(!name)return null;
  const source=clean(metric.source||metric.sourceUrl||metric.publisher);
  const observedAt=clean(metric.observedAt||metric.observed_at||metric.date);
  let value=metric.value??'UNKNOWN';
  const numericLike=typeof value==='number'||(/\d/.test(clean(value))&&clean(value).toUpperCase()!=='UNKNOWN');
  if(numericLike&&(!source||!observedAt))value='UNKNOWN';
  return{metric:name,value:value===''?'UNKNOWN':value,source:source||null,observedAt:observedAt||null,note:clean(metric.note)||null,numericClaimAccepted:numericLike?Boolean(source&&observedAt):false};
}
function sanitizeMarketEvidence(category){
  const raw=rawCategoryEvidence(category);
  const refs=Array.isArray(raw?.references)?raw.references:Array.isArray(raw?.games)?raw.games:[];
  const references=[];
  for(const ref of refs){
    if(typeof ref==='string'){references.push({title:clean(ref),metrics:[]});continue;}
    if(!ref||typeof ref!=='object')continue;
    const title=clean(ref.title||ref.name||ref.game);if(!title)continue;
    const metrics=(Array.isArray(ref.metrics)?ref.metrics:[]).map(sanitizeMetric).filter(Boolean);
    references.push({title,metrics,qualitative:clean(ref.qualitative||ref.note)||null});
  }
  return{role:'TARGET_DESIGN_REFERENCE',hardPassFailGate:false,missingDataDoesNotRejectSeed:true,marketDataAloneCannotDiscard:true,available:references.some(r=>r.metrics.length||r.qualitative),sourceFile:fs.existsSync(evidenceFile)?evidenceFile:null,references};
}
function initialSerialCount(category){return(state.seeds||[]).filter(s=>s.GAME_CATEGORY===category).length;}
function uniqueGameId(category,name,used){
  const categorySlug=category.toLowerCase().replace(/_/g,'-').slice(0,20);const nameSlug=slugify(name)||'game';let id=`seed-${categorySlug}-${nameSlug}`.slice(0,63);let n=2;
  while(used.has(id)){id=`seed-${categorySlug}-${nameSlug}-${n++}`.slice(0,63);}used.add(id);return id;
}
function normalizeProposal(target,p){
  const proposal={...(p||{}),requestId:clean(p?.requestId)||target.requestId,category:clean(p?.category)||target.category};
  proposal.referenceGames=uniq(p?.referenceGames);
  proposal.coreFunToLearn=uniq(p?.coreFunToLearn);
  proposal.coreLoop=uniq(p?.coreLoop);
  const structuralFallback=[
    `${target.category} 핵심 행동을 수행한다`,
    '행동 결과와 위험·보상 피드백을 확인한다',
    '획득한 보상과 정보로 다음 선택·성장을 결정한다'
  ];
  for(const step of structuralFallback){if(proposal.coreLoop.length>=3)break;if(!proposal.coreLoop.includes(step))proposal.coreLoop.push(step);}
  return proposal;
}
function validateProposal(target,p){
  const missing=[];
  if(clean(p?.requestId)!==target.requestId)missing.push('requestId');
  if(clean(p?.category)!==target.category)missing.push('category');
  if(!clean(p?.gameName))missing.push('gameName');
  if(!uniq(p?.referenceGames).length)missing.push('referenceGames');
  if(!uniq(p?.coreFunToLearn).length)missing.push('coreFunToLearn');
  if(uniq(p?.coreLoop).length<3)missing.push('coreLoop>=3');
  if(!clean(p?.distinctIdentity))missing.push('distinctIdentity');
  if(!clean(p?.targetAudience))missing.push('targetAudience');
  if(!clean(p?.targetSessionDirection))missing.push('targetSessionDirection');
  if(!['POSSIBLE','NOT_RECOMMENDED'].includes(p?.steamExpansionPossible))missing.push('steamExpansionPossible');
  if(!['POSSIBLE','NOT_RECOMMENDED'].includes(p?.multiplayerExpansionPossible))missing.push('multiplayerExpansionPossible');
  if(!['LOW','MEDIUM','HIGH'].includes(p?.multiplayerExpansionValue))missing.push('multiplayerExpansionValue');
  if(!['HOMAGE','REINTERPRETATION'].includes(p?.transformationMode))missing.push('transformationMode');
  if(missing.length)throw new Error(`GAME_SEED_INVALID ${target.category}: ${missing.join(',')}`);
}
async function callModelBatch(targets){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),MODEL_TIMEOUT_MS);
  const requestPayload=targets.map(t=>({requestId:t.requestId,category:t.category,generation:t.generation,replacement:t.vacancy?{vacancyId:t.vacancy.id,sourceSeedId:t.vacancy.sourceSeedId}:null,marketEvidence:t.marketEvidence.available?t.marketEvidence.references:'UNKNOWN'}));
  const prompt=`다음 GAME_SEED 요청을 한 번의 배치로 모두 작성하라. 요청 수와 requestId/category를 정확히 보존한다. coreLoop는 반드시 서로 다른 3개 이상의 단계로 작성하며 행동 → 결과 피드백 → 다음 선택/보상 흐름이 보여야 한다. 각 분류마다 유명하고 상업적 또는 대중적 성공이 검증된 출시작을 레퍼런스로 골라 핵심 재미·루프·성장·경제·UX 구조를 학습하되, 새 게임은 HOMAGE 또는 REINTERPRETATION으로 독자 정체성을 만든다. 원작 이름/캐릭터/스토리/맵/아트/음악/UI 아트/소스코드를 복제하지 않는다. 소스코드는 반드시 자체 구현한다. 초기 제품은 Android 모바일 싱글플레이다. 멀티 없이도 상품성이 있어야 한다. 시장근거는 통과/탈락 게이트가 아니라 타겟 연령·세션·콘텐츠량·수익모델 방향 참고용이다. 제공되지 않은 매출·연령·플레이시간 숫자는 절대 추정하지 않는다. REQUESTS=${JSON.stringify(requestPayload)}. JSON 스키마만 출력하라.`;
  try{
    const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,keep_alive:'0s',format:batchSchema(targets.length),messages:[{role:'system',content:'너는 재운컴퍼니 GAME_SEED 선택 AI다. 성공 구조는 오마주/재해석하지만 보호되는 표현과 소스코드는 복제하지 않는다. 여러 요청을 반드시 한 응답에서 완성하고, 각 coreLoop는 중복 없는 최소 3단계로 작성한다.'},{role:'user',content:prompt}],options:{temperature:0.3,num_ctx:16384,num_predict:6000}}),signal:controller.signal});
    if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
    const body=await response.json();const text=clean(body?.message?.content);if(!text)throw new Error('empty model response');
    const parsed=JSON.parse(text);if(!Array.isArray(parsed.proposals)||parsed.proposals.length!==targets.length)throw new Error(`GAME_SEED_BATCH_COUNT_MISMATCH ${parsed.proposals?.length||0}/${targets.length}`);
    return parsed.proposals;
  }finally{clearTimeout(timer);}
}
function buildSeed(target,p,{serial,gameId,timestamp}){
  validateProposal(target,p);
  const seed={version:1,seedId:`SEED-${target.category}-${String(serial).padStart(3,'0')}`,gameId,gameName:clean(p.gameName),status:'ACTIVE',generation:target.generation,GAME_CATEGORY:target.category,REFERENCE_GAMES:uniq(p.referenceGames),CORE_FUN_TO_LEARN:uniq(p.coreFunToLearn),CORE_LOOP:uniq(p.coreLoop),DISTINCT_IDENTITY:clean(p.distinctIdentity),MARKET_EVIDENCE_SUMMARY:target.marketEvidence,TARGET_AUDIENCE:clean(p.targetAudience),TARGET_SESSION_DIRECTION:clean(p.targetSessionDirection),INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE',INITIAL_PLAY_MODE:'SINGLE_PLAYER',STEAM_EXPANSION_POSSIBLE:p.steamExpansionPossible,MULTIPLAYER_EXPANSION_POSSIBLE:p.multiplayerExpansionPossible,MULTIPLAYER_EXPANSION_VALUE:p.multiplayerExpansionValue,TRANSFORMATION_MODE:p.transformationMode,SOURCE_CODE_RULE:'OWN_IMPLEMENTATION_ONLY',COMMERCIAL_RULE:'MUST_WORK_WITHOUT_MULTIPLAYER',replacementOfSeedId:target.vacancy?.sourceSeedId||null,replacementVacancyId:target.vacancy?.id||null,createdAt:timestamp,updatedAt:timestamp};
  assertGameSeed(seed);return seed;
}

export async function runGameSeedBootstrap({timestamp=new Date().toISOString(),proposalProvider=null}={}){
  if(config.enabled===false)return{action:'DISABLED',created:[],modelCalls:0};
  const initial=!state.bootstrapCompletedAt;
  const targets=[];
  if(initial){
    if(categories.length!==Number(config.bootstrap?.count||6))throw new Error(`GAME_SEED_BOOTSTRAP_CATEGORY_COUNT_MISMATCH ${categories.length}/${config.bootstrap?.count||6}`);
    if((state.seeds||[]).some(s=>s.generation==='INITIAL_BOOTSTRAP'))throw new Error('PARTIAL_INITIAL_BOOTSTRAP_STATE_FORBIDDEN');
    for(const [index,category] of categories.entries())targets.push({requestId:`INITIAL-${index+1}-${category}`,category,generation:'INITIAL_BOOTSTRAP',vacancy:null,marketEvidence:sanitizeMarketEvidence(category)});
  }else{
    for(const vacancy of unfilledVacancies(state)){const category=clean(vacancy.category);if(category)targets.push({requestId:`VACANCY-${vacancy.id}`,category,generation:'REPLENISHMENT',vacancy,marketEvidence:sanitizeMarketEvidence(category)});}
  }
  if(!targets.length){state.lastRunAt=timestamp;state.lastAction='NO_VACANCY';saveSeedState(state);return{action:'NO_VACANCY',created:[],modelCalls:0,marketEvidenceFile:fs.existsSync(evidenceFile)?evidenceFile:null,paidApi:false};}

  let proposals;
  if(proposalProvider){proposals=[];for(const target of targets)proposals.push(await proposalProvider({category:target.category,marketEvidence:target.marketEvidence,generation:target.generation,vacancy:target.vacancy,requestId:target.requestId}));}
  else proposals=await callModelBatch(targets);
  if(proposals.length!==targets.length)throw new Error(`GAME_SEED_BATCH_COUNT_MISMATCH ${proposals.length}/${targets.length}`);

  const pending=[];const serials=new Map(categories.map(category=>[category,initialSerialCount(category)]));const usedGameIds=new Set((state.seeds||[]).map(s=>s.gameId));
  for(let i=0;i<targets.length;i++){
    const target=targets[i];const proposal=normalizeProposal(target,proposals[i]);
    validateProposal(target,proposal);
    const serial=(serials.get(target.category)||0)+1;serials.set(target.category,serial);
    const gameId=uniqueGameId(target.category,proposal.gameName,usedGameIds);
    pending.push({seed:buildSeed(target,proposal,{serial,gameId,timestamp}),vacancy:target.vacancy});
  }

  // Atomic state mutation: no initial or replenishment seed is persisted until every proposal validates.
  const created=[];
  for(const item of pending){state.seeds.push(item.seed);if(item.vacancy)fillVacancy(item.vacancy,item.seed,timestamp);created.push(item.seed);}
  if(initial){state.bootstrapCompletedAt=timestamp;state.initialBatchCount=created.length;state.initialBatchCategories=[...categories];}
  state.lastRunAt=timestamp;state.lastAction=initial?'INITIAL_BOOTSTRAP':'REPLENISHMENT';saveSeedState(state);
  return{action:initial?'INITIAL_BOOTSTRAP_CREATED':'VACANCIES_REPLENISHED',created:created.map(s=>({seedId:s.seedId,gameId:s.gameId,category:s.GAME_CATEGORY})),modelCalls:proposalProvider?0:1,marketEvidenceFile:fs.existsSync(evidenceFile)?evidenceFile:null,paidApi:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runGameSeedBootstrap().then(result=>{console.log(JSON.stringify(result,null,2));console.log(`GAME_SEED_CREATED_COUNT=${result.created.length}`);console.log(`GAME_SEED_MODEL_CALLS=${result.modelCalls}`);console.log('GAME_SEED_MARKET_ROLE=TARGET_DESIGN_REFERENCE');console.log('GAME_SEED_PAID_API=NO');}).catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
