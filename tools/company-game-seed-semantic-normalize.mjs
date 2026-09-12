import fs from 'node:fs';
import {assertGameSeed,GAME_SEED_POLICY} from './company-game-seed-contract.mjs';

const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const evidenceFile=process.env.GAME_SEED_MARKET_EVIDENCE_FILE||'game-seed-market-evidence.json';
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};

if(!fs.existsSync(stateFile))throw new Error('GAME_SEED_NORMALIZE_STATE_MISSING');
const state=readJson(stateFile,{seeds:[]});
const evidence=readJson(evidenceFile,{targetMarketScope:'GLOBAL',categories:{},globalSources:[]});
const evidenceScope=clean(evidence.targetMarketScope||'GLOBAL').toUpperCase();
if(evidenceScope!=='GLOBAL')throw new Error(`GAME_SEED_NORMALIZE_EVIDENCE_SCOPE_MUST_BE_GLOBAL ${evidenceScope}`);

const allowedPlatforms=new Set(GAME_SEED_POLICY.allowedTargetPlatforms);
const categoryLabel=category=>clean(category).toLowerCase().replaceAll('_',' ');
const businessMeta=/increase user base|boost sales|drive engagement|content growth|optimi[sz]e overall performance/i;

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
    if(src.metrics&&typeof src.metrics==='object'&&!Array.isArray(src.metrics)){
      for(const [metric,value] of Object.entries(src.metrics)){
        const sanitized=sanitizeMetric({metric,value,source,observedAt});
        if(sanitized)metrics.push(sanitized);
      }
    }
    out.push({title,metrics,qualitative:clean(src.qualitative||src.note)||null});
  }
  return out;
}
const sharedGlobalRefs=globalReferences();

function categoryConfig(category){
  const cfg=evidence.categories&&typeof evidence.categories==='object'&&!Array.isArray(evidence.categories)?evidence.categories[category]:null;
  return cfg&&typeof cfg==='object'?cfg:{};
}
function mergeReferences(current,extra){
  const byTitle=new Map();
  for(const ref of [...(Array.isArray(current)?current:[]),...(Array.isArray(extra)?extra:[])]){
    if(!ref||typeof ref!=='object')continue;
    const title=clean(ref.title||ref.name||ref.game);if(!title||byTitle.has(norm(title)))continue;
    const metrics=(Array.isArray(ref.metrics)?ref.metrics:[]).map(sanitizeMetric).filter(Boolean);
    byTitle.set(norm(title),{...ref,title,metrics});
  }
  return [...byTitle.values()];
}
function normalizePlatform(value){
  const platform=clean(value).toUpperCase().replaceAll('-','_');
  if(platform==='ANDROID_MOBILE'||platform==='UNITY_ANDROID')return 'UNITY';
  if(platform==='UEFN'||platform==='FORTNITE')return 'FORTNITE_UEFN';
  if(allowedPlatforms.has(platform))return platform;
  return GAME_SEED_POLICY.initialTargetPlatform;
}
function normalizeSeed(seed){
  const category=clean(seed.GAME_CATEGORY);
  const cfg=categoryConfig(category);
  const benchmarkCandidates=uniq(cfg.benchmarkCandidates);

  if(benchmarkCandidates.length){
    const allowedMap=new Map(benchmarkCandidates.map(name=>[norm(name),name]));
    const matched=uniq(seed.REFERENCE_GAMES).map(name=>allowedMap.get(norm(name))).filter(Boolean);
    if(matched.length)seed.REFERENCE_GAMES=matched.slice(0,4);
    else if(!uniq(seed.REFERENCE_GAMES).length)seed.REFERENCE_GAMES=benchmarkCandidates.slice(0,2);
  }

  const loops=uniq(seed.CORE_LOOP).filter(item=>!businessMeta.test(item));
  const fallbackLoops=uniq(cfg.minimumCoreLoop);
  if(loops.length<3&&fallbackLoops.length>=3)seed.CORE_LOOP=fallbackLoops.slice(0,8);
  else seed.CORE_LOOP=loops.slice(0,8);

  const coreFun=uniq(seed.CORE_FUN_TO_LEARN).filter(item=>!businessMeta.test(item));
  seed.CORE_FUN_TO_LEARN=coreFun.slice(0,6);

  const market=seed.MARKET_EVIDENCE_SUMMARY&&typeof seed.MARKET_EVIDENCE_SUMMARY==='object'&&!Array.isArray(seed.MARKET_EVIDENCE_SUMMARY)?seed.MARKET_EVIDENCE_SUMMARY:{};
  const categoryRefs=Array.isArray(cfg.references)?cfg.references:[];
  const references=mergeReferences(market.references,[...categoryRefs,...sharedGlobalRefs]);
  seed.MARKET_EVIDENCE_SUMMARY={
    ...market,
    role:'TARGET_DESIGN_REFERENCE',
    targetMarketScope:'GLOBAL',
    countrySpecificEvidenceRole:'SECONDARY_CONTEXT_ONLY',
    hardPassFailGate:false,
    missingDataDoesNotRejectSeed:true,
    marketDataAloneCannotDiscard:true,
    available:references.length>0,
    sourceFile:fs.existsSync(evidenceFile)?evidenceFile:null,
    references
  };

  if(!clean(seed.TARGET_AUDIENCE))seed.TARGET_AUDIENCE=`Global players interested in ${categoryLabel(category)||'the selected game concept'}.`;
  if(!clean(seed.TARGET_SESSION_DIRECTION))seed.TARGET_SESSION_DIRECTION='Use market evidence only as directional context and define session structure from the selected platform, play mode, and core loop.';
  seed.INITIAL_TARGET_PLATFORM=normalizePlatform(seed.INITIAL_TARGET_PLATFORM);
  if(!clean(seed.INITIAL_PLAY_MODE))seed.INITIAL_PLAY_MODE=GAME_SEED_POLICY.initialPlayMode;
  if(!clean(seed.CROSS_PLATFORM_EXPANSION_VALUE))seed.CROSS_PLATFORM_EXPANSION_VALUE='UNKNOWN_UNTIL_PLATFORM_EXPANSION_REVIEW';

  assertGameSeed(seed);
  return seed;
}

const candidates=(state.seeds||[]).filter(seed=>clean(seed.status).toUpperCase()==='ACTIVE');
for(const seed of candidates)normalizeSeed(seed);
fs.writeFileSync(stateFile,`${JSON.stringify(state,null,2)}\n`);
console.log('GAME_SEED_SEMANTIC_NORMALIZE=PASS');
console.log(`GAME_SEED_SEMANTIC_NORMALIZED_COUNT=${candidates.length}`);
console.log('GAME_SEED_MARKET_EVIDENCE_ROLE=REFERENCE_ONLY');
console.log('GAME_SEED_PLATFORM_SELECTION=PROJECT_DEFINED_WITH_ROBLOX_DEFAULT');
