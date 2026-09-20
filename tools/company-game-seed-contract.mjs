import fs from 'node:fs';
import path from 'node:path';

export const GAME_SEED_ADVISORY_FIELDS=Object.freeze([
  'GAME_CATEGORY','REFERENCE_INPUTS','CORE_FUN_TO_LEARN','CORE_LOOP','DISTINCT_IDENTITY',
  'GAMEPLAY_SKETCH','MARKET_EVIDENCE_SUMMARY','TARGET_AUDIENCE','TARGET_SESSION_DIRECTION',
  'TARGET_SESSION_MINUTES','INITIAL_TARGET_PLATFORM','INITIAL_PLAY_MODE',
  'MULTIPLAYER_DESIGN_MODE','CROSS_PLATFORM_EXPANSION_VALUE'
]);
export const GAME_SEED_REQUIRED_FIELDS=Object.freeze([]);

export const GAME_SEED_POLICY=Object.freeze({
  policyDocument:'company-learning/platform-release-roadmap.json',
  stage:'OPTIONAL_PRE_DESIGN_GUIDANCE',
  guidanceOnly:true,
  requiredBeforeDesignerDraft:false,
  creativeConstraints:'NONE',
  selectionMode:'VIBE_SELF_COMPOSITION_GUIDANCE_ONLY',
  seedMaterialPoolTarget:null,
  seedMaterialStarterReferenceCount:100,
  seedMaterialCombineMin:null,
  seedMaterialCombineMax:null,
  suggestedSeedMaterialCombineRange:Object.freeze([2,4]),
  materialMustBeExistingGame:false,
  materialUseOptional:true,
  vibeMayUseZeroOneOrAnyMaterialCount:true,
  vibeMayInventNewMaterials:true,
  vibeMayIgnoreSeedGuidance:true,
  transformationModes:Object.freeze(['HOMAGE','REINTERPRETATION','ORIGINAL_COMPOSITION']),
  transformationModesAreExamplesOnly:true,
  initialTargetPlatform:'ROBLOX',
  allowedTargetPlatforms:Object.freeze(['ROBLOX','UNITY','FORTNITE_UEFN']),
  projectMaySelectAnyAllowedPlatform:true,
  primaryPlatformIsDefaultNotLock:true,
  initialPlayMode:'PROJECT_DEFINED',
  multiplayerModes:Object.freeze(['SINGLE','COOP','COMPETITIVE','HYBRID']),
  multiplayerModesAreExamplesOnly:true,
  targetSessionMinutes:null,
  suggestedTargetSessionMinutes:30,
  gameplaySketchRequired:false,
  marketEvidenceHardPassFailGate:false,
  directCopyForbidden:true,
  hardGateScope:Object.freeze(['SECURITY','LEGAL_COPY_PROTECTION','EVIDENCE_INTEGRITY'])
});

const clean=v=>String(v??'').trim();
const numericLike=value=>typeof value==='number'||(/\d/.test(clean(value))&&clean(value).toUpperCase()!=='UNKNOWN');
function validateNumericClaims(summary,errors){
  if(!summary||typeof summary!=='object'||Array.isArray(summary))return;
  const claims=[];
  if(Array.isArray(summary.numericClaims))claims.push(...summary.numericClaims);
  for(const ref of Array.isArray(summary.references)?summary.references:[])for(const metric of Array.isArray(ref?.metrics)?ref.metrics:[])claims.push(metric);
  for(let i=0;i<claims.length;i++){
    const claim=claims[i]; if(!claim||typeof claim!=='object'||!numericLike(claim.value))continue;
    if(!clean(claim.source))errors.push(`numeric claim[${i}] source is required`);
    if(!clean(claim.observedAt))errors.push(`numeric claim[${i}] observedAt is required`);
  }
}
export function validateGameSeed(input){
  const errors=[],advisories=[];
  if(!input||typeof input!=='object'||Array.isArray(input))return{pass:false,errors:['GAME_SEED must be an object when supplied'],advisories};
  if(input.DIRECT_COPY===true||input.COPY_SOURCE_CODE===true||input.COPY_ASSETS===true)errors.push('direct copying of source code or protected expression/assets is forbidden');
  validateNumericClaims(input.MARKET_EVIDENCE_SUMMARY,errors);
  for(const field of GAME_SEED_ADVISORY_FIELDS){
    const v=input[field],present=Array.isArray(v)?v.length>0:v!==null&&v!==undefined&&clean(v)!=='';
    if(!present)advisories.push(`${field}:optional-guidance-missing`);
  }
  if(Array.isArray(input.SEED_MATERIAL_IDS))advisories.push(`SEED_MATERIAL_IDS:count=${input.SEED_MATERIAL_IDS.length}:NO_LIMIT`);
  if(Number.isFinite(Number(input.TARGET_SESSION_MINUTES)))advisories.push(`TARGET_SESSION_MINUTES:${Number(input.TARGET_SESSION_MINUTES)}:NO_FIXED_LIMIT`);
  return{pass:errors.length===0,errors,advisories};
}
export function assertGameSeed(seed){
  const result=validateGameSeed(seed);
  if(!result.pass)throw new Error(`GAME_SEED_INTEGRITY_FAILED\n- ${result.errors.join('\n- ')}`);
  return seed;
}
export function readAndAssertGameSeed(file){
  const seed=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));assertGameSeed(seed);return seed;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const file=process.argv[2];if(!file){console.error('Usage: node tools/company-game-seed-contract.mjs <game-seed.json>');process.exit(2);}
  try{const seed=readAndAssertGameSeed(file);const result=validateGameSeed(seed);console.log('GAME_SEED_CONTRACT=PASS');console.log('GAME_SEED_GUIDANCE_ONLY=YES');console.log('GAME_SEED_CREATIVE_CONSTRAINTS=NONE');console.log('GAME_SEED_REQUIRED_BEFORE_DESIGN=NO');console.log('GAME_SEED_MATERIAL_COUNT_LIMIT=NONE');console.log('GAME_SEED_SESSION_DURATION_LIMIT=NONE');console.log(`GAME_SEED_ADVISORY_COUNT=${result.advisories.length}`);}catch(error){console.error(String(error?.message||error));process.exit(1);}
}
