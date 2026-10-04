// 파일명: qa/vibe2-owner-rule1-continuity.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createVibeContinuousQueue,finishVibeQueueTask} from '../assets/vibe-continuous-queue.js';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const roadmap=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-learning/platform-release-roadmap.json'),'utf8'));
const runner=fs.readFileSync(path.join(repoRoot,'.github/workflows/vibe2-24h-runner.yml'),'utf8');

test('owner rule1 forbids terminal done and defines verified completion as a continuation checkpoint',()=>{
  const rule=roadmap.ownerCanonicalRules?.rule1;
  assert.equal(rule?.id,'RULE_1_NEVER_STOP_CONTINUOUS_GAME_DEVELOPMENT');
  assert.equal(rule?.enabled,true);
  assert.equal(rule?.doneCommandRemoved,true);
  assert.equal(rule?.terminalDoneStateForbidden,true);
  assert.equal(rule?.verifiedCompletionMeaning,'VERIFIED_CHECKPOINT_NOT_TERMINATION');
  assert.equal(rule?.verifiedCheckpointMustGenerateNextCausalInput,true);
  assert.equal(rule?.completionIsCheckpointNotStop,true);
  assert.equal(rule?.ownerExplicitStopRequired,false);
  assert.equal(rule?.global24hStopForbidden,true);
  assert.equal(rule?.ownerMayStopGlobal24h,false);
  assert.equal(rule?.hourlyScheduleRole,'SAFETY_NET_ONLY_NOT_PRIMARY_CONTINUATION');
});

test('verified task completion is stored as checkpoint evidence rather than done status',()=>{
  const queue=createVibeContinuousQueue({tasks:[{
    id:'rule1-task',gameId:'demo',target:'web',department:'development',type:'implementation',
    goal:'verify rule1 checkpoint semantics',status:'running',retryPolicy:'UNLIMITED_CAUSAL_REPAIR'
  }]});
  const result=finishVibeQueueTask(queue,{taskId:'rule1-task',outcome:'PASS',evidence:['qa:PASS']});
  const task=result.queue.tasks.find(row=>row.id==='rule1-task');
  assert.equal(task.status,'verified');
  assert.notEqual(task.status,'done');
  assert.ok(task.evidence.includes('signal-state:VERIFIED_CHECKPOINT'));
  assert.ok(task.evidence.includes('signal-continuity:NEXT_CAUSAL_INPUT'));
});

test('empty queue and failed subjobs preserve next-cycle continuity through canonical backpressure',()=>{
  const pressure=roadmap.changeRecord?.runnerBackpressureBottleneckRelief20261001;
  assert.equal(pressure?.queuePressureThreshold,4);
  assert.equal(pressure?.scheduler?.refillUnderPressure,'DEFER_TO_FIVE_MINUTE_SAFETY_NET');
  assert.equal(pressure?.scheduler?.duplicateSchedulerDispatch,'SKIP_WHEN_ANOTHER_24H_RUN_IS_ACTIVE');

  assert.match(runner,/refill:\s*\n\s*needs: \[plan, recovery_fast, continuous, asset_development, learning_idle, game_study\]/);
  assert.match(runner,/if: \$\{\{ always\(\) \}\}/);
  assert.match(runner,/Dispatch next cycle only when backpressure allows/);
  assert.match(runner,/CONTINUE_REQUIRED: \$\{\{ needs\.plan\.outputs\.continue_required \}\}/);
  assert.match(runner,/RUNNER_PRESSURE: \$\{\{ needs\.plan\.outputs\.runner_pressure \}\}/);
  assert.match(runner,/VIBE2_24H_REFILL=SKIPPED_NO_CONTINUE_REQUIRED/);
  assert.match(runner,/VIBE2_24H_REFILL=DEFERRED_TO_SCHEDULE_RUNNER_PRESSURE/);
  assert.match(runner,/VIBE2_24H_REFILL_ACTIVE_SCHEDULER_OBSERVATION=UNAVAILABLE_FAIL_OPEN/);
  assert.match(runner,/VIBE2_24H_REFILL=SKIPPED_EXISTING_SCHEDULER:/);
  assert.match(runner,/VIBE2_24H_REFILL_PRESSURE_GATE=PASS/);
  assert.match(runner,/actions\/workflows\/vibe2-24h-runner\.yml\/dispatches/);
  assert.match(runner,/VIBE2_24H_REFILL=DISPATCHED/);
  assert.doesNotMatch(runner,/VIBE2_24H_DONE/);
});

test('24h scheduler wakes remain run-scoped while refill obeys the five-minute safety-net pressure contract',()=>{
  assert.match(runner,/group: vibe2-24h-cycle-\$\{\{ github\.run_id \}\}/);
  assert.match(runner,/exact_plan_wake:/);
  assert.match(runner,/VIBE2_24H_EXACT_PLAN_WAKE=COALESCED:/);
  assert.match(runner,/VIBE2_24H_EXACT_PLAN_WAKE=PASS_NO_OLDER_ACTIVE_PLAN:/);
  assert.match(runner,/String\(job\.name\|\|''\)==='plan'/);
  assert.match(runner,/needs\.exact_plan_wake\.outputs\.proceed == 'true'/);
  assert.doesNotMatch(runner,/String\(row\.event\|\|''\)===event/);
  assert.match(runner,/cancel-in-progress:\s*false/);
  assert.doesNotMatch(runner,/group: vibe2-24h-cycle-singleton-v9/);
  assert.match(runner,/cron: '\*\/5 \* \* \* \*'/);
  assert.match(runner,/if: \$\{\{ always\(\) \}\}[\s\S]*VIBE2_24H_REFILL=DEFERRED_TO_SCHEDULE_RUNNER_PRESSURE[\s\S]*VIBE2_24H_REFILL=SKIPPED_EXISTING_SCHEDULER:[\s\S]*actions\/workflows\/vibe2-24h-runner\.yml\/dispatches/);
});
