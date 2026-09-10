import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const text=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(text(p));
const exists=p=>fs.existsSync(path.join(root,p));
const directive=json('company-directive.json');
const pipeline=text('tools/artbook-production-pipeline.mjs');
const design=text('tools/company-design-cycle.mjs');
const gate=text('tools/company-design-baseline-gate.mjs');
const artbook=text('tools/company-design-artbook.mjs');
const seedBootstrap=text('tools/game-seed-bootstrap.mjs');
const seedSelector=text('tools/game-seed-selector.mjs');
const seedWorkflow=text('.github/workflows/game-seed-bootstrap.yml');
const productionWorkflow=text('.github/workflows/artbook-free-department-bots.yml');

test('DESIGN_ONLY has one current flow and no Vibe2 stage',()=>{
  assert.deepEqual(directive.classes.DESIGN_ONLY.requiredFlow,[
    'GAME_SEED','GAME_DESIGNER_DRAFT','FIVE_DISTINCT_DEPARTMENT_LEADS','DEPARTMENT_LEAD_PLUS_ASSISTANT_MULTIMODEL_REVIEW',
    'DEPARTMENT_LEAD_INTERNAL_CONSENSUS','CROSS_DEPARTMENT_LEAD_MEETING','ONE_LEAD_REBUTTAL_ROUND','GAME_DESIGNER_REVISION',
    'DESIGN_BASELINE_GATE','ARTBOOK_EDITOR_CORE_STRATEGY',
  ]);
  assert.equal(directive.ai.vibe2.startsAtClass,'DEVELOPMENT_CONFIRMED');
  assert.equal('DESIGN_ONLY' in directive.ai.vibe2.roleByClass,false);
  assert.match(pipeline,/company-design-cycle\.mjs[\s\S]*company-design-baseline-gate\.mjs[\s\S]*company-design-artbook\.mjs/);
  assert.match(pipeline,/DESIGN_ONLY_VIBE2_USED=NO/);
});

test('GAME_SEED is mandatory before Game Designer and carries copy boundaries',()=>{
  assert.match(design,/GAME_SEED_COMPLETE_REQUIRED/);
  assert.match(design,/GAME_SEED_COPY_BOUNDARY_REQUIRED/);
  assert.match(design,/GAME_SEED_MARKET_ROLE_REQUIRED/);
  assert.match(design,/sourceCodeRule!=='OWN_IMPLEMENTATION_ONLY'/);
  assert.match(seedBootstrap,/sourceCodeRule:'OWN_IMPLEMENTATION_ONLY'/);
  assert.match(seedBootstrap,/directExpressionCopyForbidden:true/);
  assert.match(seedSelector,/유명한 실제 출시 성공작/);
  assert.match(seedSelector,/매출·연령·플레이시간 같은 숫자를 절대 추측하지 않는다/);
});

test('initial bootstrap is six at once and replenishment is vacancy-only one-for-one',()=>{
  assert.equal(directive.gameSeed.bootstrap.initialSeedBatchCount,6);
  assert.equal(directive.gameSeed.bootstrap.initialSeedBatchCreatesAllCategoriesAtOnce,true);
  assert.equal(directive.gameSeed.replenishment.mode,'ONE_FOR_ONE_ONLY');
  assert.equal(directive.gameSeed.replenishment.normalPromotionTriggersReplenishment,false);
  assert.equal(directive.gameSeed.replenishment.redesignOrHoldTriggersReplenishment,false);
  assert.match(seedWorkflow,/state\.bootstrapComplete!==true/);
  assert.match(seedWorkflow,/find\(x=>x\.status==='OPEN'\)/);
  assert.doesNotMatch(seedWorkflow,/PROMOTED/);
});

test('market evidence is target reference and unsourced numeric claims are rejected',()=>{
  assert.equal(directive.gameSeed.marketEvidence.role,'TARGET_DESIGN_REFERENCE');
  assert.equal(directive.gameSeed.marketEvidence.hardPassFailGate,false);
  assert.equal(directive.gameSeed.marketEvidence.marketDataAloneCannotDiscardGame,true);
  assert.match(seedBootstrap,/numeric&&\(!clean\(item\.source\)\|\|!clean\(item\.observedAt\)\)/);
  assert.match(seedWorkflow,/UNSOURCED_NUMERIC_MARKET_CLAIMS=FORBIDDEN/);
});

test('design review precedes baseline and artbook is impossible before ready',()=>{
  assert.match(design,/artbook:\{created:false,reason:'DESIGN_BASELINE_GATE_MUST_RUN_FIRST'\}/);
  assert.match(design,/ARTBOOK_WRITTEN_BEFORE_BASELINE=NO/);
  assert.doesNotMatch(design,/core-artbook\.json/);
  assert.match(gate,/DESIGN_BASELINE_REDESIGN_REQUIRED/);
  assert.match(gate,/DESIGN_DISCARDED/);
  assert.match(gate,/DESIGN_BASELINE_READY/);
  assert.match(gate,/recordVacancy/);
  assert.match(gate,/designOnlyVibe2Used:false/);
  assert.match(artbook,/baselineGate\?\.state!=='DESIGN_BASELINE_READY'/);
  assert.match(artbook,/afterBaseline:true/);
  assert.match(artbook,/vibe2Used:false/);
  assert.match(productionWorkflow,/DESIGN_ONLY Vibe2 contract invalid/);
  assert.match(productionWorkflow,/DESIGN_ONLY artbook created before baseline ready/);
});

test('obsolete free-concept DESIGN_ONLY path is deleted',()=>{
  for(const file of [
    'tools/autonomous-new-game-incubator.mjs',
    '.github/workflows/autonomous-new-game-incubator.yml',
    'autonomous-incubator.json',
    'qa/autonomous-new-game-incubator.test.mjs',
    'qa/autonomous-new-game-closed-loop.test.mjs',
    '.github/workflows/artbook-initial-backfill-chain.yml',
  ]) assert.equal(exists(file),false,`obsolete file still exists: ${file}`);
});
