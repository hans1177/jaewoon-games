import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeSeedState,markSeedDiscarded,unfilledVacancies,fillVacancy,platformRepresentativeGaps,recordPlatformSetState} from '../tools/game-seed-state.mjs';
import {representativeCategoriesForPlatform} from '../tools/game-seed-platform-profile.mjs';

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const bootstrap=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
const semanticNormalize=fs.readFileSync('tools/company-game-seed-semantic-normalize.mjs','utf8');
const qualityGate=fs.readFileSync('tools/company-game-seed-quality-gate.mjs','utf8');
const marketEvidence=JSON.parse(fs.readFileSync('game-seed-market-evidence.json','utf8'));
const platformProfiles=JSON.parse(fs.readFileSync('game-seed-platform-profiles.json','utf8'));
const seedWorkflow=fs.readFileSync('.github/workflows/company-game-seed-bootstrap.yml','utf8');
const seedDesignWorkflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const statusWorkflow=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const devDisposition=fs.readFileSync('tools/company-development-disposition-gate.mjs','utf8');

const robloxCategories=directive.platformPortfolioSets.platformSets.ROBLOX.categories;

test('directive preserves historical six while defining an independent Roblox six-category development set',()=>{
  assert.equal(directive.gameSeed.enabled,true);
  assert.equal(directive.gameSeed.bootstrap.mode,'HISTORICAL_SINGLE_BOOTSTRAP_BATCH');
  assert.equal(directive.gameSeed.bootstrap.count,6);
  assert.equal(directive.gameSeed.bootstrap.historicalInitialSeedBatchOnly,true);
  assert.equal(directive.gameSeed.bootstrap.productionQuota,false);
  assert.equal(directive.gameSeed.bootstrap.categoriesAreReferenceSetNotSlotQuota,true);
  assert.equal(new Set(directive.gameSeed.bootstrap.categories).size,6);
  assert.equal(directive.gameSeed.replenishment.mode,'DEPARTMENT_SCORE_GUIDED_DYNAMIC_PORTFOLIO');
  assert.equal(directive.gameSeed.replenishment.oneForOneOnly,false);
  assert.equal(directive.gameSeed.replenishment.automaticGrowthBeyondVacanciesForbidden,false);
  assert.equal(directive.gameSeed.initialTargetPlatform,'ROBLOX');
  assert.deepEqual(directive.gameSeed.allowedTargetPlatforms,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(directive.gameSeed.platformCategorySetSelectedByTargetPlatform,true);
  assert.equal(directive.gameSeed.representativeSetDoesNotCreateGameCountCap,true);

  assert.equal(directive.platformPortfolioSets.platformSetsIndependent,true);
  assert.equal(directive.platformPortfolioSets.categorySlotsSharedAcrossPlatforms,false);
  assert.equal(directive.platformPortfolioSets.defaultRepresentativeCategoryCountPerPlatform,6);
  assert.equal(directive.platformPortfolioSets.sixCategoriesAreDevelopmentSetNotPortfolioCap,true);
  assert.equal(directive.platformPortfolioSets.forcedReleaseOfAllSetMembers,false);
  assert.equal(directive.platformPortfolioSets.preferredConcurrentImplementationProjects,'2_TO_3');
  assert.equal(robloxCategories.length,6);
  assert.equal(new Set(robloxCategories).size,6);
  assert.ok(robloxCategories.includes('STORY_RPG_ADVENTURE_RPG'));
  assert.deepEqual(directive.platformPortfolioSets.platformSets.ROBLOX.requiredCategories,['STORY_RPG_ADVENTURE_RPG']);
});

test('Roblox platform seed profile covers all six representative categories with distinct benchmark pools and concrete loops',()=>{
  const profiles=platformProfiles.platforms?.ROBLOX?.categories||{};
  assert.deepEqual(new Set(Object.keys(profiles)),new Set(robloxCategories));
  for(const category of robloxCategories){
    const cfg=profiles[category];
    assert.ok(Array.isArray(cfg.benchmarkCandidates)&&cfg.benchmarkCandidates.length>=3,`${category} benchmark pool`);
    assert.ok(Array.isArray(cfg.requiredConceptGroups)&&cfg.requiredConceptGroups.length>=4,`${category} concept groups`);
    assert.ok(Array.isArray(cfg.minimumCoreLoop)&&cfg.minimumCoreLoop.length>=3,`${category} loop`);
    assert.ok(cfg.minimumCoreLoop.every(step=>step.length>=70),`${category} loop must be concrete`);
  }
  assert.ok(profiles.STORY_RPG_ADVENTURE_RPG.benchmarkCandidates.includes('Blox Fruits'));
});

test('historical Unity seeds do not consume Roblox representative slots',()=>{
  const historical=directive.gameSeed.bootstrap.categories.map((category,index)=>({seedId:`U-${index}`,gameId:`u-${index}`,GAME_CATEGORY:category,INITIAL_TARGET_PLATFORM:'UNITY',status:'ACTIVE'}));
  const state=normalizeSeedState({seeds:historical,vacancies:[],bootstrapCompletedAt:'2026-09-11T00:00:00Z'});
  assert.deepEqual(platformRepresentativeGaps(state,'ROBLOX',robloxCategories),robloxCategories);
  state.seeds.push({seedId:'R-1',gameId:'r-1',GAME_CATEGORY:robloxCategories[0],INITIAL_TARGET_PLATFORM:'ROBLOX',status:'ACTIVE'});
  assert.deepEqual(platformRepresentativeGaps(state,'ROBLOX',robloxCategories),robloxCategories.slice(1));
  const setState=recordPlatformSetState(state,{platform:'ROBLOX',categories:robloxCategories,timestamp:'2026-09-12T00:00:00Z'});
  assert.equal(setState.complete,false);
  assert.equal(setState.gaps.length,5);
});

test('bootstrap fills platform representative gaps and no longer hardcodes Android single-player',()=>{
  assert.match(bootstrap,/PARTIAL_INITIAL_BOOTSTRAP_STATE_FORBIDDEN/);
  assert.match(bootstrap,/callModelBatch\(targets\)/);
  assert.match(bootstrap,/platformRepresentativeGaps\(state,primaryPlatform,representativeCategories\)/);
  assert.match(bootstrap,/PLATFORM_SET_FILL/);
  assert.match(bootstrap,/representativeCategoriesForPlatform/);
  assert.match(bootstrap,/INITIAL_TARGET_PLATFORM:platform/);
  assert.match(bootstrap,/INITIAL_PLAY_MODE:clean\(target\.sourceSeed\?\.INITIAL_PLAY_MODE\)\|\|'PROJECT_DEFINED'/);
  assert.match(bootstrap,/MUST_BE_MONETIZABLE_ON_SELECTED_PLATFORM/);
  assert.doesNotMatch(bootstrap,/INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE'/);
  assert.doesNotMatch(bootstrap,/초기 제품은 Android 모바일 싱글플레이다/);
  assert.doesNotMatch(bootstrap,/멀티 없이도 상품성이 있어야 한다/);
  assert.match(bootstrap,/Roblox는 Roblox 네이티브 멀티플레이/);
  assert.match(bootstrap,/const pending=\[\]/);
  const pendingBuild=bootstrap.indexOf('pending.push({seed:buildSeed');
  const stateMutation=bootstrap.indexOf('for(const item of pending){state.seeds.push');
  assert.ok(pendingBuild>=0,'validated pending seed build missing');
  assert.ok(stateMutation>pendingBuild,'state must mutate only after all pending seeds validate');
});

test('workflow evaluates bootstrap, primary-platform gaps, and vacancies through the same existing GAME_SEED workflow',()=>{
  assert.match(seedWorkflow,/game-seed-platform-profiles\.json/);
  assert.match(seedWorkflow,/game-seed-platform-profile\.mjs/);
  assert.match(seedWorkflow,/platformRepresentativeGaps/);
  assert.match(seedWorkflow,/PRIMARY_PLATFORM_REPRESENTATIVE_SET_GAP/);
  assert.match(seedWorkflow,/DYNAMIC_VACANCY_REPLENISHMENT/);
  assert.match(seedWorkflow,/NO_CREATION_REQUIRED_REVALIDATE/);
  assert.match(seedWorkflow,/Generate historical bootstrap, platform representative gaps, or replenishment/);
  assert.match(seedWorkflow,/--model-calls=1/);
  assert.match(seedWorkflow,/PRIMARY_PLATFORM_SET_GAPS=0/);
  assert.match(seedWorkflow,/SCORE_GUIDED_EXPANSION=NO_PENDING_REQUEST/);
  assert.doesNotMatch(seedWorkflow,/ONE_FOR_ONE_VACANCY/);
  assert.doesNotMatch(seedWorkflow,/AUTOMATIC_SEED_GROWTH=NO/);
  assert.match(seedWorkflow,/historical initial six: preserved as historical Unity seed batch; not a portfolio quota/);
  assert.match(seedWorkflow,/representative six: development diversity baseline, not total game-count maximum/);
});

test('semantic normalizer uses selected-platform profiles instead of universal mobile single-player assumptions',()=>{
  assert.match(semanticNormalize,/categorySeedProfile/);
  assert.match(semanticNormalize,/seedPlatform/);
  assert.match(semanticNormalize,/minimumLoop\.slice\(0,8\)/);
  assert.match(semanticNormalize,/Roblox-native session flow/);
  assert.match(semanticNormalize,/seed\.INITIAL_TARGET_PLATFORM=platform/);
  assert.match(semanticNormalize,/MUST_BE_MONETIZABLE_ON_SELECTED_PLATFORM/);
  assert.match(semanticNormalize,/assertGameSeed\(seed\)/);
  assert.doesNotMatch(semanticNormalize,/original global mobile single-player/);
});

test('semantic quality gate validates current primary platform set and each seed against its platform/category profile',()=>{
  assert.match(qualityGate,/platformRepresentativeGaps/);
  assert.match(qualityGate,/GAME_SEED_QUALITY_PLATFORM_SET_INCOMPLETE/);
  assert.match(qualityGate,/categorySeedProfile/);
  assert.match(qualityGate,/reference-outside-category-pool/);
  assert.match(qualityGate,/category-concept-groups/);
  assert.match(qualityGate,/core-loop-concept-groups/);
  assert.match(qualityGate,/loops\.some\(x=>x\.length<70\)/);
  assert.match(qualityGate,/global-age-evidence-missing/);
  assert.match(qualityGate,/global-revenue-evidence-missing/);
  assert.match(qualityGate,/global-playtime-evidence-missing/);
  assert.match(qualityGate,/invalid-platform/);
});

test('legacy global market evidence remains available for historical Unity categories',()=>{
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
  }
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
  assert.match(seedDesignWorkflow,/artbook exists before DESIGN_BASELINE_READY/);
  assert.match(statusWorkflow,/COMPANY_STATUS_SYNC_COMMIT=RUNTIME_PERSISTED/);
});

test('platform-aware vacancy replacement state remains idempotent as a runtime mechanism without creating a fixed portfolio quota',()=>{
  const state=normalizeSeedState({seeds:[{seedId:'SEED-ROBLOX-OBBY_PARTY_MINIGAME-001',gameId:'g1',GAME_CATEGORY:'OBBY_PARTY_MINIGAME',INITIAL_TARGET_PLATFORM:'ROBLOX',status:'ACTIVE'}],vacancies:[]});
  const first=markSeedDiscarded(state,'g1',{reason:'fatal',timestamp:'2026-09-12T00:00:00Z'});
  const second=markSeedDiscarded(state,'g1',{reason:'fatal',timestamp:'2026-09-12T00:01:00Z'});
  assert.equal(state.seeds[0].status,'DISCARDED');
  assert.equal(state.vacancies.length,1);
  assert.equal(first.vacancy.id,second.vacancy.id);
  assert.equal(first.vacancy.platform,'ROBLOX');
  assert.equal(unfilledVacancies(state).length,1);
  const replacement={seedId:'SEED-ROBLOX-OBBY_PARTY_MINIGAME-002',gameId:'g2',INITIAL_TARGET_PLATFORM:'ROBLOX'};
  fillVacancy(state.vacancies[0],replacement,'2026-09-12T00:02:00Z');
  assert.equal(unfilledVacancies(state).length,0);
  assert.equal(state.vacancies[0].replacementSeedId,replacement.seedId);
  assert.equal(state.vacancies[0].replacementPlatform,'ROBLOX');
});

test('representative category lookup is platform scoped',()=>{
  assert.deepEqual(representativeCategoriesForPlatform(directive,'ROBLOX'),robloxCategories);
  assert.deepEqual(representativeCategoriesForPlatform(directive,'UNITY'),directive.platformPortfolioSets.platformSets.UNITY.categories);
  assert.notDeepEqual(representativeCategoriesForPlatform(directive,'ROBLOX'),representativeCategoriesForPlatform(directive,'UNITY'));
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

test('development discard or demotion requires real evidence fix revalidation and five-lead agreement in the implementation',()=>{
  assert.match(devDisposition,/realEvidenceExists:data\.realEvidenceExists===true/);
  assert.match(devDisposition,/targetedFixAttempted/);
  assert.match(devDisposition,/targetedRevalidationPerformed/);
  assert.match(devDisposition,/structuralFatalBlockerRemains/);
  assert.match(devDisposition,/uniq\(Object\.values\(leadModels\)\)\.length!==5/);
  assert.match(devDisposition,/unanimous&&commonFatal\.length/);
  assert.match(devDisposition,/DEMOTE_TO_DESIGN_ONLY/);
  assert.match(devDisposition,/markSeedDiscarded/);
});

test('obsolete free-concept and direct prototype creation entrypoints remain removed',()=>{
  for(const file of [
    'tools/autonomous-new-game-incubator.mjs','tools/autonomous-prototype-worker.mjs',
    '.github/workflows/autonomous-new-game-incubator.yml','.github/workflows/autonomous-prototype-worker.yml',
    'qa/autonomous-new-game-incubator.test.mjs','qa/autonomous-prototype-worker.test.mjs','qa/autonomous-new-game-closed-loop.test.mjs'
  ])assert.equal(fs.existsSync(file),false,`obsolete path still exists: ${file}`);
  assert.equal(fs.existsSync('.github/workflows/company-game-seed-bootstrap.yml'),true);
});
