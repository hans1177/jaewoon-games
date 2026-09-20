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
  assert.equal(rule?.ownerExplicitStopRequired,true);
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

test('empty queue game study success is a continuation trigger, not a terminal stop',()=>{
  assert.match(runner,/needs\.game_study\.result == 'success'/);
  assert.match(runner,/actions\/workflows\/vibe2-24h-runner\.yml\/dispatches/);
  assert.doesNotMatch(runner,/VIBE2_24H_DONE/);
});
