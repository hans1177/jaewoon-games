import fs from 'node:fs';

const flowPath='COMPANY_FLOW.md';
const directivePath='company-directive.json';
const qaPath='qa/company-no-legacy-scoring-structure.test.mjs';

const flow=fs.readFileSync(flowPath,'utf8');
const legacyStart='  strictReview:\n';
const nextStart='  stageGateScoringV2:\n';
const start=flow.indexOf(legacyStart);
const end=flow.indexOf(nextStart,start);
if(start<0||end<0) throw new Error('LEGACY_STRICT_REVIEW_BLOCK_NOT_FOUND');
const preserved=`  strictHardGatePolicy:\n    scoreCannotOverrideHardGate: true\n    hardRejectCodes:\n      - DESIGN_MISMATCH\n      - STORY_INCOHERENT\n      - CORE_FUN_WEAK\n      - 30MIN_CONTENT_FAIL\n      - MULTIPLAYER_MISSING\n      - CATEGORY_MISMATCH\n      - IMPLEMENTATION_INCOMPLETE\n      - ARTBOOK_MISMATCH\n      - REPETITIVE_CONTENT\n      - GENERIC_TEMPLATE\n      - TARGET_PLATFORM_UX_FAIL\n      - FATAL_RUNTIME_BUG\n      - QA_EVIDENCE_MISSING\n    rejectHandling:\n      correctable: FIX_EXISTING_CANDIDATE_AND_REVALIDATE\n      structural: REMOVE_TEST_CANDIDATE_AND_REBUILD_FROM_APPROVED_DESIGN\n      automaticDropOnFirstFailureForbidden: true\n`;
let nextFlow=flow.slice(0,start)+preserved+flow.slice(end);
nextFlow=nextFlow.replace('    supersedesGenericStrictReviewWeightsForWebImplementation: true\n','');
fs.writeFileSync(flowPath,nextFlow);

const directive=JSON.parse(fs.readFileSync(directivePath,'utf8'));
directive.revision=Number(directive.revision||0)+1;
directive.updatedAt='2026-09-17';
if(directive.homepageOperations?.developmentProgressDisplay){
  delete directive.homepageOperations.developmentProgressDisplay.scoreRequiresSchema13;
}
delete directive.strictReview;
if(directive.production?.strictReview) delete directive.production.strictReview;
if(directive.review?.strictReview) delete directive.review.strictReview;
fs.writeFileSync(directivePath,JSON.stringify(directive,null,2)+'\n');

const qa=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst flow=fs.readFileSync('COMPANY_FLOW.md','utf8');\nconst directive=fs.readFileSync('company-directive.json','utf8');\nconst web=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');\n\ntest('legacy scoring structures are absent',()=>{\n  assert.equal(/\\n  strictReview:\\n/.test(flow),false);\n  assert.equal(flow.includes('commonScoreMax: 60'),false);\n  assert.equal(flow.includes('categoryScoreMax: 40'),false);\n  assert.equal(flow.includes('supersedesGenericStrictReviewWeightsForWebImplementation'),false);\n  assert.equal(directive.includes('scoreRequiresSchema13'),false);\n  assert.equal(directive.includes('\\"strictReview\\"'),false);\n  assert.equal(web.includes('WEB_VALIDATION_SCHEMA_VERSION=13'),false);\n  assert.equal(web.includes('WEB_VALIDATION_SCHEMA_VERSION=14'),false);\n  assert.equal(web.includes('CORE_GAME_LOOP:15,SYSTEM_CONNECTIVITY:10'),false);\n});\n\ntest('new scoring structure remains canonical',()=>{\n  assert.match(flow,/COMMON_GAME_QUALITY: 55/);\n  assert.match(flow,/CATEGORY_SPECIFIC_QUALITY: 25/);\n  assert.match(flow,/WEB_PLATFORM_QUALITY: 20/);\n  assert.match(flow,/strictHardGatePolicy:/);\n  assert.match(directive,/scoreRequiresSchema15/);\n  assert.match(web,/WEB_VALIDATION_SCHEMA_VERSION=15/);\n  assert.match(web,/WEB_PLATFORM_SCORE_WEIGHTS/);\n});\n`;
fs.writeFileSync(qaPath,qa);
console.log('LEGACY_SCORING_STRUCTURE_REMOVED=YES');
