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
    write(root,'development-queue.json',{version:1,items:[
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
    assert.equal(result.duplicateRemoved,1);
    assert.ok(result.removed.includes('paused'));
    assert.ok(result.removed.includes('missing-from-catalog'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});