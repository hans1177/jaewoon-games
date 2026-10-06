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
export const SEED_MATERIAL_POOL_TARGET=100;
export const SEED_MATERIAL_SOURCE_FAMILIES=Object.freeze([
  'SUCCESSFUL_GAME_STRUCTURE',
  'STORY_OR_NARRATIVE_STRUCTURE',
  'REAL_JOB_INDUSTRY_LIFE',
  'NATURE_ECOLOGY_SCIENCE',
  'SPORT_BOARD_PLAY_RULE',
  'SOCIAL_COOP_COMPETITION',
  'SURVIVAL_ESCAPE_RISK',
  'SPACE_BUILDING_OPERATION',
  'SYSTEM_MECHANIC_EXPERIMENT',
  'FREE_ORIGINAL_IDEA'
]);
export const CAUSAL_DNA_LIBRARY=Object.freeze([
  {id:'KARMA_RETURN',source:'EAST_ASIAN_RELIGION_PHILOSOPHY',principle:'행동의 결과가 지연되어 행위자·관계·후대에 되돌아온다.',gameGrammar:'현재 선택이 미래 적·지역·관계 규칙의 원인이 된다.'},
  {id:'MANDATE_LEGITIMACY',source:'EAST_ASIAN_POLITICAL_HISTORY',principle:'통치 권한은 힘만이 아니라 인정·질서·민심에 의해 유지된다.',gameGrammar:'영토보다 정당성과 지지가 실제 통치 가능성을 결정한다.'},
  {id:'RITUAL_RECIPROCITY',source:'RITUAL_RELIGION_FOLK_TRADITION',principle:'의례는 보상이 아니라 인간과 세계 사이의 상호 의무를 갱신한다.',gameGrammar:'자원 소비·행동 규칙·환경 반응이 계약처럼 서로 대가를 요구한다.'},
  {id:'ANCESTOR_MEMORY',source:'EAST_ASIAN_ANCESTOR_TRADITION',principle:'선대의 선택과 기억이 후대의 지위·의무·가능성을 만든다.',gameGrammar:'이전 플레이의 행동이 다음 세대 시작 조건과 사회 반응이 된다.'},
  {id:'PROPHECY_SELF_FULFILLMENT',source:'GREEK_TRAGEDY_ORACLE',principle:'피하려는 행동이 오히려 예언의 조건을 완성한다.',gameGrammar:'회피 선택도 세계 상태를 바꾸며 특정 조건을 충족시키는 역설적 진행을 만든다.'},
  {id:'HUBRIS_NEMESIS',source:'GREEK_TRAGEDY',principle:'과도한 성공과 오만이 스스로 반작용을 불러온다.',gameGrammar:'강해질수록 특정 세계 압력·적응·반작용이 증가해 성공 방식 자체를 바꾼다.'},
  {id:'OATH_CONTRACT',source:'WESTERN_EPIC_FEUDAL_TRADITION',principle:'맹세와 계약은 권리와 동시에 구속을 만든다.',gameGrammar:'보상 획득이 동시에 행동 제한·동맹 의무·위험을 생성한다.'},
  {id:'SACRIFICE_SUBSTITUTION',source:'RELIGIOUS_RITUAL_MYTH',principle:'한 가치의 보존은 다른 가치의 대가와 교환된다.',gameGrammar:'손실을 없애지 않고 누구·무엇이 대신 부담할지 선택하게 만든다.'},
  {id:'TABOO_POLLUTION',source:'MYTH_FOLK_RELIGION',principle:'금기를 어긴 결과는 개인을 넘어 장소·집단·세대에 오염처럼 번진다.',gameGrammar:'강력한 행동이 지역 규칙·NPC 반응·몬스터 생태를 함께 오염시킨다.'},
  {id:'TRICKSTER_REVERSAL',source:'WORLD_TRICKSTER_MYTH',principle:'약자·광대·사기꾼이 규칙의 빈틈을 이용해 질서를 뒤집는다.',gameGrammar:'정면 승리보다 규칙 해석·오용·역이용이 핵심 능력이 된다.'},
  {id:'COMEDIC_MISUNDERSTANDING',source:'COMEDY_FARCE',principle:'서로 다른 정보와 오해가 연쇄적으로 현실의 결과를 만든다.',gameGrammar:'틀린 믿음·잘못 전달된 정보가 실제 목표·동선·관계 상태를 바꾼다.'},
  {id:'CARNIVAL_STATUS_REVERSAL',source:'FESTIVAL_SATIRE_FOLK_COMEDY',principle:'축제와 해학의 순간에는 평소의 신분·금기·권력이 뒤집힌다.',gameGrammar:'특정 시간·상태에서 약자와 강자, 가격, 규칙, 역할이 역전된다.'},
  {id:'DIALECTIC_SYNTHESIS',source:'PHILOSOPHY_DIALECTIC',principle:'충돌하는 두 입장은 한쪽 제거가 아니라 새로운 제3의 규칙을 낳는다.',gameGrammar:'상반된 빌드·세력·상태를 결합해 원래 없던 행동 규칙을 생성한다.'},
  {id:'SHIP_OF_THESEUS_IDENTITY',source:'CLASSICAL_PHILOSOPHY_IDENTITY',principle:'구성요소가 모두 바뀌어도 동일한 존재인지 묻는다.',gameGrammar:'장비·신체·도시·파티를 교체할수록 정체성 판정과 권한이 달라진다.'},
  {id:'TESTIMONY_CONSENSUS_REALITY',source:'HISTORY_LAW_EPISTEMOLOGY',principle:'무엇이 사실로 인정되는가는 기록·증언·권력의 합의와 충돌한다.',gameGrammar:'플레이어가 채택한 기록과 증언이 월드 규칙·NPC 기억·접근 가능성을 바꾼다.'},
  {id:'DYNASTIC_INHERITANCE',source:'DYNASTIC_HISTORY',principle:'개인의 승패가 계승·혈통·후계·부채를 통해 다음 시대의 조건이 된다.',gameGrammar:'죽음과 엔딩이 리셋이 아니라 후계자의 규칙·관계·자원 구조로 이어진다.'},
  {id:'FACTION_BALANCE',source:'POLITICAL_HISTORY_DIPLOMACY',principle:'한 세력의 완전한 승리가 오히려 더 큰 불균형과 반발을 만든다.',gameGrammar:'적 제거보다 세력 간 힘의 비율을 조절하는 것이 장기 승리 조건이 된다.'},
  {id:'PATRONAGE_NETWORK',source:'COURT_POLITICS_HISTORICAL_FIGURE_ARCHETYPE',principle:'개인의 힘보다 후원·인맥·은혜·빚의 연결망이 행동 가능성을 만든다.',gameGrammar:'관계망의 누구를 밀어주고 누구에게 빚지는지가 능력과 콘텐츠 접근을 결정한다.'},
  {id:'EXILE_RETURN',source:'EPIC_HISTORY_HISTORICAL_FIGURE_ARCHETYPE',principle:'추방과 귀환은 같은 장소를 다른 권리와 시선으로 다시 보게 만든다.',gameGrammar:'떠났다가 돌아온 지역이 플레이어의 과거 선택 때문에 다른 규칙과 관계로 재구성된다.'},
  {id:'MARTYRDOM_MOVEMENT',source:'RELIGION_POLITICAL_HISTORY_ARCHETYPE',principle:'개인의 패배나 죽음이 집단의 결속과 운동을 강화할 수 있다.',gameGrammar:'특정 실패가 즉시 손실이면서 동시에 새로운 세력·능력·위기를 생성한다.'},
  {id:'PILGRIMAGE_TRANSFORMATION',source:'RELIGION_EPIC_JOURNEY',principle:'목적지보다 여정에서 받은 흔적과 관계가 사람을 바꾼다.',gameGrammar:'이동 경로와 통과한 장소 순서가 능력·신분·결말을 바꾼다.'},
  {id:'FORTUNE_REVERSAL',source:'TRAGEDY_COMEDY_DRAMATIC_STRUCTURE',principle:'최고점과 최저점이 서로의 원인이 되어 운명이 반전된다.',gameGrammar:'큰 성공이 다음 위험의 재료가 되고 실패가 새로운 기회의 자원이 된다.'},
  {id:'ABSURD_BUREAUCRACY',source:'SATIRE_POLITICAL_COMEDY',principle:'규칙을 지키려 할수록 규칙의 모순이 더 큰 문제를 만든다.',gameGrammar:'허가·서류·명령·등급 같은 시스템을 역이용해 세계를 조작한다.'},
  {id:'NAME_AND_REPUTATION_POWER',source:'EPIC_HEROIC_TRADITION_SOCIAL_HISTORY',principle:'실제 힘과 별개로 이름·소문·평판이 타인의 행동을 결정한다.',gameGrammar:'플레이어의 실제 행동보다 퍼진 이야기와 평판이 적·상점·세력의 규칙을 바꾼다.'}
]);
export const PORTFOLIO_DEPARTMENTS=Object.freeze(['planning','graphics','development','qa','balance']);
export const SEED_MATERIAL_DYNAMIC_SIGNALS=Object.freeze([
  'TARGET_PLATFORM_FIT',
  'CATEGORY_OR_GENRE_FIT',
  'MATERIAL_COMPLEMENTARITY',
  'VALIDATED_LEARNING_OUTCOME',
  'TOP30_DIFFERENTIATION'
]);

const clean=v=>String(v??'').trim();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
const norm=v=>clean(v).toLowerCase();
export function readJson(file,fallback=null){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
export function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function materialId(index){return `MAT-${String(index+1).padStart(3,'0')}`;}
function normalizeMaterial(raw,index){
  const family=SEED_MATERIAL_SOURCE_FAMILIES.includes(clean(raw?.sourceFamily))?clean(raw.sourceFamily):SEED_MATERIAL_SOURCE_FAMILIES[index%SEED_MATERIAL_SOURCE_FAMILIES.length];
  return {
    materialId:clean(raw?.materialId)||materialId(index),
    status:['AVAILABLE','RESERVED','CONSUMED'].includes(clean(raw?.status).toUpperCase())?clean(raw.status).toUpperCase():'AVAILABLE',
    sourceFamily:family,
    categoryHint:clean(raw?.categoryHint)||DEFAULT_SEED_CATEGORIES[index%DEFAULT_SEED_CATEGORIES.length],
    concept:clean(raw?.concept)||`${family} material ${index+1}`,
    mechanic:clean(raw?.mechanic)||'UNSPECIFIED_UNTIL_COMPOSITION',
    setting:clean(raw?.setting)||'OPEN_FOR_REINTERPRETATION',
    causalDNA:(()=>{
      const known=new Set(CAUSAL_DNA_LIBRARY.map(row=>row.id));
      const provided=uniq(raw?.causalDNA).filter(id=>known.has(id));
      const fallback=[CAUSAL_DNA_LIBRARY[index%CAUSAL_DNA_LIBRARY.length].id,CAUSAL_DNA_LIBRARY[(index*7+5)%CAUSAL_DNA_LIBRARY.length].id];
      return uniq([...provided,...fallback]).slice(0,3);
    })(),
    learningPreference:clean(raw?.learningPreference)||null,
    learningAvoid:clean(raw?.learningAvoid)||null,
    createdAt:clean(raw?.createdAt)||null,
    updatedAt:clean(raw?.updatedAt)||null,
    consumedAt:clean(raw?.consumedAt)||null,
    consumedBySeedId:clean(raw?.consumedBySeedId)||null,
  };
}
function defaultMaterial(index,timestamp=null){
  const family=SEED_MATERIAL_SOURCE_FAMILIES[index%SEED_MATERIAL_SOURCE_FAMILIES.length];
  const category=DEFAULT_SEED_CATEGORIES[index%DEFAULT_SEED_CATEGORIES.length];
  return normalizeMaterial({
    materialId:materialId(index),status:'AVAILABLE',sourceFamily:family,categoryHint:category,
    concept:`${family}에서 얻은 독립 게임 재료 ${index+1}`,
    mechanic:'설계 단계에서 다른 재료와 조합해 결정',
    setting:'원본 표현을 복제하지 않고 새 세계관으로 재해석',
    createdAt:timestamp,updatedAt:timestamp,
  },index);
}
export function normalizeSeedState(raw={}){
  const state=raw&&typeof raw==='object'&&!Array.isArray(raw)?structuredClone(raw):{};
  state.version=Math.max(2,Number(state.version)||0);
  delete state.policyDocument;
  state.policyAuthority='company-learning/platform-release-roadmap.json';
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
  if(!Array.isArray(state.seedMaterials))state.seedMaterials=[];
  state.seedMaterials=state.seedMaterials.map(normalizeMaterial);
  if(!state.seedMaterialPolicy||typeof state.seedMaterialPolicy!=='object'||Array.isArray(state.seedMaterialPolicy))state.seedMaterialPolicy={};
  state.seedMaterialPolicy={
    targetCount:SEED_MATERIAL_POOL_TARGET,
    materialIsGame:false,
    combineMin:2,
    combineMax:4,
    compositionMode:'DYNAMIC_CONTEXTUAL_2_TO_4',
    fixedCompositionCount:false,
    dynamicSignals:[...SEED_MATERIAL_DYNAMIC_SIGNALS],
    sourceFamilies:[...SEED_MATERIAL_SOURCE_FAMILIES],
    actualGameCountUnlimited:true,
    ...state.seedMaterialPolicy,
  };
  if(!state.platformSets||typeof state.platformSets!=='object'||Array.isArray(state.platformSets))state.platformSets={};
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
export function ensureSeedMaterialPool(state,{timestamp=new Date().toISOString(),target=SEED_MATERIAL_POOL_TARGET}={}){
  const normalized=normalizeSeedState(state);
  state.version=normalized.version;state.policyAuthority=normalized.policyAuthority;delete state.policyDocument;state.seedMaterialPolicy=normalized.seedMaterialPolicy;
  state.seedMaterials=normalized.seedMaterials;
  const active=state.seedMaterials.filter(x=>x.status==='AVAILABLE'||x.status==='RESERVED');
  let nextIndex=state.seedMaterials.length;
  while(active.length<target){
    const row=defaultMaterial(nextIndex++,timestamp);
    state.seedMaterials.push(row);active.push(row);
  }
  state.seedMaterialPolicy.targetCount=target;
  state.seedMaterialPolicy.availableCount=state.seedMaterials.filter(x=>x.status==='AVAILABLE').length;
  state.seedMaterialPolicy.lastReplenishedAt=timestamp;
  return state.seedMaterials;
}
export function availableSeedMaterials(state){return normalizeSeedState(state).seedMaterials.filter(x=>x.status==='AVAILABLE');}

function activeSeed(seed){return seed&&!['DISCARDED','REMOVED'].includes(clean(seed.status).toUpperCase());}
function materialFamilyById(state){return new Map((state.seedMaterials||[]).map(row=>[clean(row.materialId),clean(row.sourceFamily)]).filter(([id,family])=>id&&family));}
function familyUsageForSeeds(state,seeds=[]){
  const familyById=materialFamilyById(state);const counts=new Map();let total=0;
  for(const seed of seeds){
    for(const id of Array.isArray(seed?.SEED_MATERIAL_IDS)?seed.SEED_MATERIAL_IDS:[]){
      const family=familyById.get(clean(id));if(!family)continue;
      counts.set(family,(counts.get(family)||0)+1);total++;
    }
  }
  return {counts,total};
}
function top30Seeds(state,top30GameIds=[]){const ids=new Set(uniq(top30GameIds));return(state.seeds||[]).filter(seed=>activeSeed(seed)&&ids.has(clean(seed.gameId)));}
function materialTokens(row){return new Set(norm(`${row?.concept||''} ${row?.mechanic||''} ${row?.setting||''} ${(row?.causalDNA||[]).join(' ')}`).split(/[^a-z0-9가-힣]+/).filter(token=>token.length>2));}
function learningFamilies(learningSignals,key){return uniq(learningSignals?.[key]);}

export function resolveSeedMaterialCompositionCount(state,{platform='',category='',top30GameIds=[],learningSignals={}}={}){
  ensureSeedMaterialPool(state);
  const p=normalizeSeedPlatform(platform);const c=clean(category);
  const available=(state.seedMaterials||[]).filter(row=>row.status==='AVAILABLE');
  const preferred=new Set(learningFamilies(learningSignals,'preferFamilies'));
  const avoided=new Set(learningFamilies(learningSignals,'avoidFamilies'));
  const preferredAvailableFamilies=new Set(available.filter(row=>preferred.has(row.sourceFamily)&&!avoided.has(row.sourceFamily)).map(row=>row.sourceFamily));
  const categoryAlignedFamilies=new Set(available.filter(row=>(!c||clean(row.categoryHint)===c)&&!avoided.has(row.sourceFamily)).map(row=>row.sourceFamily));
  const topSeeds=top30Seeds(state,top30GameIds);
  const sameCategoryTop30=c?topSeeds.filter(seed=>clean(seed.GAME_CATEGORY)===c).length:0;
  const samePlatformTop30=p?topSeeds.filter(seed=>seedPlatform(seed)===p).length:0;
  const usage=familyUsageForSeeds(state,topSeeds);let maxFamilyUsage=0;
  for(const count of usage.counts.values())maxFamilyUsage=Math.max(maxFamilyUsage,count);
  const familyConcentration=usage.total?maxFamilyUsage/usage.total:0;
  if(sameCategoryTop30>=3||familyConcentration>=0.34||(samePlatformTop30>=8&&categoryAlignedFamilies.size<3))return 4;
  if(preferredAvailableFamilies.size>=2&&categoryAlignedFamilies.size>=2&&sameCategoryTop30===0&&samePlatformTop30<=4)return 2;
  return 3;
}

export function composeSeedMaterials(state,{count=null,timestamp=new Date().toISOString(),learningSignals={},platform='',category='',top30GameIds=[]}={}){
  ensureSeedMaterialPool(state,{timestamp});
  const explicit=Number(count);
  const n=Number.isFinite(explicit)&&explicit>=2&&explicit<=4?Math.trunc(explicit):resolveSeedMaterialCompositionCount(state,{platform,category,top30GameIds,learningSignals});
  const available=state.seedMaterials.filter(x=>x.status==='AVAILABLE');
  if(available.length<n)throw new Error(`SEED_MATERIAL_POOL_EXHAUSTED ${available.length}/${n}`);
  const preferred=new Set(learningFamilies(learningSignals,'preferFamilies'));
  const avoided=new Set(learningFamilies(learningSignals,'avoidFamilies'));
  const p=normalizeSeedPlatform(platform);const c=clean(category);
  const topSeeds=top30Seeds(state,top30GameIds);
  const topUsage=familyUsageForSeeds(state,topSeeds);
  const platformUsage=familyUsageForSeeds(state,(state.seeds||[]).filter(seed=>activeSeed(seed)&&(!p||seedPlatform(seed)===p)));
  const selected=[];const selectedFamilies=new Set();const selectedTokens=new Set();const selectedCausalDNA=new Set();
  const baseScore=row=>{
    let score=0;
    if(preferred.has(row.sourceFamily))score+=4;
    if(avoided.has(row.sourceFamily))score-=7;
    if(c&&clean(row.categoryHint)===c)score+=3;
    score-=(topUsage.counts.get(row.sourceFamily)||0)*1.25;
    score-=(platformUsage.counts.get(row.sourceFamily)||0)*0.15;
    if(clean(row.learningPreference))score+=1;
    if(clean(row.learningAvoid))score-=1;
    return score;
  };
  while(selected.length<n){
    let best=null,bestScore=-Infinity;
    for(const row of available){
      if(selected.includes(row))continue;
      const tokens=materialTokens(row);let novel=0;
      for(const token of tokens)if(!selectedTokens.has(token))novel++;
      const novelty=tokens.size?novel/tokens.size:0;
      const complementarity=selectedFamilies.has(row.sourceFamily)?-2.5:2.5;
      const rowCausal=Array.isArray(row.causalDNA)?row.causalDNA:[];
      const causalNovel=rowCausal.filter(id=>!selectedCausalDNA.has(id)).length/Math.max(1,rowCausal.length);
      const score=baseScore(row)+complementarity+novelty*1.5+causalNovel*2;
      if(score>bestScore||(score===bestScore&&clean(row.materialId)<clean(best?.materialId))){best=row;bestScore=score;}
    }
    if(!best)break;
    selected.push(best);selectedFamilies.add(best.sourceFamily);for(const token of materialTokens(best))selectedTokens.add(token);for(const id of best.causalDNA||[])selectedCausalDNA.add(id);
  }
  if(selected.length!==n)throw new Error(`SEED_MATERIAL_COMPOSITION_FAILED ${selected.length}/${n}`);
  for(const row of selected){row.status='RESERVED';row.updatedAt=timestamp;}
  state.seedMaterialPolicy.lastComposition={count:n,platform:p||null,category:c||null,top30ReferenceCount:topSeeds.length,signals:[...SEED_MATERIAL_DYNAMIC_SIGNALS],selectedMaterialIds:selected.map(row=>row.materialId),selectedFamilies:[...selectedFamilies],selectedCausalDNA:[...selectedCausalDNA],updatedAt:timestamp};
  return selected;
}
export function consumeSeedMaterials(state,materials,{seedId,timestamp=new Date().toISOString()}={}){
  const ids=new Set((materials||[]).map(x=>clean(x?.materialId||x)).filter(Boolean));
  for(const row of state.seedMaterials||[]){
    if(!ids.has(row.materialId))continue;
    row.status='CONSUMED';row.consumedAt=timestamp;row.consumedBySeedId=clean(seedId)||null;row.updatedAt=timestamp;
  }
  ensureSeedMaterialPool(state,{timestamp});
  return state.seedMaterials;
}
export function releaseSeedMaterialReservations(state,materials,{timestamp=new Date().toISOString()}={}){
  const ids=new Set((materials||[]).map(x=>clean(x?.materialId||x)).filter(Boolean));
  for(const row of state.seedMaterials||[]){if(ids.has(row.materialId)&&row.status==='RESERVED'){row.status='AVAILABLE';row.updatedAt=timestamp;}}
}
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
  return uniq(categories).filter(category=>activeSeedsForPlatformCategory(state,p,category).length===0);
}
export function recordPlatformSetState(state,{platform,categories=[],timestamp=new Date().toISOString()}={}){
  const p=normalizeSeedPlatform(platform);if(!p)return null;
  state.platformSets??={};
  const normalizedCategories=uniq(categories);
  const gaps=platformRepresentativeGaps(state,p,normalizedCategories);
  const row={platform:p,categories:normalizedCategories,gaps,complete:gaps.length===0,activeRepresentativeCount:normalizedCategories.length-gaps.length,updatedAt:timestamp,historicalSchedulingOnly:true};
  state.platformSets[p]=row;return row;
}
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
  const targetPlatform=normalizeSeedPlatform(request.targetPlatform||'');
  return {...scoreResult,pass:errors.length===0,errors,category,action,evidenceRefs,ownerOverride,targetPlatform:targetPlatform||null};
}
export function pendingPortfolioSeedRequests(state){
  const requests=(state?.portfolioSeedRequests||[]).filter(request=>!request.fulfilledAt&&!request.cancelledAt&&clean(request.status||'PENDING').toUpperCase()==='PENDING');
  return requests.map(request=>{
    const result=validatePortfolioSeedRequest(request);
    if(!result.pass)throw new Error(`INVALID_PORTFOLIO_SEED_REQUEST ${clean(request.id)||'UNKNOWN'}: ${result.errors.join(',')}`);
    return request;
  });
}
export function createPortfolioSeedRequest(state,{category,targetPlatform=null,departmentScores,evidenceRefs,ownerOverride=false,timestamp=new Date().toISOString(),requestId=null}={}){
  state.portfolioSeedRequests??=[];
  const id=clean(requestId)||`PSR-${String(state.portfolioSeedRequests.length+1).padStart(5,'0')}`;
  const normalizedTargetPlatform=normalizeSeedPlatform(targetPlatform||'');
  const request={id,action:'EXPAND',category:clean(category),targetPlatform:normalizedTargetPlatform||null,departmentScores:{...(departmentScores||{})},evidenceRefs:uniq(evidenceRefs),ownerOverride:ownerOverride===true,status:'PENDING',createdAt:timestamp,fulfilledAt:null,seedId:null,gameId:null};
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
