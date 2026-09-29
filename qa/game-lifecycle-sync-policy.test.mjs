import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central lifecycle authority and pipeline target are documented',()=>{
  const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
  for(const token of ['canonicalLifecycleAuthority: GAME_CATALOG_LIFECYCLE_STATE_BY_GAME_ID','developmentPipelineTarget: 60','staleCompanyStatusCannotResurrectMissingCatalogGame: true','queuedTasksMustCancel: true','runningTaskMustStopAtNextSafeBoundary: true']) assert.equal(flow.includes(token),true,token);
});

test('planner blocks stale resurrection and stale queued work',()=>{
  const src=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  assert.equal(src.includes("if(!game||!lifecycleAllowsDevelopment(game))continue"),true);
  assert.equal(src.includes("status:'cancelled',blocker:`lifecycle-inactive:"),true);
  assert.equal(src.includes('lifecycle-stop-requested'),true);
});

test('company status exports lifecycle and 60-pipeline telemetry',()=>{
  const src=fs.readFileSync('tools/company-status-sync.mjs','utf8');
  assert.equal(src.includes('export function gameLifecycleState'),true);
  assert.equal(src.includes('pipeline:{target:60'),true);
  assert.equal(src.includes("targetEngine='lifecycle-inactive'"),true);
});
