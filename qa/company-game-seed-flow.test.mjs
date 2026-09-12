import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  normalizeSeedState,
  createSeedVacancy,
  createPortfolioSeedRequest,
  pendingPortfolioSeedRequests,
  evaluatePortfolioDepartmentScores,
  portfolioDecisionBand,
} from '../tools/game-seed-state.mjs';

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const bootstrap=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
const semanticNormalize=fs.readFileSync('tools/company-game-seed-semantic-normalize.mjs','utf8');
const qualityGate=fs.readFileSync('tools/company-game-seed-quality-gate.mjs','utf8');
const seedWorkflow=fs.readFileSync('.github/workflows/company-game-seed-bootstrap.yml','utf8');
const seedDesignWorkflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const statusWorkflow=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const devDisposition=fs.readFileSync('tools/company-development-disposition-gate.mjs','utf8');

const scores=value=>({planning:value,graphics:value,development:value,qa:value,balance:value});

test('central mirror defines dynamic portfolio governance and historical six-seed bootstrap only',()=>{
  assert.equal(directive.policyDocument,'COMPANY_FLOW.md');
  assert.equal(directive.portfolioGovernance.mode,'FIVE_DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO');
  assert.equal(directive.portfolioGovernance.fixedGameSlots,false);
  assert.equal(directive.portfolioGovernance.oneForOneReplacementRule,false);
  assert.equal(directive.portfolioGovernance.departmentScoresRequiredForPortfolioDecision,true);
  assert.deepEqual(directive.portfolioGovernance.departments,['planning','graphics','development','qa','balance']);
  assert.equal(directive.gameSeed.bootstrap.mode,'HISTORICAL_SINGLE_BOOTSTRAP_BATCH');
  assert.equal(directive.gameSeed.bootstrap.count,6);
  assert.equal(directive.gameSeed.bootstrap.historicalInitialSeedBatchOnly,true);
  assert.equal(directive.gameSeed.bootstrap.productionQuota,false);
  assert.equal(directive.gameSeed.bootstrap.categoriesAreReferenceSetNotSlotQuota,true);
  assert.equal(directive.gameSeed.replenishment.mode,'DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO');
  assert.equal(directive.gameSeed.replenishment.oneForOneOnly,false);
  assert.equal(directive.gameSeed.replenishment.automaticGrowthBeyondVacanciesForbidden,false);
  assert.equal(directive.gameSeed.replenishment.expansionOrReductionUsesDepartmentScoresAndEvidence,true);
  assert.equal(directive.gameSeed.marketEvidence.hardPassFailGate,false);
  assert.equal(directive.gameSeed.marketEvidence.missingDataDoesNotRejectSeed,true);
  assert.equal(directive.gameSeed.marketEvidence.marketDataAloneCannotDiscard,true);
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(directive.gameSeed.projectMaySelectAnyAllowedPlatform,true);
  assert.equal(directive.gameSeed.initialPlayMode,'PROJECT_DEFINED');
});

test('five department scores drive expansion bands exactly as central policy defines',()=>{
  assert.equal(portfolioDecisionBand(100),'EXPAND');
  assert.equal(portfolioDecisionBand(80),'EXPAND');
  assert.equal(portfolioDecisionBand(79),'MAINTAIN');
  assert.equal(portfolioDecisionBand(60),'MAINTAIN');
  assert.equal(portfolioDecisionBand(59),'REVISE_OR_HOLD');
  assert.equal(portfolioDecisionBand(40),'REVISE_OR_HOLD');
  assert.equal(portfolioDecisionBand(39),'REDUCE_REVIEW');
  assert.equal(portfolioDecisionBand(0),'REDUCE_REVIEW');
  const result=evaluatePortfolioDepartmentScores(scores(90));
  assert.equal(result.pass,true);
  assert.equal(result.aggregateScore,90);
  assert.equal(result.decisionBand,'EXPAND');
});

test('portfolio expansion requires all five scores and evidence; 79 does not auto-expand',()=>{
  const state=normalizeSeedState({seeds:[],vacancies:[],portfolioSeedRequests:[]});
  assert.throws(()=>createPortfolioSeedRequest(state,{category:'PUZZLE',departmentScores:scores(79),evidenceRefs:['review:a']}),/EXPAND_REQUIRES_SCORE_80_OR_OWNER_OVERRIDE/);
  assert.throws(()=>createPortfolioSeedRequest(state,{category:'PUZZLE',departmentScores:{planning:90,graphics:90,development:90,qa:90},evidenceRefs:['review:a']}),/INVALID_BALANCE_SCORE/);
  assert.throws(()=>createPortfolioSeedRequest(state,{category:'PUZZLE',departmentScores:scores(90),evidenceRefs:[]}),/MISSING_PORTFOLIO_EVIDENCE/);
  const request=createPortfolioSeedRequest(state,{category:'PUZZLE',departmentScores:scores(90),evidenceRefs:['review:a']});
  assert.equal(request.aggregateScore,90);
  assert.equal(request.decisionBand,'EXPAND');
  assert.equal(pendingPortfolioSeedRequests(state).length,1);
});

test('a vacancy by itself never becomes a GAME_SEED creation request',()=>{
  const state=normalizeSeedState({seeds:[],vacancies:[],portfolioSeedRequests:[]});
  createSeedVacancy(state,{category:'PUZZLE',reason:'DISCARDED',sourceSeedId:'old-seed',sourceGameId:'old-game'});
  assert.equal(state.vacancies.length,1);
  assert.equal(pendingPortfolioSeedRequests(state).length,0);
});

test('owner may explicitly override portfolio expansion without restoring one-for-one replacement',()=>{
  const state=normalizeSeedState({seeds:[],vacancies:[],portfolioSeedRequests:[]});
  const request=createPortfolioSeedRequest(state,{category:'CASUAL',departmentScores:scores(20),evidenceRefs:['owner:2026-09-12'],ownerOverride:true});
  assert.equal(request.decisionBand,'OWNER_OVERRIDE_EXPAND');
  assert.equal(pendingPortfolioSeedRequests(state).length,1);
});

test('bootstrap consumes score-approved portfolio requests after the historical bootstrap',()=>{
  assert.match(bootstrap,/pendingPortfolioSeedRequests/);
  assert.match(bootstrap,/DEPARTMENT_SCORE_GUIDED_EXPANSION/);
  assert.match(bootstrap,/NO_PORTFOLIO_EXPANSION_DECISION/);
  assert.match(bootstrap,/portfolioRequest/);
  assert.doesNotMatch(bootstrap,/unfilledVacancies\(state\)/);
  assert.doesNotMatch(bootstrap,/ONE_FOR_ONE_VACANCY/);
  assert.match(bootstrap,/allowedTargetPlatforms/);
  assert.match(bootstrap,/defaultTargetPlatform/);
});

test('workflow creates seeds only for initial bootstrap or score-approved portfolio requests',()=>{
  assert.match(seedWorkflow,/pendingPortfolioSeedRequests/);
  assert.match(seedWorkflow,/DEPARTMENT_SCORE_GUIDED_PORTFOLIO_EXPANSION/);
  assert.match(seedWorkflow,/NO_PORTFOLIO_EXPANSION_DECISION/);
  assert.match(seedWorkflow,/AUTOMATIC_ONE_FOR_ONE_REPLACEMENT=NO/);
  assert.match(seedWorkflow,/historical initial generation: one six-category batch only; it is not a portfolio quota/);
  assert.match(seedWorkflow,/vacancy\/discard alone: never creates a mandatory replacement/);
  assert.doesNotMatch(seedWorkflow,/ONE_FOR_ONE_VACANCY/);
  assert.doesNotMatch(seedWorkflow,/one-for-one same category/);
  assert.doesNotMatch(seedWorkflow,/exact vacancy replacements/);
});

test('semantic normalization no longer forces all projects into mobile single-player',()=>{
  assert.doesNotMatch(semanticNormalize,/original global mobile single-player/i);
  assert.doesNotMatch(semanticNormalize,/short touch sessions/i);
  assert.doesNotMatch(semanticNormalize,/GAME_SEED_NORMALIZE_NO_ACTIVE_SEEDS/);
  assert.match(semanticNormalize,/GAME_SEED_POLICY\.initialPlayMode/);
  assert.match(semanticNormalize,/ANDROID_MOBILE.*UNITY/s);
  assert.match(semanticNormalize,/FORTNITE_UEFN/);
});

test('quality gate treats market evidence as reference instead of a hard rejection quota',()=>{
  assert.match(qualityGate,/GAME_SEED_MARKET_EVIDENCE_HARD_GATE=NO/);
  assert.match(qualityGate,/GAME_SEED_FIXED_CATEGORY_SLOT_QUOTA=NO/);
  assert.doesNotMatch(qualityGate,/GAME_SEED_QUALITY_ACTIVE_COUNT_TOO_SMALL/);
  assert.doesNotMatch(qualityGate,/global-age-evidence-missing/);
  assert.doesNotMatch(qualityGate,/global-revenue-evidence-missing/);
  assert.doesNotMatch(qualityGate,/global-playtime-evidence-missing/);
  assert.doesNotMatch(qualityGate,/reference-outside-category-pool/);
});

test('autonomous runtime does not depend on GitHub Actions PR creation permission',()=>{
  for(const text of [seedWorkflow,seedDesignWorkflow,statusWorkflow]){
    assert.match(text,/COMPANY_RUNTIME_BRANCH: company-runtime/);
    assert.doesNotMatch(text,/gh pr create/);
    assert.match(text,/PUBLIC_MAIN_WRITE=NO/);
  }
  assert.match(seedWorkflow,/git push origin "HEAD:refs\/heads\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(seedWorkflow,/gh workflow run company-seed-design-runtime\.yml --ref main/);
  assert.match(seedDesignWorkflow,/game-seed-state\.json/);
  assert.match(seedDesignWorkflow,/max-parallel: 6/);
  assert.match(seedDesignWorkflow,/node tools\/artbook-production-pipeline\.mjs/);
});

test('DESIGN_ONLY requires seed same designer revision and repeated five-lead fatal review',()=>{
  assert.match(design,/GAME_SEED_REQUIRED/);
  assert.match(design,/sameModelAsDraft:true/);
  assert.match(design,/repeatedFiveDepartmentReview:true/);
  assert.match(design,/discardVotes\.length===ROLES\.length&&commonFatal\.length>0/);
  assert.match(design,/marketMetricAloneUsedForDiscard:false/);
  assert.match(design,/vibe2Used:false/);
  assert.doesNotMatch(design,/vibe2-validator|VIBE2_VALIDATION_LEARNING/);
});

test('DESIGN_ONLY order is design then baseline then artbook never artbook before gate',()=>{
  const designCall=pipeline.indexOf("await run('tools/company-design-cycle.mjs')");
  const gateCall=pipeline.indexOf("await run('tools/company-baseline-gate.mjs')",designCall);
  const artbookCall=pipeline.indexOf("await run('tools/company-design-artbook.mjs')",gateCall);
  assert.ok(designCall>=0&&gateCall>designCall&&artbookCall>gateCall);
  assert.match(pipeline,/DESIGN_ONLY_VIBE2_USED=NO/);
  assert.match(gate,/designArtbookOnlyAfterBaselineReady:true/);
  assert.match(gate,/designOnlyVibe2Forbidden:true/);
  assert.match(artbook,/DESIGN_ARTBOOK_REQUIRES_DESIGN_BASELINE_READY/);
  assert.match(artbook,/vibe2Used:false/);
});

test('development discard or demotion still requires real evidence fix revalidation and five-lead agreement',()=>{
  assert.match(devDisposition,/realEvidenceExists:data\.realEvidenceExists===true/);
  assert.match(devDisposition,/targetedFixAttempted/);
  assert.match(devDisposition,/targetedRevalidationPerformed/);
  assert.match(devDisposition,/structuralFatalBlockerRemains/);
  assert.match(devDisposition,/uniq\(Object\.values\(leadModels\)\)\.length!==5/);
  assert.match(devDisposition,/unanimous&&commonFatal\.length/);
  assert.match(devDisposition,/DEMOTE_TO_DESIGN_ONLY/);
  assert.match(devDisposition,/markSeedDiscarded/);
});

test('obsolete free-concept and direct prototype entrypoints remain removed',()=>{
  for(const file of [
    'tools/autonomous-new-game-incubator.mjs','tools/autonomous-prototype-worker.mjs',
    '.github/workflows/autonomous-new-game-incubator.yml','.github/workflows/autonomous-prototype-worker.yml',
    'qa/autonomous-new-game-incubator.test.mjs','qa/autonomous-prototype-worker.test.mjs','qa/autonomous-new-game-closed-loop.test.mjs'
  ])assert.equal(fs.existsSync(file),false,`obsolete path still exists: ${file}`);
  assert.equal(fs.existsSync('.github/workflows/company-game-seed-bootstrap.yml'),true);
});
