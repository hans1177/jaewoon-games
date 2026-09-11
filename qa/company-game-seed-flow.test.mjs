import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeSeedState,markSeedDiscarded,unfilledVacancies,fillVacancy} from '../tools/game-seed-state.mjs';

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const bootstrap=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
const semanticNormalize=fs.readFileSync('tools/company-game-seed-semantic-normalize.mjs','utf8');
const qualityGate=fs.readFileSync('tools/company-game-seed-quality-gate.mjs','utf8');
const marketEvidence=JSON.parse(fs.readFileSync('game-seed-market-evidence.json','utf8'));
const seedWorkflow=fs.readFileSync('.github/workflows/company-game-seed-bootstrap.yml','utf8');
const seedDesignWorkflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const statusWorkflow=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const devDisposition=fs.readFileSync('tools/company-development-disposition-gate.mjs','utf8');

test('directive encodes one atomic six-category global GAME_SEED bootstrap',()=>{
  assert.equal(directive.gameSeed.enabled,true);
  assert.equal(directive.gameSeed.bootstrap.mode,'SINGLE_BOOTSTRAP_BATCH');
  assert.equal(directive.gameSeed.bootstrap.count,6);
  assert.equal(directive.gameSeed.bootstrap.createAllCategoriesAtOnce,true);
  assert.equal(new Set(directive.gameSeed.bootstrap.categories).size,6);
  assert.equal(directive.gameSeed.replenishment.mode,'ONE_FOR_ONE_ONLY');
  assert.equal(directive.gameSeed.replenishment.normalPromotionDoesNotTrigger,true);
  assert.equal(directive.gameSeed.marketEvidence.role,'TARGET_DESIGN_REFERENCE');
  assert.equal(directive.gameSeed.marketEvidence.targetMarketScope,'GLOBAL');
  assert.equal(directive.gameSeed.marketEvidence.countrySpecificEvidenceRole,'SECONDARY_CONTEXT_ONLY');
  assert.equal(directive.gameSeed.marketEvidence.defaultTargetMustNotBeCountrySpecific,true);
  assert.equal(directive.gameSeed.marketEvidence.hardPassFailGate,false);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresSource,true);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresObservedAt,true);
  assert.equal(directive.gameSeed.sourceCodeRule,'OWN_IMPLEMENTATION_ONLY');
  assert.equal(marketEvidence.targetMarketScope,'GLOBAL');
  assert.equal(Object.keys(marketEvidence.categories).length,6);
  for(const category of directive.gameSeed.bootstrap.categories){
    const cfg=marketEvidence.categories[category];
    assert.ok(Array.isArray(cfg.benchmarkCandidates));
    assert.ok(cfg.benchmarkCandidates.length>=2);
    assert.ok(Array.isArray(cfg.requiredConceptGroups));
    assert.ok(cfg.requiredConceptGroups.length>=4);
    assert.equal(cfg.minimumRequiredConceptGroups,4);
    assert.ok(Array.isArray(cfg.minimumCoreLoop));
    assert.ok(cfg.minimumCoreLoop.length>=3);
    assert.ok(cfg.minimumCoreLoop.every(step=>step.length>=70));
  }
});

test('bootstrap batches all requested seeds in one model call and mutates state only after full validation',()=>{
  assert.match(bootstrap,/PARTIAL_INITIAL_BOOTSTRAP_STATE_FORBIDDEN/);
  assert.match(bootstrap,/callModelBatch\(targets\)/);
  assert.match(bootstrap,/GAME_SEED_BATCH_COUNT_MISMATCH/);
  assert.match(bootstrap,/GAME_SEED_TARGET_MARKET_SCOPE_MUST_BE_GLOBAL/);
  assert.match(bootstrap,/referenceGamesOutsideCategoryPool/);
  assert.match(bootstrap,/benchmarkCandidates:t\.benchmarkCandidates/);
  assert.match(bootstrap,/targetMarketScope:'GLOBAL'/);
  assert.match(bootstrap,/requestId:target\.requestId,category:target\.category/);
  assert.doesNotMatch(bootstrap,/requestId:clean\(p\?\.requestId\)\|\|target\.requestId/);
  assert.match(bootstrap,/const pending=\[\]/);
  const pendingBuild=bootstrap.indexOf('pending.push({seed:buildSeed');
  const stateMutation=bootstrap.indexOf('for(const item of pending){state.seeds.push');
  assert.ok(pendingBuild>=0,'validated pending seed build missing');
  assert.ok(stateMutation>pendingBuild,'state must mutate only after all pending seeds validate');
  assert.match(bootstrap,/modelCalls:proposalProvider\?0:1/);
  assert.match(bootstrap,/unfilledVacancies\(state\)/);
  assert.match(bootstrap,/fillVacancy\(item\.vacancy,item\.seed,timestamp\)/);
  assert.match(bootstrap,/numericClaimAccepted:numericLike\?Boolean\(source&&observedAt\):false/);
  assert.match(bootstrap,/if\(numericLike&&\(!source\|\|!observedAt\)\)value='UNKNOWN'/);
  assert.match(seedWorkflow,/Verified free budget preflight/);
  assert.match(seedWorkflow,/--model-calls=1/);
  assert.match(seedWorkflow,/Normalize all active category semantics and global target evidence/);
  assert.match(seedWorkflow,/Reject category-mismatched generic or country-scoped GAME_SEED output/);
  assert.match(seedWorkflow,/GAME_SEED_MARKET_SCOPE=GLOBAL/);
  assert.match(seedWorkflow,/NO_VACANCY_REVALIDATE_ACTIVE/);
  assert.ok(seedWorkflow.indexOf('Verified free budget preflight')<seedWorkflow.indexOf('uses: ./.github/actions/prepare-ollama'));
  assert.ok(seedWorkflow.indexOf('Normalize all active category semantics and global target evidence')<seedWorkflow.indexOf('Reject category-mismatched generic or country-scoped GAME_SEED output'));
});

test('semantic normalizer always writes concrete category loops and repairs every active seed',()=>{
  assert.match(semanticNormalize,/requiredConceptGroups/);
  assert.match(semanticNormalize,/minimumCoreLoop/);
  assert.match(semanticNormalize,/GAME_SEED_NORMALIZE_MINIMUM_LOOP_MISSING/);
  assert.match(semanticNormalize,/seed\.CORE_LOOP=minimumLoop\.slice\(0,8\)/);
  assert.match(semanticNormalize,/filter\(seed=>clean\(seed\.status\)\.toUpperCase\(\)==='ACTIVE'\)/);
  assert.match(semanticNormalize,/GAME_SEED_NORMALIZE_NO_ACTIVE_SEEDS/);
  assert.match(semanticNormalize,/targetMarketScope:'GLOBAL'/);
  assert.match(semanticNormalize,/Global mobile players across age groups/);
  assert.match(semanticNormalize,/globalAveragePlayerAge/);
  assert.match(semanticNormalize,/original global mobile single-player/);
  assert.match(semanticNormalize,/assertGameSeed\(seed\)/);
});

test('semantic quality gate rejects vague loops wrong benchmarks and non-global target scope',()=>{
  assert.match(qualityGate,/GAME_SEED_QUALITY_EVIDENCE_SCOPE_NOT_GLOBAL/);
  assert.match(qualityGate,/reference-outside-category-pool/);
  assert.match(qualityGate,/category-concept-groups/);
  assert.match(qualityGate,/minimumRequiredConceptGroups/);
  assert.match(qualityGate,/core-loop-concept-groups/);
  assert.match(qualityGate,/loops\.some\(x=>x\.length<70\)/);
  assert.match(qualityGate,/distinct-identity-too-generic/);
  assert.match(qualityGate,/distinct-identity-reinterpretation-missing/);
  assert.match(qualityGate,/market-scope-not-global/);
  assert.match(qualityGate,/country-specific-default-audience/);
  assert.match(qualityGate,/global-age-evidence-missing/);
  assert.match(qualityGate,/global-revenue-evidence-missing/);
  assert.match(qualityGate,/global-playtime-evidence-missing/);
  assert.match(qualityGate,/core-loop-business-meta-language/);
});

test('no-vacancy runs still normalize validate persist changes and never create extra seeds',()=>{
  const normalizeIndex=seedWorkflow.indexOf('- name: Normalize all active category semantics and global target evidence');
  const qualityIndex=seedWorkflow.indexOf('- name: Reject category-mismatched generic or country-scoped GAME_SEED output');
  const noGrowthIndex=seedWorkflow.indexOf('- name: Record no-growth revalidation when there is no vacancy');
  const validateIndex=seedWorkflow.indexOf('- name: Validate GAME_SEED state');
  const persistIndex=seedWorkflow.indexOf('- name: Persist validated GAME_SEED state to company runtime branch');
  assert.ok(normalizeIndex>0&&qualityIndex>normalizeIndex&&noGrowthIndex>qualityIndex&&validateIndex>noGrowthIndex&&persistIndex>validateIndex);
  const normalizeBlock=seedWorkflow.slice(normalizeIndex,qualityIndex);
  const qualityBlock=seedWorkflow.slice(qualityIndex,noGrowthIndex);
  const validateBlock=seedWorkflow.slice(validateIndex,persistIndex);
  assert.doesNotMatch(normalizeBlock,/if: steps\.need\.outputs\.model/);
  assert.doesNotMatch(qualityBlock,/if: steps\.need\.outputs\.model/);
  assert.doesNotMatch(validateBlock,/if: steps\.need\.outputs\.model/);
  assert.match(noGrowthIndex>=0?seedWorkflow:'',/AUTOMATIC_SEED_GROWTH=NO/);
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
  assert.match(seedDesignWorkflow,/max-parallel: 1/);
  assert.match(seedDesignWorkflow,/node tools\/artbook-production-pipeline\.mjs/);
  assert.match(seedDesignWorkflow,/artbook exists before DESIGN_BASELINE_READY/);
  assert.match(statusWorkflow,/COMPANY_STATUS_SYNC_COMMIT=RUNTIME_PERSISTED/);
});

test('seed vacancy state is one-for-one and discard is idempotent',()=>{
  const state=normalizeSeedState({seeds:[{seedId:'SEED-PUZZLE-001',gameId:'g1',GAME_CATEGORY:'PUZZLE',status:'ACTIVE'}],vacancies:[]});
  const first=markSeedDiscarded(state,'g1',{reason:'fatal',timestamp:'2026-09-11T00:00:00Z'});
  const second=markSeedDiscarded(state,'g1',{reason:'fatal',timestamp:'2026-09-11T00:01:00Z'});
  assert.equal(state.seeds[0].status,'DISCARDED');
  assert.equal(state.vacancies.length,1);
  assert.equal(first.vacancy.id,second.vacancy.id);
  assert.equal(unfilledVacancies(state).length,1);
  const replacement={seedId:'SEED-PUZZLE-002',gameId:'g2'};
  fillVacancy(state.vacancies[0],replacement,'2026-09-11T00:02:00Z');
  assert.equal(unfilledVacancies(state).length,0);
  assert.equal(state.vacancies[0].replacementSeedId,'SEED-PUZZLE-002');
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

test('development discard or demotion requires real evidence fix revalidation and five-lead agreement',()=>{
  assert.match(devDisposition,/realEvidenceExists:data\.realEvidenceExists===true/);
  assert.match(devDisposition,/targetedFixAttempted/);
  assert.match(devDisposition,/targetedRevalidationPerformed/);
  assert.match(devDisposition,/structuralFatalBlockerRemains/);
  assert.match(devDisposition,/uniq\(Object\.values\(leadModels\)\)\.length!==5/);
  assert.match(devDisposition,/unanimous&&commonFatal\.length/);
  assert.match(devDisposition,/DEMOTE_TO_DESIGN_ONLY/);
  assert.match(devDisposition,/markSeedDiscarded/);
});

test('obsolete free-concept and direct prototype creation entrypoints are removed',()=>{
  for(const file of [
    'tools/autonomous-new-game-incubator.mjs','tools/autonomous-prototype-worker.mjs',
    '.github/workflows/autonomous-new-game-incubator.yml','.github/workflows/autonomous-prototype-worker.yml',
    'qa/autonomous-new-game-incubator.test.mjs','qa/autonomous-prototype-worker.test.mjs','qa/autonomous-new-game-closed-loop.test.mjs'
  ])assert.equal(fs.existsSync(file),false,`obsolete path still exists: ${file}`);
  assert.equal(fs.existsSync('.github/workflows/company-game-seed-bootstrap.yml'),true);
});
