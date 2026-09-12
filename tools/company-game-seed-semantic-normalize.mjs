import fs from 'node:fs';
import {assertGameSeed,GAME_SEED_POLICY} from './company-game-seed-contract.mjs';
import {normalizeSeedState} from './game-seed-state.mjs';
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

function normalizePlatform(value){
  const platform=clean(value).toUpperCase().replaceAll('-','_');
  if(platform==='ANDROID_MOBILE'||platform==='UNITY_ANDROID')return 'UNITY';
  if(platform==='UEFN'||platform==='FORTNITE')return 'FORTNITE_UEFN';
  if(allowedPlatforms.has(platform))return platform;
  return GAME_SEED_POLICY.initialTargetPlatform;
}
function profileForSeed(seed){
  const platform=normalizePlatform(seed.INITIAL_TARGET_PLATFORM);
  const category=clean(seed.GAME_CATEGORY);
  return categorySeedProfile({platform,category,marketEvidence:evidence,platformProfiles})||{};
}
function platformBenchmarkTitles(platform){
  const categories=platformProfiles?.platforms?.[normalizeSeedPlatform(platform)]?.categories||{};
  const names=[];
  for(const profile of Object.values(categories)){
    names.push(...uniq(profile?.benchmarkCandidates));
    for(const ref of Array.isArray(profile?.references)?profile.references:[]){
      names.push(typeof ref==='string'?ref:clean(ref?.title||ref?.name||ref?.game));
    }
  }
  return uniq(names);
}
function conceptGroupCoverage(text,groups){
  const haystack=norm(text);
  return (Array.isArray(groups)?groups:[]).filter(group=>uniq(group).some(term=>haystack.includes(norm(term)))).length;
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
function normalizeSeed(seed){
  const category=clean(seed.GAME_CATEGORY);
  const platform=normalizePlatform(seed.INITIAL_TARGET_PLATFORM);
  const cfg=profileForSeed({...seed,INITIAL_TARGET_PLATFORM:platform});
  const benchmarkCandidates=uniq(cfg.benchmarkCandidates);
  const knownPlatformTitles=platformBenchmarkTitles(platform);
  const forbiddenTitles=new Set(knownPlatformTitles.map(norm));
  const originalGameName=clean(seed.gameName);
  let repaired=false;

  if(forbiddenTitles.has(norm(seed.gameName))){
    const fallback=clean(cfg.originalWorkingTitle);
    if(!fallback||forbiddenTitles.has(norm(fallback)))throw new Error(`GAME_SEED_NORMALIZE_ORIGINAL_TITLE_FALLBACK_MISSING ${platform}/${category}`);
    seed.gameName=fallback;
    repaired=true;
  }

  if(benchmarkCandidates.length){
    const allowedMap=new Map(benchmarkCandidates.map(name=>[norm(name),name]));
    const matched=uniq(seed.REFERENCE_GAMES).map(name=>allowedMap.get(norm(name))).filter(Boolean);
    if(matched.length)seed.REFERENCE_GAMES=matched.slice(0,4);
    else seed.REFERENCE_GAMES=benchmarkCandidates.slice(0,Math.min(2,benchmarkCandidates.length));
  }

  const loops=uniq(seed.CORE_LOOP).filter(item=>!businessMeta.test(item));
  const fallbackLoops=uniq(cfg.minimumCoreLoop);
  const groups=Array.isArray(cfg.requiredConceptGroups)?cfg.requiredConceptGroups:[];
  const minimumGroups=Math.max(0,Number(cfg.minimumRequiredConceptGroups||0));
  const weakLoop=loops.length<3||loops.some(item=>item.length<20||weakLoopSuffix.test(item))||(groups.length&&conceptGroupCoverage(loops.join(' '),groups)<minimumGroups);
  if(weakLoop&&fallbackLoops.length>=3){seed.CORE_LOOP=fallbackLoops.slice(0,8);repaired=true;}
  else seed.CORE_LOOP=loops.slice(0,8);

  const coreFun=uniq(seed.CORE_FUN_TO_LEARN).filter(item=>!businessMeta.test(item));
  seed.CORE_FUN_TO_LEARN=coreFun.slice(0,6);

  const identity=clean(seed.DISTINCT_IDENTITY);
  const identityNorm=norm(identity);
  const identityCopiesReference=/\bbenchmark\b/i.test(identity)||knownPlatformTitles.some(title=>identityNorm.includes(norm(title)));
  if(!identity||businessMeta.test(identity)||identityCopiesReference){
    const required=uniq(cfg.requiredConceptTerms).slice(0,2);
    seed.DISTINCT_IDENTITY=`${seed.gameName} is an original ${platform} ${categoryLabel(category)} experience built around ${required.join(' and ')||'its selected core loop'} while using its own world, visual identity, progression, economy, content, and interaction design.`;
    repaired=true;
  }

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
    platformProfileFile:fs.existsSync(platformProfileFile)?platformProfileFile:null,
    references
  };

  if(!clean(seed.TARGET_AUDIENCE))seed.TARGET_AUDIENCE=`Global players interested in ${categoryLabel(category)||'the selected game concept'}.`;
  if(!clean(seed.TARGET_SESSION_DIRECTION))seed.TARGET_SESSION_DIRECTION='Use market evidence only as directional context and define session structure from the selected platform, play mode, and core loop.';
  seed.INITIAL_TARGET_PLATFORM=platform;
  if(!clean(seed.INITIAL_PLAY_MODE))seed.INITIAL_PLAY_MODE=GAME_SEED_POLICY.initialPlayMode;
  if(!clean(seed.CROSS_PLATFORM_EXPANSION_VALUE))seed.CROSS_PLATFORM_EXPANSION_VALUE='UNKNOWN_UNTIL_PLATFORM_EXPANSION_REVIEW';
  if(repaired){
    seed.semanticNormalization={
      repaired:true,
      reason:'PLATFORM_PROFILE_SEMANTIC_ORIGINALITY_REPAIR',
      previousGameName:originalGameName&&originalGameName!==seed.gameName?originalGameName:null,
      profileFile:platformProfileFile,
    };
  }

  assertGameSeed(seed);
  return seed;
}

const candidates=(state.seeds||[]).filter(seed=>clean(seed.status).toUpperCase()==='ACTIVE');
for(const seed of candidates)normalizeSeed(seed);
fs.writeFileSync(stateFile,`${JSON.stringify(state,null,2)}\n`);
console.log('GAME_SEED_SEMANTIC_NORMALIZE=PASS');
console.log(`GAME_SEED_SEMANTIC_NORMALIZED_COUNT=${candidates.length}`);
console.log('GAME_SEED_STATE_NORMALIZATION_PERSISTED=YES');
console.log('GAME_SEED_MARKET_EVIDENCE_ROLE=REFERENCE_ONLY');
console.log('GAME_SEED_PLATFORM_SELECTION=PROJECT_DEFINED_WITH_ROBLOX_DEFAULT');
