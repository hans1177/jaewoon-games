import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {DEFAULT_SEED_CATEGORIES,loadSeedState,saveSeedState,unfilledVacancies,fillVacancy} from './game-seed-state.mjs';

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

const SEED_SCHEMA={type:'object',required:['gameName','referenceGames','coreFunToLearn','coreLoop','distinctIdentity','targetAudience','targetSessionDirection','steamExpansionPossible','multiplayerExpansionPossible','multiplayerExpansionValue','transformationMode'],properties:{gameName:{type:'string',maxLength:120},referenceGames:{type:'array',minItems:1,maxItems:4,items:{type:'string',maxLength:120}},coreFunToLearn:{type:'array',minItems:1,maxItems:6,items:{type:'string',maxLength:300}},coreLoop:{type:'array',minItems:3,maxItems:8,items:{type:'string',maxLength:300}},distinctIdentity:{type:'string',maxLength:1200},targetAudience:{type:'string',maxLength:600},targetSessionDirection:{type:'string',maxLength:500},steamExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},multiplayerExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},multiplayerExpansionValue:{type:'string',enum:['LOW','MEDIUM','HIGH']},transformationMode:{type:'string',enum:['HOMAGE','REINTERPRETATION']}},additionalProperties:false};

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
function serialForCategory(category){return(state.seeds||[]).filter(s=>s.GAME_CATEGORY===category).length+1;}
function uniqueGameId(category,name){
  const categorySlug=category.toLowerCase().replace(/_/g,'-').slice(0,20);const nameSlug=slugify(name)||'game';let id=`seed-${categorySlug}-${nameSlug}`.slice(0,63);let n=2;
  const used=new Set((state.seeds||[]).map(s=>s.gameId));
  while(used.has(id)){id=`seed-${categorySlug}-${nameSlug}-${n++}`.slice(0,63);}return id;
}
async function callModel(category,marketEvidence,replacementContext=null){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),MODEL_TIMEOUT_MS);
  const marketText=marketEvidence.available?JSON.stringify(marketEvidence.references):'UNKNOWN';
  const prompt=`GAME_SEED 분류=${category}. 유명하고 상업적 또는 대중적 성공이 검증된 출시작을 레퍼런스로 골라 핵심 재미·루프·성장·경제·UX 구조를 학습하되, 새 게임은 HOMAGE 또는 REINTERPRETATION으로 독자 정체성을 만든다. 원작 이름/캐릭터/스토리/맵/아트/음악/UI 아트/소스코드를 복제하지 않는다. 소스코드는 반드시 자체 구현한다. 초기 제품은 Android 모바일 싱글플레이다. 멀티 없이도 상품성이 있어야 한다. 시장근거는 통과/탈락 게이트가 아니라 타겟 연령·세션·콘텐츠량·수익모델 방향 참고용이다. 제공되지 않은 매출·연령·플레이시간 숫자는 절대 추정하지 않는다. 시장근거=${marketText}. ${replacementContext?`이 시드는 폐기/삭제 vacancy 보충이다: ${JSON.stringify(replacementContext)}.`:'초기 부트스트랩 시드다.'} JSON 스키마만 출력하라.`;
  try{
    const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,keep_alive:'0s',format:SEED_SCHEMA,messages:[{role:'system',content:'너는 재운컴퍼니 GAME_SEED 선택 AI다. 유명 성공작의 성공 구조를 오마주/재해석 대상으로 선택하지만 보호되는 표현과 소스코드는 복제하지 않는다.'},{role:'user',content:prompt}],options:{temperature:0.35,num_ctx:8192,num_predict:2200}}),signal:controller.signal});
    if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
    const body=await response.json();const text=clean(body?.message?.content);if(!text)throw new Error('empty model response');return JSON.parse(text);
  }finally{clearTimeout(timer);}
}
function validateProposal(category,p){
  const missing=[];
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
  if(missing.length)throw new Error(`GAME_SEED_INVALID ${category}: ${missing.join(',')}`);
}
function buildSeed(category,p,marketEvidence,{generation,vacancy=null,timestamp}){
  validateProposal(category,p);const serial=serialForCategory(category);const gameId=uniqueGameId(category,p.gameName);
  return{version:1,seedId:`SEED-${category}-${String(serial).padStart(3,'0')}`,gameId,gameName:clean(p.gameName),status:'ACTIVE',generation,GAME_CATEGORY:category,REFERENCE_GAMES:uniq(p.referenceGames),CORE_FUN_TO_LEARN:uniq(p.coreFunToLearn),CORE_LOOP:uniq(p.coreLoop),DISTINCT_IDENTITY:clean(p.distinctIdentity),MARKET_EVIDENCE_SUMMARY:marketEvidence,TARGET_AUDIENCE:clean(p.targetAudience),TARGET_SESSION_DIRECTION:clean(p.targetSessionDirection),INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE',INITIAL_PLAY_MODE:'SINGLE_PLAYER',STEAM_EXPANSION_POSSIBLE:p.steamExpansionPossible,MULTIPLAYER_EXPANSION_POSSIBLE:p.multiplayerExpansionPossible,MULTIPLAYER_EXPANSION_VALUE:p.multiplayerExpansionValue,TRANSFORMATION_MODE:p.transformationMode,SOURCE_CODE_RULE:'OWN_IMPLEMENTATION_ONLY',COMMERCIAL_RULE:'MUST_WORK_WITHOUT_MULTIPLAYER',replacementOfSeedId:vacancy?.sourceSeedId||null,replacementVacancyId:vacancy?.id||null,createdAt:timestamp,updatedAt:timestamp};
}

export async function runGameSeedBootstrap({timestamp=new Date().toISOString(),proposalProvider=null}={}){
  if(config.enabled===false)return{action:'DISABLED',created:[]};
  const created=[];const pending=[];
  if(!state.bootstrapCompletedAt){
    if(categories.length!==Number(config.bootstrap?.count||6))throw new Error(`GAME_SEED_BOOTSTRAP_CATEGORY_COUNT_MISMATCH ${categories.length}/${config.bootstrap?.count||6}`);
    if((state.seeds||[]).some(s=>s.generation==='INITIAL_BOOTSTRAP'))throw new Error('PARTIAL_INITIAL_BOOTSTRAP_STATE_FORBIDDEN');
    for(const category of categories){
      const evidence=sanitizeMarketEvidence(category);const p=proposalProvider?await proposalProvider({category,marketEvidence:evidence,generation:'INITIAL_BOOTSTRAP'}):await callModel(category,evidence,null);
      pending.push({seed:buildSeed(category,p,evidence,{generation:'INITIAL_BOOTSTRAP',timestamp}),vacancy:null});
    }
    for(const item of pending){state.seeds.push(item.seed);created.push(item.seed);}
    state.bootstrapCompletedAt=timestamp;state.initialBatchCount=created.length;state.initialBatchCategories=[...categories];
  }else{
    const vacancies=unfilledVacancies(state);
    for(const vacancy of vacancies){
      const category=clean(vacancy.category);if(!category)continue;
      const evidence=sanitizeMarketEvidence(category);const p=proposalProvider?await proposalProvider({category,marketEvidence:evidence,generation:'REPLENISHMENT',vacancy}):await callModel(category,evidence,vacancy);
      const seed=buildSeed(category,p,evidence,{generation:'REPLENISHMENT',vacancy,timestamp});pending.push({seed,vacancy});
    }
    for(const item of pending){state.seeds.push(item.seed);fillVacancy(item.vacancy,item.seed,timestamp);created.push(item.seed);}
  }
  state.lastRunAt=timestamp;state.lastAction=!state.bootstrapCompletedAt?'NOOP':created.length?created.some(s=>s.generation==='INITIAL_BOOTSTRAP')?'INITIAL_BOOTSTRAP':'REPLENISHMENT':'NO_VACANCY';
  saveSeedState(state);
  return{action:created.length?created[0].generation==='INITIAL_BOOTSTRAP'?'INITIAL_BOOTSTRAP_CREATED':'VACANCIES_REPLENISHED':'NO_VACANCY',created:created.map(s=>({seedId:s.seedId,gameId:s.gameId,category:s.GAME_CATEGORY})),marketEvidenceFile:fs.existsSync(evidenceFile)?evidenceFile:null,paidApi:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runGameSeedBootstrap().then(result=>{console.log(JSON.stringify(result,null,2));console.log(`GAME_SEED_CREATED_COUNT=${result.created.length}`);console.log('GAME_SEED_MARKET_ROLE=TARGET_DESIGN_REFERENCE');console.log('GAME_SEED_PAID_API=NO');}).catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
