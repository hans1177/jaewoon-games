import fs from 'node:fs';

const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const evidenceFile=process.env.GAME_SEED_MARKET_EVIDENCE_FILE||'game-seed-market-evidence.json';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];

if(!fs.existsSync(stateFile))throw new Error('GAME_SEED_QUALITY_STATE_MISSING');
if(!fs.existsSync(evidenceFile))throw new Error('GAME_SEED_QUALITY_MARKET_EVIDENCE_MISSING');
const state=read(stateFile);
const evidence=read(evidenceFile);
if(clean(evidence.targetMarketScope).toUpperCase()!=='GLOBAL')throw new Error('GAME_SEED_QUALITY_EVIDENCE_SCOPE_NOT_GLOBAL');
const categories=Object.keys(evidence.categories||{});
const active=(state.seeds||[]).filter(s=>clean(s.status).toUpperCase()==='ACTIVE');
if(!state.bootstrapCompletedAt)throw new Error('GAME_SEED_QUALITY_BOOTSTRAP_NOT_COMPLETE');
if(active.length<categories.length)throw new Error(`GAME_SEED_QUALITY_ACTIVE_COUNT_TOO_SMALL ${active.length}/${categories.length}`);

const genericIdentity=[/^mobile-first[, ]/i,/^mobile first[, ]/i,/^mobile-first$/i,/^rpg-focused$/i,/^casual[, ]/i];
const failures=[];
for(const category of categories){
  const cfg=evidence.categories[category]||{};
  const seeds=active.filter(s=>s.GAME_CATEGORY===category);
  if(!seeds.length){failures.push(`${category}:no-active-seed`);continue;}
  for(const seed of seeds){
    const prefix=`${category}:${seed.seedId||seed.gameId||'unknown'}`;
    const allowed=new Set(uniq(cfg.benchmarkCandidates).map(norm));
    const refs=uniq(seed.REFERENCE_GAMES);
    const invalidRefs=refs.filter(x=>!allowed.has(norm(x)));
    if(!refs.length)failures.push(`${prefix}:no-reference-game`);
    if(invalidRefs.length)failures.push(`${prefix}:reference-outside-category-pool=${invalidRefs.join('|')}`);
    const combined=[...(seed.CORE_FUN_TO_LEARN||[]),...(seed.CORE_LOOP||[]),seed.DISTINCT_IDENTITY].map(norm).join(' ');
    const terms=uniq(cfg.requiredConceptTerms).filter(term=>combined.includes(norm(term)));
    if(terms.length<2)failures.push(`${prefix}:category-concept-match=${terms.length}/2`);
    const identity=clean(seed.DISTINCT_IDENTITY);
    if(identity.length<60||genericIdentity.some(re=>re.test(identity)))failures.push(`${prefix}:distinct-identity-too-generic`);
    const loops=uniq(seed.CORE_LOOP);
    if(loops.length<3||loops.some(x=>x.length<20))failures.push(`${prefix}:core-loop-not-concrete`);
    const market=seed.MARKET_EVIDENCE_SUMMARY||{};
    if(clean(market.targetMarketScope).toUpperCase()!=='GLOBAL')failures.push(`${prefix}:market-scope-not-global`);
    if(market.available!==true||!Array.isArray(market.references)||!market.references.length)failures.push(`${prefix}:market-evidence-not-used`);
    const sourcedMetrics=market.references.flatMap(r=>Array.isArray(r.metrics)?r.metrics:[]).filter(m=>m&&m.source&&m.observedAt&&m.value!=='UNKNOWN');
    if(!sourcedMetrics.length)failures.push(`${prefix}:no-sourced-market-metric`);
    const audience=clean(seed.TARGET_AUDIENCE);
    const session=clean(seed.TARGET_SESSION_DIRECTION);
    if(audience.length<20||/^(general gamers|young adults|casual gamers)$/i.test(audience))failures.push(`${prefix}:target-audience-too-generic`);
    if(/\b(korea|korean|south korea)\b/i.test(audience))failures.push(`${prefix}:country-specific-default-audience`);
    if(session.length<20)failures.push(`${prefix}:target-session-too-generic`);
  }
}
if(failures.length){
  console.error('GAME_SEED_SEMANTIC_QUALITY=FAIL');
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('GAME_SEED_SEMANTIC_QUALITY=PASS');
console.log(`GAME_SEED_SEMANTIC_CATEGORY_COUNT=${categories.length}`);
console.log(`GAME_SEED_ACTIVE_SEED_COUNT=${active.length}`);
console.log('GAME_SEED_TARGET_MARKET_SCOPE=GLOBAL');
console.log('GAME_SEED_CATEGORY_BENCHMARK_MATCH=PASS');
console.log('GAME_SEED_MARKET_EVIDENCE_USAGE=PASS');
