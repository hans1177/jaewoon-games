import fs from 'node:fs';
import {validateGameSeed} from './company-game-seed-contract.mjs';
import {categorySeedProfile,loadPlatformProfiles,normalizeSeedPlatform} from './game-seed-platform-profile.mjs';

const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const evidenceFile=process.env.GAME_SEED_MARKET_EVIDENCE_FILE||'game-seed-market-evidence.json';
const platformProfileFile=process.env.GAME_SEED_PLATFORM_PROFILE_FILE||'game-seed-platform-profiles.json';
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};

if(!fs.existsSync(stateFile))throw new Error('GAME_SEED_QUALITY_STATE_MISSING');
const state=readJson(stateFile,{seeds:[]});
const evidence=readJson(evidenceFile,{targetMarketScope:'GLOBAL'});
const platformProfiles=loadPlatformProfiles(platformProfileFile);
const evidenceScope=clean(evidence.targetMarketScope||'GLOBAL').toUpperCase();
const failures=[];
if(evidenceScope!=='GLOBAL')failures.push(`market-evidence-scope=${evidenceScope}`);

const businessMeta=/increase user base|boost sales|drive engagement|content growth|optimi[sz]e overall performance/i;
const weakLoopSuffix=/결과 피드백을 확인하고 다음 선택이나 보상으로 이어진다/;
const numericLike=value=>typeof value==='number'||(/\d/.test(clean(value))&&clean(value).toUpperCase()!=='UNKNOWN');
const active=(state.seeds||[]).filter(seed=>clean(seed.status).toUpperCase()==='ACTIVE');

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

for(const seed of active){
  const id=clean(seed.seedId||seed.gameId||'unknown');
  const prefix=`${clean(seed.GAME_CATEGORY)||'UNCATEGORIZED'}:${id}`;
  const contract=validateGameSeed(seed);
  for(const error of contract.errors)failures.push(`${prefix}:contract:${error}`);

  const platform=normalizeSeedPlatform(seed.INITIAL_TARGET_PLATFORM);
  const profile=categorySeedProfile({platform,category:clean(seed.GAME_CATEGORY),marketEvidence:evidence,platformProfiles})||{};
  const platformTitles=platformBenchmarkTitles(platform);
  const forbiddenTitles=new Set(platformTitles.map(norm));
  if(forbiddenTitles.has(norm(seed.gameName)))failures.push(`${prefix}:game-name-copies-platform-benchmark-title`);

  const loops=Array.isArray(seed.CORE_LOOP)?seed.CORE_LOOP.map(clean).filter(Boolean):[];
  if(loops.length<3)failures.push(`${prefix}:core-loop-needs-at-least-3-steps`);
  if(loops.some(step=>businessMeta.test(step)))failures.push(`${prefix}:core-loop-business-meta-language`);
  if(loops.some(step=>step.length<20||weakLoopSuffix.test(step)))failures.push(`${prefix}:core-loop-needs-concrete-play-actions`);
  const groups=Array.isArray(profile.requiredConceptGroups)?profile.requiredConceptGroups:[];
  const minimumGroups=Math.max(0,Number(profile.minimumRequiredConceptGroups||0));
  if(groups.length){
    const coverage=conceptGroupCoverage(loops.join(' '),groups);
    if(coverage<minimumGroups)failures.push(`${prefix}:core-loop-concept-coverage=${coverage}/${minimumGroups}`);
  }

  const identity=clean(seed.DISTINCT_IDENTITY);
  if(!identity||businessMeta.test(identity))failures.push(`${prefix}:distinct-identity-missing-or-generic`);
  const identityNorm=norm(identity);
  if(/\bbenchmark\b/i.test(identity)||platformTitles.some(title=>identityNorm.includes(norm(title))))failures.push(`${prefix}:distinct-identity-copies-benchmark-expression`);
  if(seed.DIRECT_COPY===true||seed.COPY_SOURCE_CODE===true||seed.COPY_ASSETS===true)failures.push(`${prefix}:direct-copy-forbidden`);

  const market=seed.MARKET_EVIDENCE_SUMMARY&&typeof seed.MARKET_EVIDENCE_SUMMARY==='object'&&!Array.isArray(seed.MARKET_EVIDENCE_SUMMARY)?seed.MARKET_EVIDENCE_SUMMARY:{};
  if(clean(market.targetMarketScope||'GLOBAL').toUpperCase()!=='GLOBAL')failures.push(`${prefix}:market-scope-not-global`);
  if(market.hardPassFailGate===true)failures.push(`${prefix}:market-evidence-must-not-be-hard-gate`);
  if(market.marketDataAloneCannotDiscard===false)failures.push(`${prefix}:market-data-alone-cannot-discard`);
  for(const ref of Array.isArray(market.references)?market.references:[]){
    for(const metric of Array.isArray(ref?.metrics)?ref.metrics:[]){
      if(!numericLike(metric?.value))continue;
      if(!clean(metric?.source)||!clean(metric?.observedAt))failures.push(`${prefix}:unsourced-numeric-market-claim`);
    }
  }

  const audience=clean(seed.TARGET_AUDIENCE);
  if(/\b(korea|korean|south korea)\b/i.test(audience)&&!/owner override|owner-directed/i.test(audience))failures.push(`${prefix}:country-specific-default-audience`);
}

if(failures.length){
  console.error('GAME_SEED_SEMANTIC_QUALITY=FAIL');
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('GAME_SEED_SEMANTIC_QUALITY=PASS');
console.log(`GAME_SEED_ACTIVE_SEED_COUNT=${active.length}`);
console.log('GAME_SEED_FIXED_CATEGORY_SLOT_QUOTA=NO');
console.log('GAME_SEED_MARKET_EVIDENCE_HARD_GATE=NO');
console.log('GAME_SEED_POLICY_DOCUMENT=COMPANY_FLOW.md');
