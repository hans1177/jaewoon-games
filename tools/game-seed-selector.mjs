import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {SEED_CATEGORIES,normalizeSeedRegistry,validateSeed} from './game-seed-bootstrap.mjs';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const slugify=v=>clean(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42);
const METRICS=['REVENUE_RANK_OR_REVENUE_SIGNAL','POPULARITY_OR_DOWNLOAD_RANK','TARGET_AGE_OR_AGE_DISTRIBUTION','AVERAGE_PLAYTIME','MEDIAN_PLAYTIME','SESSION_LENGTH','RETENTION','CONCURRENT_OR_ACTIVE_USERS','REVIEW_VOLUME_AND_RATING'];
const CATEGORY_HINTS={
  ACTION_SURVIVAL_ROGUELITE:'짧은 반복 전투, 다수 적 압박, 빌드 조합과 런 성장',
  SINGLE_DEFENSE_STRATEGY:'싱글플레이 방어/전략, 배치·업그레이드·웨이브 판단',
  PUZZLE:'명확한 규칙, 짧은 세션, 반복 가능한 문제 해결과 피드백',
  CASUAL:'낮은 진입장벽, 즉시 이해되는 조작, 짧은 세션과 재도전',
  IDLE_GROWTH_RPG:'방치 보상과 능동 선택이 결합된 장기 성장 RPG',
  STORY_COMPLETE_RPG:'탐험→전투→퀘스트→스토리 진행→최종 보스→완결 엔딩',
};
export function marketEvidenceTemplate(poolEvidence=[]){
  const byMetric=new Map((Array.isArray(poolEvidence)?poolEvidence:[]).filter(x=>x&&typeof x==='object').map(x=>[clean(x.metric),x]));
  return METRICS.map(metric=>byMetric.has(metric)?byMetric.get(metric):{metric,status:'UNKNOWN'});
}
export function normalizeSelectedSeed(raw,category,{existingIds=new Set(),marketEvidence=[]}={}){
  const name=clean(raw?.name)||`${category} Seed`;
  let gameId=slugify(raw?.gameId||name)||`seed-${category.toLowerCase().replaceAll('_','-')}`;
  if(existingIds.has(gameId)){let i=2;while(existingIds.has(`${gameId}-${i}`))i++;gameId=`${gameId}-${i}`;}
  const seed={
    gameId,name,gameCategory:category,transformationMode:['HOMAGE','REINTERPRETATION'].includes(clean(raw?.transformationMode))?clean(raw.transformationMode):'REINTERPRETATION',
    referenceGames:(Array.isArray(raw?.referenceGames)?raw.referenceGames:[]).map(x=>typeof x==='string'?{name:clean(x)}:{name:clean(x?.name),platform:clean(x?.platform)||undefined,reason:clean(x?.reason)||undefined}).filter(x=>x.name),
    coreFunToLearn:clean(raw?.coreFunToLearn),coreLoop:(Array.isArray(raw?.coreLoop)?raw.coreLoop:[]).map(clean).filter(Boolean),distinctIdentity:clean(raw?.distinctIdentity),
    marketEvidence:marketEvidenceTemplate(marketEvidence),targetAudience:clean(raw?.targetAudience),targetSessionDirection:clean(raw?.targetSessionDirection),
    initialTargetPlatform:'ANDROID_MOBILE',initialPlayMode:'SINGLE_PLAYER',
    steamExpansionPossible:['POSSIBLE','NOT_RECOMMENDED'].includes(clean(raw?.steamExpansionPossible))?clean(raw.steamExpansionPossible):'NOT_RECOMMENDED',
    multiplayerExpansionPossible:['POSSIBLE','NOT_RECOMMENDED'].includes(clean(raw?.multiplayerExpansionPossible))?clean(raw.multiplayerExpansionPossible):'NOT_RECOMMENDED',
    multiplayerExpansionValue:['LOW','MEDIUM','HIGH'].includes(clean(raw?.multiplayerExpansionValue))?clean(raw.multiplayerExpansionValue):'LOW',
    futureMultiplayerMode:['COOP','PVP','NONE'].includes(clean(raw?.futureMultiplayerMode))?clean(raw.futureMultiplayerMode):'NONE',
  };
  const check=validateSeed(seed);if(!check.pass)throw new Error(`SELECTED_SEED_INVALID:${category}:${check.missing.join(',')}`);return seed;
}
const ITEM={type:'object',required:['name','referenceGames','coreFunToLearn','coreLoop','distinctIdentity','targetAudience','targetSessionDirection','steamExpansionPossible','multiplayerExpansionPossible','multiplayerExpansionValue','futureMultiplayerMode'],properties:{name:{type:'string'},gameId:{type:'string'},transformationMode:{type:'string',enum:['HOMAGE','REINTERPRETATION']},referenceGames:{type:'array',minItems:1,maxItems:3,items:{type:'object',required:['name','platform','reason'],properties:{name:{type:'string'},platform:{type:'string'},reason:{type:'string'}},additionalProperties:false}},coreFunToLearn:{type:'string'},coreLoop:{type:'array',minItems:3,maxItems:7,items:{type:'string'}},distinctIdentity:{type:'string'},targetAudience:{type:'string'},targetSessionDirection:{type:'string'},steamExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},multiplayerExpansionPossible:{type:'string',enum:['POSSIBLE','NOT_RECOMMENDED']},multiplayerExpansionValue:{type:'string',enum:['LOW','MEDIUM','HIGH']},futureMultiplayerMode:{type:'string',enum:['COOP','PVP','NONE']}},additionalProperties:false};
async function callModel(model,prompt,schema){
  let error=null;for(let attempt=1;attempt<=3;attempt++)try{
    const r=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:schema,messages:[{role:'system',content:'너는 GAME_SEED 선정 AI다. 유명한 출시 성공작의 검증된 게임 구조를 벤치마크해 오마주/재해석용 시드를 고른다. 실제 소스코드·아트·캐릭터·이름·스토리·맵·UI 표현은 복제하지 않는다. 인터넷에 접속할 수 없으므로 매출·연령·플레이시간 같은 숫자를 절대 추측하지 않는다.'},{role:'user',content:prompt}],options:{temperature:attempt===1?0.2:0,num_ctx:8192,num_predict:2600}})});if(!r.ok)throw new Error(`ollama ${r.status}`);const b=await r.json();return JSON.parse(clean(b?.message?.content));
  }catch(e){error=e;if(attempt<3)await new Promise(res=>setTimeout(res,500*attempt));}throw error;
}
export async function selectSeeds({model='qwen3:0.6b',categories=SEED_CATEGORIES,registry={},referencePool={}}={}){
  const state=normalizeSeedRegistry(registry);const existingIds=new Set(state.seeds.map(x=>clean(x.gameId)).filter(Boolean));
  const selected=[];
  for(const category of categories){
    const pool=referencePool?.categories?.[category]||{};
    const prompt=`분류=${category}\n분류방향=${CATEGORY_HINTS[category]||category}\n성공작 후보/시장근거 풀=${JSON.stringify(pool)}\n요구: 유명한 실제 출시 성공작 1~3개를 레퍼런스로 고르고, 성공한 핵심 재미와 루프를 학습하되 우리 게임은 별도 세계관·표현·시스템 조합으로 재해석한다. Android 모바일 싱글플레이만으로 상품이 성립해야 한다. 시장근거는 타겟 연령/세션/콘텐츠 볼륨/판매·수익모델 방향 참고용이며 데이터 부족은 탈락 사유가 아니다. 숫자 데이터는 출력하지 말고 제공된 풀의 시장근거는 후처리에서 결합한다. JSON만 반환한다.`;
    const raw=await callModel(model,prompt,ITEM);const evidence=Array.isArray(pool.marketEvidence)?pool.marketEvidence:[];const seed=normalizeSelectedSeed(raw,category,{existingIds,marketEvidence:evidence});existingIds.add(seed.gameId);selected.push(seed);
  }
  return selected;
}
async function main(){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')||'true'];}));
  const directive=readJson('company-directive.json',{});const model=clean(args.model||process.env.GAME_SEED_MODEL||directive.ai?.modelPool?.[0]||'qwen3:0.6b');
  const registry=readJson(args.state||'game-seed-registry.json',{});const pool=readJson(args.pool||'game-seed-reference-pool.json',{});
  const mode=clean(args.mode||'bootstrap');let categories=SEED_CATEGORIES;
  if(mode==='replenish'){const category=clean(args.category);if(!category)throw new Error('--category required for replenish');categories=[category];}
  const seeds=await selectSeeds({model,categories,registry,referencePool:pool});const output=args.output||'.autonomous/game-seed-selection.json';writeJson(output,mode==='replenish'?{seed:seeds[0],trigger:clean(args.trigger||'DISCARDED'),vacancyId:clean(args.vacancy)}:{seeds});
  console.log(`GAME_SEED_SELECTION_COUNT=${seeds.length}`);console.log(`GAME_SEED_SELECTION_OUTPUT=${output}`);console.log('NUMERIC_MARKET_DATA_INVENTED=NO');
}
const invoked=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;if(invoked)await main();
