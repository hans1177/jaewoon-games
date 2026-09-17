import fs from 'node:fs';
import assert from 'node:assert/strict';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const promotion=fs.readFileSync('tools/design-only-promotion-sync.mjs','utf8');
const planner=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
const cozy=(catalog.games||[]).find(g=>g.id==='cozy-island');
assert.equal(cozy?.productionClass,'DEVELOPMENT_CONFIRMED');
assert.equal(cozy?.lifecycleState,'ACTIVE');
assert.ok(fs.existsSync('web-games/cozy-island/index.html'));
assert.match(flow,/activeOrRebuildCatalogGameMustHaveDevelopmentQueueEntry: true/);
assert.match(flow,/missingValidationCannotBecomeNoSafeAutonomousTask: true/);
assert.match(promotion,/DEVELOPMENT_EXISTING_RECONCILED/);
assert.match(promotion,/existingGameContinuation:true/);
assert.match(planner,/findExistingWebDevelopmentContinuationTask/);
assert.match(planner,/EXISTING_WEB_DEVELOPMENT_CONTINUATION/);
console.log('EXISTING_DEVELOPMENT_ONBOARDING_QA=PASS');
