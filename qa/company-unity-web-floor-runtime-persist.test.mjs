import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const script=new URL('../tools/company-unity-web-floor-runtime-persist.mjs',import.meta.url);

function runCase(state,repairable){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-floor-persist-'));
  const queuePath=path.join(root,'development-queue.json');
  const evidencePath=path.join(root,'evidence.json');
  fs.writeFileSync(queuePath,JSON.stringify({version:1,items:[{
    gameId:'demo',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
    currentStep:'TARGET_PLATFORM_SOURCE_BIND',
    routingBlockers:['existing-blocker']
  }]}));
  fs.writeFileSync(evidencePath,JSON.stringify({
    gameId:'demo',state,repairable,
    failureStage:repairable?'Run Unity Web actual browser play':'Install Unity Hub and WebGL Editor',
    failureSignature:repairable?'ACTUAL_BROWSER_PLAY_FAILED':'UNITY_EDITOR_INFRASTRUCTURE',
    sourceRevision:'abc123',workflowRunId:42,workflowRunAttempt:2
  }));
  execFileSync(process.execPath,[script.pathname,queuePath,evidencePath],{stdio:'pipe'});
  const queue=JSON.parse(fs.readFileSync(queuePath,'utf8'));
  return{root,item:queue.items[0]};
}

test('Unity Web repair evidence is additive and never demotes native lifecycle state',()=>{
  const {root,item}=runCase('REPAIR_REQUIRED',true);
  try{
    assert.equal(item.currentStep,'TARGET_PLATFORM_SOURCE_BIND');
    assert.equal(item.unityWebDevelopmentFloorState,'REPAIR_REQUIRED');
    assert.equal(item.unityWebFailureRepairable,true);
    assert.equal(item.unityWebDevelopmentFloorEvidence.workflowRunId,42);
    assert.equal(item.unityWebDevelopmentFloorEvidence.sourceRevision,'abc123');
    assert.match(item.routingBlockers[0],/^unity-web-floor-repair-required:/);
    assert.ok(item.routingBlockers.includes('existing-blocker'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity Web infrastructure failure stays separate from source repair',()=>{
  const {root,item}=runCase('INFRASTRUCTURE_PENDING',false);
  try{
    assert.equal(item.unityWebDevelopmentFloorState,'INFRASTRUCTURE_PENDING');
    assert.equal(item.unityWebFailureRepairable,false);
    assert.match(item.routingBlockers[0],/^unity-web-floor-infrastructure-pending:/);
    assert.doesNotMatch(item.routingBlockers.join('\n'),/repair-required/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('Unity Web workflow persists failed stage and wakes Vibe only for repairable source failures',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  assert.match(workflow,/persist-repair:/);
  assert.match(workflow,/group: company-runtime-writer/);
  assert.match(workflow,/tools\/company-unity-web-floor-runtime-persist\.mjs/);
  assert.match(workflow,/UNITY_WEB_FLOOR_FAILURE_STATE=/);
  assert.match(workflow,/INFRASTRUCTURE_PENDING/);
  assert.match(workflow,/if: steps\.failure\.outputs\.repairable == 'true'/);
  assert.match(workflow,/gh workflow run vibe2-24h-runner\.yml/);
});
