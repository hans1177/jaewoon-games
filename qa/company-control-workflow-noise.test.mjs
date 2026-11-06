// 파일명: qa/company-control-workflow-noise.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central v500 suppresses cancelled workflow control noise without hiding real failures',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.equal(policy.version,500);
  const rule=policy.developmentSpeedExecution?.controlWorkflowNoiseSuppression||{};
  assert.equal(rule.status,'ENABLED');
  assert.deepEqual(rule.upstreamConclusionsThatMayRunControlJobs,['success','failure']);
  assert.equal(rule.statusSyncSuccessAndFailureOnly,true);
  assert.equal(rule.queueReconcileGateSuccessAndFailureOnly,true);
  assert.equal(rule.failedGameEvidencePreserved,true);
  assert.equal(rule.qualityOrEvidenceGateWeakeningForbidden,true);
});

test('status sync and queue reconcile skip cancelled or skipped workflow_run events',()=>{
  const status=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
  const reconcile=fs.readFileSync('.github/workflows/company-development-queue-reconcile.yml','utf8');
  const gate=/if: github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.conclusion == 'success' \|\| github\.event\.workflow_run\.conclusion == 'failure'/;
  assert.match(status,gate);
  assert.match(reconcile,gate);
  assert.doesNotMatch(status,/conclusion == 'cancelled'/);
  assert.doesNotMatch(reconcile,/conclusion == 'cancelled'/);
});
