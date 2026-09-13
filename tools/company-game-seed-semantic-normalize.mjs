import fs from 'node:fs';
import {assertGameSeed,GAME_SEED_POLICY} from './company-game-seed-contract.mjs';
import {normalizeSeedState,ensureSeedMaterialPool} from './game-seed-state.mjs';
import {categorySeedProfile,loadPlatformProfiles,normalizeSeedPlatform} from './game-seed-platform-profile.mjs';

const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const evidenceFile=process.env.GAME_SEED_MARKET_EVIDENCE_FILE||'game-seed-market-evidence.json';
const platformProfileFile=process.env.GAME_SEED_PLATFORM_PROFILE_FILE||'game-seed-platform-profiles.json';
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};

if(!fs.existsSync(stateFile))throw new Error('GAME_SEED_NORMALIZE_STATE_MISSING');
const state=normalizeSeedState(readJson(stateFile,{seeds:[]}));
ensureSeedMaterialPool(state);
const evidence=readJson(evidenceFile,{targetMarketScope:'GLOBAL',categories:{},globalSources:[]});
const platformProfiles=loadPlatformProfiles(platformProfileFile);
const evidenceScope=clean(evidence.targetMarketScope||'GLOBAL').toUpperCase();
if(evidenceScope!=='GLOBAL')throw new Error(`GAME_SEED_NORMALIZE_EVIDENCE_SCOPE_MUST_BE_GLOBAL ${evidenceScope}`);

const allowedPlatforms=new Set(GAME_SEED_POLICY.allowedTargetPlatforms);
const categoryLabel=category=>clean(category).toLowerCase().replaceAll('_',' ');
const businessMeta=/increase user base|boost sales|drive engagement|content growth|optimi[sz]e overall performance/i;
const weakLoopSuffix=/결과 피드백을 확인하고 다음 선택이나 보상으로 이어진다/;

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
function globalReferences(){
  const out=[];
  for(const src of Array.isArray(evidence.globalSources)?evidence.globalSources:[]){
    if(!src||typeof src!=='object')continue;
    const title=clean(src.name||src.title);const source=clean(src.source);const observedAt=clean(src.observedAt);
    if(!title)continue;
    const metrics=[];
    if(src.metrics&&typeof src.metrics==='object'&&!Array.isArray(src.metrics))for(const [metric,value] of Object.entries(src.metrics)){const sanitized=sanitizeMetric({metric,value,source,observedAt});if(sanitized)metrics.push(sanitized);}
    out.push({title,metrics,qualitative:clean(src.qualitative||src.note)||null});
  }
  return out;
}
const sharedGlobalRefs=globalReferences();
function normalizePlatform(value){
  const platform=clean(value).toUpperCase().replaceAll('-','_');
  if(platform==='ANDROID_MOBILE'||platform==='UNITY_ANDROID')return 'UNITY';
  if(platform==='UEFN'||platform==='FORTNITE')return 'FORTNITE_UEFN';
  if(allowedPlatforms.has(platform))return platform;
  return GAME_SEED_POLICY.initialTargetPlatform;
}
function profileForSeed(seed){return categorySeedProfile({platform:normalizePlatform(seed.INITIAL_TARGET_PLATFORM),category:clean(seed.GAME_CATEGORY),marketEvidence:evidence,platformProfiles})||{};}
function platformBenchmarkTitles(platform){
  const categories=platformProfiles?.platforms?.[normalizeSeedPlatform(platform)]?.categories||{};const names=[];
  for(const profile of Object.values(categories)){names.push(...uniq(profile?.benchmarkCandidates));for(const ref of Array.isArray(profile?.references)?profile.references:[])names.push(typeof ref==='string'?ref:clean(ref?.title||ref?.name||ref?.game));}
  return uniq(names);
}
function conceptGroupCoverage(text,groups){const haystack=norm(text);return (Array.isArray(groups)?groups:[]).filter(group=>uniq(group).some(term=>haystack.includes(norm(term)))).length;}
function mergeReferences(current,extra){
  const byTitle=new Map();
  for(const ref of [...(Array.isArray(current)?current:[]),...(Array.isArray(extra)?extra:[])]){
    if(!ref||typeof ref!=='object')continue;const title=clean(ref.title||ref.name||ref.game);if(!title||byTitle.has(norm(title)))continue;
    const metrics=(Array.isArray(ref.metrics)?ref.metrics:[]).map(sanitizeMetric).filter(Boolean);byTitle.set(norm(title),{...ref,title,metrics});
  }
  return [...byTitle.values()];
}
function referenceInputsFor(seed){
  const materialIds=uniq(seed.SEED_MATERIAL_IDS);
  const materialMap=new Map((state.seedMaterials||[]).map(row=>[row.materialId,row]));
  const materials=materialIds.map(id=>materialMap.get(id)).filter(Boolean).map(row=>({type:'SEED_MATERIAL',id:row.materialId,sourceFamily:row.sourceFamily,value:row.concept}));
  const games=uniq(seed.REFERENCE_GAMES).map(value=>({type:'GAME_REFERENCE',value}));
  return [...materials,...games].slice(0,8);
}
function normalizeSeed(seed){
  const category=clean(seed.GAME_CATEGORY);const platform=normalizePlatform(seed.INITIAL_TARGET_PLATFORM);const cfg=profileForSeed({...seed,INITIAL_TARGET_PLATFORM:platform});
  const benchmarkCandidates=uniq(cfg.benchmarkCandidates);const knownPlatformTitles=platformBenchmarkTitles(platform);const forbiddenTitles=new Set(knownPlatformTitles.map(norm));const originalGameName=clean(seed.gameName);let repaired=false;
  if(forbiddenTitles.has(norm(seed.gameName))){const fallback=clean(cfg.originalWorkingTitle);if(!fallback||forbiddenTitles.has(norm(fallback)))throw new Error(`GAME_SEED_NORMALIZE_ORIGINAL_TITLE_FALLBACK_MISSING ${platform}/${category}`);seed.gameName=fallback;repaired=true;}
  if(benchmarkCandidates.length&&Array.isArray(seed.REFERENCE_GAMES)&&seed.REFERENCE_GAMES.length){const allowedMap=new Map(benchmarkCandidates.map(name=>[norm(name),name]));const matched=uniq(seed.REFERENCE_GAMES).map(name=>allowedMap.get(norm(name))).filter(Boolean);seed.REFERENCE_GAMES=matched.length?matched.slice(0,4):[];}
  else if(!Array.isArray(seed.REFERENCE_GAMES))seed.REFERENCE_GAMES=[];

  const loops=uniq(seed.CORE_LOOP).filter(item=>!businessMeta.test(item));const fallbackLoops=uniq(cfg.minimumCoreLoop);const groups=Array.isArray(cfg.requiredConceptGroups)?cfg.requiredConceptGroups:[];const minimumGroups=Math.max(0,Number(cfg.minimumRequiredConceptGroups||0));
  const weakLoop=loops.length<3||loops.some(item=>item.length<20||weakLoopSuffix.test(item))||(groups.length&&conceptGroupCoverage(loops.join(' '),groups)<minimumGroups);
  if(weakLoop&&fallbackLoops.length>=3){seed.CORE_LOOP=fallbackLoops.slice(0,8);repaired=true;}else seed.CORE_LOOP=loops.slice(0,8);
  seed.CORE_FUN_TO_LEARN=uniq(seed.CORE_FUN_TO_LEARN).filter(item=>!businessMeta.test(item)).slice(0,6);

  const identity=clean(seed.DISTINCT_IDENTITY);const identityNorm=norm(identity);const identityCopiesReference=/\bbenchmark\b/i.test(identity)||knownPlatformTitles.some(title=>identityNorm.includes(norm(title)));
  if(!identity||businessMeta.test(identity)||identityCopiesReference){const required=uniq(cfg.requiredConceptTerms).slice(0,2);seed.DISTINCT_IDENTITY=`${seed.gameName} is an original ${platform} ${categoryLabel(category)} experience built around ${required.join(' and ')||'its selected core loop'} while using its own world, visual identity, progression, economy, content, and interaction design.`;repaired=true;}

  const market=seed.MARKET_EVIDENCE_SUMMARY&&typeof seed.MARKET_EVIDENCE_SUMMARY==='object'&&!Array.isArray(seed.MARKET_EVIDENCE_SUMMARY)?seed.MARKET_EVIDENCE_SUMMARY:{};const categoryRefs=Array.isArray(cfg.references)?cfg.references:[];const references=mergeReferences(market.references,[...categoryRefs,...sharedGlobalRefs]);
  seed.MARKET_EVIDENCE_SUMMARY={...market,role:'TARGET_DESIGN_REFERENCE',targetMarketScope:'GLOBAL',countrySpecificEvidenceRole:'SECONDARY_CONTEXT_ONLY',hardPassFailGate:false,missingDataDoesNotRejectSeed:true,marketDataAloneCannotDiscard:true,available:references.length>0,sourceFile:fs.existsSync(evidenceFile)?evidenceFile:null,platformProfileFile:fs.existsSync(platformProfileFile)?platformProfileFile:null,references};

  seed.REFERENCE_INPUTS=referenceInputsFor(seed);
  if(!seed.REFERENCE_INPUTS.length)seed.REFERENCE_INPUTS=[{type:'ORIGINAL_MATERIAL',value:'original non-game seed material composition'}];
  if(!clean(seed.TARGET_AUDIENCE))seed.TARGET_AUDIENCE=`Global players interested in ${categoryLabel(category)||'the selected game concept'}.`;
  seed.TARGET_SESSION_MINUTES=30;
  seed.TARGET_SESSION_DIRECTION='30분 의미 있는 첫 세션 기준: 0~5분 조작·목표 이해, 5~15분 핵심 루프 반복과 첫 성장/선택, 15~25분 변주·난이도·스토리 또는 전략 변화, 25~30분 중간목표·보상·다음 플레이 동기. 단순 체력/대기/반복으로 시간만 늘리는 것은 금지한다.';
  seed.INITIAL_TARGET_PLATFORM=platform;
  if(!clean(seed.INITIAL_PLAY_MODE))seed.INITIAL_PLAY_MODE=GAME_SEED_POLICY.initialPlayMode;
  const inferred=clean(seed.MULTIPLAYER_DESIGN_MODE).toUpperCase();
  seed.MULTIPLAYER_DESIGN_MODE=GAME_SEED_POLICY.multiplayerModes.includes(inferred)?inferred:(String(seed.INITIAL_PLAY_MODE).toUpperCase().includes('MULTI')?'HYBRID':'SINGLE');
  seed.MULTIPLAYER_DESIGN_REQUIRED_AT_DESIGN=true;
  seed.MULTIPLAYER_QA_REQUIRED=seed.MULTIPLAYER_DESIGN_MODE!=='SINGLE';
  if(!clean(seed.CROSS_PLATFORM_EXPANSION_VALUE))seed.CROSS_PLATFORM_EXPANSION_VALUE='UNKNOWN_UNTIL_PLATFORM_EXPANSION_REVIEW';
  if(repaired)seed.semanticNormalization={repaired:true,reason:'PLATFORM_PROFILE_SEMANTIC_ORIGINALITY_REPAIR',previousGameName:originalGameName&&originalGameName!==seed.gameName?originalGameName:null,profileFile:platformProfileFile};
  assertGameSeed(seed);return seed;
}

const candidates=(state.seeds||[]).filter(seed=>clean(seed.status).toUpperCase()==='ACTIVE');
for(const seed of candidates)normalizeSeed(seed);
fs.writeFileSync(stateFile,`${JSON.stringify(state,null,2)}\n`);
console.log('GAME_SEED_SEMANTIC_NORMALIZE=PASS');
console.log(`GAME_SEED_SEMANTIC_NORMALIZED_COUNT=${candidates.length}`);
console.log(`SEED_MATERIAL_POOL_TARGET=${state.seedMaterialPolicy?.targetCount||100}`);
console.log(`SEED_MATERIAL_POOL_AVAILABLE=${state.seedMaterials.filter(x=>x.status==='AVAILABLE').length}`);
console.log('TARGET_SESSION_MINUTES=30');
console.log('MULTIPLAYER_DECISION_STAGE=DESIGN');
console.log('GAME_SEED_STATE_NORMALIZATION_PERSISTED=YES');
console.log('GAME_SEED_MARKET_EVIDENCE_ROLE=REFERENCE_ONLY');
console.log('GAME_SEED_PLATFORM_SELECTION=PROJECT_DEFINED_WITH_ROBLOX_DEFAULT');
