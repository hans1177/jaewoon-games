import fs from 'node:fs';
import {assertGameSeed} from './company-game-seed-contract.mjs';
import {seedPlatform} from './game-seed-state.mjs';
import {categorySeedProfile,loadPlatformProfiles,normalizeSeedPlatform} from './game-seed-platform-profile.mjs';

const stateFile=process.env.GAME_SEED_STATE_FILE||'game-seed-state.json';
const evidenceFile=process.env.GAME_SEED_MARKET_EVIDENCE_FILE||'game-seed-market-evidence.json';
const profileFile=process.env.GAME_SEED_PLATFORM_PROFILE_FILE||'game-seed-platform-profiles.json';
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(clean).filter(Boolean))];
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));

if(!fs.existsSync(stateFile))throw new Error('GAME_SEED_NORMALIZE_STATE_MISSING');
if(!fs.existsSync(evidenceFile))throw new Error('GAME_SEED_NORMALIZE_EVIDENCE_MISSING');
const state=read(stateFile),evidence=read(evidenceFile),platformProfiles=loadPlatformProfiles(profileFile);
if(clean(evidence.targetMarketScope).toUpperCase()!=='GLOBAL')throw new Error('GAME_SEED_NORMALIZE_REQUIRES_GLOBAL_EVIDENCE');

const categoryLabel=category=>clean(category).toLowerCase().replaceAll('_',' ');
const platformLabel=platform=>platform==='ROBLOX'?'Roblox':platform==='UNITY'?'Unity':platform==='FORTNITE_UEFN'?'Fortnite UEFN':platform;
const matchesGroup=(text,group)=>uniq(group).some(term=>text.includes(norm(term)));
const businessMeta=/increase user base|boost sales|drive engagement|content growth|optimi[sz]e overall performance/i;

function commonGlobalReferences(){
  const out=[];
  for(const src of Array.isArray(evidence.globalSources)?evidence.globalSources:[]){
    if(!src||typeof src!=='object')continue;
    const title=clean(src.name),source=clean(src.source),observedAt=clean(src.observedAt);if(!title||!source||!observedAt||!src.metrics||typeof src.metrics!=='object')continue;
    const metrics=[];for(const [metric,value] of Object.entries(src.metrics)){if(!/(age|player|mobile|revenue|session|playtime|download)/i.test(metric))continue;metrics.push({metric,value,source,observedAt,note:null,numericClaimAccepted:true});}
    if(metrics.length)out.push({title,metrics,qualitative:null});
  }
  return out;
}
const globalRefs=commonGlobalReferences();
const globalAverageAge=globalRefs.flatMap(r=>r.metrics||[]).find(m=>m.metric==='globalAveragePlayerAge')?.value;

function normalizeSeed(seed){
  const platform=normalizeSeedPlatform(seedPlatform(seed)||seed.INITIAL_TARGET_PLATFORM||'ROBLOX'),category=clean(seed.GAME_CATEGORY);
  const cfg=categorySeedProfile({platform,category,marketEvidence:evidence,platformProfiles});
  if(!cfg)throw new Error(`GAME_SEED_NORMALIZE_CATEGORY_PROFILE_MISSING ${platform}/${category}`);

  const allowedMap=new Map(uniq(cfg.benchmarkCandidates).map(name=>[norm(name),name]));
  let refs=uniq(seed.REFERENCE_GAMES).map(name=>allowedMap.get(norm(name))).filter(Boolean);if(!refs.length)refs=uniq(cfg.benchmarkCandidates).slice(0,2);seed.REFERENCE_GAMES=refs.slice(0,4);
  const groups=Array.isArray(cfg.requiredConceptGroups)?cfg.requiredConceptGroups.filter(Array.isArray):[],minimumGroups=Math.max(1,Number(cfg.minimumRequiredConceptGroups||groups.length||1));
  if(groups.length<minimumGroups)throw new Error(`GAME_SEED_NORMALIZE_CONCEPT_GROUPS_MISSING ${platform}/${category}`);
  const minimumLoop=uniq(cfg.minimumCoreLoop);if(minimumLoop.length<3)throw new Error(`GAME_SEED_NORMALIZE_MINIMUM_LOOP_MISSING ${platform}/${category}`);seed.CORE_LOOP=minimumLoop.slice(0,8);

  const coreFun=uniq(seed.CORE_FUN_TO_LEARN).filter(item=>!businessMeta.test(item));let semanticText=[...coreFun,...seed.CORE_LOOP].map(norm).join(' ');
  for(const group of groups){if(matchesGroup(semanticText,group))continue;const canonical=clean(group[0]);if(canonical)coreFun.push(`${canonical} pattern learned from proven ${platformLabel(platform)} ${categoryLabel(category)} benchmarks and reimplemented with original systems`);semanticText=[...coreFun,...seed.CORE_LOOP].map(norm).join(' ');}
  seed.CORE_FUN_TO_LEARN=uniq(coreFun).slice(0,6);

  const originalIdentity=clean(seed.DISTINCT_IDENTITY),usableOriginal=originalIdentity.length>=20&&!businessMeta.test(originalIdentity)?originalIdentity.slice(0,500):'';
  const platformDirection=platform==='ROBLOX'?'mobile-first controls, server-authoritative multiplayer boundaries when applicable, persistent progression and Roblox-native session flow':platform==='UNITY'?'selected-device controls, performance-aware presentation and platform-appropriate session flow':'UEFN-native interaction, Verse-driven systems and session flow';
  const baseIdentity=`${clean(seed.gameName)||'This game'} is an original global ${platformLabel(platform)} ${categoryLabel(category)} experience that reinterprets the structural lessons of ${seed.REFERENCE_GAMES.slice(0,2).join(' and ')} through a distinct world, visual identity, progression mix, ${platformDirection}.`;
  seed.DISTINCT_IDENTITY=usableOriginal?`${baseIdentity} Specific reinterpretation direction: ${usableOriginal}`:baseIdentity;

  const market=seed.MARKET_EVIDENCE_SUMMARY&&typeof seed.MARKET_EVIDENCE_SUMMARY==='object'?seed.MARKET_EVIDENCE_SUMMARY:{},currentRefs=Array.isArray(market.references)?market.references:[],byTitle=new Map();
  for(const ref of [...currentRefs,...globalRefs]){const title=clean(ref?.title);if(title&&!byTitle.has(norm(title)))byTitle.set(norm(title),ref);}
  seed.MARKET_EVIDENCE_SUMMARY={...market,role:'TARGET_DESIGN_REFERENCE',targetMarketScope:'GLOBAL',countrySpecificEvidenceRole:'SECONDARY_CONTEXT_ONLY',hardPassFailGate:false,missingDataDoesNotRejectSeed:true,marketDataAloneCannotDiscard:true,available:byTitle.size>0,sourceFile:evidenceFile,platformProfileFile:profileFile,references:[...byTitle.values()]};

  const ageReference=globalAverageAge?` Global cross-platform evidence records an average player age of ${globalAverageAge} as context, not as an age restriction.`:'';
  seed.TARGET_AUDIENCE=`Global ${platformLabel(platform)} players across age groups who are interested in ${categoryLabel(category)} gameplay.${ageReference}`;
  seed.TARGET_SESSION_DIRECTION=`Use sourced global engagement evidence as a directional reference while keeping the ${categoryLabel(category)} core loop readable for ${platformLabel(platform)} sessions and preserving long-term progression between sessions.`;
  seed.INITIAL_TARGET_PLATFORM=platform;if(!clean(seed.INITIAL_PLAY_MODE))seed.INITIAL_PLAY_MODE='PROJECT_DEFINED';
  if(!clean(seed.CROSS_PLATFORM_EXPANSION_VALUE))seed.CROSS_PLATFORM_EXPANSION_VALUE='UNKNOWN_UNTIL_PLATFORM_EXPANSION_REVIEW';
  if(!clean(seed.COMMERCIAL_RULE)||seed.COMMERCIAL_RULE==='MUST_WORK_WITHOUT_MULTIPLAYER')seed.COMMERCIAL_RULE='MUST_BE_MONETIZABLE_ON_SELECTED_PLATFORM';
  assertGameSeed(seed);return seed;
}

const candidates=(state.seeds||[]).filter(seed=>clean(seed.status).toUpperCase()==='ACTIVE');
if(!candidates.length)throw new Error('GAME_SEED_NORMALIZE_NO_ACTIVE_SEEDS');
for(const seed of candidates)normalizeSeed(seed);
fs.writeFileSync(stateFile,`${JSON.stringify(state,null,2)}\n`);
console.log('GAME_SEED_SEMANTIC_NORMALIZE=PASS');
console.log(`GAME_SEED_SEMANTIC_NORMALIZED_COUNT=${candidates.length}`);
console.log('GAME_SEED_CORE_LOOP_CONCRETE=PASS');
console.log('GAME_SEED_TARGET_MARKET_SCOPE=GLOBAL');
console.log('GAME_SEED_PLATFORM_PROFILE_NORMALIZE=PASS');
