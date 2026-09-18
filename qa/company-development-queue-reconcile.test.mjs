import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {reconcileDevelopmentQueue} from '../tools/company-development-queue-reconcile.mjs';

const write=(root,file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value,null,2));};

test('guarantees active confirmed games, preserves progress, removes inactive and duplicates',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'queue-reconcile-'));
  try{
    write(root,'game-catalog.json',{games:[
      {id:'cozy-island',name:'포근섬',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'},
      {id:'progressed',name:'진행게임',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'REBUILD'},
      {id:'paused',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'PAUSED'},
      {id:'design-only',productionClass:'DESIGN_ONLY',lifecycleState:'ACTIVE'}
    ]});
    write(root,'web-games/cozy-island/index.html','<!doctype html><canvas></canvas>');
    write(root,'company-learning/platform-release-roadmap.json',{developmentSpeedExecution:{globalSelectedPlatformDevelopmentWipMax:20}});
    write(root,'development-queue.json',{version:1,routerPolicy:'COMPANY_FLOW.md',developmentGameWipMax:6,items:[
      {gameId:'progressed',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'WEB_CONTENT_EXPANSION',canonicalState:'RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION',customEvidence:'KEEP'},
      {gameId:'progressed',gameName:'중복'},
      {gameId:'paused',currentStep:'WEB_PLAYABLE_BOOTSTRAP'},
      {gameId:'missing-from-catalog',currentStep:'WEB_PLAYABLE_BOOTSTRAP'}
    ]});

    const result=reconcileDevelopmentQueue({root});
    const queue=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8'));
    const ids=queue.items.map(x=>x.gameId);
    assert.deepEqual(ids.sort(),['cozy-island','progressed']);
    assert.equal(ids.filter(x=>x==='progressed').length,1);
    const progressed=queue.items.find(x=>x.gameId==='progressed');
    assert.equal(progressed.currentStep,'WEB_CONTENT_EXPANSION');
    assert.equal(progressed.canonicalState,'RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION');
    assert.equal(progressed.customEvidence,'KEEP');
    const cozy=queue.items.find(x=>x.gameId==='cozy-island');
    assert.equal(cozy.currentStep,'WEB_GAMEPLAY_AND_MUSIC_VALIDATION');
    assert.equal(cozy.existingGameContinuation,true);
    assert.equal(cozy.webValidationRequired,true);
    assert.equal(cozy.musicValidationRequired,true);
    assert.equal(queue.routerPolicy,'company-learning/platform-release-roadmap.json');
    assert.equal(queue.developmentGameWipMax,20);
    assert.equal(result.routerPolicy,'company-learning/platform-release-roadmap.json');
    assert.equal(result.duplicateRemoved,1);
    assert.ok(result.removed.includes('paused'));
    assert.ok(result.removed.includes('missing-from-catalog'));

    const repeat=reconcileDevelopmentQueue({root});
    assert.equal(repeat.changed,false);
    assert.equal(repeat.routerPolicy,'company-learning/platform-release-roadmap.json');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('repairs stale router policy even when canonical queue items are already stable',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'queue-policy-reconcile-'));
  try{
    write(root,'game-catalog.json',{games:[]});
    write(root,'company-learning/platform-release-roadmap.json',{developmentSpeedExecution:{globalSelectedPlatformDevelopmentWipMax:20}});
    write(root,'development-queue.json',{version:1,routerPolicy:'COMPANY_FLOW.md',developmentGameWipMax:6,items:[]});
    const result=reconcileDevelopmentQueue({root});
    const queue=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8'));
    assert.equal(result.changed,true);
    assert.equal(queue.routerPolicy,'company-learning/platform-release-roadmap.json');
    assert.equal(queue.developmentGameWipMax,20);
    assert.equal(reconcileDevelopmentQueue({root}).changed,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('empty canonical queue does not redispatch development runtime',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-queue-reconcile.yml','utf8');
  assert.match(workflow,/id:\s*queue_state/);
  assert.match(workflow,/queue_count=.*development-queue\.json/);
  assert.match(workflow,/steps\.queue_state\.outputs\.queue_count != '0'/);
  assert.doesNotMatch(workflow,/name: Dispatch development runtime\n\s*if:\s*\$\{\{\s*always\(\) && !cancelled\(\)\s*\}\}/);
  assert.match(workflow,/git checkout origin\/main -- tools\/company-development-queue-reconcile\.mjs company-learning\/platform-release-roadmap\.json/);
  assert.doesNotMatch(workflow,/git checkout origin\/main --[^\n]*game-catalog\.json/);
});
