import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {compileRobloxSource,projectJsonForGame} from '../tools/company-development-roblox-bootstrap.mjs';
import {eligibleForRobloxSourceReconciliation,evaluateExistingRobloxSources,hasVerifiedVibe2SourceHandoff,validateExistingRobloxSourceTree} from '../tools/company-development-roblox-source-reconcile.mjs';

const gameId='seed-roblox-simulator-tycoon-i-adopt-me';
const baseline={content:{identity:'Pocket Foundry',coreFun:'collect resources, upgrade production, earn income, unlock areas',coreLoop:['collect resources','upgrade production','unlock the next area'],mobileUx:'touch controls',progressionDirection:'Persistent progression system',platformProfiles:{ROBLOX:{platform:'ROBLOX',inputModel:'Roblox touch input and gamepad fallback',sessionModel:'Roblox private server session lifecycle',multiplayerRuntime:'Roblox server authoritative RemoteEvent synchronization',performanceBudget:'Mobile Roblox performance budget for frame memory network instances',uiUx:'Roblox ScreenGui touch-first interaction layout',saveAndNetwork:'DataStore and validated remote network boundaries',platformContentAdaptation:'Roblox native avatar camera scene and UI adaptation',internalReleaseTarget:'Private restricted Roblox owner playtest experience',validationEvidence:'Exact Roblox runtime independent QA regression evidence'}}}};

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
    status:'ACTIVE',
    minimumDesignContract:{pass:true,source:`design/${gameId}/2026-09-12/design-revised.json`},
    platformDesignProfiles:{
      ROBLOX:{source:`design/${gameId}/2026-09-12/design-revised.json`,jsonPointer:'/content/platformProfiles/ROBLOX'},
      UNITY:{source:`design/${gameId}/2026-09-12/design-revised.json`,jsonPointer:'/content/platformProfiles/UNITY'}
    },
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    currentStep:'TARGET_PLATFORM_SOURCE_BIND',
    canonicalState:'PENDING_DUAL_NATIVE_SOURCE_BIND',
    designBaselineSource:`design/${gameId}/2026-09-12/design-revised.json`,
  };
}

function verifiedHandoffItem(sourceTreeSha='a'.repeat(40)){
  return {
    ...staleItem(),
    robloxVibe2VerifiedHandoff:{
      verified:true,
      gameId,
      sourceRevision:'b'.repeat(40),
      candidateSha:'c'.repeat(40),
      sourceTreeSha,
      qaRunId:35070803443,
    },
  };
}

function initGitRepo(tmp){
  execFileSync('git',['init'],{cwd:tmp,stdio:'ignore'});
  execFileSync('git',['config','user.email','test@example.com'],{cwd:tmp});
  execFileSync('git',['config','user.name','test'],{cwd:tmp});
  execFileSync('git',['add','.'],{cwd:tmp});
  execFileSync('git',['commit','-m','fixture'],{cwd:tmp,stdio:'ignore'});
}

test('minimum-design Roblox SOURCE_BIND items are eligible for source reconciliation',()=>{
  assert.equal(eligibleForRobloxSourceReconciliation(staleItem()),true);
  assert.equal(eligibleForRobloxSourceReconciliation({...staleItem(),currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION'}),false);
  assert.equal(eligibleForRobloxSourceReconciliation({...staleItem(),minimumDesignContract:{pass:false}}),false);
  assert.equal(eligibleForRobloxSourceReconciliation({...staleItem(),platformDesignProfiles:{ROBLOX:staleItem().platformDesignProfiles.ROBLOX}}),false);
});


test('bound Roblox games re-enter reconciliation only when their own source tree changed',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-source-drift-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeCompiledTree(root);
    initGitRepo(tmp);
    const boundRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const item={
      ...staleItem(),
      currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      robloxSourceCommit:boundRevision,
      robloxInternalReleaseReady:true,
      robloxRuntimePassed:true,
    };
    assert.equal(eligibleForRobloxSourceReconciliation(item),true);
    const unchanged=evaluateExistingRobloxSources({
      queue:{items:[item]},
      repoRoot:tmp,
      sourceRevision:boundRevision,
      loadBaseline:()=>baseline,
    });
    assert.equal(unchanged.length,0);

    fs.appendFileSync(path.join(root,'server','Game.server.luau'),'\n-- exact main source drift\n');
    execFileSync('git',['add','.'],{cwd:tmp});
    execFileSync('git',['commit','-m','change game source'],{cwd:tmp,stdio:'ignore'});
    const currentRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const changed=evaluateExistingRobloxSources({
      queue:{items:[item]},
      repoRoot:tmp,
      sourceRevision:currentRevision,
      loadBaseline:()=>baseline,
    });
    assert.equal(changed.length,1);
    assert.equal(changed[0].pass,true,changed[0].blockers.join(','));
    assert.equal(changed[0].sourceDrift,true);
    assert.equal(changed[0].sourceRevision,currentRevision);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('Roblox runtime source rebind atomically invalidates stale downstream evidence',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/Revalidate exact-main Roblox source already merged/);
  assert.match(workflow,/fetch-depth: 1/);
  assert.match(workflow,/roblox-bound-source-revisions/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin "\$revision"/);
  assert.match(workflow,/mkdir -p \/tmp\/roblox-homepage-sync\/tools \/tmp\/roblox-homepage-sync\/company-learning/);
  assert.match(workflow,/origin\/main:tools\/company-homepage-platform-exposure-sync\.mjs/);
  assert.match(workflow,/origin\/main:tools\/company-shared-context\.mjs/);
  assert.match(workflow,/origin\/main:company-learning\/platform-release-roadmap\.json/);
  assert.match(workflow,/node \/tmp\/roblox-homepage-sync\/tools\/company-homepage-platform-exposure-sync\.mjs/);
  assert.doesNotMatch(workflow,/git checkout origin\/main -- tools\/company-homepage-platform-exposure-sync\.mjs/);
  assert.doesNotMatch(workflow,/homepage-platform-exposure\.json homepage-platform-exposure\.json/);
  for(const pattern of [
    /robloxBuildOrPackagePassed:false/,
    /robloxBuildArtifactIdentity:null/,
    /robloxFoundationF0Passed:false/,
    /robloxRuntimeCandidateEvidence:null/,
    /robloxRuntimeFoundationEvidence:null/,
    /robloxRuntimePassed:false/,
    /robloxIndependentQaPassed:false/,
    /robloxRegressionPassed:false/,
    /robloxFinalReviewPassed:false/,
    /robloxF9ReleaseRegressionPassed:false/,
    /robloxInternalReleaseReady:false/,
    /robloxInternalReleaseEvidence:null/,
    /robloxReleaseEvidence:null/,
  ]) assert.match(workflow,pattern);
});

test('verified Vibe2 Studio handoff remains readable but does not replace minimum-design admission',()=>{
  const item=verifiedHandoffItem();
  assert.equal(hasVerifiedVibe2SourceHandoff(item),true);
  assert.equal(eligibleForRobloxSourceReconciliation(item),true);
  assert.equal(eligibleForRobloxSourceReconciliation({...item,currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION'}),false);
  assert.equal(hasVerifiedVibe2SourceHandoff({...item,robloxVibe2VerifiedHandoff:{...item.robloxVibe2VerifiedHandoff,qaRunId:0}}),false);
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

test('verified Vibe2 handoff accepts only the exact pinned Roblox source tree without reapplying legacy bootstrap validation',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-vibe2-handoff-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeCompiledTree(root);
    fs.writeFileSync(path.join(root,'server','Game.server.luau'),'-- Vibe2 Studio-verified custom server source\n');
    initGitRepo(tmp);
    const sourcePath=`roblox-games/${gameId}`;
    const sourceTreeSha=execFileSync('git',['rev-parse',`HEAD:${sourcePath}`],{cwd:tmp,encoding:'utf8'}).trim();
    const item=verifiedHandoffItem(sourceTreeSha);
    const pass=evaluateExistingRobloxSources({
      queue:{items:[item]},
      repoRoot:tmp,
      sourceRevision:'verified-main-sha',
      loadBaseline:()=>{throw new Error('legacy validator must not run for exact verified handoff');},
    });
    assert.equal(pass.length,1);
    assert.equal(pass[0].pass,true,pass[0].blockers.join(','));
    assert.equal(pass[0].authority,'verified-vibe2-source-handoff');

    fs.appendFileSync(path.join(root,'server','Game.server.luau'),'\n-- source drift\n');
    execFileSync('git',['add','.'],{cwd:tmp});
    execFileSync('git',['commit','-m','drift'],{cwd:tmp,stdio:'ignore'});
    const fail=evaluateExistingRobloxSources({queue:{items:[item]},repoRoot:tmp,sourceRevision:'drifted-main-sha',loadBaseline:()=>baseline});
    assert.equal(fail.length,1);
    assert.equal(fail[0].pass,false);
    assert.equal(fail[0].failure,'verified-vibe2-source-handoff-mismatch');
    assert.ok(fail[0].blockers.includes('VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_MISMATCH'));
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
