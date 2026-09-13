import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileRobloxSource,projectJsonForGame} from '../tools/company-development-roblox-bootstrap.mjs';
import {eligibleForRobloxSourceReconciliation,evaluateExistingRobloxSources,validateExistingRobloxSourceTree} from '../tools/company-development-roblox-source-reconcile.mjs';

const gameId='seed-roblox-simulator-tycoon-i-adopt-me';
const baseline={content:{identity:'Pocket Foundry',coreFun:'collect resources, upgrade production, earn income, unlock areas',coreLoop:['collect resources','upgrade production','unlock the next area'],mobileUx:'touch controls',progressionDirection:'Persistent progression system'}};

function writeCompiledTree(root){
  const compiled=compileRobloxSource({gameId,gameName:'Pocket Foundry',baseline,artbook:{}});
  fs.mkdirSync(path.join(root,'shared'),{recursive:true});
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  fs.mkdirSync(path.join(root,'client'),{recursive:true});
  fs.writeFileSync(path.join(root,'default.project.json'),JSON.stringify(projectJsonForGame(gameId),null,2)+'\n');
  fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),compiled.result.sharedConfig);
  fs.writeFileSync(path.join(root,'server','Game.server.luau'),compiled.result.serverCode);
  fs.writeFileSync(path.join(root,'client','Game.client.luau'),compiled.result.clientCode);
}

function staleItem(){
  return {
    gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'ROBLOX',
    targetPlatform:'ROBLOX',
    webValidationPassedAt:'2026-09-13T00:00:00.000Z',
    musicValidationPassed:true,
    currentStep:'TARGET_PLATFORM_SOURCE_BIND',
    canonicalState:'WAITING_TARGET_PLATFORM_REVALIDATION',
    designBaselineSource:`design/${gameId}/2026-09-12/design-revised.json`,
  };
}

test('only stale Web-validated Roblox SOURCE_BIND items are eligible for source reconciliation',()=>{
  assert.equal(eligibleForRobloxSourceReconciliation(staleItem()),true);
  assert.equal(eligibleForRobloxSourceReconciliation({...staleItem(),currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION'}),false);
  assert.equal(eligibleForRobloxSourceReconciliation({...staleItem(),selectedPlatform:'UNITY'}),false);
  assert.equal(eligibleForRobloxSourceReconciliation({...staleItem(),musicValidationPassed:false}),false);
});

test('exact existing Roblox source tree passes static reconciliation with persistent save evidence',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-reconcile-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeCompiledTree(root);
    const verdict=validateExistingRobloxSourceTree({root,baseline});
    assert.equal(verdict.pass,true,verdict.blockers.join(','));
    assert.equal(verdict.saveRequired,true);
    const results=evaluateExistingRobloxSources({
      queue:{items:[staleItem()]},
      repoRoot:tmp,
      sourceRevision:'exact-main-sha',
      loadBaseline:()=>baseline,
    });
    assert.equal(results.length,1);
    assert.equal(results[0].pass,true,results[0].blockers.join(','));
    assert.equal(results[0].sourceRevision,'exact-main-sha');
    assert.equal(results[0].sourcePath,`roblox-games/${gameId}`);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('existing source reconciliation refuses malformed source instead of advancing it',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-reconcile-bad-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeCompiledTree(root);
    fs.writeFileSync(path.join(root,'server','Game.server.luau'),'-- TODO placeholder\n');
    const results=evaluateExistingRobloxSources({
      queue:{items:[staleItem()]},
      repoRoot:tmp,
      sourceRevision:'exact-main-sha',
      loadBaseline:()=>baseline,
    });
    assert.equal(results.length,1);
    assert.equal(results[0].pass,false);
    assert.equal(results[0].failure,'existing-source-static-revalidation-failed');
    assert.ok(results[0].blockers.includes('SERVER_PLACEHOLDER_FORBIDDEN'));
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
