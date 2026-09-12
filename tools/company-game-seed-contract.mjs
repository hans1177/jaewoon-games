import fs from 'node:fs';
import path from 'node:path';

export const GAME_SEED_REQUIRED_FIELDS = Object.freeze([
  'GAME_CATEGORY',
  'REFERENCE_GAMES',
  'CORE_FUN_TO_LEARN',
  'CORE_LOOP',
  'DISTINCT_IDENTITY',
  'MARKET_EVIDENCE_SUMMARY',
  'TARGET_AUDIENCE',
  'TARGET_SESSION_DIRECTION',
  'INITIAL_TARGET_PLATFORM',
  'INITIAL_PLAY_MODE',
  'CROSS_PLATFORM_EXPANSION_VALUE'
]);

export const GAME_SEED_POLICY = Object.freeze({
  policyDocument: 'COMPANY_FLOW.md',
  stage: 'BEFORE_GAME_DESIGNER_DRAFT',
  selectionMode: 'FAMOUS_SUCCESSFUL_GAME_COPY_BENCHMARK',
  transformationModes: Object.freeze(['HOMAGE', 'REINTERPRETATION']),
  initialTargetPlatform: 'ROBLOX',
  allowedTargetPlatforms: Object.freeze(['ROBLOX', 'UNITY', 'FORTNITE_UEFN']),
  projectMaySelectAnyAllowedPlatform: true,
  primaryPlatformIsDefaultNotLock: true,
  initialPlayMode: 'PROJECT_DEFINED',
  numericMarketClaimRequiresSource: true,
  numericMarketClaimRequiresObservedAt: true,
  marketEvidenceHardPassFailGate: false
});

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;
const isNonEmptyArray = value => Array.isArray(value) && value.length > 0;
const hasMeaningfulValue = value => {
  if (isNonEmptyString(value)) return true;
  if (isNonEmptyArray(value)) return true;
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.keys(value).length > 0;
  return false;
};

function validateMarketNumericClaims(summary, errors) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return;
  const claims = Array.isArray(summary.numericClaims) ? summary.numericClaims : [];
  for (let i = 0; i < claims.length; i += 1) {
    const claim = claims[i];
    if (!claim || typeof claim !== 'object') {
      errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}] must be an object`);
      continue;
    }
    if (!hasMeaningfulValue(claim.value)) {
      errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].value is required`);
    }
    if (!isNonEmptyString(claim.source)) {
      errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].source is required for numeric claims`);
    }
    if (!isNonEmptyString(claim.observedAt)) {
      errors.push(`MARKET_EVIDENCE_SUMMARY.numericClaims[${i}].observedAt is required for numeric claims`);
    }
  }
}

export function validateGameSeed(seed) {
  const errors = [];
  if (!seed || typeof seed !== 'object' || Array.isArray(seed)) {
    return { pass: false, errors: ['GAME_SEED must be a JSON object'] };
  }

  for (const field of GAME_SEED_REQUIRED_FIELDS) {
    if (!hasMeaningfulValue(seed[field])) errors.push(`${field} is required`);
  }

  if (seed.REFERENCE_GAMES !== undefined && !isNonEmptyArray(seed.REFERENCE_GAMES)) {
    errors.push('REFERENCE_GAMES must contain at least one released successful reference game');
  }

  if (seed.INITIAL_TARGET_PLATFORM !== undefined) {
    const platform = String(seed.INITIAL_TARGET_PLATFORM).trim().toUpperCase();
    if (!GAME_SEED_POLICY.allowedTargetPlatforms.includes(platform)) {
      errors.push(`INITIAL_TARGET_PLATFORM must be one of ${GAME_SEED_POLICY.allowedTargetPlatforms.join(', ')}`);
    }
  }

  if (seed.INITIAL_PLAY_MODE !== undefined && !isNonEmptyString(seed.INITIAL_PLAY_MODE)) {
    errors.push('INITIAL_PLAY_MODE must be project-defined and non-empty');
  }

  validateMarketNumericClaims(seed.MARKET_EVIDENCE_SUMMARY, errors);

  if (seed.DIRECT_COPY === true || seed.COPY_SOURCE_CODE === true || seed.COPY_ASSETS === true) {
    errors.push('direct copying of source code or protected expression/assets is forbidden');
  }

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
  if (!file) {
    console.error('Usage: node tools/company-game-seed-contract.mjs <game-seed.json>');
    process.exit(2);
  }
  try {
    readAndAssertGameSeed(file);
    console.log('GAME_SEED_CONTRACT=PASS');
    console.log(`POLICY_DOCUMENT=${GAME_SEED_POLICY.policyDocument}`);
    console.log(`GAME_SEED_STAGE=${GAME_SEED_POLICY.stage}`);
  } catch (error) {
    console.error(String(error?.message || error));
    process.exit(1);
  }
}
