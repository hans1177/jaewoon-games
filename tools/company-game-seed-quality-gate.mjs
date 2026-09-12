import fs from 'node:fs';
import {platformRepresentativeGaps,seedPlatform} from './game-seed-state.mjs';
import {categorySeedProfile,loadPlatformProfiles,normalizeSeedPlatform,representativeCategoriesForPlatform} from './game-seed-platform-profile.mjs';

const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const evidenceFile=process.env.GAME_SEED_MARKET_EVIDENCE_FILE||'game-seed-market-evidence.json';
const profileFile=process.env.GAME_SEED_PLATFORM_PROFILE_FILE||'game-seed-platform-profiles.json';
const directiveFile=process.env.COMPANY_DIRECTIVE_FILE||'company-directive.json';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];

for(const file of [stateFile,evidenceFile,profileFile,directiveFile])if(!fs.existsSync(file))throw new Error(`GAME_SEED_QUALITY_REQUIRED_FILE_MISSING ${file}`);
const state=read(stateFile),evidence=read(evidenceFile),directive=read(directiveFile),platformProfiles=loadPlatformProfiles(profileFile);
if(clean(evidence.targetMarketScope).toUpperCase()!=='GLOBAL')throw new Error('GAME_SEED_QUALITY_EVIDENCE_SCOPE_NOT_GLOBAL');
const active=(state.seeds||[]).filter(s=>clean(s.status).toUpperCase()==='ACTIVE');
if(!state.bootstrapCompletedAt)throw new Error('GAME_SEED_QUALITY_BOOTSTRAP_NOT_COMPLETE');

const primaryPlatform=normalizeSeedPlatform(directive.gameSeed?.initialTargetPlatform||directive.platformStrategy?.primaryPlatform||'ROBLOX')||'ROBLOX';
const representativeCategories=representativeCategoriesForPlatform(directive,primaryPlatform);
const representativeGaps=platformRepresentativeGaps(state,primaryPlatform,representativeCategories);
if(representativeCategories.length&&representativeGaps.length)throw new Error(`GAME_SEED_QUALITY_PLATFORM_SET_INCOMPLETE ${primaryPlatform}: ${representativeGaps.join(',')}`);

const genericIdentity=[/^mobile-first[, ]/i,/^mobile first[, ]/i,/^mobile-first$/i,/^rpg-focused$/i,/^casual[, ]/i];
const businessMeta=/increase user base|boost sales|drive engagement|content growth|optimi[sz]e overall performance/i;
const failures=[];
for(const seed of active){
  const platform=normalizeSeedPlatform(seedPlatform(seed)),category=clean(seed.GAME_CATEGORY),cfg=categorySeedProfile({platform,category,marketEvidence:evidence,platformProfiles});
  const prefix=`${platform||'UNKNOWN'}/${category}:${seed.seedId||seed.gameId||'unknown'}`;
  if(!cfg){failures.push(`${prefix}:category-profile-missing`);continue;}
  const allowed=new Set(uniq(cfg.benchmarkCandidates).map(norm)),refs=uniq(seed.REFERENCE_GAMES),invalidRefs=refs.filter(x=>!allowed.has(norm(x)));
  if(!refs.length)failures.push(`${prefix}:no-reference-game`);if(invalidRefs.length)failures.push(`${prefix}:reference-outside-category-pool=${invalidRefs.join('|')}`);

  const groups=Array.isArray(cfg.requiredConceptGroups)?cfg.requiredConceptGroups.filter(Array.isArray):[],minimumGroups=Math.max(1,Number(cfg.minimumRequiredConceptGroups||groups.length||1));
  if(!groups.length)failures.push(`${prefix}:required-concept-groups-missing`);
  const combined=[...(seed.CORE_FUN_TO_LEARN||[]),...(seed.CORE_LOOP||[]),seed.DISTINCT_IDENTITY].map(norm).join(' '),matchedGroups=groups.filter(group=>uniq(group).some(term=>combined.includes(norm(term))));
  if(matchedGroups.length<minimumGroups)failures.push(`${prefix}:category-concept-groups=${matchedGroups.length}/${minimumGroups}`);

  const loops=uniq(seed.CORE_LOOP),loopText=loops.map(norm).join(' '),loopMatchedGroups=groups.filter(group=>uniq(group).some(term=>loopText.includes(norm(term))));
  if(loops.length<3||loops.some(x=>x.length<70))failures.push(`${prefix}:core-loop-not-concrete`);if(loopMatchedGroups.length<minimumGroups)failures.push(`${prefix}:core-loop-concept-groups=${loopMatchedGroups.length}/${minimumGroups}`);if(loops.some(x=>businessMeta.test(x)))failures.push(`${prefix}:core-loop-business-meta-language`);

  const identity=clean(seed.DISTINCT_IDENTITY);if(identity.length<100||genericIdentity.some(re=>re.test(identity))||businessMeta.test(identity))failures.push(`${prefix}:distinct-identity-too-generic`);if(!/(original|distinct|reinterpret|독자|재해석)/i.test(identity))failures.push(`${prefix}:distinct-identity-reinterpretation-missing`);

  const market=seed.MARKET_EVIDENCE_SUMMARY||{};if(clean(market.targetMarketScope).toUpperCase()!=='GLOBAL')failures.push(`${prefix}:market-scope-not-global`);if(market.available!==true||!Array.isArray(market.references)||!market.references.length)failures.push(`${prefix}:market-evidence-not-used`);
  const sourcedMetrics=(market.references||[]).flatMap(r=>Array.isArray(r.metrics)?r.metrics:[]).filter(m=>m&&m.source&&m.observedAt&&m.value!=='UNKNOWN');if(!sourcedMetrics.length)failures.push(`${prefix}:no-sourced-market-metric`);
  if(!sourcedMetrics.some(m=>/age/i.test(clean(m.metric))))failures.push(`${prefix}:global-age-evidence-missing`);if(!sourcedMetrics.some(m=>/revenue|grossing/i.test(clean(m.metric))))failures.push(`${prefix}:global-revenue-evidence-missing`);if(!sourcedMetrics.some(m=>/session|playtime/i.test(clean(m.metric))))failures.push(`${prefix}:global-playtime-evidence-missing`);

  const audience=clean(seed.TARGET_AUDIENCE),session=clean(seed.TARGET_SESSION_DIRECTION);if(audience.length<20||/^(general gamers|young adults|casual gamers)$/i.test(audience))failures.push(`${prefix}:target-audience-too-generic`);if(!/global/i.test(audience))failures.push(`${prefix}:target-audience-not-global`);if(/\b(korea|korean|south korea)\b/i.test(audience))failures.push(`${prefix}:country-specific-default-audience`);if(session.length<20||!/global/i.test(session))failures.push(`${prefix}:target-session-not-global-or-too-generic`);
  if(!['ROBLOX','UNITY','FORTNITE_UEFN'].includes(platform))failures.push(`${prefix}:invalid-platform`);
}
if(failures.length){console.error('GAME_SEED_SEMANTIC_QUALITY=FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('GAME_SEED_SEMANTIC_QUALITY=PASS');
console.log(`GAME_SEED_ACTIVE_SEED_COUNT=${active.length}`);
console.log(`GAME_SEED_PRIMARY_PLATFORM=${primaryPlatform}`);
console.log(`GAME_SEED_PRIMARY_PLATFORM_REPRESENTATIVE_COUNT=${representativeCategories.length}`);
console.log('GAME_SEED_PRIMARY_PLATFORM_SET=COMPLETE');
console.log('GAME_SEED_TARGET_MARKET_SCOPE=GLOBAL');
console.log('GAME_SEED_CATEGORY_BENCHMARK_MATCH=PASS');
console.log('GAME_SEED_CATEGORY_CONCEPT_GROUPS=PASS');
console.log('GAME_SEED_CORE_LOOP_CONCEPT_GROUPS=PASS');
console.log('GAME_SEED_GLOBAL_AGE_REVENUE_PLAYTIME_EVIDENCE=PASS');
