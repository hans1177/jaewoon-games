import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const defs=[
 ['cozy-island','포근섬: 작은 왕국 키우기','Cozy Island: Build a Tiny Kingdom'],
 ['daechung-rpg','포탈 알피지','Five Portal RPG: Dungeon Party'],
 ['horror-escape-room','심야 감염전 [4대4]','Midnight Infection [4v4]'],
];
for(const [id,ko,en] of defs){
 test(id+' has Korean and English acquisition metadata',()=>{
  const launch=JSON.parse(fs.readFileSync('roblox-games/'+id+'/launch-mvp.json','utf8'));
  const config=fs.readFileSync('roblox-games/'+id+'/shared/GameConfig.luau','utf8');
  assert.equal(launch.gameTitleKo,ko);
  assert.equal(launch.gameTitleEn,en);
  assert.equal(typeof launch.gameDescriptionKo,'string');
  assert.equal(typeof launch.gameDescriptionEn,'string');
  assert.ok(launch.gameDescriptionKo.length>20);
  assert.ok(launch.gameDescriptionEn.length>20);
  assert.ok(config.includes('GameNameKorean='));
  assert.ok(config.includes('GameNameEnglish='));
 });
}


// 파일명: qa/primary-three-title-localization.test.mjs
// 두 RPG의 식별자·타이틀·저장소가 분리됐는지 실제 소스에서 확인한다.
test('포탈 알피지 is distinct from 대충알피지 by game ID, source, release target and save key',()=>{
 const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
 const portal=catalog.games.find(game=>game.id==='daechung-rpg');
 const simple=catalog.games.find(game=>game.id==='simple-rpg');
 assert.equal(portal.name,'포탈 알피지');
 assert.equal(portal.canonical.identity.name,'포탈 알피지');
 assert.equal(simple.name,'대충알피지');
 assert.notEqual(portal.id,simple.id);
 assert.notEqual(portal.robloxProjectPath,simple.robloxProjectPath);
 const source=id=>fs.readFileSync('roblox-games/'+id+'/shared/GameConfig.luau','utf8');
 const server=id=>fs.readFileSync('roblox-games/'+id+'/server/Game.server.luau','utf8');
 const project=id=>JSON.parse(fs.readFileSync('roblox-games/'+id+'/default.project.json','utf8'));
 assert.equal(project('daechung-rpg').name,'포탈 알피지');
 assert.equal(project('simple-rpg').name,'대충알피지');
 assert.match(source('daechung-rpg'),/GameId="daechung-rpg"/);
 assert.match(source('simple-rpg'),/GameId = "simple-rpg"/);
 assert.match(source('daechung-rpg'),/GameNameKorean="포탈 알피지"/);
 assert.match(source('simple-rpg'),/GameName = "대충알피지"/);
 assert.match(server('daechung-rpg'),/GetDataStore\("daechung-rpg-portal-v1"\)/);
 assert.match(server('simple-rpg'),/GetDataStore\("simple-rpg-development-v1"\)/);
 const portalRelease=fs.readFileSync('.github/workflows/owner-daechung-rpg-direct-publish.yml','utf8');
 const simpleRelease=fs.readFileSync('.github/workflows/owner-simple-rpg-direct-publish.yml','utf8');
 assert.match(portalRelease,/GAME_ID: daechung-rpg/);
 assert.match(simpleRelease,/GAME_ID: simple-rpg/);
 const portalWeb=fs.readFileSync('web-games/daechung-rpg/index.html','utf8');
 assert.match(portalWeb,/<title>포탈 알피지<\/title>/);
 assert.doesNotMatch(portalWeb,/대충 용사 RPG/);
});

test('current portal RPG public metadata cannot revive the old Korean daechung title',()=>{
 const marketing=JSON.parse(fs.readFileSync('company-learning/marketing/daechung-rpg/latest.json','utf8'));
 const artbooks=JSON.parse(fs.readFileSync('game-artbooks.json','utf8'));
 const health=JSON.parse(fs.readFileSync('public-game-health.json','utf8'));
 assert.equal(marketing.gameId,'daechung-rpg');
 assert.equal(marketing.gameName,'포탈 알피지');
 assert.ok(!JSON.stringify(marketing).includes('대충 RPG'));
 const portalArtbooks=artbooks.artbooks.filter(row=>row.gameId==='daechung-rpg');
 assert.ok(portalArtbooks.length>0);
 assert.ok(portalArtbooks.every(row=>row.gameName==='포탈 알피지'));
 const portalHealth=health.games.find(row=>row.gameId==='daechung-rpg');
 assert.equal(portalHealth?.name,'포탈 알피지');
 const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
 assert.equal(catalog.games.find(row=>row.id==='simple-rpg').name,'대충알피지');
 assert.equal(catalog.games.find(row=>row.id==='daechung-rpg').name,'포탈 알피지');
});


test('owner portal publication records the real version while withholding unverified runtime and Studio claims',()=>{
 const workflow=fs.readFileSync('.github/workflows/owner-daechung-rpg-direct-publish.yml','utf8');
 assert.match(workflow,/permissions:\s+contents: write/);
 assert.match(workflow,/ref: \$\{\{ github\.sha \}\}/);
 assert.match(workflow,/DAECHUNG_OWNER_PUBLISH_PASS=YES/);
 assert.match(workflow,/DAECHUNG_OWNER_PUBLISH_UNTRUSTED_TARGET_OR_ARTIFACT/);
 assert.match(workflow,/source!==process\.env\.GITHUB_SHA/);
 assert.match(workflow,/item\.robloxBuildSourceRevision===source/);
 assert.match(workflow,/item\.robloxBuildArtifactIdentity===artifact/);
 assert.match(workflow,/f0\.sourceRevision===source&&f0\.artifactIdentity===artifact/);
 assert.match(workflow,/item\.robloxDedicatedExperiencePublished=exact/);
 assert.match(workflow,/state:newState,stage:exact\?null:'EXACT_ARTIFACT_BINDING'/);
 assert.match(workflow,/git fetch --no-tags --depth=1 origin/);
 assert.doesNotMatch(workflow,/group: company-runtime-writer/);
 assert.doesNotMatch(workflow,/item\.robloxRuntimePassed=true/);
 assert.doesNotMatch(workflow,/item\.robloxStudioRuntimeSession=.*PASS/);
});
