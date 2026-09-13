import fs from 'node:fs';
import path from 'node:path';

export const GAME_SEED_REQUIRED_FIELDS = Object.freeze([
  'GAME_CATEGORY',
  'REFERENCE_INPUTS',
  'CORE_FUN_TO_LEARN',
  'CORE_LOOP',
  'DISTINCT_IDENTITY',
  'MARKET_EVIDENCE_SUMMARY',
  'TARGET_AUDIENCE',
  'TARGET_SESSION_DIRECTION',
  'TARGET_SESSION_MINUTES',
  'INITIAL_TARGET_PLATFORM',
  'INITIAL_PLAY_MODE',
  'MULTIPLAYER_DESIGN_MODE',
  'CROSS_PLATFORM_EXPANSION_VALUE'
]);

export const GAME_SEED_POLICY = Object.freeze({
  policyDocument: 'COMPANY_FLOW.md',
  stage: 'BEFORE_GAME_DESIGNER_DRAFT',
  selectionMode: 'MIXED_SEED_MATERIAL_COMPOSITION',
  seedMaterialPoolTarget: 100,
  seedMaterialCombineMin: 2,
  seedMaterialCombineMax: 4,
  materialMustBeExistingGame: false,
  transformationModes: Object.freeze(['HOMAGE', 'REINTERPRETATION', 'ORIGINAL_COMPOSITION']),
  initialTargetPlatform: 'ROBLOX',
  allowedTargetPlatforms: Object.freeze(['ROBLOX', 'UNITY', 'FORTNITE_UEFN']),
  projectMaySelectAnyAllowedPlatform: true,
  primaryPlatformIsDefaultNotLock: true,
  initialPlayMode: 'PROJECT_DEFINED',
  multiplayerModes: Object.freeze(['SINGLE','COOP','COMPETITIVE','HYBRID']),
  targetSessionMinutes: 60,
  numericMarketClaimRequiresSource: true,
  numericMarketClaimRequiresObservedAt: true,
  marketEvidenceHardPassFailGate: false
});

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;
const isNonEmptyArray = value => Array.isArray(value) && value.length > 0;
const hasMeaningfulValue = value => {
  if (isNonEmptyString(value)) return true;
  if (isNonEmptyArray(value)) return true;
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.keys(value).length > 0;
  return false;
};

function normalizeCompatibility(seed){
  if(!seed||typeof seed!=='object'||Array.isArray(seed))return seed;
  if(!isNonEmptyArray(seed.REFERENCE_INPUTS)){
    const games=Array.isArray(seed.REFERENCE_GAMES)?seed.REFERENCE_GAMES.filter(Boolean):[];
    seed.REFERENCE_INPUTS=games.length?games.map(value=>({type:'GAME_REFERENCE',value:String(value)})):[{type:'ORIGINAL_MATERIAL',value:'legacy seed material'}];
  }
  if(!Number.isFinite(Number(seed.TARGET_SESSION_MINUTES)))seed.TARGET_SESSION_MINUTES=60;
  if(!isNonEmptyString(seed.MULTIPLAYER_DESIGN_MODE)){
    const mode=String(seed.INITIAL_PLAY_MODE||'').toUpperCase();
    seed.MULTIPLAYER_DESIGN_MODE=mode.includes('MULTI')?'HYBRID':'SINGLE';
  }
  return seed;
}

function validateMarketNumericClaims(summary, errors) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return;
  const claims = Array.isArray(summary.numericClaims) ? summary.numericClaims : [];
  for (let i = 0; i < claims.length; i += 1) {
    const claim = claims[i];
    if (!claim || typeof claim !== 'object') {
      errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}] must be an object`);
      continue;
    }
    if (!hasMeaningfulValue(claim.value)) errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].value is required`);
    if (!isNonEmptyString(claim.source)) errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].source is required for numeric claims`);
    if (!isNonEmptyString(claim.observedAt)) errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].observedAt is required for numeric claims`);
  }
}

export function validateGameSeed(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { pass: false, errors: ['GAME_SEED must be a JSON object'] };
  const seed=normalizeCompatibility(input);

  for (const field of GAME_SEED_REQUIRED_FIELDS) if (!hasMeaningfulValue(seed[field])) errors.push(`${field} is required`);

  if (!isNonEmptyArray(seed.REFERENCE_INPUTS)) errors.push('REFERENCE_INPUTS must contain at least one game/non-game/original material reference');
  if(seed.SEED_MATERIAL_IDS!==undefined){
    if(!Array.isArray(seed.SEED_MATERIAL_IDS)||seed.SEED_MATERIAL_IDS.length<2||seed.SEED_MATERIAL_IDS.length>4)errors.push('SEED_MATERIAL_IDS must contain 2 to 4 material ids');
  }
  if(Number(seed.TARGET_SESSION_MINUTES)!==60)errors.push('TARGET_SESSION_MINUTES must be exactly 60');
  if(!GAME_SEED_POLICY.multiplayerModes.includes(String(seed.MULTIPLAYER_DESIGN_MODE||'').toUpperCase()))errors.push(`MULTIPLAYER_DESIGN_MODE must be one of ${GAME_SEED_POLICY.multiplayerModes.join(', ')}`);

  if (seed.INITIAL_TARGET_PLATFORM !== undefined) {
    const platform = String(seed.INITIAL_TARGET_PLATFORM).trim().toUpperCase();
    if (!GAME_SEED_POLICY.allowedTargetPlatforms.includes(platform)) errors.push(`INITIAL_TARGET_PLATFORM must be one of ${GAME_SEED_POLICY.allowedTargetPlatforms.join(', ')}`);
  }
  if (seed.INITIAL_PLAY_MODE !== undefined && !isNonEmptyString(seed.INITIAL_PLAY_MODE)) errors.push('INITIAL_PLAY_MODE must be project-defined and non-empty');

  validateMarketNumericClaims(seed.MARKET_EVIDENCE_SUMMARY, errors);
  if (seed.DIRECT_COPY === true || seed.COPY_SOURCE_CODE === true || seed.COPY_ASSETS === true) errors.push('direct copying of source code or protected expression/assets is forbidden');

  return { pass: errors.length === 0, errors };
}

export function assertGameSeed(seed) {
  const result = validateGameSeed(seed);
  if (!result.pass) throw new Error(`GAME_SEED_CONTRACT_FAILED\n- ${result.errors.join('\n- ')}`);
  return seed;
}

export function readAndAssertGameSeed(file) {
  const absolute = path.resolve(file);
  const seed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  assertGameSeed(seed);
  return seed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {console.error('Usage: node tools/company-game-seed-contract.mjs <game-seed.json>');process.exit(2);}
  try {
    readAndAssertGameSeed(file);
    console.log('GAME_SEED_CONTRACT=PASS');
    console.log(`POLICY_DOCUMENT=${GAME_SEED_POLICY.policyDocument}`);
    console.log(`GAME_SEED_STAGE=${GAME_SEED_POLICY.stage}`);
    console.log(`SEED_MATERIAL_POOL_TARGET=${GAME_SEED_POLICY.seedMaterialPoolTarget}`);
    console.log(`TARGET_SESSION_MINUTES=${GAME_SEED_POLICY.targetSessionMinutes}`);
  } catch (error) {console.error(String(error?.message || error));process.exit(1);}
}
