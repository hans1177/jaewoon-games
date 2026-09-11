import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeSeedState,createSeedVacancy,markSeedDiscarded,unfilledVacancies,fillVacancy} from '../tools/game-seed-state.mjs';

const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const bootstrap=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const devDisposition=fs.readFileSync('tools/company-development-disposition-gate.mjs','utf8');

test('directive encodes one atomic six-category GAME_SEED bootstrap',()=>{
  assert.equal(directive.gameSeed.enabled,true);
  assert.equal(directive.gameSeed.bootstrap.mode,'SINGLE_BOOTSTRAP_BATCH');
  assert.equal(directive.gameSeed.bootstrap.count,6);
  assert.equal(directive.gameSeed.bootstrap.createAllCategoriesAtOnce,true);
  assert.equal(new Set(directive.gameSeed.bootstrap.categories).size,6);
  assert.equal(directive.gameSeed.replenishment.mode,'ONE_FOR_ONE_ONLY');
  assert.equal(directive.gameSeed.replenishment.normalPromotionDoesNotTrigger,true);
  assert.equal(directive.gameSeed.marketEvidence.role,'TARGET_DESIGN_REFERENCE');
  assert.equal(directive.gameSeed.marketEvidence.hardPassFailGate,false);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresSource,true);
  assert.equal(directive.gameSeed.marketEvidence.numericClaimRequiresObservedAt,true);
  assert.equal(directive.gameSeed.sourceCodeRule,'OWN_IMPLEMENTATION_ONLY');
});

test('bootstrap stages all six initial seeds before saving and only replenishes vacancies later',()=>{
  assert.match(bootstrap,/PARTIAL_INITIAL_BOOTSTRAP_STATE_FORBIDDEN/);
  assert.match(bootstrap,/pending\.push\(\{seed:buildSeed/);
  assert.match(bootstrap,/for\(const item of pending\)\{state\.seeds\.push\(item\.seed\)/);
  assert.match(bootstrap,/unfilledVacancies\(state\)/);
  assert.match(bootstrap,/fillVacancy\(item\.vacancy,item\.seed,timestamp\)/);
  assert.match(bootstrap,/numericClaimAccepted:numericLike\?Boolean\(source&&observedAt\):false/);
  assert.match(bootstrap,/if\(numericLike&&\(!source\|\|!observedAt\)\)value='UNKNOWN'/);
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

test('DESIGN_ONLY requires seed, same designer revision and repeated five-lead fatal review',()=>{
  assert.match(design,/GAME_SEED_REQUIRED/);
  assert.match(design,/sameModelAsDraft:true/);
  assert.match(design,/repeatedFiveDepartmentReview:true/);
  assert.match(design,/discardVotes\.length===ROLES\.length&&commonFatal\.length>0/);
  assert.match(design,/marketMetricAloneUsedForDiscard:false/);
  assert.match(design,/vibe2Used:false/);
  assert.doesNotMatch(design,/vibe2-validator|VIBE2_VALIDATION_LEARNING/);
});

test('DESIGN_ONLY order is design then baseline then artbook, never artbook before gate',()=>{
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

test('development discard or demotion requires explicit real evidence, fix, revalidation and five-lead agreement',()=>{
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
    'tools/autonomous-new-game-incubator.mjs',
    'tools/autonomous-prototype-worker.mjs',
    '.github/workflows/autonomous-new-game-incubator.yml',
    '.github/workflows/autonomous-prototype-worker.yml',
    'qa/autonomous-new-game-incubator.test.mjs',
    'qa/autonomous-prototype-worker.test.mjs',
    'qa/autonomous-new-game-closed-loop.test.mjs'
  ]) assert.equal(fs.existsSync(file),false,`obsolete path still exists: ${file}`);
  assert.equal(fs.existsSync('.github/workflows/company-game-seed-bootstrap.yml'),true);
});
