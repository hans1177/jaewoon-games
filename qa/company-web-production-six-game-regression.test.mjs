import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildFirstPlayable} from '../tools/company-development-web-bootstrap.mjs';
import {deriveApprovedScopeInventory,staticApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';

const HISTORICAL_REAL_GAMES=[
  {gameId:'seed-roblox-battleground-fight-welcome-to-bloxburg',gameName:'Vector Clash',seed:'SEED-ROBLOX-BATTLEGROUND_FIGHTING_SHOOTER-001'},
  {gameId:'seed-roblox-simulator-tycoon-i-adopt-me',gameName:'Pocket Foundry',seed:'SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-001'},
];
const HARNESS_GAMES=[
  ['seed-roblox-obby-party-minigam-tower-of-hell','Skyline Sprint','SEED-ROBLOX-OBBY_PARTY_MINIGAME-001'],
  ['seed-roblox-roleplay-life-avat-brookhaven-rp','Harbor Days','SEED-ROBLOX-ROLEPLAY_LIFE_AVATAR-001'],
  ['seed-roblox-story-rpg-adventur-blox-fruits','Shardbound Odyssey','SEED-ROBLOX-STORY_RPG_ADVENTURE_RPG-001'],
  ['seed-roblox-survival-horror-es-doors','Last Lantern','SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001'],
];
const baseline=(seed,identity)=>({gameSeedId:seed,content:{identity,coreFun:'real playable core action with meaningful world state and objective progress',coreLoop:['perform the genre core gameplay action using real player input','change connected game state and earn progression or a meaningful reward','face risk or failure, finish the objective, and retry or continue'],mobileUx:'touch controls for the real gameplay surface'}});

for(const row of HISTORICAL_REAL_GAMES){
  test(`${row.gameName} is preserved as source but must return to Vibe when new semantic gates find missing behavior`,async()=>{
    const lockedBaseline=baseline(row.seed,row.gameName),inventory=deriveApprovedScopeInventory(lockedBaseline);assert.equal(inventory.length,5);
    const sourcePath=`web-games/${row.gameId}`,indexFile=path.join(sourcePath,'index.html');
    assert.equal(fs.existsSync(indexFile),true,`${row.gameName} source missing`);
    const raw=fs.readFileSync(indexFile,'utf8');
    const staticReview=staticApprovedScopeCoverage(raw,inventory);
    assert.equal(staticReview.pass,false,`${row.gameName} must not be grandfathered through stronger semantic gates`);
    assert.ok(staticReview.blockers.some(code=>/REAL_(?:SPATIAL_STATE|ENTITY_INTERACTION)|TOWER_POSITION_INPUT/.test(code)),staticReview.blockers.join(','));
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-six-real-repair-')),candidatePath=path.join(temp,'candidate');
    try{
      await assert.rejects(()=>buildFirstPlayable({gameId:row.gameId,gameName:row.gameName,baseline:lockedBaseline,sourcePath,candidatePath,candidateId:'six-game-semantic-repair',sourceCommit:'test',model:'none'}),/VIBE2_LOCAL_MODEL_REQUIRED/);
      assert.equal(fs.existsSync(path.join(candidatePath,'index.html')),false,'a shallow source must not be copied forward as a pass');
      console.log(`HISTORICAL_SOURCE_REPAIR_REQUIRED=${row.gameId}:PASS`);
    }finally{fs.rmSync(temp,{recursive:true,force:true});}
  });
}

for(const [gameId,gameName,seed] of HARNESS_GAMES){
  test(`${gameName} actual legacy harness is not preserved as a real game and returns to Vibe development`,async()=>{
    const sourcePath=`web-games/${gameId}`,indexFile=path.join(sourcePath,'index.html');assert.equal(fs.existsSync(indexFile),true,`${gameName} source missing`);
    const raw=fs.readFileSync(indexFile,'utf8');assert.match(raw,/(?:scope-control-|FULL APPROVED WEB COMPANION|<button\b[^>]*data-session-stage)/i);
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-six-harness-')),candidatePath=path.join(temp,'candidate');
    try{
      await assert.rejects(()=>buildFirstPlayable({gameId,gameName,baseline:baseline(seed,gameName),sourcePath,candidatePath,candidateId:'six-game-harness-return',sourceCommit:'test',model:'none'}),/VIBE2_LOCAL_MODEL_REQUIRED/);
      assert.equal(fs.existsSync(path.join(candidatePath,'index.html')),false);console.log(`HARNESS_PRODUCTION_RETURN=${gameId}:PASS`);
    }finally{fs.rmSync(temp,{recursive:true,force:true});}
  });
}