import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const defs=[
 ['cozy-island','포근섬: 작은 왕국 키우기','Cozy Island: Build a Tiny Kingdom'],
 ['daechung-rpg','5포탈 RPG: 던전 파티','Five Portal RPG: Dungeon Party'],
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
