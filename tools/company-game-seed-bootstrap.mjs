import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {DEFAULT_SEED_CATEGORIES,loadSeedState,saveSeedState,unfilledVacancies,fillVacancy,platformRepresentativeGaps,recordPlatformSetState,seedPlatform} from './game-seed-state.mjs';
import {assertGameSeed} from './company-game-seed-contract.mjs';
import {categorySeedProfile,loadPlatformProfiles,normalizeSeedPlatform,representativeCategoriesForPlatform} from './game-seed-platform-profile.mjs';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const slugify=v=>clean(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42);
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const directive=readJson('company-directive.json',{});
const config=directive.gameSeed||{};
const historicalCategories=uniq(config.bootstrap?.categories||DEFAULT_SEED_CATEGORIES);
const primaryPlatform=normalizeSeedPlatform(config.initialTargetPlatform||directive.platformStrategy?.primaryPlatform||'ROBLOX')||'ROBLOX';
const representativeCategories=representativeCategoriesForPlatform(directive,primaryPlatform);
const state=loadSeedState();
state.categories=historicalCategories;
const evidenceFile=clean(process.env.GAME_SEED_MARKET_EVIDENCE_FILE)||'game-seed-market-evidence.json';
const marketInput=readJson(evidenceFile,{categories:{}})||{categories:{}};
const platformProfiles=loadPlatformProfiles(clean(process.env.GAME_SEED_PLATFORM_PROFILE_FILE)||undefined);
const targetMarketScope=clean(config.marketEvidence?.targetMarketScope||marketInput.targetMarketScope||'GLOBAL').toUpperCase();
if(targetMarketScope!=='GLOBAL')throw new Error(`GAME_SEED_TARGET_MARKET_SCOPE_MUST_BE_GLOBAL ${targetMarketScope}`);
const model=clean(process.env.GAME_SEED_LOCAL_MODEL)||clean(directive.ai?.modelPool?.[0])||'qwen3:0.6b';
const MODEL_TIMEOUT_MS=Math.max(30000,Number(process.env.GAME_SEED_MODEL_TIMEOUT_MS||240000));

const TEXT={type:'string',maxLength:1200};
const PROPOSAL_PROPERTIES={
  requestId:{type:'string',maxLength:120},category:{type:'string',maxLength:80},gameName:{type:'string',maxLength:120},
  referenceGames:{type:'array',minItems:1,maxItems:4,uniqueItems:true,items:{type:'string',maxLength:120}},
  coreFunToLearn:{type:'array',minItems:1,maxItems:6,uniqueItems:true,items:{type:'string',maxLength:300}},
  coreLoop:{type:'array',minItems:3,maxItems:8,uniqueItems:true,items:{type:'string',maxLength:300}},distinctIdentity:TEXT,
  targetAudience:{type:'string',maxLength:600},targetSessionDirection:{type:'string',maxLength:500},
  steamExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},multiplayerExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},
  multiplayerExpansionValue:{type:'string',enum:['LOW','MEDIUM','HIGH']},transformationMode:{type:'string',enum:['HOMAGE','REINTERPRETATION']}
};
const REQUIRED_PROPOSAL=Object.keys(PROPOSAL_PROPERTIES);
const batchSchema=count=>({type:'object',required:['proposals'],properties:{proposals:{type:'array',minItems:count,maxItems:count,items:{type:'object',required:REQUIRED_PROPOSAL,properties:PROPOSAL_PROPERTIES,additionalProperties:false}}},additionalProperties:false});

function profileFor(platform,category){return categorySeedProfile({platform,category,marketEvidence:marketInput,platformProfiles})||{};}
function sanitizeMetric(metric){
  if(!metric||typeof metric!=='object'||Array.isArray(metric))return null;
  const name=clean(metric.metric||metric.name||metric.type);if(!name)return null;
  const source=clean(metric.source||metric.sourceUrl||metric.publisher),observedAt=clean(metric.observedAt||metric.observed_at||metric.date);
  let value=metric.value??'UNKNOWN';const numericLike=typeof value==='number'||(/\d/.test(clean(value))&&clean(value).toUpperCase()!=='UNKNOWN');
  if(numericLike&&(!source||!observedAt))value='UNKNOWN';
  return{metric:name,value:value===''?'UNKNOWN':value,source:source||null,observedAt:observedAt||null,note:clean(metric.note)||null,numericClaimAccepted:numericLike?Boolean(source&&observedAt):false};
}
function sanitizeMarketEvidence(platform,category){
  const raw=profileFor(platform,category),refs=Array.isArray(raw.references)?raw.references:[];const references=[];
  for(const ref of refs){
    if(typeof ref==='string'){references.push({title:clean(ref),metrics:[]});continue;}
    if(!ref||typeof ref!=='object')continue;const title=clean(ref.title||ref.name||ref.game);if(!title)continue;
    const metrics=(Array.isArray(ref.metrics)?ref.metrics:[]).map(sanitizeMetric).filter(Boolean);references.push({title,metrics,qualitative:clean(ref.qualitative||ref.note)||null});
  }
  return{role:'TARGET_DESIGN_REFERENCE',targetMarketScope:'GLOBAL',countrySpecificEvidenceRole:'SECONDARY_CONTEXT_ONLY',hardPassFailGate:false,missingDataDoesNotRejectSeed:true,marketDataAloneCannotDiscard:true,available:references.some(r=>r.metrics.length||r.qualitative),sourceFile:fs.existsSync(evidenceFile)?evidenceFile:null,platformProfileFile:'game-seed-platform-profiles.json',references};
}
function initialSerialCount(platform,category){return(state.seeds||[]).filter(s=>seedPlatform(s)===platform&&s.GAME_CATEGORY===category).length;}
function uniqueGameId(platform,category,name,used){
  const platformSlug=platform.toLowerCase().replace(/_/g,'-').slice(0,12),categorySlug=category.toLowerCase().replace(/_/g,'-').slice(0,18),nameSlug=slugify(name)||'game';
  let id=`seed-${platformSlug}-${categorySlug}-${nameSlug}`.slice(0,63),n=2;while(used.has(id))id=`seed-${platformSlug}-${categorySlug}-${nameSlug}-${n++}`.slice(0,63);used.add(id);return id;
}
function normalizeProposal(target,p){
  const proposal={...(p||{}),requestId:target.requestId,category:target.category};
  const canonicalBenchmarks=new Map(target.benchmarkCandidates.map(name=>[norm(name),name]));
  proposal.referenceGames=uniq(p?.referenceGames).map(name=>canonicalBenchmarks.get(norm(name))).filter(Boolean);
  if(!proposal.referenceGames.length)proposal.referenceGames=target.benchmarkCandidates.slice(0,Math.min(2,target.benchmarkCandidates.length));
  proposal.coreFunToLearn=uniq(p?.coreFunToLearn).slice(0,4);proposal.coreLoop=uniq(p?.coreLoop).slice(0,8).map(step=>step.length>=20?step:`${step} — 결과 피드백을 확인하고 다음 선택이나 보상으로 이어진다.`);
  const required=target.requiredConceptTerms.slice(0,2),platformLabel=target.platform==='ROBLOX'?'Roblox':target.platform==='UNITY'?'Unity':'Fortnite UEFN';
  let semanticText=[...proposal.coreFunToLearn,...proposal.coreLoop,clean(p?.distinctIdentity)].map(norm).join(' ');
  for(const term of required){if(semanticText.includes(norm(term)))continue;proposal.coreFunToLearn.push(`${term} 중심의 ${target.category} 핵심 플레이 패턴을 ${platformLabel} 환경에 맞게 독자적으로 재해석한다`);semanticText+=` ${norm(term)}`;}
  proposal.coreFunToLearn=uniq(proposal.coreFunToLearn).slice(0,6);
  const fallback=[`${target.category} 핵심 행동을 수행하고 즉시 결과 피드백과 위험·보상을 확인한다`,'획득한 보상과 정보를 활용해 성장·빌드·다음 목표 중 하나를 선택한다','새 선택으로 난이도와 전략이 바뀐 다음 다시 핵심 행동을 반복하며 장기 진행을 만든다'];
  for(const step of fallback){if(proposal.coreLoop.length>=3)break;if(!proposal.coreLoop.includes(step))proposal.coreLoop.push(step);}
  const originalIdentity=clean(p?.distinctIdentity);
  proposal.distinctIdentity=originalIdentity.length>=60?originalIdentity:`${platformLabel}에서 ${target.category}의 ${required.join(' / ')} 재미를 살리되 세계관·비주얼·진행 구조·시스템 조합을 새로 설계한 독자 경험으로 재해석한다.`;
  const originalAudience=clean(p?.targetAudience);
  proposal.targetAudience=originalAudience.length>=12&&!/\b(korea|korean|south korea)\b/i.test(originalAudience)?originalAudience:`Global ${platformLabel} players who enjoy ${required.join(' and ')}-driven ${target.category.toLowerCase().replaceAll('_',' ')} play.`;
  proposal.targetSessionDirection=clean(p?.targetSessionDirection).length>=16?clean(p.targetSessionDirection):`GLOBAL ${platformLabel} 사용자를 기준으로 핵심 루프가 짧은 세션에서도 명확하고 반복 플레이와 장기 진행으로 자연스럽게 연결되도록 설계한다.`;
  return proposal;
}
function validateProposal(target,p){
  const missing=[];if(clean(p?.requestId)!==target.requestId)missing.push('requestId');if(clean(p?.category)!==target.category)missing.push('category');if(!clean(p?.gameName))missing.push('gameName');
  const refs=uniq(p?.referenceGames),allowed=new Set(target.benchmarkCandidates.map(norm));if(!refs.length)missing.push('referenceGames');const invalidRefs=refs.filter(ref=>!allowed.has(norm(ref)));if(invalidRefs.length)missing.push(`referenceGamesOutsideCategoryPool:${invalidRefs.join('|')}`);
  if(!uniq(p?.coreFunToLearn).length)missing.push('coreFunToLearn');if(uniq(p?.coreLoop).length<3)missing.push('coreLoop>=3');if(!clean(p?.distinctIdentity))missing.push('distinctIdentity');if(!clean(p?.targetAudience))missing.push('targetAudience');if(!clean(p?.targetSessionDirection))missing.push('targetSessionDirection');
  if(/\b(korea|korean|south korea)\b/i.test(clean(p?.targetAudience)))missing.push('targetAudienceMustBeGlobalNotKoreaSpecific');
  if(!['POSSIBLE','NOT_RECOMMENDED'].includes(p?.steamExpansionPossible))missing.push('steamExpansionPossible');if(!['POSSIBLE','NOT_RECOMMENDED'].includes(p?.multiplayerExpansionPossible))missing.push('multiplayerExpansionPossible');if(!['LOW','MEDIUM','HIGH'].includes(p?.multiplayerExpansionValue))missing.push('multiplayerExpansionValue');if(!['HOMAGE','REINTERPRETATION'].includes(p?.transformationMode))missing.push('transformationMode');
  if(missing.length)throw new Error(`GAME_SEED_INVALID ${target.platform}/${target.category}: ${missing.join(',')}`);
}
async function callModelBatch(targets){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),MODEL_TIMEOUT_MS);
  const requestPayload=targets.map(t=>({requestId:t.requestId,platform:t.platform,category:t.category,generation:t.generation,replacement:t.vacancy?{vacancyId:t.vacancy.id,sourceSeedId:t.vacancy.sourceSeedId}:null,targetMarketScope:'GLOBAL',benchmarkCandidates:t.benchmarkCandidates,requiredConceptTerms:t.requiredConceptTerms,marketEvidence:t.marketEvidence.available?t.marketEvidence.references:'UNKNOWN'}));
  const prompt=`다음 GAME_SEED 요청을 한 번의 배치로 모두 작성하라. requestId/platform/category를 정확히 보존한다. 각 요청의 INITIAL_TARGET_PLATFORM은 REQUESTS의 platform이며 플랫폼을 임의 변경하지 않는다. Roblox는 Roblox 네이티브 멀티플레이·소셜·모바일 조작 가능성을 열어 두고 Android 싱글플레이를 강제하지 않는다. Unity와 Fortnite UEFN도 각 선택 플랫폼에 맞게 설계한다. 기본 시장은 GLOBAL이며 특정 국가를 기본 타겟으로 잡지 않는다. referenceGames는 해당 benchmarkCandidates에서만 선택한다. 성공작의 핵심 재미·루프·성장·경제·UX 구조만 학습하고 세계관·비주얼·캐릭터·스토리·맵·UI 아트·소스코드는 복제하지 않는다. 소스코드는 자체 구현한다. coreLoop는 실제 플레이 행동 → 결과/피드백 → 다음 선택/보상 흐름이 드러나는 서로 다른 3단계 이상으로 작성한다. 제공되지 않은 숫자는 추정하지 않는다. REQUESTS=${JSON.stringify(requestPayload)}. JSON 스키마만 출력하라.`;
  try{
    const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,keep_alive:'0s',format:batchSchema(targets.length),messages:[{role:'system',content:'너는 재운컴퍼니 GAME_SEED 선택 AI다. 요청별 선택 플랫폼과 분류를 보존하고, 성공작의 추상 구조만 오마주/재해석하며 보호되는 표현과 소스코드를 복제하지 않는다.'},{role:'user',content:prompt}],options:{temperature:0.2,num_ctx:16384,num_predict:6000}}),signal:controller.signal});
    if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);const body=await response.json(),text=clean(body?.message?.content);if(!text)throw new Error('empty model response');
    const parsed=JSON.parse(text);if(!Array.isArray(parsed.proposals)||parsed.proposals.length!==targets.length)throw new Error(`GAME_SEED_BATCH_COUNT_MISMATCH ${parsed.proposals?.length||0}/${targets.length}`);return parsed.proposals;
  }finally{clearTimeout(timer);}
}
function buildSeed(target,p,{serial,gameId,timestamp}){
  validateProposal(target,p);const platform=target.platform,seedId=`SEED-${platform}-${target.category}-${String(serial).padStart(3,'0')}`;
  const seed={version:1,seedId,gameId,gameName:clean(p.gameName),status:'ACTIVE',generation:target.generation,GAME_CATEGORY:target.category,REFERENCE_GAMES:uniq(p.referenceGames),CORE_FUN_TO_LEARN:uniq(p.coreFunToLearn),CORE_LOOP:uniq(p.coreLoop),DISTINCT_IDENTITY:clean(p.distinctIdentity),MARKET_EVIDENCE_SUMMARY:target.marketEvidence,TARGET_AUDIENCE:clean(p.targetAudience),TARGET_SESSION_DIRECTION:clean(p.targetSessionDirection),INITIAL_TARGET_PLATFORM:platform,INITIAL_PLAY_MODE:clean(target.sourceSeed?.INITIAL_PLAY_MODE)||'PROJECT_DEFINED',STEAM_EXPANSION_POSSIBLE:p.steamExpansionPossible,MULTIPLAYER_EXPANSION_POSSIBLE:p.multiplayerExpansionPossible,MULTIPLAYER_EXPANSION_VALUE:p.multiplayerExpansionValue,TRANSFORMATION_MODE:p.transformationMode,SOURCE_CODE_RULE:'OWN_IMPLEMENTATION_ONLY',COMMERCIAL_RULE:'MUST_BE_MONETIZABLE_ON_SELECTED_PLATFORM',CROSS_PLATFORM_EXPANSION_VALUE:'UNKNOWN_UNTIL_PLATFORM_EXPANSION_REVIEW',replacementOfSeedId:target.vacancy?.sourceSeedId||null,replacementVacancyId:target.vacancy?.id||null,createdAt:timestamp,updatedAt:timestamp};
  assertGameSeed(seed);return seed;
}

export async function runGameSeedBootstrap({timestamp=new Date().toISOString(),proposalProvider=null}={}){
  if(config.enabled===false)return{action:'DISABLED',created:[],modelCalls:0};
  const initial=!state.bootstrapCompletedAt,targets=[],keys=new Set();
  const makeTarget=(requestId,platform,category,generation,vacancy=null)=>{const profile=profileFor(platform,category);return{requestId,platform,category,generation,vacancy,sourceSeed:vacancy?.sourceSeedId?(state.seeds||[]).find(s=>s.seedId===vacancy.sourceSeedId)||null:null,marketEvidence:sanitizeMarketEvidence(platform,category),benchmarkCandidates:uniq(profile.benchmarkCandidates),requiredConceptTerms:uniq(profile.requiredConceptTerms)};};
  const addTarget=target=>{const key=`${target.platform}:${target.category}:${target.vacancy?.id||target.generation}`;if(!keys.has(key)){keys.add(key);targets.push(target);}};
  if(initial){
    if(historicalCategories.length!==Number(config.bootstrap?.count||6))throw new Error(`GAME_SEED_BOOTSTRAP_CATEGORY_COUNT_MISMATCH ${historicalCategories.length}/${config.bootstrap?.count||6}`);
    if((state.seeds||[]).some(s=>s.generation==='INITIAL_BOOTSTRAP'))throw new Error('PARTIAL_INITIAL_BOOTSTRAP_STATE_FORBIDDEN');
    for(const [index,category] of historicalCategories.entries())addTarget(makeTarget(`INITIAL-${index+1}-${category}`,'UNITY',category,'INITIAL_BOOTSTRAP'));
  }else{
    for(const vacancy of unfilledVacancies(state)){
      const category=clean(vacancy.category),platform=normalizeSeedPlatform(vacancy.platform||((state.seeds||[]).find(s=>s.seedId===vacancy.sourceSeedId)?.INITIAL_TARGET_PLATFORM)||primaryPlatform);if(category)addTarget(makeTarget(`VACANCY-${vacancy.id}`,platform,category,'REPLENISHMENT',vacancy));
    }
    for(const [index,category] of platformRepresentativeGaps(state,primaryPlatform,representativeCategories).entries())addTarget(makeTarget(`PLATFORM-${primaryPlatform}-${index+1}-${category}`,primaryPlatform,category,'PLATFORM_SET_FILL'));
  }
  if(!targets.length){recordPlatformSetState(state,{platform:primaryPlatform,categories:representativeCategories,timestamp});state.lastRunAt=timestamp;state.lastAction='NO_CREATION_REQUIRED';saveSeedState(state);return{action:'NO_CREATION_REQUIRED',created:[],modelCalls:0,primaryPlatform,representativeGaps:[],marketEvidenceFile:fs.existsSync(evidenceFile)?evidenceFile:null,paidApi:false,targetMarketScope:'GLOBAL'};}
  for(const target of targets){if(!target.benchmarkCandidates.length)throw new Error(`GAME_SEED_BENCHMARK_POOL_MISSING ${target.platform}/${target.category}`);if(!target.marketEvidence.available)throw new Error(`GAME_SEED_MARKET_EVIDENCE_MISSING ${target.platform}/${target.category}`);}
  let proposals;if(proposalProvider){proposals=[];for(const target of targets)proposals.push(await proposalProvider({platform:target.platform,category:target.category,marketEvidence:target.marketEvidence,benchmarkCandidates:target.benchmarkCandidates,requiredConceptTerms:target.requiredConceptTerms,generation:target.generation,vacancy:target.vacancy,requestId:target.requestId,targetMarketScope:'GLOBAL'}));}else proposals=await callModelBatch(targets);
  if(proposals.length!==targets.length)throw new Error(`GAME_SEED_BATCH_COUNT_MISMATCH ${proposals.length}/${targets.length}`);
  const pending=[],serials=new Map(),usedGameIds=new Set((state.seeds||[]).map(s=>s.gameId));
  for(let i=0;i<targets.length;i++){
    const target=targets[i],proposal=normalizeProposal(target,proposals[i]);validateProposal(target,proposal);const serialKey=`${target.platform}:${target.category}`;
    const serial=(serials.has(serialKey)?serials.get(serialKey):initialSerialCount(target.platform,target.category))+1;serials.set(serialKey,serial);
    const gameId=uniqueGameId(target.platform,target.category,proposal.gameName,usedGameIds);pending.push({seed:buildSeed(target,proposal,{serial,gameId,timestamp}),vacancy:target.vacancy});
  }
  const created=[];for(const item of pending){state.seeds.push(item.seed);if(item.vacancy)fillVacancy(item.vacancy,item.seed,timestamp);created.push(item.seed);}
  if(initial){state.bootstrapCompletedAt=timestamp;state.initialBatchCount=created.length;state.initialBatchCategories=[...historicalCategories];}
  const setState=recordPlatformSetState(state,{platform:primaryPlatform,categories:representativeCategories,timestamp});
  state.lastRunAt=timestamp;state.lastAction=initial?'INITIAL_BOOTSTRAP':created.some(s=>s.generation==='PLATFORM_SET_FILL')?'PLATFORM_SET_FILL':created.some(s=>s.generation==='REPLENISHMENT')?'REPLENISHMENT':'CREATED';saveSeedState(state);
  return{action:state.lastAction,created:created.map(s=>({seedId:s.seedId,gameId:s.gameId,platform:s.INITIAL_TARGET_PLATFORM,category:s.GAME_CATEGORY,generation:s.generation})),modelCalls:proposalProvider?0:1,primaryPlatform,representativeGaps:setState?.gaps||[],marketEvidenceFile:fs.existsSync(evidenceFile)?evidenceFile:null,paidApi:false,targetMarketScope:'GLOBAL'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runGameSeedBootstrap().then(result=>{console.log(JSON.stringify(result,null,2));console.log(`GAME_SEED_CREATED_COUNT=${result.created.length}`);console.log(`GAME_SEED_MODEL_CALLS=${result.modelCalls}`);console.log(`GAME_SEED_PRIMARY_PLATFORM=${result.primaryPlatform||primaryPlatform}`);console.log(`GAME_SEED_REPRESENTATIVE_GAPS=${(result.representativeGaps||[]).length}`);console.log('GAME_SEED_MARKET_SCOPE=GLOBAL');console.log('GAME_SEED_MARKET_ROLE=TARGET_DESIGN_REFERENCE');console.log('GAME_SEED_PAID_API=NO');}).catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
