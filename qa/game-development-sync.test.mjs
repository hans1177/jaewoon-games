import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildGameDevelopmentMap,GAME_PLATFORM_ROOTS} from '../tools/game-development-sync.mjs';

const sample=()=> {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'game-dev-sync-'));
  const add=(rel,contents='')=>{const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,contents)};
  add('game-catalog.json',JSON.stringify({games:[
    {id:'alpha',name:'First Game',productionClass:'DEVELOPMENT_CONFIRMED',
      robloxProjectPath:'roblox-games/alpha'},
    {id:'beta',name:'Second Game',productionClass:'DEVELOPMENT_CONFIRMED'}
  ]}));
  add('web-games/alpha/index.html','<html>First Game</html>');
  add('qa/alpha-gameplay.test.mjs','');
  add('qa/beta-save.test.mjs','');
  add('roblox-games/unlisted/default.project.json',JSON.stringify({name:'Unlisted Game'}));
  add('assets/external/unlisted/manifest.json',JSON.stringify({sourceOnly:true}));
  add('godot-games/beta/project.godot','');
  return root;
};
const withSample=fn=>{const root=sample();try{fn(root)}finally{fs.rmSync(root,{recursive:true,force:true})}};
test('discovers every cataloged game and source-only game without inventing build or publish success',()=>{
  withSample(repoRoot=>{
    const result=buildGameDevelopmentMap({repoRoot});
    assert.equal(result.stats.registeredGameCount,2);
    assert.equal(result.stats.selectedGameCount,3);
    assert.equal(result.stats.sourceOnlyGameCount,1);
    assert.equal(result.games.find(g=>g.gameId==='alpha').sources.WEB,'web-games/alpha');
    assert.equal(result.games.find(g=>g.gameId==='beta').sources.GODOT,'godot-games/beta');
    const orphan=result.games.find(g=>g.gameId==='unlisted');
    assert.equal(orphan.gameName,'Unlisted Game');
    assert.equal(orphan.cataloged,false);
    assert.deepEqual(orphan.assetLinks,[
      'assets/external/unlisted/manifest.json',
      'roblox-games/unlisted/default.project.json'
    ]);
    for(const game of result.games){
      assert.equal(game.publicationStatus,'NOT_VERIFIED_BY_SYNC');
      assert.equal(game.runtimeStatus,'NOT_RUN_BY_SYNC');
    }
  });
});
test('only game-relevant QA is linked, without global constitution/security gates',()=>{
  withSample(repoRoot=>{
    const data=buildGameDevelopmentMap({repoRoot});
    assert.deepEqual(data.games.find(g=>g.gameId==='alpha').qa,['qa/alpha-gameplay.test.mjs']);
    assert.deepEqual(data.games.find(g=>g.gameId==='beta').qa,['qa/beta-save.test.mjs']);
    assert.deepEqual(data.games.find(g=>g.gameId==='unlisted').qa,[]);
  });
});
test('a missing declared source is reported without blocking other games',()=>{
  withSample(repoRoot=>{
    const data=buildGameDevelopmentMap({repoRoot});
    assert.ok(data.games.find(g=>g.gameId==='alpha').sourceIssues
      .includes('CATALOG_SOURCE_NOT_FOUND:roblox-games/alpha'));
    assert.equal(data.stats.gamesWithSource,3);
  });
});
test('one game can be queried independently and missing requested game is rejected',()=>{
  withSample(repoRoot=>{
    const result=buildGameDevelopmentMap({repoRoot,gameId:'unlisted'});
    assert.equal(result.games.length,1);
    assert.equal(result.scope,'unlisted');
    assert.throws(()=>buildGameDevelopmentMap({repoRoot,gameId:'missing'}),/GAME_ID_NOT_FOUND/);
  });
});
test('duplicate game identifiers are rejected instead of silently overwriting',()=>{
  withSample(repoRoot=>{
    fs.writeFileSync(path.join(repoRoot,'game-catalog.json'),
      JSON.stringify({games:[{id:'alpha'},{id:'alpha'}]}));
    assert.throws(()=>buildGameDevelopmentMap({repoRoot}),/GAME_CATALOG_DUPLICATE_OR_INVALID_ID/);
  });
});
test('platform mappings include all five existing game development targets',()=>{
  assert.deepEqual(Object.keys(GAME_PLATFORM_ROOTS),['WEB','ROBLOX','UNITY','GODOT','UEFN']);
});
