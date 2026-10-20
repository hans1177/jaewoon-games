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
    assert.equal(orphan.assetEvidence.state,'SOURCE_ARCHIVE_ONLY');
    assert.equal(orphan.assetEvidence.manifests[0].reportedImported,false);
    assert.equal(orphan.assetEvidence.manifests[0].actualRuntimeVerified,false);
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

test('asset-manifest import/application claims never turn into invented runtime proof',()=>{
  withSample(repoRoot=>{
    const file=path.join(repoRoot,'assets/external/unlisted/manifest.json');
    fs.writeFileSync(file,JSON.stringify({
      gameId:'unlisted',sourceOnly:false,robloxImported:true,gameApplied:true,
      verifiedPacks:2
    }));
    const row=buildGameDevelopmentMap({repoRoot,gameId:'unlisted'}).games[0];
    assert.equal(row.assetEvidence.state,'MIXED_OR_UNVERIFIED');
    assert.equal(row.assetEvidence.manifests[0].reportedImported,true);
    assert.equal(row.assetEvidence.manifests[0].reportedApplied,true);
    assert.equal(row.assetEvidence.manifests[0].actualRuntimeVerified,false);
    assert.equal(row.publicationStatus,'NOT_VERIFIED_BY_SYNC');
  });
});
test('malformed, mismatched and contradictory asset manifests report game-local issues',()=>{
  withSample(repoRoot=>{
    const p=path.join(repoRoot,'assets/external/unlisted/manifest.json');
    fs.writeFileSync(p,'{nope');
    let row=buildGameDevelopmentMap({repoRoot,gameId:'unlisted'}).games[0];
    assert.ok(row.sourceIssues.some(x=>x.startsWith('ASSET_MANIFEST_INVALID:')));
    fs.writeFileSync(p,JSON.stringify({gameId:'other-game',sourceOnly:true}));
    row=buildGameDevelopmentMap({repoRoot,gameId:'unlisted'}).games[0];
    assert.ok(row.sourceIssues.some(x=>x.startsWith('ASSET_MANIFEST_GAME_ID_MISMATCH:')));
    fs.writeFileSync(p,JSON.stringify({gameId:'unlisted',sourceOnly:true,gameApplied:true}));
    row=buildGameDevelopmentMap({repoRoot,gameId:'unlisted'}).games[0];
    assert.ok(row.sourceIssues.some(x=>x.startsWith('ASSET_STATE_CONTRADICTION:')));
  });
});
test('permanently removed game directories are not silently re-imported into the game roster',()=>{
  withSample(repoRoot=>{
    fs.mkdirSync(path.join(repoRoot,'web-games/removed-game'),{recursive:true});
    const p=path.join(repoRoot,'game-catalog.json');
    const d=JSON.parse(fs.readFileSync(p,'utf8'));
    d.permanentRemovalPolicy={ids:['removed-game']};
    fs.writeFileSync(p,JSON.stringify(d));
    const map=buildGameDevelopmentMap({repoRoot});
    assert.equal(map.games.some(x=>x.gameId==='removed-game'),false);
    assert.equal(map.stats.selectedGameCount,3);
  });
});
