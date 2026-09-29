import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildFirstPlayable} from '../tools/company-development-web-bootstrap.mjs';
import {deriveApprovedScopeInventory,staticApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';

const ROADMAP=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const PERMANENTLY_REMOVED_IDS=[
  'seed-roblox-battleground-fight-welcome-to-bloxburg',
  'seed-roblox-obby-party-minigam-tower-of-hell',
];
const PERMANENTLY_REMOVED=new Set(PERMANENTLY_REMOVED_IDS);
const HISTORICAL_REAL_GAMES=[
  {gameId:'seed-roblox-simulator-tycoon-i-adopt-me',gameName:'Pocket Foundry',seed:'SEED-ROBLOX-SIMULATOR_TYCOON_INCREMENTAL-001'},
].filter(row=>!PERMANENTLY_REMOVED.has(row.gameId));
const HARNESS_GAMES=[
  ['seed-roblox-roleplay-life-avat-brookhaven-rp','Harbor Days','SEED-ROBLOX-ROLEPLAY_LIFE_AVATAR-001'],
  ['seed-roblox-story-rpg-adventur-blox-fruits','Shardbound Odyssey','SEED-ROBLOX-STORY_RPG_ADVENTURE_RPG-001'],
  ['seed-roblox-survival-horror-es-doors','Last Lantern','SEED-ROBLOX-SURVIVAL_HORROR_ESCAPE-001'],
].filter(([gameId])=>!PERMANENTLY_REMOVED.has(gameId));


test('permanently removed projects stay outside Web production regression',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.deepEqual([...roadmap.permanentProjectRemoval.ids].sort(),[...PERMANENTLY_REMOVED_IDS].sort());
  for(const gameId of PERMANENTLY_REMOVED){
    assert.equal(fs.existsSync(path.join('web-games',gameId,'index.html')),false,gameId);
    assert.equal(HISTORICAL_REAL_GAMES.some(row=>row.gameId===gameId),false,gameId);
    assert.equal(HARNESS_GAMES.some(row=>row[0]===gameId),false,gameId);
  }
});

const baseline=(seed,identity)=>({gameSeedId:seed,content:{identity,coreFun:'real playable core action with meaningful world state and objective progress',coreLoop:['perform the genre core gameplay action using real player input','change connected game state and earn progression or a meaningful reward','face risk or failure, finish the objective, and retry or continue'],mobileUx:'touch controls for the real gameplay surface'}});

test('permanently removed historical projects stay deleted and outside regression repair targets',()=>{
  const removed=[
    'seed-roblox-battleground-fight-welcome-to-bloxburg',
    'seed-roblox-obby-party-minigam-tower-of-hell'
  ];
  assert.deepEqual([...PERMANENTLY_REMOVED_IDS],removed);
  assert.equal(ROADMAP.permanentProjectRemoval.reentryAllowed,false);
  assert.equal(ROADMAP.permanentProjectRemoval.automaticRecoveryAllowed,false);
  assert.equal(ROADMAP.permanentProjectRemoval.automaticMaintenanceAllowed,false);
  for(const gameId of removed){
    assert.equal(fs.existsSync(path.join('web-games',gameId)),false,`${gameId} Web source must remain deleted`);
  }
});

for(const row of HISTORICAL_REAL_GAMES){
  test(`${row.gameName} is preserved as source but must return to Vibe when new semantic gates find missing behavior`,async()=>{
    const lockedBaseline=baseline(row.seed,row.gameName),inventory=deriveApprovedScopeInventory(lockedBaseline);assert.equal(inventory.length,5);
    const sourcePath=`web-games/${row.gameId}`,indexFile=path.join(sourcePath,'index.html');
    assert.equal(fs.existsSync(indexFile),true,`${row.gameName} source missing`);
    const raw=fs.readFileSync(indexFile,'utf8');
    const staticReview=staticApprovedScopeCoverage(raw,inventory);
    assert.equal(staticReview.pass,false,`${row.gameName} must not be grandfathered through stronger semantic gates`);
    assert.ok(staticReview.blockers.some(code=>code.startsWith('APPROVED_SCOPE_ITEM_MISSING:')||code.startsWith('APPROVED_SCOPE_MECHANIC_DIVERSITY_TOO_LOW:')),staticReview.blockers.join(','));
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'web-six-real-repair-')),candidatePath=path.join(temp,'candidate');
    try{
      await assert.rejects(()=>buildFirstPlayable({gameId:row.gameId,gameName:row.gameName,baseline:lockedBaseline,sourcePath,candidatePath,candidateId:'six-game-semantic-repair',sourceCommit:'test',model:'none'}),/VIBE_WEB_IMPLEMENTATION_REQUIRED/);
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
      await assert.rejects(()=>buildFirstPlayable({gameId,gameName,baseline:baseline(seed,gameName),sourcePath,candidatePath,candidateId:'six-game-harness-return',sourceCommit:'test',model:'none'}),/VIBE_WEB_IMPLEMENTATION_REQUIRED/);
      assert.equal(fs.existsSync(path.join(candidatePath,'index.html')),false);console.log(`HARNESS_PRODUCTION_RETURN=${gameId}:PASS`);
    }finally{fs.rmSync(temp,{recursive:true,force:true});}
  });
}