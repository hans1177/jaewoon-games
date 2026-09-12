import fs from 'node:fs';
import {validateGameSeed} from './company-game-seed-contract.mjs';

const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const evidenceFile=process.env.GAME_SEED_MARKET_EVIDENCE_FILE||'game-seed-market-evidence.json';
const clean=v=>String(v??'').trim();
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};

if(!fs.existsSync(stateFile))throw new Error('GAME_SEED_QUALITY_STATE_MISSING');
const state=readJson(stateFile,{seeds:[]});
const evidence=readJson(evidenceFile,{targetMarketScope:'GLOBAL'});
const evidenceScope=clean(evidence.targetMarketScope||'GLOBAL').toUpperCase();
const failures=[];
if(evidenceScope!=='GLOBAL')failures.push(`market-evidence-scope=${evidenceScope}`);

const businessMeta=/increase user base|boost sales|drive engagement|content growth|optimi[sz]e overall performance/i;
const numericLike=value=>typeof value==='number'||(/\d/.test(clean(value))&&clean(value).toUpperCase()!=='UNKNOWN');
const active=(state.seeds||[]).filter(seed=>clean(seed.status).toUpperCase()==='ACTIVE');

for(const seed of active){
  const id=clean(seed.seedId||seed.gameId||'unknown');
  const prefix=`${clean(seed.GAME_CATEGORY)||'UNCATEGORIZED'}:${id}`;
  const contract=validateGameSeed(seed);
  for(const error of contract.errors)failures.push(`${prefix}:contract:${error}`);

  const loops=Array.isArray(seed.CORE_LOOP)?seed.CORE_LOOP.map(clean).filter(Boolean):[];
  if(loops.length<3)failures.push(`${prefix}:core-loop-needs-at-least-3-steps`);
  if(loops.some(step=>businessMeta.test(step)))failures.push(`${prefix}:core-loop-business-meta-language`);

  const identity=clean(seed.DISTINCT_IDENTITY);
  if(!identity||businessMeta.test(identity))failures.push(`${prefix}:distinct-identity-missing-or-generic`);
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
