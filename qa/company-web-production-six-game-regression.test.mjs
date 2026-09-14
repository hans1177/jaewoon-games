import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildFirstPlayable} from '../tools/company-development-web-bootstrap.mjs';
import {deriveApprovedScopeInventory} from '../tools/company-approved-scope-contract.mjs';
import {
  WEB_VALIDATION_SCHEMA_VERSION,
  evaluateWebValidationEvidence,
  scoreWebStrictImplementation,
  sha256Text,
} from '../tools/company-web-validation-evidence-contract.mjs';

const REAL_GAMES=[
  {gameId:'seed-roblox-battleground-fight-welcome-to-bloxburg',gameName:'Vector Clash',seed:'SEED-ROBLOX-BATTLEGROUND_FIGHTING_SHOOTER-001',category:'BATTLEGROUND_FIGHTING_SHOOTER'},
  {gameId:'seed-roblox-simulator-tycoon-i-adopt-me',gameName:'Pocket Foundry',seed:'SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-001',category:'SIMULATOR_TYCOON_INCREMENTAL'},
];
const HARNESS_GAMES=[
  ['seed-roblox-obby-party-minigam-tower-of-hell','Skyline Sprint','SEED-ROBLOX-OBBY_PARTY_MINIGAME-001'],
  ['seed-roblox-roleplay-life-avat-brookhaven-rp','Harbor Days','SEED-ROBLOX-ROLEPLAY_LIFE_AVATAR-001'],
  ['seed-roblox-story-rpg-adventur-blox-fruits','Shardbound Odyssey','SEED-ROBLOX-STORY_RPG_ADVENTURE_RPG-001'],
  ['seed-roblox-survival-horror-es-doors','Last Lantern','SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001'],
];
const baseline=(seed,identity)=>({gameSeedId:seed,content:{identity,coreFun:'real playable core action with meaningful world state and objective progress',coreLoop:['perform the genre core gameplay action using real player input','change connected game state and earn progression or a meaningful reward','face risk or failure, finish the objective, and retry or continue'],mobileUx:'touch controls for the real gameplay surface'}});
function sourceFootprint(source){
  const scripts=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(row=>String(row[1]||''));
  const mechanicIds=[...new Set([...source.matchAll(/data-mechanic-id=["']([^"']+)["']/gi)].map(row=>row[1]).filter(Boolean))];
  return{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:Buffer.byteLength(source,'utf8'),scriptBytes:scripts.reduce((sum,text)=>sum+Buffer.byteLength(text,'utf8'),0),mechanicCount:mechanicIds.length,mechanicIds,proxyMarkers:0,stageButtons:false,winPathCount:1,failPathCount:1,retryPathCount:1,cycleContract:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'};
}
function initialEvidence(source,baselineHash){
  const footprint=sourceFootprint(source);
  return{
    version:WEB_VALIDATION_SCHEMA_VERSION,validationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,target:'web',validated:true,pass:true,
    gameplayInteractionPerformed:true,interactionCount:24,stateChanged:true,stateChangeCount:14,musicRuntime:{pass:true},runtimeSmokePassed:true,mobileViewport:{width:390,height:844,touch:true},
    sourceFootprint:footprint,substanceGate:{pass:true,implementationClass:'DEDICATED_REAL_GAME',totalBytes:footprint.totalBytes,executableBytes:footprint.scriptBytes,mechanicCount:footprint.mechanicCount,directSessionControls:0,proxyMarkers:0,initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE'},
    initialImplementationUnit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',initialPlayableCycle:{unit:'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE',pass:true,startWorldEntry:true,realPlayerInput:true,coreGameplayAction:true,actualStateChange:true,growthRewardOrMeaningfulChoice:true,riskFailureOrResourcePressure:true,goalOrCycleEnd:true,retryPath:true},initialPlayableCyclePassed:true,
    implementationMetrics:{uniqueMechanicCount:Math.max(5,footprint.mechanicCount),uniqueFunctionalUiCount:5,gameplayActionCount:24,stateVariableCount:10,meaningfulStateTransitionCount:14,uniqueGameplayStateCount:12,uniqueInteractedMechanicCount:5,systemDependencyCount:6,enemyOrWorldEntityCount:4,winPathCount:1,failPathCount:1,retryPathCount:1,gameplayScreenRatio:.45,duplicateActionRatio:.15,testUiRatio:0,contentVariationCount:0},
    contentDepthValidation:{mode:'FINAL_CONTENT_DEPTH_VALIDATION_ONLY',validationMode:'REAL_ELAPSED_GAMEPLAY',status:'PENDING_AFTER_CONTENT_EXPANSION',pass:false,targetMinutes:30,validatedMinutes:0,actualGameplayMinutes:0,elapsedRealMilliseconds:0,realContent:false,fakeProgress:false,testHarness:false,directStageClick:false,metrics:null,varietyEvents:[]},
    terminalOutcome:{required:true,reached:true,result:'victory'},scopeCoverage:{pass:true,mechanicBindings:footprint.mechanicIds.slice(0,5)},sourceIndexSha256:sha256Text(source),designBaselineSha256:baselineHash,strictReview:{totalScore:0,hardFailures:[]},webStrictScore:0,
  };
}
for(const row of REAL_GAMES){
  test(`${row.gameName} preserves actual source, passes initial real-game gate, and stays out of Top30 before final depth`,async()=>{
    const lockedBaseline=baseline(row.seed,row.gameName),inventory=deriveApprovedScopeInventory(lockedBaseline);assert.equal(inventory.length,5);
    const sourcePath=`web-games/${row.gameId}`;assert.equal(fs.existsSync(path.join(sourcePath,'index.html')),true,`${row.gameName} source missing`);
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-six-real-')),candidatePath=path.join(temp,'candidate');
    try{
      const built=await buildFirstPlayable({gameId:row.gameId,gameName:row.gameName,baseline:lockedBaseline,sourcePath,candidatePath,candidateId:'six-game-regression',sourceCommit:'test',model:'none'});
      assert.equal(built.generation.sourcePreserved,true);assert.equal(built.generation.modelInvoked,false);
      const source=fs.readFileSync(path.join(candidatePath,'index.html'),'utf8');
      assert.match(source,/data-playable-cycle-contract=["']ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE["']/);
      assert.doesNotMatch(source,/<button\b[^>]*(?:data-session-stage|data-content-depth-stage|data-validation-stage|data-test-stage)/i);
      assert.doesNotMatch(source,/data-session-minutes=["']30["']|PROGRESSION_MILESTONES/i);
      const baselineHash=sha256Text(JSON.stringify(lockedBaseline)),evidence=initialEvidence(source,baselineHash),strict=scoreWebStrictImplementation({category:row.category,sourceText:source,evidence});
      evidence.strictReview={totalScore:strict.totalScore,hardFailures:[...strict.hardFailures]};evidence.webStrictScore=strict.totalScore;
      assert.equal(strict.hardFailures.length,0,strict.hardFailures.join(','));assert.ok(strict.totalScore>=80,`${row.gameName} strict score ${strict.totalScore}`);
      const currentSourceSha256=sha256Text(source);
      const initial=evaluateWebValidationEvidence(evidence,{minimumScore:80,requireFinalContentDepth:false,currentSourceSha256,currentBaselineSha256:baselineHash});
      const final=evaluateWebValidationEvidence(evidence,{minimumScore:80,requireFinalContentDepth:true,currentSourceSha256,currentBaselineSha256:baselineHash});
      assert.equal(initial.pass,true,initial.blockers.join(','));assert.equal(final.pass,false);assert.equal(final.finalContentDepthPass,false);assert.ok(final.blockers.includes('WEB_FINAL_CONTENT_DEPTH_NOT_PASS'));
      console.log(`${row.gameName.toUpperCase().replaceAll(' ','_')}_INITIAL=PASS`);console.log(`${row.gameName.toUpperCase().replaceAll(' ','_')}_FINAL_DEPTH=FAIL`);console.log(`${row.gameName.toUpperCase().replaceAll(' ','_')}_TOP30=NO`);
    }finally{fs.rmSync(temp,{recursive:true,force:true});}
  });
}
for(const [gameId,gameName,seed] of HARNESS_GAMES){
  test(`${gameName} actual legacy harness is not preserved as a real game and returns to Production`,async()=>{
    const sourcePath=`web-games/${gameId}`,indexFile=path.join(sourcePath,'index.html');assert.equal(fs.existsSync(indexFile),true,`${gameName} source missing`);
    const raw=fs.readFileSync(indexFile,'utf8');assert.match(raw,/(?:scope-control-|FULL APPROVED WEB COMPANION|<button\b[^>]*data-session-stage)/i);
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-six-harness-')),candidatePath=path.join(temp,'candidate');
    try{
      await assert.rejects(()=>buildFirstPlayable({gameId,gameName,baseline:baseline(seed,gameName),sourcePath,candidatePath,candidateId:'six-game-harness-return',sourceCommit:'test',model:'none'}),/VIBE2_LOCAL_MODEL_REQUIRED/);
      assert.equal(fs.existsSync(path.join(candidatePath,'index.html')),false);console.log(`HARNESS_PRODUCTION_RETURN=${gameId}:PASS`);
    }finally{fs.rmSync(temp,{recursive:true,force:true});}
  });
}
