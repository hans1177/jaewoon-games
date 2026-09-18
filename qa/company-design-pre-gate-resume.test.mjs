import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

test('PRE_GATE_BLOCKED resume regenerates only targeted repair checkpoints',()=>{
  assert.match(design,/const priorCheckpointStatus=clean\(designCheckpoint\?\.status\)\.toUpperCase\(\)/);
  assert.match(design,/priorCheckpointStatus==='PRE_GATE_BLOCKED'/);
  for(const phase of [
    'designer_pre_gate_repair_1',
    'deterministic_pre_gate_after_repair_1',
    'designer_pre_gate_repair_2',
    'deterministic_pre_gate_after_repair_2'
  ]) assert.match(design,new RegExp(phase));
  assert.match(design,/delete designCheckpoint\.phases\[phase\]/);
  assert.match(design,/preGateRepairGeneration=Math\.max\(0,Number\(designCheckpoint\.preGateRepairGeneration\|\|0\)\)\+1/);
  assert.match(design,/DESIGN_PRE_GATE_REPAIR_RETRY_GENERATION=/);
  assert.match(design,/fullCycleRestart=NO/);
  assert.match(design,/Object\.prototype\.hasOwnProperty\.call\(designCheckpoint\.phases\|\|\{\},'designer_draft'\)/);
});

test('blocked resume preserves the current designer draft and gate threshold',()=>{
  const start=design.indexOf("if(priorCheckpointStatus==='PRE_GATE_BLOCKED'");
  const end=design.indexOf("for(const [rawModel,row]",start);
  assert.ok(start>0&&end>start);
  const section=design.slice(start,end);
  assert.doesNotMatch(section,/delete designCheckpoint\.phases\.designer_draft/);
  assert.doesNotMatch(section,/designCheckpoint\.phases\s*=\s*\{\}/);
  assert.doesNotMatch(section,/DESIGN_GATE_PASS_MINIMUM\s*=/);
  assert.match(design,/if\(!preGatePass\(preGate\)\)[\s\S]*status='PRE_GATE_BLOCKED'/);
});

test('current blocked checkpoint engine remains compatible with targeted resume migration',()=>{
  assert.match(design,/24c3c41118092b683ffd377cd948df67544a935d6871fa290e985263cf5f3c03/);
  assert.match(design,/checkpointV3CompatibleEngineMigrationEligible/);
  assert.match(design,/QUOTA_VIBE_REPAIR_COMPATIBLE_ENGINE_CHANGE_NO_REPLAY/);
});


test('design runtime replaces only stale engine runs while preserving manual and scheduled cycles',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/group: company-seed-design-runtime/);
  assert.match(workflow,/cancel-in-progress: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(workflow,/push:[\s\S]*tools\/company-design-cycle\.mjs/);
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/schedule:/);
});


test('Gemini daily quota quarantine precedes minute-rate retry handling',()=>{
  const dailyIndex=design.indexOf('if(status===429&&isDailyGeminiQuotaError(error))');
  const retryIndex=design.indexOf('const minuteRetryMs=geminiMinuteRetryDelayMs(error,candidateModel)',dailyIndex);
  const waitIndex=design.indexOf('GEMINI_RATE_LIMIT_WAIT=',retryIndex);
  assert.ok(dailyIndex>0&&retryIndex>dailyIndex&&waitIndex>retryIndex);
  assert.match(design,/GEMINI_DAILY_QUOTA_EXHAUSTED=.*retry=NO/);
  assert.match(design,/minuteRateRetries<2/);
  assert.match(design,/attempt-=1;\s*continue;/);
  assert.match(design,/2ee13c831a912a1446b625b0b30f5e2fd64a6acf6fa19754420ecde80b0abc5f/);
  assert.match(design,/84ba02b00c0f6c91c9731f1ecabc12b55accadd2f2673cabdf5badc742e64dbf/);
});


test('checkpoint quota governor reallocates unique fallback lanes to blocked lead roles',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/const availableExtraFallbacks=fallback\.filter\(model=>!primarySet\.has\(model\)&&!exhausted\.has\(model\)\)/);
  assert.match(workflow,/const blockedPrimaryRoles=leadPhaseActive/);
  assert.match(workflow,/const usedFallbacks=new Set\(\)/);
  assert.match(workflow,/for\(const role of blockedPrimaryRoles\)/);
  assert.match(workflow,/GEMINI_ADAPTIVE_FALLBACK_LANES=/);
  assert.match(workflow,/fallback_lanes=\$\{adaptiveLaneSpec\}/);
  assert.match(workflow,/COMPANY_GEMINI_LEAD_FALLBACK_LANES: \$\{\{ steps\.gemini_quota\.outputs\.fallback_lanes \}\}/);
});
