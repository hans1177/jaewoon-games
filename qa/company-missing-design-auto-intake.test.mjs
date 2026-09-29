import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {autoEnrollMissingDesignSeeds,latestUsableDesign} from '../tools/company-all-games-design-reset.mjs';
import {validateGameSeed} from '../tools/company-game-seed-contract.mjs';

function tempRepo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'missing-design-intake-'));
  fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({
    games:[
      {id:'needs-design',name:'Needs Design',description:'월드에서 적을 상대하고 보상으로 다음 지역을 여는 액션 게임',genre:['액션','성장'],lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX',multiplayerSupported:true},
      {id:'already-designed',name:'Already Designed',description:'existing',genre:['RPG'],lifecycleState:'ACTIVE',selectedPlatform:'UNITY'},
      {id:'retired',name:'Retired',description:'retired',genre:['CASUAL'],lifecycleState:'RETIRED',selectedPlatform:'ROBLOX'}
    ],
    permanentRemovalPolicy:{ids:[]}
  },null,2));
  fs.writeFileSync(path.join(root,'game-seed-state.json'),JSON.stringify({version:2,seeds:[]},null,2));
  const designDir=path.join(root,'design','already-designed','2026-09-25');
  fs.mkdirSync(designDir,{recursive:true});
  fs.writeFileSync(path.join(designDir,'design-revised.json'),JSON.stringify({gameId:'already-designed',content:{identity:'충분히 구체적인 기존 게임 정체성',coreFun:'실제 입력과 선택이 이어지는 핵심 재미',coreLoop:['입력한다','상태가 변한다','다음 목표로 간다']}},null,2));
  return root;
}

test('active game without design receives one canonical GAME_SEED intake and is idempotent',()=>{
  const root=tempRepo();
  try{
    const first=autoEnrollMissingDesignSeeds({root,timestamp:'2026-09-25T00:00:00Z'});
    assert.deepEqual(first.created,['needs-design']);
    assert.deepEqual(first.designPresent,['already-designed']);
    const state=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
    assert.equal(state.seeds.length,1);
    const seed=state.seeds[0];
    assert.equal(seed.gameId,'needs-design');
    assert.equal(seed.generation,'AUTO_MISSING_DESIGN_INTAKE');
    assert.equal(seed.status,'ACTIVE');
    assert.equal(validateGameSeed(seed).pass,true);
    assert.equal(seed.MULTIPLAYER_DESIGN_MODE,'HYBRID');

    const second=autoEnrollMissingDesignSeeds({root,timestamp:'2026-09-25T00:01:00Z'});
    assert.equal(second.created.length,0);
    assert.deepEqual(second.alreadySeeded,['needs-design']);
    const state2=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
    assert.equal(state2.seeds.length,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('targeted auto intake skips games that already have a usable revised design',()=>{
  const root=tempRepo();
  try{
    assert.ok(latestUsableDesign(root,'already-designed'));
    const result=autoEnrollMissingDesignSeeds({root,gameId:'already-designed'});
    assert.deepEqual(result.created,[]);
    assert.deepEqual(result.designPresent,['already-designed']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
