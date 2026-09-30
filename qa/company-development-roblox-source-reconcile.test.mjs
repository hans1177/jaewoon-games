import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {applyRobloxStudioAssetBindingToExistingSource,compileRobloxSource,projectJsonForGame} from '../tools/company-development-roblox-bootstrap.mjs';
import {eligibleForRobloxSourceReconciliation,evaluateExistingRobloxSources,hasVerifiedVibe2SourceHandoff,validateExistingRobloxSourceTree} from '../tools/company-development-roblox-source-reconcile.mjs';
import {createRobloxVibe3LearningContext,verifiedExternalBlackBoxPlaybookContract} from '../tools/vibe3-roblox-learning-context.mjs';

const gameId='seed-roblox-simulator-tycoon-i-adopt-me';
const baseline={content:{identity:'Pocket Foundry',coreFun:'collect resources, upgrade production, earn income, unlock areas',coreLoop:['collect resources','upgrade production','unlock the next area'],mobileUx:'touch controls',progressionDirection:'Persistent progression system',platformProfiles:{ROBLOX:{platform:'ROBLOX',inputModel:'Roblox touch input and gamepad fallback',sessionModel:'Roblox private server session lifecycle',multiplayerRuntime:'Roblox server authoritative RemoteEvent synchronization',performanceBudget:'Mobile Roblox performance budget for frame memory network instances',uiUx:'Roblox ScreenGui touch-first interaction layout',saveAndNetwork:'DataStore and validated remote network boundaries',platformContentAdaptation:'Roblox native avatar camera scene and UI adaptation',internalReleaseTarget:'Private restricted Roblox owner playtest experience',validationEvidence:'Exact Roblox runtime independent QA regression evidence'}}}};
const companyAssetLibrary=JSON.parse(fs.readFileSync(new URL('../company-asset-library.json',import.meta.url),'utf8'));
const verifiedExternalRow={
  id:'external-black-box-fixture-run-1',
  project:'fixture-black-box',
  sourceRevision:'sha256:fixture',
  distilledApplicationPrinciples:['id=fixture-feedback; scope=mobile-feedback; lesson=visible response follows input; apply=keep immediate visible feedback'],
  distilledAvoidancePrinciples:['id=fixture-copy; scope=expression; lesson=do not copy proprietary expression; apply=preserve original expression'],
  distilledLearningUseAllowed:['interaction feedback'],
  distilledLearningUseForbidden:['source-code or asset copying']
};
const verifiedTask=()=>({authority:'verified-task-playbook',checklist:['apply verified black-box learning'],verifiedExternalBlackBoxReuseCount:1,verifiedExternalBlackBoxCoveragePct:100,reuse:[verifiedExternalRow]});
const verifiedPlaybooks={policy:{verifiedExternalBlackBoxAllTaskTypesRequired:true,verifiedExternalBlackBoxTruncationForbidden:true},taskTypes:{roblox:verifiedTask(),coding:verifiedTask(),graphics:verifiedTask(),general:verifiedTask(),qa:verifiedTask(),bugfix:verifiedTask(),planning:verifiedTask(),unity:verifiedTask()}};
const verifiedLearning=createRobloxVibe3LearningContext({gameId,profile:{genre:'Simulation',subgenre:'Tycoon',playMode:'SINGLE'},playbooks:verifiedPlaybooks});


function writeLegacyStudioUnboundTree(root){
  fs.mkdirSync(path.join(root,'shared'),{recursive:true});
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  fs.mkdirSync(path.join(root,'client'),{recursive:true});
  fs.writeFileSync(path.join(root,'default.project.json'),JSON.stringify(projectJsonForGame(gameId),null,2)+'\n');
  fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),`local Config = {
  PolicySource = "company-learning/platform-release-roadmap.json",
  Platform = "ROBLOX",
  MobileFirst = true,
  GameId = "${gameId}",
  GameName = "Pocket Foundry",
  Genre = "Simulation",
  PlayMode = "SINGLE",
  MultiplayerRequired = false,
  RemoteName = "GameAction",
  RateLimitSeconds = 0.1,
}
return table.freeze(Config)
`);
  fs.writeFileSync(path.join(root,'server','Game.server.luau'),'-- existing authoritative gameplay server source\n');
  fs.writeFileSync(path.join(root,'client','Game.client.luau'),`local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("GameConfig"))
local gui=Instance.new("ScreenGui")
gui.Parent=p:WaitForChild("PlayerGui")
local root=Instance.new("Frame")
root.BackgroundColor3=Color3.fromRGB(30,40,50)
root.Parent=gui
`);
}

function writeCompiledTree(root){
  const compiled=compileRobloxSource({gameId,gameName:'Pocket Foundry',baseline,artbook:{},playbooks:verifiedPlaybooks,assetLibrary:companyAssetLibrary});
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


test('source reconciliation skips only explicitly active owner-exclusive ids',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-owner-exclusive-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeCompiledTree(root);
    initGitRepo(tmp);
    const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const item={...staleItem(),currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',robloxSourceCommit:revision};
    const excluded=evaluateExistingRobloxSources({queue:{items:[item]},repoRoot:tmp,sourceRevision:revision,excludedGameIds:[gameId],loadBaseline:()=>baseline});
    assert.deepEqual(excluded,[]);
    const resumed=evaluateExistingRobloxSources({queue:{items:[item]},repoRoot:tmp,sourceRevision:revision,excludedGameIds:[],loadBaseline:()=>baseline});
    assert.equal(resumed.length,0);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
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
    assert.equal(changed[0].sourceTreeSha,execFileSync('git',['rev-parse',`HEAD:roblox-games/${gameId}`],{cwd:tmp,encoding:'utf8'}).trim());
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});


test('metadata-only Roblox bootstrap changes do not invalidate exact build evidence',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-source-metadata-only-'));
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
    fs.writeFileSync(path.join(root,'roblox-source-bootstrap.json'),JSON.stringify({version:2,learning:'metadata-only'})+'\n');
    execFileSync('git',['add',path.join('roblox-games',gameId,'roblox-source-bootstrap.json')],{cwd:tmp});
    execFileSync('git',['commit','-m','metadata only'],{cwd:tmp,stdio:'ignore'});
    const currentRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const rows=evaluateExistingRobloxSources({
      queue:{items:[item]},
      repoRoot:tmp,
      sourceRevision:currentRevision,
      loadBaseline:()=>baseline,
    });
    assert.deepEqual(rows,[]);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});


test('SOURCE_BIND debt revalidates unchanged exact Roblox source even when only unrelated repository files changed',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-source-bind-unchanged-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeCompiledTree(root);
    initGitRepo(tmp);
    const boundRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();

    fs.writeFileSync(path.join(tmp,'homepage-only.txt'),'unrelated change\n');
    execFileSync('git',['add','homepage-only.txt'],{cwd:tmp});
    execFileSync('git',['commit','-m','unrelated repository change'],{cwd:tmp,stdio:'ignore'});
    const currentRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();

    const item={
      ...staleItem(),
      robloxSourceCommit:boundRevision,
      robloxBuildOrPackagePassed:true,
      robloxBuildSourceRevision:boundRevision,
      robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
      robloxBuildPreflightPassed:true,
      robloxFoundationF0Passed:true,
    };
    const rows=evaluateExistingRobloxSources({
      queue:{items:[item]},
      repoRoot:tmp,
      sourceRevision:currentRevision,
      loadBaseline:()=>baseline,
    });

    assert.equal(rows.length,1,'SOURCE_BIND debt must be revalidated even when the exact game path did not change');
    assert.equal(rows[0].pass,true,rows[0].blockers.join(','));
    assert.equal(rows[0].sourceDrift,false);
    assert.equal(rows[0].preserveDownstreamEvidence,true);
    assert.equal(rows[0].sourceBindDebtResolved,true);
    assert.equal(rows[0].sourceRevision,boundRevision);
    assert.match(rows[0].sourceTreeSha,/^[0-9a-f]{40}$/);
    assert.notEqual(boundRevision,currentRevision);
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


test('current Roblox Studio asset binding version does not re-enter refresh forever',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-library-current-binding-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeCompiledTree(root);
    const applied=applyRobloxStudioAssetBindingToExistingSource({root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning});
    assert.equal(applied.studioAssets.bindingVersion,2);
    initGitRepo(tmp);
    const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const rows=evaluateExistingRobloxSources({
      queue:{items:[staleItem()]},
      repoRoot:tmp,
      sourceRevision:revision,
      assetLibrary:companyAssetLibrary,
      loadBaseline:()=>baseline,
    });
    assert.equal(rows.length,1);
    assert.equal(rows[0].failure,null,rows[0].blockers.join(','));
    assert.equal(rows[0].pass,true,rows[0].blockers.join(','));
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('existing Roblox source re-enters rebind when client asset binding is still v1',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-library-client-v1-detect-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeLegacyStudioUnboundTree(root);
    applyRobloxStudioAssetBindingToExistingSource({root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning});
    const clientFile=path.join(root,'client','Game.client.luau');
    const client=fs.readFileSync(clientFile,'utf8').replace(/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/,'STUDIO_ASSET_BINDING_VERSION = 1');
    fs.writeFileSync(clientFile,client);
    initGitRepo(tmp);
    const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const rows=evaluateExistingRobloxSources({
      queue:{items:[staleItem()]},
      repoRoot:tmp,
      sourceRevision:revision,
      assetLibrary:companyAssetLibrary,
      loadBaseline:()=>baseline,
    });
    assert.equal(rows.length,1);
    assert.equal(rows[0].pass,false);
    assert.equal(rows[0].failure,'existing-source-studio-asset-binding-required');
    assert.equal(rows[0].studioAssetBindingRefreshRequired,true);
    assert.ok(rows[0].blockers.includes('ROBLOX_STUDIO_ASSET_BINDING_REFRESH_REQUIRED'));
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('existing Roblox source automatically enters rebind when company library binding is missing even without source drift',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-library-rebind-detect-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeLegacyStudioUnboundTree(root);
    initGitRepo(tmp);
    const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const item={
      ...staleItem(),
      currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      robloxSourceCommit:revision,
    };
    const rows=evaluateExistingRobloxSources({
      queue:{items:[item]},
      repoRoot:tmp,
      sourceRevision:revision,
      assetLibrary:companyAssetLibrary,
      loadBaseline:()=>baseline,
    });
    assert.equal(rows.length,1);
    assert.equal(rows[0].pass,false);
    assert.equal(rows[0].failure,'existing-source-studio-asset-binding-required');
    assert.equal(rows[0].studioAssetBindingRefreshRequired,true);
    assert.equal(rows[0].studioAssetLibraryVersion,companyAssetLibrary.version);
    assert.match(rows[0].sourceTreeSha,/^[0-9a-f]{40}$/);
    assert.ok(rows[0].blockers.includes('ROBLOX_STUDIO_ASSET_BINDING_REFRESH_REQUIRED'));
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('existing Roblox client Studio asset binding v1 is upgraded in place to v2',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-library-client-v1-upgrade-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeLegacyStudioUnboundTree(root);
    applyRobloxStudioAssetBindingToExistingSource({root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning});
    const clientFile=path.join(root,'client','Game.client.luau');
    const v2=fs.readFileSync(clientFile,'utf8');
    fs.writeFileSync(clientFile,v2.replace(/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/,'STUDIO_ASSET_BINDING_VERSION = 1'));
    applyRobloxStudioAssetBindingToExistingSource({root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning});
    const upgraded=fs.readFileSync(clientFile,'utf8');
    assert.match(upgraded,/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/);
    assert.doesNotMatch(upgraded,/STUDIO_ASSET_BINDING_VERSION\s*=\s*1/);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('existing Roblox library rebind preserves gameplay server and updates only config plus client presentation binding',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-library-rebind-apply-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeLegacyStudioUnboundTree(root);
    const serverFile=path.join(root,'server','Game.server.luau');
    const serverBefore=fs.readFileSync(serverFile,'utf8');
    const applied=applyRobloxStudioAssetBindingToExistingSource({root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning});
    assert.equal(applied.existingSourcePreserved,true);
    assert.equal(applied.gameplayAuthorityChanged,false);
    assert.equal(applied.serverSourceChanged,false);
    assert.equal(fs.readFileSync(serverFile,'utf8'),serverBefore);
    const config=fs.readFileSync(path.join(root,'shared','GameConfig.luau'),'utf8');
    const client=fs.readFileSync(path.join(root,'client','Game.client.luau'),'utf8');
    assert.match(config,/STUDIO_ASSET_BINDING_BEGIN/);
    assert.match(config,/StudioAssets\s*=\s*\{/);
    assert.match(config,new RegExp('LibraryVersion\\s*=\\s*'+companyAssetLibrary.version));
    assert.match(client,/STUDIO_ASSET_BINDING_CLIENT_BEGIN/);
    assert.match(client,/C\.StudioAssets/);
    assert.match(client,/StudioAssetFramePanel/);
    assert.match(client,/StudioAssetAtoms/);
    applyRobloxStudioAssetBindingToExistingSource({root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning});
    const configAgain=fs.readFileSync(path.join(root,'shared','GameConfig.luau'),'utf8');
    const clientAgain=fs.readFileSync(path.join(root,'client','Game.client.luau'),'utf8');
    assert.equal((configAgain.match(/STUDIO_ASSET_BINDING_BEGIN/g)||[]).length,1);
    assert.equal((clientAgain.match(/STUDIO_ASSET_BINDING_CLIENT_BEGIN/g)||[]).length,1);
    assert.equal((clientAgain.match(/StudioAssetFramePanel/g)||[]).length,1);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('Roblox runtime persistence uses game source-tree identity instead of unrelated main SHA churn',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/reconciliationSourceTreeSha:String\(reconciliationRow\?\.sourceTreeSha\|\|''\)/);
  assert.match(workflow,/RECONCILIATION_SOURCE_TREE_SHA:/);
  assert.match(workflow,/ROBLOX_SOURCE_TREE_STALE_BEFORE_WORKER=/);
  assert.match(workflow,/git rev-parse "origin\/main:\$TARGET_SOURCE"/);
  assert.match(workflow,/origin\/main:\$\{result\.sourcePath\}/);
  assert.match(workflow,/sourceIdentityStale=reconciliationTreeSha/);
  assert.match(workflow,/ROBLOX_SOURCE_RECONCILIATION_UNRELATED_MAIN_ADVANCE_ACCEPTED=/);
});

test('Roblox runtime workflow watches library changes and routes existing sources through the same source PR lane',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/company-asset-library\.json/);
  assert.match(workflow,/company-development-roblox-source-reconcile\.mjs/);
  assert.match(workflow,/existingSourceAssetRebind/);
  assert.match(workflow,/existing-source-studio-asset-binding-required/);
  assert.match(workflow,/ROBLOX_EXISTING_SOURCE_ASSET_REBIND_EVIDENCE=PASS/);
});


test('verified external black-box contract is complete and fingerprinted for Roblox native development',()=>{
  const contract=verifiedExternalBlackBoxPlaybookContract(verifiedPlaybooks,{required:true,requiredTaskTypes:['roblox','coding']});
  assert.deepEqual(contract.ids,['external-black-box-fixture-run-1']);
  assert.equal(contract.coveragePct,100);
  assert.equal(contract.appliedCount,1);
  assert.ok(contract.fingerprint);
  assert.equal(verifiedLearning.applied,true);
  assert.equal(verifiedLearning.verifiedExternalLearningCoveragePct,100);
  assert.equal(verifiedLearning.verifiedExternalLearningFingerprint,contract.fingerprint);
});

test('existing Roblox source is re-queued when current verified APK learning is missing',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-learning-refresh-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeLegacyStudioUnboundTree(root);
    initGitRepo(tmp);
    const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const item={...staleItem(),currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',robloxSourceCommit:revision};
    const rows=evaluateExistingRobloxSources({queue:{items:[item]},repoRoot:tmp,sourceRevision:revision,assetLibrary:companyAssetLibrary,playbooks:verifiedPlaybooks,loadBaseline:()=>baseline});
    assert.equal(rows.length,1);
    assert.equal(rows[0].failure,'existing-source-verified-external-learning-required');
    assert.equal(rows[0].verifiedExternalLearningRefreshRequired,true);
    assert.ok(rows[0].blockers.includes('ROBLOX_VERIFIED_EXTERNAL_LEARNING_REFRESH_REQUIRED'));
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('existing Roblox source rebind applies all verified APK learning without changing gameplay server authority',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-learning-rebind-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeCompiledTree(root);
    const serverFile=path.join(root,'server','Game.server.luau');
    const serverBefore=fs.readFileSync(serverFile,'utf8');
    const applied=applyRobloxStudioAssetBindingToExistingSource({root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning});
    assert.equal(applied.verifiedExternalLearningApplied,true);
    assert.equal(applied.gameplayAuthorityChanged,false);
    assert.equal(fs.readFileSync(serverFile,'utf8'),serverBefore);
    const config=fs.readFileSync(path.join(root,'shared','GameConfig.luau'),'utf8');
    const client=fs.readFileSync(path.join(root,'client','Game.client.luau'),'utf8');
    assert.match(config,/VERIFIED_EXTERNAL_LEARNING_BINDING_BEGIN/);
    assert.match(config,/ContentComplete\s*=\s*true/);
    assert.match(config,/external-black-box-fixture-run-1/);
    assert.match(client,/VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN/);
    assert.match(client,/VerifiedExternalLearningContentComplete/);
    assert.match(client,/VerifiedExternalLearningPrincipleCount/);
    initGitRepo(tmp);
    const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
    const item={...staleItem(),currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',robloxSourceCommit:revision};
    const rows=evaluateExistingRobloxSources({queue:{items:[item]},repoRoot:tmp,sourceRevision:revision,assetLibrary:companyAssetLibrary,playbooks:verifiedPlaybooks,loadBaseline:()=>baseline});
    assert.equal(rows.length,0);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('verified APK refresh is owned by one Roblox sweep instead of duplicate per-game source jobs',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/existing-source-verified-external-learning-required/);
  assert.match(workflow,/ROBLOX_VERIFIED_LEARNING_SWEEP_OWNS_REBIND/);
  assert.match(workflow,/if\(existingSourceLearningRebind\)\{/);
  assert.match(workflow,/const existingSourceMaintenanceRebind=existingSourceAssetRebind;/);
});


test('verified APK principles drive the full Roblox native stack for new and existing source',()=>{
  const source=fs.readFileSync(new URL('../tools/company-development-roblox-bootstrap.mjs',import.meta.url),'utf8');
  const context=fs.readFileSync(new URL('../tools/vibe3-roblox-learning-context.mjs',import.meta.url),'utf8');
  assert.match(context,/verifiedExternalGameDevelopmentPrinciples=Object\.freeze\(\[\.\.\.verifiedExternalLearningPrinciples\]\)/);
  assert.doesNotMatch(context,/verifiedExternalLearningPrinciples\.filter\(gameDevelopmentPrinciple\)/);
  assert.match(source,/VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN/);
  assert.match(source,/VerifiedLearningColorGrade/);
  assert.match(source,/VerifiedLearningBloom/);
  assert.match(source,/syncVerifiedLearningCharacterMotion/);
  assert.match(source,/animator:GetPlayingAnimationTracks/);
  assert.match(source,/VerifiedLearningSkillImpact/);
  assert.match(source,/VerifiedLearningSkillSparkles/);
  assert.match(source,/FieldOfView/);
  assert.match(source,/VerifiedLearningTouchTarget/);
  assert.match(source,/VerifiedLearningProgressionRiskCue/);
  assert.match(source,/VerifiedExternalLearningGameplayState/);
  assert.match(source,/ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION=6/);
  assert.match(source,/ApplicationPrinciples = \{/);
  assert.match(source,/GameDevelopmentPrinciples = \{/);
  assert.doesNotMatch(source,/ROBLOX_GAME_DEVELOPMENT_PRINCIPLE_UNMAPPED/);
  assert.doesNotMatch(source,/CONFIG_VERIFIED_EXTERNAL_LEARNING_100_REQUIRED/);
  assert.match(source,/CONFIG_VERIFIED_EXTERNAL_LEARNING_CONTENT_REQUIRED/);
});


test('verified APK learning is unconditional across Roblox native gameplay axes',()=>{
  const source=fs.readFileSync(new URL('../tools/company-development-roblox-bootstrap.mjs',import.meta.url),'utf8');
  assert.match(source,/function requireRobloxVerifiedExternalLearning/);
  assert.doesNotMatch(source,/const nativeLearningRuntime=learning\.applied\?/);
  assert.doesNotMatch(source,/const learnedInput=learning\.applied\?/);
  assert.doesNotMatch(source,/generationMode:learning\.applied\?/);
  assert.match(source,/VerifiedLearningColorGrade/);
  assert.match(source,/VerifiedLearningBloom/);
  assert.match(source,/syncVerifiedLearningCharacterMotion/);
  assert.match(source,/VerifiedLearningSkillImpact/);
  assert.match(source,/VerifiedLearningSkillSparkles/);
  assert.match(source,/VerifiedLearningTouchTarget/);
  assert.match(source,/VerifiedLearningProgressionRiskCue/);
  assert.match(source,/VerifiedExternalLearningServerConfirmedAt/);
  assert.match(source,/playVerifiedLearningActionFeedback\(verifiedLearningLastControl\)/);
});


test('Roblox APK learning gate ignores server instrumentation and requires native application axes',()=>{
  const bootstrap=fs.readFileSync(new URL('../tools/company-development-roblox-bootstrap.mjs',import.meta.url),'utf8');
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.doesNotMatch(bootstrap,/SERVER_VIBE3_LEARNING_INSTRUMENTATION_REQUIRED/);
  assert.match(bootstrap,/ROBLOX_SEMANTIC_MAPPING_VERSION_REQUIRED/);
  assert.match(bootstrap,/GameSpecificSemanticMappings/);
  assert.match(bootstrap,/LearningDispositions/);
  assert.match(bootstrap,/QA_INFRASTRUCTURE_PRINCIPLE_IN_GAME_SOURCE/);
  assert.match(bootstrap,/SemanticMappingVersion/);
  assert.match(bootstrap,/BloomEffect/);
  assert.match(bootstrap,/AdjustSpeed/);
  assert.match(bootstrap,/VerifiedLearningSkillImpact/);
  assert.match(bootstrap,/Sparkles/);
  assert.match(bootstrap,/FieldOfView/);
  assert.match(bootstrap,/UISizeConstraint/);
  assert.match(bootstrap,/VerifiedLearningProgressionRiskCue/);
  assert.doesNotMatch(workflow,/learningOk[\s\S]{0,1000}gameplayAuthorityChanged/);
  assert.doesNotMatch(workflow,/learningOk[\s\S]{0,1000}serverSourceChanged/);
});


test('visual learning rebind does not require or inspect Roblox server source',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-visual-learning-no-server-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeLegacyStudioUnboundTree(root);
    fs.rmSync(path.join(root,'server','Game.server.luau'),{force:true});
    const applied=applyRobloxStudioAssetBindingToExistingSource({
      root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning,foundationRepair:false
    });
    assert.equal(applied.serverSourceChanged,false);
    assert.equal(fs.existsSync(path.join(root,'server','Game.server.luau')),false);
    const client=fs.readFileSync(path.join(root,'client','Game.client.luau'),'utf8');
    assert.match(client,/Atmosphere/);
    assert.match(client,/DepthOfFieldEffect/);
    assert.match(client,/AdjustSpeed/);
    assert.match(client,/ParticleEmitter/);
    assert.match(client,/PointLight/);
    assert.match(client,/VerifiedLearningSkillImpact/);
    assert.match(client,/FieldOfView/);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('foundation repair still requires Roblox server source',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-foundation-server-required-'));
  try{
    const root=path.join(tmp,'roblox-games',gameId);
    writeLegacyStudioUnboundTree(root);
    fs.rmSync(path.join(root,'server','Game.server.luau'),{force:true});
    assert.throws(()=>applyRobloxStudioAssetBindingToExistingSource({
      root,gameId,baseline,assetLibrary:companyAssetLibrary,learning:verifiedLearning,foundationRepair:true
    }),/EXISTING_ROBLOX_SOURCE_FILE_MISSING:Game\.server\.luau/);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});

test('verified APK native binding covers Roblox background motion and skill effects beyond UI',()=>{
  const source=fs.readFileSync(new URL('../tools/company-development-roblox-bootstrap.mjs',import.meta.url),'utf8');
  for(const signal of [
    'ColorCorrectionEffect','BloomEffect','Atmosphere','DepthOfFieldEffect',
    'AdjustSpeed','ParticleEmitter','PointLight','VerifiedLearningSkillImpact',
    'VerifiedLearningSkillParticles','VerifiedLearningSkillLight','FieldOfView'
  ])assert.match(source,new RegExp(signal));
});


test('Roblox native binding v6 requires semantic mapping and affected-scope signals',()=>{
  const bootstrap=fs.readFileSync(new URL('../tools/company-development-roblox-bootstrap.mjs',import.meta.url),'utf8');
  const reconcile=fs.readFileSync(new URL('../tools/company-development-roblox-source-reconcile.mjs',import.meta.url),'utf8');
  assert.match(bootstrap,/ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION=6/);
  for(const signal of ['SemanticMappingVersion','GameSpecificSemanticMappings','LearningDispositions','VerifiedLearningSemanticVariant','VerifiedLearningTouchTarget']){
    assert.match(bootstrap,new RegExp(signal));
    assert.match(reconcile,new RegExp(signal));
  }
});

test('existing Roblox Studio binding requires verified APK learning unconditionally',()=>{
  const source=fs.readFileSync(new URL('../tools/company-development-roblox-bootstrap.mjs',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('export function applyRobloxStudioAssetBindingToExistingSource'),source.indexOf('function sourceBlockers'));
  assert.match(fn,/const verifiedLearning=requireRobloxVerifiedExternalLearning\(learning\)/);
  assert.doesNotMatch(fn,/if\(learning\?\.applied===true\)/);
  assert.match(fn,/afterConfig=replaceOrInsertVerifiedExternalLearningConfig\(afterConfig,verifiedLearning\)/);
  assert.match(fn,/afterClient=bindExistingClientVerifiedExternalLearning\(afterClient,verifiedLearning\)/);
  assert.match(fn,/verifiedExternalLearningApplied:true/);
});


test('Roblox semantic mapping routes game-entry QA evidence to validation-only without blocking source application',()=>{
  const qaBoundaryRow={
    id:'external-black-box-qa-boundary-fixture',
    project:'fixture-black-box',
    sourceRevision:'sha256:qa-boundary',
    distilledApplicationPrinciples:[
      'id=tutorial-separated-from-game-entry; scope=mobile-rpg-onboarding; lesson=Tutorial is a distinct pre-game state.; apply=For RPG QA, preserve tutorial and live gameplay entry as separate milestones.',
      'id=first-run-friction-separated-from-game-entry; scope=mobile-rpg-onboarding; lesson=First-run setup is not gameplay.; apply=For Roblox/mobile QA, preserve onboarding and first live gameplay as separate milestones.',
      'id=world-entry-needs-load-window-before-input-proof; scope=mobile-runtime-evidence; lesson=World launch needs a load window before input proof.; apply=Bind input evidence to the post-load playable frame.',
      'id=narrative-onboarding-is-not-game-entry; scope=rpg-onboarding-qa; lesson=Narrative onboarding is a pre-game state.; apply=For Roblox RPG QA, separate narrative onboarding from controllable world entry.',
      'id=gameplay-state-must-be-visually-distinct-from-selection-state; scope=mobile-runtime-evidence; lesson=Selection state is not gameplay entry.; apply=Define GAME_ENTRY using visible gameplay-specific state.',
      'id=compact-tactical-state-with-immediate-feedback; scope=mobile-rpg-interaction; lesson=Compact tactical actions need immediate feedback.; apply=Keep bounded tactical actions visibly responsive.'
    ],
    distilledAvoidancePrinciples:[],
    distilledLearningUseAllowed:['interaction feedback'],
    distilledLearningUseForbidden:['source-code or asset copying']
  };
  const qaBoundaryTask=()=>({authority:'verified-task-playbook',checklist:[],reuse:[qaBoundaryRow]});
  const qaBoundaryPlaybooks={
    policy:{verifiedExternalBlackBoxAllTaskTypesRequired:true,verifiedExternalBlackBoxTruncationForbidden:true},
    taskTypes:{roblox:qaBoundaryTask(),coding:qaBoundaryTask()}
  };
  const learning=createRobloxVibe3LearningContext({
    gameId,
    profile:{genre:'Simulation',subgenre:'Tycoon',playMode:'SINGLE'},
    playbooks:qaBoundaryPlaybooks
  });
  const validationIds=new Set(
    learning.verifiedExternalLearningDispositions
      .filter(row=>row.disposition==='VALIDATION_ONLY')
      .map(row=>row.principleId)
  );
  for(const id of [
    'tutorial-separated-from-game-entry',
    'first-run-friction-separated-from-game-entry',
    'world-entry-needs-load-window-before-input-proof',
    'narrative-onboarding-is-not-game-entry',
    'gameplay-state-must-be-visually-distinct-from-selection-state'
  ])assert.ok(validationIds.has(id),id);
  assert.equal(learning.applied,true);
  assert.equal(learning.allRetrievedPrinciplesHaveExplicitDisposition,true);
  assert.ok(learning.verifiedExternalLearningDispositions.every(row=>row.disposition!=='FAIL_CLOSED'));
  assert.ok(learning.gameSpecificSemanticMappings.some(row=>row.principleId==='compact-tactical-state-with-immediate-feedback'));
});

test('Roblox semantic mapping keeps QA-only learning out of game-source application',()=>{
  assert.equal(verifiedLearning.allRetrievedPrinciplesHaveExplicitDisposition,true);
  assert.ok(verifiedLearning.gameSpecificSemanticMappings.length>0);
  assert.ok(verifiedLearning.verifiedExternalValidationOnlyPrincipleCount>=0);
  assert.ok(verifiedLearning.verifiedExternalLearningDispositions.every(row=>row.disposition!=='FAIL_CLOSED'));
  assert.doesNotMatch(JSON.stringify(verifiedLearning.verifiedExternalLearningPrinciples),/android|apk|hosted-emulator|qa-evidence/i);
});
test('stale Roblox technical workers drop before Rojo model and F0 without poisoning runtime state',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/Drop superseded Roblox technical work before heavy execution/);
  assert.match(workflow,/ROBLOX_TECHNICAL_SUPERSEDED=/);
  assert.match(workflow,/SOURCE_REVISION_MOVED/);
  assert.match(workflow,/VERIFIED_LEARNING_BINDING_STALE/);
  assert.match(workflow,/Install pinned Rojo package tool[\s\S]{0,120}if: steps\.freshness\.outputs\.superseded != 'true'/);
  assert.match(workflow,/superseded,\n\s+supersedeReason:/);
  assert.match(workflow,/ROBLOX_PACKAGE_SUPERSEDED_RESULT_IGNORED/);
  assert.match(workflow,/ROBLOX_TECHNICAL_WORK=SUPERSEDED/);
  assert.doesNotMatch(workflow,/max-parallel:\s*[0-9]+/);
});



test('runtime reconciliation preserves downstream evidence for unchanged game bytes',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const marker=workflow.indexOf('if(result.pass===true&&result.preserveDownstreamEvidence===true)');
  const reset=workflow.indexOf('if(result.pass===true){',marker);
  assert.ok(marker>0&&reset>marker);
  const block=workflow.slice(marker,reset);
  assert.match(block,/ROBLOX_UNCHANGED_SOURCE_DOWNSTREAM_EVIDENCE_PRESERVED=/);
  assert.match(block,/item\.robloxBuildArtifactIdentity/);
  assert.doesNotMatch(block,/robloxBuildArtifactIdentity:null/);
  assert.doesNotMatch(block,/robloxFoundationF0Passed:false/);
  assert.doesNotMatch(block,/robloxF9ReleaseRegressionPassed:false/);
});
